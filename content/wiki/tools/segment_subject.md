---
title: "segment_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject"
families: []                     # legacy white-matter/tissue segmentation driver
recon_all_stage: null            # not called by recon-all; standalone legacy driver
related:
  - "[[talairach]]"
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[mri_fill]]"
  - "[[inflate_subject]]"
  - "[[segment_subject_notal]]"
  - "[[segment_subject_notal2]]"
  - "[[segment_subject_old_skull_strip]]"
  - "[[segment_subject_sc]]"
  - "[[segment_subject_talmgh]]"
  - "[[segment_monkey]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether any current FreeSurfer entry point still invokes this script (it is not called by recon-all/trac-all in v8.2.0); it appears to be a legacy COR-volume driver retained for backward compatibility and manual use."
tags:
  - segmentation
  - white-matter
  - skull-strip
  - legacy
  - driver-script
  - cor-format
---

# segment_subject

## Summary

`segment_subject` is a small legacy tcsh driver that runs the classic
FreeSurfer "anatomical segmentation" sequence for a single subject: it computes
a Talairach transform, intensity-normalises the original anatomical volume,
strips the skull, labels the cerebral white matter, and finally fills and
inflates the cortical surfaces. It takes exactly one argument — the subject ID
(`$1`) — and operates inside `$SUBJECTS_DIR/<subject>/` using the historical
**COR-** (bshort/COR-`NNN`) volume layout rather than the modern `.mgz` files.
It is the canonical member of a small family of `segment_subject_*` variants;
each variant changes one step (Talairach handling, skull-strip method,
subcortical labelling, or species) while keeping this overall skeleton.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/segment_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject`
- **FreeSurfer tools it invokes:** [`talairach`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L34) ([[talairach]]), [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L37) ([[mri_normalize]]), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L44) ([[mri_watershed]]), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L47) ([[mri_segment]]), and [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L48) ([[inflate_subject]], which in turn calls [[mri_fill]] and the per-hemisphere inflation scripts).

## Purpose and Context

`segment_subject` predates the modern [[wiki/pipelines/recon-all|recon-all]]
stream. It bundles, in one script, the steps that take a raw anatomical volume
to a set of white-matter-labelled volumes ready for surface generation:

1. **Talairach registration** — establish the linear transform to MNI/Talairach
   space (used downstream and for QC).
2. **Intensity normalisation** — flatten the bias field so white matter sits at
   a uniform intensity.
3. **Skull strip** — remove non-brain tissue so segmentation is not confused by
   skull/scalp.
4. **White-matter labelling** — produce the binary `wm` volume.
5. **Fill + inflate** — fill the white-matter interior, split the hemispheres,
   and inflate the cortical surfaces (delegated to [[inflate_subject]]).

In the modern pipeline these are individual [[wiki/pipelines/recon-all|recon-all]]
stages (`mri_normalize`, `mri_watershed`, `mri_segment`, `mri_fill`,
`mris_inflate`). `segment_subject` is the *historical* monolithic driver that
chained them together for a single subject before `recon-all` existed in its
current form. In a v8.2.0 source tree it is **not** invoked by `recon-all` or
`trac-all` (see [Pipeline Context](#pipeline-context)); it survives as a
standalone, manually-run utility and as the parent of its `_notal*`,
`_old_skull_strip`, `_sc`, `_talmgh`, and `_monkey` variants.

> [!gotcha] Operates on the legacy COR-/bshort volume layout, not `.mgz`
> Every step reads and writes the old per-subdirectory **COR-** format
> (`mri/orig`, `mri/T1`, `mri/brain`, `mri/wm` as directories of `COR-NNN`
> slice files plus a `COR-.info` header), and the script manually copies
> `COR-.info` between subdirectories
> ([`scripts/segment_subject:38-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L38-L39)).
> Modern subjects produced by `recon-all` store `mri/orig.mgz`, `mri/T1.mgz`,
> etc. as single files, so this driver expects an old-style subject tree and
> will not find `.mgz` inputs.

## Inputs

### Required Inputs

