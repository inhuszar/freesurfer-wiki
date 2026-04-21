---
title: "mri_ca_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ca_register/mri_ca_register.cpp"
families:
  - "mri_*"
  - "mri_ca_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_em_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_label]]"
  - "[[recon-all]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - registration
  - atlas
  - GCA
  - nonlinear
  - deformable
---

# mri_ca_register

## Summary

`mri_ca_register` performs high-dimensional nonlinear registration of a subject's normalized MRI volume to a [[gca-format|Gaussian Classifier Atlas]] (GCA), producing a voxel-warp field ([[m3z-format|`.m3z`]] morphological transform). It is the deformable atlas registration step in [[recon-all]]'s autorecon2 stage, following the affine registration by [[mri_em_register]] and the intensity normalization by [[mri_ca_normalize]]. The resulting transform is used by [[mri_ca_label]] to produce the subcortical segmentation (`aseg.mgz`).

## Source Information

- **Language:** C++
- **Source file:** `mri_ca_register/mri_ca_register.cpp`
- **Original author:** Bruce Fischl
- **Reference:** "Automatically Parcellating the Human Cerebral Cortex", Fischl et al. (2004), *Cerebral Cortex*, 14:11–22.

## Purpose and Context

The GCA atlas encodes both spatial prior probabilities and intensity likelihoods for each brain structure. Deformable registration of the subject to this atlas enables accurate subcortical segmentation even in the presence of anatomical variability. The nonlinear warp field from `mri_ca_register` allows [[mri_ca_label]] to map the atlas labels to subject space with sub-millimeter precision.

The GCA morph deformation model uses a regular 3D grid of control points; each point can move to minimize the joint negative log-likelihood of the atlas given the observed intensities and the regularization energy.

## Inputs

Positional arguments:
1. `<in_vol>` — normalized brain volume (e.g., `norm.mgz`), optionally multiple inputs
2. `<atlas.gca>` — GCA atlas file (e.g., `$FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca`)
3. `<output.m3z>` — output morph transform path

Key required input in most usage:
- `-T <transform_lta>` — initial affine LTA transform from [[mri_em_register]]

## Outputs

- A `.m3z` GCA morph file (nonlinear warp, 3D grid of displacements) encoding the transformation from subject space to atlas space.
- Optionally: diagnostic sample files, atlas-mean volume, LTA.

## Mathematical Foundations

The optimization minimizes the joint energy:

$$E(\mathbf{u}) = -\sum_{v \in \Omega} \log p\!\left(I(v) \mid k_v, \mathbf{u}(v)\right) \cdot p\!\left(k_v \mid \mathbf{u}(v)\right) + \lambda_{\text{smooth}} E_{\text{smooth}}(\mathbf{u})$$

where:
- $\mathbf{u}$ is the displacement field at each control point
- $I(v)$ is the observed intensity at voxel $v$
- $k_v$ is the most probable label at the warped atlas position $\mathbf{u}(v)$
- $p(I | k, x_p) = \mathcal{N}(I; \mu_k(x_p), \sigma_k^2(x_p))$ is the GCA conditional density
- $E_{\text{smooth}}$ penalizes non-smooth deformations (typically a Laplacian regularizer)

Optimization proceeds through multiple levels of a Gaussian image pyramid (`levels = 6` by default) using gradient descent with momentum. The log-likelihood weight is `l_log_likelihood = 0.2` by default.

