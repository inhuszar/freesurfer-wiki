---
title: "spm_t_to_b"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/spm_t_to_b"
families: []
recon_all_stage: null
related:
  - "[[spmregister]]"
  - "[[spmmat2register]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Depends on the helper program spm_to_b, which is not present in the v8.2.0 source tree or installed bin; spm_t_to_b cannot run as shipped."
tags:
  - spm
  - bshort
  - fsfast
  - conversion
  - legacy
---

# spm_t_to_b

## Summary

`spm_t_to_b` is a small bash utility that converts a **time series of SPM
Analyze volumes** (one `.img`/`.hdr` per time point, named by a `printf`-style
stem) into a single multi-frame FreeSurfer **bshort** series. For each time
point it calls a helper program `spm_to_b` to convert that frame to bshort, then
**concatenates** the per-time-point `.bshort` slices into the output series and,
at the end, rewrites each output `.hdr` so its third field records the total
number of time points. It is a legacy FSFAST-era bridge for getting SPM-format
functional data into FreeSurfer's old bshort representation.

> [!gotcha] Depends on `spm_to_b`, which is not shipped with v8.2.0
> The per-frame conversion is done by an external program `spm_to_b`
> ([`scripts/spm_t_to_b:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L65),
> [`:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L68)). No `spm_to_b` binary or script exists in the
> v8.2.0 source tree or the installed `bin` directory (only the unrelated MATLAB
> toolbox files `spm_to_bfloat.m`/`spm_to_bshort.m` exist). As shipped,
> `spm_t_to_b` therefore cannot complete a conversion. Treat it as a legacy
> script; for modern conversions use [[wiki/tools/mri_convert|mri_convert]].

## Source Information

- **Language:** bash shell script (`#!/usr/bin/env bash`)
- **Source file:** [`scripts/spm_t_to_b`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b)
- **Binary/script location:** `$FREESURFER_HOME/bin/spm_t_to_b`
- **Key helper invoked:** `spm_to_b` (per-frame SPM-Analyze → bshort converter; **not present** in the v8.2.0 tree, see Summary). Also uses standard Unix tools `mktemp`, `dc`, `sed`, `cat`, `printf`.

## Purpose and Context

SPM historically stored a functional run as a **series of single-frame Analyze
files** — one `.img`/`.hdr` per acquisition, named with an incrementing index.
FreeSurfer's FSFAST pipeline instead used the **bshort** format, in which an
entire run lives in one set of per-slice files carrying all frames. `spm_t_to_b`
bridges the two: it walks the numbered SPM frames, converts each to bshort with
`spm_to_b`, and appends successive frames onto the first to build a complete
multi-frame bshort run. This is purely a **data-marshalling** utility from the
older FSFAST/SPM interoperability workflow; it is unrelated to spatial
registration despite the shared `spm` prefix with [[spmregister]].

It is **not** part of [[wiki/pipelines/recon-all|recon-all]] and is not called by
any other script in the tree.

## Inputs

### Required Inputs

Exactly **two positional arguments** ([`scripts/spm_t_to_b:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L43)):

1. **`spm_stem_format`** — a `printf` format string that, given a frame index,
   yields the stem of that frame's SPM Analyze file (without the `.img`/`.hdr`
   extension). The script substitutes `i = 1, 2, 3, …`
   (`stemname = printf "$1" $i`, [`scripts/spm_t_to_b:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L59)) and stops at the
   first index for which `<stem>.img` does not exist. Example: `vol_%04d` matches
   `vol_0001.img`, `vol_0002.img`, ….
2. **`bshort_stem`** — the output bshort series stem (a directory + basename); the
   directory part is taken with `dirname` and the basename with `basename`
   ([`scripts/spm_t_to_b:55-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L55-L56)).

With the wrong number of arguments it prints
`usage: spm_t_to_b spm_stem_format bshort_stem` and exits
([`scripts/spm_t_to_b:22-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L22-L28)).

### Input Assumptions

> [!assumption] One-frame-per-file SPM Analyze, 1-indexed and contiguous
> The input is assumed to be a contiguous run of single-frame Analyze files
> numbered from 1, addressable by the supplied `printf` format. Enumeration stops
> at the first missing `<stem>.img`, so a gap truncates the run. Each frame must
> be convertible by `spm_to_b` to bshort with a consistent slice layout, since
> the script blindly `cat`s same-named `.bshort` files together across frames.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<outstem>_<slice>.bshort` | `dirname(bshort_stem)` | the multi-frame bshort slice data: frame 1 written by `spm_to_b`, frames 2…N appended slice-by-slice ([`scripts/spm_t_to_b:62-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L62-L78)). |
| `<outstem>*.hdr` | same dir | bshort headers; after concatenation each header's 3rd field is rewritten to the total number of time points ($\text{tp}=i-1$) ([`scripts/spm_t_to_b:91-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L91-L95)). |

