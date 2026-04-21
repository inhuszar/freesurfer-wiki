---
title: "mrisp_write"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mrisp_write/mrisp_write.cpp"
families:
  - "mrisp_*"
recon_all_stage: null
related:
  - "[[mrisp-tif]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
  - "[[mrisp_paint]]"
  - "[[mris_make_template]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Whether mrisp_write is called by recon-all or mris_make_template internally is not confirmed from this source file"
  - "Default MRISP grid size (256x512) vs. scaled versions: exact pixel dimensions vs. angular resolution needs verification"
  - "SPCORR spherical correlation mode is complex; full mathematical description requires reading shared code"
tags:
  - surface
  - spherical-parameterization
  - template
  - atlas
---

# mrisp_write

## Summary

`mrisp_write` takes a scalar overlay defined on a surface mesh (typically `?h.sphere.reg`) and maps it into spherical parameterization coordinates, writing the result as a multi-frame MRISP `.tif` or `.mgz` file. This is the forward direction of the spherical parameterization: from per-vertex scalar values on a registered sphere to a 2D latitude-longitude image that can be averaged across subjects to build atlas templates. It is the inverse of [[mrisp_paint]].

## Source Information

- **Language:** C++
- **Source file:** `mrisp_write/mrisp_write.cpp` (original author: Bruce Fischl)
- **Binary location:** `$FREESURFER_HOME/bin/mrisp_write`

## Purpose and Context

`mrisp_write` converts individual subject scalar surface maps into a common spherical coordinate frame, enabling cross-subject averaging and template construction. The output `.tif` or `.mgz` MRISP files are consumed by [[mris_make_template]] (to build average templates) and by [[mrisp_paint]] (to resample template data back onto individual spheres).

Typical inputs are scalar curvature or thickness maps on the registered sphere (`?h.sphere.reg`). Because all subjects' spheres are registered to the same atlas template, the same spherical coordinates in the MRISP correspond to anatomically homologous locations across subjects.

The tool also supports advanced modes: writing 3D coordinate parameterizations, computing within-label vertex correlations, cross-hemisphere correlations, and applying spherical Gaussian blurring.

## Inputs

### Required Inputs

Three positional arguments in order:

1. `<input_surface>` — path to the input surface file (the sphere). This provides the vertex-to-sphere geometry. The canonical input is `?h.sphere.reg`.
2. `<overlay_fname>` — path to the scalar overlay file. This can be:
   - A curvature-format file (`.curv`, thickness, sulcal depth, etc.) — single frame
   - A surface-encoded volume file (`.mgz`, `.nii`, `.nii.gz`) — multi-frame
   - A label file (`.label`) — converted to a binary 0/1 overlay (or stat values if present)
3. `<out_fname>` — path for the output MRISP file. Must be a `.tif` or `.mgz` file.

### Input Assumptions

> [!assumption] Input surface should be a sphere
> The parameterization is meaningful only when the input surface is a sphere (specifically `?h.sphere.reg` after registration). Using a non-spherical surface will produce geometrically incorrect mappings.

> [!assumption] Overlay width must match number of surface vertices for volume-encoded overlays
> When the overlay is a `.mgz`/`.nii` volume, it is first reshaped to `(width * height * depth, 1, 1, nframes)`. The resulting width must match `mris->nvertices`. If it does not, the tool exits with an error.

> [!assumption] For label input, stat values are used if non-zero; otherwise vertices are set to 1
> When the overlay is a `.label` file, the per-vertex `stat` field is transferred to `curv` if `LabelMaxStat(area) > 0`; otherwise all label vertices are assigned the value 1 and non-label vertices remain at 0.

## Outputs

### Files Created

- **Output MRISP file** (`<out_fname>`): a 2D floating-point image in TIFF format (`.tif`) or a 3D volume in `.mgz` format, containing the spherical parameterization of the input overlay. For single-frame inputs this is a single-frame MRISP; for multi-frame volume inputs each frame is written as a separate MRISP frame.

The default MRISP grid size is 256 rows × 512 columns (latitude × longitude), corresponding to a uniform sampling of the sphere at approximately 0.7° resolution. This can be scaled with `-SCALE`.

### Output Specifications

Each MRISP frame contains one `float` value per grid cell, representing the overlay value at that spherical coordinate. Grid cells with no surface vertex mapping may contain interpolated or zero values depending on the parameterization method.

## Mathematical Foundations

The forward parameterization maps each surface vertex $v$ with spherical coordinates $(\theta_v, \phi_v)$ to a grid cell $(u, w)$:

