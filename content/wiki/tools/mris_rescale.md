---
title: "mris_rescale"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_rescale/mris_rescale.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_sphere]]"
  - "[[mris_inflate]]"
  - "[[mris_rotate]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - normalization
  - sphere
  - scaling
---

# mris_rescale

## Summary

`mris_rescale` rescales a cortical surface (typically a sphere) so that its average radius equals the canonical FreeSurfer sphere radius (`DEFAULT_RADIUS`, which is 100 mm). It reads a surface, computes its average radius, calculates the required scale factor, applies uniform scaling via `MRISscaleBrain()`, and writes the result. This is a normalization utility ensuring consistent sphere size across subjects.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_rescale/mris_rescale.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_rescale`

## Purpose and Context

FreeSurfer's spherical processing pipeline (inflation → spherical mapping → atlas registration) requires all surfaces to have a consistent radius. `mris_rescale` corrects small radius deviations that may occur during spherical mapping (e.g., via `mris_sphere`). In the standard pipeline, the sphere is expected to have radius 100 mm (`DEFAULT_RADIUS`); this tool rescales any sphere to that standard size.

This is a lightweight utility with no optional parameters.

## Inputs

### Required Inputs

(Positional arguments: `<input surface> <output surface>`)

- **`<input surface>`** — any FreeSurfer binary surface file; typically a sphere (e.g., `lh.sphere`).
- **`<output surface>`** — destination for the rescaled surface.

### Input Assumptions

> [!assumption] Approximately spherical input
> The tool computes `MRISaverageRadius()` which assumes that vertices are distributed approximately uniformly around an origin. For highly non-spherical surfaces, the average radius estimate will be meaningless.

## Outputs

### Files Created

- **Rescaled surface** — written to `<output surface>` in FreeSurfer binary surface format (see [[surface-format]]). Vertex positions are uniformly scaled so that the average radius equals `DEFAULT_RADIUS` (100 mm).

## Mathematical Foundations

The scale factor is:
$$\text{scale} = \frac{R_{\text{default}}}{R_{\text{avg}}}$$

where $R_{\text{default}} = 100$ mm (the `DEFAULT_RADIUS` constant) and $R_{\text{avg}} = \text{MRISaverageRadius}(\text{mris})$.

Each vertex position $(x, y, z)$ is then multiplied by this factor:
$$(x', y', z') = \text{scale} \cdot (x, y, z)$$

This is a pure scaling about the origin. `MRISscaleBrain()` applies this transformation to all vertex coordinates.

## Configuration Options

### Complete Flag Reference

This tool has no optional flags beyond the standard version/help flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

No flag interactions — this tool is fully determined by its two positional arguments.

## Typical Use Cases

### Use Case 1: Normalize sphere radius to 100 mm

```bash
mris_rescale lh.sphere lh.sphere.rescaled
```

Ensures the output sphere has the standard 100 mm average radius.

## Pipeline Context

`mris_rescale` may be called after [[mris_sphere]] to normalize the sphere radius before [[mris_register]] or atlas-based processing. It is not directly called by the main `recon-all` script but may be used in custom pipelines or as a preprocessing step.

**Predecessor:** [[mris_sphere]] → **This tool** → [[mris_register]]

## Gotchas and Caveats

> [!gotcha] Scaling is uniform — topology is unchanged
> `mris_rescale` only scales vertex positions. All topology (faces, edges, neighbourhood relationships) and per-vertex data (curvature, etc.) in the surface file are preserved as-is.

> [!gotcha] Not suitable for non-sphere surfaces
> Applying this tool to a white matter or pial surface will produce a surface scaled to a 100 mm average radius, which is nonsensical for cortical geometry purposes.

## Related Tools

- [[mris_sphere]] — generates the spherical mapping; may produce spheres with slightly off radii
- [[mris_register]] — spherical atlas registration; requires consistent sphere radius
- [[mris_rotate]] — rotates rather than scales a surface

## Confidence and Gaps

Confidence is **high**. The source is short, straightforward, and fully read. No gaps identified.
