---
title: "mri_vol2surf"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_vol2surf/mri_vol2surf.cpp"
  - "utils/resample.cpp"
  - "utils/mri2.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_surf2vol]]"
  - "[[mris_preproc]]"
  - "[[mri_label2vol]]"
  - "[[surface-representations]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
  - "[[curv-format]]"
  - "[[registration-overview]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "--projopt SVD-based partial volume estimation not fully traced"
  - "surf2surf_nnfr() spherical resampling algorithm for --trgsubject not traced"
tags:
  - projection
  - surface
  - volume
  - resampling
  - group-analysis
---

# mri_vol2surf

## Summary

`mri_vol2surf` resamples a volumetric data set onto the vertices of a
FreeSurfer surface, producing a per-vertex overlay. Optionally, it projects a
short distance along the surface normal (controlled by `--projfrac` or
`--projdist`) to sample within the cortical ribbon rather than exactly on the
surface. It can also resample data directly onto a different subject's surface
via spherical registration (`--trgsubject`). This is the primary tool for
bringing volume-space data (fMRI, PET, VBM, etc.) into surface space for
cortical analysis. It replaces the legacy `paint` program.

## Source Information

- **Language:** C++
- **Primary source:** `mri_vol2surf/mri_vol2surf.cpp` (2473 lines, author: Doug Greve)
- **Core resampling library:** `utils/resample.cpp` (projection and interpolation)
- **VSM-aware path:** `utils/mri2.cpp` (B0-corrected resampling, `MRIvol2surfVSM()`)
- **Binary location:** `$FREESURFER_HOME/bin/mri_vol2surf`

## Purpose and Context

`mri_vol2surf` sits at the boundary between volume-space and surface-space
analyses. It is called:

- By `mris_preproc` (for volume-input group analysis) — wraps `mri_vol2surf`
  before `mri_surf2surf` resampling
- Directly in functional MRI analysis pipelines to project activation maps onto
  cortical surfaces for visualisation and group analysis

Not called by [[recon-all]].

## Inputs

### Required Inputs

- `--mov <vol>` — source volume (any format; typically [[mgz]] or NIfTI)
- `--hemi lh|rh` — hemisphere
- One of: `--reg <regfile>`, `--regheader <subject>`, or `--mni152reg`

### Optional Inputs

- `--surf <name>` — surface to sample onto (default: `white`)
- Projection flags (`--projfrac`, `--projdist`, …) — see below
- `--trgsubject <subj>` — resample to this subject's surface instead

### Input Assumptions

> [!assumption] Registration file convention
> The registration file (`register.dat` or LTA) maps from the source volume's
> space to the anatomical (subject) space. When an LTA file is provided, the
> code auto-detects the direction and inverts if needed — but the source volume
> must appear in the LTA's volume geometry.

> [!assumption] Surface coordinates are in Surface RAS
> Vertex coordinates on `?h.white` (and all FreeSurfer surfaces) are in
> **Surface RAS** (tkregister RAS). The projection and sampling code always
> works in Surface RAS internally; see [[coordinate-systems]].

## Outputs

### Files Created

- `--o <outfile>` — per-vertex overlay in [[curv-format]] or as a
  [[mgz]] file with dimensions `Nvertices × 1 × 1 × Nframes`. The geometry
  header is semantically meaningless (inherited from the source volume).

### Output Specifications

Output is a single file with `Nvertices` values per frame, one frame per input
volume frame. With `--reshape`, the 1×1×Nv layout is reshaped to `(Nv/R) × 1
× R` for ANALYZE/NIfTI compatibility (R is a prime reshape factor, default
nearest prime to 6). With `--reshape3d` (ico7 [[fsaverage]] only): `42 × 47 × 83`.

## Mathematical Foundations

### Coordinate Transform Chain

The fundamental operation: given a surface vertex at position $\mathbf{x}$
(Surface RAS), find the corresponding voxel $(c, r, s)$ in the source volume.

Let:
- $\mathbf{T}_\text{vol}$ = `MRIxfmCRS2XYZtkreg(SrcVol)` — the tkReg vox2ras of the source volume
- $\mathbf{R}$ = registration matrix (maps surface/anatomy tkRAS → source volume tkRAS)

Then:
$$
\mathbf{M}_{\text{surf}\to\text{vox}} = \mathbf{T}_\text{vol}^{-1} \cdot \mathbf{R}
$$

