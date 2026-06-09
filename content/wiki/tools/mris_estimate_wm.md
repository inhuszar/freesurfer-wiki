---
title: "mris_estimate_wm"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "mris_estimate_wm/mris_estimate_wm"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_segment]]"
  - "[[mris_smooth]]"
  - "[[surface-format]]"
status: draft
confidence: low
last_agent_update: 2026-06-09
gaps:
  - "Deep learning model architecture (TopoFit) not fully traced; model weights are in $FREESURFER_HOME/models/topofit/."
tags:
  - surface
  - white-matter
  - estimation
---

# mris_estimate_wm

## Summary

`mris_estimate_wm` applies the TopoFit deep learning model to estimate (or refine) the white matter surface boundary on a cortical hemisphere. It takes one or more FreeSurfer subjects, loads the `norm.mgz` volume, and deforms a template mesh to fit the white matter boundary using a PyTorch neural network. It is the surface deformation step of the TopoFit pipeline (driven by [[topofit]]).

## Source Information

- **Language:** Python
- **Source file:** `mris_estimate_wm/mris_estimate_wm` (Python script, no `.cpp`)
- **Dependencies:** PyTorch, surfa (`sf`), optionally `torch_scatter`

## Purpose and Context

Based on the tool name, `mris_estimate_wm` likely refines or estimates the white matter surface boundary as part of the cortical surface generation pipeline. This would fit between initial WM segmentation and surface tessellation/smoothing steps.

## Inputs

> [!gap] Unknown — no source available

## Outputs

> [!gap] Unknown — no source available

## Mathematical Foundations

> [!gap] Algorithm unknown

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-s`<br>`--subjs` | string (repeatable) | required | List of subjects to process. |
| `--hemi` | string | required | Hemisphere to reconstruct (`lh` or `rh`). |
| `-d`<br>`--sdir` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `-m`<br>`--model` | string | `$FREESURFER_HOME/models/topofit/topofit.<hemi>.1.pt` | Override default TopoFit model file. |
| `-x`<br>`--suffix` | string | `topofit` | Suffix appended to the output surface name. |
| `-g`<br>`--gpu` | flag | off | Use the GPU (requires CUDA). When off, runs on CPU. |
| `--rsi` | flag | off | Remove self-intersecting faces during mesh deformation. |
| `--single-iter` | flag | off | Prevent deformation steps from running more than once. |
| `--vol` | string | `norm.mgz` | Subject volume to use as input (relative to `mri/`). |

## Configuration Interactions

Unknown.

## Typical Use Cases

```bash
# Check available options
mris_estimate_wm --help 2>&1
```

## Pipeline Context

Likely used in the surface generation pipeline around [[mri_segment]] and [[mris_smooth]] stages of `recon-all`. Exact placement unknown.

## Gotchas and Caveats

> [!gotcha] Binary-only in source tree
> The absence of source code makes it impossible to document this tool accurately. The binary may wrap a Python script or call another compiled binary.

## Related Tools

- [[topofit]] — driver script for the TopoFit deep-learning surface pipeline that this tool's deformation step is part of
- [[mri_segment]] — white matter segmentation
- [[mris_smooth]] — surface smoothing
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident:** Tool name, binary exists in source tree.

**Uncertain:** Everything else.

> [!gap] Full documentation requires binary execution or source location
> Run `mris_estimate_wm --help` to obtain the actual interface. This page should be updated after running the tool.
