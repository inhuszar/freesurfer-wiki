---
title: "mri_map_cpdat"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_map_cpdat/mri_map_cpdat.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_normalize]]"
  - "[[coordinate-systems]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - control-points
  - registration
  - normalization
---

# mri_map_cpdat

## Summary

`mri_map_cpdat` maps a FreeSurfer control point file (`control.dat`) from one coordinate space to another using an LTA transform. It also supports merging control points from a list of subjects by aggregating their Talairach-space control points. This is useful when propagating manual normalization edits across registration or coordinate space changes.

## Source Information

- **Language:** C++
- **Source file:** `mri_map_cpdat/mri_map_cpdat.cpp`
- **Author:** Martin Reuter

## Purpose and Context

FreeSurfer allows users to manually add control points (via `freeview` or `tkmedit`) to guide intensity normalization in `mri_normalize`. These points are stored in `control.dat` files in the subject's `mri/` directory. When re-running normalization in a different space (e.g., after re-registration), or when aggregating group-level control points for a study template, the control points must be transformed.

`mri_map_cpdat` reads a `control.dat` file, applies a linear transform (LTA), and writes a new `control.dat` in the transformed space. Alternatively, it can aggregate control points from multiple subjects listed in a file, transforming each to a common (Talairach/MNI305) space.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Control point file | `control.dat` | Source control points (RAS or tkRAS coordinates) |
| Transform | `.lta` | Linear transform to apply (or use `-subject` for subject's Talairach) |
| Subject name | string | Alternative to LTA; uses subject's Talairach transform |
| Subject list file | text | File listing multiple subject names (one per line) for aggregation |

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Mapped control point file | `control.dat` | Control points in the transformed coordinate space |

## Mathematical Foundations

Each control point $\mathbf{p}$ (stored in RAS or tkRAS coordinates) is transformed by:

$$
\mathbf{p}' = M_{LTA} \cdot \mathbf{p}
$$

where $M_{LTA}$ is the 4×4 linear transform from the LTA file. The `MRImapControlPoints()` function handles the coordinate type conversion (RAS vs tkRAS) based on the `useRealRAS` flag stored in the control point file header.

When using `--tomni305` / `--frommni305`, the tool automatically loads the subject's Talairach transform (`talairach.xfm`) and its inverse from the subject's `mri/transforms/` directory.

## Configuration Options

Usage: `mri_map_cpdat [options]`

Flags use `--` or `-` prefix interchangeably; the parser strips leading dashes and converts to uppercase before matching. All flag names are case-insensitive.

| Flag | Alias | Arguments | Default | Description |
|------|-------|-----------|---------|-------------|
| `--in <fname>` | `-in` | path | required (unless `--slf`) | Input control point file (`control.dat`) to transform |
| `--out <fname>` | `-out` | path | required | Output control point file path |
| `--lta <fname>` | `-lta` | path | none | LTA transform file to apply to the control points |
| `--tomni305 <subject>` | `-tomni305` | string | none | Subject name; loads `talairach.xfm` from `$SUBJECTS_DIR/<subject>/mri/transforms/` as the forward transform to MNI305 space |
| `--frommni305 <subject>` | `-frommni305` | string | none | Subject name; loads and inverts `talairach.xfm` to transform from MNI305 back to subject space |
| `--slf <fname>` | `-slf` | path | none | Subject list file: text file with one subject name per line; aggregates all subjects' Talairach-space control points and writes a merged output (bypasses `--in` and transform flags) |

## Configuration Interactions

- `--lta` and `--tomni305`/`--frommni305` are mutually exclusive transform pathways; the tool uses whichever is provided. Providing both is not validated but `--tomni305`/`--frommni305` takes precedence because it overwrites `P.subject`.
- `--tomni305 <subject>` and `--frommni305 <subject>` both require `P.subject` and set `P.ToMNI305` or `P.FromMNI305` respectively; exactly one must be specified when using subject-based transform loading.
- `--slf <fname>` activates a completely different code path: it calls `GetTalControlPointsSFile()` and writes a merged output directly. `--in` is **not required** and `--lta`/`--tomni305`/`--frommni305` are ignored.
- `--out` is always required.
- If neither `--lta` nor `--subject` (via `--tomni305`/`--frommni305`) is specified, and `--slf` is also not given, the tool will print an error and exit.

> [!gotcha] Subject list file mode bypasses transform specification
> When `--slf` is used, the tool calls `GetTalControlPointsSFile()` directly and does not require `--in`, `--lta`, or `--tomni305`/`--frommni305`. Any transform flags specified alongside `--slf` are silently ignored.

## Typical Use Cases

```bash
# Map control points from native space to Talairach/MNI305 space
mri_map_cpdat \
  --in $SUBJECTS_DIR/bert/mri/control.dat \
  --tomni305 bert \
  --out /tmp/bert_mni305_control.dat

# Map control points using an explicit LTA
mri_map_cpdat \
  --in /tmp/old_space.dat \
  --lta /tmp/old_to_new.lta \
  --out /tmp/new_space.dat

# Aggregate control points from all subjects in a study
mri_map_cpdat \
  --slf /data/subjects.txt \
  --out /data/group_control_points.dat
```

## Pipeline Context

Not part of standard `recon-all`. Used in manual editing workflows and group study setups where:
1. Control points are placed during `mri_normalize` troubleshooting.
2. A re-registration changes the coordinate space.
3. Group-level normalization editing uses shared control points across subjects.

Related workflow: after running `mri_normalize` and identifying normalization failures via `freeview`, the user adds control points and re-runs `mri_normalize -f <control.dat>`.

## Gotchas and Caveats

> [!gotcha] useRealRAS flag in control.dat
> The control point file encodes whether coordinates are in scanner RAS (`useRealRAS=1`) or tkRAS (`useRealRAS=0`). The LTA transform type must be consistent with this. If there is a mismatch (e.g., passing a vox2vox LTA for a RAS-space control file), the mapped coordinates will be wrong.

> [!gotcha] Subject's SUBJECTS_DIR must be set
> When using `-subject`, the tool reads `$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm`. If `$SUBJECTS_DIR` is not set correctly, the tool will fail silently or error.

## Related Tools

- [[mri_normalize]] — the tool that consumes `control.dat` files
- [[coordinate-systems]] — explains RAS, tkRAS, and Talairach coordinate systems
- [[mri_convert]] — for general volume operations

## Confidence and Gaps

**High confidence:** Full `get_option()` and `main()` read from source; all flags confirmed with exact names. The previous wiki had incorrect flag names (`-cpin`, `-cpout`, `-subjectlistfile`, `--to-mni305`, `--from-mni305`). Correct flag names are `--in`, `--out`, `--slf`, `--tomni305`, `--frommni305`.

> [!gotcha] Flag name corrections vs. earlier documentation
> The wiki previously documented `-cpin`, `-cpout`, `-subjectlistfile`, `--to-mni305`, `--from-mni305`. The actual flags in the source (after stripping dashes and uppercasing) are `IN`, `OUT`, `SLF`, `TOMNI305`, `FROMMNI305`.
