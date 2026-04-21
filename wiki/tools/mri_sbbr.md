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
last_agent_update: 2026-04-15
gaps:
  - "Full flag set from parse_commandline() not verified."
  - "Optimisation algorithm (gradient vs. grid search) details need confirmation."
  - "BBR cost function slope/center/sign parameters undocumented here."
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

| Input | Description |
|-------|-------------|
| `--mov <file>` | Moving image (the slice or volume to register) |
| `--surf <file>` | Surface file for BBR cost function |
| `--initreg <file>` | Initial registration file (`.dat` or `.lta`) |
| `--slice <n>` | Slice index to use (if `--mov` is a volume) |
| `--outreg <file>` | Output registration file |
| `--outreginv <file>` | Output inverse registration |

Optional optimisation parameters:

| Flag | Description | Default |
|------|-------------|---------|
| `--ftol <val>` | Function value tolerance for convergence | — |
| `--linmintol <val>` | Line minimisation tolerance | — |
| `--nitersmax <n>` | Maximum iterations | — |
| `--bbrslope <val>` | BBR cost slope parameter | — |
| `--bbrcenter <val>` | BBR cost centre parameter | — |
| `--bbrsign <val>` | BBR cost sign parameter | — |
| `--outdist <mm>` | Distance outside white surface to sample | — |
| `--indist <mm>` | Distance inside white surface to sample | — |
| `--outsurffile <file>` | Save the surface with registered coordinates | — |

> [!gap] Full flag set not verified
> The `parse_commandline()` function was only partially read. Many additional flags may exist.

## Outputs

| Output | Description |
|--------|-------------|
| `--outreg <file>` | Registration file (`.dat` / `.lta`) from slice to volume |
| `--outreginv <file>` | Inverse registration |
| `--outsurffile <file>` | Surface with positions in the registered space |

## Mathematical Foundations

The BBR cost function for a registration $\mathbf{T}$ is:

$$C(\mathbf{T}) = \frac{1}{N} \sum_{v=1}^{N} \text{cost}\!\left(\frac{I(\mathbf{T}(x_{\text{out},v})) - I(\mathbf{T}(x_{\text{in},v}))}{\text{contrast}}\right)$$

where $x_{\text{out},v}$ and $x_{\text{in},v}$ are points just outside and inside the white surface at vertex $v$, and `cost` is a robust function parameterised by slope and centre (the `bbrslope` and `bbrcenter` parameters).

The slice-to-volume extension constrains the transform to be a 2D in-plane rigid body (3 DOF: 2 translations + 1 rotation) applied to the specified slice.

## Configuration Options

See Inputs section above. The `CMDARGS` struct (defined in the source) enumerates all parameters including optimisation schema, increment/search parameters, and BBR cost function configuration.

## Configuration Interactions

- `--slice` selects which slice of a multi-slice volume to register.
- `--bbrslope`, `--bbrcenter`, `--bbrsign` together parameterise the robust cost function shape.
- `--outdist` and `--indist` control the sampling distance from the surface — larger values average more signal but may include non-boundary voxels.

## Typical Use Cases

```bash
# Register a functional slice to anatomy using BBR
mri_sbbr \
    --mov func.nii.gz \
    --surf $SUBJECTS_DIR/bert/surf/lh.white \
    --slice 20 \
    --initreg func2anat.dat \
    --outreg slice20_reg.dat
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

**Confident:** Tool purpose, BBR cost function concept, and basic I/O confirmed from source.

> [!gap] Full flag set and optimisation schema
> The complete `parse_commandline()` body was not read. The `optschema` parameter and multi-scheme search behaviour are not documented.
