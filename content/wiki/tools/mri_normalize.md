---
title: "mri_normalize"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_normalize/mri_normalize.cpp"
  - "mri_normalize/mri_normalize.help.xml"
  - "mri_normalize/mri_long_normalize.cpp"
  - "include/mrinorm.h"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[recon-all]]"
  - "[[mri_nu_correct.mni]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_em_register]]"
  - "[[mri_segment]]"
  - "[[mri_watershed]]"
  - "[[freeview-pointsets]]"
status: draft
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Full trace of MRI3dNormalize / MRI3dGentleNormalize in utils/mrinorm.cpp not done — key algorithm details are in those helper functions"
  - "Exact interaction of `-surface <s> <xform>` with `-aseg` when both are supplied simultaneously"
  - "Default of num_3d_iter in recon-all is unclear — the script has `-n $Norm3dIters` but Norm3dIters is unset by default"
tags:
  - intensity-normalization
  - bias-field
  - control-points
  - white-matter
---

# mri_normalize

## Summary

`mri_normalize` is FreeSurfer's surface-aware intensity normaliser.
Given a bias-field-corrected T1 volume, it identifies a set of
control-point voxels that are confidently white matter, fits a
smooth multiplicative correction field so that the control-point
intensities land at a target WM intensity of
`DEFAULT_DESIRED_WHITE_MATTER_VALUE = 110` (defined in
[[`include/mrinorm.h:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrinorm.h#L31)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrinorm.h#L31)), and applies that correction to the whole
volume. The result is a volume in which white matter has a
histogram peak at ~110, grey matter is roughly at ~80–90, and CSF is
darker still — the canonical intensity scale that every downstream
segmentation, surface, and statistical tool in FreeSurfer assumes.

It is the intensity-calibration step that turns bias-corrected
`nu.mgz` into the `T1.mgz` volume fed to [[mri_watershed]] in
autorecon1 Stage 4, and separately turns the skull-stripped
`brain.mgz` into `brain.finalsurfs.mgz` in autorecon2's
"Normalization 2" step. It is *not* the GCA-based atlas
normaliser — that is [[mri_ca_normalize]] (stage 7 in `recon-all`
nomenclature). `mri_normalize` is purely data-driven: its
control-point search uses image-intensity statistics plus optional
segmentation / surface / atlas priors to decide which voxels are
reliably WM.

## Source Information

- **Language:** C++ (thin wrapper around C utilities in
  `utils/mrinorm.cpp`).
- **Source file(s):**
  - `mri_normalize/mri_normalize.cpp` — 2168 lines. Contains
    `main()` ([line 163](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L163)), the argument parser `get_option()` (lines
    1001–1340), and helper routines for control-point pruning
    (`MRIremoveWMOutliers`, `MRIremoveWMOutliersAndRetainMedialSurface`,
    `remove_outliers_near_surface`) and bias-field construction
    (`compute_bias`, `build_outside_of_brain_mask`).
  - `mri_normalize/mri_normalize.help.xml` — XML help source.
  - `mri_normalize/mri_long_normalize.cpp` — related longitudinal
    utility (not user-facing from `recon-all`).
  - `include/mrinorm.h` — defines `DEFAULT_DESIRED_WHITE_MATTER_VALUE
    = 110` ([line 31](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrinorm.h#L31)) and `MAX_GRADIENT = 1.0` ([line 62](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/mrinorm.h#L62)).
  - `utils/mrinorm.cpp` — the heavy lifting: `MRI3dNormalize()`,
    `MRI3dGentleNormalize()`, `MRIbuildBiasImage()`,
    `MRIapplyBiasCorrection{,SameGeometry}()`, control-point
    identification via `MRI3dUseFileControlPoints()` and sibling
    functions.
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_normalize`

## Purpose and Context

After [[mri_nu_correct.mni]] has removed the smooth bias-field
component and `mri_make_uchar` has centred the WM histogram peak at
~110, the WM intensity across the brain is still not perfectly
uniform: residual scanner- and coil-dependent variation can still
drift the WM mean by ±10–15 intensity units across different parts
of the volume. [[mri_segment]], [[mri_watershed]] and every
surface-placement tool rely on an *absolute* intensity threshold
to distinguish tissue classes, so the volume must be rescaled to a
globally consistent WM target. That is what `mri_normalize` does.

Its algorithm is the "control point method" of Dale, Fischl &
Sereno (1999, NeuroImage 9(2):179–194):

1. **Identify control points**: voxels that are confidently WM,
   either from user-supplied seed files (`-f <ctrl.dat>`,
   `-label <ctrl.label>`), from an existing aseg segmentation
   (`-aseg aseg.presurf.mgz`), from an atlas
   (`-atlas gca xform distance`), from surface priors
   (`-surface <surf> <xform>`), or by a 1-D / 3-D histogram-based
   search inside the masked brain.
2. **Prune the control points** by removing those whose
   intensity falls below the WM mode minus `intensity_below`
   (default 10), those whose intensity is near the surface
   boundary, those inside the ventricles, or those "obvious
   outliers" (see the `MRIremoveWMOutliers*` helpers).
3. **Build a bias image** by dividing the control-point
   intensities by the target WM value and interpolating smoothly
   between them
   (`MRIbuildBiasImage()` + Gaussian smoothing with σ =
   `bias_sigma = 8` mm by default).
4. **Apply the bias correction** to the entire volume by dividing
   the input by the bias field and rescaling so that WM = 110
   (`MRIapplyBiasCorrectionSameGeometry()`).

In [[recon-all]] it is invoked twice:

- **Autorecon1 Stage 4** (`DoNormalization`,
  `scripts/recon-all:2193`) to produce `T1.mgz` from `nu.mgz`:
  ```bash
  mri_normalize -g 1 -seed 1234 -mprage nu.mgz T1.mgz
  ```
  (Default `-g 1` from `NormMaxGrad = 1`; `-seed 1234` from
  `NoRandomness = 1`, `RngSeed = 1234`; `-mprage` from
  `IsMPRAGE = 1`.)
- **Autorecon2 Stage 12** ("Normalization 2",
  `DoNormalization2`, around `scripts/recon-all:3116–3155`) to
  produce `brain.mgz` from `brainmask.mgz` using an aseg-based
  initialisation. (Exact command still to be written as part of the
  Normalization 2 stage documentation — see [[recon-all]]'s
  `[!gap]` note.)

## Inputs

### Required positional arguments

| Position | Argument | Description |
|---------:|----------|-------------|
| 1 | `<in volume>` | Bias-corrected source volume. In `recon-all` Stage 4 this is `nu.mgz`; in Stage 12 it is `brainmask.mgz`. |
| 2 | `<out volume>` | Output normalised volume. In `recon-all` Stage 4 this is `T1.mgz`; in Stage 12 it is `brain.mgz`. |

### Input assumptions

- The input is **T1-weighted** (or T1-like) unless `-T2 / -PD` is
  specified. The control-point search is tuned to a histogram
  whose WM peak is a bright mode; on T2 the WM peak is a dark mode
  and the default algorithm fails.
- The input is **already bias-field-corrected** — the algorithm
  assumes residual non-uniformity is mild and locally smooth
  (σ ≈ 8 mm). It can tolerate modest residual bias but not raw
  scanner output.
- The input is **approximately 1 mm isotropic 256³**. Non-canonical
  resolutions work with `-conform` / `-noconform` but may require
  hand-tuning of `bias_sigma` and the intensity thresholds.
- When an aseg / atlas / surface prior is not available, the input
  must have been skull-stripped *or* `-mask <brainmask>` must be
  passed. Otherwise the histogram-based search finds false control
  points in the dura, eyes, or scalp.

> [!assumption] Target WM intensity is 110
> `DEFAULT_DESIRED_WHITE_MATTER_VALUE = 110` is a compile-time
> constant in `mrinorm.h`. Every downstream tool that thresholds
> intensity ([[mri_segment]], [[mri_watershed]], [[mris_make_surfaces]],
> etc.) uses intensity 110 as its WM reference. You cannot change
> this target without rebuilding FreeSurfer.

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<out volume>` | same type as input (usually MGZ) | The bias-corrected volume with WM centred at 110. |
| `<control_volume_fname>` | MGZ | Optional: the set of control points used, written when `-W <ctrl_vol> <bias_vol>` is passed. This is how the longitudinal *base* subject stores its control-point mask for later time points. |
| `<bias_volume_fname>` | MGZ | Optional: the smooth bias field, written by `-W`. |
| `<output_control_points_vol>` | MGZ | Optional: control points volume, written via `-c`. |
| `<checknorm_fname>` | — | Optional: a file to check control-point intensities against after normalisation, via `-checknorm`. |
| Intermediate debug files | MGZ / text | `r.mgz`, `c.mgz`, `e.mgz`, `b.mgz`, `bs.mgz` during `-renorm`; `h.plt`, `hs.plt`, `out.mgz` with `Gdiag & DIAG_WRITE & DIAG_VERBOSE_ON`. Not normally observed. |

## Mathematical Foundations

Let $I(\mathbf{x})$ be the input intensity at voxel $\mathbf{x}$
and let $\mathcal{C}$ be the set of control-point voxels.

### Step 1 — Control-point identification

The 1-D histogram search looks for intensity peaks inside the
brain mask and picks a WM peak near the upper mode. A voxel is
accepted as a control point if its intensity lies within a band
$[\mu_\text{WM} - \text{intensity\_below},\,
\mu_\text{WM} + \text{intensity\_above}]$
(defaults 10 and 25 respectively). Voxels on the border of the
brain mask or near surface discontinuities are discarded via
`MRIremoveWMOutliers` and `remove_outliers_near_surface`:

$$
\mathcal{C} = \left\{\mathbf{x}\in\Omega_\text{brain} \,:\,
\mu_\text{WM} - \Delta_\text{below} \le I(\mathbf{x}) \le \mu_\text{WM} + \Delta_\text{above}
\;\wedge\; d(\mathbf{x}, \partial\Omega_\text{brain}) > \text{min\_dist}\right\}.
$$

With `-aseg aseg.mgz`, $\mathcal{C}$ is restricted to voxels
labelled `Left/Right_Cerebral_White_Matter` (as listed in
`aseg_wm_labels[]` at [[`mri_normalize.cpp:130–133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L130-L133)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L130-L133)).

