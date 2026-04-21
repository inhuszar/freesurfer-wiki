---
title: "mris_make_template"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_template/mris_make_template.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_curvature]]"
  - "[[surface-format]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact parameterisation of the MRI_SP (spherical parameterisation) structure needs documentation."
tags:
  - surface
  - atlas
  - template
  - registration
  - autorecon3
  - spherical-parameterisation
---

# mris_make_template

## Summary

`mris_make_template` constructs a group-average spherical surface template (atlas) from the registered spherical surfaces and curvature overlays of multiple subjects. It accumulates per-subject curvature and sulcal depth maps (projected onto a spherical parameterisation) into a running mean and variance, producing a parameterised atlas file (`.tif` format — FreeSurfer's spherical parameterisation format, `MRI_SP`) used by `mris_register` for atlas-based registration of new subjects.

## Source Information

- **Language:** C++
- **Primary source:** `mris_make_template/mris_make_template.cpp`
- **Original author:** Bruce Fischl

## Purpose and Context

The FreeSurfer registration atlas (e.g., `fsaverage`) was built using `mris_make_template`. For each subject, their spherical surface (`?h.sphere.reg`) is used to project curvature features (inflated surface mean curvature `inflated.H` and sulcal depth `sulc`) onto a common spherical grid. The projected per-subject maps are averaged across the group to create a mean curvature and mean sulcal depth map, together with their variance. The resulting template encodes the expected spatial distribution of cortical folding features on the sphere.

`mris_register` then uses this template as a target: it deforms each new subject's sphere to maximise the similarity between the subject's curvature/sulc maps and the template's mean maps.

## Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `<hemi>` | 1 | Hemisphere (`lh` or `rh`). |
| `<sphere name>` | 2 | Name of the spherical surface (e.g., `sphere.reg` or `sphere`). |
| `subject1 subject2 ...` | 3 to N-1 | List of FreeSurfer subject names to include in the template. |
| `<template.tif>` | Last | Output template file path. |

The tool reads curvature and surface files from `$SUBJECTS_DIR/<subject>/surf/`:

| File | Description |
|------|-------------|
| `<hemi>.<sphere_name>` | Subject's registered spherical surface. |
| `<hemi>.inflated` | Inflated surface (provides H curvature). |
| `<hemi>.smoothwm` | Smoothed white surface (provides sulcal depth context). |
| `<hemi>.inflated.H` | Mean curvature of inflated surface. |
| `<hemi>.sulc` | Sulcal depth overlay. |

The default curvature sources are:
```cpp
const char *curvature_names[] = { "inflated.H", "sulc", NULL };
const char *surface_names[]   = { "inflated", "smoothwm", "smoothwm" };
```

Each surface/curvature pair contributes one "frame" to the parameterisation. The template stores `IMAGES_PER_SURFACE = 3` images per surface (mean, variance, DOF).

## Outputs

| Output | Description |
|--------|-------------|
| `<template.tif>` | FreeSurfer spherical parameterisation template file (`MRI_SP` format). Contains mean and variance of curvature/sulc maps across subjects. |

## Mathematical Foundations

### Spherical Parameterisation

The spherical surface at radius $r = 100$ mm is discretised into a 2D spherical grid (using longitude $\theta$ and latitude $\phi$). Each surface vertex $v$ on the registered sphere is mapped to a grid cell, and its curvature/sulcal depth value is projected onto that cell.

For each grid cell $(\theta_i, \phi_j)$, the template stores:
- $\bar{c}_{ij}$: mean curvature across subjects.
- $\sigma^2_{ij}$: variance of curvature across subjects.
- $n_{ij}$: number of subjects contributing to this cell (degrees of freedom).

The template is built incrementally: for each subject, `MRISPaccumulate()` (or equivalent) adds the subject's parameterised maps to the running mean/variance.

### Registration Target

The template is used by `mris_register` as the target in a spherical registration objective:

$$J = \sum_{(\theta,\phi)} w_{ij} \cdot (c_{\text{subject}}(\theta_{ij}) - \bar{c}_{ij})^2$$

where $w_{ij}$ may be inversely weighted by the template variance $\sigma^2_{ij}$ to give less weight to regions of high variability across subjects.

## Configuration Options

### Positional Arguments

| Argument | Description |
|----------|-------------|
| `<hemi>` | `lh` or `rh`. |
| `<sphere name>` | Registered spherical surface name (e.g., `sphere.reg`). |
| `subject1 ... subjectN` | Subject list. |
| `<template.tif>` | Output template path. |

### Optional Flags

All flags use a single dash. Flag names are case-insensitive (parsed with `stricmp`).

| Flag | Argument type | Default | Description |
|------|--------------|---------|-------------|
| `-nbrs <N>` | int | 3 | Neighbourhood size for curvature computation on the sphere (`nbrs`). |
| `-a <navgs>` | int | 0 | Number of curvature-averaging iterations applied before accumulation (`navgs`). |
| `-S <scale>` or `-s <scale>` | float | 1 | Scale factor for the spherical parameterisation grid (`scale`). |
| `-O <name>` | string | `smoothwm` | Override the smoothwm surface name: sets `surface_names[1]` and `surface_names[2]` to `<name>`. |
| `-norot` | boolean | true (`no_rot=1`) | Do not perform rigid hemisphere alignment before accumulation (this is the default). |
| `-rot` | boolean | — | Enable rigid hemisphere alignment before accumulation (`no_rot=0`). |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-annot <name>` | string | — | Annotation file name; used to zero the medial wall region before accumulation (`annot_name`). |
| `-surf_dir <dir>` | string | `surf` | Use `<dir>` as the surface subdirectory name within each subject directory (default `surf`). |
| `-median` | boolean | — | Use median normalisation of curvature values (`which_norm = NORM_MEDIAN`). |
| `-nonorm` | boolean | — | Disable normalisation of curvature values (`which_norm = NORM_NONE`). |
| `-infname <name>` | string | `inflated` | Use `<name>` instead of `inflated` as the first surface; also sets curvature name to `<name>.H`. |
| `-sulc <name>` | string | `sulc` | Use `<name>` instead of `sulc` as the second curvature file. |
| `-nodefault` | boolean | — | Disable the default three-frame atlas (curvature of inflated, sulc, curvature of smoothwm); sets `base_default=0`, `atlas_size=0`, `parms.nfields=0`. |
| `-size <N>` | int | 3 | Atlas frame count for vectorial (multiframe) mode (`atlas_size`). |
| `-overlay <file> <navgs>` | string + int | — | Add an overlay file as an extra atlas frame (`OVERLAY_FRAME`); enables multiframe mode. Takes two arguments: filename and smoothing-iteration count. |
| `-distance <file> <navgs>` | string + int | — | Add a distance-transform overlay as an extra atlas frame (`DISTANCE_TRANSFORM_FRAME`); enables multiframe mode. |
| `-overlay-dir <dir>` | string | — | Directory from which overlay files are read (`overlay_dir`). |
| `-addframe <field_code> <position>` | int + int | — | Add a pre-defined vectorial field (identified by integer field code) at atlas position `<position>`; enables multiframe mode. Use `-vector` to see available field codes. |
| `-vector` | boolean | — | Print available vectorial field codes and their descriptions, then continue (informational). |
| `-W` | boolean | — | Enable write diagnostics (`Gdiag |= DIAG_WRITE`). Optionally accepts a digit argument. |
| `--version` or `-version` | boolean | — | Print version string and exit. |
| `--help` or `-help` | boolean | — | Print help text and exit. |

## Configuration Interactions

- `-nodefault` must be placed **before** any `-addframe` calls to prevent errors about overwriting reserved atlas positions 0–2.
- `-overlay` and `-distance` and `-addframe` all activate multiframe mode (`multiframes=1`) and increment `atlas_size`. They can be mixed in one command.
- `-rot` and `-norot` are mutually exclusive; the last flag parsed wins.
- `-median` and `-nonorm` both override the default normalisation; the last flag parsed wins.
- `-infname` automatically sets the curvature name to `<name>.H` in addition to changing the surface name.
- If the template file already exists, the tool reads it and accumulates additional subjects into it (incremental mode). If it does not exist, a new template is initialised.

> [!gotcha] Incremental mode
> The source code contains: `if (1 || !FileExists(template_fname))` which forces the template to **always be created fresh**. The incremental accumulation mode (reading existing template) is effectively disabled by this hardcoded `1`. This is a known quirk in the source.

## Typical Use Cases

### Build a bilateral atlas from 40 subjects

```bash
mris_make_template lh sphere.reg \
  subj1 subj2 subj3 ... subj40 \
  $FREESURFER_HOME/average/lh.average.curvature.filled.buckner40.tif
```

### Build a template from locally registered subjects

```bash
mris_make_template rh sphere.reg \
  $(ls $SUBJECTS_DIR) \
  my_atlas_rh.tif
```

## Pipeline Context

`mris_make_template` is used to **create** atlas templates and is part of the FreeSurfer atlas construction workflow. In the standard `recon-all` pipeline, it is **not called** for individual subjects; instead, the pre-built templates in `$FREESURFER_HOME/average/` are used.

It is used when:
- Creating a custom population-specific atlas.
- Adding subjects to an existing atlas (though the incremental mode is currently disabled by hardcoded `1`).

**Related tools:** [[mris_register]] (uses the template output), [[mris_sphere]] (produces the input spherical surfaces)

## Gotchas and Caveats

> [!gotcha] Incremental accumulation is disabled
> The line `if (1 || !FileExists(template_fname))` in `main()` ensures the tool always creates a new template, even if the output file exists. Incremental template building is not functional in the current source.

> [!gotcha] Subject order matters for variance
> The mean and variance are accumulated using a running update. With floating-point arithmetic, the order of subjects affects the accumulated variance. This is typically not significant for group-level atlases but should be noted for reproducibility.

> [!gotcha] Template format is .tif (MRI_SP), not standard TIFF
> Despite the `.tif` extension, the output is in FreeSurfer's `MRI_SP` binary format, not a standard TIFF image. The extension is a historical naming convention.

## Related Tools

- [[mris_register]] — uses the template produced by this tool for subject registration
- [[mris_sphere]] — produces the input registered spherical surfaces
- [[mris_curvature]] — produces the `inflated.H` curvature file used in template construction
- [[surface-format]] — FreeSurfer surface and spherical parameterisation formats

## Confidence and Gaps

Confidence is **high** for the overall algorithm, positional argument structure, pipeline context, and the complete flag list (derived from full reading of `get_option()` in `mris_make_template.cpp`).

> [!gap] MRI_SP format documentation
> The spherical parameterisation file format (`MRI_SP`, stored as `.tif`) is not documented in the wiki. An internals or formats page for `MRI_SP` would be valuable.
