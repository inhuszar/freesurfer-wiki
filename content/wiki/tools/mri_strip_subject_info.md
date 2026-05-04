---
title: "mri_strip_subject_info"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_strip_subject_info/mri_strip_subject_info.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_deface]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - mri
  - de-identification
  - privacy
  - DICOM
  - GE
  - Siemens
---

# mri_strip_subject_info

## Summary

`mri_strip_subject_info` removes personally identifiable information (PII) from raw MRI scanner image files (GE or Siemens format). It reads one or more source scanner files, strips embedded subject demographic and identifying information from the file headers, and writes the de-identified files to a specified output directory. This is a data anonymisation tool for pre-DICOM-conversion de-identification.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_strip_subject_info/mri_strip_subject_info.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_strip_subject_info`

## Purpose and Context

Before sharing neuroimaging data or processing it on shared systems, patient-identifying information embedded in MRI files must be removed. `mri_strip_subject_info` strips this information from raw GE and Siemens scanner files (pre-DICOM formats historically used in research MRI). 

For modern DICOM files, `mri_deface` (which modifies the image data to remove facial structure) or standard DICOM anonymisation tools are preferred. `mri_strip_subject_info` targets older proprietary formats.

## Inputs

### Required Inputs

(Positional arguments: `<input_file1> [<input_file2> ...] <output_directory>`)

- **`<input_file>`** — one or more GE or Siemens raw scanner image files.
- **`<output_directory>`** — destination directory (must exist and be a directory). De-identified files are written here.

### Input Assumptions

> [!assumption] Output directory must already exist
> The tool checks that the last argument is an existing directory using `stat()`. If it does not exist or is not a directory, the tool exits with an error.

> [!assumption] Only GE and Siemens formats supported
> Files are tested with `is_genesis()` (GE) and `is_siemens()` (Siemens) from `mri_identify.h`. Files that match neither format are skipped with a warning.

## Outputs

### Files Created

- **De-identified image files** in the output directory, one per input file. The base filename is extracted from the full path using `get_base_name()`.

## Mathematical Foundations

No mathematical processing. This is purely a file format header manipulation tool. The `fix_genesis()` and `fix_siemens()` functions zero or blank out the fields in the scanner-specific binary header structures that contain subject-identifying information (name, birth date, etc.).

## Configuration Options

### Complete Flag Reference

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--version` | boolean | — | Print version string and exit. |

No other configurable options. The tool is fully determined by its positional arguments.

### Configuration Interactions

None.

## Typical Use Cases

### Use Case 1: Strip subject info from GE scanner files

```bash
mkdir /path/to/deidentified/
mri_strip_subject_info \
  /path/to/scanner/scan001 \
  /path/to/scanner/scan002 \
  /path/to/deidentified/
```

## Pipeline Context

`mri_strip_subject_info` is not called by `recon-all`. It is used as a preprocessing de-identification step before data is archived or shared.

## Gotchas and Caveats

> [!gotcha] Only strips header-embedded PII
> This tool strips information from the binary file header only. It does not remove facial structure from the MRI image data itself. For complete de-identification, consider also running [[mri_deface]] to remove identifying facial anatomy from the image.

> [!gotcha] Skips unrecognised formats silently
> Files that are neither GE nor Siemens format produce a warning message but are not copied to the output directory. Silently skipped files mean the output directory may have fewer files than expected.

> [!gotcha] Does not process DICOM
> Modern DICOM files are not supported. Use DICOM-specific anonymisation tools (e.g., `dcm4che`, `gdcm-anonymizer`) for DICOM data.

## Related Tools

- [[mri_deface]] — removes facial anatomy from the MRI image for de-identification
- [[wiki/tools/mri_convert|mri_convert]] — format conversion including some header manipulation

## Confidence and Gaps

Confidence is **high**. The source is short and fully read. The purpose and limitations are clearly coded.
