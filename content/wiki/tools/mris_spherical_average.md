---
title: "mris_spherical_average"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_spherical_average/mris_spherical_average.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[mris_ca_label]]"
  - "[[surface-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The -logodds mode behavior needs confirmation from deeper reading."
tags:
  - spherical-average
  - group-analysis
  - surface
  - atlas
---

# mris_spherical_average

## Summary

`mris_spherical_average` computes group-average surface data (coordinates, curvature values, vertex areas, or labels) across multiple subjects by projecting each subject's data onto a common icosahedral grid via the registered sphere, averaging there, and writing the result to an output file. It implements the spherical averaging approach described in Fischl et al., *Human Brain Mapping* 8:272–284, 1999.

## Source Information

- **Language:** C++
- **Source file:** `mris_spherical_average/mris_spherical_average.cpp`
- **Reference:** Fischl B, Sereno MI, Dale AM. *Cortical surface-based analysis II: Inflation, flattening, and a surface-based coordinate system.* NeuroImage 9:195–207, 1999; also Fischl et al., HBM 1999.
- **Key libraries:** `mrisurf`, `mrisurf_project`, `mrisurf_vals`, `mrishash`, `icosahedron`, `label`

## Purpose and Context

Individual subjects vary in sulcal and gyral patterns. To create a group-average cortical map (e.g., average curvature, average label probability) that is meaningful anatomically, data from each subject must be resampled to a common spherical coordinate system (the registered sphere, `lh.sphere.reg`). `mris_spherical_average` performs this resampling and averaging using the icosahedral template surface as the target grid.

The tool is used in two main contexts:
1. **Group-average atlas creation:** Averaging curvature or coordinate data from many subjects to create a mean surface.
2. **Label probability maps:** Averaging binary label overlays across subjects to get probabilistic maps (log-odds maps) used as spatial priors in [[mris_ca_label]].

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| `which` (positional arg 1) | Data type to average: `coords`, `vals`, `area`, `curv`, `label`, `logodds` | String keyword |
| Data filename (positional arg 2) | Name of the overlay/label file to average (without hemisphere prefix). | — |
| Hemisphere (positional arg 3) | `lh` or `rh` | — |
| Surface name (positional arg 4) | Surface to read data from (e.g., `white`, `sphere.reg`) | — |
| Subject list (positional args 5..N-1) | Subject IDs | — |
| Output filename (last positional arg) | Output file path | — |
| SUBJECTS_DIR | Standard FreeSurfer subjects directory | — |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Averaged overlay/label | Group mean of the specified data type on the icosahedral template. | Depends on `which` type: curvature binary, `.label`, or overlay |

## Mathematical Foundations

For each subject $s$ and each vertex $v$ on the icosahedral template, the subject's data value is obtained by nearest-neighbor lookup on the subject's registered sphere (using `MRIS_HASH_TABLE` for efficient lookup):

$$\bar{D}(v) = \frac{1}{N} \sum_{s=1}^{N} D_s(\text{nn}(v, \text{sphere}_s))$$

where $\text{nn}(v, \text{sphere}_s)$ is the nearest neighbor on subject $s$'s sphere to the template vertex $v$.

**For `label` averaging:** A label is treated as a binary mask; the average gives the fraction of subjects with that label at each vertex.

**For `logodds` averaging:** The per-vertex log-odds spatial prior is computed as:
$$\text{logodds}(v) = \log\frac{p(v)}{1-p(v)}$$
where $p(v)$ is the fraction of subjects with the label at vertex $v$. This is used by [[mris_ca_label]] as a spatial prior.

**Erode/dilate:** Before averaging, labels can be morphologically eroded or dilated.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `-sdir path` | directory | Overrides `SUBJECTS_DIR` |
| `-osdir path` | directory | Separate subjects directory for output |
| `-erode N` | integer | Morphologically erode each label N times before averaging |
| `-dilate N` | integer | Morphologically dilate each label N times before averaging |
| `-threshold T` | float | Threshold applied to overlay before averaging |
| `-reassign` | — | Reassign vertex labels to nearest-neighbor |
| `-normalize` | — | Normalize averaged values |
| `-ic N` | integer | Icosahedron order for average surface (default: 7) |
| `-osub subject` | string | Output subject name |
| `-ohemi hemi` | `lh`/`rh` | Output hemisphere |
| `-osurf surf` | string | Output surface name |
| `-orig name` | string | Original surface name (default: `white`) |
| `-surf_dir dir` | string | Subdirectory for surfaces (default: `surf`) |
| `-navgs N` | integer | Number of smoothing averages after resampling |
| `-dir path` | string | Subdirectory for overlay files |
| `-mask name` | string | Mask file name |
| `-condition N` | integer | Condition number (for multi-condition data) |
| `-stat` | — | Statistical mode |
| `-logodds_slope S` | float | Slope for log-odds computation (default: 0.1) |
| `-spatial_prior_avgs N` | integer | Smoothing averages for spatial prior |
| `-spatial_prior_fname fname` | string | Spatial prior filename |

**Usage:** `mris_spherical_average [options] <which> <fname> <hemi> <surf> <subject1> ... <output>`

## Configuration Interactions

- The first positional argument `which` determines what data type is averaged and sets default directory behavior (`vals`→`label/`, `curv`/`area`→`surf/`, `label`→`label/`, `logodds`→`label/`).
- `-erode` and `-dilate` only apply to `label` and `logodds` modes; they have no effect on numerical data modes.
- `-normalize` is relevant for the `vals` mode to normalize the average after accumulation.
- `-ic` selects the icosahedral resolution; ic7 (the default) has ~163,842 vertices.

## Typical Use Cases

**Average curvature across subjects:**
```bash
mris_spherical_average \
  curv curv lh sphere.reg \
  subject1 subject2 subject3 \
  $FREESURFER_HOME/average/lh.average.curv
```

**Create a label probability map (logodds) for MT region:**
```bash
mris_spherical_average \
  logodds MT.label lh sphere.reg \
  subject1 subject2 subject3 \
  lh.MT.logodds.mgh
```

## Pipeline Context

`mris_spherical_average` is not called by the standard `recon-all` per-subject pipeline. It is called in atlas-building workflows:
- Creation of the average surface used in [[mris_register]] (spherical registration target).
- Creation of prior maps used in [[mris_ca_label]] (cortical parcellation).

It is logically downstream of [[mris_register]] (which produces `sphere.reg`) and upstream of atlas creation.

## Gotchas and Caveats

> [!gotcha] Sphere must be registered
> The input surface for each subject must be the registered sphere (`sphere.reg`), not the unregistered sphere (`sphere`). Using the unregistered sphere will produce anatomically meaningless averages.

> [!gotcha] Icosahedral order matters
> The output resolution is fixed by `-ic N`. The default ic7 (~163k vertices) is appropriate for individual subject data. Lower resolutions (e.g., ic5 = ~10k) are used for fsaverage5.

> [!gotcha] Directory defaults depend on data type
> The tool silently uses different default subdirectories depending on `which`: `label/` for vals/label/logodds, `surf/` for curv/area/coords. If files are not in the expected location, use `-dir` to specify.

## Related Tools

- [[mris_register]] — produces `sphere.reg` which is the required input sphere for each subject
- [[mris_sphere]] — produces the initial unregistered sphere `sphere`
- [[mris_ca_label]] — uses log-odds maps produced by this tool as spatial priors
- [[surface-format]] — surface and overlay format reference

## Confidence and Gaps

**High confidence.** The `which` keyword data types, icosahedral averaging logic, and command-line structure are all clearly exposed in the source. The log-odds computation and erode/dilate logic are also confirmed.
