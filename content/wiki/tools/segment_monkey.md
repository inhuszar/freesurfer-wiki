---
title: "segment_monkey"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_monkey"
families: []                     # legacy white-matter/tissue segmentation driver variant (non-human primate)
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[mri_normalize]]"
  - "[[mri_segment]]"
  - "[[mri_watershed]]"
  - "[[inflate_subject]]"
  - "[[talairach]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - white-matter
  - non-human-primate
  - monkey
  - control-points
  - legacy
  - driver-script
---

# segment_monkey

## Summary

`segment_monkey` is the **non-human-primate (monkey)** variant of the
[[segment_subject]] driver. It produces a white-matter segmentation and cortical
surfaces for a monkey brain, with three deliberate departures from the human
pipeline: (1) it **requires manually placed control points** and refuses to run
without them; (2) it performs **no Talairach registration** (the human-atlas
transform does not apply to monkeys); and (3) it performs **no skull strip** —
instead it segments the normalised volume (`mri/T1`) directly. Intensity
normalisation is driven by the control-point file with the 1-D pass disabled
(`mri_normalize -f control.dat -no1d`). It takes one argument, the subject ID
(`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_monkey`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_monkey`
- **FreeSurfer tools it invokes:** [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L52) ([[mri_normalize]], with `-f control.dat -no1d`), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L58) ([[mri_segment]]), [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L59) ([[inflate_subject]]). It calls **neither** [[talairach]] **nor** [[mri_watershed]].

## Purpose and Context

FreeSurfer's default driver assumes a human brain: it linearly registers to a
human Talairach/MNI atlas and skull-strips with watershed parameters tuned for
human heads. Neither is appropriate for macaque/monkey data. `segment_monkey`
adapts the legacy pipeline for non-human primates by removing the human-specific
steps and relying on **operator-supplied control points** to anchor the
intensity normalisation (monkey white-matter intensities and head geometry make
the automatic control-point search unreliable). The result is a white-matter
volume and inflated surfaces for the monkey brain. It is a standalone legacy
driver, not part of [[wiki/pipelines/recon-all|recon-all]] (which has its own
non-human options); see [[segment_subject]] for the shared skeleton.

> [!gotcha] Control points are mandatory — the script exits if absent
> Before doing anything else, `segment_monkey` checks for
> `$SUBJECTS_DIR/$1/tmp/control.dat` and, if missing, prints
> `ERROR: at least 1 control point must be selected` and exits with status 2
> ([`scripts/segment_monkey:21-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L21-L24)).
> You must place control points (e.g. in `tkmedit`/`freeview`) and save them to
> `tmp/control.dat` before running. This is the only variant with a hard
> precondition check.

## What This Variant Changes (relative to `segment_subject`)

| Step | `segment_subject` (human) | `segment_monkey` |
|------|---------------------------|------------------|
| Shebang | `#!/bin/tcsh -f` | `#!/bin/tcsh -ef` (**stops on error**) |
| Precondition | none | **requires `tmp/control.dat`; exit 2 if missing** |
| `brain.dat` copy | unconditional | guarded by `if (-e …)` |
| Talairach | `talairach $1` | **none** (no human atlas) |
| Header edit | none | **strips `^xform` line** from `mri/orig/COR-.info` ([`:47-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L47-L49)) |
| Normalisation | `mri_normalize ../mri/orig ../mri/T1` | **`mri_normalize -f ../tmp/control.dat -no1d ../mri/orig ../mri/T1`** |
| Skull strip | `mri_watershed T1 brain` | **none** |
| Segment input | `mri/brain` (skull-stripped) | **`mri/T1`** (normalised, *not* skull-stripped) |
| Inflation | `inflate_subject` | `inflate_subject` (unchanged) |

Two `mri_normalize` flags carry the monkey adaptation
([`scripts/segment_monkey:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L52)):

- **`-f ../tmp/control.dat`** — read the operator's control points from the
  text file (one voxel per line) instead of auto-detecting them. See
  [[mri_normalize]].
- **`-no1d`** — disable the 1-D pre-normalisation pass (which assumes
  human-like intensity profiles).

