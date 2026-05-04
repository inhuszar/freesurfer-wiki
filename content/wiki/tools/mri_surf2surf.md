---
title: "mri_surf2surf"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_surf2surf/mri_surf2surf.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mris_preproc]]"
  - "[[mris_register]]"
  - "[[coordinate-systems]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Exact behaviour of --reshape-factor with non-icosahedral surfaces is unclear."
  - "Whether --cortex smoothing constraint is enforced by default in newer versions needs verification."
tags:
  - surface
  - resampling
  - group-analysis
  - smoothing
  - fsaverage
---

# mri_surf2surf

## Summary

`mri_surf2surf` resamples surface-encoded data from one subject's surface onto another subject's surface (or onto the icosahedron). It is the standard tool for mapping per-vertex scalar data—thickness, curvature, activation maps, labels—to a common space (typically `fsaverage`) prior to group-level statistical analysis. It also supports surface-coordinate mapping (xyz), annotation transfer, and in-place surface smoothing.

## Source Information

- **Language:** C++
- **Source file:** `mri_surf2surf/mri_surf2surf.cpp`
- **Original author:** Douglas Greve (MGH)
- **Key libraries:** `mrisurf`, `resample`, `icosahedron`, `registerio`

## Purpose and Context

When multiple subjects are processed through `recon-all`, their surface meshes have different numbers of vertices and different spatial layouts. To perform voxel-wise (actually vertex-wise) group statistics, data must be resampled to a canonical surface. `mri_surf2surf` accomplishes this by:

1. Reading the source subject's `sphere.reg` (or a user-specified registration surface).
2. For each target vertex, finding the nearest source vertex in registration space (forward nearest-neighbor).
3. Optionally applying a reverse-nearest-neighbor fill to eliminate holes (default `nnfr` method).
4. Optionally smoothing the data on the surface.

The canonical target is almost always `fsaverage` (order-7 icosahedron, 163,842 vertices), though any subject in `$SUBJECTS_DIR` can be a target.

## Inputs

| Input | Description |
|---|---|
| `--srcsubject` | Source subject name in `$SUBJECTS_DIR`, or `ico` for icosahedron |
| `--sval` | Surface overlay file on the source (curvature, paint/w, MGH, NIfTI, analyze) |
| `--sval-xyz surfname` | Use vertex XYZ coordinates of named surface as source values |
| `--sval-tal-xyz surfname` | Like `--sval-xyz` but applies talairach.xfm first |
| `--sval-area surfname` | Use vertex area of named surface |
| `--sval-nxyz surfname` | Use surface normals as source values |
| `--sval-annot annotfile` | Map annotation file to the target |
| `--hemi` | Hemisphere: `lh` or `rh` |
| `--surfreg` | Registration surface (default: `sphere.reg`) |

## Outputs

| Output | Description |
|---|---|
| `--tval` | Output file (surface overlay on target) |
| `--tval-xyz volume` | Output a binary surface file with xyz from source, embedded in volume geometry |

Output format is inferred from the filename extension or specified with `--tfmt`. Supported formats include curv, paint/w, MGH, MGZ, NIfTI, analyze.

## Mathematical Foundations

The resampling uses a **nearest-neighbor** approach in the spherical registration space:

1. Both source and target subjects have a `sphere.reg` surface — a unit sphere where cortical folding patterns have been aligned to an atlas.
2. For each target vertex $t_i$, find the source vertex $s_j$ minimising the geodesic (or Euclidean) distance on the sphere.
3. With `--mapmethod nnfr` (default): compute the forward map, then for source vertices that were not selected (holes), assign them to the nearest target vertex. When multiple source vertices map to the same target vertex, their values are averaged.
4. With `--mapmethod nnf`: forward map only — some holes may remain.

Smoothing (when requested) uses iterative nearest-neighbour averaging that approximates Gaussian smoothing (heat-kernel method). The number of iterations is computed from the desired FWHM in mm based on the white surface geometry.

> [!math] FWHM-to-iterations conversion
> The relationship between FWHM and smoothing iterations uses the approximation:
> $$
> \text{FWHM} \approx \sqrt{4 \ln 2 \cdot 2t} \approx \sqrt{4 \ln 2 \cdot 2 \cdot n_{\text{iter}} \cdot \bar{d}^2}
> $$
> where $\bar{d}$ is the mean inter-vertex spacing on the white surface. This is an approximation; actual smoothing behaviour depends on local surface geometry.

## Configuration Options

