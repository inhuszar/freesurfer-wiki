---
title: "fix_subject_corrected-rh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject_corrected-rh"
families: []                     # right-hemisphere worker of fix_subject_corrected
recon_all_stage: null
related:
  - "[[fix_subject_corrected]]"
  - "[[fix_subject_corrected-lh]]"
  - "[[fix_subject-rh]]"
  - "[[mris_sphere]]"
  - "[[mris_fix_topology]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_curvature]]"
  - "[[mris_make_surfaces]]"
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

# fix_subject_corrected-rh

## Summary

`fix_subject_corrected-rh` is the **right-hemisphere** worker of the legacy
[[fix_subject_corrected]] driver. For the right hemisphere it writes a provenance
note, then runs the full "corrected" reconstruction recipe: quasi-homeomorphic
sphere ([[mris_sphere]]), topology correction with `-suffix _corrected`
([[mris_fix_topology]]) — which **preserves** `rh.orig` and writes
`rh.orig_corrected` — followed by smoothing ([[mris_smooth]]), inflation
([[mris_inflate]]), mean-curvature computation ([[mris_curvature]]), and white/pial
surface generation with `-suffix _corrected` ([[mris_make_surfaces]]). It mirrors
[[fix_subject_corrected-lh]] (with `rh.*` names) and is normally launched by
[[fix_subject_corrected]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/fix_subject_corrected-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject_corrected-rh`
- **Tools invoked:** [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], [[mris_make_surfaces]].

## Purpose and Context

The per-hemisphere unit behind [[fix_subject_corrected]], for the right
hemisphere. Like its left-hemisphere mirror it sets `DIAG 0x04048`, appends a
`NOTES` provenance record, writes a `_corrected` surface family (so the originals
are preserved), and continues through curvature and white/pial surface
generation — going further than the plain [[fix_subject-rh]] worker.

## Fixed Behaviour (what this wrapper sets)

- **Diagnostics:** `setenv DIAG 0x04048`
  ([`scripts/fix_subject_corrected-rh:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L21)).
- **Provenance:** `pushd $SUBJECTS_DIR/$1/` and append a blank line, the
  invocation, `whoami`, `date`, and `hostname` to `NOTES`
  ([L23-30](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L23-L30)).
- Then `pushd`es into `$SUBJECTS_DIR/$1/scripts` and runs:

