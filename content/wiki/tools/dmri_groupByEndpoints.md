---
title: "dmri_groupByEndpoints"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_groupByEndpoints.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_ac.sh]]"
  - "[[dmri_projectEndPoints]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Output file naming convention not confirmed"
  - "Handling of streamlines where endpoints fall outside the parcellation not confirmed"
tags:
  - diffusion
  - tractography
  - endpoint-filtering
  - clustering
  - parcellation
---

# dmri_groupByEndpoints

## Summary

`dmri_groupByEndpoints` groups streamlines from a tractography `.trk` file by the parcellation labels at their endpoints. Each streamline is evaluated to determine which anatomical structure its start and end points fall within, according to a reference parcellation image. Streamlines are then separated into individual output `.trk` files based on their endpoint label pairs, enabling structure-specific fiber bundle extraction.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_groupByEndpoints.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_groupByEndpoints`
- **Authors:** Andrew Zhang, Viviana Siless (MGH), 2019
- **Key libraries:** ITK, VTK, FreeSurfer AnatomiCuts utilities (`TrkVTKPolyDataFilter`, `ClusterTools`)

## Purpose and Context

This tool provides endpoint-based tractography filtering as a complement to the spectral clustering approach of `dmri_AnatomiCuts`. Rather than clustering by geometric shape similarity, it simply routes streamlines to bundles based on which parcellation labels their endpoints lie in. This is a direct way to extract, for example, all streamlines connecting the left precentral gyrus (label N) to the right corticospinal tract region (label M).

The tool can be used independently or as a pre-processing step before `dmri_AnatomiCuts` to restrict clustering to specific endpoint label pairs.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Streamline file(s) | `-s` or `-S` | Input tractography file | `.trk` |
| Parcellation image | `-i` | Reference parcellation/segmentation volume | NIfTI/MGZ |
| Output directory | `-d` | Directory for per-label output files | path |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Per-endpoint-pair `.trk` files | Streamlines grouped by start/end label combination | `.trk` |

> [!gap] Output naming convention
> The naming convention for the output files (e.g., `label_A_to_label_B.trk` or integer-indexed) is not confirmed without reading the output writing section of the source.

## Mathematical Foundations

Each streamline's first point (start endpoint) and last point (end endpoint) are mapped to voxel indices in the parcellation image:

$$
l_{\text{start}} = \text{seg}[\text{vox}(p_0)], \quad l_{\text{end}} = \text{seg}[\text{vox}(p_N)]
$$

where $\text{vox}(\cdot)$ converts a coordinate to voxel indices using the parcellation image geometry, and $\text{seg}[\cdot]$ looks up the label at that voxel. Streamlines are assigned to the output bundle corresponding to the label pair $(l_{\text{start}}, l_{\text{end}})$, treating $(A, B)$ and $(B, A)$ as the same bundle.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-s <file>` / `-S <file>` | file | required | Input streamline file(s); multiple files can be listed consecutively |
| `-i <file>` | file | required | Parcellation/segmentation image |
| `-d <dir>` | dir | required | Output directory |

The usage string from the source:
```
<binary> -s streamlineFile -i imageFile -d outputDirectory
```

## Configuration Interactions

- Multiple input files can be listed sequentially after `-s` or `-S`.
- The tool uses the `check_string` and `compare_strings` helper functions for string parsing (likely for label filtering or output naming).

## Typical Use Cases

```bash
# Group all streamlines in a whole-brain tractography by their endpoint parcels
dmri_groupByEndpoints \
  -s whole_brain_tracks.trk \
  -i wmparc2dwi.nii.gz \
  -d endpoint_groups/

# Process multiple streamline files
dmri_groupByEndpoints \
  -s streamlines_run1.trk streamlines_run2.trk \
  -i parcellation.nii.gz \
  -d grouped_output/
```

## Pipeline Context

This tool is part of the AnatomiCuts family of tractography analysis tools. It can be used as a pre-processing step before `dmri_AnatomiCuts` or as a standalone way to extract endpoint-defined bundles.

```
Tractography --> dmri_groupByEndpoints --> per-bundle analysis
```

## Gotchas and Caveats

> [!gotcha] No detailed help
> Running with `-h` or `--help` outputs only the one-line usage string and exits with -1.

> [!gotcha] Streamline space must match parcellation space
> The streamline coordinates must be in the same space as the parcellation image for correct endpoint-to-label mapping.

## Related Tools

- [[dmri_AnatomiCuts]] — shape-based spectral clustering (complementary approach)
- [[dmri_projectEndPoints]] — projects endpoint locations onto surface
- [[dmri_ac.sh]] — pipeline orchestrator

## Confidence and Gaps

> [!gap] Output file naming
> The naming scheme for output files per label-pair is not confirmed.

> [!gap] Handling of unlabeled endpoints
> How the tool handles streamlines whose endpoints fall in background (label 0) or outside the image is not confirmed.