### Source specification

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--srcsubject` | subjectname | — | Source subject in `$SUBJECTS_DIR`, or `ico` for icosahedron |
| `--s` | subjectname | — | Set both source and target to the same subject (convenience alias combining `--srcsubject` + `--trgsubject`) |
| `--sval`<br>`--srcsurfval` | file | — | Source overlay file |
| `--sval-xyz` | surfname | — | Use vertex XYZ coordinates of named surface as source |
| `--sval-tal-xyz` | surfname | — | Surface XYZ coordinates transformed by `talairach.xfm` |
| `--sval-area` | surfname | — | Vertex area of named surface as source |
| `--sval-nxyz` | surfname | — | Surface normals of named surface as source |
| `--sval-annot` | annotfile | — | Source annotation file; also forces `--mapmethod nnf` |
| `--sval-rip` | surfname | — | Use vertex rip flag of named surface as source values |
| `--sfmt`<br>`--srcfmt`<br>`--src_type` | typestring | (auto) | Source format: `curv`, `paint`/`w`, or any `mri_convert`-compatible type |
| `--srcicoorder` | order | (auto-detected) | Icosahedron order for source; required when source is a `.w` file |
| `--srchemi` | `lh` or `rh` | (value of `--hemi`) | Source hemisphere when different from target |
| `--srcsurfreg` | surface | `sphere.reg` | Source registration surface |
| `--srcdump` | file | — | Dump source surface data to file (debugging) |
| `--srchits` | file | — | Save per-vertex source hit count to file (debugging) |
| `--srcdist` | distfile | — | Compute and save distance from source surface |
| `--projfrac` | surfname frac | — | Project surface `surfname` along normal by fraction `frac` and use projected XYZ as source |
| `--projabs` | surfname dist | — | Project surface `surfname` along normal by absolute distance `dist` |

### Target specification

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--trgsubject` | subjectname | — | Target subject in `$SUBJECTS_DIR`, or `ico` for icosahedron |
| `--trgicoorder` | order | — | Icosahedron order (0–7); required when `--trgsubject ico` |
| `--tval`<br>`--trgsurfval`<br>`--trgval`<br>`--o` | file | — | Output overlay file |
| `--tval-xyz` | volume | — | Save output as a binary surface file with XYZ from source; the volume provides target geometry |
| `--tfmt`<br>`--trgfmt`<br>`--trg_type` | typestring | (auto) | Target format: `curv`, `paint`/`w`, or any `mri_convert`-compatible type |
| `--trghemi` | `lh` or `rh` | (value of `--hemi`) | Target hemisphere when different from source |
| `--trgsurfreg` | surface | `sphere.reg` | Target registration surface |
| `--trgdump` | file | — | Dump target surface data to file (debugging) |
| `--trghits` | file | — | Save per-vertex target hit count to file (debugging; symmetric to `--srchits`) |
| `--trgdist` | distfile | — | Save distance from source to each target vertex |

### Hemisphere and registration

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--hemi`<br>`--h` | `lh` or `rh` | — | Hemisphere for both source and target (`--h` is an alias) |
| `--surfreg` | surface | `sphere.reg` | Registration surface for both source and target |
| `--dual-hemi` | — | `off` | Assume source registration file uses `?h.?h.surfreg` naming convention |
| `--reg` | regfile [vol] | — | Registration file (`.dat` or `.lta`) to apply to `--sval-xyz` coordinates |
| `--reg-inv` | regfile [vol] | — | Apply inverse of `regfile` to `--sval-xyz` coordinates |
| `--reg-inv-lrrev` | regfile | — | Apply left-right reversed inverse of `regfile` (special coordinate mapping) |
| `--reg-diff` | reg2 | — | Subtract `reg2` from `--reg` before applying (primarily for testing) |

### Resampling method

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mapmethod` | `nnfr` or `nnf` | `nnfr` | Resampling method: `nnfr` = nearest-neighbour forward+reverse (fills holes); `nnf` = forward only |
| `--jac` | — | `off` | Apply Jacobian correction; required when resampling area or volume measures |
| `--hash`<br>`--usehash` | — | `on` | Enable hash table for accelerated nearest-neighbour lookup |
| `--nohash`<br>`--dontusehash` | — | — | Disable hash table for nearest-neighbour lookup |
| `--old` | — | `on` | Use old surf2surf algorithm (default) |
| `--new` | — | — | Use new surf2surf algorithm |
| `--vtxmap` | file | — | Load or save the vertex mapping explicitly |
| `--patch` | srcpatchfile targsurf ndilations | — | Resample a patch file onto target surface with `ndilations` dilations |

### Smoothing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--fwhm-src` | mm | `0` | Smooth source before resampling (FWHM in mm; iterative NN approximation) |
| `--fwhm-trg`<br>`--fwhm` | mm | `0` | Smooth target after resampling (FWHM in mm) |
| `--nsmooth-in` | N | `0` | Smoothing iterations on input (equivalent to `--fwhm-src` but in iteration count) |
| `--nsmooth-out`<br>`--nsmooth` | N | `0` | Smoothing iterations on output (equivalent to `--fwhm-trg` but in iteration count) |