- **Subject ID** — the sole positional argument `$1`. The script requires
  `$SUBJECTS_DIR` to be set and `$SUBJECTS_DIR/<subject>/mri/orig` to already
  contain the input anatomical in COR- format. (`orig` is the only volume the
  script reads that it does not itself create.)
- **`$SUBJECTS_DIR/scripts/brain.dat`** — a watershed parameter file copied into
  the subject's `scripts/` directory if the subject does not already have one
  ([`scripts/segment_subject:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L23)). Used by [[mri_watershed]].

### Input Assumptions

> [!assumption] An old-style COR- subject tree with `mri/orig` already populated
> The script assumes `$SUBJECTS_DIR/<subject>/mri/orig` exists and holds a
> T1-weighted anatomical in the legacy COR- (bshort) format, and that a
> watershed `brain.dat` is available at `$SUBJECTS_DIR/scripts/brain.dat` (the
> canonical script copies it unconditionally; the variants guard the copy with
> an existence test). The remaining working directories (`tmp`, `mri/T1`,
> `mri/wm`, `mri/filled`, `mri/brain`, `surf`) are created automatically if
> missing ([`scripts/segment_subject:26-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L26-L28)).

- Intensities are assumed to be T1 contrast (white matter brighter than grey),
  as required by [[mri_normalize]] and [[mri_segment]].
