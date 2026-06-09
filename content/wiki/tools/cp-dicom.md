---
title: "cp-dicom"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/cp-dicom"
families: []                     # standalone DICOM import helper
recon_all_stage: null
related:
  - "[[dicom-rename]]"
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
  - sorting
---

# cp-dicom

## Summary

`cp-dicom` copies the DICOM files in a directory into a tidy output tree with one
subdirectory per acquisition series. For every file it reads the series number
(DICOM tag `(0020,0011)`) and protocol name (DICOM tag `(0018,1030)`) with
[[mri_probedicom]], then copies the file (filename unchanged) into
`outdir/protocol-series/` — or, if the protocol cannot be read, into
`outdir/series/`. It is the "sort into series folders" counterpart to
[[dicom-rename]] (which instead renames files in place), and is typically used to
make a flat, messily-named scanner dump navigable before conversion.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/cp-dicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/cp-dicom`
- **Key helper invoked:** [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L54) — read once for the series number (`--t 20 11`) and once for the protocol name (`--t 18 1030`) per file.

## Purpose and Context

A directory exported from a scanner often contains all series mixed together with
non-descriptive filenames. `cp-dicom` reorganises that directory into a
per-series layout that humans and conversion tools can navigate, **without**
relying on the filenames themselves — the grouping comes entirely from the DICOM
headers. This makes it robust to the arbitrary naming used on Siemens CDs and
similar exports.

It is run **by hand** as an import-preparation step and is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. After sorting, a chosen series directory
is normally handed to [[wiki/tools/mri_convert|mri_convert]] or [[dcmunpack]] for
conversion to MGH/NIfTI. `cp-dicom` and [[dicom-rename]] address the same "messy
DICOM directory" problem with two different strategies — sort into folders vs.
rename in place.

## Inputs

### Required Inputs

- **`-d dcmdir`** — the input DICOM directory (required). Its immediate contents
  are listed with `ls` ([`scripts/cp-dicom:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L49)) and each entry is probed.
- **`-o outdir`** — the output directory (required); created with `mkdir -p`
  during parameter checking ([`scripts/cp-dicom:139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L139)).

### Input Assumptions

> [!assumption] Flat input directory; series number must be readable
> Only the top level of `dcmdir` is enumerated (`ls $dcmdir`,
> [`scripts/cp-dicom:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L49)); the tree is **not** searched recursively, unlike
> [[dcmunpack]]. A file is processed only if `mri_probedicom --t 20 11` succeeds
> (returns status 0); files for which the series tag cannot be read — including
> non-DICOM files — are skipped. The protocol tag `(0018,1030)` is optional: if
> it cannot be read, the directory is named by series number alone.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| original filename | `outdir/protocol-series/` (protocol readable) | verbatim copy of each DICOM, grouped by series |
| original filename | `outdir/series/` (protocol unreadable) | verbatim copy, grouped by series number only |

`protocol` is the value of tag `(0018,1030)` with all spaces and asterisks
removed (`sed 's/*//g'`, `sed 's/ //g'`,
[`scripts/cp-dicom:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L58)); `series` is tag `(0020,0011)`. Each
target directory is created on demand with `mkdir -p`
([`scripts/cp-dicom:64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L64)). The script prints a
`<n>/<total>   <series>   <file>` progress line per file and a final `done`.

### Output Specifications

Files are **byte-for-byte copies** (`cp`,
[`scripts/cp-dicom:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L65)); names and contents are unchanged. Only the
directory structure is added. The series number is used verbatim — it is **not**
zero-padded (contrast with [[dicom-rename]], which pads series and image
numbers).

## Mathematical Foundations

None — this is a file-sorting script. It performs no arithmetic; its only string
processing is stripping spaces and `*` from the protocol name
([`scripts/cp-dicom:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L58)). All DICOM parsing is delegated to
[[mri_probedicom]].

## Configuration Options

### Complete Flag Reference

Enumerated from the argument parser
([`scripts/cp-dicom:74-116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L74-L116)). Unlike [[dicom-rename]], an unrecognised flag is a
hard error (`default:` branch prints "Flag … unrecognized" and exits,
[`scripts/cp-dicom:110-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L110-L114)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-d` | string | *(required)* | Input DICOM directory (top level only; not searched recursively). |
| `-o` | string | *(required)* | Output directory. Per-series subdirectories are created beneath it. |
| `-umask` | string (octal) | — | Set the process `umask` to the given value before copying, controlling the permissions of the created directories and files. |
| `-verbose` | bool | off | Set csh `verbose`. |
| `-echo` | bool | off | Set csh `echo` (command tracing). |
| `-debug` | bool | off | Set both `verbose` and `echo`. |
| `-version` | bool | — | Print the version string (`cp-dicom 8.2.0`) and exit. Handled before parsing. |
| `-help` | bool | — | Print usage plus the `BEGINHELP` block and exit. Handled before parsing. |

### Configuration Interactions

The tool has no mutually-exclusive flags; `-verbose`, `-echo`, and `-debug` are
overlapping tracing switches (`-debug` sets both of the others).

> [!gotcha] Both `-d` and `-o` are mandatory
> `check_params` exits with "ERROR: no dicom dir specified" if `-d` is omitted
> and "ERROR: no out dir specified" if `-o` is omitted
> ([`scripts/cp-dicom:129-137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L129-L137)). There are no defaults.

