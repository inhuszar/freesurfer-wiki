---
title: "mri_dist_surf_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_dist_surf_label/mri_dist_surf_label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_distance_transform]]"
  - "[[mri_cor2label]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact use case for combining surface distance map with label points is unclear from minimal source documentation"
tags:
  - distance
  - surface
  - label
  - waypoints
---

# mri_dist_surf_label

## Summary

`mri_dist_surf_label` computes the distance from a surface to a set of points specified in a label file (used as waypoints). For each point in the label, it samples the surface-to-surface distance map at the label point's voxel coordinates and writes the distances to a text output file. The full 3D distance volume is also written as a `.wd.mgz` file.

## Source Information

- **Language:** C++
- **Source file:** `mri_dist_surf_label/mri_dist_surf_label.cpp`

## Purpose and Context

This tool serves a specialized purpose: given a surface (e.g., the white matter surface), compute how far specific anatomical points (specified as a label file) are from that surface. This can be used for:
- Measuring cortical depth of specific landmarks
- Checking if labeled points lie within a certain distance of a surface
- Generating distance statistics for label-defined waypoints along a tractography pathway

> [!gap] Primary use case unclear
> The tool's docstring says "Computing distance from input surface and label points / waypoints." The connection between surface distance and label "waypoints" suggests a tractography or connectivity application, but this was not confirmed from the source.

## Inputs

Positional arguments (5 required):
1. **`surface`**: FreeSurfer surface file (e.g., `lh.white`)
2. **`label file`**: label file containing points whose distances will be measured
3. **`mri vol`**: reference MRI volume (defines the voxel grid for sampling)
4. **`output file`**: text output file for distances

## Outputs

- **`output file`**: text file with one distance value per label point (one per line, format `%2.2f`)
- **`output file.wd.mgz`**: 3D distance-from-surface volume (same dimensions as the input MRI), sampled at 0.5 mm resolution

## Mathematical Foundations

1. `MRIScomputeDistanceToSurface(mris, tmpvol, 0.5)`: computes a 3D Euclidean distance map from the surface at 0.5 mm resolution, using the input volume's dimensions. This is analogous to the fast marching computation in [[mri_distance_transform]].

2. `LabelToVoxel(area, mri_surf_dist, area)`: converts label point coordinates from RAS space to voxel indices in the distance volume.

3. `MRIsampleVolume(mri_surf_dist, xw, yw, zw, &dist)`: trilinearly interpolates the distance map at each label point's voxel coordinates.

## Configuration Options

No options — the tool takes only the four positional arguments.

## Configuration Interactions

None.

## Typical Use Cases

Compute distance of tractography waypoints from the white surface:
```bash
mri_dist_surf_label \
  lh.white \
  waypoints.label \
  orig.mgz \
  waypoint_distances.txt
```

## Pipeline Context

Specialized tool, not called by [[recon-all]]. Potential uses in:
- Tractography-based cortical depth analysis
- Validation of surface-projected label positions

## Gotchas and Caveats

> [!gotcha] Output file gets `.wd.mgz` appended automatically
> The code does `strcat(outfname, ".wd.mgz")` to generate the second output filename. This modifies the output path in memory, meaning the text file is written first with the original name, and the `.wd.mgz` volume is written with the modified name.

> [!gotcha] Label coordinates are converted to voxel space
> `LabelToVoxel()` converts the label's RAS coordinates to voxel coordinates in the distance volume. If the label was created in a different coordinate system than the surface (e.g., scanner RAS vs. tkRAS), the conversion may be incorrect.

> [!gotcha] Internal sampling resolution is hardcoded
> The distance-to-surface computation uses 0.5 mm internal resolution regardless of the input volume's voxel size.

## Related Tools

- [[mri_distance_transform]] — compute distance transform from a volumetric label
- [[mri_cor2label]] — create label files from volumes or surface overlays

## Confidence and Gaps

Confidence is **high**. The source is short (115 lines) and fully read. The exact use case context is uncertain but the mechanics are clear.
