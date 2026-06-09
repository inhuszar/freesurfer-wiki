---
title: "map_all_labels-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/map_all_labels-lh"
families: []                     # single-hemisphere variant of map_all_labels
recon_all_stage: null
related:
  - "[[map_all_labels]]"
  - "[[mris_spherical_average]]"
  - "[[label-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - label
  - surface
  - registration
  - average
  - left-hemisphere
---

# map_all_labels-lh

## Summary

`map_all_labels-lh` is the **left-hemisphere-only** variant of
[[map_all_labels]]. It paints the same three average sulcal labels — superior
temporal sulcus, central sulcus, and calcarine sulcus — from the `average7`
template onto a subject's **left** hemisphere, by calling
[[mris_spherical_average]] once per label through the `lh.sphere.reg`
registration. It is identical to [[map_all_labels]] except that its hemisphere
loop contains only `lh` instead of `rh lh`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/map_all_labels-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/map_all_labels-lh`
- **FreeSurfer tool invoked:**
  [`mris_spherical_average`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L22).

## Purpose and Context

This is a thin hemisphere variant of [[map_all_labels]]. Where the canonical
script loops over both `rh` and `lh`, `map_all_labels-lh` restricts the loop to
`lh` only
([`scripts/map_all_labels-lh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L20)),
mapping the three fixed `avg_*_sulcus` labels onto the left hemisphere alone. Use
it when only the left hemisphere needs the labels. It is a hand-run helper and is
**not** called by [[wiki/pipelines/recon-all|recon-all]] or any other FreeSurfer
script.

For the full description of the label set, the
[[mris_spherical_average]] command construction, inputs/assumptions, outputs,
and gotchas, see the canonical page [[map_all_labels]] — everything there applies
unchanged except the hemisphere.

## Fixed Behaviour

`map_all_labels-lh` takes **one positional argument and no flags**:

| Argument | Position | Type | Description |
|----------|----------|------|-------------|
| subject ID | 1 (`$1`) | string | Subject to paint the left-hemisphere labels onto; also the output subject (`mris_spherical_average -o $1`). |

What it fixes, relative to [[map_all_labels]]:

- **Hemisphere:** `lh` only (the sole difference from the canonical script;
  [`scripts/map_all_labels-lh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L20)).
- **Labels (hard-coded):** `avg_superior_temporal_sulcus`,
  `avg_central_sulcus`, `avg_calcarine_sulcus`
  ([`scripts/map_all_labels-lh:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L21)).
- **Template subject / registration:** `average7` and `sphere.reg`
  ([`scripts/map_all_labels-lh:22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh#L22)).
- **Outputs:** `$SUBJECTS_DIR/$1/label/lh-avg_superior_temporal_sulcus`,
  `…/lh-avg_central_sulcus`, `…/lh-avg_calcarine_sulcus` (surface labels,
  [[label-format]]).

The constructed command is the same as in [[map_all_labels]]:

```
mris_spherical_average -o <subj> label lh-<labelname> lh sphere.reg average7 <subj>/label/lh-<labelname>
```

Like the canonical script it runs under `tcsh -ef`, so the first failing
[[mris_spherical_average]] call aborts the run.

## Typical Use Case

```bash
export SUBJECTS_DIR=/path/to/subjects
map_all_labels-lh bert
# writes bert/label/lh-avg_{superior_temporal,central,calcarine}_sulcus
```

## Pipeline Context

Stand-alone helper, not part of [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** a subject with a completed `lh.sphere.reg` (from recon-all
surface processing) → **map_all_labels-lh** → **Successor:** left-hemisphere
analyses using the three average sulcal labels.

## Related Tools

- [[map_all_labels]] — the canonical both-hemisphere script; the authoritative
  reference for all shared behaviour. This page documents only the `lh`-only
  difference.
- [[mris_spherical_average]] — the engine that performs each label transfer.
- [[label-format]] — the format of the labels written.

## Confidence and Gaps

**High confidence:** confirmed by direct `diff` against
[`scripts/map_all_labels`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels)
— the only functional difference is the hemisphere loop (`lh` vs `rh lh`). All
inputs, outputs, the fixed label set, and the `mris_spherical_average` command
are otherwise identical. See [[map_all_labels]] for the
`average7`-template-provenance gap, which applies here too.

## References

- FreeSurfer source: [`scripts/map_all_labels-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_all_labels-lh) (v8.2.0).
- Canonical sibling: [[map_all_labels]].
