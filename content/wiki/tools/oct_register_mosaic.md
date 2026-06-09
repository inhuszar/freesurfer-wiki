---
title: "oct_register_mosaic"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "oct_register_mosaic/oct_register_mosaic.cpp"
families: []
recon_all_stage: null
related:
  - "[[histo_register_block]]"
  - "[[histo_synthesize]]"
  - "[[dissection_photo]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Two early `exit(0)` calls in main() make most of the file dead code: the program builds and writes the mosaic, then exits before the Powell translation-refinement and the energy-minimisation passes ever run. The optical-distortion (a,b,c,d) unwarping is also disabled (xu=xf;yu=yf). Documented as shipped: the live tool is a header-driven averaging mosaicker."
  - "The mosaic-list-file (usage 2) code path is guarded by `&& 0` and disabled; only the explicit tile-list form (usage 1) executes."
  - "Optical-distortion model parameters (-a..-d, optic axes) exist in the source but are not reachable from the CLI and not applied in the shipped path; their math is documented from the (compiled-but-unused) functions."
tags:
  - oct
  - optical
  - microscopy
  - mosaic
  - registration
  - stitching
---

# oct_register_mosaic

## Summary

`oct_register_mosaic` stitches a set of overlapping optical microscopy tiles
(originally optical-coherence-tomography sub-images) into a single mosaic
volume. In the form that actually executes in v8.2.0 it reads each tile, applies
optional Gaussian downsampling and voxel-size overrides, and **averages the
tiles into a common mosaic grid using each tile's own header geometry**
(voxel→RAS transforms) to place it — i.e. it relies on the scanner/stage
coordinates already stored in the tiles rather than re-estimating their
positions. It is a research tool from the FreeSurfer optical-imaging line of
work and is not part of [[wiki/pipelines/recon-all|recon-all]].

## Source Information

- **Language:** C++ (OpenMP-parallelised)
- **Source file:** [`oct_register_mosaic/oct_register_mosaic.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp)
- **Original author:** Bruce Fischl
- **Binary/script location:** `$FREESURFER_HOME/bin/oct_register_mosaic`
- **Links against:** the FreeSurfer `utils` library; uses `OpenPowell2` from
  [`utils/numerics.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp) (in the compiled-but-unreached refinement paths).

## Purpose and Context

Optical microscopy of large tissue samples is acquired as a grid of overlapping
**tiles** that must be stitched into one image. `oct_register_mosaic` was written
to do this for OCT/blockface optical data, with an ambition (visible in the
source) to also estimate and correct radial **optical distortion** and to refine
tile translations by minimising the intensity disagreement in tile overlaps.

The shipped binary, however, takes a much simpler path: two early `exit(0)`
statements in `main()` cause the program to build and write the
header-positioned, averaged mosaic and then **return before any of the
translation-refinement or distortion-correction code runs** (see the dead-code
gotcha below). The result is a robust "lay every tile down at the RAS position in
its header and average the overlaps" mosaicker. No `recon-all` stage or in-tree
script invokes it (verified by `grep` over `scripts/`). It is a sibling of the
histology tools [[histo_register_block]] and [[histo_synthesize]] and of the
dissection-photo GUI [[dissection_photo]].

## Inputs

### Required Inputs

**Usage 1 (the one that runs):** two or more tile volumes followed by the output
volume name ([`oct_register_mosaic.cpp:533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L533)):

```
oct_register_mosaic [options] <tile 1> <tile 2> ... <output volume>
```

Each tile is read with `MRIread` ([`oct_register_mosaic.cpp:187-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L187-L189)); any
FreeSurfer-readable volume works. The number of tiles is `argc-2`.

**Usage 2 (advertised but disabled):** a single mosaic list file plus an output
name. The branch that would read `"<x0> <y0> <filename>"` lines is guarded by
`if (argc == 3 && 0)` ([`oct_register_mosaic.cpp:149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L149)) and therefore never
executes; a list file passed as the only input is treated as a single tile.

### Input Assumptions

> [!assumption] Tile positions come from the headers, not from the filenames
> Placement in the live path is entirely driven by each tile's voxel→RAS matrix
> (`MRIgetVoxelToRasXform`, [`oct_register_mosaic.cpp:1295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1295)). The tiles must
> therefore already carry correct stage/scanner RAS coordinates (or correct
> `c_r/c_a/c_s` offsets) so that overlapping tiles overlap in RAS space. There is
> no feature-based or intensity-based tile registration in the executed code.

