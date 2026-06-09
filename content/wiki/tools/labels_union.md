---
title: "labels_union"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/labels_union"
families: []                     # standalone label-combining script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[label-format]]"
  - "[[mri_label2label]]"
  - "[[setlabelstat]]"
  - "[[mris_spherical_average]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether the header-stripping greps misbehave on labels with a multi-line or empty `#` header is inferred from the grep construction, not exercised against such a file."
tags:
  - label
  - surface
  - union
  - editing
---

# labels_union

## Summary

`labels_union` computes the **set union of two FreeSurfer surface
[labels](label-format)** that live on the same surface: it produces a new label
containing every vertex that appears in either input. For vertices present in
both inputs, the record (coordinates and stat value) from the **first** label is
kept. The result is written with the first label's comment header and a freshly
recomputed vertex count. It is a small tcsh script that drives `grep`, `sort`,
and `awk`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/labels_union`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union)
- **Binary/script location:** `$FREESURFER_HOME/bin/labels_union`
- **External commands used:** `grep`, `sort`, `awk`, `head`, `wc`, `cat`, `rm`.
  No FreeSurfer binary is invoked.

## Purpose and Context

A FreeSurfer surface label enumerates a set of mesh vertices, each with its RAS
coordinate and a stat value ([[label-format]]). It is common to want the union
of two anatomically adjacent labels — for example merging the two
cytoarchitectonic subfields `BA3a` and `BA3b` into a single `BA3ab` label
(exactly the example printed in the usage string). `labels_union` automates that
merge so the user does not have to hand-edit the vertex list and re-count the
header.

It operates on **labels defined on a common surface**: it merges by vertex
index and does not resample or transform coordinates, so both inputs must refer
to the same subject and hemisphere. For mapping a label onto a *different*
surface or subject, use [[mri_label2label]] or [[mris_spherical_average]] first,
then union the results.

It is a hand-run utility and is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

Three positional arguments, validated at
[`scripts/labels_union:5-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L5-L13):

1. **`<label1>`** — first input label ([[label-format]]). Its header and its
   records win on ties.
2. **`<label2>`** — second input label, on the **same surface** as label 1.
3. **`<outputname>`** — path of the union label to write.

If any of the three is empty, the script prints the usage/example and exits 1.

### Input Assumptions

