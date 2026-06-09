---
title: "unpacksdcmdir"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tclsh
source_files:
  - "scripts/unpacksdcmdir"
families: []                     # standalone Siemens DICOM import script
recon_all_stage: null
related:
  - "[[dcmunpack]]"
  - "[[mri_parse_sdcmdir]]"
  - "[[mri_probedicom]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[dcmdir-info-mgh]]"
  - "[[dcmsplit]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "FIPS / fips-set XML path described from the script only; the BIRN/FIPS toolchain may not be installed."
  - "COR / bshort / SPM / Analyze / MINC output paths rely on mri_convert format support; only the dispatch logic was read, not each converter back end."
tags:
  - dicom
  - siemens
  - conversion
  - import
  - fsfast
  - legacy
---

# unpacksdcmdir

## Summary

`unpacksdcmdir` is the legacy Siemens **DICOM** directory unpacker. Given a
directory of Siemens DICOM files from a single scanning session, it scans the
directory into series/runs (delegating to [[mri_parse_sdcmdir]]), prints a
per-series summary, and — for each run the user selects — either copies the raw
DICOM files or converts them with [[wiki/tools/mri_convert|mri_convert]] into one
of several output formats (DICOM, COR, bshort, MINC, Analyze, SPM-Analyze, NIfTI,
MGH, MGZ), sorted into an FS-FAST or generic directory hierarchy. It is the
predecessor of the multi-vendor [[dcmunpack]], which supersedes it for v8 and
accepts most of the same arguments.

## Source Information

- **Language:** Tcl (`#!/usr/bin/env tclsh`)
- **Source file:** [`scripts/unpacksdcmdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir)
- **Binary/script location:** `$FREESURFER_HOME/bin/unpacksdcmdir`
- **Original author:** Douglas N. Greve, MGH-NMR Center
- **Key helpers invoked:** [`mri_parse_sdcmdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L977) (directory scan / series sort), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1364) (conversion, with bundled `dcm2niix`), [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L804) (pixel-spacing / slice-thickness / series-description probing), and `fips-set` (FIPS XML, optional).

## Purpose and Context

A Siemens scanning session arrives as a flat directory of DICOM files in which
the assignment of each file to a logical acquisition (series/run) lives only in
the header tags. `unpacksdcmdir` automates turning that directory into
analysis-ready volumes:

1. It scans the source directory with [`mri_parse_sdcmdir --sortbyrun`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L976-L977), which writes a per-file summary
   (`dicomdir.sumfile`) and a percent-complete status file that the script polls
   to print a progress bar.
2. It reads the summary, identifies **series leaders** (the first file of each
   series number), and prints one line per series: number, protocol, error
   status, dimensions, frame count, and the first DICOM file.
3. For each run named in the unpacking configuration, it builds an output path,
   optionally writes an `seq.info` (FS-FAST) and a `Name-infodump.dat` header
   dump, and then either copies the DICOM files or runs
   [[wiki/tools/mri_convert|mri_convert]] to produce the converted volume.

It is run **by hand** as an import step; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]] (no reference exists in `recon-all` or
`trac-all`). It sits one step upstream: it produces the anatomical/functional
volumes later fed to `recon-all -i …`, to FS-FAST, or to [[dt_recon]].

> [!gotcha] Superseded by [[dcmunpack]]
> `unpacksdcmdir` is Siemens-only, does **not** search subdirectories, and emits
> SPM-style 3D series and the old MGH formats (COR, bshort). [[dcmunpack]] is the
> general successor: it searches recursively, handles GE and Philips as well as
> Siemens, and accepts most of these flags — but it drops `-cfg`, `-seqcfg`,
> `-nspmzeropad`, `-no-unpackerr`, and does not produce SPM/COR output. Prefer
> [[dcmunpack]] for new work; use `unpacksdcmdir` only to reproduce a legacy
> pipeline or to get COR/SPM/bshort output.

> [!gotcha] Almost always run twice
> The series numbers are unknown until the directory is scanned. The normal
> workflow is: run once with `-scanonly` (or just `-src`/`-targ` and read the
> printed summary) to get the series list, then run again with one `-run` per
> series you want to keep.

## Inputs

### Required Inputs

- **A Siemens DICOM source directory** — `-src srcdir`
  ([`scripts/unpacksdcmdir:381-385`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L381-L385)). Must exist
  ([`:909`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L909)). It is assumed to hold the files of **one and only one**
  scanning session; the directory is **not** searched recursively.
