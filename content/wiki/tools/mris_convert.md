---
title: "mris_convert"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_convert/mris_convert.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mris_apply_reg]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "GIFTI multi-array (mergegifti/splitgifti) behaviour not fully documented."
  - "Upsample algorithm details for the --upsample flag need verification."
tags:
  - surface
  - format-conversion
  - gifti
  - vtk
  - stl
  - ascii
---

# mris_convert

## Summary

`mris_convert` converts cortical surface files, scalar overlays, annotations, and labels between FreeSurfer binary format and many other formats including ASCII, VTK, STL, GIFTI, ICO/TRI, GEO, and MGH/MGZ-encoded surfaces. It also supports coordinate system transforms, surface combination, and various geometric computations. It is one of the most commonly used FreeSurfer surface utilities.

## Source Information

- **Language:** C++ (original author: Bruce Fischl)
- **Source file:** `mris_convert/mris_convert.cpp`
- Uses the `MRISurfOverlay` class and GIFTI library.

## Purpose and Context

FreeSurfer stores surfaces in its own binary format (no extension). Many neuroimaging tools — including VTK-based visualisers (ParaView, ITK-SNAP), 3D modelling tools (Blender via STL/VTK), and HCP-compatible pipelines (GIFTI) — require different formats. `mris_convert` bridges these formats. It also handles:

- Converting scalar overlays (`.curv` / `.w` files) to ASCII or GIFTI.
- Converting annotations to GIFTI label format and back.
- Applying Talairach transforms.
- Converting coordinate systems (tkr ↔ scanner RAS).
- Computing vertex-wise metrics (area, volume, angles, max-edge statistics).

## Inputs

Positional:

| Positional | Description |
|-----------|-------------|
| `<in-file>` | Input surface or overlay file |
| `[<second-in-file>]` | Second surface file (required for `--combinesurfs`) |
| `<out-file>` | Output file |

The output format is determined by the file extension of `<out-file>`.

Optional overlays/data:

| Flag | Description |
|------|-------------|
| `-c <scalar1> [scalar2...]` | Input curvature/scalar overlay files (with a surface input) |
| `-f <func_file>` | Input functional/multi-frame data |
| `--annot <annot-file>` | Input annotation file |
| `--ctab <colortab>` | Custom colour table for annotation/label |
| `--label <label-file> <label-name>` | Input label file and its name |
| `--parcstats <file>` | Label/value text pairs for scalar output |
| `--labelstats <file>` | Label stats file for GIFTI output |

## Outputs

Output format is inferred from extension:

| Extension | Format |
|-----------|--------|
| `.asc` | ASCII (vertices + faces, or XYZ-only with `-a`) |
| `.ico`, `.tri` | ICO/TRI format |
| `.geo` | GEO format |
| `.stl` | STL format |
| `.vtk` | VTK legacy format |
| `.gii` | GIFTI |
| `.mgh`, `.mgz` | MGH surface-encoded volume |
| `.w` | Binary W-file overlay |
| (other) | FreeSurfer binary surface |

## Mathematical Foundations

Most conversions are format changes with no coordinate transform. Exceptions:

**Talairach transform** (`-t <subject>`): applies the subject's Talairach xfm to vertex coordinates.

**Coordinate system conversion** (`--to-scanner` / `--to-tkr`):

$$
\mathbf{x}_{\text{scanner}} = \mathbf{M}_{\text{vox2ras}} \cdot \mathbf{M}_{\text{vox2ras-tkr}}^{-1} \cdot \mathbf{x}_{\text{tkr}}
$$

where $\mathbf{M}_{\text{vox2ras-tkr}}$ is the tkr-to-vox matrix and $\mathbf{M}_{\text{vox2ras}}$ is the scanner-to-vox matrix. In FreeSurfer code: `MRIStkr2Scanner()` and `MRISscanner2Tkr()`.

**Vertex-wise volume** (`--volume` / `--volume2`): uses the `th3` method (one-third of the product of the vertex-to-white and vertex-to-pial distances with their areas).

**Left-right reversal** (`--left-right-rev`): negates x coordinates and reverses face orientation.

