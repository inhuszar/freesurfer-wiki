---
title: "histo_compute_joint_density"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "histo_compute_joint_density/histo_compute_joint_density.cpp"
families:
  - "histo_*"
recon_all_stage: null
related:
  - "[[mri_joint_density]]"
  - "[[histo_register_block]]"
  - "[[hiam_register]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The `.den` plain-text density file has no dedicated format page; its layout is documented inline here from density.cpp."
  - "histo_register_block (the consumer of the .den output) has no wiki page yet."
tags:
  - histology
  - registration
  - joint-histogram
  - density
  - mutual-information
---

# histo_compute_joint_density

## Summary

`histo_compute_joint_density` estimates the **2D joint intensity probability density** of two spatially-aligned, single-slice images (for example a histology section and the matching block-face photograph) and writes it to a plain-text `.den` file. It reads two volumes, optionally restricts the analysis to a connected intensity-defined region, builds a Gaussian-pyramid hierarchy of each, and for each requested pyramid level forms a normalised `nbins × nbins` joint histogram, smooths it with a Gaussian, and saves it. The resulting density file is the **registration cost-function model** later loaded by [[histo_register_block]], which uses it to compute a per-pixel log-likelihood for 2D slice-to-slice alignment of histology to block-face imaging.

## Source Information

