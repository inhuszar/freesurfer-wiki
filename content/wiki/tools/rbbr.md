---
title: "rbbr"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rbbr"
families: []                     # standalone registration wrapper, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[mri_gtmpvc]]"
  - "[[mri_binarize]]"
  - "[[lta_convert]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[tkregister2]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "rbbr has an empty BEGINHELP block, so the only documentation beyond the source is the short usage_exit summary; some option semantics (e.g. --surf, --isc/--iscmask naming) are inferred from how the variables are used."
  - "The --surf option is parsed and stored in surfname but is never referenced again in the body, so it currently has no effect (flagged below)."
tags:
  - registration
  - boundary-based
  - robust
  - outlier-rejection
  - pet
  - partial-volume
---

# rbbr

## Summary

`rbbr` ("robust BBR") is a wrapper around [[bbregister]] that makes
boundary-based registration robust to local outliers. A plain `bbregister` run
optimises a single global cost over the whole grey/white surface boundary; if a
region of the moving volume is corrupted (lesion, signal dropout, partial-volume
contamination, focal pathology), those vertices can drag the whole registration
off. `rbbr` runs `bbregister` iteratively: after each fit it measures the
per-vertex surface cost, **flags the high-cost (outlier) vertices and masks them
out**, then re-runs `bbregister` using only the well-behaved vertices. It can
optionally synthesise a partial-volume-corrected target with `mri_gtmpvc` first,
which makes it especially useful for registering low-resolution PET to the
FreeSurfer anatomical. The output is the same kind of registration
(`register.dat` and/or `.lta`) that `bbregister` produces.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/rbbr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr)
- **Binary/script location:** `$FREESURFER_HOME/bin/rbbr`
- **Tools invoked:** [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L112) (the underlying registration, called up to *N*+2 times per run), [`mri_gtmpvc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L155) (optional GTM partial-volume synthesis), [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L179) (build the outlier mask), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L129) (interconvert reg/lta when an init reg is supplied), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L101) (extract one frame), and the helpers `IsLTA`, `reg2subject`.

## Purpose and Context

Boundary-based registration ([[bbregister]]) aligns a functional/quantitative
volume to a subject's anatomy by maximising the intensity gradient across the
white-surface boundary. Its global cost makes it sensitive to *local* problems:
a patch of the moving image that does not obey the expected GM/WM contrast — PET
hot/cold spots, a lesion, dropout — still contributes to the cost and can bias
the whole 6-DOF transform.

`rbbr` addresses this with iterative outlier rejection:

1. Get an initial registration (run `bbregister` once, or accept one with
   `--init-reg`).
2. For the current registration, compute the **per-vertex** surface cost with
   `bbregister --init-surf-cost ... --init-surf-cost-only` (no optimisation,
   just evaluate).
3. Threshold that cost with `mri_binarize --min cthresh --inv` to build a mask
   that **excludes** vertices whose cost exceeds `cthresh` (the outliers).
4. Re-run `bbregister` on the surviving vertices only (`--mask`), with `--no-pass1`.
5. Repeat for `--iters` iterations, carrying the new registration forward each time.

Optionally (`--gtm`), before the cost evaluation it builds a partial-volume
"corrected" image with `mri_gtmpvc` and uses that as the moving volume — the
typical setup for PET, where partial-volume effects otherwise dominate the
boundary cost.

It is a stand-alone tool (run by hand or from a PET/quantitative pipeline) and is
**not** part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

| Input | Flag | Notes |
|-------|------|-------|
| Moving volume | `--mov` | the volume to register (PET, BOLD, DTI, T1, T2…); must exist ([`scripts/rbbr:278-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L278-L285)) |
| Tissue contrast | `--t1`/`--t2` (or `--bold`/`--dti`) | tells `bbregister` the moving contrast polarity; required ([`scripts/rbbr:472-475`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L472-L475)) |
| Init method | one of `--init-rr`/`--init-fsl`/`--init-spm`/`--init-header`/`--init-reg` | required ([`scripts/rbbr:480-483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L480-L483)) |
| Subject | `--s` | FreeSurfer subject (not needed when `--init-reg` is given, which derives it via `reg2subject`); must exist under `$SUBJECTS_DIR` ([`scripts/rbbr:484-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L484-L491)) |
| Output | `--reg` and/or `--lta` | at least one is required ([`scripts/rbbr:468-471`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L468-L471)) |

