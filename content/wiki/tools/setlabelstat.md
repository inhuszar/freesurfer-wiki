---
title: "setlabelstat"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/setlabelstat"
families: []                     # standalone label-editing script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[label-format]]"
  - "[[mri_label2label]]"
  - "[[labels_union]]"
  - "[[mris_spherical_average]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - label
  - surface
  - editing
  - stat
---

# setlabelstat

## Summary

`setlabelstat` overwrites the *stat* (fifth) column of every vertex line in a
FreeSurfer surface [label](label-format) file with a single, user-supplied
constant. It copies the input label's two header lines verbatim (the `#`
comment line and the vertex-count line) and rewrites each remaining line so that
the vertex number and the three RAS coordinates are preserved while the stat
value is replaced by the constant given on the command line. It is a tiny tcsh
filter built around a one-line `awk` program.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/setlabelstat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat)
- **Binary/script location:** `$FREESURFER_HOME/bin/setlabelstat`
- **Author/Origin:** MGH (General Hospital Corporation), 2021 license header.
- **External commands used:** `awk` (the actual rewrite), `dirname`/`mkdir`
  (output directory creation), and the FreeSurfer shell helpers `getpwdcmd` and
  `sources.csh`. No FreeSurfer binary is invoked.

## Purpose and Context

A FreeSurfer surface label stores, for each selected vertex, an arbitrary
floating-point **stat** value in addition to the vertex index and its
`(x, y, z)` RAS coordinate. Many tools (e.g. surface overlays in
[[wiki/tools/freeview|freeview]], [[mri_label2label]] when it carries a value,
or statistics utilities that read label stat fields) treat that column as a
per-vertex scalar. `setlabelstat` exists to **flatten** that column to one
chosen number — for example to mark every vertex of a region with the same
weight, a class index, or simply `1.0` so the label can be used as a binary mask
with a known fill value.

It is a hand-run utility. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] and is not called by any other script in
the FreeSurfer scripts directory.

## Inputs

### Required Inputs

- **Input label file** (`-i`) — a FreeSurfer surface label
  ([[label-format]]). Its existence is checked at parse time
  ([`scripts/setlabelstat:76-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L76-L79)).
- **Output label path** (`-o`) — where the rewritten label is written. Parent
  directories are created automatically (see Error Compensation).
- **Stat value** (`-s`) — the single value to write into every vertex's stat
  column. Taken as an opaque string and substituted literally by `awk`, so any
  token the shell passes through (e.g. `1`, `0.5`, `-3.2`) is accepted.

### Input Assumptions

> [!assumption] Standard FreeSurfer label layout
> The script assumes the canonical surface-label structure
> ([[label-format]]): **line 1** is a `#`-prefixed comment header, **line 2** is
> the integer vertex count, and **lines 3…N** are vertex records of the form
> `vertexno x y z stat`. The rewrite copies the first two lines unchanged
> (`FNR < 3`) and reformats every later line as the **first four** fields plus
> the new stat (`FNR > 2`), at
> [`scripts/setlabelstat:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L57).
> A label whose header is not exactly one line, or whose vertex lines have fewer
> than four columns, will be mangled (see Gotchas).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| Output label (`-o` path) | user-specified | A copy of the input label with the same header and vertex count, every vertex line rewritten as `vertexno x y z <statval>`. |

No log file, temporary file, or other artefact is produced.

### Output Specifications

The output is an ASCII surface label. Column 1 (vertex index) and columns 2–4
(the RAS `x y z` coordinates) are byte-for-byte the same *tokens* as the input;
`awk`'s default single-space output field separator is used, so the column
*spacing* is normalised to single spaces regardless of the input's alignment.
Column 5 (stat) becomes the constant supplied with `-s` on every line. The
vertex count on line 2 is **not recomputed** — it is copied — which is correct
because no vertices are added or removed.

## Mathematical Foundations

None — `setlabelstat` performs no geometric or statistical computation. It is a
pure text transformation: copy two header lines, then replace field 5 with a
constant on the remaining lines via
[`awk`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L57).

## Configuration Options

### Complete Flag Reference

All flags come from the argument parser
([`scripts/setlabelstat:65-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L65-L104)).
There are no short/long alternative spellings.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-i` | string (path) | *(required)* | Input label file. Must exist or the script exits with `ERROR: cannot find <inlabel>` ([`scripts/setlabelstat:73-80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L73-L80)). |
| `-o` | string (path) | *(required)* | Output label file. Its directory is created with `mkdir -p` ([`scripts/setlabelstat:54-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L54-L55)). |
| `-s` | string (number) | *(required)* | The stat value written into every vertex line. Substituted verbatim by `awk -v stat=<statval>` ([`scripts/setlabelstat:87-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L87-L90)). |
| `-debug` | bool | off | Turn on tcsh `verbose` and `echo` tracing ([`scripts/setlabelstat:92-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L92-L95)). |
| `-help` | bool | — | Print usage plus the `BEGINHELP` text and exit ([`scripts/setlabelstat:31-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L31-L36)). |
| `-version` | bool | — | Print the version string (`setlabelstat @FS_VERSION@`) and exit ([`scripts/setlabelstat:37-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L37-L41)). |

### Configuration Interactions

All three of `-i`, `-o`, and `-s` are **mandatory and independent**; the
`check_params` block exits with a specific error if any is missing
([`scripts/setlabelstat:110-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L110-L125)).
There are no mutually-exclusive flags.