Voxel position: $(c, r, s)^T = \mathbf{M}_{\text{surf}\to\text{vox}} \cdot (\mathbf{x}, 1)^T$

This is computed in `vol2surf_linear()` (`utils/resample.cpp`) for the "old" path and in `MRIvol2surfVSM()` (`utils/mri2.cpp`) for the "new" (VSM-aware) path.

### Projection Along Surface Normal

When `--projfrac frac` is specified (`ProjDistFlag = 0`):

$$
\mathbf{x}' = \mathbf{x} + (f \cdot \tau_v) \cdot \hat{n}_v
$$

where $\mathbf{x}$ is the white surface vertex position, $\tau_v$ is the
cortical thickness at vertex $v$ (loaded from `?h.thickness`), $\hat{n}_v$ is
the surface unit normal, and $f$ is the projection fraction.

- $f = 0$: sample at white surface
- $f = 0.5$: sample halfway through cortex (mid-cortex)
- $f = 1.0$: sample at pial surface
- $f < 0$: sample into white matter

When `--projdist dist` is specified (`ProjDistFlag = 1`):
$$
\mathbf{x}' = \mathbf{x} + d \cdot \hat{n}_v
$$
A fixed distance $d$ in mm regardless of thickness. Does not require
`?h.thickness` to be loaded.

### Averaging / Maximum Along Normal

`--projfrac-avg min max delta`: samples at all fractions $f \in [\text{min}, \text{max}]$
step $\delta$, computes the **mean** across samples:
$$
v_\text{out} = \frac{1}{N} \sum_k v(\mathbf{x} + f_k \tau_v \hat{n}_v)
$$

`--projfrac-max min max delta`: same sampling but takes the **element-wise
maximum** across samples:
$$
v_\text{out} = \max_k\, v(\mathbf{x} + f_k \tau_v \hat{n}_v)
$$

Useful for detecting peak activation within the cortical depth.

### Interpolation

| Method | Code | Description |
|--------|------|-------------|
| `nearest` | 0 | Integer CRS lookup; default |
| `trilinear` | 1 | Trilinear interpolation via `MRIsampleSeqVolume()` |
| `sinc` | 4 | Sinc interpolation, 5-sample window |
| `cubic` | 5 | Cubic B-spline; **new path only** (`--use-new`) |

The float→int conversion for nearest-neighbour (`--float2int`):
- `round` — `nint()`, default
- `floor` — `(int)floor()`
- `tkreg` — legacy tkregister: `floor(col), ceil(row), floor(slc)`

## Configuration Options

### Complete Flag Reference

#### Input / Registration

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--mov` / `--srcvol` / `--src` | `vol` (string) | Source volume path. **Required.** |
| `--src_type` / `--srcvol_type` / `--srcfmt` | `fmt` (string) | Source format (auto-detected if omitted) |
| `--reg` / `--srcreg` | `regfile` (string) | Registration file (`register.dat` or `.lta`) mapping source volume → anatomical space |
| `--regheader` | `subject` (string) | Build registration from header geometry of source volume vs. `$SUBJECTS_DIR/<subject>/mri/<ref>` |
| `--mni152reg` | — | Use `$FREESURFER_HOME/average/mni152.register.dat`; expects source already in MNI152 space |
| `--srcsubject` | `subject` (string) | Override subject embedded in registration file (`srcsubjectuse`) |
| `--ref` | `vol` (string) | Reference volume name used with `--regheader` (default: `orig.mgz`) |
| `--vg-thresh` | `thresh` (float) | Volume-geometry equality threshold for LTA concatenation checks (default: implementation-defined, ~1e-3) |
| `--fixtkreg` | — | Adjust tkregister matrix so float→int rounding is round-compatible (default: off) |
| `--nofixtkreg` | — | Disable the above (default state) |
| `--float2int` | `round\|floor\|tkreg` (string) | Float-to-int conversion method (default: `round`) |
| `--rot` | `Ax Ay Az` (3 floats) | Additional rotation in degrees applied to the registration matrix |
| `--trans` | `Tx Ty Tz` (3 floats) | Additional translation in mm applied to the registration matrix |
| `--srcoldreg` | — | Use legacy source registration handling flag (sets `srcoldreg=1`); largely vestigial |
| `--srcwarp` | `warp` (string) | Apply a warp file to the source volume (legacy/optional) |

#### Surface Selection

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--hemi` | `lh\|rh` (string) | Hemisphere. **Required.** |
| `--surf` | `surfname` (string) | Surface to sample (default: `white`). Hard-errors if user passes `inflated` here. |
| `--inflated` | — | Convenience flag that sets `surfname = inflated` (bypasses the `--surf inflated` block). |
| `--trgsubject` | `subject` (string) | Resample output to this subject's surface via spherical registration |
| `--srcsubject` | `subject` (string) | Override source subject (also listed under registration) |
| `--icoorder` | `order` (int) | Icosahedron order when `--trgsubject ico` (default: -1, set automatically) |
| `--surfreg` | `name` (string) | Spherical registration surface used for cross-subject mapping (default: `sphere.reg`) |
| `--mapmethod` | `nnfr\|nnf` (string) | Surface-to-surface map method: nearest-neighbour forward+reverse (default `nnfr`) or forward only (`nnf`) |
| `--usehash` / `--hash` | — | Use vertex hash table for surface lookups (default: on) |
| `--dontusehash` / `--nohash` | — | Disable vertex hash table |

