---
title: "mri_path2label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_path2label/mri_path2label.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_label2vol]]"
  - "[[surface-format]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Path file format specification not yet documented as a format page"
tags:
  - tractography
  - label
  - path
  - surface
---

# mri_path2label

## Summary

`mri_path2label` converts between FreeSurfer path files (tractography/manual path annotations on a surface) and FreeSurfer label files. Conversion can go in either direction: path-to-label or label-to-path. The tool can also connect disconnected path fragments, fill enclosed regions on a surface, or apply both operations in sequence.

## Source Information

- **Language:** C++
- **Source file:** `mri_path2label/mri_path2label.cpp`
- **Original author:** Kevin Teich
- **Key includes:** `label.h`, `path.h`, `mrisutils.h`

## Purpose and Context

FreeSurfer uses two related file formats for marking sets of surface vertices:
- **Path files** (`.path`): Store sequences of vertex indices representing a trajectory (e.g., a manually drawn path along a sulcus).
- **Label files** (`.label`): Store an unordered set of vertex indices with associated RAS coordinates and optional scalar values.

`mri_path2label` bridges these two formats. It also supports:
- **Connecting** a path by filling in the shortest geodesic path between consecutive path points (using surface topology).
- **Filling** a closed path region by flooding from a seed vertex, effectively turning a boundary path into a filled label.
- **Single-path mode**: The `--single` flag disables the sentinel separator (value `-99999` in all columns) that otherwise separates multiple paths when encoded in a label file.

## Inputs

| Input | Description |
|-------|-------------|
| `--i <file>` | Input path or label file (auto-detected from content) |
| `--o <file>` | Output label or path file |
| Subject/hemi | Passed as arguments to `--connect`/`--fill`/`--confill` |
| Surface file | Passed as argument to `--confillx`/`--confillxfn` |

## Outputs

- **Converted file:** A `.label` or `.path` file in the destination format
- Format is inferred from the output filename extension, or set explicitly with flags

## Mathematical Foundations

**Format auto-detection:** The tool guesses the input format by checking for `.path` or `.label` suffixes and reading the first line of the file.

**Geodesic path connection:** When `--connect` is specified, the tool calls `MRISfindPath()` (or equivalent surface topology traversal) to find the shortest surface path between consecutive manually placed path vertices.

**Surface fill:** The `--fill` operation uses a breadth-first flood-fill (`MRISfill()`) starting from the seed vertex (passed as an argument to `--fill`/`--confill`/`--confillx`) to mark all vertices enclosed by the boundary path.

**Multiple-path encoding:** Multiple paths in a label file are separated by a sentinel row with all columns set to `-99999`. The `--single` flag disables this sentinel and produces a flat label file.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<file>` | — | Input path file (when path-to-label) |
| `--o` | `<file>` | — | Output label file (when path-to-label) |
| `--path2label` | (none) | off | Force conversion path → label |
| `--label2path` | (none) | off | Force conversion label → path |
| `--single` | (none) | off | Single-path mode: no sentinel separators in label file |
| `--connect` | `<subject> <hemi>` | — | Connect path fragments using shortest surface path |
| `--fill` | `<subject> <hemi> <seed>` | — | Fill path boundary from seed vertex |
| `--confill` | `<subject> <hemi> <seed>` | — | Connect and fill path (combined operation) |
| `--confillx` | `<surface_fname> <seed>` | — | Connect and fill using explicit surface file |
| `--confillxfn` | `<surface_fname> <batchfile>` | — | Connect and fill using explicit surface; read batch of paths from file |
| `--debug` | (none) | off | Enable verbose debug output |

## Configuration Interactions

- `--path2label` and `--label2path` are mutually exclusive; if neither is given, the format is auto-detected.
- `--connect` and `--fill` take `<subject> <hemi>` as arguments; the tool looks up the surface from `$SUBJECTS_DIR/<subject>/surf/<hemi>.white`.
- `--confillx` and `--confillxfn` take an explicit surface file instead, bypassing the subjects directory lookup.
- `--confill` is a convenience flag that combines connect and fill in one step, using a subject/hemi lookup.
- `--single` is only relevant in path-to-label direction; it has no effect when converting label-to-path.
- `--fill` without a prior `--connect` will flood from the seed along the raw (potentially disconnected) path.

## Typical Use Cases

```bash
# Convert a manually drawn path file to a label
mri_path2label --i drawn_path.path --o output.label

# Convert with explicit direction and single-path mode
mri_path2label --path2label --single --i path.path --o output.label

# Connect path fragments and then fill to create a region label
mri_path2label --confill fssubject lh 1234 --i path.path --o connected_filled.label

# Use explicit surface file for connect-and-fill
mri_path2label --confillx /subjects/fssubject/surf/lh.white 1234 --i path.path --o output.label
```

## Pipeline Context

`mri_path2label` is not called by [[wiki/pipelines/recon-all|recon-all]]. It is used in manual annotation workflows, typically when a user has drawn a boundary path on a surface in `freeview` or `tksurfer` and wishes to convert it into a label file for further analysis (e.g., with `mris_anatomical_stats` or [[mri_label2vol]]).

## Gotchas and Caveats

> [!gotcha] Sentinel value in multi-path labels
> When multiple paths are encoded in a label file, each path is separated by a row with all values set to `-99999`. This sentinel is not a valid vertex index and must be handled by any tool consuming the label. Use `--single` if downstream tools do not handle sentinels.

> [!gotcha] Format auto-detection can fail
> If the file has no `.path` or `.label` extension and the first line is ambiguous, auto-detection fails. Use `--path2label` or `--label2path` explicitly to override.

> [!gotcha] Subject directory dependency
> `--connect`, `--fill`, and `--confill` require `$SUBJECTS_DIR` to be set and the subject's surface file to exist. Use `--confillx` or `--confillxfn` with an explicit surface path to avoid this dependency.

## Related Tools

- [[mri_label2vol]] — Convert a surface label to a volume mask
- [[surface-format]] — FreeSurfer surface file format documentation

## Confidence and Gaps

**High confidence:** All conversion logic, format auto-detection, sentinel value, `--single` flag, `--connect`/`--fill` operations are directly documented in source comments.

> [!gap] Path file format
> The `.path` file format is not yet documented as a dedicated format page. The format is defined in `path.h` / `path.c` in the FreeSurfer library.
