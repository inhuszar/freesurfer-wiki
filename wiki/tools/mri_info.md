---
title: "mri_info"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_info/mri_info.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
  - "[[coordinate-systems]]"
  - "[[freeview-volumes]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "xstart/xend computation path with --diag-debug flag interaction not fully traced"
tags:
  - metadata
  - inspection
  - utility
---

# mri_info

## Summary

`mri_info` reads one or more MRI volume files and dumps metadata to stdout. In
its default mode it prints a comprehensive human-readable summary of volume
geometry, voxel type, MR sequence parameters, and spatial transforms. Individual
flags (`--tr`, `--vox2ras`, `--nframes`, …) extract single scalar or matrix
values suitable for scripting. It also handles GCA morph ([[m3z-format|`.m3z`]]) files and
warp-map volumes.

## Source Information

- **Language:** C++
- **Source file:** `mri_info/mri_info.cpp` (1469 lines, author: Bruce Fischl)
- **Binary location:** `$FREESURFER_HOME/bin/mri_info`

## Purpose and Context

`mri_info` is the primary inspection tool for FreeSurfer volume files. It is
indispensable for verifying that a volume has the expected geometry before
running registration or analysis steps. Common uses:

- Verifying that a volume is "conformed" (1 mm isotropic, 256³) before feeding
  it to [[recon-all]]
- Extracting transform matrices (vox2ras, vox2ras-tkr) for scripting
- Checking MR sequence parameters stored in the [[mgz]] header (TR, TE, TI,
  flip angle)
- Inspecting the embedded Talairach transform path

Not called by [[recon-all]] directly; used interactively and in analysis scripts.

## Inputs

### Required Inputs

- One or more volume files in any format recognized by FreeSurfer
  ([[mgz]], NIfTI-1, Analyze, MINC, DICOM, etc.)

Multiple files may be supplied on the command line; each is processed in sequence
and output is interleaved on stdout.

### Input Assumptions

> [!assumption] Header vs. full read
> Most flags trigger a **header-only** read (`MRIreadHeader()`), which is fast
> and does not load voxel data. The flags `--voxel`, `--entropy`, `--stats`, and
> `--voxvolsum` require a full `MRIread()`.

## Outputs

Output goes to stdout by default. Use `--o <file>` to redirect to a file.

The default (no flags) dumps a human-readable block. Each single-field flag
prints one value per line, suitable for shell capture:

```bash
TR=$(mri_info --tr brain.mgz)
```

## Mathematical Foundations

`mri_info` does not perform computations on voxel data (except for the
statistics flags). It exposes the matrices stored in or derivable from the
volume header:

**vox2ras** — the native scanner-RAS transform, constructed as:
$$\mathbf{M}_{\text{vox2ras}} = \begin{pmatrix} D_c \cdot x_{\text{size}} & D_r \cdot y_{\text{size}} & D_s \cdot z_{\text{size}} & P_0 \\ 0 & 0 & 0 & 1 \end{pmatrix}$$
where $D_c, D_r, D_s$ are the direction cosine column vectors and $P_0$ is the
RAS position of voxel (0,0,0). See [[coordinate-systems]] for derivation.

**vox2ras-tkr** — the Surface RAS (tkregister) transform: uses the same
direction cosines but sets $P_0$ so that the origin falls at the volume's
geometric centre:
$$c_\text{ras} = - \tfrac{1}{2}(N_c \cdot x_s, N_r \cdot y_s, N_s \cdot z_s)$$
Computed by `MRIxfmCRS2XYZtkreg()` in `utils/mri.cpp`.

**tkr2scanner** — derived on the fly as:
$$\mathbf{T}_{\text{tkr}\to\text{scan}} = \mathbf{M}_{\text{vox2ras}} \cdot \mathbf{M}_{\text{vox2ras-tkr}}^{-1}$$

**scanner2tkr** — computed via `surfaceRASFromRAS_()` (inverse of the above).

**entropy** — Shannon entropy of a 256-bin intensity histogram:
$$H = -\sum_{i=0}^{255} p_i \log_2 p_i$$

## Configuration Options

### Complete Flag Reference

