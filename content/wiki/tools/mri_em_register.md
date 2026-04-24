---
title: "mri_em_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_em_register/mri_em_register.cpp"
  - "mri_em_register/emregisterutils.cpp"
  - "mri_em_register/emregisterutils.h"
  - "mri_em_register/findtranslation.cpp"
  - "mri_em_register/findtranslation.h"
  - "mri_em_register/mri_em_register.help.xml"
families:
  - "mri_em_*"
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[recon-all]]"
  - "[[mri_ca_label]]"
  - "[[mri_watershed]]"
  - "[[mri_normalize]]"
  - "[[talairach_avi]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Exact semantics of -iscale prior_iscale, -alpha/-tr/-te/-flash tissue-parameter mode and FLASH forward model not read in full (scope deferred)"
  - "Longitudinal -l branch (mri_em_register.cpp:2079–2108) read only at surface level"
  - "Exact interplay between -mask, -skull, -uns, -vent_spacing, and -nocerebellum when multiple are passed together — each sets different state but only -uns is explicitly documented as idempotent"
tags:
  - registration
  - affine
  - atlas
  - gca
  - em
---

# mri_em_register

## Summary

`mri_em_register` computes a 12-parameter (9-DOF anisotropic affine by
default, or 6-DOF rigid with `-rigid`, or 3-DOF translation-only with
`-transonly`) linear registration between a subject MRI volume and a
[[gca-format|Gaussian Classifier Atlas]] (GCA). Rather than optimising an
intensity-similarity metric, it treats the GCA as a generative model
and finds the transform that maximises the log-likelihood of the
subject's intensities *given* the atlas and transform:

$$
\hat{\mathbf{M}} = \arg\max_{\mathbf{M}\in\mathcal{A}} \sum_{s\in\mathcal{S}}
\log p\!\left(I(\mathbf{M}\mathbf{x}_s) \mid \text{label}_s, \text{prior}_s\right),
$$

where $\mathcal{S}$ is a set of "samples" drawn from the atlas
(each with a class label and a per-class Gaussian intensity model),
$\mathbf{x}_s$ is a sample's atlas voxel coordinate, and
$\mathcal{A}$ is the space of allowed affine transforms. The
optimiser is a coarse-to-fine hierarchical search: exhaustive
scanning over rotations, scales and translations at multiple spatial
scales, then gradient refinement. The output is a [[lta-format|`.lta`]] linear
transform from the subject volume to the GCA atlas, typically written
as `transforms/talairach.lta` (the skull-free variant) or
`transforms/talairach_with_skull.lta` (the skull-aware variant used
for [[mri_watershed]]).

## Source Information

- **Language:** C++ (with C headers; uses `gca.h`, `mrimorph.h`,
  `matrix.h`, and optionally OpenMP via `romp_support.h`).
