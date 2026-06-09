---
title: "dicom-rename"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/dicom-rename"
families: []                     # standalone DICOM import helper
recon_all_stage: null
related:
  - "[[cp-dicom]]"
  - "[[mri_probedicom]]"
  - "[[dcmunpack]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - dicom
  - import
  - rename
---

# dicom-rename

## Summary

`dicom-rename` copies a list of DICOM files to new, human-readable filenames of
the form `outbase-SSS-IIIII.dcm`, where `SSS` is the zero-padded series number
(DICOM tag `(0020,0011)`) and `IIIII` is the zero-padded image/instance number
(DICOM tag `(0020,0013)`). It reads those two tags from each file with
[[mri_probedicom]] and skips any input that is not a DICOM. The original files
are left in place — the operation is a copy, not a true rename. It is mainly
used to give meaningful names to the cryptically-named files found on Siemens
CDs so that downstream tools such as `dcmdir-info-mgh` can interpret them.

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/dicom-rename`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename)
- **Binary/script location:** `$FREESURFER_HOME/bin/dicom-rename`
- **Key helper invoked:** [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L59) — used three times per file: once to test the file type (`--d filetype`), once to read the series number (`--t 20 11`), and once to read the image number (`--t 20 13`).

## Purpose and Context

Data exported from a scanner or burned onto a Siemens CD frequently arrives with
opaque filenames (e.g. `1.3.12.2.1107.5.2.32.35131...`) that encode nothing
useful to a human or to filename-pattern-based tools. `dicom-rename` solves the
narrow problem of giving each file a name that exposes its series and image
number, so that a directory can be sorted, inspected, and fed to the FreeSurfer
"mgh" import path. It is a sibling of [[cp-dicom]]: where `cp-dicom` *sorts* files
into one directory per series (keeping the original filenames), `dicom-rename`
keeps every file in one place but *renames* it by series and image number.

It is run **by hand** as a preparatory step before DICOM conversion. It is not
part of [[wiki/pipelines/recon-all|recon-all]]. The canonical name it produces is
designed to be consumed by `dcmdir-info-mgh` (and, more generally, by the
FreeSurfer Siemens/"mgh" DICOM readers reached through
[[wiki/tools/mri_convert|mri_convert]], [[dcmunpack]], or `unpacksdcmdir`).

## Inputs

### Required Inputs

- **One or more DICOM files** — given as positional arguments (any token that is
  not a recognised flag is appended to the input file list,
  [`scripts/dicom-rename:114-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L114-L116)). Globs such as `dicomdir/*`
  are expanded by the shell before the script sees them. Non-DICOM files in the
  list are tolerated and skipped.
- **`--o outbase`** — the output base path/prefix (required). A directory is
  created for it if needed (see Outputs).

### Input Assumptions

> [!assumption] Per-file series and image numbers must be readable
> Each DICOM file is assumed to carry a series number in tag `(0020,0011)` and an
> image (instance) number in tag `(0020,0013)`. These are read individually with
> [[mri_probedicom]]. If `mri_probedicom` exits non-zero while reading either tag,
> the script aborts with an error. Enhanced/multi-frame DICOMs, or files that
> lack these classic tags, may therefore not rename cleanly.

Files for which `mri_probedicom --d filetype` returns `notdicom` are silently
skipped ([`scripts/dicom-rename:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L64)); only the files that *are* DICOM
are copied and counted.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `outbase-SSS-IIIII.dcm` | directory part of `outbase` | a verbatim copy of each input DICOM, renamed by series (`SSS`) and image (`IIIII`) number |

The output directory is `dirname $OutBase`, created with `mkdir -p` before any
copying ([`scripts/dicom-rename:47-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L47-L52)). The script prints a running
`<count> <infile> <outfile>` line per copied file and a final
`Copied <N> dicom files` summary.

### Output Specifications