#### MR Sequence Parameters

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--tr` | none | off | Print `mri->tr` (TR, milliseconds, `%g`) |
| `--te` | none | off | Print `mri->te` (TE, milliseconds, `%g`) |
| `--ti` | none | off | Print `mri->ti` (TI, milliseconds, `%g`) |
| `--fa` | none | off | Print `mri->flip_angle` (flip angle, **radians**, `%g`) |
| `--flip_angle` | none | off | Alias for `--fa` (sets `PrintFlipAngle`) |
| `--fad` | none | off | Print `DEGREES(mri->flip_angle)` (flip angle, **degrees**, `%g`) |
| `--pedir` | none | off | Print `mri->pedir` (phase-encode direction string), or `UNKNOWN` if unset |

> [!gotcha] `--fa` outputs radians, `--dump` outputs degrees
> `--fa` prints `mri->flip_angle` directly, which is in radians. Use `--fad` for
> degrees. Confusingly, the `--dump` compact mode converts to degrees via
> `DEGREES()`. The two flags are inconsistent in their units.

#### Voxel Size and Dimensions

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--cres` | none | off | Print `mri->xsize` (column voxel size, mm) |
| `--xsize` | none | off | Sets `PrintCRes` — prints `mri->xsize` (mm). Identical to `--cres` |
| `--rres` | none | off | Print `mri->ysize` (row voxel size, mm) |
| `--ysize` | none | off | **Bugged**: sets `PrintCRes`, so prints `mri->xsize` instead of `ysize`. Use `--rres` |
| `--sres` | none | off | Print `mri->zsize` (slice voxel size, mm) |
| `--zsize` | none | off | **Bugged**: sets `PrintCRes`, so prints `mri->xsize` instead of `zsize`. Use `--sres` |
| `--voxvol` | none | off | Print `xsize*ysize*zsize` (mm³) |
| `--res` | none | off | Print `xsize ysize zsize tr` on one line |
| `--min-res` | none | off | Print `MIN(xsize, ysize, zsize)` |
| `--ncols` | none | off | Print `mri->width` (number of columns) |
| `--width` | none | off | Alias for `--ncols` (sets `PrintNCols`) |
| `--nrows` | none | off | Print `mri->height` (number of rows) |
| `--height` | none | off | Alias for `--nrows` (sets `PrintNRows`) |
| `--nslices` | none | off | Print `mri->depth` (number of slices) |
| `--depth` | none | off | Alias for `--nslices` (sets `PrintNSlices`) |
| `--dim` | none | off | Print `width height depth nframes` |
| `--nframes` | none | off | Print `mri->nframes` |
| `--mid-frame` | none | off | Print `nint(nframes/2)` (0-based middle frame index) |
| `--dof` | none | off | Print `mri->dof` (degrees of freedom from header) |

> [!gotcha] `--ysize` and `--zsize` are bugged (FS 8.2.0)
> Both `--ysize` and `--zsize` set the column-resolution print flag (`PrintCRes`)
> instead of `PrintRRes` / `PrintSRes`. They therefore print **xsize** (column
> voxel size), not ysize or zsize. Use `--rres` for the row (y) voxel size and
> `--sres` for the slice (z) voxel size.

#### Direction Cosines and Transforms

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--cdc` | none | off | Print column direction cosine `x_r x_a x_s` |
| `--rdc` | none | off | Print row direction cosine `y_r y_a y_s` |
| `--sdc` | none | off | Print slice direction cosine `z_r z_a z_s` |
| `--vox2ras` | none | off | Print 4×4 native/scanner vox-to-RAS matrix (`MRIgetVoxelToRasXform`) |
| `--ras2vox` | none | off | Print 4×4 inverse of vox2ras |
| `--vox2ras-tkr` | none | off | Print 4×4 Surface RAS (tkregister) vox-to-RAS (`MRIxfmCRS2XYZtkreg`) |
| `--ras2vox-tkr` | none | off | Print 4×4 inverse of vox2ras-tkr |
| `--vox2ras-fsl` | none | off | Print 4×4 FSL/FLIRT-compatible vox-to-RAS |
| `--tkr2scanner` | none | off | Print 4×4 Surface RAS → Scanner RAS (`vox2ras * (vox2ras-tkr)^-1`) |
| `--scanner2tkr` | none | off | Print 4×4 Scanner RAS → Surface RAS (inverse of `--tkr2scanner`) |
| `--det` | none | off | Print determinant of vox2ras |
| `--ras_good` | none | off | Print `mri->ras_good_flag` (0 or 1) — whether the header has a valid RAS transform |

#### Volume Centre and Origin

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--cras` | none | off | Print `mri->c_r c_a c_s` — the RAS encoded in the header (RAS at voxel index `nv/2`) |
| `--center` | none | off | Print RAS at voxel `((w-1)/2, (h-1)/2, (d-1)/2)` — true geometric centre |
| `--p0` | none | off | Print RAS at voxel (0,0,0) — 4th column of vox2ras |
| `--zero-cras` | none | off | **Modifier**: zeroes `mri->c_r/c_a/c_s` in memory after read but before any printing. Affects all subsequent output |

