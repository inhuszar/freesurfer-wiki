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
| `-sdir` | path | `$SUBJECTS_DIR` | Use this subjects directory for input |
| `-sdir-out` | path | `$SUBJECTS_DIR` | Save output to this directory instead |
| `-nonorm` | — | off | Do not normalize surface area |
| `-i` | icoorder | `6` | Icosahedron order for output mesh (6 = 40,962 vertices; 7 = 163,842 vertices) |
| `-x` | xfmname | `talairach.xfm` | Transform file name (relative to subject's `mri/transforms/`) |
| `-s`<br>`-o` | surfname | `orig` | Surface name to average (both `-s` and `-o` set the same variable) |
| `-v` | diagno | `-1` | Set `Gdiag_no` for verbose vertex diagnostics |
| `-d` | DestLTA | — | Apply this LTA file to the average surface |
| `-t` | templatename | `$FREESURFER_HOME/average/mni305.cor.mgz` | Volume to use as geometry template for output surfaces |
| `-r` | — | off | Remove intersections in the output surface |
| `-identity` | — | off | Use identity transform instead of Talairach (sets xform to NULL) |
| `-conform` | — | off | Map output to conformed space |
| `-noconform` | — | on | Do not conform output space (default behaviour) |
| `-surf2surf` | — | on | Use surf2surf resampling instead of parametric surface (default) |
| `-no-surf2surf` | — | off | Use parametric surface method instead of surf2surf |
| `-simple` | avgsurf surf1 ... | — | Stand-alone mode: average the listed surfaces directly; all must share vertex count |
| `-threads` | N | `1` | Number of OpenMP threads |

Positional arguments (required):
1. `hemi`
2. `outsurfname`
3. `cansurfname`
4. `outsubject`
5+. Subject list

## Configuration Interactions

- `-i icoorder` controls the vertex density of the output surface. The source default is 6 (40,962 vertices). Order 7 (163,842 vertices) is standard for fsaverage and must be requested explicitly with `-i 7`. Smaller orders produce coarser meshes.
- `-nonorm` disables the area normalization step. Without normalization, area differences between subjects contribute directly to the average surface shape.
- `-x xfmname` allows use of a non-Talairach transform (e.g., MNI152) if subjects are aligned to a different space. `-identity` sets the transform to NULL (no transform applied).
- `-s` / `-o` both set the surface name to average; they are aliases for the same internal variable (`orig_name`).
- `-d DestLTA` and `-conform` are mutually exclusive; specifying both causes an error exit.
- `-surf2surf` (default on) uses the `MakeAverageSurf` path; `-no-surf2surf` falls back to the parametric surface path, which may produce large faces near the poles.
- `-simple avgsurf surf1 surf2 ...` is a stand-alone mode that bypasses the normal subject-list workflow entirely and exits after writing the average surface.

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
