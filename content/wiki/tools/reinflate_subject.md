---
title: "reinflate_subject"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/reinflate_subject"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[reinflate_subject-lh]]"
  - "[[reinflate_subject-rh]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[sphere_subject]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - inflation
  - smoothing
  - wrapper
---

# reinflate_subject

## Summary

`reinflate_subject` is a small wrapper that **re-smooths and re-inflates both
cortical hemispheres** of a subject. It sets the FreeSurfer diagnostic
environment variable `DIAG` to `0x04040` (turning on progress and heartbeat
output) and then, from inside the subject's `scripts/` directory, runs
[`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24) and
[`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L25). Each of those rebuilds `?h.orig` from
`mri/filled`, then produces `?h.smoothwm` (via [[mris_smooth]]) and `?h.inflated`
(via `mris_inflate -dist 0`). It is the "re-do the inflation" companion to the
inflation that [[wiki/pipelines/recon-all|recon-all]] performs.

> [!contradiction] It calls `inflate_subject-*`, not `reinflate_subject-*`
> Although [[reinflate_subject-lh]] and [[reinflate_subject-rh]] exist with
> matching names, this parent does **not** call them. Lines
> [`scripts/reinflate_subject:24-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24-L25) invoke
> `inflate_subject-lh` / `inflate_subject-rh`. The two families differ slightly
> (re-tessellation, the `mris_inflate -dist 0` flag, and the shebang error-mode);
> see [Gotchas](#gotchas-and-caveats) and the
> [[reinflate_subject-lh]] page. The behaviour described in this page is therefore
> the behaviour of `inflate_subject-lh`/`-rh`, since that is what actually runs.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/reinflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject)
- **Binary/script location:** `$FREESURFER_HOME/bin/reinflate_subject`
- **Scripts invoked:** [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24), [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L25) (each in turn runs `mri_tessellate`, [[mris_smooth]], and [[mris_inflate]])

## Purpose and Context

The inflated surfaces (`?h.inflated`) and the sulcal-depth/mean-curvature maps
that `mris_inflate` produces alongside them are prerequisites for spherical
mapping ([[sphere_subject]] / [[mris_sphere]]), surface registration, and
visualisation. After the white surface or the `filled` volume is edited, those
derived surfaces are stale. `reinflate_subject` rebuilds them for both
hemispheres in one call.

The single positional argument `$1` is the **subject ID** (under
`$SUBJECTS_DIR`), forwarded to both children.

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`mri/filled`** — the filled white-matter volume; `inflate_subject-lh`/`-rh`
  re-tessellate `?h.orig` from it (label 255 for the left, 127 for the right).
- (Effectively also **`?h.orig`** once re-tessellated) — see [[surface-format]].

### Input Assumptions

> [!assumption] A `filled` volume must exist
> Because the children call `mri_tessellate ../mri/filled …`, the script assumes
> `$SUBJECTS_DIR/$1/mri/filled` is present and correctly labelled (left = 255,
> right = 127). `$SUBJECTS_DIR` must be set; the parent `pushd`es into
> `$SUBJECTS_DIR/$1/scripts`, which must exist.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `lh.orig`, `rh.orig` | `$SUBJECTS_DIR/$1/surf/` | Re-tessellated original surfaces from `mri/filled` (via `mri_tessellate` inside the children) |
| `lh.smoothwm`, `rh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | Smoothed white surfaces (via [[mris_smooth]]) |
| `lh.inflated`, `rh.inflated` | `$SUBJECTS_DIR/$1/surf/` | Inflated surfaces (via `mris_inflate -dist 0`); also writes `?h.sulc`, `?h.inflated.H` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Each child appends a provenance block (command line, user, date, host) |

### Output Specifications

The `?h.smoothwm` and `?h.inflated` surfaces share the vertex/triangle structure
of the (re-tessellated) `?h.orig`; only coordinates differ. `mris_inflate` also
emits `?h.sulc` (sulcal depth) and `?h.inflated.H` (mean curvature of the
inflated surface), which downstream registration consumes.

## Mathematical Foundations

None in this wrapper — it only sets `DIAG` and orchestrates the children.

> [!internal] All numerics are in the binaries
> Tessellation (`mri_tessellate`), iterative smoothing ([[mris_smooth]]), and the
> metric-distortion inflation energy ([[mris_inflate]]) are implemented in the
> respective binaries. See those pages.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`, forwarded to `inflate_subject-lh`/`-rh`. |

Fixed body ([`scripts/reinflate_subject:21-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L21-L26)):

