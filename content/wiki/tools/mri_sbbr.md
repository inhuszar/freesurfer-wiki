---
title: "mri_sbbr"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_sbbr/mri_sbbr.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mri_vol2surf]]"
  - "[[mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "The meaning of --opt integer values (optschema) not documented."
  - "--search1d argument order appears buggy in source (pargv[0] used twice)."
tags:
  - registration
  - surface
  - boundary-based
  - functional
  - slice-to-volume
---

# mri_sbbr

## Summary

`mri_sbbr` performs slice-to-volume registration using an in-plane boundary-based registration (BBR) cost function. It registers a single 2D slice (or volume slice) to a 3D reference, guided by the contrast at the grey-white boundary as defined by a FreeSurfer surface. It is primarily used for registering functional or diffusion MRI slices to the anatomical reference.

## Source Information

- **Language:** C++ (original author: Douglas N. Greve)
- **Source file:** `mri_sbbr/mri_sbbr.cpp`

## Purpose and Context

Boundary-based registration (BBR) is a cost function that measures the contrast at the grey-white boundary: a good registration will maximise the signal difference between voxels just inside and outside the white matter surface. `mri_sbbr` extends this to the slice-to-volume problem, where a single functional slice must be aligned to the 3D anatomy. This is relevant when the functional image has severe through-plane distortion that requires slice-specific registration rather than a single global transform.

## Inputs

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov` | `file` | — | Moving image (the slice or volume to register) |
| `--surf` | `file` | — | Surface file for BBR cost function |
| `--init-reg` | `file` | — | Initial registration file (`.dat` or `.lta`) |
| `--slice` | `n` | `0` | Slice index to use (if `--mov` is a volume) |
| `--reg` | `file` | — | Output registration file (required) |
| `--reg-inv` | `file` | — | Output inverse registration |
| `--out-surf` | `file` | — | Save the surface with registered coordinates |

Optional optimisation parameters:

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--t1` | — | — | Set BBR sign to +1 (T1-weighted contrast) |
| `--t2` | — | — | Set BBR sign to −1 (T2-weighted contrast) |
| `--slope <val>` | float | `0.5` | BBR cost slope parameter |
| `--din <mm>` | float | `1.0` | Distance inside white surface to sample |
| `--dout <mm>` | float | `2.0` | Distance outside white surface to sample |
| `--opt <n>` | int | `1` | Optimisation schema index |
| `--search <nper> <mul>` | int float | `off` | Grid search parameters (n-per-axis, multiplier) |
| `--search1d <iters> <nper> <mul>` | int int float | `off` | 1-D grid search parameters |
| `--niters-max <n>` | int | `10` | Maximum optimisation iterations |
| `--ftol <val>` | float | `1e-8` | Function value tolerance for convergence |
| `--linmintol <val>` | float | `1e-8` | Line minimisation tolerance |
| `--inc <n>` | int | `1` | Increment parameter for search schema |
| `--p <paramno> <val>` | int float | — | Set initial registration parameter `paramno` to `val` |

## Outputs

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--reg` | `file` | — | Registration file (`.dat` / `.lta`) from slice to volume (required) |
| `--reg-inv` | `file` | — | Inverse registration |
| `--out-surf` | `file` | — | Surface with positions in the registered space |

## Mathematical Foundations

The BBR cost function for a registration $\mathbf{T}$ is:

$$
C(\mathbf{T}) = \frac{1}{N} \sum_{v=1}^{N} \text{cost}\!\left(\frac{I(\mathbf{T}(x_{\text{out},v})) - I(\mathbf{T}(x_{\text{in},v}))}{\text{contrast}}\right)
$$

where $x_{\text{out},v}$ and $x_{\text{in},v}$ are points just outside and inside the white surface at vertex $v$, and `cost` is a robust function parameterised by slope (`--slope`). The contrast sign is set by `--t1` (+1) or `--t2` (−1).

The slice-to-volume extension constrains the transform to be a 2D in-plane rigid body (3 DOF: 2 translations + 1 rotation) applied to the specified slice.

## Configuration Options

See Inputs section above. The `CMDARGS` struct (defined in the source) enumerates all parameters including optimisation schema, increment/search parameters, and BBR cost function configuration.

## Configuration Interactions

- `--slice` selects which slice of a multi-slice volume to register.
- `--t1` and `--t2` set the BBR contrast sign to +1 and −1 respectively. These are mutually exclusive.
- `--slope` parameterises the robust cost function shape.
- `--dout` and `--din` control the sampling distance outside and inside the white surface — larger values average more signal but may include non-boundary voxels.
- `--opt` selects the optimisation schema (integer index); `--search` and `--search1d` enable grid-search modes with configurable search density.
- `--p <paramno> <val>` overrides individual initial registration parameters by index.

## Typical Use Cases

```bash
# Register a functional slice to anatomy using BBR
mri_sbbr \
    --mov func.nii.gz \
    --surf $SUBJECTS_DIR/bert/surf/lh.white \
    --slice 20 \
    --t1 \
    --init-reg func2anat.dat \
    --reg slice20_reg.dat
```

## Pipeline Context

Not part of the standard `recon-all` pipeline. Used in specialised functional MRI or diffusion MRI analyses where per-slice registration is needed to correct for slice-specific distortions.

## Gotchas and Caveats

> [!gotcha] Slice-specific use case
> This tool is designed for slice-to-volume problems. For whole-volume BBR registration, use `bbregister` instead.

> [!gotcha] Surface coordinate system
> The surface must be in a coordinate system consistent with the reference volume. Mismatches between scanner RAS and surface RAS will produce incorrect cost function evaluations.

## Related Tools

- [[mris_register]] — spherical surface registration
- [[mri_vol2surf]] — projects volume data to surface space

## Confidence and Gaps

**Confident:** Tool purpose, BBR cost function concept, and full I/O flag set confirmed from `parse_commandline()` in source.

> [!gap] Optimisation schema details
> The meaning of each `--opt <n>` integer value (the `optschema` parameter) is not documented in the source header. Deeper source reading would be needed to enumerate valid values.

> [!gap] `--search1d` argument order
> The `--search1d` handler assigns `pargv[0]` to both `search1diters` and `searchnper`, which appears to be a bug in the source. The exact three argument semantics are unclear.
