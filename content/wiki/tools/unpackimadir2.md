---
title: "unpackimadir2"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tclsh
source_files:
  - "scripts/unpackimadir2"
families: []                     # standalone Siemens IMA import script
recon_all_stage: null
related:
  - "[[unpackimadir]]"
  - "[[mri_probe_ima]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[unpacksdcmdir]]"
  - "[[dcmunpack]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "COR / bshort / SPM / Analyze / MINC output correctness depends on mri_convert's IMA->format back ends; only the dispatch logic was read."
tags:
  - ima
  - siemens
  - conversion
  - import
  - fsfast
  - legacy
---

# unpackimadir2

## Summary

`unpackimadir2` unpacks a directory of Siemens **`.ima`** files (the older
Numaris file format that predates Siemens DICOM) into sorted, converted volumes.
It scans the directory, groups files into series/runs by parsing the
`base-run-image.ima` filename and probing each series leader with
[[mri_probe_ima]], prints a per-run summary, and for each selected run either
copies the `.ima` files or converts them with
[[wiki/tools/mri_convert|mri_convert]] into bshort, COR, SPM-Analyze, Analyze,
MINC, MGH, or NIfTI, sorted into an FS-FAST or generic hierarchy. It is the
`.ima` analogue of [[unpacksdcmdir]] and the direct, self-contained sibling of
[[unpackimadir]] (which instead routes through MINC).

## Source Information

- **Language:** Tcl (`#!/usr/bin/env tclsh`)
- **Source file:** [`scripts/unpackimadir2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2)
- **Binary/script location:** `$FREESURFER_HOME/bin/unpackimadir2`
- **Original author:** Douglas N. Greve, MGH-NMR Center
- **Key helpers invoked:** [`mri_probe_ima`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L666) (sequence name, dimensions, error flag, TR, voxel resolution, patient/study attrs) and [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1089) (conversion).

## Purpose and Context

Before Siemens scanners exported DICOM, the MGH center received data as `.ima`
files named `base-run-image.ima`. `unpackimadir2` turns such a directory into
analysis-ready volumes without converting to MINC first (unlike the older
[[unpackimadir]] route):

1. `ScanIMADir` globs `*.ima`, sorts by image number, detects run boundaries from
   the middle field of the filename, and for each new run probes the leader with
   [[mri_probe_ima]] for the sequence name, column/row/slice/frame counts, and an
   error flag ([`scripts/unpackimadir2:727-785`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L727-L785)).
2. It prints a per-run table (and, with `-scanonly`, writes it to a file).
3. For each run in the unpacking configuration it builds an output path, writes an
   FS-FAST `seq.info`, and either copies the `.ima` files or runs
   [[wiki/tools/mri_convert|mri_convert]].

It is run **by hand** as an import step and is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Bare `-src` prints the run list and exits
> The scan-mode variable starts at `2`, meaning "print the run summary to stdout
> and stop" ([`scripts/unpackimadir2:816`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L816), [`:893`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L893)).
> Supplying `-targ` flips it to `0` (scan **and** unpack); `-scanonly file` sets
> it to `1` (write the summary to `file` and stop). So `unpackimadir2 -src DIR`
> alone is the quickest way to list the runs.

## Inputs

### Required Inputs

- **A Siemens `.ima` source directory** — `-src srcdir`
  ([`scripts/unpackimadir2:294-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L294-L298)). Files must be named
  `base-run-image.ima`.
- **A target directory** — `-targ targdir` (required to unpack;
  [`:300-305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L300-L305)).
- **Unpacking rules** (to unpack) — `-run`, `-cfg`, or `-seqcfg`
  ([`:384-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L384-L388)).

### Input Assumptions

> [!assumption] Single-session Siemens `.ima`, strict filename format
> Files must end in `.ima` and split into exactly three dash-delimited parts
> `base-run-image` ([`scripts/unpackimadir2:618-651`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L618-L651)). All files in
> the directory must share the same `base`; a second base is a fatal error
> ([`:753-756`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L753-L756)). The directory is globbed flat (no recursion).

