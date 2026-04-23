---
title: "dmri_stats_ac"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_stats_ac.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_match]]"
  - "[[dmri_ac.sh]]"
  - "[[dmri_extractSurfaceMeasurements]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Full argument list requires reading the full argument parser"
  - "Exact output CSV columns not confirmed"
tags:
  - diffusion
  - tractography
  - statistics
  - measures
  - anatomicuts
---

# dmri_stats_ac

## Summary

`dmri_stats_ac` extracts mean diffusion MRI measures (FA, MD, RD, AD, and optional DKI metrics) for each AnatomiCuts fiber cluster after Hungarian correspondence matching. It reads a set of cluster `.trk` files from the AnatomiCuts output directory, samples the provided scalar diffusion maps at the positions of each streamline, and outputs per-cluster measure summaries to a CSV file. The per-subject correspondence CSV from `dmri_match` is used to align outputs across subjects.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_stats_ac.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_stats_ac`
- **Key libraries:** ITK, VTK, FreeSurfer AnatomiCuts utilities, `HierarchicalClusteringPruner`

## Purpose and Context

After clustering and Hungarian cross-subject matching, `dmri_stats_ac` extracts the actual diffusion scalar values along the matched fiber bundles. This produces a subject-level feature vector (one value per cluster per measure) that can be used for group statistical analysis, e.g., comparing FA between patient and control groups for each anatomically-defined bundle.

The tool is called by `dmri_ac.sh` in the `Measures` function.

## Inputs

| Flag | Type | Description |
|------|------|-------------|
| `-i <dir>` | dir | AnatomiCuts output directory containing cluster `.trk` files |
| `-n <n>` | int | Number of clusters |
| `-c <file>` | file | Correspondence CSV from `dmri_match` |
| `-m <n> <name1> <file1> ...` | int + pairs | Number of measures and name/file pairs |
| `-o <file>` | file | Output CSV file |

Usage string from the source:
```
<binary> -i anatomicutsFolder -n numClusters -c correspondenceFile 
         -m <numMeasures> <measure1Name> <measure1> ... <measureNName> <measureN> -o output
```

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| Output CSV | Per-cluster mean values for each diffusion measure | CSV |

## Mathematical Foundations

For each matched cluster $k$ and measure $M$ (e.g., FA), the tool computes:

1. Loads all streamlines in cluster $k$ from the `.trk` file.
2. For each streamline point $(x, y, z)$, samples the measure image $M$ at the nearest voxel.
3. Computes the mean:
$$
\bar{M}_k = \frac{1}{N_k} \sum_{i=1}^{N_k} M(x_i, y_i, z_i)
$$

where $N_k$ is the total number of points across all streamlines in cluster $k$.

The correspondence CSV maps the matched cluster index from subject to template, ensuring that the same anatomical structure is compared across subjects.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i <dir>` | dir | required | Input AnatomiCuts cluster directory |
| `-n <n>` | int | required | Number of clusters |
| `-c <file>` | file | required | Hungarian correspondence CSV from `dmri_match` |
| `-m <n> name1 file1 ...` | int + pairs | required | Measure count and name/file pairs |
| `-o <file>` | file | required | Output CSV |

## Typical Use Cases

```bash
# Extract 4 DTI measures for 200 clusters after matching
dmri_stats_ac \
  -i /data/subject01/dmri.ac/45/4/ \
  -n 200 \
  -c /data/subject01/dmri.ac/45/4/match/template_subject01_c200_hungarian.csv \
  -m 4 \
     FA /data/subject01/dmri/DTI/dti_FA.nii.gz \
     MD /data/subject01/dmri/DTI/dti_MD.nii.gz \
     RD /data/subject01/dmri/DTI/dti_RD.nii.gz \
     AD /data/subject01/dmri/DTI/dti_AD.nii.gz \
  -o /data/subject01/dmri.ac/45/4/measures/template_subject01_c200.csv

# 7 measures for DKI data
dmri_stats_ac \
  -i /data/subject01/dmri.ac/45/4/ \
  -n 200 \
  -c match/correspondence.csv \
  -m 7 \
     FA dki_FA.nii.gz MD dki_MD.nii.gz RD dki_RD.nii.gz AD dki_AD.nii.gz \
     MK dki_MK.nii.gz RK dki_RK.nii.gz AK dki_AK.nii.gz \
  -o measures/output.csv
```

## Pipeline Context

`dmri_stats_ac` is called by `dmri_ac.sh` (`Measures` function) after `dmri_match`. The output CSV files are the per-subject data that feeds group-level statistical analyses.

```
dmri_match --> dmri_stats_ac --> group analysis (external R/Python scripts)
```

## Gotchas and Caveats

> [!gotcha] Cluster directory contents
> The tool expects `.trk` files named by cluster index in the AnatomiCuts output directory. The exact naming convention must match what `dmri_AnatomiCuts` produces.

> [!gotcha] Streamlines must be in measure image space
> The measure images (FA, MD, etc.) must be in the same coordinate space as the streamlines. If streamlines are in DWI space, the FA/MD maps must also be in DWI space.

## Related Tools

- [[dmri_AnatomiCuts]] — produces the cluster files
- [[dmri_match]] — produces the correspondence file
- [[dmri_extractSurfaceMeasurements]] — alternative with surface measures
- [[dmri_ac.sh]] — calls this tool in the `Measures` function

## Confidence and Gaps

> [!gap] Output CSV format
> The exact column names and row structure of the output CSV are not confirmed from the source.