### Step 2 — Bias-field estimation

For each control point $\mathbf{x} \in \mathcal{C}$, the ratio
$\rho(\mathbf{x}) = I(\mathbf{x}) / \mu_\text{target}$
with $\mu_\text{target} = 110$ is a local estimate of the
multiplicative bias. The full bias field
$b:\Omega\to\mathbb{R}_+$ is obtained by interpolating and
smoothing $\rho$ onto the full volume:

$$
b(\mathbf{x}) = G_\sigma \ast \tilde{\rho}(\mathbf{x}),
\qquad \sigma = \mathtt{bias\_sigma} = 8\,\text{mm (default)},
$$

where $\tilde{\rho}$ is the control-point ratio extrapolated
throughout $\Omega$ (this is done by `MRIbuildBiasImage()`). The
result is a smooth multiplicative field that maps the local
observed WM intensity to 110.

### Step 3 — Apply bias correction

$$
\hat{I}(\mathbf{x}) = \frac{\mu_\text{target}}{\max(b(\mathbf{x}), \epsilon)}\, I(\mathbf{x}).
$$

Voxels where the bias field is zero or negative are left
unchanged, and the output is clipped to the valid range for the
output data type.

### Iterative refinement

The 3-D normalisation is iterated `num_3d_iter` times (default 2,
controlled by `-n`): each iteration re-identifies control points
using the histogram of the latest estimate, re-builds the bias
field, and re-applies the correction. With `-monkey`, iterations
drop to 1 and the 1-D pre-pass is disabled.

