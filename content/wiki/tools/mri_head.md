---
title: "mri_head"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_head/mri_head.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "True purpose of tool is unclear — source implements volume identification and reading stubs, not head mask creation"
  - "Whether this is the same binary as the head masking tool is unconfirmed"
  - "Full usage not documented in available source"
tags:
  - utility
  - identification
  - metadata
---

# mri_head

## Summary

`mri_head` is a utility that can identify MRI file format types (`-identify`) or read volume header information (`-read`) from a specified file, printing basic volume metadata to stdout. Despite the name, it does not create a head mask volume — based on the source code, it is a file type identification and basic metadata display utility, likely used as a diagnostic or testing tool.

> [!contradiction] Name vs. function mismatch
> The name `mri_head` suggests a tool for creating a head mask, but the source code (`mri_head/mri_head.cpp`) implements file-type identification and metadata reading stubs, not head masking. It is possible the "head mask" tool is a different script with the same name, or this binary serves a supporting role in a pipeline that creates head files. Human verification needed.

## Source Information

- **Source language:** C++
- **Source file:** `mri_head/mri_head.cpp`
- **Note:** Functions `dummy_identify()` and `dummy_read()` suggest this may be a stub or testing utility

## Purpose and Context

Based on source analysis, `mri_head` accepts a filename and one of two mode flags:

- `-identify`: Detects and reports the MRI file format type (MGH, NIfTI, MINC, Analyze, Siemens, GE, etc.)
- `-read`: Opens the volume and dumps basic header information using `MRIdump()`

This is primarily useful as:
- A command-line file format checker
- A lightweight alternative to [[mri_info]] for quick format identification
- An internal tool for pipeline scripts that need to verify a file's format before processing

## Inputs

| Input | Flag | Description |
|-------|------|-------------|
| Filename | positional | Path to the MRI file to inspect |
| Mode | `-identify` or `-read` | Operation to perform |

## Outputs

- **`-identify`**: Prints `succeed\n<format-name>` or `fail\n<error>` to stdout
- **`-read`**: Prints `succeed\n` followed by the volume header dump from `MRIdump()`

## Mathematical Foundations

No mathematical operations. This is a file I/O utility.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-identify` | (none) | — | Identify the file format of the input file |
| `-read` | (none) | — | Open and read the volume, dump header info |
| `-u` / `-h` / `-?` | (none) | — | Print usage |

Usage:
```
mri_head -identify filename
mri_head -read filename
mri_head -h|-u|-?
```

## Configuration Interactions

- `-identify` and `-read` are mutually exclusive (only one mode per invocation).
- The tool exits with code 0 on success, non-zero on failure.

## Typical Use Cases

**Check file format:**
```bash
mri_head -identify brain.mgz
# Output: succeed
#         mgh
```

**Read volume header:**
```bash
mri_head -read subject/mri/T1.mgz
```

**Supported formats (from source):**
`coronal-slice-directory`, `genesis`, `GE LX`, `mgh`, `nii`, `minc`, `analyze`, `siemens`, `brik`, `bshort`, `sdt`

## Pipeline Context

`mri_head` is not called by `recon-all`. It appears to be a low-level utility for pipeline scripts that need to check or inspect volume files before processing.

## Gotchas and Caveats

> [!gotcha] Name is misleading
> Despite the name suggesting head mask creation, the source implements format identification and header reading. The actual head masking functionality (creating a head mask volume from brain images) is performed by tools such as `mri_watershed` with head extraction or `mri_synthstrip`.

> [!gap] Possible disambiguation needed
> There may be a separate `mri_head` shell script or Python script that creates head mask volumes for PET/MRI analyses. The binary documented here is the C++ compiled version.

## Related Tools

- [[mri_convert]] — full format conversion with detailed header handling
- [[mri_info]] — comprehensive volume metadata display

## Confidence and Gaps

**Confident (from source):** Three operating modes (-identify, -read, usage), file format enumeration, basic behavior.

**Uncertain:** Whether this is the same `mri_head` referred to in PET/MRI head masking documentation; whether `-read` outputs the full header or only select fields.

> [!gap] Reconcile with PET head masking documentation
> The FreeSurfer wiki or PET processing workflows may describe a `mri_head` that creates a binary head mask. This documented tool does not do that. Source code verification against a live installation recommended.
