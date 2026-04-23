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
last_agent_update: 2026-04-22
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

- `--surf surface` — surface to register
- `--mov fvol` — moving volume (reference space for label coordinates)
- `--label label` — label file (registration target)
- `--reg regfile` — initial registration file (optional; identity if omitted)
- `--targ vol` — target volume (optional; used only for diagnostic outputs)
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
- `--max` — maximum distance value at label points
- `--median` — median distance value
- `--L1` — L1 norm (mean absolute distance)

## Configuration Options

> [!gotcha] BEGINUSAGE comment vs. actual parser
> The source file contains a `BEGINUSAGE` comment block that lists `--pial`, `--pial_only`, `--cost`, `--interp`, `--profile`, and `--border`. None of these are handled in `parse_commandline()`. They are not functional flags in FreeSurfer 8.2.0.

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--surf` | `<surface>` | required | Surface file to register. |
| `--mov` | `<fvol>` | required | Moving volume (defines the coordinate space for label points). |
| `--label` | `<label>` | required | Label file; registration target — the surface is aligned to the label boundary. |
| `--out-reg` | `<outreg>` | — | Output registration file at lowest cost (written continuously during search). |
| `--reg` | `<regfile>` | identity | Initial registration file (LTA format); identity matrix is used if omitted. |
| `--targ` | `<vol>` | — | Target volume for reorientation output; used only for diagnostic intermediate file writes. |
| `--res` | `<mm>` | `0.5` | Distance transform resolution in mm. |
| `--downsample` | `<N>` | `0` | Downsample input volume by factor `<N>` before registration. |
| `--s` | `<subject>` | — | Subject name (used when writing `register.dat` output format). |
| `--sdir` | `<dir>` | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--patch` | `<patch>` | — | Surface patch file to restrict registration to a patch region. |
| `--angle_init` | `<ax> <ay> <az>` | `0 0 0` | Centre of the rotation search grid in degrees; offsets applied to search range. |
| `--trans_init` | `<tx> <ty> <tz>` | `0 0 0` | Centre of the translation search grid in mm. |
| `--max_rot` | `<deg>` | `10.0` | Maximum rotation in degrees to search over (RADIANS(10) ≈ 0.175 rad). |
| `--max_trans` | `<mm>` | `20.0` | Maximum translation in mm to search over. |
| `--angle_step_size` | `<deg>` | `0.333` | Step size for rotation grid search in degrees. |
| `--trans_step_size` | `<mm>` | `1.0` | Step size for translation grid search in mm. |
| `--scale` | `<min:steps:max>` | `1:1:1` | Scale search range in `min:steps:max` format (no scaling by default). |
| `--max` | — | off | Use MAX cost function instead of default RMS. |
| `--rms` | — | on | Use RMS cost function (default). |
| `--median` | — | off | Use median cost function. |
| `--L1` | — | off | Use L1 norm cost function. |
| `--w` | `<N>` | — | Write intermediate registrations every `<N>` improvements found. |
| `--gdiagno` | `<N>` | `-1` | Set `Gdiag_no` diagnostic vertex number for debug output. |

## Configuration Interactions

- `--max`, `--rms`, `--median`, and `--L1` are mutually exclusive cost functions; the last one specified on the command line wins. Default is RMS.
- `--angle_init` and `--trans_init` define the centre of the search grid, not a fixed transform. The search range is ±`max_rot` and ±`max_trans` around the init values.
- `--angle_step_size` and `--trans_step_size` interact with `--max_rot` and `--max_trans` to determine the total number of grid points: `angle_steps = (2/angle_step_size) * DEGREES(max_rot) + 1`.
- `--w <N>` writes intermediate registration files every `<N>` improvements; set to a large value to reduce I/O during long searches.

## Typical Use Cases

```bash
# Register left white surface to a label volume
mris_register_to_label \
  --surf lh.white --mov brain.mgz \
  --label lh.cortex.label \
  --reg lh.dat \
  --res 0.5 --out-reg lh.registered.dat

# Wider search range with finer step size
mris_register_to_label \
  --surf lh.white --mov brain.mgz \
  --label lh.cortex.label \
  --max_rot 15 --max_trans 30 \
  --angle_step_size 0.2 --trans_step_size 0.5 \
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

**Confident (from `parse_commandline()` in source):** Full flag set confirmed from actual C++ parsing code; sinc broken warning from source comments; cost function constants confirmed.

**Uncertain:** Whether `--targ` volume affects cost computation or is only used for diagnostic intermediate file output; exact behavior of `--downsample`.
