---
title: "segment_subject_old_skull_strip"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject_old_skull_strip"
families: []                     # legacy white-matter/tissue segmentation driver variant
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[mri_watershed]]"
  - "[[mri_normalize]]"
  - "[[mri_segment]]"
  - "[[inflate_subject]]"
  - "[[talairach]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "mri_strip_skull is referenced by this script but is not shipped as a binary in the 8.2.0 install (mri_watershed superseded it); the exact mri_strip_skull arguments beyond `<subject> 1` are not documented from a present binary."
tags:
  - segmentation
  - white-matter
  - skull-strip
  - legacy
  - driver-script
---

# segment_subject_old_skull_strip

## Summary

`segment_subject_old_skull_strip` is the **legacy skull-strip** variant of the
[[segment_subject]] driver. It runs the identical anatomical segmentation
sequence — Talairach → intensity-normalise → skull-strip → white-matter label →
fill/inflate — but performs the skull strip with the **older
`mri_strip_skull`** program instead of the default [[mri_watershed]]. In the
canonical script the relationship is inverted: there, `mri_strip_skull` is
commented out and `mri_watershed` is active; here, `mri_strip_skull` is active
and `mri_watershed` is commented out. It takes one argument, the subject ID
(`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_subject_old_skull_strip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject_old_skull_strip`
- **FreeSurfer tools it invokes:** [`talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L43) ([[talairach]]), [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L46) ([[mri_normalize]]), [`mri_strip_skull`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L51) (legacy skull strip), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L55) ([[mri_segment]]), [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L56) ([[inflate_subject]]). The [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L52) call is present but **commented out**.

## Purpose and Context

FreeSurfer's brain-extraction method changed over time from the older
`mri_strip_skull` to the watershed-based [[mri_watershed]] (the canonical
[[segment_subject]] even annotates the switch: `# rkt: changed to use
watershed`). `segment_subject_old_skull_strip` preserves the **pre-watershed**
behaviour for reproducing old results or for cases where the legacy method
extracted a particular brain better. Everything else matches the canonical
driver, including the [[talairach]] step. It is a standalone legacy driver, not
part of [[wiki/pipelines/recon-all|recon-all]]; see [[segment_subject]] for the
shared description.

> [!contradiction] `mri_strip_skull` is not installed in 8.2.0
> This script calls `mri_strip_skull $1 1`, but `mri_strip_skull` is **not
> present** in `$FREESURFER_HOME/bin` for the 8.2.0 install (only
> [[mri_watershed]] ships). Running this variant as-is on a modern install will
> therefore fail at the skull-strip step (and, under `-ef`, abort). The script
> is retained for historical fidelity; on current installs use the
> watershed-based [[segment_subject]].

## What This Variant Changes (relative to `segment_subject`)

| Step | `segment_subject` | `segment_subject_old_skull_strip` |
|------|-------------------|------------------------------------|
| Shebang | `#!/bin/tcsh -f` | `#!/bin/tcsh -ef` (**stops on error**) |
| `brain.dat` copy | unconditional | guarded by `if (-e …)` |
| Talairach | `talairach $1` | `talairach $1` (**unchanged**) |
| **Skull strip** | `mri_watershed ../mri/T1 ../mri/brain` (active); `mri_strip_skull` commented out | **`mri_strip_skull $1 1`** (active); `mri_watershed` commented out |
| Normalise / segment / inflate | identical | identical |

The single substantive change is the skull-strip program. `mri_strip_skull` is
called with the subject ID and the literal argument `1`
([`scripts/segment_subject_old_skull_strip:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip#L51));
both old and new methods write the result to `mri/brain`, which [[mri_segment]]
then reads.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — subject under `$SUBJECTS_DIR` with `mri/orig`
  populated in COR- format.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — copied if present
  (consumed by the watershed path; the active `mri_strip_skull` path does not
  use it).
- **`mri_strip_skull` binary** — required for the skull-strip step; absent on
  the stock 8.2.0 install (see contradiction above).

### Input Assumptions

> [!assumption] Old-style COR- subject tree and the legacy skull-strip binary
> Same as [[segment_subject]]: `mri/orig` holds a T1-weighted anatomical in COR-
> format. Additionally assumes `mri_strip_skull` is available, which it is not in
> a default 8.2.0 build.

## Outputs

Identical to [[segment_subject]]: `mri/transforms/talairach.xfm`, `mri/T1`,
`mri/brain` (here produced by `mri_strip_skull`), `mri/wm`, `mri/filled`,
`surf/{lh,rh}.*`. The only difference is the **algorithm** that produced
`mri/brain`.

## Mathematical Foundations

None in the driver; computation is in the called tools. The skull-strip math
differs from the canonical driver only in that brain extraction is the legacy
`mri_strip_skull` algorithm rather than the watershed + deformable-surface
method of [[mri_watershed]]. See [[segment_subject]] § Mathematical Foundations
for the rest.

## Configuration Options

No option flags. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Subject directory under `$SUBJECTS_DIR`. Forwarded to `talairach`, `mri_strip_skull`, and `inflate_subject`. No `--help`/`--version`. |

### Configuration Interactions

None — no flags. (Internally, the literal `1` passed to `mri_strip_skull` is a
fixed positional argument of that legacy program, not a user-tunable option of
this driver.)

## Typical Use Cases

### Use Case 1: Reproduce a pre-watershed segmentation

```bash
setenv SUBJECTS_DIR /space/data/subjects
segment_subject_old_skull_strip bert
# Talairach → normalise → mri_strip_skull → wm label → fill/inflate.
# (Requires the legacy mri_strip_skull binary.)
```

Use only when you specifically need the old `mri_strip_skull` brain extraction;
otherwise prefer [[segment_subject]] (watershed).

## Pipeline Context

Standalone legacy driver; not invoked by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all`. Same workflow slot as [[segment_subject]], differing only in the
skull-strip method.

**Predecessor:** anatomical in `mri/orig` → **segment_subject_old_skull_strip**
→ **Successor:** cortical surfaces under `surf/` (via [[inflate_subject]]).

## Gotchas and Caveats

> [!gotcha] Will fail on modern installs (missing binary, `-ef` abort)
> `mri_strip_skull` is not shipped with 8.2.0; under `#!/bin/tcsh -ef` the
> missing binary aborts the run at the skull-strip step. There is no automatic
> fallback to watershed (that call is commented out).

> [!gotcha] `brain.dat` is copied but the active skull-strip ignores it
> The guarded `brain.dat` copy is inherited from the watershed workflow; the
> active `mri_strip_skull` path does not consume it. It would only matter if you
> re-enabled the commented-out [[mri_watershed]] line.

## Error Compensation and Guard Rails

- Working directories created if missing.
- `brain.dat` copied only when present.
- No skull-strip fallback: if `mri_strip_skull` is unavailable or fails, the
  script stops (no watershed retry).

## Related Tools

- [[segment_subject]] — the canonical driver; uses [[mri_watershed]] for skull strip (the inverse of this variant).
- [[mri_watershed]] — the modern watershed skull strip that replaced `mri_strip_skull`.
- `mri_strip_skull` *(no wiki page; legacy binary, not in 8.2.0)* — the older brain-extraction program this variant uses.
- [[mri_normalize]], [[mri_segment]], [[inflate_subject]], [[talairach]] — the rest of the shared sequence.

## Confidence and Gaps

**High confidence:** the active `mri_strip_skull $1 1` call, the commented-out
[[mri_watershed]] line, the retained [[talairach]] step, the `-ef` shebang, and
the otherwise identical sequence — all read directly from
[`scripts/segment_subject_old_skull_strip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip).

> [!gap] `mri_strip_skull` arguments and availability
> Because `mri_strip_skull` is not installed in 8.2.0, its full argument
> semantics (beyond the `<subject> 1` invocation here) could not be confirmed
> against a present binary.

## References

- FreeSurfer source: [`scripts/segment_subject_old_skull_strip`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_old_skull_strip) (v8.2.0).
- Base driver: [[segment_subject]] (note the `# rkt: changed to use watershed`
  comment marking the historical switch).