### Gradient constraint

`-g <max_grad>` caps the magnitude of the bias-field gradient to
`MAX_GRADIENT` (compiled default `5.0/5.0 = 1.0`, settable via
`-g`). This prevents the control-point fitter from producing a
bias field with sharp discontinuities at regions where control
points are sparse.

> [!math] Longitudinal "reuse the base's bias/control"
> When `-l <ctrl_vol> <bias_vol>` is passed, the tool skips the
> control-point search entirely and reads both the control-point
> mask and the smooth bias field from the longitudinal base. It
> applies the base's bias field as the initial estimate, then
> identifies a *residual* set of control points on the current
> time point and refines. This guarantees that every time point
> uses the same WM control-point mask, eliminating a source of
> between-time-point variance.

## Configuration Options

### Complete Flag Reference

Grouped by function.

#### Input / output selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-f <ctrl.dat>` | path | — | Read control points from a text file (one voxel per line, column/row/slice). |
| `-label <ctrl.label>` | path | — | Read control points from a FreeSurfer label file. |
| `-label_only <ctrl.label>`<br>`-lonly`<br>`-labelonly` | path | — | As above **and** sets `file_only = 1, no1d = 1` (use *only* the label-file points, skipping the histogram search). |
| `-file_only <ctrl.dat>`<br>`-fonly`<br>`-fileonly` | path | — | As `-f` but also sets `file_only = 1, no1d = 1`. |
| `-aseg <aseg.mgz>`<br>`-segmentation` | path | — | Use an aseg volume for initial intensity normalization; control points are drawn from WM labels. |
| `-atlas <gca> <xform> <distance>` | paths+int | — | Build a "non-control" mask from the GCA prior (regions where prior < 0.05, within `<distance>` voxels of brain). Used to exclude non-brain voxels from control-point candidacy. |
| `-surface <surf> <xform>` | paths | — | Use a surface (and its vox-to-surf xform) to constrain control points to voxels within `min_dist` mm of the surface. Repeatable up to `MAX_NORM_SURFACES = 10`. |
| `-mask <vol>` | path | — | Apply this mask to the input before normalisation. |
| `-mask_sigma <σ> <thresh>` | float+float | 0/0 | Smooth the input with σ and threshold it to create a mask. |
| `-mask_orig <vol> <thresh>` | path+float | — | Remove control points that are below `<thresh>` in `<vol>`. |
| `-interior <surf1> <surf2>` | paths | — | Use two surfaces to compute a WM interior region for control-point selection. |
| `-noskull` | bool | off | Assume the input has been skull-stripped (disables skull-related logic). |

