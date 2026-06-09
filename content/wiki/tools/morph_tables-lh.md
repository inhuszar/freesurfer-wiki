---
title: "morph_tables-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_tables-lh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-structvits]]"
  - "[[morph_tables-rh]]"
  - "[[morph_subject-lh]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The downstream consumer of the svit (structure-vector) output is not defined within this script; `mri-structvits` itself documents the format. Whether any current FreeSurfer tool reads `svit/` is unconfirmed."
tags:
  - surface
  - morphometry
  - structure-vectors
  - svit
  - legacy
---

# morph_tables-lh

## Summary

`morph_tables-lh` builds the **left-hemisphere structure-vector ("svit") tables**
for a subject by running [[mri-structvits]] on the registered spherical surface.
It is the table-building member of the legacy `morph_*` family: where
[[morph_subject-lh]] produces the spherical *registration* and [[morph_rgb-lh]]
produces *images*, this script produces the per-vertex **morphometry sampling
tables** (structure vectors) that resample the surface onto a canonical
icosahedron at the `sphere.reg` registration. Output goes to the subject's
`svit/` directory.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/morph_tables-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_tables-lh`
- **FreeSurfer tools invoked:**
  [`mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L39-L40)
  (the structure-vector builder).

## Purpose and Context

The `morph_tables` scripts generate the **"svit" (structure vector)** tables — a
resampling of the registered cortical surface onto a fixed-resolution
icosahedron, used for cross-subject morphometry. This is a **legacy** path: the
modern equivalent is the surface resampling / `?h.sphere.reg`-based common-space
sampling that `recon-all` and tools like `mris_preproc`/`mri_surf2surf` perform.
`morph_tables-lh` simply assembles and runs a [[mri-structvits]] command. It is
**not invoked by `recon-all`** (no reference in
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all)).
This script is also the live equivalent of the **dead** `mri-structvits` block
that sits after `exit 0` in [[morph_subject-lh]].

## Inputs

### Required Inputs

- **Subject ID** — single positional argument (`$1`), passed through to the
  `pushd` and to `mri-structvits -subject`. **No argument-count or
  subject-directory check** is performed.
- **`surf/lh.sphere.reg`** — the canonical (registered) surface that
  [[mri-structvits]] samples from; passed as `-can sphere.reg`.
- The other surfaces [[mri-structvits]] needs by default (`orig`, `sphere`) under
  the subject's `surf/` directory.

### Input Assumptions

> [!assumption] Requires a completed spherical registration; nothing is validated
> The script assumes [[morph_subject-lh]] (or `recon-all`) has already produced
> `lh.sphere.reg` and the supporting surfaces. It does **not** check the argument,
> the subject directory, or the input surfaces; with the `-f` shell, a missing
> input surfaces only when [[mri-structvits]] runs.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| structure-vector ("svit") tables | `$SUBJECTS_DIR/<subjid>/svit/` | per-vertex morphometry sampling tables for the left hemisphere, produced by [[mri-structvits]] from `lh.sphere.reg`; resampled onto the default icosahedron (size 10242, distance 2 mm — `mri-structvits` defaults) |
| `lh.sphere.reg.svit.log` | `$SUBJECTS_DIR/<subjid>/svit/` | the `tee`-captured log of the `mri-structvits` run ([`scripts/morph_tables-lh:38-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L38-L40)) |

The `svit/` directory is created if absent
([`scripts/morph_tables-lh:33-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L33-L36)),
and a provenance block is appended to `$SUBJECTS_DIR/<subjid>/NOTES`
([`scripts/morph_tables-lh:21-28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L21-L28)).
The precise on-disk layout of the svit tables is owned by [[mri-structvits]].

## Mathematical Foundations

> [!internal] The resampling math is in `mri-structvits`
> `morph_tables-lh` performs no computation; it only assembles a
> [[mri-structvits]] command line. The structure-vector construction — sampling
> the registered surface onto a canonical icosahedron at a fixed geodesic
> distance — is implemented in [[mri-structvits]] (default `icosize 10242`,
> `dist 2` mm).

## Configuration Options

### Complete Flag Reference

`morph_tables-lh` takes **no option flags** — only a single positional subject ID.
The hemisphere is hard-coded to `lh`, and the `mri-structvits` options are fixed.

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `subjid` | string (positional, required) | — | FreeSurfer subject ID under `$SUBJECTS_DIR`. Not validated. |

The fixed [[mri-structvits]] invocation
([`scripts/morph_tables-lh:39-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L39-L40))
is:

