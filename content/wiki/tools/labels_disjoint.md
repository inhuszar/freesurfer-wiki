---
title: "labels_disjoint"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/labels_disjoint"
families: []                     # standalone tcsh utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[labels_intersect]]"
  - "[[mri_mergelabels]]"
  - "[[mri_label2label]]"
  - "[[mris_label2annot]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Behaviour when a vertex index appears more than once within a single input label (degenerate labels) is not guarded; assumed not to occur for well-formed surface labels."
tags:
  - label
  - roi
  - surface
  - set-operations
---

# labels_disjoint

## Summary

Despite its name, `labels_disjoint` does **not** test whether two labels are
disjoint. It computes the **set difference** of two FreeSurfer surface labels:
given `label1` and `label2` it writes a third label containing every vertex that
is in `label1` **but not** in `label2` (the relative complement
`label1 − label2`). The script's own description line and example confirm this —
*"label1 minus label2"* — and code is authoritative. It is a small,
dependency-free tcsh script that operates on the ASCII [[label-format]] directly
with `grep`, `sort`, and `awk`, performing no geometric computation.

> [!gotcha] The name is misleading — this is set difference, not a disjointness test
> `labels_disjoint` returns the vertices of `label1` that are absent from
> `label2`. It is the relative complement / set-minus operator, **not** a
> predicate that reports whether the two labels overlap. The usage banner makes
> this explicit: `description: label1 minus label2`
> ([`scripts/labels_disjoint:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L10)). The output is the
> "disjoint" portion of `label1` — the part that does not intersect `label2`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/labels_disjoint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint)
- **Binary/script location:** `$FREESURFER_HOME/bin/labels_disjoint`
- **External tools used:** only standard Unix utilities (`grep`, `sort`, `head`,
  `awk`, `wc`, `cat`, `rm`). No FreeSurfer binaries are invoked, and
  `$FREESURFER_HOME/sources.csh` is **not** sourced.

## Purpose and Context

Surface ROIs are stored one-per-file as `.label` files ([[label-format]]),
each listing a subset of mesh vertices. A frequent editing operation is to
**carve one region out of another** — for example, to remove the primary visual
area V1 from a larger occipital ROI so the remainder can be analysed
separately. `labels_disjoint` does exactly that, answering:

> "Which vertices of `label1` are **not** also in `label2`?"

The canonical example baked into the usage message removes V1 from an occipital
label:

```
labels_disjoint rh.Occ.label rh.V1.label rh.Occ_V1.label
```

The result, `rh.Occ_V1.label`, is "occipital cortex minus V1". It is a hand-run
analysis utility. It is **not** part of [[wiki/pipelines/recon-all|recon-all]]
or [[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script calls
it. For the intersection ($V_1 \cap V_2$) see [[labels_intersect]]; for a
union/merge see [[mri_mergelabels]].

## Inputs

### Required Inputs

`labels_disjoint` takes **three positional arguments**, in order:

| Position | Name | What it is |
|----------|------|------------|
| `$1` | `label1` | The label to keep vertices **from** ([[label-format]]) |
| `$2` | `label2` | The label whose vertices are **subtracted** ([[label-format]]) |
| `$3` | `outputname` | Path of the difference label to write |

If any of the three is empty the script prints its usage (including the
`label1 minus label2` description) and exits 1
([`scripts/labels_disjoint:9-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L9-L14)).

### Input Assumptions

> [!assumption] Two surface labels over the same surface
> Both inputs are assumed to be standard ASCII surface `.label` files: a header
> line beginning with `#`, then a single line giving the vertex count, then one
> `vno x y z stat` row per vertex ([[label-format]]). The difference is taken on
> the **vertex-number field** (`$1` of each data row), so both labels must
> reference the **same surface** (same mesh, same hemisphere) for the result to
> be meaningful. The script does not check surface identity, subject name, or
> coordinate system — it matches integers only.

- Headers are detected as lines matching `^#`
  ([`scripts/labels_disjoint:17-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L17-L18)).
- The vertex-count line is taken as the first non-header line and stripped with
  `grep -v --line-regexp` ([`scripts/labels_disjoint:22-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L22-L29)).

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `outputname` (`$3`) | `.label` ([[label-format]]) | Header copied from `label1`, a recomputed vertex count, then the `label1` data rows for every vertex present in `label1` but absent from `label2`. |

Intermediate scratch files named `<PID>.tmp.*` are written in the **current
working directory** and deleted at the end
([`scripts/labels_disjoint:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L61)).

### Output Specifications

The output is a valid surface label whose:

- **Rows are copied verbatim from `label1`** for the surviving vertices
  ([`scripts/labels_disjoint:49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L49)), so the `x y z stat` values are exactly
  `label1`'s.
- **Header is copied from `label1`** ([`scripts/labels_disjoint:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L55)), so the
  `from subject … vox2ras=…` metadata is `label1`'s.
- **Vertex count is recomputed** from the surviving rows with `wc -l`
  ([`scripts/labels_disjoint:56-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L56-L57)).

## Mathematical Foundations

None — this is a pure set operation on integer vertex indices, not a numerical
algorithm. With $V_1$ and $V_2$ the vertex sets of the two labels, the output
vertex set is the relative complement $V_1 \setminus V_2$ (everything in $V_1$
that is not also in $V_2$). The implementation forms the sorted union of both
labels' vertices ([`scripts/labels_disjoint:32-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L32-L35)) and then, for each
candidate vertex, keeps it only if it is found in `label1` (first `grep`,
[`scripts/labels_disjoint:41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L41)) **and** absent from `label2` (second
`grep`, [`scripts/labels_disjoint:44-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L44-L50)).