- **Source file(s):**
  - `mri_em_register/mri_em_register.cpp` (2510 lines) — `main()`,
    argument parser (`get_option()`), and the two core optimisation
    routines `find_optimal_transform()` and
    `find_optimal_linear_xform()`.
  - `mri_em_register/emregisterutils.cpp` / `.h` — sample selection,
    log-likelihood evaluation, bounding-box utilities.
  - `mri_em_register/findtranslation.cpp` / `.h` — the coarse
    translation search that initialises the optimisation.
  - `mri_em_register/mri_em_register.help.xml` — XML help source
    (compiled into the binary and printed by `-u` / `-help`).
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_em_register`

## Purpose and Context

The Gaussian Classifier Atlas (GCA) is FreeSurfer's parametric model
of a brain: a grid of voxels in a reference (MNI305) space, each
carrying a discrete distribution over anatomical labels and, per
label, a Gaussian model of intensity
$p(I \mid \text{label}) = \mathcal{N}(\mu_\text{label},\sigma_\text{label}^2)$.
Before any downstream GCA-based tool
(`mri_ca_normalize`, `mri_ca_register`, [[mri_ca_label]]) can use
the atlas on a new subject, it needs the linear transform that brings
the subject into the atlas's coordinate frame.
`mri_em_register` is the tool that computes that transform.

It is called in [[recon-all]] at two distinct points:

1. **Skull-aware atlas alignment** inside the `DoSkullStrip` block
   (`scripts/recon-all:2391`):
   ```bash
   mri_em_register -skull nu.mgz \
       $FREESURFER_HOME/average/<GCASkull> \
       transforms/talairach_with_skull.lta
   ```
   The `<GCASkull>` atlas contains skull voxels; the `-skull` flag
   widens the "unknown label neighbourhood" (`unknown_nbr_spacing =
   5`) so that the optimiser can use the skull/CSF interface for
   alignment. The resulting LTA feeds [[mri_watershed]] as a prior.
2. **Skull-free atlas alignment** inside the `DoGCAReg` block
   (`scripts/recon-all:2665`):
   ```bash
   mri_em_register -uns 3 -mask brainmask.mgz \
       nu.mgz $FREESURFER_HOME/average/<GCA> \
       transforms/talairach.lta
   ```
   The `-uns 3` sets `unknown_nbr_spacing = 3` (a middle ground)
   and `-mask brainmask.mgz` restricts samples to the
   post-skull-strip brain. The resulting LTA feeds
   `mri_ca_normalize`, `mri_ca_register` and ultimately
   [[mri_ca_label]].

The default GCA is `RB_all_<DATE>.gca` (brain-only) and the skull
variant is `RB_all_withskull_<DATE>.gca`, both shipped in
`$FREESURFER_HOME/average/`.

## Inputs

### Required positional arguments

| Position | Argument | Description |
|---------:|----------|-------------|
| 1 | `<in brain volume>` | Subject volume in any format readable by the `MRI` API (MGZ, NIfTI, …). In `recon-all` this is `nu.mgz`. |
| 2 | `<template gca>` | Path to the GCA atlas (`.gca`). |
| 3 | `<output transform>` | Path to write the LTA. Directory must exist. |

### Input assumptions

- The input volume should already be **bias-corrected** (the log-
  likelihood model assumes Gaussian intensity distributions per
  label; a multiplicative bias field breaks that assumption). In
  `recon-all`, the input is `nu.mgz` from [[mri_nu_correct.mni]].
- The input should be in **approximately the same intensity range**
  as the GCA. FreeSurfer's GCAs are trained on `uchar` volumes with
  WM ~ 110; passing data with a different intensity scale either
  requires `-iscale <factor>` or `-noiscale` (which disables the
  per-pass intensity auto-scaling).
- The input resolution should be roughly **1 mm isotropic**. Non-
  canonical voxel sizes work but slow down the optimiser
  substantially.
- The **atlas geometry** (`<template gca>`) must match the GCA
  version that downstream tools expect, otherwise the LTA will be
  valid but useless.

> [!assumption] The intensity model is Gaussian per label
> The core of the log-likelihood computation
> (`local_GCAcomputeLogSampleProbability()` in `emregisterutils.cpp`)
> treats each sample as a univariate Gaussian. For volumes whose
> intensity distribution has heavy tails (e.g. with strong residual
> bias field), the tool will find poor optima. Preprocess with
> `mri_nu_correct.mni` first.

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<output transform>` | LTA (`LINEAR_RAS_TO_RAS` or `LINEAR_VOX_TO_VOX` depending on source volume) | The linear transform from subject to GCA atlas. |
| `<gca_mean_fname>` | MGZ/NIfTI | Optional: the GCA mean image written when `-write_mean <fname>` is passed. |
| `<sample_fname>` | text / label | Optional: the set of `GCA_SAMPLE` points used for the optimisation, when `-samples <fname>` is passed. `-fsamples` writes them after applying the transform; `-nsamples` writes them after intensity normalisation. |
| `<norm_fname>` | MGZ | Optional: the subject volume after per-label intensity renormalisation, when `-norm <fname>` is passed. |
| `<rusage_file>` | text | Optional: resource usage written via `-rusage`. |

The LTA is authored with the **source** being the input volume's
geometry and the **target** being the atlas (`mni305.cor.mgz` or
similar GCA reference frame). The LTA's subject field is filled
from `LTAsetSrcVolInfo()` / `LTAsetDstVolInfo()` using the atlas
header.

## Mathematical Foundations

### Sample-based log-likelihood

The atlas supplies a finite set of samples
$\mathcal{S} = \{(\mathbf{x}_s, \text{label}_s, \text{prior}_s,
\mu_s, \sigma_s)\}_{s=1}^N$ drawn from high-prior voxels of the GCA
prior map. A candidate transform $\mathbf{M}$ is scored as

