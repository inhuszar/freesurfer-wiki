---
title: "extract_seg_waveform"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/extract_seg_waveform"
families: []                     # standalone waveform-extraction driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[mri_vol2vol]]"
  - "[[mri_concatenate_lta]]"
  - "[[tkregister2]]"
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[vol2segavg]]"
  - "[[vol2subfield]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - waveform
  - timeseries
  - fmri
  - roi
  - b0-correction
  - detrending
---

# extract_seg_waveform

## Summary

`extract_seg_waveform` extracts a single average time-course (waveform) from a 4D input volume over the voxels belonging to one or more segmentation labels. It binarises the requested labels, crops to a bounding box, resamples the input into that segmentation frame with nearest-neighbour interpolation — optionally applying a voxel-shift map for B0/EPI distortion correction at the same time — and then averages over the ROI with [[mri_segstats]]. Optional intensity scaling and polynomial detrending are available. It is purpose-built for pulling nuisance or seed time-courses (e.g. white matter, CSF, or an anatomical seed ROI) out of fMRI data. It is a tcsh front end over [[mri_binarize]], [[mri_mask]], [[tkregister2]], [[mri_concatenate_lta]], [[mri_vol2vol]], [[mri_segstats]], and (for detrending) [[wiki/tools/mri_glmfit|mri_glmfit]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/extract_seg_waveform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform)
- **Binary/script location:** `$FREESURFER_HOME/bin/extract_seg_waveform`
- **Key helpers invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L93) (label mask), [`mri_mask -bb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L104) (bounding box), [`tkregister2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L110) and [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L116) (registration chain to the bounding box), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L126) (resample, with optional `--vsm`), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L138) (average over ROI), [`mri_glmfit --qa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L151) and [`mri_convert --ascii`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L157) (detrending path), plus `UpdateNeeded`/`isargflag`.

## Purpose and Context

Resting-state and task fMRI denoising routinely needs reference time-courses extracted from anatomically defined regions: a white-matter or ventricular-CSF signal for nuisance regression (aCompCor-style), or a seed ROI for connectivity. The segmentation that defines those regions (e.g. `aparc+aseg`) lives in the anatomical space, while the BOLD series lives on the EPI grid, possibly with B0-induced geometric distortion. Extracting a faithful ROI time-course therefore requires both a space transformation and, ideally, distortion correction.

`extract_seg_waveform` performs exactly this. Given the BOLD volume, the segmentation, a registration between them (or `--regheader`), and optionally a voxel-shift map (VSM), it maps the BOLD into the segmentation's bounding-box frame and averages the chosen labels into a single waveform. The help notes this direction (input → segmentation) is preferable to mapping the segmentation into the EPI space because partial-volume effects are handled slightly better, no fill parameter is needed, and the VSM can be applied in the same resampling step ([`scripts/extract_seg_waveform:424-427`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L424-L427)).

It is a manual fMRI analysis utility and is **not** part of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Input is resampled to the segmentation, with the VSM folded in
> The BOLD is brought into the segmentation's (cropped) frame — not the other way
> around — and a `--vsm` voxel-shift map is applied during that single
> [[mri_vol2vol]] resampling ([`scripts/extract_seg_waveform:126-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L126-L132)),
> so B0 unwarping and spatial transformation happen together.

## Inputs

### Required Inputs

- **Input volume** (`--i`) — a 4D (or 3D) volume to extract the waveform from (typically a BOLD run).
- **Segmentation** (`--seg`) — a label volume defining the ROI. Must exist ([`scripts/extract_seg_waveform:353-356`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L353-L356)).
- **At least one segment id** (`--id`) — one or more label values to pool into the ROI ([`scripts/extract_seg_waveform:349-352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L349-L352)).
- **Registration** — either `--reg` (an input→segmentation [[lta-format|LTA]]) **or** `--regheader` (use the volume headers). Exactly one is required ([`scripts/extract_seg_waveform:333-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L333-L340)).
- **Output waveform** (`--o`) — the destination file for the extracted time-course.

### Optional input

- **Voxel-shift map** (`--vsm`) — a B0 distortion field applied during resampling. Requires `--reg` (not allowed with `--regheader`) and must exist ([`scripts/extract_seg_waveform:341-348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L341-L348), [`:361-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L361-L366)).

