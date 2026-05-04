---
title: "mri_nu_correct.mni"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "scripts/mri_nu_correct.mni"
  - "scripts/mri_nu_correct.mni.help.xml"
  - "mri_convert/mri_make_uchar.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_normalize]]"
  - "[[talairach_avi]]"
  - "[[mri_em_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-22
gaps:
  - "MNI nu_correct's exact B-spline fitting algorithm is only documented in Sled 1997/1998 papers; not re-derived here"
  - "ANTs N4 backend's exact parameter mapping to the tcsh wrapper flags still needs confirmation — only --threads-nondetermistic and -x mask are clearly passed"
  - "Help-text vs. default-in-code disagreement on --n default (help says 4, code sets 1, recon-all sets 2); contradictory"
tags:
  - bias-field
  - intensity-correction
  - n3
  - n4
  - wrapper
---

# mri_nu_correct.mni

## Summary

`mri_nu_correct.mni` is a tcsh wrapper around the MNI N3 (`nu_correct`)
bias-field-correction tool. Given a structural MRI volume in any format
readable by [[wiki/tools/mri_convert|mri_convert]], it produces an output volume of the same
geometry in which the multiplicative intensity non-uniformity ("bias
field") that is typical of MRI has been estimated and removed. It
supports three different backends: the original MNI N3 (the default,
via the `nu_correct` binary shipped with FreeSurfer), ANTs N3
(`N3BiasFieldCorrection`, when `--ants-n3` is passed), and ANTs N4
(`AntsN4BiasFieldCorrectionFs`, when `--ants-n4` is passed). An
optional post-processing step (`--uchar <talxfm>`) delegates to
`mri_make_uchar` to rescale the histogram so that white matter centres
at intensity ~110 in an 8-bit output, which is the representation
most downstream FreeSurfer tools assume.

## Source Information

- **Language:** tcsh script (shell). The wrapper is ~480 lines of
  parsing logic plus ~70 lines of help text; the actual bias-field
  estimation is performed by an external binary (MNI `nu_correct`,
  ANTs `N3BiasFieldCorrection`, or `AntsN4BiasFieldCorrectionFs`).
- **Source file(s):**
  - `scripts/mri_nu_correct.mni` (546 lines) — the wrapper.
  - `scripts/mri_nu_correct.mni.help.xml` — XML help source.
  - `mri_convert/mri_make_uchar.cpp` (289 lines) — the post-processor
    used by the `--uchar` flag.
- **External dependencies at run time:**
  - `nu_correct` (MNI) — the default N3 engine; shipped under
    `$FREESURFER_HOME/mni/bin/nu_correct`.
  - `N3BiasFieldCorrection` (ANTs) — used with `--ants-n3`.
  - `AntsN4BiasFieldCorrectionFs` — used with `--ants-n4`.
  - `bc` — the wrapper uses `bc -l` to compute the rescale factor.
  - [[wiki/tools/mri_convert|mri_convert]], [[mri_binarize]], `mri_segstats`, [[mris_calc]] —
    used as inner steps.
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_nu_correct.mni`

## Purpose and Context

Structural MRI scans acquired on receiver-coil-heterogeneous
scanners, especially at 3 T and above, contain a smooth multiplicative
intensity gradient ("bias field", "non-uniformity") that makes
intensity-based tissue classification (segmentation,
thresholding, normalisation) unreliable. The MNI N3 algorithm (Sled,
Zijdenbos & Evans, 1998) iteratively estimates this field by
maximising the entropy of the log-transformed intensity histogram
subject to a smoothness constraint. `mri_nu_correct.mni` is the
FreeSurfer-side wrapper that makes `nu_correct` usable on FreeSurfer
data: it converts `.mgz` → `.mnc` → `.mgz` around each call, allows
multiple outer iterations, rescales the output to preserve the global
mean of the input, and optionally applies the `mri_make_uchar`
histogram-centring step that downstream FreeSurfer tools expect.

Within [[wiki/pipelines/recon-all|recon-all]], it is called **twice** during autorecon1:

1. **Inside the `talairach:` block** (`scripts/recon-all:1781`), as a
   preprocessing step for `talairach_avi`:
   ```bash
   mri_nu_correct.mni --no-rescale --i orig.mgz --o orig_nu.mgz \
       --n 1 --proto-iters 1000 --distance 50
   ```
   No `--uchar` is used here, because the Talairach transform does
   not yet exist.

2. **In the `DoNuIntensityCor` block** (`scripts/recon-all:2054`), to
   produce `nu.mgz` which all subsequent stages consume:
   ```bash
   mri_nu_correct.mni --i orig.mgz --o nu.mgz \
       --uchar transforms/talairach.xfm \
       --n 2
   ```
   The `--uchar` flag triggers `mri_make_uchar`, which uses the
   (now existing) `talairach.xfm` to find a ball of mostly-brain
   voxels and to rescale the histogram so the white-matter peak sits
   at intensity 110.

Outside `recon-all`, it is the canonical way to apply N3/N4 bias-field
correction to a FreeSurfer-format volume.

## Inputs

### Required Inputs

| Flag | Description |
|------|-------------|
| `--i <invol>` | Input MRI volume in any format readable by [[wiki/tools/mri_convert|mri_convert]] (MGZ, NIfTI, ANALYZE, …). |
| `--o <outvol>` | Output volume path. Format is picked from the extension. If the output format is COR the output directory must exist. |

### Optional Inputs

| Flag | Description |
|------|-------------|
| `--mask <maskvol>` | A binary mask restricting the fit to voxels where `maskvol > 0`. The wrapper binarises it with `mri_binarize --min 1`. |
| `--mask-dilate <n>` | Dilate the binarised mask by `n` voxels (`mri_binarize --dilate n`) before using it. |
| `--uchar <talxfm>` | Post-process the corrected volume with `mri_make_uchar` using the provided Talairach transform to centre WM intensity at ~110 and cast to `uint8`. Must point to an existing `talairach.xfm`, `.lta`, or compatible transform file. |

### Input Assumptions

- The input is a **single-frame anatomical volume** (T1, T2 or FLAIR)
  with *spatially smooth* bias. Functional time series, diffusion, or
  volumes with sharp intensity discontinuities will confuse the fit.
- The MNI `nu_correct` backend requires the input in **MINC format**
  internally, so the wrapper always calls `mri_convert` first to
  produce a `.mnc` file in `tmpdir`. Upon completion, the output is
  converted back to the requested format.
- With `--uchar`, the input must be a **T1-weighted** volume whose
  histogram has a visible WM peak near the 90th percentile within
  the Talairach-defined ball — this is the algorithm's only way to
  know "what intensity WM is". Non-T1 contrasts will produce an
  output in which the rescaling is meaningless (see gotcha).

> [!assumption] Bias field is multiplicative, log-smooth, and
> spatially smooth
> The N3 model assumes
> $I(\mathbf{x}) = f(\mathbf{x})\cdot I_0(\mathbf{x}) + n$, i.e. the
> observed intensity is the true tissue intensity scaled by a
> smoothly varying non-uniformity field. If the actual artefact is
> additive, or is dominated by sharp coil-sensitivity
> discontinuities, the fit will be poor. The assumption underlies
> every subsequent FreeSurfer stage; if you edit `nu.mgz` by hand you
> will have to also edit `T1.mgz` / `brain.mgz` (or re-run from this
> stage).

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<outvol>` | MGZ / NIfTI / … | Bias-corrected volume. Geometry and (by default) dynamic range match the input, except that when `--uchar` is passed the data type is cast to `uint8` and the histogram is rescaled. |
| `<outdir>/mri_nu_correct.mni.log` | text | Full log of the wrapper run, unless `--log` is overridden. |
| `<tmpdir>/nu0.mnc`, `nu1.mnc`, …, `nu<nIters>.mnc` | MINC | Intermediate MNI backend outputs (deleted at end unless `--no-cleanup`). |

When the ANTs backend is used, the intermediates are kept in the
`tmpdir` as `nu0.mgz` (and, for `--ants-n4`, `.mgz` outputs from
`AntsN4BiasFieldCorrectionFs`).

## Mathematical Foundations

### N3 (Sled 1998) bias-field estimation

N3 (*Non-parametric Non-uniform intensity Normalisation*) does not
assume a parametric intensity distribution. It iteratively estimates
the bias field $\hat{f}$ by finding the smooth field that, when
divided out of the observed intensities, maximises the entropy of
the resulting histogram.

$$
\hat{f} = \arg\max_{f \in \mathcal{S}} \; H\!\left(\log \frac{I}{f}\right),
\qquad \mathcal{S} = \{\text{smooth B-splines}\}.
$$

The optimisation is performed in log-intensity space with a
B-spline regularisation controlled by `-distance <mm>` (spacing of
the B-spline knots) and an iterative sharpening / smoothing loop
controlled by `-iterations <Np>` and `-stop <CV>`. See Sled, Zijdenbos
& Evans, *IEEE TMI* 17(1):87–97, 1998 for the full derivation.

### Wrapper-level iteration

Let $F_N$ denote one end-to-end invocation of the underlying
`nu_correct` binary. The wrapper composes $F_N$ with itself `nIters`
times:

$$
\mathbf{v}_\text{out} = \underbrace{F_N \circ F_N \circ \cdots \circ F_N}_{n=\mathtt{nIters}} (\mathbf{v}_\text{in}).
$$

Each outer iteration uses a fresh `tmpdir/<m>/` working directory
and reads `tmpdir/nu<m>.mnc` to produce `tmpdir/nu<m+1>.mnc`
([`scripts/mri_nu_correct.mni:150–174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L150-L174)). This is distinct from the
`-iterations` parameter passed to `nu_correct` itself (`--proto-iters`
in the wrapper).

### Post-iteration rescaling (`--rescale`, default on)

After the final `nu_correct` call, the wrapper computes the global
means of input and output over a "ones" mask (i.e. all non-trivial
voxels):

$$
\text{scale} = \frac{\langle I_\text{in}\rangle}{\langle I_\text{out}\rangle},
\quad \mathbf{v}_\text{out} \leftarrow \text{scale}\cdot\mathbf{v}_\text{out}.
$$

This is implemented with `mri_segstats --avgwf` on an all-ones
mask and [[mris_calc]] `mul` ([`scripts/mri_nu_correct.mni:183–210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L183-L210)).
It guarantees that the output has the same global mean intensity as
the input, which preserves the input dynamic range for downstream
tools that use absolute intensity thresholds.

> [!internal] `mri_make_uchar` uses a Talairach ball to find WM
> When `--uchar <talxfm>` is passed, the tcsh wrapper calls
> `mri_make_uchar $OutVol $talxfm $OutVol` ([line 228](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L228)). Inside
> `mri_make_uchar` (`mri_convert/mri_make_uchar.cpp`):
> 1. Read the Talairach LTA and invert it so that a point in the
>    subject's native space can be mapped to the atlas.
> 2. Define a ball of radius `MAX_R = 50` mm centred at the atlas
>    origin; select voxels whose atlas coordinates fall inside this
>    ball — this is the "mostly-brain" region.
> 3. Build an intensity histogram of those voxels, ignore the
>    bottom `FIRST_PERCENTILE = 0.01` (CSF/noise) and read off the
>    `WM_PERCENTILE = 0.90` as the presumed white-matter peak.
> 4. Rescale the entire volume so that this WM peak lands at
>    intensity 110 (the canonical target for FreeSurfer's
>    [[mri_normalize]]).
> 5. Cast the result to `uchar`.
> The three percentile constants can be overridden with `-F`, `-W`,
> `-R`, but neither `mri_nu_correct.mni` nor `recon-all` exposes that.

## Configuration Options

### Complete Flag Reference

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i <vol>` | path | required | Input volume. |
| `--o <vol>` | path | required | Output volume. |
| `--mask <vol>` | path | — | Restrict the fit to `mask > 0`. |
| `--mask-dilate <n>` | int | 0 | Dilate the mask by `n` voxels before use. |
| `--n <N>` | int | **1** (see gotcha) | Number of outer iterations (times the underlying backend is re-applied). |
| `--proto-iters <Np>` | int | nu_correct's own default | Passed as `-iterations Np` to `nu_correct` (inner N3 iterations). |
| `--stop <CV>` | float | nu_correct's default | Passed as `-stop CV` to `nu_correct`; the coefficient-of-variation threshold for N3 convergence. |
| `--distance <mm>` | float | nu_correct's default | Passed as `-distance mm` to `nu_correct`; sets the B-spline knot spacing. |
| `--fwhm <mm>` | float | nu_correct's default | Passed as `-fwhm mm` to `nu_correct`. |
| `--shrink <f>` | int | nu_correct's default | Passed as `-shrink f` to `nu_correct`; coarse-resolution subsampling factor for the fit. |
| `--lambda <λ>` | float | nu_correct's default | Passed as `-lambda λ` to `nu_correct`; B-spline regularisation strength. |
| `--uchar <talxfm>` | path | off | Run `mri_make_uchar` after bias correction, using `<talxfm>` to locate a "mostly brain" ball and centre the WM histogram peak at 110. Output is cast to `uint8`. The wrapper checks at parse time that `<talxfm>` exists on disk and exits with an error if not ([`scripts/mri_nu_correct.mni:354`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L354)). Only takes effect when `--float` is on (the default). |
| `--no-uchar`<br>`--nouchar` | bool | on (`DoUchar=0`) | Disable the `--uchar` post-processing. Both spellings are accepted. |
| `--cm` | bool | off | Sets `HiRes = -cm` and forwards `-cm` to every internal `mri_convert` call (for hi-res volumes; preserves the minimum voxel size instead of conforming to 1 mm). Also suppresses the post-processing `--conform` reslice that would otherwise be applied (see gotcha). |
| `--float` | bool | **on** (`UseFloat=1`) | Convert MINC intermediates to `float` (passes `-odt float` to `mri_convert`) and force `DoRescale=1`. Also gates the `--uchar` post-processing and the post-processing `--conform` reslice. |
| `--no-float` | bool | off | Use the input data type in the MINC intermediates (skip `-odt float`). Does **not** touch `DoRescale`. Also disables the `--uchar` post-processing path (line 226 requires `UseFloat`). |
| `--rescale` | bool | on (initial `DoRescale=1`) | After the final iteration, rescale the output so its global mean (over an all-ones mask) equals the input mean. Implemented via [[mri_binarize]] + `mri_segstats` + [[mris_calc]] `mul`. |
| `--no-rescale` | bool | off | Skip the post-iteration rescale. Used by `recon-all` in its first call (the pre-Talairach one). Note: `--float` re-enables rescaling, so to suppress it you must pass `--no-rescale` *after* `--float`. |
| `--ants-n3` | bool | off | Use ANTs' `N3BiasFieldCorrection` instead of MNI `nu_correct`. The wrapper invokes `N3BiasFieldCorrection 3 <invol> <tmpdir>/nu0.mgz`. **No mask is passed** (see source comment on line 123: "don't know how to add mask"). Ignores the MNI-specific flags (`--proto-iters`, `--stop`, `--distance`, `--fwhm`, `--shrink`, `--lambda`) and ignores `--n` (single pass). |
| `--no-ants-n3` | bool | on | Reset `DoAntsN3=0` (revert to MNI backend). |
| `--ants-n4` | bool | off | Use ANTs' `AntsN4BiasFieldCorrectionFs`. The wrapper invokes `AntsN4BiasFieldCorrectionFs -i <invol> -o <tmpdir>/nu0.mgz`, plus `-x <mask>` if `--mask` is set, `--dtype uchar` unless `--ants-no-char`, `--replace-zeros 0 1 1` if `--ants-n4-replace-zeros` (or `FS_ANTS_N4_REPLACE_ZEROS=1`), and `--threads-nondetermistic <n>` if `--ants4-threads-nondetermistic` is given. Ignores the MNI-specific flags and `--n`. |
| `--no-ants-n4` | bool | on | Reset `DoAntsN4=0`. |
| `--ants-no-char` | bool | off (`DoAntsN4CharConvert=1`) | Suppress the default `--dtype uchar` on the ANTs N4 call so the N4 output stays in float. Only meaningful with `--ants-n4`. |
| `--ants-n4-replace-zeros` | bool | off (env override) | Set `ReplaceZeros=1`, which adds `--replace-zeros 0 1 1` to the ANTs N4 call. Default is taken from environment variable `FS_ANTS_N4_REPLACE_ZEROS` (defaults to 0 if unset). Only meaningful with `--ants-n4`. |
| `--no-ants-n4-replace-zeros` | bool | on | Set `ReplaceZeros=0`. |
| `--ants4-threads-nondetermistic <n>` | int | — | Thread count for the ANTs N4 backend (passed as `--threads-nondetermistic <n>`). ITK with multiple threads is non-deterministic; the source comment notes this is "convenient for getting answers faster during testing". Only meaningful with `--ants-n4`. |
| `--tmp <dir>`<br>`--tmpdir <dir>` | path | `<outdir>/tmp.mri_nu_correct.mni.<pid>` | Working directory for intermediate files. Both spellings are accepted. Setting this **also forces `cleanup=0`** at parse time ([`scripts/mri_nu_correct.mni:391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L391)). |
| `--cleanup` | bool | on (initial `cleanup=1`) | Delete `tmpdir` at the end of the run. |
| `--no-cleanup` | bool | off | Keep `tmpdir` (for debugging). |
| `--log <file>` | path | `<outdir>/mri_nu_correct.mni.log` | Path to the log file. The wrapper renames any pre-existing file at this path to `<file>.bak` before writing. |
| `--debug` | bool | off | Sets tcsh `verbose=1`, `echo=1`, and `debug=1` (turns on terminal echoing of every shell command). |
| `--version` | bool | off | Print the version string and exit. Detected by an `egrep` on `argv` *before* the regular parser ([lines 58–62](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L58-L62)), so it short-circuits all other parsing. |
| `--help`<br>`-help`<br>`-h`<br>`-u`<br>`-usage`<br>`--usage` | bool | off | Print help (via `fsPrintHelp`) and exit. All six spellings are accepted. |

