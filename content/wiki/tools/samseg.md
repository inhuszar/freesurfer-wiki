---
title: "samseg"
type: tool
fs_version: "8.2.0"
source_language: "tcsh + Python"
source_files:
  - "samseg/samseg"
  - "samseg/run_samseg"
  - "gems/"
families:
  - "samseg"
recon_all_stage: null
related:
  - "[[samseg-long]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_ca_label]]"
  - "[[mri_em_register]]"
  - "[[lta-format]]"
  - "[[mgz]]"
  - "[[m3z-format]]"
  - "[[longitudinal-processing]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact structure label set produced by samseg vs. standard aseg — which extra structures (e.g. extracerebral) are included or excluded by default"
  - "Detailed GEMS C++ optimization internals (L-BFGS mesh deformation, multi-resolution schedule) not verified"
  - "Fat-shift correction mode (--fat-shift) not documented — unclear exactly what it does"
tags:
  - segmentation
  - multimodal
  - atlas
  - probabilistic
  - whole-brain
---

# samseg

## Summary

`samseg` performs probabilistic whole-brain segmentation using the Sequence-Adaptive Multimodal Segmentation (SAMSEG) algorithm. Unlike the classical GCA pipeline (`[[mri_em_register]]` + `[[mri_ca_label]]`), samseg does not assume any particular MRI contrast: it jointly estimates a tissue-intensity Gaussian Mixture Model (GMM) and a spatially smooth bias field while deforming a probabilistic tetrahedral mesh atlas to the input image. The result is a whole-brain segmentation volume (`seg.mgz`) using FreeSurfer label IDs and a nonlinear warp to the atlas space. samseg accepts one or more modalities simultaneously, making it suitable for multimodal datasets (T1w + T2w, T1w + FLAIR, etc.).

## Source Information

- **Language:** tcsh (wrapper) + Python (algorithm driver) + C++/Python (GEMS library)
- **Source file(s):**
  - `samseg/samseg` — top-level tcsh wrapper; handles input coregistration, logging, MRF post-processing, and recon-all integration
  - `samseg/run_samseg` — Python driver that configures and calls `gems.Samseg` or `gems.SamsegLesion`
  - `gems/` — GEMS (Generative Model for brain Segmentation) C++/Python library; contains all mesh deformation, EM optimization, and bias correction code
- **Binary/script location:** `$FREESURFER_HOME/bin/samseg`

## Purpose and Context

The classical FreeSurfer pipeline registers the subject to a Gaussian Classifier Atlas (GCA) via `[[mri_em_register]]` and then segments structures using `[[mri_ca_label]]`. This approach works well for standard 1 mm isotropic T1-weighted MPRAGE data but degrades with non-standard contrasts, unusual resolutions, or pathological intensities.

samseg replaces this pipeline with a Bayesian generative model approach: the atlas is a deformable tetrahedral mesh whose nodes encode per-label prior probabilities, and the observation model is a GMM per tissue class whose parameters are estimated from the data. Because the intensity model parameters are fitted to the input data — not fixed to a canonical atlas contrast — samseg is contrast-agnostic.

samseg is the preferred segmentation backend for:
- Non-standard MRI contrasts (T2w, FLAIR, MP2RAGE, etc.)
- Multimodal datasets
- The `recon-all -autorecon2-samseg` path, which replaces the GCA-based subcortical segmentation
- Longitudinal analysis via `[[samseg-long]]`

## Inputs

### Required Inputs

- **MRI volume(s):** One or more brain MRI volumes in any format readable by FreeSurfer (see [[mgz]], [[nifti]]). Multiple inputs are treated as separate image channels for the GMM (e.g., T1w + T2w simultaneously).

There are two mutually exclusive ways to specify inputs:

**Mode A — pre-aligned volumes (`--i`):**
Pass one or more already-registered volumes. All inputs must share the same voxel grid (same dimensions, same voxel-to-world matrix).

**Mode B — fsr-import mode (`--t1w` / `--t2w` / `--flair` / `--mode`):**
samseg internally calls [[fsr-import]] and [[fsr-coreg]] to average repeated runs within each modality and co-register modalities to the reference mode. At least one t1w input and a `--refmode` are required.

### Input Assumptions

> [!assumption] Multi-run averaging requires identical FOV within modality
> When specifying multiple `--t1w` (or `--t2w`, etc.) runs, all volumes within the same modality must have the same dimensions and voxel size. Modalities can differ from each other.

