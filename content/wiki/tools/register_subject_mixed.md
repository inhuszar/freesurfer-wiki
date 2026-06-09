---
title: "register_subject_mixed"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register_subject_mixed"
families: []                     # legacy GCA/atlas registration variant
recon_all_stage: null
related:
  - "[[register_subject]]"
  - "[[reregister_subject_mixed]]"
  - "[[mri_em_register]]"
  - "[[talairach.lta]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "$CMA is an MGH/Martinos-internal environment variable, not set by standard FreeSurfer; the final atlas path is unresolved on stock installs."
tags:
  - registration
  - atlas
  - gca
  - legacy
  - mixed-contrast
---

# register_subject_mixed

## Summary

`register_subject_mixed` is the **mixed-contrast variant** of
[[register_subject]]. It is a legacy tcsh driver that runs [[mri_em_register]]
to register a subject's `orig` volume to a GCA atlas and write
`transforms/talairach.lta`. Its distinguishing feature is the atlas: it
ultimately points `GCA` at `$CMA/average/mixed_a1_ma.gca`, a mixed-contrast
atlas under the MGH-internal `$CMA` tree. It passes neither `-p` nor `-mask`.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/register_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed)
- **Binary/script location:** `$FREESURFER_HOME/bin/register_subject_mixed`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed#L32)

## Purpose and Context

For data that mixes contrasts (or that should be aligned to a contrast-agnostic
template), this variant selects a dedicated mixed-contrast atlas. It is
otherwise the same driver as [[register_subject]]: it creates the `fsamples`,
`norm`, and `transforms` sub-directories under `$SUBJECTS_DIR/<subj>/mri` and
produces the same `talairach.lta`.

## What This Variant Sets (differences from `register_subject`)

| Aspect | `register_subject` (canonical) | `register_subject_mixed` |
|--------|-------------------------------|--------------------------|
| GCA atlas | `average/young_new_b.gca` | `$CMA/average/mixed_a1_ma.gca` (see redefinition note) |
| `-p` (WM control-point fraction) | `-p .5` | **not passed** |
| `-mask` | `-mask $sdir/brain` | **not passed** |

The `-fsamples`, `-norm`, `-p`, and `-mask` tokens in the rows above are options
of the downstream [[mri_em_register]] call, **not** flags of
`register_subject_mixed` itself — the script has no argument parser and accepts
only a positional subject ID (`$1`). The two it omits relative to the canonical
driver are real `mri_em_register` options: `-p`/`-P`
([`mri_em_register/mri_em_register.cpp:2194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2194))
and `-mask` ([`mri_em_register/mri_em_register.cpp:1806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1806)).

The effective command is
[`mri_em_register -fsamples $sdir/fsamples -norm $sdir/norm $sdir/orig $GCA $sdir/transforms/talairach.lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed#L32).

> [!gotcha] The atlas is set twice — the `$CMA` path wins
> The script first sets `GCA = $FREESURFER_HOME/average/mixed.gca`, then
> overrides it with `GCA = $CMA/average/mixed_a1_ma.gca`
> ([`scripts/register_subject_mixed:21-23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed#L21-L23)).
> The second `setenv` wins, so the registration runs against
> `mixed_a1_ma.gca`, not `mixed.gca`.

> [!gotcha] `$CMA` is an MGH/Martinos-internal variable
> `$CMA` is not defined by FreeSurfer's standard environment setup
> (`SetUpFreeSurfer.sh`/`.csh` do not set it). On a stock install `$CMA`
> expands to nothing, so the atlas path becomes `/average/mixed_a1_ma.gca`,
> which does not exist. This script is effectively runnable only inside the MGH
> Martinos Center environment where `$CMA` is defined, or after you set `$CMA`
> (or edit the path) yourself.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — must exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/orig`** — moving volume.
- **Mixed-contrast GCA atlas** — `$CMA/average/mixed_a1_ma.gca`.

### Input Assumptions

> [!assumption] Prepared subject directory and a defined `$CMA`
> A FreeSurfer subject directory with `mri/orig` is assumed, plus a resolvable
> `$CMA` pointing at the MGH atlas tree. No skull-strip mask is applied.

## Outputs

Identical to [[register_subject]]: `transforms/talairach.lta`, `fsamples/`,
`norm/`, and `talairach.lta.log`.

## Mathematical Foundations

None in the script. The EM affine registration is in [[mri_em_register]].

> [!internal] See [[mri_em_register]] for the registration algorithm.

## Configuration Options

No command-line flags; one positional subject-id argument. Behaviour is fixed
by the hard-coded atlas (see the difference table and gotchas).

## Pipeline Context

A legacy stand-alone driver, not called by
[[wiki/pipelines/recon-all|recon-all]]. The mixed-contrast counterpart of
[[register_subject]]; produces the same `talairach.lta` for downstream GCA
labelling. [[reregister_subject_mixed]] is its companion that re-runs the
registration from the previously normalised volume.

**Predecessor:** anatomical preparation → **register_subject_mixed** →
**Successor:** GCA labelling (`label_subject`), or [[reregister_subject_mixed]]
for a refinement pass.

## Related Tools

- [[register_subject]] — the canonical driver; this page documents only the deltas.
- [[reregister_subject_mixed]] — re-runs the mixed registration starting from `norm` instead of `orig`.
- [[mri_em_register]] — the registration engine.
- [[register_subject_flash]] — the FLASH-input sibling variant (also references `mixed.gca`).

## Confidence and Gaps

**High confidence:** the atlas double-set, the `$CMA` dependency, and the
absence of `-p`/`-mask` are read directly from
[`scripts/register_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed).

> [!gap] `$CMA` / `mixed_a1_ma.gca` provenance
> `$CMA` is an MGH-internal path and `mixed_a1_ma.gca` is not in the FreeSurfer
> distribution; the atlas's training data and the directory it lives in are not
> recoverable from the source tree.

## References

- FreeSurfer source: [`scripts/register_subject_mixed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_mixed) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