### Input Assumptions

> [!assumption] `--reg` maps the input volume to the segmentation
> The registration is taken as the transform from the input (BOLD) to the
> segmentation volume; it is composed with the segmentation→bounding-box header
> registration to land the input in the cropped frame
> ([`scripts/extract_seg_waveform:110-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L110-L120)). With `--regheader`,
> the input and segmentation are assumed to already coincide in RAS space.

> [!assumption] Color table must define segid 1
> After cropping, the ROI is relabelled to id `1` and [[mri_segstats]] is run with
> `--id 1` and a color table; the script notes the ctab **must** contain a
> `segid = 1` entry or [[mri_segstats]] errors
> ([`scripts/extract_seg_waveform:138-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L138-L139)). The default ctab is
> `$FREESURFER/FreeSurferColorLUT.txt`.

## Outputs

### Files Created

| File | Set by | Contents |
|------|--------|----------|
| output waveform (`--o`) | always | the ROI-average time-course: a text waveform ([[mri_segstats]] `--avgwf`) in the normal path, or an ASCII waveform written by [[mri_convert]] in the `--demean` path |
| `<output>.log` | always | run log |

Intermediate files (binary mask, bounding-box mask, registrations, the resampled BOLD, and the average-waveform volume) are written under the temporary directory and removed on cleanup unless `--nocleanup`/`--tmp` is used.

### Output Specifications

The output is a one-column (per-frame) waveform of length *T* equal to the number of input time points: the unweighted mean of the input over all voxels matching any requested `--id`, computed in the segmentation's bounding-box frame. Optional `--mul`/`--div` rescale it linearly, `--rescale-local` normalises it by its own ROI mean, and `--demean` replaces it with the residual after removing the mean plus first- and second-order temporal trends.

## Mathematical Foundations

> [!math] Registration chain into the bounding box
> Let $T_{\text{in}\to\text{seg}}$ be `--reg`. The segmentation is binarised and
> cropped to its bounding box (`segbb`), and a header registration
> $T_{\text{seg}\to\text{bb}}$ is found with [`tkregister2 --regheader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L110-L111).
> The two are composed,
> $$T_{\text{in}\to\text{bb}} = T_{\text{seg}\to\text{bb}} \circ T_{\text{in}\to\text{seg}},$$
> via [`mri_concatenate_lta $reg $seg2bbreg $segbbreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L116), and used by
> [[mri_vol2vol]] (optionally with `--vsm`) to resample the input into the cropped
> frame. Averaging over the cropped ROI is identical to averaging over the full-FoV
> ROI but avoids resampling many time points into a full 256³ volume.

> [!math] Detrending (`--demean`)
> The average-waveform volume is passed to [`mri_glmfit --qa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L151-L152),
> whose QA design models a constant plus first- and second-order polynomial trends;
> the **residual** (`eres.mgh`) is then converted to ASCII as the output. Thus
> `--demean` removes the mean and low-order drift, not merely the mean.

> [!internal] Masking, resampling, and GLM math live in the sub-tools
> Label selection in [[mri_binarize]]; bounding box in [[mri_mask]]; resampling and
> VSM application in [[mri_vol2vol]]; averaging and rescaling in [[mri_segstats]]
> (`--avgwf`/`--avgwfvol`, `--mul`/`--div`, `--avgwf-norm-mean`); detrending in
> [[wiki/tools/mri_glmfit|mri_glmfit]] (`--qa`).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/extract_seg_waveform:196-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L196-L313)).

#### Required / core I/O

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input volume (4D or 3D) to extract the waveform from. |
| `--seg` | string | *(required)* | Segmentation volume defining the ROI. |
| `--id` | int(s) | *(required)* | One or more label ids to pool. Accepts several values after one flag (`--id 2 41`) or repeated `--id`; consumes tokens until the next flag ([`scripts/extract_seg_waveform:234-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L234-L240)). |
| `--o` | string | *(required)* | Output waveform file. |
| `--reg` | string | *(required\*)* | Input→segmentation [[lta-format|LTA]]. (\*or `--regheader`.) |
| `--regheader` | bool | off | Use the volume headers instead of `--reg`. |
| `--sd` | string | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR` ([`setenv`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L214-L216)). |

#### Distortion correction and scaling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vsm` | string | — | Voxel-shift map for B0/EPI distortion correction, applied during resampling. Requires `--reg`. |
| `--mul` | float | — | Multiply the waveform by this value (combinable with `--div`). |
| `--div` | float | — | Divide the waveform by this value (combinable with `--mul`). |
| `--rescale-local`<br>`-rescale-local` | float | — | Rescale the waveform so its ROI mean equals this value ([[mri_segstats]] `--avgwf-norm-mean`). |
| `--demean` | bool | off | Replace the waveform with the residual after removing mean + 1st/2nd-order trends (via [[wiki/tools/mri_glmfit|mri_glmfit]] `--qa`). |
| `--no-demean` | bool | on | Keep the raw waveform (cancels `--demean`). |