> [!assumption] Mode A inputs must be pre-registered
> When using --i, samseg assumes the volumes are already in perfect alignment. No intra-session co-registration is performed.

> [!assumption] Inputs are conformed when using fsr-import mode
> Using --t1w/--t2w/--flair/--mode triggers conforming to 1 mm isotropic space unless `--hires` is specified.

## Outputs

All outputs are written to the directory specified by `--o` (or `$SUBJECTS_DIR/<subject>/mri/samseg` when `--s` is used).

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `seg.mgz` | [[mgz]] | Whole-brain segmentation volume using FreeSurfer label IDs (float voxel type by default) |
| `samseg.talairach.lta` | [[lta-format]] | Affine registration from input space to atlas (MNI305) space |
| `samseg.talairach.xfm` | MNI XFM | Same transform in XFM format (created after run) |
| `template.m3z` | [[m3z-format]] | Nonlinear warp from input to atlas space (saved by default; disable with `--no-save-warp`) |
| `mode01_bias_corrected.mgz` | [[mgz]] | Bias-corrected first input modality |
| `mode02_bias_corrected.mgz` | [[mgz]] | Bias-corrected second modality (if present), etc. |
| `seg.fs.stats` | [[stats-format]] | Per-structure volume statistics in FreeSurfer stats format |
| `cost.txt` | text | Optimization convergence log: per-voxel cost at each atlas registration level |
| `log/samseg.log` | text | Symlink to timestamped log file |

**Optional outputs (flags required):**

| File / Directory | Flag | Description |
|-----------------|------|-------------|
| `posteriors/` | `--save-posteriors` | Per-structure posterior probability maps (one volume per structure) |
| `probabilities/` | `--save-probabilities` | Per-tissue-class posterior, prior, and likelihood (3-frame volume per class) |
| `mesh.pkl` | `--save-mesh` | Final deformed mesh in template space (used for longitudinal analysis) |
| `history.p` | `--history` | Full optimization history object (for debugging and visualization) |
| `seg.mrf.mgz` | `--mrf` | MRF-refined segmentation from `mri_ca_label` post-processing |
| `seg.mrf.stats` | `--mrf` | Segstats for the MRF-refined segmentation |

### Output Specifications

`seg.mgz` uses the same integer label scheme as the standard FreeSurfer `aseg.mgz` (see [[color-lut]]). The voxel data type is float by default (not int or uchar), which means downstream tools that assume integer type may require explicit type conversion with `[[wiki/tools/mri_convert|mri_convert]]`.

> [!gotcha] seg.mgz is float, not integer
> samseg writes `seg.mgz` as a float-type volume. The comment in the source code ("Should probably convert segmentation to INT") confirms this is a known, outstanding issue. Downstream tools expecting integer label volumes (e.g., some FSL utilities) will require conversion: `mri_convert seg.mgz seg_int.mgz -odt int --no_scale 1`.

## Mathematical Foundations

samseg implements the GEMS (Generative Model for brain Segmentation) algorithm described in Puonti et al. (2016). The generative model is:

**Atlas model:** A tetrahedral mesh $\mathcal{M}$ defines a deformable prior. Each node stores a vector of label probabilities, and the prior probability of label $k$ at position $\mathbf{x}$ is obtained by barycentric interpolation within the tetrahedron containing $\mathbf{x}$:
$$
p(k | \mathbf{x}, \mathbf{T}) = \sum_{\text{nodes}} w_i(\mathbf{x}, \mathbf{T}) \, \alpha_{ik}
$$
where $\mathbf{T}$ is the mesh deformation, $w_i$ are barycentric weights, and $\alpha_{ik}$ are per-node label probabilities.

**Likelihood model:** For each structure class $c$ (a grouping of anatomical labels sharing intensity statistics), the image intensity at voxel $\mathbf{x}$ given tissue class $c$ is modelled as a Gaussian mixture with parameters $\{\mu_{cm}, \sigma^2_{cm}\}$ per input modality $m$:
$$
p(\mathbf{y}_{\mathbf{x}} | \text{class}=c, \boldsymbol{\mu}, \boldsymbol{\sigma}^2, \mathbf{b}) = \prod_m \mathcal{N}(y_{\mathbf{x}m} \,;\, b_{\mathbf{x}m} \mu_{cm},\, b^2_{\mathbf{x}m} \sigma^2_{cm})
$$
where $b_{\mathbf{x}m}$ is the spatially varying bias field for modality $m$.

