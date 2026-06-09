---
title: "deface_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/deface_subject"
families: []                     # thin wrapper around mri_deface
recon_all_stage: null
related:
  - "[[mri_deface]]"
  - "[[mideface]]"
  - "[[mri_defacer]]"
  - "[[gca-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - defacing
  - de-identification
  - anonymization
  - privacy
  - wrapper
---

# deface_subject

## Summary

`deface_subject` is a one-line tcsh convenience wrapper that defaces a
FreeSurfer subject's anatomical volume by calling the legacy
[[mri_deface]] tool with FreeSurfer's standard brain and face GCA atlases. It
takes a single argument — the subject name — locates that subject's `orig`
volume under `$SUBJECTS_DIR`, and writes a defaced copy to
`mri/orig_defaced.mgz`. It hard-codes the same atlas files and output name
that [[wiki/pipelines/recon-all|recon-all]] uses for its optional `-deface`
step, so running `deface_subject <subj>` reproduces that step stand-alone for
an already-existing subject.

## Source Information

- **Language:** tcsh shell script (12 lines)
- **Source file:** [`scripts/deface_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/deface_subject`
- **Tool invoked:** [`mri_deface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L30) (the only real work; everything else is path setup)

## Purpose and Context

Sharing anatomical MRI publicly requires removing identifiable facial
features. FreeSurfer's original defacer is the atlas-based [[mri_deface]],
which needs four positional arguments (input volume, brain atlas, face atlas,
output volume) and two atlas paths that are easy to get wrong.
`deface_subject` exists so that a user does not have to remember any of that:
it fills in the canonical atlas paths and the conventional output filename and
runs `mri_deface` for one subject.

It is the stand-alone equivalent of the recon-all `-deface` stage. recon-all
itself calls `mri_deface` directly (not this wrapper) at its Deface step,
with the same default atlases `talairach_mixed_with_skull.gca` and `face.gca`
([`scripts/recon-all:1724-1727`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1724-L1727)). `deface_subject` is therefore most
useful when you want to deface a subject that was reconstructed **without**
`-deface`, or to regenerate `orig_defaced.mgz` after the fact.

## Fixed Arguments and Behaviour

The script accepts exactly one positional argument and sets everything else
internally:

| Element | Value | Source |
|---------|-------|--------|
| Subject name | `$1` (the sole argument) | [`scripts/deface_subject:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L21) |
| Input volume | `$SUBJECTS_DIR/<subj>/mri/orig` if a `mri/orig/COR-001` series exists, else `mri/orig.mgz` | [`scripts/deface_subject:25-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L25-L29) |
| Brain atlas | `$FREESURFER_HOME/average/talairach_mixed_with_skull.gca` | [`scripts/deface_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L30) |
| Face atlas | `$FREESURFER_HOME/average/face.gca` | [`scripts/deface_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L30) |
| Output volume | `$SUBJECTS_DIR/<subj>/mri/orig_defaced.mgz` | [`scripts/deface_subject:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject#L30) |

The effective command is:

```bash
mri_deface  $SUBJECTS_DIR/<subj>/mri/$ORIG \
            $FREESURFER_HOME/average/talairach_mixed_with_skull.gca \
            $FREESURFER_HOME/average/face.gca \
            $SUBJECTS_DIR/<subj>/mri/orig_defaced.mgz
```

where `$ORIG` is `orig` (the old COR volume directory) or `orig.mgz`. The two
GCA files are the brain probabilistic atlas and the face probabilistic atlas;
see [[gca-format]] and [[mri_deface]] for how they drive the defacing.

> [!assumption] Subject must already exist with an orig volume
> The script assumes `$SUBJECTS_DIR` is set and the subject directory contains
> either `mri/orig/COR-001` or `mri/orig.mgz`. It does no argument validation,
> error checking, or `--help` handling of its own — those responsibilities all
> fall to `mri_deface`. The script also runs under `tcsh -ef`, so any failure
> in `mri_deface` (e.g. a missing input) aborts immediately.

## Outputs

| File | Where | Contents |
|------|-------|----------|
| `orig_defaced.mgz` | `$SUBJECTS_DIR/<subj>/mri/` | the `orig`/`orig.mgz` volume with facial voxels removed by [[mri_deface]] |

A log file (`orig_defaced.log` in the working directory) is also produced by
`mri_deface` itself.

## Configuration Options

`deface_subject` has **no flags of its own** — there is no argument-parsing
loop. Its only input is the positional subject name. All behaviour (fill
value, atlas registration, etc.) is whatever [[mri_deface]] does with the
hard-coded atlases; to change any of it you must invoke `mri_deface` directly.

## Pipeline Context

Not part of [[wiki/pipelines/recon-all|recon-all]] (recon-all calls
`mri_deface` directly at its Deface stage). `deface_subject` is run by hand on
an existing subject, typically before sharing data.

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (or any process that
created `mri/orig.mgz`) → **deface_subject** → **Successor:** data release, or
a re-run of recon-all on `orig_defaced.mgz`.

## Gotchas and Caveats

> [!gotcha] Legacy tool — prefer mideface for new work
> `deface_subject` wraps the older GCA-atlas defacer [[mri_deface]]. The
> modern, minimally invasive replacement is [[mideface]] (which drives
> [[mri_defacer]]); it removes less brain-adjacent tissue and adds QA imagery
> and a provenance watermark. Use `mideface` for new anonymization workflows.

> [!gotcha] Defacing can clip brain near the orbits
> As with any face removal, the GCA fill region can encroach on temporal-pole
> or orbitofrontal cortex in subjects with thin skulls. Inspect
> `orig_defaced.mgz` before using it for reconstruction. (This is a property of
> [[mri_deface]], inherited here unchanged.)

## Related Tools

- [[mri_deface]] — the GCA-atlas defacer that this script wraps; all defacing logic and options live there.
- [[mideface]] — the modern minimally-invasive defacing pipeline; the recommended replacement.
- [[mri_defacer]] — the surface-based defacing engine that `mideface` drives.
- [[gca-format]] — format of the two atlas files passed to `mri_deface`.

## Confidence and Gaps

**High confidence:** the script is twelve lines and was read in full. The
single positional argument, the input-selection logic (`COR-001` →
`orig`, else `orig.mgz`), the two hard-coded atlas paths, and the fixed output
name `orig_defaced.mgz` are all read directly from
[`scripts/deface_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject), and the atlas defaults match recon-all's
([`scripts/recon-all:270-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L270-L271)).

## References

- FreeSurfer source: [`scripts/deface_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/deface_subject) (v8.2.0).
- recon-all Deface step: [`scripts/recon-all:1719-1733`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1719-L1733).
