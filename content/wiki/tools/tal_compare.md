---
title: "tal_compare"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/tal_compare"
families: []                     # standalone Talairach QA wrapper
recon_all_stage: null
related:
  - "[[show_tal]]"
  - "[[talairach]]"
  - "[[remove_talairach]]"
  - "[[coordinate-systems]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Calls the legacy display binary mri_show, which has no source in the v8.2.0 tree and is not installed in $FREESURFER_HOME/bin; running it errors with 'mri_show: Command not found'. Behaviour is described from the one-line invocation only."
  - "The companion talairach_new.xfm is not produced by any in-tree script (the only reference is in tal_compare itself); it must be created by the user/an external step before this tool is useful."
tags:
  - talairach
  - qa
  - visualization
  - comparison
  - legacy
---

# tal_compare

## Summary

`tal_compare` is a one-line tcsh wrapper for the quality control of **two**
competing Talairach registrations of the same subject. It invokes the legacy
`mri_show` viewer to display the subject's `orig` volume twice — once under the
established `talairach.xfm` and once under a candidate `talairach_new.xfm` — both
against the shared Talairach reference volume, so the two transforms can be
compared by eye. It takes a single argument: the subject name. It is the
two-transform sibling of [[show_tal]].

## Source Information

- **Language:** tcsh shell script (a single command line)
- **Source file:** [`scripts/tal_compare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare)
- **Binary/script location:** `$FREESURFER_HOME/bin/tal_compare`
- **External tool invoked:** [`mri_show`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21) — a **legacy** FreeSurfer display program.

> [!gotcha] `mri_show` is not present in v8.2.0
> `mri_show` has **no source** in the v8.2.0 tree and is **not installed** under
> `$FREESURFER_HOME/bin`; running `tal_compare` on this install fails with
> `mri_show: Command not found`. The script is retained for historical reasons.
> For an equivalent comparison on a modern install, load both transforms in
> [[wiki/tools/freeview|freeview]].

## Purpose and Context

When you have re-run or hand-edited a Talairach registration, you want to judge
whether the **new** transform is better than the **old** one before adopting it.
`tal_compare` supports exactly that decision: it shows the same subject `orig`
aligned by the existing `talairach.xfm` and by a candidate `talairach_new.xfm`,
each against the canonical Talairach reference
(`$SUBJECTS_DIR/talairach/mri/orig`), so the two alignments can be inspected
side by side.

It is a **legacy QA convenience**, not a pipeline stage, and is **not** called by
[[wiki/pipelines/recon-all|recon-all]] (no caller exists in the script tree). It
differs from [[show_tal]] only in that it adds a second `-T <talairach_new.xfm>`
overlay.

> [!gotcha] `talairach_new.xfm` is your responsibility to create
> The candidate transform `talairach_new.xfm` is **not** produced by any in-tree
> FreeSurfer script — the only reference to that filename in the whole script tree
> is inside `tal_compare` itself. You must generate it yourself (e.g. by re-running
> [[talairach]] to an alternate output name, or by hand editing) and place it at
> `$SUBJECTS_DIR/<subj>/mri/transforms/talairach_new.xfm` before this tool can
> show anything meaningful.

## Inputs

### Required Inputs

- **Subject name** — the single positional argument `$1`. The script reads, for
  that subject, `mri/transforms/talairach.xfm`,
  `mri/transforms/talairach_new.xfm`, and `mri/orig`, plus the reference
  `$SUBJECTS_DIR/talairach/mri/orig` ([`scripts/tal_compare:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21)).

### Input Assumptions

> [!assumption] Subject has both an old and a new Talairach transform, plus a reference subject
> The script assumes the subject has an `orig` volume and **both**
> `talairach.xfm` and `talairach_new.xfm`, and that a reference subject named
> `talairach` exists at `$SUBJECTS_DIR/talairach/mri/orig`
> ([`scripts/tal_compare:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21)). There is no argument checking; any
> missing file surfaces as an `mri_show` error. `$SUBJECTS_DIR` must be set.

## Outputs

### Files Created

None. `tal_compare` only opens an interactive `mri_show` display; it writes
nothing to disk.

### Output Specifications

The "output" is an on-screen comparison of the subject under two different
Talairach transforms against the same reference, all in Talairach space. See
[[coordinate-systems]] for the meaning of that space and how each `.xfm` maps
native voxels into it.

## Mathematical Foundations

None in this script. It applies two precomputed transforms (`talairach.xfm`,
`talairach_new.xfm`) via `mri_show`'s `-T` option
([`scripts/tal_compare:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21)); the transforms themselves are produced
upstream by [[talairach]] (or by the user).

