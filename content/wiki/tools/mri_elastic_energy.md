---
title: "mri_elastic_energy"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_elastic_energy/mri_elastic_energy.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_evaluate_morph]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Source is in attic/; whether this is the active version or a legacy copy is unclear"
  - "GCAMestimateLameConstants() algorithm not fully documented"
tags:
  - morphometry
  - deformation
  - energy
  - gcam
---

# mri_elastic_energy

## Summary

`mri_elastic_energy` computes the elastic (Lamé constant) energy of a GCA morph (GCAM) deformation field. Given a `.m3z` or similar morph file, it calls `GCAMestimateLameConstants()` to compute the Lamé elastic constants $\lambda$ and $\mu$ (or a related energy measure) at each voxel, and writes the result to an output volume. This is used for quantifying the mechanical energy of a volumetric registration.

## Source Information

- **Source language:** C++
- **Source file:** `attic/mri_elastic_energy/mri_elastic_energy.cpp`
- **Note:** Source is in the `attic/` directory, suggesting it may be a legacy implementation. An active copy may also exist under `template/`.
- **Installed binary:** `/usr/local/freesurfer/8.2.0/bin/mri_elastic_energy` (bash wrapper)
- **Key dependencies:** `gcamorph.h`, `mri.h`

## Purpose and Context

In diffeomorphic registration, it is useful to quantify the mechanical energy of a deformation to assess registration quality or to use as a regularization diagnostic. The elastic energy relates to how "stiff" or "stretched" the deformation is, and is quantified through the Lamé constants of the equivalent elastic medium. This tool is primarily a diagnostic utility for registration analysis.

## Inputs

Positional arguments (in order):
1. GCAM morph file (e.g., `talairach.m3z`)
2. Output volume filename

## Outputs

- Output volume with per-voxel Lamé constant estimates (multi-frame MRI volume).

## Mathematical Foundations

Elastic mechanics of a deformation $\phi$ are characterized by the deformation gradient tensor $F = \nabla \phi$. The Lamé constants $\lambda$ and $\mu$ parameterize the elastic energy:

$$E = \int \left[ \frac{\lambda}{2} (\text{tr}(\varepsilon))^2 + \mu \, \text{tr}(\varepsilon^2) \right] dV$$

where $\varepsilon = \frac{1}{2}(F + F^T) - I$ is the linearized strain tensor.

`GCAMestimateLameConstants()` computes a volume where each voxel stores estimates of these elastic constants derived from the local deformation field. The exact output format (number of frames, what each frame stores) is defined in `gcamorph.h`.

> [!gap] GCAMestimateLameConstants details
> The exact computation inside `GCAMestimateLameConstants()` is not documented here; it would require reading `gcamorph.cpp`.

## Configuration Options

No command-line flags were identified beyond the two positional arguments. The global variable `scale = 1e12` is used internally.

## Configuration Interactions

N/A — no configurable flags.

## Typical Use Cases

```bash
# Compute elastic energy of a Talairach morph
mri_elastic_energy talairach.m3z elastic_energy.mgz
```

## Pipeline Context

Not called by `[[recon-all]]`. Used for research/diagnostic purposes to assess registration quality of GCAM morphs.

## Gotchas and Caveats

> [!gotcha] Source is in attic/
> The source file is located in `attic/mri_elastic_energy/`, which in FreeSurfer typically denotes legacy or deprecated code. The installed binary is confirmed present in FreeSurfer 8.2.0, but future versions may not include it.

> [!gap] Output frame interpretation
> What each frame of the output volume represents (λ, μ, combined energy, or other quantities) is not documented without reading `GCAMestimateLameConstants()`.

## Related Tools

- `[[mri_evaluate_morph]]` — evaluates registration quality by computing segmentation overlap

## Confidence and Gaps

**Medium confidence:** tool purpose and main() logic confirmed from source. Internal computation details require reading `gcamorph.cpp`.