**Bias field model:** The log bias field is parameterised as a linear combination of smooth (DCT-like) basis functions:
$$
\log b_{\mathbf{x}m} = \sum_j c_{jm} \, \phi_j(\mathbf{x})
$$
Smoothness is controlled by `--bias-field-smoothing-kernel` (distance in mm to the first zero of the sinc basis).

**Optimization:** The algorithm alternates between:
1. **E-step:** compute posterior label probabilities at each voxel given current parameters
2. **M-step (Block Coordinate Descent):** update GMM parameters $(\boldsymbol{\mu}, \boldsymbol{\sigma}^2)$, bias coefficients $\mathbf{c}$, and mesh deformation $\mathbf{T}$ (via L-BFGS)

> [!math] Block Coordinate Descent
> By default, the M-step parameters are updated jointly via Block Coordinate Descent (BCD), which updates each block (GMM, bias, mesh) in turn while holding the others fixed. Disable with `--no-block-coordinate-descent` (sets `SAMSEG_DONT_USE_BLOCK_COORDINATE_DESCENT=1`).

A multi-resolution scheme is used: affine registration at coarser resolution first, then full deformable segmentation at finer resolution.

**Mesh stiffness:** The deformation regularisation term penalises deformation energy as $K \cdot E_{\text{mesh}}(\mathbf{T})$ where $K$ is the mesh stiffness (`--stiffness`). Higher $K$ keeps the atlas shape more rigid.

**Lesion extension:** When `--lesion` is used, a Variational Autoencoder (VAE) shape model is added to the generative model to infer a lesion probability map. This requires TensorFlow and uses MCMC sampling (`--samples`, `--burnin`) rather than pure EM.

> [!internal] GEMS C++ library
> The mesh deformation engine and EM optimizer live in `gems/kvlAtlasMesh*.cxx` files. The Python interface is in `gems/interfaces/`. The mesh atlas was trained from 20 subjects, hence the atlas directory name `20Subjects_smoothing2_down2_smoothingForAffine2`.

## Configuration Options

### Complete Flag Reference

**Input / output:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i`<br>`-i`<br>`--input` | string (repeatable) | — | Pre-aligned input volume. Use multiple `--i` flags for multimodal inputs. `-i`/`--input` are the `run_samseg` short/long forms. Cannot be combined with `--t1w/--t2w/--flair/--mode`. |
| `--i2 file.mgz` | string | — | Alias for a second `--i` input (equivalent to specifying `--i` twice). |
| `--i3 file.mgz` | string | — | Alias for a third `--i` input. |
| `--i4 file.mgz` | string | — | Alias for a fourth `--i` input. |
| `--i5 file.mgz` | string | — | Alias for a fifth `--i` input. |
| `--i6 file.mgz` | string | — | Alias for a sixth `--i` input. |
| `--t1w file` | string (repeatable) | — | T1-weighted input. Triggers fsr-import pipeline. Multiple runs are averaged. |
| `--t2w file` | string (repeatable) | — | T2-weighted input. Triggers fsr-import pipeline. |
| `--flair file` | string (repeatable) | — | FLAIR-weighted input. Triggers fsr-import pipeline. |
| `--mode name file` | string pair (repeatable) | — | Arbitrary-modality input with an explicit mode name. Triggers fsr-import pipeline. |
| `--refmode name` | string | — | Reference modality to which other modalities are co-registered. Required when using --t1w/--t2w/--flair/--mode. |
| `--o`<br>`-o`<br>`--output` | string | — | Output directory. `-o`/`--output` are the `run_samseg` short/long forms. Required unless `--s` is specified. |
| `-m`<br>`--mode` | string (repeatable) | auto | Output basenames for each input image mode (one per `--input`). `-m`/`--mode` are `run_samseg` flags; not exposed directly by the tcsh wrapper. |
| `--s subject` | string | — | Subject name in `$SUBJECTS_DIR`. Sets output to `$SUBJECTS_DIR/<subject>/mri/samseg`. Requires fsr-import mode. |
| `--sd dir` | string | `$SUBJECTS_DIR` | Override `$SUBJECTS_DIR`. |

**Atlas:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--atlas`<br>`-a` | string | `$FREESURFER_HOME/average/samseg/20Subjects_smoothing2_down2_smoothingForAffine2` | Path to atlas directory. Also sets `SAMSEG_DATA_DIR`. `-a` is the `run_samseg` short form. |
| `--sdd dir` | string | — | Alias for `--atlas` (sets `SAMSEG_DATA_DIR`). |
| `--ssdd dir` | string | — | Second alias for `--atlas`/`--sdd` (sets `SAMSEG_DATA_DIR`). Functionally identical. |
| `--cpvcw` | boolean | off | Use the expanded atlas `samseg+cc+pons+verm+charm+wmcrowns` (includes corpus callosum, pons, vermis, and WM crowns). |
| `--no-cpvcw` | boolean | off | Unset `SAMSEG_DATA_DIR`, reverting to the default atlas. Undoes `--cpvcw` if previously specified. |
| `--charm` | boolean | off | Use the CHARM atlas (`/autofs/space/sulc_001/users/charm-samseg`). Also runs a default-atlas registration first to compute the initial transform, then chains the registrations. |
| `--no-charm` | boolean | off | Disable CHARM mode. Useful to explicitly override a previous `--charm` in a command sequence. |
| `--gmm file` | string | atlas default | Override the GMM parameters file (`sharedGMMParameters.txt`). |

