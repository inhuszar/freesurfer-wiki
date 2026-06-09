---
title: "fix_subject-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject-rh"
families: []                     # right-hemisphere worker of the fix_subject driver
recon_all_stage: null
related:
  - "[[fix_subject]]"
  - "[[fix_subject-lh]]"
  - "[[fix_subject_corrected-rh]]"
  - "[[mris_sphere]]"
  - "[[mris_fix_topology]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - surface
  - topology
  - legacy
  - right-hemisphere
---

# fix_subject-rh

## Summary

`fix_subject-rh` is the **right-hemisphere** worker of the legacy [[fix_subject]]
topology-fix driver. It is identical to [[fix_subject-lh]] except that every
surface name is `rh.*`. For the right hemisphere it builds a quasi-homeomorphic
sphere with [[mris_sphere]], corrects topology with [[mris_fix_topology]], and
re-smooths ([[mris_smooth]]) and re-inflates ([[mris_inflate]]) the result. It is
normally launched by [[fix_subject]], not run directly.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/fix_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject-rh`
- **Tools invoked:** [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]].

## Purpose and Context

The per-hemisphere unit of work behind [[fix_subject]], for the right hemisphere.
Splitting the two hemispheres into separate scripts lets the parent driver run
them serially (or submit them in parallel in the `fix_subject_on_seychelles`
cluster variant). The `rh.*` names and the topology-fix recipe are hard-coded;
only the subject ID varies.

## Fixed Behaviour (what this wrapper sets)

The script `cd`s into `$SUBJECTS_DIR/$1/scripts`
([`scripts/fix_subject-rh:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L21))
and runs these four commands with paths relative to that directory:

| Step | Command (right hemisphere) | Effect |
|------|----------------------------|--------|
| 1 | `mris_sphere -w 0 -inflate -in 200 -q ../surf/rh.inflated ../surf/rh.qsphere` ([L28](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L28)) | quick (`-q`) quasi-homeomorphic sphere; `-w 0` no snapshots, `-inflate -in 200` extra inflation iterations |
| 2 | `mris_fix_topology $1 rh` ([L29](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L29)) | corrects topology; with default output name **overwrites** `surf/rh.orig` |
| 3 | `mris_smooth ../surf/rh.orig ../surf/rh.smoothwm` ([L30](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L30)) | smooths the corrected surface → `rh.smoothwm` |
| 4 | `mris_inflate ../surf/rh.smoothwm ../surf/rh.inflated` ([L31](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L31)) | re-inflates → `rh.inflated` |

Commented-out lines ([L23-26](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh#L23-L26))
show the older recipe (`mri_tessellate ../mri/filled 127 ../surf/rh.orig`, …);
the right hemisphere historically used fill value **127** (vs. **255** for the
left in [[fix_subject-lh]]).

> [!assumption] Requires `surf/rh.inflated` to already exist
> Step 1 reads `../surf/rh.inflated`, so the right white-matter surface must
> already have been tessellated, smoothed, and inflated.

## Inputs

- **`$1` — subject ID** (positional, required). No other arguments parsed.
- `$SUBJECTS_DIR` set; `surf/rh.inflated` (and `mris_fix_topology` inputs such as
  `surf/rh.orig`, `surf/rh.qsphere`) present.

## Outputs

| File | Written by | Contents |
|------|------------|----------|
| `surf/rh.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere |
| `surf/rh.orig` | [[mris_fix_topology]] | topology-corrected white-matter surface (overwrites input) |
| `surf/rh.smoothwm` | [[mris_smooth]] | smoothed corrected surface |
| `surf/rh.inflated` | [[mris_inflate]] | re-inflated surface |

## Mathematical Foundations

None here — see [[mris_fix_topology]], [[mris_sphere]], and [[mris_inflate]].

## Configuration Options

No options are parsed; surface names and all `mris_*` flags are hard-coded.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; also passed to `mris_fix_topology`. |

## Pipeline Context

Called by [[fix_subject]] (and the cluster variant
`fix_subject_on_seychelles`). Not a [[wiki/pipelines/recon-all|recon-all]] stage.

**Predecessor:** [[fix_subject]] → **This tool** → **Successor:** spherical
registration / surface placement consuming the corrected `rh.orig`.

## Gotchas and Caveats

> [!gotcha] Overwrites `rh.orig`
> [[mris_fix_topology]] is called without `-suffix`, so the corrected surface
> replaces `surf/rh.orig`. The `_corrected` sibling [[fix_subject_corrected-rh]]
> preserves the original.

> [!gotcha] Fail-fast worker
> `#!/bin/tcsh -ef` — any failing step aborts the script and the parent driver.

## Related Tools

- [[fix_subject]] — parent driver that runs [[fix_subject-lh]] then this.
- [[fix_subject-lh]] — the left-hemisphere mirror (identical recipe, `lh.*`).
- [[fix_subject_corrected-rh]] — the `_corrected` variant (preserves originals, adds curvature + white/pial generation).
- [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]] — the tools run.

## Confidence and Gaps

**High confidence:** the exact command sequence and hard-coded `rh.*` names are
read directly from [`scripts/fix_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh).
No open gaps.

## References

- FreeSurfer source: [`scripts/fix_subject-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-rh) (v8.2.0).
- Registered in [`scripts/CMakeLists.txt:58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L58).