#### Projection Along Normal

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--projfrac` | `frac` (float) | Project a fraction of cortical thickness along surface normal (default: `0`); requires `?h.thickness` if non-zero |
| `--projfrac-avg` / `--projfrac-int` | `min max delta` (3 floats) | Sample at fractions in `[min,max]` step `delta`; output is the **mean** |
| `--projfrac-max` | `min max delta` (3 floats) | Same sampling; output is the per-vertex **maximum**. Sets `GetProjMax=1` |
| `--projdist` | `mm` (float) | Project a fixed distance (mm) along the normal; sets `ProjDistFlag=1`; does NOT require thickness |
| `--projdist-avg` / `--projdist-int` | `min max delta` (3 floats) | Average over fixed distances |
| `--projdist-max` | `min max delta` (3 floats) | Maximum over fixed distances |
| `--projopt` | `volfracstem` (string) | Optimal linear (SVD) estimation using pre-computed volume fractions (see `mri_compute_volume_fractions`); sets `ProjOpt=1` |
| `--thickness` | `name` (string) | Thickness file basename in `surf/` (default: `thickness`) |
| `--cortex` | — | Mask output with `?h.cortex.label` of the (target) subject |
| `--mask` | `labelfile` (string) | Mask output with the given label file |

#### Interpolation

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--interp` | `nearest\|trilinear` (string) | Interpolation method (default: `nearest`). The parser only accepts these two strings; the new path additionally supports `cubic` via numeric code in `--vol2surf`. |
| `--float2int` | `round\|floor\|tkreg` (string) | Float-to-int rounding policy used in nearest-neighbour mode (default: `round`) |

#### Output

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--o` / `--out` | `file` (string) | Output file path. **Required.** |
| `--out_type` / `--ofmt` | `fmt` (string) | Output format (auto-detected from extension if omitted) |
| `--frame` | `n` (int) | Save only the n-th frame, 0-based (default: -1, all frames) |
| `--reshape` | — | Enable reshape to `(Nv/R) × 1 × R` for ANALYZE/NIfTI compatibility |
| `--rf` | `R` (int) | Explicit reshape factor; also enables reshape |
| `--rft` | `T` (int) | Reshape "target" (slice count target, default 20); also enables reshape |
| `--reshape3d` | — | Reshape to 42×47×83 (fsaverage ico7 only); forces `reshape=0` |
| `--noreshape` / `--no-reshape` | — | Disable reshape (default) |
| `--scale` | `s` (float) | Multiply all output values by scalar (must be non-zero) |
| `--copy-ctab` | — | Set `FS_COPY_HEADER_CTAB=1` so any colour table in the source header is preserved |
| `--srchit` / `--srchitvol` | `vol` (string) | Save volume of per-voxel hit counts |
| `--srchit_type` / `--srchitvol_type` / `--srchitfmt` | `fmt` (string) | Format for the source-hit volume |
| `--srchits` | `file` (string) | Text file: number of source voxels intersecting the surface |
| `--trghits` | `file` (string) | Text file: number of target vertices receiving a value |
| `--nvox` | `file` (string) | Write number of voxels intersecting the surface to a text file |
| `--fwhm` | `mm` (float) | 3-D Gaussian smoothing FWHM applied to source volume before sampling (default: 0) |
| `--surf-fwhm` | `mm` (float) | Surface-domain smoothing FWHM applied after sampling (default: 0) |

#### B0 Voxel-Shift Map

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--vsm` | `vsmvol [pedir]` (string [, int]) | Voxel-shift map for B0 unwarping; sets `UseOld=0`. Optional second arg sets `pedir`. |
| `--vsm-pedir` | `pedir` (int) | Phase-encode direction: `±1=±x`, `±2=±y`, `±3=±z` (default: `+2`) |
| `--vsm-reg` | `lta` (string) | LTA registration between the VSM and the source volume |

