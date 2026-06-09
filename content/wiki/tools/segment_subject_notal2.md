---
title: "segment_subject_notal2"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject_notal2"
families: []                     # legacy white-matter/tissue segmentation driver variant
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[segment_subject_notal]]"
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

# segment_subject_notal2

## Summary

`segment_subject_notal2` is a second **no-Talairach** variant of the legacy
[[segment_subject]] driver. Like [[segment_subject_notal]] it comments out the
[[talairach]] registration step, but unlike that variant it leaves the COR-
header **untouched** (it does not strip the `xform` line). It also keeps the
optional subcortical `register_subject` / `label_subject` calls present in the
file but commented out. Otherwise the sequence is the standard one —
intensity-normalise → watershed skull-strip → white-matter label →
fill/inflate — driven by a single argument, the subject ID (`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_subject_notal2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject_notal2`
- **FreeSurfer tools it invokes:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L45) ([[mri_normalize]]), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L51) ([[mri_watershed]]), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L55) ([[mri_segment]]), [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L59) ([[inflate_subject]]). [`talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L42), `register_subject`, and `label_subject` are present but **commented out** ([`:42`, `:56-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L56-L57)).

## Purpose and Context

This is the simpler of the two no-Talairach variants. It removes the
MINC-based [[talairach]] step (the same orientation-failure motivation as
[[segment_subject_notal]]) but performs **no** header surgery: the original
`mri/orig/COR-.info` is left exactly as found. The commented-out
`register_subject`/`label_subject` lines show it was also used as a hand-editable
template for the subcortical-labelling pathway (which its sibling
[[segment_subject_sc]] turns on). Like the rest of the family it is a standalone
legacy driver, not part of [[wiki/pipelines/recon-all|recon-all]]; see
[[segment_subject]] for the full shared description.

## What This Variant Changes (relative to `segment_subject`)

| Step | `segment_subject` | `segment_subject_notal2` |
|------|-------------------|--------------------------|
| Shebang | `#!/bin/tcsh -f` | `#!/bin/tcsh -ef` (**stops on error**) |
| `brain.dat` copy | unconditional | guarded by `if (-e …)` |
| Talairach | `talairach $1` | **commented out** ([`:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2#L42)) |
| Header edit | none | **none** (key difference from `_notal`) |
| Subcortical | none | `register_subject`/`label_subject` present but **commented out** |
| Normalise / skull-strip / segment / inflate | identical | identical |

### Difference from `segment_subject_notal`

The two no-Talairach variants are nearly identical. The only functional
difference is the COR- header handling:

> [!gotcha] `_notal` strips the `xform` header line; `_notal2` does not
> [[segment_subject_notal]] runs `grep -v ^xform` to remove any Talairach
> reference from `mri/orig/COR-.info`. `segment_subject_notal2` skips that step
> entirely, leaving the original header (including any pre-existing `xform`
> line) in place. Choose `_notal2` when you want to keep whatever transform
> reference the header already carries; choose `_notal` when you want it
> scrubbed.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — subject under `$SUBJECTS_DIR` with `mri/orig`
  populated in COR- format.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — watershed parameters,
  copied only if present.

### Input Assumptions

> [!assumption] Old-style COR- subject tree; Talairach intentionally skipped
> Same as [[segment_subject]]: `mri/orig` holds a T1-weighted anatomical in COR-
> format. Talairach is omitted (typically because MINC conversion fails on the
> data's orientation), and the header is left as-is.

## Outputs

Same as [[segment_subject]] **minus** `mri/transforms/talairach.xfm` (not
produced) and **without** the `COR-.info.bak` backup that `_notal` leaves
behind. Outputs: `mri/T1`, `mri/brain`, `mri/wm`, `mri/filled`,
`surf/{lh,rh}.*`.

## Mathematical Foundations

None in the driver; all computation is in the called binaries. See
[[segment_subject]] § Mathematical Foundations.

## Configuration Options

No option flags. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Subject directory under `$SUBJECTS_DIR`. No other arguments parsed; no `--help`/`--version`. |

### Configuration Interactions

None — no flags.

## Typical Use Cases

### Use Case 1: No-Talairach segmentation, header preserved

```bash
setenv SUBJECTS_DIR /space/data/subjects
segment_subject_notal2 subj01
# Normalise → watershed strip → wm label → fill/inflate; Talairach skipped,
# mri/orig/COR-.info left untouched.
```

Prefer this over [[segment_subject_notal]] when you do not want the COR- header's
`xform` line removed.

## Pipeline Context

Standalone legacy driver; not invoked by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all` in v8.2.0. Same workflow slot as [[segment_subject]], minus the
Talairach transform.

**Predecessor:** anatomical in `mri/orig` → **segment_subject_notal2** →
**Successor:** cortical surfaces under `surf/` (via [[inflate_subject]]).

## Gotchas and Caveats

> [!gotcha] Runs under `-ef`
> A failing step aborts the whole script (contrast the canonical
> [[segment_subject]], which uses `-f` and continues past errors).

> [!gotcha] Commented-out subcortical calls are inert
> The `#register_subject $1` / `#label_subject $1` lines do nothing as shipped.
> To actually run subcortical labelling, use [[segment_subject_sc]], which
> enables `register_subject` + `label_subject` and uses the segmentation-aware
> `inflate_subject_sc`.

## Error Compensation and Guard Rails

- Working directories created if missing.
- `brain.dat` copied only when the source exists.
- No header modification (the original `COR-.info` is preserved verbatim).

## Related Tools

- [[segment_subject]] — the canonical driver (adds the [[talairach]] step).
- [[segment_subject_notal]] — the other no-Talairach variant; differs only in that it strips the `xform` header line (and leaves a `COR-.info.bak`).
- [[segment_subject_sc]] — turns on the subcortical labelling that is commented out here.
- [[mri_normalize]], [[mri_watershed]], [[mri_segment]], [[inflate_subject]] — component tools.

## Confidence and Gaps

**High confidence:** the commented-out Talairach (and `register_subject`/
`label_subject`) lines, the absence of any header edit, the `-ef` shebang, and
the otherwise standard step sequence — all read directly from
[`scripts/segment_subject_notal2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2).

## References

- FreeSurfer source: [`scripts/segment_subject_notal2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_notal2) (v8.2.0).
- Base driver: [[segment_subject]]; sibling: [[segment_subject_notal]].
