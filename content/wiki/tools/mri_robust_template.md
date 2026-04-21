---
title: "mri_robust_template"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_robust_register/mri_robust_template.cpp"
families:
  - "mri_robust_*"
recon_all_stage: "autorecon1"
related:
  - "[[mri_robust_register]]"
  - "[[mgz]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact convergence criterion details for the iterative mean/median estimation loop need verification."
tags:
  - registration
  - longitudinal
  - motion-correction
  - robust-estimation
---

# mri_robust_template

## Summary

`mri_robust_template` constructs an unbiased, robust group template from multiple volumetric MRI images using an iterative M-estimation strategy. It jointly estimates a mean or median reference volume and the rigid (or affine) registrations of all input volumes to that reference, downweighting outlier voxels at each iteration. It is used in FreeSurfer for (1) within-session motion correction of multiple T1 runs in `recon-all`, and (2) within-subject longitudinal template construction in the `-base` longitudinal stream.

## Source Information

- **Language:** C++
- **Primary source:** `mri_robust_register/mri_robust_template.cpp`
- **Original author:** Martin Reuter
- **Key references:**
  - Reuter et al., *NeuroImage* 53(4):1181–1196, 2010. doi:10.1016/j.neuroimage.2010.07.020
  - Reuter & Fischl, *NeuroImage* 57(1):19–21, 2011. doi:10.1016/j.neuroimage.2011.02.076
  - Reuter et al., *NeuroImage* 61(4):1402–1418, 2012. doi:10.1016/j.neuroimage.2012.02.084

## Purpose and Context

In standard `recon-all`, when a subject has multiple T1 acquisitions, they must be motion-corrected and averaged before skull stripping and surface reconstruction. `mri_robust_template` replaces naive voxel-wise averaging by (a) registering all runs to a common template and (b) using a robust statistical estimator that is insensitive to signal dropouts, ghosting, or other per-run artefacts.

In the longitudinal processing stream (`recon-all -base`), it constructs an unbiased within-subject template from scans at different time points, ensuring that no single time point is preferentially used as a reference, which would introduce asymmetric bias in morphometric estimates.

## Inputs

| Input | Description |
|-------|-------------|
| `--mov tp1.mgz tp2.mgz ...` | Two or more input volumes to align (required). Should have comparable intensity levels (e.g., all `T1.mgz` or all `norm.mgz`). |
| `--ixforms t1.lta t2.lta ...` | Optional initial transforms (LTA format) to seed the registration. |
| `--masks mask1.mgz ...` | Optional per-input brain masks applied before registration. |
| `--iscalein is1.txt is2.txt ...` | Optional initial intensity scale factors (text files). |

> [!assumption] Input intensity matching
> Best performance requires all input volumes to be at the same intensity level. The FreeSurfer `norm.mgz` and `T1.mgz` outputs are suitable inputs. Raw scanner images at different flip angles or with differing intensity scaling will degrade performance unless `--iscale` is also used.

## Outputs

| Output | Description |
|--------|-------------|
| `--template template.mgz` | Final mean or median template volume (required). |
| `--lta tp1.lta tp2.lta ...` | Output rigid transforms from each input to the template (one per input). |
| `--mapmov aligned1.mgz ...` | Each input resampled into template space. |
| `--mapmovhdr aligned1.mgz ...` | Header-adjusted inputs (no resampling; only the vox2ras matrix is updated). |
| `--weights weights1.mgz ...` | Per-voxel robustness weights in template space (1 = inlier, 0 = outlier). With `--oneminusw`, the polarity is inverted. |
| `--iscaleout is1.txt is2.txt ...` | Final intensity scale factors (activates `--iscale` automatically). |

## Mathematical Foundations

The algorithm minimizes a robust cost function over all pairwise registrations simultaneously. At each iteration $t$:

1. Given current transforms $\{T_i^{(t)}\}$, compute a robust mean/median template $\bar{V}^{(t)}$ from the resampled inputs weighted by per-voxel robustness weights $w_i^{(t)}$.
2. For each input $i$, update $T_i^{(t+1)}$ by robust rigid registration of $V_i$ to $\bar{V}^{(t)}$ using a Tukey or Huber M-estimator with sensitivity parameter $\rho$ (controlled by `--sat`).

