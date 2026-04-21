---
title: "mris_init_global_tractography"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_init_global_tractography/mris_init_global_tractography.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_ca_label]]"
  - "[[coordinate-systems]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Output format (spline file or volume) not confirmed from source"
  - "Relationship to dmri_* tools and tractography pipeline unclear"
  - "Whether this is part of any standard pipeline is unknown"
tags:
  - surface
  - tractography
  - connectivity
  - cortex
  - mcmc
---

# mris_init_global_tractography

## Summary

`mris_init_global_tractography` initializes a global cortical tractography model by fitting Catmull-Rom splines to connect pairs of cortical parcellation regions through the white matter interior. Each pair of cortical labels is connected via an optimal spline path initialized along the shortest interior path between them. A Markov Chain Monte Carlo (MCMC) procedure then estimates the posterior distribution of spline configurations. The tool uses a surface parcellation (Desikan-Killiany or similar, CMA label indices 1000-2999) to define connection endpoints and a volumetric white matter distance transform to guide spline placement.

## Source Information

- **Language:** C++
- **Source file:** `mris_init_global_tractography/mris_init_global_tractography.cpp`
- **Original author:** Bruce Fischl
- **Key dependencies:** `mrisurf.h`, `voxlist.h`, `pdf.h`, `tritri.h`, `cmat.h`, `icosahedron.h`

## Purpose and Context

Global tractography approaches model white matter connectivity by fitting geometric paths between cortical regions. Unlike streamline tractography (which traces individual fibers from DTI data), this tool fits smooth splines (Catmull-Rom) through the white matter interior connecting paired cortical parcellation regions.

The model uses:
- **Laplace streamline**: initial path tracing from source to target through white matter
- **Catmull-Rom splines**: smooth parameterized curves connecting cortical regions
- **MCMC sampling**: posterior estimation over spline configurations

Cortical regions are defined by the Desikan-Killiany label convention with:
- Left hemisphere: labels 1000–1999
- Right hemisphere: labels 2000–2999
- Cross-hemispheric offset: 1000 (connecting homologous regions)

## Inputs

| Input | Description |
|-------|-------------|
| Cortical surface | FreeSurfer surface with parcellation labels |
| Aseg volume | Subcortical segmentation (aseg.mgz) |
| WM volume | White matter volume |
| WM distance | White matter interior distance transform |

## Outputs

> [!gap] Output format
> The output format (spline coordinates, posterior volumes, or connectivity matrix) has not been confirmed from the source code.

## Mathematical Foundations

**Catmull-Rom spline energy:**

The total energy of a spline configuration is:

$$E = \lambda_{\text{WM}} E_{\text{WM\_dist}} + \lambda_L E_{\text{length}}$$

where:
- $E_{\text{WM\_dist}}$ penalizes spline control points outside white matter (via `SPLINE_WM_DIST`)
- $E_{\text{length}}$ penalizes long splines via `spline_length_penalty` (default: 2)
- `spline_interior_penalty` penalizes paths through non-WM regions (default: 100)
- `spline_nonwm_penalty` penalizes paths outside WM (default: 200, in `#if 0` block — may be disabled)

**MCMC proposal:**
- Proposal distribution: Gaussian with `proposal_sigma = 0.5` mm stddev
- Acceptance criterion: Metropolis-Hastings with `acceptance_sigma = 6`
- Default: `mcmc_samples = 10000` iterations

**Laplace streamline initialization:**
- Computes the Laplace equation solution in the white matter interior
- Source = cortical label 1, target = cortical label 2
- Streamline follows the gradient of the Laplace solution for initialization

## Configuration Options

Positional arguments (after all options):

```
mris_init_global_tractography [options] <subject> <parcellation> <output_volume>
```

| Argument | Description |
|----------|-------------|
| `<subject>` | Subject name (looked up in `SUBJECTS_DIR` or `-SDIR`). |
| `<parcellation>` | Name of the parcellation volume (e.g. `aparc+aseg`), resolved as `<subject>/mri/<parcellation>.mgz`. |
| `<output_volume>` | Output file base name (extension is stripped and reused). |

Optional flags (case-insensitive):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-SDIR <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-LH` | flag | off | Restrict to left hemisphere labels only. |
| `-RH` | flag | off | Restrict to right hemisphere labels only. |
| `-XHEMI` | flag | off | Only compute inter-hemispheric (cross-hemisphere) splines connecting homologous regions. When set, `vol_thresh` filtering is bypassed. |
| `-NCONTROL <N>` | integer | `MIN_SPLINE_CONTROL_POINTS` (from macro) | Number of Catmull-Rom spline control points. |
| `-LABELS <l1> <l2>` | 2 integers | -1 / -1 | Operate in two-label mode: only compute the optimal initial spline connecting label `l1` to label `l2`. Labels are CMA indices. |
| `-LAPLACE` | flag | off | Use Laplace equation streamline to initialise splines (instead of shortest path). |
| `-RAND` | flag | off | Randomize input intensity data. |
| `-P <n>` | integer | 10000 | Number of MCMC path samples (`mcmc_samples`). |
| `-N <f>` | float | 0.1 | Noise level for deflecting ventricle distance transform negative gradient vectors. |
| `-V <vno>` | integer | — | Debug vertex number (`Gdiag_no`). |
| `-openmp <n>` | integer | — | Set number of OpenMP threads (`OMP_NUM_THREADS`). |
| `-DEBUG_VOXEL <x> <y> <z>` | 3 integers | — | Enable debugging for voxel at coordinates `(x, y, z)`. |

Global hardcoded parameters (not exposed as flags):

| Parameter | Default | Description |
|-----------|---------|-------------|
| `spline_interior_penalty` | 100.0 | Penalty for spline control points outside WM. |
| `vol_thresh` | 75 | Minimum voxel count for a cortical label to be included (ignored with `-XHEMI`). |
| `noise` | 0.1 | Noise deflection parameter. |
| `mcmc_samples` | 10000 | Number of MCMC samples (overridden by `-P`). |

> [!gotcha] Previous flag table was wrong
> The previous wiki table listed flags such as `-hemi`, `-label1`, `-label2`, `-mcmc`, `-length_penalty`, `-proposal_sigma`, `-acceptance_sigma`, `-interior_penalty`, `-laplace`, `-write_diags`, `-noise`, `-randomize`, `-min_control`, none of which exist verbatim in the source. The correct flags are listed above (case-insensitive single-dash, uppercase convention).

## Typical Use Cases

> [!gap] Usage examples
> Concrete usage examples are not available. This is a research/experimental tool.

## Pipeline Context

Not part of standard `recon-all`. This tool is part of an experimental global tractography pipeline that connects cortical parcellation regions through white matter splines.

## Gotchas and Caveats

> [!gotcha] Research/experimental tool
> `mris_init_global_tractography` appears to be an experimental research tool not part of any standard FreeSurfer pipeline. It requires careful setup of input volumes and label definitions.

## Related Tools

- [[mris_ca_label]] — produces the cortical parcellation used as endpoint definitions
- [[coordinate-systems]] — surface and volume coordinate systems

## Confidence and Gaps

**Medium confidence.** The complete `get_option()` function was fully read and all flags are now verified. The algorithm structure (Laplace streamline init, Catmull-Rom splines, MCMC sampling) is understood from code. Output format and relationship to standard pipelines remain unclear.

> [!gap] Output format and pipeline integration
> The output format (spline coordinates file, connectivity matrix, volume) has not been confirmed by tracing the full `main()` function past the label enumeration step. The tool appears to be experimental/research-stage.
