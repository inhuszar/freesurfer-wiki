---
title: "mri_parse_sdcmdir"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_parse_sdcmdir/mri_parse_sdcmdir.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_probedicom]]"
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Complete output file format specification"
  - "Exact column definitions in the output table"
tags:
  - dicom
  - siemens
  - import
  - metadata
---

# mri_parse_sdcmdir

## Summary

`mri_parse_sdcmdir` scans a directory of Siemens DICOM files, parses metadata from each file, and produces a summary table describing the series, runs, and acquisition parameters found. It is used to inventory a DICOM directory before conversion and to verify that the series structure is correct for import with tools such as [[mri_convert]].

## Source Information

- **Language:** C++
- **Source file:** `mri_parse_sdcmdir/mri_parse_sdcmdir.cpp`
- **Key includes:** `DICOMRead.h`, `mri.h`
- **Key data structure:** `SDCMFILEINFO` (Siemens DICOM file info struct)

## Purpose and Context

When a Siemens MRI acquisition produces a directory of DICOM files, the relationship between individual `.dcm` files and logical MRI series (volumes) is encoded in DICOM header fields. `mri_parse_sdcmdir` reads all DICOM files in a specified directory, groups them by series/run, and reports acquisition parameters. This is an essential first step in DICOM-to-FreeSurfer conversion workflows, allowing the user to identify which series correspond to which acquisition type and to verify slice ordering, TR, and geometry.

The tool outputs a structured text table to stdout (or a file) listing one row per DICOM file with key metadata fields.

## Inputs

- **DICOM directory:** A directory containing Siemens DICOM files. Specified with `-d` or as a positional argument.

## Outputs

- **Text table:** Written to stdout or to a file specified with `-o`. Each row represents one DICOM file and includes series number, run number, filename, and acquisition parameters.

## Mathematical Foundations

No mathematical processing is performed. The tool parses DICOM header fields and organizes them into a tabular structure using the `SDCMFILEINFO` struct populated by `DICOMRead.h` routines.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--d` | `<dirname>` | — | Siemens DICOM directory to parse |
| `--o` | `<fname>` | stdout | Output file for results |
| `--summarize`<br>`--sum` | (none) | off | Print a summary (one line per series) rather than one line per file |
| `--sortbyrun` | (none) | off | Sort output by run number |
| `--status` | `<file>` | — | Write a status file (used by automated pipelines to track completion) |
| `--dwi` | (none) | off | Set `FS_LOAD_DWI=1` to include diffusion-weighted image metadata in output |
| `--verbose` | (none) | off | Enable verbose output |
| `--debug` | (none) | off | Enable verbose debugging output |
| `--version` | (none) | off | Print version and exit |
| `--help` | (none) | off | Print usage and exit |

> [!gap] Full output column specification
> The exact column names and order in the output table depend on the `SDCMFILEINFO` struct fields printed by the tool. These were not read in full from the source.

> [!gotcha] Double-dash flags
> All flags use `--` prefix (double-dash), not single `-`. For example: `--d`, `--o`, `--summarize`, `--sortbyrun`. The older documentation and some examples may show single-dash forms; these do not work.

## Configuration Interactions

- `--summarize` and `--sortbyrun` can be combined; the summary will still be sorted by run number.
- Without `--o`, all output goes to stdout, which can be redirected as needed.
- `--dwi` must be specified before the directory scan begins; it sets an environment variable that controls the DICOM reader.

## Typical Use Cases

```bash
# List all series in a DICOM directory
mri_parse_sdcmdir --d /data/dicom/ --summarize

# Write full per-file table sorted by run to a file
mri_parse_sdcmdir --d /data/dicom/ --sortbyrun --o dicom_table.txt

# Display verbose debug info for a directory
mri_parse_sdcmdir --d /data/dicom/ --debug

# Include DWI series in output
mri_parse_sdcmdir --dwi --d /data/dicom/ --summarize
```

## Pipeline Context

`mri_parse_sdcmdir` is not called by [[recon-all]]. It is a manual pre-processing utility used before running [[mri_convert]] on DICOM data. It helps identify:
- Which series number to pass to `mri_convert` with `--dicom_info` (a flag of `mri_convert`, not of this tool)
- Whether the slice ordering is ascending or descending
- Whether the acquisition has multiple runs

## Gotchas and Caveats

> [!gotcha] Siemens-specific
> This tool is designed specifically for Siemens DICOM files and uses Siemens-specific header fields. It may not work correctly (or at all) with DICOM files from other vendors. For non-Siemens DICOM files, use [[mri_probedicom]] for header inspection.

> [!gotcha] DWI loading disabled by default
> The code explicitly sets `FS_LOAD_DWI=0` at startup (unless already set), which prevents loading diffusion-weighted image metadata. Set `FS_LOAD_DWI=1` in the environment to include DWI series in the output.

## Related Tools

- [[mri_probedicom]] — Query individual DICOM header fields
- [[mri_convert]] — Convert DICOM to FreeSurfer/NIfTI formats
- [[mri_probe_ima]] — Probe Siemens `.ima` (legacy) files

## Confidence and Gaps

**High confidence:** Source language, file location, purpose, key flags, DWI env variable behaviour.

**Medium confidence:** Exact output column format (struct fields not fully enumerated).

> [!gap] Output table columns
> The full set of columns written to the output table depends on which `SDCMFILEINFO` fields are printed. This should be verified by running the tool on sample data.