The robust registration uses the Riemannian geometry of the rotation group to avoid parameterization singularities. The registration is inverse-consistent: the algorithm is symmetric with respect to the choice of reference frame, ensuring no bias toward any particular input.

For the longitudinal template, the group mean is computed in a symmetric fashion so that all time points contribute equally — a critical property for longitudinal morphometric studies.

$$\hat{T}_i = \arg\min_{T_i} \sum_v w_v \cdot \rho\!\left(\frac{V_i(T_i^{-1}(v)) - \bar{V}(v)}{\sigma}\right)$$

where $\rho$ is the Tukey biweight function, $w_v$ are voxel weights, and $\sigma$ is estimated from the data or set via `--sat`.

## Configuration Options

### Required

| Flag | Description |
|------|-------------|
| `--mov <tp1.mgz> <tp2.mgz> ...` | Input volumes to align (two or more required). |
| `--template <template.mgz>` | Output template volume. |
| `--sat <real>` | Outlier sensitivity parameter (e.g., `4.685`). Higher = less sensitive. Mutually exclusive with `--satit`. |
| `--satit` | Auto-detect sensitivity from data (recommended for full-brain scans). Mutually exclusive with `--sat`. |

### Optional Outputs

| Flag | Description |
|------|-------------|
| `--lta <tp1.lta> <tp2.lta> ...` | Output transforms to template. |
| `--mapmov <aligned1.mgz> ...` | Resampled inputs in template space. |
| `--mapmovhdr <aligned1.mgz> ...` | Header-adjusted inputs (no resampling). |
| `--weights <weights1.mgz> ...` | Outlier weight maps. |
| `--oneminusw` | Invert weight polarity (0 = outlier). |
| `--iscaleout <is1.txt> ...` | Output intensity scale factors (activates `--iscale`). |

### Registration Control

| Flag | Description |
|------|-------------|
| `--average <#>` | Template type: 0 = mean, 1 = median (default). |
| `--inittp <#>` | Use timepoint # for spatial initialisation (default: random); 0 = no init. |
| `--fixtp` | Map everything to the initial timepoint (no resampling of init TP). |
| `--transonly` | Find 3-parameter translation only. |
| `--affine` | Find full 12-parameter affine transform. |
| `--ixforms <t1.lta> ...` | Initial transforms (LTA; `id` = identity). |
| `--masks <mask1.mgz> ...` | Input masks. |
| `--iscale` | Allow intensity scaling (default: off). |
| `--iscaleonly` | Perform intensity scaling only (no geometric transform). |
| `--iscalein <is1.txt> ...` | Initial intensity scale factors. |

### Iteration Control

| Flag | Description |
|------|-------------|
| `--noit` | Do not iterate; create first template only. |
| `--maxit <#>` | Maximum outer iterations (default: 6 for >2 TPs, 5 for 2 TPs). |
| `--highit <#>` | Maximum iterations at highest resolution (default: 5). |
| `--epsit <real>` | Stop when all TP transform updates fall below threshold (default: 0.03 for >2 TPs, 0.01 for 2 TPs). |
| `--pairmaxit <#>` | Max iterations for pairwise registrations (default: 5). |
| `--pairepsit <real>` | Stop pairwise iterations below threshold (default: 0.01). |
| `--nomulti` | Skip multi-resolution; use highest resolution only. |

### Numerical / Precision

| Flag | Description |
|------|-------------|
| `--subsample <#>` | Subsample if any dimension exceeds # (default: no subsampling). |
| `--floattype` | Convert inputs to float internally. |
| `--doubleprec` | Use double precision internally (very high memory usage). |
| `--finalnearest` | Use nearest-neighbour interpolation in final average step. |
| `--vox2vox` | Output VOX2VOX LTA files (default: RAS2RAS). |
| `--leastsquares` | Use least-squares instead of robust M-estimator (testing only). |
| `--cras` | Centre template at average CRAS instead of average barycenter. |
| `--res-thresh <val>` | Volume resolution threshold (default: 0.01 mm). |
| `--frobnorm-thresh <val>` | Matrix Frobenius norm threshold (default: 0.0001). |
| `--debug` | Enable verbose debug output. |

## Configuration Interactions