#### Debug / misc

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--use-new` | — | Force the new resampling path (`MRIvol2surfVSM`); required for `--vsm` and `cubic` interpolation. Default: old path (`UseOld=1`). |
| `--srcsynth` | `seed` (long) | Synthesize a random source volume with given seed (testing) |
| `--srcsynth-index` | — | Synthesize a source volume containing voxel indices; forces `--interp nearest` |
| `--seedfile` | `file` (string) | Save the synthesis random seed to file |
| `--sd` | `dir` (string) | Override `$SUBJECTS_DIR` |
| `--default_type` | `fmt` (string) | Default volume type for unspecified I/O |
| `--v` | `vno` (int) | Set debug vertex number (`Gdiag_no`) |
| `--debug` | — | Enable debug output |
| `--version` | — | Print version and exit |
| `--help` | — | Print help and exit |

#### Stand-alone sub-commands

These options take over `main()` and exit before normal vol2surf processing:

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--vol2surf` | `vol surf projtype projdist projmap reg vsm interp output` (9 args) | Stand-alone vol2surf that does not need the recon-all directory layout. `projtype 0=absdist, 1=frac`; `interp 0=nearest, 1=trilin, 5=cubicbspline`; `reg` may be `regheader`; `vsm` may be `novsm`. |
| `--profile` | `surf vol dist delta sigma interpname output` (7 args) | Compute intensity profile from `-dist` to `+dist` with step `delta`; if `delta<=0`, uses `xsize/2`; `sigma>=0` enables smoothed gradient |
| `--norm-pointset` | `surf vtxno dist delta output` (5 args) | Create a freeview pointset along the normal at a given vertex |
| `--v2slabel` | `seg surf din dout delta distmap output profile` (8 args) | Stand-alone label propagation along the normal; `distmap` and `profile` may be `ignore` |
| `--closest-vertex` | `x y z coords ltafile surf outfile` (7 args) | Stand-alone closest-vertex query; `coords 1=scanner, 2=tkreg`; `ltafile` may be `nofile` |

### Configuration Interactions

> [!gotcha] Default interpolation is `nearest`, not `trilinear`
> For functional (smooth) data, `nearest` produces blocky results. Use
> `--interp trilinear` for fMRI, PET, or any continuous-valued source volume.

> [!gotcha] `--projfrac` requires `?h.thickness`
> Fractional projection loads cortical thickness from
> `$SUBJECTS_DIR/$subject/surf/?h.thickness`. If this file is absent, the
> program exits. `--projdist` does not have this requirement.

> [!gotcha] `--projfrac-max` / `--projdist-max` `delta > max` warning without exit
> When `ProjFracDelta > ProjFracMax` (e.g., `--projfrac-max 0 1 2`), the code
> emits an INFO warning but continues execution, performing only the single step
> at `ProjFracMin`. The same is true for `--projdist-max`. The user may not notice.

> [!gotcha] `--inflated` vs. `--surf inflated`
> The bare flag `--inflated` silently sets `surfname = "inflated"`. The form
> `--surf inflated` is intercepted with a hard error explaining that the
> inflated surface is the wrong target. The two paths are inconsistent — the
> bare flag bypasses the safety check.

> [!gotcha] `--vsm` implies `--use-new`
> The B0 voxel-shift map is only supported on the new code path. Specifying
> `--vsm` without `--use-new` silently uses `--use-new` anyway. Specifying
> `--vsm` with `--interp cubic` requires `--use-new` explicitly.

> [!gotcha] `--reshape3d` and `--reshape` are mutually exclusive
> `--reshape3d` forces `reshape = 0` internally after setting its own reshape
> mode. Specifying both produces `--reshape3d` behaviour.

