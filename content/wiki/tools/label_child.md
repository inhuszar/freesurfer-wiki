---
title: "label_child"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label_child"
families: []                     # label_subject variant family
recon_all_stage: null
related:
  - "[[label_subject]]"
  - "[[label_subject_mixed]]"
  - "[[label_elderly_subject]]"
  - "[[label_subject_flash]]"
  - "[[mri_ca_label]]"
  - "[[gca-format]]"
  - "[[aseg.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The script references $GCA_TL, which is never assigned; under tcsh -ef this aborts the run with an 'Undefined variable' error before mri_ca_label executes. Apparent defect (intended to be the children temporal-lobe GCA)."
  - "Both children atlases (talairach_children_b.gca, talairach_children_tl_b.gca) are absent from the v8.2.0 distribution."
tags:
  - segmentation
  - atlas
  - subcortical
  - pediatric
  - aseg
  - legacy
---

# label_child

## Summary

`label_child` is a labelling-only variant of [[label_subject]] intended for
**paediatric** subjects. It is meant to call [[mri_ca_label]] once with the
children GCA atlas and an auxiliary temporal-lobe atlas (the `-tl` option) to
produce `mri/aseg` from an already-normalised subject. As written in v8.2.0,
however, it references an **undefined variable** (`$GCA_TL`) for the `-tl`
argument, which aborts the script before labelling runs under `tcsh -ef`
(see Configuration Interactions).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/label_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child)
- **Binary/script location:** `$FREESURFER_HOME/bin/label_child`
- **FreeSurfer tool invoked:** [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L30) (single call, with `-tl`).

## Purpose and Context

This script exists to label children's brains with a paediatric GCA atlas, using
the [[mri_ca_label]] `-tl` option to insert a dedicated thin-temporal-lobe atlas
for the parts of the temporal lobe that the main atlas labels poorly. It is the
paediatric member of the `label_subject` variant family. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`
  ([`scripts/label_child:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L26)).
- **`mri/norm`** — atlas-normalised T1 (input to labelling).
- **`mri/brain`** — skull-stripped brain, used as `-mask`.
- **`transforms/talairach.lta`** — affine subject→atlas transform ([[lta-format]]).
- **`$GCA`** atlas — effectively `talairach_children_tl_b.gca` (see below).
- **`$GCA_TL`** atlas — *referenced but never set* (the `-tl` temporal-lobe atlas).

### Input Assumptions

> [!assumption] Registration and normalisation already done
> Only [[mri_ca_label]] runs; `norm`, `brain`, and `transforms/talairach.lta` are
> assumed to exist from a prior pass.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/aseg` | [[mri_ca_label]] | Subcortical segmentation label volume ([[aseg.mgz]]) — only if the script reaches the labelling call (see defect below) |
| `mri/aseg/` (directory) | `mkdir -p` | Created before labelling |

### Output Specifications

Label geometry/labels are set by the atlas and [[mri_ca_label]]; labels follow
the FreeSurfer [[color-lut|colour LUT]].

## Mathematical Foundations

None in the script — see [[mri_ca_label]] for the MAP labelling algorithm
(including the `-tl` temporal-lobe-insertion step) and [[gca-format]] for the
atlas structure.

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID. Fixed environment/behaviour:

| Argument / variable | Value | Description |
|---------------------|-------|-------------|
| `$1` (subject) | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$GCA` | `talairach_children_b.gca` **then** `talairach_children_tl_b.gca` | Atlas set twice; the second wins ([`:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L23-L24)). |
| `$GCA_TL` | *(never assigned)* | Temporal-lobe atlas for `-tl`; **undefined** — see below. |
| `$LTA` | `talairach.lta` | Transform filename ([`:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L21)). |
| `$ASEG` | `aseg` | Output name ([`:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L22)). |

Intended command
([`scripts/label_child:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L30)):

```tcsh
mri_ca_label -tl $GCA_TL -mask mri/brain  mri/norm  transforms/talairach.lta  $GCA  mri/aseg
```

Per [[mri_ca_label]], `-tl <gca>` supplies an auxiliary GCA used to label the thin
temporal lobe.

### Configuration Interactions

