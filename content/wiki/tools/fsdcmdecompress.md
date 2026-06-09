---
title: "fsdcmdecompress"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsdcmdecompress"
families: []                     # standalone DICOM decompression front-end
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_probedicom]]"
  - "[[dcmunpack]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact JPEG transfer-syntax variants GDCM/DCMTK each handle (baseline vs lossless vs JPEG2000) are not enumerated by the script; it relies on the back end's own detection."
tags:
  - dicom
  - decompression
  - conversion
---

# fsdcmdecompress

## Summary

`fsdcmdecompress` is a thin front-end that decompresses a single
compressed-transfer-syntax DICOM file (JPEG or RLE encoded) into an uncompressed
("raw") DICOM file, by shelling out to one of two external converters: GDCM's
`gdcmconv.fs` (the default) or DCMTK's `dcmdjpeg.fs` / `dcmdrle.fs`. Its primary
purpose is to be called from FreeSurfer C code — specifically the DICOM reader in
[`utils/DICOMRead.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L418) — via a `system()` call, so that the standard
FreeSurfer DICOM I/O routines (which cannot themselves decode compressed pixel
data) can read the decompressed temporary file. It can also be run directly from
the command line.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/fsdcmdecompress`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsdcmdecompress`
- **External converters dispatched:**
  - [`gdcmconv.fs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L85) — GDCM's `gdcmconv`, bundled in `$FREESURFER_HOME/bin`, invoked as `gdcmconv.fs --raw <in> <out>` (default back end).
  - [`dcmdjpeg.fs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L91) — DCMTK's `dcmdjpeg`, invoked as `dcmdjpeg.fs +te <in> <out>` for JPEG.
  - [`dcmdrle.fs`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L93) — DCMTK's `dcmdrle`, invoked as `dcmdrle.fs +te <in> <out>` for RLE.

## Purpose and Context

Some scanners and PACS export DICOM with the pixel data stored in a *compressed
transfer syntax* — JPEG (baseline/lossless) or RLE (run-length). FreeSurfer's
native DICOM reader handles only uncompressed pixel data, so when
[`DICOMRead.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L410-L425) detects a compressed transfer-syntax UID it writes the
file to a temporary path, calls `fsdcmdecompress` on it, and then reads back the
decompressed temporary file. Wrapping the converter in a script (rather than
linking GDCM/DCMTK into every binary) lets the choice of converter be changed at
run time — by flag **or** by the `FS_DCM_DECOMPRESS` environment variable —
without recompiling FreeSurfer.

This means `fsdcmdecompress` is usually invoked **indirectly**, deep inside
[[wiki/tools/mri_convert|mri_convert]], [[mri_probedicom]], [[dcmunpack]], or any
tool that loads DICOM through the shared FreeSurfer DICOM library. It is rarely
run by hand, though it can be.

> [!internal] The decision to call it lives in the DICOM reader
> Compression is detected in [`utils/DICOMRead.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L410-L425) by comparing the file's
> TransferSyntaxUID against the JPEG and RLE UIDs. When it matches, the reader
> builds the command `fsdcmdecompress --i <file> --o <tmp> --jpeg` (or `--rle`)
> and runs it via `system()` ([`utils/DICOMRead.cpp:418-425`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L418-L425), and again at
> [`utils/DICOMRead.cpp:5974-5981`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L5974-L5981)). The `--jpeg`/`--rle` flag is *always*
> appended by the C code even though it only matters for the DCMTK back end.

## Inputs

### Required Inputs

- **`--i indcmfile`** — the compressed input DICOM file (required). Existence is
  checked at parse time; a missing file aborts immediately
  ([`scripts/fsdcmdecompress:142-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L142-L149)).
