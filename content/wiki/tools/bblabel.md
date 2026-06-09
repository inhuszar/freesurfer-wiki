---
title: "bblabel"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/bblabel"
families: []                     # standalone tcsh utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[bbmask]]"
  - "[[labels_intersect]]"
  - "[[labels_disjoint]]"
  - "[[mri_label2label]]"
  - "[[mris_label2annot]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The coordinate system of the x/y/z columns is whatever the input label declares (typically TkReg surface RAS); bblabel does not read or honour the vox2ras= header token, so a scanner-RAS or voxel label is filtered using its raw column values without conversion."
  - "The --rev flag is parsed but never used in the body; its intended (inverted-box) behaviour is not implemented in this version."
tags:
  - label
  - roi
  - surface
  - bounding-box
---

# bblabel

## Summary

`bblabel` applies a **rectangular bounding box to a FreeSurfer label**, keeping
only the label points whose coordinates fall inside the box and writing them to
a new `.label` file. The box is defined by up to six independent bounds
(`xmin`, `xmax`, `ymin`, `ymax`, `zmin`, `zmax`); any bound left unspecified is
treated as $\pm\infty$, so you can clip on as few as one face. It is a small
tcsh script that parses the ASCII [[label-format]] with `awk`, tests each point
with `bc`, and performs no surface or geometric computation of its own.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/bblabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel)
- **Binary/script location:** `$FREESURFER_HOME/bin/bblabel`
- **External tools used:** standard Unix utilities (`awk`, `head`, `tail`, `bc`,
  `wc`, `cat`, `mv`, `rm`). It sources `$FREESURFER_HOME/sources.csh`
  ([`scripts/bblabel:45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L45)) but calls **no** FreeSurfer binaries.

## Purpose and Context

A label ([[label-format]]) is a list of points — usually surface vertices — each
with an index, an `(x, y, z)` coordinate, and a per-point statistic. Sometimes a
label sprawls beyond the anatomical region of interest, or you want to retain
only the part of a region within a spatial window (e.g. keep only the dorsal or
posterior portion of a gyrus). `bblabel` provides a fast coordinate-space crop:
specify the bounding box and it copies through only the points inside it.

The help text's own example clips a left-hemisphere cuneus label:

```
bblabel --l lh.G_cuneus.label --o lh.out.label \
  --xmin 0 --ymax -90 --zmin 10 --zmax 20
```

which keeps points with $x > 0$, $y < -90$, and $10 < z < 20$
([`scripts/bblabel:242-248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L242-L248)). It is a hand-run editing/analysis utility,
**not** part of [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script calls it.
It is the **label** analogue of [[bbmask]], which crops a *volume's* field of
view to a bounding box around a mask.

## Inputs

### Required Inputs

| Flag | What it is |
|------|------------|
| `--l <labelfile>` | Input surface label to crop ([[label-format]]). Must exist ([`scripts/bblabel:180-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L180-L183)). |
| `--o <outlabelfile>` | Output label path for the cropped result. Required ([`scripts/bblabel:185-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L185-L188)). |

At least one bound (`--xmin`/`--xmax`/`--ymin`/`--ymax`/`--zmin`/`--zmax`)
is needed for the tool to do anything useful, but none is individually
*required* — with no bounds at all, every point passes and the output is a copy
of the input.

### Input Assumptions

> [!assumption] A `.label` file whose columns are read positionally
> The input is parsed as a standard ASCII surface label: **line 1** is a header
> comment, **line 2** is the point count, and **lines 3+** are
> `vno x y z stat` rows ([[label-format]]). `bblabel` reads the index from
> column 1 and the coordinates from columns 2/3/4 with `awk`
> ([`scripts/bblabel:58-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L58-L63)). The header line is preserved verbatim; the
> point count is recomputed.

> [!gotcha] The bounds are compared against the label's raw coordinate columns, with no coordinate conversion
> `bblabel` compares your `--xmin`/`--xmax`/… directly against the numbers in
> columns 2–4 of the label, whatever coordinate system those represent. For a
> typical FreeSurfer surface label that is **TkReg (surface) RAS**, but the
> script never inspects the `vox2ras=` token in the header
> ([[label-format]]). If the label is in scanner RAS or voxel coordinates, the
> bounds must be given in *that* same system — `bblabel` does no conversion. See
> [[coordinate-systems]] for the distinction.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `outlabelfile` (`--o`) | `.label` ([[label-format]]) | The input header line, a recomputed point count, then the subset of `vno x y z stat` rows lying inside the box. |
| `outlabelfile.bak` | `.label` | If the output path already exists, the previous file is moved aside to `*.bak` before writing ([`scripts/bblabel:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L53)). |

A temporary file `outlabelfile.tmp<PID>` is used to accumulate the surviving
rows and is removed at the end ([`scripts/bblabel:55-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L55-L56), [`:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L89)).

### Output Specifications

The output is a valid surface label identical in structure to the input. The
**header line is copied unchanged** from the input
([`scripts/bblabel:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L58), [`:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L85)) — including its `from subject … vox2ras=…`
metadata — and surviving rows (index, coordinates, and stat) are passed through
verbatim ([`scripts/bblabel:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L78)). The point count on line 2 is recomputed with
`wc -l` over the kept rows ([`scripts/bblabel:86-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L86-L87)).

## Mathematical Foundations

The operation is a logical conjunction of half-space tests — an axis-aligned
bounding-box (AABB) membership check. For each point with coordinates
$(x, y, z)$, the point is kept iff every *specified* bound is satisfied:

$$
(x > x_{\min}) \wedge (x < x_{\max}) \wedge
(y > y_{\min}) \wedge (y < y_{\max}) \wedge
(z > z_{\min}) \wedge (z < z_{\max})
$$

with any omitted bound dropped from the conjunction (equivalently set to
$\mp\infty$). The script builds this expression incrementally as a string,
appending one ``$bound && coord > limit`` clause per specified bound, and then
evaluates the whole expression with `echo $bound | bc -l`
([`scripts/bblabel:69-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L69-L77)).

> [!gotcha] Comparisons are strict (`>` and `<`), so points exactly on a face are excluded
> Each test uses strict inequality — `> xmin` and `< xmax`
> ([`scripts/bblabel:70-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L70-L75)). A label point lying *exactly* on a boundary
> plane is **not** retained. The box is therefore the open interval
> $(\,x_{\min}, x_{\max}\,) \times (\,y_{\min}, y_{\max}\,) \times (\,z_{\min}, z_{\max}\,)$.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/bblabel:98-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L98-L167)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--l` | string | *(required)* | Input label file to crop ([[label-format]]). Must exist. |
| `--o` | string | *(required)* | Output label file for the cropped result; an existing file is moved to `*.bak` first. |
| `--xmin` | float | $-\infty$ | Keep points with $x >$ this value. If omitted, no lower x bound. |
| `--xmax` | float | $+\infty$ | Keep points with $x <$ this value. If omitted, no upper x bound. |
| `--ymin` | float | $-\infty$ | Keep points with $y >$ this value. |
| `--ymax` | float | $+\infty$ | Keep points with $y <$ this value. |
| `--zmin` | float | $-\infty$ | Keep points with $z >$ this value. |
| `--zmax` | float | $+\infty$ | Keep points with $z <$ this value. |
| `--rev` | boolean | off | **Parsed but not used** — sets an internal `rev` flag the body never references ([`scripts/bblabel:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L34), [`:146-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L146-L148)). It is also commented out of the usage text. No effect in this version (see gotcha). |
| `--debug` | boolean | off | Enable tcsh tracing (`set echo`, `verbose`) ([`scripts/bblabel:150-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L150-L153)). |
| `--umask` | string | — | Set the Unix file-creation mask via `MRI_UMASK` ([`scripts/bblabel:155-158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L155-L158)). |
| `--version` | boolean | — | Print the version string and exit (handled via the usage path). |
| `--help` | boolean | — | Print full help (the `BEGINHELP` block) and exit ([`scripts/bblabel:38-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L38-L43)). |

