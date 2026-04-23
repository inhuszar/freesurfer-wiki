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
last_agent_update: 2026-04-21
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
| `--c <curvfile>` | Optional curvature/overlay file to print statistics for; also disables GIFTI display |
| `--a <annotfile>` | Optional annotation file to print color table from; also disables GIFTI display |
| `--mask <maskfile>` | Optional MRI mask (restricts area/edge stats to masked vertices) |
| `--label <label>` | Optional label file (restricts area/edge stats to labelled vertices; mutually exclusive with `--mask`) |

**Subject-based input (alternative):**
```
mris_info --s subject hemi surfname
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
| `--o <outfile>` | Save some surface data to a file |
| `--edge-file <file>` | Print edge info for all edges into file |
| `--v-matlab <vtxno> <mfile>` | Write MATLAB file to plot vertex neighbourhood |

## Mathematical Foundations

Metric properties computed by `MRIScomputeMetricProperties`:
- Face areas via cross-product: $A_k = \frac{1}{2} |\vec{e}_1 \times \vec{e}_2|$ for each triangular face
- Inter-vertex distances via Euclidean distance between adjacent vertex pairs
- Average vertex area = total surface area / nvertices

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `surffile` | path | required | Surface file to inspect (positional) |
| `--s subject hemi surfname` | string string string | — | Load surface by subject/hemi/surfname instead of direct path; requires SUBJECTS_DIR |
| `--c <curvfile>` | path | — | Curvature/overlay file; verify vertex count and print stats; disables GIFTI display |
| `--a <annotfile>` | path | — | Annotation file to print color table from; disables GIFTI display |
| `--o <outfile>` | path | — | Save surface data to file |
| `--mask <maskfile>` | path | — | Mask volume; restrict area/edge stats to masked vertices (mutually exclusive with `--label`) |
| `--label <labelfile>` | path | — | Label file; restrict area/edge stats to labelled vertices (mutually exclusive with `--mask`) |
| `--area-stats` | — | off | Compute statistics on triangle areas (n, mean, std, min, max) |
| `--edge-stats <id>` | integer | — | Compute edge metric stats; id=0 length, id=1 dot, id=2 angle, id<0 all |
| `--edge-file <file>` | path | — | Print edge info for all edges into file |
| `--quality` | — | off | Compute mesh quality stats |
| `--tal` / `--t` | — | off | Apply Talairach transform before reporting |
| `--r` | — | off | Rescale group surface so metrics match average of individuals |
| `--v <vno>` | integer | — | Print detailed info for vertex number |
| `--vx <vno>` | integer | — | Print extended vertex info (neighbour distances, areas, face info) |
| `--v-matlab <vtxno> <mfile>` | int + path | — | Write MATLAB file to plot vertex neighbourhood |
| `--ex <edgeno>` | integer | — | Print extended info about a single edge |
| `--intersections` | — | off | Count vertices belonging to self-intersecting faces |
| `--patch <patchname>` | string | — | Load patch before reporting info |
| `--nogifti-disp-image` | — | off | Disable GIFTI struct dump; read `.gii` as surface instead |
| `--annot-label <outfile>` | path | — | Output annotation label assignments (`.annot` files only) |
| `--annot-hint <out-ctab>` | path | — | Replace duplicate annotations with new suggestions; used with `--annot-label` |
| `--mtx-fmt <format>` | string | — | Set printf format for matrix output (e.g., `%12.8f`) |
| `--cog <surffile> <outfile>` | path + path | — | Compute centre of gravity of surface and write to file; exits immediately |
| `--cog-zero <surffile> <outfile>` | path + path | — | Compute COG, shift surface to origin, and write; exits immediately |

> [!gap] Flags not found in source
> The following flags documented in earlier versions of this page were **not found** in the source `parse_commandline()`: --subject, --hemi, --surf (separate flags), --rescale <scale> (the real flag is --r, no argument), --diag-vno (real flag is --v), --count-intersections (real flag is --intersections), --no-gifti-disp (real flag is --nogifti-disp-image), --annot-assignment (real flag is --annot-label), --vmtx (real flag is --v-matlab), --tkrRAS / --tkrras (real flag is --t). The subject/hemi/surf triplet is provided via the single --s subject hemi surfname flag, not three separate flags.

## Configuration Interactions

- `--s subject hemi surfname` (a single flag taking three arguments) specifies a surface by subject/hemisphere/surface name rather than direct path; requires `SUBJECTS_DIR`.
- `--quality` enables mesh quality computation (slow for large surfaces).
- `--intersections` is computationally expensive; use only when specifically needed.
- `.annot` and `.gcs` files are handled specially: if the input extension matches, only the color table is printed and no full surface read is performed.
- `--area-stats` and `--edge-stats <id>` compute and print distribution statistics of face areas and edge metrics, respectively. Both can be restricted to a subset of vertices using --mask or `--label`.
- `--c` and `--a` both set `gifti_disp_image = 0`, suppressing the GIFTI display even if the primary file is GIFTI.

## Typical Use Cases

**Print basic surface information:**
```bash
mris_info subjects/bert/surf/lh.white
```

**Print using subject/hemi/surf triplet:**
```bash
mris_info --s bert lh white
```

**Print annotation color table:**
```bash
mris_info subjects/bert/label/lh.aparc.annot
```

**Get detailed info for a specific vertex:**
```bash
mris_info --v 12345 lh.white
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