### mri_make_uchar Direct-Invocation Flags

`mri_make_uchar` (`mri_convert/mri_make_uchar.cpp`) is a standalone helper invoked by the wrapper when `--uchar` is set. It can also be called directly. Its own option parser (`get_option()`) accepts the following single-dash flags; none of these are forwarded by `mri_nu_correct.mni` itself.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-f <p>` | float | 0.01 | First percentile threshold `FIRST_PERCENTILE`: the lower CDF bound used to find the noise floor in the Talairach ball histogram. |
| `-w <p>` | float | 0.90 | White-matter percentile `WM_PERCENTILE`: the CDF bound used to identify the WM intensity peak in the Talairach ball histogram. |
| `-r <mm>` | float | 50.0 | Radius `MAX_R` in mm of the ball around the Talairach origin used to define the "mostly brain" region for histogram estimation. |
| `-n` | (none) | — | No-op flag (accepted but does nothing; `case 'N': break`). |

### Configuration Interactions

> [!contradiction] Default for `--n` disagrees between sources
> The script source sets `set nIters = 1` ([line 28](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L28)), and
> `recon-all` always passes `--n 2` explicitly. The embedded help
> text ([`scripts/mri_nu_correct.mni:525`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L525)) says *"Number of iterations to run nu_correct.
> Default is 4"*. All three disagree. **Code is authoritative**: the
> tool's default is 1 when run standalone, `recon-all`'s default is
> 2, and the help text's claim of 4 is stale (likely copied from a
> much older version). The FreeSurfer wiki copy at
> <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_nu_correct.mni>
> should be updated.

> [!gotcha] `--ants-n3` and `--ants-n4` are mutually exclusive
> The parameter check at line 438 errors out with "ERROR: cannot
> do both ANTS N3 and N4". This is enforced; attempting both on
> the command line exits the script before any backend is invoked.

> [!gotcha] ANTs backends ignore the MNI-specific flags
> When `--ants-n3` or `--ants-n4` is active, the wrapper jumps
> straight to the ANTs binary and **does not read**
> `--proto-iters`, `--stop`, `--distance`, `--fwhm`, `--shrink`, or
> `--lambda`. These are only passed to `nu_correct` ([line 156–164](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L156-L164)).
> The ANTs binaries have their own parameter interfaces; use the
> expert options file to pass additional flags to them.

> [!gotcha] `--uchar` requires that the Talairach transform exists
> `mri_make_uchar` fails immediately if it cannot open the LTA
> specified by `--uchar`. This is why `recon-all`'s *first* call
> (inside the `talairach:` block) does not pass `--uchar`: there
> is no Talairach transform yet. The second call does.

> [!gotcha] `--uchar` only makes sense on T1 data
> `mri_make_uchar` assumes the 90th-percentile intensity of a
> Talairach-defined ball corresponds to white matter. For T2 or
> FLAIR this is no longer true — WM is darker than GM on T2 — and
> the rescaling will land the wrong tissue at intensity 110.
> Never pass `--uchar` for T2/FLAIR inputs, even for testing.

> [!gotcha] `--tmpdir` implies `--no-cleanup`
> Setting `--tmpdir <dir>` explicitly also sets `cleanup = 0` at
> parse time ([`scripts/mri_nu_correct.mni:391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L391)). This is convenient for debugging, but the
> user must manually remove the tmpdir afterward.