**Registration:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--reg`<br>`-r` | string | — | Skip atlas registration and load an existing transform (LTA or `.mat`). The transform should map input → atlas. `-r` is the `run_samseg` short form. |
| `--regmat file` | string | — | Alias for `--reg`. |
| `--initlta`<br>`--init-reg` | string | — | Use this LTA as the initial affine registration (starting point for optimisation). `--init-reg` is the `run_samseg` flag name; `--initlta` is the tcsh wrapper name. |
| `--reg-only` | boolean | off | Run only the affine registration; skip segmentation. Outputs `samseg.talairach.lta`. |
| `--regonly` | boolean | off | Alias for `--reg-only`. |

**Processing:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--threads n` | integer | 1 (or `$OMP_NUM_THREADS`) | Number of CPU threads for GEMS. |
| `--max-iters n` | integer | atlas default | Maximum EM iterations. |
| `--pallidum-separate` | boolean | off | Move pallidum outside the global white matter Gaussian class. Use for T2w or FLAIR data where pallidum appears brighter than WM. |
| `--stiffness`<br>`--mesh-stiffness` | float | atlas default | Mesh deformation regularisation weight. Higher = more rigid atlas. `--mesh-stiffness` is the `run_samseg` flag name; `--stiffness` is the tcsh wrapper name. |
| `--bias-field-smoothing-kernel mm` | float | atlas default | Width parameter of the bias field smoothing kernel (mm to first sinc zero crossing). |
| `--smooth-wm-cortex`<br>`--smooth-wm-cortex-priors` | float | 0 (disabled) | Gaussian smoothing sigma (mm) applied to white matter and cortex atlas priors before segmentation. `--smooth-wm-cortex-priors` is the `run_samseg` flag name; `--smooth-wm-cortex` is the tcsh wrapper name. |
| `--mrf`<br>`--no-mrf` | boolean | off | Run `mri_ca_label` MRF post-processing on the samseg segmentation. Produces `seg.mrf.mgz`. |
| `--options file.json` | string | — | JSON file overriding advanced model or optimisation parameters passed to `run_samseg`. |
| `--ignore-unknown` | boolean | off | Ignore final priors for the "unknown" class. |
| `--exvivo` | boolean | off | Use the ex vivo GMM parameters file (post-mortem tissue). |
| `--dissection-photo mode` | string | — | Process 3D reconstructed dissection photos. `mode` = `left`, `right`, or `both`. Disables WM intensity normalisation and ignores unknown priors. |
| `--fat-shift` | boolean | off | Enable fat-shift correction mode (undocumented; details unclear). |
| `--no-block-coordinate-descent`<br>`--no-bcd` | boolean | off | Disable BCD; sets `SAMSEG_DONT_USE_BLOCK_COORDINATE_DESCENT=1`. |
| `--block-coordinate-descent`<br>`--bcd` | boolean | on | Re-enable BCD if it was disabled via the environment variable; sets `SAMSEG_DONT_USE_BLOCK_COORDINATE_DESCENT=0`. |
| `--logdomain-costandgradient-calculator` | boolean | off | Use log-domain cost calculator; sets `SAMSEG_USE_LOGDOMAIN_COSTANDGRADIENT_CALCULATOR=1`. |
| `--no-logdomain-costandgradient-calculator` | boolean | on | Disable log-domain cost calculator; unsets `SAMSEG_USE_LOGDOMAIN_COSTANDGRADIENT_CALCULATOR`. |

