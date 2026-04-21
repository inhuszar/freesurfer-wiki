---
title: "mris_label_mode"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_label_mode/mris_label_mode.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_label2annot]]"
  - "[[mris_ca_label]]"
  - "[[surface-format]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact algorithm for mode computation across the spherical parameterization not confirmed"
  - "Output format (updated annotation file vs. separate mode file) not fully traced"
tags:
  - surface
  - labels
  - annotation
  - atlas
  - mode
---

# mris_label_mode

## Summary

`mris_label_mode` computes the mode (most common) label assignment at each location in a spherical parameterization of the cortical surface, based on a set of input annotation maps. The tool maps annotation data from the surface's spherical parameterization onto a 2D grid, maintains a histogram of label assignments at each grid location, and then assigns the modal (most frequently occurring) label to each grid cell. This is used for creating average or consensus atlas parcellations from multiple subjects.

## Source Information

- **Language:** C++
- **Source file:** `mris_label_mode/mris_label_mode.cpp`
- **Author:** (no explicit author)
- **Key internal functions:** `AnnotToParameterization`, `ParameterizationToAnnot`, `UpdateAnnotHist`, `GetAnnotMode`

## Purpose and Context

When creating a group-level atlas parcellation, one approach is to project each subject's parcellation into a common spherical parameterization space and then take the mode (most common label) at each location. This produces a consensus atlas that reflects the most probable parcellation assignment at each point on the sphere.

The tool uses a 2D spherical parameterization grid (256 × 128 by default, stored in `udim × vdim`) and a histogram tracking label assignments across multiple subjects.

## Inputs

| Positional | Description |
|------------|-------------|
| `argv[1]` | Input annotation file (from a single subject or average) |
| `argv[2]` | Suffix/identifier |
| `argv[3]` | Surface file name |
| `argv[4]` | Output annotation file |
| `argv[5]` | Hemisphere (lh or rh) |

> [!gap] Argument order not fully confirmed
> The exact positional argument order has been inferred from the `main()` function and may not be correct. User verification needed.

## Outputs

| Output | Description |
|--------|-------------|
| Mode annotation | Updated annotation file with mode-based label assignments |
| Freq file | Optional: frequency map written to parameterization |
| Hist file | Optional: histogram written to parameterization |

## Mathematical Foundations

**Spherical parameterization:** Each surface vertex is mapped to $(u, v)$ coordinates on a $udim \times vdim$ grid via spherical coordinates $(\phi, \theta)$:

$$
u = \lfloor (1 + \sin\phi) \cdot udim / 2 \rfloor
$$
$$
v = \lfloor (1 + \cos\theta) \cdot vdim / 2 \rfloor
$$

**Mode computation:** At each grid cell $(u, v)$, a histogram counts the frequency of each annotation label assigned to that location. The mode is:
$$
L_{\text{mode}}(u, v) = \arg\max_{\ell} \text{count}(u, v, \ell)
$$

The `AnnotHistLabel` and `AnnotHistCount` 3D arrays track these histograms.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `-normalize` | — | off | Normalize label frequencies |
| `-condition_no N` | integer | 0 | Condition number |
| `-stat` | — | off | Compute statistics |
| `-sigma S` | float | 0.0 | Smoothing sigma applied to annotation |
| `-output_surf name` | string | — | Write output surface |
| Grid dimensions: | | `udim=256`, `vdim=128` | Spherical parameterization grid size (hardcoded) |
| `maxlabels` | | 25 | Maximum number of distinct labels (hardcoded) |
| `maxvertices` | | 500000 | Maximum vertices (hardcoded) |

## Typical Use Cases

> [!gap] Typical usage
> Concrete usage examples for `mris_label_mode` are not well documented. This appears to be an internal tool used in atlas construction pipelines.

**Conceptual usage:**
```bash
mris_label_mode subject/label/lh.aparc.annot suffix lh.sphere lh.mode.annot lh
```

## Pipeline Context

Not part of standard `recon-all`. Used in atlas construction workflows where parcellations from multiple subjects need to be combined into a group-level consensus annotation.

## Gotchas and Caveats

> [!gotcha] Hardcoded grid dimensions
> The spherical parameterization grid is hardcoded at 256×128. Subjects with unusual surface topologies or a very large number of labels (>25) may not be handled correctly.

> [!gotcha] maxlabels limit
> Only 25 distinct labels are supported by default. Annotations with more than 25 regions will not be correctly processed.

## Related Tools

- [[mris_label2annot]] — converts labels to annotation format
- [[mris_ca_label]] — the standard FreeSurfer parcellation tool
- [[surface-format]] — annotation file format

## Confidence and Gaps

**Low-medium confidence** — the source code logic was read but the CLI was not independently verified.

> [!gap] CLI argument order
> The positional argument order has been inferred from `main()` variable assignments and may be incorrect. Running with `--help` or `-h` is recommended before use.
