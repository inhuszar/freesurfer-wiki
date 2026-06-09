---
title: "morph_only_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_only_subject-lh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_only_subject]]"
  - "[[morph_only_subject-rh]]"
  - "[[morph_subject-lh]]"
  - "[[mris_register]]"
  - "[[mris_sphere]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The `lh.sphere.dist_new` product is a distance-term/alternate registration whose downstream consumer is not defined within this script; the chained morph_rgb/morph_tables `dist_new` variants are commented out."
tags:
  - surface
  - registration
  - morphometry
  - spherical
  - legacy
---

# morph_only_subject-lh

## Summary

`morph_only_subject-lh` is the **left-hemisphere, registration-only** worker of
the legacy `morph_only_subject` pipeline. It is the lighter sibling of
[[morph_subject-lh]]: it assumes the spherical surface already exists and
therefore **skips the expensive `mris_sphere` step**, running only the spherical
atlas registrations with [[mris_register]]. It produces two registered spheres —
the standard atlas registration (`lh.sphere.reg`) and a distance-term variant
(`lh.sphere.dist_new`) — and appends a provenance stamp to the subject `NOTES`
file. It is normally invoked by the driver [[morph_only_subject]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f` — note: **not** `-ef`; it
  does *not* abort on the first error)
- **Source file:** [`scripts/morph_only_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_only_subject-lh`
- **FreeSurfer tools invoked:**
  [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L31-L32)
  (twice).

## Purpose and Context

The "only" in the name means **registration only**: this script is the path you
use when the subject already has a `lh.sphere` (built earlier by
[[mris_sphere]] / [[morph_subject-lh]] / `recon-all`) and you want to (re)build
just the spherical atlas registration without re-inflating to a sphere. The
`mris_sphere` line is present but **commented out**
([`scripts/morph_only_subject-lh:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L30)),
which is the genuine difference from [[morph_subject-lh]].

It is part of a **legacy** helper family and is **not invoked by `recon-all`**
(no reference exists in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)).
It is reached through its driver [[morph_only_subject]].

## Inputs

### Required Inputs

- **Subject ID** — the single positional argument (`$1`), passed straight through
  to the working-directory `pushd` and to `mris_register`. **There is no
  argument-count or subject-directory existence check** in this script (unlike
  [[morph_subject-lh]]).
- **`surf/lh.sphere`** — the spherical surface; the *input* to both
  `mris_register` calls. It must already exist.
- **`surf/lh.sulc`** / curvature — `mris_register` runs with `-curv` on the first
  call, aligning folding patterns.
- **Atlas template** `$FREESURFER_HOME/average/lh.average.tif`.

### Input Assumptions

> [!assumption] A pre-built `lh.sphere` is mandatory; nothing is validated
> Because `mris_sphere` is skipped, the script assumes `surf/lh.sphere` already
> exists. With the `-f` (non-`-ef`) shell there is **no** check on the argument,
> the subject directory, or the input surface — a missing `lh.sphere` simply
> makes the first `mris_register` fail, and the script continues to the second
> call regardless.

## Outputs

### Files Created

In `$SUBJECTS_DIR/<subjid>/surf/`:

| File | Created by | Contents |
|------|-----------|----------|
| `lh.sphere.reg` | `mris_register -w 0 -curv …` ([`:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L31)) | the existing sphere registered to the left average atlas (`lh.average.tif`) |
| `lh.sphere.dist_new` | `mris_register -w 0 …` ([`:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L32)) | a second registration to the same atlas **without** `-curv` — a distance-term ("dist_new") variant of the registered sphere |