Because there is no skull strip, [[mri_segment]] is run on `mri/T1` rather than
`mri/brain` ([`scripts/segment_monkey:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L58)).

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — monkey subject under `$SUBJECTS_DIR` with `mri/orig`
  in COR- format.
- **`$SUBJECTS_DIR/<subject>/tmp/control.dat`** — **mandatory** control-point
  file (column/row/slice per line). The script exits without it.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — copied if present
  (inherited from the human workflow; not consumed here since there is no
  watershed step).

### Input Assumptions

> [!assumption] Monkey anatomical in COR- format, with hand-placed control points
> Assumes a non-human-primate T1-weighted anatomical in `mri/orig` (COR-
> format) and a saved `tmp/control.dat`. No human Talairach atlas applies, and
> the volume is assumed to be usable for white-matter labelling **without**
> skull stripping (the monkey scan is expected to be reasonably clean of
> confounding non-brain tissue, since segmentation runs on `T1` directly).

## Outputs

| File / directory | Created by | Contents |
|------------------|-----------|----------|
| `mri/T1/` | [[mri_normalize]] (`-f control.dat -no1d`) | control-point-normalised anatomical (COR-) |
| `mri/wm/` | [[mri_segment]] (on `mri/T1`) | labelled white matter (COR-) |
| `mri/filled/` | [[mri_fill]] (via [[inflate_subject]]) | hemisphere-filled interior |
| `surf/{lh,rh}.*` | [[inflate_subject]] | tessellated / inflated surfaces |
| `mri/orig/COR-.info.bak` | the driver | backup of the original header before `xform` stripping |

No `mri/transforms/talairach.xfm` (no Talairach) and **no `mri/brain`** (no
skull strip) are produced. The `mri/brain` directory is still created empty by
the `foreach` loop but is not populated.

## Mathematical Foundations

None in the driver. The one numerically meaningful adaptation is in how
[[mri_normalize]] is invoked:

> [!math] Control-point-driven, 1-D-disabled normalisation
> With `-f control.dat`, the bias-field/intensity normalisation uses the
> operator-specified white-matter control points $\mathcal{C}$ directly rather
> than searching for them, and `-no1d` removes the initial 1-D
> (slice-direction) normalisation pass. This is the appropriate configuration
> when the automatic control-point detection — tuned to human white-matter
> intensities and head geometry — would mis-fire on monkey data. The actual
> fitting math is [[mri_normalize]]'s control-point method.

All other computation (white-matter labelling, fill, inflation) is identical to
[[segment_subject]]; see its Mathematical Foundations section.

## Configuration Options

No option flags on the driver. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Monkey subject directory under `$SUBJECTS_DIR`. Must contain `tmp/control.dat`. No `--help`/`--version`. |

(The `-f` and `-no1d` flags are hard-coded into the internal
[[mri_normalize]] call; they are not exposed as driver options.)

### Configuration Interactions

None at the driver level — no flags. The only hard dependency is the
`tmp/control.dat` precondition, enforced before any processing.

## Typical Use Cases

### Use Case 1: Segment a macaque brain from hand-placed control points

```bash
setenv SUBJECTS_DIR /space/data/monkeys
# 1) Open the monkey orig volume, place WM control points, save to:
#      $SUBJECTS_DIR/macaque01/tmp/control.dat
# 2) Run the monkey driver:
segment_monkey macaque01
# → control-point-normalised mri/T1, mri/wm, mri/filled, surf/{lh,rh}.*
#   (no Talairach, no skull strip).
```

If `tmp/control.dat` is missing the script stops immediately with exit code 2.

## Pipeline Context

Standalone legacy driver for non-human-primate data; not invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. It replaces the human
Talairach + watershed steps of [[segment_subject]] with a control-point-anchored
normalisation and direct segmentation.

**Predecessor:** monkey anatomical in `mri/orig` + hand-placed `tmp/control.dat`
→ **segment_monkey** → **Successor:** cortical surfaces under `surf/` (via
[[inflate_subject]]).

## Gotchas and Caveats

> [!gotcha] Segments the non-skull-stripped `T1`
> Because there is no [[mri_watershed]] step, [[mri_segment]] runs on `mri/T1`
> (the whole normalised head), not on a brain-only volume. Residual non-brain
> tissue that survives normalisation can therefore leak into the white-matter
> labelling; high-quality, well-cropped monkey input matters more here than for
> the human driver.

> [!gotcha] `mri/brain` is created but never filled
> The directory-creation `foreach` includes `../mri/brain`, but with no skull
> strip nothing writes into it. Do not mistake the empty `mri/brain` for a
> failed skull strip — there simply is no skull-strip step.

> [!gotcha] Strips the `xform` header line (like `_notal`)
> As with [[segment_subject_notal]], the original `mri/orig/COR-.info` is backed
> up and rewritten with the `xform` line removed
> ([`scripts/segment_monkey:47-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L47-L49)),
> since no Talairach transform is computed.

## Error Compensation and Guard Rails

- **Hard precondition:** missing `tmp/control.dat` → immediate `exit 2`
  ([`:21-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey#L21-L24)).
- Working directories created if missing.
- `brain.dat` copied only when the source exists.
- `xform` header line stripped to avoid referencing a non-existent transform.
- Runs under `-ef`: any failing step aborts the script.

## Related Tools

- [[segment_subject]] — the human canonical driver; `segment_monkey` removes its Talairach and skull-strip steps and adds the mandatory control-point normalisation.
- [[mri_normalize]] — invoked here with `-f control.dat -no1d`; the control-point file and 1-D-disabled pass are the monkey adaptation.
- [[mri_segment]] — white-matter labelling, run on `mri/T1` (not `mri/brain`).
- [[mri_watershed]] — the human skull-strip step that `segment_monkey` deliberately **omits**.
- [[talairach]] — the human Talairach step that `segment_monkey` deliberately **omits**.
- [[inflate_subject]] — final fill/inflate step (shared, unchanged).
- [[segment_subject_notal]] — shares the no-Talairach + `xform`-stripping behaviour (but for human data, and it keeps the watershed skull strip).

## Confidence and Gaps

**High confidence:** the mandatory `control.dat` check and exit code, the absence
of [[talairach]] and [[mri_watershed]], the `-f control.dat -no1d`
normalisation, segmentation of `mri/T1` rather than `mri/brain`, and the `xform`
header stripping — all read directly from
[`scripts/segment_monkey`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey).

## References

- FreeSurfer source: [`scripts/segment_monkey`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_monkey) (v8.2.0).
- Normalisation flags: [[mri_normalize]] (`-f`, `-no1d`).
- Base driver: [[segment_subject]]; closest human sibling: [[segment_subject_notal]].
