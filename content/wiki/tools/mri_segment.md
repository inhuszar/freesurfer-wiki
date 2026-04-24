---
title: "mri_segment"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_segment/mri_segment.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_normalize]]"
  - "[[mri_pretess]]"
  - "[[mri_tessellate]]"
  - "[[mri_watershed]]"
  - "[[mri_em_register]]"
  - "[[recon-all]]"
  - "[[freeview-editing]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "MRIhistoSegment() and MRIcpolvMedianCurveSegment() are in shared libs — full plane-of-least-variance math not traced"
  - "MRIreclassifyWMCtxNonPar() / MRIclassifyAmbiguousNonPar() (new -seg code path) not fully traced"
tags:
  - segmentation
  - white-matter
  - autorecon2
---

# mri_segment

## Summary

`mri_segment` produces a binary white-matter (WM) segmentation volume from a
bias-corrected, intensity-normalised T1 volume. It works by an iterative
procedure: initial intensity thresholding to define WM / grey-matter /
ambiguous classes, local statistical estimation of class boundaries, plane-of-
least-variance curvature-based resolution of ambiguous voxels, Gaussian border
reclassification, bright-WM recovery, and morphological clean-up (1-D strand
removal + strand thickening). The output (`wm.seg.mgz`) is subsequently edited
by `mri_edit_wm_with_aseg` and topologically fixed by [[mri_pretess]] before
tessellation by [[mri_tessellate]].

## Source Information

