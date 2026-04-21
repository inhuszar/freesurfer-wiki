---
title: "mris_find_flat_regions"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_find_flat_regions/mris_find_flat_regions.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_curvature]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact definition of 'near perpendicular to the cardinal axes' needs mathematical clarification."
tags:
  - surface
  - geometry
  - flat-regions
  - segmentation
  - diagnostic
---

# mris_find_flat_regions

## Summary

`mris_find_flat_regions` identifies vertices on a cortical surface whose surface normals are nearly perpendicular to the principal (cardinal) axes of the coordinate system. These "flat" regions are areas where the cortical surface lies approximately parallel to one of the coordinate planes. The tool can output results as an annotation, label file, curvature-style overlay, or MGZ volume.

## Source Information

- **Language:** C++
- **Primary source:** `mris_find_flat_regions/mris_find_flat_regions.cpp`
- **Associated XML:** `mris_find_flat_regions/mris_find_flat_regions.help.xml`

## Purpose and Context

In cortical flattening and surface-based registration, certain regions can be problematic because their normals align with the coordinate axes, making the local curvature geometry degenerate from the perspective of certain projection-based algorithms. Identifying these regions is useful for:

- Diagnosing flattening artefacts.
- Identifying potential problematic regions in surface-based registration.
- Understanding surface topology for visualisation purposes.

The "flatness" criterion is based on the dot product of the surface normal with each cardinal axis: a vertex is considered flat if the maximum absolute dot product exceeds a threshold (default: 0.99), meaning the normal is within ~8° of a cardinal axis and the surface is nearly parallel to the corresponding coordinate plane.

## Inputs

| Argument | Description |
|----------|-------------|
| `input-surface` (positional 1) | Input FreeSurfer surface file. |

## Outputs

| Argument | Description |
|----------|-------------|
| `output-file` (positional 2) | Output file in one of the following formats: `.annot`, `.label`, `.w`, or `.mgz`. Format is determined by the file extension. `.annot` is produced only with the `-s` option. |

## Mathematical Foundations

For each vertex $v$ with surface normal $\hat{\mathbf{n}}_v$, the flatness criterion is:

$$\text{flat}(v) = \max\left(|\hat{\mathbf{n}}_v \cdot \hat{\mathbf{x}}|,\ |\hat{\mathbf{n}}_v \cdot \hat{\mathbf{y}}|,\ |\hat{\mathbf{n}}_v \cdot \hat{\mathbf{z}}|\right) > \theta$$

where $\theta$ is the threshold (default: 0.99) and $\hat{\mathbf{x}}, \hat{\mathbf{y}}, \hat{\mathbf{z}}$ are the unit vectors along the cardinal axes.

A threshold of 0.99 corresponds to an angle of $\arccos(0.99) \approx 8.1°$ from perpendicularity to a cardinal axis.

When `-s` is used, connected components of flat vertices are segmented into ROIs, retaining only those with at least `min-vertices-required` vertices.

## Configuration Options

| Flag | Description |
|------|-------------|
| `-t <thresh>` | Threshold for flatness criterion (default: 0.99). Higher values = stricter (more parallel to axis required). |
| `-s <min-vertices>` | Segment into ROIs with at least `<min-vertices>` vertices; outputs `.annot` format. |

## Configuration Interactions

- `-s` forces output to `.annot` format regardless of the output file extension. Without `-s`, the output format is determined by the output filename extension.
- A lower threshold (e.g., `-t 0.95`) includes vertices whose normals are within ~18° of a cardinal axis, producing more extensive flat regions.
- A higher threshold (e.g., `-t 0.999`) restricts to vertices within ~2.6° of perpendicular, identifying only the most strictly cardinal-aligned regions.

## Typical Use Cases

### Find flat regions and save as label

```bash
mris_find_flat_regions lh.inflated lh.flat_regions.label
```

### Find flat regions with segmentation (annotation output)

```bash
mris_find_flat_regions -s 50 lh.inflated lh.flat_regions.annot
```

### Use a stricter threshold

```bash
mris_find_flat_regions -t 0.999 lh.white lh.flat_strict.mgz
```

## Pipeline Context

`mris_find_flat_regions` is not called by `recon-all`. It is a diagnostic and analytical utility used to understand surface geometry properties, particularly in the context of surface flattening or flat-map generation.

## Gotchas and Caveats

> [!gotcha] Cardinal axis alignment is coordinate-system dependent
> The "cardinal axes" are the X, Y, and Z axes of the surface coordinate system (surface RAS / tkRAS). The result depends on the orientation of the surface in that coordinate system, which in turn depends on the acquisition orientation and the FreeSurfer conformation. Results are not directly comparable across subjects without alignment.

> [!gotcha] `-s` forces .annot output
> Even if the output filename has a `.mgz` or `.label` extension, using `-s` forces the output to be in annotation format. The file will contain annotation data regardless of its extension.

> [!gotcha] Inflated vs. original surface
> The normal directions on the inflated surface differ from those on the white or pial surface. Flat regions on the inflated surface correspond to regions where the inflated surface happens to be locally tangent to a coordinate plane, which does not necessarily correspond to a morphologically meaningful feature on the original surface.

## Related Tools

- [[mris_curvature]] — computes curvature measures that quantify local surface bending
- [[surface-format]] — FreeSurfer surface and annotation file formats

## Confidence and Gaps

Confidence is **high**. The help XML and source file were both read, confirming the algorithm, the threshold parameter, and the output format options.