#### Caching and runtime

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--force` | bool | off | Force regeneration of every intermediate even if up to date (`UpdateNeeded` is otherwise honoured). |
| `--no-force` | bool | on | Respect `UpdateNeeded` timestamps (cancels `--force`). |
| `--log` | string | `<output>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`/scratch` or output dir) | Use a named temp directory and **do not** clean it up. |
| `--nocleanup` | bool | off | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory when done. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version string and exit. |

### Configuration Interactions

> [!gotcha] `--regheader` and `--vsm` cannot be combined
> A VSM requires the `--reg` path; the script errors with "cannot spec both
> regheader and vsm" ([`scripts/extract_seg_waveform:341-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L341-L344)) and also
> errors if `--vsm` is given without `--reg`
> ([`scripts/extract_seg_waveform:345-348`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L345-L348)). Use `--reg` whenever you need
> distortion correction.

> [!gotcha] `--reg` and `--regheader` are mutually exclusive and one is required
> Specifying both errors ([`scripts/extract_seg_waveform:333-336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L333-L336));
> specifying neither also errors ([`:337-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L337-L340)).

> [!gotcha] `--demean` changes how the output is written
> Without `--demean`, [[mri_segstats]] writes the waveform directly via `--avgwf`.
> With `--demean`, [[mri_segstats]] is run **without** `--avgwf`
> ([`scripts/extract_seg_waveform:140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L140)); the average-waveform *volume*
> (`--avgwfvol`) is fed to [[wiki/tools/mri_glmfit|mri_glmfit]] and the detrended residual is converted to
> ASCII as the final output. So `--demean` always yields an ASCII text waveform.

> [!gotcha] `--id` greedily consumes following tokens
> `--id` keeps reading values until the next argument that looks like a flag
> (`isargflag`), so `--id 2 41 7 46` adds four labels in one go
> ([`scripts/extract_seg_waveform:234-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L234-L240)). Place a flag (not a bare value)
> after the id list.

- `--mul` and `--div` are explicitly designed to be combined (the help says so);
  both are passed to [[mri_segstats]].
- `--rescale-local` normalises by the ROI's own mean and is independent of
  `--mul`/`--div`.
- `--force` overrides the `UpdateNeeded` caching so changed flags take effect on
  re-runs; otherwise an up-to-date intermediate is reused.

## Typical Use Cases

### 1. White-matter nuisance regressor (with B0 correction)

```bash
# Pool aparc+aseg WM labels; apply VSM during resampling.
extract_seg_waveform --i bold.nii.gz --seg aparc+aseg.mgz \
  --id 2 41 --reg bold2anat.lta --vsm vsm.nii.gz \
  --o wm.waveform.dat
```

### 2. Ventricular-CSF time-course, detrended

```bash
extract_seg_waveform --i bold.nii.gz --seg aparc+aseg.mgz \
  --id 4 43 --reg bold2anat.lta --demean \
  --o vcsf.detrended.dat
```

Removes the mean and first/second-order drift from the CSF waveform via
[[wiki/tools/mri_glmfit|mri_glmfit]] `--qa`.

### 3. Seed ROI, header registration, rescaled to a target mean

