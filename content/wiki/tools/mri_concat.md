---
title: "mri_concat"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_concat/mri_concat.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_preproc]]"
  - "[[mri_binarize]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mgz]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "fMRIcovariance() variance/std implementation not traced"
  - "MRIpca() PCA algorithm not traced beyond entry point"
tags:
  - concatenation
  - frames
  - group-analysis
  - utility
---

# mri_concat

## Summary

`mri_concat` concatenates multiple volume files along the frame (4th)
dimension, producing a single multi-frame output. Beyond simple concatenation,
it provides a comprehensive set of frame-wise operations: per-voxel reduction
(mean, median, std, max), paired-frame arithmetic (diff, avg), weighted linear
combinations (matrix multiplication), PCA, voting, and pruning. It is the
workhorse behind [[mris_preproc]] for assembling per-subject resampled maps and
is also used widely in fMRI and group analysis pipelines.

## Source Information

- **Language:** C++
- **Source file:** `mri_concat/mri_concat.cpp` (1498 lines, author: Bruce Fischl)
- **Binary location:** `$FREESURFER_HOME/bin/mri_concat`

## Purpose and Context

`mri_concat` is called:

- By [[mris_preproc]] to assemble per-subject resampled surface maps
- Directly in fMRI analysis to concatenate runs, compute mean images, or
  perform paired-run comparisons
- In group analysis scripts to build 4D "stacks" for GLM analysis
- For segmentation combination (e.g., merging lh and rh ribbon files via
  `--combine`)

Not called by `recon-all`.

## Inputs

- `--i <vol>` — input volume; repeatable; bare filenames on the command line are also accepted as inputs
- `--f <listfile>` — text file with one path per line (combined with `--i` inputs; total capped at `NInMAX = 400000`)
- `--w <weightfile>` / `--wn <weightfile>` — ASCII column-vector file with one scalar weight per frame, read by `MatrixReadTxt()`
- `--mtx <matrix.asc>` — ASCII matrix file (P×F) for linear frame combinations
- `--mask <maskfile>` — mask volume; only used by `--vote` and `--sort`

All inputs must have matching column/row/slice dimensions. Frame counts are
summed across inputs unless `--in-frame N` is given, in which case each input
contributes only its frame `N`.

## Outputs

- Single output volume in [[mgz]] or any supported format
- Default output type: `MRI_FLOAT`
- With `--keep-datatype`: inherits type of the last input

Additional outputs for special operations:
- PCA: `<stem>.u.mtx` (temporal components), `<stem>.stats.dat` (singular values)

## Mathematical Foundations

### Frame-wise reduction operators

Let $V_{ijk}^{(f)}$ denote the voxel at position $(i,j,k)$ in frame $f$, and let $F$ be the total number of frames.

| Operation | Formula |
|-----------|---------|
| `--mean` | $\bar{V}_{ijk} = \frac{1}{F}\sum_f V_{ijk}^{(f)}$ |
| `--std` | $\sigma_{ijk} = \sqrt{\frac{1}{F-1}\sum_f (V_{ijk}^{(f)} - \bar{V}_{ijk})^2}$ (sample std dev) |
| `--sum` | $\sum_f V_{ijk}^{(f)}$ |
| `--max` | $\max_f V_{ijk}^{(f)}$ |
| `--min` | $\min_f V_{ijk}^{(f)}$ |
| `--rms` | $\sqrt{\frac{1}{F}\sum_f (V_{ijk}^{(f)})^2}$ (single input with multiple frames) |

### Paired-frame operations

Frames are paired as $(1,2), (3,4), \ldots$. Output has $F/2$ frames.