Key GCA morph parameters (defaults):
- `niterations = 500`
- `levels = 6`
- `scale_smoothness = 1`

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-T <lta>` | string | — | Initial affine LTA transform (from mri_em_register) |
| `-mask <file>` | string | — | Brain mask to restrict registration |
| `-align` | flag | off | Align GCA means to data before registration |
| `-T2mask <file> <thresh>` | string+float | — | T2 mask for bright CSF removal |
| `-aparc_aseg <file>` | string | — | Use aparc+aseg to refine atlas probabilities |
| `-novar` | int | 1 | Unify GCA variance (default: on) |
| `-renorm <file>` | string | — | Per-label renormalization file |
| `-renormalize` | flag | off | Renormalize GCA from data before registration |
| `-renormalize_new` | flag | off | New renormalization method |
| `-renormalize_align` | flag | off | Renormalize with alignment (before registration) |
| `-renormalize_align_after` | flag | off | Renormalize with alignment (after registration) |
| `-secondpass_renorm` | flag | off | Perform second-pass renormalization |
| `-remove_cerebellum` | flag | off | Remove cerebellum from GCA |
| `-remove_lh` | flag | off | Remove left hemisphere |
| `-remove_rh` | flag | off | Remove right hemisphere |
| `-remove_bright` | flag | off | Remove bright non-brain voxels |
| `-TR <val>` | float | -1 | T1 map TR |
| `-TE <val>` | float | -1 | T1 map TE |
| `-alpha <val>` | float | -1 | T1 map flip angle |
| `-noscale` | flag | off | Disable atlas intensity scaling |
| `-regularize <val>` | float | 0 | GCA regularization weight |
| `-regularize_mean <val>` | float | 0 | Regularize GCA conditional means |
| `-long_reg <file>` | string | — | Longitudinal registration transform |
| `-twm <file>` | string | — | Temporal lobe WM control points file |
| `-vf <file>` | string | — | Write displacement vector field |
| `-write_gca <file>` | string | — | Write modified GCA to file |
| `-gca_mean <file>` | string | — | Read pre-computed GCA mean |
| `-rusage <file>` | string | — | Resource usage log file |
| `-xform <name>` | string | — | Name of transform type |
| `-nreductions <N>` | int | 1 | Number of pyramid reductions |
| `-handle_expanded_ventricles` | flag | off | Special handling for expanded ventricles |
| `-avgs <N>` | int | 0 | Smooth GCA conditional densities N times |

## Configuration Interactions

- `-T` (initial LTA) is essential for convergence; without it, the tool starts from identity which may not converge for all brains.
- `-novar 1` (the default) unifies variance, making optimization faster and more stable but less sensitive to intensity variability.
- `-renormalize_align` and `-renormalize_align_after` are different phases of intensity re-estimation during/after deformable registration.
- `-remove_cerebellum` / `-remove_lh` / `-remove_rh` are useful for partial-brain or ex-vivo data but reduce atlas coverage.

## Typical Use Cases

**Standard autorecon2 nonlinear atlas registration:**
```bash
mri_ca_register -align -mask brainmask.mgz \
  -T transforms/talairach.lta \
  norm.mgz \
  $FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca \
  transforms/talairach.m3z
```

(This is the exact command from the tool's own documentation comment at the top of the source file.)

## Pipeline Context

In [[recon-all]], `mri_ca_register` runs in autorecon2 as part of the subcortical segmentation preparation:

1. [[mri_em_register]] → `transforms/talairach.lta` (affine)
2. [[mri_ca_normalize]] → `norm.mgz` (normalized T1)
3. **`mri_ca_register`** → `transforms/talairach.m3z` (nonlinear warp)
4. [[mri_ca_label]] → `aseg.mgz` (subcortical segmentation)

## Gotchas and Caveats

> [!gotcha] Long runtime
> Nonlinear atlas registration with 6 pyramid levels and 500 iterations per level can take 30–90 minutes on a typical CPU. OpenMP parallelism (`n_omp_threads`) helps but the tool is still the dominant runtime step in autorecon2.

> [!gotcha] novar default is ON
> Unlike [[mri_ca_normalize]], here `-novar 1` is the **default** (variable `novar = 1` in the source). This suppresses per-node variance, making the log-likelihood purely mean-based. To use the full Gaussian model, you would need to explicitly set `-novar 0`.

> [!gotcha] Expanded ventricles
> In subjects with large ventricles (hydrocephalus, atrophy), the default settings may fail because the WM/CSF boundary becomes very different from the atlas. The `-handle_expanded_ventricles` flag activates special handling for this case.

> [!gotcha] Output format is .m3z not .lta
> The output is a GCA morph file (`.m3z`), not a linear transform (`.lta`). It cannot be used with tools that only accept LTA transforms.

## Related Tools

- [[mri_em_register]] — affine registration that produces the initial LTA for this step
- [[mri_ca_normalize]] — normalization step that precedes this
- [[mri_ca_label]] — segmentation step that consumes the output `.m3z`
- [[mri_ca_train]] — builds the GCA atlas used here

## Confidence and Gaps

Source code header and main function fully read. Confidence is high for interface and general algorithm; medium for detailed optimization parameters.

> [!gap] Detailed GCA morph optimization
> The GCA morph optimization is implemented in `gcamorph.cpp`. The exact gradient computation, step size adaptation, and multi-resolution schedule are in that file, not documented here.
