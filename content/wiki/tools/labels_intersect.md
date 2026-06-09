---
title: "labels_intersect"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/labels_intersect"
families: []                     # standalone tcsh utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[labels_disjoint]]"
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

# labels_intersect

## Summary

`labels_intersect` computes the **set intersection of two FreeSurfer surface
labels** by vertex number. Given two `.label` files (`label1`, `label2`) it
writes a third label containing exactly the vertices that appear in **both**
inputs, copying each surviving line verbatim from the larger of the two labels.
It is a small, dependency-free tcsh script that manipulates the ASCII
[[label-format]] directly with `grep`, `sort`, and `awk` — it performs no
geometric or surface computation.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/labels_intersect`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect)
- **Binary/script location:** `$FREESURFER_HOME/bin/labels_intersect`
- **External tools used:** only standard Unix utilities (`grep`, `sort`, `head`,
  `tail`, `awk`, `wc`, `cat`, `rm`). No FreeSurfer binaries are invoked, and
  `$FREESURFER_HOME/sources.csh` is **not** sourced.

## Purpose and Context

Surface ROIs in FreeSurfer are stored one-per-file as `.label` files
([[label-format]]), each listing a subset of mesh vertices. A common need when
combining or comparing atlases — e.g. overlapping Brodmann-area projections — is
to find the vertices shared by two regions. `labels_intersect` answers exactly
that question:

> "Which surface vertices are in *both* `label1` and `label2`?"

The canonical example baked into the usage message intersects two
cytoarchitectonic sub-areas:

```
labels_intersect rh.BA3a.label rh.BA3b.label rh.BA3ab.intersect.label
```

It is a hand-run analysis utility. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] or [[wiki/pipelines/trac-all|trac-all]],
and no other FreeSurfer script calls it. For the complementary operation (set
difference) see [[labels_disjoint]]; for a union/merge that also handles
multi-label statistics, see the C tool [[mri_mergelabels]].

## Inputs

### Required Inputs

`labels_intersect` takes **three positional arguments**, in order:

| Position | Name | What it is |
|----------|------|------------|
| `$1` | `label1` | First input surface label ([[label-format]]) |
| `$2` | `label2` | Second input surface label ([[label-format]]) |
| `$3` | `outputname` | Path of the intersection label to write |

If any of the three is empty the script prints its usage and exits 1
([`scripts/labels_intersect:9-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L9-L13)).

### Input Assumptions

> [!assumption] Two surface labels over the same surface
> Both inputs are assumed to be standard ASCII surface `.label` files: a header
> line beginning with `#`, then a single line giving the vertex count, then one
> `vno x y z stat` row per vertex ([[label-format]]). The intersection is taken
> on the **vertex-number field** (`$1` of each data row), so both labels must
> reference the **same surface** (same mesh, same hemisphere) for the result to
> be meaningful. The script does not check the surface identity, the subject
> name, or the coordinate system — it only matches integers.

- The header is detected as every line matching `^#`
  ([`scripts/labels_intersect:16-17`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L16-L17)); a label whose header does not
  start with `#` would be mis-parsed.
- The vertex-count line is taken as the **first non-header line**
  ([`scripts/labels_intersect:24-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L24-L25)) and is used both to decide which
  label is "small" and to strip the count via `tail -<count>`.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `outputname` (`$3`) | `.label` ([[label-format]]) | Header copied from the **smaller** input label, a recomputed vertex count, then the data rows (taken from the **larger** label) for every vertex shared by both inputs. |

Intermediate scratch files named `<PID>.tmp.*` are written in the **current
working directory** and deleted at the end
([`scripts/labels_intersect:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L62)).

### Output Specifications

The output is itself a valid surface label. Two details follow directly from the
code:

- **Coordinates come from the larger label.** For each shared vertex the script
  emits the matching line from the *bigger* label's sorted body
  ([`scripts/labels_intersect:49-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L49-L53)), so the `x y z stat` values in the
  output are those of `big`, not `small`. For two labels over the same surface
  the coordinates are identical anyway; they can differ only if the two labels
  were sampled on different surfaces (an unsupported use).
- **Header comes from the smaller label** ([`scripts/labels_intersect:56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L56)),
  so the `from subject … vox2ras=…` metadata line in the output is `small`'s.

## Mathematical Foundations

None — this is a pure set operation on integer vertex indices, not a numerical
algorithm. Formally, with $V_1$ and $V_2$ the vertex sets of the two labels, the
output vertex set is the intersection $V_1 \cap V_2$. The work is done by a
linear scan: the smaller label's vertices are iterated, and each is looked up in
the larger label with `grep --word-regexp "^${vno}"`
([`scripts/labels_intersect:49-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L49-L53)).

> [!gotcha] The "smaller label" choice is a performance heuristic, not a coordinate choice
> The script compares the two vertex-count strings and labels the one with the
> smaller count `small`, the other `big`
> ([`scripts/labels_intersect:27-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L27-L33)). It then iterates the *small* set and
> greps each vertex against the *big* set — iterating the shorter list keeps the
> number of greps minimal. A side effect is that the output rows are drawn from
> `big`, which determines whose coordinates appear (see Output Specifications).

