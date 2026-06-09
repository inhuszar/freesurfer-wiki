---
title: "inflate_subject_sc"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/inflate_subject_sc"
families: []                     # legacy *_subject surface helper variant
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[inflate_subject]]"
  - "[[inflate_subject-lh]]"
  - "[[inflate_subject-rh]]"
  - "[[mri_fill]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - inflation
  - legacy
  - tcsh
  - variant
---

# inflate_subject_sc

## Summary

`inflate_subject_sc` is a variant of the canonical [[inflate_subject]] driver
that fills the white-matter volume **with the help of an `aseg`
segmentation**. The only substantive difference is the fill command: instead of
`mri_fill ../mri/wm ../mri/filled`, it runs
`mri_fill -segmentation ../mri/aseg ../mri/wm ../mri/filled`, supplying
[[mri_fill]] with the automatic subcortical segmentation so the hemisphere
labelling and fill seeds can use that prior. It then calls the same
[[inflate_subject-lh]] and [[inflate_subject-rh]] workers as the canonical
script. The `_sc` suffix denotes the segmentation-guided ("seg/subcortical")
fill.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/inflate_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc)
- **Binary/script location:** `$FREESURFER_HOME/bin/inflate_subject_sc`
- **Tools invoked:** [`mri_fill -segmentation`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L30), then [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L31) and [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L32).

## Purpose and Context

`inflate_subject_sc` exists for cases where the corpus-callosum / pons seed
finding in [[mri_fill]] benefits from an existing aseg segmentation rather than
relying solely on the Talairach-based automatic seeding. It is the
inflation-stage counterpart of the legacy `segment_subject_sc` driver, which
calls it (`inflate_subject_sc $1`). Like the rest of the family it is a
pre-recon-all helper and is **not** part of [[wiki/pipelines/recon-all|recon-all]];
modern recon-all passes the aseg to [[mri_fill]] via its own `-segmentation`
invocation in `autorecon2`.

> [!gotcha] Sets `DIAG 0x04040`
> As with [[inflate_subject]], the script exports the FreeSurfer diagnostic mask
> `DIAG 0x04040` ([`scripts/inflate_subject_sc:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L22)) for all child
> binaries.

## Inputs

### Required Inputs

- **Subject ID** — positional argument `$1`.
- **`$SUBJECTS_DIR/$1/mri/wm`** — white-matter segmentation read by [[mri_fill]].
- **`$SUBJECTS_DIR/$1/mri/aseg`** — the automatic subcortical segmentation
  (see [[aseg.mgz]]) passed to `mri_fill -segmentation`.

### Input Assumptions

> [!assumption] Both `mri/wm` and `mri/aseg` exist
> The fill command requires `../mri/aseg` in addition to `../mri/wm`
> ([`scripts/inflate_subject_sc:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc#L30)). If `aseg` is absent the
> `-ef` shebang aborts the run. Otherwise the assumptions match
> [[inflate_subject]]: a standard subject tree with `mri/`, `surf/`, and
> `scripts/` subfolders under `$SUBJECTS_DIR`.

## Outputs

Identical set to [[inflate_subject]]: `mri/filled`, the `surf/{lh,rh}.{orig,
smoothwm,inflated}` surfaces, and appended `NOTES`. Only the **way** `filled` is
computed differs (segmentation-guided). See [[inflate_subject]] for the full
output table and [[mri_fill]] / [[mri_tessellate]] / [[mris_smooth]] /
[[mris_inflate]] for per-file specifications.

## Mathematical Foundations

None in the script. The segmentation-guided fill logic lives in [[mri_fill]]; the
inflation math lives in [[mris_inflate]] (run with `-dist 0` by the
[[inflate_subject-lh]]/`-rh` workers).

## Configuration Options

### Complete Flag Reference

No option parser; one positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | FreeSurfer subject name under `$SUBJECTS_DIR`. |

Everything else is hard-coded, including the `-segmentation ../mri/aseg` fill
argument.

### Configuration Interactions

None. The defining behaviour versus the rest of the family is the single fixed
flag `mri_fill -segmentation ../mri/aseg`. Choose this variant when you want the
aseg-guided fill; choose [[inflate_subject]] for the plain fill.

## Typical Use Cases

### Re-inflate using an aseg-guided fill

```bash
setenv SUBJECTS_DIR /path/to/subjects
inflate_subject_sc bert
```

Fills `mri/filled` from `mri/wm` using `mri/aseg`, then regenerates both inflated
surfaces.

## Pipeline Context

A legacy standalone variant; **not** a recon-all step.

**Predecessor:** an aseg + edited `mri/wm` → **inflate_subject_sc** →
**Successor:** surface QA.

- **recon-all does NOT call it.**
- **It IS called by** the legacy `segment_subject_sc` driver
  ([`scripts/segment_subject_sc:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L57)).

## Gotchas and Caveats

> [!gotcha] Requires `mri/aseg`, unlike `inflate_subject`
> Because it adds `-segmentation ../mri/aseg`, this script fails if the aseg is
> missing, whereas the plain [[inflate_subject]] needs only `mri/wm`.

> [!gotcha] Inflation still uses `-dist 0`
> The hemisphere workers it calls are the same `-dist 0` workers as the canonical
> driver, so the inflated geometry differs from a recon-all run for the same
> reason described in [[inflate_subject-lh]].

## Error Compensation and Guard Rails

- **Fail-fast** (`-ef`): missing `wm` or `aseg`, or any tool error, aborts.
- No additional validation beyond what [[inflate_subject]] does; provenance is
  logged to `NOTES` by the `-lh`/`-rh` workers.

## Related Tools

- [[inflate_subject]] — the canonical driver this variant mirrors (plain fill).
- [[inflate_subject-lh]] / [[inflate_subject-rh]] — the workers it calls.
- [[mri_fill]] — performs the `-segmentation`-guided fill here.
- [[wiki/pipelines/recon-all|recon-all]] — the modern pipeline.

## Confidence and Gaps

**High confidence:** the full 33-line script was read; the only difference from
[[inflate_subject]] — the `-segmentation ../mri/aseg` fill argument — is explicit.

## References

- FreeSurfer source: [`scripts/inflate_subject_sc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject_sc) (v8.2.0).
- Caller: [`scripts/segment_subject_sc:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_sc#L57).
