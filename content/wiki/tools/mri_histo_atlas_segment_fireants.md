---
title: "mri_histo_atlas_segment_fireants"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "mri_histo_util/mri_histo_atlas_segment_fireants"
families:
  - "mri_*"
recon_all_stage: null
related: []
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "FireANTs vs standard ANTs differences"
  - "Atlas data must be downloaded separately"
tags:
  - histology
  - atlas
  - segmentation
  - deep-learning
  - bayesian
  - fireants
---

# mri_histo_atlas_segment_fireants

## Summary

`mri_histo_atlas_segment_fireants` performs Bayesian segmentation of in vivo MRI using a probabilistic histological whole-brain atlas, with registration accelerated by FireANTs. It is a wrapper script that calls `fspython segment_fireants.py` from the `ERC_bayesian_segmentation` package. The atlas is derived from ultra-high-resolution ex vivo histological data and enables fine-grained anatomical parcellation of brain structures not distinguishable in standard in vivo MRI.

## Source Information

- **Source language:** Bash shell script (wrapper for Python)
- **Source file:** `mri_histo_util/mri_histo_atlas_segment_fireants`
- **Python backend:** `$FREESURFER_HOME/python/packages/ERC_bayesian_segmentation/scripts/segment_fireants.py`
- **References:**
  - Casamitjana et al., *Nature*, 2025 — "A probabilistic histological atlas of the human brain for MRI segmentation" (https://www.nature.com/articles/s41586-025-09708-2)
  - Puonti et al. (under revision) — "Fast segmentation with the NextBrain histological atlas"

## Purpose and Context

Standard FreeSurfer segmentation tools (e.g., `mri_ca_label`) use atlas templates derived from in vivo MRI. Many fine-grained brain structures (thalamic nuclei, hypothalamic regions, brainstem nuclei, cerebellar lobules) cannot be reliably resolved from in vivo MRI alone due to limited contrast between adjacent nuclei.

`mri_histo_atlas_segment_fireants` addresses this by using a multi-contrast probabilistic atlas constructed from high-resolution postmortem histological data (the NextBrain/ERC atlas). The segmentation framework:

1. Registers the input MRI to the atlas coordinate space using FireANTs (a fast ANTs-based registration tool)
2. Applies Bayesian label fusion with intensity modeling to assign anatomical labels
3. Optionally estimates and corrects for MRI bias fields during segmentation
4. Supports multiple imaging modes: in vivo, ex vivo, cerebrum-only, hemisphere-specific

The atlas must be downloaded separately from the FreeSurfer FTP before use.

> [!gotcha] Atlas download required
> The atlas files are not included in the standard FreeSurfer distribution. Before using this tool, download and extract the atlas from:
> `https://ftp.nmr.mgh.harvard.edu/pub/dist/lcnpublic/dist/Histo_Atlas_Iglesias_2023/atlas_simplified.zip`
> and place it in `$FREESURFER_HOME/python/packages/ERC_bayesian_segmentation/atlas_simplified/`

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Input MRI scan | `--i` | MRI volume to segment (required). |
| Side | `--side` | Hemisphere to segment: `left` or `right` (required). |
| Mode | `--mode` | Segmentation mode: `invivo`, `cerebrum`, `hemi`, or `exvivo` (required). |
| Device | `--device` | Compute device: `cpu` or `cuda` (required). |
| Output directory | `--o` | Directory for output files (required). |

## Outputs

Output files are written to the specified output directory and include:

| Output | Description |
|--------|-------------|
| Segmentation volume | 3D label volume with fine-grained parcellation |
| Volumes table | Per-structure volume measurements |
| Probability maps (optional) | Per-label posterior probabilities |

## Mathematical Foundations

The segmentation uses a generative Bayesian model:

$$
p(\text{label} \mid \mathbf{y}) \propto p(\mathbf{y} \mid \text{label}) \cdot p(\text{label} \mid \text{atlas registration})
$$

where:
- $p(\text{label} \mid \text{atlas registration})$ is the atlas prior (deformed to the subject's space via FireANTs registration)
- $p(\mathbf{y} \mid \text{label})$ is the intensity likelihood modeled as a Gaussian mixture with optional bias field correction

The bias field is parameterized as a polynomial in spatial coordinates (polynomial basis `psi` constructed in `prepBiasFieldBase()`).

The cost function for bias field estimation combines intensity likelihood and label posterior:

$$
\mathcal{L}(\theta) = \sum_\text{voxels} \log\left[\sum_l p(l \mid \text{atlas}) \cdot \mathcal{N}(y \cdot e^{B_\theta} \mid \mu_l, \sigma_l^2) \cdot e^{B_\theta}\right]
$$

where $B_\theta$ is the bias field parameterized by $\theta$.

## Configuration Options

All flags are passed directly to `segment_fireants.py` via `$@` in the bash wrapper. The following complete flag set is taken from the Python `argparse` parser in `segment_fireants.py`.

**Required flags:**

| Flag | Argument | Description |
|------|----------|-------------|
| `--i` | `file` | Input MRI image to segment. |
| `--atlas_dir` | `dir` | Path to atlas directory (injected automatically by the shell wrapper — do not specify manually). |
| `--o` | `dir` | Output directory. |
| `--mode` | `invivo`\|`exvivo`\|`cerebrum`\|`hemi` | Segmentation mode: `invivo` for standard in vivo MRI; `exvivo` for postmortem tissue; `cerebrum`/`hemi` for partial coverage. |
| `--side` | `left`\|`right` | Hemisphere to segment. |

**Optional flags:**

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--bf_mode` | `dct`\|`polynomial`\|`hybrid` | `dct` | Bias field basis function type. |
| `--yaml_path` | `file` | — | Path to custom YAML files defining groups of ROIs. |
| `--write_rgb` | (flag) | off | Write soft segmentation as RGB file to disk. |
| `--write_bias_corrected` | (flag) | off | Write bias-field-corrected image to disk. |
| `--device_registration` | `string` | — | Device to use specifically for registration (useful for high-res ex vivo when registration memory requirements differ). |
| `--threads` | `int` | `-1` | Number of CPU cores to use; `-1` uses all available cores. |
| `--skip` | `int` | `1` | Skipping factor to reduce memory requirements when estimating Gaussian parameters for atlas priors. |
| `--resolution` | `float` | `0.4` | Output segmentation resolution in mm. |
| `--smoothing_steps_HRmask` | `int` | `3` | Number of smoothing iterations when upsampling the mask from the 1mm registration. |
| `--skip_bf` | (flag) | off | Skip bias field correction entirely. |
| `--smooth_grad_sigma` | `float` | `1.00` | Greedy/FireANTs registration parameter: gradient smoothing sigma. |
| `--smooth_warp_sigma` | `float` | `0.25` | Greedy/FireANTs registration parameter: warp field smoothing sigma. |
| `--optimizer_lr` | `float` | `0.5` | Greedy/FireANTs registration parameter: optimizer learning rate. |
| `--cc_kernel_size` | `int` | `7` | Greedy/FireANTs registration parameter: cross-correlation kernel size. |
| `--rel_weight_labeldiff` | `float` | `2.5` | Relative weight of label differences in Greedy/FireANTs registration. |
| `--save_atlas_nonlinear_reg` | (flag) | off | Save the nonlinearly registered atlas to the output directory. |
| `--save_field` | (flag) | off | Save the nonlinear deformation field. |
| `--save_jacobian` | (flag) | off | Save the Jacobian determinant (as log10) of the deformation. |

## Configuration Interactions

- `--device cuda` requires a CUDA-capable GPU; `--device cpu` forces CPU computation.
- `--device_registration` allows using a different device for the registration step than for the segmentation step — useful when ex vivo high-resolution data would exhaust GPU memory during registration.
- `--mode exvivo` is intended for postmortem tissue samples, not standard in vivo MRI.
- `--side left` and `--side right` can be run as separate jobs in parallel to process both hemispheres simultaneously.
- `--atlas_dir` is automatically appended by the bash wrapper; passing it manually would duplicate the argument.
- `--skip_bf` disables bias field estimation; recommended only when the input has already been bias-corrected.
- `--resolution` controls output voxel size; the atlas is originally at sub-millimetre resolution so lower values (e.g., 0.2 mm) increase output detail at the cost of disk space and computation.

## Typical Use Cases

**Whole-brain in vivo segmentation (CPU):**
```bash
mri_histo_atlas_segment_fireants \
  --i T1.mgz \
  --o histo_seg/ \
  --device cpu \
  --side left \
  --mode invivo
```

**GPU-accelerated segmentation:**
```bash
mri_histo_atlas_segment_fireants \
  --i T1.mgz \
  --o histo_seg/ \
  --device cuda \
  --side left \
  --mode invivo
```

## Pipeline Context

`mri_histo_atlas_segment_fireants` is not part of `recon-all`. It is an independent segmentation tool that can be run on any MRI volume, though it may benefit from the intensity normalization and bias correction produced by `recon-all`. It requires `fspython` and the Python dependencies (`surfa`, `nibabel`, `scipy`, `fsbindings`).

## Gotchas and Caveats

> [!gotcha] Atlas files must be downloaded and placed manually
> The tool will exit with a clear error if the atlas files are missing. Download instructions are printed to stdout.

> [!gotcha] GPU memory requirements
> CUDA mode may require substantial GPU memory (several GB) depending on volume size and mode. Ensure sufficient memory is available.

> [!gotcha] FireANTs vs ANTs
> FireANTs is a fast variant of ANTs registration. The accuracy/speed tradeoff compared to standard ANTs is documented in the Puonti et al. (under revision) reference.

## Related Tools

No direct FreeSurfer tool relations identified.

## Confidence and Gaps

**Confident (from source):** Complete flag list confirmed from `segment_fireants.py` argparse. Atlas download requirement, modes (invivo/cerebrum/hemi/exvivo), device selection (cpu/cuda), all registration parameters, all output control flags.

**Uncertain:** Exact output file names within the output directory; numerical details of the Bayesian model beyond what is in the source excerpt.
