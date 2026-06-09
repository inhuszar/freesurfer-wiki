---
title: "map_all_labels"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/map_all_labels"
families: []                     # standalone label-mapping helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris_spherical_average]]"
  - "[[map_all_labels-lh]]"
  - "[[map_central_sulcus]]"
  - "[[label-format]]"
  - "[[mri_label2label]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The on-disk source of the `${hemi}-${label}` average templates (i.e. which package directory ships avg_superior_temporal_sulcus / avg_central_sulcus / avg_calcarine_sulcus and on which subject's surface they live) is inferred, not located."
tags:
  - label
  - surface
  - registration
  - average
---

# map_all_labels

## Summary

`map_all_labels` paints three standard average sulcal labels — the superior
temporal sulcus, the central sulcus, and the calcarine sulcus — onto **both**
hemispheres of one subject, by spherically averaging each label from the
`average7` template subject through the spherical registration. It is a small
fixed-purpose tcsh driver that calls [[mris_spherical_average]] six times (three
labels × two hemispheres) and writes the results into the subject's `label/`
directory.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/map_all_labels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels)
- **Binary/script location:** `$FREESURFER_HOME/bin/map_all_labels`
- **Author/Origin:** MGH (General Hospital Corporation), 2021 license header.
- **FreeSurfer tool invoked:**
  [`mris_spherical_average`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L24)
  (the workhorse that does the label transfer).

## Purpose and Context

Some FreeSurfer reference labels are defined on an average template surface and
need to be brought onto an individual subject by following the surface
spherical registration (`sphere.reg`). `map_all_labels` is a convenience driver
that does this for a fixed set of three sulcal labels and both hemispheres at
once, so a user (or an older processing script) does not have to spell out the
six [[mris_spherical_average]] commands by hand.

The single-hemisphere counterpart [[map_all_labels-lh]] runs only the left
hemisphere; this `map_all_labels` runs `rh` then `lh`. Both are hand-run helpers
— neither is invoked by [[wiki/pipelines/recon-all|recon-all]] (no script in the
FreeSurfer scripts tree calls them).

## Inputs

### Required Inputs

- **`$1` — subject ID** (the only argument). Used both as the output subject for
  [[mris_spherical_average]] (`-o $1`) and to locate the label output directory
  `$SUBJECTS_DIR/$1/label`
  ([`scripts/map_all_labels:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L21)).

The three average labels are **hard-coded**, not arguments:
`avg_superior_temporal_sulcus`, `avg_central_sulcus`, `avg_calcarine_sulcus`
([`scripts/map_all_labels:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L23)).

### Input Assumptions

> [!assumption] Spherical registration and the average7 templates must exist
> The subject must already have a surface spherical registration `?h.sphere.reg`
> (a standard recon-all output), and the `average7` template subject — together
> with its three `?h-avg_*_sulcus` label templates — must be resolvable by
> [[mris_spherical_average]] on `$SUBJECTS_DIR`/the FreeSurfer average tree. The
> call passes `sphere.reg` as the registration surface and `average7` as the
> template subject
> ([`scripts/map_all_labels:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L24)).
> `$SUBJECTS_DIR` must be set, since the output path is built from it.

## Outputs

### Files Created

For each hemisphere `?` ∈ {`rh`, `lh`} and each of the three sulci, one label is
written into the subject's label directory:

| File | Where | Contents |
|------|-------|----------|
| `?h-avg_superior_temporal_sulcus` | `$SUBJECTS_DIR/$1/label/` | Superior temporal sulcus label, mapped from `average7`. |
| `?h-avg_central_sulcus` | `$SUBJECTS_DIR/$1/label/` | Central sulcus label, mapped from `average7`. |
| `?h-avg_calcarine_sulcus` | `$SUBJECTS_DIR/$1/label/` | Calcarine sulcus label, mapped from `average7`. |

The output filename is exactly the `fname` argument
`$ddir/${hemi}-${label}`, i.e. `<subject>/label/<hemi>-<labelname>`
([`scripts/map_all_labels:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L24)).
These are FreeSurfer surface labels ([[label-format]]).

### Output Specifications

Each output is a surface label on the subject's mesh: the vertex set of the
template sulcus label transferred through `sphere.reg`, with per-vertex stat
values produced by [[mris_spherical_average]]. The exact thresholding/erosion
behaviour is whatever `mris_spherical_average` applies by default here (this
driver passes **no** `-t`/`-erode`/`-orig` options, unlike the entorhinal-cortex
call inside recon-all).

## Mathematical Foundations

`map_all_labels` contains no math; the label transfer is performed by
[[mris_spherical_average]], which resamples a label from the template subject's
spherical coordinate system into the target subject's via the `sphere.reg`
registration and accumulates a per-vertex average/overlap statistic.

> [!internal] Spherical averaging lives in `mris_spherical_average`
> See [[mris_spherical_average]] for the surface-based averaging math
> (spherical resampling of the `label` field and the resulting per-vertex
> statistic). This script only supplies the fixed label names, the `average7`
> template, and the output paths.

