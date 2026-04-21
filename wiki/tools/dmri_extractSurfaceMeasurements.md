---
title: "dmri_extractSurfaceMeasurements"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "anatomicuts/dmri_extractSurfaceMeasurements.cxx"
families:
  - "dmri_*"
recon_all_stage: null
related:
  - "[[dmri_ac.sh]]"
  - "[[dmri_AnatomiCuts]]"
  - "[[dmri_stats_ac]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact cortical surface proximity metric not confirmed"
tags:
  - diffusion
  - tractography
  - surface
  - measures
  - cortical
---

# dmri_extractSurfaceMeasurements

## Summary

`dmri_extractSurfaceMeasurements` extracts per-cluster measurements from both diffusion MRI maps (FA, MD, RD, AD, and DKI metrics) and cortical surface properties (thickness, curvature, cortical parcellation labels) for streamline bundles organized by the AnatomiCuts pipeline. It combines tractography-derived measures with anatomical surface properties at the streamline endpoints to produce per-structure summary statistics in CSV format.

## Source Information

- **Language:** C++
- **Source file:** `anatomicuts/dmri_extractSurfaceMeasurements.cxx`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/dmri_extractSurfaceMeasurements`
- **Author:** Viviana Siless (MGH)
- **Key libraries:** ITK, VTK, FreeSurfer surface library (`mrisurf.h`), `fsSurface.h`, VTK KdTree (`vtkKdTreePointLocator`), affine/nonlinear transforms

## Purpose and Context

After AnatomiCuts clustering and Hungarian cross-subject matching, this tool extracts rich per-bundle statistics. Unlike `dmri_stats_ac` which focuses on diffusion measures along the path, `dmri_extractSurfaceMeasurements` also retrieves the corresponding cortical surface properties at the streamline endpoints — including cortical thickness, curvature, and parcellation labels. This enables joint white-matter/grey-matter analysis.

The tool is called by `dmri_ac.sh`'s `SurfaceMeasures` function.

## Inputs

| Input | Flag | Description | Format |
|-------|------|-------------|--------|
| Input streamline files | `-i` | Cluster `.trk` files (glob pattern) | `.trk` |
| Left hemisphere pial surface | `-sl` | LH pial surface mesh | FreeSurfer surface |
| Left hemisphere thickness | `-tl` | LH thickness data | FreeSurfer curvature file |
| Left hemisphere curvature | `-cl` | LH pial curvature | FreeSurfer curvature file |
| Right hemisphere pial surface | `-sr` | RH pial surface mesh | FreeSurfer surface |
| Right hemisphere thickness | `-tr` | RH thickness data | FreeSurfer curvature file |
| Right hemisphere curvature | `-cr` | RH pial curvature | FreeSurfer curvature file |
| Reference image (DWI) | `-rid` | DWI reference image (streamline space) | NIfTI/MGZ |
| Reference image (anatomical) | `-ria` | Anatomical reference image | NIfTI/MGZ |
| Left annotation | `-al` | LH cortical parcellation annotation | FreeSurfer `.annot` |
| Right annotation | `-ar` | RH cortical parcellation annotation | FreeSurfer `.annot` |
| Output directory | `-o` | Output path for CSV files | path |
| Correspondence file | `-p` | Hungarian matching CSV | CSV |
| Diffusion measures | `-fa <n> <name> <file> ...` | N diffusion measure name/file pairs | NIfTI maps |
| Transform file | `-t` | ITK affine transform from DWI to anatomical space (optional) | ITK `.tfm` / `.mat` |

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| CSV files | Per-cluster measures including diffusion scalars and cortical surface properties | CSV |

## Mathematical Foundations

For each streamline in each cluster, the tool:

1. Identifies the two endpoints (first and last point of the streamline).
2. Uses a KD-tree (`vtkKdTreePointLocator`) to find the nearest vertex on the pial surface.
3. Retrieves thickness, curvature, and parcellation label at that vertex.
4. Samples diffusion measures (FA, MD, etc.) along the streamline points.
5. Computes mean/std summary statistics per cluster.

Surface proximity is determined by nearest-neighbor search:
$$v^* = \arg\min_{v \in \text{surface}} \|\mathbf{p}_{\text{endpoint}} - \mathbf{v}\|_2$$

where $\mathbf{p}_{\text{endpoint}}$ is the streamline endpoint coordinate transformed into the surface space via the provided registration.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` / `-I <file>` | string | required | Input streamline file (`.trk`). Consecutive files are read via `num1.next("")` until a non-existent path is found. |
| `-sl <file>` | string | required | LH pial (or other) surface file. |
| `-tl <file>` | string | required | LH thickness overlay file (FreeSurfer curvature format). |
| `-cl <file>` | string | required | LH pial curvature overlay file (FreeSurfer curvature format). |
| `-sr <file>` | string | required | RH pial (or other) surface file. |
| `-tr <file>` | string | required | RH thickness overlay file. |
| `-cr <file>` | string | required | RH pial curvature overlay file. |
| `-o <dir>` | string | required | Output directory path. |
| `-rid <file>` | string | required | Reference image in the DWI/streamline coordinate space. Used for voxel-to-RAS coordinate conversion. |
| `-ria <file>` | string | required | Reference image in the anatomical (surface) coordinate space. |
| `-al <file>` | string | required | LH cortical parcellation annotation file (`.annot`). |
| `-ar <file>` | string | required | RH cortical parcellation annotation file (`.annot`). |
| `-p` / `-P <file>` | string | `output.csv` | Hungarian correspondence CSV from `dmri_match`. `-p` and `-P` are aliases. |
| `-t <file>` | string | — | ITK affine transform file from DWI space to anatomical space. Applied when the two spaces are not co-registered. |
| `-fa <N> <name1> <file1> ...` | int + pairs | — | Number of diffusion measure maps `N`, followed by `N` name/file pairs (e.g. `FA dti_FA.nii.gz MD dti_MD.nii.gz`). Names become column headers in the output CSV. |
| `--help` / `-h` | flag | — | Print usage and exit. |

