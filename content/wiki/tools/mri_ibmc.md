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
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Tool is in attic/ — may not be distributed in v8.2.0"
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

> [!gotcha] `print_usage()` vs actual parser mismatch
> `print_usage()` lists `--v1/--v2/--v3`, `--nmax`, `--tol`, and `--tol1d`, but none of these flags appear in `parse_commandline()`. They are vestigial stubs. The correct flag for specifying input volumes is `--stack`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--stack` | `vol reg [params]` | required | Add an input volume stack with its tkreg registration file. Optional third argument loads pre-computed IBMC params from a `.ibmc` file. Repeat three times for three stacks. |
| `--o` | path | required | Output directory for results |
| `--par` | string | required | Base name for output parameter files (e.g., `stack0.ibmc`) |
| `--s` | string | `subject-unknown` | Subject name written into output registration files |
| `--a2b-rigid` | — | on (default) | Use rigid-body parameterization: 6 alpha params per stack, shared by all slices |
| `--a2b-equal` | — | off | Use per-slice parameterization: 6 alpha params per slice (6×depth per stack) |
| `--v1` | `vol [regfile]` | — | Template volume 1 (listed in `print_usage()` only; not implemented in `parse_commandline()`; use `--stack` instead) |
| `--v2` | `vol [regfile]` | — | Template volume 2 (listed in `print_usage()` only; not implemented in `parse_commandline()`; use `--stack` instead) |
| `--v3` | `vol [regfile]` | — | Template volume 3 (listed in `print_usage()` only; not implemented in `parse_commandline()`; use `--stack` instead) |
| `--nmax` | `nmax` | 36 | Maximum number of Powell iterations (listed in `print_usage()` only; not implemented in `parse_commandline()`; use `--low-tol` for tolerance instead) |
| `--tol` | `tol` | — | Powell inter-iteration tolerance on cost (listed in `print_usage()` only; not implemented in `parse_commandline()`) |
| `--tol1d` | `tol1d` | — | Tolerance on Powell 1D minimizations (listed in `print_usage()` only; not implemented in `parse_commandline()`) |
| `--targ` | vol | — | Optional target/reference volume (read but not used in main optimization flow) |
| `--mov` | `vol reg` | — | Optional moving volume with tkreg file (read but not used in main optimization flow) |
| `--alpha` | file | — | Load initial alpha parameters from a `.ibmc` file |
| `--print-params` | file | — | Print contents of a `.ibmc` params file to stdout and exit |
| `--profile` | `file param` | — | Profile cost function for parameter index `param`, write result to `file`, then exit |
| `--synth` | `src tmpl reg params out` | — | Synthesize a volume by applying IBMC params to a source; write slices to `out`; exits immediately |
| `--synth-params` | file | — | Write a synthetic set of IBMC params (30 slices, rotation sweep) to `file` and exit |
| `--smooth` | — | off | Enable 3-point running-average smoothing of intersection differences before cost evaluation |
| `--line-min` | — | off | Run a coarse 1D line minimization across each parameter before Powell optimization |
| `--low-tol` | — | off | Set Powell and line-min tolerances to `1e-1` instead of `1e-8` (faster, less precise) |
| `--force-update` | — | off | Force recomputation of all pair costs even when parameters have not changed |
| `--debug` | — | off | Enable debug output |
| `--checkopts` | — | off | Parse and validate options only; do not run optimization |

## Typical Use Cases

**IBMC motion correction of three-plane acquisition:**
```bash
mri_ibmc \
  --stack axial.mgz axial.reg.dat \
  --stack coronal.mgz coronal.reg.dat \
  --stack sagittal.mgz sagittal.reg.dat \
  --o /output/ibmc/ \
  --par stack
```

## Pipeline Context

Not part of `recon-all`. Specialized motion correction tool for research applications.

## Related Tools

- [[mri_linear_register]] — standard volume-based linear registration

## Confidence and Gaps

**Confident (from source):** Three-stack registration via `--stack`, output via `--o`/`--par`, rigid vs. per-slice parameterization (`--a2b-rigid`/`--a2b-equal`), IBMC algorithm reference (Kim TMI 2010), rotation parameterization (`MRIangles2RotMatB`), `IBMC_NL_MAX=500`, Powell optimization with configurable tolerances.

**Uncertain:** Whether tool is functional in v8.2.0; exact output format of `.ibmc` parameter files (binary vs. ASCII).

> [!gap] Verify availability and functionality
> As an attic tool, confirm whether `mri_ibmc` is installed in FreeSurfer 8.2.0 before documenting further.
