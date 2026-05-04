---
title: "mri_modify"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_modify/mri_modify.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_info]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - header
  - metadata
  - geometry
---

# mri_modify

## Summary

`mri_modify` modifies header fields of an MRI volume file in-place (read/write), allowing direct editing of direction cosines, voxel sizes, scan parameters (TR, TE, TI, flip angle), and the embedded transform filename. It is a surgical header-editing tool for correcting scanner metadata without resampling the image data.

## Source Information

- **Language:** C++
- **Source file:** `mri_modify/mri_modify.cpp`
- **Author:** Yasunari Tosa

## Purpose and Context

MRI volume headers often contain incorrect metadata — wrong direction cosines from scanner calibration errors, missing echo times, or stale transform filenames from earlier processing stages. `mri_modify` allows targeted correction of these fields without reformatting or resampling the volume data. This is particularly important for direction cosines (`-xras`, `-yras`, `-zras`, `-cras`), which define the vox2ras matrix and determine how the volume is positioned in scanner RAS space.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input volume | [[mgz]] | Volume whose header is to be modified |
| Output volume | [[mgz]] | Output file (can be same as input for in-place edit) |

**Usage:** `mri_modify <flags> <involume> <outvolume>`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Modified volume | [[mgz]] | Same voxel data with updated header fields |

## Mathematical Foundations

The vox2ras matrix $M$ maps voxel coordinates $(c, r, s)$ to scanner RAS coordinates $(R, A, S)$:

$$
\begin{pmatrix} R \\ A \\ S \\ 1 \end{pmatrix} = M \begin{pmatrix} c \\ r \\ s \\ 1 \end{pmatrix}
$$

where $M$ is constructed from the volume geometry fields:

$$
M = \begin{pmatrix} x_r \cdot d_x & y_r \cdot d_y & z_r \cdot d_z & c_r \\ x_a \cdot d_x & y_a \cdot d_y & z_a \cdot d_z & c_a \\ x_s \cdot d_x & y_s \cdot d_y & z_s \cdot d_z & c_s \\ 0 & 0 & 0 & 1 \end{pmatrix}
$$

Here $(x_r, x_a, x_s)$ is the x-direction cosine (set by `-xras`), $d_x$ is the x-voxel size (set by `-xsize`), and $(c_r, c_a, c_s)$ is the centre RAS coordinate (set by `-cras`).

`mri_modify` modifies only the fields you specify — unspecified fields retain their original values.

## Configuration Options

