---
title: "mris_make_average_surface"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_make_average_surface/mris_make_average_surface.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_make_template]]"
  - "[[recon-all]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Whether the fsaverage surfaces shipped with FreeSurfer were created with this tool is not confirmed"
tags:
  - surface
  - atlas
  - average
  - fsaverage
  - group
---

# mris_make_average_surface

## Summary

`mris_make_average_surface` creates a group-average surface by averaging the Talairach-registered vertex coordinates from multiple subjects' surfaces. Subjects are aligned to a common spherical space using their `sphere.reg` files, and vertex positions are averaged in Talairach coordinates. The result is an average surface resampled to an icosahedron mesh, representing the mean cortical geometry of the input group. This is the tool used to create the `fsaverage` subject's surfaces.

## Source Information

- **Language:** C++
- **Source file:** `mris_make_average_surface/mris_make_average_surface.cpp`
- **Original author:** Bruce Fischl
- **Dependencies:** `icosahedron.h`, `transform.h`, `gca.h`, `gcamorph.h`
- **OpenMP support:** Yes

## Purpose and Context

The `fsaverage` subject, which serves as the standard surface atlas space in FreeSurfer, was created using `mris_make_average_surface` applied to a group of subjects. The tool:

1. For each input subject:
   - Reads the surface (`orig` by default)
   - Reads the Talairach transform (`talairach.xfm` by default)
   - Maps surface vertices to Talairach coordinates
   - Resamples to a common icosahedron (order 7 = 163,842 vertices by default)
2. Averages vertex coordinates across all subjects
3. Writes the average surface to the output subject's directory

This produces an average surface in Talairach space that can be used as a registration target for group analyses.

## Inputs

| Positional | Description |
|------------|-------------|
| `hemi` | Hemisphere (lh or rh) |
| `outsurfname` | Name for the output average surface (e.g., `avg_orig`) |
| `cansurfname` | Registration surface name (e.g., `sphere.reg`) |
| `outsubject` | Output subject name where results are stored |
| `subj1 subj2 ...` | List of input subjects |

## Outputs

| Output | Description |
|--------|-------------|
| Average surface | Written to `$SUBJECTS_DIR/outsubject/surf/hemi.outsurfname` |
| Area file | `hemi.outsurfname.area` |

The output surface has vertices at the averaged Talairach positions, resampled to an icosahedron.

## Mathematical Foundations

For each icosahedron vertex $v$ at spherical coordinates $(\theta_v, \phi_v)$:

1. For each subject $s$, find the surface vertex $w_s(v)$ that maps to the nearest point on the subject's `sphere.reg` to $(\theta_v, \phi_v)$.

2. Apply the subject's Talairach transform $T_s$ to get Talairach-space coordinates:
$$
\mathbf{x}_s^{\text{tal}}(v) = T_s \cdot \mathbf{x}_s^{\text{surf}}(w_s(v))
$$

3. Average over subjects:
$$
\bar{\mathbf{x}}(v) = \frac{1}{N} \sum_{s=1}^N \mathbf{x}_s^{\text{tal}}(v)
$$

Area normalization (unless `-nonorm`): the average surface area is normalized to match the expected icosahedron area.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-sdir sdir` | path | `$SUBJECTS_DIR` | Use this subjects directory |
| `-sdir-out sdirout` | path | `$SUBJECTS_DIR` | Save results to this directory instead |
| `-nonorm` | — | off | Do not normalize area |
| `-i icoorder` | integer | 7 | Icosahedron order for output mesh (7 = 163,842 vertices) |
| `-x xfmname` | string | `talairach.xfm` | Transform file name (in subject's `mri/transforms/`) |
| `-s surfname` | string | `orig` | Surface name to average |
| `-v diagno` | integer | -1 | Set Gdiag_no for verbose vertex diagnostics |
| `-help` | — | — | Print help and exit |
| `-version` | — | — | Print version and exit |

Positional arguments (required):
1. `hemi`
2. `outsurfname`
3. `cansurfname`
4. `outsubject`
5+. Subject list

## Configuration Interactions

- `-i icoorder` controls the vertex density of the output surface. Order 7 (163,842 vertices) is standard for fsaverage. Smaller orders produce coarser meshes.
- `-nonorm` disables the area normalization step. Without normalization, area differences between subjects contribute to the average surface shape.
- `-x xfmname` allows use of a non-Talairach transform (e.g., MNI152) for averaging if subjects are aligned to a different space.
- `-s surfname` allows averaging surfaces other than `orig` (e.g., averaging `white` surfaces instead of `orig`).

## Typical Use Cases

**Create an average surface from a group (fsaverage-style):**
```bash
mris_make_average_surface lh avg_orig sphere.reg my_avg_subject \
    subj1 subj2 subj3 subj4 subj5
```

**Create average using a different transform:**
```bash
mris_make_average_surface -x mni152.xfm lh avg_orig sphere.reg my_avg_subject \
    subj1 subj2 subj3
```

**Create average at lower resolution (ico order 5):**
```bash
mris_make_average_surface -i 5 lh avg_orig sphere.reg avg5 \
    subj1 subj2 subj3
```

## Pipeline Context

Not part of `recon-all` on a per-subject basis. Used in atlas construction:

1. [[recon-all]] processes all subjects, producing `sphere.reg` for each
2. `mris_make_average_surface` averages surfaces across subjects
3. The resulting average subject can then be used as a custom registration target

The `fsaverage` subject's surfaces shipped with FreeSurfer were likely created with this tool.

## Gotchas and Caveats

> [!gotcha] Output subject directory must exist
> The output subject directory (`$SUBJECTS_DIR/outsubject/`) and its `surf/` subdirectory must exist before running. The tool does not create them.

> [!gotcha] Requires Talairach transforms for all subjects
> Each subject must have `mri/transforms/talairach.xfm` (or the specified transform file). Subjects lacking this file will cause errors.

> [!gotcha] Icosahedron order 7 assumption
> The default icosahedron order is 7 (163,842 vertices), matching fsaverage. If using a non-standard registration surface, ensure the ico order matches.

## Related Tools

- [[mris_register]] — produces the `sphere.reg` for each subject
- [[mris_make_template]] — creates the registration template used by `mris_register`
- [[recon-all]] — full subject processing pipeline
- [[surface-format]] — surface file format

## Confidence and Gaps

**Confident (from source and embedded BEGINHELP block):**
- Full flag list
- Talairach transform usage
- Icosahedron order control
- Area normalization option
- Source subject reading logic
