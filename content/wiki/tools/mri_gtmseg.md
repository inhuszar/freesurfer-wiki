---
title: "mri_gtmseg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_gtmseg/mri_gtmseg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_gtmpvc]]"
  - "[[mri_aparc2aseg]]"
  - "[[mri_ca_label]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Upsampling factor interaction with output resolution not fully characterized"
  - "ctMerge color table format (--ctab argument)"
  - "Semantics of --lhminmax / --rhminmax (label range filtering details)"
  - "Semantics of --merge (merge seg IDs from external file into output)"
tags:
  - pet
  - segmentation
  - gtm
  - parcellation
---

# mri_gtmseg

## Summary

`mri_gtmseg` creates the anatomical segmentation volume used by [[mri_gtmpvc]] for Geometric Transfer Matrix (GTM) partial volume correction of PET data. It constructs a high-resolution segmentation by combining the FreeSurfer parcellation/segmentation outputs (e.g., `apas+head.mgz`, `aparc.annot`) with an optional upsampling step to produce a segmentation suitable for modeling the PET point spread function. The result is a single segmentation volume in the subject's native MRI space that distinguishes cortical parcels, subcortical structures, white matter, and extra-cranial tissue.

## Source Information

- **Source language:** C++
- **Source file:** `mri_gtmseg/mri_gtmseg.cpp`
- **Original author:** Douglas N. Greve
- **Dependencies:** `gtm.h` (GTM library), `mri2.h`, `resample.h`

## Purpose and Context

PET GTM correction requires a high-resolution anatomical segmentation that partitions the brain into ROIs with distinct expected activity levels. Standard FreeSurfer segmentations (e.g., `aparc+aseg`) are sufficient for large subcortical structures but may be inadequate for thin cortical ribbon regions because:

1. The cortex must be identified at high enough resolution to model PVE accurately.
2. Extra-cranial tissue (skull, scalp) must be included to account for spill-in from outside the brain.
3. White matter subdivisions and corpus callosum handling must be appropriate for the tracer.

`mri_gtmseg` addresses these requirements by:
- Upsampling the segmentation (default factor USF=2, i.e., 2× resolution in each dimension) using the FreeSurfer surface tessellations to precisely locate the cortex.
- Incorporating the cortical parcellation annotation (`aparc.annot`) to give each cortical parcel a unique label.
- Optionally subdividing white matter by lobe.
- Including a head/background region for extra-cranial tissue.

## Inputs

| Input | Source |
|-------|--------|
| `$SUBJECTS_DIR/<subject>/` | FreeSurfer recon-all output directory |
| `apas+head.mgz` | Subcortical segmentation + head (default) |
| `aparc.annot` | Cortical parcellation annotation (default) |

The tool reads from the subject's FreeSurfer directory; no explicit input volume flags are needed beyond `--s`.

## Outputs

| Output | Description |
|--------|-------------|
| `gtmseg.mgz` (default) | GTM segmentation volume (at original or upsampled resolution) |

The output is a label volume with integer label values corresponding to FreeSurfer CMA label conventions for subcortical regions, plus modified labels (1000+, 2000+) for cortical parcels.

## Mathematical Foundations

The upsampling algorithm inserts the surface boundaries (pial surface = cortical boundary) into the segmentation at a finer voxel grid:

$$
\text{USF} = 2 \Rightarrow \text{voxel size} = \frac{d_\text{orig}}{2} \text{ in each dimension}
$$

where $d_\text{orig}$ is the original voxel size. Each voxel in the upsampled grid is classified by projecting its center to the nearest surface and testing whether it lies inside or outside the pial surface.

The output can optionally be returned to the original resolution by downsampling (majority-vote labeling).