> [!assumption] All tiles share consistent voxel sizes
> The output grid spacing is taken from the first tile (`mri[0]->xsize/ysize/zsize`,
> [`oct_register_mosaic.cpp:1330-1332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1330-L1332)). Mixed resolutions are resampled
> onto that grid via vox→vox, but wildly inconsistent spacings will degrade the
> mosaic.

- `-xsize`/`-ysize`/`-zsize` let you **override** the voxel size in each tile's
  geometry before mosaicking (useful when the headers carry placeholder spacing).
- `-W <weights>` supplies a per-voxel weight tile (e.g. a confocal sensitivity
  profile) used in the averaging.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `<output volume>` (last argument) | [[mgz]] (or any `MRIwrite` format) | the stitched mosaic: tiles averaged into a common RAS-aligned grid ([`oct_register_mosaic.cpp:314-315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L314-L315)) |

In the shipped path only the final mosaic is written. (The
`-U`/distortion branch contains code to also emit a `*.orig.*` copy and
`*.powell.NN.mgz` step images, but it is downstream of an `exit(0)` and does not
run — see gotcha.)

### Output Specifications

The mosaic is a single-frame `MRI_FLOAT` volume sized to the RAS bounding box of
all tiles, with a vox→RAS transform fitted by mapping the eight RAS corners to
the eight voxel corners via a pseudo-inverse
([`mosaic_images_with_xforms`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1277-L1552), corner fit at
[`oct_register_mosaic.cpp:1337-1451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1337-L1451)). Overlapping contributions are
summed and divided by the (optionally weighted) count, so each output voxel is
the mean of the tiles covering it.

## Mathematical Foundations

### Header-driven averaging (the live algorithm)

The executed mosaic is produced by `mosaic_images_with_xforms`. For every tile
$k$ it computes the voxel→voxel map $M_k$ from tile to mosaic
(`MRIgetVoxelToVoxelXform`), and for each tile voxel $\mathbf{v}$ accumulates

$$
S(\mathbf{m}) \mathrel{+}= w_k(\mathbf{v})\, I_k(\mathbf{v}), \qquad
N(\mathbf{m}) \mathrel{+}= w_k(\mathbf{v}), \qquad
\mathbf{m} = \mathrm{round}(M_k\,\mathbf{v}),
$$

then normalises $I_{\mathrm{mosaic}}(\mathbf{m}) = S(\mathbf{m})/N(\mathbf{m})$
wherever the count $N>1$ ([`oct_register_mosaic.cpp:1499-1541`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1499-L1541)). The weight
$w_k$ is 1 unless a weight tile is given with `-W`.

### Mosaic energy and overlap variance (used only in the dead paths)

The disagreement between overlapping tiles is quantified by the per-voxel
intensity variance across tiles, summed over overlap voxels and RMS-normalised
([`compute_mosaic_energy`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L627-L692)):

$$
E = \sqrt{\frac{1}{|\mathcal{O}|}\sum_{\mathbf{m}\in\mathcal{O}}
        \frac{1}{n_\mathbf{m}}\sum_{k}\bigl(I_k(\mathbf{m})-\bar I(\mathbf{m})\bigr)^2 },
$$

where $\mathcal{O}$ is the set of voxels covered by more than one tile and
$n_\mathbf{m}$ the coverage count. The translation-refinement code minimises this
(or a pairwise version) with `OpenPowell2`, but, as noted, it is not reached in
the shipped binary.

### Radial optical-distortion model (defined, not applied)

The intended undistortion maps a pixel at radius $r$ (normalised by the
half-min-dimension $r_0$, measured from an optic axis $(a_x,a_y)$) to

$$
r' = a\,r^4 + b\,r^3 + c\,r^2 + d\,r, \qquad
(x',y') = \bigl(r'\cos\theta + a_x,\; r'\sin\theta + a_y\bigr),
$$

with $\theta=\operatorname{atan2}(y-a_y, x-a_x)$
([`undistorted_coords`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L762-L779)). The polynomial coefficients default to
$a=b=c=0,\,d=1$ (identity), and the only mosaic builder that runs has the
distortion explicitly disabled (`xu = xf; yu = yf;  //disable unwarping for now`,
[`oct_register_mosaic.cpp:1019-1020`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1019-L1020)). `NPARMS` is compiled as 2, so even the
reachable Powell helpers optimise only $(dx,dy)$ and leave $a,b,c,d$ at identity
([`oct_register_mosaic.cpp:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L57), [`:835-838`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L835-L838)).

> [!internal] Powell minimisation lives in the numerics library
> `OpenPowell2(p, xi, n, ftol, linmintol, niters, ...)` is defined in
> [`utils/numerics.cpp:1037`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp#L1037); it is the bounded-tolerance variant of Powell's
> direction-set method shared with `mri_segreg`, `mri_gtmpvc`, and `mri_sbbr`.

## Configuration Options

### Complete Flag Reference

All options are parsed in [`get_option`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L422-L525) (case-insensitive long
options; single-letter options via `toupper`).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-D <n>` | int | `0` | Gaussian-downsample every input tile `n` times with `MRIreduce` (a factor of $2^n$) before mosaicking. Reduces size/noise. |
| `-W <fname>` | string | — | Read a per-voxel **weight** tile and use it to weight each tile's contribution in the average (e.g. a confocal point-spread / sensitivity map). |
| `-S <sigma>` | float | `0.0` | Pre-blur each tile with a Gaussian of this sigma (populates the `mri_smooth` copies used by the — unreached — refinement). |
| `-xsize <mm>` | float | header | Override the x voxel size in each tile's geometry before mosaicking. |
| `-ysize <mm>` | float | header | Override the y voxel size in each tile's geometry. |
| `-zsize <mm>` | float | header | Override the z voxel size in each tile's geometry. |
| `-P <n>` | int | `0` | Pad the mosaic bounding box by `n` voxels (only consulted by the distortion/`-U` path, which does not run in the shipped binary). |
| `-N <n>` | int | `100` | Maximum Powell iterations for the refinement passes (unreached in the shipped binary). |
| `-U` | bool | off | Request optical-distortion correction + Powell tile refinement. **Sets `undistort=1`, but the corresponding `build_best_mosaic` code is after an `exit(0)` and the unwarp is hard-disabled**, so it does not change the shipped output (see gotcha). |
| `-I <n>` | int | — | Set `Gdiag_no` to debug a specific image index. |
| `-DEBUG_VOXEL <x> <y> <z>` | 3 ints | — | Set the diagnostic voxel `(Gx,Gy,Gz)`. |

> [!gotcha] No `--help`; unknown options abort
> There is no `--help`/`-version` handler in `get_option`; an unrecognised option
> falls through to `usage_exit(1)`. Run the tool with no arguments (or `-U` is
> *not* help here) to see the two-line usage. The two `-D`/`-W` lines printed by
> `usage_exit` are the only documented options.

### Configuration Interactions

> [!gotcha] The program exits before refinement — most flags are inert
> `main()` writes the header-averaged mosaic and then calls `exit(0)`
> ([`oct_register_mosaic.cpp:314-316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L314-L316)). Everything after that — the
> `insert_image_into_mosaic` loop, the Powell per-tile translation search, the
> global energy minimisation, and the second `exit(0)` at
> [`oct_register_mosaic.cpp:357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L357) — is unreachable. Consequently `-N`, `-S`,
> and the refinement aspect of `-U`/`-P` have **no effect on the output**; only
> `-D`, `-W`, and the `-*size` overrides shape the mosaic that is actually
> written.

- `-U` additionally rebuilds the mosaic with `mosaic_images` and `pad` before the
  (dead) `build_best_mosaic` call; because that whole block sits after the first
  `exit(0)`, enabling `-U` does not alter the shipped result.
- `-xsize/-ysize/-zsize` take effect *per tile* immediately after read
  ([`oct_register_mosaic.cpp:193-199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L193-L199)) and therefore change the RAS
  footprint used for placement — these are live and meaningful.
- `-D` is applied per tile before geometry is used, so downsampling changes both
  the tile size and (because `MRIreduce` updates voxel size) its RAS footprint.

## Typical Use Cases

### Use Case 1: Stitch a set of OCT tiles using their header positions

```bash
# Tiles already carry correct stage RAS coordinates in their headers.
oct_register_mosaic tile001.mgz tile002.mgz tile003.mgz tile004.mgz \
  mosaic.mgz
```

### Use Case 2: Downsample large tiles before mosaicking

```bash
# Reduce each tile twice (1/4 in each dimension) to save memory.
oct_register_mosaic -D 2 tile*.mgz mosaic_lowres.mgz
```

### Use Case 3: Weighted averaging with a confocal sensitivity map

```bash
# Weight each tile's contribution by a per-voxel sensitivity tile.
oct_register_mosaic -W confocal_weights.mgz tile*.mgz mosaic_weighted.mgz
```

### Use Case 4: Override placeholder voxel sizes

```bash
# Tiles have unit voxel size in headers; set the true 2.5 um spacing.
oct_register_mosaic -xsize 0.0025 -ysize 0.0025 -zsize 0.0025 \
  tile*.mgz mosaic.mgz
```

## Pipeline Context

`oct_register_mosaic` is a **standalone research tool**; no `recon-all` stage or
in-tree script calls it. In an optical-imaging workflow it sits after individual
tiles have been acquired and tagged with stage coordinates (and optionally
converted with [[wiki/tools/mri_convert|mri_convert]]), and before the stitched
volume is visualised or further analysed.

**Predecessor:** tiled OCT/optical acquisition with header RAS positions
(external) → **oct_register_mosaic** → **Successor:** visualisation / volumetric
analysis of the stitched mosaic (external).

## Gotchas and Caveats

> [!gotcha] Large portions of the source are dead code
> Two `exit(0)` calls ([`oct_register_mosaic.cpp:316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L316), [`:357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L357)) and an
> `&& 0` guard ([`:149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L149)) make the mosaic-list-file input, the Powell
> translation refinement, the energy-minimisation search, and the distortion
> correction unreachable. Treat this page's "live algorithm" section as the
> definitive behaviour; the elaborate refinement described in the surrounding
> code is aspirational and not exercised by the v8.2.0 binary.

> [!gotcha] Optical-distortion unwarping is hard-disabled
> Even in the (unreached) `undistort_and_mosaic_images`, the undistortion is
> overridden with `xu = xf; yu = yf;` ([`oct_register_mosaic.cpp:1019-1020`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1019-L1020)),
> and `NPARMS=2` keeps the polynomial at identity. The tool does **not** correct
> radial distortion despite the `-U` flag and the elaborate model.

> [!gotcha] Output grid/voxel size is inherited from the first tile only
> The mosaic spacing and header come from `mri[0]` ([`oct_register_mosaic.cpp:1330-1334`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1330-L1334)).
> If tile 1 is atypical (different resolution/orientation) the whole mosaic
> follows it. Order your tiles so the first is representative.

> [!gotcha] Single-threaded by default
> If `OMP_NUM_THREADS` is unset the tool forces one thread
> ([`oct_register_mosaic.cpp:124-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L124-L127)). Export `OMP_NUM_THREADS` to use the
> OpenMP parallelism in tile loading and averaging.

## Error Compensation and Guard Rails

- **Out-of-bounds tile voxels are skipped.** Voxels whose mapped mosaic index
  falls outside the mosaic are dropped (with a one-time "OOB!" diagnostic),
  rather than crashing ([`oct_register_mosaic.cpp:1485-1498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1485-L1498)).
- **Overlap averaging.** Voxels covered by multiple tiles are averaged (count- or
  weight-normalised), preventing seams from double-counting
  ([`oct_register_mosaic.cpp:1524-1541`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L1524-L1541)).
- **Voxel-size overrides** compensate for tiles whose headers carry placeholder
  spacing.
- **Missing tile/weight file is fatal.** A tile or weight volume that cannot be
  read triggers `ErrorExit` ([`oct_register_mosaic.cpp:187-189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L187-L189), [`:283-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp#L283-L285)).

## Known Bugs

- [[00157]] — registration/refinement paths are unreachable dead code: an unconditional `exit(0)` strands the per-tile Powell loop, the distortion-corrected mosaic and the energy search; the list-file input is disabled by `&& 0` and the optical-distortion unwarp is hard-disabled.

## Related Tools

- [[histo_register_block]] — registers a histology section to a block-face image;
  shares the Powell minimisation and FreeSurfer 2-D imaging machinery.
- [[histo_synthesize]] — synthesises histology appearance from MRI; same *ex
  vivo* optical/histology project.
- [[dissection_photo]] — GUI pipeline for calibrating and segmenting dissection
  photographs.
- [[wiki/tools/mri_convert|mri_convert]] — to import optical tiles into
  `MRIread`-compatible volumes (and to set/inspect their geometry).

## Confidence and Gaps

**High confidence:** the complete option set, the live header-driven averaging
algorithm, the corner-fit vox→RAS construction, overlap weighting, the voxel-size
overrides, and — critically — the fact that the program exits before its
refinement/distortion code runs, all read directly from
[`oct_register_mosaic.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp).

> [!gap] Intended vs. shipped behaviour
> The source clearly intended an iterative, distortion-correcting, Powell-refined
> mosaicker. Whether the early `exit(0)`s are a deliberate "use header positions
> only" decision or leftover debugging is not stated in the code. Document and
> use the tool as the header-averaging mosaicker it currently is; the refinement
> paths would need source changes to enable.

> [!gap] Source/format of tile RAS coordinates
> The tool depends on correct per-tile RAS geometry but does not describe how
> those coordinates are produced (microscope stage logging, a prior conversion
> step, etc.). That upstream step is out of scope here.

## References

- FreeSurfer source: [`oct_register_mosaic/oct_register_mosaic.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/oct_register_mosaic/oct_register_mosaic.cpp) (v8.2.0).
- Powell minimisation: `OpenPowell2` in [`utils/numerics.cpp:1037`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp#L1037).
- Built-in usage: `oct_register_mosaic` with no arguments (prints the two usage
  forms and the `-D`/`-W` options).