| Operation | Formula |
|-----------|---------|
| `--paired-diff` | $V^{(1)} - V^{(2)}$ per pair |
| `--paired-avg` | $\frac{V^{(1)} + V^{(2)}}{2}$ per pair |
| `--paired-diff-norm` | $\frac{V^{(1)} - V^{(2)}}{(V^{(1)} + V^{(2)})/2}$; 0 when average is 0 |
| `--paired-diff-norm1` | $\frac{V^{(1)} - V^{(2)}}{V^{(1)}}$; 0 when $V^{(1)}=0$ |
| `--paired-diff-norm2` | $\frac{V^{(1)} - V^{(2)}}{V^{(2)}}$; 0 when $V^{(2)}=0$ |

### Conjunction

The conjunction (Nichols et al., NeuroImage 2005) is the minimum of absolute
values across frames, preserving the sign of the minimum:
$$
C_{ijk} = \min_f |V_{ijk}^{(f)}| \cdot \text{sign}\!\left(\arg\min_f |V_{ijk}^{(f)}|\right)
$$

### Matrix multiplication

`--mtx M.asc`: given a $P \times F$ ASCII matrix $M$, the output is $P$
frames where output frame $p$ is a linear combination of input frames:
$$
O^{(p)}_{ijk} = \sum_f M_{pf} \cdot V^{(f)}_{ijk}
$$

### Pruning

`--prune`: for each voxel, if **any** frame is zero, set **all** frames of that
voxel to zero. Formally:
$$
V_{ijk}^{(f)} \leftarrow 0 \quad \text{if } \exists f': V_{ijk}^{(f')} = 0
$$

## Configuration Options

### Complete Flag Reference

#### Input specification

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i` | `vol` (string) | — | Input volume; repeatable. Bare filenames (without `--i`) are also accepted as inputs. Total inputs across `--i` and `--f` capped at `NInMAX = 400000`. |
| `--f` | `listfile` (string) | — | Text file with one input path per line; all entries appended to the input list. |
| `--in-frame` | `N` (int) | −1 (all frames) | Extract only frame `N` (0-based) from each input via `fMRIframe()` after loading. |
| `--check` | — | on | Enable dimension consistency check across inputs. |
| `--no-check` | — | — | Skip dimension check (faster; assumes all inputs match). |

#### Per-input pre-processing

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--abs` | — | off | Take voxel-wise absolute value of each input before any further operation. |
| `--pos` | — | off | Set negative values to 0 in each input (rectification). |
| `--neg` | — | off | Set positive values to 0 in each input. |

Only one of `--abs`, `--pos`, `--neg` may be used (enforced in `check_options()`).

#### Frame reduction (output: 1 frame)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mean` | — | off | Per-voxel mean across frames. |
| `--median` | — | off | Per-voxel median across frames. |
| `--mean-div-n` | — | off | Per-voxel sum divided by `N` (i.e. mean). Documented as "good for var". |
| `--mean2` | — | off | Alias for `--mean-div-n`. |
| `--sum` | — | off | Per-voxel sum across frames. |
| `--std` | — | off | Per-voxel sample standard deviation (uses `fMRIcovariance()` internally). |
| `--var` | — | off | Per-voxel variance (uses `fMRIcovariance()` internally). Mutually exclusive with `--std`. |
| `--max` | — | off | Per-voxel maximum value across frames. |
| `--min` | — | off | Per-voxel minimum value across frames. |
| `--max-index` | — | off | 1-based frame index of the per-voxel maximum value. |
| `--rms` | — | off | Temporal root-mean-square: square, sum, divide by `nframes`, square root. Designed for a single multi-frame input (e.g. combine MEMPRAGE echoes). |
| `--conjunct` | — | off | Voxel-wise conjunction (Nichols et al. 2005): minimum of absolute values across frames, with sign of that minimum preserved. |