```bash
mri-structvits -subject <subj> -umask 0 \
  -hemi lh -outdir <subj>/svit -can sphere.reg | tee -a <svit>/lh.sphere.reg.svit.log
```

- `-umask 0` — create outputs world-writable.
- `-hemi lh` — left hemisphere.
- `-outdir …/svit` — output directory.
- `-can sphere.reg` — use `lh.sphere.reg` as the canonical surface.

A `mris_register … dist_new` alternative line is present but **commented out**
([`scripts/morph_tables-lh:41`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L41)).

### Configuration Interactions

None — no flags. The internal coupling is the hard-coded `-can sphere.reg`: the
tables are always built against the standard registration, never the `dist_new`
variant.

## Typical Use Cases

### Use Case 1: Build the left-hemisphere svit tables after morphing

```bash
export SUBJECTS_DIR=/data/subjects
morph_subject-lh bert       # produces lh.sphere.reg
morph_tables-lh bert        # writes svit tables into $SUBJECTS_DIR/bert/svit/
```

## Pipeline Context

Leaf of the legacy `morph_tables` family; **not** part of the `recon-all` stream.

**Predecessor:** [[morph_subject-lh]] (produces `lh.sphere.reg`) → **This tool** →
**internally:** [[mri-structvits]] → `svit/` tables.

## Gotchas and Caveats

> [!gotcha] A stray trailing `popd` over-pops the directory stack
> The `pushd $SUBJECTS_DIR/$1/`
> ([`scripts/morph_tables-lh:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L21))
> is already balanced by the `popd` at
> [`:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L28)
> (after the NOTES block). The script then runs `mri-structvits` from the subject
> root (it never `pushd`es into `scripts/`, unlike the rh twin) and ends with a
> **second, unmatched** `popd`
> ([`:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L43)).
> That extra `popd` pops the stack one level too far — past the caller's working
> directory — and prints a "Directory stack empty"/extra-pop diagnostic. It is
> harmless because the script exits immediately and all `mri-structvits` paths are
> absolute or `$SUBJECTS_DIR`-based. The rh twin ([[morph_tables-rh]]) does not
> have this stray `popd`.

> [!gotcha] Legacy / possibly orphaned output
> The `svit` structure-vector format is a legacy morphometry product; no current
> `recon-all` stage reads it, and its downstream consumer is unclear (see Gaps).

## Error Compensation and Guard Rails

- **`mkdir` of `svit/` if absent**
  ([`scripts/morph_tables-lh:33-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh#L33-L36)).
- **Logs everything** via `tee -a` to `lh.sphere.reg.svit.log`.
- No argument check, no subject-directory check, no input-surface check, and the
  `-f` shell does not abort on a failed `mri-structvits`.

## Related Tools

- [[mri-structvits]] — the structure-vector builder this script wraps; owns the
  svit table format and the resampling math.
- [[morph_tables-rh]] — the right-hemisphere twin (identical except hemi, with a
  minor `pushd scripts/` difference).
- [[morph_subject-lh]] — produces the `lh.sphere.reg` this script samples; its
  dead post-`exit 0` block is the same `mri-structvits` call.
- [[mris_register]] — produced the registration that defines the sampling.

## Confidence and Gaps

**High confidence:** the fixed `mri-structvits` command line, the `-can
sphere.reg` choice, the `svit/` output and log, and the absence of validation —
all read directly from
[`scripts/morph_tables-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh).
The svit table byte-layout and the icosahedron defaults are owned by
[[mri-structvits]].

> [!gap] svit consumer unknown
> Nothing in this script (or the `morph_*` family) consumes the `svit/` output. It
> appears to be a legacy morphometry product; whether any current FreeSurfer tool
> still reads it is unconfirmed.

## References

- FreeSurfer source: [`scripts/morph_tables-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-lh) (v8.2.0).
- Structure-vector builder: [[mri-structvits]] ([`scripts/mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mri-structvits)).
