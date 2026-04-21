---
title: "mri_binarize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_binarize/mri_binarize.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_concat]]"
  - "[[mri_label2vol]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
  - "[[freeview-volumes]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "MRIpercentThresh implementation details not fully traced"
  - "MRIfdr2vwth FDR algorithm not traced"
tags:
  - thresholding
  - masking
  - segmentation
  - utility
---

# mri_binarize

## Summary

`mri_binarize` applies thresholding, label matching, and morphological
operations to volume files. Its core operation is to classify each voxel as
"in" (value set to `BinVal`, default 1) or "out" (value set to `BinValNot`,
default 0) based on a criterion — an absolute intensity range, a relative
intensity range, an FDR threshold, or an exact match to a list of integer
label values. It also supports morphological operations (dilate, erode),
topology repair, mask application, segmentation replacement, and surface
tessellation from the result. Output type defaults to `MRI_INT`.

## Source Information

- **Language:** C++
- **Source file:** `mri_binarize/mri_binarize.cpp` (1586 lines, author: Douglas N. Greve)
- **Binary location:** `$FREESURFER_HOME/bin/mri_binarize`

## Purpose and Context

`mri_binarize` is a multi-purpose volume manipulation tool used heavily in
group analysis, region-of-interest construction, and segmentation post-processing.
Common tasks include:

- Creating binary ROI masks from statistical maps (by thresholding)
- Extracting specific tissue labels from a segmentation volume like `aseg.mgz`
- Applying FDR correction to significance maps
- Morphological cleanup of binary masks (dilation, erosion, hole-filling)
- Replacing one label value with another in a segmentation

Not called by `recon-all` directly; used in downstream analysis.

## Inputs

### Required Inputs

- `--i <invol>` — input volume (any format recognized by FreeSurfer; typically
  [[mgz]] or NIfTI)

### Optional Supporting Inputs

- `--mask <maskvol>` — mask volume; same dimensions as input
- `--merge <mergevol>` — volume whose values are used for out-of-range voxels
  instead of `BinValNot`

## Outputs

### Files Created

- `--o <outvol>` — binary (or label) output volume. Default type: `MRI_INT`.
  With `--uchar`, type is `MRI_UCHAR`.
- `--count <file>` — ASCII file with 4 whitespace-separated values:
  `nhits  nhits*voxvol  nvox  100*nhits/nvox`
- `--surf <surfname>` — surface tessellation of the binary mask (optional)

## Mathematical Foundations

### Threshold modes

**Absolute threshold:** voxel included iff $\text{MinThresh} \le v \le \text{MaxThresh}$.

**Relative threshold:** $\text{MinThresh} = r_{\min} \times \bar{v}$ where
$\bar{v}$ is the global mean of the input volume (via `RFglobalStats()`).

**Percentile threshold:** the minimum threshold is set so that the top $P$\% of
voxels pass. Computed via `MRIpercentThresh()`.

**FDR threshold:** input is assumed to be $-\log_{10}(p)$. An FDR correction is
applied via `MRIfdr2vwth()` to find the significance threshold $z^*$ such that
the expected proportion of false positives among all voxels exceeding $z^*$ does
not exceed the specified rate. Three sign modes: absolute value (default),
positive-only, negative-only.

### Match mode

Exact integer equality: $|v - m_k| < 2 \cdot \text{FLT\_MIN}$ for at least one
element $m_k$ in the match list.

### Morphological operations

**Dilation:** iterative 26-connected neighbourhood expansion via `MRIdilate()`.

**Erosion:** iterative neighbourhood shrinkage via `MRIerodeNN()` (corner =
26-connected, edge = 18-connected, face = 6-connected).

## Configuration Options

### Operating Mode (choose one)

| Mode | Trigger flags | Description |
|------|--------------|-------------|
| Threshold | `--min` / `--max` / `--rmin` / `--rmax` / `--pct` / `--fdr` | Voxels in range → BinVal |
| Match | `--match` / `--match-ctab` / convenience aliases | Exact label equality → BinVal |
| Replace-only | `--replace`/`--replace-nn` without threshold, or any `--replaceonly*` | Copy input, substitute values |
| One-hot encode (early-exit) | `--ohe` | Build multi-frame one-hot from segmentation, then exit |
| RAS-centred crop (early-exit) | `--crop-around-ras` | Crop a voxel-FoV box around a RAS centre, then exit |
| Vertex dilate (early-exit) | `--dilate-vertex` / `--dilate-vertex-sum` | Surface-based vertex neighbourhood mask, then exit |

