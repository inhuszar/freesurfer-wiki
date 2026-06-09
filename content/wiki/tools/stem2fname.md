---
title: "stem2fname"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/stem2fname"
families: []                     # filename/path helper utility
recon_all_stage: null
related:
  - "[[fname2stem]]"
  - "[[fname2ext]]"
  - "[[getfullpath]]"
  - "[[mri_info]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - utility
  - filename
  - shell
---

# stem2fname

## Summary

`stem2fname` resolves a **stem** to a full **filename** by probing the disk for
`stem.fmt` across a fixed list of FreeSurfer image formats, in priority order,
and printing the first one that exists. Given the stem `f` and a file `f.nii.gz`
on disk it prints `f.nii.gz`. Unlike its string-only counterparts
[[fname2stem]] and [[fname2ext]], `stem2fname` **requires the file to exist** —
it performs `-e` tests against the filesystem. It is the lookup used by FreeSurfer
scripts (FSFAST in particular) to turn a format-agnostic stem into the concrete
file that is actually present.

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/stem2fname`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname)
- **Binary/script location:** `$FREESURFER_HOME/bin/stem2fname`
- **Original author:** Doug Greve

## Purpose and Context

FreeSurfer (and especially FSFAST) often stores and refers to volumes by a stem
without committing to a format, leaving the output extension to a global setting.
When a later step must read that volume, it needs to find which concrete file the
stem maps to. `stem2fname` performs that resolution: it tries `stem.mgh`,
`stem.mgz`, `stem.nii`, `stem.nii.gz`, `stem.bhdr`, `stem.img`, and `stem.w` in
order and returns the first existing file
([`scripts/stem2fname:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L37)).

The probe order is **environment-sensitive**: if `FSF_OUTPUT_FORMAT` is set to
`nii.gz`, the list is reordered so `nii.gz` is preferred over `nii`
([`scripts/stem2fname:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L38-L42)). This keeps the resolved file consistent
with the format the rest of the pipeline is writing. It is not part of
[[wiki/pipelines/recon-all|recon-all]]; it is a helper used by FSFAST scripts such
as `mris_preproc`, `bbregister`, `fslregister`, and `feat2segstats`.

## Inputs

### Required Inputs

- **A single stem** (argument 1) — a path *without* an image extension, e.g.
  `bold` or `/path/to/run/f`. Exactly one argument is required; otherwise usage is
  printed and the script exits 1 ([`scripts/stem2fname:27-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L27-L33)).
- **At least one matching file on disk** — `stem2fname` reads the filesystem; if
  no `stem.fmt` exists it errors.

### Input Assumptions

> [!assumption] The file must exist on disk
> Unlike [[fname2stem]]/[[fname2ext]], this tool tests `-e stem.fmt`
> ([`scripts/stem2fname:53-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L53-L55)). If nothing matches it prints
> `ERROR: could not determine file for <stem>` and exits 1. The relevant
> directory must therefore already be populated.

## Outputs

### Files Created

None. The resolved filename is printed to **stdout**. If more than one format
exists for the same stem, the first (by priority) is printed to stdout and a
warning naming the chosen file is written to **stderr**
([`scripts/stem2fname:66-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L66-L69)).

### Output Specifications

- **Success:** one line, `stem.fmt`, exit 0.
- **Ambiguous (multiple formats present):** the highest-priority match on stdout
  (exit 0) **plus** `WARNING: multiple formats found for <stem>` and `  USING:
  <file>` on stderr.
- **Failure (nothing found):** `ERROR: could not determine file for <stem>` on
  stdout, exit 1.

## Mathematical Foundations

None — filesystem probing and ordered selection only.

## Configuration Options

### Complete Flag Reference

`stem2fname` takes **no command-line options**, only a single positional stem
argument. There is no `--help` flag — passing `--help` makes the script probe for
files named `--help.mgh`, `--help.mgz`, … and fail with `ERROR: could not
determine file for --help`. Behaviour is instead tuned by one environment
variable.

