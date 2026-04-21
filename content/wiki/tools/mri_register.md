---
title: "mri_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_register/mri_register.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_robust_register]]"
  - "[[mri_em_register]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Complete flag list not available (source in attic)"
  - "Whether this tool is still functional in FS 8.2.0"
  - "Difference from mri_ca_register"
tags:
  - registration
  - atlas
  - nonlinear
  - deprecated
---

# mri_register

## Summary

`mri_register` performs high-dimensional nonlinear alignment of an MRI volume to a canonical atlas using a GCA (Gaussian Classifier Atlas) morph. It is essentially identical to `mri_ca_register` in function and shares the same source code base. The source file is located in the `attic/` directory, indicating this tool is deprecated or superseded.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_register/mri_register.cpp`
- **Status:** Located in `attic/` — legacy/deprecated
- **Key includes:** `gcamorph.h`, `gca.h`, `transform.h`, `mrisegment.h`

> [!gotcha] Attic directory
> The source file is in `attic/mri_register/`, meaning this tool is considered deprecated or superseded in the current FreeSurfer codebase. The functionality is now covered by `mri_ca_register` and [[mri_robust_register]]. It may still be compiled and installed but should not be used for new workflows.

## Purpose and Context

Based on its source code header, `mri_register` performs the same high-dimensional nonlinear alignment to a canonical atlas as `mri_ca_register`. The reference usage shown in the source comments is:

```
mri_ca_register -align -mask brainmask.mgz \
  -T transforms/talairach.lta norm.mgz \
  $FREESURFER_HOME/average/RB_all_2006-02-15.gca \
  transforms/talairach.m3z
```

This suggests the tool takes an intensity-normalized brain volume, a GCA atlas file, and an initial linear transform, and produces a nonlinear morph warp (`.m3z`).

The reference paper for the algorithm is: Fischl et al. "Automatically Parcellating the Human Cerebral Cortex", Cerebral Cortex, 2004; 14:11-22.

## Inputs

- **Brain volume:** Intensity-normalized MRI volume (typically `norm.mgz`)
- **GCA atlas:** Gaussian classifier atlas (e.g., `RB_all_2006-02-15.gca`)
- **Initial linear transform:** LTA file from Talairach registration
- **Optional:** Brain mask volume

## Outputs

- **GCA morph file (`.m3z`):** Nonlinear warp field from subject space to atlas space

## Mathematical Foundations

The registration minimizes a cost function combining:
1. **Likelihood term:** How well the warped subject volume matches the GCA atlas intensity distributions
2. **Gibbs prior:** Regularization on the label field (controlled by `nogibbs` flag)
3. **Jacobian term:** Penalizes volume compression/expansion

The morph is computed at multiple resolution levels using a multi-pass gradient descent strategy.

> [!gap] Full algorithm details
> The complete algorithm is shared with `mri_ca_register`. See that tool's documentation for the full mathematical description.

## Configuration Options

> [!gap] Flag list not available
> The binary is in the `attic/` directory and was not run. The flag list would need to be extracted from a full reading of the `get_option()` function in the source, or by running the binary if it is still installed.

Known parameters from the source code variables:
- `nogibbs`: Disable Gibbs prior
- `remove_bright`: Remove bright artifacts
- `map_to_flash`: Map to FLASH imaging parameters
- `renormalize`, `renormalize_new`, `renormalize_align`, `renormalize_align_after`: Renormalization modes
- `demons`: Use demons-style registration (default: 1)
- `max_rounds`, `max_reductions`: Multi-resolution control
- `regularize`, `regularize_mean`: Regularization parameters
- `long_reg_fname`: Longitudinal registration filename

## Configuration Interactions

> [!gap] Interaction details
> Configuration interactions not documented due to attic status.

## Typical Use Cases

> [!gotcha] Use mri_ca_register instead
> For new workflows, use `mri_ca_register` (or [[mri_robust_register]] for linear registration). `mri_register` is preserved for backwards compatibility only.

```bash
# Legacy usage (prefer mri_ca_register instead)
mri_register -T transforms/talairach.lta norm.mgz atlas.gca transforms/talairach.m3z
```

## Pipeline Context

`mri_register` is not called by the current [[recon-all]] pipeline. It has been superseded by `mri_ca_register`, which performs the same nonlinear alignment and is the tool called in the autorecon2 stage.

## Gotchas and Caveats

> [!gotcha] Deprecated tool
> `mri_register` is in the `attic/` subdirectory, indicating it is no longer actively maintained. Documentation is provided for completeness in case users encounter references to this tool in old scripts.

## Related Tools

- [[mri_robust_register]] — Modern robust linear registration
- [[mri_em_register]] — EM-based atlas registration (Talairach)
- [[coordinate-systems]] — Coordinate system documentation

## Confidence and Gaps

**Low confidence overall** — source is in attic, binary was not run, and full option list was not obtained.

> [!gap] Current functionality
> Whether `mri_register` is compiled and installed in FreeSurfer 8.2.0 is unclear. It should be verified before relying on this documentation.