$$u = \lfloor \phi_v / (2\pi) \cdot W \rfloor, \quad w = \lfloor \theta_v / \pi \cdot H \rfloor$$

where $W$ and $H$ are the grid width and height respectively (default 512 and 256). The vertex's curvature value is scatter-accumulated into the corresponding grid cell. Grid cells covered by multiple vertices are averaged; empty cells are filled by interpolation.

This is implemented by `MRIStoParameterization(mris, mrisp, scale, frame)` or the barycentric variant `MRIStoParameterizationBarycentric()`.

The default mapping (`MRIStoParameterization`) uses a scatter/accumulation approach. The barycentric variant (`-BARYCENTRIC`) uses barycentric weights of the triangle containing the grid point, which may give smoother results for sparse meshes.

When `-sigma` is specified, after parameterization, a spherical Gaussian blur is applied with `MRISPblur(mrisp, mrisp_dst, sigma, f)` independently on each frame.

When `-CORR <label>` is used, the tool computes a correlation matrix: for each seed vertex in the label, it computes the Pearson correlation of its time-course with every other vertex's time-course across `mri_overlay->nframes` (treated as time points). This requires a multi-frame overlay (e.g., fMRI data).

When `-SPCORR` is used in combination with `-CONTRA`, the correlation matrix is computed between corresponding positions in the spherical MRISP maps of the two hemispheres.

> [!gap] Exact fill behaviour for empty MRISP cells
> When no vertex maps to a given grid cell, the behaviour (zero fill, nearest-neighbour fill, or bilinear interpolation from neighbours) is determined by `MRIStoParameterization` in shared code and is not confirmed here.

## Configuration Options

### Complete Flag Reference

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` env | Set `SUBJECTS_DIR` |
| `-coords <which>` | `white` or `pial` | off | Treat overlay as a surface file and write a 3-frame coordinate parameterization (x, y, z) instead of a scalar MRISP |
| `-A <navgs>` | int | 0 | Average the overlay `navgs` times with `MRISaverageCurvatures()` before parameterizing |
| `-N` | none | off | Normalize curvature by mean before parameterizing (`MRISnormalizeCurvature(mris, NORM_MEAN)`) |
| `-SCALE <scale>` | float | 1.0 | Scale the MRISP grid size: default is 256×512; a scale of 0.5 gives 128×256, scale 2 gives 512×1024 |
| `-CORR <label>` | string (label file) | off | Compute correlation matrix: for each vertex in label, correlate its time-course with all other vertices; requires multi-frame overlay |
| `-SPCORR` | none | off | Compute cross-hemi spherical correlations (requires `-CONTRA`) |
| `-CONTRA <surf> <overlay>` | string, string | off | Load a contralateral hemisphere surface and overlay for cross-hemi correlation |
| `-L <label>` | string | off | Mask overlay to only vertices within the specified label (others set to 0) before parameterizing |
| `-C <label>` | string | off | Mask contralateral overlay to only vertices within the specified label |
| `-FRAME <n>` | int | all | Extract only frame `n` from a multi-frame volume overlay before processing |
| `-BARYCENTRIC` / `-BARY` | none | off | Use barycentric interpolation instead of scatter-accumulation for the parameterization |
| `-sigma <s>` | float | 0 | Apply spherical Gaussian blur with standard deviation `s` after parameterization |
| `-V <vno>` | int | — | Enable per-vertex diagnostics for vertex `vno` |
| `-W` | none | off | Enable `DIAG_WRITE` diagnostic output |
| `--help` / `-?` / `-U` | none | — | Print help and exit |
| `--version` / `-version` | none | — | Print version and exit |
| `--all-info` / `-all-info` | none | — | Print BIRN-standard program information |

### Configuration Interactions

> [!gotcha] `-coords` changes the semantic of the overlay argument
> When `-coords white` or `-coords pial` is used, `<overlay_fname>` is treated as a **surface file** (not a scalar file), and the tool reads its vertex positions and stores the x, y, z coordinates as three separate MRISP frames. This is used to create a coordinate parameterization for atlas construction, not a scalar parameterization.

> [!gotcha] `-CORR` requires a multi-frame overlay
> The correlation computation requires `nframes > 1` in the overlay volume. For single-frame overlays, the correlation will be computed over a single time point, which is meaningless. The tool does not check for this; it will produce a matrix of all 1s (perfect self-correlation) or degenerate output.

> [!gotcha] `-SPCORR` requires `-CONTRA`
> The `spherical_corr` flag triggers the cross-hemi correlation via `mrispComputeCorrelations()`, which requires both ipsilateral and contralateral MRISP maps. If `-SPCORR` is set without `-CONTRA`, the function will receive a null contra MRISP and produce incorrect output (only the within-hemisphere part will be filled).

> [!gotcha] `-L` mask is applied twice in the source
> The label mask `LabelMaskSurfaceCurvature(area, mris)` is called both before and after `MRISaverageCurvatures()`. This is intentional: averaging can spread values outside the label, so the second mask call re-zeros the values that leaked outside. Be aware that this means vertices outside the label are guaranteed to be zero in the MRISP.

> [!gotcha] `-SCALE` affects resolution but not the surface
> `-SCALE` changes the MRISP grid resolution, not the input surface. A higher scale factor gives finer angular resolution in the MRISP but does not add information beyond the vertex density of the input surface.

## Typical Use Cases

### Write a curvature map to a spherical parameterization

```bash
mrisp_write \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  $SUBJECTS_DIR/bert/surf/lh.curv \
  $SUBJECTS_DIR/bert/surf/lh.curv.mrisp.tif
