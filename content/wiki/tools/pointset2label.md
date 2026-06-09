---
title: "pointset2label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "pointset2label/pointset2label.cpp"
  - "pointset2label/Spline.h"
families: []
recon_all_stage: null
related:
  - "[[label-format]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
  - "[[mri_label2vol]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "set_voxel_value writes through the integer voxel macro (MRIIseq_vox) for MRI_FLOAT/MRI_SHORT/MRI_USHRT/MRI_LONG targets; the practical effect on a float-typed output volume is described from the macro semantics but not empirically tested."
  - "No bounds checking on the rasterised voxel indices is present in the source; whether out-of-FOV waypoints crash or silently corrupt memory was reasoned from the code, not reproduced."
tags:
  - label
  - pointset
  - waypoint
  - spline
  - volume
  - coordinates
---

# pointset2label

## Summary

`pointset2label` rasterises a **pointset / waypoint file** (a FreeSurfer
[[label-format|label]] used as an ordered list of control points) into a
**volume label**. It fits a smooth cubic spline through the waypoints,
samples the curve densely, converts each sample from scanner-RAS world
coordinates to voxel coordinates of a reference volume, and stamps a chosen
integer label value into those voxels — producing a 1-voxel-wide "wire" that
traces the path through the supplied control points. It is the engine behind
[[wiki/tools/freeview|freeview]]'s "create label/voxel path from a waypoint
pointset" operation: you click a handful of waypoints along a structure and
get a connected voxel trace between them.

## Source Information

- **Language:** C++
- **Source files:** [`pointset2label/pointset2label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp), [`pointset2label/Spline.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h)
- **Binary/script location:** `$FREESURFER_HOME/bin/pointset2label`
- **Key library calls:** [`MRIread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L69) / [`MRIreadHeader`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L53), [`LabelRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L72), [`LabelToScannerRAS`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L93), [`MRIworldToVoxel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L113), [`MRIwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L121), and the local `Spline` class.

## Purpose and Context

A "pointset" in FreeSurfer is a sparse, ordered set of 3D points stored in
the [[label-format|label]] container — typically a handful of way-points a
user clicked in [[wiki/tools/freeview|freeview]] to trace a path (a tract
spine, a vessel, a sulcal fundus, an editing guide). `pointset2label`
converts that sparse path into a **dense, connected voxel labelling**: it
interpolates a smooth curve through the way-points and burns the curve into a
volume as a segmentation label, so the path becomes editable/visualisable as
voxels and usable by downstream volume tools.

The key value-adds over a naïve "connect the dots" are (a) a **cubic spline**
interpolation so the trace is smooth rather than piecewise-linear, (b)
sampling the curve at the voxel scale so the result is a **gap-free**
1-voxel-wide line, and (c) a mid-point fill that closes any remaining
diagonal gaps between consecutive samples.

It is invoked by [[wiki/tools/freeview|freeview]] (and can be run from the
command line); it is **not** part of
[[wiki/pipelines/recon-all|recon-all]] and appears in no distributed script
(verified by a tree-wide search of `$FREESURFER_SOURCE/scripts`).

## Inputs

`pointset2label` uses **four required positional arguments** plus one
optional flag ([`pointset2label/pointset2label.cpp:34-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L34-L40)):

```
pointset2label <waypoint file> <input volume file> <label value> <output volume label file> [-clear]
```

### Required Inputs

| Position | Argument | What it is |
|----------|----------|------------|
| 1 | `<waypoint file>` | A pointset in [[label-format|label]] format: an ordered list of ≥ 2 control points. Read with `LabelRead(NULL, …)`; must contain at least 2 points or the tool aborts ([`pointset2label/pointset2label.cpp:78-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L78-L82)). |
| 2 | `<input volume file>` | The reference volume ([[mgz]] or any MRI format) that defines the output geometry (dimensions, voxel size, and the world↔voxel transform). With `-clear` only its **header** is read; without, the full volume is read and written through. |
| 3 | `<label value>` | A **positive integer** to stamp into the traced voxels (`atoi`; must be > 0 or the tool aborts, [`pointset2label/pointset2label.cpp:84-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L84-L89)). |
| 4 | `<output volume label file>` | Output volume path. May equal the input path, in which case the input is **overwritten**. |

### Input Assumptions

- **At least two waypoints.** A spline needs ≥ 2 control points; fewer is a
  hard error.
- **Waypoint coordinate space is handled automatically.** If the label's
  `coords` is not already `LABEL_COORDS_SCANNER_RAS`, the tool converts it to
  scanner RAS with `LabelToScannerRAS(label, mri, label)` and prints a notice
  ([`pointset2label/pointset2label.cpp:91-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L91-L95)). The reference volume
  supplies the surface-RAS→scanner-RAS transform used for that conversion.
  See [[label-format]] for how the `vox2ras=` token sets `coords`.

