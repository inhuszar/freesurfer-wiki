---
title: "mris_add_template"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mris_add_template/mris_add_template.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_average_curvature]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Binary may not be installed in 8.2.0; source lives in attic/."
  - "Exact MRI_SP parameter image layout needs confirmation."
tags:
  - surface
  - atlas
  - template
---

# mris_add_template

## Summary

`mris_add_template` adds a single subject's spherically-registered surface data to a surface parameter template (`.tif` / `MRI_SP` file). The template accumulates mean and variance of curvature and sulcal depth across subjects and is used during atlas construction. It is the individual-subject contribution step in a workflow that eventually produces a group-average registration atlas.

## Source Information

- **Language:** C++
- **Source file:** `attic/mris_add_template/mris_add_template.cpp`
- **Note:** The source resides in the `attic/` subdirectory, indicating this may be a legacy or low-maintenance utility. It is compiled against the standard FreeSurfer surface library (`mrisurf`, `mri`).

## Purpose and Context

Building a spherical surface registration atlas requires accumulating statistics across many individual subjects. `mris_add_template` reads a single subject's registered sphere and curvature data, projects the scalar fields onto a spherical parameter map (`MRI_SP`), and adds them to a running template file. After processing all subjects, the template encodes per-vertex mean and variance of the chosen scalar fields at the resolution of the spherical parameterisation. This template is subsequently used by `mris_register` during subject-specific surface registration.

The tool is the per-subject accumulation step; the template is initialised separately and finalised after all subjects are processed.

## Inputs

| Input | Description |
|-------|-------------|
| `<surf_dir>` | Directory containing subject surface files |
| `<hemi>` | Hemisphere (`lh` or `rh`) |
| `<sphere_name>` | Name of the registered sphere file (e.g., `sphere.reg`) |
| `<subject>` | Subject name (used to construct surface file paths) |
| `<template_in>` | Existing template file (`.tif`, MRI_SP format) to accumulate into |
| `<template_out>` | Output template file path |

- Requires `SUBJECTS_DIR` to be set.
- Reads curv/sulc scalar files associated with the surface.

## Outputs

| Output | Description |
|--------|-------------|
| `<template_out>` | Updated MRI_SP template file with the subject's contribution added |

The template file stores `IMAGES_PER_SURFACE * SURFACES` = 6 parameter images (mean, variance, DOF) × 2 surfaces (smoothwm and inflated).

## Mathematical Foundations

The spherical parameterisation maps the cortical surface to a sphere. A surface scalar field $f(v)$ defined at each vertex $v$ is mapped to spherical coordinates $(\theta, \phi)$ via the registered sphere. The template accumulates:

$$
\mu(\theta, \phi) \mathrel{+}= f(\theta, \phi)
$$
$$
\sigma^2(\theta, \phi) \mathrel{+}= f(\theta, \phi)^2
$$
$$
n(\theta, \phi) \mathrel{+}= 1
$$

After all subjects are added, normalisation yields mean and variance maps used as the registration target.

The `which_norm` parameter (default `NORM_MEAN`) controls how the curvature scalar is normalised before accumulation.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| (none documented via `--help`) | — | — | Tool uses positional arguments only |
| `-w <curv_fname>` | string | `""` | Specify a custom curvature file name |
| `-n <navgs>` | int | `0` | Number of smoothing averages applied to curvature before adding |
| `-s <scale>` | float | `1.0` | Scale factor applied to curvature values |
| `-m` | flag | `NORM_MEAN` | Use mean normalisation (default) |
| `-v` | flag | — | Verbose output |

> [!gap] Unresolved question
> The full set of command-line flags is not documented in the binary's help output. Flags were inferred from the global variables in the source (`navgs`, `scale`, `curvature_fname`, `which_norm`). Verify by inspecting the `get_option()` function in detail.

## Configuration Interactions

- `-n` (smoothing) is applied before accumulation; heavy smoothing reduces the specificity of the template.
- The `which_norm` option (mean vs. median) affects the scale of accumulated values.

## Typical Use Cases

```bash
# Add subject bert's left hemisphere to a template
mris_add_template $SUBJECTS_DIR/bert/surf lh sphere.reg bert \
    lh.atlas_template_prev.tif lh.atlas_template.tif
```

## Pipeline Context

This tool is used in atlas construction workflows, not in the standard per-subject `recon-all` pipeline. It is called iteratively over a training set of subjects to build or extend a registration atlas. The resulting template is then used by [[mris_register]] when registering new subjects.

Related atlas-building tools:
- [[mris_register]] — uses the template for registration
- [[mris_average_curvature]] — averages curvature after registration
- [[mris_sphere]] — produces the sphere.reg that feeds into this tool

## Gotchas and Caveats

> [!gotcha] Attic placement
> The source resides in `attic/`, suggesting reduced maintenance priority. Users building custom atlases should verify the tool is still compiled and installed in their FreeSurfer distribution.

> [!gotcha] Template initialisation required
> The template file must already exist before calling `mris_add_template`. The tool accumulates into an existing file rather than creating one from scratch.

## Related Tools

- [[mris_register]] — registers a subject's sphere to the atlas
- [[mris_sphere]] — produces the input sphere
- [[mris_average_curvature]] — averages curvature over registered subjects

## Confidence and Gaps

**Confident:** Tool purpose (adding subject data to an MRI_SP template), language, general I/O structure, and mathematical model inferred from source code comments and function calls (`MRISPread`, `MRISPwrite`, `MRISfromParameterization`).

**Uncertain:** Exact flag names (inferred from global variables rather than exhaustive `get_option()` parse). The tool may not be installed by default in 8.2.0.

> [!gap] Installation status
> The source lives in `attic/` in the 8.2.0 tree. It is unclear whether a compiled binary ships with the standard distribution. Verify with `which mris_add_template` in a running FreeSurfer environment.
