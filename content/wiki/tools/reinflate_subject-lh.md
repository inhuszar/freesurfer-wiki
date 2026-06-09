---
title: "reinflate_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/reinflate_subject-lh"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[reinflate_subject]]"
  - "[[reinflate_subject-rh]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[sphere_subject-lh]]"
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
  - left-hemisphere
---

# reinflate_subject-lh

## Summary

`reinflate_subject-lh` is a thin left-hemisphere wrapper that **re-smooths and
re-inflates** the left white-matter surface. It writes a provenance note to the
subject's `NOTES` file, then runs [[mris_smooth]] to turn `surf/lh.orig` into
`surf/lh.smoothwm`, and [[mris_inflate]] to turn `surf/lh.smoothwm` into
`surf/lh.inflated`. It is the "re-do the inflation" companion to the inflation
performed during [[wiki/pipelines/recon-all|recon-all]], typically used after the
`lh.orig` surface has been edited and the downstream surfaces need to be rebuilt.

> [!contradiction] Not invoked by `reinflate_subject`
> Despite the matching name, the [[reinflate_subject]] parent does **not** call
> `reinflate_subject-lh`; it calls [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24)
> instead (see [`scripts/reinflate_subject:24-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24-L25)). `reinflate_subject-lh`
> is shipped and runnable, but no other script in the tree references it
> (confirmed by `grep -rln reinflate_subject scripts/`). Treat it as a
> standalone manual helper. The functional difference from `inflate_subject-lh`
> is small but real — see [Gotchas](#gotchas-and-caveats).

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/reinflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/reinflate_subject-lh`
- **Tools invoked:** [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh#L31), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh#L32)

## Purpose and Context

`lh.inflated` (and the intermediate `lh.smoothwm`) is needed by the spherical
mapping ([[sphere_subject-lh]] / [[mris_sphere]]) and by surface visualisation.
After a manual edit to the white surface, those derived surfaces are stale.
`reinflate_subject-lh` regenerates them for the left hemisphere in one step,
reproducing the left-hemisphere part of the recon-all smoothing+inflation logic.

The single positional argument `$1` is the **subject ID** (under
`$SUBJECTS_DIR`).

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`surf/lh.orig`** — the (possibly edited) original left white-matter surface;
  see [[surface-format]]. This is the input to [[mris_smooth]].

### Input Assumptions

> [!assumption] An `lh.orig` surface must exist with corrected topology
> The script assumes `$SUBJECTS_DIR/$1/surf/lh.orig` is present.
> [[mris_smooth]] and [[mris_inflate]] expect a topologically valid surface; the
> inflated output is only meaningful for a clean two-manifold. `$SUBJECTS_DIR`
> must be set and the subject's `scripts/` directory must exist.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `lh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | Lightly smoothed left white surface (output of [[mris_smooth]]) |
| `lh.inflated` | `$SUBJECTS_DIR/$1/surf/` | Inflated left surface (output of [[mris_inflate]]); also writes the companion `lh.sulc` and `lh.inflated.H` that `mris_inflate` produces |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Appends a provenance block (command line, user, date, host), [`scripts/reinflate_subject-lh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh#L21-L28) |

### Output Specifications

`lh.smoothwm` and `lh.inflated` are binary FreeSurfer surface files with the same
vertex/triangle structure as `lh.orig`; only coordinates differ.
[[mris_inflate]] additionally writes the per-vertex sulcal-depth map `lh.sulc`
and mean-curvature-of-inflated `lh.inflated.H` as a side effect (these are
consumed by surface registration, including [[surfreg]] and JOSA).

## Mathematical Foundations

None in this wrapper — all numerics are in the invoked binaries.

> [!internal] Smoothing and inflation energies live in the binaries
> [[mris_smooth]] applies iterative averaging of vertex positions; [[mris_inflate]]
> minimises a metric-distortion energy that flattens folds while preserving
> areas/distances. See those pages for details.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**. Both
sub-commands are hard-coded with **no extra flags** (so [[mris_smooth]] and
[[mris_inflate]] run with their own defaults):

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |

Fixed commands ([`scripts/reinflate_subject-lh:31-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh#L31-L32)):

```bash
mris_smooth  ../surf/lh.orig     ../surf/lh.smoothwm
mris_inflate ../surf/lh.smoothwm ../surf/lh.inflated
```

### Configuration Interactions

None — there are no flags to combine.

## Typical Use Cases

### Rebuild the left inflated surface after editing `lh.orig`

```bash
# Regenerate lh.smoothwm and lh.inflated for the left hemisphere only.
reinflate_subject-lh bert
```

Most users call the [[reinflate_subject]] parent (note the caveat above that the
parent actually invokes `inflate_subject-lh`).

## Pipeline Context

This script reproduces the left-hemisphere smoothing + inflation that
[[wiki/pipelines/recon-all|recon-all]] performs in its inflation stages — recon-all
runs `mris_smooth -n 3 -nw` ([`scripts/recon-all:4020`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4020)) followed by
`mris_inflate` ([`scripts/recon-all:4054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4054)) on the white surface.
recon-all does **not** call `reinflate_subject-lh`.

**Predecessor:** white-surface generation / manual edit of `lh.orig` →
**reinflate_subject-lh** (writes `lh.smoothwm`, `lh.inflated`) → **Successor:**
[[sphere_subject-lh]] (writes `lh.sphere`).

## Gotchas and Caveats

> [!gotcha] Differs from `inflate_subject-lh` (which is what the parent runs)
> Three differences from [`inflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-lh):
> (1) `inflate_subject-lh` first runs `mri_tessellate ../mri/filled 255
> ../surf/lh.orig` to (re)create `lh.orig` from the filled volume, whereas this
> script assumes `lh.orig` already exists and starts from smoothing;
> (2) `inflate_subject-lh` calls `mris_inflate -dist 0` (no distance term),
> while this script calls plain `mris_inflate` (default distance weighting);
> (3) `inflate_subject-lh` uses `#!/bin/tcsh -ef` (abort on error), this script
> uses `#!/bin/tcsh -f` (do not abort). Choose the script that matches your
> intent.

> [!gotcha] No overwrite guard
> Existing `lh.smoothwm`/`lh.inflated` are overwritten without warning, and an
> empty `$1` makes the `pushd` fail. No argument validation is performed.

## Error Compensation and Guard Rails

None in the wrapper. With `#!/bin/tcsh -f` (no `-e`), a failure of
[[mris_smooth]] does **not** stop the script from attempting [[mris_inflate]] on
a possibly-missing/garbage `lh.smoothwm`. All real guard rails belong to the
binaries.

## Related Tools

- [[reinflate_subject]] — the nominal parent (but it actually calls `inflate_subject-lh`).
- [[reinflate_subject-rh]] — the right-hemisphere counterpart.
- [[mris_smooth]] — produces `lh.smoothwm` from `lh.orig`.
- [[mris_inflate]] — produces `lh.inflated` (and `lh.sulc`, `lh.inflated.H`) from `lh.smoothwm`.
- [[sphere_subject-lh]] — the next step, which maps `lh.inflated` to a sphere.
- `inflate_subject-lh` *(no wiki page yet)* — the closely related script the parent actually invokes; it re-tessellates from `mri/filled` and uses `mris_inflate -dist 0`.

## Confidence and Gaps

**High confidence:** The script is eight effective lines; the fixed
`mris_smooth`/`mris_inflate` invocations, the absence of extra flags, the
`NOTES` write, and the differences from `inflate_subject-lh` are all read
directly from the sources. No gaps.

## References

- FreeSurfer source: [`scripts/reinflate_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-lh) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207 — describes the inflation procedure implemented by `mris_inflate`.