> [!assumption] Waypoints and the reference volume must share scanner-RAS space
> The spline is built and sampled in **scanner RAS** (physical mm), then
> mapped into the reference volume with `MRIworldToVoxel`
> ([`pointset2label/pointset2label.cpp:113-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L113-L114)). The reference
> volume therefore defines what "world" means: way-points must correspond to
> the same subject/scanner space as that volume, or the trace lands in the
> wrong voxels.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<output volume label file>` | [[mgz]] / any MRI format inferred from the extension | A volume whose voxels along the splined path hold `<label value>`. With `-clear`, an otherwise-empty `MRI_INT` volume with the reference geometry; without `-clear`, a copy of the input volume with the trace painted in. |

### Output Specifications

- **With `-clear`:** the output is a freshly allocated single-frame
  **`MRI_INT`** volume with the same `width/height/depth` and header as the
  reference ([`pointset2label/pointset2label.cpp:60-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L60-L65)) — i.e. a clean
  segmentation containing only the path.
- **Without `-clear`:** the full input volume is loaded and the path is
  written *into it*, preserving its data type and existing voxel values
  ([`pointset2label/pointset2label.cpp:67-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L67-L70)).

The painted line is **1 voxel wide** (no thickness control) and runs in voxel
CRS along the splined path. See [[coordinate-systems]] for the world↔voxel
relationship.

> [!gotcha] Output data type depends on `-clear`, and float/short targets are written through an integer macro
> `set_voxel_value` ([`pointset2label/pointset2label.cpp:6-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L6-L30))
> only uses the correct byte width for `MRI_UCHAR`; for `MRI_INT`, `MRI_LONG`,
> `MRI_FLOAT`, `MRI_SHORT`, and `MRI_USHRT` it writes via the **integer**
> voxel accessor `MRIIseq_vox` (and casts the value to `(int)`). With `-clear`
> the volume is `MRI_INT`, so this is exactly right. But if you paint into an
> existing **float** volume (no `-clear`), the value is deposited through the
> int macro rather than `MRIFseq_vox`; the written bytes will not be a valid
> IEEE float at that voxel. Prefer `-clear`, or an integer-typed reference
> volume, to get a clean label.

## Mathematical Foundations

The path is a **Kochanek–Bartels-style cubic spline** (the `Spline` /
`Curve` classes in [`pointset2label/Spline.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h)),
sampled at the voxel scale and rasterised.

**1. Spline construction.** Given $N$ waypoints $P_0,\dots,P_{N-1}$ in
scanner RAS, the open-curve generator
([`Spline::Generate`, `pointset2label/Spline.h:235-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L235-L294))
forms chord vectors $A_i = P_{i+1}-P_i$ and chord-length ratios
$k_i = \lVert A_{i-1}\rVert / \lVert A_i\rVert$, then solves a tridiagonal
system (Gauss–Seidel-style iteration in
[`Spline::MatrixSolve`, `pointset2label/Spline.h:296-328`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L296-L328)) for the
tangent/curvature coefficients $B_i$, with $C_i = k_i B_{i+1}$. Each segment
is the Hermite-form cubic
$$ P(t) = P_i + A_i\,f(t) + B_i\,g(t) + C_i\,h(t), \quad t\in[0,1], $$
with blending functions
$$ f(t) = t^2(3-2t), \qquad g(t) = t(t-1)^2, \qquad h(t) = t^2(t-1) $$
([`Curve::GetCurve`, `pointset2label/Spline.h:132-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L132-L162)). Note
$f(0)=0,\,f(1)=1$, so the curve interpolates the way-points and is
$C^1$-continuous across segments.

**2. Sampling density.** Each segment is subdivided into
$N_{\text{div}} = \lfloor \max(|A_x|,|A_y|,|A_z|) / \Delta \rfloor$ steps
([`Curve::PutCurve`, `pointset2label/Spline.h:99-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L99-L117)), where the
step length $\Delta$ is the **smallest voxel dimension** of the reference
volume,
$$ \Delta = \min(\texttt{xsize}, \texttt{ysize}, \texttt{zsize}) $$
([`pointset2label/pointset2label.cpp:105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L105)). Sampling at the
sub-voxel scale guarantees consecutive samples are at most ~1 voxel apart.

**3. Rasterisation with gap-fill.** For each consecutive pair of samples the
world coordinates are mapped to voxel coordinates by `MRIworldToVoxel`, both
endpoints are stamped with the label value, and if the two endpoints differ
by more than one voxel in any axis, the **mid-point** is also stamped
([`pointset2label/pointset2label.cpp:111-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L111-L119)):
$$ |\lfloor x_0 \rceil - \lfloor x_1 \rceil| > 1 \;\lor\; (\text{same for } y,z)
   \;\Rightarrow\; \text{stamp } \big(\tfrac{x_0+x_1}{2}, \tfrac{y_0+y_1}{2}, \tfrac{z_0+z_1}{2}\big). $$
Voxel indices are obtained by rounding (`rint`) in `set_voxel_value`.

> [!math] Why the spacing is the *minimum* voxel size
> Using the smallest voxel dimension as the sampling step ensures the curve is
> oversampled along its longest axis even for anisotropic volumes, so the
> rasterised line stays connected (6-/18-connected) without the mid-point
> fill having to do much work. Anisotropic volumes are handled correctly
> because the world→voxel mapping accounts for per-axis spacing.

> [!internal] Spline solver is header-only and local to this tool
> The `Spline`/`Curve` classes live entirely in
> [`pointset2label/Spline.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h)
> (an adapted CSpline implementation). The tridiagonal solve is a fixed
> 10-iteration Gauss–Seidel sweep with a header comment noting "need
> convergence judge" — i.e. there is **no** convergence test; 10 iterations is
> hard-coded ([`pointset2label/Spline.h:307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L307)).

## Configuration Options

`pointset2label` has **no flag parser** — it reads fixed positional
arguments. The only optional token is `-clear` in position 5.

| Token | Position | Type | Default | Description |
|-------|----------|------|---------|-------------|
| `<waypoint file>` | 1 | path | *(required)* | Ordered pointset in label format (≥ 2 points). |
| `<input volume file>` | 2 | path | *(required)* | Reference geometry volume; header-only with `-clear`, fully read otherwise. |
| `<label value>` | 3 | int > 0 | *(required)* | Integer value stamped into the traced voxels. |
| `<output volume label file>` | 4 | path | *(required)* | Output volume; may equal input (overwrite). |
| `-clear` | 5 | bool | *(off)* | Start from an **empty** `MRI_INT` volume with the reference header instead of painting into the input volume ([`pointset2label/pointset2label.cpp:44-66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L44-L66)). Matched case-insensitively (`strcasecmp`). |

> [!gotcha] Fewer than 5 arguments prints usage and returns −1
> With fewer than 5 args the tool prints its usage/example and exits with
> status −1 ([`pointset2label/pointset2label.cpp:34-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L34-L40)); there is no
> `--help`/`-u` handling, and the same usage text is what you see for any
> argument error.

### Configuration Interactions

The only interaction is `-clear` vs. paint-into-input:

- **`-clear` present:** output type is forced to `MRI_INT`; the input
  volume's voxel data is ignored (only its header/geometry is used). This is
  the recommended mode for producing a clean label.
- **`-clear` absent:** the path is painted on top of the existing volume,
  preserving its values and data type — useful for adding the trace to an
  existing segmentation, but subject to the float/short integer-macro caveat
  above. If `<output>` equals `<input>`, the source file is overwritten.

## Typical Use Cases

### Use Case 1: Trace a path into a clean label volume

```bash
# wp.label holds way-points clicked in freeview; T1.mgz defines geometry.
pointset2label wp.label T1.mgz 3 path_label.mgz -clear
# → path_label.mgz: an MRI_INT volume, value 3 along the splined path, 0 elsewhere.
```

This matches the built-in example in the usage text.

### Use Case 2: Add a trace into an existing segmentation

```bash
# Burn the path (value 5) into an existing integer segmentation, in place.
pointset2label wp.label aseg.mgz 5 aseg.mgz
```

(Use an **integer-typed** volume here; see the float-macro gotcha.)

### Use Case 3: From freeview

Click an ordered set of waypoints to create a pointset, then use freeview's
"pointset → label" action; freeview shells out to `pointset2label` with the
loaded reference volume, a label value, and `-clear` to generate the voxel
path.

## Pipeline Context

`pointset2label` is an interactive volume-editing/annotation helper driven
chiefly by [[wiki/tools/freeview|freeview]]. It is not a recon-all stage and
is called by no distributed pipeline script.

**Predecessor:** way-point picking in
[[wiki/tools/freeview|freeview]] (or any tool that writes a pointset in label
format) → **This tool** → **Successor:** the resulting volume label can be
viewed/edited in [[wiki/tools/freeview|freeview]], or fed to volume tools
(e.g. [[mri_label2vol]]-style workflows, masking, or ROI statistics).

It is conceptually adjacent to [[mri_label2vol]] (which maps a **surface or
sparse** label into a volume) but solves a different problem: turning an
**ordered waypoint path** into a connected splined voxel trace.

## Gotchas and Caveats

> [!gotcha] No bounds checking on rasterised voxels
> `set_voxel_value` rounds the spline samples to integer CRS and writes
> directly, with no check that the indices fall inside the volume
> ([`pointset2label/pointset2label.cpp:6-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L6-L30)). Way-points outside the
> reference volume's field of view will index out of bounds. Keep all
> way-points within the reference volume.

> [!gotcha] The trace is exactly 1 voxel wide
> There is no thickness/radius option; the output is a thin wire. To get a
> tube you must dilate the result afterwards with a separate tool.

> [!gotcha] Open spline, not closed
> The active code path uses the **open** spline (`Generate`/`MatrixSolve`),
> so the path runs from the first way-point to the last and is **not** closed
> back to the start, even though a closed-spline implementation
> (`GenClosed`) exists in the header but is unused
> ([`pointset2label/Spline.h:394-453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h#L394-L453)).

> [!gotcha] `MRIworldToVoxel` is misspelled in the typo'd error message only
> A failed write prints "Failed to write voluem" (sic)
> ([`pointset2label/pointset2label.cpp:123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L123)) — cosmetic, but
> useful to know when grepping logs.

## Error Compensation and Guard Rails

- **Automatic coordinate conversion.** Way-points not already in scanner RAS
  are converted on the fly via `LabelToScannerRAS`
  ([`pointset2label/pointset2label.cpp:91-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L91-L95)), so a pointset saved
  in tkreg-RAS or voxel coords is handled without user intervention (given a
  correct reference volume).
- **Gap-filling mid-point insert.** When two consecutive samples are more
  than one voxel apart on any axis, the mid-point is also stamped
  ([`pointset2label/pointset2label.cpp:117-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L117-L118)) to keep the line
  connected.
- **Input validation.** Fewer than 2 way-points, a non-positive label value,
  an unreadable pointset, or an unreadable reference header each abort with a
  message ([`pointset2label/pointset2label.cpp:53-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L53-L89)).
- **No FOV guard rail.** As noted above, voxel indices are *not* range-checked
  — this is the one place the tool does **not** protect against bad input.

## Known Bugs

- [[00159]] — the voxel-writing helper uses the integer macro `MRIIseq_vox` for float/short/ushort/long output volumes, depositing invalid bytes; sampled spline points are also written with no FOV bounds check.

## Related Tools

- [[mri_label2vol]] — maps a surface/sparse label into a volume; the
  volumetric-labelling tool you would reach for when the input is a region
  label rather than an ordered path.
- [[label-format]] — the container format shared by labels and pointsets;
  explains the `coords`/`vox2ras=` semantics this tool relies on.
- [[wiki/tools/freeview|freeview]] — the GUI that creates the way-point
  pointsets and invokes `pointset2label`.
- [[mgz]] — the usual reference/output volume format.
- [[coordinate-systems]] — the scanner-RAS ↔ voxel relationship at the heart
  of the rasterisation.

## Confidence and Gaps

**High confidence:** the four positional arguments, the `-clear` semantics,
the ≥ 2-waypoint and positive-value checks, the scanner-RAS conversion, the
cubic-spline construction and its blending functions, the min-voxel-size
sampling step, and the mid-point gap fill are all read directly from
[`pointset2label/pointset2label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp)
and [`pointset2label/Spline.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h),
and corroborated by the binary's usage output.

> [!gap] Float/short paint-through behaviour
> The integer-macro write for non-`MRI_INT` targets
> ([`pointset2label/pointset2label.cpp:6-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp#L6-L30)) is clear from the
> macro definitions, but its concrete effect on a float-typed output (and
> whether any caller relies on `-clear` to avoid it) was not empirically
> tested. This looks like a latent defect; treat non-`MRI_INT` output with
> caution and prefer `-clear`.

> [!gap] Out-of-FOV waypoints
> The absence of bounds checking is evident in the source; whether an
> out-of-volume way-point crashes or silently corrupts adjacent memory was
> reasoned about, not reproduced.

## References

- FreeSurfer source: [`pointset2label/pointset2label.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/pointset2label.cpp), [`pointset2label/Spline.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/pointset2label/Spline.h) (v8.2.0).
- Coordinate conversion: `LabelToScannerRAS` in [`utils/label.cpp:3111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/label.cpp#L3111).
