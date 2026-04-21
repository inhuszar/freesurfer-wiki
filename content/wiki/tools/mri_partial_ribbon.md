---
title: "mri_partial_ribbon"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_partial_ribbon/mri_partial_ribbon.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_aparc2aseg]]"
  - "[[mri_convert]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be installed in 8.2.0"
  - "Partial volume fraction calculation method not fully traced"
tags:
  - cortical-ribbon
  - partial-volume
  - surface
  - attic
---

# mri_partial_ribbon

## Summary

`mri_partial_ribbon` computes partial volume fractions for voxels within the cortical ribbon. Given the inner (white) and outer (pial) surface for each hemisphere, plus an input volume and a CMA mask, it determines for each voxel the fraction of its volume that lies within the cortical ribbon (between the white and pial surfaces). This is an attic tool.

> [!gotcha] Attic tool
> Source is in `attic/`. May not be compiled or installed in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_partial_ribbon/mri_partial_ribbon.cpp`
- **Original author:** Andre van der Kouwe

## Purpose and Context

Conventional volume-based cortical analysis assigns each voxel entirely to one tissue class (cortex, WM, etc.). However, near cortical boundaries, partial volume mixing occurs — a voxel may be partly cortex and partly WM or CSF. `mri_partial_ribbon` estimates these fractions by computing the geometric intersection of each voxel with the ribbon region bounded by the pial and white surfaces. The output can be used for partial-volume-corrected volume estimates or surface-to-volume projection.

## Inputs

| Argument | Description |
|----------|-------------|
| `<inner_lh>` | Left hemisphere white matter surface (`lh.white`) |
| `<outer_lh>` | Left hemisphere pial surface (`lh.pial`) |
| `<inner_rh>` | Right hemisphere white matter surface (`rh.white`) |
| `<outer_rh>` | Right hemisphere pial surface (`rh.pial`) |
| `<input_vol>` | Input volume (geometry template) |
| `<output_vol>` | Output partial volume fraction volume |
| `<cma_mask>` | (optional) CMA label mask |

## Outputs

- Partial volume fraction volume: each voxel contains a value in [0, 1] indicating the fraction within the cortical ribbon.

## Mathematical Foundations

For each voxel, the partial volume fraction $f_i$ is estimated as the proportion of the voxel volume occupied by the cortical ribbon:

$$
f_i = \frac{V_i \cap \text{ribbon}}{V_i}
$$

where $V_i$ is the voxel volume and `ribbon` is the region between the inner (white) and outer (pial) surfaces.

> [!gap] Intersection algorithm
> The exact method for computing the voxel-surface intersection (ray casting, signed distance field, or other) was not identified from the brief source inspection.

## Configuration Options

| Argument | Description |
|----------|-------------|
| (positional 1) | Left inner surface (white) |
| (positional 2) | Left outer surface (pial) |
| (positional 3) | Right inner surface (white) |
| (positional 4) | Right outer surface (pial) |
| (positional 5) | Input volume |
| (positional 6) | Output volume |
| (positional 7, optional) | CMA mask |

No optional flags identified from the brief source inspection (the `usage()` function shows all 7 positional arguments).

## Typical Use Cases

```bash
# Compute partial volume fractions in cortical ribbon
mri_partial_ribbon \
  lh.white lh.pial \
  rh.white rh.pial \
  orig.mgz partial_ribbon.mgz \
  aseg.mgz
```

## Pipeline Context

Not part of `recon-all`. Research tool for partial volume correction in cortical morphometry or fMRI analyses. Provides information complementary to [[mri_aparc2aseg]].

## Gotchas and Caveats

- Tool is in `attic/`; availability uncertain.
- All surface files must be in the same coordinate space as the input volume.
- The CMA mask argument is optional; omitting it processes the entire volume.
- The output volume has the same geometry as the input volume.

## Related Tools

- [[mri_aparc2aseg]] — parcellation to volume mapping (related but different purpose)
- [[mri_convert]] — format conversion

## Confidence and Gaps

**Low confidence:** tool is in attic; partial volume computation method not verified.