> [!note] Noise tokens filtered from C1 audit
> An audit reported the following as missing flags: `--fwhm-in`, `--fwhm-out`, `--normvar`, `--nsmooth-` (truncated), `--smooth`, `--smooth-in`, `--smooth-out`, `--surf`. None of these are real parsed options in `mri_surf2surf.cpp`. Specifically: `--fwhm-in` and `--fwhm-out` appear only in error message strings (the real flags are `--fwhm-src` and `--fwhm`/`--fwhm-trg`); `--normvar` appears only in a `printf` help line (the real parsed flag is `--norm-var`, already documented above); `--nsmooth-` is a truncated token with no parser entry; `--smooth`, `--smooth-in`, and `--smooth-out` appear only as prose in embedded help text describing the behaviour of `--nsmooth`, `--nsmooth-in`, and `--nsmooth-out`; `--surf` appears only in a source comment referencing `mri_vol2vol`.
| `--label-src` | labelfile | — | Constrain source smoothing to this label |
| `--label-trg` | labelfile | — | Constrain target smoothing to this label |
| `--cortex` | — | `off` | Use `?h.cortex.label` as smoothing mask (recommended) |
| `--no-cortex` | — | `on` | Do not use cortex label for smoothing (explicit default) |
| `--label-invert` | — | `off` | Invert the source smoothing label |
| `--prune` | — | `off` | Remove any vertex that is zero in any time point before smoothing |
| `--no-prune` | — | `on` | Do not prune mask before smoothing (explicit default) |
| `--prune_thr` | value | `FLT_MIN` | Threshold for the prune mask |

### Frame and value operations

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--frame` | N | `0` | Output frame index (zero-based); relevant for paint/w format which stores one frame |
| `--mul` | value | — | Multiply input values by `value` before resampling |
| `--div` | value | — | Divide input values by `value` before resampling |
| `--synth` | — | `off` | Replace input with white Gaussian noise |
| `--ones` | — | `off` | Replace input with ones |
| `--seed` | N | (auto) | Random seed for `--synth` |
| `--norm-var` | — | `off` | Rescale output so that standard deviation = 1 (useful with `--synth`) |
| `--split` | — | `off` | Save each output frame as a separate file |

### Output reshape

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reshape` | — | `off` | Save output as multiple slices (required for analyze/NIfTI with large icosahedra) |
| `--noreshape` | — | `on` | Explicitly disable reshape (explicit default) |
| `--reshape-factor` | N | `6` | Reshape to N slices (chooses closest prime factor of N); enables `--reshape` |
| `--reshape3d` | — | `off` | Reshape fsaverage (ico7) into 42×47×83 (disables `--reshape`) |

### Environment and directories

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--sd` | dir | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` on the command line |

### Surface coordinate projection utilities

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--proj-norm` | sourcesurf distmm outsurf | — | Project all surface vertices of `sourcesurf` by `distmm` along their normals; write result to `outsurf` (exits after operation) |
| `--proj-surf` | surf projmagfile scale outsurf | — | Project surface `surf` vertices by `projmagfile × scale` at each vertex; write to `outsurf` (exits after operation) |

### Diagnostics and testing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--rms` | rms.dat | — | Save RMS difference between two registration surfaces to `rms.dat` (testing) |
| `--rms-mask` | mask | — | Restrict RMS computation to vertices inside `mask` |
| `--cavtx` | vtxno | — | Print coordinates for vertex `vtxno` during registration load (debugging) |
| `--conv` | N | — | Run convolution test (debugging) |
| `--usediff` | — | `off` | Enable diffusion-based smoothing |
| `--nousediff` | — | `off` | Disable diffusion-based smoothing (explicit default) |
| `--no-rev-face-order` | — | `off` | Prevent automatic face-order reversal |
| `--debug` | — | `off` | Enable verbose debug output |
| `--help` | — | — | Print full help text and exit |
| `--version` | — | — | Print version string and exit |

## Configuration Interactions

- `--sval-annot` automatically sets `--mapmethod nnf` (to avoid averaging annotation indices).
- `--sval-xyz` / `--sval-tal-xyz` must be combined with `--tval-xyz` to produce a valid output surface file.
- `--fwhm-src` and `--nsmooth-in` are equivalent ways to specify pre-resampling smoothing; using both is not recommended (the code will error if both are non-zero).
- `--fwhm-trg`/`--fwhm` and `--nsmooth-out`/`--nsmooth` are equivalent for post-resampling smoothing; similarly should not be combined.
- `--cortex` requires that `?h.cortex.label` exists in the source subject's `label/` directory (created by `recon-all`).
- `--reshape` has no effect when the output type is paint/w.
- When target is `ico`, `--trgicoorder` must be specified.
- `--s subjectname` sets both `srcsubject` and `trgsubject` to the same value — useful for in-place smoothing or format conversion without cross-subject resampling.
- `--reg-inv` uses the same code path as `--reg` but inverts the matrix before applying it; do not supply a template volume when using an LTA file.
- `--reshape-factor` implicitly enables `--reshape`.
- `--proj-norm` and `--proj-surf` exit the program immediately after writing the output surface — they cannot be combined with other resampling operations.