> [!gotcha] `--cras` vs `--center` differ by half a voxel
> `--cras` prints `mri->c_r/c_a/c_s` (the RAS at voxel index `nv/2`, as stored
> in the header). `--center` computes the RAS at voxel `(nv-1)/2` — the actual
> geometric centroid. They differ by half a voxel in each dimension on
> odd-dimensioned volumes.

#### Orientation and Format

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--orientation` | none | off | Print orientation string from direction cosines (e.g., `RAS`, `LPS`) via `MRIdircosToOrientationString` |
| `--ori` | none | off | Alias for `--orientation` |
| `--slicedirection` | none | off | Print primary slice direction name (e.g., `axial`) via `MRIsliceDirectionName` |
| `--type` | none | off | Print voxel type as string: `uchar`, `float`, `long`, `short`, `ushrt`, `int`, `tensor`, `float complex`. Returns immediately after printing |
| `--format` | none | off | Print file format name from `mri_identify(fname)` (`MGH`, `NIFTI1`, etc.). Returns immediately, before any header is read |
| `--conformed` | none | off | Print `"yes"`/`"no"` from `mriConformed(mri)` — true 1 mm isotropic 256³ |
| `--conformed-to-min` | none | off | Print `"yes"` if the volume is an isotropic cube (xsize=ysize=zsize and width=height=depth), regardless of voxel size |
| `--is-1mm-iso` | none | off | Print `"yes"` if all three voxel sizes are within 0.001 of 1.0 mm |

#### Per-Voxel and Statistical (require full read)

| Flag | Arguments | Default | Effect |
|------|-----------|---------|--------|
| `--voxel` | `c r s` (3 ints) | off | Print value at column/row/slice (0-based) for every frame, one per line. Triggers full `MRIread()` |
| `--voxvolsum` | none | off | Print `(sum of all voxel intensities) * voxel volume`. Full read |
| `--stats` | none | off | Print per-frame `min max mean` (one line per frame). Full read |
| `--entropy` | none | off | Print Shannon entropy of a 256-bin intensity histogram (bits). Full read |

#### Provenance and Tags

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--cmds` | none | off | Print command-line history stored in the header (TAG_CMDLINE entries) |
| `--autoalign` | none | off | Print 4×4 auto-align matrix if present in header |
| `--orig_ras2vox` | none | off | Print the original ras2vox matrix if stored in header |
| `--ctab` | none | off | Print embedded [[color-lut|colour lookup table]] (CTAB tag) |
| `--dump` | none | off | Compact multi-field dump: `FA` (degrees), `TR`, `TE`, `TI`, `Dim`, `Res`, `Det`, `Orientation`, `SliceDir`, `Precision`. Returns immediately |
| `--otags` | `file` (string) | off | Print TAG info to stdout and save the binary TAG data to `file` |

#### Output Redirection

| Flag | Argument | Default | Effect |
|------|----------|---------|--------|
| `--o` | `file` (string) | stdout | Redirect all output to `file` instead of stdout |
| `-it` | `type` (string) | auto | Force input format interpretation. Resolved via `string_to_type()` |
| `--in_type` | `type` (string) | auto | Alias for `-it` |
| `--debug` | none | off | Enable verbose option-parsing printout |
| `--diag-debug` | none | off | OR `DIAG_INFO` into `Gdiag`. Increases matrix print precision (to ~10 decimal places) and may enable additional diagnostic output |
| `--help` | none | — | Print usage and exit |
| `--version` | none | — | Print version and exit |

### Configuration Interactions

> [!gotcha] MR-sequence flags share an early-return block
> `--tr`, `--te`, `--fa`, `--flip_angle`, `--fad`, `--ti`, and `--type` are
> handled in a contiguous block in `do_file()`. After printing whichever of
> these are set, the function returns at line 820–821:
> `if (PrintTR || PrintTE || PrintFlipAngle || PrintFlipAngleDeg || PrintType || PrintTI) return;`
> So they may be combined with each other, but any flag that would normally
> print *later* (e.g., `--nframes`, `--vox2ras`, `--dim`) is silently ignored.
> `--type` itself returns even earlier (right after printing), so combining
> `--type` with `--tr` causes only the type to be printed.

> [!gotcha] `--format` returns before the header is interpreted
> `--format` is handled before `--dump`, `--zero-cras`, and the MR-sequence
> block, and returns immediately after printing the format string. It cannot
> be combined with any other flag.

> [!gotcha] `--dump` always returns early
> `--dump` prints its compact block and returns. It cannot be combined with
> any other flag (other than the input-format flags `-it`/`--in_type`, which
> are processed during command-line parsing).

