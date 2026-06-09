---
title: "lpcregister"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/lpcregister"
families: []                     # standalone linear registration tool
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[spmregister]]"
  - "[[fslregister]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[tkregister2]]"
  - "[[register.dat]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Marked 'Not tested yet!' in its own help; relies on AFNI (align_epi_anat.py, 3dcopy) being installed and on PATH."
tags:
  - registration
  - coregistration
  - lpc
  - afni
  - functional
---

# lpcregister

## Summary

`lpcregister` computes a linear (rigid/affine) registration between an
arbitrary "moving" volume and a subject's FreeSurfer anatomical, using the
**Local Pearson Correlation (LPC)** cost function as implemented by AFNI's
`align_epi_anat.py`. It produces a FreeSurfer [[register.dat]] file (a
tkregister-style registration matrix between the moving volume and the
anatomical), and optionally resamples the moving volume into anatomical space.
LPC is well suited to aligning **EPI/functional** data to a structural scan
where intensity relationships are non-trivial. It is a **separate linear
registration tool** from the GCA atlas-registration `register_*` family.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Original author:** Doug Greve
- **Source file:** [`scripts/lpcregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister)
- **Binary/script location:** `$FREESURFER_HOME/bin/lpcregister`
- **External programs invoked:** `align_epi_anat.py`, `3dcopy` (AFNI);
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L118),
  [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L219),
  [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L230),
  [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L260),
  `reg2subject`, `mri_vol2vol`, `mri_mask` (FreeSurfer).

## Purpose and Context

Registering functional (EPI) or other non-T1 volumes to a T1 anatomical is a
core neuroimaging step. The LPC cost function (Saad et al.) is designed for
exactly this cross-modal case: it maximises local correlation, which is robust
to the spatially varying contrast relationship between EPI and T1.
`lpcregister` wraps AFNI's `align_epi_anat.py -lpc` machinery and converts the
resulting transform into FreeSurfer's [[register.dat]] convention so it can be
used by [[tkregister2]], `mri_vol2surf`, and the rest of the FreeSurfer/FSFAST
toolchain.

It is an **alternative** to [[bbregister]] (boundary-based registration),
[[spmregister]] (SPM's mutual-information coregistration), and
[[fslregister]] (FSL FLIRT). Unlike the GCA `register_*` family — which aligns
a subject to a probabilistic *atlas* via [[mri_em_register]] — `lpcregister`
aligns one of the subject's own volumes to that same subject's anatomical.

> [!gotcha] Self-described as "Not tested yet!"
> Both the usage block and the `BEGINHELP` text begin with "Not tested yet!"
> ([`scripts/lpcregister:476`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L476)).
> Treat it as experimental; [[bbregister]] is the standard, well-validated
> FreeSurfer functional-to-anatomical registration tool.

## Inputs

### Required Inputs

- **`--s <subject>`** — a subject in `$SUBJECTS_DIR`. The reference (target) is
  that subject's `mri/<fsvol>.mgz` (default `brainmask`, see `--fsvol`).
- **`--mov <volid>`** — the moving volume, in any form [[wiki/tools/mri_convert|mri_convert]]
  can read. Uses the first frame unless `--frame`/`--mid-frame` is given.
- **`--reg <register.dat>`** — output FreeSurfer registration file.

### Input Assumptions

> [!assumption] Valid geometry on the moving volume; a reconstructed subject
> The subject must already be reconstructed (the reference is `mri/brainmask.mgz`
> by default). The moving volume must carry correct geometry information (the
> help warns that for SPM Analyze input a valid `.mat` file is required),
> otherwise "the results may be unpredictable"
> ([`scripts/lpcregister:491-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L491-L494)).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<regfile>` | as given by `--reg` | FreeSurfer [[register.dat]] mapping reference RAS ↔ moving RAS; contains the subject name (header from `tkregister2_cmdl --regheader` + the computed tkreg matrix) |
| `<regfile>.log` | alongside `--reg` | full command/echo log (unless `--nolog`) |
| `<regfile>.<YYMMDDHHMM>` | alongside `--reg` | timestamped backup of a pre-existing regfile ([`scripts/lpcregister:91-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L91-L92)) |
| `<outvol>` | as given by `--o` | the moving volume resampled into reference space (only with `--o`) |

A working directory `tmp.lpcreg.$$` (or `--tmp`) holds NIfTI/BRIK conversions
and intermediate matrices; it is deleted unless `--nocleanup`/`--tmp` is set.

### Output Specifications

