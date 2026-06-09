---
title: "label_subject_flash"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/label_subject_flash"
families: []                     # label_subject variant family
recon_all_stage: null
related:
  - "[[label_subject]]"
  - "[[label_subject_mixed]]"
  - "[[label_elderly_subject]]"
  - "[[label_child]]"
  - "[[mri_ca_label]]"
  - "[[gca-format]]"
  - "[[aseg.mgz]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The script passes the tissue-parameters file as the argument to -flash, but mri_ca_label's -flash takes no argument (the file belongs to -flash_parms); as a result tissue_parms.txt is consumed as a positional input volume and labelling fails. Apparent defect."
  - "The hard-coded atlas n7.gca is absent from the v8.2.0 distribution."
tags:
  - segmentation
  - atlas
  - subcortical
  - flash
  - aseg
  - legacy
---

# label_subject_flash

## Summary

`label_subject_flash` is a labelling-only variant of [[label_subject]] intended
for **FLASH** (multi-flip-angle gradient-echo) data. It is meant to call
[[mri_ca_label]] once, using the FLASH forward model and a tissue-parameters file
to predict atlas intensities, on an already-normalised subject. As written in
v8.2.0, the tissue-parameters file is passed to the `-flash` option — but
[[mri_ca_label]]'s `-flash` takes **no argument** (the file belongs to
`-flash_parms`), so the path is mis-parsed as an input volume and labelling fails
(see Configuration Interactions).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/label_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash)
- **Binary/script location:** `$FREESURFER_HOME/bin/label_subject_flash`
- **FreeSurfer tool invoked:** [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L29) (single call, with `-flash`).

## Purpose and Context

This script exists to label FLASH-contrast subjects, where the GCA's T1-weighted
intensity model does not apply directly: [[mri_ca_label]]'s FLASH forward model
re-predicts class intensities from MR tissue parameters (`tissue_parms.txt`). It
is the FLASH member of the `label_subject` variant family. It is **not** called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

## Inputs

### Required Inputs

- **Subject ID** — positional `$1`
  ([`scripts/label_subject_flash:25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L25)).
- **`mri/norm`** — normalised input volume.
- **`transforms/talairach.lta`** — affine subject→atlas transform ([[lta-format]]).
- **`$GCA`** atlas — `$FREESURFER_HOME/average/n7.gca`
  ([`scripts/label_subject_flash:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L23)).
- **`$FREESURFER_HOME/average/tissue_parms.txt`** — FLASH tissue parameters
  (present in the v8.2.0 install).

### Input Assumptions

> [!assumption] Registration and normalisation already done
> Only [[mri_ca_label]] runs; `norm` and `transforms/talairach.lta` are assumed to
> exist. No `-mask` is passed, so labelling is not restricted to a skull-stripped
> brain.

## Outputs

### Files Created

| File | Created by | Contents |
|------|-----------|----------|
| `mri/aseg` | [[mri_ca_label]] | Subcortical segmentation label volume ([[aseg.mgz]]) — only if the labeller parses its arguments successfully (see defect below) |
| `mri/aseg/` (directory) | `mkdir -p` | Created before labelling |

### Output Specifications

Label geometry/labels are set by the atlas and [[mri_ca_label]]; labels follow
the FreeSurfer [[color-lut|colour LUT]].

## Mathematical Foundations

None in the script. The FLASH forward model (predicting class intensities from
flip angle, TR, T1, and PD via the tissue-parameters file) lives in
[[mri_ca_label]] (`GCArenormalizeToFlash`).

> [!internal] See [[mri_ca_label]] for the FLASH forward model and [[gca-format]].

## Configuration Options

### Complete Flag Reference

No command-line flags; only the subject ID. Fixed environment/behaviour:

| Argument / variable | Value | Description |
|---------------------|-------|-------------|
| `$1` (subject) | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `$GCA` | `$FREESURFER_HOME/average/n7.gca` | Atlas, hard-coded ([`:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L23)). |
| `$LTA` | `talairach.lta` | Transform filename ([`:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L21)). |
| `$ASEG` | `aseg` | Output name ([`:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L22)). |

Command as written
([`scripts/label_subject_flash:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L29)):

```tcsh
mri_ca_label -flash $FREESURFER_HOME/average/tissue_parms.txt \
             mri/norm  transforms/talairach.lta  n7.gca  mri/aseg
```

### Configuration Interactions

