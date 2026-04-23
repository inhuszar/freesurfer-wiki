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

Optionally, `-o`, `-osurf`, and `-ohemi` can redirect the output to a different subject/surface/hemisphere for the projection step.

## Mathematical Foundations

Each subject's scalar field $f_s(v)$ is projected to the spherical parameter space:

$$
F(\theta, \phi) \mathrel{+}= f_s(\theta, \phi), \quad N(\theta, \phi) \mathrel{+}= 1
$$

After accumulating all subjects:

$$
\bar{F}(\theta, \phi) = \frac{F(\theta, \phi)}{N(\theta, \phi)}
$$

If `-n` is specified (`normalize_flag = 1`), each subject's curvature is normalised to zero mean before accumulation:

$$
f_s' = f_s - \bar{f}_s
$$

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `<in_fname>` | string | — | Curvature file name per subject |
| `<hemi>` | string | — | Hemisphere |
| `<surf_name>` | string | — | Surface name |
| `<out_fname>` | path | — | Output file |
| `-sdir <dir>` | path | `$SUBJECTS_DIR` | Override SUBJECTS_DIR |
| `-a <navgs>` | int | 0 | Number of smoothing averaging iterations applied to output |
| `-n` | — | off | Normalize curvature to zero mean before accumulation |
| `-o <surf_name>` | string | — | Output surface name (subject) to paint averaged results onto |
| `-osurf <surf>` | string | same as input | Output surface name (surface file, e.g. `sphere.reg`) |
| `-ohemi <hemi>` | string | same as input | Output hemisphere (if different from input) |
| `-s <cond_no>` | int | — | Write summary statistics (mean/variance/DOF) as condition number `<cond_no>` |

## Configuration Interactions

- Subject list order does not affect the result (accumulation is commutative).
- `-s <cond_no>` enables writing mean/variance/DOF MRI_SP images (stat files) for later use in atlas construction; the condition number is embedded in the output filenames.
- If a subject's surface file cannot be read, that subject is skipped and a count of skipped subjects is printed.

## Typical Use Cases

```bash
# Average sulcal depth (sulc) across subjects lh hemisphere
mris_average_curvature sulc lh sphere.reg \
    bert ernie alice bob \
    /tmp/lh.avg_sulc.curv

# With smoothing applied to the group average
mris_average_curvature -a 10 sulc lh sphere.reg \
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
> The group average is written back onto the last-read subject's surface geometry unless `-o` overrides the output subject. For atlas work, the output should be redirected to a canonical template surface.

## Related Tools

- [[mris_register]] — registers individual spheres
- [[mris_apply_reg]] — resamples data after registration
- [[mris_smooth]] — applies spatial smoothing to curvature fields

## Confidence and Gaps

**Confident:** Core algorithm (MRI_SP accumulation and normalisation), I/O structure, skip behaviour, and all flags confirmed from `get_option()` in source.