$$
\mathcal{L}(\mathbf{M}) = \sum_{s\in\mathcal{S}} \log p_s(I(\mathbf{M}\mathbf{x}_s)),
\quad
p_s(i) = \frac{\text{prior}_s}{\sqrt{2\pi}\sigma_s}\exp\!\left(-\frac{(i-\mu_s)^2}{2\sigma_s^2}\right).
$$

The actual implementation (`local_GCAcomputeLogSampleProbability()`)
adds a robust clamp: any term with
$\log p_s < -G_\text{clamp}$ is replaced by $-G_\text{clamp}$
(default $G_\text{clamp}=6$, overridable with `-clamp <val>`).
This prevents a single outlier sample from dominating the gradient.

### Two-stage hierarchical search

1. **Coarse translation search** (`findtranslation.cpp`): an
   exhaustive search over a coarse grid of translations centred on
   the GCA centroid, using atlas samples at spacing `max_spacing`
   (default 8 voxels), with no rotation or scale. This avoids local
   optima when the subject is badly mis-aligned.
2. **Fine 9-DOF search** (`find_optimal_linear_xform()` at
   [[`mri_em_register.cpp:2222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2222)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2222)): a nested loop over
   $(s_x, s_y, s_z)\in[1-\text{MAX\_SCALE\_PCT},1+\text{MAX\_SCALE\_PCT}]^3$
   (default `MAX_SCALE_PCT=0.15`, i.e. ±15 %), over
   $(\theta_x,\theta_y,\theta_z)\in[-\text{MAX\_ANGLE},
   \text{MAX\_ANGLE}]^3$ (default 30°, set at
   [[`mri_em_register.cpp:1245`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1245)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1245)), and over
   translations. Each iteration applies the candidate transform
   $\mathbf{M}_\text{cand} = \mathbf{M}_\text{trans}\,\mathbf{M}_\text{scale}\,\mathbf{R}_z\mathbf{R}_y\mathbf{R}_x\,\mathbf{M}_\text{prev}$
   and evaluates $\mathcal{L}$. The loop is repeated `nreductions`
   times with a shrinking step size (`delta_trans`, `delta_scale`,
   `delta_rot`).
3. **Scale-space loop**: the outer `while (nscales < MIN_SCALES ||
   !done)` loop at [[`mri_em_register.cpp:1639`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1639)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1639) halves the search
   neighbourhood whenever the score fails to improve, until
   `scale < min_search_scale` or a minimum number of scales
   (`MIN_SCALES = 3`) has been completed.

With `-rigid`, the scale loop is disabled (`min_scale = max_scale =
1.0`). With `-transonly`, only the translation loop runs.

### Per-label intensity auto-scaling

By default, the optimiser also estimates a single global intensity
scale factor $\alpha$ per outer iteration so that the subject's
intensities are mapped to the GCA's expected means. This is
equivalent to optimising over an additional scalar:

$$
\hat{\alpha} = \arg\max_\alpha \sum_s \log p_s(\alpha \cdot I(\mathbf{M}\mathbf{x}_s)).
$$

`-noiscale` disables this. `-iscale <factor>` disables the search
and uses a fixed value. `-noscale` disables the *spatial* scale
search (equivalent to `-rigid` but still allowing per-axis scale to
be used as initial conditions).

> [!internal] Where the math lives
> - Sample generation: `emregisterutils.cpp` (sample selection from
>   GCA prior maps, filtered by `min_prior`, `unknown_nbr_spacing`,
>   `vent_spacing`).
> - Log-likelihood: `local_GCAcomputeLogSampleProbability()`.
> - Coarse search: `findtranslation.cpp`.
> - Fine 9-DOF search: `find_optimal_linear_xform()`
>   ([`mri_em_register.cpp:2222–2482`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2222-L2482)).
> - Scale-space loop: `find_optimal_transform()`
>   ([[`mri_em_register.cpp:1500–1640`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1500-L1640)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1500-L1640)).

## Configuration Options

The parser at [[`mri_em_register.cpp:1659–2213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1659-L2213)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1659-L2213) recognises ~80 flags.
Option matching is largely case-insensitive (most use `stricmp`; a
handful — `-mask`, `-skull`, `-uns`, `-rigid`, the writer flags —
use the case-sensitive `strcmp` after the parser has uppercased the
option string, so they are still effectively case-insensitive in
practice). Below they are grouped by function.

### Core constraints (sample selection)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-mask <vol>` | path | — | Restrict samples to voxels where `<vol> > 0`. In `recon-all` this is `brainmask.mgz`. |
| `-skull` | bool | off | Align to a GCA that includes skull. Sets `unknown_nbr_spacing = 5` (overrides any prior `-uns`). |
| `-uns <n>` | int | 1 | Unknown-label neighbourhood spacing — how far a sample of the "unknown" label may be from brain before being discarded. `-skull` forces this to 5; `recon-all` passes `-uns 3` for the skull-free call. |
| `-vent_spacing <n>` | int | -1 (off) | Disallow WM samples within `n` mm of ventricles (useful for big ventricles). Set to 30 by `-bigvent`. |
| `-bigvent` | bool | off | Enable large-ventricle mode: sets `vent_spacing = 30`. |
| `-nocerebellum` | bool | off | Remove cerebellar samples from the GCA in memory before sampling. Passed by `recon-all` via `$nocerebellum`. |
| `-lh` | bool | off | Remove right-hemisphere labels from the atlas (`remove_rh = 1`). For ex-vivo left hemispheres. |
| `-rh` | bool | off | Remove left-hemisphere labels from the atlas (`remove_lh = 1`). For ex-vivo right hemispheres. |
| `-baby` | bool | off | Use a baby-brain intensity model. |
| `-exvivo` | bool | off | Treat input as ex vivo: marks conditional distributions as unknown. |
| `-novar` | bool | off | Ignore the per-label variance, treat all Gaussians as equally sharp. |
| `-var` | bool | off | Alternative objective: minimise within-label intensity variance instead of log-likelihood (`use_variance = 1`). |
| `-prior <p>` | float | `MIN_PRIOR` | Minimum atlas prior for a voxel to be sampled. |
| `-nsamples <n>` | int | `NPARMS*20` | *(Dead code as of FS 8.2.0 — see gotcha below.)* Was intended to set the total number of GCA samples used by the optimiser. The earlier `-nsamples <fname>` writer branch now intercepts this token. |
| `-spacing <n>` | int | 8 | Max GCA atlas spacing used for sample generation (`MAX_SPACING`). |
| `-insert <label> <intensity> <x> <y> <z> <whalf>` | mixed | — | Inject a synthetic sample at the given voxel. Repeatable up to `MAX_INSERTIONS`. |
| `-t2mask <T2vol> <thresh>` | path+float | — | Use a T2 volume to mask the input where `T2 > thresh`. |
| `-amask <aparc+aseg> <T2vol> <thresh>` | path+path+float | — | Same as `-t2mask` plus an extra aparc+aseg mask. |
| `-contrast` | bool | off | Use contrast (rather than absolute intensity) to identify labels (`use_contrast = 1`). |

### Optimisation controls

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-rigid` | bool | off | Constrain to rigid (6-DOF). Inside `find_optimal_linear_xform()` this forces `min_scale = max_scale = 1.0`. |
| `-transonly` | bool | off | Translation-only (3-DOF). Disables the rotation/scale loops; only the coarse translation search runs. |
| `-noscale` | bool | off | Disable spatial scaling in the inner search (sets the global `noscale = 1`). |
| `-noiscale` | bool | off | Disable per-pass intensity auto-scaling. |
| `-iscale <factor>` | float | — | Fix the intensity scale to `factor` (also implicitly sets `noiscale = 1`). |
| `-max_angle <deg>` | float | 30.0 | Max rotational search range per axis (radians internally; the parser converts from degrees). |
| `-max_scale <pct>` | float | 0.15 | Per-axis scale half-range as a fraction of unity, i.e. the search spans $[1-\text{pct},\,1+\text{pct}]$. |
| `-scales <n>` | int | 3 | Both `nscales` and `MIN_SCALES`: minimum number of scale-space refinement passes the outer loop must complete. |
| `-nscales <n>` | int | 0 | `Gscale_samples`: number of distinct scale values sampled per axis at each scale-space pass. |
| `-reduce <n>` | int | 1 | Smooth and downsample the input `n` times before aligning (Gaussian pyramid; multi-resolution). |
| `-trans <mm>` | float | 30 | `MAX_TRANS`: half-range of the translation search (mm). |
| `-steps <n>` | int | 5 | `max_angles`: number of angular sample steps per axis per pass. |
| `-s <n>` | int | 5 | One-shot setter: assigns `Gscale_samples = max_scales = MAX_ANGLES = MAX_TRANS_STEPS = max_angles = n`. Aggressive — examines `n` distinct values per axis in *all* inner loops. |
| `-tol <eps>` | float | 1e-5 | Convergence tolerance on the log-likelihood (writes both the local `tol` and `parms.tol`). |
| `-dt <value>` | float | 5e-6 | `parms.dt`: gradient-descent step size for the (largely vestigial) refinement stage. |
| `-n <niter>` | int | 25 | `parms.niterations`: number of gradient iterations after the exhaustive search. |
| `-m <momentum>` | float | 0.8 | `parms.momentum`: momentum coefficient for the gradient refinement. |
| `-nlarea <lambda>` | float | 0 | `parms.l_nlarea`: non-linear area regularisation weight. |
| `-area <lambda>` | float | 0 | `parms.l_area`: area regularisation weight. |
| `-levels <n>` | int | -1 (auto) | `parms.levels`: number of multi-resolution levels (-1 means use built-in default). |
| `-intensity <w>`<br>`-corr <w>` | float | 1.0 | `parms.l_intensity`: intensity similarity weight in the gradient-stage cost function. |
| `-b <sigma>` | float | 0.0 | Pre-blur input with a Gaussian of the given sigma (mm). |
| `-clamp <val>` | float | 6 | Robust log-likelihood clamp on per-sample log probability. |
| `-robust` | bool | off | Set the global `robust` flag; affects the coarse translation-search code path in `findtranslation.cpp`. |
| `-p <pct>` | float | — | Use the top `pct` (fraction in [0,1]) of WM samples as control points. |
| `-lscale <label> <factor>` | int+float | — | Pre-scale label `<label>`'s expected mean intensity by `<factor>` (repeatable; unspecified labels stay at 1.0). |
| `-dist <lambda>`<br>`-distance <lambda>` | float | 0 | `parms.l_dist`: distance regularisation weight (legacy; appears unused in the active code path). |
| `-nomap` | bool | off | Sets `nomap = 1` (legacy; appears unused in the active code path). |

### Initialisation and inputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-t <xform>` | path | — | Use a previously computed transform as the initial guess. Must be `LINEAR_VOX_TO_VOX` (the parser errors out otherwise). |
| `-d <tx> <ty> <tz>` | 3 floats | 0 0 0 | Initial translation in mm. |
| `-r <rx> <ry> <rz>` | 3 floats (deg) | 0 0 0 | Initial rotation in degrees about the x/y/z axes (parser converts to radians). |
| `-f <cpfile>` | path | — | Read manually defined control points from `<cpfile>` (`ctl_point_fname`). |
| `-l <xform> <long_reg>` | paths | — | Longitudinal mode: read a previously computed atlas xform `<xform>` and pre-compose it with the *inverse* of the time-point-to-base registration `<long_reg>` as the starting point. |
| `-center` | bool | on | Use the GCA centroid as the origin of the transform (enabled by default; the flag re-asserts `center = 1`). |
| `-num <n>` | int | 1 | Find `n` linear transforms (`num_xforms`). |
| `-tr <ms>` | float | -1 | Override TR for the FLASH forward model. |
| `-te <ms>` | float | -1 | Override TE for the FLASH forward model. |
| `-alpha <deg>` | float | -1 | Override flip angle (degrees) for the FLASH forward model. |
| `-flash` | bool | off | Use the FLASH forward model to predict expected intensities from tissue parameters, TR, TE, α (`map_to_flash = 1`). |
| `-flash_parms <parmfile>` | path | — | Tissue parameter file for the FLASH model (`tissue_parms_fname`). |
| `-renorm <fname>`<br>`-renormalize <fname>` | path | — | Renormalise GCA intensities using predicted values in `<fname>`. |
| `-example <T1> <seg>` | path+path | — | Use `<T1>` and `<seg>` as an example T1 image and its segmentation to renormalise the atlas before registration. |

### Diagnostic / output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-samples <fname>` | path | — | Write the GCA sample control points (pre-transform) to `<fname>`. |
| `-fsamples <fname>`<br>`-isamples <fname>` | path | — | Write post-transform sample points (`transformed_sample_fname`). The two spellings are aliases. |
| `-nsamples <fname>` | path | — | Write post-normalisation sample points (`normalized_transformed_sample_fname`). |
| `-norm <fname>` | path | — | Write the subject volume after per-label intensity renormalisation. |
| `-write_mean <fname>` | path | — | Write the GCA mean image. |
| `-w <niter>` | int | 0 | `parms.write_iterations`: write intermediate transforms every `niter` iterations and OR `DIAG_WRITE` into `Gdiag`. |
| `-diag <file>` | path | — | Open a diagnostic log file. |
| `-debug_voxel <x> <y> <z>` | 3 ints | — | Enable per-voxel debug printing at `(x,y,z)` (`Gx`, `Gy`, `Gz`). |
| `-debug_label <label>` | int | — | Enable per-label debug printing (`Ggca_label`). |
| `-rusage <file>` | path | — | Write resource usage summary. |
| `-v <diagno>` | int | 0 | Set `Gdiag_no` for verbosity control. |
| `-threads <n>` | int | OpenMP max | OpenMP thread count (no-op without OpenMP). |
| `--version`<br>`-version`<br>`--all-info` | bool | — | Handled by `handleVersionOption()` before `get_option()` runs; prints version info and exits if no other args. |
| `-h`<br>`-u`<br>`-help`<br>`--help`<br>`--usage` | bool | — | Print the XML-rendered help and exit. |

## Configuration Interactions

> [!gotcha] `-skull` *overrides* `-uns`
> `-skull` explicitly sets `unknown_nbr_spacing = 5`
> ([[`mri_em_register.cpp:1814`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1814)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1814)). If you pass `-uns 3 -skull`, the
> final value is 5, not 3. In `recon-all`, the two flags are never
> combined for this reason: the skull-aware call uses `-skull`
> alone and the skull-free call uses `-uns 3` alone.

> [!gotcha] `-rigid` disables the scale loop but not the intensity
> scale
> `-rigid` only sets `min_scale = max_scale = 1.0`
> ([[`mri_em_register.cpp:2249–2252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2249-L2252)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2249-L2252)). Intensity auto-scaling is
> independently controlled by `-noiscale`. A common mistake is to
> assume "rigid" means "no scaling at all".

> [!gotcha] `-t <xform>` requires `LINEAR_VOX_TO_VOX`
> The `-t` handler ([[`mri_em_register.cpp:2128–2154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2128-L2154)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2128-L2154)) reads the
> transform and exits with an error if the LTA type is not
> `LINEAR_VOX_TO_VOX (=0)`. Convert with `lta_convert --outltavox`
> if you have a RAS-to-RAS LTA.

> [!gotcha] `-iscale <factor>` silently implies `-noiscale`
> Parsing `-iscale` at line 2009–2015 also sets `noiscale = 1`, so
> you cannot both fix the initial intensity scale *and* allow it to
> refine. To refine, omit `-iscale` entirely.

> [!gotcha] `-max_scale` is a fractional delta, not an absolute
> scale
> `-max_scale 0.15` means the scale search spans
> $[1-0.15, 1+0.15] = [0.85, 1.15]$, not "up to 15 % total". The
> help text for the parser at line 1731 is self-explanatory but the
> XML help is less clear.

> [!gotcha] `-l` (longitudinal) pre-composes the inverse of the
> time-point-to-base registration
> The `-l xform long_reg` handler inverts `long_reg` and multiplies
> it into the pre-loaded atlas xform
> ([[`mri_em_register.cpp:2103–2106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2103-L2106)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2103-L2106)). Passing a
> `long_reg` that is already in the base-to-tp direction will
> double-invert.

> [!gotcha] `-nsamples <n>` is unreachable
> The parser has two branches for `-nsamples`: the first
> ([[`mri_em_register.cpp:1915`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1915)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1915)) takes a path and writes the
> post-normalisation control points; the second
> ([[`mri_em_register.cpp:2053`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2053)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2053)) takes an integer and is intended to
> set the GCA sample count. Because both keys collide
> case-insensitively after the parser uppercases the option string,
> the first branch always wins. The integer form is dead code as of
> FS 8.2.0 — to limit sample count, use `-spacing` or `-prior`
> instead.

> [!gotcha] `-s <n>` is a global hammer
> The single-letter `-s` flag overwrites *five* internal counters
> (`Gscale_samples`, `max_scales`, `MAX_ANGLES`, `MAX_TRANS_STEPS`,
> `max_angles`) at once ([[`mri_em_register.cpp:2171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2171)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2171)). It supersedes
> any `-nscales`, `-steps`, or `-scales` you passed earlier on the
> same command line. Pass it *before* the more granular knobs if you
> want to combine them.

> [!gotcha] `-nocerebellum` is a destructive atlas edit
> `remove_cerebellum = 1` removes cerebellar labels from the GCA in
> memory before sampling. This is used by `recon-all` for
> single-hemisphere ex-vivo processing where the cerebellum is
> absent, but breaks the log-likelihood on normal whole-brain data.
> Never combine with a standard `recon-all -all`.

## Typical Use Cases

### Use Case 1: Skull-aware alignment (as in recon-all)

```bash
mri_em_register -skull nu.mgz \
    $FREESURFER_HOME/average/RB_all_withskull_<DATE>.gca \
    transforms/talairach_with_skull.lta
```

Produces an LTA that aligns the subject's brain *and* skull to the
skull-aware GCA. This LTA is used by [[mri_watershed]] as a shape
prior.

### Use Case 2: Skull-free alignment (as in recon-all)

```bash
mri_em_register -uns 3 -mask brainmask.mgz nu.mgz \
    $FREESURFER_HOME/average/RB_all_<DATE>.gca \
    transforms/talairach.lta
```

Produces an LTA aligned to the skull-free GCA. The `-mask
brainmask.mgz` restricts the log-likelihood to brain voxels; `-uns
3` permits samples that are up to 3 mm outside a labelled brain
region (looser than the default `-uns 1`).

### Use Case 3: Rigid-only alignment

```bash
mri_em_register -rigid -mask brainmask.mgz nu.mgz \
    $FREESURFER_HOME/average/RB_all_<DATE>.gca \
    rigid.lta
```

Useful when a full affine fit is inappropriate — e.g. for
cross-subject anatomical comparisons where isotropic scaling is
allowed but shear is not.

### Use Case 4: Initialise from a previous xform (quick refinement)

```bash
mri_em_register -t transforms/talairach.xfm.lta -mask brainmask.mgz \
    nu.mgz $FREESURFER_HOME/average/RB_all_<DATE>.gca \
    transforms/talairach.lta
```

The `-t` flag loads the initial transform (e.g. from
[[talairach_avi]]). The tool still runs its full search but starts
from the supplied xform, which typically converges faster.

### Use Case 5: Write control points for visual QA

```bash
mri_em_register -samples samples.txt -fsamples fsamples.txt \
    -mask brainmask.mgz nu.mgz \
    $FREESURFER_HOME/average/RB_all_<DATE>.gca talairach.lta
```

`samples.txt` is the set of atlas samples used by the optimiser;
`fsamples.txt` is the same set after applying the final transform.
Load in [[freeview]] (`freeview -c`) to inspect which anatomical
regions drove the alignment.

### Use Case 6: Single hemisphere, ex-vivo

```bash
mri_em_register -lh -spacing 4 -s 7 -mask brainmask.mgz nu.mgz \
    $FREESURFER_HOME/average/RB_all_<DATE>.gca talairach.lta
```

`-lh` removes right-hemisphere samples; `-spacing 4 -s 7` tightens
the sample grid (because half the brain is gone). This is the
exact command that `recon-all -hemi lh` assembles via the
`$LHonly` and `$RHonly` branches at `scripts/recon-all:2393–2394`.

## Pipeline Context

**Predecessor (in recon-all):** [[mri_nu_correct.mni]] → `nu.mgz`
and (for the skull-free call) [[mri_watershed]] →
`brainmask.mgz`.

**This tool** produces `transforms/talairach.lta` and (on a
separate invocation) `transforms/talairach_with_skull.lta`.

**Successors (in recon-all):**
- `talairach_with_skull.lta` → [[mri_watershed]] (Stage 5, skull
  strip).
- `talairach.lta` → `mri_ca_normalize` → `mri_ca_register` →
  [[mri_ca_label]].

Both LTAs are also embedded into the header of downstream volumes
via `mri_add_xform_to_header`.

> [!gotcha] `mri_em_register` vs. `talairach_avi`
> `talairach_avi` and `mri_em_register` both produce a linear
> transform to an MNI305-related reference, but they are not
> interchangeable:
> - `talairach_avi` writes a 4×4 `.xfm` file to the atlas
>   `mni305.cor.mgz` using Avi Snyder's 4dfp tools. Fast (~1 min).
> - `mri_em_register` writes an `.lta` to a GCA's reference frame
>   using the atlas's generative intensity model. Slow (~5–15 min),
>   but the output is directly consumable by
>   `mri_ca_{normalize,register,label}`, which `talairach_avi`'s
>   output is not.
> `recon-all` uses `talairach_avi` first (to compute the coarse
> registration needed by the NU histogram-centring step), then
> `mri_em_register` (to produce the LTAs downstream tools consume).
> See also [[talairach_avi]].

## Error Compensation and Guard Rails

- **Missing or unreadable input**: errors out immediately via
  `MRIread()` error reporting.
- **Type mismatch on `-t <xform>`**: errors with "must be
  LINEAR_VOX_TO_VOX".
- **Cerebellum absent**: use `-nocerebellum` to align without
  cerebellar samples; otherwise the optimiser will try to match
  non-existent cerebellar labels.
- **Poor initial condition**: the hierarchical scale-space loop
  (3 refinement passes by default) converges even from a poor
  starting point, but `-scales 4` or `-scales 5` can improve
  robustness on unusually shaped brains.
- **Strong residual bias field**: the per-label intensity
  auto-scaling (default on) partially compensates, but the tool
  assumes the input is already bias-corrected.
- **`-clamp`**: a robust clamp of 6 on the per-sample log-
  likelihood prevents any single outlier from dominating the fit.

## Related Tools

- [[talairach_avi]] — fast coarse affine to MNI305 via Avi
  Snyder's 4dfp tools; produces `talairach.xfm`. Used by
  [[recon-all]] *before* `mri_em_register` to bootstrap the pipeline.
- `mri_ca_normalize` — consumes the `talairach.lta` produced
  here to drive GCA-based intensity normalisation.
- `mri_ca_register` — consumes the `talairach.lta` as an initial
  condition for non-linear atlas registration.
- [[mri_ca_label]] — consumes the atlas-aligned `norm.mgz` and the
  non-linear warp to produce `aseg.auto_noCCseg.mgz`.
- [[mri_watershed]] — consumes `talairach_with_skull.lta` as a
  shape prior for skull stripping.
- [[mri_normalize]] — non-GCA intensity normalisation step that
  precedes `mri_em_register` indirectly via `nu.mgz`.
- `lta_convert` — converts between LTA types and formats; useful
  to convert RAS-to-RAS LTAs into the `LINEAR_VOX_TO_VOX` form
  required by `-t`.

## Confidence and Gaps

- **High confidence**: argument parser, the two-stage scale-space
  search, interaction with `-skull`/`-uns`, the role of the tool
  in `recon-all` (both call sites), and the per-sample
  log-likelihood objective.
- **Medium confidence**: the FLASH forward model code path
  (`-flash`, `-flash_parms`, `-renorm`) was only skimmed; the
  mathematics of `GCAsetLabelIntensitiesFromFlash()` is not
  documented here.
- **Low confidence**: the exact numerical defaults for
  `parms.niterations`, `parms.tol`, `parms.dt`, `parms.levels`,
  etc. when not specified on the command line — these come from
  the `MORPH_PARMS` struct initialiser in `mrimorph.h` and have
  not been traced.

> [!gap] Default values of `parms.*` fields
> The `MORPH_PARMS parms` structure is statically initialised at
> file scope. Many flags overwrite its fields (`-n`, `-tol`, `-dt`,
> `-m`, `-levels`, `-area`, `-nlarea`, `-intensity`) but the defaults
> are not visible from `get_option()` alone. A dedicated read of
> `mrimorph.h` is needed.

## References

- Source: `$FREESURFER_SOURCE/mri_em_register/*.cpp` (FreeSurfer
  8.2.0)
- XML help: `mri_em_register/mri_em_register.help.xml` (compiled
  into the binary)
- Fischl, B. et al. *Whole brain segmentation: automated labeling
  of neuroanatomical structures in the human brain*. Neuron
  33(3):341–355, 2002. (GCA and atlas-based labelling)
- Fischl, B. et al. *Sequence-independent segmentation of magnetic
  resonance images*. NeuroImage 23(Suppl 1):S69–S84, 2004. (the
  EM framework and `mri_em_register`'s maximum-likelihood objective)
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_em_register>
  (accessed 2026-04-14)