**Lesion segmentation:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lesion` | boolean | off | Enable lesion segmentation (requires TensorFlow). Switches atlas to `20Subjects_smoothing2_down2_smoothingForAffine2_lesion`. |
| `--lesion-mask-pattern A B ...` | integers | all 0 | Per-input polarity code: `0` = no lesion intensity masking, `+1` = lesions brighter than cortex, `-1` = lesions darker than cortex. One value per `--i` input. |
| `--threshold f` | float | 0.3 | Lesion posterior probability threshold for final binary lesion label. |
| `--samples n` | integer | 50 | MCMC sampling steps for lesion model. |
| `--burnin n` | integer | 50 | MCMC burn-in steps. |
| `--lesion-pseudo-samples mean var` | float pair | 500 500 | Pseudo-sample count controlling lesion prior strength (mean and variance). |
| `--lesion-rho f` | float | 50 | Lesion ratio hyperparameter. |
| `--do-not-use-shape-model` | boolean | off | Disable the VAE lesion shape model; fall back to a simpler prior. |
| `--lesion-mask-structure name` | string | `Cortex` | Brain structure used to define the intensity threshold for lesion masking. Lesion segmentation must be enabled. Passed directly to `run_samseg`; not available through the tcsh `samseg` wrapper. |
| `--random-seed n` | integer | 12345 | RNG seed for MCMC (lesion mode). |

**recon-all integration:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--recon` | boolean | off | After segmentation, call `samseg2recon` and then `recon-all -autorecon2-samseg -autorecon3`. Requires `--s` and fsr-import mode with a t1w input. |
| `--fill` | boolean | off | Use samseg segmentation to create `filled.mgz` (via `samseg2recon --fill`) instead of recon-all's own fill step. |
| `--no-fill` | boolean | on | Disable samseg-based fill step (restore default recon-all fill). |
| `--normalization2` | boolean | off | Create `brain.mgz` from samseg output instead of recon-all's normalization2 step. |
| `--no-normalization2`<br>`--nonormalization2` | boolean | on | Disable samseg-based normalization2 (restore default recon-all behaviour). |
| `--use-t2w` | boolean | off | When running recon-all, pass `-T2pial` to refine pial surface with T2w data. |
| `--use-flair` | boolean | off | When running recon-all, pass `-FLAIRpial` to refine pial surface with FLAIR data. |
| `--hires`<br>`-hires` | boolean | off | Pass `-hires` to recon-all; also skips conforming in fsr-import. Both spellings accepted by the tcsh wrapper. |
| `--no-hires` | boolean | on | Disable hires mode (restores conforming in fsr-import and removes `-hires` from the recon-all call). Explicit inverse of `--hires`. |
| `--parallel` | boolean | off | Pass `-parallel` to recon-all. |

