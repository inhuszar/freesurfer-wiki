---
title: "register_elderly_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register_elderly_subject"
families: []                     # legacy GCA/atlas registration variant
recon_all_stage: null
related:
  - "[[register_subject]]"
  - "[[mri_em_register]]"
  - "[[talairach.lta]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The mixed.gca atlas (and the superseded n7.gca) are not shipped with FreeSurfer 8.2.0."
tags:
  - registration
  - atlas
  - gca
  - legacy
  - elderly
---

# register_elderly_subject

## Summary

`register_elderly_subject` is the **elderly-cohort variant** of
[[register_subject]]. It is a legacy tcsh driver that runs [[mri_em_register]]
to register a subject's `orig` volume to a GCA atlas and write
`transforms/talairach.lta`. It selects the `mixed.gca` atlas and uses a higher
white-matter control-point fraction (`-p .75`, i.e. the top 75 % of WM points)
than the canonical script.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/register_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/register_elderly_subject`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L33)

## Purpose and Context

Atrophy and altered tissue contrast in ageing brains motivate a different atlas
and a larger control-point set when registering elderly subjects.
`register_elderly_subject` provides those settings. It is otherwise the same
driver as [[register_subject]]: it creates the `fsamples`, `norm`, and
`transforms` sub-directories under `$SUBJECTS_DIR/<subj>/mri` and writes the
same `talairach.lta`.

## What This Variant Fixes (differences from `register_subject`)

`register_elderly_subject` itself has **no command-line flags** — the options
below are the arguments it hard-codes into the single [[mri_em_register]] call it
issues ([`scripts/register_elderly_subject:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L33)),
not flags on `register_elderly_subject`'s own command line.

| `mri_em_register` argument | `register_subject` (canonical) | `register_elderly_subject` |
|----------------------------|-------------------------------|----------------------------|
| GCA atlas (positional) | `average/young_new_b.gca` | `average/mixed.gca` (see redefinition gotcha) |
| `-p` (WM control-point fraction; [`mri_em_register.cpp:2194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2194)) | `-p .5` (top 50 %) | `-p .75` (top 75 %, [`scripts/register_elderly_subject:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L33)) |
| `-mask` (brain mask; [`mri_em_register.cpp:1806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1806)) | `-mask $sdir/brain` | **not passed** |

The effective command is
[`mri_em_register -p .75 -fsamples $sdir/fsamples -norm $sdir/norm $sdir/orig $GCA $sdir/transforms/talairach.lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L33).
(`mri_em_register` upper-cases the option, so `-p` ≡ `-P` = `ctl_point_pct`.)

> [!gotcha] The atlas is set twice — `mixed.gca` wins
> The script first sets `GCA = average/n7.gca` and then immediately overwrites
> it with `GCA = average/mixed.gca`
> ([`scripts/register_elderly_subject:21-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L21-L22)).
> Because the second `setenv` wins, `n7.gca` is **never used**; the elderly
> registration runs against `mixed.gca` (the same atlas
> [[register_subject_flash]] uses).

> [!gotcha] The echoed command does not match the command that runs
> Line 32 *echoes* a command line containing `-p .5`, but line 33 *executes*
> `-p .75`
> ([`scripts/register_elderly_subject:32-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject#L32-L33)).
> The printed log is therefore misleading: the real control-point fraction is
> **0.75**, not 0.5.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — must exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/orig`** — moving volume.
- **GCA atlas** — `$FREESURFER_HOME/average/mixed.gca`.

### Input Assumptions

> [!assumption] Prepared subject directory with an `orig` volume
> A FreeSurfer subject directory with `mri/orig` is assumed. No skull-stripping
> mask is applied, so the input ideally is already brain-extracted.

> [!contradiction] The atlases are not shipped with 8.2.0
> Neither `mixed.gca` (used) nor `n7.gca` (dead-set) is present in the 8.2.0
> `average/` directory. The script cannot run unmodified against a stock
> install.

## Outputs

Identical to [[register_subject]]: `transforms/talairach.lta`, `fsamples/`,
`norm/`, and `talairach.lta.log`.

## Mathematical Foundations

None in the script. The EM affine registration is in [[mri_em_register]].

> [!internal] See [[mri_em_register]] for the registration algorithm.

## Configuration Options

No command-line flags; one positional subject-id argument. Behaviour is fixed
by the hard-coded atlas and `-p .75` (see the difference table and gotchas).

## Pipeline Context

A legacy stand-alone driver, not called by
[[wiki/pipelines/recon-all|recon-all]]. Substituted for [[register_subject]]
when the subject is elderly; produces the same `talairach.lta` for downstream
GCA labelling.

**Predecessor:** white-matter labelling → **register_elderly_subject** →
**Successor:** GCA labelling (`label_subject`).

## Related Tools

- [[register_subject]] — the canonical driver; this page documents only the deltas.
- [[mri_em_register]] — the registration engine.
- [[register_child]] — the paediatric sibling variant.

## Confidence and Gaps

**High confidence:** the atlas double-set, the `-p .75` value, and the
echo/run mismatch are all read directly from
[`scripts/register_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject).

> [!gap] Why `n7.gca` is set then discarded
> The dead first `setenv GCA … n7.gca` suggests an in-progress edit that was
> never cleaned up; the original intent (n7 vs. mixed) is not recoverable from
> the source.

## References

- FreeSurfer source: [`scripts/register_elderly_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_elderly_subject) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