- `--sat` and `--satit` are mutually exclusive; one must be specified.
- `--satit` works best when the field of view includes the full head or full brain; it should not be used on tightly cropped volumes.
- `--inittp` combined with `--fixtp` and `--noit` performs a one-shot motion correction where all inputs are registered to a fixed reference timepoint without iteration. This is the mode used by `recon-all` for motion correction.
- `--affine` overrides the default 6-DOF rigid registration; this is not appropriate for within-session motion correction but may be useful for cross-session or cross-protocol template creation.
- `--transonly` reduces the DOF to 3 (translation only); useful when rotations are known to be negligible.
- `--iscaleout` implicitly activates `--iscale`.
- `--doubleprec` can cause out-of-memory failures for typical full-brain volumes on systems with < 32 GB RAM.

## Typical Use Cases

### Motion correction (recon-all internal usage)

```bash
mri_robust_template \
  --mov 001.mgz 002.mgz \
  --average 1 \
  --template rawavg.mgz \
  --satit \
  --inittp 1 \
  --fixtp \
  --noit \
  --iscale \
  --subsample 200
```

Registers run 2 to run 1 (fixed reference), produces a median `rawavg.mgz`. No iteration is performed (`--noit`).

### Longitudinal within-subject template

```bash
mri_robust_template \
  --mov tp1/mri/norm.mgz tp2/mri/norm.mgz tp3/mri/norm.mgz \
  --template base/mri/template.mgz \
  --lta tp1.lta tp2.lta tp3.lta \
  --mapmov tp1_to_base.mgz tp2_to_base.mgz tp3_to_base.mgz \
  --average 0 \
  --iscale \
  --satit
```

Constructs a mean template from three time points with full iteration and intensity scaling.

## Pipeline Context

`mri_robust_template` is called during the **MotionCorrection** stage of `recon-all` (AutoRecon1) when multiple T1 inputs are provided. The sequence is:

1. Individual runs (e.g., `001.mgz`, `002.mgz`) are motion-corrected and averaged into `rawavg.mgz`.
2. `rawavg.mgz` feeds into `mri_convert` for conformation, then the rest of AutoRecon1.

In the longitudinal stream (`recon-all -base`), it is the first step: it creates the unbiased within-subject `template.mgz` from all time-point `norm.mgz` files.

**Runs before:** Raw input T1 volumes  
**Runs after:** `mri_convert` (conformation), skull stripping  
**Related pipeline:** [[recon-all]]

## Gotchas and Caveats

> [!gotcha] `--satit` requires full brain or full head
> Auto-detection of the sensitivity parameter (`--satit`) assumes a bimodal intensity distribution (brain tissue vs. background). It fails or produces poor results on tightly cropped volumes where the background is minimal.

> [!gotcha] All inputs must have similar intensity scales
> Mixing raw scanner inputs with processed images (e.g., `T1.mgz` vs. `001.mgz`) will degrade registration quality unless `--iscale` is used.

> [!gotcha] `--fixtp` with `--noit` does not create a true template
> In this mode the "template" is simply the fixed reference timepoint resampled to its own space. The median image (`rawavg.mgz`) is the resampled average, not an iteratively computed mean.

> [!gotcha] `--doubleprec` is expensive
> Double precision mode dramatically increases memory usage and is only intended for validation and testing.

> [!gotcha] Output LTA type depends on `--vox2vox`
> By default, output LTAs encode RAS2RAS transforms. If the downstream tool expects VOX2VOX transforms, use `--vox2vox`. Mixing types without awareness can introduce subtle coordinate errors.

## Related Tools

- [[mri_robust_register]] — pairwise robust rigid/affine registration (used internally)
- [[recon-all]] — calls `mri_robust_template` for motion correction
- [[mgz]] — primary volume format for inputs and outputs

## Confidence and Gaps

The flag descriptions and algorithmic overview are derived directly from the help XML and the published papers cited in the source code. Confidence is **high** for flag semantics and intended usage patterns.

> [!gap] Convergence criterion implementation
> The exact form of the convergence test (`--epsit`) as implemented in the source code (whether it uses the Frobenius norm of the transform update matrix, the RMS displacement, or another measure) has not been verified by reading the full registration loop in `mri_robust_register.cpp`. The documentation reflects the help text description only.
