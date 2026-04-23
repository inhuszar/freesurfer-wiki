---
title: "mris_morph_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_morph_stats/mris_morph_stats.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_inflate]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: medium
last_agent_update: 2026-04-22
gaps:
  - "Exact definition of 'areal error' quantity written to output — whether it is absolute area difference, ratio, or log ratio is not explicit without reading MRISwriteAreaError() internals."
tags:
  - surface
  - morphometry
  - deformation
  - statistics
---

# mris_morph_stats

## Summary

`mris_morph_stats` computes statistics characterizing a surface-based morphological deformation field. Given a subject's white matter surface as the reference and a morphed (deformed) surface as the input, it computes per-vertex areal distortion metrics and writes them to an output file. This quantifies how much each vertex's area has changed during a morphological transformation (e.g., inflation, spherical mapping, or registration).

## Source Information

- **Language:** C++
- **Source file(s):** `mris_morph_stats/mris_morph_stats.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_morph_stats`

## Purpose and Context

During cortical surface processing, FreeSurfer applies a series of morphological deformations (inflation, spherical mapping, atlas registration). Each deformation introduces areal distortion — regions of the surface expand or contract relative to the original. `mris_morph_stats` provides a diagnostic and analytical tool to measure this distortion quantitatively, producing a curvature-format file of areal errors at each vertex.

This is primarily a research/diagnostic utility used to evaluate the quality and uniformity of surface deformations.

## Inputs

### Required Inputs

(Positional arguments: `<subject name> <hemisphere> <morphed surface> <output name>`)

- **`<subject name>`** — FreeSurfer subject ID. The tool reads the white matter surface from `$SUBJECTS_DIR/<subject>/<hemi>.white`.
- **`<hemisphere>`** — hemisphere designator (`lh` or `rh`).
- **`<morphed surface>`** — path to the deformed surface file whose vertex positions represent the post-deformation state (e.g., inflated, spherical, or registered surface).
- **`<output name>`** — path for the output areal error file.

`SUBJECTS_DIR` must be set in the environment.

### Input Assumptions

> [!assumption] White matter surface as reference
> The tool reads `<hemi>.white` as the reference (original) surface. It stores white matter properties and then reads the morphed vertex positions on top of the same surface topology.

> [!assumption] Same topology required
> The morphed surface must have the same vertex count and topology as the white matter surface, since vertex positions are read with `MRISreadVertexPositions()`.

## Outputs

### Files Created

- **Areal error file** — written to `<output name>`. By default, written in FreeSurfer curvature binary format (`.curv`). With `-write_vals`, written in `.w` (per-vertex values) format.

### Output Specifications

Each vertex stores a scalar value representing the areal distortion at that location. Values close to zero indicate minimal distortion; large positive or negative values indicate expansion or compression.

## Mathematical Foundations

The areal distortion at each vertex is computed by comparing the metric properties (face areas) of the original white matter surface against those of the morphed surface.

The tool calls:
1. `MRIScomputeMetricProperties(mris)` — computes face areas and normals for the white matter reference.
2. `MRISstoreMetricProperties(mris)` — saves these as the "original" properties.
3. `MRISsaveVertexPositions(mris, ORIGINAL_VERTICES)` — stores white matter vertex positions.
4. `MRISreadVertexPositions(mris, morph_name)` — loads morphed positions.
5. `MRIScomputeMetricProperties(mris)` — recomputes metric properties for morphed surface.
6. `MRISwriteAreaError(mris, out_name)` — writes the per-vertex areal error.

The `MRISwriteAreaError()` function (in `mrisurf.c`) computes the areal distortion per vertex. The exact functional form is:

$$
\text{area\_error}_i = \frac{A_i^{\text{morph}} - A_i^{\text{orig}}}{A_i^{\text{orig}}}
$$

or a related quantity — exact form should be verified from `mrisurf.c`.

> [!gap] Exact definition of areal error
> The precise formula used by `MRISwriteAreaError()` (e.g., signed ratio, absolute difference, log ratio) was not verified from source. Needs confirmation.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nbrs <n>` | integer | 1 | Neighborhood size for computing metric properties. Values >1 expand the local neighborhood used in area computations. |
| `-write_vals` | boolean | false | Write output in `.w` per-vertex values format instead of binary curvature format. |
| `-v <diagno>` | integer | 0 | Set diagnostic vertex number for verbose output. |
| `-name <name>` | string | — | **No-op.** Parsed but disabled (`#if 0` in source). The body that would set `parms.base_name` is compiled out. Has no effect. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

- `-write_vals` changes the output format but not the computed values.
- `-nbrs` affects the size of the neighborhood used when computing metric properties; this may influence the area estimates.

## Typical Use Cases

### Use Case 1: Compute areal distortion of inflated surface

```bash
mris_morph_stats subject lh \
  $SUBJECTS_DIR/subject/surf/lh.inflated \
  $SUBJECTS_DIR/subject/surf/lh.inflated.areal_error
```

Produces a curvature file showing areal distortion of inflation relative to the white surface.

### Use Case 2: Compute distortion as a val file

```bash
mris_morph_stats --write_vals subject lh \
  $SUBJECTS_DIR/subject/surf/lh.sphere.reg \
  $SUBJECTS_DIR/subject/surf/lh.sphere.reg.areal_error.w
```

## Pipeline Context

`mris_morph_stats` is not called by `recon-all`. It is a standalone diagnostic utility used after surface deformation steps.

**Typical workflow position:** called after [[mris_inflate]] or [[mris_sphere]] to quantify deformation quality.

## Gotchas and Caveats

> [!gotcha] White surface hardcoded as reference
> The reference surface is always `<hemi>.white` read from `SUBJECTS_DIR`. There is no flag to specify an alternative reference surface.

## Related Tools

- [[mris_inflate]] — inflates the white surface; output can be analysed with this tool
- [[mris_sphere]] — spherical mapping; output can be analysed with this tool
- [[mris_register]] — spherical registration; output can be analysed with this tool
- [[mris_anatomical_stats]] — general surface morphometry statistics

## Confidence and Gaps

Confidence is **medium**. The main processing flow is clearly understood from source. The exact numerical definition of "areal error" requires reading `MRISwriteAreaError()` in `mrisurf.c`.

> [!gap] MRISwriteAreaError() formula
> The exact formula for areal error written by `MRISwriteAreaError()` should be confirmed from `utils/mrisurf.c`.
