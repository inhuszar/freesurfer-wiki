---
title: "mris_info"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_info/mris_info.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Full list of statistics printed for --area-stats and --edge-stats not documented"
  - "GIFTI handling and gifti_disp_image flag behavior not fully traced"
tags:
  - surface
  - metadata
  - diagnostics
  - utility
---

# mris_info

## Summary

`mris_info` prints metadata and statistics about a FreeSurfer surface file. For a given surface, it reports the file type, number of vertices and faces, vertex coordinate ranges, average face area, average inter-vertex distance, surface topology statistics, and optionally additional geometric metrics such as area statistics, edge statistics, and mesh quality measures. It is the surface analog of `mri_info` for volumes.

## Source Information

- **Language:** C++
- **Source file:** `mris_info/mris_info.cpp`
- **Original author:** Yasunari Tosa (later extended by others)
- **Key dependencies:** `mrisurf.h`, `mrisutils.h`, `gifti.h`, `surfgrad.h`

## Purpose and Context

`mris_info` is a quick diagnostic and inspection tool for surface files. It is used to:
- Verify surface file integrity
- Check coordinate ranges and topology
- Inspect annotation color tables embedded in `.annot` files
- Print vertex and edge statistics for quality assessment
- Diagnose surface self-intersections

It handles multiple file types: binary triangle surfaces, GCS files, annotation (`.annot`) files, and GIFTI (`.gii`) surfaces.

## Inputs

| Input | Description |
|-------|-------------|
| Surface file | Primary positional argument. Can be a binary surface, `.annot`, `.gcs`, or GIFTI file. |
| `--curv curvfile` | Optional curvature/overlay file to print statistics for |
| `--annot annotfile` | Optional annotation file to print color table from |
| `--mask maskfile` | Optional MRI mask |
| `--label label.label` | Optional label file |

**Subject-based input (alternative):**
```
mris_info --subject subject --hemi hemi --surf surfname
```

## Outputs

`mris_info` prints to stdout. Key reported fields include:

- Surface file type (triangle, quad, ICO, VTK, etc.)
- Number of vertices (`nvertices`) and faces (`nfaces`)
- Vertex coordinate ranges (x, y, z min/max)
- Average inter-vertex distance and standard deviation
- Average face area and vertex area
- Surface area (total)
- For `.annot` files: full color table with region names and RGB values
- For `.gcs` files: embedded color table

**Output files (when flags used):**
| Flag | Output |
|------|--------|
| `--o outfile` | Save vertex coordinates to a file |
| `--edge edgefile` | Save edge data |
| `--vmtx vmatlabfile` | Save vertex matrix in MATLAB4 format |

## Mathematical Foundations

Metric properties computed by `MRIScomputeMetricProperties`:
- Face areas via cross-product: $A_k = \frac{1}{2} |\vec{e}_1 \times \vec{e}_2|$ for each triangular face
- Inter-vertex distances via Euclidean distance between adjacent vertex pairs
- Average vertex area = total surface area / nvertices

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `surffile` | path | required | Surface file to inspect (positional) |
| `--subject subject` | string | — | Subject name (alternative to surffile) |
| `--hemi hemi` | lh or rh | — | Hemisphere (with --subject) |
| `--surf surfname` | string | — | Surface name within subject/surf/ (with --subject) |
| `--curv curvfile` | path | — | Curvature file to include in stats |
| `--annot annotfile` | path | — | Annotation file to print color table |
| `--o outfile` | path | — | Output vertex coordinate file |
| `--edge edgefile` | path | — | Output edge file |
| `--mask maskfile` | path | — | Mask volume |
| `--label label` | path | — | Label file |
| `--area-stats` | — | off | Print area statistics |
| `--edge-stats` | — | off | Print edge statistics |
| `--quality` | — | off | Compute mesh quality metrics |
| `--tal` | — | off | Apply Talairach transform |
| `--rescale scale` | float | — | Rescale surface by factor |
| `--diag-vno vno` | integer | -1 | Print detailed info for vertex number |
| `--v vnox` | integer | -1 | Alternative vertex diagnostic |
| `--count-intersections` | — | off | Count self-intersections (slow) |
| `--patch patchname` | string | — | Load and print patch info |
| `--vmtx vno vmatlabfile` | int + path | — | Save vertex neighborhood matrix |
| `--no-gifti-disp` | — | off | Disable GIFTI image display |
| `--annot-assignment outfile` | path | — | Write annotation assignment table |
| `--annot-hint hint` | string | — | Hint for annotation assignment |
| `--tkrRAS` | — | off | Convert to tkRAS coordinates |

## Configuration Interactions

- `--subject`, `--hemi`, and `--surf` together specify a surface by subject/hemisphere/name rather than direct path.
- `--quality` enables mesh quality computation (slow for large surfaces).
- `--count-intersections` is computationally expensive; use only when specifically needed.
- `.annot` and `.gcs` files are handled specially: if the input extension matches, only the color table is printed and no full surface read is performed.
- `--area-stats` and `--edge-stats` compute and print distribution statistics of face areas and edge lengths, respectively.

## Typical Use Cases

**Print basic surface information:**
```bash
mris_info subjects/bert/surf/lh.white
```

**Print using subject/hemi/surf triplet:**
```bash
mris_info --subject bert --hemi lh --surf white
```

**Print annotation color table:**
```bash
mris_info subjects/bert/label/lh.aparc.annot
```

**Get detailed info for a specific vertex:**
```bash
mris_info --diag-vno 12345 lh.white
```

**Check surface quality:**
```bash
mris_info --quality --area-stats lh.white
```

## Pipeline Context

`mris_info` is not called by `recon-all`. It is a standalone diagnostic utility used interactively or in QC pipelines.

## Gotchas and Caveats

> [!gotcha] Special handling for .annot and .gcs files
> If the input file has an `.annot` or `.gcs` extension, the tool only reads and prints the color table — it does not load the full surface. This means surface geometry metrics are not printed for annotation files.

> [!gotcha] GIFTI environment override
> The tool unconditionally sets `FS_GII=0` in the environment, overriding any external setting. This forces FreeSurfer's native GIFTI handling rather than the system GIFTI library.

> [!gotcha] Talairach transform requires transform file
> The `--tal` flag requires that the subject has a valid Talairach transform at `mri/transforms/talairach.xfm`. If this file is missing, the flag will cause an error.

## Related Tools

- [[mri_info]] — analogous tool for volumetric (MGZ/MGH) files
- [[surface-format]] — binary surface file format documentation
- [[coordinate-systems]] — coordinate system of surface vertex coordinates

## Confidence and Gaps

**Confident (from source):**
- Special `.annot` and `.gcs` file handling
- FS_GII environment override
- Available flags from `parse_commandline`
- GIFTI display control

> [!gap] Area/edge statistics output format
> The exact format and fields printed by `--area-stats` and `--edge-stats` have not been traced in detail.
