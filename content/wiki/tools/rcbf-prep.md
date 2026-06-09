---
title: "rcbf-prep"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rcbf-prep"
families: []                     # standalone perfusion-prep wrapper, no mri_*/mris_* family
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[mri_vol2surf]]"
  - "[[mri_vol2vol]]"
  - "[[mri_segstats]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The intensity conversion (subtract 2048, divide by 5) is specific to a Siemens PASL WIP pulse-sequence scaling; it is applied unconditionally with no flag to disable or change it."
  - "There is a --t/--template and a --seg handling subtlety: $template is overwritten to the converted copy before bbregister, and $seg is built from $segname in check_params; cross-checked but the rcbf-merge companion tool was not read."
tags:
  - perfusion
  - asl
  - rcbf
  - cerebral-blood-flow
  - surface-sampling
  - group-analysis
---

# rcbf-prep

## Summary

`rcbf-prep` prepares a regional cerebral blood flow (rCBF) perfusion map — as
produced by Siemens ASL scanners (typically the `ep2d_pasl` PASL sequence) — for
FreeSurfer-based group analysis. It converts the rCBF volume to floating point,
rescales the raw scanner values into physical units of **mL/100 g/min** using the
documented Siemens PASL scaling, registers the perfusion map to the subject's
FreeSurfer anatomy (with [[bbregister]], unless a registration is supplied),
then resamples the calibrated rCBF onto (a) each hemisphere's surface in native
and `fsaverage` space, (b) the MNI305 volume, and (c) the subject's anatomical
volume for ROI statistics. Finally it computes per-ROI mean rCBF with
[[mri_segstats]]. The outputs are the standard ingredients for a surface- or
volume-based group perfusion study and can be combined across subjects with the
companion `rcbf-merge`.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/rcbf-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep)
- **Binary/script location:** `$FREESURFER_HOME/bin/rcbf-prep`
- **Forces NIfTI output** for all FSL calls: `setenv FSLOUTPUTTYPE NIFTI` ([`scripts/rcbf-prep:5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L5)).
- **Tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L64) (cast to float, convert template), [`fslmaths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L73) (intensity calibration), [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L94) (registration when `--reg` not given), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L104) (surface sampling), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L119) (MNI305 and anatomical resampling), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L136) (ROI averaging), and the helper `reg2subject`.

## Purpose and Context

ASL perfusion imaging yields a volume whose voxel values encode cerebral blood
flow, but the scanner stores them in arbitrary digital units with an offset and
scale. To do a FreeSurfer group analysis you need that volume (a) in physical
units, (b) co-registered to each subject's anatomy, and (c) sampled into the
common spaces used for cross-subject statistics (the cortical surface in
`fsaverage`, the MNI305 volume, and per-ROI summaries). `rcbf-prep` automates
exactly this preparation, producing a self-contained output directory per
subject. The per-subject directories are then merged with `rcbf-merge` for the
actual group study.

It is a stand-alone preprocessing tool run by hand (or from a perfusion
pipeline); it is **not** part of [[wiki/pipelines/recon-all|recon-all]]. The
built-in help points to the FreeSurfer wiki page `RcbfProc` for context
([`scripts/rcbf-prep:323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L323)).

## Inputs

### Required Inputs

| Input | Flag | Notes |
|-------|------|-------|
| rCBF volume | `--rcbf` | the raw perfusion map (Siemens PASL output); must exist ([`scripts/rcbf-prep:158-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L158-L165)) |
| Output directory | `--o` | created if absent ([`scripts/rcbf-prep:259-262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L259-L262)) |
| Subject | `--s` (or `--reg`) | FreeSurfer subject; must exist under `$SUBJECTS_DIR`. With `--reg`, the subject is read from the registration via `reg2subject` ([`scripts/rcbf-prep:177-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L177-L186)) |

