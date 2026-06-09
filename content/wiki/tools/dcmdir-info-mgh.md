---
title: "dcmdir-info-mgh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/dcmdir-info-mgh"
families: []                     # standalone DICOM summary script
recon_all_stage: null
related:
  - "[[mri_probedicom]]"
  - "[[unpacksdcmdir]]"
  - "[[dcmunpack]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_parse_sdcmdir]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - dicom
  - inspection
  - import
  - mgh
---

# dcmdir-info-mgh

## Summary

`dcmdir-info-mgh` prints a quick per-series summary of a DICOM directory whose
files follow the MGH network-archive naming convention `NNNNNN-S-MMMMM.dcm`
(where `S` is the series/run number). For each series it reports the series
number, pulse sequence, protocol name, and a representative file, plus the
patient name, study date, and study time for the session. Optionally, if a second
argument (an unpack directory) is given, it also converts each series to
[[mgz]] with [[wiki/tools/mri_convert|mri_convert]]. It is a much faster
alternative to `unpacksdcmdir -scanonly` but only works on the MGH naming scheme.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/dcmdir-info-mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh)
- **Binary/script location:** `$FREESURFER_HOME/bin/dcmdir-info-mgh`
- **Key helpers invoked:** [`mri_probedicom`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L82) (header fields per series) and [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L105) (optional conversion to mgz).

## Purpose and Context

After Siemens data are pushed from an MGH scanner to the network archive, the
files are renamed to `NNNNNN-S-MMMMM.dcm`. Because the series number `S` is
encoded in the filename, the series structure can be read without probing every
file: `dcmdir-info-mgh` derives the list of series numbers directly from the
filenames (`find … | sed … | awk`), then probes only **one** representative file
per series to extract its sequence and protocol. This makes it considerably
faster than scanning the whole directory with [[unpacksdcmdir]]'s `-scanonly`
mode or [[mri_parse_sdcmdir]].

It is run **by hand** to inventory a directory; it is not part of
[[wiki/pipelines/recon-all|recon-all]]. With the optional unpack directory it
doubles as a one-shot bulk converter to mgz.

## Inputs

### Required Inputs

- **A DICOM directory** — first positional argument
  ([`scripts/dcmdir-info-mgh:138-142`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L138-L142)). Must exist
  ([`:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L45-L48)).

### Optional Inputs

- **An unpack directory** — second positional argument
  ([`scripts/dcmdir-info-mgh:143-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L143-L147)). If given, each series is
  converted to `<Protocol>_run<S>.mgz` inside it.

### Input Assumptions

> [!assumption] MGH archive naming `NNNNNN-S-MMMMM.dcm`
> Files must be named so that the series/run number is the **second-to-last**
> dash-delimited field, with no dashes inside `NNNNNN` or `MMMMM` (e.g.
> `953000-2-9.dcm`). The series list is built purely from the filenames
> ([`scripts/dcmdir-info-mgh:71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L71)), so data burned to CD straight
> from the scanner (different naming) will not work — the help states this
> explicitly ([`:206-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L206-L209)).

The `--nopre` flag adjusts the glob from `*-S-*.dcm` to `S-*.dcm` for data that
lack the leading `NNNNNN-` prefix ([`:79-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L79-L80), [`:90-91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L90-L91)).

## Outputs

### Files Created

When no unpack directory is given, the summary is printed to **stdout** only — no
files are written.

| File / pattern | Where | Contents | When |
|----------------|-------|----------|------|
| `<Protocol>_run<S>.mgz` | unpackdir | each series converted to mgz via `mri_convert` | only if an unpack dir is given ([`:104-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L104-L105)) |
| `dcmdir-info-mgh.log` | unpackdir | command, date, and per-series conversion log | only if an unpack dir is given ([`:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L52-L53)) |

### Output Specifications

The printed summary is: a Patient Name line, a Study Date line, a Study Time line,
then one line per series of the form `<series> <PulseSequence> <Protocol>
<representative-file>` ([`scripts/dcmdir-info-mgh:82-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L82-L101)). The
pulse-sequence and protocol strings are sanitised (spaces, `*`, and `?` removed).

## Mathematical Foundations

None — `dcmdir-info-mgh` parses filenames and DICOM header strings and optionally
delegates conversion to [[wiki/tools/mri_convert|mri_convert]]. There is no
numerical computation in the script itself.

## Configuration Options

### Complete Flag Reference

The argument parser ([`scripts/dcmdir-info-mgh:118-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L118-L153)) handles a
small set of flags plus two positional arguments (dicomdir, then unpackdir).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| *(positional 1)* | string | *(required)* | DICOM directory to summarise. |
| *(positional 2)* | string | — | Optional unpack directory; if present, every series is converted to `<Protocol>_run<S>.mgz` there. |
| `--nopre`<br>`-nopre` | bool | off (prefix assumed) | Do not assume a leading `NNNNNN-` prefix; match `S-*.dcm` instead of `*-S-*.dcm`. |
| `--debug`<br>`-debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help`<br>`-help` | bool | — | Print help and exit. |
| `--version`<br>`-version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] The unpack directory is positional, not a flag
> Conversion to mgz is triggered simply by supplying a **second** non-flag
> argument; there is no `-o`/`-targ` flag. The first non-flag argument is taken as
> the dicomdir and the second as the unpackdir
> ([`scripts/dcmdir-info-mgh:138-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L138-L147)). A third positional argument
> is an "unrecognized flag" error.

