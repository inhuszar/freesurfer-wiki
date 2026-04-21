---
title: "dmri_saveHistograms"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/SaveHistograms.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_ac.sh]]"
  - "[[dmri_stats_ac]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact histogram content (arc-length positions, label frequencies) not confirmed"
  - "Relationship to the main AnatomiCuts clustering workflow not confirmed"
tags:
  - diffusion
  - tractography
  - histogram
  - parcellation
  - anatomicuts
---

# dmri_saveHistograms

## Summary

`dmri_saveHistograms` computes and saves anatomical label histograms for fiber bundle clusters from a tractography file, using an orientation-based parcellation filter. For each cluster (bundle), it records the distribution of parcellation labels encountered at multiple positions along the streamlines and writes the result to a CSV file. These histograms are used to characterize the anatomical connectivity profile of each bundle.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/SaveHistograms.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_saveHistograms`
- **Key libraries:** ITK, VTK, FreeSurfer AnatomiCuts utilities (`OrientationPlanesFromParcellationFilter`, `HierarchicalClusteringPruner`)

## Purpose and Context

Label histograms are a compact representation of a fiber bundle's anatomical connectivity — they describe which brain regions a bundle passes through or connects. These histograms are used by `dmri_match` and `dmri_AnatomiCuts` for inter-subject correspondence and clustering. `dmri_saveHistograms` pre-computes and saves these histograms to CSV to avoid recomputing them at each clustering/matching step.

The tool uses `OrientationPlanesFromParcellationFilter` to compute orientation-aware sampling planes through the parcellation, which handle the challenge of correctly assigning labels to curved fiber bundles.

## Inputs

| Flag | Type | Description |
|------|------|-------------|
| `-p <file>` | file | Parcellation image |
| `-f <n> <file...>` | int + files | Number of bundles followed by VTK bundle file paths |
| `-o <file>` | file | Output histogram CSV |
| `-bb` | flag | Use baby/neonatal mode for parcellation |

The usage string from the source:
```
<binary> -p parcellation -f numberOfBundles <list of vtk bundles> -o output.csv -bb
```

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `histograms.csv` (default) | Per-bundle label histograms | CSV |

## Mathematical Foundations

The `OrientationPlanesFromParcellationFilter` samples the parcellation at multiple cross-sectional planes along each bundle, oriented perpendicular to the mean bundle direction. This produces a sequence of label frequency vectors (one per plane), capturing the anatomical context at each position along the tract.

The histogram for bundle $k$ at position $p$ is:

$$H_k^p[l] = \frac{|\{s \in k : \text{label}(s, p) = l\}|}{|k|}$$

where $s$ is a streamline in cluster $k$, $p$ is a cross-sectional position index, and $l$ is an anatomical label.

The VTK spline filter (`vtkSplineFilter`) resamples each bundle to 20 uniformly spaced points before histogram computation (from the `FixSampleClusters` function with `SetNumberOfSubdivisions(19)`).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-p <file>` | file | required | Parcellation/segmentation image |
| `-f <n> <files>` | int + files | required | Number of bundles and their VTK file paths |
| `-o <file>` | file | `histograms.csv` | Output CSV file |
| `-bb` | flag | off | Baby/neonatal mode for parcellation filter |

## Configuration Interactions

- `-bb` (baby mode) adjusts the `OrientationPlanesFromParcellationFilter` behavior for neonatal brain parcellations where atlas labels differ from adult labels.
- Bundles must be in VTK polydata format (not `.trk`) — they are expected to be converted first.

## Typical Use Cases

```bash
# Save histograms for a set of AnatomiCuts clusters
dmri_saveHistograms \
  -p wmparc2dwi.nii.gz \
  -f 5 cluster_001.vtk cluster_002.vtk cluster_003.vtk cluster_004.vtk cluster_005.vtk \
  -o cluster_histograms.csv

# Neonatal mode
dmri_saveHistograms \
  -p neonatal_parcellation.nii.gz \
  -f 3 bundle1.vtk bundle2.vtk bundle3.vtk \
  -o histograms.csv \
  -bb
```

## Pipeline Context

`dmri_saveHistograms` is a preprocessing step for `dmri_match` (Hungarian matching). It pre-computes the bundle histograms that the matching algorithm uses to measure inter-subject bundle similarity.

```
dmri_AnatomiCuts --> dmri_saveHistograms --> dmri_match
```

## Gotchas and Caveats

> [!gotcha] Input requires VTK format, not TRK
> Unlike most AnatomiCuts tools that use `.trk` files, this tool expects VTK polydata (`.vtk`) input. A conversion step may be needed from `.trk` to `.vtk`.

> [!gotcha] Bundle count must match
> The `-f` flag requires the exact count followed by exactly that many file paths. Mismatches will likely cause incorrect parsing.

## Related Tools

- [[dmri_AnatomiCuts]] — produces the clusters whose histograms are computed here
- [[dmri_match]] — uses these histograms for Hungarian matching
- [[dmri_stats_ac]] — complementary measure extraction tool

## Confidence and Gaps

> [!gap] Exact histogram content
> The precise information encoded in each histogram position (which anatomical sections, how many bins) depends on `OrientationPlanesFromParcellationFilter` which was not fully read.
