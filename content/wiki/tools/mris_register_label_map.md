---
title: "mris_register_label_map"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_register_label_map/mris_register_label_map.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The precise connectivity map format and how it is used for registration is not determined"
tags:
  - surface
  - registration
  - resting-state
  - connectivity
  - label-map
---

# mris_register_label_map

## Summary

`mris_register_label_map` registers an individual subject's resting-state functional connectivity label map to a group-average map. Given per-subject fMRI surface time series and volume data across multiple runs and subjects, it builds a connectivity-based label map and warps the moving hemisphere to match the fixed (group-average) atlas using a gradient-descent deformation.

## Source Information

- **Language:** C++
- **Source file:** `mris_register_label_map/mris_register_label_map.cpp`
- **Original author:** Bruce Fischl
- **Key algorithms:** Powell minimisation, correlation matrix computation, gradient descent warp

## Purpose and Context

Structural surface registration ([[mris_register]]) aligns surfaces based on cortical folding patterns (sulcal depth, curvature). However, for functional analyses, the anatomically aligned surfaces may not optimally align functional regions. `mris_register_label_map` provides a complementary registration based on resting-state connectivity patterns:

1. For each subject, connectivity between surface vertices and subcortical seeds (defined by a label) is computed
2. A group average map is computed across subjects
3. Each subject's map is registered to the group average using a gradient-descent surface warp

This enables functional alignment of cortical surfaces to a common connectivity space.

## Inputs

- Resting-state surface time series (multiple subjects, multiple runs)
- Resting-state volume time series (multiple subjects, multiple runs)
- Labels defining subcortical or cortical seed regions
- Fixed (group average) surface and correlation maps
- Moving surface(s) to register

Constants:
- `MAX_SUBJECTS 1000`
- `MAX_RUNS 100`

## Outputs

- Warped moving surface(s) aligned to the group-average connectivity map
- Output prefix for intermediate files

## Mathematical Foundations

The correlation between vertex $v$ on the surface and voxel $x$ in the volume is:

$$
C(v, x) = \frac{\text{cov}(s_v, f_x)}{\sigma_{s_v} \sigma_{f_x}}
$$

where $s_v$ is the surface time series at vertex $v$ and $f_x$ is the volume time series at voxel $x$.

Registration minimises the error between the moving subject's correlation map and the fixed group-average map:

$$
E(\phi) = \text{error}(\phi \circ C_{mov}, C_{fixed})
$$

The warp gradient is computed by `compute_warp_gradient` / `compute_hemi_warp_gradient` and applied via `warp_hemi` / `warp_surface`.

Powell minimisation is used for an additional weight optimisation step.

## Configuration Options

| Flag | Type | Description |
|------|------|-------------|
| `--subjects <s1> <s2> ...` | strings | List of subject names. Parsed until the next `--` flag is encountered. |
| `--trgsubject <name>` | string | Name of the target (atlas/group-average) subject. |
| `--prior <name>` | string | Name of the prior surface overlay file. |
| `--label <name>` | string | Name of the label defining subcortical or cortical seed regions. |
| `--temp-vol <file>` | string | Template volume file (used to define the output space). |
| `--sdir <dir>` | string | Override `SUBJECTS_DIR`. |
| `--hemi <hemi>` | string | Hemisphere (`lh` or `rh`). |
| `--output <name>` | string | Output file prefix. |
| `--cmat <name>` | string | Connectivity matrix name. |
| `--fmri <vol> <surf>` | 2 strings | fMRI volume file and surface file (specifying a run's fMRI data). |
| `--aseg <file> <label>` | string + int | Anatomical segmentation file and the label index within it to use as seed region. |
| `--tol <f>` | float | Convergence tolerance for the warp. |
| `--dt <f>` | float | Gradient descent step size. |
| `--dilate <N>` | integer | Number of label dilation iterations applied to seed labels. |
| `--ds <N>` | integer | Downsampling factor. |
| `--averages <N>` | integer | Maximum number of gradient averages. |
| `--min_averages <N>` | integer | Minimum number of gradient averages. |
| `--max_iters <N>` | integer | Maximum number of warp iterations. |
| `--maps <N>` | integer | Number of connectivity maps to use. |
| `--runs <N>` | integer | Number of fMRI runs per subject. |
| `--create_only` | flag | Only create the connectivity maps; do not register. |
| `--v <vno>` | integer | Debug a specific vertex by number (`Gdiag_no`). |
| `--debug_voxel <x> <y> <z>` | 3 integers | Enable debugging for voxel at coordinates `(x, y, z)`. |
| `--debug` | flag | Enable verbose debug output. |
| `--checkopts` | flag | Check options and exit without running. |
| `--nocheckopts` | flag | Disable option checking. |
| `--help` | flag | Print usage and exit. |
| `--version` | flag | Print version string and exit. |

> [!gotcha] `--subjects` parsing terminates on `--` flags
> The `--subjects` flag reads all subsequent arguments until it encounters one starting with `--`. All subject names must therefore appear together before any other `--` flag.

> [!gotcha] `--fmri` requires both volume and surface arguments
> `--fmri <vol> <surf>` reads two consecutive arguments. These specify the fMRI volume file and the surface-projected fMRI file for one run.

## Configuration Interactions

- `--create_only` skips registration; use it to precompute connectivity maps for later registration.
- `--averages` and `--min_averages` bracket the number of gradient smoothing averages applied during warp estimation.
- `--ds` downsamples the surface/volume data before computing correlations, trading accuracy for speed.
- Requires paired `--fmri` calls for each run across each subject (total calls = `n_subjects × n_runs`).

## Typical Use Cases

```bash
# Register resting-state connectivity map to group average (speculative)
mris_register_label_map \
  --tol 0.001 --dt 0.01 \
  lh.sphere.reg lh.fixed_atlas.avg \
  subject1 subject2 subject3 \
  output_prefix
```

## Pipeline Context

Not part of `recon-all`. Used in resting-state fMRI group analysis workflows after:
1. Individual subject `recon-all` processing
2. Projection of resting-state fMRI onto subject surfaces
3. Alignment to atlas space via structural registration

## Gotchas and Caveats

> [!gotcha] Requires extensive preprocessing
> This tool is at the end of a complex preprocessing pipeline. It requires surface-projected resting-state time series for all subjects in all runs, which in turn requires surface registration and fMRI preprocessing.

> [!gotcha] MAX_SUBJECTS / MAX_RUNS limits
> Hard limits of 1000 subjects and 100 runs. Exceeding these limits will produce undefined behaviour (buffer overflow).

## Related Tools

- [[mris_register]] — structural surface registration that precedes this step
- [[surface-format]] — surface annotation and label format

## Confidence and Gaps

**High confidence.** The complete `parse_commandline()` function was fully read. All 26 flags are verified from source. The note about the tool being "not yet tested" appears in `print_help()` output, indicating experimental status.

> [!gotcha] Tool is marked "not yet tested"
> The `print_help()` function outputs `"WARNING: this program is not yet tested!"`. Exercise caution when using this tool in production workflows.