- The Talairach step ([[talairach]]) runs MINC's `mritotal` and therefore needs
  the input to be convertible to MINC; orientation problems in the MINC
  conversion are exactly the failure mode that motivated the `_notal` variants
  (see [Related Tools](#related-tools)).

## Outputs

### Files Created

All paths are relative to `$SUBJECTS_DIR/<subject>/`. Volumes are COR-
directories (each containing `COR-NNN` slice files and a `COR-.info` header).

| File / directory | Created by | Contents |
|------------------|-----------|----------|
| `scripts/brain.dat` | the driver (copy) | watershed parameters for [[mri_watershed]] |
| `mri/transforms/talairach.xfm` (+ `.lta`) | [[talairach]] | linear Talairach/MNI305 transform |
| `mri/T1/` | [[mri_normalize]] | intensity-normalised anatomical (COR-) |
| `mri/brain/` | [[mri_watershed]] | skull-stripped brain volume (COR-) |
| `mri/wm/` | [[mri_segment]] | labelled cerebral white matter (COR-) |
| `mri/filled/` | [[mri_fill]] (via [[inflate_subject]]) | hemisphere-filled white-matter interior |
| `surf/lh.*`, `surf/rh.*` | [[inflate_subject]] → `inflate_subject-lh/-rh` | tessellated and inflated cortical surfaces |
| `mri/T1/COR-.info` copied into `mri/brain` and `mri/wm` | the driver | header propagated so downstream volumes share geometry |

### Output Specifications

Geometry, data type, and orientation of every volume are entirely determined by
the underlying binaries ([[mri_normalize]], [[mri_watershed]], [[mri_segment]],
[[mri_fill]]); the driver performs no resampling itself. The only data the
driver touches directly is the `COR-.info` header, which it copies verbatim from
`mri/T1` into `mri/brain` and `mri/wm`
([`scripts/segment_subject:38-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L38-L39))
so that the skull-stripped and white-matter volumes inherit the normalised
volume's voxel geometry.

## Mathematical Foundations

None in the driver itself — `segment_subject` is pure orchestration. Every
numerical operation lives in a called tool:

> [!internal] The math is in the called binaries
> Bias-field/intensity normalisation is the control-point method in
> [[mri_normalize]]; brain extraction is the watershed-plus-deformable-surface
> algorithm in [[mri_watershed]]; white-matter labelling (intensity thresholds,
> plane-of-least-variance, connected components) is in [[mri_segment]]; the
> linear Talairach fit is MINC's `mritotal` driven by [[talairach]]; hemisphere
> filling and surface inflation are in [[mri_fill]] and the inflation scripts
> reached through [[inflate_subject]]. Consult those pages for the equations.

The only assignment the driver makes is the diagnostic bitmask
`setenv DIAG 0x04048` ([`scripts/segment_subject:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L32)),
which selects which debug/diagnostic outputs the binaries emit; it does not
affect the segmentation result.

## Configuration Options

### Complete Flag Reference

`segment_subject` has **no option flags**. Its entire command-line interface is
a single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Name of the subject directory under `$SUBJECTS_DIR`. The script `pushd`es into `$SUBJECTS_DIR/$1/scripts` and processes that subject's COR- volumes. No other arguments are parsed; extra arguments are ignored. |

There is no `--help`, `--version`, or argument-validation logic: passing
`--help` is treated as a subject name and the script immediately tries to
`mkdir $SUBJECTS_DIR/--help/scripts` (it will simply fail on the missing
directory).

### Configuration Interactions

There are no flags, hence no flag interactions. The only environment dependency
is `$SUBJECTS_DIR`, which must be set and must contain the named subject with a
populated `mri/orig`.

> [!gotcha] No argument checking
> Unlike the `_monkey` variant (which checks for a control-point file and exits
> with status 2 if missing), the canonical `segment_subject` performs **no**
> precondition checks. If `mri/orig` is absent or `$SUBJECTS_DIR` is unset, the
> failure surfaces only when the first binary ([[talairach]] /
> [[mri_normalize]]) cannot find its input. The `-f` shebang
> (`#!/bin/tcsh -f`) also means the script does **not** abort on the first
> error, so later steps may run on missing/partial inputs (contrast the
> variants, which use `-ef` and stop on error).

## Typical Use Cases

### Use Case 1: Segment one old-style subject end to end

```bash
# $SUBJECTS_DIR is set; bert/mri/orig already holds a COR- T1 volume.
setenv SUBJECTS_DIR /space/data/subjects
segment_subject bert
# → bert/mri/T1, bert/mri/brain, bert/mri/wm, bert/mri/filled, bert/surf/{lh,rh}.*
```

Runs Talairach → normalise → watershed skull-strip → white-matter label → fill
and inflate, all on `bert`.

### Use Case 2: Re-run after editing the white-matter volume

Because `inflate_subject` is the last step and "needs to be rerun each time the
`wm` volume is edited", editing `mri/wm` and re-running the surface stage is the
intended manual-correction loop. Re-running `segment_subject` would recompute
everything; to redo only the surfaces after a `wm` edit, call
[[inflate_subject]] directly:

```bash
inflate_subject bert
```

## Pipeline Context

`segment_subject` is a **self-contained legacy driver**, not a recon-all stage.
A grep of `scripts/recon-all` and `scripts/trac-all` in v8.2.0 finds no
reference to it; the only references in the source tree are the script itself,
its `CMakeLists.txt` install entry, and a historical alpha driver
`fsralpha.tmp`, whose help text describes it as
"`-segment_subject : (same as stage1 without motion cor)`"
— i.e. it corresponds to the old "stage 1" anatomical segmentation minus motion
correction.

Conceptually it maps onto the modern stream as:

**Predecessor:** raw anatomical placed in `mri/orig` (historically via the old
COR- import tools) → **segment_subject** → **Successor:** the cortical surfaces
written under `surf/` by [[inflate_subject]], which later FreeSurfer surface
tools (e.g. `mris_make_surfaces`, `mris_sphere`) would consume.

In current FreeSurfer the same work is done piecewise by
[[wiki/pipelines/recon-all|recon-all]] stages calling [[mri_normalize]],
[[mri_watershed]], [[mri_segment]], [[mri_fill]], and `mris_inflate` on `.mgz`
volumes.

## Gotchas and Caveats

> [!gotcha] `-f` shebang: errors do not stop the script
> `segment_subject` uses `#!/bin/tcsh -f` (no `-e`). Every variant
> (`_notal`, `_sc`, `_talmgh`, `_monkey`, …) instead uses `#!/bin/tcsh -ef`,
> which aborts on the first failing command. So the canonical script is the
> *least* fail-safe of the family: a failed Talairach or skull-strip will not
> prevent [[mri_segment]] and [[inflate_subject]] from running on whatever is
> (or isn't) present.

> [!gotcha] `brain.dat` is copied unconditionally and from a fixed location
> The canonical driver does `cp $SUBJECTS_DIR/scripts/brain.dat …` whenever the
> subject lacks the file ([`scripts/segment_subject:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L23)),
> without first checking that the source exists. If
> `$SUBJECTS_DIR/scripts/brain.dat` is missing, the copy errors (harmlessly,
> given `-f`) and [[mri_watershed]] later falls back to its built-in defaults.
> The variants wrap this copy in an `if (-e …)` existence test.

> [!gotcha] Talairach uses MINC `mritotal` and can fail on orientation
> The [[talairach]] step converts the input to MINC and runs `mritotal`.
> Orientation/conversion problems here are the documented reason the
> [[segment_subject_notal]] and [[segment_subject_notal2]] variants exist
> (they comment the Talairach call out). If `mritotal` mis-registers, every
> downstream volume is still produced (the transform is not consumed by the
> segmentation binaries here) but the `talairach.xfm` will be wrong.

## Error Compensation and Guard Rails

- **Directory auto-creation.** The `scripts/` directory and all working
  subdirectories (`tmp`, `mri/T1`, `mri/wm`, `mri/filled`, `mri/brain`, `surf`)
  are created if missing ([`scripts/segment_subject:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject#L21-L28)),
  so a partially-populated subject tree is tolerated.
- **Header propagation.** Copying `COR-.info` into `mri/brain` and `mri/wm`
  guards against geometry mismatches between the normalised volume and the
  downstream volumes.
- **No input validation / no fail-fast.** Beyond the above, the canonical
  script provides no guard rails: it does not verify inputs and (because of
  `-f`) does not stop on error. The skull-strip robustness, intensity clamping,
  etc. are whatever the called binaries provide.

## Related Tools

- [[talairach]] — computes the linear Talairach transform (this driver's first step). The `_talmgh` variant swaps it for [[talairach_mgh]] (GCA-based `mri_em_register`); the `_notal*` variants omit it.
- [[mri_normalize]] — intensity/bias-field normalisation (`orig` → `T1`). The `_monkey` variant calls it with `-f control.dat -no1d`.
- [[mri_watershed]] — watershed skull strip (`T1` → `brain`); this is the default skull-strip step. The `_old_skull_strip` variant uses `mri_strip_skull` instead; `_monkey` does no skull strip.
- [[mri_segment]] — white-matter labelling (`brain` → `wm`).
- [[mri_fill]] / [[inflate_subject]] — hemisphere fill and surface inflation (final step).
- [[segment_subject_notal]] — same as this but Talairach commented out (and strips the `xform` line from the header).
- [[segment_subject_notal2]] — Talairach commented out, header left untouched.
- [[segment_subject_old_skull_strip]] — uses the older `mri_strip_skull` skull strip instead of watershed.
- [[segment_subject_sc]] — adds subcortical labelling ([[mri_em_register]]/`mri_ca_*` via `register_subject`+`label_subject`) and a segmentation-aware fill (`inflate_subject_sc`).
- [[segment_subject_talmgh]] — uses [[talairach_mgh]] (GCA atlas + `mri_em_register.old`) for the Talairach step.
- [[segment_monkey]] — non-human-primate variant: requires manual control points, no Talairach, no skull strip, normalises with `-f control.dat -no1d`, segments `T1` directly.

## Confidence and Gaps

**High confidence:** the complete step sequence, the single-argument interface,
the COR- file layout, the tools invoked and their argument order, the `-f`
(non-fail-fast) shebang, and the unconditional `brain.dat` copy — all read
directly from [`scripts/segment_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject).

> [!gap] Current entry points
> No v8.2.0 script (`recon-all`, `trac-all`) calls `segment_subject`; it appears
> to be a retained-for-compatibility legacy driver run by hand or by old
> site-specific wrappers (the alpha driver `fsralpha.tmp` references it). Which,
> if any, supported workflow still invokes it is not determinable from the
> source alone.

## References

- FreeSurfer source: [`scripts/segment_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject) (v8.2.0).
- Component tools: [[talairach]], [[mri_normalize]], [[mri_watershed]],
  [[mri_segment]], [[mri_fill]], [[inflate_subject]].
- Historical: the legacy FreeSurfer "manual reconstruction" workflow that
  `segment_subject` automated, superseded by [[wiki/pipelines/recon-all|recon-all]].
