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
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps: []
audit_fixes:
  - "C2 2026-04-21: added Default column to Configuration Options table (23 flags)"
  - "C1 2026-04-21: --key and --tag not found in source — not added; --i already documented"
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

`mri_probedicom` is a low-level DICOM inspection utility. It allows users and scripts to query any DICOM header field by group/element tag, check file type, and extract specific acquisition parameters. It is commonly used in conversion scripts and QC pipelines to verify DICOM integrity and extract metadata before running [[wiki/tools/mri_convert|mri_convert]].

The tool supports several query directives beyond raw tag access, including checking for pixel data presence and querying DWI metadata.

## Inputs

- **DICOM file:** Path to a single DICOM file, specified with --i (not --f; that flag does not exist).
- **Query directive:** The type of query to perform (see options below).

## Outputs

- Printed to stdout: The value of the queried DICOM field, or structured file/series information.

## Mathematical Foundations

No computation — pure DICOM header parsing and value extraction.

## Configuration Options

Flag list verified against `mri_probedicom/mri_probedicom.cpp` (`parse_commandline()`, lines 360–508).

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--i` | `<dicomfile>` | *(required)* | DICOM file to probe; `--f` does not exist |
| `--t` | `<group> <element>` | — | DICOM group and element tag IDs (hex integers) to query; sets `DoPartialDump=0` |
| `--d` | `<directive>` | `value` | Named directive string (see table below); sets `DoPartialDump=0` |
| `--n` | `<tagname>` | — | Look up a tag by name |
| `--g` | `<group>` | `-1` | Group tag (hex integer); can be combined with `--e` |
| `--e` | `<element>` | `-1` | Element tag (hex integer); can be combined with `--g` |
| `--o` | `<file>` | — | Dump pixel data to file; implicitly sets grouptag=0x7FE0, elementtag=0x10, DoPartialDump=0 |
| `--ob` | `<file>` | — | Dump binary pixel data as bshort to file; implicitly sets pixel data tag, DoPartialDump=0 |
| `--max` | — | off | Get max pixel value from pixel data tag (0x7FE0, 0x10); sets DoPartialDump=0 |
| `--compare` | `<file1> <file2>` | — | Compare two DICOM files using dcm2niix on key parameters; exits immediately |
| `--compare-thresh` | `<float>` | `0.00001` | Numerical threshold for `--compare`; must precede `--compare` on the command line |
| `--backslash` | — | off | Use backslash delimiter in multi-value output |
| `--title` | `<str>` | — | Set window title string when using `--view` |
| `--view` | — | off | Display image in X window; requires OpenGL (compile-time option); sets DoPartialDump=0 |
| `--partial` | — | on | Enable partial dump mode (default behaviour when only `--i` is given) |
| `--siemens-ascii` | — | on | Enable Siemens ASCII header dump during partial dump |
| `--no-siemens-ascii` | — | — | Disable Siemens ASCII header dump |
| `--siemens-crit` | — | off | Include Siemens-specific criterion tag (0x51, 0x1016) in partial dump |
| `--no-name` | — | off | Do not print patient name (0010,0010) in partial dump |
| `--alt` | — | off | Use alternative Siemens ASCII dump format |
| `--tsec` | — | off | Convert time value (HHMMSS.FFF format) to seconds |
| `--verbose` | — | off | Verbose output; `--v` does not exist |
| `--dcm2niix-dicom-dump` | `<dicomdir> <series_info>` | — | Use dcm2niix to dump extended DICOM metadata; takes two positional arguments |
| `--extra-info` | — | off | Include extra DICOM info; only effective with `--dcm2niix-dicom-dump`; `--dicom-extra-info` does not exist |
| `--dictionary`<br>`--dic` | — | — | Print DICOM dictionary (calls `dcm_print_dictionary`) and exit |
| `--debug` | — | off | Enable debug output and set `FS_DICOM_DEBUG=1` |

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

- --dcm2niix-dicom-dump is independent of --t/--d; it invokes a separate dcm2niix-based dump and takes two arguments directly on the flag (not via --dicomdir/--series-info, which do not exist).
- `--extra-info` (not --dicom-extra-info) only has effect when `--dcm2niix-dicom-dump` is also given.
- `--t` and `--d` are complementary: `--t` specifies the tag numerically, `--d` provides the query type.
- `--g` and `--e` can be used separately to set only the group or element part of a tag.
- `--compare` reads two filenames as arguments and exits immediately after comparison (no further processing).

> [!gotcha] --f does not exist
> The DICOM input file flag is --i, not --f. Using --f will produce an "unknown option" error.

> [!gotcha] --dicomdir and --series-info do not exist
> These flags are not in the source. `--dcm2niix-dicom-dump` takes the directory and series info as two positional arguments on the same flag: `--dcm2niix-dicom-dump <dicomdir> <series_info>`.

> [!gotcha] --dicom-extra-info does not exist
> The correct flag is `--extra-info`.

## Typical Use Cases

```bash
# Check if a file is a valid DICOM file
mri_probedicom --i file.dcm --d filetype

# Query a specific DICOM tag (group 0008, element 0060 = Modality)
mri_probedicom --i file.dcm --t 8 60 --d value

# Check for pixel data
mri_probedicom --i file.dcm --d haspixeldata

# Get TR (repetition time) from tag (0018,0080)
mri_probedicom --i file.dcm --t 24 128 --d value

# Dump extended DICOM info using dcm2niix
# (directory and series_info are two arguments to --dcm2niix-dicom-dump)
mri_probedicom --dcm2niix-dicom-dump /data/dicom/ "series001"
```

## Pipeline Context

`mri_probedicom` is not called by [[wiki/pipelines/recon-all|recon-all]] but is widely used in site-specific DICOM import scripts. It is commonly used in QC scripts to verify that an acquisition was complete and to extract TE, TR, flip angle, and other sequence parameters.

## Gotchas and Caveats

> [!gotcha] Exits with non-zero status for non-DICOM files
> When used as a file type check, the exit code indicates DICOM validity. Scripts should check the exit code, not just the stdout output.

> [!gotcha] Group and element IDs for `--t` are parsed as hex
> The source uses `sscanf(pargv[0],"%lx",...)` to parse the group and element values, so they are interpreted as **hexadecimal** integers. Pass the tag values in hex (e.g., `--t 18 80` for tag `(0018,0080)`).

> [!gotcha] OpenGL dependency
> The source has optional OpenGL/GLUT support (`#ifdef HAVE_OPENGL`) for image display. This is a compile-time option and may not be available in all builds.

## Related Tools

- [[mri_parse_sdcmdir]] — Scan and summarize a Siemens DICOM directory
- [[mri_probe_ima]] — Probe legacy Siemens `.ima` files
- [[wiki/tools/mri_convert|mri_convert]] — Convert DICOM to FreeSurfer/NIfTI formats

## Confidence and Gaps

**High confidence:** Full flag list verified from source. --i (not --f) is the DICOM file flag. --dicomdir, --series-info, --dicom-extra-info, and --v do not exist. --dcm2niix-dicom-dump takes two positional arguments. Directive constants confirmed from source `#define` values. All remaining flags (--n, --g, --e, --o, --ob, --max, --compare, --compare-thresh, --backslash, --title, --view, --partial, --siemens-ascii, --no-siemens-ascii, --siemens-crit, --no-name, --alt, --tsec, --verbose, --extra-info, --dictionary/--dic) confirmed.

> [!gap] `--view` flag requires OpenGL
> The `--view` option is guarded by `#ifdef HAVE_OPENGL` in the source. It may not be available in all builds.
