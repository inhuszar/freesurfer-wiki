---
title: "segment_subject_notal"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject_notal"
families: []                     # legacy white-matter/tissue segmentation driver variant
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[segment_subject_notal2]]"
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[inflate_subject]]"
  - "[[talairach]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - white-matter
  - skull-strip
  - legacy
  - driver-script
  - no-talairach
---

# segment_subject_notal

## Summary

`segment_subject_notal` is a **no-Talairach** variant of the legacy
[[segment_subject]] driver. It runs exactly the same single-subject anatomical
segmentation sequence — intensity-normalise → watershed skull-strip →
white-matter label → fill/inflate — but **skips the Talairach registration
step**, which is commented out in the source. It additionally strips the
`xform` line out of the COR- header before normalising, so no (stale) Talairach
transform is referenced downstream. Like all the variants, it takes one
argument, the subject ID (`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_subject_notal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject_notal`
- **FreeSurfer tools it invokes:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L47) ([[mri_normalize]]), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L53) ([[mri_watershed]]), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L56) ([[mri_segment]]), [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L57) ([[inflate_subject]]). The [`talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L40) call is present but **commented out**.

## Purpose and Context

This variant exists for subjects on which the MINC-based Talairach step fails.
The source comment states the reason plainly:

> `## Commented out because of minc conversion errors on orientation`
> ([`scripts/segment_subject_notal:39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L39))

The [[talairach]] step in [[segment_subject]] converts the input to MINC and runs
`mritotal`; certain orientations cause that conversion to fail, aborting the
whole driver (which here would matter, because this variant runs under `-ef`).
`segment_subject_notal` removes that dependency so the rest of the segmentation
can proceed. It is otherwise identical to the canonical driver and shares its
context (a standalone legacy driver, not called by
[[wiki/pipelines/recon-all|recon-all]]; see [[segment_subject]] for full detail).

> [!gotcha] No Talairach transform is produced
> Because [[talairach]] is skipped, `mri/transforms/talairach.xfm` is **not**
> written. Any downstream step that expects a Talairach transform must obtain it
> another way. The script also deletes the `xform` line from the COR- header
> (see below) so nothing references a non-existent transform.

## What This Variant Changes (relative to `segment_subject`)

| Step | `segment_subject` | `segment_subject_notal` |
|------|-------------------|-------------------------|
| Shebang | `#!/bin/tcsh -f` (no fail-fast) | `#!/bin/tcsh -ef` (**stops on first error**) |
| `brain.dat` copy | unconditional | guarded by `if (-e $SUBJECTS_DIR/scripts/brain.dat)` |
| Talairach | `talairach $1` | **commented out** ([`:40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L40)) |
| Header edit | none | **strips `^xform` line** from `mri/orig/COR-.info` ([`:42-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L42-L44)) |
| Normalise / skull-strip / segment / inflate | identical | identical |

The header edit backs up `mri/orig/COR-.info` to `COR-.info.bak`, then writes a
new `COR-.info` with every line beginning `xform` removed
(`grep -v ^xform`). This drops any stale Talairach reference embedded in the
original header.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — subject directory under `$SUBJECTS_DIR`, with
  `mri/orig` already populated in COR- format.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — watershed parameters,
  copied into the subject's `scripts/` only if it exists.

### Input Assumptions

> [!assumption] Old-style COR- subject tree; orientation that breaks MINC
> Same as [[segment_subject]]: `mri/orig` holds a T1-weighted anatomical in
> legacy COR- format. The defining assumption here is that the data's
> orientation is one that the Talairach/MINC conversion mishandles, which is why
> Talairach is omitted.

## Outputs

Identical to [[segment_subject]] **except** that no
`mri/transforms/talairach.xfm` is produced. Outputs: `mri/T1` (normalised),
`mri/brain` (skull-stripped), `mri/wm` (white matter), `mri/filled`, and the
`surf/{lh,rh}.*` surfaces. A `mri/orig/COR-.info.bak` backup of the original
header is also left behind.

## Mathematical Foundations

None in the driver. All computation is delegated to [[mri_normalize]],
[[mri_watershed]], [[mri_segment]], [[mri_fill]] (via [[inflate_subject]]).
See [[segment_subject]] § Mathematical Foundations.

## Configuration Options

No option flags. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Subject directory under `$SUBJECTS_DIR`. No other arguments parsed; no `--help`/`--version`. |

### Configuration Interactions

None — no flags. The only environment dependency is `$SUBJECTS_DIR`.

## Typical Use Cases

### Use Case 1: Segment a subject whose orientation breaks Talairach/MINC

```bash
setenv SUBJECTS_DIR /space/data/subjects
segment_subject_notal odd_orientation_subj
# Normalise → watershed strip → wm label → fill/inflate, with NO Talairach.
```

Use this instead of [[segment_subject]] when the `talairach`/`mritotal` step
fails with a MINC orientation/conversion error.

## Pipeline Context

Standalone legacy driver; not invoked by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all` in v8.2.0. Same position in the historical workflow as
[[segment_subject]], minus the Talairach transform.

**Predecessor:** anatomical in `mri/orig` → **segment_subject_notal** →
**Successor:** cortical surfaces under `surf/` (via [[inflate_subject]]).

## Gotchas and Caveats

> [!gotcha] Runs under `-ef` — a failing step aborts the whole script
> Unlike the canonical [[segment_subject]] (`-f`), this variant uses
> `#!/bin/tcsh -ef`, so the first failing command stops execution. This is
> intentional given that the very step it removes (Talairach) was the one prone
> to fail; the remaining steps are expected to succeed or stop.

> [!gotcha] Header backup is overwritten on re-run
> Re-running first does `rm -f COR-.info.bak` then `mv COR-.info COR-.info.bak`
> ([`scripts/segment_subject_notal:42-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L42-L44)),
> so the `.bak` always reflects the *previous* run's header, not the pristine
> original, after the second run.

## Error Compensation and Guard Rails

- Working directories are created with `mkdir -p` if missing
  ([`:22`, `:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal#L22)).
- `brain.dat` is copied only if the source exists (no spurious error).
- The `xform` header line is stripped to avoid referencing a Talairach
  transform that is never computed.

## Related Tools

- [[segment_subject]] — the canonical driver this variant is based on (adds back the [[talairach]] step).
- [[segment_subject_notal2]] — the **other** no-Talairach variant; it also comments out [[talairach]] but does **not** strip the `xform` header line (and leaves a couple of registration/label calls commented in place). The two differ only in that header handling.
- [[mri_normalize]], [[mri_watershed]], [[mri_segment]], [[inflate_subject]] — the component tools.

## Confidence and Gaps

**High confidence:** the commented-out Talairach call, the `grep -v ^xform`
header edit, the `-ef` shebang, the guarded `brain.dat` copy, and the otherwise
identical step sequence — all read directly from
[`scripts/segment_subject_notal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal).

## References

- FreeSurfer source: [`scripts/segment_subject_notal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal) (v8.2.0).
- Base driver: [[segment_subject]].