#### Variants of `--max-index`

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--max-index-prune` | — | off | Implies `--max-index`. After max-index, set the output to 0 at any voxel where all input frames are 0. Distinct from the global `--prune`. |
| `--max-index-add` | `val` (int) | 0 | Add `val` to all non-zero max-index values. Argument must be a number (digit, `+`, or `-` start) — otherwise the program errors out and points to `fscalc`. |

#### Paired-frame operations (output: N/2 frames)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--paired-diff` | — | off | Frame‑pair difference: `frame1−frame2`, `frame3−frame4`, … |
| `--paired-avg` | — | off | Frame‑pair average: `(frame1+frame2)/2`, … |
| `--paired-sum` | — | off | Frame‑pair sum: `frame1+frame2`, … |
| `--paired-diff-norm` | — | off | `(frame1−frame2) / ((frame1+frame2)/2)`; output 0 when the average is 0. |
| `--paired-diff-norm1` | — | off | `(frame1−frame2) / frame1`; output 0 when `frame1` is 0. |
| `--paired-diff-norm2` | — | off | `(frame1−frame2) / frame2`; output 0 when `frame2` is 0. |

All paired operations require an even total frame count. `--paired-avg` and any
`--paired-diff*` are mutually exclusive, as are `--paired-diff-norm`,
`--paired-diff-norm1`, and `--paired-diff-norm2` (enforced in `check_options()`).

#### Normalization

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--norm-mean` | — | off | Per voxel, divide every frame by the mean of all frames at that voxel. |
| `--norm1` | — | off | Per voxel, divide every frame by the value at the first frame. |
| `--fnorm` | — | off | Per voxel, remove the temporal mean and divide by the square root of the sum of squared deviations (zero-mean, unit-SS time series). |

#### Matrix operations

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mtx` | `matrix.asc` (string) | — | Read an ASCII matrix `M` via `MatrixReadTxt()` and multiply the input data (frames) by it (`fMRImatrixMultiply`). With `M` of shape `P×F`, output has `P` frames where output frame `p` is the linear combination $\sum_f M_{pf} \cdot V^{(f)}$. |
| `--w` | `weights.asc` (string) | — | Read a per-frame weight column via `MatrixReadTxt()` and scale each frame by its weight. |
| `--wn` | `weights.asc` (string) | — | Same as `--w`, but first normalize the weights to sum to 1. |
| `--gmean` | `Ng` (int) | 0 (disabled) | Construct a grouped-mean matrix `M = GroupedMeanMatrix(Ng, Ntotal)` with `nper = Ntotal/Ng` rows and apply it via `fMRImatrixMultiply`. Errors if `Ntotal` is not an integer multiple of `Ng`. Output has `Ntotal/Ng` frames. |
| `--asl` | — | off | Apply the ASL label/control interpolation matrix via `fMRIaslSubtraction()`. |

#### Scalar operations (applied to output)

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mul` | `val` (double) | — | Multiply every voxel by the scalar `val`. Argument must parse as a number; otherwise the program errors out and points to `fscalc` for image-image multiplication. |
| `--div` | `val` (double) | — | Divide every voxel by `val` (internally converted to `--mul 1/val`). Same numeric-only constraint as `--mul`. |
| `--add` | `val` (double) | — | Add scalar `val` to every voxel. Numeric-only argument. |
| `--max-bonfcor` | — | off | Implies `--max`. After computing max, subtract $\log_{10}(N_{\text{frames}})$ — Bonferroni correction assuming inputs are $-\log_{10}(p)$ values. |

#### Aggregation and special modes

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--combine` | — | off | Per voxel, average across frames the values that are non-zero. Designed e.g. for combining `lh.ribbon.mgz` + `rh.ribbon.mgz`. |
| `--vote` | — | off | Per voxel, output the most frequent value across frames; output frame 0 is the winning value, frame 1 is its fraction of occurrences. |
| `--vote-ex0` | — | off | Same as `--vote`, but voxels with value 0 are excluded from the count. |
| `--first-non-zero` | — | off | Per voxel, output the first non-zero value encountered as frames are scanned in order. |
| `--sort` | — | off | Sort the frames at each voxel into ascending order. |
| `--prune` | — | off | Per voxel, if **any** frame is 0 then set **all** frames at that voxel to 0. |
| `--no-prune` | — | — | Disable pruning (default state; meaningful when overriding e.g. a caller that already passed `--prune`). |
| `--cumsum` | — | off | Replace each frame with the cumulative sum across frames at that voxel. |
| `--tar1` | `dofadjust` (int) | off | Compute the temporal lag-1 autocorrelation across frames with the given DOF adjustment (`fMRItemporalAR1`). |
| `--scm` | — | off | Compute the spatial covariance matrix (frame×frame). Output can be huge — a single mask-less surface overlay yields an `Nvox × Nvox` matrix. |
| `--rep` | `N` (int) | 0 (disabled) | Replicate the entire input frame stack `N` times (output has `N × ninframes` frames). |