> [!gotcha] Annotation mapping is not a substitute for parcellation
> When transferring annotations between subjects with `--sval-annot`, the parcellation is being mapped geometrically, not re-estimated from folding patterns. The transferred labels may be inaccurate for the target subject. This is noted in the source code.

> [!gotcha] Paint output requires partial path
> When `--tfmt` is paint or w, the output must be specified with a relative path prefix (e.g., `./data-lh.w`), otherwise the file is written into the subject's anatomical directory.

## Typical Use Cases

**1. Resample thickness to fsaverage for group analysis:**
```bash
mri_surf2surf --hemi lh --srcsubject bert \
  --srcsurfval thickness --src_type curv \
  --trgsubject ico --trgicoorder 7 \
  --trgsurfval bert-thickness-lh.mgh
```

**2. Smooth thickness on an individual subject's surface (within cortex only):**
```bash
mri_surf2surf --s bert --hemi lh \
  --sval lh.thickness --sfmt curv \
  --tval lh.thickness.sm10 --tfmt curv \
  --fwhm-trg 10 --cortex
```

**3. Map surface coordinates to a Talairach average subject:**
```bash
mri_surf2surf --s yoursubject --hemi lh --sval-tal-xyz white \
  --trgsubject fsaverage --tval lh.white.yoursubject \
  --tval-xyz $SUBJECTS_DIR/fsaverage/mri/orig.mgz
```

**4. Transfer parcellation annotation between subjects:**
```bash
mri_surf2surf --srcsubject subj1 --trgsubject subj2 --hemi lh \
  --sval-annot $SUBJECTS_DIR/subj1/label/lh.aparc.annot \
  --tval       $SUBJECTS_DIR/subj2/label/lh.subj1.aparc.annot
```

## Pipeline Context

`mri_surf2surf` is not called directly by `recon-all`, but it is a critical tool in the **group analysis pipeline**:

1. `recon-all` produces per-subject surface overlays (thickness, curvature, area, etc.) and `sphere.reg`.
2. `mris_preproc` (which calls `mri_surf2surf` internally) concatenates per-subject surface data onto a common surface for group analysis.
3. `mri_surf2surf` maps individual data to `fsaverage` for vertex-wise group statistics (e.g., in `mri_glmfit`).

See also: [[mri_vol2surf]] (projects volumes onto surfaces), [[mri_surf2vol]] (back-projects surface data), [[mris_preproc]], [[mris_register]].

## Gotchas and Caveats

> [!gotcha] Frame numbering
> When outputting to paint/w format, only one frame is written. The frame is zero-indexed. If your source data has multiple frames (time series), specify `--frame`.

> [!gotcha] Source/target format auto-detection
> If no `--sfmt` or `--tfmt` is given, format is detected from the filename extension. Ambiguous extensions (e.g., `.mgh` for both volume-encoded surface data and 3D volumes) should be accompanied by explicit format flags.

> [!gotcha] Reshaping for large formats
> For analyze/NIfTI output, dimension sizes cannot exceed 2^15. For large icosahedra (ico7 has 163,842 vertices), `--reshape` is needed. Without it, the output may be unreadable by some software.

> [!gotcha] Smoothing iterations vs. FWHM discrepancy
> The FWHM-to-iterations conversion is based on the white surface geometry. The actual smoothing kernel on an irregular mesh is not exactly Gaussian; FWHM is an approximation.

## Related Tools

- [[mri_vol2surf]] — projects volume data onto surface
- [[mri_surf2vol]] — back-projects surface data into a volume
- [[mris_preproc]] — concatenates surface data across subjects, calls mri_surf2surf
- [[mris_register]] — spherical registration that produces `sphere.reg`
- [[mris_calc]] — arithmetic on surface overlays
- [[mri_binarize]] — binarize/threshold volume or surface data

## Confidence and Gaps

The command-line interface and resampling logic are well-documented in the source code (embedded help text). Smoothing and format-handling code is read from source. Confidence is **high** for the core resampling and smoothing functionality.

> [!gap] Smoothing behaviour with --cortex
> The documentation notes this will eventually become the default behaviour. It is unclear whether in FreeSurfer 8.2.0 `--cortex` is still opt-in or has become the default.

> [!gap] --reg flag for coordinate mapping
> The `--reg` flag (accepting `.dat` or `.lta`) for coordinate mapping to functional space is mentioned in the help text but its interaction with `--sval-xyz` and `--tval-xyz` is complex. Needs testing.