## Configuration Options

### Complete Flag Reference

`tal_compare` exposes **no flags of its own**. The entire `mri_show` command line
is hard-coded; only the subject name varies.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject name. Selects the `orig` volume and the two transforms to display. |

Fixed `mri_show` options baked into the call
([`scripts/tal_compare:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21)):

| Hard-coded option | Meaning |
|-------------------|---------|
| `-m 1.5` | `mri_show` display scaling/brightness factor (legacy viewer option). |
| `-T <talairach.xfm> <orig>` | Show the subject `orig` under the **existing** Talairach transform. |
| `-T <talairach_new.xfm> <orig>` | Show the subject `orig` again under the **candidate** transform. |
| trailing `$SUBJECTS_DIR/talairach/mri/orig` | The reference Talairach volume shown alongside both. |

### Configuration Interactions

None — there are no options to combine. The implicit requirements are that
`$SUBJECTS_DIR` is set, the subject has an `orig` and **both** transforms, and a
`talairach` reference subject exists.

## Typical Use Cases

### 1. Decide whether a re-run Talairach is an improvement (legacy)

```bash
setenv SUBJECTS_DIR /path/to/subjects
# (first create talairach_new.xfm, e.g. an alternate talairach run)
tal_compare bert
# opens mri_show showing bert's orig under talairach.xfm AND
# under talairach_new.xfm, both vs. the Talairach reference
```

> [!gotcha] Modern equivalent
> Because `mri_show` is absent in v8.2.0, do this comparison in
> [[wiki/tools/freeview|freeview]]: load `bert/mri/orig.mgz` with each transform
> in turn (or as two layers) against a Talairach/MNI template and compare.

## Pipeline Context

`tal_compare` is a **standalone, legacy QA** wrapper; it is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or any current pipeline.

**Predecessor:** [[talairach]] (produces `talairach.xfm`) plus a user-made
`talairach_new.xfm` → **tal_compare** → **Successor:** a human judgement on which
transform to keep (no file output). For a single-transform check, use
[[show_tal]].

## Gotchas and Caveats

> [!gotcha] Depends on a `talairach` reference subject
> The trailing argument is `$SUBJECTS_DIR/talairach/mri/orig`
> ([`scripts/tal_compare:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare#L21)) — a subject literally named `talairach`
> that must exist in your `$SUBJECTS_DIR`, just as for [[show_tal]].

> [!gotcha] No argument validation
> Passing no subject, or one missing either transform, is not caught by the
> script; the error comes from `mri_show` (or, on this install, from `mri_show`
> not existing).

## Error Compensation and Guard Rails

None. `tal_compare` performs no checks of its own — it forwards a fixed command
line to `mri_show` and inherits whatever that program does (including failing if
the files or the binary are missing).

## Related Tools

- [[show_tal]] — the single-transform sibling; same wrapper without the second `-T <talairach_new.xfm>` overlay.
- [[talairach]] — computes the `talairach.xfm` (and, re-run, the candidate `talairach_new.xfm`) this tool compares.
- [[remove_talairach]] — removes a Talairach link (the inverse maintenance action).
- [[wiki/tools/freeview|freeview]] — the modern viewer that replaces `mri_show` for this comparison.
- [[coordinate-systems]] — what Talairach space is and how each transform maps into it.

## Confidence and Gaps

**Medium confidence.** The script is a single, fully-read command line; the
subject argument and the hard-coded `mri_show -m 1.5 -T … -T …` invocation are
certain from [`scripts/tal_compare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare). Confidence is capped because
the viewer it drives is legacy and unavailable here, and because the candidate
transform it expects is not produced by any shipped tool.

> [!gap] `mri_show` behaviour and availability
> `mri_show` has no source in the v8.2.0 tree and is not installed; its exact
> rendering, the meaning of `-m 1.5`, and how it lays out two `-T` overlays were
> not observed. The description reflects command-line intent, not a verified run.

> [!gap] Origin of `talairach_new.xfm`
> No in-tree script writes `talairach_new.xfm`; the recipe to produce it (and
> hence the intended end-to-end workflow) is not pinned down by the source.

## References

- FreeSurfer source: [`scripts/tal_compare`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/tal_compare) (v8.2.0).
