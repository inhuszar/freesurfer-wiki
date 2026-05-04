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
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Complete list of recognized --attr attribute names (defined in imautils.h)"
  - "Full IMA file format specification"
  - "Accepted type strings for --o (short, int, long, float, double, string inferred from source but not exhaustive)"
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

- **IMA file:** Path to a Siemens `.ima` file, specified with --i (not --f; that flag does not exist).
- **Query parameters:** Attribute name, offset, data type, or other flags.

## Outputs

- Printed to stdout: The queried header field value, or general file information.
- Optional pixel data dump to bshort files (binary stem, specified with `--ob`).

## Mathematical Foundations

No computation — header field parsing and byte-offset extraction from a proprietary binary format.

## Configuration Options

Flag list verified against `mri_probe_ima/mri_probe_ima.cpp`.

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<imafile>` | — | Siemens `.ima` file to probe; replaces incorrect --f |
| `--o` | `<offset> <type> [<len>]` | — | Byte offset, data type string, and optional string length; replaces split --o/--t/--len |
| `--key` | `<str>` | — | Named key to query from the IMA dictionary |
| `--keyno` | `<int>` | — | Key number to query (positional within header struct) |
| `--attr` | `<attrname>` | — | Query a named attribute (e.g., `isima` for Siemens IMA check) |
| `--fileinfo` | — | off | Dump all available interpreted file information to stdout; replaces incorrect --dumpfileinfo |
| `--ob` | `<stem>` | `img` | Dump pixel data to bshort files with this basename; replaces incorrect --bstem |
| `--dictionary` | — | off | Print the IMA dictionary to stdout and exit |
| `--verbose` | — | off | Verbose output |
| `--debug` | — | off | Enable debug output |

> [!gotcha] --f, --t, --len, --bstem, --dumpfileinfo do not exist
> The IMA file is specified with `--i`. The offset/type/length query is a single `--o offset type [len]` flag. File info dumping is `--fileinfo`. Pixel dump stem is `--ob`. None of the former names exist in the source.

> [!gap] `--o` data type strings
> The accepted type strings for `--o` are parsed internally but not enumerated in the help text. From code context they include: `short`, `int`, `long`, `float`, `double`, `string`.

**Known attribute names for `--attr`:**

| Attribute | Description |
|-----------|-------------|
| `isima` | Returns 1 if file is a valid Siemens IMA, 0 otherwise |

> [!gap] Complete attribute list
> The full list of named attributes recognized by `--attr` is defined in `imautils.h`/`imautils.c`, which was not read in full.

## Configuration Interactions

- `--attr isima` performs a format check and returns 0 or 1; this is independent of other query flags.
- `--fileinfo` prints all available interpreted header information and can be combined with other targeted queries.
- `--ob <stem>` writes pixel data to bshort binary files; the exact naming convention depends on the number of frames.
- `--o <offset> <type>` requires at least two arguments; if `type` is `string`, a third argument `<len>` is required.
- `--dictionary` prints the dictionary and exits immediately without requiring `--i`.

## Typical Use Cases

```bash
# Check if a file is a valid Siemens IMA
mri_probe_ima --i scan.ima --attr isima

# Dump all interpreted file information
mri_probe_ima --i scan.ima --fileinfo

# Query a specific header field by offset and type
mri_probe_ima --i scan.ima --o 512 int

# Query by named key
mri_probe_ima --i scan.ima --key TR

# Print the IMA dictionary (no file needed)
mri_probe_ima --dictionary
```

## Pipeline Context

`mri_probe_ima` is not called by [[wiki/pipelines/recon-all|recon-all]]. It is a legacy utility for sites that still have Siemens IMA data from older scanners (pre-DICOM era Siemens systems). For modern DICOM files, use [[mri_probedicom]] instead.

## Gotchas and Caveats

> [!gotcha] Legacy format — limited modern relevance
> Siemens `.ima` format was used on NUMARIS/3 and early NUMARIS/4 scanners (roughly pre-2000s). Most modern Siemens scanners produce DICOM. This tool is only needed for very old data.

> [!gotcha] Byte offset queries require knowledge of the IMA header structure
> The `--o` flag requires knowing the byte offset of the desired field within the proprietary IMA header. There is no public specification document for this format.

## Related Tools

- [[mri_probedicom]] — Modern DICOM header inspection
- [[wiki/tools/mri_convert|mri_convert]] — Convert IMA/DICOM files to FreeSurfer format
- [[mri_parse_sdcmdir]] — Parse Siemens DICOM directories

## Confidence and Gaps

**High confidence:** Full flag list verified from source. `--i` (not --f), `--fileinfo` (not --dumpfileinfo), `--ob` (not --bstem), `--o offset type [len]` (not split into separate flags) all confirmed. `--dictionary`, `--key`, `--keyno`, `--attr`, `--verbose`, `--debug` confirmed.

**Medium confidence:** Full attribute list for `--attr` and IMA header structure (requires reading `imautils.h`).

> [!gap] IMA format documentation
> The Siemens IMA format is proprietary and not publicly documented. The `imautils.h` header defines the recognized fields and attribute names.

> [!gap] `--view` removed
> The `--view` flag is listed as `#if 0` (disabled) in the print_usage function, indicating it was compiled out. It is not a usable option.