> [!gotcha] The operation is asymmetric — order matters
> `labels_disjoint A B out` gives `A − B`, while `labels_disjoint B A out` gives
> `B − A`. These are different sets. (Contrast [[labels_intersect]], whose
> result is symmetric in its two inputs.)

## Configuration Options

### Complete Flag Reference

`labels_disjoint` has **no option flags** — it is driven entirely by three
positional arguments. There is no `--help`, `--version`, or `--debug` handler;
running it with the wrong number of arguments prints the one-line usage.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `label1` (`$1`) | path | *(required)* | Minuend: the label vertices are kept **from**. |
| `label2` (`$2`) | path | *(required)* | Subtrahend: the label whose vertices are removed. |
| `outputname` (`$3`) | path | *(required)* | Output difference label to create/overwrite. |

(Debug tracing exists only as the commented-out `# set echo=1` at
[`scripts/labels_disjoint:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L3); uncomment in a local copy to trace.)

### Configuration Interactions

None — there are no flags to interact. Argument **order is significant**
(`label1 label2 outputname`) and not interchangeable, because the operation is
the asymmetric set difference `label1 − label2`.

## Typical Use Cases

### Carve one ROI out of another

```bash
# Occipital cortex with the V1 area removed
labels_disjoint rh.Occ.label rh.V1.label rh.Occ_V1.label
```

### Remove an overlapping region before merging

```bash
# Strip the shared vertices out of label B so A and (B−A) can be merged
# into a non-overlapping annotation
cd $SUBJECTS_DIR/subj/label
labels_disjoint lh.regionB.label lh.regionA.label lh.regionB_only.label
mri_mergelabels -i lh.regionA.label -i lh.regionB_only.label -o lh.combined.label
```

## Pipeline Context

`labels_disjoint` is a stand-alone, interactively-run label-algebra helper. It
is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script references
it.

**Predecessor:** any tool that produces surface labels —
[[mri_cor2label]], `mri_annotation2label`, `mri_surfcluster`, or hand-drawn ROIs
in [[wiki/tools/freeview|freeview]] → **labels_disjoint** →
**Successor:** [[mri_mergelabels]] (recombine non-overlapping pieces),
[[mris_label2annot]], or `mri_label2vol`.

## Gotchas and Caveats

> [!gotcha] Scratch files land in the current directory
> All temporary files are created as `$$.tmp.*` (PID-prefixed) in the
> **working directory**, not in a system temp dir
> ([`scripts/labels_disjoint:17-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L17-L50)). They are removed on normal exit
> ([`scripts/labels_disjoint:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L61)), but an interrupted run leaves them
> behind, and a same-named file in that directory could collide.

> [!gotcha] Header is matched as a `grep` pattern, not a fixed string
> The header lines are removed with `grep -v "\`cat header\`"`
> ([`scripts/labels_disjoint:20-21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L20-L21), [`:26-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L26-L27)), i.e. the
> captured header text is fed back to `grep` as a **regular expression**. For
> ordinary FreeSurfer headers this works, but a header containing regex
> metacharacters could in principle be mishandled. The vertex index match uses
> `grep --word-regexp "^${vno}"` ([`scripts/labels_disjoint:41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L41), [`:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L44)),
> which correctly prevents `^12` from matching `120`.

> [!gotcha] Progress is printed to stdout
> The loop echoes each candidate vertex number as it is processed
> ([`scripts/labels_disjoint:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L40)), so a large label produces a long stream of
> numbers on the terminal. This is informational only.

## Error Compensation and Guard Rails

Minimal. The only guard is the three-argument check
([`scripts/labels_disjoint:9-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L9-L14)). The script does **not** verify that the
inputs exist, that they are valid labels, that they share a surface, or that the
output directory is writable. An existing output file is overwritten without a
backup (`> $f3`, [`scripts/labels_disjoint:55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L55)).

## Related Tools

- [[labels_intersect]] — sibling script; computes the **intersection**
  ($V_1 \cap V_2$) rather than the difference.
- [[mri_mergelabels]] — C tool for the **union** of one or more labels; the
  natural partner for reassembling non-overlapping pieces produced here.
- [[mri_label2label]] — maps a label between surfaces/subjects; its
  `--label-cortex` mode builds the cortex label used elsewhere in FreeSurfer.
- [[mris_label2annot]] — collects a set of labels into a single annotation
  ([[annotation-format]]).
- [[mri_cor2label]] — a common upstream producer of the surface labels fed here.

## Confidence and Gaps

**High confidence:** the entire control flow was read from
[`scripts/labels_disjoint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint) (61 lines). The tool is positional-only and
computes `label1 − label2` ($V_1 \setminus V_2$) by vertex number, copying the
surviving rows and header from `label1` and writing scratch files to the current
directory.

> [!gap] Degenerate / duplicated vertices
> If the same vertex index appears more than once within an input label, the
> `grep`-based logic could behave unexpectedly; well-formed FreeSurfer labels do
> not contain duplicates, so this case is neither guarded nor tested.

## References

- FreeSurfer source: [`scripts/labels_disjoint`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint) (v8.2.0).
- Built-in usage: run `labels_disjoint` with no arguments
  ([`scripts/labels_disjoint:9-14`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_disjoint#L9-L14)).
- Label file layout: [[label-format]].