For the `--gtm` path it additionally needs a GTM segmentation
(`gtmseg.mgz` by default) under the subject's `mri/` directory, consumed by
`mri_gtmpvc`.

### Input Assumptions

> [!assumption] A reconstructed FreeSurfer subject with surfaces
> `rbbr` relies on the subject's white surfaces (through `bbregister`) and, in
> the `--gtm` case, on a GTM segmentation. The subject must therefore be a
> completed [[wiki/pipelines/recon-all|recon-all]] run (and `gtmseg` must have
> been run for `--gtm`). The moving volume is assumed to be in the geometry its
> `--init-*` method expects; `rbbr` does not resample it beyond optional
> single-frame extraction (`--frame`).

## Outputs

### Files Created

| Output | Where | Contents |
|--------|-------|----------|
| `register.dat`-style file | path given by `--reg` | the final boundary-based registration (tkregister format), copied from the last iteration ([`scripts/rbbr:209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L209)) |
| `.lta` registration | path given by `--lta` | the same registration in LTA format ([`scripts/rbbr:210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L210)) |
| log file | `<reg>.log` (or `--log`) | full command trace ([`scripts/rbbr:79-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L79-L91)) |
| RMS history | path given by `--rms` (optional) | the `--rms0` RMS value appended for each iteration ([`scripts/rbbr:144-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L144-L146), [`scripts/rbbr:200-202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L200-L202)) |
| frame template | path given by `--template` (optional) | the extracted single frame, kept when `--frame` is used with `--template` ([`scripts/rbbr:95-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L95-L107)) |

Per-iteration intermediates (`bbr.reg.iN.dat`, `bbr.reg.iN.lta`, the
`isc.?h.mgh` surface-cost maps, the `iscmask.?h.mgh` outlier masks, and any GTM
output directory) are written under the temp directory and deleted on cleanup
unless `--nocleanup`/`--tmpdir` is set.

### Output Specifications

The registration files describe the 6-DOF rigid transform from the moving volume
to the subject's anatomical space, identical in format to a `bbregister` result.
The `isc.?h.mgh` cost maps are per-vertex surface overlays (one value per white
vertex per hemisphere); the `iscmask.?h.mgh` are binary {0,1} surface masks used
internally.

## Mathematical Foundations

> [!internal] The optimisation is bbregister; the math lives there
> `rbbr` adds an outlier-rejection loop on top of [[bbregister]]; it computes no
> transform itself. The boundary-based cost and its gradient-descent
> optimisation are implemented in `bbregister`/`mri_segreg`.

> [!math] Iterative outlier rejection
> Let $c_v$ be the BBR surface cost at white-surface vertex $v$ for the current
> registration. `rbbr` builds the inclusion mask
> $$ m_v = \begin{cases} 1 & c_v < \texttt{cthresh} \\ 0 & c_v \ge \texttt{cthresh} \end{cases} $$
> (computed as `mri_binarize --min cthresh --inv`, [`scripts/rbbr:179`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L179)) and
> re-estimates the registration using only the vertices with $m_v = 1$
> (`bbregister --mask iscmask.lh.mgh iscmask.rh.mgh --no-pass1`, [`scripts/rbbr:189-190`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L189-L190)).
> The default cost threshold is $\texttt{cthresh}=1.5$ ([`scripts/rbbr:14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L14)); the
> loop runs $N=3$ times by default ([`scripts/rbbr:16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L16)).