A temporary directory under `/tmp/spm_t_to_b.XXXXXX` is used to stage each
non-first frame before appending, and is removed at the end (and on Ctrl-C via a
`trap` handler, [`scripts/spm_t_to_b:30-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L30-L41)).

### Output Specifications

The output is a FreeSurfer **bshort** functional series (16-bit, per-slice
`.bshort` + ASCII `.hdr`). The number of frames is the count of input volumes
found; the per-slice geometry/dimensions are inherited from whatever `spm_to_b`
writes for frame 1. `spm_t_to_b` performs no resampling — it only converts
(via `spm_to_b`) and concatenates bytes.

## Mathematical Foundations

None — this is a file-marshalling script. Its only "computation" is frame
counting via the `dc` reverse-Polish calculator (`i + 1` to advance,
`i - 1` for the final time-point count, [`scripts/spm_t_to_b:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L79),
[`:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L89)) and writing that count into the bshort headers.
All actual image conversion is delegated to `spm_to_b`.

## Configuration Options

`spm_t_to_b` has **no flags or options** — it accepts only the two positional
arguments described under [Inputs](#inputs). There is no `--help`; any argument
count other than 2 prints the one-line usage and exits.

## Configuration Interactions

None — there are no options to interact. The only behavioural control is the
`printf` format you supply, which determines which files are enumerated.

## Typical Use Cases

### Convert a numbered SPM Analyze run to a bshort series

```bash
# SPM frames vol_0001.img, vol_0002.img, ... -> bshort series bold/f
spm_t_to_b 'vol_%04d' bold/f
# Requires the legacy spm_to_b helper to be on PATH (absent in v8.2.0).
```

The format string is single-quoted so the shell does not interpret `%`; the
script expands it per frame.

## Pipeline Context

`spm_t_to_b` is a stand-alone legacy conversion utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or by any other script in the v8.2.0 tree.

**Predecessor:** an SPM-format functional run (numbered Analyze frames) →
**spm_t_to_b** (per-frame `spm_to_b` + concatenation) → **Successor:** the older
FSFAST tools that consume bshort series.

## Gotchas and Caveats

> [!gotcha] Enumeration stops at the first gap
> The `while [ -f $stemname.img ]` loop terminates as soon as a numbered frame is
> missing ([`scripts/spm_t_to_b:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L60)). A non-contiguous series is
> silently truncated at the gap rather than skipped over.

> [!gotcha] "file not found, no data processed" when frame 1 is missing
> If the very first frame (`i=1`) does not exist, the script reports
> `file <stem> not found, no data processed` and exits non-zero
> ([`scripts/spm_t_to_b:83-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L83-L87)). Check that your `printf` format matches
> the actual filenames (zero-padding width, etc.).

> [!gotcha] Concatenation assumes identical slice naming across frames
> Non-first frames are appended by matching `tempstem`→`outstem` filenames and
> `cat`ing them onto the existing series ([`scripts/spm_t_to_b:70-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L70-L76)). If
> `spm_to_b` produces a different slice set for some frame, the result will be
> inconsistent.

## Error Compensation and Guard Rails

- **Ctrl-C cleanup:** a `trap … 2` handler removes the temp dir and exits cleanly
  on interrupt ([`scripts/spm_t_to_b:30-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L30-L41)).
- **Temp-dir creation is checked:** a failed `mktemp` aborts with a message
  ([`scripts/spm_t_to_b:45-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L45-L50)).
- **No-data guard:** exits non-zero if no frames were found
  ([`scripts/spm_t_to_b:83-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L83-L87)).
- It does **not** validate that `spm_to_b` exists or succeeded — a missing helper
  surfaces as a downstream failure.

## Related Tools

- [[wiki/tools/mri_convert|mri_convert]] — the modern, general converter; the recommended replacement for moving SPM/Analyze functional data into FreeSurfer formats.
- [[spmregister]] — the SPM-bridge *registration* tool (different purpose; shares only the `spm` prefix).
- [[spmmat2register]] — the (obsolete) SPM-bridge registration-conversion utility.
- `spm_to_b` *(no wiki page; not in the v8.2.0 tree)* — the per-frame helper this script depends on.

## Confidence and Gaps

**Medium confidence.** The script's control flow, the two-argument interface, the
enumeration/concatenation logic, and the header rewrite are read directly from
[`scripts/spm_t_to_b`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b).

> [!gap] `spm_to_b` helper is absent
> Because `spm_to_b` is not in the v8.2.0 tree or install, the exact bshort
> output (data type, slice naming, header field meanings) produced per frame, and
> hence the end-to-end result, could not be verified by running the tool. The
> file-layout descriptions above are inferred from the script's handling.

## References

- FreeSurfer source: [`scripts/spm_t_to_b`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b) (v8.2.0).
- Built-in usage: `spm_t_to_b` with no/incorrect arguments ([`scripts/spm_t_to_b:22-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spm_t_to_b#L22-L28)).
- FreeSurfer bshort/bfloat format documentation (FSFAST).
