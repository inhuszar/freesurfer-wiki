---
title: "mrisp_paint"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mrisp_paint/mrisp_paint.cpp"
families:
  - "mrisp_*"
recon_all_stage: null
related:
  - "[[mrisp-tif]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
  - "[[mrisp_write]]"
  - "[[mris_make_template]]"
  - "[[mris_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact bilinear/barycentric interpolation method used by MRISfromParameterization() is not confirmed from this source file alone"
  - "Variance mode (-variance) computations are complex; full mathematical derivation needs verification"
  - "Whether mrisp_paint is called anywhere in recon-all is not confirmed"
tags:
  - surface
  - spherical-parameterization
  - template
  - atlas
---

# mrisp_paint

## Summary

`mrisp_paint` extracts one scalar array ("a variable") from a spherical surface-registration template file (`.tif` format, containing a multi-frame MRISP — MRI Surface Parameterization) and resamples it onto the vertices of a given surface mesh, producing an output file in curvature (`.curv`) format. The process of resampling a spherical parameterization back onto surface vertices is colloquially called "painting to a surface." It is the inverse operation of `mrisp_write`.

## Source Information

- **Language:** C++
- **Source file:** `mrisp_paint/mrisp_paint.cpp` (original author: Bruce Fischl)
- **Binary location:** `$FREESURFER_HOME/bin/mrisp_paint`

## Purpose and Context

`mrisp_paint` is used to transfer group-average scalar maps stored in a surface atlas template (`.tif`) back onto individual subject surfaces or onto the `fsaverage` surface for visualization. The most common use case is extracting a curvature, sulcal depth, or thickness map from a multi-subject average template and painting it onto a registered individual sphere for quality-checking or initializing registration.

The tool is designed to be used with:
- A **template file** produced by [[mris_make_template]] — a multi-frame MRISP `.tif` containing per-parameter mean and variance maps across subjects.
- An **input surface** — almost always `?h.sphere.reg` (a spherical surface registered to the template), so that the painted values are aligned to the individual's registration.

The output curvature file can subsequently be displayed on any of the same subject's surfaces (e.g., the inflated or pial surface) using a viewer such as [[freeview]].

## Inputs

### Required Inputs

Three positional arguments in order:

1. `<template_fname>` — path to the MRISP template `.tif` file. Multiple parameters are stored as frames; append `#<frame>` to select a specific frame (e.g., `mytemplate.tif#1`). Frame numbering starts at 0.
2. `<surf_fname>` — path to the surface file providing the vertex grid onto which the template data is resampled. Practically, this should be `?h.sphere.reg`.
3. `<out_fname>` — path for the output curvature file. If no directory is specified, the file is written to the same directory as `<surf_fname>`.

### Input Assumptions

> [!assumption] Input surface should be a sphere
> The tool is designed for use with spherical surfaces. The developer comment in the source (attributed to GW) explicitly states that "it only makes sense to use a sphere as the input surface." Using a non-spherical surface (e.g., the inflated or pial surface) will produce geometrically meaningless output because the spherical parameterization maps from $(θ, φ)$ to vertex index, which is only valid for a spherical mesh.

> [!assumption] Template `.tif` is a FreeSurfer MRISP, not a photographic image
> Despite the `.tif` extension, the template file is not an image in the photographic sense. It is a multi-frame floating-point 2D array encoded in TIFF format, representing a spherical surface parameterization stored on a latitude-longitude grid. See [[mrisp-tif]] for format details.

> [!assumption] Frame selection via `#` in the filename
> If the template contains multiple parameters (frames), the frame is selected by appending `#<N>` to the filename string. The `#` and everything after it is stripped from the filename before the file is opened. If no `#` is present, frame 0 is used by default. The `-f` flag overrides this.

## Outputs

### Files Created

- **Output curvature file** (`<out_fname>`): contains one scalar value per vertex of the input surface, in FreeSurfer curvature format. Values are the template parameter sampled (painted) at each vertex's spherical location. See [[curv-format]].