The optional GTM partial-volume synthesis (`--gtm`) runs
`mri_gtmpvc --auto-mask FWHM .001 --save-yhat-full-fov` and uses the resulting
`yhat.fullfov.nii.gz` as the moving volume for the cost evaluation, with the
fitting FWHM (the point-spread function) given alongside the segmentation
([`scripts/rbbr:153-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L153-L165)). See [[mri_gtmpvc]] for that math.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/rbbr:249-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L249-L460)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`--subject` | string | *(required unless `--init-reg`)* | FreeSurfer subject id; must exist under `$SUBJECTS_DIR`. |
| `--mov` | path | *(required)* | Moving volume to register; checked for existence. |
| `--t1`<br>`--T1` | boolean | — | Moving volume has T1-like (bright-WM) contrast → `bbregister --t1`. |
| `--t2`<br>`--T2`<br>`--bold`<br>`--dti` | boolean | — | Moving volume has T2*/BOLD/DTI-like (dark-WM) contrast → `bbregister --t2`. |
| `--reg` | path | *(reg or lta required)* | Output tkregister-style registration. |
| `--lta` | path | *(reg or lta required)* | Output LTA-format registration. |
| `--init-rr` | boolean | — | Initialise `bbregister` with robust-register (`--init-rr`). |
| `--init-fsl` | boolean | — | Initialise with FSL FLIRT (`--init-fsl`). |
| `--init-spm` | boolean | — | Initialise with SPM (`--init-spm`). |
| `--init-header`<br>`--regheader`<br>`--reg-header` | boolean | — | Initialise from header geometry (`--init-header`). *(Note: stored value has a stray trailing colon — see gotcha.)* |
| `--init-reg` | path | — | Use an existing registration (reg or lta) as the initial transform; subject is derived from it with `reg2subject`. Supplies its own init to `bbregister`. |
| `--iters` | integer | `3` | Number of outlier-rejection iterations. |
| `--cthresh`<br>`--thresh` | float | `1.5` | Surface-cost threshold above which a vertex is treated as an outlier and excluded. |
| `--gtm`<br>`--segname` | `segname FWHM` | off (`gtmseg.mgz`) | Synthesise a partial-volume-corrected moving image with `mri_gtmpvc` using this segmentation and PSF FWHM; sets `UseGTM=1`. Takes **two** arguments. |
| `--tt-reduce` | boolean | off | With `--gtm`, reduce the GTM segmentation to tissue types (faster) → `mri_gtmpvc --tt-reduce --no-rescale`. |
| `--no-merge` | boolean | merge on | With `--gtm`, do **not** pass `--default-seg-merge` to `mri_gtmpvc`. |
| `--psf`<br>`--fwhm` | float | — | Set the PSF FWHM independently (also set as the second `--gtm` argument). |
| `--frame` | integer | — | Extract this 0-based frame from `--mov` (via `mri_convert --frame`) and register that single volume. |
| `--t`<br>`--template` | path | — | Save the extracted frame as a named output (useful with `--frame`). |
| `--rms` | path | — | Append the per-iteration RMS (from `bbregister --rms0`) to this file. |
| `--isc` | path | `<tmp>/isc` | Base path for the per-vertex surface-cost maps (`isc.?h.mgh`). |
| `--iscmask` | path | `<tmp>/iscmask` | Base path for the outlier masks (`iscmask.?h.mgh`). |
| `--lh-only` | boolean | off | Use only the left hemisphere → `bbregister --lh-only`. |
| `--rh-only` | boolean | off | Use only the right hemisphere → `bbregister --rh-only` *(but see gotcha — sets the wrong variable)*. |
| `--gm-proj-frac` | float | bbregister default | GM projection fraction passed to `bbregister`; clears `--gm-proj-abs`. |
| `--gm-proj-abs` | float | bbregister default | GM projection absolute distance (mm); clears `--gm-proj-frac`. |
| `--wm-proj-abs` | float | bbregister default | WM projection absolute distance (mm) → `bbregister --wm-proj-abs`. |
| `--proj-abs` | float | — | Convenience: set WM **and** GM absolute projection to the same value (clears `--gm-proj-frac`). |
| `--surf` | string | — | Stored in `surfname` but **never used** in the body — currently a no-op (see gap). |
| `--spm-nii` | boolean | off | Pass `--spm-nii` to the initial `bbregister` (use NIfTI for SPM init). |
| `--log` | path | `<reg>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | boolean | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | path | auto (`/scratch` or outdir) | Use this temp directory and disable cleanup. |
| `--nocleanup` | boolean | cleanup on | Keep the temp directory. |
| `--cleanup` | boolean | on | Remove the temp directory at the end. |
| `--debug` | boolean | off | `set echo`/`verbose` tracing. |
| `--help` | boolean | — | Print usage and exit. |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--rh-only` does **not** select the right hemisphere
> Both `--lh-only` and `--rh-only` set `LHOnly=1` and `RHOnly=0`
> ([`scripts/rbbr:384-392`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L384-L392)). The `--rh-only` case is a copy-paste of the
> `--lh-only` case and assigns the same values, so passing `--rh-only` actually
> runs **left-hemisphere-only**. To genuinely restrict to one hemisphere, only
> `--lh-only` works as intended. (See the [bug page] if one exists.)

> [!gotcha] `--init-header` stores a stray trailing colon
> The `--init-header`/`--regheader` case sets `BBRInit = "--init-header:"`
> (with a colon) ([`scripts/rbbr:352-356`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L352-L356)). That malformed token is then passed to
> `bbregister`, which will likely reject it. Prefer a different init method until
> this is fixed.

> [!gotcha] `--gtm` consumes two arguments and turns on partial-volume mode
> `--gtm segname FWHM` reads *both* the segmentation name and the FWHM, and sets
> `UseGTM=1` ([`scripts/rbbr:304-310`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L304-L310)). `--tt-reduce` and `--no-merge` only have
> any effect when `--gtm` is active. The same FWHM also feeds the
> `bbregister --init-surf-cost` evaluation indirectly through the synthesised
> image.

> [!gotcha] `--gm-proj-frac` and `--gm-proj-abs` are mutually exclusive
> Setting either one clears the other ([`scripts/rbbr:394-404`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L394-L404)); `--proj-abs`
> sets both WM and GM absolute projection and clears the GM fraction
> ([`scripts/rbbr:411-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L411-L417)).

