---
title: "mri_probe_ima"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_probe_ima/mri_probe_ima.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_probedicom]]"
  - "[[mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-15
gaps:
  - "Complete list of recognized attribute names"
  - "Full IMA file format specification"
tags:
  - siemens
  - ima
  - metadata
  - legacy
---

# mri_probe_ima

## Summary

`mri_probe_ima` probes the header of Siemens `.ima` (Siemens MReasurement Evaluation Protocol) legacy image files. It can check whether a file is a valid Siemens IMA file, query named attributes from the header, extract pixel data, and dump general file information. This tool is the IMA-format counterpart to [[mri_probedicom]].

## Source Information

- **Language:** C++
- **Source file:** `mri_probe_ima/mri_probe_ima.cpp`
- **Key includes:** `imautils.h`, `mri.h`, `machine.h`
- **Key functions:** `imaIsSiemensIMA()`, `imaLoadFileInfo()`

## Purpose and Context

Siemens `.ima` files are a legacy proprietary format predating DICOM, used by older Siemens scanners. They contain a fixed-size header followed by pixel data. `mri_probe_ima` provides a command-line interface to inspect these headers without converting the file. It supports querying specific fields by byte offset, data type, or attribute name, and can dump the pixel data to a file for external inspection.

## Inputs

- **IMA file:** Path to a Siemens `.ima` file, specified with `--f`.
- **Query parameters:** Attribute name, offset, data type, or other flags.

## Outputs

- Printed to stdout: The queried header field value, or general file information.
- Optional pixel data dump to a file (binary stem, specified with `--bstem`).

## Mathematical Foundations

No computation — header field parsing and byte-offset extraction from a proprietary binary format.

## Configuration Options

| Flag | Argument | Description |
|------|----------|-------------|
| `--f` | `<imafile>` | Siemens `.ima` file to probe |
| `--t` | `<typestring>` | Data type string for value interpretation (e.g., `int`, `float`, `string`) |
| `--o` | `<offset>` | Byte offset within the IMA header |
| `--len` | `<int>` | String length when reading string-type fields |
| `--key` | `<str>` | Named key to query (attribute name) |
| `--keyno` | `<int>` | Key number to query (positional within header struct) |
| `--dumpfileinfo` | (none) | Dump all available file information to stdout |
| `--attr` | `<attrname>` | Query a named attribute (e.g., `isima` for Siemens IMA check) |
| `--bstem` | `<stem>` | Dump pixel data to files with this basename |
| `--debug` | (none) | Enable debug output |

**Known attribute names for `--attr`:**

| Attribute | Description |
|-----------|-------------|
| `isima` | Returns 1 if file is a valid Siemens IMA, 0 otherwise |

> [!gap] Complete attribute list
> The full list of named attributes recognized by `--attr` is defined in `imautils.h`/`imautils.c`, which was not read in full.

## Configuration Interactions

- `--attr isima` performs a format check and returns 0 or 1; this is independent of other query flags.
- `--dumpfileinfo` prints all available header information and can be combined with `--o`/`--t` for additional targeted queries.
- `--bstem` writes pixel data to binary files named `<bstem>_NNN.bshort` (or similar); the number of output files depends on the number of frames.

## Typical Use Cases

```bash
# Check if a file is a valid Siemens IMA
mri_probe_ima --f scan.ima --attr isima

# Dump all file information
mri_probe_ima --f scan.ima --dumpfileinfo

# Query a specific header field by offset and type
mri_probe_ima --f scan.ima --o 512 --t int

# Query by named key
mri_probe_ima --f scan.ima --key TR
```

## Pipeline Context

`mri_probe_ima` is not called by [[recon-all]]. It is a legacy utility for sites that still have Siemens IMA data from older scanners (pre-DICOM era Siemens systems). For modern DICOM files, use [[mri_probedicom]] instead.

## Gotchas and Caveats

> [!gotcha] Legacy format — limited modern relevance
> Siemens `.ima` format was used on NUMARIS/3 and early NUMARIS/4 scanners (roughly pre-2000s). Most modern Siemens scanners produce DICOM. This tool is only needed for very old data.

> [!gotcha] Byte offset queries require knowledge of the IMA header structure
> The `--o` flag requires knowing the byte offset of the desired field within the proprietary IMA header. There is no public specification document for this format.

## Related Tools

- [[mri_probedicom]] — Modern DICOM header inspection
- [[mri_convert]] — Convert IMA/DICOM files to FreeSurfer format
- [[mri_parse_sdcmdir]] — Parse Siemens DICOM directories

## Confidence and Gaps

**High confidence:** Source language, file location, known attribute `isima`, general flag structure.

**Medium confidence:** Full attribute list and IMA header structure (requires reading `imautils.h`).

> [!gap] IMA format documentation
> The Siemens IMA format is proprietary and not publicly documented. The `imautils.h` header defines the recognized fields.
