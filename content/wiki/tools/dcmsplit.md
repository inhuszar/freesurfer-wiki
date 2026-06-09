---
title: "dcmsplit"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/dcmsplit"
families: []                     # standalone DICOM pre-sorting script
recon_all_stage: null
related:
  - "[[dcmunpack]]"
  - "[[mri_probedicom]]"
  - "[[unpacksdcmdir]]"
  - "[[mri_parse_sdcmdir]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - dicom
  - sorting
  - import
  - preprocessing
---

# dcmsplit

## Summary

`dcmsplit` separates a directory of DICOM files into per-identifier subfolders so
that a downstream unpacker can process each group cleanly. By default it groups
files by **Study Instance UID** (DICOM tag `0020,000d`), creating one
subdirectory per unique value and linking (or copying) each file into its group.
It is a pre-processing step for [[dcmunpack]]: when several subjects or studies
are accidentally mixed in one folder, [[dcmunpack]] mis-scans the session, so you
run `dcmsplit` first and then point [[dcmunpack]] at each resulting subfolder.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/dcmsplit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit)
- **Binary/script location:** `$FREESURFER_HOME/bin/dcmsplit`
- **Key helper invoked:** [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L85) (reads the splitting tag from each file).

## Purpose and Context

DICOM data pushed or copied into a single directory sometimes contains files from
more than one logical group — multiple subjects, multiple studies, or a mix that
shares no consistent series numbering. Tools such as [[dcmunpack]] and
[[unpacksdcmdir]] assume a directory holds **one** session; on mixed data they
produce incorrect series listings.

`dcmsplit` resolves this by partitioning the directory. It probes each file for a
chosen DICOM tag (Study UID by default), collects the unique values, and creates
one output subdirectory per value, populating it with symlinks (default) or
copies of the member files. Each output folder is then a clean single-group
directory that [[dcmunpack]] can unpack normally.

It is run **by hand** as an import pre-step; it is not part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **A DICOM source directory** — `--dcm` (alias `--dcmdir`)
  ([`scripts/dcmsplit:203-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L203-L211)). Searched recursively via
  `find` ([`:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L81)).
- **An output directory** — `--o`
  ([`scripts/dcmsplit:198-201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L198-L201)). Created if absent.

### Input Assumptions

> [!assumption] Mixed DICOM in a flat or nested directory
> The input is assumed to be DICOM files (possibly from several
> subjects/studies). Each file is probed individually; any file that makes
> `mri_probedicom` exit non-zero is assumed not to be DICOM and is skipped
> ([`scripts/dcmsplit:88-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L88-L92)).

> [!gotcha] No spaces allowed in the source path
> If the resolved source path contains a space anywhere back to root, the script
> exits with an error before doing any work
> ([`scripts/dcmsplit:296-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L296-L304)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| one subdirectory per unique tag value | `outdir/<UID>/` (or `outdir/<UID>/<SeriesNo>/` with `--series+`) | symlinks (default) or copies of the DICOM files in that group ([`scripts/dcmsplit:125-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L125-L156)) |
| `flist.txt` | `outdir/` | one line per file: `relpath  tagvalue [seriesno]` ([`scripts/dcmsplit:77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L77), [`:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L108)) |
| `dcmsplit.log` | `outdir/` | command, environment, per-file probe and link/copy log ([`scripts/dcmsplit:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L58); override with `--log`, disable with `--nolog`) |

### Output Specifications

The files themselves are unchanged DICOM — `dcmsplit` only relocates them
(symlink or copy). It performs **no** format conversion; that is left to the
downstream [[dcmunpack]]/[[unpacksdcmdir]] step.

## Mathematical Foundations

None — `dcmsplit` is a pure file-sorting utility. It reads one tag value per file
and groups by string equality; there is no numerical computation.

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/dcmsplit:190-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L190-L278)). The grouping tag (`dcmtag`)
defaults to Study UID and is overwritten by whichever of the tag-selecting flags
appears **last** on the command line.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dcm`<br>`--dcmdir` | string | *(required)* | DICOM source directory; checked for existence immediately. |
| `--o` | string | *(required)* | Output directory; created if absent. |
| `--uid` | bool | **on** | Group by Study Instance UID (tag `0020,000d`) — the default behaviour. |
| `--name` | bool | off | Group by Patient Name (tag `0010,0010`) instead. |
| `--seriesno` | bool | off | Group by Series Number (tag `0020,0011`) instead. |
| `--studyDes` | bool | off | Group by Study Description (tag `0008,1030`) instead. |
| `--t` | `group element` | `20 d` | Group by an arbitrary DICOM tag (hex group/element). |
| `--series+` | bool | off | Append Series Number as a second level: folders become `<tagvalue>/<seriesno>`. Prevents filename collisions across series. |
| `--cp` | bool | off | Copy files into the group folders instead of symlinking. |
| `--link` | bool | **on** | Symlink files into the group folders (the default). |
| `--log` | string | `outdir/dcmsplit.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | — | Temp directory (parsed and disables cleanup, but the temp-dir machinery is currently commented out — see gotcha). |
| `--nocleanup` | bool | off | Do not remove the temp directory (no effect; see gotcha). |
| `--cleanup` | bool | on | Remove the temp directory (no effect; see gotcha). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] The tag-selecting flags overwrite each other — last wins
> `--uid`, `--name`, `--seriesno`, `--studyDes`, and `--t` each just reassign the
> single `dcmtag` variable ([`scripts/dcmsplit:213-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L213-L234)). Specifying
> several is not an error; only the **last** one on the command line takes
> effect. (`--series+` is independent and adds a second grouping level on top of
> whichever tag is active.)

