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
last_agent_update: 2026-04-15
gaps:
  - "Full flag list requires help output verification"
  - "Upsampling factor interaction with output resolution not fully characterized"
  - "ctMerge color table format"
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

$$\text{USF} = 2 \Rightarrow \text{voxel size} = \frac{d_\text{orig}}{2} \text{ in each dimension}$$

where $d_\text{orig}$ is the original voxel size. Each voxel in the upsampled grid is classified by projecting its center to the nearest surface and testing whether it lies inside or outside the pial surface.

The output can optionally be returned to the original resolution by downsampling (majority-vote labeling).

> [!gap] Exact upsampling algorithm
> The precise voxel-filling algorithm using the pial surface tessellation is implemented in the GTM library (`gtm.h`). The algorithm may use signed distance functions or mesh intersection. Needs verification.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--s` | `<subject>` | FreeSurfer subject name |
| `--o` | `<vol>` | Output segmentation file (default: `gtmseg.mgz` in subject mri/) |
| `--usf` | `<N>` | Upsampling factor (default: 2) |
| `--output-usf` | `<N>` | Output resolution USF (default: same as `--usf`) |
| `--apas` | `<file>` | Subcortical segmentation file (default: `apas+head.mgz`) |
| `--ctxannot` | `<annot>` | Cortical annotation (default: `aparc.annot`) |
| `--lhbase` | `<N>` | LH cortical label base (default: 1000) |
| `--rhbase` | `<N>` | RH cortical label base (default: 2000) |
| `--subseg-wm` | — | Subdivide white matter by lobe annotation |
| `--wmannot` | `<annot>` | WM annotation for subdivision (default: `lobes.annot`) |
| `--wmlhbase` | `<N>` | LH WM label base (default: 3200) |
| `--wmrhbase` | `<N>` | RH WM label base (default: 4200) |
| `--keep-hypo` | — | Keep hypointensity labels (don't merge into WM) |
| `--keep-cc` | — | Keep corpus callosum label (don't merge) |
| `--erode-wm` | `<N>` | Erode WM by N iterations (3D or topological) |
| `--no-erode-wm-topo` | — | Use simple erosion instead of topological |
| `--merge-ctab` | `<ctab>` | Merge an additional color table |
| `--dmax` | `<mm>` | Maximum distance (mm) for surface search (default: 5.0) |
| `--nthreads` | `<N>` | OpenMP threads |
| `--debug` | — | Debug output |

## Configuration Interactions

- `--usf` and `--output-usf` can differ: `--usf` controls the intermediate high-resolution grid (for accurate surface placement), while `--output-usf` controls the final output resolution. If `--output-usf < --usf`, the result is downsampled from the fine grid.
- `--subseg-wm` activates white matter subdivision and requires `--wmannot` to specify the annotation used for WM labeling.
- `--keep-hypo` and `--keep-cc` prevent merging of hypointensity and corpus callosum labels, which otherwise are absorbed into adjacent WM labels.
- `--erode-wm` can improve cortical/WM boundary accuracy at the cost of reducing WM region sizes.

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

**Confident (from source):** Default parameter values (USF=2, dmax=5.0, apas+head input, aparc annotation, lhbase/rhbase labels), WM subdivision option, erosion options.

**Uncertain:** Full flag list needs help output verification; exact algorithm for high-resolution surface-driven segmentation; ctMerge color table format.