#### PCA

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--pca` | — | off | Run PCA on the concatenated stack via `MRIpca()`. Spatial components are written to the main output; temporal components to `<output_stem>.u.mtx`; singular values to `<output_stem>.stats.dat`. |
| `--pca-mask` | `mask` (string) | — | Restrict PCA to voxels where the supplied mask volume is > 0.5. |

#### Masking

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--mask` | `file` (string) | — | Mask volume; only valid in combination with `--vote` or `--sort`. Specifying `--mask` without one of these raises an error in `check_options()`. |

#### Output

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--o` | `vol` (string) | — | Output volume path. Required. |
| `--keep-datatype` | — | off | Write output in the same datatype as the (last) input rather than the default `MRI_FLOAT`. |
| `--ctab` | `file` (string) | — | Read an ASCII colour table via `CTABreadASCII()` and embed it in the output. |

#### Special standalone mode

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--zconcat` | `mri1 mri2 nskip out` (4 strings) | — | Standalone short-circuit mode: load `mri1` and `mri2`, drop the first `nskip` slices of `mri2`, concatenate them along the slice (z) direction via `MRIzconcat()`, write to `out`, then `exit()`. All other options are ignored. Designed for combining hires susceptibility slabs where the top slice of one slab overlaps the bottom of the next. |

#### Miscellaneous

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--chunk` | — | off | Set environment variable `FS_USE_MRI_CHUNK=1`, enabling chunked MRI buffer allocation in subsequent loads. |
| `--no-chunk` | — | — | Unset `FS_USE_MRI_CHUNK`. |
| `--rusage` | `file` (string) | — | Write process resource usage (`getrusage`) to `file` at exit. |
| `--debug` | — | off | Set the global `debug` flag (extra diagnostic prints). |
| `--help` | — | — | Print full help (usage + examples + conjunction note) and exit. |
| `--version` | — | — | Print build version and exit. |

### Configuration Interactions

> [!gotcha] Paired-difference operations require even frame count
> All `--paired-*` flags require exactly an even number of input frames.
> No explicit error checking — providing odd frame count produces undefined output.

> [!gotcha] `--mean` and `--std` are mutually exclusive
> These cannot be combined. Similarly, `--std` and `--var` are mutually
> exclusive (the latter raises a literal `"you bonehead"` error from
> `check_options()`). `--paired-diff*` and `--paired-avg` are also mutually
> exclusive, as are the three normalization variants `--paired-diff-norm`,
> `--paired-diff-norm1`, and `--paired-diff-norm2`.

> [!gotcha] `--mask` is only valid with `--vote` and `--sort`
> Specifying `--mask` without `--vote` or `--sort` raises an error in
> `check_options()`.

> [!gotcha] `--prune` is automatic with aggregation operations in `mris_preproc`
> When called from [[mris_preproc]], `--prune` is passed automatically for
> `--paired-diff`, `--mean`, and `--std` modes. `--no-prune` overrides this.

> [!gotcha] `--gmean` requires frame count divisible by Ng
> If the total number of frames is not divisible by `Ng`, the behavior is
> undefined (no error raised at the check stage).

> [!gotcha] Default output type is `MRI_FLOAT`
> All integer-type inputs are up-cast to float in the output unless
> `--keep-datatype` is specified (which uses the last input's type).

> [!gotcha] `--add` only accepts scalar numbers, not volume files
> Attempting to add two volume files with `--add vol1 vol2` produces an error
> with a message pointing the user to [[fscalc]] for element-wise volume
> arithmetic.

## Typical Use Cases

### Average a set of statistical maps

```bash
mri_concat --i s1.mgh --i s2.mgh --i s3.mgh --mean --o mean_stat.mgh
```

### Concatenate runs for GLM input

```bash
mri_concat run1.mgz run2.mgz run3.mgz --o allruns.mgz
```

### Compute paired pre-post difference

```bash
mri_concat pre.mgh post.mgh --paired-diff --o diff.mgh
```

### Smooth data: prune zeros, compute std

```bash
mri_concat --f subjects.txt --prune --std --o group_std.mgh
```

### Scale output

```bash
mri_concat --i data.mgz --mul 1000 --o data_scaled.mgz
```

### Vote on segmentation (most frequent label)

```bash
mri_concat --i seg1.mgz --i seg2.mgz --i seg3.mgz \
           --vote --o voted_seg.mgz