> [!contradiction] `$GCA_TL` is referenced but never defined — the script aborts
> The labelling command uses `-tl $GCA_TL`, but the script only ever assigns
> `$GCA` (twice); `$GCA_TL` is never set
> ([`scripts/label_child:23-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L23-L30)).
> Under the `#!/bin/tcsh -ef` shebang, dereferencing an undefined variable is a
> fatal error (`GCA_TL: Undefined variable.`, exit 1), so the script **aborts
> before `mri_ca_label` runs** and no `aseg` is produced. The two atlas
> assignments strongly suggest the intent was `setenv GCA_TL …` for one of the two
> children atlases (most plausibly `talairach_children_tl_b.gca` for the `-tl`
> argument and `talairach_children_b.gca` for the main `$GCA`). Treat this as a
> defect in the script as shipped.

> [!gotcha] `talairach_children_b.gca` is dead code — only the `tl_b` atlas survives
> As with [[label_elderly_subject]], the first `setenv GCA …children_b.gca` is
> immediately overwritten by `setenv GCA …children_tl_b.gca`
> ([`scripts/label_child:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L23-L24)),
> so the main atlas argument resolves to `talairach_children_tl_b.gca`.

## Typical Use Cases

### Intended use (paediatric labelling)

```bash
# Intended invocation — but see the $GCA_TL defect above: as shipped, the
# script aborts before mri_ca_label runs.
setenv SUBJECTS_DIR /data/study
label_child subj_child01
```

To actually run paediatric labelling with a temporal-lobe atlas, call
[[mri_ca_label]] directly with both atlases, e.g.:

```bash
mri_ca_label -tl $FREESURFER_HOME/average/talairach_children_tl_b.gca \
  -mask $SUBJECTS_DIR/subj/mri/brain \
  $SUBJECTS_DIR/subj/mri/norm \
  $SUBJECTS_DIR/subj/mri/transforms/talairach.lta \
  $FREESURFER_HOME/average/talairach_children_b.gca \
  $SUBJECTS_DIR/subj/mri/aseg.mgz
```

## Pipeline Context

A standalone (paediatric) labelling step reusing prior
registration/normalisation. Not part of recon-all.

**Predecessor:** [[label_subject]] / recon-all (produces `norm`, `brain`,
`talairach.lta`) → **`label_child`** → **Successor:** consumers of `aseg`.

## Gotchas and Caveats

> [!gotcha] `mkdir -p $sdir/aseg` creates a directory named `aseg`
> The script makes a directory `mri/aseg`
> ([`scripts/label_child:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child#L29))
> before the (intended) labelling, so the output would be written to the path
> `mri/aseg` (no `.mgz`), not the canonical `aseg.mgz`.

## Error Compensation and Guard Rails

- Creates the output `aseg` path with `mkdir -p` before labelling.
- **No guard for the undefined `$GCA_TL`** — `tcsh -ef` aborts instead. There is
  no option parsing or input validation.

## Known Bugs

- [[00171]] — references `$GCA_TL` (for `mri_ca_label -tl`) but never sets it; under `#!/bin/tcsh -ef` the unset variable is fatal, so the script aborts (`GCA_TL: Undefined variable.`) before `mri_ca_label` runs.

## Related Tools

- [[label_subject]] — the full registration + normalisation + labelling driver.
- [[label_subject_mixed]] / [[label_elderly_subject]] — sibling labelling-only variants (different atlases; no `-tl`).
- [[label_subject_flash]] — FLASH-contrast sibling variant.
- [[mri_ca_label]] — the labelling binary this wraps; documents the `-tl` option.
- [[gca-format]] — atlas format.

## Confidence and Gaps

**High confidence:** the single (intended) `mri_ca_label -tl … -mask …` command,
the double `setenv GCA` (so `…children_tl_b.gca` is effective), and the
undefined-`$GCA_TL` abort under `tcsh -ef` — read directly from
[`scripts/label_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child)
and verified against tcsh's undefined-variable behaviour.

> [!gap] `$GCA_TL` is never assigned (apparent defect)
> The `-tl $GCA_TL` reference has no corresponding `setenv GCA_TL`. As shipped in
> v8.2.0 the script cannot complete. The intended atlas for `-tl` is not recorded.

> [!gap] Children atlases absent from the v8.2.0 install
> Neither `talairach_children_b.gca` nor `talairach_children_tl_b.gca` is present
> in the v8.2.0 `average/` directory; even with the `$GCA_TL` defect fixed, the
> atlases would have to be supplied separately.

## References

- FreeSurfer source: [`scripts/label_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_child) (v8.2.0).
