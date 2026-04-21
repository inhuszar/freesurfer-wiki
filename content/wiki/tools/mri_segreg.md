---
title: "mri_segreg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_segreg/mri_segreg.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mris_inflate]]"
  - "[[mri_vol2surf]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The exact form of the cost function used for optimisation is not fully described in the truncated source read."
  - "Relationship to bbregister for functional-structural registration is unclear."
tags:
  - registration
  - surface
  - EEG
  - MEG
  - functional
  - optimisation
---

# mri_segreg

## Summary

`mri_segreg` computes and optimises a cost function for surface-based registration of functional (EEG/MEG/BOLD) data to the FreeSurfer anatomical surface. It uses intensity contrast across the grey/white matter boundary sampled from a functional volume to drive a rigid-body (6 DOF) registration optimisation. The tool outputs an optimised registration file (`.reg`) and optionally a cost file for manual inspection.

## Source Information

- **Language:** C++
- **Source file:** `mri_segreg/mri_segreg.cpp`
- **Author:** Greg Greve

## Purpose and Context

Accurate registration between functional and anatomical MRI is critical for EEG/MEG source localisation and fMRI surface projection. `mri_segreg` optimises this registration by maximising the grey/white contrast sampled from the functional (e.g., BOLD) volume at the cortical surface. It is the backend of `bbregister` for some contrast types.

## Inputs

- `--mov <fvol>`: The functional (moving) volume.
- `--init-reg <regfile>`: Initial registration file (FreeSurfer `.reg` format). Can be combined with `--s` to specify subject.
- `--regheader <subject>`: Initialise registration from volume headers.
- `--label <file>`: Restrict optimisation to a specific surface label.
- `--vsm <vol> [pedir]`: Apply voxel shift map for EPI distortion correction.

## Outputs

- `--out-reg <file>`: Registration at lowest cost (final output).
- `--cost <file>`: Cost function values at each optimisation step.
- `--sum <file>`: Summary file (default: `<outreg>.sum`).
- `--o <file>`: Final output volume in registered space.
- `--cur-reg <file>`: Registration at current optimum (updated during optimisation).

## Mathematical Foundations

The cost function measures the grey/white contrast sampled from the functional volume at surface vertices projected inward (WM side) and outward (GM side). For T2/BOLD contrast (default), GM is expected to be brighter than WM:

$$
C(\mathbf{T}) = -\frac{1}{N} \sum_{v} \left[ I_{\text{WM}}(T\cdot v_{\text{WM}}) - I_{\text{GM}}(T\cdot v_{\text{GM}}) \right] \cdot s
$$

where $\mathbf{T}$ is the rigid registration matrix, $v_{\text{WM}}$ and $v_{\text{GM}}$ are surface vertices projected into WM and GM respectively, $I$ is the interpolated functional intensity, and $s$ is the slope parameter controlling cost sensitivity.

Optimisation is performed with Powell's method (`--nmax` controls iterations; `--tol` controls convergence tolerance).

