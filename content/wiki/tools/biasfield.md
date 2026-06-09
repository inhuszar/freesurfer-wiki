---
title: "biasfield"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/biasfield"
families: []                     # standalone tcsh script; orchestrates mri_* + FSL
recon_all_stage: null
related:
  - "[[mri_fwhm]]"
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_vol2vol]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact field index ($6) of mri_segstats --sum used to extract the mean intensity was read from the awk but not validated against a real sum file."
tags:
  - bias-field
  - intensity-normalization
  - mri
  - quality-control
---

# biasfield

## Summary

`biasfield` estimates the **B1 intensity bias field** of a FreeSurfer subject by
dividing the (uncorrected) `orig.mgz` by the (intensity-normalized) `norm.mgz`,
smoothing the ratio by 10 mm FWHM to strip out anatomy, and normalizing the
result so that the mean bias in the central corpus callosum equals 1. It writes
`biasfield.mgz` to the subject's `mri/` directory. As a side product it also
produces `rawavg.cor.norm.mgz` — the native-resolution `rawavg.mgz` resampled to
256³/1 mm³ space (but **not** fully conformed) with the estimated bias field
divided out and CSF intensity normalized to 1. It is a small post-hoc utility
built on top of `mri_*` tools plus FSL's `fslmaths`/`avwmaths`; it is **not** part
of recon-all.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/biasfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield)
- **Binary/script location:** `$FREESURFER_HOME/bin/biasfield`
- **Original author:** Doug Greve ([`scripts/biasfield:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L10))
- **Key helpers invoked:**
  [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L67) (datatype check),
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L90) (mgz↔nii, rescale),
  FSL [`fslmaths`/`avwmaths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L54-L62) (voxelwise divide),
  [`mri_fwhm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L113) (10 mm smoothing),
  [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L122) (mean in an ROI),
  [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L157) (ventricle mask), and
  [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L137) (resampling).

> [!gotcha] Requires FSL
> Unlike most FreeSurfer scripts, `biasfield` shells out to FSL: it looks for
> `$FSLDIR/bin/avwmaths`, then `$FSLDIR/bin/fslmaths`, and aborts if neither
> exists ([`scripts/biasfield:54-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L54-L62)). It also forces
> `FSLOUTPUTTYPE=NIFTI` ([`scripts/biasfield:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L53)). FSL must be installed
> and `$FSLDIR` set.

## Purpose and Context

MR images have a smooth, multiplicative intensity inhomogeneity (the "bias field"
or "B1 field") from receive-coil sensitivity. recon-all removes it internally
(`mri_normalize` produces the corrected `norm.mgz` from the uncorrected
`orig.mgz`), but it does not save the bias field itself as an image.
`biasfield` recovers that field after the fact, so a user can **inspect** the
inhomogeneity for QC, or **apply the same correction** to another volume in the
subject's native space (e.g. a quantitative or co-registered scan) by dividing
that volume by `biasfield.mgz`.

The script is run by hand on a completed subject. It is referenced by, but not
unconditionally called from, the helper scripts `seg2recon` and `conf2hires`; it
is not part of the main recon-all stream.

## Inputs

### Required Inputs

Run inside `$SUBJECTS_DIR/<subject>/mri` ([`scripts/biasfield:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L64)), the
script reads these existing recon-all outputs (`[[mgz]]`):

- **`rawavg.mgz`** — the motion-corrected average of the raw inputs, in native
  voxel space; must **not** be conformed (datatype must not be `uchar`,
  [`scripts/biasfield:66-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L66-L77)).
- **`orig.mgz`** — the uncorrected conformed volume (256³, 1 mm³).
- **`norm.mgz`** — the bias-corrected (intensity-normalized) conformed volume.
- **`brain.mgz`** — used as the smoothing mask for [[mri_fwhm]].
- **`aseg.mgz`** — used both to find the central corpus callosum (label 253) for
  normalization and, via [[mri_binarize]] `--ventricles`, to build the CSF mask.

The only command-line input is the subject (`--s`).

### Input Assumptions

> [!assumption] rawavg.mgz (and the 001.mgz inputs) must be unconformed
> The whole point is that `rawavg.mgz` carries the **native, full-bit-depth**
> intensities. If `rawavg.mgz` is `uchar` (8-bit), the script assumes it has been
> conformed and aborts ([`scripts/biasfield:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L74-L77)). The help repeats:
> "this cannot be run if the rawavg.mgz is already conformed or if the inputs
> (001.mgz, etc) have been conformed" ([`scripts/biasfield:307-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L307-L308)).
> A standard recon-all run keeps `rawavg.mgz` unconformed, so this normally holds.