The registration is built by composing AFNI's affine matrix with the AFNI and
FreeSurfer vox2ras matrices (see [Mathematical Foundations](#mathematical-foundations)),
ending in a tkreg-convention matrix written into [[register.dat]]. The default
degrees of freedom are 6 (rigid); see `--9`/`--12`. See [[coordinate-systems]]
and [[register.dat]] for the matrix conventions.

## Mathematical Foundations

The script does not implement registration itself; AFNI's `align_epi_anat.py`
solves the LPC alignment. `lpcregister`'s own arithmetic is the
**change-of-basis** that turns AFNI's result into a FreeSurfer tkreg matrix
([`scripts/lpcregister:182-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L182-L271)).

> [!math] From the AFNI affine to a FreeSurfer tkreg matrix
> Let $A_{\text{mov}}$, $A_{\text{ref}}$ be the AFNI DICOM vox→RAS matrices
> (read from the `.HEAD` `IJK_TO_DICOM` records) and $R_{\text{afni}}$ the
> AFNI registration matrix. A voxel-to-voxel map is
> $$M_{v2v} = A_{\text{mov}}^{-1}\, R_{\text{afni}}\, A_{\text{ref}}$$
> (computed by `mri_matrix_multiply -iim Amov -im afnireg -im Aref`,
> [`scripts/lpcregister:219-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L219-L221)).
> With $T_{\text{mov}}$, $T_{\text{ref}}$ the FreeSurfer tkreg vox→RAS matrices
> (`mri_info --vox2ras-tkr`), the tkreg registration is
> $$M_{\text{tkr}} = T_{\text{mov}}\, M_{v2v}\, T_{\text{ref}}^{-1}$$
> ([`scripts/lpcregister:249-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L249-L251)),
> which forms the body of the output [[register.dat]].

> [!internal] The LPC cost and optimisation live in AFNI
> The actual Local Pearson Correlation registration is performed by AFNI's
> `align_epi_anat.py -epi2anat` (here with `-big_move -cmass -AddEdge` and a DOF
> chosen by `-warp`). FreeSurfer does not own that code.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/lpcregister:300-397`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L300-L397)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject id in `$SUBJECTS_DIR`; the reference volume is `mri/<fsvol>.mgz`. |
| `--mov` | string | *(required)* | Moving/input volume identifier (anything [[wiki/tools/mri_convert|mri_convert]] can read). |
| `--reg` | string | *(required)* | Output FreeSurfer [[register.dat]] path. |
| `--fsvol` | string | `brainmask` | FreeSurfer reference volume basename under `mri/` (e.g. `brain`, `brainmask`). Selects `mri/<fsvol>.mgz` as the target. |
| `--3` | bool | off | 3-DOF registration (translation only; AFNI `-warp shift_only`). |
| `--6` | bool | **on** | 6-DOF rigid registration (AFNI `-warp shift_rotate`). The default. |
| `--9` | bool | off | 9-DOF (rigid + scale; AFNI `-warp shift_rotate_scale`). |
| `--12` | bool | off | 12-DOF full affine (AFNI default warp). |
| `--frame` | int | `0` | Register using frame *N* of the moving volume (0 = first). Passed to `mri_convert --frame`. |
| `--mid-frame` | bool | off | Use the middle frame of the moving volume (mutually exclusive with `--frame`). |
| `--rawavg` | bool | off | Use `rawavg.cor` as the reference (testing only); builds it from `rawavg.mgz`→`orig.mgz` via `mri_vol2vol`+`mri_mask` if absent ([`scripts/lpcregister:95-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L95-L113)). |
| `--o` | string | — | Also resample the moving volume into reference space and save here. |
| `--s-from-reg` | string | — | Derive the subject id from an existing reg file via `reg2subject --r`. |
| `--tmp`<br>`--tmpdir` | string | `<movdir>/tmp.lpcreg.$$` | Temporary working directory; implies `--nocleanup`. |
| `--nocleanup` | bool | off (cleanup on) | Keep the temporary directory and intermediates. |
| `--nolog` | bool | off | Do not write a `.log` file (log goes to `/dev/null`). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print help and exit. |

### Configuration Interactions

> [!gotcha] `--frame` and `--mid-frame` are mutually exclusive
> Specifying both is a hard error ("cannot --frame AND --mid-frame",
> [`scripts/lpcregister:424-427`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L424-L427)).

> [!gotcha] The DOF flags are last-one-wins, not additive
> `--3`/`--6`/`--9`/`--12` each set a single `DOF` value; if several are given,
> the last on the command line takes effect
> ([`scripts/lpcregister:318-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L318-L333)).
> Only 3/6/9 select an explicit AFNI `-warp`; `--12` leaves AFNI at its default
> (12-DOF) warp.

> [!gotcha] `--fsvol brainmask` toggles AFNI skull handling
> When the reference is `brainmask` (the default), the script adds
> `-anat_has_skull no` to `align_epi_anat.py`
> ([`scripts/lpcregister:160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L160)),
> because `brainmask` is already skull-stripped. If you point `--fsvol` at a
> volume that still has skull, AFNI's skull handling assumptions change
> accordingly.

> [!gotcha] `--tmp` silently disables cleanup
> Passing `--tmp <dir>` sets `cleanup = 0`
> ([`scripts/lpcregister:363-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L363-L368)),
> so the working directory is left behind even though you did not pass
> `--nocleanup`.

## Typical Use Cases

### Rigid (6-DOF) EPI-to-anatomical registration

```bash
lpcregister --s bert --mov fmri_run1.nii.gz --reg register.dat
# 6-DOF LPC alignment to bert's brainmask; writes register.dat
```

### 12-DOF affine, registering the middle frame, and resampling the output

```bash
lpcregister --s bert --mov fmri_run1.nii.gz --reg register.dat \
  --12 --mid-frame --o fmri_in_anat.nii.gz
```

### Check the result

```bash
tkregisterfv --mov fmri_run1.nii.gz --reg register.dat
# (lpcregister prints this command, adding --surf orig if lh.orig exists)
```

## Pipeline Context

`lpcregister` is a stand-alone coregistration tool; it is **not** called by
[[wiki/pipelines/recon-all|recon-all]]. It sits downstream of a completed
recon (it needs `mri/brainmask.mgz`) and upstream of any analysis that consumes
a [[register.dat]] (e.g. `mri_vol2surf`, FSFAST first-level analysis).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (provides `brainmask`)
→ **lpcregister** (LPC functional↔anatomical reg) → **Successor:**
`mri_vol2surf` / FSFAST sampling using the registration.

## Gotchas and Caveats

> [!gotcha] Hard dependency on AFNI
> `lpcregister` shells out to `align_epi_anat.py` and `3dcopy`; if AFNI is not
> installed and on `PATH`, the conversions and the alignment fail. The log
> records `which align_epi_anat.py` / `which 3dcopy` for diagnosis
> ([`scripts/lpcregister:82-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L82-L87)).

> [!gotcha] Pre-existing regfile is moved aside, not overwritten
> If `--reg` already exists it is renamed to `<regfile>.<timestamp>` before the
> new one is written, so old registrations accumulate as timestamped copies
> ([`scripts/lpcregister:91-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L91-L92)).

## Error Compensation and Guard Rails

- **Per-step status checks.** After each external call the script tests
  `$status` and aborts on failure (e.g.
  [`scripts/lpcregister:123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L123)).
- **Missing AFNI matrix detected.** If AFNI does not produce
  `<mov>_al_mat.aff12.1D`, the script prints an explicit error and exits
  ([`scripts/lpcregister:183-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L183-L187)).
- **Required-argument validation** for `--s`, `--mov`, `--reg`, and the
  subject's existence under `$SUBJECTS_DIR`
  ([`scripts/lpcregister:403-422`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister#L403-L422)).
- **Reference auto-build** for `--rawavg`: if `rawavg.cor.mgz` is missing it is
  created from `rawavg.mgz` and masked with `brainmask.mgz`.

## Related Tools

- [[bbregister]] — the standard, validated FreeSurfer functional↔anatomical registration (boundary-based); prefer it over this experimental LPC wrapper.
- [[spmregister]] — SPM mutual-information coregistration to the anatomical; same `register.dat` output.
- [[fslregister]] — FSL FLIRT-based registration to the anatomical.
- [[tkregister2]] — inspect/edit the resulting [[register.dat]] (`tkregister2_cmdl` is used internally to format it).
- [[wiki/tools/mri_convert|mri_convert]] — used to stage the moving and reference volumes to NIfTI for AFNI.
- [[register_subject]] — unrelated GCA *atlas* registration driver in the same `scripts/` directory (different problem: subject→atlas, not within-subject).

## Confidence and Gaps

**High confidence:** the complete flag set, mutual-exclusion rules, DOF→AFNI
`-warp` mapping, the matrix-composition math, and the AFNI dependency are read
directly from
[`scripts/lpcregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister).

> [!gap] Maturity / validation
> The tool's own help says "Not tested yet!"; how well the LPC path performs
> versus [[bbregister]] in practice is not established from the source. No
> recon-all integration exists.

## References

- FreeSurfer source: [`scripts/lpcregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/lpcregister) (v8.2.0).
- Saad ZS, et al. *A new method for improving functional-to-structural MRI alignment using local Pearson correlation.* NeuroImage 2009 (the LPC method underlying AFNI's `align_epi_anat.py`).
- AFNI `align_epi_anat.py` documentation (the external alignment engine).
- See also: [[bbregister]], [[spmregister]], [[fslregister]], `mri_vol2surf`.
