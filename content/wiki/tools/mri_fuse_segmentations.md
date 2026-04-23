---
title: "mri_fuse_segmentations"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_fuse_segmentations/mri_fuse_segmentations.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[recon-all]]"
  - "[[mri_convert]]"
  - "[[mri_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
tags:
  - segmentation
  - longitudinal
  - fusion
---

# mri_fuse_segmentations

## Summary

`mri_fuse_segmentations` fuses multiple cross-sectional segmentation volumes (asegs) from different time points into a single consensus estimate, typically used to initialise a longitudinal segmentation. The fusion is guided by both the segmentations themselves and the corresponding intensity (norm) volumes, using a Gaussian temporal weighting. Based on Sabuncu et al., MICCAI 2009 (SNIP).

## Source Information

- **Language:** C++
- **Source file:** `mri_fuse_segmentations/mri_fuse_segmentations.cpp`
- **Original author:** Bruce Fischl
- **Reference:** Sabuncu et al., "Probabilistic Brain Atlas Fusion," MICCAI 2009 (SNIP paper)

## Purpose and Context

In longitudinal FreeSurfer processing, a base template is created from all available time points. The initial segmentation of this template benefits from incorporating evidence from all time-point segmentations rather than relying on a single atlas label. `mri_fuse_segmentations` implements the SNIP (Subject-Specific Non-linear Image Prior) approach, which creates a weighted combination of cross-sectional segmentation labels, with weights derived from both label agreement and intensity similarity.

This tool is called during `recon-all -base` to initialise the segmentation of the base template.

## Inputs

The input volume and output path are **positional arguments** (not flags): the second-to-last positional argument is the input base template, and the last positional argument is the output path. Flags provide the per-time-point volumes and transforms.

| Flag | Short | Description |
|------|-------|-------------|
| `<in_vol>` | — | Input target volume (base template) — **positional, second-to-last** |
| `<out_vol>` | — | Output fused segmentation — **positional, last** |
| `--norm <vol> [...]`<br>`-n` | `-n` | Normalised T1 volumes for each time point |
| `--aseg <vol> [...]`<br>`-a` | `-a` | Segmentation volumes for each time point |
| `--nocc <vol> [...]`<br>`-c` | `-c` | Segmentation volumes without corpus callosum labels; replaces incorrect --aseg-nocc |
| `--trx <lta> [...]`<br>`-t` | `-t` | Registration transforms for each time point (or `identity.nofile`) |
| `--sigma <s>`<br>`-s` | `-s` | Cross-time sigma for temporal Gaussian weighting (default: 3.0) |
| `--debug <x> <y> <z>`<br>`-d` | `-d` | Enable debug output at the specified voxel coordinate |

## Outputs

- Fused segmentation volume: a single MGZ file combining information from all time points.

## Mathematical Foundations

For each voxel in the target volume, the fused label is determined by a weighted vote across time-point segmentations. The weight for each time point is based on the intensity similarity between the normalised volumes, modulated by a Gaussian temporal kernel:

$$
w_t = \exp\left(-\frac{d_t^2}{2\sigma_t^2}\right)
$$

where $d_t$ is a measure of intensity dissimilarity (or temporal distance in a study design) and $\sigma_t$ is the cross-time sigma parameter (default 3.0 mm or 3.0 time units).

The fused label is:

$$
L^*(\mathbf{x}) = \arg\max_l \sum_t w_t \cdot \mathbf{1}[L_t(\mathbf{x}) = l]
$$

Time-point volumes are resampled into the base space using the supplied transforms before fusion. The `aseg_nocc` (no corpus callosum) versions are used alongside the full asegs.

> [!internal] See `MRIfuseSegmentations()`
> The fusion logic is implemented in `static MRI *MRIfuseSegmentations(...)` within the same file.

## Configuration Options

Flag list verified against `mri_fuse_segmentations/mri_fuse_segmentations.cpp`. Input and output are positional, not flags.

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `<in_vol>` | — | volume | required | Input base template — positional (second-to-last arg) |
| `<out_vol>` | — | volume | required | Output fused segmentation — positional (last arg) |
| `--norm <vol> [...]`<br>`-n` | `-n` | volumes | required | Normalised T1 per time point |
| `--aseg <vol> [...]`<br>`-a` | `-a` | volumes | required | Segmentation per time point |
| `--nocc <vol> [...]`<br>`-c` | `-c` | volumes | required | Segmentation without CC labels per time point |
| `--trx <lta> [...]`<br>`-t` | `-t` | LTA files | — | Transform per time point |
| `--sigma <s>`<br>`-s` | `-s` | float | 3.0 | Cross-time Gaussian weighting sigma |
| `--debug <x> <y> <z>`<br>`-d` | `-d` | ints | — | Debug at voxel coordinate |

> [!gotcha] No --in, --out, or --aseg-nocc flags
> These flags do not exist in the source. Input and output volumes are positional. The no-CC segmentation flag is --nocc (or `-c`), not --aseg-nocc.

## Configuration Interactions

- The number of `--norm`, `--aseg`, and `--nocc` arguments must match.
- If `--trx` is supplied, its count must also match the number of time points.
- If `--trx` is omitted entirely, all time-point volumes are assumed to be already in the same space as the target.
- Providing `identity.nofile` as a transform entry is equivalent to no resampling for that time point.
- Lower `--sigma` values give more weight to time points most similar to the base; higher values weight all time points more equally.

## Typical Use Cases

```bash
# Fuse segmentations from 3 time points into base
# Note: input and output volumes are positional (last two args)
mri_fuse_segmentations \
  --norm tp1/mri/norm.mgz tp2/mri/norm.mgz tp3/mri/norm.mgz \
  --aseg tp1/mri/aseg.mgz tp2/mri/aseg.mgz tp3/mri/aseg.mgz \
  --nocc tp1/mri/aseg.auto_noCCseg.mgz tp2/mri/aseg.auto_noCCseg.mgz tp3/mri/aseg.auto_noCCseg.mgz \
  --trx base/mri/transforms/tp1_to_base.lta \
        base/mri/transforms/tp2_to_base.lta \
        base/mri/transforms/tp3_to_base.lta \
  base/mri/orig.mgz \
  base/mri/aseg.fused.mgz
```

## Pipeline Context

Called within `recon-all -base` as part of the longitudinal base template creation. It feeds a fused initial segmentation into the GCA-based labelling step for the base template. The tool appears early in the base processing after the transforms from each time point to the base have been computed.

## Gotchas and Caveats

- All input volumes must have matching label schemes. Mixing segmentations from different atlas versions will produce incorrect results.
- Resampling of norm volumes uses trilinear interpolation after converting to float to prevent rounding; this is done explicitly in the source.
- When `--trx` is omitted entirely, all segmentations must already be in the target space.

## Related Tools

- [[recon-all]] — calls this during `-base` processing
- [[mri_ca_label]] — subsequent segmentation step that uses the fused result
- [[mri_convert]] — format conversion

## Confidence and Gaps

**High confidence:** Full flag list verified from source. Positional input/output convention, `--nocc` (not --aseg-nocc), `--aseg`/`-a`, `--norm`/`-n`, `--trx`/`-t`, `--sigma`/`-s`, `--debug`/`-d` all confirmed. Algorithm inferred from well-commented source code and explicit function signatures.

> [!gap] `--argc` not a real flag
> There is no `--argc` flag in the source. The mention of `argc` refers to the internal C++ argument counter, not a command-line option.