- `--init-reg` makes `--s` optional (subject derived via `reg2subject`) and
  converts between reg/lta with `lta_convert` as needed
  ([`scripts/rbbr:123-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L123-L142), [`scripts/rbbr:358-367`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L358-L367)).
- `--tmpdir`/`--tmp` implies `--nocleanup` (the named temp dir is kept).
- `--frame` without `--template` writes the frame to a temp file that is cleaned
  up; with `--template` it is preserved.

## Typical Use Cases

### 1. Robust PET-to-anatomical registration with partial-volume correction

```bash
# Register a PET volume to subject 'bert', rejecting outlier vertices,
# using a GTM partial-volume synthesis at 6 mm FWHM.
rbbr --mov pet.nii.gz --t2 --init-reg init.reg.lta \
  --gtm gtmseg.mgz 6 --iters 3 \
  --reg pet2anat.reg.dat --lta pet2anat.lta
```

### 2. Plain robust BBR (no GTM), FSL init

```bash
rbbr --s bert --mov bold.nii.gz --bold --init-fsl \
  --reg bold2anat.reg.dat --cthresh 1.5 --iters 3
```

### 3. Register a single frame of a 4-D series

```bash
rbbr --s bert --mov run.nii.gz --bold --init-header \
  --frame 0 --template frame0.nii \
  --reg run2anat.reg.dat
```

## Pipeline Context

`rbbr` is a stand-alone registration utility, typically used in **PET /
quantitative-imaging** workflows where partial-volume effects and focal outliers
would otherwise bias a plain `bbregister`. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] (no reference appears in `recon-all` or
`trac-all`).

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (provides the surfaces;
`gtmseg` for `--gtm`) → **rbbr** → **Successor:** any tool that consumes the
registration, e.g. [[mri_gtmpvc]] for PET quantification, `mri_vol2surf`, or
`mri_vol2vol`. Verify the result with `tkregister2 --mov <mov> --reg <reg>
--surfs` (the exact line `rbbr` prints on completion, [`scripts/rbbr:221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L221)).

**Predecessor:** [[bbregister]] (or `--init-reg`) → **rbbr** → **Successor:**
[[tkregister2]] (QC) / quantification tools.