> [!gap] Exact upsampling algorithm
> The precise voxel-filling algorithm using the pial surface tessellation is implemented in the GTM library (`gtm.h`). The algorithm may use signed distance functions or mesh intersection. Needs verification.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s` | `<subject>` | (required) | FreeSurfer subject name |
| `--o` | `<vol>` | `gtmseg.mgz` | Output segmentation file (written to subject's `mri/` directory) |
| `--usf`<br>`--internal-usf` | `<N>` | 2 | Upsampling factor for high-resolution internal grid |
| `--output-usf` | `<N>` | same as `--usf` | Output resolution USF; if less than `--usf`, result is downsampled |
| `--apas` | `<file>` | `apas+head.mgz` | Subcortical segmentation + head file |
| `--ctab` | `<ctab>` | — | Read a color table (ASCII) and merge/overwrite into master ctab |
| `--ctx-annot` | `<annot> <lhbase> <rhbase>` | `aparc.annot 1000 2000` | Cortical annotation file and LH/RH label bases |
| `--subseg-wm` | — | off | Subdivide white matter by lobe (sets default: `lobes.annot`, lhbase 3200, rhbase 4200) |
| `--no-subseg-wm` | — | — | Disable WM subdivision (default) |
| `--wm-annot` | `<annot> <lhbase> <rhbase>` | — | WM annotation file and LH/RH WM bases; also enables `--subseg-wm` |
| `--keep-hypo` | — | off | Keep hypointensity labels (do not merge into WM) |
| `--no-keep-hypo` | — | — | Merge hypointensity labels into WM (default) |
| `--keep-cc` | — | off | Keep corpus callosum label |
| `--no-keep-cc` | — | — | Merge corpus callosum label (default) |
| `--wm-erode` | `<N>` | 0 | Erode WM labels (2, 41) by N iterations, replacing surviving voxels with 5001/5002 |
| `--wm-erode-topo` | `<topo>` | 1 | Topology for WM erosion: 1, 2, or 3 (face, edge, or corner connectivity) |
| `--merge` | `<segfile> <id1> [<id2> ...]` | — | Merge specified seg IDs from `<segfile>` into the output |
| `--lhminmax` | `<min> <max>` | 1000 1900 | Restrict LH cortical labels to this range |
| `--rhminmax` | `<min> <max>` | 2000 2900 | Restrict RH cortical labels to this range |
| `--dmax` | `<mm>` | 5.0 | Maximum distance (mm) from cortex for WM voxels to be considered unsegmented |
| `--sd`<br>`-sdir` | `<dir>` | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR` (also accepts `-SDIR`) |
| `--threads` | `<N>` | 1 | Number of OpenMP threads |
| `--max-threads` | — | — | Use maximum available OpenMP threads |
| `--max-threads-1` | — | — | Use (max − 1) OpenMP threads |
| `--debug` | — | off | Debug output |
| `--checkopts` | — | off | Check options and exit without running |

> [!gotcha] `--threads-max` and `--threads-max-1` do not exist
> The `print_usage()` text in the source mentions `--threads-max` and `--threads-max-1`, but the actual command-line parser (at `parse_commandline()`) handles `--max-threads` and `--max-threads-1`. Passing `--threads-max` will produce an "Option unknown" error. Use `--max-threads` and `--max-threads-1` instead.

## Configuration Interactions

- `--usf` / `--internal-usf` and `--output-usf` can differ: `--usf` controls the intermediate high-resolution grid (for accurate surface placement), while `--output-usf` controls the final output resolution. If `--output-usf < --usf`, the result is downsampled from the fine grid. Default `OutputUSF` is set equal to `USF` at startup.
- `--ctx-annot` takes three arguments: the annotation filename and LH/RH integer label bases. This replaces the former separate `--ctxannot`, `--lhbase`, `--rhbase` flags, which do **not** exist in the source.
- `--wm-annot` takes three arguments: annotation filename, LH WM base, RH WM base. It also sets `SubSegWM=1`. This replaces the former separate `--wmannot`, `--wmlhbase`, `--wmrhbase` flags, which do **not** exist in the source.
- `--subseg-wm` pre-populates defaults (lobes.annot, lhbase 3200, rhbase 4200); `--wm-annot` can subsequently override those values.
- `--keep-hypo` and `--keep-cc` prevent merging of hypointensity and corpus callosum labels, which otherwise are absorbed into adjacent WM labels.
- `--wm-erode` specifies a count of simple volumetric WM erosion iterations; `--wm-erode-topo` specifies the connectivity topology used during erosion (default 1 = face connectivity). When `--wm-erode N` is used, the surviving LH WM voxels are labeled 5001 ("Left-Shell-Cerebral-White-Matter") and RH WM voxels are labeled 5002.