Optional inputs: a registration (`--reg`, an `.lta`), a template volume (`--t`,
the volume the registration is defined against; defaults to the rCBF itself),
a segmentation (`--seg`, default `aparc+aseg.mgz`), and an ROI colour table
(`--roitab`, default `$FREESURFER_HOME/FreeSurferColorLUT.txt`).

### Input Assumptions

> [!assumption] Raw Siemens PASL rCBF and a reconstructed subject
> The input is assumed to be a raw Siemens ASL rCBF map whose values follow the
> PASL WIP scaling (offset 2048, scale 5 — see Mathematical Foundations). The
> subject must be a completed [[wiki/pipelines/recon-all|recon-all]] run: the
> script requires `$SUBJECTS_DIR/<subj>/mri/<segname>` (default
> `aparc+aseg.mgz`) and uses the subject's surfaces and Talairach transform for
> surface and MNI305 sampling. If you supply `--reg` it must be an `.lta`
> registering the template to that subject.

## Outputs

### Files Created

All under the `--o` output directory ([`scripts/rcbf-prep:64-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L64-L141)):

| File | Contents |
|------|----------|
| `rcbf.nii` | the rCBF cast to float **and** calibrated to mL/100 g/min (the working volume) |
| `template.nii` | the registration template (copy/convert of `--t` or the rCBF) |
| `roi.table` | copy of the ROI colour table used |
| `register.lta` | the perfusion→anatomy registration (copied from `--reg`, or computed by `bbregister`) |
| `lh.rcbf.mgh`, `rh.rcbf.mgh` | rCBF sampled onto the subject's native surface (projfrac 0.5) |
| `lh.rcbf.fsaverage.mgh`, `rh.rcbf.fsaverage.mgh` | rCBF sampled onto the `fsaverage` surface |
| `rcbf.mni305.nii` | rCBF resampled to MNI305 at 2 mm (trilinear) |
| `roi.dat` | per-ROI summary statistics (mean rCBF, etc.) from `mri_segstats` |
| `rcbf-prep.log` | full command trace |

The intermediate `rcbf.anat.nii` (rCBF in the subject's anatomical space, used
only for the ROI stats) is deleted at the end ([`scripts/rcbf-prep:141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L141)).

### Output Specifications

The surface overlays are one value per vertex (mL/100 g/min) sampled at 50 % of
the cortical thickness (`--projfrac 0.5`). `rcbf.mni305.nii` is a 2 mm-isotropic
MNI305/Talairach-space volume (`mri_vol2vol --tal --talres 2`). `roi.dat` is the
standard `mri_segstats` summary table keyed by the ROI colour table.

## Mathematical Foundations

> [!math] Siemens PASL intensity calibration
> The raw scanner values are converted to physical perfusion units by
> $$ \text{rCBF}_{\text{mL/100g/min}} = \frac{\text{raw} - 2048}{5} $$
> implemented as `fslmaths $rcbf -sub 2048 -div 5 $rcbf`
> ([`scripts/rcbf-prep:73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L73)). The source notes this is "based on Siemens
> documentation for the pulse sequence, e.g.
> Appl_Guide_WIP_N4_414A_VB15A_PASL_V3.3.pdf" ([`scripts/rcbf-prep:70-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L70-L72)).
> The offset 2048 removes the digital baseline; the divisor 5 maps the remaining
> range onto mL/100 g/min.

All other operations are resampling/averaging delegated to the FreeSurfer tools
(`mri_vol2surf`, `mri_vol2vol`, `mri_segstats`); `rcbf-prep` performs no other
numerics itself.