> [!gotcha] `-help`/`-version` are matched anywhere on the command line
> The script greps the **entire** argument list for `-help` and `-version`
> before parsing ([`scripts/setlabelstat:32-41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L32-L41)),
> using `egrep -e -help`. Because that pattern is an unanchored substring match,
> an argument that merely *contains* the text (e.g. a path called
> `pre-help.label`) can trigger the help/version path and prevent normal
> execution.

> [!gotcha] In-place editing overwrites silently
> Passing the same path to `-i` and `-o` is permitted and overwrites the input.
> `awk` reads the whole file via the shell pipeline (`cat $inlabel | awk …`)
> before the redirection truncates `$outlabel`, so an in-place rewrite generally
> works — but there is no backup and no confirmation.

## Typical Use Cases

### Use Case 1: Set every vertex stat to 1.0 (binary mask value)

```bash
# Force a uniform stat of 1 across the whole label.
setlabelstat -i lh.BA3a.label -o lh.BA3a.ones.label -s 1
```

Useful when a downstream tool interprets the stat column as a weight or mask
intensity and you want all selected vertices treated identically.

### Use Case 2: Tag a region with a class index

```bash
# Mark all vertices of this label with the integer 3 (e.g. a region code).
setlabelstat -i rh.precentral.label -o rh.precentral.code3.label -s 3
```

### Use Case 3: Zero the stat field

```bash
setlabelstat -i lh.calcarine.label -o lh.calcarine.nostat.label -s 0
```

## Pipeline Context

`setlabelstat` is a stand-alone label-editing utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or any other FreeSurfer script.

**Predecessor:** a label produced by [[mri_label2label]],
[[mris_spherical_average]], manual drawing in [[wiki/tools/freeview|freeview]],
or [[labels_union]] → **setlabelstat** → **Successor:** any tool that consumes
the label's stat column (overlay display, statistics, or
[[mri_label2label]]/mask generation).

## Gotchas and Caveats

> [!gotcha] Vertex lines must have at least four columns
> The rewrite emits exactly `$1" "$2" "$3" "$4" "stat`
> ([`scripts/setlabelstat:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L57)).
> If a vertex line has fewer than four fields, the missing fields print as empty
> strings and the line is corrupted; if it has *more* than five fields, the
> extras are dropped. Standard FreeSurfer labels always have exactly five
> columns, so this only bites non-standard or hand-edited files.

> [!gotcha] Assumes a single-line header
> Only line 1 is treated as the comment header and line 2 as the vertex count
> (`FNR < 3`). A label with a multi-line `#` header — which some tools write —
> would have its second header line reformatted as if it were a vertex record.

> [!gotcha] Column spacing is normalised
> Even though the vertex index and coordinates are unchanged in value, `awk`
> rejoins them with single spaces. The output therefore may not be
> byte-identical in whitespace to the input. Tools that parse labels by
> whitespace tolerate this, but a naive `diff` will show every vertex line as
> changed.

## Error Compensation and Guard Rails

- **Output directory auto-creation.** Before writing, the script runs
  `mkdir -p $(dirname $outlabel)`
  ([`scripts/setlabelstat:54-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L54-L55)),
  so a not-yet-existing output directory is created rather than causing a
  failure.
- **Existence check on input.** A missing input label is caught at parse time
  with a clear error and a non-zero exit
  ([`scripts/setlabelstat:76-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L76-L79)).
- **Vertex count preserved, not recomputed.** Because the operation never adds
  or removes vertices, copying line 2 keeps the count correct — there is no need
  for the recount that [[labels_union]] performs.

## Related Tools

- [[label-format]] — the file format this tool edits; explains the five-column
  vertex layout and the meaning of the stat field.
- [[mri_label2label]] — maps/resamples labels between surfaces and subjects;
  often the producer of the labels you then re-stat.
- [[labels_union]] — combines two labels into one; by contrast it *recomputes*
  the vertex count and merges vertex sets rather than editing the stat column.
- [[mris_spherical_average]] — averages labels across subjects; a common source
  of the per-vertex stat values you might want to overwrite.

## Confidence and Gaps

**High confidence:** complete flag set (`-i`, `-o`, `-s`, `-debug`, `-help`,
`-version`), the mandatory-argument checks, the header-copy/stat-rewrite `awk`
logic, output-directory auto-creation, and the single-line-header assumption —
all read directly from
[`scripts/setlabelstat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat)
and confirmed against `setlabelstat -help`.

## References

- FreeSurfer source: [`scripts/setlabelstat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat) (v8.2.0).
- Built-in help: `setlabelstat -help` (the `BEGINHELP` block,
  [`scripts/setlabelstat:158-163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/setlabelstat#L158-L163)).