## Typical Use Cases

**Standard GTM segmentation for PET analysis:**
```bash
mri_gtmseg --s bert --o bert_gtmseg.mgz
```

**With white matter subdivision for FDG-PET:**
```bash
mri_gtmseg --s bert --subseg-wm --o bert_gtmseg_wmsub.mgz
```

**Higher upsampling for thin-structure accuracy:**
```bash
mri_gtmseg --s bert --usf 4 --output-usf 2 --o bert_gtmseg_usf4.mgz
```

## Pipeline Context

`mri_gtmseg` is not part of `recon-all`. It runs after `recon-all` and before [[mri_gtmpvc]]:

1. `recon-all -all -s bert` — produces all FreeSurfer outputs
2. `mri_gtmseg --s bert` — creates GTM segmentation
3. `mri_gtmpvc --seg gtmseg.mgz ...` — performs PVC

## Gotchas and Caveats

> [!gotcha] Requires complete recon-all output
> `mri_gtmseg` reads multiple output files from the FreeSurfer subject directory: `apas+head.mgz` (or `aparc+aseg` + head mask), `lh.pial`, `rh.pial`, `lh.aparc.annot`, `rh.aparc.annot`. If `recon-all` did not complete or these files are missing, the tool will fail.

> [!gotcha] apas+head.mgz vs aparc+aseg.mgz
> The default input `apas+head.mgz` is not always present; it may need to be created. Alternatively, `aparc+aseg.mgz` with head information appended can substitute. Check the subject's `mri/` directory for available segmentation files.

> [!gotcha] Output label values differ from aparc+aseg
> The GTM segmentation uses modified label conventions (lhbase/rhbase offsets) for cortical parcels. These may not match the standard FreeSurfer LUT. Use the tool's output color table or `mri_gtmpvc`'s internal label handling.

## Related Tools

- [[mri_gtmpvc]] — uses mri_gtmseg output for partial volume correction
- [[mri_aparc2aseg]] — creates standard aparc+aseg segmentation
- [[mri_ca_label]] — performs subcortical segmentation

## Confidence and Gaps

**Confident (from source):** Full flag list verified against `parse_commandline()`. Default parameter values (USF=2, dmax=5.0, apas+head input, aparc annotation, ctx-annot bases 1000/2000, wm-annot bases 3200/4200 when `--subseg-wm` is active, KeepHypo=0, KeepCC=0, lhmin=1000/lhmax=1900, rhmin=2000/rhmax=2900), WM subdivision option, erosion options, thread control (`--max-threads` and `--max-threads-1`), `--merge`, `--lhminmax`, `--rhminmax`, `--ctab`, `--sd`.

**Confirmed:** `--threads-max` and `--threads-max-1` appear only in the help text (`print_usage()`), not in the parser; the actual accepted flags are `--max-threads` and `--max-threads-1`.

> [!gap] `--ctab` format
> `--ctab` reads an ASCII color table via `CTABreadASCII()`. The exact file format is documented in FreeSurfer's color table conventions but the merge semantics (which labels are overridden) are not explicitly described in the source.

> [!gap] `--merge` semantics
> `--merge segfile id1 id2 ...` merges the specified integer label IDs from an external segmentation file into the output. The exact behavior when a label already exists in the GTM segmentation is not documented in the source.

> [!gap] `--lhminmax` / `--rhminmax` semantics
> These flags set `lhmin`/`lhmax` and `rhmin`/`rhmax` fields on the GTM segmentation structure. The filtering effect (which labels are excluded) is implemented in the GTM library and not verified from this source alone.

**Uncertain:** Exact algorithm for high-resolution surface-driven segmentation (in `gtm.h`).
