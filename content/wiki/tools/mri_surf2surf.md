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
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
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

| Flag | Argument | Description |
|---|---|---|
| `--srcsubject` | subjectname | Source subject (or `ico`) |
| `--sval` | file | Source overlay file |
| `--sval-xyz` | surfname | Use surface coordinates as source |
| `--sval-tal-xyz` | surfname | Surface coordinates in Talairach space |
| `--sval-area` | surfname | Vertex area as source |
| `--sval-nxyz` | surfname | Surface normals as source |
| `--sval-annot` | annotfile | Source annotation file |
| `--sfmt` | typestring | Source format (curv, paint/w, or mri_convert-compatible) |
| `--srcicoorder` | order | Icosahedron order of source (needed for .w input) |
| `--trgsubject` | subjectname | Target subject (or `ico`) |
| `--trgicoorder` | order | Icosahedron order (0–7, see table) |
| `--tval` | file | Output overlay file |
| `--tval-xyz` | volume | Output binary surface with xyz from source |
| `--tfmt` | typestring | Target format |
| `--hemi` | lh or rh | Hemisphere |
| `--surfreg` | surface | Registration surface (default: sphere.reg) |
| `--mapmethod` | nnfr or nnf | Resampling method (default: nnfr) |
| `--fwhm-src` | mm | Smooth source before resampling |
| `--fwhm-trg` / `--fwhm` | mm | Smooth after resampling |
| `--nsmooth-in` | N | Smoothing iterations on input |
| `--nsmooth-out` / `--smooth` | N | Smoothing iterations on output |
| `--label-src` | labelfile | Constrain smoothing to label (source) |
| `--label-trg` | labelfile | Constrain smoothing to label (target) |
| `--cortex` | (flag) | Smooth only within cortex.label |
| `--no-cortex` | (flag) | Do not use cortex label for smoothing |
| `--frame` | N | Output frame (for paint/w; zero-based) |
| `--mul` | value | Multiply input by value |
| `--div` | value | Divide input by value |
| `--reshape` | (flag) | Save output as multi-slice (for large formats) |
| `--reshape-factor` | N | Reshape to N slices (default 6) |
| `--reshape3d` | (flag) | Reshape fsaverage ico7 to 42×47×83 |
| `--sd` | dir | Set SUBJECTS_DIR |
| `--reg` | regfile [vol] | Registration file (dat or lta) for coordinate mapping |
| `--projfrac` | surfname frac | Project along normal by fraction |
| `--projabs` | surfname dist | Project along normal by absolute distance |

## Configuration Interactions

- `--sval-annot` automatically sets `--mapmethod nnf` (to avoid averaging annotation indices).
- `--sval-xyz` / `--sval-tal-xyz` must be combined with `--tval-xyz` to produce a valid output surface file.
- `--fwhm-src` and `--nsmooth-in` are equivalent ways to specify pre-resampling smoothing; using both is not recommended.
- `--cortex` requires that `?h.cortex.label` exists in the source subject's `label/` directory (created by `recon-all`).
- `--reshape` has no effect when the output type is paint/w.
- When target is `ico`, `--trgicoorder` must be specified.

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