- **Language:** C++
- **Source file:** [`histo_compute_joint_density/histo_compute_joint_density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/histo_compute_joint_density`
- **Core library routine:** [`DensityHistogramEstimate()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L32) and [`DensityWrite()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L113) in [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp); declarations in [`include/density.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/density.h).
- **Pyramid reduction:** [`MRIreduce2D()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrifilter.cpp#L2943).

## Purpose and Context

This is a member of the **2D histology-registration family** (`histo_register`, [[histo_register_block]], `histo_synthesize`), not a whole-brain MRI tool. It exists to learn the statistical relationship between the pixel intensities of two co-registered 2D modalities so that the relationship can be exploited as a registration metric. In the canonical use case the two inputs are a **Nissl-stained histology slice** and the corresponding **block-face photograph** of the frozen tissue block; the joint density captures how tissue that is bright in one modality maps to intensities in the other.

The estimated joint density $p(v_1, v_2)$ plays the same role as the joint histogram in a mutual-information registration: a candidate alignment is scored by how probable the observed intensity pairs are under $p$. Concretely, [`histo_register_block`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L165) reads one `.den` file **per pyramid level** and passes it to [`DensityLikelihoodImage()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp), which evaluates $-\log p$ at every transformed pixel. `histo_compute_joint_density` is therefore the **training / model-building** stage that must be run before the registration stage.

It is a stand-alone command-line program; it is **not** part of [[wiki/pipelines/recon-all|recon-all]] and is not invoked by any FreeSurfer shell script. It is the 2D-slice, registration-oriented counterpart of [[mri_joint_density]] (which computes a 3D-volume joint histogram for analysis rather than registration).

## Inputs

### Required Inputs

Three positional arguments, in order ([`histo_compute_joint_density.cpp:85-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L85-L93) and [`:145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L145)):

1. **`<volume1>`** — first image (e.g. histology). Any format [`MRIread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L88) accepts ([[mgz]], `mgh`, `nii`, etc.).
2. **`<volume2>`** — second image (e.g. block-face), read the same way.
3. **`<joint density file>`** — output **base name**. The level index and `.den` extension are appended automatically: the file actually written is `<base>_level<L>.den`.

### Input Assumptions

> [!assumption] Two co-registered single-slice images on a shared grid
> The two inputs must already be **spatially aligned and sampled on the same 2D grid**: the joint histogram is built by pairing voxel `(x, y, 0)` of volume 1 with the *same* voxel `(x, y, 0)` of volume 2 ([`density.cpp:75-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L75-L90)). The loop only visits slice `z = 0`, so the volumes are treated as **single 2D slices**; multi-slice volumes are ignored beyond their first slice. No resampling or registration is performed here — that is the job of the downstream registration stage.

> [!assumption] 8-bit-style intensity range
> The histogram is built over the integer intensity range and the maximum is forced to be at least 255 ([`density.cpp:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L48-L49)); the validity tables and `--valid1`/`--valid2` masks are indexed by integer intensity in `[0, 255]` ([`histo_compute_joint_density.cpp:101-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L101-L130)). The tool is written for 8-bit photographic / stained imagery, not floating-point MRI.

Before histogramming, every voxel equal to 0 in either input is replaced by 1 so that **intensity 0 is reserved for background** ([`:95-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L95-L96)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<base>_level<L>.den` | path given as 3rd argument | ASCII joint-density file for pyramid level `L` (one per level requested by `-nlevels`) |
| `h<level>.mgz` | **current working directory** | the level-`level` Gaussian-pyramid reduction of volume 1 (debug dump) |
| `b<level>.mgz` | **current working directory** | the level-`level` reduction of "volume 2" (see [bug below](#gotchas-and-caveats)) |

The `h*.mgz`/`b*.mgz` files are written for **every** level `1 … 9` regardless of `-nlevels` ([`:134-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L134-L141)), into the directory from which the program is run.

### The `.den` file format

A `.den` file is plain text written by [`DensityWrite()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L113): a header block of colon-prefixed key lines followed by the `nbins × nbins` density matrix, one histogram row per text line.

```
:nbins  <N>
:vol1   <min_val1> <max_val1>
:vol2   <min_val2> <max_val2>
:sigma  <smoothing sigma>
:dof    <#voxels that entered the histogram>
:mri1   <volume1 filename>
:mri2   <volume2 filename>
:valid1 <one 0/1 flag per intensity of vol1>
:valid2 <one 0/1 flag per intensity of vol2>
<N floats>          # row 0 of the joint density
...                 # N rows total
```

Each matrix entry is $p(\text{bin}_1, \text{bin}_2)$, i.e. the fraction of contributing voxels falling in that joint-intensity bin (the matrix sums to 1 before Gaussian smoothing). The file is read back by [`DensityRead()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp) in the registration stage.

### Output Specifications

The density image is stored internally as an `IMAGE` of type `PFFLOAT` with `nbins` rows and `nbins` columns ([`density.cpp:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L42)). `dof` records the number of voxels that survived the validity masks and were counted.

## Mathematical Foundations

For two aligned slices with intensities $v_1(x,y)$ and $v_2(x,y)$, each in-mask voxel is mapped to a bin pair and the joint histogram is accumulated.

> [!math] Joint-density estimation
> Bin assignment is a linear rescale of intensity into $[0, \text{nbins})$ ([`density.cpp:53-54,80-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L53-L54)):
> $$ \text{bin}_k = (v_k - v_k^{\min})\,\frac{\text{nbins}-1}{v_k^{\max}-v_k^{\min}}, \qquad k \in \{1,2\}. $$
> The raw count is normalised by the number of contributing voxels $N$ (the `dof`) to give a discrete joint PDF ([`density.cpp:88-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L88-L95)):
> $$ p(i,j) = \frac{1}{N}\sum_{(x,y)} \mathbb{1}\!\left[\text{bin}_1(x,y)=i \wedge \text{bin}_2(x,y)=j\right]. $$
> Finally the PDF is convolved with a 1D Gaussian kernel of standard deviation `sigma` (default 2.0) to fill gaps and regularise sparse bins ([`density.cpp:99-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L99-L108)). With `sigma = 0` no smoothing is applied.

> [!math] Gaussian pyramid (coarse-to-fine)
> When `-nlevels > 1`, each input is repeatedly down-sampled by [`MRIreduce2D()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrifilter.cpp#L2943), which low-pass-filters along the in-plane axes with the 5-tap Burt–Adelson REDUCE kernel and decimates by 2 ([`mrifilter.cpp:2888-2890`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrifilter.cpp#L2888-L2890)):
> $$ w = \left[\tfrac14-\tfrac{a}{2},\ \tfrac14,\ a,\ \tfrac14,\ \tfrac14-\tfrac{a}{2}\right],\qquad a = \texttt{K\_A}. $$
> A separate `.den` is estimated at each level so the registration can proceed coarse-to-fine. The levels are written from `nlevels-1` down to `0`, with level `0` being full resolution ([`histo_compute_joint_density.cpp:143-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L143-L149)).