- **`--o outdcmfile`** — the decompressed output DICOM file (required). Its parent
  directory is created with `mkdir -p` during parameter checking
  ([`scripts/fsdcmdecompress:228-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L228-L235)).

### Input Assumptions

> [!assumption] Input is a JPEG- or RLE-compressed DICOM
> The script assumes the input is a single DICOM whose pixel data is in a
> compressed transfer syntax. With the default GDCM back end it does **not** need
> to be told which compression — `gdcmconv --raw` auto-detects JPEG vs RLE. With
> the DCMTK back end the compression type **must** be declared with `--jpeg` or
> `--rle`, because `dcmdjpeg.fs` and `dcmdrle.fs` are distinct programs. The
> output is a DICOM with uncompressed (raw) pixel data.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `outdcmfile` (`--o`) | user-specified | the input DICOM re-encoded with uncompressed pixel data |
| `fsdcmdecompress.Y<YYYY>.M<MM>.D<DD>.H<HH>.M<MM>.log` | `dirname $outfile` | timestamped run log (command line, build stamp, version, host, timing). Suppressed by `--nolog`; overridden by `--log`. |

### Output Specifications

The output is produced entirely by the chosen external converter; the geometry,
data type, and tags of the DICOM are preserved, only the pixel-data encoding is
changed to uncompressed. `fsdcmdecompress` performs no resampling or intensity
manipulation of its own. The default GDCM command is
`gdcmconv.fs --raw <in> <out>` ([`scripts/fsdcmdecompress:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L85)); the DCMTK
commands use `+te` (write with explicit-VR little-endian transfer syntax),
[`scripts/fsdcmdecompress:91-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L91-L93).

## Mathematical Foundations

None in this script — the actual JPEG/RLE entropy decoding is performed by GDCM
or DCMTK. `fsdcmdecompress` only selects the converter and assembles its command
line. The lone arithmetic is converting elapsed seconds to hours for the log
(`$tSecRun/3600 | bc -l`, [`scripts/fsdcmdecompress:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L109)).

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/fsdcmdecompress:129-205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L129-L205)). An unrecognised flag is a hard error.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(required)* | Input compressed DICOM file. Must exist (checked immediately). |
| `--o` | string | *(required)* | Output (decompressed) DICOM file. Parent directory auto-created. |
| `--gdcm` | bool | **on** | Use GDCM's `gdcmconv.fs --raw` (the default back end). Auto-detects JPEG vs RLE; `--jpeg`/`--rle` then have no effect. |
| `--dcmtk` | bool | off | Use DCMTK's `dcmdjpeg.fs` (for `--jpeg`) or `dcmdrle.fs` (for `--rle`) instead of GDCM. Requires one of `--jpeg`/`--rle`. |
| `--jpeg` | bool | off | Declare the input JPEG-compressed (sets `jpeg=1`, `rle=0`). Only consulted with `--dcmtk`; ignored under GDCM. |
| `--rle` | bool | off | Declare the input RLE-compressed (sets `rle=1`, `jpeg=0`). Only consulted with `--dcmtk`; ignored under GDCM. |
| `--log` | string | auto-timestamped path | Write the run log to this explicit path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null` (no log file). |
| `--tmp`<br>`--tmpdir` | string | — | Use this temporary directory; also sets `cleanup=0` (do not delete it). Note: the script does not otherwise reference `tmpdir` in v8.2.0 — see gotcha. |
| `--nocleanup` | bool | cleanup on | Do not remove temporary files. |
| `--cleanup` | bool | **on** | Remove temporary files (the default). |
| `--debug` | bool | off | Set csh `verbose` and `echo` tracing. |
| `--version` | bool | — | Print the version string (`fsdcmdecompress 8.2.0`) and exit. Handled before parsing. |
| `--help` | bool | — | Print usage plus the `BEGINHELP` block and exit. Handled before parsing. |

#### Environment variable

| Variable | Values | Effect |
|----------|--------|--------|
| `FS_DCM_DECOMPRESS` | `GDCM` \| `DCMTK` | Selects the back end without a command-line flag. Read at startup ([`scripts/fsdcmdecompress:17-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L17-L29)). Any other value is a fatal error. A later `--gdcm`/`--dcmtk` flag overrides it. |