- **Language:** C++
- **Source file(s):** `mri_segment/mri_segment.cpp` (1906 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_segment`

## Purpose and Context

WM segmentation is the entry point to the surface reconstruction stream. The
WM mask defines the topology of the cortical surface; errors here propagate
into every downstream surface stage. The tool sits between [[mri_normalize]]
(which produces `brain.mgz` at intensity 110 = WM) and `mri_edit_wm_with_aseg`
+ [[mri_pretess]] (which fix topology before tessellation by
[[mri_tessellate]]).

Two code paths exist:

1. **Default (no `-seg`):** pure intensity/curvature approach, requires only
   the T1 volume.
2. **aseg-guided (`-seg aseg.presurf.mgz`):** uses a pre-existing subcortical
   segmentation to improve threshold selection via
   `MRIreclassifyWMCtxNonPar()` and `MRIclassifyAmbiguousNonPar()`.

## Inputs

### Required Inputs

| Argument | Expected content |
|----------|-----------------|
| `invol` | Normalised T1 volume (usually `brain.mgz`), conformed 256³ 1 mm, WM ≈ 110 |
| `outvol` | Output path (usually `wm.seg.mgz`) |

### Input Assumptions

> [!assumption] WM intensity must be near 110
> The tool is hard-coded to `WHITE_MATTER_MEAN = 110` (from `classify.h`).
> Input must be normalised by [[mri_normalize]]; skipping normalisation
> produces garbage thresholds. The initial window is wm_low=90 – wm_hi=125.

> [!assumption] Conformed 256³ 1 mm isotropic volume required
> The tool converts non-UCHAR volumes to UCHAR on input. It does not conform;
> the caller (recon-all) must ensure the volume is already conformed.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `mri/wm.seg.mgz` | MGZ UCHAR | WM voxels = 255 (WM_EDITED_ON_VAL), non-WM = 0 |
| `segment.dat` | text | Estimated WM/GM mean±σ and final threshold values |

The `segment.dat` log is written by default (`-log` flag is ON). The WM label
value in the output is 255 (= `WM_EDITED_ON_VAL`), not 110. Voxels labelled
1 (`WM_EDITED_OFF_VAL`) are treated as deleted WM.

## Mathematical Foundations

### Algorithm Pipeline

The default (no `-seg`) pipeline proceeds in six stages:

**Stage 1: Initial intensity trinarisation.**

Assigns each voxel to one of three classes based on intensity $I$:

$$
\text{label}(v) = \begin{cases}
\text{MRI\_NOT\_WHITE} & I < \text{wm\_low} \text{ or } I > \text{wm\_hi} \\
\text{MRI\_AMBIGUOUS} & I \leq \text{gray\_hi} \\
\text{MRI\_WHITE} & \text{otherwise}
\end{cases}
$$

Initial defaults (before auto-detect): wm\_low = 90, wm\_hi = 125,
gray\_hi = 100. A Gaussian blur (σ = 0.25 voxels) is applied prior to
initial thresholding.

**Stage 2: Local histogram refinement (`MRIhistoSegment`).**

Computes local WM/GM histograms in an $11 \times 11 \times 11$ neighbourhood
(wsize = 11 voxels by default) and resolves boundary voxels using a 3σ rule.

**Stage 3: Auto-detect class statistics.**

`MRIcomputeClassStatistics` estimates Gaussian WM and GM distributions from
the partially-labelled volume. Thresholds are updated:

$$
\text{wm\_low} = \mu_{GM} + \sigma_{GM}
$$
$$
\text{gray\_hi} = \mu_{GM} + 2\sigma_{GM}
$$

Stages 1–2 are repeated with the new thresholds.

**Stage 4: Plane-of-least-variance curvature segmentation
(`MRIcpolvMedianCurveSegment`).**

Resolves remaining `MRI_AMBIGUOUS` voxels by fitting a local plane of least
variance in a `polvwsize × polvwsize × polvwsize` (default 5) neighbourhood
and using median curvature relative to that plane. This is the geometric step
that uses local surface orientation rather than just intensity.

**Stage 5: Gaussian border reclassification (`MRIreclassify`).**

Iterates `niter` times (default 1) — for each voxel in range
$[w\_low - 5,\; gray\_hi]$, uses a local Gaussian classifier fit to the
neighbouring WM/GM boundary voxels to make a final binary decision.

**Stage 6: Post-processing.**

- `MRIrecoverBrightWhite`: re-adds bright voxels ($I > wm\_hi$) within
  white\_sigma of the WM mean (slack = white\_sigma, pct\_thresh = 0.33).
- `MRIremoveWrongDirection`: removes voxels pointing in the wrong gradient
  direction (signed-distance heuristic, window = 3).
- `MRIremove1dStructures`: removes isolated strands with no 6-connected
  neighbours (max 10000 iterations, thresh = 2).
- `MRIthickenThinWMStrands`: recovers up to `nsegments` (20) thin strands
  thinner than `thickness` (4 mm) voxels by dilation.
- `MRIfindBrightNonWM` + binarise + mask: removes meningeal/dural tissue.
- `MRIfilterMorphology`: final morphological cleanup of edge/corner defects.

### aseg-guided code path (`-seg`)

When `-seg aseg.presurf.mgz ...` is provided:

1. `MRIreclassifyWMCtxNonPar(src, seg, 30)` — reclassifies WM/ctx voxels
   using the aseg labels rather than pure intensity thresholds.
2. `MRIclassifyAmbiguousNonPar(src, newseg, seg, Qwm, Qctx, NdilWM, NdilCtx)` —
   resolves ambiguous voxels with quantile-based classification.
3. Class statistics estimated from the aseg-guided initial classification.
4. Same thresholding and curvature-based resolution (stages 4–6) follows.

Parameters `Qwm=3.0`, `Qctx=3.0`, `NdilWM=2`, `NdilCtx=2` are hardcoded
defaults; they can be overridden via `-seg aseg ... Qwm Qctx NdilWM NdilCtx`.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `invol` | positional | — | Input normalised T1 volume (must be the next-to-last argument). |
| `outvol` | positional | — | Output WM segmentation volume (must be the last argument). |
| `--version`<br>`-version` | bool | — | Print version string and exit. |
| `--help`<br>`-help`<br>`-usage`<br>`-?`<br>`-H`<br>`-U` | bool | — | Print usage and exit. |
| `-MGH_MPRAGE`<br>`-MPRAGE` | bool | OFF | Sets `scan_type = MRI_MGH_MPRAGE`. If `-ghi`/`-gray_hi` was not already set, sets `gray_hi = 99`; if `-wlo`/`-wm_low` was not already set, sets `wm_low = 89`. Has no effect on the `-seg` (aseg-guided) code path. |
| `-WASHU_MPRAGE` | bool | OFF | Sets `scan_type = MRI_WASHU_MPRAGE` and unconditionally forces `gray_hi = 85`, `wm_low = 80` (for dark-GM WashU MP-RAGE). |
| `-no1d_remove` | bool | OFF | Disables removal of 1-D (isolated strand) structures in the post-processing stage. |
| `-slope <s>` | float | 1.0 | Sets both `pslope` and `nslope` curvature slopes simultaneously. |
| `-pslope <p>` | float | 1.0 | Curvature positive slope (passed to `MRIcpolvMedianCurveSegment`). |
| `-nslope <n>` | float | 1.0 | Curvature negative slope (passed to `MRIcpolvMedianCurveSegment`). |
| `-debug_voxel <x> <y> <z>` | int × 3 | — | Sets `Gx,Gy,Gz` for verbose per-voxel debugging in shared-library code. |
| `-auto` | bool toggle | auto=ON | Toggles `auto_detect_stats` (each occurrence flips the flag). |
| `-noauto` | bool | — | Forces `auto_detect_stats = 0` (does not toggle). |
| `-log` | bool | ON | Sets `log_stats = 1`. The default is already 1, so this flag is effectively a no-op; there is no `-nolog` flag. |
| `-keep` | bool | OFF | Sets `keep_edits = 1`. After processing, reads back the existing output file and re-imposes WM\_EDITED\_ON\_VAL (255) and WM\_EDITED\_OFF\_VAL (1) voxels from any prior manual edits. |
| `-ghi <h>`<br>`-gray_hi <h>` | float | 100.0 | Initial grey-matter high limit; also marks `gray_hi_set` so `-MPRAGE` will not override it. |
| `-glo <l>`<br>`-gray_low <l>` | float | 30 | Grey-matter low limit; sets `gray_low_set`. Used by the histogram/border classification stages. |
| `-wlo <l>`<br>`-wm_low <l>` | float | 90 | WM low intensity limit (before auto-detect widening); sets `wm_low_set`, which also disables the `-10` auto-widening at the start of the default path and prevents `-MPRAGE` from overriding it. |
| `-whi <h>`<br>`-wm_hi <h>` | float | 125 | WM high intensity limit; sets `wm_hi_set`. |
| `-wm_low_factor <f>` | float | 0.0 | Interpolation factor used to recompute `wm_low` from class statistics after auto-detect. See "Configuration interactions" — the formula differs between the default and `-seg` code paths. |
| `-nseg <n>` | int | 20 | Number of largest thin strands to thicken in `MRIthickenThinWMStrands`. |
| `-thicken <0\|1\|2>` | int | 1 | `0` = skip strand thickening; `1` = run strand thickening (default); `2` = "thicken-only" mode that skips the entire segmentation, runs `MRIremove1dStructures` (unless `-no1d_remove`), writes output, and exits. |
| `-thickenonly` | bool | OFF | Equivalent to `-thicken 2`: enters the thicken-only branch described above. |
| `-fillbg`<br>`-fill_bg` | bool toggle | OFF | Toggles `fill_bg` (each occurrence flips it). When set, calls `MRIfillBasalGanglia` in post-processing. |
| `-fillv`<br>`-fill_ventricles` | bool toggle | OFF | Toggles `fill_ventricles`. When set, calls `MRIfillVentricles` in post-processing. |
| `-dat <file>` | string | `segment.dat` | Path of the class-statistics log file (written when `log_stats != 0`). |
| `-seg <aseg> <Qwm> <Qctx> <NdilWM> <NdilCtx>` | string + 2×double + 2×int | — | Engages the aseg-guided code path. `aseg` is a path to a presurf aseg volume; `Qwm`, `Qctx` are quantile parameters and `NdilWM`, `NdilCtx` are dilation iteration counts passed to `MRIclassifyAmbiguousNonPar()`. Hardcoded global defaults are `Qwm=3.0`, `Qctx=3.0`, `NdilWM=2`, `NdilCtx=2` but the flag requires all five arguments. |
| `-polvwsize <w>` | int | 5 | Window size (voxels) for the plane-of-least-variance / median-curve segmentation step. |
| `-polvlen <l>` | float | 3.0 | Length parameter passed to `MRIcpolvMedianCurveSegment`. |
| `-min-wm-mask <vol>` | string | — | Reads a volume and stores it in `MinWMMask`. The loader rewrites every voxel to 1 (both branches of the `IS_WM`/`IS_HYPO` check assign 1 — the "else" branch appears to be a source bug), so the mask currently behaves as an all-ones mask covering the input volume's grid. |
| `-wsizemm <mm>` | double | 0 | If > 0, overrides `-w`: at runtime computes `wsize = round(wsizemm / mean_voxel_size)` from the input volume header. |
| `-diagno <n>`<br>`-diag_no <n>` | int | 0 | Sets the global `Gdiag_no` for shared-library diagnostics. |
| `-diag-write` | bool | OFF | OR-sets `DIAG_WRITE` into `Gdiag` (writes intermediate diagnostic volumes). |
| `-diag-verbose` | bool | OFF | OR-sets `DIAG_VERBOSE` into `Gdiag`. |
| `-b <sigma>` | float | 0.25 | *Intended* to set the Gaussian blur sigma used for pre-blurring (`blur_sigma`). See gotcha — the implementation reads `argv[1]` instead of `argv[2]`, so the supplied numeric value is **never actually parsed**; `blur_sigma` ends up set to `atof("-b") = 0.0`. |
| `-n <i>` | int | 1 | Number of border-reclassification iterations (passed to `MRIreclassify`). |
| `-t <t>` | int | 4 | Minimum strand thickness (mm) below which strands are eligible for thickening. |
| `-v` | bool toggle | OFF | Toggles the local `verbose` flag. |
| `-p <p>` | float | 0.8 | Percentage threshold parameter (`pct`); fraction (0–1). |
| `-x <i>` | int | 0 | Sets the integer `extract` flag (single-slice extraction debug option in shared library). Despite being a single letter, the argument is an integer, not a filename. |
| `-w <w>` | int | 11 | Local window size in voxels for the histogram-segmentation step (`MRIhistoSegment`). Overridden at runtime by `-wsizemm`. |

### Configuration Interactions

> [!gotcha] Flags must precede positional arguments
> The argument parser scans for options only until it encounters the first
> non-option argument. Placing flags after `invol` causes them to be silently
> ignored and may trigger a "Too many arguments" error. This is documented in
> the help text: *"Flagged options must be provided before positional
> arguments."*

> [!gotcha] `-MPRAGE` / `-WASHU_MPRAGE` set thresholds before auto-detect
> These scan-type flags set `gray_hi` and `wm_low` to scan-specific values,
> but if auto-detect is enabled (default), the auto-detect step will
> overwrite `wm_low` anyway (using `μ_GM + σ_GM`). The scan-type flags only
> meaningfully affect the initial trinarisation (Stage 1), not the final
> thresholds — unless `-noauto` is also set.

> [!gotcha] `-wm_low_factor` has sign-inverted formula in new vs. old path
> In the default path (no `-seg`): `wm_low = (1-f)*gray_mean + f*white_mean`.
> In the aseg-guided path (`-seg`): `wm_low = f*gray_mean + (1-f)*white_mean`.
> The factor is applied with opposite polarity depending on the code path.

> [!gotcha] `-thicken 2` (and `-thickenonly`) = thicken-only mode
> Setting `-thicken 2`, or equivalently passing `-thickenonly`, engages a
> special path that skips all segmentation: it copies the input,
> optionally runs `MRIremove1dStructures`, writes the result, and exits.
> The neighbouring code that would actually thicken strands is commented
> out, so in this mode the tool effectively just removes 1-D structures.

> [!gotcha] `-b <sigma>` is broken in 8.2.0
> The single-letter `-b` (blur sigma) handler reads `argv[1]` instead of
> `argv[2]`, so it parses the literal flag string `"-b"` with `atof()`,
> setting `blur_sigma = 0.0` regardless of the value supplied. It still
> consumes one argument, so the next token is silently swallowed. Use the
> default and do not rely on this flag until it is fixed upstream.

> [!gotcha] `-x` is an integer, not a filename
> Despite the suggestive single-letter name, `-x` sets an integer
> `extract` debug flag in the shared library, not an external options
> file. Passing a filename will produce a "could not scan option" fatal
> error.

> [!gotcha] `-min-wm-mask` collapses to all-ones
> The loader for `-min-wm-mask` runs an `IS_WM(m) || IS_HYPO(m)` test but
> assigns `1` in *both* branches of the `if/else`, so any non-null mask
> ends up as a uniform 1-mask. The flag is therefore not effective in
> 8.2.0.

> [!gotcha] `-keep` reads the existing output file
> When `-keep` is set, the tool reads the current `outvol` file to retrieve
> manual edits (WM\_EDITED\_ON\_VAL=255, WM\_EDITED\_OFF\_VAL=1) and copies
> them back into the new segmentation after processing.

## Typical Use Cases

### Use Case 1: Standard recon-all segmentation

```bash
# recon-all calls (using wsizemm instead of -w voxels):
mri_segment -wsizemm 13 brain.mgz wm.seg.mgz
```

When MPRAGE (`-IsMPRAGE`):
```bash
mri_segment -wsizemm 13 -mprage brain.mgz wm.seg.mgz
```

When WM edits exist (preserving them):
```bash
mri_segment -wsizemm 13 -keep brain.mgz wm.seg.mgz
```

### Use Case 2: Manual threshold control

```bash
mri_segment -wlo 85 -whi 120 -noauto brain.mgz wm.seg.mgz
```

## Pipeline Context

**autorecon2, WM Segmentation stage of [[recon-all]]** ([`scripts/recon-all:3305–3351`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3305-L3351))

```
mri_normalize → brain.mgz
                      ↓
          mri_segment -wsizemm 13
                      ↓
                 wm.seg.mgz
                      ↓
          mri_edit_wm_with_aseg
                      ↓
               wm.asegedit.mgz
                      ↓
               mri_pretess
                      ↓
                  wm.mgz
```

**recon-all call site ([`scripts/recon-all:3322`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3322)):**

```bash
mri_segment -wsizemm 13 [$-thicken 0] [$-keep] [$-mprage] [$-washu_mprage] \
    [WMSeg_wlo] [WMSeg_ghi] brain.mgz wm.seg.mgz
```

Default `MriSegWsizemm = 13` (recon-all line 140).

**Alternative code path (`WMSegFromASeg = 1`):**

When enabled (e.g., with `-use-synthseg`), `mri_segment` is skipped entirely.
Instead, [[recon-all]] uses [[mri_binarize]] on `aseg.presurf.mgz` to extract
WM labels (2=lh WM, 41=rh WM) and `mri_mask` to mask `brain.mgz`, yielding
`wm.seg.mgz` directly ([`scripts/recon-all:3334–3350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3334-L3350)).

