---
title: "vol2segavg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/vol2segavg"
families: []                     # standalone segment-averaging driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_binarize]]"
  - "[[mri_mask]]"
  - "[[mri_vol2vol]]"
  - "[[mri_matrix_multiply]]"
  - "[[tkregister2]]"
  - "[[reg2subject]]"
  - "[[extract_seg_waveform]]"
  - "[[vol2subfield]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - averaging
  - sampling
  - roi
  - timeseries
  - fmri
---

# vol2segavg

## Summary

`vol2segavg` computes the average value of an input volume inside one or more segments of a segmentation, after resampling the input into the segmentation's space. The output is either a text file (one number per time point) or a small volume, so it works equally for a single 3D image (one mean per ROI) or a 4D fMRI/time-series volume (a full average waveform). It binarises the requested segmentation labels, optionally erodes/dilates the mask, optionally crops to a bounding box for speed, resamples the input with nearest-neighbour interpolation, and averages with [[mri_segstats]]. In effect it is a front end to [[mri_segstats]] that removes the requirement that the input and segmentation already be in the same voxel space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vol2segavg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg)
- **Binary/script location:** `$FREESURFER_HOME/bin/vol2segavg`
- **Key helpers invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L103) (build the label mask), [`mri_mask -bb`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L118) (crop to bounding box), [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L94) (header registrations), [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L133) (compose registrations), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L140) (resample input), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L146) (average over the segment), [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L360), and `fs_temp_dir`/`fname2stem` utilities.

## Purpose and Context

A recurring need in quantitative and functional neuroimaging is to reduce a volume to one number (or one time-course) per anatomical ROI — e.g. mean FA in the corpus callosum, mean BOLD signal in a white-matter mask for nuisance regression, or a CSF time-course for physiological denoising. [[mri_segstats]] does the averaging, but it requires the input and the segmentation to already occupy the same voxel grid. In practice the contrast of interest (diffusion, BOLD) lives on a different grid from the anatomical segmentation.

`vol2segavg` bridges that gap. It takes the input volume, a segmentation, and a registration between them (or `--regheader` to use the headers), and handles the resampling internally before averaging. It additionally bakes in shortcuts for the most common nuisance ROIs — white matter (`--wm`), ventricular CSF (`--vcsf`), and extracerebral CSF (`--xcsf`) — by pre-selecting the appropriate label IDs from `aparc+aseg`/`apas+head`.

It is a manual analysis utility and is **not** part of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Resamples the input to the segmentation, not vice versa
> Unlike approaches that map the segmentation down into the functional space,
> `vol2segavg` brings the *input* up into the *segmentation* space (nearest
> neighbour). Combined with the bounding-box optimisation this keeps the cost low
> even for many time points while leaving the segmentation labels untouched.

## Inputs

### Required Inputs

- **Input volume** (`--i`) — any volume readable by [[mri_vol2vol]] (3D or 4D; `nii`, `nii.gz`, `mgz`, …). The contrast to be averaged.
- **Segmentation** (`--seg`, or a convenience flag) — a label volume. May be an absolute path, or a name resolved under `$SUBJECTS_DIR/<subject>/mri/` when a subject is known ([`scripts/vol2segavg:367-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L367-L378)).
- **Registration** — either `--reg` (an input→segmentation registration; subject is read from it via [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L360)) **or** `--regheader` (derive the registration from the two volumes' headers). One of the two is mandatory ([`scripts/vol2segavg:362-365`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L362-L365)).
- **Output** (`--o`) — `.txt` (text waveform) or a volume format (`.mgh`, `.nii`, …); the format is auto-detected (see below).

### Input Assumptions

> [!assumption] Registration maps input to segmentation
> `--reg` is interpreted as the registration between the **input volume** and the
> **segmentation volume**. If you only have an input→`orig` registration and a
> segmentation that is header-aligned to `orig`, that LTA also serves here because
> the segmentation shares `orig`'s RAS space. With `--regheader`, the script
> assumes the two volumes already coincide in scanner/RAS space and computes the
> mapping from headers alone ([`scripts/vol2segavg:92-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L92-L99)).