```

### Combine lh and rh ribbon files

```bash
mri_concat lh.ribbon.mgz rh.ribbon.mgz --combine --o ribbon.mgz
```

## Pipeline Context

Not called by `recon-all`. Called by [[mris_preproc]] to concatenate
resampled per-subject files.

## Gotchas and Caveats

> [!gotcha] `--rms` expects a single input with multiple frames
> `--rms` computes the temporal RMS across frames of a **single** input volume.
> It is not designed to compute RMS across multiple separate input files.

> [!gotcha] `--scm` can produce enormous outputs
> The spatial covariance matrix for a surface overlay with 163,842 vertices
> would be 163,842 × 163,842 — clearly impractical. Use masking or PCA
> first.

> [!gotcha] NInMAX = 400,000 inputs
> The hard-coded limit of 400,000 input files is unlikely to be exceeded in
> practice, but is documented for completeness.

## Related Tools

- [[mris_preproc]] — the primary caller of `mri_concat` for surface group analysis
- [[mri_binarize]] — binary thresholding of volumes (often applied to mri_concat output)
- [[wiki/tools/mri_convert|mri_convert]] — format conversion for inputs/outputs

## Confidence and Gaps

High confidence on all operations and flag interactions — derived from the full
`check_options()`, main loop, and reduction function calls in the source.

> [!gap] Audit note: C1-flagged strings are error message text, not real flags
> The C1 audit flagged `--paired-xxx`, `--paried-avg`, `--paried-diff-norm`, `--paried-diff-norm1`, `--paried-diff-norm2`, and `--paried-diff-xxx`. Verification against `mri_concat/mri_concat.cpp`: `--paired-xxx` appears only in an error message string on line 278 (`"ERROR: --paired-xxx specified but there are an..."`), not as a parsed option. The `--paried-*` strings (note the typo: `paried` instead of `paired`) appear only in `check_options()` error messages on lines 1324–1339. All real paired-frame flags (`--paired-avg`, `--paired-diff`, `--paired-diff-norm`, `--paired-diff-norm1`, `--paired-diff-norm2`, `--paired-sum`) are already documented in the Paired-frame operations table above.

> [!gap] `fMRIcovariance()` variance implementation
> The internal variance computation (used by `--std` and `--var`) calls
> `fMRIcovariance()`, which is in a shared library. The exact normalization
> (N vs. N−1 denominator) is documented as sample std dev from the help text
> but not confirmed from the library source.

> [!gap] `MRIpca()` algorithm
> The PCA implementation in `MRIpca()` (via SVD) is not traced beyond the
> entry point. Output conventions (sign of components, scaling) are not
> documented here.
