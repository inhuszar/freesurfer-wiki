---
title: "morph_only_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/morph_only_subject-rh"
families: []                     # legacy recon-all morphometry helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[morph_only_subject]]"
  - "[[morph_only_subject-lh]]"
  - "[[morph_subject-rh]]"
  - "[[mris_register]]"
  - "[[mris_sphere]]"
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

# morph_only_subject-rh

## Summary

`morph_only_subject-rh` is the **right-hemisphere, registration-only** worker of
the legacy `morph_only_subject` pipeline. It is the right-side twin of
[[morph_only_subject-lh]]: it assumes `rh.sphere` already exists, **skips
`mris_sphere`**, and runs two [[mris_register]] calls to produce `rh.sphere.reg`
(curvature-driven) and `rh.sphere.dist_new` (distance-term variant). It is
identical to the lh twin apart from the hemisphere. **See
[[morph_only_subject-lh]] for the full documentation.**

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f` — does not abort on error)
- **Source file:** [`scripts/morph_only_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/morph_only_subject-rh`
- **FreeSurfer tools invoked:**
  [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh#L30-L31)
  (twice).

## Purpose and Context

Identical in role to [[morph_only_subject-lh]] but for the right hemisphere:
(re)build only the spherical atlas registration from an already-existing
`rh.sphere`, without re-running `mris_sphere` (which is commented out at
[`scripts/morph_only_subject-rh:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh#L29)).
It is a **legacy** helper, **not part of `recon-all`**, and is normally invoked
by the driver [[morph_only_subject]].

## Fixed Behaviour and Hemisphere-Specific Details

The script hard-codes the right hemisphere and runs:

| Step | Command | Output |
|------|---------|--------|
| Forward register | `mris_register -w 0 -curv ../surf/rh.sphere $FREESURFER_HOME/average/rh.average.tif ../surf/rh.sphere.reg` | `surf/rh.sphere.reg` |
| Distance variant | `mris_register -w 0 ../surf/rh.sphere $FREESURFER_HOME/average/rh.average.tif ../surf/rh.sphere.dist_new` | `surf/rh.sphere.dist_new` |

It takes a **single positional subject ID** and appends provenance to `NOTES`
([`scripts/morph_only_subject-rh:19-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh#L19-L26)).
It takes **no option flags**.

> [!gotcha] No validation; `-f` shell does not stop on error
> As in the lh twin, there is no argument/subject/input-surface check and the
> shebang is `#!/bin/tcsh -f`, so a failed first registration does not prevent the
> second from running. The two registrations differ only by `-curv` (present on
> the `.reg` output, absent on `.dist_new`). See [[morph_only_subject-lh]] for the
> full rationale.

## Typical Use Cases

```bash
# Normal path — driver runs both hemispheres:
morph_only_subject bert

# Re-register only the right hemisphere from an existing rh.sphere:
morph_only_subject-rh bert
```

## Pipeline Context

Leaf of the legacy `morph_only_subject` family; **not** in the `recon-all`
stream.

**Predecessor:** [[morph_only_subject]] (driver), with `rh.sphere` already built
→ **This tool** → **internally:** [[mris_register]] (×2).

## Related Tools

- [[morph_only_subject-lh]] — the left-hemisphere twin; **canonical
  documentation** for this script's behaviour.
- [[morph_only_subject]] — the driver that runs both hemispheres.
- [[morph_subject-rh]] — the heavier sibling that also runs `mris_sphere` and the
  central-sulcus mapping.
- [[mris_register]], [[mris_sphere]] — the underlying surface tools.

## Confidence and Gaps

**High confidence.** This page documents only the hemisphere delta against
[[morph_only_subject-lh]]; the scripts are identical apart from the hemisphere.
All details read directly from
[`scripts/morph_only_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh).

## References

- FreeSurfer source: [`scripts/morph_only_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/morph_only_subject-rh) (v8.2.0).
- Full behaviour and method references: see [[morph_only_subject-lh]].
