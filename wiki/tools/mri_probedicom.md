---
title: "mri_probedicom"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_probedicom/mri_probedicom.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_parse_sdcmdir]]"
  - "[[mri_probe_ima]]"
  - "[[mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - dicom
  - metadata
  - inspection
---

# mri_probedicom

## Summary

`mri_probedicom` queries DICOM file header fields and prints their values to stdout. Given a DICOM group ID and element ID (or a named directive), it prints the value of the corresponding header field. It can also verify whether a file is a valid DICOM file, dump pixel data, display basic acquisition information, and since FreeSurfer 8 can invoke `dcm2niix` for extended DICOM metadata dumping.

## Source Information

- **Language:** C++
- **Source file:** `mri_probedicom/mri_probedicom.cpp`
- **Original author:** Doug Greve
- **Key includes:** `DICOMRead.h`, `dcm2niix_fswrapper.h`
- **DICOM library:** Mallinckrodt Institute of Radiology CTN library

## Purpose and Context

`mri_probedicom` is a low-level DICOM inspection utility. It allows users and scripts to query any DICOM header field by group/element tag, check file type, and extract specific acquisition parameters. It is commonly used in conversion scripts and QC pipelines to verify DICOM integrity and extract metadata before running [[mri_convert]].

The tool supports several query directives beyond raw tag access, including checking for pixel data presence and querying DWI metadata.

## Inputs

- **DICOM file:** Path to a single DICOM file, specified with `--f`.
- **Query directive:** The type of query to perform (see options below).

## Outputs

- Printed to stdout: The value of the queried DICOM field, or structured file/series information.

## Mathematical Foundations

No computation — pure DICOM header parsing and value extraction.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--f` | `<dicomfile>` | DICOM file to probe |
| `--t` | `<group> <element>` | DICOM group and element tag IDs (hex integers) to query |
| `--d` | `<directive>` | Named directive string (e.g., `filetype`, `tag`, `representation`, `description`, `multiplicity`, `length`, `value`, `haspixeldata`, `dwi`) |
| `--v` | (none) | Verbose output |
| `--debug` | (none) | Debug output |
| `--dcm2niix-dicom-dump` | (none) | Use dcm2niix to dump extended DICOM metadata |
| `--dicom-extra-info` | (none) | Include extra DICOM info in dcm2niix dump |
| `--dicomdir` | `<dir>` | DICOM directory for dcm2niix dump |
| `--series-info` | `<str>` | Series info string for dcm2niix |

**Query directive constants:**

| Directive | Meaning |
|-----------|---------|
| `filetype` | Determine file type (DICOM or not) |
| `tag` | Query a specific DICOM tag |
| `representation` | VR (value representation) of the tag |
| `description` | Human-readable description of the tag |
| `multiplicity` | Number of values in the tag |
| `length` | Byte length of the tag value |
| `value` | Value of the tag |
| `haspixeldata` | Whether the file has pixel data (returns 0 or 1) |
| `dwi` | Whether the file contains DWI metadata |

## Configuration Interactions

- `--dcm2niix-dicom-dump` is independent of `--t`/`--d`; it invokes a separate dcm2niix-based dump and does not require a group/element specification.
- `--dicom-extra-info` only has effect when `--dcm2niix-dicom-dump` is also given.
- `--t` and `--d` are complementary: `--t` specifies the tag numerically, `--d` provides the query type.

## Typical Use Cases

```bash
# Check if a file is a valid DICOM file (exit code 0=yes)
mri_probedicom --f file.dcm --d filetype

# Query a specific DICOM tag (group 0008, element 0060 = Modality)
mri_probedicom --f file.dcm --t 8 60 --d value

# Check for pixel data
mri_probedicom --f file.dcm --d haspixeldata

# Get TR (repetition time) from tag (0018,0080)
mri_probedicom --f file.dcm --t 24 128 --d value

# Dump extended DICOM info using dcm2niix
mri_probedicom --dcm2niix-dicom-dump --dicomdir /data/dicom/
```

## Pipeline Context

`mri_probedicom` is not called by [[recon-all]] but is widely used in site-specific DICOM import scripts. It is commonly used in QC scripts to verify that an acquisition was complete and to extract TE, TR, flip angle, and other sequence parameters.

## Gotchas and Caveats

> [!gotcha] Exits with non-zero status for non-DICOM files
> When used as a file type check, the exit code indicates DICOM validity. Scripts should check the exit code, not just the stdout output.

> [!gotcha] Group and element IDs are decimal integers in the code
> Despite DICOM tags conventionally being written as hex (e.g., `(0018,0080)`), the `--t` flag takes decimal integers. Convert hex to decimal before passing to the flag.

> [!gotcha] OpenGL dependency
> The source has optional OpenGL/GLUT support (`#ifdef HAVE_OPENGL`) for image display. This is a compile-time option and may not be available in all builds.

## Related Tools

- [[mri_parse_sdcmdir]] — Scan and summarize a Siemens DICOM directory
- [[mri_probe_ima]] — Probe legacy Siemens `.ima` files
- [[mri_convert]] — Convert DICOM to FreeSurfer/NIfTI formats

## Confidence and Gaps

**High confidence:** Source language, file location, directive constants (defined as `#define` in source), tag query mechanism, dcm2niix integration.