**Upsample** (`--upsample N SortType`): subdivides surface edges/faces $N$ times, with sorting by longest edge (`SortType=1`) or largest triangle (`SortType=3`).

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-p` | | `off` | Input is a patch file |
| `-c` | `<scalar1> [scalar2...]` | `—` | Input scalar overlay files |
| `-f` | `<func_file>` | `—` | Input functional data |
| `-o` | `<origname>` | `—` | Read original vertex positions |
| `-s` | `<scale>` | `0` | Scale vertex XYZ by scale factor |
| `-r` | | `off` | Rescale to group-average total area |
| `-t` | `<subject>` | `—` | Apply Talairach xfm of subject |
| `-n` | | `off` | Output ASCII with surface normals |
| `-v` | | `off` | Write vertex neighbour table to ASCII |
| `-a` | | `off` | Print only XYZ to ASCII (no faces) |
| `--annot` | `<file>` | `—` | Input annotation file |
| `--ctab` | `<file>` | `—` | Input custom colour table |
| `--parcstats` | `<file>` | `—` | Label/value pairs for scalar output |
| `--da_num` | `<n>` | `-1` | GIFTI DataArray number to use |
| `--label` | `<file> <name>` | `—` | Input label file and name |
| `--labelstats` | `<file>` | `—` | Label stats for GIFTI |
| `--combinesurfs` | | `off` | Combine two input surfaces into one |
| `--mergegifti` | | `off` | Generate combined GIFTI with surface + overlays |
| `--splitgifti` | | `off` | Separate GIFTI surface and data arrays |
| `--giftioutdir` | `<dir>` | `—` | Output directory for splitgifti |
| `--delete-cmds` | | `off` | Delete command history from surface |
| `--center` / `-center` | | `off` | Move centre of surface to origin |
| `--vol-geom` | `<vol>` | `—` | Use MRI vol to set volume geometry |
| `--remove-vol-geom` | | `off` | Set vg valid flag to 0 |
| `--to-surf` | `<surfcoords>` | `—` | Copy coordinates from another surface |
| `--to-scanner` / `--userealras` | | `off` | Convert tkr coords to scanner RAS |
| `--to-tkr` / `--usesurfras` | | `off` | Convert scanner coords to tkr RAS |
| `--upsample` | `<N> <SortType>` | `—` | Upsample by subdividing edges/faces |
| `--volume` | `<subj> <hemi> <out>` | `—` | Compute vertex-wise volume (th3) |
| `--volume2` | `<white> <pial> <label> <out>` | `—` | Vertex-wise volume with label mask |
| `--area` | `<surf> <out>` | `—` | Compute vertex-wise area |
| `--max-edge-stat` | `<surf> <id> <out>` | `—` | Max-edge statistic (length/dot/angle) |
| `--angle` | `<surf> <out>` | `—` | Compute orientation angles |
| `--label2mask` | `<surf> <label> <out>` | `—` | Convert label to binary mask |
| `--to-curv` | `<in> <surf> <out>` | `—` | Convert input to curv format |
| `--left-right-rev` | | `off` | Left-right reverse surface |
| `--cras_add` / `--cras_correction` | | `off` | Shift centre to scanner coord (deprecated; `--cras_correction` is alias) |
| `--cras_subtract` / `--cras_remove` | | `off` | Reverse cras_add (deprecated; `--cras_remove` is alias) |
| `--no-writect` | | `off` | Suppress writing the colour table to the output file |
| `-nolabel` | — | — | **Not a flag — positional value.** Passing the string `nolabel` as positional argument 4 suppresses label reading. The audit extractor promotes this `strcmp(argv[4], "nolabel")` comparison to pseudo-flag `-nolabel`. |

## Configuration Interactions

- `-c` requires a surface to also be specified as `<in-file>` — the surface provides geometry for the overlay.
- `--to-scanner` and `--to-tkr` are mutually exclusive; only one coordinate transform is applied.
- `--combinesurfs` requires exactly three positional arguments: `in-file in2-file out-file`.
- `--volume`, `--volume2`, `--area`, `--angle`, `--max-edge-stat`, and `--label2mask` are standalone computations that do not require the standard `in-file out-file` positional format.
- `--annot` with GIFTI output (`.gii`) converts FreeSurfer `.annot` to GIFTI label format; the reverse is also supported.
- `--ctab` overrides the annotation's embedded colour table, useful when the colour table in the annotation is outdated.
- `--da_num` selects which GIFTI DataArray to use; only meaningful for GIFTI input.
- `--cras_add` and `--cras_subtract` are deprecated; use `--to-tkr` and `--to-scanner` instead.

> [!gotcha] Extension determines output format
> The output format is inferred entirely from the file extension. If the extension is unrecognised, FreeSurfer binary format is assumed. Always use the appropriate extension.

> [!gotcha] Scanner RAS vs. tkr RAS
> FreeSurfer surfaces are natively stored in tkr (surface) RAS, not scanner RAS. Tools like VTK viewers and ITK-SNAP expect scanner RAS. Use `--to-scanner` when converting to VTK/STL/ASCII for use in non-FreeSurfer tools, and `--to-tkr` to convert back.

## Typical Use Cases

```bash
# Convert left white surface to VTK (for ParaView/VTK)
mris_convert --to-scanner lh.white lh.white.vtk

