---
title: "label_subject_mixed"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label_subject_mixed"
families: []                     # label_subject variant family
recon_all_stage: null
related:
  - "[[label_subject]]"
  - "[[mri_ca_label]]"
  - "[[label_child]]"
  - "[[label_elderly_subject]]"
  - "[[label_subject_flash]]"
  - "[[gca-format]]"
  - "[[aseg.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The hard-coded atlas $FREESURFER_HOME/average/mixed.gca is not present in the v8.2.0 distribution; the script will fail at mri_ca_label unless that legacy atlas is supplied separately."
tags:
  - segmentation
  - atlas
  - subcortical
  - aseg
  - legacy
---

# label_subject_mixed

## Summary

`label_subject_mixed` is a one-shot variant of [[label_subject]] that performs
subcortical labelling with the **mixed-contrast** GCA atlas
(`$FREESURFER_HOME/average/mixed.gca`). Unlike the canonical [[label_subject]],
it does **not** re-run registration or normalisation — it assumes `mri/norm`,
`transforms/talairach.lta`, and `mri/brain` already exist and simply calls
[[mri_ca_label]] once to write `mri/aseg`. It is the simplest member of the
`label_subject` variant family: a single fixed `mri_ca_label` invocation that
differs from its siblings only in the atlas and options used.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/label_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed)
- **Binary/script location:** `$FREESURFER_HOME/bin/label_subject_mixed`
- **Original author:** Bruce Fischl
- **FreeSurfer tool invoked:** [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L30) (single call).

## Purpose and Context

This script exists to label a subject whose intensity model is best matched by
the **mixed** GCA atlas, reusing an already-computed Talairach transform and
normalised volume rather than recomputing them. It is a fixed-parameter
convenience wrapper around [[mri_ca_label]], parallel to [[label_subject]] but
covering only the final labelling step.

It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`, resolved under `$SUBJECTS_DIR`
  ([`scripts/label_subject_mixed:26-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L26-L28)).
- **`mri/norm`** — atlas-normalised T1 (input to labelling).
- **`mri/brain`** — skull-stripped brain, used as `-mask`.
- **`transforms/talairach.lta`** — affine subject→atlas transform ([[lta-format]]).
- **`mixed.gca`** atlas — set as `$GCA` from `$FREESURFER_HOME/average/mixed.gca`
  ([`scripts/label_subject_mixed:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L24)).

### Input Assumptions

> [!assumption] Registration and normalisation already done
> The script runs only [[mri_ca_label]]; it assumes a prior pass (e.g.
> [[label_subject]] or recon-all) has already produced `norm`,
> `transforms/talairach.lta`, and `brain`. No cross-sequence or FLASH option is
> applied, so the subject's `norm` intensities are assumed compatible with the
> mixed atlas.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/aseg` | [[mri_ca_label]] | Subcortical segmentation label volume ([[aseg.mgz]]) |
| `mri/aseg/` (directory) | `mkdir -p` | Created before labelling (see gotcha) |

### Output Specifications

Label geometry and the label set are determined by `mixed.gca` and
[[mri_ca_label]]; labels follow the FreeSurfer [[color-lut|colour LUT]].

## Mathematical Foundations

None in the script — all classification math is in [[mri_ca_label]].

> [!internal] See [[mri_ca_label]] for the MAP labelling algorithm and
> [[gca-format]] for the atlas structure.

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID. Fixed environment/behaviour:

| Argument / variable | Value | Description |
|---------------------|-------|-------------|
| `$1` (subject) | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$GCA` | `$FREESURFER_HOME/average/mixed.gca` | Atlas, hard-coded ([`:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L24)). |
| `$LTA` | `talairach.lta` | Transform filename ([`:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L22)). |
| `$ASEG` | `aseg` | Output name ([`:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L23)). |

Exact command run
([`scripts/label_subject_mixed:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L30)):

```tcsh
mri_ca_label -mask mri/brain  mri/norm  transforms/talairach.lta  mixed.gca  mri/aseg
```

### Configuration Interactions

The single difference from [[label_subject]]'s labelling call is the atlas
(`mixed.gca`) and the **absence** of `-cross-sequence`: this variant labels
directly in the atlas's native intensity model.

## Typical Use Cases

### Label an already-normalised subject with the mixed atlas

```bash
setenv SUBJECTS_DIR /data/study
label_subject_mixed subj01
# → mri/aseg
```

## Pipeline Context

A standalone labelling step that reuses prior registration/normalisation output.
Not part of recon-all.

**Predecessor:** [[label_subject]] / recon-all (produces `norm`, `talairach.lta`,
`brain`) → **`label_subject_mixed`** → **Successor:** consumers of `aseg`.

## Gotchas and Caveats

> [!gotcha] `mkdir -p $sdir/aseg` creates a *directory* named `aseg`
> The script runs `mkdir -p $SUBJECTS_DIR/<subj>/mri/aseg`
> ([`scripts/label_subject_mixed:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed#L29))
> and then asks [[mri_ca_label]] to write its output to the path `mri/aseg`. Since
> a directory of that name now exists, the canonical `aseg.mgz` is **not** the
> target — the label volume is written under the literal name `aseg` (FreeSurfer's
> auto-format detection determines the on-disk form). This differs from
> [[label_subject]], which writes `mri/aseg.mgz`. Treat the output filename as
> `aseg` (no extension), as written by the script.

## Error Compensation and Guard Rails

- Creates the output `aseg` path with `mkdir -p` before labelling.
- No option parsing or input validation; a missing `norm`/`brain`/`talairach.lta`
  surfaces as an [[mri_ca_label]] error.

## Related Tools

- [[label_subject]] — the full driver (registration + normalisation + labelling); this is its labelling-only, mixed-atlas variant.
- [[mri_ca_label]] — the labelling binary this wraps.
- [[label_child]] / [[label_elderly_subject]] / [[label_subject_flash]] — sibling variants with different atlases/options.
- [[gca-format]] — atlas format.

## Confidence and Gaps

**High confidence:** the single `mri_ca_label` command, the hard-coded
`mixed.gca` atlas, and the absence of cross-sequence/FLASH options — read
directly from
[`scripts/label_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed).

> [!gap] `mixed.gca` is not in the v8.2.0 install
> `$FREESURFER_HOME/average/mixed.gca` is absent from the v8.2.0 `average/`
> directory (which ships the `RB_all_*` atlases instead). The script will fail at
> [[mri_ca_label]] unless this legacy atlas is provided separately.

## References

- FreeSurfer source: [`scripts/label_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_mixed) (v8.2.0).