> [!gotcha] `--is-1mm-iso`, `--conformed`, `--conformed-to-min` each return
> Each of these three "yes/no" flags prints its result and returns
> immediately. They are mutually exclusive in practice; only the first one
> reached in the source order will be printed.

> [!gotcha] `--zero-cras` modifies in-memory state
> `--zero-cras` mutates `mri->c_r/c_a/c_s` to zero after the header is read
> but before any printing happens. This affects `--cras`, `--vox2ras`,
> `--center`, the full dump, and any geometry-derived output. It does **not**
> modify the file on disk.

> [!gotcha] Most single-field flags return after printing
> The vast majority of flags (`--cres`, `--rres`, `--sres`, `--ncols`,
> `--vox2ras`, `--center`, `--cras`, `--p0`, `--det`, `--dim`, `--res`,
> `--orientation`, `--slicedirection`, `--ctab`, `--cmds`, `--autoalign`,
> `--orig_ras2vox`, `--entropy`, `--stats`, `--voxvolsum`, `--voxel`, etc.)
> each call `return;` immediately after printing. Effectively only one of
> these can be used per invocation; the rest are silently ignored. Use the
> default (no-flag) full dump if you need many fields at once.

## Typical Use Cases

### Scripting: extract single values

```bash
# Get TR in ms
TR=$(mri_info --tr $SUBJECTS_DIR/bert/mri/orig.mgz)

# Get vox2ras-tkr matrix for use with matrix math tools
mri_info --vox2ras-tkr $SUBJECTS_DIR/bert/mri/orig.mgz

# Get number of frames in a functional volume
NFRAMES=$(mri_info --nframes fmri.mgz)

# Check if a volume is conformed
mri_info --conformed $SUBJECTS_DIR/bert/mri/T1.mgz
```

### Inspect an unknown volume

```bash
# Full metadata dump
mri_info unknown.mgz

# Save to file
mri_info --o unknown_info.txt unknown.mgz
```

### Extract row voxel size (workaround for `--ysize` bug)

```bash
# WRONG: --ysize is bugged, returns xsize
mri_info --ysize vol.mgz

# CORRECT: use --rres
mri_info --rres vol.mgz
```

### Inspect multiple files

```bash
# Process in sequence; output interleaved on stdout
mri_info vol1.mgz vol2.mgz vol3.mgz
```

### GCA morph file

```bash
# Prints GCAM type, size, spacing, source and atlas geometries
mri_info talairach.m3z
```

## Pipeline Context

Not called by [[recon-all]]. Used interactively at any point.

## Gotchas and Caveats

> [!gotcha] `--ysize` reports xsize (bug in FS 8.2.0)
> The `--ysize` flag incorrectly sets `PrintCRes = 1` (column resolution)
> instead of `PrintRRes`. Use `--rres` for the row (y) dimension.

> [!gotcha] `--fa` vs `--fad` units
> `--fa` outputs flip angle in **radians**. `--fad` outputs it in degrees.
> The compact `--dump` mode outputs degrees. This inconsistency is in the code.

> [!gotcha] `--cras` vs `--center` differ
> `--cras` reflects the encoded header value (at index `nv/2`). `--center` is
> the true geometric centre at `(nv-1)/2`. On a 256³ volume these differ by
> 0.5 mm. For registration purposes, `c_ras` (the header value) is what
> matters.

> [!gotcha] `xstart`/`xend` fields are not stored in the file
> The fields shown in the full dump as `xstart`/`xend` etc. are computed on
> read as `±(dim/2) × voxelsize`. They do not exist as stored fields in the
> [[mgz]] format.

> [!gotcha] GCA morph inputs bypass normal flag handling
> When the input is a `.m3z`/`.m3d` file, `mri_info` switches to a different
> code path that prints GCAM-specific information. Most standard flags are
> silently ignored.

## Related Tools

- [[mri_convert]] — format conversion and geometry manipulation
- [[mgz]] — the primary file format whose header fields `mri_info` displays
- [[coordinate-systems]] — detailed explanation of vox2ras, vox2ras-tkr, and
  the relationship between Scanner RAS and Surface RAS
- [[freeview-volumes]] — GUI that displays the same RAS, TkReg RAS, MNI305, and voxel coordinates in its cursor info panel; use `mri_info` to inspect these values non-interactively

## Confidence and Gaps

High confidence on all flag behaviour and output values — derived directly from
`parse_commandline()` and `do_file()` in the source.

> [!gap] `--diag-debug` matrix precision interaction
> The flag increases matrix print precision to 10 decimal places and enables
> `DIAG_INFO`. The full scope of what extra information `DIAG_INFO` enables
> beyond matrix precision is not fully traced.
