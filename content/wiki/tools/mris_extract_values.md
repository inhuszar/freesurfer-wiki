---
title: "mris_extract_values"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "resurf/mris_extract_values.cxx"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_curvature2image]]"
  - "[[surface-format]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "The -m (number of images) option semantics and output format for multiple images need confirmation."
  - "Whether the output CSV format is stable/documented needs verification."
tags:
  - surface
  - overlay
  - extraction
  - csv
  - resurf
---

# mris_extract_values

## Summary

`mris_extract_values` extracts scalar overlay values from a surface and writes them to a CSV file, optionally restricted by an annotation parcellation. It can also sample intensities from one or more volumetric images at each surface vertex position. The tool is part of the `resurf` package and uses ITK/VTK infrastructure.

## Source Information

- **Language:** C++ (ITK/VTK based)
- **Primary source:** `resurf/mris_extract_values.cxx`
- **Framework:** Uses ITK mesh, VTK polydata, FreeSurfer `MRISread`, `MRISreadCurvature`, `MRISreadAnnotation`, and `surfcluster` libraries.

## Purpose and Context

Surface-based analysis often requires exporting per-vertex or per-parcel overlay values to tabular format for external statistical analysis. `mris_extract_values` provides a direct extraction pathway from FreeSurfer surface overlays (curvature, thickness, sulcal depth, etc.) to CSV format, with optional restriction to parcellation-defined regions and optional sampling of values from accompanying volumetric images at vertex locations.

The tool is part of the `resurf` package, alongside `mris_curvature2image`.

## Inputs

| Flag | Description |
|------|-------------|
| `-i <surface>` | Input FreeSurfer surface file (required). |
| `-v <overlay>` | Surface overlay file to extract (e.g., `lh.thickness`, `lh.curv`). |
| `-a <annotation>` | Annotation file for parcel-restricted extraction (e.g., `lh.aparc.annot`). |
| `-m <N> img1 img2 ...` | Sample from N volumetric image files at vertex positions. |

## Outputs

| Flag | Description |
|------|-------------|
| `-o <csvfile>` | Output CSV file containing extracted values (required). |

## Mathematical Foundations

For each surface vertex $v$:
- The curvature/overlay value $c(v)$ is read from the overlay file.
- If an annotation is provided, the parcel label $L(v)$ is read.
- If volumetric images are provided, the intensity $I_k(v)$ at the surface vertex position is sampled from each image $k$.

The output CSV format contains one row per vertex (or one row per parcel if parcel-level aggregation is used), with columns for the vertex index, overlay value, annotation label, and any image-sampled intensity values.

> [!gap] Aggregation mode
> Whether the tool outputs per-vertex rows or per-parcel summary statistics (mean, variance) when `-a` is specified has not been confirmed from the available source excerpt.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-i <surface>` | path | required | Input surface file |
| `-o <csvfile>` | path | required | Output CSV file |
| `-v <overlay>` | path | — | Surface overlay file |
| `-a <annotation>` | path | — | Annotation file for parcel grouping |
| `-m <N> img1 img2 ...` | int + paths | — | Number and list of volumetric images to sample at vertex positions |

## Configuration Interactions

- `-v` and `-a` may be used independently or together. Without `-v`, only annotation labels (and optionally image intensities) are written.
- `-m` requires `N` to be specified as the first argument, followed by exactly `N` image filenames.

> [!gap] Missing combination behaviours
> The behaviour when neither `-v` nor `-a` is specified (i.e., only surface geometry) has not been confirmed.

## Typical Use Cases

### Extract thickness values by parcellation

```bash
mris_extract_values \
  -i lh.white \
  -v lh.thickness \
  -a lh.aparc.annot \
  -o lh_thickness_by_parcel.csv
```

### Extract curvature and T2 intensity at each vertex

```bash
mris_extract_values \
  -i lh.white \
  -v lh.curv \
  -m 1 T2.mgz \
  -o lh_curv_T2.csv
```

## Pipeline Context

`mris_extract_values` is not part of the standard `recon-all` pipeline. It is used in post-processing and multimodal analysis workflows, particularly within the `resurf` high-resolution surface reconstruction framework.

## Gotchas and Caveats

> [!gotcha] ITK/VTK dependency
> The tool is built with ITK and VTK. It may not be available in all FreeSurfer build configurations or platforms.

> [!gotcha] Coordinate system for image sampling
> When sampling from volumetric images (`-m`), the coordinates used are surface RAS (`MRIvoxelToSurfaceRAS`). The volumetric images must be in the same FreeSurfer subject coordinate space as the surface.

## Related Tools

- [[mris_curvature2image]] — companion tool in resurf (maps surface values to volume grid)
- [[mris_curvature]] — produces overlay files that this tool can extract
- [[surface-format]] — curvature and annotation overlay formats

## Confidence and Gaps

Confidence is **medium**. The source was read and the core inputs/outputs were confirmed from the command-line parsing logic visible in the first 80 lines. The full extraction logic, CSV schema, and aggregation behaviour require a complete source read.

> [!gap] Full source read needed
> Reading the body of `main()` in `mris_extract_values.cxx` would clarify the CSV output schema, the per-vertex vs. per-parcel output mode, and the exact volume sampling procedure.
