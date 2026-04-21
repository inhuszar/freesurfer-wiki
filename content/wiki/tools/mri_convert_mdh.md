---
title: "mri_convert_mdh"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_convert_mdh/mri_convert_mdh.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_convert]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-21
gaps:
  - "Source is in attic/ — unclear if binary is still shipped in 8.2.0 or deprecated"
  - "Format of MDH raw data output not fully documented"
tags:
  - format-conversion
  - siemens
  - raw-data
---

# mri_convert_mdh

## Summary

`mri_convert_mdh` converts Siemens raw MRI data files using the Measurement Data Header (MDH) mini-header format. MDH is a 128-byte header prepended to each k-space readout line in Siemens raw data files (VB and early VD-line scanners). The tool reads these raw files and outputs a FreeSurfer-compatible volume.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_convert_mdh/mri_convert_mdh.cpp`
- **Note:** Located in `attic/` — may be deprecated or unmaintained in v8.2.0.

## Purpose and Context

> [!gotcha] Attic location
> This tool's source resides in the `attic/` directory of the FreeSurfer source tree, which typically contains deprecated or experimental code. It may not be built or distributed in standard FreeSurfer 8.2.0 packages. Verify binary existence at `$FREESURFER_HOME/bin/mri_convert_mdh` before use.

The MDH (Measurement Data Header) format is used by Siemens scanners for raw k-space data export. Each ADC readout is preceded by a 128-byte `MDH` struct containing timing, slice position, phase correction flags, and dimension counters. This tool reads these raw readouts and reconstructs a volume.

## Inputs

Siemens raw data file(s) with embedded MDH mini-headers.

## Outputs

> [!gap] Output format
> The output format was not fully determined from the source read. It likely writes [[mgz]] or a FreeSurfer volume format.

## Mathematical Foundations

The MDH struct (128 bytes) contains:
- `ulTimeStamp`: acquisition timestamp
- `BitMask1`: flags for scan type (ACQEND, RTFEEDBACK, ONLINE, OFFLINE, PHASECOR, REFLECT, etc.)
- `Ncols`, `Nrows`: k-space dimensions
- `Slice`, `Partition`, `Echo`, `Rep`: scan counters
- `SlicePosSag`, `SlicePosCor`, `SlicePosTra`: physical slice position (mm)

Flags of interest for image reconstruction:
- `MDH_BM_ONLINE` (bit 4): mark as online scan
- `MDH_BM_PHASECOR` (bit 21): phase correction readout
- `MDH_BM_REFLECT` (bit 24): reflected (reversed) readout

## Configuration Options

All flags confirmed from `parse_commandline()` in `attic/mri_convert_mdh/mri_convert_mdh.cpp`.

### Input / Output

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--srcdir` | `dir` | (required) | Directory containing the `meas.out` raw k-space file and the accompanying ASCII protocol file (`MrProt.asc`, `mrprot.asc`, or `meas.asc`). |
| `--base` | `basename` | `meas` | Base filename used to locate `<basename>.out` and `<basename>.asc` inside `--srcdir`. |
| `--outdir` | `dir` | none | Output directory. Setting this flag clears `--info` mode. If the directory does not exist, it is created (one level only). |

### Geometry and Timing

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--dim` | `nframes nslices nechoes nlines nperline npcns` | auto-detected | Override all dimension parameters at once. Accepts exactly 6 integers: number of frames, slices, echoes, phase-encode lines, samples per line, and phase-correction navigators. |
| `--fasterdim` | `echo` \| `line` | `0` (auto) | Set the fastest-varying dimension in the raw data layout. Accepts `echo` (sets `FastestDim=1`) or `line` (sets `FastestDim=2`). |
| `--TR` | `TR` | `0.0` | Repetition time in milliseconds. Case-sensitive flag (`--TR`). |
| `--TE` | `TE1 TE2 …` | all zeros | Echo times in milliseconds; one value per echo. Must follow `--dim` (so that `nEchos` is known). Consumes exactly `nEchos` arguments. Case-sensitive flag (`--TE`). |

### ADC Dump / Diagnostics

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--info` | — | on (default mode) | Probe the MDH file and print scan parameters to stdout without writing any output volume. Disabled automatically when `--outdir` is given. |
| `--dump` | — | off | Print the MDH mini-header for every readout line to the terminal (but not the ADC data itself). Only `--srcdir` is required. |
| `--dumpadc` | `file` | none | Dump raw ADC data to a file. Output is ASCII by default; add `--binary` for binary format. |
| `--binary` | — | off | Write ADC dump in binary format instead of ASCII. Used together with `--dumpadc`. |
| `--nopcn` | — | off (PCNs are dumped) | Suppress dumping of phase-correction navigator (PCN) readouts. |
| `--adcstats` | — | off | Print minimum, maximum, and average value over all ADCs to stdout. |

> [!gotcha] `--rev` is non-functional
> The `--rev` flag (intended to reverse readouts for even-numbered lines) appears in the help text but is commented out in `parse_commandline()`. Passing `--rev` will trigger an "unknown option" error. The help text itself warns: "DOES NOT WORK".

## Configuration Interactions

> [!gap] Configuration interactions unknown

## Typical Use Cases

> [!gap] Usage examples not confirmed from source

## Pipeline Context

Not part of [[recon-all]]. This is a raw-data import utility for researchers working directly with Siemens k-space data.

## Gotchas and Caveats

> [!gotcha] Deprecated tool
> The `attic/` location strongly suggests this tool is no longer actively maintained. For converting Siemens data, prefer standard DICOM conversion tools (e.g., `dcm2niix`) followed by [[mri_convert]].

## Related Tools

- [[mri_convert]] — general-purpose format conversion for image-space data

## Confidence and Gaps

Confidence is **low**. Source was partially read and the tool is in the attic directory.

> [!gap] Binary availability
> It is unknown whether `mri_convert_mdh` is compiled and distributed in FreeSurfer 8.2.0. The attic location suggests it may have been removed from the build system.