> [!gotcha] Output file geometry is meaningless
> The output overlay file inherits its volume header from the source volume,
> not from the surface. Any spatial interpretation of the output geometry is
> incorrect. Downstream tools must know they are reading a surface overlay.

> [!gotcha] `--float2int tkreg` is a legacy concern
> The `tkreg` float2int mode (floor/ceil/floor) reflects an asymmetry in the
> original tkregister software. Modern register.dat files embed the correct
> float2int method. LTA files bypass this entirely.

> [!gotcha] LTA direction auto-detection
> When an LTA is provided, the code tries `LTAmriIsTarget()` and
> `LTAmriIsSource()` to determine whether to invert the transform. If neither
> matches (e.g., the LTA has no embedded geometry), the code may apply the
> transform in the wrong direction without error.

## Typical Use Cases

### Project fMRI activation to surface

```bash
mri_vol2surf \
  --mov stat.mgz \
  --reg register.dat \
  --hemi lh \
  --projfrac 0.5 \
  --interp trilinear \
  --o lh.stat.mgh
```

### Sample at white surface with nearest-neighbour (label propagation)

```bash
mri_vol2surf \
  --mov aseg.mgz \
  --regheader bert \
  --hemi lh \
  --projfrac 0 \
  --interp nearest \
  --o lh.aseg_on_surf.mgh
```

### Take maximum across cortical depth (fMRI peak activation)

```bash
mri_vol2surf \
  --mov stat.mgz \
  --reg register.dat \
  --hemi lh \
  --projfrac-max 0 1 0.1 \
  --interp trilinear \
  --o lh.stat_max.mgh
```

### Project to fsaverage space directly

```bash
mri_vol2surf \
  --mov stat.mgz \
  --reg register.dat \
  --hemi lh \
  --projfrac 0.5 \
  --interp trilinear \
  --trgsubject fsaverage \
  --o lh.stat.fsaverage.mgh
```

## Pipeline Context

Not called by [[recon-all]]. Called by [[mris_preproc]] for volume-input group
analysis. Also called directly in fMRI analysis pipelines.

**Predecessor:** volume-space analysis → **This tool** → **Successor:** [[mris_preproc]] / [[mri_surf2vol]]

## Gotchas and Caveats

> [!gotcha] Sampling on inflated surface is strongly discouraged
> `--surf inflated` raises a hard error if specified incorrectly. Sampling
> should always be performed on the `white` or `pial` surface; the inflated
> surface is for visualisation only. Use `--surf inflated` as a flag, not a
> `--surf` argument.

> [!gotcha] Thickness loaded only for `--projfrac`, not `--projdist`
> The `?h.thickness` file is loaded into vertex `.curv` fields only when
> `projfrac != 0 && ProjDistFlag == 0`. Do not pass `--projfrac 0` if the
> thickness file is absent — use `--projdist 0` instead.

> [!gotcha] `--cortex` and `--mask` interactions not enforced
> The code only checks for `--mask-to-label` vs. `--cortex` conflicts in
> `mri_surf2vol`. In `mri_vol2surf`, specifying both `--cortex` and `--mask`
> is not explicitly blocked but produces undefined masking behaviour.

## Related Tools

- [[mri_surf2vol]] — inverse: back-project surface values to a volume
- [[mris_preproc]] — group-level surface preprocessing; calls `mri_vol2surf`
  for volume inputs
- [[mri_label2vol]] — convert a surface label to a volume binary mask
- [[surface-representations]] — describes the white, pial, inflated surfaces
- [[coordinate-systems]] — the Surface RAS coordinate system used internally

## Confidence and Gaps

High confidence on core algorithm, all flag handling, and coordinate transform
chain — derived from the full source and `MRIvol2surfVSM()` in `utils/mri2.cpp`.

> [!gap] `--projopt` SVD-based partial volume estimation
> The `--projopt` flag triggers `build_sample_array()` which uses SVD to compute
> a partial-volume-fraction weighted estimate from the volume. This algorithm
> (lines 2262–2471 of `mri_vol2surf.cpp`) is not fully documented here.

> [!gap] `surf2surf_nnfr()` spherical resampling for `--trgsubject`
> When `--trgsubject` differs from the source subject, nearest-neighbour
> forward-reverse mapping on `?h.sphere.reg` is used. The `surf2surf_nnfr()`
> function is not traced beyond its entry point.