- **A target directory** — `-targ targdir`
  ([`scripts/unpacksdcmdir:387-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L387-L391)). Always required, even for
  `-scanonly` (its parent must be writable, [`:914-925`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L914-L925)).
- **Unpacking rules** (unless `-scanonly`) — supplied as `-run`, `-cfg`, or
  `-seqcfg`. At least one is required ([`:522-526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L522-L526)).

### Input Assumptions

> [!assumption] Single-session Siemens DICOM, flat directory
> The source is assumed to contain Siemens DICOM files from exactly one session,
> all in one directory (no recursion). Files must adhere to Siemens conventions
> that `mri_parse_sdcmdir` can parse; the help notes it "is not guaranteed to
> work on all Siemens DICOM files" and that the pulse-sequence programmer is
> responsible for conformant output. The `dicomdir` index file sometimes present
> on a CD is *not* the directory of DICOM images and must not be passed as
> `-src`.

If multiple subjects or studies are mixed in one folder, the scan will be wrong;
run [[dcmsplit]] first to separate them by Study UID, then unpack each folder.

## Outputs

### Output Hierarchy

For each run, the output path depends on the sort method and format
([`scripts/unpacksdcmdir:1222-1249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1222-L1249)):

| Sort method | Config | Path pattern |
|-------------|--------|--------------|
| **FS-FAST** (default) | run-based | `targdir/subdir/RRR/name.ext` |
| **FS-FAST** | seq-based | `targdir/subdir/RRR/name.ext` |
| **generic** | run-based | `targdir/subdir/name.ext` |
| **generic** | seq-based | `targdir/subdir/nameXXX.ext` |

where `RRR` is the 3-digit zero-padded run/series number
([`printf %03d`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1223)) and `ext` comes from the format.

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| converted volume(s) (`name.ext`, `f_000.bshort`, `NameXXX.img`, …) | output hierarchy above | the unpacked data; exact naming depends on format ([`:1230-1249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1230-L1249)) |
| `unpack.log` | `targdir/` | full command, environment, scan log, and per-run conversion log (default log path, [`:934-936`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L934-L936); override with `-log`) |
| `dicomdir.sumfile` | `targdir/` | one line per DICOM file with its series number and parameters (written by `mri_parse_sdcmdir`, [`:958`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L958)) |
| `parse.status` | `targdir/` | transient percent-complete file, polled during the scan and then deleted ([`:960`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L960), [`:1026`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1026)) |
| `<scanfile>` | path given to `-scanonly` | per-series summary (one line per series leader, [`:1094-1097`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1094-L1097)) |
| `seq.info` | `targdir/subdir/` | FS-FAST sequence info (protocol, dims, pixel sizes, TR/#TRs for multi-frame runs); written only for FS-FAST sorting ([`:1313-1330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1313-L1330)) |
| `Name-infodump.dat` | output run dir | `mri_probedicom` header dump of a representative file; on by default for FS-FAST, opt-in (`-infodump`) for generic ([`:1332-1342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1332-L1342)) |
| `flf` | output run dir | the per-run DICOM file list passed to `mri_convert --sdcmlist` ([`:1349-1352`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1349-L1352)) |
| `fips-process.xml` | output run dir | FIPS processing descriptor (only with `-fips`, [`:1397-1405`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1397-L1405)) |

### Output Specifications

Legal formats (case-insensitive) are validated in `CheckUnpackCfgFormat`
([`scripts/unpacksdcmdir:709-718`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L709-L718)): `bshort`, `bfloat`, `cor`,
`spm`, `analyze`, `minc`, `dicom`, `nii`, `mgz`, `mgh`. All geometry, datatype,
and orientation handling is delegated to
[[wiki/tools/mri_convert|mri_convert]]; for `dicom` the files are byte-copied
unchanged.

> [!gotcha] MINC orientation is wrong
> The help and code both warn that MINC output is incorrectly oriented
> ([`scripts/unpacksdcmdir:726-731`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L726-L731): "does not convert
> properly to MINC yet"). Do not rely on the `minc` format here.

The scanonly / summary table has columns: run/series number, protocol, error
status (`ok`/`err`), #columns, #rows, #slices, #frames, first DICOM file
([`scripts/unpacksdcmdir:1085`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1085)).

## Mathematical Foundations

`unpacksdcmdir` is a **dispatcher**: it sorts DICOM files into series and hands
each series to [[wiki/tools/mri_convert|mri_convert]]. It performs no image
arithmetic of its own. The only numeric work it does directly is reading pixel
spacing and slice thickness from DICOM tags to populate the FS-FAST `seq.info`:

> [!math] Voxel resolution from DICOM tags
> `GetVolRes` reads **Pixel Spacing** (tag `0028,0030`, "ColRes\RowRes") and the
> **slice resolution** from **Spacing Between Slices** (tag `0018,0088`), falling
> back to **Slice Thickness** (tag `0018,0050`) if `0018,0088` is absent
> ([`scripts/unpacksdcmdir:798-828`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L798-L828)). These become
> `colpixelsize`/`rowpixelsize`/`slcpixelsize` in `seq.info`.

> [!internal] Geometry and rescaling live in the DICOM reader
> The vox2ras construction, intensity rescaling, and any DWI handling happen
> inside [[wiki/tools/mri_convert|mri_convert]] and the FreeSurfer DICOM I/O
> library, not in this script.

The help also notes two algorithmic caveats: TR is computed incorrectly when
there is a temporal gap between volumes, and the tool fails on "supermosaics"
([`scripts/unpacksdcmdir:337-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L337-L340)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/unpacksdcmdir:379-494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L379-L494)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src` | string | *(required)* | Source directory of Siemens DICOM files (one session, not searched recursively). |
| `-targ` | string | *(required)* | Parent (target) directory into which runs are unpacked; created if absent. |
| `-run` | `runno subdir format name` | — | Command-line unpacking rule for one run: series number, output subdirectory, output format, base name. Repeatable. Mutually exclusive with `-cfg` and with `-fips-run`. |
| `-cfg` | string (file) | — | Read run-based unpacking rules from a file (one `runno subdir format name` per line). Mutually exclusive with `-run` and `-seqcfg`. |
| `-seqcfg` | string (file) | — | Pulse-sequence-based rules: each line is `protocol subdir format name`, matched against DICOM protocol tag `0018,1030`. Unmatched protocols are skipped. Mutually exclusive with `-cfg`. |
| `-scanonly` | string (file) | off | Only scan; write the per-series summary to this file and exit without converting (rules not required). |
| `-fsfast` | bool | **on** | Sort into the FS-FAST hierarchy (`subdir/RRR/`). Forces `-infodump` on. |
| `-generic` | bool | off | Sort generically (`subdir/`); seq-based runs get the run number appended to the name. |
| `-infodump`<br>`-noinfodump` | bool | on (FS-FAST) | Write / suppress the per-run `Name-infodump.dat` header dump. |
| `-nspmzeropad` | int | `3` | Zero-padding width of the frame number in SPM-Analyze filenames (`NameXXX.img`). |
| `-skip-moco`<br>`-no-skip-moco` | bool | off | Skip runs whose Series Description (tag `0008,103e`) is exactly `MoCoSeries` (Siemens motion-corrected series). |
| `-unpackerr`<br>`-no-unpackerr` | bool | unpack-err **on** | Whether to attempt runs flagged `err` (incomplete/aborted). On = try anyway; `-no-unpackerr` skips them. |
| `-dcm2niix` | bool | **on** (since 2023-03-27) | Make `mri_convert` use the bundled dcm2niix engine (forwards `--dcm2niix` downstream). |
| `-no-dcm2niix` | bool | — | Make `mri_convert` use the native FreeSurfer DICOM reader (forwards `--no-dcm2niix` downstream). |
| `-log` | string | `targdir/unpack.log` | Explicit log-file path. |
| `-noexec` | bool | off | Dry run: do everything except actually copy files or call `mri_convert`/`fips-set`. |
| `-fips` | `Project Site BIRNID VisitNo` | — | Enable FIPS mode and supply the BIRN session identifiers. |
| `-fips-run` | `RunNo Paradigm` | — | FIPS analogue of `-run`: subdir=Paradigm, format=dicom, run auto-numbered. Mutually exclusive with `-run`. |
| `-help` | bool | — | Print full help and exit. |

> [!contradiction] `bfloat` accepted by code but absent from help
> `CheckUnpackCfgFormat` accepts `bfloat` ([`scripts/unpacksdcmdir:710`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L710))
> and the unpack loop builds a `Name_000.bfloat` path
> ([`:1232-1233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1232-L1233)), but the help "Legal formats" list omits
> `bfloat`. Code is authoritative — `bfloat` is valid.

