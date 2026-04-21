---
title: "mris_register_to_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_register_to_volume/mris_register_to_label.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register_to_volume]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full command-line interface confirmed from embedded BEGINUSAGE block in source"
  - "Similarity function implementations (median, L1, default) not fully characterised"
tags:
  - surface
  - registration
  - rigid
  - label
  - distance-transform
---

# mris_register_to_label

## Summary

`mris_register_to_label` computes a rigid alignment between a cortical surface and a volumetric label (binary mask) by maximising the gradient magnitude across the gray/white boundary divided by its variance. The tool searches over a grid of translations and rotations to find the registration that best aligns the surface to the boundary of the label. It supports multiple similarity functions and outputs a registration file at the best-found cost.

## Source Information

- **Language:** C++
- **Source file:** `mris_register_to_volume/mris_register_to_label.cpp`
- **Original author:** Greg Grev (with contributions to mris_register_to_volume)

## Purpose and Context

After automated surface reconstruction, surfaces may be slightly misaligned with the actual tissue boundary in the MRI. `mris_register_to_label` provides a rigid correction by treating a volumetric label (e.g., a manually drawn or atlas-based boundary mask) as the registration target. The distance transform of the label provides a smooth cost surface for optimisation.

Use cases include:
- Fine-tuning surface-to-volume registration
- Aligning surfaces to manually corrected boundaries
- Cross-modality registration where the boundary is defined in a different contrast

## Inputs

- `--reg regfile` — input/output registration file
- `--mov fvol` — moving volume (reference space)
- `--surf surface` — surface to register
- `--targ vol` — target label volume
- `--pial pial_surface` — pial surface (optional, adds to similarity)
- `--res resolution` — distance transform resolution in mm

## Outputs

- `--out-reg outreg` — updated registration file (continuously updated at best cost)

## Mathematical Foundations

The similarity function is based on gradient magnitude across the surface boundary normalised by variance. A distance transform is computed from the target label at the specified resolution, and the surface vertices are mapped into this space via the registration.

For translation parameters $\mathbf{t}$ and rotation angles $(\alpha, \beta, \gamma)$:

$$
\text{cost}(\mathbf{t}, \mathbf{R}) = -\frac{\sum_{v} |\nabla D(R v + t)|}{\text{Var}(|\nabla D|)}
$$

where $D$ is the distance transform of the target label and $R$ is the rotation matrix.

The search is over a grid defined by:
- `--angle_init ax0 ay0 az0` — initial rotation angles
- `--trans_init tx0 ty0 tz0` — initial translations

Alternative similarity functions:
- `--median` — median cost function
- `--L1` — L1 norm cost function

## Configuration Options

| Flag | Description |
|---|---|
| `--reg regfile` | Registration file (input/output) |
| `--mov fvol` | Moving volume |
| `--surf surface` | Surface file |
| `--pial pial` | Pial surface (optional) |
| `--pial_only pial` | Pial only (exclude white from similarity) |
| `--targ vol` | Target label volume |
| `--res resolution` | Distance transform resolution (mm) |
| `--angle_init ax ay az` | Initial rotation search centre (degrees) |
| `--trans_init tx ty tz` | Initial translation search centre (mm) |
| `--median` | Use median similarity function |
| `--L1` | Use L1 norm similarity function |
| `--patch patch` | Surface patch to use |
| `--cost costfile` | Output cost file |
| `--interp type` | Interpolation: `trilinear` or `nearest` (default trilinear) |
| `--profile` | Print execution time information |
| `--border border` | Ignore border region of this size |
| `--out-reg outreg` | Output registration at lowest cost |

## Configuration Interactions

- `--pial` and `--pial_only` control whether the pial surface contributes to the similarity: `--pial` adds it, `--pial_only` uses only pial (excludes white).
- `--median`, `--L1`, and the default gradient-based function are mutually exclusive.
- `--angle_init` and `--trans_init` define the centre of the grid search, not a fixed transform.

## Typical Use Cases

```bash
# Register left white surface to a label volume
mris_register_to_label \
  --reg lh.dat --mov brain.mgz \
  --surf lh.white --targ boundary_label.mgz \
  --res 0.5 --out-reg lh.registered.dat

# Include pial in similarity
mris_register_to_label \
  --reg lh.dat --mov brain.mgz \
  --surf lh.white --pial lh.pial \
  --targ boundary_label.mgz \
  --out-reg lh.registered.dat
```

## Pipeline Context

Not part of `recon-all`. Used for post-hoc rigid surface correction when a reference label is available. Often used with manually edited labels or cross-modality registration.

## Gotchas and Caveats

> [!gotcha] sinc interpolation broken
> From source comments: "sinc interpolation is broken except for maybe COR to COR." Use `trilinear` or `nearest` only.

> [!gotcha] Rigid only
> This tool only searches over rigid (6 DOF: 3 translations, 3 rotations) transformations. Non-rigid corrections require other tools.

## Related Tools

- [[mris_register_to_volume]] — similar tool registering surface to a full intensity volume (not a label)
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from embedded BEGINUSAGE block):** Full flag set confirmed from source comments; sinc broken warning from source.

**Uncertain:** Search grid specification (step sizes are not documented in the BEGINUSAGE block); distance transform implementation.

> [!gap] The grid search step sizes for translations and rotations were not documented in the extracted source. The full search range specification is unclear.