## Gotchas and Caveats

> [!gotcha] wsizemm vs. wsize: voxel size matters
> recon-all passes `-wsizemm 13` (mm-based). The tool converts this to
> voxels as `round(wsizemm / mean_voxsize)`. For 1 mm isotropic data this
> gives wsize=13, larger than the historical default of 11. For non-1 mm
> data the window would differ.

> [!gotcha] Intensity auto-widening in default path
> When `auto_detect_stats=1`, the code pre-widens `wm_low` by 10 before
> the first trinarisation: `wm_low -= 10` ([`mri_segment.cpp:199`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_segment/mri_segment.cpp#L199)). The displayed
> initial wm\_low (90) is the value before widening; the actual first
> thresholding uses 80 as the lower bound. After auto-detect, the
> threshold is re-set from class statistics.

> [!gotcha] UCHAR conversion silently clips intensities
> If the input volume is not UCHAR, the tool calls `MRIchangeType(...,
> MRI_UCHAR, 0, 1000, 1)`. The third argument (0) is the clip\_low and
> the fourth (1000) is the clip\_hi. Values above 255 are clipped to 255.
> In practice `brain.mgz` is already UCHAR after mri_normalize, so this
> rarely triggers.

> [!gotcha] `-fillbg` and `-fillv` are toggled, not set
> Both flags call `toggle_flag = !toggle_flag`, so specifying `-fillbg`
> twice returns the flag to OFF. If called from a wrapper that passes the
> flag conditionally, be careful not to double-apply it.

> [!gotcha] segment.dat log is always written unless `-log` was removed
> The `log_stats` variable defaults to 1 ([`mri_segment.cpp:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_segment/mri_segment.cpp#L78)). There is no `-nolog`
> flag to suppress it. The dat file is always created in the CWD.

## Error Compensation and Guard Rails

- Input volume is automatically converted from any numeric type to UCHAR
  before processing; overflow is clipped.
- If class statistics produce non-finite values (NaN/Inf), the tool calls
  `ErrorExit` with a message to check the input volume.
- When `-keep` is specified, the existing output file is read; if it does
  not exist, a warning is printed (`ErrorPrintf`) and processing continues
  without keeping edits.

## Related Tools

- [[mri_normalize]] — produces the `brain.mgz` input (WM normalised to 110)
- [[mri_pretess]] — topology fix on the output `wm.mgz`
- [[mri_tessellate]] — tessellates `filled.mgz` to produce `?h.orig.nofix`
- [[mri_watershed]] — skull stripping (upstream)
- [[mri_em_register]] — Talairach registration (upstream, provides atlas prior)
- [[freeview-editing]] — GUI for manually correcting `wm.mgz` errors (Voxel Edit / Recon Edit modes) before rerunning `autorecon2-wm`

## Confidence and Gaps

Confidence **high** for the main algorithm pipeline, flag defaults, and
recon-all call sites (all read from source).

> [!gap] Plane-of-least-variance math not fully traced
> `MRIcpolvMedianCurveSegment` is defined in a shared library (`mrisurf.c` /
> `mri_classify.c`). The exact curvature computation and median-based
> resolution logic were not traced in this ingest session.

> [!gap] aseg-guided path not fully traced
> `MRIreclassifyWMCtxNonPar` and `MRIclassifyAmbiguousNonPar` are shared
> library functions. The exact quantile logic and dilation strategy were not
> read in detail.

## References

- Dale, A.M., Fischl, B., Sereno, M.I. (1999). *Cortical Surface-Based
  Analysis I: Segmentation and Surface Reconstruction.* NeuroImage,
  9(2):179–194. [cited in `mri_segment.cpp` header]
