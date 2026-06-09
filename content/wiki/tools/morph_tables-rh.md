---
title: "morph_tables-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_tables-rh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri-structvits]]"
  - "[[morph_tables-lh]]"
  - "[[morph_subject-rh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The downstream consumer of the svit output is undefined within this script (same as the lh twin)."
tags:
  - surface
  - morphometry
  - structure-vectors
  - svit
  - legacy
---

# morph_tables-rh

## Summary

`morph_tables-rh` builds the **right-hemisphere structure-vector ("svit") tables**
for a subject by running [[mri-structvits]] on `rh.sphere.reg`, writing into the
subject's `svit/` directory. It is the right-hemisphere twin of
[[morph_tables-lh]], differing only in the hemisphere and in two minor shell
details (see below). **See [[morph_tables-lh]] for the complete documentation.**

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/morph_tables-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_tables-rh`
- **FreeSurfer tools invoked:**
  [`mri-structvits`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L39-L40).

## Purpose and Context

Identical in role to [[morph_tables-lh]] but for the right hemisphere: generate
the legacy "svit" structure-vector morphometry tables from the registered sphere.
It is **not part of `recon-all`** and is normally run after [[morph_subject-rh]].
See [[morph_tables-lh]] § *Purpose and Context*.

## Fixed Behaviour and Hemisphere-Specific Details

The script hard-codes the right hemisphere
([`scripts/morph_tables-rh:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L30)),
creates `svit/` if absent, and runs the fixed command
([`scripts/morph_tables-rh:39-40`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L39-L40)):

```bash
mri-structvits -subject <subj> -umask 0 \
  -hemi rh -outdir <subj>/svit -can sphere.reg | tee -a <svit>/rh.sphere.reg.svit.log
```

It takes a **single positional subject ID**, appends provenance to `NOTES`
([`:20-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L20-L27)),
and exposes **no option flags**. Output: svit tables and
`rh.sphere.reg.svit.log` in `$SUBJECTS_DIR/<subjid>/svit/`.

Two minor differences from [[morph_tables-lh]]:

> [!gotcha] `-rh` runs `mri-structvits` from `scripts/` with a balanced stack
> `morph_tables-rh` `pushd`es into `$SUBJECTS_DIR/$1/scripts`
> ([`scripts/morph_tables-rh:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L32))
> before the `mri-structvits` call and pops it with the final `popd`
> ([`:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L42)),
> so its directory stack is correctly balanced (the initial NOTES `pushd`/`popd`
> at [`:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L20)/[`:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh#L27)
> is a separate matched pair). This is **cleaner** than the lh twin, which has an
> extra unmatched trailing `popd`. Because all `mri-structvits` paths are
> absolute/`$SUBJECTS_DIR`-based, running from `scripts/` vs. the subject root
> makes no functional difference. The lh twin's commented-out
> `mris_register … dist_new` line is also absent here.

## Typical Use Cases

```bash
export SUBJECTS_DIR=/data/subjects
morph_subject-rh bert       # produces rh.sphere.reg
morph_tables-rh bert        # writes svit tables into $SUBJECTS_DIR/bert/svit/
```

## Pipeline Context

Leaf of the legacy `morph_tables` family; **not** in the `recon-all` stream.

**Predecessor:** [[morph_subject-rh]] (produces `rh.sphere.reg`) → **This tool** →
**internally:** [[mri-structvits]] → `svit/` tables.

## Related Tools

- [[morph_tables-lh]] — the left-hemisphere twin; **canonical documentation**.
- [[mri-structvits]] — the structure-vector builder this script wraps.
- [[morph_subject-rh]] — produces the `rh.sphere.reg` this script samples.

## Confidence and Gaps

**High confidence.** This page documents only the hemisphere delta (and the two
minor shell differences) against [[morph_tables-lh]]. All details read directly
from
[`scripts/morph_tables-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh).

> [!gap] svit consumer unknown
> As with the lh twin, no script in the `morph_*` family consumes the `svit/`
> output; its downstream use is unconfirmed.

## References

- FreeSurfer source: [`scripts/morph_tables-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_tables-rh) (v8.2.0).
- Full behaviour and the structure-vector format: see [[morph_tables-lh]] and [[mri-structvits]].