> [!assumption] Default segment id is 1
> If no `--segid` (and no `--wm`/`--vcsf`/`--xcsf`) is given, the segment id list
> defaults to `1` ([`scripts/vol2segavg:379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L379)). The binary mask is built from
> exactly the requested ids, and everything inside the mask is averaged as a
> single ROI.

## Outputs

### Files Created

| File | Set by | Contents |
|------|--------|----------|
| output (`--o`) — **text** | output name has no volume extension | [[mri_segstats]] `--avgwf`: the per-time-point mean of the input over the ROI |
| output (`--o`) — **volume** | output name is `.mgh`/`.nii`/… | [[mri_segstats]] `--avgwfvol`: the same average waveform stored as a 1-voxel-per-frame volume |
| `<output>.vol2segavg.log` | always | run log next to the output |

The text-vs-volume decision is made by testing whether [`fname2stem`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L83) recognises a binary-volume extension on the output name: success → `--avgwfvol`, failure → `--avgwf` ([`scripts/vol2segavg:83-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L83-L89)).

### Output Specifications

For a 3D input the output is a single value (the ROI mean). For a 4D input it is a length-*T* waveform (one mean per frame). All voxels matching any requested label id are pooled into one ROI — `vol2segavg` does **not** report per-label statistics separately (that is what plain [[mri_segstats]] does). Averaging is performed on the input *resampled into the segmentation grid* (nearest neighbour), restricted to segment id `1` of the internal binary mask ([`scripts/vol2segavg:146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L146)).

## Mathematical Foundations

The averaging is an unweighted mean over the masked voxels (computed by [[mri_segstats]]); per-time-point for 4D data. The only non-trivial bookkeeping is the **registration chain** used by the bounding-box path.

> [!math] Bounding-box registration chain
> With the bounding box on (default), the script crops the binary mask to its
> bounding box (`binsegsub`) and composes three registrations so the input lands
> in the cropped frame:
> $$T_{\text{in}\to\text{bb}} = T_{\text{bb}\to\text{seg}}^{-1} \; \circ \; T_{\text{in}\to\text{seg}},$$
> implemented as [`mri_matrix_multiply -im $reg -iim $sub2seg -om $vol2subseg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L133)
> where `$sub2seg` ($T_{\text{bb}\to\text{seg}}$) is a header registration from
> the cropped mask back to the full segmentation. The mean over the cropped ROI
> is provably identical to the mean over the full-FoV ROI, but the input is only
> resampled into the small bounding-box volume.

> [!internal] Masking, cropping, and averaging math live in the sub-tools
> Label selection and morphology are in [[mri_binarize]] (`--match`,
> `--erode`/`--dilate`); bounding-box extraction in [[mri_mask]] (`-bb`); the
> mean and optional mean-removal in [[mri_segstats]] (`--avgwf`/`--avgwfvol`,
> `--avgwf-remove-mean`).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/vol2segavg:203-330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L203-L330)).

#### Required / core I/O

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input volume to average (3D or 4D). |
| `--seg` | string | *(required\*)* | Segmentation volume; absolute path or name under `$SUBJECTS_DIR/<subject>/mri/`. (\*or set via a convenience flag.) |
| `--o` | string | *(required)* | Output file: `.txt` → text waveform; volume extension → average-waveform volume. |
| `--reg` | string | *(required\*)* | Input→segmentation registration; subject inferred from it. (\*or use `--regheader`.) |
| `--regheader`<br>`--reg-header` | bool | off | Derive the registration from the volume headers instead of `--reg`. |
| `--s` | string | — | Subject name; needed to resolve a relative `--seg` when `--reg` is not given. |

