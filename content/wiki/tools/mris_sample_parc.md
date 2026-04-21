---
title: "mris_sample_parc"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_sample_parc/mris_sample_parc.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[mri_annotation2label]]"
  - "[[mri_ca_label]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact projection mechanism (proj_mm, proj_frac) — how volume parcellation voxels are sampled at fractional depth into cortex — needs verification."
  - "fix_label_topology() algorithm not documented here."
tags:
  - surface
  - parcellation
  - annotation
  - sampling
  - autorecon3
---

# mris_sample_parc

## Summary

`mris_sample_parc` samples a volumetric parcellation (e.g., a GCA-generated label volume) onto a cortical surface, producing a surface annotation file (`.annot`). For each surface vertex, it projects inward or outward by a specified fraction of cortical thickness (or a fixed mm offset) and reads the volumetric label at that projected location. The result is an annotation on the surface. An optional mode-filter can clean up the annotation by majority voting in a local neighbourhood.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_sample_parc/mris_sample_parc.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_sample_parc`
- **Original Author:** Bruce Fischl

## Purpose and Context

In the FreeSurfer pipeline, subcortical segmentations are computed volumetrically (e.g., by `mri_ca_label`), while cortical parcellations are typically computed on the surface (by `mris_ca_label`). `mris_sample_parc` bridges these two domains by projecting a volumetric segmentation onto the surface. It is also used in the `autorecon3` stage to sample the aseg onto the surface for overlap with the cortical ribbon.

## Inputs

### Required Inputs

(Positional arguments via environment + flags: `<subject_name> <hemisphere> <parc_name> <annot_name>`)

- **`<subject_name>`** — FreeSurfer subject ID.
- **`<hemisphere>`** — `lh` or `rh`.
- **`<parc_name>`** — name of the volumetric parcellation volume in the subject's `mri/` directory (e.g., `aparc+aseg`).
- **`<annot_name>`** — output annotation name (written to subject's `label/` directory).

`SUBJECTS_DIR` must be set in the environment, or overridden via `-sdir`.

### Input Assumptions

> [!assumption] Surface exists at surf/<hemi>.<surf_name>
> The surface used for sampling is `surf/<hemi>.<surf_name>` (default: `white`). The thickness file `surf/<hemi>.<thickness_name>` (default: `thickness`) must also exist.

> [!assumption] Parcellation is an integer label volume
> The input volume must contain integer labels mappable to the FreeSurfer color table.

## Outputs

### Files Created

- **`label/<hemi>.<annot_name>.annot`** — FreeSurfer annotation file (see [[annotation-format]]) with the sampled parcellation labels at each vertex.

## Mathematical Foundations

For each vertex $i$ with surface position $\mathbf{v}_i$ and outward normal $\hat{n}_i$, the tool projects the query point into the volume:

$$
\mathbf{q}_i = \mathbf{v}_i + \left( \text{proj\_frac} \times t_i \right) \hat{n}_i
$$

where $t_i$ is the cortical thickness at vertex $i$ and `proj_frac` is the fractional depth parameter (default: 0.5, i.e., sample at the midpoint of the cortex). Alternatively, a fixed `proj_mm` offset can be used:
$$
\mathbf{q}_i = \mathbf{v}_i + \text{proj\_mm} \cdot \hat{n}_i
$$

The label at voxel nearest to $\mathbf{q}_i$ (in the parcellation volume) is assigned as the annotation label for vertex $i$.

An optional **mode filter** (`-mode_filter <n>`) replaces each vertex's label with the most common label in a local spatial neighbourhood of `wsize` vertices (default 7), repeated `n` times.

A **topology fix** (`-fix_topology <n>`) enforces connected components by filling isolated single-label islands.

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override subjects directory. |
| `-surf <name>` | string | `white` | Surface to project from. |
| `-thickness <name>` | string | `thickness` | Thickness file name for fractional projection. |
| `-proj_frac <f>` | float | 0.5 | Fractional projection into cortex (0=white, 1=pial). |
| `-proj_mm <mm>` | float | 0.0 | Fixed mm projection (overrides proj_frac if nonzero). |
| `-wsize <n>` | integer | 7 | Neighbourhood window size for mode filter. |
| `-mode_filter <n>` | integer | 0 | Number of mode-filter iterations (majority vote cleanup). |
| `-fix_topology <n>` | integer | -1 (all) | Minimum label region size for topology fixing; -1 means fix all. |
| `-avgs <n>` | integer | 0 | Number of curvature averaging iterations. |
| `-nclose <n>` | integer | 0 | Number of morphological close operations. |
| `-ctab <file>` | string | — | Color table file for output annotation. |
| `-unknown <label>` | integer | -1 | Label index to assign to unknown/background vertices. |
| `-trans <in> <out>` | pair | — | Translate label index `in` to index `out` in output (can be repeated). |
| `-replace <label>` | integer | — | Label to replace in the output. |
| `-from_vol_to_surf` | boolean | false | Sample from volume to surface (alternative projection direction). |
| `-mask <file> <val>` | pair | — | Apply mask: only process vertices where mask file equals `val`. |
| `-label_index <n>` | integer | -1 | Process only label with index `n`. |
| `--version` | boolean | — | Print version string and exit. |
| `-u` | boolean | — | Print usage and exit. |

### Configuration Interactions

- `proj_mm` takes precedence over `proj_frac` when nonzero.
- `-mode_filter` and `-fix_topology` are post-processing steps applied after the initial sampling; their order of application matters.
- `-ctab` overrides the color table embedded in the parcellation volume.

> [!gotcha] Translation file (-trans) vs. label index (-trans flag)
> The source also references a `translation_fname` for a text-based color-to-label mapping (`cma_parcellation_colors.txt`). This is distinct from the `-trans` flag for explicit label translation pairs.

## Typical Use Cases

### Use Case 1: Sample aseg onto white surface

```bash
mris_sample_parc \
  subject lh aparc+aseg aparc.a2009s.sampled
```

### Use Case 2: Sample with mode filter cleanup

```bash
mris_sample_parc \
  -mode_filter 3 -wsize 7 \
  subject lh aparc+aseg lh.aparc.sampled_clean
```

## Pipeline Context

`mris_sample_parc` is called in the `autorecon3` stage to transfer volumetric parcellation information to the surface. It is part of the cortical labeling stream:

**Predecessor:** [[mri_ca_label]] (volumetric parcellation) → **This tool** → [[mris_ca_label]] (atlas-based surface parcellation)

## Gotchas and Caveats

> [!gotcha] Projection direction matters
> The fractional projection projects inward by default (from the white surface toward the pial). For superficial structures, `proj_frac = 0.5` may project outside the GM ribbon. Consider using `proj_mm` for more precise control.

> [!gotcha] Topology of output annotation
> Without `-fix_topology`, the output annotation may have isolated single-vertex islands of minority labels. Use `-mode_filter` and/or `-fix_topology` to clean up.

## Related Tools

- [[mris_ca_label]] — atlas-based surface parcellation (alternative to volumetric sampling)
- [[mri_aparc2aseg]] — reverse operation: maps surface annotation back to volume
- [[mri_annotation2label]] — extracts individual label files from annotation
- [[mri_ca_label]] — generates the volumetric parcellation consumed by this tool

## Confidence and Gaps

Confidence is **medium**. The overall algorithm and configuration flags are well-documented in the source. The exact projection computation and topology fix algorithm need verification.

> [!gap] Projection implementation
> The `replace_vertices_with_label()` and inline projection logic should be read to confirm the exact coordinate transformation between surface RAS and volume voxel space.