## Outputs

### Output Hierarchy

For each run ([`scripts/unpackimadir2:1019-1047`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1019-L1047)):

| Sort method | Path pattern |
|-------------|--------------|
| **FS-FAST** (default) | `targdir/subdir/RRR/name.ext` |
| **generic** | `targdir/subdir/name.ext` (seq-based: `nameXXX.ext`) |

`RRR` is the 3-digit zero-padded run number; `ext` is set per format (`.mgh`,
`.mnc`, `.nii`, `.img`, …).

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| converted volume(s) (`name.ext`, `f_000.bshort`, …) | output hierarchy | the unpacked data ([`:1032-1047`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1032-L1047)) |
| `unpack.log` | `targdir/` | command, environment, and per-run conversion log ([`:912-923`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L912-L923)) |
| `<scanfile>` | `-scanonly` path (or `targdir/scan.info`) | per-run summary table ([`:367`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L367), [`:882-888`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L882-L888)) |
| `seq.info` | `targdir/subdir/` | FS-FAST sequence info (dims, pixel sizes, TR/#TRs); FS-FAST sorting only ([`:1057-1075`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1057-L1075)) |
| `Name.imaheader.dump` | output run dir | `mri_probe_ima` header dump for the run ([`:1048`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1048), [`:1099`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1099)) |
| `session.info` | `targdir/` | patient name, DOB, gender, study date; FS-FAST sorting only ([`:1117-1134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1117-L1134)) |

### Output Specifications

Legal formats (case-insensitive), validated in `CheckUnpackCfgFormat`
([`scripts/unpackimadir2:557-564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L557-L564)): `bshort`, `cor`, `spm`,
`analyze`, `minc`, `ima`, `mgh`, `nii`. For `ima` the files are copied unchanged;
all other formats are produced by [[wiki/tools/mri_convert|mri_convert]].

> [!gotcha] Scan summary column order
> The printed/`-scanonly` table is `run  sequence  ncols  nrows  nslices
> nframes  errorflag  firstfile` ([`scripts/unpackimadir2:886-888`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L886-L888)).
> The help's prose labels columns 3–4 "columns, rows", consistent with the code;
> the error flag (`1` = something wrong, run skipped) is column 7, just before the
> filename.

> [!gotcha] MINC orientation is wrong
> Both help and code warn MINC output is mis-oriented and "does not convert
> properly to MINC yet" ([`scripts/unpackimadir2:570-575`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L570-L575)).

## Mathematical Foundations

`unpackimadir2` is a **dispatcher**: it groups `.ima` files into runs and delegates
conversion to [[wiki/tools/mri_convert|mri_convert]]. It performs no image
arithmetic. Sequence name, dimensions, TR, and voxel resolution are read straight
from the IMA header via [[mri_probe_ima]] (`--attr pulseseq/voldim/nframes/tr/
volres`, [`scripts/unpackimadir2:666-684`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L666-L684), [`:1050-1054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1050-L1054))
and copied into `seq.info`.

> [!internal] IMA decoding lives in [[mri_probe_ima]] / [[wiki/tools/mri_convert|mri_convert]]
> All parsing of the Siemens IMA header and the voxel geometry is done by those
> tools, not by this script.

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/unpackimadir2:292-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L292-L350)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-src` | string | *(required)* | Source directory of `.ima` files (`base-run-image.ima`; flat, not recursive). |
| `-targ` | string | *(required to unpack)* | Parent target directory; supplying it enables unpacking. |
| `-run` | `runno subdir format name` | — | Command-line unpacking rule for one run. Repeatable. Mutually exclusive with `-cfg`. |
| `-cfg` | string (file) | — | Read run-based rules from a file (one `runno subdir format name` per line; `#` comments allowed). Mutually exclusive with `-run` and `-seqcfg`. |
| `-seqcfg` | string (file) | — | Sequence-based rules: each line `seqname subdir format name`, matched against the IMA pulse-sequence name. Mutually exclusive with `-cfg`. |
| `-scanonly` | string (file) | (off; bare `-src` prints to stdout) | Write the per-run summary to this file and exit without unpacking. |
| `-fsfast` | bool | **on** | Sort into the FS-FAST hierarchy (`subdir/RRR/`); also writes `seq.info` and `session.info`. |
| `-generic` | bool | off | Sort generically (`subdir/`); seq-based names get the run number appended. |
| `-nspmzeropad` | int | `3` | Zero-padding width of the frame number in SPM-Analyze filenames. |
| `-noexec` | bool | off | Dry run: scan and build paths but do not copy files or call `mri_convert`. |
| `-help` | bool | — | Print full help and exit. |

> [!contradiction] `nii` accepted by code but omitted from the help's format list
> `CheckUnpackCfgFormat` accepts `nii` and the unpack loop builds a `.nii` path
> ([`scripts/unpackimadir2:564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L564), [`:1043-1044`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1043-L1044)), but the
> help's "Legal formats" list stops at MGH. Code is authoritative — `nii` works.

### Configuration Interactions

> [!gotcha] `-run` / `-cfg` / `-seqcfg` are mutually exclusive
> `-cfg` cannot be combined with command-line `-run`
> ([`scripts/unpackimadir2:374-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L374-L377)) or with `-seqcfg`
> ([`:379-382`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L379-L382)). Use exactly one rule source.

> [!gotcha] `-targ` quietly switches from "list runs" to "unpack"
> Passing `-targ` sets the scan-mode flag to `0` during parsing
> ([`scripts/unpackimadir2:304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L304)), so the run summary is written to
> `targdir/scan.info` and the directory is unpacked. To only inspect, omit `-targ`
> (or use `-scanonly`).

> [!gotcha] Sequence-based config: unmatched sequence is fatal here
> Unlike [[unpacksdcmdir]] (which skips unmatched protocols), `GetSeqUnpackCfg` in
> `unpackimadir2` **exits with an error** if a session sequence is not in the
> seqcfg file ([`scripts/unpackimadir2:488-498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L488-L498)). The help warns that
> all non-scout sequences must be represented in the config. Scouts are skipped
> before matching ([`:934-938`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L934-L938)).

Other interactions:

- `-generic` only changes SPM/Analyze/MINC/MGH/bshort seq-based names (run number
  appended); `cor` seq-based names become just the zero-padded run number
  ([`:945-954`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L945-L954)).
- For `ima` and `cor` formats the `name` field is ignored (placeholder required);
  for `bshort` the name is the stem.
- Duplicate run numbers produce an INFO message but are not fatal
  ([`:526-531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L526-L531)).

## Typical Use Cases

### 1. List the runs in an IMA directory

```bash
# Bare -src prints the per-run table and exits.
unpackimadir2 -src /space/imadir
#   1  scout_3T22cm 256 256   1   1 0 208-1-1.ima
#   3  mpr_ns_t1_4b130_nostd 256 256 128 1 0 208-3-5.ima
#   ...
```

### 2. Unpack functionals to bshort (FS-FAST)

```bash
unpackimadir2 -src /space/imadir -targ /space/mydata -fsfast \
  -run 4 t1epi bshort f \
  -run 6 bold  bshort f
# -> /space/mydata/t1epi/004/, /space/mydata/bold/006/
```

### 3. Unpack an anatomical to mgh, generic layout

```bash
unpackimadir2 -src /space/imadir -targ /space/mydata -generic \
  -run 3 mpr mgh mprage
# -> /space/mydata/mpr/mprage.mgh
```

### 4. Sequence-based unpack to Analyze

```bash
# Every non-scout sequence must appear in myseqcfg (seqname subdir format name).
unpackimadir2 -src /space/imadir -targ /space/mydata -generic -seqcfg myseqcfg
```

## Pipeline Context

`unpackimadir2` is a stand-alone **import** tool, not called by
[[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** Siemens `.ima` session → **unpackimadir2** → **Successors:**
[[wiki/pipelines/recon-all|recon-all]] (anatomical) or FS-FAST (functional).

It is the IMA counterpart of [[unpacksdcmdir]] (which does the same for Siemens
DICOM). The older [[unpackimadir]] converts IMA→MINC→sessions via external MINC
tools; `unpackimadir2` converts IMA directly with
[[wiki/tools/mri_convert|mri_convert]] and is the more self-contained route. For
modern data, prefer the DICOM workflow with [[dcmunpack]].

## Gotchas and Caveats

> [!gotcha] Scouts are always skipped
> Any sequence whose name contains the substring `scout` is skipped during both
> seq-config build and the unpack loop ([`scripts/unpackimadir2:934-938`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L934-L938),
> [`:1013-1017`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1013-L1017)). There is no flag to keep them.

> [!gotcha] Runs flagged with an error are skipped
> If `mri_probe_ima --attr error` returns true for a run (likely aborted), the run
> is skipped during unpacking ([`scripts/unpackimadir2:1003-1007`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1003-L1007)).

> [!gotcha] Strict three-part filename
> A `.ima` file that does not split into exactly `base-run-image` aborts the scan
> ([`scripts/unpackimadir2:640-643`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L640-L643)), and all files must share one
> `base` ([`:753-756`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L753-L756)).

> [!gotcha] `session.info` reads from the last run's IMA file
> After the unpack loop, FS-FAST `session.info` is populated by probing
> `$IMAFile`, which is left pointing at the **last** processed run
> ([`scripts/unpackimadir2:1117-1134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1117-L1134)). Patient-level attributes are
> session-wide so this is normally harmless.

## Error Compensation and Guard Rails

- **Aborted-run skipping.** Runs with the IMA error flag set are dropped
  ([`scripts/unpackimadir2:1003-1007`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1003-L1007)).
- **Scout skipping.** Sequences containing `scout` are excluded
  ([`:1013-1017`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1013-L1017)).
- **Config validation.** Run numbers must be ≥ 1 and exist in the session, and
  formats must be legal, before any conversion
  ([`:500-580`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L500-L580), [`:583-616`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L583-L616)).
- **Hard abort on conversion failure.** A failed `mri_convert` exits the whole job
  ([`:1093-1098`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L1093-L1098)).

## Related Tools

- [[unpackimadir]] — older IMA unpacker that converts via MINC (IMA→MINC→sessions); see its page for the MINC-toolchain caveat.
- [[mri_probe_ima]] — reads sequence name, dimensions, error flag, TR, voxel resolution, and patient attrs from each `.ima` leader.
- [[wiki/tools/mri_convert|mri_convert]] — performs the per-run conversion.
- [[unpacksdcmdir]] — the Siemens **DICOM** equivalent of this tool.
- [[dcmunpack]] — the modern multi-vendor DICOM unpacker for current data.

## Confidence and Gaps

**High confidence:** the three scan modes, the filename-based run detection, the
complete flag set and mutual-exclusion rules, the FS-FAST/generic hierarchy,
scout/error skipping, the fatal-vs-skip difference from [[unpacksdcmdir]] on
unmatched sequences, and the `nii` format discrepancy — all read directly from
[`scripts/unpackimadir2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2).

> [!gap] Per-format converter behaviour
> Correctness of COR/bshort/SPM/Analyze/MINC output depends on
> [[wiki/tools/mri_convert|mri_convert]]'s IMA-input back ends; only the dispatch
> logic here was read. The help warns MINC is mis-oriented.

## References

- FreeSurfer source: [`scripts/unpackimadir2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2) (v8.2.0).
- Built-in help: `unpackimadir2 -help` (the `HelpExit` block, [`scripts/unpackimadir2:27-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackimadir2#L27-L278)).
- Companion sequence-config file historically shipped as `$FREESURFER_HOME/scanseq.unpackcfg`.
