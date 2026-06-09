---
title: "cor_to_minc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/cor_to_minc"
families: []                     # legacy COR→MINC converter
recon_all_stage: null
related:
  - "[[minc2seqinfo]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - minc
  - conversion
  - legacy
  - cor
---

# cor_to_minc

## Summary

`cor_to_minc` converts a legacy FreeSurfer **COR-** volume directory (the
historical 256×256×256, 1 mm isotropic, 8-bit coronal format made of 256 raw
slice files named `COR-001` … `COR-256`) into a single MINC (`.mnc`) file. It
concatenates the raw slice files and pipes them through the MNI MINC toolkit's
`rawtominc`, which is hard-wired with the exact dimensions, voxel steps, and
direction cosines of the COR format. It takes two positional arguments — the COR
directory and the output MINC filename — and has no options.

## Source Information

- **Language:** bash script (`#!/usr/bin/env bash`)
- **Source file:** [`scripts/cor_to_minc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc)
- **Binary/script location:** `$FREESURFER_HOME/bin/cor_to_minc`
- **Key helper invoked:** `rawtominc` — the MNI MINC toolkit raw-to-MINC writer (bundled under `$FREESURFER_HOME/mni/bin`), given the concatenated slice bytes on stdin ([`scripts/cor_to_minc:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L39)).

## Purpose and Context

Before MGH/MGZ became FreeSurfer's native volume format, internal volumes were
stored in the **COR** format: a directory of 256 headerless raw files, one per
coronal slice, each a 256×256 array of unsigned 8-bit voxels, on a 1 mm isotropic
grid. `cor_to_minc` bridges that legacy format to MINC, which was the
interchange/analysis format used with the MNI toolkit at the time. Because every
COR volume has identical geometry, the converter does not need to read any header
— it simply asserts the known dimensions and orientation to `rawtominc`.

It is a **legacy** utility of mainly archival interest: modern FreeSurfer reads
and writes COR transparently through [[wiki/tools/mri_convert|mri_convert]] (and
the shared MRI I/O library), so a one-purpose COR→MINC script is rarely needed
today. It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **`<cor directory>`** — positional argument 1 (required): a directory holding
  the COR slice files `COR-001` … `COR-256` (matched by the glob `COR-[0-9]*`,
  [`scripts/cor_to_minc:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L39)). The directory must exist
  ([`scripts/cor_to_minc:33-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L33-L37)).
- **`<minc file name>`** — positional argument 2 (required): the output `.mnc`
  path.

### Input Assumptions

> [!assumption] A canonical 256³, 1 mm, unsigned-8-bit coronal COR volume
> The conversion hard-codes the COR geometry: 256×256×256 voxels, unsigned byte
> data, coronal slice order, 1 mm steps (negative on x/y/z), the COR direction
> cosines, and a start coordinate of (128, 128, 128). The script does **not**
> verify the slice count, slice size, or that the bytes really are COR — it
> assumes them. Feeding it a non-COR directory, a partial volume, or COR data of
> a non-standard size will produce a geometrically wrong or corrupt MINC file
> without warning.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<minc file name>` (arg 2) | user-specified | a single MINC volume holding the COR data with the fixed COR geometry |

### Output Specifications

The output is a 256×256×256, unsigned-8-bit MINC volume. The exact `rawtominc`
invocation ([`scripts/cor_to_minc:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L39)) is:

```bash
cat <dir>/COR-[0-9]* | rawtominc -unsigned -byte -coronal \
  -xstep -1 -ystep -1 -zstep -1 \
  -xdircos 1 0 0 -ydircos 0 -1 0 -zdircos 0 0 1 \
  -xstart 128 -ystart 128 -zstart 128 \
  -mri -range 0 255 -scan_range <out.mnc> 256 256 256
```

| `rawtominc` option | Meaning for the output |
|--------------------|------------------------|
| `-unsigned -byte` | voxels are unsigned 8-bit |
| `-coronal` | dimension order is coronal (slices stacked along the coronal axis) |
| `-xstep -1 -ystep -1 -zstep -1` | 1 mm isotropic spacing, with negative sign on each axis (encodes axis direction) |
| `-xdircos 1 0 0 -ydircos 0 -1 0 -zdircos 0 0 1` | the COR direction cosines (x→+R, y→−A, z→+S pattern) written into the MINC world transform |
| `-xstart -ystart -zstart 128` | world-coordinate origin of each axis at voxel index 0 |
| `-range 0 255` / `-scan_range` | valid value range 0–255; `-scan_range` rescans the data for its true min/max |
| `-mri` | tag the MINC as MRI data |
| trailing `256 256 256` | the three dimension lengths |

> [!math] Geometry is asserted, not derived
> Because the COR format is fixed, the script supplies the full voxel→world
> mapping as literal constants rather than computing it from a header. The
> direction-cosine matrix
> $$\begin{pmatrix} 1 & 0 & 0 \\ 0 & -1 & 0 \\ 0 & 0 & 1 \end{pmatrix}$$
> together with the (−1,−1,−1) steps and (128,128,128) starts reproduces the
> standard COR orientation in MINC world space. See [[coordinate-systems]] for how
> FreeSurfer's coronal/conformed space relates to scanner RAS.