### Configuration Interactions

- The six bound flags are **independent and individually optional**. Each one
  you supply adds a constraint; each you omit leaves that face open. Supplying
  none copies the whole label.
- `--xmin`/`--xmax` (and the y/z pairs) are not validated for consistency: if
  you set `--xmin 10 --xmax 0` (min above max) the conjunction can never be
  satisfied and the output will be empty. The script does not warn.

> [!gotcha] `--rev` does nothing in this version
> The `--rev` flag is accepted on the command line and stored, but the value is
> never read in the filtering loop ([`scripts/bblabel:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L34) sets it,
> nothing uses it). Whatever "reverse" / keep-outside-the-box behaviour it was
> meant to provide is unimplemented. It is even commented out of the usage
> listing ([`scripts/bblabel:211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L211)). To keep the *complement* of a box, compute
> the cropped label and subtract it with [[labels_disjoint]].

## Typical Use Cases

### Crop a label to a coordinate window

```bash
# Keep cuneus points with x>0, y<-90, and 10<z<20 (TkReg surface RAS)
bblabel --l lh.G_cuneus.label --o lh.out.label \
  --xmin 0 --ymax -90 --zmin 10 --zmax 20
```

### Clip on a single plane

```bash
# Keep only the superior part of an ROI (z above 30); leave x and y open
bblabel --l rh.region.label --o rh.region.superior.label --zmin 30
```