> [!assumption] Two labels on the same surface, standard layout
> Both inputs are assumed to be canonical surface labels ([[label-format]]):
> a first line beginning with `#`, a second line giving the integer vertex
> count, then `vertexno x y z stat` records. The script strips those two header
> lines from each file before merging
> ([`scripts/labels_union:16-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L16-L28)),
> unions the records by **vertex index**, and assumes both labels index the same
> mesh — there is no coordinate check, so unioning labels from different
> subjects or hemispheres silently produces a meaningless mix of coordinates.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<outputname>` | user-specified | The union label: label 1's `#` header, a recomputed vertex count, then one record per unique vertex (label-1 record preferred on ties). |
| `$$.tmp.*` | current working directory | Several intermediate scratch files (`$$` = the script's PID); **all are deleted** at the end ([`scripts/labels_union:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L57)). |

### Output Specifications

The output is an ASCII surface label ([[label-format]]). The header line is
copied verbatim from **label 1**
([`scripts/labels_union:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L51)).
The vertex-count line is **recomputed** as the number of records in the merged
body (`wc -l`), not copied
([`scripts/labels_union:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L52-L53)).
Records are taken verbatim (full `vertexno x y z stat` line) from whichever input
supplied each vertex.

> [!gotcha] Output order follows a numeric sort, not the input order
> Vertices are emitted in ascending numeric vertex-index order, because the merge
> iterates over `sort -n -u` output
> ([`scripts/labels_union:31-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L31-L34)).
> The output therefore will not preserve either input's original ordering. This
> is harmless for label semantics (a label is an unordered set) but matters if
> you `diff` against an input.

## Mathematical Foundations

The only operation is a **set union over vertex indices**. Let $V_1$ and $V_2$
be the vertex-index sets of the two inputs. The output vertex set is
$V_1 \cup V_2$, and for each $v \in V_1 \cup V_2$ the emitted record is the
label-1 record if $v \in V_1$, else the label-2 record:

$$
\text{rec}(v) =
\begin{cases}
\text{rec}_1(v) & v \in V_1 \\
\text{rec}_2(v) & v \in V_2 \setminus V_1
\end{cases}
$$

There is no coordinate arithmetic. The `sort -n -u` merely de-duplicates the
union of the two record streams so the script can iterate once per candidate
vertex; the actual preference is enforced by trying label 1 first
([`scripts/labels_union:38-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L38-L48)).

> [!gotcha] Stat values are taken from one input, never combined
> On a shared vertex the union keeps label 1's stat value and **discards** label
> 2's; the stats are not summed, averaged, or `max`-ed. If you need a uniform
> stat across the merged label, post-process with [[setlabelstat]].

## Configuration Options

### Complete Flag Reference

`labels_union` is **purely positional** — it has no option flags. The three
arguments are read directly as `$1 $2 $3`
([`scripts/labels_union:5-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L5-L7)).

| Argument | Position | Type | Description |
|----------|----------|------|-------------|
| `<label1>` | 1 | string (path) | First input label; supplies the output header and wins ties. |
| `<label2>` | 2 | string (path) | Second input label; same surface as label 1. |
| `<outputname>` | 3 | string (path) | Path of the union label to write. |

There are no `-help`/`-version` flags; running with fewer than three
non-empty arguments prints the usage line and exits.

### Configuration Interactions

None — there are no flags to interact. The only "interaction" is the **tie-break
asymmetry**: because label 1 is tried first, swapping the order of the two label
arguments changes the kept coordinates/stat for shared vertices (and changes
which header is written), even though the *set* of output vertices is identical.

> [!gotcha] The operation is order-sensitive despite being a "union"
> `labels_union A B out` and `labels_union B A out` yield the same vertex set but
> can differ in the header line and in the coordinate/stat record stored for any
> vertex common to both — A's records win in the first call, B's in the second.

## Typical Use Cases

### Use Case 1: Merge two cytoarchitectonic subfields (the canonical example)

```bash
# Combine BA3a and BA3b into a single BA3ab label on the right hemisphere.
labels_union rh.BA3a.label rh.BA3b.label rh.BA3ab.union.label
```

This is the exact example the script prints in its usage text.

### Use Case 2: Build a multi-region ROI by chaining unions

```bash
# Union is binary, so chain it to combine three labels.
labels_union lh.precentral.label lh.postcentral.label /tmp/lh.pre_post.label
labels_union /tmp/lh.pre_post.label lh.paracentral.label lh.sensorimotor.label
```

Because the tool takes exactly two inputs, larger unions are produced by
repeated application.

### Use Case 3: Union then normalise the stat field

```bash
labels_union lh.A.label lh.B.label lh.AB.label
setlabelstat -i lh.AB.label -o lh.AB.label -s 1   # give every vertex stat = 1
```

Use when the two inputs carry different stat values but you want the merged
label treated as a uniform mask.

## Pipeline Context

`labels_union` is a stand-alone label utility. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or any other FreeSurfer script.

**Predecessor:** two labels on a common surface — drawn in
[[wiki/tools/freeview|freeview]], mapped with [[mri_label2label]], or produced
by [[mris_spherical_average]] → **labels_union** → **Successor:**
[[setlabelstat]] (to re-stat the merged label), surface statistics, or overlay
display.

## Gotchas and Caveats

> [!gotcha] Runs in, and writes scratch files to, the current directory
> The temporary files are named `$$.tmp.*` in the **current working directory**,
> not a temp dir
> ([`scripts/labels_union:16-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L16-L57)).
> Two concurrent runs are safe (the PID `$$` differs), but the CWD must be
> writable, and a crash before the final `rm` leaves `<pid>.tmp.*` files behind.

> [!gotcha] Header handling uses the input as a `grep` pattern
> Header and vertex-count stripping is done by feeding the captured header /
> count line back into `grep -v` as a *pattern*
> ([`scripts/labels_union:19-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L19-L28)).
> This works for the normal single-line `#` header, but a label with an unusual
> header (multi-line, empty, or containing regex metacharacters) can cause the
> wrong lines to be stripped or kept.

> [!gotcha] No same-surface check
> The script never verifies that the two labels come from the same subject or
> hemisphere. Unioning, say, an `lh` and an `rh` label produces a file whose
> vertex indices collide meaninglessly across hemispheres. It is the user's
> responsibility to pass labels on a common surface.

## Error Compensation and Guard Rails

- **Argument check.** Missing any of the three positional arguments prints the
  usage/example and exits 1
  ([`scripts/labels_union:9-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L9-L13)).
- **Vertex count is always recomputed**, so the output header count is correct
  regardless of overlap between the inputs
  ([`scripts/labels_union:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L52-L53)).
- **Scratch cleanup.** All `$$.tmp.*` files are removed on normal completion
  ([`scripts/labels_union:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L57)).
- The script does **not** sanity-check coordinates or guard against
  cross-surface unions (see Gotchas).

## Related Tools

- [[label-format]] — the file format being merged; explains the header and the
  `vertexno x y z stat` records.
- [[setlabelstat]] — the natural companion: after a union, flatten the
  mixed-origin stat column to a single value.
- [[mri_label2label]] — map a label onto a different surface/subject before
  unioning when the inputs are not already co-registered.
- [[mris_spherical_average]] — averages labels across subjects; can produce the
  per-subject labels you then union.

## Confidence and Gaps

**High confidence:** the union-by-vertex-index semantics, the label-1
tie-break, header copy from label 1, recomputed vertex count, numeric-sorted
output order, the positional (flag-free) interface, and scratch-file behaviour —
all read directly from
[`scripts/labels_union`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union)
and confirmed against the script's usage output.

> [!gap] Behaviour on non-standard headers
> The header/count stripping reuses the captured lines as `grep` patterns. The
> failure modes for multi-line, empty, or regex-bearing headers are inferred
> from the grep construction rather than tested against such files.

## References

- FreeSurfer source: [`scripts/labels_union`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union) (v8.2.0).
- Usage string / canonical example: printed by running `labels_union` with no
  arguments ([`scripts/labels_union:10-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_union#L10-L11)).