```

Produces an MRISP `.tif` containing the curvature map in spherical coordinates. This is the first step before averaging across subjects.

### Write a thickness map with higher resolution

```bash
mrisp_write -SCALE 2 \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  $SUBJECTS_DIR/bert/surf/lh.thickness \
  lh.thickness.mrisp.tif
```

### Write a multi-frame fMRI overlay

```bash
mrisp_write \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  lh.fmri_surf.mgz \
  lh.fmri.mrisp.tif
```

Each frame of `lh.fmri_surf.mgz` becomes one frame in the MRISP.

### Write a coordinate parameterization

```bash
mrisp_write -coords white \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  $SUBJECTS_DIR/bert/surf/lh.white \
  lh.white.coords.mrisp.tif
```

Stores the white surface vertex positions as a 3-frame (x, y, z) MRISP.

### Apply spherical smoothing after parameterization

```bash
mrisp_write -sigma 2 \
  $SUBJECTS_DIR/bert/surf/lh.sphere.reg \
  $SUBJECTS_DIR/bert/surf/lh.curv \
  lh.curv.smooth.mrisp.tif
```

## Pipeline Context

> [!gap] Whether `mrisp_write` is called by `recon-all` directly
> It is not confirmed whether `recon-all` calls `mrisp_write` directly. The tool is likely used internally by [[mris_make_template]] to assemble per-subject parameterizations before averaging. This requires verification.

Conceptual position:

subject scalar map (`.curv`, `.thickness`) → **`mrisp_write`** → MRISP `.tif` → [[mris_make_template]] → group average template

The reverse direction is performed by [[mrisp_paint]].

## Gotchas and Caveats

> [!gotcha] Output is `.tif` or `.mgz` only
> The tool writes the MRISP using `MRISPwrite()`, which supports `.tif` and `.mgz` formats. The file extension in `<out_fname>` determines the format. Other extensions will either fail or produce a `.tif` by default.

> [!gotcha] Volume overlays are reshaped before processing
> For `.mgz`/`.nii` overlays, the tool reshapes the volume to `(width*height*depth, 1, 1, nframes)` before processing. This means the overlay is expected to be a 1D array of vertex values stored as a volume, not a 3D spatial volume. Tools like `mri_vol2surf` produce this format.

> [!gotcha] NFRAMES flag is explicitly not implemented
> The source code includes a `-NFRAMES` option handler that prints "NOT IMPLEMENTED YET" and exits with code 1. This flag should not be used.

## Related Tools

- [[mrisp_paint]] — the inverse operation: reads an MRISP template and paints scalar values back onto a surface
- [[mris_make_template]] — uses MRISP files from multiple subjects to build a group-average template
- [[mrisp-tif]] — format specification for the MRISP `.tif` file
- [[curv-format]] — format specification for curvature files (typical input overlay)
- [[surface-format]] — format specification for surface files (used by `-coords` mode)

## Confidence and Gaps

Medium confidence. Flag semantics and processing logic are derived from `mrisp_write.cpp`. The shared parameterization function (`MRIStoParameterization`) is in `utils/mrisurf.cpp` and is not fully read.

> [!gap] Empty cell fill strategy
> The exact behaviour of `MRIStoParameterization` for grid cells that no surface vertex maps to is not confirmed.

> [!gap] `mris_make_template` internal use
> Whether `mris_make_template` calls `mrisp_write` internally (vs. replicating the parameterization logic) is not confirmed.

> [!gap] `recon-all` invocation
> Whether and where `recon-all` calls `mrisp_write` is not confirmed.
