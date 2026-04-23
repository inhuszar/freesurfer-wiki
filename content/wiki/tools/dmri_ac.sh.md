---
title: "dmri_ac.sh"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "anatomicuts/dmri_ac.sh"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_match]]"
  - "[[dmri_stats_ac]]"
  - "[[dmri_trk2trk]]"
  - "[[dmri_extractSurfaceMeasurements]]"
  - "[[mri_vol2vol]]"
  - "[[mri_aparc2aseg]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "No formal --help output; interface is positional function name dispatch"
  - "External dependencies (FSL eddy_correct, MRtrix tckgen, flirt) version requirements unknown"
tags:
  - diffusion
  - tractography
  - clustering
  - anatomicuts
  - pipeline
---

# dmri_ac.sh

## Summary

`dmri_ac.sh` is a bash pipeline orchestrator for the AnatomiCuts diffusion MRI tractography clustering workflow. It provides a collection of named functions — `tractography`, `getMaps`, `anat2dwi`, `dwi2anat`, `filterStreamlines`, `runAC`, `anatomiCuts`, `Hungarian`, `Measures`, `SurfaceMeasures`, `ToAnat`, `ToTarget`, and `average` — that collectively handle the full pipeline from raw DWI preprocessing through fiber clustering, cross-subject correspondence matching, and group statistical analysis using the AnatomiCuts algorithm.

## Source Information

