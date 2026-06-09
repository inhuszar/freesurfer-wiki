---
title: "minc2seqinfo"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/minc2seqinfo"
families: []                     # legacy MINC / Sessions-database helper
recon_all_stage: null
related:
  - "[[cor_to_minc]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_probedicom]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Downstream consumers of seq.info beyond unpackmincdir / the FSFAST Sessions Database are not documented in the v8.2.0 tree; the file is a legacy FSFAST artefact."
tags:
  - minc
  - fsfast
  - metadata
  - legacy
---

# minc2seqinfo

## Summary

`minc2seqinfo` reads acquisition metadata out of a MINC (`.mnc`) file and writes
it as a small tag-value `seq.info` text file (the per-run sequence-info file used
by the legacy FreeSurfer/FSFAST "Sessions Database"). It uses the MNI MINC
toolkit's `mincinfo` to pull the scanning-sequence name and the size and voxel
step of each spatial dimension, plus — if the volume has a leading `time`
dimension — the number of TRs and the TR. The result is printed to stdout, or
written to a named file if a second argument is supplied.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/minc2seqinfo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/minc2seqinfo`
- **Key helper invoked:** `mincinfo` — the MNI MINC toolkit query tool (bundled under `$FREESURFER_HOME/mni/bin`), called repeatedly for `-attvalue`, `-dimnames`, and `-dimlength` ([`scripts/minc2seqinfo:57-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L57-L78)).

## Purpose and Context

In the original FSFAST functional-MRI workflow, raw scanner data was first
converted to MINC and then unpacked into a session directory; each functional run
needed a small `seq.info` descriptor recording its matrix size, voxel sizes, and
timing so the Sessions Database knew how to interpret the data.
`minc2seqinfo` produces exactly that descriptor from a MINC file's header.

It is a **legacy** helper tied to the MINC era of FreeSurfer/FSFAST. Its one
in-tree caller is [`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L334), which runs
`minc2seqinfo $f | tee $seqinfofile` while unpacking a MINC directory into a
session tree. It is **not** part of [[wiki/pipelines/recon-all|recon-all]]. Modern
DICOM-based pipelines obtain equivalent information directly from DICOM headers
(via [[mri_probedicom]] / [[dcmunpack]]) and rarely touch MINC, so `minc2seqinfo`
is mainly of historical and MINC-archive interest.

## Inputs

### Required Inputs

- **`mincfile`** — positional argument 1 (required): the MINC volume to read.
  Existence is checked; a missing file aborts
  ([`scripts/minc2seqinfo:51-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L51-L54)).
- **`seqinfofile`** — positional argument 2 (optional): destination path for the
  `seq.info` output. If omitted, the descriptor is printed to stdout.

### Input Assumptions

> [!assumption] A MINC file with standard sequence/dimension attributes
> The volume must expose the MINC attributes `acquisition:scanning_sequence` and,
> per spatial dimension, `<dim>:step`, and (for time series) `time:step`. The
> script assumes there are at least **three** spatial dimensions and indexes them
> as slice/row/column in that order (`vdim[1]`=slices, `vdim[2]`=rows,
> `vdim[3]`=columns), [`scripts/minc2seqinfo:91-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L91-L96). A leading `time`
> dimension is detected by name and treated specially; if present it is consumed
> first so the remaining three are the spatial axes
> ([`scripts/minc2seqinfo:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L65-L69)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `seqinfofile` (arg 2) | user-specified | the `seq.info` tag-value descriptor (only when arg 2 is given; its directory is `mkdir -p`'d and the file is truncated first) |
| *(stdout)* | — | the same descriptor printed to the terminal when arg 2 is omitted |

### Output Specifications

The output is a flat tag-value text file. Field meanings and the MINC source of
each value:

| Field | Value | Source |
|-------|-------|--------|
| `sequencename` | scanning-sequence name (basename of the attribute) | `acquisition:scanning_sequence` |
| `nrows` | number of rows | `dimlength` of the 2nd spatial dim |
| `ncols` | number of columns | `dimlength` of the 3rd spatial dim |
| `nslcs` | number of slices | `dimlength` of the 1st spatial dim |
| `rowpixelsize` | row voxel size (mm) | `\|step\|` of the 2nd spatial dim |
| `colpixelsize` | column voxel size (mm) | `\|step\|` of the 3rd spatial dim |
| `slcpixelsize` | slice voxel size (mm) | `\|step\|` of the 1st spatial dim |
| `ntrs` | number of time points *(only if a `time` dim exists)* | `dimlength time` |
| `TR` | repetition time *(only if a `time` dim exists)* | `time:step` |

If the volume has no `time` dimension, the `ntrs` and `TR` lines are omitted
([`scripts/minc2seqinfo:97-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L97-L100)). Example output for a 64×64×16, 100-TR EPI
series is reproduced verbatim in the script header
([`scripts/minc2seqinfo:15-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L15-L25)).

## Mathematical Foundations

> [!math] Voxel size is the absolute value of the MINC step
> MINC stores each dimension's voxel spacing as a signed `step` (the sign encodes
> direction). `minc2seqinfo` reports the magnitude, computed as
> $|\text{step}| = \sqrt{\text{step}^2}$ via `bc`
> ([`scripts/minc2seqinfo:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L79)). This guards against negative steps producing
> negative pixel sizes. No other computation is performed.

## Configuration Options

### Complete Flag Reference

`minc2seqinfo` has **no option flags** — it is driven entirely by one or two
positional arguments. Any argument count other than 1 or 2 prints the usage line
and exits ([`scripts/minc2seqinfo:41-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L41-L44)).

