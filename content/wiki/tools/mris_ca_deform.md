---
title: "mris_ca_deform"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_deform/mris_ca_deform.cpp"
  # Note: source file lives in mris_deform/ directory, NOT mris_ca_deform/
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_deform]]"
  - "[[mris_ca_label]]"
  - "[[mri_ca_label]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - deformation
  - GCA
  - atlas
---

# mris_ca_deform

## Summary

`mris_ca_deform` deforms a surface of a volumetric segmentation to more smoothly and accurately represent a label boundary, using a Gaussian Classifier Atlas (GCA) model and intensity-based information. It is a generic surface deformation tool that uses probabilistic atlas priors to guide the surface towards anatomically correct boundaries.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_deform/mris_ca_deform.cpp`
- **Note:** Source file lives in the `mris_deform/` directory, shared with `mris_deform.cpp` and `mris_nudge.cpp`.

## Purpose and Context

When a volumetric segmentation produces a coarse or topologically noisy boundary, `mris_ca_deform` can refine the corresponding surface by fitting it to intensity gradients in the MRI data, constrained by a GCA probability model. The tool combines:

1. A GCA atlas for anatomical probability maps.
2. Intensity histograms from labelled regions.
3. Surface deformation energy minimisation.

This allows the surface to conform to MRI contrast while remaining anatomically plausible.

## Inputs

Positional arguments (required): `<input_surface> <label_vol> <transform> <intensity_vol> <output_surface>`

| Position | Description |
|----------|-------------|
| `<input_surface>` | Input surface file to deform (e.g., `lh.white`). |
| `<label_vol>` | Volumetric label segmentation (e.g., `aseg.mgz`). |
| `<transform>` | Atlas transform file (`.lta`, `.m3z` morph, etc.). |
| `<intensity_vol>` | Intensity image (e.g., T1 `brain.mgz`). |
| `<output_surface>` | Output deformed surface path. |

## Outputs

| Output | Description |
|--------|-------------|
| `<output_surface>` | Deformed surface conforming to atlas-guided boundary |

## Mathematical Foundations

The deformation minimises an energy functional combining:

1. **External likelihood** $E_{\text{LL}}$: log-likelihood of observed intensities given the GCA model.
2. **Gradient term** $E_{\text{grad}}$: alignment to intensity gradients.
3. **Internal smoothness** term enforced by `INTEGRATION_PARMS`.

$$E_{\text{total}} = w_{\text{LL}} E_{\text{LL}} + w_{\text{grad}} E_{\text{grad}} + E_{\text{smooth}}$$

The GCA model provides a probabilistic map of expected intensities near each label boundary. The GCAB (Gaussian Classifier Atlas Boundary) extension adds additional boundary-specific priors.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-dt <f>` or `-T <f>` | float | 0.5 | Integration time step. |
| `-sigma <f>` | float | 1.0 | Maximum Gaussian smoothing sigma (mm); halved at each scale-space level. |
| `-resolution <f>` | float | 8.0 | Histogram resolution (voxels) for target intensity computation. |
| `-grad <n>` | integer | 0 | Use intensity gradient (1) instead of log-likelihood (0) for target positions. |
| `-grad_dist <f>` | float | 1.5 | Maximum distance (mm) searched in gradient mode. |
| `-tspring <f>` | float | — | Tangential spring term weight (`parms.l_tspring`). |
| `-nlspring <f>` | float | 1.0 | Non-linear spring term weight (`parms.l_nlspring`). |
| `-nspring <f>` | float | — | Normal spring term weight (`parms.l_nspring`). |
| `-curv <f>` | float | 0.0 | Curvature term weight (`parms.l_curv`). |
| `-intensity <f>` | float | — | Intensity term weight (`parms.l_intensity`). |
| `-vavgs <n>` | integer | 0 | Number of vertex value averaging iterations before deformation. |
| `-tol <f>` | float | 0.01 | Convergence tolerance. |
| `-A <n>` | integer | 4 | Maximum smoothing averages. |
| `-G <fname>` | string | — | GCA atlas file; if not specified, derived from transform. |
| `-I <f>` | float | 1.0 | External (intensity-based) term weight (`parms.l_external`). |
| `-S <f>` | float | 0.1 | Spring term weight (`parms.l_spring`). |
| `-L <n>` | integer | -1 | Target aseg label integer (e.g., 10 for left thalamus). |
| `-R` | boolean | — | Read log-likelihood volume from `ll.mgz` instead of computing it. |
| `-V <n>` | integer | — | Debug vertex index. |
| `-W <n>` | integer | — | Write deformation snapshots every `n` iterations. |
| `-renorm <mode> [<seg>]` | integer | 1 | GCA renormalisation: 0 = off, 1 = atlas alignment, 2 = example-based (requires segmentation file as additional argument). |
| `-rmin <f>` | float | 0.5 | Minimum spring radius. |
| `-rmax <f>` | float | 5.0 | Maximum spring radius. |
| `-write_gca <fname>` | string | — | Write renormalized GCA to file. |
| `-gcab <fname>` | string | — | Read Gaussian Classifier Atlas Boundary (GCAB) from file. |
| `-make_gca <label_vol> <int_vol>` | string × 2 | — | Build a GCA from scratch using the given high-resolution label and intensity volumes (2 arguments consumed). |
| `-nbrs <n>` | integer | 2 | Surface neighbourhood size. |
| `-DEBUG_VOXEL <x> <y> <z>` | integer × 3 | — | Enable voxel-level debug output at the specified voxel coordinates (3 arguments consumed). |
| `--version` | boolean | — | Print version string and exit. |

## Configuration Interactions

- `-grad 1` and the default log-likelihood mode are mutually exclusive strategies: when `-grad 1` is set, `externalGradGradient/SSE/RMS` hooks are installed; otherwise `externalLLGradient/SSE/RMS` hooks handle the surface movement. Both modes use the same `INTEGRATION_PARMS`-driven deformation loop.
- `-renorm 2 <seg>` takes an additional argument (the segmentation file); `-renorm 1` (default) uses atlas alignment renormalisation with no extra argument.
- `-G <gca>` is optional only if the transform is a `MORPH_3D_TYPE` (GCA morph `.m3z`), which embeds the atlas filename. For linear transforms, `-G` is required.
- `-gcab` enables GCAB-based boundary-specific priors, which interact with the `-L` target label to compute `compute_target_intensities_with_gcab()` instead of the standard `compute_target_intensities()`.
- `-A` sets the maximum smoothing averages. The loop halves both `n_averages` and `sigma` at each iteration down to `min_averages = 0` (hard-coded, not configurable on the command line).

## Typical Use Cases

```bash
# Deform a surface to the boundary of thalamus (label 10) using a GCA
mris_ca_deform -G $FREESURFER_HOME/average/RB_all_2020-01-02.gca \
    -L 10 \
    lh.white aseg.mgz transforms/talairach.m3z brain.mgz lh.white.deformed
```

## Pipeline Context

Not part of the standard `recon-all` pipeline. Used in specialised subcortical surface reconstruction workflows.

## Gotchas and Caveats

> [!gotcha] GCA file required for atlas mode
> Without `--gca`, the tool cannot use atlas priors. In gradient-only mode (`--use-grad`), the GCA may be optional — verify from source.

## Related Tools

- [[mris_deform]] — related surface deformation tool for grey-white/pial placement
- [[mri_ca_label]] — volumetric GCA-based labelling

## Confidence and Gaps

**Confident:** Core purpose, GCA integration, and key parameters confirmed from source.

> [!gap] Full flag set and GCAB model details
> The complete flag parsing and GCAB model initialisation were not fully read.
