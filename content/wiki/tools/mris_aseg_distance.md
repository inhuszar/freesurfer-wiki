---
title: "mris_aseg_distance"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_aseg_distance/mris_aseg_distance.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_anatomical_stats]]"
  - "[[mri_ca_label]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full flag set needs verification; source lives in attic/."
  - "Normalisation mode behaviour needs testing."
tags:
  - surface
  - aseg
  - distance
  - subcortical
---

# mris_aseg_distance

## Summary

`mris_aseg_distance` computes, for each vertex on a cortical surface, the Euclidean or other distance to the centroid of a specified subcortical structure in the `aseg` segmentation. The result is a per-vertex scalar field that encodes the relationship between cortical location and subcortical structure position, potentially useful for studying cortical-subcortical spatial organisation.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_aseg_distance/mris_aseg_distance.cpp`
- **Note:** Source resides in the `attic/` subdirectory — may be legacy or lightly maintained.

## Purpose and Context

Studies of brain organisation sometimes require quantifying how close each cortical region is to subcortical structures. By projecting the centroid of a subcortical label (from the `aseg` volume) into the same coordinate space as the white surface, and computing per-vertex distances, this tool produces a continuous cortical map of proximity. The `--dot` flag provides a directional projection (dot product with surface normal), and `--divide` enables spatial subdivision of the target label.

## Inputs

| Input | Description |
|-------|-------------|
| `<subject>` | FreeSurfer subject name (positional) |
| `<hemi>` | Hemisphere: `lh` or `rh` (positional) |
| `<label>` | Subcortical aseg label integer (positional) |
| `<out_fname>` | Output file path (positional) |

- Requires `SUBJECTS_DIR` environment variable.
- Reads `aseg.mgz` and the white surface from the subject's directory.
- Requires an LTA transform between aseg and surface spaces (loaded internally).

## Outputs

| Output | Description |
|--------|-------------|
| `<out_fname>` | Per-vertex scalar overlay (curv format) of distances/projections |

## Mathematical Foundations

For the default mode, the tool finds the centroid $(x_c, y_c, z_c)$ of the specified aseg label by averaging voxel RAS coordinates of all voxels with that label. For each surface vertex $v$ with position $(x_v, y_v, z_v)$:

$$d(v) = \sqrt{(x_v - x_c)^2 + (y_v - y_c)^2 + (z_v - z_c)^2}$$

With `--dot`, the signed projection along the surface normal $\hat{n}(v)$ is computed instead:

$$d(v) = (\mathbf{p}_v - \mathbf{c}) \cdot \hat{n}(v)$$

With `--normalize`, values are divided by the maximum distance.

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `--sdir <dir>` | Override SUBJECTS_DIR | env var |
| `--surf <name>` | Surface name to use | `white` |
| `--notransform` | Skip LTA coordinate transform | off |
| `--dist` | Compute distance (default behaviour) | on |
| `--dot` | Compute dot product with surface normal | off |
| `--normalize` | Normalise output values | off |
| `--divide <n>` | Divide label into `n` spatial units | 1 |

> [!gap] Flag set incomplete
> Flags were inferred from global variables in the source. The `get_option()` function body was not fully read. Verify against the source for the complete flag list.

## Configuration Interactions

- `--dist` and `--dot` are mutually exclusive modes; using `--dot` overrides the distance calculation.
- `--divide` splits the aseg label into spatial subunits and computes a separate distance map for each unit; this enables resolving directional structure relationships.

## Typical Use Cases

```bash
# Compute distance from each lh vertex to thalamus proper (label 10)
mris_aseg_distance bert lh 10 bert/surf/lh.thalamus_dist.mgz
```

## Pipeline Context

Not part of the standard `recon-all` pipeline. Used in research analyses exploring cortical-subcortical spatial relationships.

## Gotchas and Caveats

> [!gotcha] Attic placement
> Source is in `attic/`. May not be installed in all distributions. Verify binary availability.

> [!gotcha] LTA transform required
> An LTA (linear transform array) between the aseg volume and the surface coordinate system is required. If it cannot be found, the tool will fail unless `--notransform` is specified.

## Related Tools

- [[mris_anatomical_stats]] — cortical morphometry statistics
- [[mri_ca_label]] — produces aseg-like subcortical labels

## Confidence and Gaps

**Confident:** Core purpose and mathematical model inferred from source comments and function calls.

> [!gap] Full flag set and LTA loading mechanism
> The complete argument parsing was not verified. The tool's attic status also means it may have reduced testing coverage.