> [!gotcha] `--series+` changes the tag used for the *top* level only when paired with `--name`/`--uid`
> `--series+` sets `UseSeriesNo=1` ([`scripts/dcmsplit:227-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L227-L229)),
> which probes tag `0020,0011` as a **second** field and forms `tag/seriesno`
> folders ([`:96-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L96-L106), [`:114-118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L114-L118)). The top-level
> tag is still whatever `dcmtag` was set to, so the documented intent is to
> combine it with `--uid` (default) or `--name`.

> [!gotcha] `--cp` vs `--link` — last wins
> Both set the single `DoLink` flag ([`scripts/dcmsplit:236-241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L236-L241)); the
> later flag on the command line determines whether files are copied or
> symlinked. Symlinking is the default and is much faster/cheaper for large
> directories, but the links point back into the original `--dcm` tree, so do not
> delete the source afterwards if you used links.

> [!gotcha] Temp-dir flags are inert
> `--tmp`/`--tmpdir`, `--cleanup`, and `--nocleanup` are parsed, but the code that
> would create and clean a temp directory is commented out
> ([`scripts/dcmsplit:51-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L51-L54), [`:160-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L160-L161)). These flags
> currently have no effect; a real temp file is instead placed at
> `/tmp/dcmsplit.$$.tmp` ([`:76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L76)).

## Typical Use Cases

### 1. Split a mixed folder by Study UID, then unpack

```bash
# Separate multiple studies, then dcmunpack each subfolder.
dcmsplit --dcm /data/mixed_dicom --o /data/split
ls /data/split            # one folder per Study UID
dcmunpack -src /data/split/<oneUID> -targ /data/unpacked/sub01 -auto-runseq nii.gz
```

### 2. Split by patient name

```bash
dcmsplit --dcm /data/mixed --o /data/split --name
```

### 3. Split by Study UID and series, copying instead of linking

```bash
# UID/SeriesNo folders, real copies (safe to delete the source after).
dcmsplit --dcm /data/mixed --o /data/split --series+ --cp
```

## Pipeline Context

`dcmsplit` is an **import pre-processing** step.

**Predecessor:** raw, mixed DICOM directory → **dcmsplit** → **Successor:**
[[dcmunpack]] (or [[unpacksdcmdir]]), run per output subfolder.

It is not called by [[wiki/pipelines/recon-all|recon-all]]. Internally it relies
on [[mri_probedicom]] to read the grouping tag from each file.

## Gotchas and Caveats

> [!gotcha] Symlinks tie the output to the source
> With the default `--link`, deleting or moving the original `--dcm` directory
> breaks every link in the output. Use `--cp` if the split output must be
> self-contained.

> [!gotcha] Name collisions across series
> Files are placed by basename; if two files in the same group share a basename,
> the second overwrites the first and a WARNING is printed suggesting `--series+`
> ([`scripts/dcmsplit:138-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L138-L141)).

> [!gotcha] Non-DICOM files are silently skipped
> Any file `mri_probedicom` cannot read is assumed not to be DICOM and is skipped
> with a log note ([`scripts/dcmsplit:88-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L88-L92)).

## Error Compensation and Guard Rails

- **Space-in-path guard.** A source path containing any space aborts the run up
  front ([`scripts/dcmsplit:296-304`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L296-L304)).
- **Per-file probe tolerance.** A probe failure on one file does not abort the
  job; that file is skipped ([`:88-92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L88-L92)).
- **Collision warning.** Pre-existing basenames in a group folder are flagged
  before being overwritten ([`:138-141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L138-L141)).

## Related Tools

- [[dcmunpack]] — the intended downstream unpacker; run it on each `dcmsplit` output folder.
- [[mri_probedicom]] — reads the grouping tag (and is the gate that decides which files are DICOM).
- [[unpacksdcmdir]] — legacy Siemens unpacker that likewise assumes one session per directory.
- [[mri_parse_sdcmdir]] — Siemens directory scanner used by the unpackers.

## Confidence and Gaps

**High confidence:** the full flag set, the default Study-UID grouping, the
last-wins tag selection, the symlink-vs-copy behaviour, the `--series+`
two-level layout, and the inert temp-dir flags — all read directly from
[`scripts/dcmsplit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit).

## References

- FreeSurfer source: [`scripts/dcmsplit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit) (v8.2.0).
- Built-in help: `dcmsplit --help` (the `BEGINHELP` block, [`scripts/dcmsplit:341-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmsplit#L341-L368)).