All flags are case-insensitive except `--help` (which uses `strcmp`, not `stricmp`). The full `get_option()` has been read.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help` | — | — | Print usage and exit (case-sensitive: exactly `--help`) |
| `-xras <xr> <xa> <xs>` | 3×float | unchanged | Set the x-direction cosine of the vox2ras matrix (unit vector required; sets `xras_specified=1`) |
| `-yras <yr> <ya> <ys>` | 3×float | unchanged | Set the y-direction cosine of the vox2ras matrix (unit vector required; sets `yras_specified=1`) |
| `-zras <zr> <za> <zs>` | 3×float | unchanged | Set the z-direction cosine of the vox2ras matrix (unit vector required; sets `zras_specified=1`) |
| `-cras <cr> <ca> <cs>` | 3×float | unchanged | Set the centre RAS coordinate (origin in scanner RAS space; sets `cras_specified=1`) |
| `-xsize <f>` | float | unchanged | Set the x-axis voxel size in mm (sets `xsize_specified=1`) |
| `-ysize <f>` | float | unchanged | Set the y-axis voxel size in mm (sets `ysize_specified=1`) |
| `-zsize <f>` | float | unchanged | Set the z-axis voxel size in mm (sets `zsize_specified=1`) |
| `-tr <f>` | float | unchanged | Set the repetition time in ms (sets `tr_specified=1`; stored as `mri->tr`) |
| `-te <f>` | float | unchanged | Set the echo time in ms (sets `te_specified=1`; stored as `mri->te`) |
| `-ti <f>` | float | unchanged | Set the inversion time in ms (sets `ti_specified=1`; stored as `mri->ti`) |
| `-fa <f>` | float | unchanged | Set the flip angle in degrees; stored internally in radians via `RADIANS(f)` (sets `fa_specified=1`) |
| `-xform <fname>` | string | unchanged | Set the embedded transform filename stored in the volume header (`mri->transform_fname`) |

> [!gotcha] `-xform` does not advance the argument parser correctly
> In `get_option()`, the `-xform` branch reads `argv[2]` but does not set `nargs` (it remains 0). This means the filename passed to `-xform` is read, but the parser's loop will then attempt to parse that filename as the next flag — causing an "unknown option" error unless the filename begins with a character that `ISOPTION()` (typically `-`) does not recognise as a flag start. In practice, `-xform` can only be safely used when the filename is the last argument or when the filename does not start with `-`. Use of `-xform` is therefore effectively broken unless positional arguments follow the options.

> [!gotcha] `--help` is case-sensitive
> The help check uses `strcmp` (not `stricmp`), so only `--help` triggers it; `-Help` or --HELP will not.

## Configuration Interactions

- Direction cosines should be orthonormal unit vectors. The tool validates that each individual direction cosine has unit length (checks `|x_r|² + |x_a|² + |x_s|² ≈ 1`) and exits with an error if not. However, it does not check mutual orthogonality between the three axis cosines.
- `-fa` stores the flip angle internally as radians (`RADIANS(degrees)`), while `-tr`, `-te`, `-ti` are stored directly in their native units (ms).
- `-xform` changes only the embedded transform filename stored in the header, not the transform file itself.
- Multiple flags can be combined in a single invocation to update several fields at once; only the specified fields are changed.
- The `-xform` flag has a parser bug (see gotcha above); it should be placed carefully if used.

> [!gotcha] Direction cosine non-orthogonality not checked
> While each cosine is validated to have unit length, the tool does not verify that the three vectors are mutually orthogonal. Non-orthogonal direction cosines produce a skewed vox2ras matrix that will cause incorrect spatial positioning in downstream tools.

## Typical Use Cases

```bash
# Fix wrong voxel sizes
mri_modify -xsize 1.0 -ysize 1.0 -zsize 1.0 input.mgz fixed.mgz

# Reset direction cosines to standard sagittal orientation
mri_modify \
  -xras -1 0 0 \
  -yras  0 0 1 \
  -zras  0 1 0 \
  -cras  0 0 0 \
  input.mgz fixed_orientation.mgz

# Update scan parameters
mri_modify -tr 2200 -te 3.5 -ti 900 -fa 8 mprage.mgz mprage_fixed.mgz

# Update the embedded transform filename
mri_modify -xform talairach.lta T1.mgz T1.mgz
```

## Pipeline Context

Not part of standard `recon-all`. Used in:
- Correcting scanner export errors before running the pipeline.
- Fixing volumes with missing or incorrect metadata that would cause `recon-all` to fail.
- Post-processing workflows that require updating the embedded transform after re-registration.

## Gotchas and Caveats

> [!gotcha] No resampling is performed
> `mri_modify` changes only the header metadata. The voxel data is written unchanged. This means the visual appearance in `freeview` will change (the volume will appear rotated or repositioned) but the underlying data is intact.

> [!gotcha] In-place editing is supported but risky
> Specifying the same file for input and output performs an in-place edit. Back up the original before doing this, as there is no undo.

> [!gotcha] Flip angle stored in radians
> Despite accepting degrees on the command line, the tool converts to radians before storage. Tools reading the flip angle from the header will get radians. `mri_info` reports it in degrees for display.

## Related Tools

- [[mri_info]] — for reading and displaying header fields
- [[wiki/tools/mri_convert|mri_convert]] — for format conversion; also provides some header field editing
- [[coordinate-systems]] — explains the meaning of direction cosines and cras

## Confidence and Gaps

**High confidence:** All flags confirmed from complete reading of `get_option()` in source. Unit-length validation, flip angle radian conversion, and the `-xform` nargs bug all verified from source code.