#### Segment selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--segid` | int (repeatable) | `1` | Add a label id to the ROI. Repeat for multiple labels; all are pooled. |
| `--aparc+aseg` | bool | off | Set `--seg` to `aparc+aseg.mgz` (resolved under the subject's `mri/`). |
| `--wm` | bool | off | Use `aparc+aseg.mgz` and the white-matter label set `2 41 7 46 251 252 253 254 255 77 78 79`. |
| `--vcsf` | bool | off | Use `aparc+aseg.mgz` and the ventricular-CSF label set `4 5 43 44 31 63`. |
| `--xcsf` | bool | off | Use `apas+head.mgz` and the extracerebral-CSF label `257`. |
| `--erode`<br>`--nerode` | int | `0` | Erode the binary mask by N voxels ([[mri_binarize]] `--erode`). |
| `--dilate`<br>`--ndilate` | int | `0` | Dilate the binary mask by N voxels ([[mri_binarize]] `--dilate`). |

#### Averaging behaviour

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mul` | float | — | Multiply the input by this scalar before averaging ([[mri_segstats]] `--mul`). |
| `--bb` | bool | **on** | Crop to a bounding box around the segmentation for efficiency. |
| `--no-bb` | bool | off | Disable the bounding box; resample over the full segmentation FoV. |
| `--remove-mean` | bool | off | Remove the temporal mean from the waveform ([[mri_segstats]] `--avgwf-remove-mean`). |

#### Runtime

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--log` | string | `<output>.vol2segavg.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto (`fs_temp_dir`) | Use a named temp directory and **do not** clean it up. |
| `--nocleanup` | bool | off | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory when done. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |

### Configuration Interactions

> [!gotcha] `--reg` and `--regheader` are alternatives, not partners
> You must supply exactly one mechanism for the input↔segmentation mapping. With
> `--reg`, the subject is read from the registration; with `--regheader`, the
> mapping is computed from headers and a subject is only needed to resolve a
> relative `--seg` name ([`scripts/vol2segavg:354-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L354-L378)).

> [!gotcha] `--wm`/`--vcsf`/`--xcsf` overwrite `--seg` and append ids
> Each nuisance shortcut sets the segmentation file *and* appends its label ids
> to whatever `--segid` list you have so far
> ([`scripts/vol2segavg:226-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L226-L239)). Combining two of them (e.g.
> `--wm --vcsf`) leaves the segmentation at the *last* shortcut's file but pools
> *both* id sets — usually not what you want. Use one shortcut at a time, or build
> the id list explicitly with `--segid` plus an explicit `--seg`.

> [!gotcha] Output format is inferred from the filename extension
> There is no `--text`/`--vol` switch: name the output `roi.dat`/`roi.txt` for a
> text waveform, or `roi.nii`/`roi.mgh` for a volume
> ([`scripts/vol2segavg:83-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L83-L89)).