When `-coords white` or `-coords pial` is specified, the output is instead a **surface file** (written by `MRISwrite`), not a curvature file.

### Output Specifications

The output curvature file is in native FreeSurfer binary curvature format (`.curv`), storing one `float` per vertex. The values correspond to the selected template frame, optionally normalized by variance (`-N`), averaged (`-A`), or square-rooted (`-S`).

## Mathematical Foundations

The core operation is **spherical resampling** (inverse parameterization): for each vertex $v$ of the input surface with spherical coordinates $(\theta_v, \phi_v)$, the value is looked up in the 2D MRISP grid using bilinear interpolation:

$$\text{curv}[v] = \text{MRISP}(\theta_v, \phi_v)$$

This is implemented by `MRISfromParameterization(mrisp, mris, frame_number)` in `utils/mrisurf.cpp`. The MRISP grid has dimensions approximately 512×256 (longitude × latitude), corresponding to a uniform angular sampling of the sphere.

When `-N` (normalize) is used, `MRISnormalizeFromParameterization()` is called instead, which divides each vertex value by the stored variance for that location in the template.

When `-variance` is used, the tool computes a per-vertex squared difference between the subject's own scalar field and the template mean, normalized by the template variance:

$$\text{var\_map}[v] = \frac{(\text{subject}[v] - \text{template\_mean}[v])^2}{\max(0.01,\ \text{template\_var}[v])}$$

The floor of 0.01 on the variance prevents division by zero. The SSE (square root of the mean variance across vertices) is printed to stderr.

When `-coords <white|pial>` is used, `MRIScoordsFromParameterizationBarycentric()` is called to recover 3D vertex positions from a coordinate parameterization (a 3-frame MRISP storing x, y, z separately).

> [!gap] Interpolation method
> Whether `MRISfromParameterization` uses bilinear interpolation or nearest-neighbour on the MRISP grid is not confirmed from `mrisp_paint.cpp` alone; the implementation is in `utils/mrisurf.cpp`. Barycentric interpolation is available for the `-coords` path but not the default scalar path.

## Configuration Options

### Complete Flag Reference

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` | Set `SUBJECTS_DIR` for use with `-variance` |
| `-coords <which>` | `white` or `pial` | off | Treat template as a 3-frame coordinate parameterization; recover vertex positions and write a surface file instead of a curvature file |
| `-A <navgs>` | int | 0 | Average the painted curvature values `navgs` times using `MRISaverageCurvatures()` |
| `-N` | none | off | Normalize curvature by variance (calls `MRISnormalizeFromParameterization`) |
| `-f <frame>` | int | 0 | Select frame number from the template; overrides the `#<N>` inline specification |
| `-S` | none | off | Take square root of all painted values before writing |
| `-variance <subj> <hemi> <field>` | string, string, int | off | Compute a variance map for field `field_no`; requires `SUBJECTS_DIR` and `subj`/`hemi` to load the subject's own curvature file |
| `-V <vno>` | int | — | Enable per-vertex diagnostics for vertex number `vno` |
| `-W` | none | off | Enable `DIAG_WRITE` diagnostic output |
| `--help` / `-?` / `-U` | none | — | Print help and exit |
| `--version` / `-version` | none | — | Print version and exit |
| `--all-info` / `-all-info` | none | — | Print BIRN-standard program information |

### Configuration Interactions

> [!gotcha] `-coords` changes the output type entirely
> When `-coords white` or `-coords pial` is used, the output is a **surface file**, not a curvature file. The template must be a 3-frame MRISP (one frame per spatial coordinate x, y, z). Using `-coords` with a single-frame scalar template will produce garbage output.

> [!gotcha] `-f` and `#<N>` can conflict
> If the template filename contains `#<N>` and `-f` is also specified, the `#<N>` in the filename sets `frame_number` first during filename parsing, and then `-f` overrides it. In practice, use one or the other, not both.