## Configuration Options

### Complete Flag Reference

`labels_intersect` has **no option flags** — it is driven entirely by three
positional arguments. There is no `--help`, `--version`, or `--debug` handler;
running it with the wrong number of arguments prints the one-line usage.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `label1` (`$1`) | path | *(required)* | First input surface label. |
| `label2` (`$2`) | path | *(required)* | Second input surface label. |
| `outputname` (`$3`) | path | *(required)* | Output intersection label to create/overwrite. |

(Debug tracing exists only as the commented-out `# set echo=1` at
[`scripts/labels_intersect:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L3); uncomment in a local copy to trace.)

### Configuration Interactions

None — there are no flags to interact. Argument **order is fixed**:
`label1 label2 outputname`. Because the operation is symmetric in the two
inputs, swapping `label1` and `label2` yields the same intersection set; only
the choice of which header/coordinates are copied can change (via the
small/big determination), which is immaterial for labels over a common surface.

## Typical Use Cases

### Intersect two cytoarchitectonic sub-areas

```bash
# Vertices belonging to BOTH BA3a and BA3b on the right hemisphere
labels_intersect rh.BA3a.label rh.BA3b.label rh.BA3ab.intersect.label
```

### Find the overlap of two functional ROIs

```bash
# Shared vertices of two surface clusters (must be on the same ?h surface)
cd $SUBJECTS_DIR/subj/label
labels_intersect lh.taskA.label lh.taskB.label lh.taskAB.overlap.label
```

## Pipeline Context

`labels_intersect` is a stand-alone, interactively-run label-algebra helper. It
is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script references
it.

**Predecessor:** any tool that produces surface labels —
[[mri_cor2label]], `mri_annotation2label`, `mri_surfcluster`, or hand-drawn ROIs
in [[wiki/tools/freeview|freeview]] → **labels_intersect** →
**Successor:** downstream label consumers such as
[[mris_label2annot]] (assemble labels into an annotation), `mri_label2vol`, or
[[mri_label2label]].

## Gotchas and Caveats

> [!gotcha] Scratch files land in the current directory
> All temporary files are created as `$$.tmp.*` (PID-prefixed) in the
> **working directory**, not in a system temp dir
> ([`scripts/labels_intersect:16-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L16-L52)). They are removed on normal exit
> ([`scripts/labels_intersect:62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L62)), but a label literally named `<PID>.tmp.*`
> in that directory could collide, and an interrupted run leaves them behind.

> [!gotcha] Prefix matching of vertex numbers is constrained by `--word-regexp`
> Membership is tested with `grep --word-regexp "^${vno}"`
> ([`scripts/labels_intersect:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L51)). The `^` anchors to the start of the
> line and `--word-regexp` requires a word boundary after the number, so
> `^12` will not spuriously match vertex `120`. This is correct as long as the
> vertex index is the first whitespace-delimited field of every data row (it is,
> in [[label-format]]).

> [!gotcha] Vertex-count comparison is a string comparison
> The decision of which label is "smaller" compares the two count *strings*
> with tcsh `<=` ([`scripts/labels_intersect:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L27)), which in tcsh
> coerces to a numeric comparison. This only selects which input is iterated and
> whose header is copied; it does not affect the set of shared vertices.

## Error Compensation and Guard Rails

Minimal. The only guard is the three-argument check
([`scripts/labels_intersect:9-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L9-L13)). The script does **not** verify that the
inputs exist, that they are valid labels, that they share a surface, or that the
output directory is writable; missing inputs surface as `grep`/`cat` errors
rather than a clean message. An existing output file is overwritten without a
backup (`> $f3`, [`scripts/labels_intersect:56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L56)).

## Related Tools

- [[labels_disjoint]] — sibling script; computes `label1` **minus** `label2`
  (set difference) rather than the intersection.
- [[mri_mergelabels]] — C tool for the **union** of one or more labels, with
  proper handling of duplicate vertices and the stat column.
- [[mri_label2label]] — maps a label between surfaces/subjects and is the
  general-purpose label transformer; the `--label-cortex` mode builds the cortex
  label used elsewhere in FreeSurfer.
- [[mris_label2annot]] — collects a set of labels into a single annotation
  ([[annotation-format]]).
- [[mri_cor2label]] — a common upstream producer of the surface labels fed here.

## Confidence and Gaps

**High confidence:** the entire control flow was read from
[`scripts/labels_intersect`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect) (66 lines). The tool is positional-only,
computes $V_1 \cap V_2$ by vertex number, copies coordinates from the larger
label and the header from the smaller, and writes scratch files to the current
directory.

> [!gap] Degenerate / duplicated vertices
> If the same vertex index appears more than once inside one input label, the
> `grep`-based matching would emit it multiple times; well-formed FreeSurfer
> labels do not contain duplicates, so this case is neither guarded nor tested.

## References

- FreeSurfer source: [`scripts/labels_intersect`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect) (v8.2.0).
- Built-in usage: run `labels_intersect` with no arguments
  ([`scripts/labels_intersect:9-13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/labels_intersect#L9-L13)).
- Label file layout: [[label-format]].