> [!math] Downstream use as a log-likelihood
> The consumer scores a candidate alignment by the negative log of the density at each transformed pixel,
> $$ \text{cost}(x,y) = -\log p\big(v_1, v_2\big), $$
> evaluated in [`DensityLikelihoodImage()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp) via `DensityLogLikelihood`. Smoothing in the estimation step ensures $p$ is non-zero where it matters, keeping the log finite.

> [!internal] The density math lives in `utils/density.cpp`
> All histogram accumulation, normalisation, Gaussian smoothing, file I/O, and likelihood evaluation are implemented in [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp). This program is a thin driver that reads two volumes, sets up the validity masks and pyramid, and calls `DensityHistogramEstimate` / `DensityWrite`.

## Configuration Options

### Complete Flag Reference

All options are parsed in [`get_option()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L159-L206). Flags are single-letter (case-insensitive) plus a few long forms; the single-letter flags consume the following argument(s).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-n` | int | `256` | Number of bins per axis of the joint histogram (`nbins`); the density image is `nbins × nbins` ([`:189-193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L189-L193)). |
| `-s` | float | `2.0` | Standard deviation `sigma` of the Gaussian used to smooth the joint density; `0` disables smoothing ([`:184-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L184-L188)). |
| `-valid1` | int int | none (all 0–255 valid) | Restrict volume 1 to intensities in `[min, max]`; builds a validity mask **and** extracts the largest connected component in that range, replacing both volumes with the segment-masked versions ([`:169-173`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L169-L173), applied at [`:97-117`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L97-L117)). |
| `-valid2` | int int | none (all 0–255 valid) | Restrict volume 2 to intensities in `[min, max]` via a validity mask only (no connected-component extraction) ([`:174-178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L174-L178), applied at [`:119-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L119-L130)). |
| `-nlevels` | int | `1` | Number of Gaussian-pyramid levels for which a `.den` is produced; level 0 is full resolution ([`:179-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L179-L182)). |
| `--help` | flag | — | Prints usage and exits ([`:165-166`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L165-L166)). |
| `--version` | flag | — | Prints the FreeSurfer build version and exits ([`:167-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L167-L168)). |
| `-u`<br>`-?` | flag | — | Prints the one-line usage and exits ([`:194-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L194-L198)). |