> [!gotcha] The calibration is unconditional and Siemens-PASL-specific
> There is **no** flag to disable or change the `-sub 2048 -div 5` step. If your
> rCBF is already in physical units, or came from a different scanner/sequence,
> the result will be wrong. This is the single most important thing to verify
> before using `rcbf-prep`.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/rcbf-prep:150-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L150-L247)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | path | *(required)* | Output directory (created if needed). |
| `--rcbf` | path | *(required)* | Input rCBF perfusion volume; must exist. |
| `--s` | string | *(required unless `--reg`)* | FreeSurfer subject id; must exist under `$SUBJECTS_DIR`. |
| `--reg` | path (.lta) | — | Use this existing registration instead of running `bbregister`; the subject is derived from it with `reg2subject`. |
| `--t` | path | rCBF itself | Template volume the registration is defined against (the volume `bbregister` aligns); converted to `template.nii`. |
| `--seg` | string | `aparc+aseg.mgz` | Segmentation (under `<subj>/mri/`) used by `mri_segstats` for ROI averaging. |
| `--roitab` | path | `$FREESURFER_HOME/FreeSurferColorLUT.txt` | ROI colour table selecting which structures are summarised; copy a trimmed version to restrict ROIs. |
| `--log` | path | `<outdir>/rcbf-prep.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | boolean | — | Send the log to `/dev/null`. |
| `--tmpdir` | path | `<outdir>/tmpdir.rcbf` | Temp directory; setting it disables cleanup. |
| `--nocleanup` | boolean | cleanup on | Keep the temp directory. |
| `--cleanup` | boolean | on | Remove the temp directory. |
| `--debug` | boolean | off | `set echo`/`verbose` tracing. |
| `--help` | boolean | — | Print help and exit. |
| `--version` | boolean | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--s` vs `--reg`: supply one or the other
> If you give `--reg`, the subject is taken from the registration
> (`reg2subject`) and you do **not** need `--s`; if you give `--s`, `rcbf-prep`
> runs `bbregister --bold --init-fsl` to create the registration itself
> ([`scripts/rcbf-prep:90-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L90-L99)). A subject is still required by the parameter
> check, so with only `--reg` the subject must resolve from the reg file.

> [!gotcha] The internal `bbregister` assumes BOLD-like contrast and FSL init
> When it computes the registration, `rcbf-prep` hard-codes
> `bbregister --mov template --bold --init-fsl` ([`scripts/rcbf-prep:94-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L94-L95)).
> If your perfusion template does not register well under those assumptions,
> compute the registration separately and pass it with `--reg`.

> [!gotcha] `--t` is converted and then used as the bbregister moving image
> The template is copied to `template.nii` and **that** copy becomes `$template`
> before registration ([`scripts/rcbf-prep:79-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L79-L82)). If `--t` is omitted, the
> template defaults to the (raw, pre-calibration) rCBF volume
> ([`scripts/rcbf-prep:271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L271)).

- `--roitab` interacts with `--seg`: `mri_segstats` summarises the structures in
  `--seg` that appear in `--roitab`. Trim the colour table to limit the ROIs
  ([`scripts/rcbf-prep:327-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L327-L332)).

## Typical Use Cases

### 1. Standard run from subject id

```bash
rcbf-prep --o /data/perf/sub01 \
  --rcbf /data/perf/sub01/rcbf_raw.nii \
  --s sub01
# → calibrated rcbf.nii, ?h.rcbf[.fsaverage].mgh, rcbf.mni305.nii, roi.dat
```

### 2. Reuse an existing registration

```bash
rcbf-prep --o /data/perf/sub01 \
  --rcbf rcbf_raw.nii \
  --reg sub01.perf2anat.lta
```

### 3. Restrict the ROI summary

```bash
# Use a trimmed colour table so roi.dat only contains the ROIs you care about.
grep -E "Left-Hippocampus|Right-Hippocampus" \
  $FREESURFER_HOME/FreeSurferColorLUT.txt > my.rois.txt
rcbf-prep --o /data/perf/sub01 --rcbf rcbf_raw.nii --s sub01 \
  --roitab my.rois.txt
```

## Pipeline Context

`rcbf-prep` is a **per-subject perfusion preprocessing** tool that feeds a group
analysis. It is **not** invoked by [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** Siemens ASL acquisition + [[wiki/pipelines/recon-all|recon-all]]
(for the subject's anatomy/segmentation) → **rcbf-prep** (calibrate, register,
resample, ROI-average) → **Successor:** `rcbf-merge` (combine the per-subject
outputs) → surface/volume group statistics (e.g. `mri_glmfit`). Internally it
chains [[bbregister]] → [[mri_vol2surf]]/[[mri_vol2vol]] → [[mri_segstats]].

## Gotchas and Caveats

> [!gotcha] Output values are always in mL/100 g/min
> Because the Siemens PASL calibration is applied unconditionally, the surface,
> MNI305, and ROI outputs are all in mL/100 g/min — meaningful only if the input
> really was a raw Siemens PASL rCBF map (see Mathematical Foundations).

> [!gotcha] Surface sampling is fixed at mid-thickness
> Both `mri_vol2surf` calls use `--projfrac 0.5` ([`scripts/rcbf-prep:104-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L104-L105),
> [`scripts/rcbf-prep:110-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L110-L111)); there is no flag to change the projection
> fraction.

> [!gotcha] MNI305 output is fixed at 2 mm trilinear
> `rcbf.mni305.nii` is produced with `mri_vol2vol --tal --talres 2 --interp
> trilinear` ([`scripts/rcbf-prep:119-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L119-L121)); these are not configurable.