### Configuration Interactions

> [!gotcha] DCMTK requires `--jpeg` or `--rle`; GDCM ignores them
> Under `--dcmtk`, the back end is chosen by the compression flag: `dcmdjpeg.fs`
> for `--jpeg`, `dcmdrle.fs` for `--rle`. If neither is given, the script aborts
> with "with DCMTK you must spec --jpeg or --rle"
> ([`scripts/fsdcmdecompress:221-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L221-L226)). Under the default GDCM back end,
> `--jpeg`/`--rle` are accepted but have no effect — `gdcmconv --raw` figures out
> the compression itself. This is why the C caller can safely append `--jpeg` or
> `--rle` unconditionally.

> [!gotcha] `--gdcm`/`--dcmtk` flag overrides `FS_DCM_DECOMPRESS`, and order matters
> The back end may be set two ways. `FS_DCM_DECOMPRESS` is read first; an explicit
> `--gdcm`/`--dcmtk` flag processed later in the same run overrides it. Because
> `--jpeg` and `--rle` do **not** themselves set `UseDCMTK`
> ([`scripts/fsdcmdecompress:160-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L160-L168), per the source comment), specifying
> only `--jpeg` (without `--dcmtk` and without the env var) still runs GDCM.

> [!gotcha] If DCMTK is selected but neither `--jpeg` nor `--rle` matches, `cmd` is empty
> The DCMTK branch only assigns `cmd` inside the `if($jpeg)` / `if($rle)` blocks
> ([`scripts/fsdcmdecompress:88-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L88-L95)). The mandatory `--jpeg`/`--rle` check
> in `check_params` normally prevents reaching that branch with an empty `cmd`,
> so in practice this cannot occur from the CLI.

### Defaults summary

- Back end: **GDCM** (`gdcmconv.fs --raw`) unless `--dcmtk` or
  `FS_DCM_DECOMPRESS DCMTK`.
- Logging: **on**, to an auto-timestamped file next to the output, unless
  `--nolog`/`--log`.
- Cleanup: **on**.

## Typical Use Cases

### Decompress with the default (GDCM) back end

```bash
# Auto-detects JPEG vs RLE; no compression flag needed
fsdcmdecompress --i compressed.dcm --o raw.dcm
```

### Force the DCMTK JPEG decoder

```bash
fsdcmdecompress --dcmtk --jpeg --i compressed.dcm --o raw.dcm
```

### Switch back end via environment variable (no flag, no recompile)

```bash
setenv FS_DCM_DECOMPRESS DCMTK
# now any tool that loads a compressed DICOM through the FS library — and any
# direct call — uses DCMTK; --jpeg/--rle is appended by the C code automatically
mri_convert compressed_dir/ out.nii.gz
```

### As FreeSurfer itself calls it

```bash
# This is the command DICOMRead.cpp builds internally (paraphrased):
fsdcmdecompress --i /path/series0001.dcm --o /tmp/fsXXXX --jpeg >& /tmp/fsXXXX.dcmdjpeg.out
```

## Pipeline Context

`fsdcmdecompress` is an **internal DICOM-I/O helper**, not a stage of
[[wiki/pipelines/recon-all|recon-all]]. Its "caller" is the FreeSurfer DICOM
reader, which is reached by any tool that imports compressed DICOM.

**Predecessor:** a tool loading a compressed DICOM (e.g.
[[wiki/tools/mri_convert|mri_convert]], [[mri_probedicom]], [[dcmunpack]]) detects
the compressed transfer syntax → **fsdcmdecompress** (writes an uncompressed temp
DICOM) → **Successor:** the same tool reads the decompressed file back through the
standard FreeSurfer DICOM routines.

## Gotchas and Caveats

> [!gotcha] `--tmp`/`--tmpdir` is parsed but otherwise unused in v8.2.0
> The handler stores `tmpdir` and disables cleanup, but the rest of the script in
> v8.2.0 never reads `$tmpdir` or `$cleanup` to create or delete a working file —
> the conversion writes directly to `--o`. These options therefore have no
> observable effect on the output beyond being accepted
> ([`scripts/fsdcmdecompress:180-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L180-L191)). Treat them as vestigial.