## Typical Use Cases

```bash
# Extract surface measurements after AnatomiCuts + Hungarian matching
dmri_extractSurfaceMeasurements \
  -i /data/subject01/dmri.ac/45/4/toAnat/*.trk \
  -sl /data/subject01/surf/lh.pial \
  -tl /data/subject01/surf/lh.thickness \
  -cl /data/subject01/surf/lh.curv.pial \
  -sr /data/subject01/surf/rh.pial \
  -tr /data/subject01/surf/rh.thickness \
  -cr /data/subject01/surf/rh.curv.pial \
  -rid /data/subject01/mri/brain.nii.gz \
  -ria /data/subject01/mri/brain.nii.gz \
  -al /data/subject01/label/lh.aparc.annot \
  -ar /data/subject01/label/rh.aparc.annot \
  -o /data/subject01/dmri.ac/45/4/measures/ \
  -p /data/subject01/dmri.ac/45/4/match/template_subject01_c200_hungarian.csv \
  -fa 4 FA dti_FA.nii.gz MD dti_MD.nii.gz RD dti_RD.nii.gz AD dti_AD.nii.gz
```

## Pipeline Context

Called by `dmri_ac.sh` (`SurfaceMeasures` function) after Hungarian matching. Requires streamlines to be in anatomical space (after `ToAnat` transformation). The output feeds group statistical analyses.

## Gotchas and Caveats

> [!gotcha] Streamlines must be in anatomical space
> This tool expects streamlines in the anatomical (T1) space to correctly match against pial surface vertices. Raw DWI-space streamlines will produce incorrect surface measurements.

> [!gotcha] Affine transform support
> The source includes ITK affine transform headers (`itkAffineTransform.h`, `itkTransformFileReader.h`), suggesting a registration transform can be applied. However, in the `dmri_ac.sh` usage, `brain.nii.gz` is used as both `-rid` and `-ria`, implying streamlines are already in anatomical space.

## Related Tools

- [[dmri_ac.sh]] — calls this tool in the `SurfaceMeasures` function
- [[dmri_stats_ac]] — alternative measure extraction (diffusion only, no surface)
- [[dmri_match]] — produces the correspondence file consumed by this tool

## Confidence and Gaps

**High confidence.** All flags verified from complete GetPot argument parsing in `main()`. The previously undocumented `-t` transformation flag and `-p`/`-P` alias for the correspondence file are now confirmed. The `-fa` flag format (int + alternating name/file pairs) is confirmed from source.
