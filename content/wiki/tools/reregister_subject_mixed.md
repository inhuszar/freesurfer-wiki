---
title: "reregister_subject_mixed"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/reregister_subject_mixed"
families: []                     # legacy GCA/atlas registration variant
recon_all_stage: null
related:
  - "[[register_subject]]"
  - "[[register_subject_mixed]]"
  - "[[mri_em_register]]"
  - "[[talairach.lta]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The mixed.gca atlas is not shipped with FreeSurfer 8.2.0."
tags:
  - registration
  - atlas
  - gca
  - legacy
  - mixed-contrast
---

# reregister_subject_mixed

## Summary

`reregister_subject_mixed` is the **re-registration (refinement) variant** of
the mixed-contrast driver. It is a legacy tcsh script that runs
[[mri_em_register]] again against the `mixed.gca` atlas, but uses the
previously intensity-**normalised** volume (`mri/norm`) as the moving image
instead of the raw `orig`. The result is written to `transforms/talairach.lta`.
It is meant to be run *after* an initial pass (e.g. [[register_subject_mixed]])
to refine the registration on cleaner intensities.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/reregister_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed)
- **Binary/script location:** `$FREESURFER_HOME/bin/reregister_subject_mixed`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed#L31)

## Purpose and Context

After an initial atlas registration and intensity normalisation, a second EM
registration on the normalised volume can be more accurate because the input
contrast is closer to the atlas model. `reregister_subject_mixed` performs that
second pass against the mixed-contrast atlas. Like the rest of the family it
creates the `fsamples`, `norm`, and `transforms` sub-directories under
`$SUBJECTS_DIR/<subj>/mri`.

## What This Variant Does (differences from `register_subject_mixed`)

| Aspect | `register_subject_mixed` | `reregister_subject_mixed` |
|--------|--------------------------|----------------------------|
| GCA atlas | `$CMA/average/mixed_a1_ma.gca` | `average/mixed.gca` (not overridden) |
| Moving (input) volume | `$sdir/orig` | **`$sdir/norm`** (the previously normalised volume) |
| `-norm` target | `$sdir/norm` | `$sdir/norm` (same path as the input — see gotcha) |
| `-p` / `-mask` | neither | neither |

The `-fsamples`, `-norm`, `-p`, and `-mask` tokens in the rows above are options
of the downstream [[mri_em_register]] call, **not** flags of
`reregister_subject_mixed` itself — the script has no argument parser and
accepts only a positional subject ID (`$1`). All exist in `mri_em_register`:
`-fsamples` ([`mri_em_register/mri_em_register.cpp:1908`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1908)),
`-norm` ([`mri_em_register/mri_em_register.cpp:2059`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2059)),
`-p`/`-P` ([`mri_em_register/mri_em_register.cpp:2194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2194)),
and `-mask` ([`mri_em_register/mri_em_register.cpp:1806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1806)).
The `-norm` reuse is the subject of bug [[00180]] (see below).

The literal command is
[`mri_em_register -fsamples $sdir/fsamples -norm $sdir/norm $sdir/norm $GCA $sdir/transforms/talairach.lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed#L31).

> [!gotcha] Reads `norm` as input and re-writes `norm` as output
> The same path `$sdir/norm` appears twice: once as the value of `-norm` (the
> normalisation **output**) and once as the trailing positional **input**
> volume ([`scripts/reregister_subject_mixed:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed#L31)).
> So the script takes the previously normalised volume as input and overwrites
> it with a freshly normalised version. This is the intended "re-register from
> norm" behaviour, but it is destructive: the prior `norm` is replaced in place.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — must exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/norm`** — the previously normalised volume, used
  as the moving image (must already exist from a prior registration pass).
- **GCA atlas** — `$FREESURFER_HOME/average/mixed.gca`.

### Input Assumptions

> [!assumption] A prior registration/normalisation pass has already produced `norm`
> This script is a **second** pass: it assumes `mri/norm` already exists (e.g.
> from [[register_subject_mixed]] or another driver that ran
> `mri_em_register -norm`). Running it on a subject that has never been
> registered will fail because the input `norm` is missing.

> [!contradiction] The `mixed.gca` atlas is not shipped with 8.2.0
> `mixed.gca` is absent from the 8.2.0 `average/` directory, so the script
> cannot run unmodified against a stock install.

## Outputs

`transforms/talairach.lta` (the refined subject→atlas [[lta]]), an updated
`norm` (overwritten in place), `fsamples/`, and a `talairach.lta.log`.

## Mathematical Foundations

None in the script. The EM affine registration is in [[mri_em_register]].

> [!internal] See [[mri_em_register]] for the registration algorithm.

## Configuration Options

No command-line flags; one positional subject-id argument. Behaviour is fixed
by the hard-coded atlas and the `norm`-as-input command line above.

## Pipeline Context

A legacy stand-alone driver, not called by
[[wiki/pipelines/recon-all|recon-all]]. It is a refinement step that follows an
initial mixed-contrast registration.

**Predecessor:** [[register_subject_mixed]] (produces `norm`) →
**reregister_subject_mixed** (re-registers from `norm`) →
**Successor:** GCA labelling (`label_subject`).

## Known Bugs

- [[00180]] — the `mri_em_register` call passes `mri/norm` as both the positional input and the `-norm` output, so it re-normalises the input in place and overwrites it each run.

## Related Tools

- [[register_subject_mixed]] — the first-pass mixed-contrast driver this refines.
- [[register_subject]] — the canonical family driver.
- [[mri_em_register]] — the registration engine.

## Confidence and Gaps

**High confidence:** the atlas choice and the `-norm $sdir/norm $sdir/norm`
input/output reuse are read directly from
[`scripts/reregister_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed).

> [!gap] Intended multi-pass workflow
> The exact original sequence (which first-pass driver was meant to precede
> this re-registration, and how many iterations were run) is not documented in
> the source and is inferred from the shared `norm`/`mixed.gca` conventions.

## References

- FreeSurfer source: [`scripts/reregister_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reregister_subject_mixed) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