> [!gotcha] A log file appears next to the output unless suppressed
> By default a timestamped `fsdcmdecompress.Y…log` is written into the output
> directory ([`scripts/fsdcmdecompress:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L66)). When the script is called once
> per file by the DICOM reader this can litter the working directory with logs;
> the C caller redirects stdout/stderr but does not pass `--nolog`. Pass
> `--nolog` for quiet batch use.

> [!gotcha] The `.fs` converters are FreeSurfer's bundled GDCM/DCMTK
> The script calls `gdcmconv.fs`, `dcmdjpeg.fs`, and `dcmdrle.fs` — FreeSurfer's
> renamed copies of the upstream `gdcmconv`/`dcmdjpeg`/`dcmdrle` binaries in
> `$FREESURFER_HOME/bin` — not whatever GDCM/DCMTK may be on the system `PATH`.

## Error Compensation and Guard Rails

- **Input existence checked early.** `--i` aborts immediately if the file does
  not exist ([`scripts/fsdcmdecompress:145-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L145-L148)).
- **Back-end consistency enforced.** A bad `FS_DCM_DECOMPRESS` value
  ([`scripts/fsdcmdecompress:24-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L24-L28)) or a missing `--jpeg`/`--rle` under
  DCMTK ([`scripts/fsdcmdecompress:221-226`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L221-L226)) is a fatal error before any
  conversion is attempted.
- **Converter failure propagates.** If the external converter exits non-zero, the
  script jumps to `error_exit` and returns 1
  ([`scripts/fsdcmdecompress:99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L99), [`scripts/fsdcmdecompress:122-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L122-L125)).
  The C caller checks this status and exits if decompression failed
  ([`utils/DICOMRead.cpp:430-433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L430-L433)).
- **Output directory auto-created** with `mkdir -p`
  ([`scripts/fsdcmdecompress:228-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L228-L235)).

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — the most common indirect caller; converts the decompressed DICOM to MGH/NIfTI.
- [[mri_probedicom]] — also loads DICOM through the same library and will trigger `fsdcmdecompress` on compressed input.
- [[dcmunpack]] — multi-vendor importer; decompression happens transparently underneath it for compressed series.
- `gdcmconv.fs` / `dcmdjpeg.fs` / `dcmdrle.fs` *(no wiki pages)* — the bundled external converters this script dispatches to.

## Confidence and Gaps

**High confidence:** the complete flag set, the GDCM-default / DCMTK-optional
back-end selection, the `FS_DCM_DECOMPRESS` environment override and its
precedence, the requirement that DCMTK be paired with `--jpeg`/`--rle` while GDCM
ignores them, the exact converter command lines, the logging behaviour, and the
C call site in [`utils/DICOMRead.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L418) — all read directly from source and
confirmed against `--help`.

> [!gap] Which compressed transfer syntaxes each back end handles
> The help notes GDCM "seems to work in more cases" than DCMTK but neither the
> script nor the help enumerates the specific JPEG variants (baseline, lossless,
> JPEG-LS, JPEG 2000) each converter supports. That depends on the bundled
> GDCM/DCMTK builds, not on this script.

## References

- FreeSurfer source: [`scripts/fsdcmdecompress`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress) (v8.2.0).
- C call site: [`utils/DICOMRead.cpp:410-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L410-L435) and
  [`utils/DICOMRead.cpp:5964-5996`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/DICOMRead.cpp#L5964-L5996).
- Built-in help: `fsdcmdecompress --help` (the `BEGINHELP` block,
  [`scripts/fsdcmdecompress:267-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsdcmdecompress#L267-L292)).
- GDCM `gdcmconv`: http://gdcm.sourceforge.net/wiki/index.php/Gdcmconv —
  DCMTK: http://dicom.offis.de/dcmtk
