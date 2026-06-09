---
title: "register_subject_flash"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register_subject_flash"
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
  - "The mixed.gca atlas is not shipped with FreeSurfer 8.2.0."
tags:
  - registration
  - atlas
  - gca
  - flash
  - legacy
---

# register_subject_flash

## Summary

`register_subject_flash` is the **multi-echo FLASH variant** of
[[register_subject]] (original author Bruce Fischl). It is a legacy tcsh driver
intended to register a subject acquired with the FLASH forward model to a GCA
atlas via [[mri_em_register]], writing `transforms/talairach.lta`. It selects
the `mixed.gca` atlas and is meant to engage `mri_em_register`'s FLASH
intensity model using the standard `tissue_parms.txt` parameter table.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Original author:** Bruce Fischl
- **Source file:** [`scripts/register_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash)
- **Binary/script location:** `$FREESURFER_HOME/bin/register_subject_flash`
- **Tool invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash#L33)

## Purpose and Context

When the anatomical input is a multi-echo FLASH acquisition rather than an
MPRAGE-style T1, the atlas intensities must be predicted through a FLASH
forward model parameterised by per-label tissue T1/PD values
(`$FREESURFER_HOME/average/tissue_parms.txt`). `register_subject_flash` exists
to run the atlas registration with that model engaged, selecting the
`mixed.gca` atlas. Like the rest of the family it creates the `fsamples`,
`norm`, and `transforms` sub-directories under `$SUBJECTS_DIR/<subj>/mri`.

## What This Variant Sets (differences from `register_subject`)

| Aspect | `register_subject` (canonical) | `register_subject_flash` |
|--------|-------------------------------|--------------------------|
| GCA atlas | `average/young_new_b.gca` | `average/mixed.gca` ([`scripts/register_subject_flash:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash#L22)) |
| FLASH model | (none) | passes `-flash $FREESURFER_HOME/average/tissue_parms.txt` (see defect below) |
| `-p` / `-mask` | `-p .5 -mask $sdir/brain` | **neither passed** |

The `-flash`, `-fsamples`, `-norm`, `-p`, and `-mask` tokens in the rows above
are options of the downstream [[mri_em_register]] call, **not** flags of
`register_subject_flash` itself — the script has no argument parser and accepts
only a positional subject ID (`$1`). All five exist in `mri_em_register`:
`-flash` ([`mri_em_register/mri_em_register.cpp:1716`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1716)),
`-fsamples` ([`mri_em_register/mri_em_register.cpp:1908`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1908)),
`-norm` ([`mri_em_register/mri_em_register.cpp:2059`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2059)),
`-p`/`-P` ([`mri_em_register/mri_em_register.cpp:2194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L2194)),
and `-mask` ([`mri_em_register/mri_em_register.cpp:1806`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1806)).

The literal command is
[`mri_em_register -flash $FREESURFER_HOME/average/tissue_parms.txt -fsamples $sdir/fsamples -norm $sdir/norm $sdir/orig $GCA $sdir/transforms/talairach.lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash#L33).

> [!contradiction] `-flash` takes no argument — the script's invocation is malformed
> In [[mri_em_register]], `-flash` only sets a boolean flag
> (`map_to_flash = 1`) and consumes **no** argument
> ([`mri_em_register/mri_em_register.cpp:1716-1720`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1716-L1720)).
> The tissue-parameter **file** is read only by the *separate* `-flash_parms`
> option (`tissue_parms_fname = argv[2]`,
> [`mri_em_register/mri_em_register.cpp:1935-1941`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L1935-L1941)).
> Because `register_subject_flash` writes `-flash <file>` instead of
> `-flash_parms <file>`, the following happens: `-flash` is parsed (no arg
> taken), then the next token `tissue_parms.txt` does **not** begin with `-`,
> so `mri_em_register`'s option loop terminates
> ([`mri_em_register/mri_em_register.cpp:276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L276),
> `ISOPTION(c) == ((c)=='-')`). Everything from `tissue_parms.txt` onward —
> including `-fsamples`, `-norm` and their values — is then mis-parsed as
> positional input/atlas/output arguments, and `tissue_parms_fname` is never
> set so **no FLASH renormalisation occurs**. As written, the command does not
> do what its name implies; the intended flag is almost certainly
> `-flash_parms`. Code is authoritative: the script is defective here.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — must exist under `$SUBJECTS_DIR`.
- **`$SUBJECTS_DIR/<subj>/mri/orig`** — moving volume (intended to be a FLASH volume).
- **GCA atlas** — `$FREESURFER_HOME/average/mixed.gca`.
- **Tissue parameters** — `$FREESURFER_HOME/average/tissue_parms.txt` (per-label T1/PD table; this file **is** present in 8.2.0).

### Input Assumptions

> [!assumption] FLASH anatomical and a prepared subject directory
> The script is meant for a FLASH `orig` volume in a prepared FreeSurfer
> subject directory. No mask is applied.

> [!contradiction] The `mixed.gca` atlas is not shipped with 8.2.0
> `mixed.gca` is absent from the 8.2.0 `average/` directory (only
> `RB_all_*.gca`, `talairach_mixed_with_skull.gca`, etc. are present), so the
> script cannot run unmodified against a stock install.

## Outputs

Intended outputs match [[register_subject]]: `transforms/talairach.lta`,
`fsamples/`, `norm/`. Given the parsing defect above, the actual run is likely
to fail at the `mri_em_register` stage (e.g. unable to read a GCA from a path
that is really a flag string) rather than produce a valid transform.

## Mathematical Foundations

None in the script. The FLASH forward model
(`GCArenormalizeToFlash(gca, tissue_parms_fname, mri_in)`,
[`mri_em_register/mri_em_register.cpp:636-638`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp#L636-L638))
and the EM affine registration live entirely in [[mri_em_register]].

> [!internal] See [[mri_em_register]] for the FLASH intensity model and the registration algorithm.

## Configuration Options

No command-line flags; one positional subject-id argument. Behaviour is fixed
by the hard-coded atlas and the (malformed) `-flash` line above.

## Pipeline Context

A legacy stand-alone driver, not called by
[[wiki/pipelines/recon-all|recon-all]]. It was the FLASH-input counterpart of
[[register_subject]] in the historical MGH segmentation workflow, producing the
same `talairach.lta` for downstream GCA labelling.

**Predecessor:** FLASH anatomical preparation → **register_subject_flash** →
**Successor:** GCA labelling (`label_subject`).

## Known Bugs

- [[00152]] — passes the tissue-parms file to `-flash` (a no-argument boolean in `mri_em_register`) instead of `-flash_parms`; the stray filename halts option parsing, `-fsamples`/`-norm` are ignored, positionals are mis-assigned, and FLASH renormalisation never happens.

## Related Tools

- [[register_subject]] — the canonical driver; this page documents only the deltas.
- [[mri_em_register]] — the registration engine and owner of the `-flash` / `-flash_parms` options.
- [[register_subject_mixed]] — the mixed-contrast sibling variant.

## Confidence and Gaps

**High confidence:** the atlas choice and the literal `-flash <file>` command
line are read directly from
[`scripts/register_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash);
the `-flash` vs. `-flash_parms` semantics and the option-loop termination are
verified against
[`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).

> [!gap] Whether the script ever worked
> If an older `mri_em_register` once accepted a filename after `-flash`, this
> script would have worked then; the current binary does not, so the defect may
> be the result of an interface change in `mri_em_register` rather than an
> original authoring error. The history is not recoverable from the source
> tree.

## References

- FreeSurfer source: [`scripts/register_subject_flash`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register_subject_flash) (v8.2.0).
- Engine: [`mri_em_register/mri_em_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_em_register/mri_em_register.cpp).
