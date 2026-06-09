---
title: "label_elderly_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label_elderly_subject"
families: []                     # label_subject variant family
recon_all_stage: null
related:
  - "[[label_subject]]"
  - "[[label_subject_mixed]]"
  - "[[mri_ca_label]]"
  - "[[label_child]]"
  - "[[label_subject_flash]]"
  - "[[gca-format]]"
  - "[[aseg.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Both hard-coded atlases (n7.gca, mixed.gca) are absent from the v8.2.0 distribution; the script will fail at mri_ca_label unless the legacy atlas is supplied."
tags:
  - segmentation
  - atlas
  - subcortical
  - aseg
  - legacy
---

# label_elderly_subject

## Summary

`label_elderly_subject` is a labelling-only variant of [[label_subject]] aimed at
**elderly** subjects. It calls [[mri_ca_label]] exactly once on an
already-normalised subject (`mri/norm` + `transforms/talairach.lta`) to produce
`mri/aseg`. It sets the atlas twice — first `n7.gca`, then `mixed.gca` — so the
**effective atlas is `mixed.gca`** (the second assignment wins). Unlike
[[label_subject_mixed]], it passes **no `-mask`** to the labeller.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/label_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/label_elderly_subject`
- **FreeSurfer tool invoked:** [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L30) (single call).

## Purpose and Context

A fixed-parameter convenience wrapper that runs the GCA labelling step with the
atlas chosen for an elderly cohort. It reuses prior registration/normalisation
output and is parallel to [[label_subject_mixed]] but without a brain mask.

It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`
  ([`scripts/label_elderly_subject:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L26)).
- **`mri/norm`** — atlas-normalised T1 (input to labelling).
- **`transforms/talairach.lta`** — affine subject→atlas transform ([[lta-format]]).
- **`$GCA`** atlas — effectively `$FREESURFER_HOME/average/mixed.gca` (see below).

### Input Assumptions

> [!assumption] Registration and normalisation already done; no mask
> The script runs only [[mri_ca_label]] and assumes `norm` and
> `transforms/talairach.lta` already exist. It does **not** pass `-mask`, so the
> labeller operates on the whole `norm` volume rather than a skull-stripped brain.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/aseg` | [[mri_ca_label]] | Subcortical segmentation label volume ([[aseg.mgz]]) |
| `mri/aseg/` (directory) | `mkdir -p` | Created before labelling (see gotcha) |

### Output Specifications

Label geometry/labels are set by the atlas and [[mri_ca_label]]; labels follow
the FreeSurfer [[color-lut|colour LUT]].

## Mathematical Foundations

None in the script — see [[mri_ca_label]] for the MAP labelling algorithm.

> [!internal] See [[mri_ca_label]] and [[gca-format]].

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID. Fixed environment/behaviour:

| Argument / variable | Value | Description |
|---------------------|-------|-------------|
| `$1` (subject) | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$GCA` | `n7.gca` **then** `mixed.gca` | Atlas set twice; the second wins ([`:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L23-L24)). |
| `$LTA` | `talairach.lta` | Transform filename ([`:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L21)). |
| `$ASEG` | `aseg` | Output name ([`:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L22)). |

Exact command run
([`scripts/label_elderly_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L30)):

```tcsh
mri_ca_label  mri/norm  transforms/talairach.lta  $GCA  mri/aseg
```

### Configuration Interactions

> [!gotcha] `n7.gca` is dead code — `mixed.gca` is what runs
> The script sets `setenv GCA …/n7.gca` immediately followed by
> `setenv GCA …/mixed.gca`
> ([`scripts/label_elderly_subject:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L23-L24)).
> Because the second assignment overwrites the first, **`n7.gca` is never used**;
> the labeller always receives `mixed.gca`. This makes the effective behaviour
> identical to [[label_subject_mixed]] except that this script omits `-mask`.

## Typical Use Cases

### Label an elderly subject (mixed atlas, no mask)

```bash
setenv SUBJECTS_DIR /data/study
label_elderly_subject subj01
# → mri/aseg   (uses mixed.gca)
```

## Pipeline Context

A standalone labelling step reusing prior registration/normalisation. Not part of
recon-all.

**Predecessor:** [[label_subject]] / recon-all (produces `norm`,
`talairach.lta`) → **`label_elderly_subject`** → **Successor:** consumers of
`aseg`.

## Gotchas and Caveats

> [!gotcha] `mkdir -p $sdir/aseg` creates a directory named `aseg`
> As with [[label_subject_mixed]], the script makes a directory `mri/aseg`
> ([`scripts/label_elderly_subject:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject#L29))
> and then writes the label volume to the path `mri/aseg` (no `.mgz` extension),
> not the canonical `aseg.mgz`.

> [!gotcha] No brain mask is applied
> Unlike [[label_subject]]/[[label_subject_mixed]], this variant calls
> [[mri_ca_label]] without `-mask`, so labelling is not constrained to a
> skull-stripped brain.

## Error Compensation and Guard Rails

- Creates the output `aseg` path with `mkdir -p` before labelling.
- No option parsing or input validation; missing inputs surface as
  [[mri_ca_label]] errors.

## Related Tools

- [[label_subject]] — the full registration + normalisation + labelling driver.
- [[label_subject_mixed]] — same effective atlas (`mixed.gca`) but **with** `-mask`.
- [[mri_ca_label]] — the labelling binary this wraps.
- [[label_child]] / [[label_subject_flash]] — sibling variants.
- [[gca-format]] — atlas format.

## Confidence and Gaps

**High confidence:** the single `mri_ca_label` command, the double `setenv GCA`
(so `mixed.gca` is effective), and the absence of `-mask` — read directly from
[`scripts/label_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject).

> [!gap] Neither `n7.gca` nor `mixed.gca` is in the v8.2.0 install
> Both `$FREESURFER_HOME/average/n7.gca` and `…/mixed.gca` are absent from the
> v8.2.0 `average/` directory; the script will fail at [[mri_ca_label]] unless the
> legacy atlas is supplied separately. The intent of the (unused) `n7.gca` line is
> not recorded in the script.

## References

- FreeSurfer source: [`scripts/label_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_elderly_subject) (v8.2.0).