### Restrict to one hemisphere by sign of x

```bash
# Keep only right-of-midline points of a label that straddles the midline
bblabel --l merged.label --o right.label --xmin 0
```

## Pipeline Context

`bblabel` is a stand-alone, interactively-run label-editing helper. It is
**not** invoked by [[wiki/pipelines/recon-all|recon-all]] or
[[wiki/pipelines/trac-all|trac-all]], and no other FreeSurfer script references
it.

**Predecessor:** any tool that produces a surface label —
[[mri_cor2label]], `mri_annotation2label`, `mri_surfcluster`, or hand-drawn ROIs
in [[wiki/tools/freeview|freeview]] → **bblabel** →
**Successor:** further label algebra ([[labels_intersect]],
[[labels_disjoint]], [[mri_mergelabels]]), assembly into an annotation
([[mris_label2annot]]), or mapping to another subject ([[mri_label2label]]).

## Gotchas and Caveats

> [!gotcha] Existing output is renamed to `*.bak`, clobbering any prior backup
> If `outlabelfile` exists, it is moved to `outlabelfile.bak` before the new
> file is written ([`scripts/bblabel:53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L53)). Running `bblabel` twice to the
> same output silently overwrites the previous `.bak`.

> [!gotcha] Per-point loop in tcsh — slow on large labels
> The script reads each coordinate column into a tcsh array and loops over every
> point, spawning a `bc` evaluation per point
> ([`scripts/bblabel:66-82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L66-L82)). For labels with tens of thousands of
> vertices this is noticeably slow; it is intended for modest ROI labels.

> [!gotcha] Coordinate-system bounds, not voxel/volume bounds
> The bounds operate in the label's own coordinate space (see the assumption
> callout). This is different from [[bbmask]], whose `--npad` works in **voxels**
> on a volume. Do not mix the two mental models.

## Error Compensation and Guard Rails

Light. The script checks that a label file was given and exists
([`scripts/bblabel:175-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L175-L183)) and that an output path was given
([`scripts/bblabel:185-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L185-L188)). It does **not** validate that the bounds are
numeric, that min < max, or that the input is actually a label; bad bounds
simply yield an empty or unchanged output. There is no error-exit handler — a
malformed `bc` expression would surface as a `bc` syntax error.

## Related Tools

- [[bbmask]] — the **volume** counterpart: crops a volume's field of view to a
  bounding box around a mask (works in voxels, emits a new registration).
- [[labels_disjoint]] — subtract one label from another; the way to obtain the
  *complement* of a `bblabel` crop (compensates for the non-functional `--rev`).
- [[labels_intersect]] — intersect two surface labels by vertex.
- [[mri_label2label]] — map a label between surfaces/subjects; `--label-cortex`
  mode builds the cortex label.
- [[mris_label2annot]] — assemble labels into an annotation
  ([[annotation-format]]).

## Confidence and Gaps

**High confidence:** the full argument parser and filtering loop were read from
[`scripts/bblabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel) (249 lines). The box test is a strict-inequality AABB
membership check on columns 2–4 of the label, bounds default to $\pm\infty$, the
header is preserved and the count recomputed, and an existing output is backed
up to `*.bak`.

> [!gap] Coordinate system is taken on faith
> `bblabel` never reads the `vox2ras=` header token, so it cannot tell whether
> the label is in TkReg RAS, scanner RAS, or voxel coordinates; the bounds are
> compared against the raw columns. The user must ensure the bounds and the
> label share a coordinate system ([[coordinate-systems]]).

> [!gap] `--rev` is dead code
> The `--rev` option is parsed but never used; its intended inverted-box
> semantics are not implemented in v8.2.0.

## References

- FreeSurfer source: [`scripts/bblabel`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel) (v8.2.0).
- Built-in help: `bblabel --help` (the `BEGINHELP` block,
  [`scripts/bblabel:232-248`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bblabel#L232-L248)).
- Label file layout and coordinate systems: [[label-format]],
  [[coordinate-systems]].