## Configuration Options

### Complete Flag Reference

`map_all_labels` takes **one positional argument and no flags**.

| Argument | Position | Type | Description |
|----------|----------|------|-------------|
| subject ID | 1 (`$1`) | string | Subject to paint the labels onto; also the output subject (`mris_spherical_average -o $1`). |

The fixed `mris_spherical_average` invocation it builds is:

```
mris_spherical_average -o <subj> label <hemi>-<labelname> <hemi> sphere.reg average7 <subj>/label/<hemi>-<labelname>
```

mapping to `mris_spherical_average`'s positional grammar
`[option] <which> <fname> <hemi> <spherical surf> <subject 1> … <output>`:
`which = label`, `fname = <hemi>-<labelname>`, `hemi = <hemi>`,
`spherical surf = sphere.reg`, `subject 1 = average7`,
`output = <subj>/label/<hemi>-<labelname>`.

### Configuration Interactions

There are no flags and therefore no flag interactions. The only behavioural
contrast is with the sibling script: **`map_all_labels` iterates `rh` then
`lh`**, whereas [[map_all_labels-lh]] iterates only `lh`
([`scripts/map_all_labels:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L22)
vs [`scripts/map_all_labels-lh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L20)).

> [!gotcha] Runs under `tcsh -ef`: the first failure aborts the whole run
> The shebang is `#!/bin/tcsh -ef`
> ([`scripts/map_all_labels:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L1)).
> The `-e` flag makes the script exit as soon as any one
> [[mris_spherical_average]] call returns non-zero, so a missing `sphere.reg` or
> a missing template label for, say, `rh` will stop the script before the
> remaining hemispheres/labels are processed.

## Typical Use Cases

### Use Case 1: Map all three average sulci onto a subject (both hemispheres)

```bash
export SUBJECTS_DIR=/path/to/subjects
map_all_labels bert
# writes bert/label/{rh,lh}-avg_{superior_temporal,central,calcarine}_sulcus
```

### Use Case 2: Left hemisphere only

```bash
# Use the dedicated single-hemisphere wrapper instead.
map_all_labels-lh bert
```

## Pipeline Context

`map_all_labels` is a stand-alone label-mapping helper. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]] and is not called by any other FreeSurfer
script.

**Predecessor:** a subject with a completed surface spherical registration
(`?h.sphere.reg`, from recon-all surface processing) → **map_all_labels** →
**Successor:** anatomical analyses or visualisations that use the three average
sulcal labels (e.g. as ROIs or landmarks).

The closely related [[map_central_sulcus]] maps the central sulcus alone for one
hemisphere (via a different mechanism), and [[map_all_labels-lh]] is the
left-only variant of this script.

## Gotchas and Caveats

> [!gotcha] The label set is fixed, not configurable
> Only the three hard-coded `avg_*_sulcus` labels are mapped; there is no way to
> pass a different label list on the command line. To map a different label, call
> [[mris_spherical_average]] directly.

> [!gotcha] Depends on the `average7` template being available
> The template subject is hard-wired to `average7`. If that subject (and its
> `?h-avg_*_sulcus` label templates) is not on `$SUBJECTS_DIR` or in the
> FreeSurfer average tree where `mris_spherical_average` looks, the calls fail.

## Error Compensation and Guard Rails

There is essentially none in this script itself: it does not validate `$1`,
check for `sphere.reg`, or create the output directory. It relies entirely on
[[mris_spherical_average]] to error out (and on `tcsh -ef` to propagate that
failure). The output directory `$SUBJECTS_DIR/$1/label` is assumed to already
exist.

## Related Tools

- [[mris_spherical_average]] — the engine that actually transfers each label
  through the spherical registration; all real behaviour and options live here.
- [[map_all_labels-lh]] — the left-hemisphere-only variant of this script.
- [[map_central_sulcus]] — maps the central sulcus label for a single
  hemisphere (via `recon-all`), a narrower sibling.
- [[label-format]] — the format of the labels written.
- [[mri_label2label]] — the more general, flag-driven label mapping tool when you
  need to map an arbitrary label between subjects/surfaces.

## Confidence and Gaps

**High confidence:** the single subject-ID argument, the three hard-coded label
names, the both-hemisphere (`rh`,`lh`) loop, the exact
[[mris_spherical_average]] command and its `average7`/`sphere.reg` arguments, the
output path `$SUBJECTS_DIR/$1/label/<hemi>-<label>`, and the `tcsh -ef`
fail-fast behaviour — all read directly from
[`scripts/map_all_labels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels).

> [!gap] Provenance of the `avg_*_sulcus` templates
> The script names `average7` and the three `?h-avg_*_sulcus` templates but does
> not reveal where those label files ship. The exact package directory / surface
> they live on was not located and is left for human verification.

## References

- FreeSurfer source: [`scripts/map_all_labels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels) (v8.2.0).
- Engine: [`scripts/map_all_labels:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels#L24) — the `mris_spherical_average` call.