# Convert to ASCII (text format)
mris_convert lh.white lh.white.asc

# Convert to STL for 3D printing
mris_convert --to-scanner lh.pial lh.pial.stl

# Convert thickness overlay to ASCII
mris_convert -c lh.thickness lh.white lh.thickness.asc

# Convert annotation to GIFTI label
mris_convert --annot lh.aparc.annot lh.white lh.aparc.gii

# Convert GIFTI label back to .annot
mris_convert --annot lh.aparc.gii lh.white.gii lh.aparc.annot

# Convert label file to GIFTI
mris_convert --label lh.V1.label V1 lh.white lh.V1.label.gii

# Compute vertex-wise area
mris_convert --area lh.white lh.area.mgz

# Compute vertex-wise volume
mris_convert --volume bert lh lh.volume.mgz

# Apply Talairach transform
mris_convert -t bert lh.white lh.white.tal

# Upsample by 1 level (starting with longest edges)
mris_convert --upsample 1 1 lh.white lh.white.up1

# Left-right reverse (for template creation)
mris_convert --left-right-rev lh.white rh.from_lh.white
```

## Pipeline Context

Not part of `recon-all` automatically but used extensively in post-processing:
- Converting FreeSurfer surfaces to formats compatible with other tools (ITK-SNAP, ParaView, Blender).
- HCP pipeline (CIFTI/GIFTI conversion).
- Quality assessment (ASCII export for inspection).
- Volume/area computation for morphometric analyses.

## Gotchas and Caveats

> [!gotcha] No extension = FreeSurfer binary
> FreeSurfer binary surface files have no extension. If the output file has no recognised extension, `mris_convert` writes FreeSurfer binary format, which is often the intended behaviour.

> [!gotcha] Patch files require `-p`
> If the input is a patch file (e.g., `lh.patch.flat`), the `-p` flag must be specified. Without it, the tool will attempt to read it as a full surface and may fail or produce incorrect output.

> [!gotcha] W-file format
> The `.w` format (binary overlay) is automatically handled by extension — it bypasses the normal surface read/write pipeline. If the input or output extension is `.w`, it uses `convertFromWFile()` / `convertToWFile()`.

> [!gotcha] Deprecated cras flags
> `--cras_add` and --cras_subtract are noted as deprecated in the source. They remain for backwards compatibility but `--to-tkr` and `--to-scanner` should be used instead.

> [!gotcha] GIFTI annotation colour table writeback
> The `writect` flag (default 1) controls whether the colour table is written into the GIFTI output. It can be suppressed.

## Related Tools

- [[mri_convert]] — volume format conversion (analogous tool for volumes)
- [[mris_apply_reg]] — surface resampling after registration
- [[surface-format]] — FreeSurfer surface file format specification
- [[curv-format]] — FreeSurfer curvature/scalar overlay format

## Confidence and Gaps

**Confident:** Complete flag set, format list, coordinate transform logic, and most use cases confirmed from source code and help XML.

> [!gap] GIFTI multi-array operations
> The `--mergegifti` and `--splitgifti` operations involve the GIFTI library's multi-array structure. The exact output file naming conventions when splitting were not verified.

> [!gap] Upsample algorithm
> The `--upsample` edge subdivision algorithm and the effect of `SortType` values (0, 1, 2, 3) were not fully documented from source.

> [!note] Audit noise: single-dash stripping parser
> An automated audit may report all double-dash flags (e.g., `--center`, `--cras_add`, `--to-scanner`) as C3 invalid. This is a false positive: the `get_option()` function uses `option = argv[1] + 1` to strip the leading dash, leaving a single-dash prefix. It then compares with `!stricmp(option, "-center")` etc., so `--center` (stripped to `-center`) is correctly accepted. The audit scans for `--center` literal and finds only `"-center"` (single-dash). All 18 such flags in the wiki are verified from source. Additionally, `--combinesurf` (without 's') appears only in an error message typo (line 1122); the real parser flag is `--combinesurfs`. The combined tokens `--to-scanner/--userealras` and `--to-tkr/--usesurfras` appear in a printf comment (line 1130) and are extracted by the audit as single combined flags — both components are documented separately in the flag table.
