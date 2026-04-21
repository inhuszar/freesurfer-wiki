---
title: "mri_ibmc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_ibmc/mri_ibmc.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_linear_register]]"
  - "[[coordinate-systems]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Tool is in attic/ — may not be distributed in v8.2.0"
  - "Full command-line interface not available from source"
  - "Exact implementation of IBMC algorithm not fully traced"
tags:
  - motion-correction
  - registration
  - slice-based
  - attic
---

# mri_ibmc

## Summary

`mri_ibmc` performs Intersection-Based Motion Correction (IBMC) of MRI volumes, based on the algorithm described in Kim et al., IEEE TMI, 2010. It registers three input volumes by minimizing the inconsistency at slice intersections, enabling motion correction for volumetric acquisitions where head motion occurs between slice groups. The tool is located in `attic/`, indicating legacy or experimental status.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_ibmc/mri_ibmc.cpp`
- **Original author:** Douglas N. Greve
- **Reference:** Kim K, Habas PA, Rajagopalan V, Scott JA, Barkovich AJ, Glenn OA, Studholme C. "Bias field inconsistency correction of motion-scattered multislice MRI for improved 3D image reconstruction." *IEEE Trans Med Imaging*, 2010.

> [!gotcha] Attic location
> This tool is in `attic/` and may not be compiled or installed in FreeSurfer 8.2.0. Verify availability before use.

## Purpose and Context

Standard MRI motion correction registers whole volumes to each other. IBMC instead exploits the constraint that neighboring slices from different acquisition orientations must be consistent at their geometric intersections. This is particularly useful for:

- Fetal MRI: where the brain moves unpredictably between slice acquisitions
- High-resolution acquisitions with long scan times
- Multi-planar (coronal + axial + sagittal) acquisitions where inter-group motion must be corrected

The method solves for rigid body transforms for each slice group by minimizing the sum of squared differences at slice intersection lines.

## Inputs

| Input | Description |
|-------|-------------|
| Three volume files | Positional arguments: typically three orthogonal acquisition orientations |
| Configuration parameters | Via command-line flags |

## Outputs

- Corrected/registered volume(s)
- Transform files for each slice group (LTA or similar format)

## Mathematical Foundations

For three volumes $V_1$, $V_2$, $V_3$ with rigid transforms $T_1$, $T_2$, $T_3$, the IBMC objective function minimizes:

$$
\mathcal{E} = \sum_{(i,j), i \neq j} \sum_{\text{intersections}} \left[V_i(T_i(\mathbf{x})) - V_j(T_j(\mathbf{x}))\right]^2
$$

where the sum is over all geometric intersection lines between slices of volumes $i$ and $j$.

The 3D rotation matrix is parameterized as a product of three axis rotations, implemented in `MRIangles2RotMatB()`. Up to `IBMC_NL_MAX = 500` iterations are supported.

## Configuration Options

> [!gap] CLI not fully traced
> No BEGINUSAGE block found in source. Flags inferred from variable names only.

| Flag | Description |
|------|-------------|
| (positional) | Three input volume paths |
| Various numerical parameters | Transform search space (inferred) |

## Typical Use Cases

**IBMC motion correction of three-plane acquisition (inferred):**
```bash
mri_ibmc axial.mgz coronal.mgz sagittal.mgz
```

## Pipeline Context

Not part of `recon-all`. Specialized motion correction tool for research applications.

## Related Tools

- [[mri_linear_register]] — standard volume-based linear registration

## Confidence and Gaps

**Confident (from source):** Three-volume registration, IBMC algorithm reference (Kim TMI 2010), rotation parameterization (`MRIangles2RotMatB`), IBMC_NL_MAX=500.

**Uncertain:** Full CLI; output format; whether tool is functional in v8.2.0; exact optimization strategy.

> [!gap] Verify availability and functionality
> As an attic tool, confirm whether `mri_ibmc` is installed in FreeSurfer 8.2.0 before documenting further.