| Argument | Position | Required | Description |
|----------|----------|----------|-------------|
| `mincfile` | 1 | yes | MINC volume to read. Must exist. |
| `seqinfofile` | 2 | no | Output `seq.info` path. If omitted, output goes to stdout. |

### Configuration Interactions

There are no flags and therefore no flag interactions. The only behavioural
switch is the **presence of the second argument** (write-to-file vs.
print-to-stdout) and the **presence of a `time` dimension** in the input (whether
`ntrs`/`TR` are emitted).

> [!gotcha] No `--help`, no `--version`
> Unlike most FreeSurfer scripts, `minc2seqinfo` has no help or version flag.
> Running it with the wrong number of arguments prints only the one-line usage
> `Usage: minc2seqinfo mincfile <seqinfofile>`
> ([`scripts/minc2seqinfo:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L42)).

## Typical Use Cases

### Print sequence info to the terminal

```bash
minc2seqinfo run01.mnc
# sequencename ep2d_fid_ts_20b2604
# nrows 64 / ncols 64 / nslcs 16 / ...
```

### Write a seq.info file for a session directory

```bash
minc2seqinfo run01.mnc /space/sess/bold/001/seq.info
```

### As unpackmincdir calls it

```bash
# unpackmincdir builds the seq.info for each unpacked run (paraphrased):
minc2seqinfo $f | tee $targdir/$unpackdir/seq.info
```

## Pipeline Context

`minc2seqinfo` is a **legacy MINC/FSFAST** metadata helper. It is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a MINC volume (e.g. produced by [[cor_to_minc]] or by a MINC-era
scanner-import path) → **minc2seqinfo** → **Successor:** the `seq.info` is read by
the FSFAST Sessions Database tooling. Its in-tree driver is
[`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L334), which calls it once per unpacked run.

## Gotchas and Caveats

> [!gotcha] Assumes exactly the slice/row/column dimension order
> After any `time` dimension is stripped, the script blindly indexes the
> remaining dimensions as `[1]`=slices, `[2]`=rows, `[3]`=columns
> ([`scripts/minc2seqinfo:91-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L91-L96)). A MINC file whose dimensions are ordered
> differently (or that has fewer than three spatial dimensions) will produce
> mislabelled or empty fields, with csh array-index errors in the latter case.

> [!gotcha] Output file is truncated, not appended
> When a `seqinfofile` is given, any existing file at that path is removed
> (`rm -f $seqinfo`) before the new lines are written
> ([`scripts/minc2seqinfo:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L89)).

> [!gotcha] Requires the MNI MINC toolkit on PATH
> All metadata comes from `mincinfo`. If the MINC toolkit (bundled under
> `$FREESURFER_HOME/mni/bin`) is not on the `PATH`, every field will be empty and
> the script will fail with csh index errors rather than a clean message.

## Error Compensation and Guard Rails

- **Input existence checked.** A missing MINC file aborts with
  "ERROR: $mnc does not exist" ([`scripts/minc2seqinfo:51-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L51-L54)).
- **Negative steps neutralised.** Voxel sizes are taken as $\sqrt{\text{step}^2}$
  so a negative MINC step still yields a positive pixel size
  ([`scripts/minc2seqinfo:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L79)).
- **Time fields only when applicable.** `ntrs`/`TR` are emitted only if the input
  has a `time` dimension, so spatial-only volumes produce a clean spatial-only
  descriptor ([`scripts/minc2seqinfo:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L65-L69), [`scripts/minc2seqinfo:97-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L97-L100)).
- **Output directory auto-created** with `mkdir -p` before writing
  ([`scripts/minc2seqinfo:87-88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L87-L88)).

## Related Tools

- [[cor_to_minc]] — converts the legacy COR- volume format to MINC; a typical producer of the MINC files `minc2seqinfo` reads.
- [[wiki/tools/mri_convert|mri_convert]] — the modern, general converter; reads/writes MINC among many formats and supersedes most MINC-specific tooling.
- [[mri_probedicom]] — the DICOM-era equivalent for extracting sequence metadata, used by modern import scripts instead of MINC.
- `unpackmincdir` *(no wiki page yet)* — the in-tree caller that generates `seq.info` for each unpacked MINC run via `minc2seqinfo`.

## Confidence and Gaps

**High confidence:** the positional-argument interface (no flags), the exact
`seq.info` field set and their MINC attribute sources, the slice/row/column
indexing convention, the absolute-value voxel-size computation, the time-dimension
special-casing, and the stdout-vs-file behaviour — all read directly from
[`scripts/minc2seqinfo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo) and corroborated by its caller
[`scripts/unpackmincdir`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L334).

> [!gap] Modern relevance of seq.info
> Beyond `unpackmincdir` and the historical FSFAST Sessions Database, the v8.2.0
> tree does not show active consumers of `seq.info`. The file is a legacy FSFAST
> artefact; whether any current pipeline still reads it was not determined from
> the code.

## References

- FreeSurfer source: [`scripts/minc2seqinfo`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo) (v8.2.0).
- Caller: [`scripts/unpackmincdir:333-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/unpackmincdir#L333-L338).
- The `seq.info` field reference is documented inline in the script header
  ([`scripts/minc2seqinfo:6-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/minc2seqinfo#L6-L25)).
- MNI MINC toolkit (`mincinfo`): bundled under `$FREESURFER_HOME/mni/bin`.