## Gotchas and Caveats

> [!gotcha] No-op `--surf`
> `--surf <name>` is parsed into `surfname` but that variable is never read again
> ([`scripts/rbbr:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L28), [`scripts/rbbr:379-382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L379-L382)). The surface used is therefore always
> `bbregister`'s default (the white surface). Passing `--surf` has no effect.

> [!gotcha] The empty help block
> `rbbr -help` prints only the short option list; the `BEGINHELP` section is
> empty ([`scripts/rbbr:538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L538)). The authoritative description is the source.

> [!gotcha] First fit uses the chosen contrast; cost evaluation forces `--t2`
> The per-iteration surface-cost evaluation calls
> `bbregister --mov $yhat --t2 ...` with `--t2` hard-coded
> ([`scripts/rbbr:171-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L171-L172)), independent of the `--t1`/`--t2` you chose for the
> actual registration steps. This is intentional (the cost map is evaluated in a
> fixed polarity) but can surprise.

## Error Compensation and Guard Rails

- **Required-argument checks.** Output reg/lta, contrast, moving volume, init
  method, and subject existence are all validated before any work
  ([`scripts/rbbr:466-491`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L466-L491)).
- **Existence checks.** `--mov` and `--init-reg` paths are verified at parse time
  ([`scripts/rbbr:281-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L281-L284), [`scripts/rbbr:361-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L361-L364)).
- **Init-reg format autodetection.** `IsLTA` decides whether the supplied
  `--init-reg` is an LTA and converts with `lta_convert` accordingly, so either
  format is accepted ([`scripts/rbbr:124-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L124-L142)).
- **Fail-fast.** Every internal command is checked (`if($status) goto
  error_exit`), so a failure in any `bbregister`/`mri_gtmpvc`/`mri_binarize` step
  aborts with the offending command echoed ([`scripts/rbbr:241-245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L241-L245)).

## Known Bugs

- [[00162]] — `--rh-only` handler is a copy of `--lh-only` (sets `LHOnly=1; RHOnly=0`), so `--rh-only` registers the LEFT hemisphere.

## Related Tools

- [[bbregister]] — the underlying boundary-based registration that `rbbr` wraps and calls repeatedly; `rbbr` adds iterative outlier rejection on top of it.
- [[mri_gtmpvc]] — geometric-transfer-matrix partial-volume correction used (with `--gtm`) to synthesise the moving image, primarily for PET.
- [[mri_binarize]] — thresholds the per-vertex surface cost to build the outlier-inclusion mask each iteration.
- [[lta_convert]] — converts between tkregister `.dat` and `.lta` when an `--init-reg` is supplied.
- [[wiki/tools/mri_convert|mri_convert]] — extracts the single frame for `--frame`.
- [[tkregister2]] — the recommended visual QC of the resulting registration.

## Confidence and Gaps

**High confidence:** the iterative outlier-rejection algorithm, the complete flag
set and defaults, the `--gtm` two-argument behaviour, the mutual exclusivity of
the projection flags, and the `--init-reg` reg/lta handling — all read directly
from [`scripts/rbbr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr).

> [!gap] `--rh-only` and `--init-header` appear buggy
> `--rh-only` sets the left-hemisphere variables (so it does not select the right
> hemisphere), and `--init-header` stores a token with a trailing colon. Both are
> read straight from the source; whether they are intended is a question for the
> developers and may warrant a [bug] page.

> [!gap] `--surf` has no effect
> The parsed `surfname` is never used; the surface is always `bbregister`'s
> default. Confirm with the developers whether `--surf` was meant to forward a
> `--surf`/`--white` option to `bbregister`.

## References

- FreeSurfer source: [`scripts/rbbr`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr) (v8.2.0).
- Built-in usage: `rbbr` with no arguments ([`scripts/rbbr:508-535`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rbbr#L508-L535)).
- Greve DN, Fischl B. *Accurate and robust brain image alignment using boundary-based registration.* NeuroImage 48(1):63-72, 2009. (the BBR method that `bbregister` and hence `rbbr` implement)