Pre-optimisation options include brute-force grid search (`--brute`, `--brute_trans`, `--1dpreopt`) to find a good initial solution before gradient-based refinement.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--init-reg` | `<file>` | — | Initial registration file |
| `--regheader` | `<subj>` | — | Initialise from volume headers |
| `--mov` | `<fvol>` | — | Functional (moving) volume |
| `--out-reg` | `<file>` | — | Output optimised registration |
| `--o` | `<file>` | — | Output registered volume |
| `--cost` | `<file>` | — | Cost function output file |
| `--sum` | `<file>` | `<outreg>.sum` | Summary file |
| `--label` | `<file>` | — | Restrict to label |
| `--vsm` | `<vol> [pedir]` | — | Voxel shift map for EPI distortion |
| `--vsm-pedir` | `<int>` | 2 | Phase encode direction (1=x,2=y,3=z) |
| `--vsm-scale` | `<float>` | 1.0 | Scale factor for VSM |
| `--T1` / `--t1` | — | off | Assume T1 contrast (WM brighter than GM) |
| `--T2` / `--t2` / `--bold` | — | on | Assume T2/BOLD contrast (GM brighter than WM) |
| `--slope` | `<float>` | — | Cost function slope |
| `--offset` | `<float>` | — | Cost function offset (pct) |
| `--gm-proj-frac` | `<float>` | 0.5 | GM projection fraction (cortical thickness) |
| `--gm-proj-abs` | `<float>` | — | Absolute distance into cortex for GM sampling |
| `--wm-proj-abs` | `<float>` | 2.0 mm | Absolute distance into WM for WM sampling |
| `--wm-proj-frac` | `<float>` | — | WM projection fraction |
| `--fwhm` | `<float>` | — | Smooth input by FWHM mm |
| `--frame` | `<int>` | 0 | Use specified frame from input |
| `--mid-frame` | — | off | Use middle frame |
| `--trans` | `Tx Ty Tz` | — | Initial translation (mm) |
| `--rot` | `Ax Ay Az` | — | Initial rotation (degrees) |
| `--brute` | `min max delta` | — | Brute-force search in all 6 DOF |
| `--brute_trans` | `min max delta` | — | Brute-force translation only |
| `--1dpreopt` | `min max delta` | — | Brute-force in PE direction only |
| `--nmax` | `<int>` | 36 | Max Powell iterations |
| `--tol` | `<float>` | — | Powell convergence tolerance |
| `--subsamp` | `<int>` | — | Sample every Nth vertex |
| `--lh-only` | — | off | Use left hemisphere only |
| `--rh-only` | — | off | Use right hemisphere only |
| `--no-cortex-label` | — | off | Do not use cortex label mask |
| `--interp` | `trilinear\|nearest` | trilinear | Interpolation method |
| `--debug` | — | off | Debug mode |

## Configuration Interactions

- `--T1` and `--T2`/`--bold` are mutually exclusive contrast options.
- `--gm-proj-frac` and `--gm-proj-abs` are mutually exclusive GM projection specifications.
- `--wm-proj-frac` and `--wm-proj-abs` are mutually exclusive WM projection specifications.
- `--brute`, `--brute_trans`, and `--1dpreopt` perform pre-optimisation sweeps before the main Powell minimisation. They do not replace the final optimisation unless `--preopt-only` is set.
- `--subsamp` reduces the number of surface vertices sampled per iteration, trading accuracy for speed.

## Typical Use Cases

```bash
# Basic surface registration with header initialisation
mri_segreg --regheader subj001 --mov bold.mgz --out-reg bold.reg

# T1 contrast (anatomical-to-anatomical)
mri_segreg --t1 --init-reg bold.reg --mov T1_func.mgz --out-reg refined.reg

# With EPI distortion correction
mri_segreg --init-reg bold.reg --mov bold.mgz \
  --vsm voxel_shift_map.mgz 2 --out-reg bold_corrected.reg

# Brute-force pre-optimisation
mri_segreg --brute -5 5 1 --init-reg seed.reg --mov bold.mgz --out-reg optimal.reg
```

## Pipeline Context

Not called by `recon-all`. Used in functional-structural co-registration workflows, particularly for EEG/MEG source localisation and fMRI surface projection. Output `.reg` files are used by [[mri_vol2surf]] and related tools.

## Gotchas and Caveats

> [!gotcha] GM/WM contrast direction
> Default is T2/BOLD contrast (GM brighter than WM). If registering T1 functional data, use `--T1`. Getting this wrong inverts the cost function and produces obviously incorrect registrations.

> [!gotcha] Initial registration quality matters
> Powell's method is a local optimiser. Without a good initialisation (`--init-reg` or `--regheader`), the optimisation may converge to a local minimum. Use `--brute` for difficult cases.

## Related Tools

- [[mri_vol2surf]] — project volume data onto the surface using a registration
- [[mri_segstats]] — compute surface-based statistics
- [[mris_inflate]] — inflated surface used in visualisation after registration

## Confidence and Gaps

**Confident (from source):** All flags, T1/T2 contrast modes, projection parameters, Powell optimisation, brute-force modes.

**Uncertain:** Exact form of the cost function summation; whether `--gm-gt-wm`/`--wm-gt-gm` are distinct from `--T2`/`--T1`.
