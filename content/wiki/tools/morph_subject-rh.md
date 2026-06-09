---
title: "morph_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_subject-rh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_subject]]"
  - "[[morph_subject-lh]]"
  - "[[morph_only_subject-rh]]"
  - "[[mris_sphere]]"
  - "[[mris_register]]"
  - "[[map_central_sulcus]]"
  - "[[morph_rgb-rh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - registration
  - morphometry
  - spherical
  - legacy
---

# morph_subject-rh

## Summary

`morph_subject-rh` is the **right-hemisphere worker** of the legacy
`morph_subject` morphometry pipeline. It is **byte-for-byte identical** to
[[morph_subject-lh]] except that the hemisphere is fixed to `rh`
([`scripts/morph_subject-rh:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L24)).
It runs the full per-hemisphere surface-morphing sequence for one subject's right
hemisphere — inflate-to-sphere (`mris_sphere`), spherical registration to the
right-hemisphere average template, a second registration against the
right-hemisphere template (the reverse step, see gotcha), and a central-sulcus
label mapping. It is invoked once per hemisphere by the driver [[morph_subject]].
**See [[morph_subject-lh]] for the complete documentation** — only the
hemisphere-specific differences are repeated here.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/morph_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_subject-rh`
- **FreeSurfer tools invoked:**
  [`mris_sphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L59),
  [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L62-L65)
  (twice), and
  [`map_central_sulcus`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L80).
- **Original author** (per the header):
  [Bruce Fischl](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L7).

## Purpose and Context

Identical in role to [[morph_subject-lh]] but for the right hemisphere: it
registers an already-reconstructed right-hemisphere surface into the FreeSurfer
spherical atlas so per-vertex morphometry can be compared across subjects. It is
a **legacy** helper, **not part of `recon-all`**, and is reached through the
driver [[morph_subject]] (and the cluster wrapper `morph_subject_on_seychelles`).
See [[morph_subject-lh]] § *Purpose and Context* for full background.

## Fixed Behaviour and Hemisphere-Specific Details

The script sets `set hemi = rh`
([`scripts/morph_subject-rh:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L24))
and otherwise executes the same fixed steps:

| Step | Command | Output |
|------|---------|--------|
| Sphere | `mris_sphere -w 0 ../surf/rh.inflated ../surf/rh.sphere` | `surf/rh.sphere` |
| Forward register | `mris_register -w 0 -curv ../surf/rh.sphere $FREESURFER_HOME/average/rh.average.tif ../surf/rh.sphere.reg` | `surf/rh.sphere.reg` |
| Reverse register | `mris_register -w 0 -curv -reverse ../surf/rh.sphere $FREESURFER_HOME/average/rh.average.tif ../surf/rh.rh.sphere.reg` | `surf/rh.rh.sphere.reg` |
| Central sulcus | `map_central_sulcus <subj> rh` | atlas central-sulcus label (see [[map_central_sulcus]]) |

It takes a **single positional subject ID** (required, validated at
[`scripts/morph_subject-rh:26-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L26-L30)),
checks the subject directory exists
([`:32-36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L32-L36)),
appends provenance to `NOTES`
([`:40-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L40-L47)),
and takes **no option flags**.

> [!gotcha] On the right hemisphere the "reverse" step registers `rh → rh`
> The reverse-registration line is hard-coded to `rh.average.tif` in **both**
> hemisphere scripts ([`scripts/morph_subject-rh:68-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L68-L71)).
> In the lh script this produces a meaningful left→right symmetry mapping
> (`lh.rh.sphere.reg`); here, because the source hemisphere is already `rh`, it
> registers the right sphere to the right atlas again — yielding
> `rh.rh.sphere.reg`, a `-reverse` re-registration to the same template. This is
> a consequence of the two scripts being literal copies. See [[morph_subject-lh]]
> for the full rationale.

> [!gotcha] `mris_sphere` re-runs unconditionally; post-`exit 0` block is dead
> As in the lh twin, the skip-if-exists guard is commented out
> ([`:52-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L52-L54))
> and the `mri-structvits` block after
> [`exit 0`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh#L87)
> never executes. Use [[morph_only_subject-rh]] to skip the sphere step, and
> [[morph_tables-rh]] for the structure-vector tables.

## Typical Use Cases

```bash
# Normal path — the driver runs both hemispheres:
morph_subject bert

# Re-build only the right hemisphere's sphere + registration:
morph_subject-rh bert
```

## Pipeline Context

Leaf of the legacy `morph_subject` family; **not** in the `recon-all` stream.

**Predecessor:** [[morph_subject]] (driver) → **This tool** →
**internally:** [[mris_sphere]] → [[mris_register]] (×2) →
[[map_central_sulcus]].

## Related Tools

- [[morph_subject-lh]] — the left-hemisphere twin; **canonical documentation for
  this script's behaviour**.
- [[morph_subject]] — the driver that runs both hemispheres.
- [[morph_only_subject-rh]] — lighter variant that skips `mris_sphere`.
- [[mris_sphere]], [[mris_register]], [[map_central_sulcus]] — the sub-tools.
- [[morph_rgb-rh]] — optional RGB rendering of the registered surface.

## Confidence and Gaps

**High confidence.** This page documents only the hemisphere delta against
[[morph_subject-lh]]; the two scripts are identical apart from `set hemi`. All
details read directly from
[`scripts/morph_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh).

## References

- FreeSurfer source: [`scripts/morph_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_subject-rh) (v8.2.0).
- Full method and algorithm references: see [[morph_subject-lh]].