> [!gotcha] `--rescale` is implicitly on when `--float` is on
> `--float` (the default) also sets `DoRescale = 1` ([`scripts/mri_nu_correct.mni:372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri_nu_correct.mni#L372)). To
> get a non-rescaled output you must explicitly pass `--no-rescale`
> *after* any `--float`. `recon-all`'s first call does exactly
> this: `--no-rescale --i ... --o ...`.

> [!gotcha] `--no-float` silently disables `--uchar`
> The post-iteration call to `mri_make_uchar` is gated by
> `if($UseFloat && $DoUchar)` ([line 226](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L226)). Passing --no-float --uchar
> together does **not** error out; it simply skips the histogram
> rescaling step and the output is left in the input data type.

> [!gotcha] By default the output is conformed to 1 mm
> The final `mri_convert $numnc $OutVol --like $InVol` step appends
> `--conform` whenever `UseFloat && !HiRes && !DoUchar` is true (line
> 221). In other words, in standalone use without `--cm` and without
> `--uchar`, **the output is resliced to 1 mm isotropic conform space**
> regardless of the input voxel size. Pass `--cm` (for hi-res) or
> `--uchar` to suppress this. The `--like $InVol` argument keeps the
> field of view aligned, but the voxel grid is changed.

> [!gotcha] `--ants-n3` ignores `--mask`
> The N3 ANTs branch ([line 122](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L122)) builds the command as
> `N3BiasFieldCorrection 3 <invol> <outvol>` and never adds a mask,
> with the source comment "don't know how to add mask". `--ants-n4`,
> in contrast, does pass `-x <mask>`.

> [!gotcha] `--ants-n3` / `--ants-n4` ignore `--n`
> The outer iteration loop is only run on the MNI backend ([line 151](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L151)).
> Both ANTs branches make a single backend call regardless of `--n`.

> [!gotcha] The wrapper needs `bc`
> The post-iteration rescaling uses `bc -l` to compute the scale
> factor ([line 205](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_convert/mri_make_uchar.cpp#L205)). On minimal Linux installs without `bc`, the
> `check_params` block errors out with "ERROR: OS is missing bc
> (binary calculator) utility". This is deliberate, not a bug.

## Typical Use Cases

### Use Case 1: recon-all's pre-Talairach pass

```bash
mri_nu_correct.mni --no-rescale --i orig.mgz --o orig_nu.mgz \
    --n 1 --proto-iters 1000 --distance 50
```

One outer iteration, N3 internal loop with 1000 iterations and a
50 mm B-spline knot spacing (tight). No rescaling so that the
output has whatever intensity range the MNI backend produces. Used
for robustness of `talairach_avi` registration.

### Use Case 2: recon-all's canonical nu.mgz pass

```bash
mri_nu_correct.mni --i orig.mgz --o nu.mgz \
    --uchar transforms/talairach.xfm --n 2
```

Two outer iterations (`recon-all` passes `--n 2` via `NuIterations=2`),
then `mri_make_uchar` rescales the histogram so the WM peak lands at
intensity 110 and the output is cast to `uint8`. The result is
`nu.mgz`, the bias-corrected volume every downstream stage consumes.

### Use Case 3: Standalone N3 on a NIfTI T1

```bash
mri_nu_correct.mni --i t1.nii.gz --o t1_n3.nii.gz --n 4
```

Four outer iterations of MNI N3, rescale to input mean on output.
Skips the `--uchar` step so the output preserves the input
dynamic range and float data type.

### Use Case 4: N3 on a hi-res submillimetre volume

```bash
mri_nu_correct.mni --cm --i t1_0p7mm.mgz --o t1_0p7mm_nu.mgz \
    --n 4 --proto-iters 1000 --distance 50
```

The `--cm` flag is forwarded to every internal `mri_convert` step so
that the submillimetre voxel size is preserved throughout.

### Use Case 5: ANTs N4 backend with a brain mask

```bash
mri_nu_correct.mni --ants-n4 --mask brainmask.mgz \
    --i t1.mgz --o t1_n4.mgz
```

Runs `AntsN4BiasFieldCorrectionFs -i t1.mgz -o t1_n4.mgz -x <mask> --dtype uchar`.
The wrapper converts the mask to MGZ with `mri_binarize --min 1`
before passing it in.

### Use Case 6: Rerun without cleanup for debugging

```bash
mri_nu_correct.mni --i orig.mgz --o nu.mgz \
    --uchar transforms/talairach.xfm --n 2 \
    --tmpdir /tmp/nu_debug --no-cleanup
```

`/tmp/nu_debug` is kept after exit and contains every intermediate
`.mnc` file plus the `mri_make_uchar` log.

## Pipeline Context

`mri_nu_correct.mni` is called only inside [[wiki/pipelines/recon-all|recon-all]], twice.

**Predecessor (in recon-all):** [[wiki/tools/mri_convert|mri_convert]] — `orig.mgz`

**First call (inside `DoTalairach` block, `recon-all:1781`):**

```bash
mri_nu_correct.mni --no-rescale --i orig.mgz --o orig_nu.mgz \
    --n 1 --proto-iters 1000 --distance 50
```

Produces `orig_nu.mgz`, which is the input to [[talairach_avi]] (the
default) or MINC `mritotal` (with `-use-mritotal`).

**Second call (inside `DoNuIntensityCor` block, `recon-all:2054`):**

```bash
mri_nu_correct.mni --i orig.mgz --o nu.mgz \
    --uchar transforms/talairach.xfm --n 2
```

Produces `nu.mgz`, the bias-corrected and WM-centred `uchar` volume
that is the input to [[mri_normalize]], [[mri_em_register]],
`mri_ca_normalize`, and every subsequent volume stage. The header
of `nu.mgz` is stamped with `transforms/talairach.xfm` via
`mri_add_xform_to_header`.

**Successor (in recon-all):** [[mri_normalize]] → `T1.mgz`.

> [!gotcha] Both calls use the same input: `orig.mgz`
> Note that the second call reads `orig.mgz`, **not** `orig_nu.mgz`.
> The two calls are independent; the first call's output is used
> only by `talairach_avi`, and the second call starts over from the
> untouched `orig.mgz`. This is the only sane choice because the
> `--uchar` step requires the Talairach transform, which did not
> exist at the time of the first call.

## Error Compensation and Guard Rails

- **Missing `bc`**: errored out in `check_params`.
- **Missing ANTs binaries**: errored out with
  `"ERROR: cannot find N3BiasFieldCorrection in path"` or the N4
  equivalent.
- **Incorrect masks**: the `mri_binarize --min 1` call is tolerant to
  masks with any positive label values.
- **Hi-res data**: the `--cm` flag forwards to every `mri_convert`
  step so that the internal `.mnc` intermediates are at the same
  voxel size as the input.
- **Dynamic-range preservation**: the default `--float` + `--rescale`
  combination avoids clipping at output time. The COR/`uchar`
  bottleneck only applies when `--uchar` is explicitly passed.
- **Zero voxels confusing ANTs N4**: `FS_ANTS_N4_REPLACE_ZEROS=1`
  (or `--ants-n4-replace-zeros`) tells the ANTs N4 wrapper to
  replace zero voxels before the fit.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — called several times internally for format
  conversion around the MINC backend.
- [[mri_binarize]] — used to binarise and optionally dilate the
  input mask.
- `mri_segstats` — used to compute the global means for the
  post-iteration rescale.
- [[mris_calc]] — used to apply the rescale factor as a voxelwise
  multiply.
- `mri_make_uchar` — called when `--uchar` is set; centres WM at
  intensity 110 using a Talairach-defined ball.
- [[mri_normalize]] — the downstream consumer in `recon-all` (uses
  `nu.mgz` as input to produce `T1.mgz`).
- [[talairach_avi]] — the downstream consumer in the first
  `mri_nu_correct.mni` call (uses `orig_nu.mgz`).

## Confidence and Gaps

- **High confidence**: everything that can be read out of the tcsh
  wrapper itself (arg parsing, iteration loop, rescaling
  implementation, interactions with `mri_convert`/`mri_segstats`/
  `mris_calc`).
- **Medium confidence**: `mri_make_uchar` percentile constants
  (verified from source) and the exact effect of the `--uchar` step
  on non-T1 data (inferred — not tested).
- **Low confidence**: the exact parameter semantics of
  `AntsN4BiasFieldCorrectionFs` — the wrapper only passes a few
  flags and trusts ANTs defaults.

> [!gap] Audit note: C1 flags from helper tools
> Some flags detected by the C1 audit come from `mri_convert/mri_make_uchar.cpp`, which is listed in `source_files` because it is an integral part of the `--uchar` post-processing step. The flags `-f`, `-w`, `-r`, and `-n` belong to `mri_make_uchar` and are now documented in the "mri_make_uchar Direct-Invocation Flags" table above.
>
> Additionally, `--avgwf`, `--conform`, `--dilate`, `--dtype`, `--id`, `--like`, `--min`, `--replace-zeros`, `--seg`, `--sum`, and `--threads-nondetermistic` appear in the C1 audit but are not flags of this wrapper. They are passed to internal helper tools: `--min` and `--dilate` go to `mri_binarize`; `--id`, `--seg`, `--sum`, and `--avgwf` go to `mri_segstats`; `--conform` and `--like` go to `mri_convert`; `--dtype` and `--replace-zeros` go to `AntsN4BiasFieldCorrectionFs`; `--threads-nondetermistic` is what the wrapper passes to the ANTs N4 binary (the user-facing wrapper flag is `--ants4-threads-nondetermistic`, already documented above).

> [!gap] What are `nu_correct`'s defaults for `-iterations`,
> `-stop`, `-distance`, `-fwhm`?
> When `--proto-iters`, `--stop`, `--distance`, `--fwhm`, `--shrink`
> or `--lambda` are *not* passed, the wrapper sends no corresponding
> flag and `nu_correct` falls back to its own compiled-in defaults.
> These defaults are documented in the MNI N3 manual but not in
> this wrapper. A dedicated `[!reference]` to the Sled 1998 paper
> and the MNI software distribution is needed.

> [!gap] Is `--shrink` ever used in practice?
> `--shrink` is parsed but not used by any `recon-all` invocation
> in v8.2.0; it passes through to `nu_correct -shrink`. Whether it
> helps or hurts on modern hi-res data has not been benchmarked.

## References

- Source: `$FREESURFER_SOURCE/scripts/mri_nu_correct.mni` (546
  lines) and `$FREESURFER_SOURCE/mri_convert/mri_make_uchar.cpp`
  (289 lines), FreeSurfer 8.2.0.
- Sled, J. G., Zijdenbos, A. P. & Evans, A. C. *A nonparametric
  method for automatic correction of intensity nonuniformity in
  MRI data*. IEEE TMI 17(1):87–97, 1998. (N3 original paper)
- MNI N3 software:
  <https://www.bic.mni.mcgill.ca/software/N3> (accessed 2026-04-14)
- Tustison, N. J. et al. *N4ITK: Improved N3 Bias Correction*.
  IEEE TMI 29(6):1310–1320, 2010. (N4 algorithm underlying `--ants-n4`)
- Zheng, W., Chee, M. W. L. & Zagorodnov, V. *Improvement of brain
  segmentation accuracy by optimizing non-uniformity correction
  using N3*. NeuroImage 48(1):73–83, 2009. (source of the 3T
  parameter defaults `--n 1 --proto-iters 1000 --distance 50` cited
  by `recon-all`)
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_nu_correct.mni>
  (accessed 2026-04-14)
