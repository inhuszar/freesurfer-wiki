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

$$
E(\mathbf{u}) = -\sum_{v \in \Omega} \log p\!\left(I(v) \mid k_v, \mathbf{u}(v)\right) \cdot p\!\left(k_v \mid \mathbf{u}(v)\right) + \lambda_{\text{smooth}} E_{\text{smooth}}(\mathbf{u})
$$

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
| `-T <lta>` | string | — | Initial affine LTA transform (from [[mri_em_register]]) |
| `-mask <file>` | string | — | Brain mask to restrict registration |
| `-align` | flag | off | Renormalize GCA with structure alignment before registration; sets `regularize=0.5`, `regularize_mean=0.5`. Alias for `-align-cross-sequence` |
| `-align-after` | flag | off | Same as `-align` but applies renormalization with alignment **after** registration instead of before |
| `-align-cross-sequence` | flag | off | Alias for `-align`; renormalize GCA with structure alignment |
| `-T2mask <file> <thresh>` | string+float | — | T2 mask for bright CSF removal; mask file + intensity threshold |
| `-amask <aparc_aseg> <T2> <thresh>` | string+string+float | — | Combine aparc+aseg volume and T2 volume (thresholded) to mask input |
| `-novar` | flag | on | Unify GCA variance (ignore per-node variance estimates) |
| `-usevar` | flag | off | Enable per-node GCA variance estimates (disables `-novar` default) |
| `-renorm <file>` | string | — | Per-label renormalization file with predicted intensity values |
| `-renormalize` | flag | off | Renormalize GCA to MAP estimate of means from data before registration |
| `-renorm_map` | flag | off | Alias for `-renormalize`; renormalize GCA to MAP estimate |
| `-renormalize_map` | flag | off | Alias for `-renormalize`; renormalize GCA to MAP estimate |
| `-histo-norm` | flag | off | Use prior subject histograms for initial GCA renormalization |
| `-secondpassrenorm` | flag | off | Perform 2nd-pass renormalization |
| `-cross-sequence` | flag | off | Register across sequences; sets `regularize=0.5`, `avgs=2`, `renormalize=1` |
| `-cross_sequence` | flag | off | Alias for `-cross-sequence` |
| `-cross-sequence-new` | flag | off | Cross-sequence registration using new renormalization method |
| `-cross_sequence_new` | flag | off | Alias for `-cross-sequence-new` |
| `-nocerebellum` | flag | off | Remove cerebellum labels from atlas before registration |
| `-lh` | flag | off | Remove right hemisphere labels from atlas (register left hemisphere only) |
| `-rh` | flag | off | Remove left hemisphere labels from atlas (register right hemisphere only) |
| `-nobright` | flag | off | Remove bright non-brain structures from registration |
| `-bigventricles` | flag | off | Enable special handling for expanded ventricles (`handle_expanded_ventricles=1`) |
| `-nobigventricles` | flag | off | Disable expanded-ventricle handling |
| `-TR <val>` | float | -1 | T1 map repetition time (TR) in ms, for FLASH forward model |
| `-TE <val>` | float | -1 | T1 map echo time (TE) in ms |
| `-alpha <val>` | float | -1 | Flip angle in degrees for T1 map |
| `-flash` | flag | off | Use FLASH forward model to predict intensity values |
| `-flash_parms <file>` | string | — | Use FLASH forward model with tissue parameters from file |
| `-noscale` | flag | off | Disable atlas intensity scaling |
| `-regularize <val>` | float | 0 | GCA variance regularization weight: `sigma + val * C(noise)` |
| `-regularize_mean <val>` | float | 0 | Regularize GCA conditional means toward global mean (fraction) |
| `-twm <file>` | string | — | Temporal lobe WM control points file |
| `-tl <file>` | string | — | Read temporal lobe atlas from file |
| `-vf <file>` | string | — | Write displacement vector field to file |
| `-write_gca <file>` | string | — | Write modified GCA to file |
| `-write_mean <file>` | string | — | Write GCA means volume to file |
| `-rusage <file>` | string | — | Write resource usage log to file |
| `-reduce <N>` | int | 1 | Reduce (downsample) input images N times before aligning |
| `-avgs <N>` | int | 0 | Smooth GCA conditional densities N times (mean filter) |
| `-gsmooth <sigma>` | float | — | Pre-smooth atlas with Gaussian of given sigma (mm) |
| `-center` | flag | on | Use GCA centroid as origin of transform |
| `-levels <N>` | int | 6 | Number of multi-resolution pyramid levels |
| `-dt <val>` | float | 0.05 | Integration time step for gradient descent |
| `-tol <val>` | float | 0.05 | Convergence tolerance (minimum % SSE decrease) |
| `-n <N>` | int | 500 | Number of iterations per pyramid level |
| `-a <N>` | int | 256 | Number of gradient smoothing averages per iteration |
| `-m <val>` | float | 0.9 | Momentum for gradient descent |
| `-w <N>` | int | — | Write diagnostic iterations every N steps (enables DIAG_WRITE) |
| `-s <sigma>` | float | 2.0 | Upper bound on blurring sigma for multi-scale smoothing |
| `-b <sigma>` | float | 0.0 | Pre-blur input image with Gaussian of given sigma |
| `-k <val>` | float | 20 | Exponential energy scale factor `exp_k` |
| `-j <val>` | float | 1.0 | Jacobian energy term weight `l_jacobian` |
| `-p <pct>` | float | 0.25 | Top fraction of WM points used as control points |
| `-x <file>` | string | — | Read previously computed (initial) transform from file |
| `-f <file>` | string | — | Read manually defined control points from file |
| `-l <xform> <reg>` | string+string | — | Longitudinal analysis: apply inverse of registration `<reg>` using atlas transform `<xform>` |
| `-v <no>` | int | — | Set diagnostic node number `Gdiag_no` for debugging |
| `-z <val>` | int | — | Control zero-node disabling; `0` = disable zero nodes |
| `-smooth <val>` | float | — | Smoothness energy weight `l_smoothness` |
| `-smoothness <val>` | float | — | Alias for `-smooth` |
| `-dist <val>` | float | — | Distance energy term weight `l_distance` |
| `-distance <val>` | float | — | Alias for `-dist` |
| `-area <val>` | float | — | Area energy term weight `l_area` |
| `-likelihood <val>` | float | — | Likelihood energy term weight `l_likelihood` |
| `-ll <val>` | float | 0.2 | Log-likelihood energy term weight `l_log_likelihood` |
| `-loglikelihood <val>` | float | 0.2 | Alias for `-ll` |
| `-label <val>` | float | 1.0 | Label energy term weight `l_label` |
| `-label_dist <val>` | float | 10.0 | Label assignment distance threshold (mm) |
| `-ldist <val>` | float | 10.0 | Alias for `-label_dist` |
| `-map <val>` | float | 0.0 | MAP energy term weight `l_map` |
| `-max_grad <val>` | float | 0.3 | Maximum gradient norm; gradients exceeding this are scaled down |
| `-fixed` | flag | off | Use fixed time-step integration (`GCAM_INTEGRATE_FIXED`) |
| `-optimal` | flag | off | Use optimal time-step integration (`GCAM_INTEGRATE_OPTIMAL`) |
| `-noneg <val>` | int | 1 | Control fold prevention; `1` = disallow folds, `0` = allow |
| `-neg <val>` | int | — | Inverse fold flag; `0` maps to `noneg=1`, `1` maps to `noneg=0` |
| `-prior <val>` | float | — | Minimum prior probability threshold for label assignment |
| `-rthresh <val>` | float | 0.1 | Compression ratio threshold for fold detection |
| `-relabel <val>` | int | — | Enable MAP relabeling of nodes (`1`=on, `0`=off) |
| `-relabel_avgs <N>` | int | -1 | Apply MAP relabeling when `navgs` reaches N (-1 = never) |
| `-reset_avgs <N>` | int | 0 | Reset metric properties when `navgs` drops to N |
| `-reset` | flag | off | Reset all metric properties |
| `-nsmall <N>` | int | 1 | Number of small gradient steps allowed before termination |
| `-small <N>` | int | 1 | Alias for `-nsmall` |
| `-min_avgs <N>` | int | 0 | Minimum number of gradient smoothing averages |
| `-scale_smoothness <val>` | int | 1 | Scale smoothness coefficient across pyramid levels; sets `npasses=2` |
| `-uncompress` | flag | off | Set `parms.uncompress=1` |
| `-isize <N>` | int | — | Diagnostic image size in pixels |
| `-image_size <N>` | int | — | Alias for `-isize` |
| `-norm <file>` | string | — | Intensity normalize input and write to file |
| `-example <T1> <seg>` | string+string | — | Use provided T1 and segmentation as intensity normalization examples |
| `-contrast` | flag | off | Use image contrast to find labels |
| `-from_atlas` | flag | off | Morph diagnostics from atlas coordinates (`diag_morph_from_atlas=1`) |
| `-insert <lbl> <int> <x> <y> <z> <r>` | mixed | — | Manually insert label `lbl` with intensity `int` at voxel `(x,y,z)` within radius `r` |
| `-samples <file>` | string | — | Write control point samples to file |
| `-fsamples <file>` | string | — | Write transformed control points to file |
| `-isamples <file>` | string | — | Alias for `-fsamples` |
| `-nsamples <file>` | string | — | Write transformed normalization control points to file |
| `-transonly` | flag | off | Compute translation parameters only |
| `-diag <file>` | string | — | Open diagnostic output file for writing |
| `-debug_node <x> <y> <z>` | int+int+int | — | Enable debugging for atlas node at grid coordinates `(x,y,z)` |
| `-debug_voxel <x> <y> <z>` | int+int+int | — | Enable debugging for image voxel at `(x,y,z)` |
| `-snapshots <x> <y> <z>` | int+int+int | — | Write plane snapshots through `(x,y,z)` during optimization |
| `-write_grad` | flag | off | Write gradients to disk each iteration (diagnostic) |
| `-read_intensities <file>` | string | — | Read intensity scaling from file |
| `-read_lta` | flag | off | Read LTA transform from `<base-name>.lta` |
| `-ri <file>` | string | — | Short alias for `-read_intensities` |
| `-no-re-init` | flag | off | Do not reinitialize GCAM with linear registration result |
| `-no-reinit` | flag | off | Alias for `-no-re-init` |
| `-no_re_init` | flag | off | Alias for `-no-re-init` |
| `-invert-and-save <in> <out>` | string+string | — | Load GCAM from `<in>`, compute and save inverse to `<out>`, then exit |
| `-wm` | flag | off | Register white matter specifically in the initial registration pass |
| `-threads <N>` | int | — | Set number of OpenMP threads |

## Configuration Interactions

- `-T` (initial LTA) is essential for convergence; without it, the tool starts from identity which may not converge for all brains.
- `-novar` (on by default) unifies variance, making optimization faster and more stable but less sensitive to intensity variability. Use `-usevar` to re-enable per-node variance.
- `-align` and `-align-after` are different phases of intensity re-estimation: the former renormalizes with structure alignment **before** deformable registration; the latter does so **after**.
- `-nocerebellum` / `-lh` / `-rh` are useful for partial-brain or ex-vivo data but reduce atlas coverage.
- `-cross-sequence` is a convenience flag that sets `regularize=0.5`, `avgs=2`, and `renormalize=1` — suitable for registering images acquired with a different sequence from the training data.
- The energy weights (`-ll`, `-label`, `-smooth`, `-dist`, `-j`, `-area`, `-map`) control which objective function terms dominate. The default of `l_log_likelihood=0.2` balances intensity fit against anatomical regularity.

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
> In subjects with large ventricles (hydrocephalus, atrophy), the default settings may fail because the WM/CSF boundary becomes very different from the atlas. The `-bigventricles` flag activates special handling for this case (`handle_expanded_ventricles=1`).

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
