---
title: "map_central_sulcus"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/map_central_sulcus"
families: []                     # single-purpose label-mapping wrapper around recon-all
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[map_all_labels]]"
  - "[[mris_spherical_average]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether a v8.2.0-compatible replacement flag exists in recon-all for the central-sulcus label mapping that `-avglabels` used to trigger is unknown; the original mris_spherical_average call is present only as a commented-out reference."
tags:
  - label
  - surface
  - central-sulcus
  - registration
  - broken
---

# map_central_sulcus

## Summary

`map_central_sulcus` is a two-line tcsh wrapper that is **meant** to map the
central sulcus label onto a single hemisphere of a subject by invoking
`recon-all -s <subj> -hemi <hemi> -avglabels`. In FreeSurfer 8.2.0, however, the
`-avglabels` flag **no longer exists** in [[wiki/pipelines/recon-all|recon-all]],
so the wrapper fails immediately with `ERROR: Flag -avglabels unrecognized.`
(verified by running it). The script therefore documents a thin
forwarder whose target flag has been removed; the original direct
[[mris_spherical_average]] call it superseded survives only as a comment.

> [!contradiction] `-avglabels` is gone from recon-all in v8.2.0 — this wrapper is broken as written
> The script's active line is
> `recon-all -s $1 -hemi $2 -avglabels`
> ([`scripts/map_central_sulcus:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L26)),
> but the v8.2.0 recon-all argument parser has **no** `-avglabels` case (its only
> `avg*` flags are `-avgcurv`, `-avgcurvtif`, and `-avgcurvtifpath`). Running
> `map_central_sulcus <subj> <hemi>` reaches recon-all's `default:` branch and
> exits with `ERROR: Flag -avglabels unrecognized.` Code is authoritative: in
> v8.2.0 this wrapper does not perform its named function. (The commented-out
> [[mris_spherical_average]] call at
> [`scripts/map_central_sulcus:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L23-L24)
> shows the operation it was originally meant to drive.)

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/map_central_sulcus`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus)
- **Binary/script location:** `$FREESURFER_HOME/bin/map_central_sulcus`
- **Author/Origin:** MGH (General Hospital Corporation), 2021 license header.
- **Tool invoked:**
  [`recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L26)
  with `-avglabels` (the now-removed flag).

## Purpose and Context

The intended job is narrow: map the **central sulcus** label onto one hemisphere
of a subject — a single-label, single-hemisphere counterpart to the three-label,
both-hemisphere [[map_all_labels]]. It is invoked by the surface-morphing helper
[`morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L80)
(and its `-rh` twin) as the final step after spherical registration:
`map_central_sulcus $1 $hemi`. Because the underlying `-avglabels` recon-all flag
has since been removed, that step would now error if those legacy morph scripts
were run on v8.2.0.

Historically the mapping was done by a direct [[mris_spherical_average]] call
(preserved as a comment,
[`scripts/map_central_sulcus:23-24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L23-L24));
this was later replaced by delegating to `recon-all -avglabels` so the
canonical label-averaging logic lived in one place — but the recon-all side of
that contract is no longer present in v8.2.0.

## Fixed Behaviour

`map_central_sulcus` takes **two positional arguments and no flags**
([`scripts/map_central_sulcus:6-7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L6-L7)):

| Argument | Position | Type | Description |
|----------|----------|------|-------------|
| subject name | 1 (`$1`) | string | Subject whose central sulcus label is to be mapped. |
| hemisphere | 2 (`$2`) | `lh` \| `rh` | Hemisphere to process. |

It then runs exactly:

```
recon-all -s <subject> -hemi <hemi> -avglabels
```

and propagates recon-all's exit status (`exit $status`,
[`scripts/map_central_sulcus:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus#L29)).
There is no argument validation, no help/version handling, and no output written
by the wrapper itself — any output (and, in v8.2.0, the failure) comes from
recon-all.

## Typical Use Case

> [!gotcha] The documented invocation does not work on v8.2.0
> The call below is what the wrapper and `morph_subject-*` expect, but it
> currently fails because recon-all rejects `-avglabels`. It is shown for
> historical/interface completeness only.

```bash
# Intended use (FAILS on v8.2.0: 'Flag -avglabels unrecognized')
map_central_sulcus bert lh
```

To actually map the central sulcus label on v8.2.0, drive
[[mris_spherical_average]] directly (mirroring the commented-out line in the
script and the pattern used by [[map_all_labels]]), or use [[map_all_labels]] /
[[map_all_labels-lh]] which map `avg_central_sulcus` among their three labels via
`mris_spherical_average` and do **not** depend on the removed recon-all flag.

## Pipeline Context

`map_central_sulcus` is **not** a stage of normal
[[wiki/pipelines/recon-all|recon-all]] processing; rather it *calls* recon-all
with a (removed) special flag. Its only in-tree caller is the legacy surface
morphing helper:

**Predecessor:**
[`morph_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L80)/`morph_subject-rh`
(spherical registration via `mris_sphere`/`mris_register`) → **map_central_sulcus**
→ (intended) central-sulcus label in the subject's `label/` directory.

## Known Bugs

- [[00170]] — the active command runs `recon-all -s $1 -hemi $2 -avglabels`, but `-avglabels` was removed from recon-all in v8.2.0, so the tool fails with `ERROR: Flag -avglabels unrecognized.`

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the tool this wrapper forwards to; in
  v8.2.0 it no longer accepts the `-avglabels` flag the wrapper passes.
- [[map_all_labels]] / [[map_all_labels-lh]] — map `avg_central_sulcus` (plus two
  other sulci) via [[mris_spherical_average]]; a working alternative that does not
  rely on the removed flag.
- [[mris_spherical_average]] — the engine behind the original (commented-out)
  central-sulcus mapping; the recommended direct route on v8.2.0.
- [[label-format]] — the format of the label the operation produces.

## Confidence and Gaps

**High confidence:** the two positional arguments, the single
`recon-all -s … -hemi … -avglabels` call, the `exit $status` forwarding, the
commented-out [[mris_spherical_average]] original, the in-tree caller
(`morph_subject-*`), and — verified by execution — that v8.2.0 recon-all rejects
`-avglabels` with `Flag -avglabels unrecognized`. The recon-all parser confirms
no `-avglabels` case exists (only `-avgcurv*`).

> [!gap] No drop-in recon-all replacement identified
> It is unclear whether a different v8.2.0 recon-all flag now performs the
> central-sulcus label averaging that `-avglabels` once triggered. Pending that,
> the practical substitute is a direct [[mris_spherical_average]] call (as in
> [[map_all_labels]]).

## References

- FreeSurfer source: [`scripts/map_central_sulcus`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_central_sulcus) (v8.2.0).
- Caller: [`scripts/morph_subject-lh:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-lh#L80).
- Runtime evidence: invoking `map_central_sulcus <subj> <hemi>` yields
  `ERROR: Flag -avglabels unrecognized.` from
  [[wiki/pipelines/recon-all|recon-all]] (v8.2.0).