> [!gotcha] `--help` prints almost nothing
> `print_help()` just calls `print_usage()` and exits ([`:221-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L221-L226)), so the only built-in documentation is the single usage line. The flag table above is the authoritative reference.

### Configuration Interactions

- **`-valid1` is more invasive than `-valid2`.** `-valid1` does not merely mask: it runs [`MRImaxsegment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L105) to find the largest connected region whose intensity lies in the requested range and then **rewrites both volume 1 and volume 2** to keep only that segment ([`:105-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L105-L112)). `-valid2` only sets a per-intensity validity flag. Supplying `-valid1` therefore changes what volume 2 contributes, while `-valid2` does not affect volume 1.
- **`-nlevels` controls how many `.den` files appear, not how many pyramid volumes are dumped.** The `h*.mgz`/`b*.mgz` debug volumes are always written for levels 1–9 ([`:134-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L134-L141)), independent of `-nlevels`.
- **`-n` must match the consumer.** [[histo_register_block]] allocates its density images from the `:nbins` header, so any `-n` is honoured downstream; but every level read by the registration must have a corresponding `<base>_level<L>.den`, so `-nlevels` here must cover the levels the registration requests.

## Typical Use Cases

### Use Case 1: Single-level density for Nissl/block-face registration

```bash
# Learn the joint intensity model of an aligned histology/block-face pair.
histo_compute_joint_density nissl_slice.mgz block_slice.mgz nissl_block
# -> writes nissl_block_level0.den
```

The default (`-n 256 -s 2 -nlevels 1`) produces a single full-resolution, Gaussian-smoothed 256×256 density that [[histo_register_block]] can load as `nissl_block_level0.den`.

### Use Case 2: Coarse-to-fine multi-level density

```bash
# Produce a 3-level pyramid of densities for a coarse-to-fine registration.
histo_compute_joint_density -nlevels 3 -n 128 \
    nissl_slice.mgz block_slice.mgz nissl_block
# -> nissl_block_level0.den, _level1.den, _level2.den
```

### Use Case 3: Restrict to a tissue region and sharpen the density

```bash
# Keep only the largest connected bright region of the histology (intensities 40-255)
# and reduce histogram smoothing for a sharper model.
histo_compute_joint_density -valid1 40 255 -s 1.0 \
    nissl_slice.mgz block_slice.mgz nissl_block
```

## Pipeline Context

`histo_compute_joint_density` is the **model-building** step of a two-program 2D histology-registration workflow:

**Predecessor:** aligned histology + block-face slices (prepared/cropped upstream) → **histo_compute_joint_density** (writes `*_level*.den`) → **Successor:** [[histo_register_block]] (loads each `*_level*.den` via [`DensityRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L165-L166) and registers using [`DensityLikelihoodImage`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp#L791)).

It is not connected to [[wiki/pipelines/recon-all|recon-all]] or to the [[hiam_make_surfaces]] / [[hiam_make_template]] / [[hiam_register]] hippocampus–amygdala tools; it shares only the broader "research / ex-vivo imaging" lineage and the `histo_*` naming.

## Gotchas and Caveats

> [!gotcha] Volume 2's pyramid is actually a copy of volume 1's pyramid
> At [`histo_compute_joint_density.cpp:135-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L135-L136) both pyramid arrays are reduced **from `mri1_pyramid`**:
> ```c
> mri1_pyramid[level] = MRIreduce2D(mri1_pyramid[level-1], NULL) ;
> mri2_pyramid[level] = MRIreduce2D(mri1_pyramid[level-1], NULL) ;  // should be mri2_pyramid
> ```
> So for every level **above 0**, `mri2_pyramid[level]` is a down-sampled copy of **volume 1**, not volume 2. The level-0 entries are the originals and are correct, so the **default `-nlevels 1` run is unaffected** (it only uses level 0). With `-nlevels > 1`, however, the coarse-level densities pair volume 1 against itself and are not meaningful joint densities. Prefer `-nlevels 1`, or treat coarse levels with suspicion, until this is fixed upstream.

> [!gotcha] Debug pyramid volumes are dumped into the current directory
> `h1.mgz … h9.mgz` and `b1.mgz … b9.mgz` are written unconditionally to the **working directory** ([`:137-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L137-L141)), overwriting any same-named files. Run the tool from a scratch directory.

> [!gotcha] Output argument is a base name, not a filename
> Passing `out.den` as the third argument yields `out.den_level0.den`, because `_level<L>.den` is appended verbatim ([`:145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L145)). Pass a bare base name (e.g. `out`).

> [!gotcha] Only the first slice is used
> Both the histogram loop ([`density.cpp:75-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L75-L90)) and the pyramid operate in-plane on slice 0. A genuinely 3D volume is silently reduced to its first slice for density estimation.

## Error Compensation and Guard Rails

- **Background reservation.** All-zero voxels are remapped to 1 in both inputs so that intensity 0 stays reserved for background and never pollutes a real bin ([`:95-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L95-L96)).
- **Range clamping of validity bounds.** `-valid1`/`-valid2` limits are clamped to the actual intensity range of the data with `MAX`/`MIN` before the mask is built ([`:98-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L98-L100), [`:121-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L121-L122)), so out-of-range bounds cannot index past the volume's value range.
- **Forced maximum of 255.** The density estimator forces `max_val` to at least 255 ([`density.cpp:48-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L48-L49)), guaranteeing the bin-scaling denominator is well defined for 8-bit data even if the slice happens not to reach 255.
- **Illegal-bin guard.** If a computed bin falls outside `[0, nbins)`, the estimator prints `illegal bin!!!!` and breaks to the debugger hook rather than writing out of bounds ([`density.cpp:82-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L82-L86)).
- **Read failures abort.** A volume that cannot be read triggers `ErrorExit` ([`:88-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L88-L93)).

## Known Bugs

- [[00158]] — in the multi-level pyramid build, the second volume's reduced levels are computed from the first volume's pyramid, so every density above level 0 is volume 1's auto-density (affects `-nlevels > 1`).

## Related Tools

- [[mri_joint_density]] — the analysis-oriented sibling: a 2D joint histogram of two co-registered **3D MRI** volumes, written as a density matrix; same idea, different (volumetric, non-registration) purpose.
- [[histo_register_block]] — the **consumer**: loads the `*_level*.den` files produced here and uses them as the cost-function model for 2D histology↔block-face registration.
- [[hiam_register]], [[hiam_make_template]], [[hiam_make_surfaces]] — the hippocampus–amygdala tools grouped with this one for documentation; unrelated in function but share the "research surface/ex-vivo" lineage.

## Confidence and Gaps

**High confidence:** complete flag set and defaults, the three positional arguments, the `<base>_level<L>.den` naming, the `.den` text layout, the histogram/normalisation/smoothing math, the pyramid kernel, the background reservation, the `-valid1` connected-component behaviour, and the producer→consumer relationship with [[histo_register_block]] — all read directly from [`histo_compute_joint_density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp), [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp), and [`histo_register_block.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp).

> [!gap] No format page for `.den`
> The `.den` file is documented inline here from [`DensityWrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp#L113)/[`DensityRead`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp). A dedicated `wiki/formats/` page would be the right home for the full specification (header keys, valid-table length, matrix ordering).

> [!gap] Pyramid bug not yet confirmed against upstream issue tracker
> The volume-2 pyramid copy ([`:136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp#L136)) is unambiguous in the code, but whether it is a known/intentional limitation has not been cross-checked against GitHub issues.

## References

- FreeSurfer source: [`histo_compute_joint_density/histo_compute_joint_density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_compute_joint_density/histo_compute_joint_density.cpp) (v8.2.0).
- Density library: [`utils/density.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/density.cpp), [`include/density.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/density.h).
- Consumer: [`histo_register_block/histo_register_block.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/histo_register_block/histo_register_block.cpp).
- P. J. Burt and E. H. Adelson, "The Laplacian Pyramid as a Compact Image Code," *IEEE Trans. Communications* 31(4):532–540, 1983 — the REDUCE kernel used by [`MRIreduce2D`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrifilter.cpp#L2943).
