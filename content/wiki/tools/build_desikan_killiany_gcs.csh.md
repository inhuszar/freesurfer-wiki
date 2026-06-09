---
title: "build_desikan_killiany_gcs.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/build_desikan_killiany_gcs.csh"
families: []                     # fixed-recipe DK atlas builder
recon_all_stage: null
related:
  - "[[mris_ca_train]]"
  - "[[mris_ca_label]]"
  - "[[train-gcs-atlas]]"
  - "[[parcellation-schemes]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - atlas
  - parcellation
  - cortical
  - desikan-killiany
  - gcs
---

# build_desikan_killiany_gcs.csh

## Summary

`build_desikan_killiany_gcs.csh` is a short, fixed-recipe tcsh wrapper that
rebuilds the canonical **Desikan–Killiany** cortical parcellation atlas (a
`.gcs` surface-classifier file) for one hemisphere by running a single
[[mris_ca_train]] command over a hard-wired set of training subjects. The
resulting `.gcs` is the atlas that [[mris_ca_label]] uses to produce the standard
`?h.aparc.annot` Desikan–Killiany parcellation. It takes exactly one argument —
the hemisphere (`lh` or `rh`) — and hard-codes everything else (colour table,
registration surface, manual parcellation name, output naming), making it the
"official recipe" companion to the more flexible, general-purpose
[[train-gcs-atlas]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/build_desikan_killiany_gcs.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh)
- **Binary/script location:** `$FREESURFER_HOME/bin/build_desikan_killiany_gcs.csh`
- **FreeSurfer tool invoked:** [`mris_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L24-L30) (once; the `--all-info` call at [`scripts/build_desikan_killiany_gcs.csh#L32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L32) just records build/version info in the log).

## Purpose and Context

This script exists to reproduce, with a single fixed command line, the
Desikan–Killiany surface parcellation atlas that ships with FreeSurfer. It is an
**atlas-maintainer** tool — run by hand when regenerating the DK `.gcs` from the
official Buckner-40 training set — and is *not* part of `recon-all`; rather, its
output is the `.gcs` that `recon-all`'s [[mris_ca_label]] step consumes.

It assumes a specific training environment described in the header
([`scripts/build_desikan_killiany_gcs.csh#L6-L12`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L6-L12)): `SUBJECTS_DIR` is set to the
training set (historically
`/autofs/space/amaebi_026/users/buckner_cortical_atlas`), and that directory
contains `scripts/subjects.csh` defining the `$SUBJECTS` list. The output `.gcs`
and its log are written into `$SUBJECTS_DIR/average/`.

> [!gotcha] Fixed recipe — not a general trainer
> Unlike [[train-gcs-atlas]], this script exposes **no options** beyond the
> hemisphere. The colour table, registration surface (`sphere.reg`), manual
> parcellation (`aparc_edited`), training-subject list, and output path are all
> hard-coded. To build a non-DK atlas, or to use jack-knife validation or custom
> resolutions, use [[train-gcs-atlas]] instead.

## Inputs

### Required Inputs

- **`$1` = hemisphere** — must be exactly `lh` or `rh`; anything else prints a
  usage message and exits ([`scripts/build_desikan_killiany_gcs.csh#L14-L19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L14-L19)).
- **`$SUBJECTS_DIR`** pre-set to the training set, containing
  `scripts/subjects.csh` (sourced to define `$SUBJECTS`,
  [`scripts/build_desikan_killiany_gcs.csh#L23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L23)).
- For each training subject: a spherical registration `surf/<hemi>.sphere.reg`
  and a manual parcellation `label/<hemi>.aparc_edited.annot` (consumed by
  [[mris_ca_train]]).

### Input Assumptions

> [!assumption] Hard-wired training layout
> The script assumes the exact FreeSurfer atlas-training layout: a
> `subjects.csh` in `$SUBJECTS_DIR/scripts/` setting `$SUBJECTS`, each subject
> carrying `sphere.reg` and `aparc_edited`, and a writable
> `$SUBJECTS_DIR/average/` directory. It performs **no** existence checks of its
> own — any missing file surfaces as a [[mris_ca_train]] error. Because the
> shebang is `#!/bin/tcsh -ef`, the first failing command aborts the script.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<hemi>.curvature.buckner40.filled.desikan_killiany.<DATE>.gcs` | `$SUBJECTS_DIR/average/` | the trained Desikan–Killiany surface parcellation atlas ([[parcellation-schemes]]) |
| `mris_ca_train-<hemi>-<DATE>.log` | `$SUBJECTS_DIR/average/` | version banner (`mris_ca_train --all-info`), the exact command, and start/end timestamps |

`<DATE>` is `date '+%Y-%m-%d'`, so re-runs on different days do not overwrite
each other ([`scripts/build_desikan_killiany_gcs.csh#L20-L22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L20-L22)).

### Output Specifications

The `.gcs` is a binary surface Gaussian-classifier array spanning the standard
icosahedral grids (defaults of [[mris_ca_train]]), encoding per-node label priors
and per-label curvature/sulc Gaussians in the Desikan–Killiany label space.

## Mathematical Foundations

None in the script itself — it is a fixed wrapper.

> [!internal] Atlas estimation is in `mris_ca_train`
> The prior/likelihood estimation that produces the `.gcs` is implemented in
> [[mris_ca_train]]; see that page (and [[mris_ca_label]] for how the atlas is
> later applied) for the underlying Gaussian-classifier mathematics.

## Configuration Options

### Complete Flag Reference

The script takes a single positional argument and no flags.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (hemi) | string | *(required)* | Hemisphere; must be `lh` or `rh`. Any other value prints usage and exits 1 ([`scripts/build_desikan_killiany_gcs.csh#L14-L19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L14-L19)). |

The fixed [[mris_ca_train]] invocation it builds is
([`scripts/build_desikan_killiany_gcs.csh#L24-L30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L24-L30)):

```
mris_ca_train -t $FREESURFER_HOME/average/colortable_desikan_killiany.txt \
  <hemi> sphere.reg aparc_edited $SUBJECTS \
  $SUBJECTS_DIR/average/<hemi>.curvature.buckner40.filled.desikan_killiany.<DATE>.gcs
```

### Configuration Interactions

None — there are no options to interact. The only control is the hemisphere
argument, which selects the surfaces, parcellations, and output filename for that
side.

## Typical Use Cases

### Rebuild both hemispheres of the DK atlas

```bash
setenv SUBJECTS_DIR /autofs/space/amaebi_026/users/buckner_cortical_atlas
build_desikan_killiany_gcs.csh lh
build_desikan_killiany_gcs.csh rh
# → average/lh.curvature.buckner40.filled.desikan_killiany.<DATE>.gcs (+ rh)
```

## Pipeline Context

A stand-alone **atlas-builder**. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]]; its output `.gcs` is consumed by
`recon-all`'s [[mris_ca_label]] step (and by manual `mris_ca_label` runs) to
generate the Desikan–Killiany `?h.aparc.annot`.

**Predecessor:** `recon-all` on the Buckner-40 training subjects (through
`sphere.reg`) + manual `aparc_edited` → **build_desikan_killiany_gcs.csh**
(→ [[mris_ca_train]]) → **Successor:** [[mris_ca_label]] on new subjects.

It is the fixed-recipe sibling of [[train-gcs-atlas]], which performs the same
kind of training but with full command-line control and optional jack-knife
validation.

## Gotchas and Caveats

> [!gotcha] `-ef` shebang means any error aborts immediately
> The script runs under `#!/bin/tcsh -ef`, so an undefined variable or a failed
> command (e.g. a missing `subjects.csh`, or [[mris_ca_train]] erroring) stops it
> at once. There is no per-step recovery; fix the environment and re-run.

> [!gotcha] `subjects.csh` is sourced from the current directory
> `source scripts/subjects.csh` ([`scripts/build_desikan_killiany_gcs.csh#L23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh#L23)) uses a
> **relative** path, so the script must be launched from the root of the training
> `SUBJECTS_DIR` (where `scripts/subjects.csh` lives), not from an arbitrary
> directory.

## Error Compensation and Guard Rails

Minimal: the only explicit check is that `$1` is `lh` or `rh`. All other
validation is delegated to [[mris_ca_train]] and to tcsh's `-e` (abort on error)
behaviour.

## Related Tools

- [[mris_ca_train]] — the binary this script runs to build the `.gcs`.
- [[mris_ca_label]] — applies the resulting Desikan–Killiany atlas to new subjects.
- [[train-gcs-atlas]] — general-purpose, fully-parameterised version of the same training step (with jack-knife support).
- [[parcellation-schemes]] — describes the Desikan–Killiany labelling scheme this atlas encodes.

## Confidence and Gaps

**High confidence:** the entire 42-line script was read; the single hemisphere
argument, the fixed [[mris_ca_train]] command, the output filename pattern, the
log contents, and the hard-wired training assumptions are all taken directly from
[`scripts/build_desikan_killiany_gcs.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh). No `BEGINHELP`/`--help` block
exists; the script has no option parser.

## References

- FreeSurfer source: [`scripts/build_desikan_killiany_gcs.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/build_desikan_killiany_gcs.csh) (v8.2.0).
- Desikan R.S. et al., *An automated labeling system for subdividing the human cerebral cortex on MRI scans into gyral based regions of interest*, NeuroImage 31(3):968–980, 2006 — the parcellation scheme this atlas implements.
- Fischl B. et al., *Automatically parcellating the human cerebral cortex*, Cerebral Cortex 14(1):11–22, 2004 — the surface GCS atlas method.