| Step | Command (right hemisphere) | Effect |
|------|----------------------------|--------|
| 1 | `mris_sphere -inflate -w 0 -q ../surf/rh.inflated ../surf/rh.qsphere` ([L35](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L35)) | quasi-homeomorphic sphere |
| 2 | `mris_fix_topology -suffix _corrected $1 rh` ([L36](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L36)) | topology correction → writes `rh.orig_corrected`; **`rh.orig` preserved** |
| 3 | `mris_smooth ../surf/rh.orig_corrected ../surf/rh.smoothwm_corrected` ([L37](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L37)) | smooths corrected surface |
| 4 | `mris_inflate ../surf/rh.smoothwm_corrected ../surf/rh.inflated_corrected` ([L38](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L38)) | inflates corrected surface |
| 5 | `mris_curvature -a 10 -w ../surf/rh.smoothwm` ([L39](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L39)) → `cp ../surf/rh.smoothwm.H ../surf/rh.curv` ([L40](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L40)) | mean curvature of the *uncorrected* smoothwm → `rh.curv` |
| 6 | `mris_curvature -a 10 -w ../surf/rh.smoothwm_corrected` ([L41](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L41)) → `cp ../surf/rh.smoothwm_corrected.H ../surf/rh.curv_corrected` ([L42](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L42)) | mean curvature of the *corrected* smoothwm → `rh.curv_corrected` |
| 7 | `mris_make_surfaces -w 0 -suffix _corrected $1 rh` ([L43](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh#L43)) | builds white/pial from `rh.orig_corrected` → `rh.white_corrected`, `rh.pial_corrected`, … |

Note: unlike the left-hemisphere worker, the `mris_curvature` inputs here use the
correct `../surf/rh.smoothwm[_corrected]` paths (see the gotcha on
[[fix_subject_corrected-lh]]).

> [!assumption] Needs inflated surface + make_surfaces inputs
> Step 1 reads `../surf/rh.inflated`; step 7 ([[mris_make_surfaces]]) needs the
> right-hemisphere intensity/segmentation volumes (`mri/brain`, `mri/wm`, …).

## Inputs

- **`$1` — subject ID** (positional, required). No other arguments parsed.
- `$SUBJECTS_DIR` set; `surf/rh.inflated` and the volumes [[mris_make_surfaces]]
  reads present.

## Outputs

| File | Written by | Contents |
|------|------------|----------|
| `NOTES` (subject root) | this script | provenance: command, user, host, date |
| `surf/rh.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere |
| `surf/rh.orig_corrected` | [[mris_fix_topology]] `-suffix _corrected` | topology-corrected surface (`rh.orig` kept) |
| `surf/rh.smoothwm_corrected` | [[mris_smooth]] | smoothed corrected surface |
| `surf/rh.inflated_corrected` | [[mris_inflate]] | inflated corrected surface |
| `surf/rh.smoothwm.H`, `surf/rh.curv` | [[mris_curvature]] + `cp` | mean curvature of uncorrected smoothwm |
| `surf/rh.smoothwm_corrected.H`, `surf/rh.curv_corrected` | [[mris_curvature]] + `cp` | mean curvature of corrected smoothwm |
| `surf/rh.white_corrected`, `surf/rh.pial_corrected`, … | [[mris_make_surfaces]] `-suffix _corrected` | white/pial surfaces |

## Mathematical Foundations

None here. Topology correction is in [[mris_fix_topology]]; mean ($H$) / Gaussian
($K$) curvature is in [[mris_curvature]] (`-a 10` = 10 averaging passes, `-w`
writes the maps); deformable white/pial placement is in [[mris_make_surfaces]].

## Configuration Options

No options are parsed; everything except the subject ID is hard-coded.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; passed to `mris_fix_topology` and `mris_make_surfaces`. |

## Pipeline Context

Called by [[fix_subject_corrected]]. Not a
[[wiki/pipelines/recon-all|recon-all]] stage.

**Predecessor:** [[fix_subject_corrected]] → **This tool** → **Successor:**
analysis/inspection of the `rh.*_corrected` surface family.

## Gotchas and Caveats

> [!gotcha] Preserves originals, builds a full corrected surface set
> `-suffix _corrected` is passed to both [[mris_fix_topology]] and
> [[mris_make_surfaces]], so this worker writes `rh.orig_corrected`,
> `rh.white_corrected`, etc. alongside the canonical surfaces rather than
> overwriting them — the defining difference from [[fix_subject-rh]].

> [!gotcha] Not fail-fast
> `#!/bin/tcsh -f` (no `-e`): a failing step does **not** abort the script, so
> later steps keep running.

## Error Compensation and Guard Rails

- `touch NOTES` before appending guarantees the provenance file exists.
- No input validation; `DIAG 0x04048` only changes diagnostic verbosity.

## Related Tools

- [[fix_subject_corrected]] — parent driver that runs [[fix_subject_corrected-lh]] then this.
- [[fix_subject_corrected-lh]] — left-hemisphere mirror (whose `mris_curvature` input path is anomalous — see its gotcha).
- [[fix_subject-rh]] — the plain variant (overwrites `rh.orig`, stops after inflation).
- [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], [[mris_make_surfaces]] — the tools run.

## Confidence and Gaps

**High confidence:** the exact command sequence, the `_corrected` suffixing, and
the `DIAG`/`NOTES` setup are read directly from
[`scripts/fix_subject_corrected-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh).
No open gaps.

## References

- FreeSurfer source: [`scripts/fix_subject_corrected-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-rh) (v8.2.0).
- Registered in [`scripts/CMakeLists.txt:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L61).