#### Contrast / protocol hints

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-T1` | bool | on (inferred) | Assume in vivo T1 contrast. |
| `-T2`<br>`-PD` | bool | off | Assume T2 or PD contrast. |
| `-mprage`<br>`-mgh_mprage` | bool | off | Tune thresholds for MGH (Van der Kouwe) MPRAGE: `intensity_below = 15`. Set automatically by `recon-all` via `IsMPRAGE = 1`. |
| `-washu_mprage` | bool | off | Tune thresholds for WashU MPRAGE (dark GM): `intensity_below = 22`. |
| `-monkey` | bool | off | Monkey brains: disable the 1-D pre-pass (`no1d = 1`) and set `num_3d_iter = 1`. |

#### Histogram-search parameters

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-a <Δ_above>` | float | 25 | Accept a voxel as WM control point if its intensity is ≤ `wm_mode + Δ_above`. |
| `-b <Δ_below>` | float | 10 | Accept if its intensity is ≥ `wm_mode − Δ_below`. |
| `-g <max_grad>` | float | 1.0 | Max gradient of the bias field (`mni.max_gradient`). |
| `-n <niter>` | int | 2 | Number of 3-D refinement iterations. |
| `-nonmax_suppress <0/1>` | int | 1 | Enable / disable nonmax suppression of control points near the surface. |
| `-erode <n>` | int | 0 | Erode the control-point interior `n` times (used with `-surface`/`-interior`). |
| `-min_dist <mm>` | float | 2.5 | Minimum distance from the boundary that retained control points must satisfy (with `-surface`). |
| `-sigma <σ>` | float | 8.0 | Gaussian smoothing kernel of the bias field. |
| `-gentle` | bool | off | "Kinder gentler" normalisation; used when control points are sparse. |
| `-no1d` | bool | off | Disable the 1-D pre-normalisation pass. |
| `-no-gentle-cp`<br>`-gentle-cp` | bool | on | Toggle the "gentle normalisation" path when reading control points from a file. |
| `-nosnr`<br>`-snr` | bool | on (nosnr) / off (snr) | Toggle SNR-based normalisation. |
| `-p <0|non-0>` | int | off | Turn control-point pruning on/off (`case 'P':` in parser). |
| `-grad <thresh>` | float | — | Gradient threshold for preventing control points from crossing edges (from `mri_normalize.cpp` `stricmp("GRAD")`). |
| `-cross_time_sigma <σ>` | float | — | Parzen window sigma for longitudinal cross-time smoothing (from `mri_long_normalize.cpp`). |
| `-s <σ>` | float | — | Sigma for smoothing the bias field (from `mri_long_normalize.cpp` `case 'S':`). |
| `-conform`<br>`-noconform` | bool | off | Force the output to be 256³ 1 mm (calls [[mri_convert]]-style conform internally). With `-cm` in `recon-all`, `-noconform` is passed. |