> [!gotcha] `-umask` takes its argument from `$1`, so order in argv matters
> The `-umask` handler reads the raw `$1` (the current first positional) rather
> than the already-shifted flag argument
> ([`scripts/cp-dicom:105-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L105-L108)). In practice `-umask 022` works because at
> that point `$1` is `022`, but this is a fragile idiom — keep the umask value
> immediately after the flag.

## Typical Use Cases

### Sort a scanner dump into per-series folders

```bash
cp-dicom -d ./dicomdir -o /space/data/mydicom
```

All DICOMs in `./dicomdir` are copied into `/space/data/mydicom/protocol-S`
(e.g. `mprage-5/`, `ep2d_bold-7/`), one directory per series. Filenames are
preserved.

### Sort, then convert one series with recon-all

```bash
cp-dicom -d /media/cdrom/DICOM -o /data/sorted/sub01
# inspect /data/sorted/sub01/, pick the MPRAGE series directory, then:
recon-all -s sub01 -i /data/sorted/sub01/mprage-5/<first-file>.dcm -all
```

### Control output permissions

```bash
# Make the copied tree group-writable
cp-dicom -umask 002 -d ./dicomdir -o /shared/project/dicom
```

## Pipeline Context

`cp-dicom` is a stand-alone **import-preparation** helper. It is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** raw DICOM directory from a scanner/CD → **cp-dicom** →
**Successor:** [[wiki/tools/mri_convert|mri_convert]] / [[dcmunpack]] →
[[wiki/pipelines/recon-all|recon-all]].

Compare with [[dicom-rename]] (rename in place, by series + image number) and
[[dcmunpack]] (recursive scan + conversion in a single tool).

## Gotchas and Caveats

> [!gotcha] It copies, it does not move
> Files are copied (`cp`) into the new tree; the originals remain
> ([`scripts/cp-dicom:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L65)). Expect roughly double the disk usage of the
> input set.

> [!gotcha] Top level only — not recursive
> `cp-dicom` lists only the immediate contents of `-d` (`ls $dcmdir`). If your
> data is nested in per-series subdirectories (common for GE), `cp-dicom` will
> probe the subdirectory entries (which `mri_probedicom` cannot read as DICOM)
> and copy nothing useful. Use [[dcmunpack]] for recursive trees.

> [!gotcha] Series number is not zero-padded
> Directories are named with the raw series number (`mprage-5`, not
> `mprage-005`). A lexical sort of the output therefore orders `mprage-10`
> before `mprage-2`. [[dicom-rename]] zero-pads; `cp-dicom` does not.

> [!gotcha] Only the first file's protocol determines a series directory name
> The directory name is recomputed per file from that file's own protocol tag.
> If different files in one series report slightly different protocol strings
> (rare but possible), they could land in differently-named directories. In
> normal data all files of a series share the protocol, so this is not usually
> observed.

## Error Compensation and Guard Rails

- **Per-file guard on the series tag.** A file is only copied if
  `mri_probedicom --t 20 11` returns status 0
  ([`scripts/cp-dicom:54-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L54-L55)); non-DICOM and unreadable files are
  silently skipped rather than aborting the run.
- **Protocol fallback.** If the protocol tag `(0018,1030)` cannot be read, the
  series directory is named by series number alone
  ([`scripts/cp-dicom:59-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L59-L62)).
- **Protocol sanitisation.** Spaces and asterisks are stripped from the protocol
  name so it forms a clean directory name
  ([`scripts/cp-dicom:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L58)). Other special characters are *not* removed
  (contrast [[dcmunpack]]'s broader `-replace-special` handling).
- **Output directory auto-created.** `mkdir -p $outdir` runs up front and aborts
  on failure ([`scripts/cp-dicom:139-143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L139-L143)).

## Related Tools

- [[dicom-rename]] — companion helper that renames DICOMs in place by series + image number instead of sorting them into directories.
- [[mri_probedicom]] — reads the series (`--t 20 11`) and protocol (`--t 18 1030`) tags that `cp-dicom` groups on.
- [[dcmunpack]] — the full recursive multi-vendor importer; preferred when the input tree is nested or you also want conversion.
- [[wiki/tools/mri_convert|mri_convert]] — converts a chosen series directory to MGH/NIfTI.

## Confidence and Gaps

**High confidence:** the complete flag set (`-d`, `-o`, `-umask`, `-verbose`,
`-echo`, `-debug`, `-version`, `-help`), the per-series `protocol-series` /
`series` directory naming, the protocol sanitisation, the non-recursive `ls`
enumeration, the copy (not move) semantics, and the per-file series-tag guard —
all read directly from [`scripts/cp-dicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom) and confirmed against `-help`.

## References

- FreeSurfer source: [`scripts/cp-dicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom) (v8.2.0).
- Built-in help: `cp-dicom -help` (the `BEGINHELP` block,
  [`scripts/cp-dicom:171-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/cp-dicom#L171-L191)).