- **Language:** Bash shell script
- **Source file:** `anatomicuts/dmri_ac.sh`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_ac.sh`
- **Original author:** Viviana Siless (MGH)
- **External dependencies:** FSL (`eddy_correct`, `flirt`, `bet`), MRtrix3 (`mrconvert`, `dwi2mask`, `dwi2response`, `dwi2fod`, `tckgen`), FreeSurfer binaries (`mri_convert`, `mri_concat`, `mri_vol2vol`, `mri_aparc2aseg`, `dmri_AnatomiCuts`, `dmri_match`, `dmri_stats_ac`, `dmri_trk2trk`, `streamlineFilter`)

## Purpose and Context

This script serves as a high-level workflow driver for the AnatomiCuts pipeline. AnatomiCuts is an anatomically-informed clustering method for white-matter tractography that groups streamlines by their anatomical endpoints (parcellation labels) and geometric properties (shape), then finds inter-subject correspondences using the Hungarian algorithm. `dmri_ac.sh` provides a function-dispatch interface where each named function handles one stage of the pipeline.

The script is designed to be called with a function name as its first argument followed by function-specific parameters:

```bash
bash dmri_ac.sh <function_name> <subject_id> [additional_args...]
```

The `forAll` function provides a batch processing wrapper that iterates over all subjects in `$SUBJECTS_DIR`.

## Inputs

| Input | Description |
|-------|-------------|
| `SUBJECTS_DIR` | FreeSurfer subjects directory (environment variable, required) |
| `DMRI_DIR` | DWI data directory (defaults to `SUBJECTS_DIR`) |
| `ODMRI_DIR` | AnatomiCuts output directory (defaults to `SUBJECTS_DIR`) |
| Per-subject DWI | `$DMRI_DIR/<subject>/dmri/data.nii.gz` or `dwi.nii.gz` |
| Per-subject bvals/bvecs | `$DMRI_DIR/<subject>/dmri/bvals`, `bvecs` |
| FreeSurfer parcellation | `$SUBJECTS_DIR/<subject>/mri/wmparc.mgz` or `wm2009parc.mgz` |

## Outputs

Outputs are organized per-subject in `$ODMRI_DIR/<subject>/dmri.ac/<length>/`:

| Output | Description |
|--------|-------------|
| `*.trk` files | AnatomiCuts fiber clusters |
| `HierarchicalHistory.csv` | Hierarchical clustering history |
| `<std>/match/*.csv` | Cross-subject Hungarian matching results |
| `<std>/measures/*.csv` | Per-cluster diffusion measures (FA, MD, RD, AD, MK, RK, AK) |
| `<std>/toAnat/` | Streamlines transformed to anatomical space |

## Mathematical Foundations

**AnatomiCuts** uses a normalized cuts spectral clustering algorithm on a graph of streamlines. Streamlines are represented as sequences of anatomical label pairs at $n$ equidistant points. The similarity between streamlines $i$ and $j$ is computed using a membership function (Euclidean, Hausdorff, or label-based entropy/intersection):

$$
W_{ij} = \exp\!\left(-\frac{d(s_i, s_j)^2}{\sigma^2}\right)
$$

The normalized cuts criterion partitions the graph to minimize the cut cost normalized by association:

$$
\text{Ncut}(A, B) = \frac{\text{cut}(A,B)}{\text{assoc}(A,V)} + \frac{\text{cut}(A,B)}{\text{assoc}(B,V)}
$$

**Cross-subject correspondence** is solved as an assignment problem using the Hungarian (Kuhn-Munkres) algorithm, minimizing total distance between cluster representatives across subjects.

> [!math] Diffusion models
> The script supports DTI (6-parameter tensor) and DKI (diffusion kurtosis imaging) models for computing scalar maps (FA, MD, RD, AD, MK, RK, AK). Tractography can use DTI-based streamlines (via `diffusionUtils`) or CSD fiber orientation distributions (via MRtrix3 `tckgen`).

## Configuration Options

`dmri_ac.sh` does not use flag-based arguments. It uses positional function dispatch:

| Function | Arguments | Description |
|----------|-----------|-------------|
| `forAll` | `function subject model model2 length bb cluster_call` | Batch: run function over all subjects |
| `tractography` | `subject model2 bb` | Generate streamlines (GQI or FOD/CSD) |
| `getMaps` | `subject model` | Compute DTI or DKI scalar maps |
| `anat2dwi` | `subject model2` | Register anatomical parcellation to DWI space |
| `dwi2anat` | `subject model2` | Transform streamlines to anatomical space |
| `filterStreamlines` | `subject model2 length` | Filter streamlines by minimum length |
| `runAC` | `subject model model2 length bb` | Full per-subject pipeline: tractography → getMaps → anat2dwi → filter → AnatomiCuts |
| `anatomiCuts` | `subject model2 length` | Run `dmri_AnatomiCuts` clustering |
| `Hungarian` | `subject targetSubject length std bb` | Cross-subject matching via Hungarian algorithm |
| `Measures` | `subject targetSubject length std` | Extract diffusion measures per cluster |
| `SurfaceMeasures` | `subject targetSubject length std` | Extract cortical surface measures per cluster |
| `ToAnat` | `subject length std` | Transform streamlines to anatomical (T1) space |
| `ToTarget` | `subject targetSubject length std` | Transform streamlines to target subject space |
| `average` | `targetSubject length std labels_file labels_cols groupA groupB groups thickness` | Group average analysis |
| `GA` | `targetSubject length std labels_file labels_cols groupA groupB groups thickness` | Group analysis (calls `anatomiCutsUtils`) |

**Supported tractography models:**
- `DTI`: FSL eddy-corrected DTI with `diffusionUtils`
- `DKI`: Diffusion kurtosis imaging with `diffusionUtils`
- `GQI`: Generalized Q-sampling imaging via `diffusionUtils`
- `FOD`: Fiber orientation distribution via MRtrix3 CSD

## Configuration Interactions

- `DMRI_DIR` and `ODMRI_DIR` default to `SUBJECTS_DIR` if unset.
- The script auto-detects whether `wm2009parc2dwi.nii.gz` or `wmparc2dwi.nii.gz` is present and uses the appropriate parcellation.
- The `bb` argument in tractography controls FOD tracking parameters: `-bb` uses more constrained tracking (angle 50°, maxlen 150) vs. the default (angle 40°, maxlen 250).
- Cluster sizes are hardcoded to `(200 150 100 50)` in the Hungarian step.
- The `forAll` function can optionally submit jobs to a cluster system by passing a cluster submission command with underscores replacing spaces (e.g., `pbsubmit_-n_1_-c_1`).

## Typical Use Cases

```bash
# Set up environment
export SUBJECTS_DIR=/data/subjects
export DMRI_DIR=/data/dmri
export ODMRI_DIR=/data/anatomicuts

# Run full per-subject pipeline (FOD tractography + AnatomiCuts)
bash dmri_ac.sh runAC subject01 DTI FOD 45 -

# Run AnatomiCuts for a single subject (if streamlines already exist)
bash dmri_ac.sh anatomiCuts subject01 FOD 45

# Run Hungarian matching to target subject
bash dmri_ac.sh Hungarian subject01 template_subject 45 4

# Extract diffusion measures after matching
bash dmri_ac.sh Measures subject01 template_subject 45 4

# Batch: run full pipeline for all subjects
bash dmri_ac.sh forAll runAC DTI FOD 45 -
```

## Pipeline Context

`dmri_ac.sh` is the top-level orchestrator for the AnatomiCuts diffusion tractography pipeline. It is not called by `recon-all`. It depends on a prior FreeSurfer anatomical reconstruction (`recon-all`) being complete for each subject.

Typical dependency chain:
```
recon-all --> dmri_ac.sh:anat2dwi --> dmri_ac.sh:runAC --> dmri_ac.sh:Hungarian --> dmri_ac.sh:Measures
```

## Gotchas and Caveats

> [!gotcha] No --help output
> The script provides no usage message for an incorrect invocation. A call with no arguments or an unknown function name results in the `$@` dispatch at the end of the script simply executing nothing (or an error from the unknown function). The interface must be understood from reading the source.

> [!gotcha] Hardcoded internal paths
> Several internal paths reference `/space/snoke/1/public/vivros/` (the developer's data directory) in commented-out lines. These comments indicate the script's development origin but do not affect functionality.

> [!gotcha] External dependency requirements
> This script requires FSL (`eddy_correct`, `flirt`, `bet`) and — for FOD-based tractography — MRtrix3 (`mrconvert`, `dwi2mask`, `dwi2response`, `dwi2fod`, `tckgen`). These must be installed and in PATH independently of FreeSurfer.

> [!gotcha] Cluster count hardcoded
> The `clusters=(200 150 100 50)` array in the Hungarian step is hardcoded. To use different cluster counts, the script must be modified directly.

> [!gotcha] No error checking in most functions
> Unlike the `runAC` function (which passes `&&`-chained commands), most sub-functions do not check for errors in intermediate steps.

## Related Tools

- [[dmri_AnatomiCuts]] — the spectral clustering binary called by this script
- [[dmri_match]] — Hungarian matching binary
- [[dmri_stats_ac]] — measure extraction binary
- [[dmri_trk2trk]] — streamline transformation utility
- [[dmri_extractSurfaceMeasurements]] — surface measure extraction
- [[mri_aparc2aseg]] — parcellation to volume used for DWI-space parcellation

## Confidence and Gaps

> [!gap] No help text available
> The script has no --help flag. All documentation is inferred from the source code.

> [!gap] External dependency versions
> The required versions of FSL and MRtrix3 are not specified in the script.

> [!gap] `GA` vs `preGA` workflow
> The relationship between the `preGA`, `GA`, and `average` functions in a typical group analysis is not explicitly documented; some options in `GA` are commented out.