### Complete Flag Reference

#### Input / output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <vol>` | string | required | Input volume |
| `--o <vol>` | string | one of `--o`/`--count`/`--surf` required | Output volume |
| `--mask <vol>` | string | none | Mask volume; voxels with `mask < mask-thresh` are treated as out-of-range. Must match input dimensions. |
| `--mask-thresh <t>` | double | 0.5 | Cutoff applied to mask volume |
| `--merge <vol>` | string | none | Out-of-range voxels get the merge volume's value instead of `BinValNot`. Must match input dimensions. |
| `--copy <vol>` | string | none | Loaded and dimension-checked but otherwise unused in current code (vestigial). |
| `--uchar` | flag | off | Write output as `MRI_UCHAR` instead of `MRI_INT` |
| `--count <file>` | string | none | Write hit-count statistics to ASCII file (auto-enables counting) |
| `--no-count` | flag | counting on | Skip first-frame voxel count (faster on large volumes) |

#### Absolute / relative thresholds

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--min <min>` | double | −infinity | Minimum threshold (inclusive: voxel kept if `val >= min`) |
| `--max <max>` | double | +infinity | Maximum threshold (inclusive: voxel kept if `val <= max`) |
| `--rmin <rmin>` | double | none | Min = rmin × global mean (computed via `RFglobalStats()`) |
| `--rmax <rmax>` | double | none | Max = rmax × global mean (computed via `RFglobalStats()`) |
| `--pct <P>` | double | none | Min set so the top P% of voxels (in the optional mask) pass; uses `MRIpercentThresh()` |

#### FDR thresholding

`--fdr` calls `MRIfdr2vwth()` with the input assumed to be $-\log_{10}(p)$. The
returned `FDRThresh` is then used to set MinThresh (positive/abs sign) or
MaxThresh (negative sign).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fdr <rate>` | double | none | FDR rate (e.g. 0.05); enables FDR mode |
| `--fdr-abs` | flag | default | `FDRSign = 0`; use \|input\| (also forces `--abs`) |
| `--fdr-pos` | flag | off | `FDRSign = +1`; positive tail only |
| `--fdr-neg` | flag | off | `FDRSign = −1`; negative tail only (sets MaxThresh = −FDRThresh) |

#### Pre-processing (applied before binarization)

| Flag | Argument | Description |
|------|----------|-------------|
| `--abs` | flag | Take absolute value of input via `MRIabs()` before thresholding |
| `--neg` | flag | Multiply input by −1 via `MRImultiplyConst()` |
| `--frame-sum` | flag | Sum all frames via `MRIframeSum()` and binarize the single result; sets `DoFrameLoop=0` |
| `--frame-and` | flag | Sum all frames, set `MinThresh = nframes − 0.5` (logical AND across frames); sets `DoFrameLoop=0` |
| `--frame <N>` | int | Use only frame N (0-based); sets `DoFrameLoop=0`. Default behaviour (no flag) is to loop over all frames. |

#### Match mode

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--match <v1> [v2 ...]` | one or more ints | Append integer label values to the match list. Greedy: consumes all following integer args. May be repeated. |
| `--match-ctab <ctab> [xid1 xid2 ...]` | ctab file + optional ints | Add every valid entry of the ASCII colour table to the match list, excluding any explicitly listed IDs. |

#### Predefined match sets (convenience aliases)

| Flag | Labels matched |
|------|---------------|
| `--ctx-wm` / `--wm` | 2, 41, 77, 251–255 |
| `--all-wm` | 2, 41, 77, 251–255, 7, 46 |
| `--ventricles` | 4, 5, 14, 43, 44, 72, 31, 63 |
| `--wm+vcsf` | All-WM + ventricles |
| `--gm` | Match WM+VCSF+background then invert (BinVal=0, BinValNot=1) |
| `--subcort-gm` | Bilateral thalamus, caudate, putamen, pallidum, hippocampus, amygdala, accumbens, VentralDC, substantia nigra, cerebellar cortex |
| `--scm-lh` | Left subcortical mass; also sets RemoveIslands=1, FillHoles=1 |
| `--scm-rh` | Right subcortical mass; also sets RemoveIslands=1, FillHoles=1 |

#### Replace operations

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--replace <v1> <v2>` | int int | Replace all v1 → v2; transitive; repeatable |
| `--replaceonly <v1> <v2>` | int int | Replace v1 → v2 but copy full input (no binarization) |
| `--replace-nn <v1> <W>` | int int | Replace v1 with nearest-neighbour value within W voxel radius |
| `--replaceonly-nn <v1> <W>` | int int | Same + copy full input |
| `--no-transitive-replace` | flag | off | Disable transitive chaining of `--replace` |