The method also assumes a normal recon-all `aseg.mgz` in which label **253** is
the central corpus callosum and the `--ventricles` shortcut selects lateral
ventricles, and a `brain.mgz` brain mask — i.e. a completed subject.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `biasfield.mgz` | `<subj>/mri/` | The estimated, 10 mm-smoothed, CC-normalized bias field (conformed 256³/1 mm³ geometry; mean = 1 in central CC) |
| `rawavg.cor.norm.mgz` | `<subj>/mri/` | `rawavg.mgz` resampled to `orig.mgz` geometry (256³, 1 mm³, *not* conformed) with the bias field divided out and ventricular CSF normalized to 1 |
| `biasfield.tal.mgz` | `<subj>/mri/` | (only with the internal `DoTal` switch) bias field resampled to Talairach/MNI305 space at 2 mm via `--tal` |
| `biasfield.log` | `<subj>/scripts/` | Full command log (previous run rotated to `.bak`) |

### Output Specifications

`biasfield.mgz` shares the geometry of `orig.mgz`/`norm.mgz` (conformed 256³,
1 mm³, float). It is a **dimensionless multiplicative field**: to bias-correct a
volume registered to this space, divide by `biasfield.mgz` (the comment at
[`scripts/biasfield:102-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L102-L104) explains the direction —
bright in `orig` where the field is large, then darkened by dividing). The mean
field value over the central corpus callosum is exactly 1 by construction.
`rawavg.cor.norm.mgz` is 256³/1 mm³ but, importantly, **regheader-resampled rather
than conformed**, so it is not interchangeable with conformed volumes.

## Mathematical Foundations

The bias field $B$ is estimated as the smoothed ratio of the uncorrected to the
corrected volume, then normalized:

> [!math] Bias-field estimate
> $$B_{\text{raw}}(v) = \frac{\text{orig}(v)}{\text{norm}(v)},\qquad
> B_{\text{sm}} = G_{10\text{mm}} * B_{\text{raw}}\ \ \text{(within the brain mask)},\qquad
> B(v) = \frac{B_{\text{sm}}(v)}{\overline{B_{\text{sm}}}\big|_{\text{CC}_{253}}}.$$
> $G_{10\text{mm}}$ is a 10 mm-FWHM Gaussian (via [[mri_fwhm]]
> `--smooth-only --mask brain.mgz`, [`scripts/biasfield:113-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L113-L114)),
> which removes anatomical structure and leaves the slowly-varying field.
> The denominator is the mean of $B_{\text{sm}}$ in aseg label 253 (central
> corpus callosum), obtained with [[mri_segstats]] `--id 253`
> ([`scripts/biasfield:122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L122)); the script divides the field by this mean
> via [[wiki/tools/mri_convert|mri_convert]] `--scale 1/mean`
> ([`scripts/biasfield:126-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L126-L130)). The corpus callosum is chosen because it is
> a large, intensity-homogeneous white-matter structure near the brain centre.

