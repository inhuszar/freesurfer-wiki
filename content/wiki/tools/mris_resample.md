---
title: "mris_resample"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_resample/mris_resample.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_apply_reg]]"
  - "[[mris_make_average_surface]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - resampling
  - registration
  - icosahedron
---

# mris_resample

## Summary

`mris_resample` resamples an atlas surface (or any source surface) onto a subject's surface using their respective spherical registration files (`.sphere.reg`). Given an atlas surface and subject surface, both with spherical registration coordinates, it finds for each atlas vertex the nearest neighbour on the subject sphere and performs linear barycentric interpolation within the closest triangle on the subject surface to produce the resampled output. It also supports resampling annotation files using nearest-neighbour assignment.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_resample/mris_resample.cpp`
- **Original Author:** Gheorghe Postelnicu (2006)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_resample`
- **External dependency:** ANN (Approximate Nearest Neighbours library)

## Purpose and Context

When combining data from surfaces of different resolutions or from an atlas into subject space, geometric resampling is required. `mris_resample` is described in the source as "a stripped-down version of `mris_indirect_morph`" that performs this resampling in two steps:

1. For each atlas vertex, find the closest vertex on the subject sphere (nearest-neighbour search using ANN).
2. Find the closest triangular face.
3. Perform barycentric linear interpolation in spherical coordinates.

The result is the atlas surface geometry expressed on the subject's spherical coordinate system, or equivalently, the subject's geometry resampled to the atlas tesselation.

## Inputs

### Required Inputs

- **Atlas spherical registration** (`--atlas-reg`) — the atlas `.sphere.reg` surface (spherical registration of the atlas).
- **Subject spherical registration** (`--subject-reg`) — the subject's `.sphere.reg` surface.
- **Subject surface** (`--subject-surf`) — the subject's actual surface (e.g., `lh.white`) to be resampled to the atlas tesselation.
- **Output surface** (`--output`) — destination for the resampled surface.

### Optional Inputs

- **Subject annotation** (`--subject-annot`) — annotation file on the subject surface; resampled to the atlas tesselation using nearest-neighbour (not interpolated) assignment.
- **Output annotation** (`--out-annot`) — destination for the resampled annotation.

### Input Assumptions

> [!assumption] Spherical surfaces required
> Both registration surfaces (`atlas-reg` and `subject-reg`) must be spherical (unit sphere or consistent-radius sphere). The algorithm computes distances in 3D sphere coordinates, so non-spherical inputs will produce incorrect results.

> [!assumption] Consistent hemispheres
> The atlas and subject surfaces must correspond to the same hemisphere (both lh or both rh).

## Outputs

### Files Created

- **Resampled surface** — atlas-tesselation surface with vertex positions interpolated from the subject surface. Written in FreeSurfer binary surface format (see [[surface-format]]).
- **Resampled annotation** (optional) — annotation mapped from subject to atlas tesselation via nearest-neighbour vertex assignment.

## Mathematical Foundations

**Step 1 — Nearest vertex search:** For each vertex $i$ in the atlas sphere, find the nearest vertex $j^*$ on the subject sphere using ANN (approximate nearest neighbours):
$$
j^* = \arg\min_{j} \| \mathbf{s}_i^{\text{atlas}} - \mathbf{s}_j^{\text{subj}} \|
$$

**Step 2 — Closest face:** Among faces adjacent to $j^*$, find the face $f^*$ minimising the distance from $\mathbf{s}_i^{\text{atlas}}$ to the face.

**Step 3 — Barycentric interpolation:** Express $\mathbf{s}_i^{\text{atlas}}$ in barycentric coordinates $(\lambda_1, \lambda_2, \lambda_3)$ within face $f^*$, with $\lambda_k \geq 0$ and $\sum_k \lambda_k = 1$. Apply these same barycentric weights to the corresponding vertex positions in the subject surface:
$$
\mathbf{p}_i^{\text{out}} = \lambda_1 \mathbf{p}_{v_1} + \lambda_2 \mathbf{p}_{v_2} + \lambda_3 \mathbf{p}_{v_3}
$$

where $\mathbf{p}_{v_k}$ are the positions of the subject surface vertices.

The `v_to_f_distance()` function computes the distance from a vertex to a face using parametric $(s, t)$ coordinates within the triangle.

For annotation resampling, only the nearest-neighbour label (from step 1) is assigned; no interpolation is performed.

## Configuration Options

### Complete Flag Reference

`mris_resample` uses `ArgumentParser` (FreeSurfer's own parser); all flags use double-dash prefix.

| Flag | Type | Required | Description |
|------|------|----------|-------------|
| `--atlas_reg <path>` | string | yes | Atlas spherical registration surface (`strAtlasReg`). |
| `--subject_reg <path>` | string | yes | Subject spherical registration surface (`strSubjectReg`). |
| `--subject_surf <path>` | string | yes | Subject surface to be resampled to the atlas tesselation (`strSubjectSurf`). |
| `--out <path>` | string | yes | Output resampled surface (`strOutput`). |
| `--annot_in <path>` | string | no | Subject annotation file to resample (nearest-neighbour). Must be paired with `--annot_out`. |
| `--annot_out <path>` | string | no | Output annotation file. Must be paired with `--annot_in`. |

> [!gotcha] Flag names use underscores, not dashes
> The actual flag names are `--atlas_reg`, `--subject_reg`, `--subject_surf`, `--annot_in`, and `--annot_out` (underscores). Earlier wiki documentation incorrectly listed them with dashes (`--atlas-reg`, `--subject-annot`, `--out-annot`).

> [!gotcha] Both annotation flags must be specified together
> If only `--annot_in` is given without `--annot_out`, the tool exits with a fatal error: "missing --annot_out flag". The reverse is also true.

### Configuration Interactions

- When `--annot_in` and `--annot_out` are both specified, annotation resampling is performed alongside surface geometry resampling (using nearest-neighbour vertex assignment, not interpolation).
- Surface geometry is always resampled to the atlas tesselation using barycentric interpolation, regardless of whether annotation resampling is requested.

## Typical Use Cases

### Use Case 1: Resample subject white surface to fsaverage tesselation

```bash
mris_resample \
  --atlas_reg $SUBJECTS_DIR/fsaverage/surf/lh.sphere.reg \
  --subject_reg $SUBJECTS_DIR/subject/surf/lh.sphere.reg \
  --subject_surf $SUBJECTS_DIR/subject/surf/lh.white \
  --out $SUBJECTS_DIR/subject/surf/lh.white.fsaverage
