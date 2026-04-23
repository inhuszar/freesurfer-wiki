---
title: "mri_make_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_make_register/mri_make_register.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mri_em_register]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Exact matrix construction algorithm not fully traced"
  - "Analyse.dat file format not documented here"
tags:
  - registration
  - functional
  - attic
---

# mri_make_register

## Summary

`mri_make_register` creates a `register.dat` file (and optionally an `analyse.dat` file) that defines the rigid-body registration between a functional (low-resolution) volume and a structural T1 (high-resolution) volume for a given subject. It was part of an early FreeSurfer functional-to-structural registration workflow. This tool resides in `attic/` and is not compiled in FreeSurfer 8.2.0.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_make_register/mri_make_register.cpp`
- **Status note:** In `attic/` — legacy code. Not compiled in FreeSurfer 8.2.0.

## Purpose and Context

Before `bbregister` and `mri_coreg` were available, functional-to-structural registration relied on header-derived geometry. `mri_make_register` reads the geometry of both the structural T1 and the functional volume (COR or ANALYZE format), then computes the 4×4 registration matrix aligning the functional voxel space to the structural RAS space. The resulting `register.dat` file is in FreeSurfer's legacy registration format (used by `tkregister`, `mri_vol2surf`, etc.).

An optional `analyse.dat` file encodes in-plane resolution, slice thickness, and FOV information for the functional run.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Subject name | string | FreeSurfer subject identifier |
| Functional stem | string | Stem of the functional data (COR or ANALYZE) |
| T1 directory path | string | Path to the structural T1 directory |
| Structural directory | string | Optional; path to pre-existing structural data |

**Usage:** `mri_make_register [options] <subject_name> <fct_stem> <path_to_T1_dir> [<structural_dir>]`

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| `register.dat` | `.dat` | 4×4 registration matrix (subject name, ipr, st, brightness, matrix) |
| `analyse.dat` | text | Optional; functional run metadata for BrainVoyager-style analysis |

## Mathematical Foundations

The registration matrix $M$ maps functional voxel coordinates to structural scanner RAS coordinates:

$$
\mathbf{x}_{RAS} = M \cdot \mathbf{x}_{vox}
$$

The matrix is constructed from the vox2ras matrices of both the functional and structural volumes:

$$
M = M_{struct}^{RAS \leftarrow vox} \cdot (M_{func}^{RAS \leftarrow vox})^{-1}
$$

where each volume's vox2ras is derived from its header geometry (in-plane resolution, slice thickness, FOV centre, and direction cosines).

The `register.dat` format stores: subject name, in-plane resolution, slice thickness, intensity scale (brightness), followed by the 4×4 matrix row-by-row, and a `round` flag.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-r <fname>` | string | `register.dat` in functional dir | Output registration filename; use `-r -` to suppress |
| `-a <fname>` | string | `analyse.dat` in functional dir | Output analyse filename; use `-a -` to suppress |

## Configuration Interactions

- Using `-r -` suppresses writing of `register.dat`.
- Using `-a -` suppresses writing of `analyse.dat`.
- If `<structural_dir>` is omitted, the tool looks for the structural under the subject's `$SUBJECTS_DIR/<subject>/mri/` hierarchy.

## Typical Use Cases

```bash
# Create register.dat for subject bert, run1 functional, with T1 at /data/t1
mri_make_register bert /data/func/run1 /data/t1

# Create only the register.dat, suppress analyse.dat
mri_make_register -a - bert /data/func/run1 /data/t1
```

## Pipeline Context

Not part of `recon-all`. This was used in early 2000s-era FreeSurfer functional analysis workflows before `bbregister` superseded it. The output `register.dat` format is still consumed by tools such as `mri_vol2surf` (via `-reg` flag) and was used with `tkregister`.

> [!internal] References internal code
> The `make_register_matrix()` function and `read_functional_header()` both use internal matrix and volume-geometry utilities from `matrix.h` and `mri.h`.

## Gotchas and Caveats

> [!gotcha] Attic status
> This tool is in `attic/` and is not compiled by default in FreeSurfer 8.2.0.

> [!gotcha] Header-derived registration only
> The matrix is derived purely from header geometry — there is no intensity-based optimization. If the functional volume has incorrect header geometry (common with older scanner exports), the resulting registration will be wrong.

> [!gotcha] COR format assumed for functional
> The tool reads functional metadata from a COR-style header file (`<stem>.hdr` or equivalent). If using NIfTI or MGZ functional data, this tool may not parse headers correctly.

## Related Tools

- `bbregister` — the modern replacement for functional-to-structural registration
- [[mri_em_register]] — atlas registration using EM
- [[mri_convert]] — format conversion
- [[coordinate-systems]] — explains scanner RAS and tkRAS systems used by `register.dat`

## Confidence and Gaps

**Confident:** Purpose (register.dat creation), input arguments, output format, attic status.

**Less confident:** Exact matrix computation, functional header reading details, compatibility with modern MGZ/NIfTI functional data.

> [!gap] Functional header format
> The `read_functional_header()` function reads from a COR-style header file. Its compatibility with newer formats is unclear.