> [!math] Bias-corrected native volume
> $$\text{rawavg.cor}(v) = R_{\text{orig}}\!\bigl[\text{rawavg}\bigr](v),\qquad
> \text{rawavg.cor.norm}(v) = \frac{\text{rawavg.cor}(v)}{B_{\text{raw}}(v)}\cdot
> \frac{1}{\overline{(\cdot)}\big|_{\text{CSF}}}.$$
> `rawavg.mgz` is regheader-resampled to `orig` geometry ($R_{\text{orig}}$,
> [`scripts/biasfield:137-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L137-L138)), divided by the *unsmoothed*
> $B_{\text{raw}}$ (the `biasfield.nii` ratio, [`scripts/biasfield:144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L144)),
> then globally scaled so the mean in an eroded lateral-ventricle CSF mask is 1
> ([`scripts/biasfield:155-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L155-L175)). The ventricle mask is eroded by 2 voxels
> ([[mri_binarize]] `--ventricles --erode 2`) to avoid partial-volume edges.

> [!internal] All numerical operations are in the called tools
> The script performs no arithmetic itself beyond `awk '{print 1/$6}'` to invert
> the ROI mean into a scale factor ([`scripts/biasfield:126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L126),
> [`scripts/biasfield:168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L168)). Division is done by FSL
> `fslmaths -div`, smoothing by [[mri_fwhm]], statistics by [[mri_segstats]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/biasfield:196-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L196-L243)). The script is deliberately minimal —
there is **no** command-line control of the FWHM, the normalization label, or the
output names; those are hard-coded.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`--subject` | string (subject) | *(required)* | Subject ID; the tool `cd`s into `<subj>/mri`. |
| `--tmp`<br>`--tmpdir` | string (path) | `tmp.biasfield.$$` | Temp directory for intermediate NIfTIs (implies `--nocleanup`). |
| `--no-cleanup`<br>`--nocleanup` | bool | off (cleanup on) | Keep the temp directory afterwards. |
| `--debug` | bool | off | `set echo`/`verbose` tcsh tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print the version string and exit. |

> [!gotcha] No flag for Talairach output, FWHM, or normalization ROI
> The Talairach-space output (`biasfield.tal.mgz`) is gated by an internal
> `DoTal` variable that is initialized to 0 ([`scripts/biasfield:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L30)) and
> has **no command-line flag** to enable it
> ([`scripts/biasfield:178-184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L178-L184)); it never runs unless the source is
> edited. Likewise the 10 mm FWHM, the CC label (253), and the CSF erosion (2) are
> not exposed.

### Configuration Interactions

There are essentially no interacting options — the only switches are the subject,
the temp-dir handling, and debug/help/version. `--tmp` and `--nocleanup` both
suppress deletion of the temp directory; with neither, the temp dir is removed at
the end ([`scripts/biasfield:186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L186)).

## Typical Use Cases

### 1. Estimate and save a subject's bias field

```bash
# Writes mri/biasfield.mgz and mri/rawavg.cor.norm.mgz for QC.
biasfield --s bert
```

### 2. Inspect the field

```bash
biasfield --s bert
freeview -v $SUBJECTS_DIR/bert/mri/orig.mgz \
            $SUBJECTS_DIR/bert/mri/biasfield.mgz:colormap=heat:opacity=0.5
```

A near-uniform field (~1 everywhere) indicates little inhomogeneity; strong
gradients flag coil-sensitivity problems.

### 3. Apply the field to another volume in the same space

```bash
# A separate scan already resampled to the subject's conformed orig space:
fslmaths myscan_in_orig_space.nii -div $SUBJECTS_DIR/bert/mri/biasfield.nii \
         myscan_unbiased.nii
```

## Pipeline Context

`biasfield` is a **standalone, post-recon-all** utility. It is **not** invoked by
the main recon-all stream; it consumes recon-all's `orig.mgz`, `norm.mgz`,
`rawavg.mgz`, `brain.mgz`, and `aseg.mgz`. The helper scripts `seg2recon` and
`conf2hires` mention it, but the core anatomical pipeline does not call it.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (must have produced
`orig.mgz`/`norm.mgz`/`rawavg.mgz`/`brain.mgz`/`aseg.mgz`) → **biasfield** →
**Successors:** visual QC in [[wiki/tools/freeview|freeview]], or manual bias
correction of co-registered volumes by dividing by `biasfield.mgz`.

## Gotchas and Caveats