**Save / debug:**

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--save-posteriors` | boolean | off | Save per-structure posterior probability maps to `posteriors/`. |
| `--save-p` | boolean | off | Shorthand for both `--save-posteriors` and `--save-probabilities` simultaneously (tcsh wrapper only). |
| `--save-probabilities` | boolean | off | Save per-tissue-class posterior/prior/likelihood (3-frame) to `probabilities/`. |
| `--save-warp`<br>`--no-save-warp` | boolean | on | Save nonlinear warp as `template.m3z`. |
| `--save-mesh`<br>`--no-save-mesh` | boolean | off | Save final deformed mesh to `mesh.pkl` (for longitudinal samseg analysis). |
| `--history`<br>`--no-history` | boolean | off | Save full optimization history object. |
| `--showfigs` | boolean | off | Display figures during segmentation (requires display). |
| `--movie` | boolean | off | Show history as interactive movie. |
| `--dice seg.mgz` | string | — | After segmentation, compute Dice/Jaccard overlap against a reference segmentation. |
| `--seg-stats` | boolean | off | Run `mri_segstats` on `seg.mgz` to produce `seg.stats`. Not needed in practice since `seg.fs.stats` is always produced. |
| `--force` | boolean | off | Force re-running even if outputs exist (sets `ForceUpdate=1`, passed to `fsr-import` and `fsr-coreg`). |
| `--no-force` | boolean | on | Disable forced update (default; explicit inverse of `--force`). |
| `--profile file.prof` | string | — | Run `run_samseg` under `cProfile` Python profiler. |
| `--no-profile` | boolean | on | Clear profile file path (unsets profiling if previously set). |
| `--log file` | string | auto | Override log file path. |
| `--nolog`<br>`--no-log` | boolean | off | Discard log output (routes log to `/dev/null`). Both spellings are accepted. |
| `--tmpdir dir` | string | auto | Set temporary directory (also disables cleanup). |
| `--tmp dir` | string | auto | Alias for `--tmpdir`. |
| `--nocleanup` | boolean | off | Keep temporary directory after completion. |
| `--cleanup` | boolean | on | Remove temporary directory after completion (default; use to override `--nocleanup`). |
| `--bin` | boolean | off | Use the compiled `run_samseg` binary (`usebin=1`, clears `monly`). For testing binary vs. Python-script execution. |
| `--no-bin` | boolean | on | Run `run_samseg` via Python directly rather than the compiled binary (`usebin=0`). |
| `--monly`<br>`-monly` | string | — | Write the run_samseg call as MATLAB script to the given `.m` file and do not execute it; for debugging. Both spellings accepted by the tcsh wrapper. |
| `--valgrind` | boolean | off | Run `run_samseg` under Valgrind memory checker (developer/debugging only; very slow). |
| `--debug` | boolean | off | Enable tcsh verbose tracing. |

### Configuration Interactions

> [!gotcha] `--i` and `--t1w/--t2w/--flair/--mode` are mutually exclusive
> The two input modes cannot be combined. Using --i with any of the modality-specific flags will produce an error: `ERROR: cannot spec both --i and --mode/--t1w/--t2w/--flair`.

> [!gotcha] `--s` forces fsr-import mode
> `--s` (subject creation) requires the fsr-import input mode (`--t1w/--t2w/...`). Using --i with `--s` is an error. Conversely, `--recon` requires `--s`.

> [!gotcha] `--reg` and `--initlta` are mutually exclusive
> `--reg` skips registration entirely and uses the provided transform as-is. `--initlta` only seeds the optimiser's starting point; registration still proceeds. Specifying both is an error.

> [!gotcha] `--pallidum-separate` is needed for T2w / FLAIR
> By default, pallidum is grouped with the global white matter Gaussian class. In T2w and FLAIR images, pallidum is substantially brighter than WM, which can cause misclassification. `--pallidum-separate` moves pallidum to its own Gaussian class. Forgetting this flag with T2/FLAIR inputs often causes pallidum to be incorrectly labelled as white matter.

> [!gotcha] `--use-t2w` and --use-flair cannot both be active
> When running recon-all with both T2w and FLAIR inputs, you must choose at most one for pial refinement. Specifying `--use-t2w` and `--use-flair` simultaneously causes an error.

> [!gotcha] `SAMSEG_DATA_DIR` and `--atlas` / `--sdd` interact in a specific order
> `--atlas` sets `SAMSEG_DATA_DIR` in the shell environment. `run_samseg` reads `SAMSEG_DATA_DIR` from the environment and `--atlas` from its own argument list; the command-line `--atlas` takes precedence over the env var. Setting `SAMSEG_DATA_DIR` before calling `samseg` is equivalent to passing --atlas.

## Typical Use Cases

### Use Case 1: Standalone whole-brain segmentation (T1w)

```bash
# Segment a single T1w volume, write outputs to my_seg/
samseg --i path/to/T1w.mgz --o my_seg/
```

### Use Case 2: Multimodal segmentation (T1w + FLAIR)

```bash
# T1w and FLAIR are already co-registered (same grid)
samseg \
  --i T1w.mgz \
  --i FLAIR.mgz \
  --pallidum-separate \
  --o multimodal_seg/
```

### Use Case 3: Multi-run import with auto-coregistration

```bash
# Two T1w runs and one FLAIR, with auto-averaging and co-registration
samseg \
  --t1w run1.mgz --t1w run2.mgz \
  --flair FLAIR.mgz \
  --refmode t1w \
  --pallidum-separate \
  --o output/