## Error Compensation and Guard Rails

- **Required-argument and existence checks.** `--rcbf`, `--o`, subject existence,
  and the segmentation file are all validated before processing
  ([`scripts/rcbf-prep:253-277`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L253-L277)); `--rcbf`/`--reg`/`--t`/`--roitab` existence is
  checked at parse time.
- **Sensible defaults.** Missing `--t` defaults to the rCBF; missing `--roitab`
  defaults to the full FreeSurfer colour table; missing `--reg` triggers an
  automatic `bbregister` ([`scripts/rcbf-prep:271-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L271-L272), [`scripts/rcbf-prep:90-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L90-L99)).
- **Fail-fast.** Every step is guarded by `if($status) exit 1`, so any
  conversion/registration/sampling failure aborts the run.
- **Float cast.** The rCBF is converted to float up front (`mri_convert -odt
  float`) so the subtraction/division does not lose precision
  ([`scripts/rcbf-prep:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L64)).

## Related Tools

- [[bbregister]] — registers the perfusion template to the subject's anatomy when `--reg` is not supplied (with `--bold --init-fsl`).
- [[mri_vol2surf]] — samples the calibrated rCBF onto the native and `fsaverage` cortical surfaces.
- [[mri_vol2vol]] — resamples the rCBF to MNI305 (2 mm) and to the subject's anatomical space for ROI stats.
- [[mri_segstats]] — computes per-ROI mean rCBF using the segmentation and colour table.
- [[wiki/tools/mri_convert|mri_convert]] — casts the rCBF to float and converts the template.
- `rcbf-merge` *(no wiki page yet)* — the companion that merges per-subject `rcbf-prep` outputs for group analysis.

## Confidence and Gaps

**High confidence:** the full processing sequence, the Siemens PASL calibration,
the complete flag set and defaults, the `--s`/`--reg` interaction, and the fixed
sampling parameters — all read directly from
[`scripts/rcbf-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep).

> [!gap] Scanner/sequence specificity of the calibration
> The `-sub 2048 -div 5` calibration is hard-coded for a specific Siemens PASL
> WIP. Whether it applies to other ASL implementations (pCASL, other vendors,
> other software versions) is not established by the code; treat non-Siemens-PASL
> input as out of scope.

## References

- FreeSurfer source: [`scripts/rcbf-prep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep) (v8.2.0).
- Built-in help (`BEGINHELP`): [`scripts/rcbf-prep:312-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rcbf-prep#L312-L332).
- FreeSurfer wiki: `surfer.nmr.mgh.harvard.edu/fswiki/RcbfProc` (referenced by the help).
- Siemens PASL application guide (e.g. `Appl_Guide_WIP_N4_414A_VB15A_PASL_V3.3.pdf`) for the intensity scaling.