> [!gotcha] `-variance` requires `SUBJECTS_DIR` and three arguments
> The `-variance` flag takes three arguments: `<subject_name> <hemi> <field_no>`. If `SUBJECTS_DIR` is not set (either by `-SDIR` or environment variable), the tool will exit with an error. `<field_no>` must be a non-negative integer corresponding to a recognized field in the internal `ReturnFieldName()` table; the exact mapping of integer to field name is internal and not documented in the help text.

> [!gotcha] `-N` selects `MRISnormalizeFromParameterization` regardless of `-f`
> The normalize flag changes the function called to sample the MRISP. The frame_number is passed through, so `-N -f 2` will normalize using frame 2. However, normalization assumes the template stores both mean (selected frame) and variance (frame+1) for the parameter. If the template does not have paired frames in this layout, the result is incorrect.

## Typical Use Cases

### Paint average curvature from a template onto a registered sphere

```bash
mrisp_paint \
  $FREESURFER_HOME/average/lh.average.curvature.filled.buckner40.tif \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  $SUBJECTS_DIR/bert/surf/lh.avg_curv
```

Produces `lh.avg_curv` on the subject's registered sphere, containing the group-average curvature from the template. This is used by [[mris_register]] as a target map for registration.

### Paint a specific frame

```bash
mrisp_paint mytemplate.tif#1 lh.sphere.reg lh.field1
```

### Paint with variance normalization

```bash
mrisp_paint -N mytemplate.tif lh.sphere.reg lh.norm_curv
```

### Average the output after painting

```bash
mrisp_paint -A 5 mytemplate.tif lh.sphere.reg lh.avg5_curv
```

## Pipeline Context

> [!gap] Whether `mrisp_paint` is called by `recon-all`
> It is not confirmed from the available source whether `mrisp_paint` is invoked directly by `recon-all`. It is likely called as part of the spherical registration stage to prepare the average curvature target map. This requires verification against the `recon-all` script.

The conceptual pipeline position:

[[mris_make_template]] produces template `.tif` → **`mrisp_paint`** resamples template onto subject sphere → painted scalar map used by [[mris_register]] or for visualization.

The inverse operation is performed by [[mrisp_write]].

## Gotchas and Caveats

> [!gotcha] Only sphere surfaces produce meaningful output
> The developer's own comment in the code states that using a non-spherical surface as input "probably only produces a useful result" with the `?h.sphere.reg` surface. The spherical parameterization maps latitude/longitude to a grid; non-spherical surfaces will have incorrect $(θ, φ)$ coordinates.

> [!gotcha] Output file location defaults to the surface directory
> If `<out_fname>` has no directory component, the output is written to the same directory as `<surf_fname>`, not to the current working directory.

> [!gotcha] `-variance` SSE is printed to stderr and not saved
> The squared error summary is printed with `fprintf(stderr, ...)` and is not saved to any output file. It is informational only.

## Related Tools

- [[mrisp_write]] — the inverse operation: writes a surface scalar overlay into a spherical MRISP `.tif`
- [[mris_make_template]] — creates the multi-subject average template `.tif` that `mrisp_paint` reads
- [[mris_register]] — spherical registration that uses the average curvature template; `mrisp_paint` is used to paint the template for alignment
- [[mrisp-tif]] — format specification for the MRISP `.tif` file
- [[curv-format]] — format specification for the output curvature file
- [[surface-format]] — format specification for surface files (used by `-coords` output)

## Confidence and Gaps

Medium confidence. Flag semantics and the main processing logic are derived directly from `mrisp_paint.cpp`. The underlying interpolation is in shared library code not read in full here.

> [!gap] Interpolation in `MRISfromParameterization`
> The exact interpolation method (bilinear vs. nearest-neighbour) used when resampling MRISP grid values to vertex coordinates is implemented in `utils/mrisurf.cpp` and not confirmed here.

> [!gap] `-variance` field number mapping
> The mapping of `field_no` integers to named fields (curvature, sulcal depth, etc.) is defined in `ReturnFieldName()` and `IsDistanceField()` in shared utility code. The full table is not documented in the help text.

> [!gap] `recon-all` invocation
> Whether and where `recon-all` calls `mrisp_paint` is not confirmed.