| Argument / variable | Type | Default | Description |
|---------------------|------|---------|-------------|
| `stem` | string (positional) | *(required)* | The stem (path without image extension) to resolve to an on-disk file. |
| `FSF_OUTPUT_FORMAT` | env var | unset | When equal to `nii.gz`, reorders the probe list so `nii.gz` is preferred over `nii` ([`scripts/stem2fname:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L38-L42)). Any other value has no effect on the order. |

### Configuration Interactions

> [!gotcha] `FSF_OUTPUT_FORMAT` only special-cases `nii.gz`
> The reordering branch fires **only** when `FSF_OUTPUT_FORMAT == nii.gz`. For
> any other value (including `mgz`, `nii`, `mgh`) the default order `mgh mgz nii
> nii.gz bhdr img w` is used unchanged. A commented-out block
> ([`scripts/stem2fname:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L45-L48)) shows an abandoned attempt to prepend
> the requested format generally; it is inactive.

## Typical Use Cases

### Resolve a format-agnostic stem to the real file

```bash
# /path/run/f.nii.gz exists on disk
set fname = `stem2fname /path/run/f`   # -> /path/run/f.nii.gz
mri_info $fname
```

### Honour the pipeline's output format when several exist

```bash
setenv FSF_OUTPUT_FORMAT nii.gz
# if both f.nii and f.nii.gz exist, prefer the compressed one
set fname = `stem2fname f`             # -> f.nii.gz
```

## Pipeline Context

`stem2fname` is a leaf utility, not a pipeline stage, and is **not** called by
[[wiki/pipelines/recon-all|recon-all]]. It is used by FSFAST and registration
scripts — `mris_preproc`, `bbregister`, `fslregister`, `feat2segstats`,
`mri_glmfit-sim` — to locate the concrete volume behind a stem before reading it
with [[mri_info]] or [[wiki/tools/mri_convert|mri_convert]].

**Predecessor:** a stem produced by [[fname2stem]] or by a format-agnostic
naming convention → **stem2fname** → **Successor:** a reader such as
[[mri_info]], [[wiki/tools/mri_convert|mri_convert]], or any analysis step.

## Gotchas and Caveats

> [!gotcha] Probe list differs from `fname2stem`/`fname2ext`
> `stem2fname` searches `mgh mgz nii nii.gz bhdr img w`
> ([`scripts/stem2fname:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L37)). This list **includes** `w` (the legacy
> per-vertex surface-overlay format) but **excludes** `annot`, `m3z`, and `gii`
> that the string helpers recognise. The two families of utilities do not share a
> single canonical list.

> [!gotcha] Silent first-match preference on ambiguity
> If `stem.mgz` and `stem.nii.gz` both exist, the tool returns the
> higher-priority one (here `mgz`) on stdout and only *warns* on stderr. A caller
> that ignores stderr will not notice that an ambiguous stem was resolved one
> particular way.

> [!gotcha] Referenced sibling `stem2fmt` is not installed
> The usage text says "See also stem2fmt"
> ([`scripts/stem2fname:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L29)), but no `stem2fmt` script ships in
> `scripts/` for v8.2.0. The closest available tool is [[fname2ext]] (extension
> of a known filename).

## Error Compensation and Guard Rails

- **Argument-count guard:** wrong count → usage + exit 1
  ([`scripts/stem2fname:27-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L27-L33)).
- **No-match guard:** if no candidate file exists, errors with a clear message and
  exits 1 instead of returning an empty string
  ([`scripts/stem2fname:57-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L57-L60)).
- **Ambiguity warning:** multiple matches are surfaced on stderr so the choice is
  at least visible ([`scripts/stem2fname:66-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname#L66-L69)).

## Related Tools

- [[fname2stem]] — the string-only inverse: strips an extension to produce a stem (no disk access).
- [[fname2ext]] — returns the extension of a known filename (string-only).
- [[getfullpath]] — canonicalises a path to an absolute filename (sibling shell helper).
- [[mri_info]] — typically reads the file that `stem2fname` resolves.
- [[wiki/tools/mri_convert|mri_convert]] — common consumer of the resolved filename.

## Confidence and Gaps

**High confidence:** the script is 72 lines and was read in full. The probe list,
the `FSF_OUTPUT_FORMAT == nii.gz` reordering, the on-disk `-e` requirement, the
first-match-plus-stderr-warning ambiguity handling, and the inactive commented
block are all confirmed from
[`scripts/stem2fname`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname).
That the referenced `stem2fmt` does not ship in v8.2.0 was confirmed by directory
listing.

## References

- FreeSurfer source: [`scripts/stem2fname`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/stem2fname) (v8.2.0).