#### Output value control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--binval <v>` | int | 1 | Value assigned to in-range voxels |
| `--binvalnot <v>` | int | 0 | Value assigned to out-of-range voxels (when no `--merge`) |
| `--inv` | flag | off | Sets `BinVal=0`, `BinValNot=1` |
| `--bincol` | flag | off | After binarization, replace each in-range voxel with its 0-based column index via `MRIbinMaskToCol()` |

#### Morphological operations (applied post-binarization)

Order in code: dilation, then 2D erosion, then NN erosion. Only one connectivity
mode (face/edge/corner) survives in `nErodeNN`/`NNType` because each flag
overwrites both — they are not additive.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--dilate <N>` | int | 0 | Apply N passes of `MRIdilate()` to the binarized volume |
| `--erode <N>` / `--erode-corner <N>` | int | 0 | Set `nErodeNN=N`, `NNType=NEAREST_NEIGHBOR_CORNER` (26-connected). The two flag names are aliases. |
| `--erode-face <N>` | int | 0 | Set `nErodeNN=N`, `NNType=NEAREST_NEIGHBOR_FACE` (6-connected) |
| `--erode-edge <N>` | int | 0 | Set `nErodeNN=N`, `NNType=NEAREST_NEIGHBOR_EDGE` (18-connected) |
| `--erode2d <N>` | int | 0 | Apply N passes of `MRIerode2D()` (slice-wise) before NN erosion |
| `--erode-edges` | flag | off | Pass `ErodeEdges=1` into `MRIerodeNN()` so volume-boundary voxels are eroded |
| `--no-erode-edges` | flag | (default) | Restore `ErodeEdges=0` |

#### Topology repair (applied post-morphology)

| Flag | Default | Description |
|------|---------|-------------|
| `--remove-islands` | off | Remove disconnected components via `MRIremoveVolumeIslands()` |
| `--no-remove-islands` | (default) | Disable island removal (overrides `--scm-lh`/`--scm-rh` defaults if listed after them) |
| `--fill-holes` | off | Fill interior holes via `MRIremoveVolumeHoles()` |
| `--no-fill-holes` | (default) | Disable hole filling |
| `--fix-vol-topo` | off | Fix volume topology via `MRIvolTopoFix()` |
| `--no-fix-vol-topo` | (default) | Disable topology fix |

#### Bounding box / output crop

| Flag | Argument | Description |
|------|----------|-------------|
| `--bb <N>` / `--crop <N>` | int | Crop output to bounding box of non-zero voxels (via `REGIONgetBoundingBox()` and `MRIextractRegion()`) with N-voxel padding |
| `--crop-around-ras <out> <invol> <lta\|nolta\|0> <rCent aCent sCent\|cras vol ignore> <rFoV aFoV sFoV> [iKeep1 ...]` | 9+ args | Stand-alone early-exit mode: load `invol`, optionally apply an LTA, crop a voxel-FoV box centred on the given RAS (or on a volume's `cras`), keep the listed segment IDs via `MRIcropAroundRAS()`, write to `out`, then exit. Bypasses all other binarization logic. |
| `--zero-edges` | flag | During binarization, force the first/last column, row, and slice planes to `BinValNot` (or merge value) |
| `--zero-slice-edges` | flag | Same but only for the slice-direction (first/last) planes |

#### Surface tessellation

| Flag | Argument | Description |
|------|----------|-------------|
| `--surf <surfname>` | string | Generate surface mesh of binarized volume via `MRIStessellate()` (tessellates the iso-surface of `BinVal`) |
| `--surf-smooth <N>` | int | Apply N iterations of `MRISaverageVertexPositions()` to the tessellated surface |
| `--reverse` | flag | Reverse face order via `MRISreverseFaceOrder()` and recompute metric properties |
| `--dilate-vertex <vno> <surf> <radius> <outmask>` | 4 args | Stand-alone early-exit mode: dilate around vertex `vno` on `surf` until summed area covers $\pi r^2$, write mask, exit. Calls `MRISdilateVertexToSum()`. |
| `--dilate-vertex-sum <vno> <surf> <measure\|nofile\|area> <target> <outmask>` | 5 args | Stand-alone early-exit mode: dilate around `vno` until the supplied per-vertex `measure` (or area) sums to `target`, write mask, exit. |

#### Colour tables

| Flag | Argument | Description |
|------|----------|-------------|
| `--ctab <ctab>` | ASCII ctab file | Read colour table via `CTABreadASCII()` and embed in the output volume |
| `--copy-ctab` | flag | Copy colour table from input to output (also automatic when `replace_only` is in effect) |

#### One-hot encoding (stand-alone mode)

| Flag | Arguments | Description |
|------|-----------|-------------|
| `--ohe <seg> <ohe-out> <segno1> [segno2 ...]` | volume + path + ints | Read `seg`, build a multi-frame one-hot encoding via `MRIoneHotEncode()` for the listed segment IDs, write to `ohe-out`, and exit immediately. All other flags are ignored. |

#### Miscellaneous and diagnostics

| Flag | Argument | Description |
|------|----------|-------------|
| `--threads <N>` / `--nthreads <N>` | int | Set OpenMP thread count (no-op if compiled without OpenMP) |
| `--debug` | flag | Set `debug=1` |
| `--noverbose` | flag | Suppress informational output (skip `dump_options`, count messages, etc.) |
| `--checkopts` | flag | Run `parse_commandline()` and `check_options()` then return without processing |
| `--nocheckopts` | flag | Restore default (process inputs after option parse) |
| `--help` | flag | Print full help text and exit |
| `--version` | flag | Print version and exit |

### Configuration Interactions

`check_options()` enforces the following hard rules:

1. `--i` is mandatory.
2. At least one of `--o`, `--count`, or `--surf` must be supplied.
3. Threshold flags (`--min`/`--max`/`--rmin`/`--rmax`) and match flags
   (`--match`, `--match-ctab`, the predefined match aliases) are mutually
   exclusive — combining them is a fatal error.
4. `--rmin` and `--min` are mutually exclusive; `--rmax` and `--max` likewise.
5. If neither threshold nor match is set, but `--replace`/`--replace-nn`/
   `--replaceonly` was given, `replace_only` is auto-enabled.
6. With `--max` and `--min` both set, `MaxThresh < MinThresh` is rejected.
7. If `--max < --min` and neither match nor FDR is in use, the run aborts.

> [!gotcha] Replace-only mode bypasses binarization
> When only `--replace`/`--replace-nn` is specified without any threshold or
> match flag, `check_options()` auto-sets `replace_only = 1` and the
> binarization loop is skipped. The output is a copy of the input with the
> requested value substitutions. `--replaceonly`/`--replaceonly-nn` set
> `replace_only` directly even alongside other modes.

> [!gotcha] `--gm` inverts BinVal/BinValNot
> The `--gm` flag matches WM, ventricles, 4th ventricle, choroid plexus,
> background, and CSF, then swaps `BinVal=0, BinValNot=1`. This produces grey
> matter as 1 by exclusion. If `--gm` is supplied **after** `--binval` or
> `--binvalnot`, those user values are silently overwritten.

> [!gotcha] `--merge` suppresses `BinValNot`
> When `--merge` is specified, out-of-range/masked voxels get their values from
> the merge volume rather than `BinValNot`. Specifying `--binvalnot` alongside
> `--merge` has no effect on those voxels.

> [!gotcha] `--frame-sum` and `--frame-and` both set `DoFrameLoop=0`
> Both flags cause the tool to reduce across frames before binarizing. An
> explicit `--frame <N>` is redundant when either is set. `--frame-and` also
> auto-sets `MinThresh = nframes − 0.5`, so combining it with an explicit
> `--min` produces whichever value is set last.

> [!gotcha] `--fdr-abs` forces `--abs`
> When `FDRSign==0` (the default), the FDR pathway sets `DoAbs=1` after
> computing the threshold, so the input is replaced with its absolute value
> before the threshold loop runs.

> [!gotcha] Erosion connectivity flags are not additive
> `--erode`, `--erode-corner`, `--erode-face`, and `--erode-edge` all write
> into the same `nErodeNN`/`NNType` slots. The last one wins. To compose
> multiple erosion modes you must run `mri_binarize` more than once.

> [!gotcha] Dead `--erode` branch
> The parser has two consecutive `--erode` clauses. The first (shared with
> `--erode-corner`) is matched first, so the second branch — which used to set
> `nErode3d` — is unreachable. `nErode3d` is therefore effectively unused.

## Typical Use Cases

### Threshold a statistical map

```bash
# Keep voxels with |t| > 2.0 in a t-stat volume
mri_binarize --i tstat.mgz --abs --min 2.0 --o tstat_mask.mgz
```

### Extract WM label from aseg

```bash
mri_binarize --i $SUBJECTS_DIR/bert/mri/aseg.mgz \
             --wm \
             --o wm_mask.mgz