- `--no-bb` only changes efficiency; the help and code note it yields the same
  values as the bounding-box path ([`scripts/vol2segavg:110-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L110-L113)).
- `--mul` is applied inside [[mri_segstats]] and so scales the reported means
  (e.g. unit conversion).
- `--tmp`/`--tmpdir` implies `--nocleanup`.

## Typical Use Cases

### 1. Mean FA in the corpus callosum

```bash
vol2segavg --segid 251 --segid 252 --segid 253 --segid 254 --segid 255 \
  --aparc+aseg --reg register.dat --i fa.nii.gz --o cc.fa.dat
```

Pools the five CC labels of `aparc+aseg` and writes the single mean FA to a text
file.

### 2. White-matter nuisance time-course for fMRI denoising

```bash
# 4D BOLD averaged over an eroded WM mask → a regressor time-series.
vol2segavg --wm --erode 2 --reg bold2anat.lta \
  --i bold.nii.gz --o wm.nuisance.dat
```

The `--wm` shortcut selects the WM labels from `aparc+aseg`; `--erode 2` shrinks
the mask away from the GM/WM boundary to reduce partial-volume contamination.

### 3. CSF waveform as a small volume, mean removed

```bash
vol2segavg --vcsf --reg bold2anat.lta --i bold.nii.gz \
  --remove-mean --o vcsf.wf.mgh
```

Writes the ventricular-CSF average waveform (mean removed) as a volume rather
than text.

## Pipeline Context

`vol2segavg` is a stand-alone analysis utility; it is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or [[trac-all]] (it appears only in
`scripts/CMakeLists.txt`).

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (for `aparc+aseg` /
`apas+head` or any segmentation) and a registration of the input to that
segmentation ([[bbregister]], [[mri_coreg]], or a header registration) →
**vol2segavg** → **Successors:** statistical modelling (e.g. nuisance regression,
diffusion ROI analysis).

It is a sibling of [[extract_seg_waveform]] (which targets a 4D time-course with
the same bounding-box trick and adds VSM/B0 support and detrending) and of
[[vol2subfield]] (which targets header-registered subfield volumes and can emit
the composite registration).

## Gotchas and Caveats

> [!gotcha] All requested labels are merged into one ROI
> The segmentation is binarised over the union of the requested ids, so the
> output is a single average — not one value per label. For per-label statistics,
> call [[mri_segstats]] directly on a co-registered input.

> [!gotcha] Nearest-neighbour resampling
> The input is resampled with `--interp nearest`
> ([`scripts/vol2segavg:140-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L140-L141) and
> [`:157-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L157-L158)). This avoids smoothing across the
> ROI boundary but means each segmentation voxel takes the value of the single
> nearest input voxel.

> [!gotcha] Erosion can empty a small ROI
> `--erode` on a thin structure can remove every voxel, leaving an empty mask and
> an [[mri_segstats]] error. Check the mask size if you erode aggressively.

## Error Compensation and Guard Rails

- **Existence and argument checks.** Missing input/segmentation/output, or a
  missing `--reg`/`--regheader`, abort with explicit messages
  ([`scripts/vol2segavg:336-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L336-L366)).
- **Relative segmentation resolution.** A `--seg` not found as given is retried
  under `$SUBJECTS_DIR/<subject>/mri/`
  ([`scripts/vol2segavg:367-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L367-L378)).
- **Auto header registration.** When `--reg` is omitted (and `--regheader` set),
  a header registration is computed automatically with `tkregister2_cmdl`
  ([`scripts/vol2segavg:92-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L92-L99)).
- **Fail-fast.** Each sub-command checks `$status` and jumps to `error_exit`,
  which prints the failing command.
- **Bounding-box equivalence.** The bounding-box optimisation is designed to be
  numerically identical to the full-FoV computation; it is purely a performance
  guard rail for many-frame inputs.

## Related Tools

- [[mri_segstats]] — performs the actual averaging (`--avgwf`/`--avgwfvol`, `--mul`, `--avgwf-remove-mean`).
- [[mri_binarize]] — builds the label mask and applies erosion/dilation.
- [[mri_mask]] — extracts the bounding box around the mask (`-bb`).
- [[mri_vol2vol]] — resamples the input into the (cropped) segmentation grid.
- [[mri_matrix_multiply]] — composes the registration chain for the bounding-box path.
- [[tkregister2]] — `tkregister2_cmdl` computes the header registrations.
- [[reg2subject]] — reads the subject name from `--reg`.
- [[extract_seg_waveform]], [[vol2subfield]] — sibling sample-then-average utilities.

## Confidence and Gaps

**High confidence:** complete flag set, the bounding-box registration chain, the
text-vs-volume output detection, the nuisance-ROI label sets, default segment id,
and all guard rails — read directly from
[`scripts/vol2segavg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg).

## References

- FreeSurfer source: [`scripts/vol2segavg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg) (v8.2.0).
- Built-in help: `vol2segavg --help` (the `BEGINHELP` block, [`scripts/vol2segavg:421-439`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2segavg#L421-L439)).
- See [[mri_segstats]] for the meaning of `--avgwf`, `--avgwfvol`, `--mul`, and `--avgwf-remove-mean`.