> [!contradiction] `-flash` takes no argument — `tissue_parms.txt` is mis-parsed
> The script writes `-flash <tissue_parms.txt>`, but in [[mri_ca_label]] the
> `-flash` option is a **boolean** (it only sets the FLASH-forward-model flag and
> consumes no argument); the tissue-parameters file is supposed to be supplied via
> the separate `-flash_parms <file>` option. Because `-flash` swallows nothing,
> `mri_ca_label` reads the remaining tokens as positionals
> (`tissue_parms.txt`, `norm`, `talairach.lta`, `n7.gca`, `aseg`) and assigns
> `in_fname = tissue_parms.txt`, `xform = talairach.lta`, `gca = n7.gca`,
> `out = aseg`, treating `tissue_parms.txt` **and** `norm` as two input volumes.
> It then fails trying to read the text file `tissue_parms.txt` as an MRI volume.
> The script's intent was almost certainly
> `mri_ca_label -flash -flash_parms <tissue_parms.txt> norm …` (or
> `-flash_parms` alone). Treat this as a defect in the script as shipped; verified
> against [`mri_ca_label/mri_ca_label.cpp:2029-2041`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_label/mri_ca_label.cpp#L2029-L2041)
> and the positional-argument parsing at
> [`mri_ca_label/mri_ca_label.cpp:346-354`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_label/mri_ca_label.cpp#L346-L354).

## Typical Use Cases

### Intended use (FLASH labelling)

```bash
# Intended invocation — but see the -flash/-flash_parms defect above: as shipped
# the labeller mis-parses the tissue-parameters file as an input volume.
setenv SUBJECTS_DIR /data/study
label_subject_flash subj01
```

A working FLASH labelling call (corrected) would be:

```bash
mri_ca_label -flash -flash_parms $FREESURFER_HOME/average/tissue_parms.txt \
  $SUBJECTS_DIR/subj/mri/norm \
  $SUBJECTS_DIR/subj/mri/transforms/talairach.lta \
  $FREESURFER_HOME/average/n7.gca \
  $SUBJECTS_DIR/subj/mri/aseg.mgz
```

## Pipeline Context

A standalone (FLASH) labelling step reusing prior registration/normalisation. Not
part of recon-all.

**Predecessor:** [[label_subject]] / recon-all (produces `norm`,
`talairach.lta`) → **`label_subject_flash`** → **Successor:** consumers of
`aseg`.

## Gotchas and Caveats

> [!gotcha] `mkdir -p $sdir/aseg` creates a directory named `aseg`
> The script makes a directory `mri/aseg`
> ([`scripts/label_subject_flash:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash#L28))
> before the (intended) labelling, so the output would be written to the path
> `mri/aseg` (no `.mgz`), not the canonical `aseg.mgz`.

> [!gotcha] No brain mask is applied
> Like [[label_elderly_subject]], this variant omits `-mask`, so labelling is not
> constrained to a skull-stripped brain.

## Error Compensation and Guard Rails

- Creates the output `aseg` path with `mkdir -p` before labelling.
- No option parsing or input validation; the `-flash` mis-parse surfaces as an
  [[mri_ca_label]] read error on `tissue_parms.txt`.

## Known Bugs

- [[00152]] — passes the tissue-parms file to `-flash` (a no-argument boolean in `mri_ca_label`) instead of `-flash_parms`; the stray filename halts option parsing, positionals are mis-assigned, and FLASH renormalisation never happens.

## Related Tools

- [[label_subject]] — the full registration + normalisation + labelling driver.
- [[label_subject_mixed]] / [[label_elderly_subject]] / [[label_child]] — sibling labelling-only variants (T1/paediatric atlases).
- [[mri_ca_label]] — the labelling binary this wraps; documents `-flash` and `-flash_parms`.
- [[gca-format]] — atlas format.

## Confidence and Gaps

**High confidence:** the single `mri_ca_label -flash …` command, the hard-coded
`n7.gca` atlas, and the `-flash`-takes-no-argument mis-parse — read directly from
[`scripts/label_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash)
and cross-checked against `mri_ca_label.cpp`.

> [!gap] `-flash` vs `-flash_parms` mismatch (apparent defect)
> The tissue-parameters file is passed to `-flash`, which takes no argument, so it
> is consumed as a positional input volume and labelling fails. The script likely
> intended `-flash_parms`.

> [!gap] `n7.gca` absent from the v8.2.0 install
> `$FREESURFER_HOME/average/n7.gca` is not present in the v8.2.0 `average/`
> directory; the atlas would have to be supplied separately. (The
> `tissue_parms.txt` file *is* present.)

## References

- FreeSurfer source: [`scripts/label_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/label_subject_flash) (v8.2.0).
- FLASH option in [`mri_ca_label/mri_ca_label.cpp:2029-2041`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_ca_label/mri_ca_label.cpp#L2029-L2041).