```

### Extract ventricles with dilation

```bash
mri_binarize --i $SUBJECTS_DIR/bert/mri/aseg.mgz \
             --ventricles \
             --dilate 2 \
             --o ventricles_dilated.mgz
```

### Apply FDR correction to −log10(p) map

```bash
mri_binarize --i neglog10p.mgz --fdr 0.05 --o fdr_mask.mgz
```

### Replace a label value in a segmentation

```bash
# Replace label 7 with label 8 in a segmentation
mri_binarize --i seg.mgz --replaceonly 7 8 --o seg_fixed.mgz
```

### Build a grey matter mask from aseg

```bash
mri_binarize --i $SUBJECTS_DIR/bert/mri/aseg.mgz --gm --o gm_mask.mgz
```

### Count mask voxels and volume

```bash
mri_binarize --i mask.mgz --min 0.5 --o /dev/null --count mask_stats.txt
# Produces: nhits  nhits*voxvol  nvox  100*nhits/nvox
```

## Pipeline Context

Not called by `recon-all`. Used in downstream group-level analysis, ROI
definition, and segmentation quality control.

## Gotchas and Caveats

> [!gotcha] Default output type is `MRI_INT`, not `MRI_FLOAT`
> Output defaults to 32-bit signed integer. For compatibility with tools that
> expect float data, use `mri_convert` after binarization, or verify the
> downstream tool is type-agnostic.

> [!gotcha] `--replace` is transitive by default
> Multiple `--replace` calls are applied sequentially. `--replace 1 2 --replace
> 2 3` will map both 1 and 2 to 3 (since 1→2 is applied first, then 2→3 is
> applied to the result). Use `--no-transitive-replace` to prevent chaining.

> [!gotcha] `--scm-lh`/`--scm-rh` auto-enable topology operations
> These flags silently set `RemoveIslands=1` and `FillHoles=1`. This is usually
> desirable but may surprise users who do not expect morphological operations
> when no erosion/dilation flag was specified.

> [!gotcha] One-hot encoding is a standalone early-exit mode
> `--ohe seg ohe segno1 ...` invokes `MRIoneHotEncode()` and exits immediately
> after. All other flags are ignored.

## Related Tools

- [[mri_concat]] — concatenation and frame-wise operations
- [[mri_label2vol]] — convert surface labels or annotation to a volume
- [[mri_convert]] — format conversion
- [[mris_anatomical_stats]] — uses binary masks for morphometric statistics
- [[freeview-volumes]] — GUI for inspecting binary outputs; use `colormap=binary` or `colormap=heat` with `heatscale` to visualise thresholded volumes

## Confidence and Gaps

High confidence on all modes and flag interactions — derived from the full
`check_options()` and main binarization loop in the source.

> [!gap] `MRIpercentThresh` implementation
> The exact algorithm for computing the top-P% threshold is not traced into
> `MRIpercentThresh()` in the shared library. It likely uses sorting or a
> histogram approach, but the specific implementation is not documented here.

> [!gap] `MRIfdr2vwth` FDR algorithm
> The Benjamini-Hochberg / q-value computation inside `MRIfdr2vwth()` is not
> traced. The sign-mode behaviour observed in `mri_binarize.cpp` is: `0` →
> abs (also forces `MRIabs()`), `+1` → positive tail (sets MinThresh = +T),
> `−1` → negative tail (sets MaxThresh = −T). The internal q-value derivation
> is in the shared library and not documented here.