```

### Use Case 4: Full recon-all pipeline with samseg

```bash
# Segment and run surface reconstruction in one command
samseg \
  --t1w T1w.mgz \
  --refmode t1w \
  --s mysubject \
  --recon \
  --sd /path/to/subjects/dir \
  --threads 8
```

This is equivalent to:
1. `samseg --t1w T1w.mgz --refmode t1w --s mysubject`
2. `samseg2recon --s mysubject`
3. `recon-all -s mysubject -autorecon2-samseg -autorecon3`

### Use Case 5: Reuse registration from a previous run

```bash
# Re-segment with a different atlas but keep the same registration
samseg \
  --i T1w.mgz \
  --reg previous_run/samseg.talairach.lta \
  --atlas /path/to/new_atlas \
  --o new_seg/
```

### Use Case 6: Lesion segmentation (FLAIR)

```bash
# FLAIR lesions are brighter than cortex → lesion-mask-pattern = 1
samseg \
  --i T1w.mgz --i FLAIR.mgz \
  --lesion \
  --lesion-mask-pattern 0 1 \
  --pallidum-separate \
  --o lesion_seg/
```

## Pipeline Context

samseg is used in place of the GCA-based subcortical segmentation in the `recon-all` pipeline.

**Traditional recon-all path:**
```
mri_em_register → mri_ca_normalize → mri_ca_register → mri_ca_label
```

**samseg-based path (invoked via `-autorecon2-samseg`):**
```
samseg → samseg2recon
```

When `recon-all -autorecon2-samseg` is called, it internally calls [[samseg2recon]] `--from-recon-all` which populates the subject directory with:
- `mri/aseg.auto_noCCseg.mgz` ← from `samseg/seg.mgz`
- `mri/transforms/talairach.lta` ← symlink to `samseg/samseg.talairach.lta`
- `mri/transforms/talairach.m3z` ← symlink to `samseg/template.m3z`
- `mri/nu.mgz` ← bias-corrected T1w rescaled to WM=110
- `mri/norm.mgz`, `mri/brainmask.mgz` ← masked from nu.mgz

**Predecessor:** (optional fsr-import / fsr-coreg) → **samseg** → **samseg2recon** → **[[wiki/pipelines/recon-all|recon-all]]** (`-autorecon2-samseg`)

For longitudinal analysis, see `[[samseg-long]]` which builds an unbiased cross-timepoint template before per-timepoint segmentation.

## Gotchas and Caveats

> [!gotcha] Subject already exists warning does not abort
> When `--s subject` is specified and `$SUBJECTS_DIR/subject` already exists, samseg prints a warning (`ERROR: $subject already exists`) but continues. The segmentation output will overwrite `mri/samseg/` without prompting.

> [!gotcha] seg.mgz uses float voxel type
> The segmentation is saved as float, not integer. A comment in the source (`# Should probably convert segmentation to INT`) confirms this is a known issue. Many FreeSurfer tools handle it transparently, but third-party tools may not.

> [!gotcha] WM normalisation is skipped for dissection photos
> In `--dissection-photo` mode, the target intensity (WM=110) normalisation is disabled (`intensityWM=None`), and `ignoreUnknownPriors` is forced to `True`. Using this flag with a standard in-vivo MRI would produce uncalibrated bias-corrected outputs incompatible with `samseg2recon`.

> [!gotcha] Default warp output (`--save-warp` is on by default)
> Unlike many FreeSurfer tools that default to saving less, samseg saves `template.m3z` by default. Use `--no-save-warp` to suppress it if disk space is a concern. Note that `recon-all -autorecon2-samseg` and `samseg2recon` require `template.m3z` for the `talairach.m3z` symlink.

> [!gotcha] `--lesion` requires TensorFlow
> The lesion extension uses a VAE shape model implemented in TensorFlow. If TensorFlow is not installed, the import of `gems.SamsegLesion` will fail at runtime.

## Error Compensation and Guard Rails

- **Bias field correction is always performed.** Even if the input is already bias-corrected, samseg will estimate and apply a bias field. For well-corrected inputs, the estimated field will be near-uniform, so the effect is minimal.
- **Multi-resolution registration:** samseg performs affine registration at a coarse resolution before deformable segmentation at full resolution. This improves robustness to large initial misalignments.
- **Default target intensity normalization:** For standard in-vivo data, `run_samseg` sets `targetIntensity=110` (WM) and searches for `Cerebral-White-Matter` in the atlas. This anchors the intensity scale to the canonical FreeSurfer convention.

