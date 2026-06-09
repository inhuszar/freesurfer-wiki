---
title: "reinflate_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/reinflate_subject-rh"
families: []                     # recon-all helper wrapper (no mri_*/mris_* family)
recon_all_stage: autorecon2
related:
  - "[[reinflate_subject]]"
  - "[[reinflate_subject-lh]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[sphere_subject-rh]]"
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
  - right-hemisphere
---

# reinflate_subject-rh

## Summary

`reinflate_subject-rh` is a thin right-hemisphere wrapper that **re-smooths and
re-inflates** the right white-matter surface. It writes a provenance note to the
subject's `NOTES` file, then runs [[mris_smooth]] to turn `surf/rh.orig` into
`surf/rh.smoothwm`, and [[mris_inflate]] to turn `surf/rh.smoothwm` into
`surf/rh.inflated`. It is the right-hemisphere mirror of [[reinflate_subject-lh]],
typically used to rebuild the inflated surface after `rh.orig` has been edited.

> [!contradiction] Not invoked by `reinflate_subject`
> Despite the matching name, the [[reinflate_subject]] parent does **not** call
> `reinflate_subject-rh`; it calls [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L25)
> instead (see [`scripts/reinflate_subject:24-25`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject#L24-L25)). `reinflate_subject-rh`
> is shipped and runnable, but no other script in the tree references it. Treat
> it as a standalone manual helper; see [Gotchas](#gotchas-and-caveats) for how
> it differs from `inflate_subject-rh`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/reinflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/reinflate_subject-rh`
- **Tools invoked:** [`mris_smooth`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh#L31), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh#L32)

## Purpose and Context

`rh.inflated` (and the intermediate `rh.smoothwm`) is required by the spherical
mapping ([[sphere_subject-rh]] / [[mris_sphere]]) and by visualisation. After a
manual edit to the right white surface those derived surfaces are stale;
`reinflate_subject-rh` regenerates them, reproducing the right-hemisphere part of
the recon-all smoothing+inflation logic.

The single positional argument `$1` is the **subject ID** (under
`$SUBJECTS_DIR`).

## Inputs

### Required Inputs

- **Subject ID** (`$1`) — a subject directory under `$SUBJECTS_DIR`.
- **`surf/rh.orig`** — the (possibly edited) original right white-matter surface
  (see [[surface-format]]); the input to [[mris_smooth]].

### Input Assumptions

> [!assumption] An `rh.orig` surface must exist with corrected topology
> The script assumes `$SUBJECTS_DIR/$1/surf/rh.orig` is present and
> topologically valid. The inflated output is only meaningful for a clean
> two-manifold. `$SUBJECTS_DIR` must be set and the subject's `scripts/`
> directory must exist.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `rh.smoothwm` | `$SUBJECTS_DIR/$1/surf/` | Lightly smoothed right white surface (output of [[mris_smooth]]) |
| `rh.inflated` | `$SUBJECTS_DIR/$1/surf/` | Inflated right surface (output of [[mris_inflate]]); also writes the companion `rh.sulc` and `rh.inflated.H` |
| `NOTES` | `$SUBJECTS_DIR/$1/` | Appends a provenance block (command line, user, date, host), [`scripts/reinflate_subject-rh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh#L21-L28) |

### Output Specifications

`rh.smoothwm` and `rh.inflated` are binary FreeSurfer surface files with the same
vertex/triangle structure as `rh.orig`; only coordinates differ.
[[mris_inflate]] additionally writes `rh.sulc` (sulcal depth) and `rh.inflated.H`
(mean curvature of the inflated surface) as a side effect; these feed surface
registration ([[surfreg]], JOSA).

## Mathematical Foundations

None in this wrapper — all numerics are in the invoked binaries.

> [!internal] Smoothing and inflation energies live in the binaries
> [[mris_smooth]] iteratively averages vertex positions; [[mris_inflate]]
> minimises a metric-distortion energy to flatten folds while preserving
> areas/distances. See those pages for details.

## Configuration Options

### Complete Flag Reference

This wrapper takes **one positional argument and no option flags**. Both
sub-commands are hard-coded with **no extra flags**:

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `$1` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |

Fixed commands ([`scripts/reinflate_subject-rh:31-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh#L31-L32)):

```bash
mris_smooth  ../surf/rh.orig     ../surf/rh.smoothwm
mris_inflate ../surf/rh.smoothwm ../surf/rh.inflated
```

### Configuration Interactions

None — there are no flags to combine.

## Typical Use Cases

### Rebuild the right inflated surface after editing `rh.orig`

```bash
reinflate_subject-rh bert
```

Most users call the [[reinflate_subject]] parent (note that the parent actually
invokes `inflate_subject-rh`).

## Pipeline Context

This script reproduces the right-hemisphere smoothing + inflation that
[[wiki/pipelines/recon-all|recon-all]] performs — recon-all runs
`mris_smooth -n 3 -nw` ([`scripts/recon-all:4020`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4020)) followed by
`mris_inflate` ([`scripts/recon-all:4054`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4054)) on the white surface.
recon-all does **not** call `reinflate_subject-rh`.

**Predecessor:** white-surface generation / manual edit of `rh.orig` →
**reinflate_subject-rh** (writes `rh.smoothwm`, `rh.inflated`) → **Successor:**
[[sphere_subject-rh]] (writes `rh.sphere`).

## Gotchas and Caveats

> [!gotcha] Differs from `inflate_subject-rh` (which is what the parent runs)
> Three differences from [`inflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/inflate_subject-rh):
> (1) `inflate_subject-rh` first runs `mri_tessellate ../mri/filled 127
> ../surf/rh.orig` to (re)create `rh.orig` from the filled volume, whereas this
> script assumes `rh.orig` already exists;
> (2) `inflate_subject-rh` calls `mris_inflate -dist 0` (no distance term),
> while this script calls plain `mris_inflate` (default distance weighting);
> (3) `inflate_subject-rh` uses `#!/bin/tcsh -ef` (abort on error), this script
> uses `#!/bin/tcsh -f` (do not abort).

> [!gotcha] No overwrite guard
> Existing `rh.smoothwm`/`rh.inflated` are overwritten without warning, and an
> empty `$1` makes the `pushd` fail. No argument validation is performed.

## Error Compensation and Guard Rails

None in the wrapper. With `#!/bin/tcsh -f` (no `-e`), a failure of
[[mris_smooth]] does **not** stop the script from attempting [[mris_inflate]].
All real guard rails belong to the binaries.

## Related Tools

- [[reinflate_subject]] — the nominal parent (but it actually calls `inflate_subject-rh`).
- [[reinflate_subject-lh]] — the left-hemisphere counterpart.
- [[mris_smooth]] — produces `rh.smoothwm` from `rh.orig`.
- [[mris_inflate]] — produces `rh.inflated` (and `rh.sulc`, `rh.inflated.H`) from `rh.smoothwm`.
- [[sphere_subject-rh]] — the next step, which maps `rh.inflated` to a sphere.
- `inflate_subject-rh` *(no wiki page yet)* — the closely related script the parent actually invokes; it re-tessellates from `mri/filled` and uses `mris_inflate -dist 0`.

## Confidence and Gaps

**High confidence:** The script is eight effective lines; the fixed
`mris_smooth`/`mris_inflate` invocations, the absence of extra flags, the
`NOTES` write, and the differences from `inflate_subject-rh` are all read
directly from the sources. No gaps.

## References

- FreeSurfer source: [`scripts/reinflate_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reinflate_subject-rh) (v8.2.0).
- Fischl, Sereno & Dale (1999), *Cortical surface-based analysis II: inflation, flattening, and a surface-based coordinate system*, NeuroImage 9(2):195–207.