```bash
extract_seg_waveform --i bold.nii.gz --seg seedroi.mgz \
  --id 1 --regheader --rescale-local 1000 \
  --o seed.waveform.dat
```

## Pipeline Context

`extract_seg_waveform` is a stand-alone fMRI analysis utility; it is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]] or [[trac-all]] (it appears
only in `scripts/CMakeLists.txt`).

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (for `aparc+aseg` or any
segmentation), a BOLD→anatomy registration ([[bbregister]]), and optionally a VSM
from an EPI distortion-correction step → **extract_seg_waveform** →
**Successors:** nuisance regression / connectivity modelling (e.g. via
[[wiki/tools/mri_glmfit|mri_glmfit]]).

It is the closest sibling of [[vol2segavg]]: both binarise a segmentation, crop to
a bounding box, resample the input there, and average with [[mri_segstats]].
`extract_seg_waveform` adds VSM/B0 support, `UpdateNeeded` caching, and built-in
polynomial detrending; [[vol2segavg]] adds the `--wm`/`--vcsf`/`--xcsf` shortcuts
and text-or-volume output selection. [[vol2subfield]] is the related subfield
variant.

## Gotchas and Caveats

> [!gotcha] Default version string is unexpanded
> The script sets `VERSION = '$Id$'` ([`scripts/extract_seg_waveform:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L7)),
> a leftover RCS/CVS keyword that is not substituted; `--version` prints the
> literal `$Id$` rather than a build version. This is cosmetic.

> [!gotcha] Bounding box keeps cost low for long runs
> The whole point of the bounding-box step is to avoid mapping a many-hundred-frame
> BOLD series into a full 256³ segmentation volume; the result is identical to the
> full-FoV computation ([`scripts/extract_seg_waveform:418-422`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L418-L422)).

> [!gotcha] Nearest-neighbour resampling
> The input is resampled with `--interp nearest`
> ([`scripts/extract_seg_waveform:126-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L126-L127)); each segmentation voxel
> takes the nearest input voxel's value, avoiding cross-boundary smoothing.

## Error Compensation and Guard Rails

- **Comprehensive argument checks.** Missing output/seg/input/id, conflicting
  `--reg`/`--regheader`, and `--vsm` misuse all abort with explicit messages
  ([`scripts/extract_seg_waveform:319-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L319-L370)).
- **Existence checks.** The segmentation, input, `--vsm`, and `--reg` files are all
  checked for existence before use.
- **`UpdateNeeded` caching.** Each stage (binarise, bounding box, resample, average)
  is skipped if its output is newer than its inputs, making re-runs cheap; `--force`
  overrides this ([`scripts/extract_seg_waveform:91-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L91-L147)).
- **Fail-fast.** Each sub-command checks `$status` and jumps to `error_exit`.

## Related Tools

- [[mri_segstats]] — averages the input over the ROI and applies `--mul`/`--div`/`--avgwf-norm-mean`.
- [[mri_binarize]] — builds the binary mask from the requested label ids.
- [[mri_mask]] — extracts the bounding box (`-bb`) around the mask.
- [[mri_vol2vol]] — resamples the input into the cropped frame, applying the VSM.
- [[mri_concatenate_lta]] — composes the input→bounding-box registration.
- [[tkregister2]] — computes the segmentation→bounding-box header registration.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — `--qa` design provides the mean + polynomial detrending for `--demean`.
- [[vol2segavg]], [[vol2subfield]] — sibling sample-then-average utilities.

## Confidence and Gaps

**High confidence:** complete flag set, the bounding-box registration chain, the
VSM application, the detrending path, the mutual-exclusion rules, `UpdateNeeded`
caching, and the ctab/`segid=1` requirement — read directly from
[`scripts/extract_seg_waveform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform).

## References

- FreeSurfer source: [`scripts/extract_seg_waveform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform) (v8.2.0).
- Built-in help: `extract_seg_waveform --help` (the `BEGINHELP` block, [`scripts/extract_seg_waveform:410-427`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/extract_seg_waveform#L410-L427)).
- See [[mri_segstats]] for `--avgwf`/`--avgwfvol`/`--avgwf-norm-mean` and [[wiki/tools/mri_glmfit|mri_glmfit]] for the `--qa` detrending design.