```

### Use Case 2: Resample annotation to atlas space

```bash
mris_resample \
  --atlas_reg $SUBJECTS_DIR/fsaverage/surf/lh.sphere.reg \
  --subject_reg $SUBJECTS_DIR/subject/surf/lh.sphere.reg \
  --subject_surf $SUBJECTS_DIR/subject/surf/lh.white \
  --out /tmp/lh.white.fsaverage \
  --annot_in $SUBJECTS_DIR/subject/label/lh.aparc.annot \
  --annot_out /tmp/lh.aparc.fsaverage.annot
```

## Pipeline Context

`mris_resample` is not called by standard `recon-all`. It is used in group analysis pipelines requiring data in a common (e.g., fsaverage) surface space. The alternative `mris_apply_reg` may be preferred for newer workflows.

## Gotchas and Caveats

> [!gotcha] ANN nearest-neighbour is approximate
> The ANN library used for vertex searching is the Approximate Nearest Neighbours library, which may not always return the exact nearest neighbour. In practice, for smooth spherical surfaces, the approximation error is negligible.

> [!gotcha] Annotation uses NN, not interpolation
> Annotation labels are assigned by nearest-neighbour only. For boundary vertices, the label assignment depends on which subject vertex happens to be nearest, which may produce slightly jagged boundaries.

## Related Tools

- [[mris_apply_reg]] — newer tool for applying surface registrations and resampling overlays
- [[mris_register]] — generates the `.sphere.reg` files consumed by this tool
- [[mris_make_average_surface]] — creates group-average surfaces using resampled individual surfaces

## Confidence and Gaps

Confidence is **high**. The complete flag list was verified from `IoParams::parse()` in the source. The algorithm is well-described in source comments. Flag names use underscores (corrected from previous dash-based documentation).