#### Renormalisation against a reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-renorm <ref.mgz>` | path | — | Renormalise the input using voxels whose value in `<ref.mgz>` is exactly `DEFAULT_DESIRED_WHITE_MATTER_VALUE = 110` as control points. Used in the second normalisation pass to piggyback on a previously normalised volume. |
| `-checknorm <ref.mgz> <min> <max>` | path+floats | 90 / 120 | After normalisation, check that control-point intensities in `<ref.mgz>` are within `[min, max]` and report. |

#### Longitudinal / reuse

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-W <ctrl_vol> <bias_vol>` | paths | — | After normalisation, write the control-point mask and smooth bias field to disk. Used by the longitudinal *base* to produce files the time points can read back. |
| `-R <ctrl_vol> <bias_vol>` | paths | — | Read a previously-written control-point mask and bias field and reuse them without recomputing. |
| `-L <ctrl_vol> <bias_vol>` | paths | — | Longitudinal mode: start from the *base*'s bias/ctrl files; disables the 1-D pre-pass (`no1d = 1`). |
| `-c <output_vol>` | path | — | Write the final control-point volume to `<output_vol>`. |

#### Miscellaneous

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-seed <n>` | int | — | Seed the random number generator (`setRandomSeed()`). Passed by `recon-all` as `-seed 1234` when `NoRandomness = 1` to make the output reproducible. |
| `-D <x> <y> <z>` | ints | — | Debug the voxel at `(x,y,z)`: enables per-voxel printing. |
| `-V <x> <y> <z>` | ints | — | Debug the alternative voxel `(x,y,z)`. |
| `-help`<br>`--help`<br>`-usage`<br>`--usage`<br>`-?`<br>`-U`<br>`-H` | — | — | Print the XML-rendered help. |
| `-nosnr` | bool | on | Disable SNR normalisation. Default is on since FreeSurfer 6. |

## Configuration Interactions

> [!gotcha] `-f <file>` sets `no1d` only with `-file_only`
> Passing `-f <ctrl.dat>` on its own *adds* the file control
> points to the histogram-search result. Passing `-file_only
> <ctrl.dat>` (or `-fonly` / `-fileonly`) or `-label_only`
> additionally sets `file_only = 1` and `no1d = 1`, meaning
> **only** those control points are used. This is a common
> source of confusion when the user wants "use my points and
> ignore the defaults".

> [!gotcha] `-mprage` and `-washu_mprage` overwrite `intensity_below`
> Both flags change the global `intensity_below` (to 15 and 22
> respectively). Passing them *after* an explicit `-b <value>`
> silently overrides your value. Always put `-b` after any
> `-mprage` / `-washu_mprage` flag if both are needed.

> [!gotcha] `-atlas <gca> <xform> <distance>` requires a **voxel** distance
> The third argument to `-atlas` is parsed with `atoi()` and
> stored as `brain_distance` (an integer voxel count), not
> millimetres. For 1 mm isotropic conformed volumes this
> coincidentally matches mm, but for `-cm` hi-res data it does
> not.

> [!gotcha] `-l` and `-r` flags both expect **two** positional arguments
> `-L <ctrl.mgz> <bias.mgz>` and `-R <ctrl.mgz> <bias.mgz>` each
> consume two arguments (`nargs = 2`). A single argument leads
> to an unexpected shift in subsequent flag parsing and
> confusing error messages.

