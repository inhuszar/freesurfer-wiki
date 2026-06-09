---
title: "exvivo-hemi-proc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/exvivo-hemi-proc"
families: []                     # standalone ex vivo pipeline (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_ms_fitparms]]"
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mri_coreg]]"
  - "[[mri_binarize]]"
  - "[[mri_volcluster]]"
  - "[[mri_volsynth]]"
  - "[[mri_segstats]]"
  - "[[surfreg]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Relies on two helper scripts not yet documented (mmppsp for surface placement, surfreg for fsaverage_sym registration) and on samseg GMM/template files shipped under average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2."
  - "The interactive rotation step launches freeview and waits for the user to save raw-to-rotate.lta and rotate.template.mgz by hand; the exact in-GUI procedure is not encoded in the script."
  - "Heuristic thresholds (sphere-mean PD halving, qT1 11..t1thresh window, cluster minsize 10000) are described as 'hacks' in the source; their robustness across samples is not characterized."
tags:
  - exvivo
  - flash
  - hemisphere
  - samseg
  - surface
  - parameter-maps
---

# exvivo-hemi-proc

## Summary

`exvivo-hemi-proc` is an end-to-end pipeline for turning **ex vivo whole-hemisphere
FLASH (multi-echo, multi-flip-angle) MRI** into a FreeSurfer subject with cortical
surfaces. From a directory of averaged FLASH echoes it estimates quantitative
parameter maps (PD, T1, T2*) with [[mri_ms_fitparms]], builds a tissue mask for
the dissected sample, injects synthetic background noise so that
[[wiki/tools/samseg|samseg]] behaves on an isolated hemisphere, runs samseg with
dedicated ex-vivo GMM/atlas files, and finally places surfaces and registers them
to the symmetric template `fsaverage_sym` (via `mmppsp` and [[surfreg]]). It was
written for an entorhinal-subfield labeling project and is run **by hand**, with
an interactive rotation step in [[wiki/tools/freeview|freeview]] and several
"stop-after" checkpoints for QC.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/exvivo-hemi-proc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc)
- **Binary/script location:** `$FREESURFER_HOME/bin/exvivo-hemi-proc`
- **Key FreeSurfer tools invoked:** [`mri_ms_fitparms`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L221), [`mri_volsynth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L236), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L241), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L253), [`mri_volcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L257), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L307), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L315), [`mri_coreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L332), [`samseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L344), `mmppsp` (multimodal post-prob surface placement), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L382), [`mris_seg2annot`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L386), [`surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L396), `mri_vol2vol`, and `freeview` (interactive rotation).

## Purpose and Context

A dissected post-mortem hemisphere is unlike an in vivo head: there is no skull or
neck, the sample sits in an arbitrary orientation in fixative, the contrast comes
from multi-echo FLASH rather than a single MPRAGE, and the background is fluid
rather than air. The standard [[wiki/pipelines/recon-all|recon-all]] stream and
plain [[wiki/tools/samseg|samseg]] do not cope well with these conditions.
`exvivo-hemi-proc` is a purpose-built variant that:

1. **Quantifies** the FLASH data into PD / T1 / T2* maps ([[mri_ms_fitparms]]).
2. **Masks** the tissue and **synthesizes background noise** so the sample looks
   to samseg more like a normal volume (samseg's Gaussian background model
   otherwise fails on a noise-free background).
3. **Segments** with ex-vivo-specific shared-GMM and atlas-template files.
4. **Builds surfaces** for one hemisphere and registers them to the
   left-right symmetric template `fsaverage_sym`, which downstream subfield
   labeling needs.

It is a standalone research pipeline — **not** part of recon-all/trac-all — and
is run interactively because of the manual rotation/QC steps. The help text notes
it was "initially designed to process whole hemisphere data for Jeans entorhinal
subfield labeling project" ([`scripts/exvivo-hemi-proc:690-704`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L690-L704)).

## Inputs

### Required Inputs

- **FLASH directory** (`--i flashdir`) of averaged multi-echo / multi-flip-angle
  volumes named **`mefFA_echoE_avg.mgz`**, where `FA` is the flip angle and `E`
  is the echo number. Format: [[mgz]]. The script auto-discovers the flip-angle
  list and echo list from the filenames ([`scripts/exvivo-hemi-proc:600-603`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L600-L603))
  and requires **every flip angle to have every echo**
  ([`scripts/exvivo-hemi-proc:610-618`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L610-L618)).
- **Output directory** (`--o outdir`) — created fresh on the first run; on
  re-runs all parameters are re-read from `outdir/log/*` and `--i`/`--hemi` may
  not be re-specified.
- **Hemisphere** (`--lh` / `--rh`) — selects the matching ex-vivo GMM and atlas
  template.
- **Subject path** (`--s subject`) — a **full path**; its basename becomes the
  recon-all subject ID and its dirname becomes `$SUBJECTS_DIR`
  ([`scripts/exvivo-hemi-proc:360-363`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L360-L363)).

### Input Assumptions

> [!assumption] Averaged FLASH echoes, one hemisphere, dissected sample
> Inputs are assumed to be averaged FLASH volumes in `mefFA_echoE_avg.mgz` form,
> all flips × echoes present, for a single excised hemisphere. The pipeline
> assumes a noise-free/fluid background (it adds synthetic noise itself) and that
> the tissue is the largest connected high-PD / mid-qT1 component. The default
> qT1 tissue-window upper bound is **415** (`--t1thresh`, [`scripts/exvivo-hemi-proc:598`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L598)) and the default
> PD-ratio threshold is **0.5** of the in-sample PD mean.

The required samseg GMM and template files must exist under
`$FREESURFER/average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2/`
(e.g. `exvivo.<hemi>.whole.sharedGMMParameters.txt`,
`exvivo.template.<hemi>.whole.nii`; the `.suptent.` variants when `--suptent` is
given) — checked at [`scripts/exvivo-hemi-proc:633-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L633-L648).

## Outputs

### Files Created

Written under `outdir/` (the FLASH-processing workspace) and under the
`--s` subject path (the resulting FreeSurfer subject).

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `log/{flashdir,hemi,falist,echolist,t1thresh,pdrthresh,subject,suptent,rotate,bgnoisetype}` | `outdir/log/` | persisted run parameters (re-read on restart) |
| `log/template.mgz`, `log/rotate.template.mgz`, `log/raw-to-rotate.lta` | `outdir/log/` | rotation reference template and the **manually created** raw→rotate transform |
| `rotate/mefFA_echoE_avg.mgz` | `outdir/rotate/` | FLASH echoes resampled into the rotated frame (or symlinks if `--no-rotate`) |
| `parameter_maps/{PD,T1,T2star}.mgz` | `outdir/parameter_maps/` | quantitative maps from [[mri_ms_fitparms]] |
| `parameter_maps/init.tissue.mask.mgz` | `outdir/parameter_maps/` | initial qT1-window tissue mask |
| `masks/{sample.mask,tissue.mask,bg.mask,bg.noise}.mgz`, `masks/sph10*.{mgz,dat}` | `outdir/masks/` | sample mask, final tissue mask, background mask, synthetic noise, PD-mean probe |
| `{PD,T1,T2star}.masked.mgz` | `outdir/` | parameter maps masked to tissue with noise added in the background |
| `reg.samseg.lta` | `outdir/` | [[mri_coreg]] initial 12-DOF registration to the ex-vivo template |
| `samseg.PD/seg.mgz` (+ posteriors/probabilities) | `outdir/samseg.PD/` | samseg segmentation of the masked PD volume |
| `mri/aparc+aseg.mgz`, surfaces in `surf/` | `<subject>/` | cortical surfaces and parcellation from `mmppsp` |
| `label/<hemi>.aparc+aseg.annot` | `<subject>/label/` | annotation including subcortical labels (built via [[mri_vol2surf]] + [[mris_seg2annot]]) |
| `surf/<hemi>.fsaverage_sym.reg` | `<subject>/surf/` | surface registration to the symmetric template ([[surfreg]]) |
| `log/exvivo-hemi-proc.*.log` (+ `exvivo-hemi-proc.log` symlink) | `outdir/log/` | run log |

### Output Specifications

Parameter maps and masks are [[mgz]] in the **rotated** FLASH grid (not
conformed; `mri_ms_fitparms` is run with `-noconform`,
[`scripts/exvivo-hemi-proc:221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L221)). The final FreeSurfer subject contains standard
[[surface-format]] surfaces and a [[label-format]] / [[annotation-format]]
parcellation, registered to `fsaverage_sym` so that symmetric atlas labels can be
sampled onto either hemisphere.

## Mathematical Foundations

`exvivo-hemi-proc` chains existing tools; the quantitative FLASH fit is the only
real model and lives in [[mri_ms_fitparms]].

> [!internal] FLASH parameter estimation
> PD, T1, and T2* are estimated from the multi-flip / multi-echo FLASH signal
> equation by [`mri_ms_fitparms -noconform -n 1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L221). See
> [[mri_ms_fitparms]] for the spoiled-gradient-echo model and the fitting.

The script itself performs only **heuristic, threshold-based masking**, which the
author explicitly labels as hacks:

> [!math] Sample / tissue mask heuristics
> 1. **Sample mask:** synthesize a 10 mm sphere ([[mri_volsynth]] `--pdf sphere
>    --radius 10`), take the mean PD inside it ([[mri_segstats]] `--avgwf`), set
>    $\text{PD}_\text{thresh} = \text{pdrthresh}\cdot\overline{\text{PD}}_\text{sph}$
>    (default pdrthresh $=0.5$), binarize PD above it, then keep the largest
>    cluster ≥ 10000 voxels ([[mri_volcluster]]).
>    [`scripts/exvivo-hemi-proc:234-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L234-L259)
> 2. **Tissue mask:** keep qT1 voxels in $[11,\,\text{t1thresh}]$ (default upper
>    bound 415) within the sample mask, dilate, then again take the largest
>    cluster ([`scripts/exvivo-hemi-proc:267-293`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L267-L293)).
> 3. **Background noise:** invert the tissue mask, synthesize noise into it
>    ([[mri_volsynth]], `--abs` for `--bg-abs`), and add it to the masked
>    parameter maps so samseg's background Gaussian has something to fit
>    ([`scripts/exvivo-hemi-proc:294-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L294-L318)).
> If a threshold fails, the user edits the corresponding `log/*` file by hand and
> re-runs; the `UpdateNeeded` machinery then regenerates only the affected steps.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/exvivo-hemi-proc:434-559`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L434-L559)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output/working directory. Created on first run; on re-run, parameters are read back from `outdir/log/`. |
| `--i` | string | *(required first run)* | FLASH input directory containing `mefFA_echoE_avg.mgz` files. Forbidden if `outdir` already exists. |
| `--s` | string | *(required)* | **Full path** to the FreeSurfer subject to create (dirname → `$SUBJECTS_DIR`, basename → subject ID). |
| `--lh` | bool | — | Process the left hemisphere (selects `exvivo.lh.*` GMM/template). |
| `--rh` | bool | — | Process the right hemisphere (selects `exvivo.rh.*` GMM/template). |
| `--suptent` | bool | off | Supratentorial sample only (no cerebellum/brainstem); selects the `.suptent.` GMM and template instead of `.whole.`. |
| `--no-rotate` | bool | rotate on | Skip the interactive rotation; symlink the FLASH echoes directly instead of resampling through `raw-to-rotate.lta`. |
| `--rotreg` | string | — | Use a pre-existing rotation registration; sets rotate on. **Currently unusable:** the handler existence-checks `$reg` (an unset variable), which aborts tcsh with `reg: Undefined variable.` before any work — see gotcha and [[00192]]. |
| `--t1thresh` | int | `415` | Upper qT1 bound for the initial tissue-window mask. |
| `--threads` | int | `1` | Threads for [[mri_coreg]], [[wiki/tools/samseg|samseg]], `mmppsp`, and [[surfreg]]. |
| `--bg-abs` | bool | **on** | Use absolute-valued (rectified) synthetic background noise. |
| `--bg-signed` | bool | off | Use signed synthetic background noise. |
| `--check-only` | bool | off | Validate inputs/params and exit before doing any work. |
| `--prep-only` | bool | off | Stop after the interactive rotation step. |
| `--mask-only` | bool | off | Stop after building the sample/tissue masks and masked parameter maps. |
| `--samseg-only` | bool | off | Stop after the samseg segmentation (before surface placement). |
| `--stop-mmppsp-after` | string | — | Forward `--stop-after <stage>` to `mmppsp`; one of `tess`, `fix`, `preaparc`, `sphere`, `spherereg`, `white`, `pial`. |
| `--force` | bool | off | **Advertised in the usage block but non-functional:** there is **no `--force` case** in the parser, so passing it triggers `ERROR: Flag --force unrecognized.` The variable `ForceUpdate` exists but no flag sets it. See [[00192]]. |
| `--log` | string | auto-dated | Explicit log file path. |
| `--nolog` / `--no-log` | bool | — | Send log to `/dev/null`. |
| `--tmp` / `--tmpdir` | string | auto | Temporary directory (sets `cleanup=0`). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temp files (final cleanup is commented out, [`scripts/exvivo-hemi-proc:405`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L405)). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print `$Id$` and exit. |

### Configuration Interactions

> [!gotcha] First run vs. restart: `--i` and `--hemi` are locked after creation
> If `outdir` already exists, specifying `--i` or `--lh`/`--rh` is a **hard
> error**; all parameters are instead re-read from `outdir/log/*`
> ([`scripts/exvivo-hemi-proc:571-588`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L571-L588)). To change the hemisphere or input you must
> start a fresh output directory. This is the mechanism that lets you re-run the
> pipeline (e.g. to continue past a `--*-only` checkpoint) by simply calling
> `exvivo-hemi-proc --o $outdir`.

> [!gotcha] The `--*-only` flags are an ordered ladder
> `--check-only` < `--prep-only` < `--mask-only` < `--samseg-only` are evaluated
> at successive points in the stream, so each stops earlier than the next. The
> intended workflow is to step through them (inspecting output each time) and
> finally run with none to complete the pipeline.

> [!gotcha] `--rotreg` is unusable (checks an undefined variable)
> The `--rotreg` handler stores the path in `$rotreg` but then tests `-e $reg`
> ([`scripts/exvivo-hemi-proc:483-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L483-L491)); `$reg` is not defined until far later in the
> body ([`scripts/exvivo-hemi-proc:329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L329)). Under tcsh, dereferencing the unset
> `$reg` at parse time is **fatal**, so the script aborts immediately with
> `reg: Undefined variable.` — `--rotreg` cannot be used at all. Use the normal
> interactive rotation path (which writes `log/raw-to-rotate.lta`) instead. See
> [[00192]].

Other interactions:

- `--suptent` switches **both** the GMM parameter file and the samseg template to
  the `.suptent.` variants.
- `--bg-abs` (default) and `--bg-signed` are mutually exclusive; the last wins.
- `--stop-mmppsp-after` only matters once the pipeline reaches surface placement
  (i.e. not with `--samseg-only` or earlier).

## Typical Use Cases

### 1. Full run on a right hemisphere

```bash
exvivo-hemi-proc --i /path/to/flash --o I22 --rh --s /data/subjects/I22.recon --threads 5
```

Discovers the flip/echo lists, fits parameter maps, masks, runs samseg, and
builds surfaces for the subject `I22.recon` under `/data/subjects`.

### 2. Stepwise with QC checkpoints

```bash
# 1) interactive rotation only
exvivo-hemi-proc --i /path/to/flash --o I22 --rh --s /data/subjects/I22.recon --prep-only
# 2) continue to masks, inspect masks/, adjust log/t1thresh or log/pdrthresh if needed
exvivo-hemi-proc --o I22 --mask-only
# 3) continue to samseg
exvivo-hemi-proc --o I22 --samseg-only
# 4) finish (surfaces + fsaverage_sym registration)
exvivo-hemi-proc --o I22
```

### 3. Supratentorial sample, no rotation needed

```bash
exvivo-hemi-proc --i /path/to/flash --o LH01 --lh --suptent --no-rotate \
  --s /data/subjects/LH01.recon --threads 8
```

## Pipeline Context

`exvivo-hemi-proc` is a **self-contained ex-vivo pipeline**, not a stage of
[[wiki/pipelines/recon-all|recon-all]] or trac-all. Internally it sequences:
[[mri_ms_fitparms]] (parameter maps) → masking ([[mri_volsynth]],
[[mri_segstats]], [[mri_binarize]], [[mri_volcluster]], [[mri_mask]], `fscalc`)
→ [[mri_coreg]] (init reg) → [[wiki/tools/samseg|samseg]] (segmentation) →
`mmppsp` (surface placement from samseg posteriors) → [[mri_vol2surf]] +
[[mris_seg2annot]] (annotation) → [[surfreg]] (registration to `fsaverage_sym`).

**Predecessor:** averaged ex-vivo FLASH acquisition → **exvivo-hemi-proc** →
**Successors:** symmetric-atlas subfield labeling / morphometry on the
`fsaverage_sym`-registered surfaces.

## Gotchas and Caveats

> [!gotcha] The rotation step is interactive and blocking
> When `DoRotate` is on and no `raw-to-rotate.lta` / `rotate.template.mgz`
> exists, the script launches `vglrun freeview log/template.mgz`
> ([`scripts/exvivo-hemi-proc:154-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L154-L157)) and then **prompts on stdin** ("Does the
> volume need to be rotated? 0/1", [`scripts/exvivo-hemi-proc:164-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L164-L180)). You must
> save the rotated template and transform from within freeview by hand. The
> script cannot run non-interactively unless `--no-rotate` is given or those two
> files already exist.

> [!gotcha] samseg needs synthetic background noise
> Plain samseg often fails on a dissected hemisphere because the background is
> noise-free; this pipeline deliberately adds synthetic noise to the background of
> the masked parameter maps before calling samseg, and runs `mri_coreg` first
> "because samseg often does not work on hemis" ([`scripts/exvivo-hemi-proc:328-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L328-L350)).

> [!gotcha] `--force` is advertised but not implemented
> The usage block lists `--force`, but the argument parser has no `--force`
> case; passing it triggers the "Flag unrecognized" error. Re-processing is
> instead driven by the `UpdateNeeded` timestamp logic and editing `log/*`.

> [!gotcha] VERSION is an unexpanded `$Id$`
> The script sets `VERSION = '$Id$'` ([`scripts/exvivo-hemi-proc:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L7)); `--version`
> prints the literal placeholder rather than `8.2.0`.

## Error Compensation and Guard Rails

- **Restart-safe.** Parameters persist in `outdir/log/*` and every step is
  guarded by `UpdateNeeded`, so re-running continues where it left off and only
  redoes steps whose inputs changed.
- **Input validation.** `check_params` confirms the FLASH directory, the
  presence of every flip × echo file, the hemisphere, the subject path, and the
  ex-vivo GMM/template files before processing ([`scripts/exvivo-hemi-proc:565-648`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L565-L648)).
- **Manual threshold override.** If the automatic PD or qT1 thresholds produce a
  bad mask, the user edits `log/pdrthresh` / `log/t1thresh` and re-runs; the
  masks regenerate automatically.
- **`--check-only`** lets you validate a setup without launching freeview or any
  computation.

## Known Bugs

- [[00192]] — `--rotreg` existence-checks `$reg` (unset at parse time → `reg: Undefined variable.`) instead of `$rotreg`, and the advertised `--force` flag has no parser case (`ERROR: Flag --force unrecognized.`); both abort during argument parsing.

## Related Tools

- [[mri_ms_fitparms]] — fits the PD/T1/T2* parameter maps from the FLASH echoes.
- [[wiki/tools/samseg|samseg]] — segments the masked PD volume with ex-vivo GMM/atlas files.
- [[mri_coreg]] — 12-DOF initialization of the samseg registration.
- [[mri_binarize]], [[mri_volcluster]], [[mri_volsynth]], [[mri_segstats]], [[mri_mask]] — build the sample/tissue/background masks and synthetic noise; `fscalc` combines them.
- [[surfreg]] — registers the resulting surfaces to the symmetric template `fsaverage_sym`.
- [[mri_vol2surf]], [[mris_seg2annot]] — project the segmentation to the surface and build the annotation.
- [[wiki/tools/freeview|freeview]] — used interactively for the manual rotation step.
- `mmppsp` *(no wiki page yet)* — multimodal post-probability surface placement from samseg posteriors; the surface-building engine here.
- [[xhemireg]] — a different cross-hemisphere/symmetry tool (volume left-right reversal); related in spirit because both produce `fsaverage_sym`-compatible data.

## Confidence and Gaps

**High confidence:** the flag set, the first-run-vs-restart locking, the
`--*-only` ladder, the FLASH naming convention and flip/echo discovery, and the
overall tool sequence — all read from
[`scripts/exvivo-hemi-proc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc).

> [!gap] External helper scripts and atlas assets
> Surface placement (`mmppsp`) and `fsaverage_sym` registration ([[surfreg]])
> are delegated; the ex-vivo GMM/template files under
> `average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2/` must be
> present. Their internals are out of scope for this page.

> [!gap] Interactive rotation procedure
> The exact in-freeview steps to produce `raw-to-rotate.lta` and
> `rotate.template.mgz` are performed by the user and not encoded in the script.

> [!gap] Robustness of the masking heuristics
> The PD/qT1 thresholds and cluster sizes are described as "hacks" in the source
> and may need per-sample tuning.

## References

- FreeSurfer source: [`scripts/exvivo-hemi-proc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc) (v8.2.0).
- Built-in help: `exvivo-hemi-proc --help` ([`scripts/exvivo-hemi-proc:688-708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L688-L708)).
