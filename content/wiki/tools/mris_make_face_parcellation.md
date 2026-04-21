---
title: "mris_make_face_parcellation"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_face_parcellation/mris_make_face_parcellation.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[mris_make_average_surface]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - parcellation
  - icosahedron
  - face
  - functional
---

# mris_make_face_parcellation

## Summary

`mris_make_face_parcellation` creates a cortical surface parcellation where each parcel corresponds to a face (triangle) in a reference icosahedral surface. Vertices are assigned to parcels based on which icosahedron face they map to in the spherical parameterization. This produces a parcellation of approximately equal areas that is topographically arranged according to the icosahedral subdivision structure. The tool can also optimize parcellations using energy functionals based on functional connectivity or spatial variance.

## Source Information

- **Language:** C++
- **Source file:** `mris_make_face_parcellation/mris_make_face_parcellation.cpp`
- **Original author:** Bruce Fischl
- **Dependencies:** `mrishash.h`, `colortab.h`

## Purpose and Context

Standard anatomical parcellations (like aparc) are based on cortical folding patterns. Face-based parcellations from icosahedra provide an alternative: they create approximately equal-area parcels that are spatially organized by the icosahedral grid, independent of individual sulcal/gyral anatomy. This is useful for:
- Data-driven or functional parcellations
- Creating equal-area sampling grids on the cortical surface
- Parcellations based on functional connectivity patterns (via distance matrices)
- Analysis at multiple resolutions by varying icosahedron order

The tool supports several energy types for optimizing parcel assignments:
- `ENERGY_SIMILARITY` (0): similarity-based assignment
- `ENERGY_ETA` (1): eta² correlation energy
- `ENERGY_DISTANCE` (2): distance-based energy
- `ENERGY_VARIANCE` (3): within-parcel variance minimization

## Inputs

Positional arguments: `<input_surface> <ico_surface> <output_annotation>`

| Positional | Description |
|-----------|-------------|
| `<input_surface>` | Input cortical surface file (e.g., `lh.sphere.reg`). |
| `<ico_surface>` | Reference icosahedral surface defining the parcellation faces. |
| `<output_annotation>` | Output annotation file path (e.g., `lh.face_parcellation.annot`). |

## Outputs

| Output | Description |
|--------|-------------|
| Annotation file | Per-vertex parcellation assignments |
| Correlation matrix | Optional: written parcel correlation matrix |

## Mathematical Foundations

**Face-based assignment (basic mode):**
For each surface vertex $v$, find the nearest icosahedron face $f$ in spherical space. Assign vertex $v$ to parcel $f$.

**Variance energy (ENERGY_VARIANCE):**
Optimize parcel assignments to minimize within-parcel variance and maximize between-parcel variance:

$$E = \lambda_v \sum_k \sigma^2_{\text{within}}(k) - \lambda_b \sum_{k \neq l} \sigma^2_{\text{between}}(k, l)$$

where $k, l$ index parcels and $\sigma^2$ is computed from functional time courses.

**Distance energy (ENERGY_DISTANCE):**
$$E = \sum_k \sum_{i,j \in k} d_{ij}^2$$

where $d_{ij}$ is the distance between functional patterns at vertices $i$ and $j$ (from a precomputed distance matrix).

**PARMS structure:**
Key optimization parameters:
- `max_iterations`: maximum optimization iterations
- `tol`: convergence tolerance
- `l_markov`: Markov regularization
- `l_gaussian`: Gaussian spatial smoothness
- `l_var`: variance term weight
- `l_border`: border length regularization
- `l_area`: area penalty weight

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-w <n>` | integer | — | Write intermediate parcellation snapshots every `<n>` iterations. |
| `-n <n>` | integer | 100 | Maximum number of optimization iterations. |
| `-t <f>` | float | 1e-6 | Convergence tolerance. |
| `-markov <f>` | float | 0 | Markov random field regularization weight (`parms.l_markov`). |
| `-gaussian <f>` | float | 0 | Gaussian spatial smoothness weight (`parms.l_gaussian`). |
| `-var <f>` | float | 1.0 | Within-parcel variance energy weight (`parms.l_var`). |
| `-eden <f>` | float | 1.0 | External (data-driven) energy weight (`parms.l_eden`). |
| `-L <label_file>` | string | — | Restrict the parcellation to vertices in the specified label. |
| `-D <dmat_file>` | string | — | Load a precomputed distance matrix from the given file (enables `ENERGY_DISTANCE` or `ENERGY_VARIANCE` modes). |
| `-similarity` | boolean | — | Use similarity energy (`ENERGY_SIMILARITY`, type 0). |
| `-eta` | boolean | — | Use eta² correlation energy (`ENERGY_ETA`, type 1). |
| `-distance` | boolean | — | Use distance-based energy (`ENERGY_DISTANCE`, type 2). Requires `-D`. |
| `-variance` | boolean | — | Use within-parcel variance energy (`ENERGY_VARIANCE`, type 3). Default. |
| `-v <n>` | integer | — | Verbose/debug level. |
| `--version` | boolean | — | Print version string and exit. |

## Typical Use Cases

### Basic icosahedron face parcellation

```bash
mris_make_face_parcellation \
    lh.sphere.reg \
    $FREESURFER_HOME/subjects/fsaverage/surf/lh.sphere \
    $SUBJECTS_DIR/subject01/label/lh.face_parcellation.annot
```

### Distance-based parcellation optimization

```bash
mris_make_face_parcellation \
    -distance \
    -D /path/to/lh.dmat \
    -n 200 \
    lh.sphere.reg \
    $FREESURFER_HOME/subjects/fsaverage/surf/lh.sphere \
    lh.face_parcellation.annot
```

## Pipeline Context

Not part of standard `recon-all`. Used in research workflows for functional or data-driven cortical parcellations.

## Gotchas and Caveats

> [!gotcha] Requires icosahedron surface
> The parcellation is defined by the faces of an icosahedral surface. The resolution of the parcellation is determined by the icosahedron order.

> [!gotcha] Distance matrix loading
> When using `ENERGY_DISTANCE` or `ENERGY_VARIANCE`, a precomputed distance/dissimilarity matrix is needed. This matrix can be very large for high-resolution data.

## Related Tools

- [[mris_ca_label]] — anatomical parcellation tool
- [[mris_make_average_surface]] — group surface averaging

## Confidence and Gaps

Confidence is **high**. The complete `get_option()` function (lines ~500–629 of `mris_make_face_parcellation.cpp`) was read from source. All flags and their defaults are confirmed. The four energy types and their corresponding flags (`-similarity`, `-eta`, `-distance`, `-variance`) are confirmed from the source `switch` statement and the `ENERGY_*` enum.
