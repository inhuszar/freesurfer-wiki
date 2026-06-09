---
title: "segment_subject_talmgh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/segment_subject_talmgh"
families: []                     # legacy white-matter/tissue segmentation driver variant
recon_all_stage: null
related:
  - "[[segment_subject]]"
  - "[[talairach_mgh]]"
  - "[[talairach]]"
  - "[[mri_em_register]]"
  - "[[mri_normalize]]"
  - "[[mri_watershed]]"
  - "[[mri_segment]]"
  - "[[inflate_subject]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - white-matter
  - skull-strip
  - talairach
  - gca
  - legacy
  - driver-script
---

# segment_subject_talmgh

## Summary

`segment_subject_talmgh` is the **GCA-based Talairach** variant of the
[[segment_subject]] driver. It runs the same anatomical segmentation sequence —
Talairach → intensity-normalise → watershed skull-strip → white-matter label →
fill/inflate — but computes the Talairach transform with **[[talairach_mgh]]**
(MGH's GCA-atlas registration via `mri_em_register.old`) instead of the default
**[[talairach]]** (MINC `mritotal`). Only the registration method changes;
normalisation, skull strip ([[mri_watershed]]), white-matter labelling, and
inflation are identical. It takes one argument, the subject ID (`$1`).

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef` — aborts on first error)
- **Source file:** [`scripts/segment_subject_talmgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh)
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subject_talmgh`
- **FreeSurfer tools it invokes:** [`talairach_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L43) ([[talairach_mgh]], which runs [[mri_em_register]] against a GCA atlas), [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L46) ([[mri_normalize]]), [`mri_watershed`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L52) ([[mri_watershed]]), [`mri_segment`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L56) ([[mri_segment]]), [`inflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L60) ([[inflate_subject]]). `register_subject` / `label_subject` are present but **commented out** ([`:57-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh#L57-L58)).

## Purpose and Context

FreeSurfer offers two ways to compute the linear Talairach transform: the older
MINC `mritotal` (wrapped by [[talairach]]) and the GCA-atlas
expectation-maximisation registration (wrapped by [[talairach_mgh]], which calls
`mri_em_register.old` against `talairach_young_new_b.gca`). `segment_subject_talmgh`
selects the **GCA/MGH** route. This is useful when `mritotal`/MINC mis-registers
(e.g. atypical anatomy or orientations) and an atlas-driven linear fit is
preferred. Everything downstream of the transform is identical to the canonical
driver. It is a standalone legacy driver, not part of
[[wiki/pipelines/recon-all|recon-all]]; see [[segment_subject]] for the shared
description.

## What This Variant Changes (relative to `segment_subject`)

| Step | `segment_subject` | `segment_subject_talmgh` |
|------|-------------------|--------------------------|
| Shebang | `#!/bin/tcsh -f` | `#!/bin/tcsh -ef` (**stops on error**) |
| `brain.dat` copy | unconditional | guarded by `if (-e …)` |
| **Talairach** | `talairach $1` (MINC `mritotal`) | **`talairach_mgh $1`** (GCA atlas, `mri_em_register.old`) |
| Skull strip / normalise / segment / inflate | identical | identical |

[[talairach_mgh]] writes its transform to `mri/transforms/talairach.xfm` (set via
its internal `LTA` variable) by masking with the `brain` volume and registering
`orig` to the `talairach_young_new_b.gca` atlas. The two methods therefore
populate the **same** output file with transforms derived by different
algorithms.

> [!gotcha] Different transform engine → potentially different `talairach.xfm`
> The GCA/EM registration in [[talairach_mgh]] and the MINC `mritotal`
> registration in [[talairach]] can yield meaningfully different transforms for
> the same subject. Mixing subjects processed with the two variants in a study
> that relies on the Talairach transform (e.g. talairach-space coordinates or
> QC against the transform) introduces a methodological inconsistency.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — subject under `$SUBJECTS_DIR` with `mri/orig`
  populated in COR- format.
- **`$SUBJECTS_DIR/scripts/brain.dat`** *(optional)* — watershed parameters,
  copied if present.
- **GCA atlas** — `talairach_mgh` uses
  `$FREESURFER_HOME/average/talairach_young_new_b.gca`; must be installed.

### Input Assumptions

> [!assumption] Old-style COR- subject tree; GCA atlas available
> Same as [[segment_subject]]: `mri/orig` holds a T1-weighted anatomical in COR-
> format. Additionally, the [[talairach_mgh]] step assumes the
> `talairach_young_new_b.gca` atlas (and `mri_em_register.old`) are present, and
> that the contrast/anatomy is compatible with that young-adult atlas.

## Outputs

Identical to [[segment_subject]]: `mri/transforms/talairach.xfm` (here from
[[talairach_mgh]]/GCA), `mri/T1`, `mri/brain`, `mri/wm`, `mri/filled`,
`surf/{lh,rh}.*`. [[talairach_mgh]] additionally creates `mri/fsamples`,
`mri/norm`, and `mri/transforms` working directories.

## Mathematical Foundations

None in the driver. The only step whose *math* differs from the canonical driver
is the Talairach registration:

> [!internal] GCA/EM linear registration
> [[talairach_mgh]] runs `mri_em_register.old` ([[mri_em_register]]), which fits
> a linear transform by expectation-maximisation against a Gaussian Classifier
> Array (GCA) atlas — as opposed to the intensity-correlation `mritotal` used by
> [[talairach]]. See [[mri_em_register]] for the EM registration model.

All other computation (normalisation, watershed, white-matter labelling, fill,
inflation) is identical to [[segment_subject]]; see its Mathematical Foundations
section.

## Configuration Options

No option flags. Single positional argument.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` (subject ID) | string | *(required)* | Subject directory under `$SUBJECTS_DIR`. Forwarded to `talairach_mgh`, `mri_watershed`, and `inflate_subject`. No `--help`/`--version`. |

### Configuration Interactions

None — no flags. The choice of Talairach engine is fixed by *which script* you
run (`segment_subject_talmgh` vs `segment_subject`), not by a flag.

## Typical Use Cases

### Use Case 1: Use GCA-based Talairach when `mritotal` mis-registers

```bash
setenv SUBJECTS_DIR /space/data/subjects
segment_subject_talmgh bert
# talairach_mgh (GCA/EM) → normalise → watershed strip → wm label → fill/inflate.
```

Use when the MINC `mritotal` linear fit of [[segment_subject]] is poor and an
atlas-driven transform is preferred.

## Pipeline Context

Standalone legacy driver; not invoked by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all`. Same workflow slot as [[segment_subject]], differing only in the
Talairach engine.

**Predecessor:** anatomical in `mri/orig` → **segment_subject_talmgh** →
**Successor:** cortical surfaces under `surf/` (via [[inflate_subject]]).

## Gotchas and Caveats

> [!gotcha] Commented-out subcortical labelling
> Like several variants, `#register_subject` / `#label_subject` lines are
> present but inert. For subcortical segmentation use [[segment_subject_sc]].

> [!gotcha] `mri_em_register.old`, not `mri_em_register`
> [[talairach_mgh]] explicitly invokes the **`.old`** build of
> [[mri_em_register]] ([`scripts/talairach_mgh:32-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talairach_mgh#L32-L34)).
> Behaviour follows that legacy binary, which may differ from the current
> `mri_em_register`.

## Error Compensation and Guard Rails

- Working directories created if missing.
- `brain.dat` copied only when present.
- Runs under `-ef`: a failing Talairach/skull-strip step aborts the script
  (no fallback to MINC `mritotal`).

## Related Tools

- [[segment_subject]] — the canonical driver; uses MINC-based [[talairach]] (the inverse of this variant).
- [[talairach_mgh]] — the GCA/EM Talairach wrapper this variant calls.
- [[talairach]] — the MINC `mritotal` Talairach wrapper used by the canonical driver.
- [[mri_em_register]] — the EM/GCA linear registration engine underneath `talairach_mgh` (here the `.old` build).
- [[mri_normalize]], [[mri_watershed]], [[mri_segment]], [[inflate_subject]] — the rest of the shared sequence.
- [[segment_subject_sc]] — the variant that turns on the commented-out subcortical labelling.

## Confidence and Gaps

**High confidence:** the substitution of [[talairach_mgh]] for [[talairach]], the
otherwise identical watershed-based sequence, the commented-out
`register_subject`/`label_subject` lines, and the `-ef` shebang — all read
directly from
[`scripts/segment_subject_talmgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh)
and cross-checked against [`scripts/talairach_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talairach_mgh).

## References

- FreeSurfer source: [`scripts/segment_subject_talmgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segment_subject_talmgh) (v8.2.0).
- Talairach engine: [`scripts/talairach_mgh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/talairach_mgh), [[talairach_mgh]], [[mri_em_register]].
- Base driver: [[segment_subject]].
