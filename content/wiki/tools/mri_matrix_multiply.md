---
title: "mri_matrix_multiply"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_matrix_multiply/mri_matrix_multiply.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[mri_em_register]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - matrix
  - registration
  - transform
---

# mri_matrix_multiply

## Summary

`mri_matrix_multiply` multiplies a sequence of 4×4 registration matrices, with optional per-matrix inversion, and writes the result to one or more output files. It supports both FreeSurfer `.dat` / `.xfm` registration formats and FSL-style matrix files. It is useful for composing or inverting registration transforms without reference to image data.

## Source Information

- **Language:** C++
- **Source file:** `mri_matrix_multiply/mri_matrix_multiply.cpp`

## Purpose and Context

When chaining multiple registration steps, it is often necessary to compose the individual transforms. For example, if $M_1$ registers space A to B and $M_2$ registers B to C, then $M_2 \cdot M_1$ registers A to C. `mri_matrix_multiply` performs this arithmetic on the stored matrix files without needing to load or resample volumes.

The tool handles the matrix format conventions for FreeSurfer `.dat` files (which encode subject name, in-plane resolution, slice thickness, and a brightness scaling factor alongside the 4×4 matrix), and can also read/write FSL-style plain text matrix files.

## Inputs

| Input | Format | Description |
|-------|--------|-------------|
| Input matrices | `.dat`, `.xfm`, or FSL text | One or more registration matrices, specified with `-im` or `-iim` |

Multiple input files are accepted; they are multiplied in order.

## Outputs

| Output | Format | Description |
|--------|--------|-------------|
| Output matrix/matrices | `.dat`, `.xfm`, or FSL text | Result of the matrix product, written with `-om` |

## Mathematical Foundations

Given $N$ input matrices $M_1, M_2, \ldots, M_N$ (with optional inversion $M_i^{-1}$ for selected matrices), the result is:

$$R = M_1 \cdot M_2 \cdot \cdots \cdot M_N$$

Matrix inversion uses the standard 4×4 matrix inverse (`MatrixInverse()`). All arithmetic is done in double precision.

The optional "binarization" (`-bin`) converts the rotation submatrix to the nearest axis-aligned representation and sets the translation to zero, producing an identity-like matrix useful for testing whether a computed transform is close to identity.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-im <fname>` | string | repeatable | Input matrix file (multiply in order) |
| `-iim <fname>` | string | repeatable | Input matrix file to be **inverted** before multiplication |
| `-om <fname>` | string | repeatable | Output matrix file (can specify multiple) |
| `-v` | flag | off | Verbose output |
| `-fsl` | flag | off | Treat input/output as FSL-style matrix files (plain text) |
| `-bin` | flag | off | "Binarize" output — remove rotation, set translation to zero |
| `-s <subject>` | string | null | Subject name to embed in output `.dat` file |

## Configuration Interactions

- `-im` and `-iim` can be interleaved freely; they are processed in the order given on the command line.
- `-fsl` changes the file reading/writing to FSL format (plain 4×4 float matrix, no header). Both input and output use FSL format when this flag is set.
- `-bin` is primarily a debugging/testing utility. The "binarization" described in the source comment sets the rotational elements to the nearest cardinal axis direction — it is not a standard mathematical operation.
- Multiple `-om` files produce the same matrix result written to each output path.
- `-s` only affects `.dat` output files; the subject name is embedded in the header.

> [!gotcha] Matrix multiplication order
> Matrices are multiplied left-to-right in the order they appear on the command line: `mri_matrix_multiply -im M1 -im M2` computes $M1 \times M2$. This is the opposite of the convention used in some other tools where the last matrix is applied first. Take care when composing transforms.

## Typical Use Cases

```bash
# Compose two transforms: A->B then B->C = A->C
mri_matrix_multiply -im A_to_B.dat -im B_to_C.dat -om A_to_C.dat

# Compose with inversion: A->B then invert(C->B) = A->C  
mri_matrix_multiply -im A_to_B.dat -iim C_to_B.dat -om A_to_C.dat

# FSL matrices: invert a single matrix
mri_matrix_multiply -fsl -iim fwd.mat -om inv.mat

# Write result to multiple output files
mri_matrix_multiply -im M1.dat -im M2.dat -om result.dat -om result.xfm
```

## Pipeline Context

Not part of standard `recon-all`. Used in:
- Custom registration pipelines where transforms from multiple tools must be composed.
- Longitudinal analysis where cross-session transforms are chained.
- Quality control workflows to verify that a composed transform is near-identity.

## Gotchas and Caveats

> [!gotcha] Matrix format conventions differ
> FreeSurfer `.dat` files encode additional metadata (subject name, ipr, st, brightness) around the matrix. FSL `.mat` files are plain 4×4 matrices. Mixing formats without `-fsl` may produce incorrect outputs.

> [!gotcha] -bin is not a standard mathematical operation
> The "binarization" flag modifies the rotation submatrix in a non-standard way (rounding to nearest axes). Its use should be limited to debugging scenarios.

> [!gotcha] No LTA format support
> This tool operates on `.dat` (tkregister-style) and `.xfm` format matrices only. It does not read or write `.lta` format. Use `lta_convert` or `mri_convert` for LTA manipulation.

## Related Tools

- [[mri_convert]] — can apply transforms when converting volumes
- [[coordinate-systems]] — explains the coordinate systems underlying the matrix formats
- [[mri_em_register]] — produces the registration matrices this tool can compose

## Confidence and Gaps

**Confident:** All flags (from complete source reading), matrix multiplication logic, inversion, FSL format support, `.dat` format metadata handling.