> [!contradiction] `-skip-moco` / `-no-skip-moco` undocumented
> These flags are fully implemented ([`scripts/unpacksdcmdir:482-483`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L482-L483),
> [`:1272-1283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1272-L1283)) but appear neither in `PrintUsage` nor in
> the help text. They are real and usable.

### Configuration Interactions

> [!gotcha] Run-specification flags are mutually exclusive
> `-cfg` and command-line `-run` cannot be combined
> ([`scripts/unpacksdcmdir:517-520`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L517-L520)); `-cfg` and `-seqcfg`
> cannot be combined ([`:528-531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L528-L531)); and `-run` and
> `-fips-run` are rejected against each other during parsing
> ([`:394-399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L394-L399), [`:408-413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L408-L413)). Choose exactly one
> rule source. (`-run` + `-seqcfg` is **not** explicitly blocked, but `-seqcfg`
> overwrites the config — avoid mixing them.)

> [!gotcha] `-fsfast` silently re-enables the info dump
> Selecting FS-FAST sorting forces `DoInfoDump=1`
> ([`scripts/unpacksdcmdir:926-928`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L926-L928)), overriding an earlier
> `-noinfodump`. To suppress the dump you must use generic sorting (the dump is
> off by default there).

Other interactions:

- `-scanonly` makes the unpacking rules optional and exits right after writing
  the summary ([`:1130-1133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1130-L1133)); `-src` and `-targ` are still
  required.
- `-generic` only changes the SPM/Analyze/MINC/MGH/bshort/bfloat seq-based names
  (run number appended); `cor` seq-based names become just the zero-padded run
  number ([`:1160-1170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1160-L1170)).