> [!gotcha] Fails if rawavg.mgz is conformed (uchar)
> The early datatype check aborts on a `uchar` `rawavg.mgz`
> ([`scripts/biasfield:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L74-L77)) because conformed 8-bit data has already
> been intensity-clamped and cannot yield a faithful bias estimate.

> [!gotcha] rawavg.cor.norm.mgz is 256³/1 mm³ but NOT conformed
> It is produced by `mri_vol2vol --regheader`
> ([`scripts/biasfield:137-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L137-L138)), so it matches `orig`'s grid without the
> full conform (orientation/range) normalization. Both the help
> ([`scripts/biasfield:305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L305)) and the comment
> ([`scripts/biasfield:135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L135)) stress this; do not treat it as a conformed
> volume.

> [!gotcha] `biasfield.nii` (unsmoothed ratio) vs `biasfield.mgz` (smoothed)
> The native correction of `rawavg.cor` divides by the **unsmoothed**
> `biasfield.nii` ratio in the temp dir, whereas the saved `biasfield.mgz` is the
> **smoothed, normalized** field. If you delete the temp dir (`--nocleanup` not
> set) you keep only the smoothed `.mgz`; reproducing `rawavg.cor.norm.mgz`
> exactly requires the unsmoothed ratio.

> [!gotcha] Requires aseg label 253 and ventricle labels
> Normalization assumes a standard FreeSurfer `aseg.mgz` (CC label 253 present,
> lateral ventricles selectable by `--ventricles`). A non-standard or empty
> segmentation makes the ROI means meaningless or zero (a zero CC mean would make
> the scale factor blow up).

## Error Compensation and Guard Rails

- **Conformed-input guard.** Aborts up front if `rawavg.mgz` is `uchar`
  ([`scripts/biasfield:74-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L74-L77)).
- **FSL presence guard.** Aborts if neither `avwmaths` nor `fslmaths` is found
  ([`scripts/biasfield:54-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L54-L62)).
- **Subject existence check** ([`scripts/biasfield:250-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L250-L257)).
- **Fail-fast.** Every helper command is followed by `if($status) exit 1`, so any
  failure stops the script immediately.
- **Log rotation.** A previous `biasfield.log` is moved to `.bak` rather than
  overwritten ([`scripts/biasfield:80-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L80-L81)).

## Related Tools

- [[mri_fwhm]] — applies the 10 mm-FWHM smoothing (with a brain mask) that removes anatomy from the ratio.
- [[mri_segstats]] — computes the mean field value in the corpus-callosum and CSF ROIs used for normalization.
- [[mri_binarize]] — builds the eroded ventricular-CSF mask (`--ventricles --erode 2`).
- [[wiki/tools/mri_convert|mri_convert]] — converts mgz↔nii and applies the `--scale` normalization.
- [[mri_vol2vol]] — resamples `rawavg.mgz` to `orig` geometry (and, when enabled, to Talairach).
- [[wiki/pipelines/recon-all|recon-all]] — produces every input this tool reads; the bias correction it recovers was applied internally by `mri_normalize`.

## Confidence and Gaps

**High confidence:** the full estimation recipe (orig÷norm → 10 mm smooth →
CC-normalize), the FSL dependency, the conformed-input guard, the complete (tiny)
flag set, the hard-coded FWHM/label/erosion, the disabled-by-default `DoTal`
branch, and all output filenames — read directly from
[`scripts/biasfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield).

> [!gap] mri_segstats `--sum` column index
> The mean intensity is pulled with `awk '{print 1/$6}'`
> ([`scripts/biasfield:126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L126), [`scripts/biasfield:168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L168)),
> assuming the mean is field 6 of the (non-comment) [[mri_segstats]] `--sum` line.
> This was read from the awk but not validated against a generated sum file; if
> the segstats column layout differs, the scale factor would be wrong.

## References

- FreeSurfer source: [`scripts/biasfield`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield) (v8.2.0).
- Built-in help: `biasfield --help` (the `BEGINHELP` block,
  [`scripts/biasfield:297-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/biasfield#L297-L309)).
- FSL `fslmaths` — external dependency used for the voxelwise division.
