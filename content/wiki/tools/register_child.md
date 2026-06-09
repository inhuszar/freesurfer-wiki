---
title: "register_child"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register_child"
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
  - "The paediatric atlas average/talairach_children_b.gca is not shipped with FreeSurfer 8.2.0."
tags:
  - registration
  - atlas
  - gca
  - legacy
  - pediatric
---

# register_child

## Summary

`register_child` is the **paediatric variant** of [[register_subject]]. It is a
near-identical legacy tcsh driver that runs [[mri_em_register]] to register a
subject's brain to a GCA atlas and write `transforms/talairach.lta`, but
selects a **children's** atlas (`talairach_children_b.gca`) instead of the
young-adult atlas, and omits the `-p` control-point-fraction option used by
`register_subject` (it still passes `-mask $sdir/brain`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/register_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child)
- **Binary/script location:** `$FREESURFER_HOME/bin/register_child`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child#L32)

## Purpose and Context

Paediatric brains differ in size and tissue contrast from the young-adult
template, so atlas registration for children uses a children-specific GCA.
`register_child` exists to run that registration with the appropriate atlas. It
is otherwise structurally identical to [[register_subject]]: it makes the
`fsamples`, `norm`, and `transforms` sub-directories under
`$SUBJECTS_DIR/<subj>/mri` and produces the same `talairach.lta` output.

## What This Variant Fixes (differences from `register_subject`)

`register_child` itself has **no command-line flags** — the options below are the
arguments it hard-codes into the single [[mri_em_register]] call it issues
([`scripts/register_child:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child#L32)),
not flags on `register_child`'s own command line.

| `mri_em_register` argument | `register_subject` (canonical) | `register_child` |
|----------------------------|-------------------------------|------------------|
| GCA atlas (positional) | `average/young_new_b.gca` | `average/talairach_children_b.gca` ([`scripts/register_child:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child#L21)) |
| `-p` (WM control-point fraction; [`mri_em_register.cpp:2194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2194)) | `-p .5` | **not passed** (uses `mri_em_register` default) |
| `-mask` (brain mask; [`mri_em_register.cpp:1806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1806)) | `-mask $sdir/brain` | `-mask $sdir/brain` (**same**) |
| Everything else | — | identical (`-fsamples`, `-norm`, `orig`, output `talairach.lta`) |

The exact command is
[`mri_em_register -mask $sdir/brain -fsamples $sdir/fsamples -norm $sdir/norm $sdir/orig $GCA $sdir/transforms/talairach.lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child#L32).
The single substantive difference from [[register_subject]] is therefore the
**atlas** (children's GCA) and the omission of `-p`.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — must exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/orig`** — moving volume.
- **`$SUBJECTS_DIR/<subj>/mri/brain`** — brain mask passed to `mri_em_register`
  via `-mask` ([`scripts/register_child:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child#L32)).
- **Paediatric GCA atlas** — `$FREESURFER_HOME/average/talairach_children_b.gca`.

### Input Assumptions

> [!assumption] Prepared subject directory with `orig` and `brain` volumes
> A FreeSurfer subject directory with `mri/orig` (moving volume) and `mri/brain`
> (the mask supplied via `-mask`) is assumed to exist. The script itself performs
> no conforming or skull-stripping — it expects `brain` to have been produced
> upstream.

> [!contradiction] The paediatric atlas is not shipped with 8.2.0
> `talairach_children_b.gca` is absent from the 8.2.0 `average/` directory, so
> the script cannot run unmodified against a stock install; supply the legacy
> atlas or substitute a current one.

## Outputs

Identical to [[register_subject]]: `transforms/talairach.lta` (the
subject→atlas [[lta]]), `fsamples/` (transformed GCA samples), `norm/`
(intensity-normalised volume), and a `talairach.lta.log`.

## Mathematical Foundations

None in the script. All registration math is in [[mri_em_register]].

> [!internal] See [[mri_em_register]] for the EM affine-registration algorithm.

## Configuration Options

No command-line flags; one positional subject-id argument. Behaviour is fixed
by the hard-coded atlas and `mri_em_register` line (see the difference table
above).

## Pipeline Context

A legacy stand-alone driver, not called by
[[wiki/pipelines/recon-all|recon-all]]. Used in place of [[register_subject]]
when the subject is a child, producing the same `talairach.lta` that downstream
GCA labelling consumes.

**Predecessor:** white-matter labelling → **register_child** → **Successor:**
GCA labelling (`label_subject`).

## Related Tools

- [[register_subject]] — the canonical adult driver; this page documents only the deltas.
- [[mri_em_register]] — the registration engine.
- [[register_elderly_subject]] — the elderly-cohort sibling variant.

## Confidence and Gaps

**High confidence:** the only substantive differences from [[register_subject]]
(children's atlas and the omission of `-p`; `-mask $sdir/brain` is passed by
both) are read directly from
[`scripts/register_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child).

> [!gap] Paediatric atlas provenance
> The training population behind `talairach_children_b.gca` (and its absence
> from 8.2.0) cannot be determined from the source tree.

## References

- FreeSurfer source: [`scripts/register_child`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_child) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