- For `dicom` and `cor` formats the `name` field is ignored (a placeholder is
  still required); for `bshort` the name is the stem (set it to `f` for FS-FAST).
- Duplicate run numbers in the config produce an **INFO** message but are **not**
  fatal ([`:677-683`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L677-L683)).

## Typical Use Cases

### 1. Scan a Siemens directory to see what is in it

```bash
# Write the per-series summary; rules are not needed with -scanonly.
unpacksdcmdir -src /space/dicomdir -targ /space/mydata -scanonly mysummary.txt
```

Produces lines like `5  T1ep2dHighRes  ok  256 256  21   1 6139499` — series
number, protocol, status, cols, rows, slices, frames, first file.

### 2. Unpack functionals to bshort in an FS-FAST hierarchy

```bash
unpacksdcmdir -src /space/dicomdir -targ /space/mydata -fsfast \
  -run 5 t1epi bshort f \
  -run 8 bold  bshort f
# -> /space/mydata/t1epi/005/f_*.bshort, /space/mydata/bold/008/f_*.bshort
```

### 3. Unpack an MPRAGE to mgz for recon-all

```bash
unpacksdcmdir -src /space/dicomdir -targ /space/mydata -generic \
  -run 2 anat mgz mprage.mgz
recon-all -s sub01 -i /space/mydata/anat/mprage.mgz -all
```

### 4. Config-file driven unpack

```bash
# mycfgfile:
#   2 3danat COR    blah
#   7 bold   bshort f
#   8 bold   bshort f
unpacksdcmdir -src /space/dicomdir -targ /space/mydata -fsfast -cfg mycfgfile
```

### 5. Sequence-based unpack (protocol-driven)

```bash
# Match by protocol name (tag 0018,1030); one line "protocol subdir format name".
unpacksdcmdir -src /space/dicomdir -targ /space/mydata -generic \
  -seqcfg $FREESURFER_HOME/numaris4-protocols.unpackcfg
```

## Pipeline Context

`unpacksdcmdir` is a stand-alone **import** tool. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** raw Siemens DICOM (optionally pre-split by [[dcmsplit]]) →
**unpacksdcmdir** → **Successors:** [[wiki/pipelines/recon-all|recon-all]]
(anatomical), FS-FAST (functional), or [[dt_recon]] (diffusion).

Internally it calls [[mri_parse_sdcmdir]] for the scan,
[[wiki/tools/mri_convert|mri_convert]] for conversion, and [[mri_probedicom]] for
metadata. For quick inventorying of a properly named MGH-archive directory,
[[dcmdir-info-mgh]] is faster. For the modern, multi-vendor replacement, use
[[dcmunpack]].

## Gotchas and Caveats

> [!gotcha] No recursive search
> Unlike [[dcmunpack]], the source directory is scanned flat. If your DICOMs are
> in per-series subdirectories (typical GE layout), this tool will not find them.