> [!gotcha] `--nopre` must match how the data are named
> If the files have the full `NNNNNN-S-MMMMM.dcm` form, omit `--nopre`; if they
> are named `S-MMMMM.dcm`, supply it. The series-number extraction (second-to-last
> field) is the same either way, but the per-series file glob differs and a
> mismatch yields empty file lists.

## Typical Use Cases

### 1. Inventory an MGH-archive directory

```bash
dcmdir-info-mgh /space/dicom/953000
# PatientName ...
# StudyDate ...
# StudyTime ...
# 1 ep2d_fid Localizer  953000-1-1.dcm
# 2 tfl3d1   MPRAGE     953000-2-9.dcm
# ...
```

### 2. Inventory and convert every series to mgz

```bash
dcmdir-info-mgh /space/dicom/953000 /space/out/953000
# -> /space/out/953000/MPRAGE_run2.mgz, .../Localizer_run1.mgz, ...
```

### 3. Data without the leading prefix

```bash
dcmdir-info-mgh --nopre /space/dicom/session
```

## Pipeline Context

`dcmdir-info-mgh` is a stand-alone **inventory / quick-convert** tool, not called
by [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** MGH-archive DICOM directory → **dcmdir-info-mgh** →
**Successor:** the printed series list informs a subsequent
[[dcmunpack]]/[[unpacksdcmdir]] run, or (with an unpack dir) the emitted mgz files
feed `recon-all -i …`.

It is the fast counterpart to [[unpacksdcmdir]]'s `-scanonly` for properly named
data, and uses [[mri_probedicom]] for the per-series header reads. It is
referenced as a "see also" by the `dicom-rename` helper.

## Gotchas and Caveats

> [!gotcha] Only works on `NNNNNN-S-MMMMM.dcm` naming
> The entire series-detection logic depends on dashes delimiting the series
> number; on scanner-burned CDs or other naming schemes it will print
> "ERROR: finding data" or produce wrong groupings
> ([`scripts/dcmdir-info-mgh:71-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L71-L76)).

> [!gotcha] Protocol name becomes the output filename
> In convert mode the output is `<Protocol>_run<S>.mgz`. If two series share a
> protocol name they get distinct files only because the run number differs; an
> unusual protocol string (after space/`*`/`?` stripping) becomes part of the
> filename verbatim.

> [!gotcha] Conversion aborts on the first failure
> In convert mode, a non-zero `mri_convert` status exits the whole script
> ([`scripts/dcmdir-info-mgh:108-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L108-L109)); series after the failure are
> not processed.

## Error Compensation and Guard Rails

- **Directory existence check.** A missing dicomdir aborts immediately
  ([`scripts/dcmdir-info-mgh:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L45-L48)).
- **Empty-series guard.** If no series numbers are found, it prints the working
  directory and "ERROR: finding data" ([`:72-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L72-L76)).
- **String sanitising.** Pulse-sequence and protocol values have spaces, `*`, and
  `?` stripped before printing/naming ([`:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L95), [`:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L100)).

## Related Tools

- [[mri_probedicom]] — reads PatientName/StudyDate/StudyTime and per-series PulseSequence/Protocol.
- [[unpacksdcmdir]] — the legacy unpacker; `dcmdir-info-mgh` is its faster scan-only counterpart for MGH naming.
- [[dcmunpack]] — modern multi-vendor unpacker; use the printed series list to choose runs.
- [[wiki/tools/mri_convert|mri_convert]] — performs the optional per-series conversion to mgz.
- [[mri_parse_sdcmdir]] — general Siemens directory scanner (no filename-naming requirement, but slower).

## Confidence and Gaps

**High confidence:** the filename-based series detection, the positional
dicomdir/unpackdir arguments, the `--nopre` glob switch, the mgz output naming,
and the abort-on-failure behaviour — all read directly from
[`scripts/dcmdir-info-mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh).

## References

- FreeSurfer source: [`scripts/dcmdir-info-mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh) (v8.2.0).
- Built-in help: `dcmdir-info-mgh --help` (the `BEGINHELP` block, [`scripts/dcmdir-info-mgh:197-222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/dcmdir-info-mgh#L197-L222)).