## Mathematical Foundations

`cor_to_minc` performs no computation itself — all voxel-to-world geometry is
encoded as the literal `rawtominc` flags above, and `rawtominc` builds the MINC
world transform from them. The only "operation" the script contributes is
concatenating the 256 slice files in glob order so the byte stream matches the
declared `256 256 256` dimensions.

## Configuration Options

### Complete Flag Reference

`cor_to_minc` has **no option flags**. It is driven by exactly two positional
arguments; any other argument count prints the usage and exits 1
([`scripts/cor_to_minc:22-31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L22-L31)).

| Argument | Position | Required | Description |
|----------|----------|----------|-------------|
| `<cor directory>` | 1 | yes | Directory containing the `COR-001`…`COR-256` slice files. Must exist. |
| `<minc file name>` | 2 | yes | Output MINC (`.mnc`) path. |

### Configuration Interactions

None — there are no flags and the geometry is fixed, so there is nothing to
combine or conflict.

> [!gotcha] No `--help`, `--version`, or any flag
> Running with the wrong number of arguments prints only
> `usage: cor_to_minc <cor directory> <minc file name>`
> ([`scripts/cor_to_minc:25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L25)). There is no way to override the hard-coded
> dimensions or orientation.

## Typical Use Cases

### Convert a COR volume to MINC

```bash
cor_to_minc /path/to/subject/mri/T1 T1.mnc
```

Reads the `COR-001`…`COR-256` files under `.../mri/T1` and writes a single MINC
volume `T1.mnc` with the standard COR geometry.

### Hand the result to a MINC-aware tool

```bash
cor_to_minc subject/mri/orig orig.mnc
minc2seqinfo orig.mnc           # inspect dimensions/voxel sizes
```

## Pipeline Context

`cor_to_minc` is a stand-alone **legacy format-conversion** utility. It is
**not** invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a legacy COR- volume directory (historically produced by the
old FreeSurfer volume pipeline) → **cor_to_minc** → **Successor:** any MINC-aware
tool, e.g. [[minc2seqinfo]] or the MNI MINC toolkit. For all current work,
[[wiki/tools/mri_convert|mri_convert]] reads and writes COR directly and is the
preferred path.

## Gotchas and Caveats

> [!gotcha] Geometry is fixed to the canonical COR format
> Every parameter (256³, 1 mm, unsigned byte, coronal, the COR direction cosines,
> 128/128/128 starts) is hard-coded ([`scripts/cor_to_minc:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L39)). The script
> cannot convert COR-like data of any other size or orientation; if the input is
> not a standard COR volume the output geometry will be wrong.

> [!gotcha] Slice files are taken in shell glob order
> The 256 slices are concatenated via `cat .../COR-[0-9]*`. This relies on the
> glob expanding `COR-001`…`COR-256` in the correct numeric order (true for the
> standard zero-padded names). A directory with irregularly named or missing COR
> files would silently produce a misordered or short volume.

> [!gotcha] No validation of slice count or size
> The script does not check that exactly 256 slices of 256×256 bytes are present;
> it asserts `256 256 256` to `rawtominc` regardless. A truncated COR directory
> yields a corrupt MINC rather than an error.

> [!gotcha] Requires the MNI MINC toolkit
> Conversion depends on `rawtominc` (bundled under `$FREESURFER_HOME/mni/bin`).
> If it is not on the `PATH`, the script fails at the pipe.

## Error Compensation and Guard Rails

- **Argument count enforced.** Anything other than two arguments prints the usage
  and exits 1 ([`scripts/cor_to_minc:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L31)).
- **Input directory existence checked.** A missing first-argument directory
  aborts with "can't find directory" ([`scripts/cor_to_minc:33-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L33-L37)).
- **`-scan_range`** asks `rawtominc` to rescan the data for its true value range
  rather than trusting the declared `-range 0 255`
  ([`scripts/cor_to_minc:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc#L39)) — a mild safeguard against mislabelled value
  ranges.
- Beyond these, there is **no** compensation: the geometry is assumed, not
  validated.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — the modern general converter; reads and writes COR volumes (and MINC) transparently, making this single-purpose script largely obsolete.
- [[minc2seqinfo]] — a natural downstream consumer; extracts sequence/dimension info from the MINC produced here.
- [[coordinate-systems]] — explains the coronal/COR orientation and how it maps to scanner RAS, the geometry this script asserts.
- `rawtominc` *(no wiki page; MNI MINC toolkit)* — the tool that actually writes the MINC file from the raw byte stream.

## Confidence and Gaps

**High confidence:** the two-positional-argument interface (no flags), the exact
hard-coded `rawtominc` geometry (256³, unsigned byte, coronal, −1 steps, the COR
direction cosines, 128 starts), the `COR-[0-9]*` concatenation, and the directory
existence check — all read directly from
[`scripts/cor_to_minc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc). The COR format parameters are confirmed by the
literal flag values in the script.

## References

- FreeSurfer source: [`scripts/cor_to_minc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cor_to_minc) (v8.2.0).
- MNI MINC toolkit (`rawtominc`): bundled under `$FREESURFER_HOME/mni/bin`.