> [!gotcha] `-scanonly` still requires `-targ`
> Even though nothing is converted, the target directory's parent must be
> writable and the directory is created, because the summary file and the
> transient `dicomdir.sumfile`/`parse.status` are written there
> ([`scripts/unpacksdcmdir:957-960`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L957-L960)).

> [!gotcha] Scan timeout of 20 s on status-file creation
> The script waits up to 20 seconds for `mri_parse_sdcmdir` to create the status
> file and aborts if it does not appear
> ([`scripts/unpacksdcmdir:982-993`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L982-L993)). On very large or slow
> network filesystems this can spuriously fail before the scan even starts.

> [!gotcha] Protocol white space stripped for `-seqcfg` matching
> Protocol names in tag `0018,1030` may contain spaces; these are stripped before
> matching against the seqcfg file, so the protocol names in your config file
> must also have no white space ([`scripts/unpacksdcmdir:344-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L344-L349)).

> [!gotcha] An unrecognised protocol in `-seqcfg` is silently skipped
> `GetSeqUnpackCfg` prints an INFO line and returns `skip` rather than erroring
> ([`scripts/unpacksdcmdir:597-608`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L597-L608)), so a typo in a protocol name
> just drops that series from the output.

## Error Compensation and Guard Rails

- **Incomplete-run handling.** Runs that `mri_parse_sdcmdir` flagged `err`
  (likely aborted) are still unpacked by default, with an INFO warning
  ([`scripts/unpacksdcmdir:1260-1263`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1260-L1263)); `-no-unpackerr` skips them.
- **MoCo skipping.** With `-skip-moco`, series whose description is exactly
  `MoCoSeries` are dropped ([`:1272-1283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1272-L1283)).
- **Existence checks.** The source directory, the target parent's writability,
  and each series' first DICOM file are all checked, with a specific
  network-trouble message if the source disappears mid-run
  ([`:1112-1125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1112-L1125)).
- **Hard abort on conversion failure.** A failed `mri_convert` aborts the entire
  job with exit 1 ([`:1368-1373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1368-L1373)); there is no
  continue-on-error option (contrast [[dcmunpack]]'s `-no-exit-on-error`).
- **Summary format guard.** Each summary line must have exactly 13 fields or the
  script errors ([`:1060-1068`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1060-L1068)), guarding against a malformed
  `mri_parse_sdcmdir` output.

## Related Tools

- [[dcmunpack]] — the modern, multi-vendor successor; recursive, handles GE/Philips, accepts most of these flags.
- [[mri_parse_sdcmdir]] — does the actual Siemens directory scan / series sort (`--sortbyrun`) that this script drives.
- [[wiki/tools/mri_convert|mri_convert]] — the converter invoked once per run (with bundled `dcm2niix`).
- [[mri_probedicom]] — reads pixel spacing, slice thickness, and series description for the per-run info dump.
- [[dcmsplit]] — run first if multiple subjects/studies are mixed in one folder.
- [[dcmdir-info-mgh]] — faster series summary for MGH-archive (`NNNNNN-S-MMMMM.dcm`) naming.
- [[dt_recon]] — typical downstream consumer of unpacked diffusion volumes.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, mutual-exclusion rules,
the FS-FAST/generic output hierarchy, the scan→summary→unpack workflow, MoCo and
error-run handling, the MINC orientation caveat, and the `bfloat`/`-skip-moco`
discrepancies — all read directly from
[`scripts/unpacksdcmdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir).

> [!gap] FIPS path not exercised
> The `-fips`/`-fips-run` branch drives `fips-set` to emit `fips-process.xml`
> ([`scripts/unpacksdcmdir:1393-1413`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L1393-L1413)); it is described from the
> script alone, and the BIRN/FIPS toolchain may not be present in current
> installs.

> [!gap] Per-format converter behaviour
> COR/bshort/SPM/Analyze/MINC output correctness depends on
> [[wiki/tools/mri_convert|mri_convert]]'s support for those output types; only
> the dispatch logic here was read, not each back end. The help warns MINC is
> mis-oriented and supermosaics fail.

## References

- FreeSurfer source: [`scripts/unpacksdcmdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir) (v8.2.0).
- Built-in help: `unpacksdcmdir -help` (the `HelpExit` block, [`scripts/unpacksdcmdir:34-363`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpacksdcmdir#L34-L363)).
- Companion sequence-config file historically shipped as `$FREESURFER_HOME/numaris4-protocols.unpackcfg` (not present in the v8.2.0 install inspected).