## Related Tools

- `[[samseg-long]]` — longitudinal variant; builds a cross-timepoint template and segments each timepoint jointly
- `[[wiki/pipelines/recon-all|recon-all]]` — calls samseg via `-autorecon2-samseg`
- `[[mri_ca_label]]` — GCA-based subcortical segmentation (classical alternative to samseg)
- `[[mri_em_register]]` — GCA-based affine registration (classical alternative to samseg's registration step)
- `[[mri_segstats]]` — compute region statistics from `seg.mgz`
- `[[mri_refine_seg]]` — optional post-processing refinement; called internally via `DoRefine` (no user-facing `--refine` flag in samseg)
- `[[lta-format]]` — format of `samseg.talairach.lta`
- `[[m3z-format]]` — format of `template.m3z`

### fsr-import stream and recon-all bridge

The fsr-import (`--t1w/--t2w/--flair/--mode`) input mode and the
recon-all hand-off are implemented by this family of helpers:

- [[fsr-import]] — collect and average per-modality runs into the
  samseg input set (Mode B front-end).
- [[fsr-coreg]] — co-register each modality to the reference mode.
- [[fsr-longpreproc]] — longitudinal preprocessing variant of the
  import/coreg stream (used by [[samseg-long]]).
- [[fsr-getxopts]] / [[fsr-checkxopts]] / [[fsr-mergexopts]] —
  read, validate, and merge the per-binary expert-options file that
  the fsr stream forwards to samseg.
- [[samseg2recon]] — convert `samseg/seg.mgz` into the recon-all
  subject layout (`aseg.auto_noCCseg.mgz`, `nu.mgz`, the talairach
  symlinks) for the `-autorecon2-samseg` path.
- [[seg2recon]] — more general "drop a segmentation into a recon-all
  subject" bridge (sibling of `samseg2recon`).

## Confidence and Gaps

> [!note] Audit extractor notes
> The audit also picks up sub-tool flags from embedded call sites as spurious C1 entries. These are not samseg flags:
> - **Valgrind argument list**: `--error-limit`, `--leak-check`, `--tool`, `--track-origins`
> - **`mri_segstats` call**: `--ctab-default`, `--seg`, `--sum`
> - **`lta_convert` call**: `--inlta`, `--outmni`
> - **`fsr-import`/`fsr-coreg` forwarded args**: `--conform`, `--force-update`

> [!gap] Exact label set
> The full list of anatomical labels present in the default `seg.mgz` (including any extracerebral structures like skull, CSF, and skin) has not been enumerated. The `modifiedFreeSurferColorLUT.txt` in the atlas directory defines the label mapping, but it has not been cross-referenced with the standard `FreeSurferColorLUT.txt`.

> [!gap] GEMS C++ internals
> The mesh deformation engine (`kvlAtlasMesh*.cxx`) and the multi-resolution optimization schedule have not been traced in detail. The number of resolution levels, the downsampling factors, and the exact L-BFGS implementation parameters are taken from the atlas directory's `atlas_level1.txt.gz` / `atlas_level2.txt.gz` files and not documented here.

> [!gap] `--fat-shift` and `--max-iters` flags
> Both `--fat-shift` and `--max-iters` are parsed by the tcsh `samseg` wrapper and passed to `run_samseg`, but `run_samseg`'s argparse does not define either flag. Passing an unrecognised argument to Python argparse raises an error. These flags may be dead code left from an older version of `run_samseg`, or they may be handled by a compiled binary variant (invoked when `--bin` is set). The effect of `--fat-shift` is not documented anywhere in the source tree.

## References

- Puonti O, Iglesias JE, Van Leemput K. "Fast and sequence-adaptive whole-brain segmentation using parametric Bayesian modeling." *NeuroImage* 143:235–249, 2016. [https://doi.org/10.1016/j.neuroimage.2016.09.011](https://doi.org/10.1016/j.neuroimage.2016.09.011)
- Van Leemput K. "Encoding probabilistic brain atlases using Bayesian inference." *IEEE Trans Med Imaging* 28(6):822–837, 2009.
- FreeSurfer wiki page: [https://surfer.nmr.mgh.harvard.edu/fswiki/Samseg](https://surfer.nmr.mgh.harvard.edu/fswiki/Samseg) (accessed 2026-04-20)
