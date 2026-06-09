---
title: "fix_subject-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject-lh"
families: []                     # left-hemisphere worker of the fix_subject driver
recon_all_stage: null
related:
  - "[[fix_subject]]"
  - "[[fix_subject-rh]]"
  - "[[fix_subject_corrected-lh]]"
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
  - left-hemisphere
---

# fix_subject-lh

## Summary

`fix_subject-lh` is the **left-hemisphere** worker of the legacy [[fix_subject]]
topology-fix driver. Given a subject ID it runs, for the left hemisphere only,
the fixed four-command sequence: build a quasi-homeomorphic sphere with
[[mris_sphere]], correct the surface topology with [[mris_fix_topology]], then
re-smooth ([[mris_smooth]]) and re-inflate ([[mris_inflate]]) the result. It is
the mirror of [[fix_subject-rh]] and is normally launched by [[fix_subject]]
rather than run directly.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -ef`)
- **Source file:** [`scripts/fix_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject-lh`
- **Tools invoked:** [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]].

## Purpose and Context

This is the per-hemisphere unit of work behind [[fix_subject]]. Separating left
and right into their own scripts lets the parent driver run them serially (or, in
the cluster variant `fix_subject_on_seychelles`, submit them in parallel via
`pbsubmit`). The script hard-codes the `lh.*` surface names and the standard
topology-fix recipe; the only thing that varies between invocations is the subject
ID.

## Fixed Behaviour (what this wrapper sets)

The script `cd`s into `$SUBJECTS_DIR/$1/scripts`
([`scripts/fix_subject-lh:20`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L20))
and runs these four commands with paths relative to that directory:

| Step | Command (left hemisphere) | Effect |
|------|---------------------------|--------|
| 1 | `mris_sphere -w 0 -inflate -in 200 -q ../surf/lh.inflated ../surf/lh.qsphere` ([L27](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L27)) | quick (`-q`) quasi-homeomorphic sphere from the inflated surface; `-w 0` disables snapshot writing, `-inflate -in 200` adds 200 inflation iterations |
| 2 | `mris_fix_topology $1 lh` ([L28](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L28)) | corrects topology; with default output name it **overwrites** `surf/lh.orig` |
| 3 | `mris_smooth ../surf/lh.orig ../surf/lh.smoothwm` ([L29](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L29)) | smooths the corrected surface → `lh.smoothwm` |
| 4 | `mris_inflate ../surf/lh.smoothwm ../surf/lh.inflated` ([L30](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L30)) | re-inflates → `lh.inflated` |

Commented-out lines ([L22-25](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh#L22-L25))
show an older recipe (`mri_tessellate ../mri/filled 255 ../surf/lh.orig`, etc.);
note the left hemisphere historically used fill value **255**.

> [!assumption] Requires `surf/lh.inflated` to already exist
> Step 1 reads `../surf/lh.inflated`, so the left white-matter surface must
> already have been tessellated, smoothed, and inflated before this worker runs.

## Inputs

- **`$1` — subject ID** (positional, required). No other arguments are parsed.
- `$SUBJECTS_DIR` set; `surf/lh.inflated` (and the inputs `mris_fix_topology`
  needs, e.g. `surf/lh.orig`, `surf/lh.qsphere`) present.

## Outputs

| File | Written by | Contents |
|------|------------|----------|
| `surf/lh.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere for defect detection |
| `surf/lh.orig` | [[mris_fix_topology]] | topology-corrected white-matter surface (overwrites input) |
| `surf/lh.smoothwm` | [[mris_smooth]] | smoothed corrected surface |
| `surf/lh.inflated` | [[mris_inflate]] | re-inflated surface |

## Mathematical Foundations

None here — the topology-correction and inflation mathematics live in
[[mris_fix_topology]], [[mris_sphere]], and [[mris_inflate]].

## Configuration Options

No options are parsed; the surface names and all `mris_*` flags are hard-coded.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; also passed to `mris_fix_topology`. |

## Pipeline Context

Called by [[fix_subject]] (and by the cluster variant
`fix_subject_on_seychelles`). Not a [[wiki/pipelines/recon-all|recon-all]] stage.

**Predecessor:** [[fix_subject]] → **This tool** → **Successor:** spherical
registration / surface placement consuming the corrected `lh.orig`.

## Gotchas and Caveats

> [!gotcha] Overwrites `lh.orig`
> [[mris_fix_topology]] is called without `-suffix`, so the corrected surface
> replaces `surf/lh.orig` in place. The `_corrected` sibling
> [[fix_subject_corrected-lh]] preserves the original instead.

> [!gotcha] Fail-fast worker
> `#!/bin/tcsh -ef` — any failing step aborts the script (and, because
> [[fix_subject]] is also `-ef`, the whole driver).

## Related Tools

- [[fix_subject]] — parent driver that runs this plus [[fix_subject-rh]].
- [[fix_subject-rh]] — the right-hemisphere mirror (identical recipe, `rh.*`).
- [[fix_subject_corrected-lh]] — the `_corrected` variant (preserves originals, adds curvature + white/pial generation).
- [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]] — the tools run.

## Confidence and Gaps

**High confidence:** the exact command sequence and hard-coded `lh.*` names are
read directly from [`scripts/fix_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh).
No open gaps.

## References

- FreeSurfer source: [`scripts/fix_subject-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject-lh) (v8.2.0).
- Registered in [`scripts/CMakeLists.txt:57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L57).