> [!gotcha] `-renorm` fully short-circuits the pipeline
> When `-renorm <ref.mgz>` is passed, `main()` at
> [[`mri_normalize.cpp:223–279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L223-L279)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L223-L279) runs its own code path (erode,
> build bias image, apply correction, write output) and
> `exit(0)`s. Every other flag (aseg, surface, atlas, longitudinal)
> is ignored.

> [!gotcha] `-T2` does NOT produce a useful result
> Although `-T2` / `-PD` sets `contrast = T2_CONTRAST`, the core
> control-point search assumes a T1-like histogram: WM is bright.
> On T2 input, control points are placed in CSF or in dark WM
> voxels, and the output is meaningless. FreeSurfer uses a
> different tool ([[mri_segment_hypothalamic_subunits]] /
> [[mri_synthseg]]) for non-T1 data.

> [!gotcha] Numerical defaults are compile-time
> `DEFAULT_DESIRED_WHITE_MATTER_VALUE = 110`,
> `MAX_GRADIENT = 1.0`, `bias_sigma = 8.0`, `num_3d_iter = 2`,
> `intensity_above = 25`, `intensity_below = 10`, `min_dist = 2.5`,
> `nonmax_thresh = 2.5`. Any of these can be changed on the
> command line, but the WM target 110 is hard-coded throughout
> the rest of FreeSurfer.

## Typical Use Cases

### Use case 1: recon-all's Stage 4 (autorecon1 Normalization)

```bash
mri_normalize -g 1 -seed 1234 -mprage nu.mgz T1.mgz
```

Produces `T1.mgz` from the bias-corrected `nu.mgz`. `-g 1`
caps the bias-field gradient; `-mprage` sets
`intensity_below = 15` (tighter than the 10 default); `-seed 1234`
fixes the RNG seed for reproducibility.

### Use case 2: recon-all's Stage 12 (autorecon2 Normalization 2)

The Stage 12 invocation additionally passes
`-aseg aseg.presurf.mgz -mask brainmask.finalsurfs.mgz` (inferred
from the `DoNormalization2` branch around
`scripts/recon-all:3116`, still to be fully documented in the
pipeline page). The aseg feeds the WM labels directly into the
control-point search, bypassing the histogram.

### Use case 3: Rerun with hand-edited control points

```bash
mri_normalize -f $SUBJECTS_DIR/<subj>/tmp/control.dat \
    -g 1 -seed 1234 -mprage nu.mgz T1.mgz
```

`recon-all -autorecon2-cp` assembles exactly this command
(with `UseControlPoints = 1`), after the user has added / removed
control points in `tmp/control.dat`.

### Use case 4: Longitudinal base — write control points for reuse

```bash
mri_normalize -g 1 -seed 1234 \
    -W ctrl_vol.mgz bias_vol.mgz \
    nu.mgz T1.mgz
```

Writes `ctrl_vol.mgz` and `bias_vol.mgz` for each later time
point to read. The longitudinal time-points then call:

```bash
mri_normalize -seed 1234 \
    -w <tp>/mri/ctrl_vol.mgz <tp>/mri/bias_vol.mgz \
    -l <base>/mri/ctrl_vol.mgz <base>/mri/bias_vol.mgz \
    <tp>/mri/nu.mgz <tp>/mri/T1.mgz
```

This is the exact command at `scripts/recon-all:2157–2163`
(note: `-w` and `-l` are both used; `-w` writes the tp's
control/bias files, `-l` reads the base's).

### Use case 5: Standalone normalisation of an already-skull-stripped
volume

```bash
mri_normalize -noskull -mprage skulled.mgz normed.mgz
```

`-noskull` disables skull-related logic.

### Use case 6: Quick renormalisation using a reference volume

```bash
mri_normalize -renorm $OTHER_SUBJ/mri/T1.mgz -sigma 4 in.mgz out.mgz
```

`-renorm` extracts voxels where `$OTHER_SUBJ/mri/T1.mgz == 110`,
uses them as control points, and re-fits the bias field on `in.mgz`.

## Pipeline Context

**Predecessors (in recon-all):**
- Autorecon1 Stage 4: [[mri_nu_correct.mni]] → `nu.mgz`.
- Autorecon2 Stage 12: [[mri_watershed]] → `brainmask.mgz` and
  [[mri_ca_label]] → `aseg.presurf.mgz`.

**Successors (in recon-all):**
- Autorecon1 Stage 4's output `T1.mgz` is the input to
  [[mri_watershed]] (Stage 5), [[mri_em_register]] (Stage 6),
  and [[mri_ca_normalize]] (Stage 7).
- Autorecon2 Stage 12's output `brain.mgz` / `brain.finalsurfs.mgz`
  feeds [[mri_segment]], [[mri_edit_wm_with_aseg]], and all
  surface-placement tools.

**Predecessor:** [[mri_nu_correct.mni]] → **mri_normalize** →
**Successor:** [[mri_watershed]].

## Error Compensation and Guard Rails

- **Missing WM mode in histogram**: falls back to the `-aseg`
  or `-atlas` priors if supplied.
- **Spatially sparse control points**: the Gaussian smoothing
  (`bias_sigma = 8 mm`) inherently extrapolates across sparse
  regions; `-g 1` caps the gradient.
- **Outliers in control points**: `MRIremoveWMOutliers` and
  `MRIremoveWMOutliersAndRetainMedialSurface` prune control
  points that are too dark or too bright relative to the local
  WM mode.
- **Multiple iterations**: two 3-D iterations is the default,
  allowing later passes to correct for errors introduced by
  the first pass's incomplete control-point set.
- **Renormalisation volume with different geometry**: `-renorm`
  resamples the reference volume via `MRIresample(...,
  SAMPLE_TRILINEAR)` if dimensions do not match
  ([[`mri_normalize.cpp:232–237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L232-L237)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_normalize/mri_normalize.cpp#L232-L237)).

## Related Tools

- [[mri_nu_correct.mni]] — the predecessor: estimates and
  removes the smooth multiplicative bias field.
- [[mri_ca_normalize]] — the *atlas-based* normaliser used in
  autorecon2 Stage 7 to produce `norm.mgz`. Conceptually
  similar but uses GCA labels rather than histogram-based
  control points.
- [[mri_segment]] — consumes `brain.finalsurfs.mgz` after Stage
  12 to produce `wm.mgz`.
- [[mri_watershed]] — consumes `T1.mgz` for skull stripping.
- [[mri_em_register]] — consumes `nu.mgz` (not `T1.mgz`)
  for atlas alignment.
- [[mri_make_uchar]] — performs a different kind of "centre at
  110" operation (histogram-only, no spatial bias-field
  model), done as part of the `--uchar` step of
  [[mri_nu_correct.mni]].