```bash
setenv DIAG 0x04040
pushd $SUBJECTS_DIR/$1/scripts
inflate_subject-lh $1
inflate_subject-rh $1
popd
```

`DIAG 0x04040` = `DIAG_SHOW (0x40)` | `DIAG_HEARTBEAT (0x4000)` (bit definitions
in [`include/diag.h:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/diag.h#L58) and
[`include/diag.h:66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/diag.h#L66)). It makes the inflation binaries emit
progress/heartbeat diagnostics; it does not change the geometry of the result.

### Configuration Interactions

None — there are no flags. The only environmental effect is `DIAG`, which is
exported to (and only meaningful for) the FreeSurfer binaries the children run.

## Typical Use Cases

### Rebuild both inflated surfaces after editing the filled volume

```bash
# Re-tessellate, smooth, and inflate both hemispheres.
reinflate_subject bert
```

This is the manual equivalent of re-running the recon-all tessellation +
inflation stages for a subject whose `mri/filled` was edited.

## Pipeline Context

`reinflate_subject` reproduces the tessellation + smoothing + inflation that
[[wiki/pipelines/recon-all|recon-all]] performs (recon-all runs `mris_smooth`
at [`scripts/recon-all:4020`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4020) and `mris_inflate` at
[`scripts/recon-all:4054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4054)). recon-all does **not** call
`reinflate_subject`; this wrapper is a standalone convenience.

**Predecessor:** edit of `mri/filled` (or white-surface generation) →
**reinflate_subject** (writes `?h.orig`, `?h.smoothwm`, `?h.inflated`) →
**Successor:** [[sphere_subject]] (writes `?h.sphere`).

## Gotchas and Caveats

> [!gotcha] The children re-tessellate `?h.orig` from `mri/filled`
> Because the parent runs `inflate_subject-lh`/`-rh`, the existing `?h.orig`
> surface is **overwritten** by a fresh `mri_tessellate ../mri/filled …` before
> smoothing. If you edited `?h.orig` directly (not `mri/filled`), those edits are
> lost. To start from an edited `?h.orig` instead, run [[reinflate_subject-lh]] /
> [[reinflate_subject-rh]] by hand — those skip the tessellation step.

> [!gotcha] Uses `mris_inflate -dist 0`
> The children pass `-dist 0` to [[mris_inflate]] (no inter-vertex distance
> term), which differs from recon-all's default `mris_inflate` and from
> [[reinflate_subject-lh]]/`-rh` (plain `mris_inflate`). The resulting inflated
> surface can differ slightly.

> [!gotcha] No argument or output checking at this level
> An empty `$1` makes the `pushd` fail; existing surfaces are overwritten without
> warning.

## Error Compensation and Guard Rails

The parent itself runs with `#!/bin/tcsh -f` (no abort-on-error) and does no
validation. The children `inflate_subject-lh`/`-rh` use `#!/bin/tcsh -ef`, so
**inside each child** a failed `mri_tessellate`/`mris_smooth`/`mris_inflate`
aborts that child — but the parent will still proceed to launch the second
hemisphere even if the first child failed. All numerical guard rails live in the
binaries.

## Related Tools

- [[reinflate_subject-lh]] / [[reinflate_subject-rh]] — same-named per-hemisphere helpers that this parent does **not** call (they skip re-tessellation and use plain `mris_inflate`).
- `inflate_subject-lh` / `inflate_subject-rh` *(no wiki page yet)* — the scripts the parent actually invokes; they re-tessellate from `mri/filled` and use `mris_inflate -dist 0`.
- [[mris_smooth]] — smooths the white surface into `?h.smoothwm`.
- [[mris_inflate]] — inflates `?h.smoothwm` into `?h.inflated`.
- [[sphere_subject]] — the next step, mapping the inflated surfaces to spheres.

## Confidence and Gaps

**High confidence:** The parent is four effective lines; the `DIAG` value, the
`inflate_subject-lh`/`-rh` calls, and the working directory are read directly
from [`scripts/reinflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject), and the children's behaviour
(re-tessellation, `-dist 0`, `-ef` shebang) from
[`scripts/inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh). No gaps.

## References

- FreeSurfer source: [`scripts/reinflate_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207 — describes the inflation procedure implemented by `mris_inflate`.