The output files are **byte-for-byte copies** (`cp`) of the inputs
([`scripts/dicom-rename:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L85)); no pixel data, header, or transfer syntax is
altered. Only the filename changes. The series number is formatted `%03d`
(3 digits) and the image number `%05d` (5 digits),
[`scripts/dicom-rename:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L79-L80).

## Mathematical Foundations

None — this is a file-management script. The only numeric operation is
zero-padding the series and image numbers with `printf "%03d"` / `"%05d"`
([`scripts/dicom-rename:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L79-L80)). All DICOM parsing is delegated to
[[mri_probedicom]].

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/dicom-rename:96-119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L96-L119)). Everything that is not one of the flags
below is treated as an input filename.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output base path. Each file becomes `<outbase>-SSS-IIIII.dcm`. The directory portion is created with `mkdir -p`. |
| `--debug` | bool | off | Turn on csh `verbose` and `echo` tracing of the script. |
| `--version` | bool | — | Print the version string (`dicom-rename @FS_VERSION@` → `8.2.0`) and exit. Handled before argument parsing. |
| `--help` | bool | — | Print usage plus the `BEGINHELP` block and exit. Handled before argument parsing. |
| *(positional)* | string (repeatable) | *(required)* | One or more input files; non-flag tokens accumulate into the input list. Globs are shell-expanded. |

### Configuration Interactions

There are no mutually-exclusive or interacting flags — the tool has only an
output base, a debug switch, and the file list.

> [!gotcha] `--o` must be given and at least one input must be present
> `check_params` aborts if no `--o` is supplied ("ERROR: must spec an output
> base") or if the input list is empty ("ERROR: no input files specified"),
> [`scripts/dicom-rename:125-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L125-L135). Because non-flag tokens become inputs,
> a typo'd flag (e.g. `--out` instead of `--o`) is silently treated as an input
> filename rather than rejected.

## Typical Use Cases

### Rename every DICOM in a directory

```bash
# Copy all files in dicomdir/ to mydicoms/bert-SSS-IIIII.dcm
dicom-rename dicomdir/* --o mydicoms/bert
```

This finds all DICOMs in `dicomdir/` (non-DICOM files are skipped) and writes
e.g. `mydicoms/bert-003-00017.dcm`. The result can then be inspected or
converted by the FreeSurfer "mgh" import path (`dcmdir-info-mgh`, then
[[wiki/tools/mri_convert|mri_convert]] / [[dcmunpack]]).

### Prepare a Siemens CD for conversion

```bash
# Files on a Siemens CD have uninterpretable names; give them readable ones
dicom-rename /media/cdrom/DICOM/* --o /data/raw/sub01/sub01
recon-all -s sub01 -i /data/raw/sub01/sub01-003-00001.dcm -all
```

## Pipeline Context

`dicom-rename` is a stand-alone **import-preparation** helper. It is **not**
invoked by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`; it runs one or
more steps upstream of them.

**Predecessor:** raw DICOM from a scanner/CD → **dicom-rename** →
**Successor:** `dcmdir-info-mgh` / [[wiki/tools/mri_convert|mri_convert]] /
[[dcmunpack]] → [[wiki/pipelines/recon-all|recon-all]].

Compare with [[cp-dicom]], which addresses the same "messy DICOM directory"
problem by sorting into per-series subdirectories rather than renaming.

## Gotchas and Caveats

> [!gotcha] It copies, it does not rename
> Despite the name, the input files are never deleted or moved — each is copied
> (`cp`) to its new name ([`scripts/dicom-rename:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L85)). Plan for roughly
> double the disk usage of the input set, and clean up the originals yourself if
> desired. The help text states this explicitly.

> [!gotcha] Filename collisions overwrite silently
> The output name depends only on the series and image numbers. If two input
> files share the same `(0020,0011)`/`(0020,0013)` pair (e.g. files gathered from
> two sessions, or a multi-echo series that reuses image numbers), the second
> copy overwrites the first without warning.

> [!gotcha] Three `mri_probedicom` calls per file
> Every file is probed three times (filetype, series, image). On a large
> directory this is the dominant cost; there is no caching or one-per-directory
> shortcut as in [[dcmunpack]].

## Error Compensation and Guard Rails

- **Non-DICOM inputs are skipped, not fatal.** `filetype == notdicom` →
  `continue` ([`scripts/dicom-rename:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L64)), so a mixed directory (DICOMs plus
  `README`, `DICOMDIR`, thumbnails, etc.) is handled gracefully.
- **Output directory auto-created.** `mkdir -p $(dirname outbase)` runs before
  copying and aborts on failure ([`scripts/dicom-rename:47-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L47-L52)).
- **Hard abort on probe failure.** If `mri_probedicom` returns non-zero for the
  filetype, series, or image query, the script prints the error and exits 1
  rather than guessing ([`scripts/dicom-rename:60-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L60-L77)).

## Related Tools

- [[cp-dicom]] — companion helper that sorts a messy DICOM directory into one subdirectory per series (by tag `(0020,0011)`) instead of renaming files.
- [[mri_probedicom]] — does all the actual DICOM tag reading (`--d filetype`, `--t 20 11`, `--t 20 13`) that `dicom-rename` relies on.
- [[dcmunpack]] — the full multi-vendor importer; a typical downstream consumer of a cleaned-up DICOM directory.
- [[wiki/tools/mri_convert|mri_convert]] — converts the (renamed) DICOMs to MGH/NIfTI volumes.
- `dcmdir-info-mgh` *(no wiki page yet)* — the tool the help text names as the intended consumer of the `outbase-SSS-IIIII.dcm` naming scheme.
- `unpacksdcmdir` *(no wiki page yet)* — the legacy Siemens unpacker, also named in the help "See also" list.

## Confidence and Gaps

**High confidence:** the complete flag set (`--o`, `--debug`, `--version`,
`--help`, plus positional inputs), the `outbase-SSS-IIIII.dcm` naming, the
`%03d`/`%05d` padding, the copy (not move) semantics, the skip-if-notdicom
behaviour, and the three-probe-per-file workflow — all read directly from
[`scripts/dicom-rename`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename) and confirmed against `--help`.

## References

- FreeSurfer source: [`scripts/dicom-rename`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename) (v8.2.0).
- Built-in help: `dicom-rename --help` (the `BEGINHELP` block,
  [`scripts/dicom-rename:170-194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dicom-rename#L170-L194)).
