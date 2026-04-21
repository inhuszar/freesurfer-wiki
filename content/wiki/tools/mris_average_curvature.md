---
title: "mris_average_curvature"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_average_curvature/mris_average_curvature.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_apply_reg]]"
  - "[[mris_smooth]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The exact MRI_SP spherical parameterisation projection method needs verification from MRISPfromMRIS."
tags:
  - surface
  - curvature
  - group-average
  - atlas
---

# mris_average_curvature

## Summary

`mris_average_curvature` computes a group average of a scalar curvature field (any `.curv`-format overlay) across a set of subjects using their spherical surface registrations. It accumulates each subject's scalar field into a spherical parameter map and produces a mean (and optionally normalised) scalar map on the output surface.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_average_curvature/mris_average_curvature.cpp`

## Purpose and Context

Group-average cortical maps are essential for atlas construction and for visualising population-level patterns in morphometric measures. After individual subjects have been registered to a common sphere (via [[mris_register]]), their scalar fields (sulcal depth, curvature, thickness, etc.) can be averaged to produce a group mean surface. `mris_average_curvature` performs this averaging by projecting each subject's scalar field onto a spherical parameter map (`MRI_SP`) via the registered sphere, accumulating across subjects, and then sampling back onto the output surface.

## Inputs

| Input | Description |
|-------|-------------|
| `<in_fname>` | Name of the curvature/scalar file to read for each subject (positional 1) |
| `<hemi>` | Hemisphere: `lh` or `rh` (positional 2) |
| `<surf_name>` | Surface name to use for projection (positional 3) |
| `<subject1> ... <subjectN>` | List of subject names to average (positional 4..N-1) |
| `<out_fname>` | Output file path for the averaged scalar (last positional) |

- Requires `SUBJECTS_DIR` environment variable.
- For each subject, reads `$SUBJECTS_DIR/<subj>/surf/<hemi>.<surf_name>` and `$SUBJECTS_DIR/<subj>/surf/<hemi>.<in_fname>`.

## Outputs

| Output | Description |
|--------|-------------|
| `<out_fname>` | Group average scalar overlay in `.curv` format |

Optionally, `--osurf` and `--ohemi` can redirect the output to a different surface/hemisphere for the projection step.

## Mathematical Foundations

Each subject's scalar field $f_s(v)$ is projected to the spherical parameter space:

$$
F(\theta, \phi) \mathrel{+}= f_s(\theta, \phi), \quad N(\theta, \phi) \mathrel{+}= 1
$$

After accumulating all subjects:

$$
\bar{F}(\theta, \phi) = \frac{F(\theta, \phi)}{N(\theta, \phi)}
$$

If `--norm-mean` is selected (`which_norm = NORM_MEAN`), each subject's curvature is normalised to zero mean before accumulation:

$$
f_s' = f_s - \bar{f}_s
$$

## Configuration Options

| Flag | Description | Default |
|------|-------------|---------|
| `<in_fname>` | Curvature file name per subject | required |
| `<hemi>` | Hemisphere | required |
| `<surf_name>` | Surface name | required |
| `<out_fname>` | Output file | required |
| `-S <sdir>` | Override SUBJECTS_DIR | env var |
| `-n <navgs>` | Number of smoothing averages applied to output | 0 |
| `-n <norm>` | Normalisation mode | `NORM_MEAN` |
| `--osurf <surf>` | Output surface name (if different from input) | same as input |
| `--ohemi <hemi>` | Output hemisphere (if different) | same as input |
| `--os <surf>` | Output surface for writing | — |
| `--stat` | Write stat images (DOF, mean, variance) | off |
| `--condition <n>` | Condition number for multi-condition averaging | 0 |

> [!gap] Flag names need confirmation
> Flag parsing is done with `get_option()`. The precise flags (`-S`, `-n`, etc.) were inferred from global variables. Verify against the `get_option()` body in the source.

## Configuration Interactions

- Subject list order does not affect the result (accumulation is commutative).
- `--stat` enables writing mean/variance/DOF MRI_SP images for later use in atlas construction.
- If a subject's surface file cannot be read, that subject is skipped and a count of skipped subjects is printed.

## Typical Use Cases

```bash
# Average sulcal depth (sulc) across subjects lh hemisphere
mris_average_curvature sulc lh sphere.reg \
    bert ernie alice bob \
    /tmp/lh.avg_sulc.curv

# With smoothing applied to the group average
mris_average_curvature -n 10 sulc lh sphere.reg \
    bert ernie alice \
    /tmp/lh.avg_sulc_smoothed.curv
```

## Pipeline Context

Not part of the standard per-subject `recon-all` pipeline. Used in:
- Atlas construction (averaging after all subjects are registered).
- Group-level analysis to visualise average morphology.
- Quality assessment of registration by comparing individual and average sulcal maps.

Related tools:
- [[mris_register]] — produces the registered sphere that enables this averaging
- [[mris_apply_reg]] — an alternative approach to cross-subject data transfer
- [[mris_smooth]] — smoothing applied to curvature before or after averaging

## Gotchas and Caveats

> [!gotcha] Skipped subjects
> If a subject's surface file is missing or cannot be read, the subject is silently skipped (with a printed warning). The averaging continues with fewer subjects. Check the output count.

> [!gotcha] Output surface geometry
> The group average is written back onto the last-read subject's surface geometry unless `--os` overrides it. For atlas work, the output should be redirected to a canonical template surface.

## Related Tools

- [[mris_register]] — registers individual spheres
- [[mris_apply_reg]] — resamples data after registration
- [[mris_smooth]] — applies spatial smoothing to curvature fields

## Confidence and Gaps

**Confident:** Core algorithm (MRI_SP accumulation and normalisation), I/O structure, and skip behaviour confirmed from source.

> [!gap] Exact flag names
> The `-n`, `-S`, `--stat`, `--condition` flags were inferred from global variables. Verify from the `get_option()` body.
