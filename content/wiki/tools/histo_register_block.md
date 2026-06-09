---
title: "histo_register_block"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "histo_register_block/histo_register_block.cpp"
families: []
recon_all_stage: null
related:
  - "[[histo_synthesize]]"
  - "[[oct_register_mosaic]]"
  - "[[dissection_photo]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "The `-out_like`/`-ol` and `-I` options advertised by --help are dead (their bodies are #if 0'd out); no live code path consumes them."
  - "Argument labels in the usage string ('seg time1', 'transform 1') do not match what the code actually reads (block image, histology image, density-file base). The positional contract is reconstructed from main() only; no caller script exists to corroborate the intended argument names."
  - "The `.den` joint-density input must be produced externally (no in-tree tool was found that writes the per-level <base>_levelN.den files consumed here); the producer is presumed to be a companion/MATLAB step from the histology-registration project."
tags:
  - histology
  - registration
  - block-face
  - 2d
  - powell
---

# histo_register_block

## Summary

`histo_register_block` computes a 2-D affine alignment between a single
**block-face photograph** and the corresponding **histological section** of a
tissue block. It searches over rotation, isotropic scale, and translation to
maximise the agreement between the two images under a previously estimated
**joint intensity density** (a `.den` file), refines the result with Powell's
method, and writes the resulting 3×3 transform as a text matrix together with
the histology image resampled into the block-face frame. It is a research tool
from the FreeSurfer *ex vivo* histology-to-MRI reconstruction line of work and
is not part of [[wiki/pipelines/recon-all|recon-all]].

## Source Information

- **Language:** C++
- **Source file:** [`histo_register_block/histo_register_block.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/histo_register_block`
- **Links against:** the FreeSurfer `utils` library; the alignment cost is driven by the shared **density** module ([`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp), header [`include/density.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/density.h)) and Powell minimisation from [`utils/numerics.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp).

## Purpose and Context

In *ex vivo* studies a tissue block is photographed (the **block-face** image)
as each section is cut, then individual sections are stained (e.g. Nissl) and
digitised (the **histology** image). Because the slide-mounted section is
physically deformed, rotated, and rescaled relative to the intact block face,
the two must be registered before histology can be stacked into a volume or
related back to MRI. `histo_register_block` solves the 2-D, single-slice
version of this problem: given one block-face image and one histology image, it
finds the affine map that best explains the histology intensities as a function
of the block-face intensities (and vice versa) under a learned joint
distribution.

The tool is a building block of a larger, largely script/MATLAB-driven
histology pipeline; no in-tree `recon-all` or shell caller invokes it
(confirmed by `grep` over `scripts/`). It is a sibling of
[[histo_synthesize]] (which synthesises histology appearance from MRI) and of
the optical-imaging mosaicker [[oct_register_mosaic]]; all three share the same
"register / synthesise 2-D microscopy against a reference" lineage.

## Inputs

### Required Inputs

The program reads its positional arguments in this order (from
[`histo_register_block.cpp:142-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L142-L172)):

1. **`argv[1]` — block-face image.** Read with `MRIread`; any FreeSurfer-readable
   2-D image (`mgz`, `mgh`, NIfTI, or an [[wiki/tools/mri_convert|mri_convert]]-importable
   format). Treated as a single slice.
2. **`argv[2]` — histology image.** Read with `MRIread`. The same image
   conventions apply.
3. **`argv[3]` — joint-density file *base name*.** For each pyramid level the
   tool opens `<base>_level<N>.den` (e.g. `mydensity_level0.den`) via
   `DensityRead`. The number of levels is set by `-nlevels` (default 1, so only
   `<base>_level0.den` is read).
4. **`argv[argc-1]` — output transform file** (the last argument). Its base name
   (extension stripped) becomes the prefix for all snapshot/aligned-volume
   outputs.

> [!gotcha] The usage string mislabels every positional argument
> `histo_register_block --help` prints
> `usage: ... <seg time1> <seg time 2> <transform 1> <transform 2> <output file>`,
> but `main()` does **not** read two segmentations and two transforms. It reads
> *block image*, *histology image*, *density-file base*, and *output file*
> ([`histo_register_block.cpp:145-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L145-L172)).
> Code is authoritative; ignore the argument names in the help text.

> [!assumption] 2-D, single-slice, 8-bit-style intensities
> Both images are treated as one coronal slice (`MRI_CORONAL` sampling
> throughout). Background is assumed to be the value 0 or 255: the code reserves
> 0 for background (`MRIreplaceValues(...,0,1)`,
> [`histo_register_block.cpp:211-212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L211-L212)) and excludes voxels valued 0 or 255 from the overlap and likelihood
> computations. The segmentation/PDF logic caps the segmentation upper bound at
> 199 when the density's max valid value is 255
> ([`histo_register_block.cpp:191-192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L191-L192)), i.e. it assumes a roughly
> 0–255 intensity range.

### The `.den` joint-density file

A `.den` file stores a 2-D joint intensity histogram / probability density as a
FreeSurfer `IMAGE`, together with the valid-intensity ranges of each channel
(`min_val1/max_val1`, `valid1[]` for the block face; the analogous `*2` fields
for histology) — see the `DENSITY` struct in
[`include/density.h:25-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/density.h#L25-L40). It is produced by `DensityHistogramEstimate`/`DensityWrite`
elsewhere in the histology toolchain; this program only consumes it. The valid
range drives a foreground segmentation of the histology image via
`MRImaxsegment` ([`histo_register_block.cpp:181-195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L181-L195)).

## Outputs

### Files Created

Let `out` be the output base (last argument with its extension removed) and
`base` be the snapshot prefix (same value).

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `<out>` (the literal last argument) | ASCII matrix (`MatrixWriteTxt`) | the final 3×3 affine transform mapping block-face → histology voxel coordinates ([`histo_register_block.cpp:234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L234)) |
| `<out>.mgz` | [[mgz]] | the histology image resampled into the block-face frame (the aligned volume) ([`histo_register_block.cpp:236-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L236-L239)) |
| `cor_<base>_target.rgb` | SGI RGB | rendered view of the target (histology) image ([`histo_register_block.cpp:442-446`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L442-L446)) |
| `cor_<base>NNN.rgb`, `<base>NNN.mgz` | RGB / [[mgz]] | per-iteration snapshots of the transformed image (one per accepted improvement) ([`histo_register_block.cpp:775-785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L775-L785)) |
| `<base>_ll_NNN.mgz`, `<base>_ll_src_NNN.mgz` | [[mgz]] | per-iteration log-likelihood maps (forward and inverse) ([`histo_register_block.cpp:791-808`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L791-L808)) |
| `<out>_scale.dat`, `<out>_rot.dat`, `<out>_dx.dat`, `<out>_dy.dat` | text (x,error) | only with `-P`: 1-D cost-function sweeps over scale, rotation, and the two translations ([`histo_register_block.cpp:1174-1234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L1174-L1234)) |

> [!gotcha] The tool writes many snapshot files into the current directory
> Every accepted alignment improvement triggers `write_snapshot`, which emits an
> `.rgb`, an `.mgz`, and two log-likelihood `.mgz` maps named from the snapshot
> counter. A full run therefore litters the working directory with `nissl000.*`,
> `nissl001.*`, … (the default base is `nissl`, overridden by the output name).

### Output Specifications

The transform is a 3×3 homogeneous matrix acting on 2-D voxel coordinates
$(x, y, 1)^\mathsf{T}$. It maps **destination (histology)** voxel coordinates to
**source (block-face)** coordinates in the forward direction used by the
sampler (`mri_apply_slice_xform` multiplies the matrix by the destination
coordinate and samples the source, [`histo_register_block.cpp:829-837`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L829-L837)). The
aligned `.mgz` is a single coronal slice in the histology grid.

## Mathematical Foundations

The optimisation minimises the **negative log-likelihood** of the image pair
under the supplied joint density. For a candidate transform $T$ (a 3×3 affine),
the maximum-likelihood cost summed over the segmented foreground is

$$
E_{\mathrm{ML}}(T) \;=\; \frac{1}{N}\sum_{(x,y)\in \Omega}
   -\log p\!\bigl(I_{\mathrm{histo}}(x,y),\; I_{\mathrm{block}}(T\,[x,y,1]^\mathsf{T})\bigr),
$$

where $p(\cdot,\cdot)$ is the joint intensity PDF read from the `.den` file and
evaluated by `DensityLogLikelihood`
([`histo_register_block.cpp:646`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L646), [`compute_ml_alignment_error`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L601-L700)). The sum is
symmetrised: a second pass accumulates the inverse mapping (block-face → histology
via $T^{-1}$), [`histo_register_block.cpp:660-692`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L660-L692).

An alternative cost, the **correlation ratio**, is available with `-C cr`:

$$
\eta^2 \;=\; \frac{\sum_i n_i\,\sigma_i^2}{N\,\sigma^2},
$$

i.e. the intensity variance of the source within iso-intensity classes $i$ of
the destination, normalised by the total variance
([`compute_cr_alignment_error`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L894-L1020); the function returns this ratio, which is
minimised — a perfect functional relationship drives it to 0).

The affine is parameterised as scale → rotate about the image centre → translate.
For each candidate the rotation/scale matrix is built about the origin
$o = (W/2, H/2)$:

$$
T \;=\; \mathrm{Trans}(dx,dy)\;\cdot\;o\,\cdot\,R(\theta)\,\cdot\,S(s)\,\cdot\,o^{-1},
\qquad
R(\theta)=\begin{pmatrix}\cos\theta & -\sin\theta\\ \sin\theta & \cos\theta\end{pmatrix},
\quad S(s)=sI,
$$

with $o$ the translation to the image centre $(W/2, H/2)$
([`histo_register_block.cpp:527-547`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L527-L547)).

The search is **coarse-to-fine** in two senses. (1) A Gaussian image pyramid of
`-nlevels` levels is built with `MRIreduce2D`, and the transform is propagated
from the coarsest to the finest level
([`compute_optimal_xform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L424-L460)). (2) Within each level the search window
(`scale`) is repeatedly halved from 1 down to 0.005, shrinking the angle, scale,
and translation ranges around the current best, with an interleaved exhaustive
translation search ([`align_pyramid_level`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L462-L583)). A **field-of-view overlap**
guard rejects any transform whose mutual coverage falls below `-overlap`
(default 0.8) by returning a huge cost
([`compute_alignment_error`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L585-L600), [`compute_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L1094-L1155)).

Finally the discrete optimum is polished with **Powell's direction-set method**
over all 9 affine entries (`OpenPowell`, tolerance $10^{-12}$), repeated until it
stops improving ([`powell_minimize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L1254-L1300)).

> [!internal] Likelihood and density live in the shared `density` module
> `DensityRead`, `DensityLogLikelihood`, and `DensityLikelihoodImage` are defined
> in [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp); the `DENSITY` PDF is a 2-D `IMAGE` with
> per-channel valid-intensity tables. Powell minimisation (`OpenPowell`) is in
> [`utils/numerics.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp).

> [!gotcha] The advertised maximum-likelihood `-C` branch is unreachable
> In the `-C` handler the third comparison tests `"cr"` again instead of `"ml"`,
> so the maximum-likelihood case can never be selected through `-C`
> ([`histo_register_block.cpp:331-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L331-L341)). ML is nonetheless the **default**
> cost (`cost_type = COST_MAXIMUM_LIKELIHOOD`), so to use ML simply omit `-C`; to
> use the correlation ratio pass `-C cr`; `-C kl` selects a Kullback–Leibler
> constant that is **not implemented** in `compute_alignment_error` and would
> `ErrorExit`.

## Configuration Options

### Complete Flag Reference

All options are parsed in [`get_option`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L250-L356). Option matching is
case-insensitive (`stricmp`/`toupper`).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nlevels` | int | `1` | Number of Gaussian-pyramid levels; reads one `<base>_level<N>.den` per level and registers coarse-to-fine. |
| `-overlap` | float | `0.8` | Minimum required field-of-view overlap fraction; transforms below this are assigned an infinite cost (disabled during `-P` probing). |
| `-max_angle` | float (deg) | `30` | Sets the rotation search half-range to ±this many degrees (`min_angle = -max_angle`). |
| `-max_scale` | float | `1.5` | Upper isotropic scale bound; the lower bound is set to its reciprocal (`min_scale = 1/max_scale`). |
| `-max_trans` | int (vox) | `150` | Translation search half-range in voxels (full range −`max_trans`…+`max_trans`). |
| `-nangles` | int | `7` | Number of rotation samples per refinement step. |
| `-nscales` | int | `7` | Number of scale samples per refinement step (1 ⇒ scale fixed at 1). |
| `-ntrans` | int | `7` | Number of translation samples per axis per refinement step. |
| `-skip` | int | `0` | Subsample stride: evaluate the cost every (skip+1)-th voxel. Must be ≥ 0 (errors otherwise). Larger ⇒ faster, coarser cost. |
| `-inplane` | float | `1.0` | In-plane resolution metadata (stored; does not resample). |
| `-slice` | float | `1.0` | Slice thickness metadata (stored; does not resample). |
| `-noalign` | bool | align on | Sets the internal `align` flag to 0. (Note: `align` is not consulted in the live alignment path, so this currently has no effect on the result.) |
| `-R <deg>` | float (deg) | `0` | Pre-rotate the **block-face** image by this angle before registration (`rotate_image`). |
| `-P` | bool | off | **Probe** mode: instead of registering, sweep the cost function over scale, rotation, and each translation axis and write `*_scale.dat`/`*_rot.dat`/`*_dx.dat`/`*_dy.dat`, then exit. |
| `-C <cr\|kl>` | string | ML (none) | Select the cost function. `cr` = correlation ratio; `kl` = (unimplemented) KL. Omit for the default maximum-likelihood cost. See gotcha above. |
| `-V <n>` | int | — | Set `Gdiag_no` (diagnostic voxel/image index for debugging). |
| `-out_like`<br>`-ol <vol>` | string | — | **Dead option.** Advertised by `--help`, but its body is compiled out (`#if 0`); the reference volume is read but never used. |
| `-I` | — | — | Advertised by `--help` as "invert transform coordinates", but there is **no `-I` handler** in `get_option`; passing it falls through to the default case and exits with "unknown option". |
| `-U`, `-?` | bool | — | Print usage and exit. |
| `--help` | bool | — | Print the (mislabelled) help text and exit. |
| `--version` | bool | — | Print `histo_register_block freesurfer 8.2.0` and exit. |

### Configuration Interactions

> [!gotcha] `-P` short-circuits the whole registration
> With `-P`, `main()` calls `probe_cost_function` and `exit(0)` before any
> alignment runs ([`histo_register_block.cpp:225-227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L225-L227)). The output is the four
> `*.dat` cost-curve files, **not** a transform or aligned volume. Use `-P` only
> for diagnosing the cost landscape / choosing search ranges.

- `-max_angle`, `-max_scale`, and `-max_trans` each set both ends of their search
  interval symmetrically; you cannot set an asymmetric range from the CLI.
- `-nscales 1` freezes scale at 1.0 (rigid-plus-translation within that step);
  combine with a narrow `-max_angle` for a near-rigid search.
- `-skip` divides by the pyramid thickness at each level, so its effective stride
  is coarser on finer levels; set it relative to the finest level you care about.
- `-C kl` is accepted by the parser but the KL cost is not wired into
  `compute_alignment_error`, which only dispatches ML and CR and `ErrorExit`s
  otherwise ([`histo_register_block.cpp:590-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L590-L599)).

## Typical Use Cases

### Use Case 1: Register one histology section to its block face

```bash
# Default maximum-likelihood cost, single pyramid level.
# Requires mydensity_level0.den to exist.
histo_register_block \
  block_face_023.mgz \
  nissl_023.mgz \
  mydensity \
  block_to_histo_023.xfm
# → block_to_histo_023.xfm (3x3 text matrix)
# → block_to_histo_023.xfm.mgz (aligned histology)
```

### Use Case 2: Wider search with a coarse-to-fine pyramid

```bash
# Allow up to ±45 deg, ±2x scale, 250-voxel shifts, 2-level pyramid.
# Needs mydensity_level0.den AND mydensity_level1.den.
histo_register_block -nlevels 2 \
  -max_angle 45 -max_scale 2.0 -max_trans 250 \
  block_face_023.mgz nissl_023.mgz mydensity block_to_histo_023.xfm
```

### Use Case 3: Probe the cost landscape

```bash
# Don't register; just dump 1-D cost sweeps to inspect convexity.
histo_register_block -P \
  block_face_023.mgz nissl_023.mgz mydensity probe_023
# → probe_023_scale.dat probe_023_rot.dat probe_023_dx.dat probe_023_dy.dat
```

### Use Case 4: Correlation-ratio cost with sub-sampling

```bash
histo_register_block -C cr -skip 2 \
  block_face_023.mgz nissl_023.mgz mydensity block_to_histo_023.xfm
```

## Pipeline Context

`histo_register_block` is a **standalone research tool**. No `recon-all` stage
and no in-tree script calls it (verified by `grep` over `scripts/`). In a
histology reconstruction workflow it sits after the block-face and stained
sections have been digitised and a joint-density model has been estimated, and
before the aligned sections are stacked into a histological volume or matched to
MRI by downstream (often MATLAB) tooling.

**Predecessor:** block-face photography + section digitisation + `.den`
estimation → **histo_register_block** → **Successor:** section stacking /
histology-to-MRI alignment (external).

## Gotchas and Caveats

> [!gotcha] Output transform file is also re-used as a base name
> The last argument is written verbatim as the matrix file **and** has its
> extension stripped to form `base`, the prefix for `<base>.mgz` and all
> snapshots. Choosing `out.xfm` yields `out.xfm` (matrix) plus `out.mgz` and
> `out000.*` snapshots — the `.xfm` and `.mgz` share the stem
> ([`histo_register_block.cpp:172-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L172-L239)).

> [!gotcha] Both images are zero-embedded into a common canvas
> The two images are resampled into a shared `max(width)`×`max(height)` canvas
> with `MRIresampleFill(..., 255)` before registration
> ([`histo_register_block.cpp:210-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L210-L223)). Fill value 255 is treated as
> background and ignored by the cost, but the canvas size change means voxel
> indices in the output transform refer to this padded grid, not the original
> image extents.

> [!gotcha] `-noalign` does not turn off alignment
> The `align` flag it sets is never read in the active code path, so a `-noalign`
> run still performs the full search and Powell refinement
> ([`histo_register_block.cpp:278-280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L278-L280)). The name is misleading.

> [!gotcha] Likely typo: block image overwritten by histo in a background fill
> Line [`histo_register_block.cpp:212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L212) reads
> `MRIreplaceValues(mri_block, mri_histo, 0, 1)` — the destination is
> `mri_histo`, not `mri_block`, so the intended "reserve 0 for background in the
> block image" replacement writes into the histology image instead. This is a
> probable bug; flag for developer review before relying on background handling.

## Error Compensation and Guard Rails

- **Field-of-view overlap floor.** Any candidate with mutual coverage below
  `-overlap` (default 0.8) is rejected with a 10⁸ cost, preventing the optimiser
  from "winning" by sliding the images apart
  ([`histo_register_block.cpp:587-588`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L587-L588)). Disabled automatically in `-P` mode.
- **Background exclusion.** Voxels valued 0 or 255 are skipped in the overlap and
  likelihood sums so that padding does not bias the cost.
- **Histology foreground segmentation.** A connected-component segmentation
  (`MRImaxsegment`) over the density's valid-intensity range restricts the ML
  cost to tissue voxels ([`histo_register_block.cpp:181-196`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L181-L196)).
- **Missing density file is fatal.** If any `<base>_level<N>.den` cannot be
  opened the tool `ErrorExit`s ([`histo_register_block.cpp:166-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L166-L168)).

## Known Bugs

- [[00161]] — the second `MRIreplaceValues` names `mri_histo` as destination for a `mri_block` source, overwriting the histology image with the block image (or aborting via `MRIcheckVolDims` when the two inputs differ in size).

## Related Tools

- [[histo_synthesize]] — the inverse-direction sibling: synthesises histological
  appearance from MRI using patch matching, from the same project.
- [[oct_register_mosaic]] — 2-D microscopy registration/mosaicking tool sharing
  the Powell-minimisation and FreeSurfer 2-D imaging machinery.
- [[dissection_photo]] — GUI pipeline for the complementary problem of
  pixel-calibrating and segmenting dissection photographs.
- [[wiki/tools/mri_convert|mri_convert]] — to import scanned block-face/histology
  images into an `MRIread`-compatible format.

## Confidence and Gaps

**High confidence:** the full flag set and defaults, the positional-argument
contract (block, histology, density base, output), the ML/CR cost mathematics,
the coarse-to-fine + Powell search structure, the overlap guard, and the set of
output files — all read directly from
[`histo_register_block.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp).

> [!gap] Producer of the `.den` joint-density file
> No in-tree tool was found that writes the per-level `<base>_levelN.den` files
> this program consumes; the producer is presumed to be a companion step
> (likely MATLAB) of the histology-registration project. The exact estimation
> procedure is therefore out of scope here.

> [!gap] Dead `-out_like`/`-I` options
> `--help` advertises `-out_like` and `-I`, but the former's body is `#if 0`'d
> and there is no `-I` handler. Their original intent (reshaping the output to a
> reference geometry; inverting the transform convention) is documented from the
> help text only and is not exercisable in v8.2.0.

> [!gap] Background-fill destination typo
> The suspected `mri_histo`-vs-`mri_block` mix-up at
> [`histo_register_block.cpp:212`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L212) has not been confirmed as intentional; its
> practical effect on results is unverified.

## References

- FreeSurfer source: [`histo_register_block/histo_register_block.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp) (v8.2.0).
- Shared density model: [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp), [`include/density.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/density.h).
- Powell minimisation: `OpenPowell` in [`utils/numerics.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/numerics.cpp).
- Built-in help: `histo_register_block --help` (note: argument labels are inaccurate; see gotcha).