- [[freeview-pointsets]] — GUI for interactively placing, editing, and saving the manual control-point files (`.dat` / `.label`) consumed by `-f`, `-label`, `-file_only`, and `-label_only`

## Confidence and Gaps

- **High confidence**: argument parsing, defaults, the
  predictor/successor role in `recon-all` (Stage 4 and the
  longitudinal time-point call at line 2157), the WM target
  constant.
- **Medium confidence**: the exact mathematics of
  `MRIbuildBiasImage()` and `MRI3dNormalize()` — these live in
  `utils/mrinorm.cpp` and have not been traced line-by-line.
  The high-level description above is consistent with the
  `compute_bias()` helper in the same file and the Dale 1999
  reference.
- **Low confidence**: the behaviour when `-surface` and
  `-aseg` are combined. The `main()` code dispatches to
  separate branches depending on which flags are set; the
  combined case may still work but has not been tested.

> [!gap] `MRI3dNormalize` internals
> The actual 3-D refinement iteration lives in
> `utils/mrinorm.cpp:MRI3dNormalize()` and sibling functions.
> A complete trace into that module is needed to explain the
> per-iteration rescaling, the gradient constraint, and the
> non-maximum suppression logic.

> [!gap] Default of `num_3d_iter` across recon-all calls
> `recon-all`'s Stage 4 invocation does not pass `-n`, so
> `num_3d_iter` stays at its default `2`. Stage 12 may pass
> a different value; confirming this requires reading the
> `DoNormalization2` block.

## References

- Source: `$FREESURFER_SOURCE/mri_normalize/mri_normalize.cpp`
  (2168 lines, FreeSurfer 8.2.0)
- Constants: `$FREESURFER_SOURCE/include/mrinorm.h`
  (`DEFAULT_DESIRED_WHITE_MATTER_VALUE = 110`, `MAX_GRADIENT = 1`)
- Dale, A. M., Fischl, B., Sereno, M. I. *Cortical surface-based
  analysis I: Segmentation and surface reconstruction*.
  NeuroImage 9(2):179–194, 1999. (The foundational paper that
  describes the control-point approach used by `mri_normalize`.)
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_normalize>
  (accessed 2026-04-14)
- FreeSurfer tutorial: *Control Points*
  <https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/ControlPoints>
  (accessed 2026-04-14)