It also appends a provenance block (command line, user, date, host) to
`$SUBJECTS_DIR/<subjid>/NOTES`
([`scripts/morph_only_subject-lh:19-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L19-L26)).

### Output Specifications

Both outputs are FreeSurfer spherical surface files (see [[surface-format]]) with
the same topology as `lh.sphere`, carrying per-vertex spherical coordinates
aligned to the atlas. See [[mris_register]] for the registration model.

## Mathematical Foundations

> [!internal] All numerics are in `mris_register`
> This script performs no computation; it issues two [[mris_register]] calls. The
> only design choice visible here is that the first registration is
> curvature-driven (`-curv`) and the second omits `-curv` to produce the
> `dist_new` (distance-term) variant.

## Configuration Options

### Complete Flag Reference

`morph_only_subject-lh` takes **no option flags** — only a single positional
subject ID. The hemisphere is hard-coded to `lh`.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`. Not validated. |

Fixed sub-tool command lines: `mris_register -w 0 -curv … lh.sphere.reg` and
`mris_register -w 0 … lh.sphere.dist_new`.

### Configuration Interactions

None — no flags. The notable internal behaviour is the missing `-curv` on the
second registration:

> [!gotcha] The two registrations differ only by `-curv`
> Both `mris_register` calls use the same input (`lh.sphere`) and the same atlas
> (`lh.average.tif`); the first uses `-curv` (curvature-driven, → `lh.sphere.reg`)
> and the second does not (→ `lh.sphere.dist_new`)
> ([`scripts/morph_only_subject-lh:31-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L31-L32)).
> The `dist_new` output is an alternate, distance-weighted registration kept for
> comparison.

## Typical Use Cases

### Use Case 1: Re-register both hemispheres (normal path)

```bash
export SUBJECTS_DIR=/data/subjects
morph_only_subject bert     # runs morph_only_subject-lh then -rh
```

### Use Case 2: Re-register only the left hemisphere from an existing sphere

```bash
# lh.sphere already exists; just rebuild the atlas registration
morph_only_subject-lh bert
```

Use this instead of [[morph_subject-lh]] when you do **not** want to regenerate
`lh.sphere` (saving the costly `mris_sphere` step).

## Pipeline Context

Leaf of the legacy `morph_only_subject` family; **not** part of the `recon-all`
stream.

**Predecessor:** [[morph_only_subject]] (driver), with `lh.sphere` already built
by [[mris_sphere]] / [[morph_subject-lh]] → **This tool** →
**internally:** [[mris_register]] (×2).

## Gotchas and Caveats

> [!gotcha] No input validation — silently continues on failure
> Unlike [[morph_subject-lh]], this script does not check its argument, the
> subject directory, or `lh.sphere`, and uses `-f` (not `-ef`), so a failed first
> registration does **not** stop the second from running. Check the outputs
> exist after running.

> [!gotcha] "only" = skip the sphere build, not "left-hemisphere only"
> The name parses as *morph-only* + *subject* + *-lh*: the "only" refers to doing
> only the registration (the commented-out `mris_sphere` at
> [`scripts/morph_only_subject-lh:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh#L30)),
> not to processing only one hemisphere.

## Error Compensation and Guard Rails

Essentially none. There is no argument check, no subject-directory check, no
input-surface check, and the `-f` shell does not abort on error. The only
robustness feature is `pushd`/`popd` around the working directories.

## Related Tools

- [[morph_only_subject]] — the driver that runs this script and its rh twin.
- [[morph_only_subject-rh]] — the right-hemisphere twin (identical except hemi).
- [[morph_subject-lh]] — the heavier sibling that **also** runs `mris_sphere`
  first and does the central-sulcus mapping.
- [[mris_register]] — performs both spherical atlas registrations.
- [[mris_sphere]] — builds the `lh.sphere` this script assumes already exists.

## Confidence and Gaps

**High confidence:** the two `mris_register` command lines, the commented-out
`mris_sphere`, the absence of validation, and the `-f` (non-aborting) shell — all
read directly from
[`scripts/morph_only_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh).

> [!gap] `dist_new` consumer
> What downstream step (if any) consumes `lh.sphere.dist_new` is not defined in
> this script. The `morph_rgb`/`morph_tables` family contains commented-out
> `dist_new` branches, suggesting it was an experimental/alternate registration.

## References

- FreeSurfer source: [`scripts/morph_only_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-lh) (v8.2.0).
- Driver: [`scripts/morph_only_subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject).
- Surface registration method: see [[mris_register]] and [[morph_subject-lh]].
