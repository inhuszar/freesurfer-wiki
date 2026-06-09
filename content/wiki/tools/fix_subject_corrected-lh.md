---
title: "fix_subject_corrected-lh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject_corrected-lh"
families: []                     # left-hemisphere worker of fix_subject_corrected
recon_all_stage: null
related:
  - "[[fix_subject_corrected]]"
  - "[[fix_subject_corrected-rh]]"
  - "[[fix_subject-lh]]"
  - "[[mris_sphere]]"
  - "[[mris_fix_topology]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[mris_curvature]]"
  - "[[mris_make_surfaces]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The two mris_curvature calls reference ../subjects/lh.smoothwm[_corrected] (a 'subjects' directory under scripts/), which does not match the ../surf/ paths used everywhere else and differs from the right-hemisphere worker; this looks like a path bug."
tags:
  - surface
  - topology
  - legacy
  - left-hemisphere
---

# fix_subject_corrected-lh

## Summary

`fix_subject_corrected-lh` is the **left-hemisphere** worker of the legacy
[[fix_subject_corrected]] driver. For the left hemisphere it writes a provenance
note, then runs the full "corrected" reconstruction recipe: quasi-homeomorphic
sphere ([[mris_sphere]]), topology correction with `-suffix _corrected`
([[mris_fix_topology]]) — which **preserves** the original `lh.orig` and writes
`lh.orig_corrected` — followed by smoothing ([[mris_smooth]]), inflation
([[mris_inflate]]), mean-curvature computation ([[mris_curvature]]), and finally
white/pial surface generation with `-suffix _corrected` ([[mris_make_surfaces]]).
It is the heavier counterpart of [[fix_subject-lh]] and is normally launched by
[[fix_subject_corrected]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/fix_subject_corrected-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject_corrected-lh`
- **Tools invoked:** [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], [[mris_make_surfaces]].

## Purpose and Context

This is the per-hemisphere unit behind [[fix_subject_corrected]], for the left
hemisphere. Compared with the plain [[fix_subject-lh]] worker it differs in three
ways: (1) it sets the diagnostic flag `DIAG 0x04048` and appends a `NOTES`
provenance record; (2) it runs [[mris_fix_topology]] and
[[mris_make_surfaces]] with `-suffix _corrected`, producing a parallel surface
family rather than overwriting the originals; and (3) it goes further down the
stream, computing curvature and building white/pial surfaces.

## Fixed Behaviour (what this wrapper sets)

- **Diagnostics:** `setenv DIAG 0x04048`
  ([`scripts/fix_subject_corrected-lh:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L21))
  — a `Gdiag`/`DiagShowImage` bitmask that turns on extra diagnostic output in the
  `mris_*` binaries.
- **Provenance:** appends a blank line, the invocation, `whoami`, `hostname`, and
  `date` to `$SUBJECTS_DIR/$1/NOTES`
  ([L24-29](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L24-L29)).
- Then `pushd`es into `$SUBJECTS_DIR/$1/scripts` and runs:

| Step | Command (left hemisphere) | Effect |
|------|---------------------------|--------|
| 1 | `mris_sphere -inflate -w 0 -q ../surf/lh.inflated ../surf/lh.qsphere` ([L32](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L32)) | quasi-homeomorphic sphere (no fixed `-in 200` here, unlike [[fix_subject-lh]]) |
| 2 | `mris_fix_topology -suffix _corrected $1 lh` ([L33](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L33)) | topology correction → writes `lh.orig_corrected`; **`lh.orig` is preserved** |
| 3 | `mris_smooth ../surf/lh.orig_corrected ../surf/lh.smoothwm_corrected` ([L34](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L34)) | smooths corrected surface |
| 4 | `mris_inflate ../surf/lh.smoothwm_corrected ../surf/lh.inflated_corrected` ([L35](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L35)) | inflates corrected surface |
| 5 | `mris_curvature -w -a 10 ../subjects/lh.smoothwm` ([L36](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L36)) → `cp ../surf/lh.smoothwm.H ../surf/lh.curv` ([L37](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L37)) | mean curvature of the *uncorrected* smoothwm, saved as `lh.curv` |
| 6 | `mris_curvature -w -a 10 ../subjects/lh.smoothwm_corrected` ([L38](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L38)) → `cp ../surf/lh.smoothwm_corrected.H ../surf/lh.curv_corrected` ([L39](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L39)) | mean curvature of the *corrected* smoothwm → `lh.curv_corrected` |
| 7 | `mris_make_surfaces -w 0 -suffix _corrected $1 lh` ([L40](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L40)) | builds white/pial surfaces from `lh.orig_corrected` → `lh.white_corrected`, `lh.pial_corrected`, … |

> [!assumption] Needs inflated surface + make_surfaces inputs
> Step 1 reads `../surf/lh.inflated`; step 7 ([[mris_make_surfaces]]) additionally
> needs the intensity/segmentation volumes (`mri/brain`, `mri/wm`, etc.) for the
> left hemisphere. These must exist beforehand.

## Inputs

- **`$1` — subject ID** (positional, required). No other arguments parsed.
- `$SUBJECTS_DIR` set; `surf/lh.inflated` and the volumes [[mris_make_surfaces]]
  reads present.

## Outputs

| File | Written by | Contents |
|------|------------|----------|
| `NOTES` (subject root) | this script | provenance: command, user, host, date |
| `surf/lh.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere |
| `surf/lh.orig_corrected` | [[mris_fix_topology]] `-suffix _corrected` | topology-corrected surface (original `lh.orig` kept) |
| `surf/lh.smoothwm_corrected` | [[mris_smooth]] | smoothed corrected surface |
| `surf/lh.inflated_corrected` | [[mris_inflate]] | inflated corrected surface |
| `surf/lh.smoothwm.H`, `surf/lh.curv` | [[mris_curvature]] + `cp` | mean curvature of uncorrected smoothwm |
| `surf/lh.smoothwm_corrected.H`, `surf/lh.curv_corrected` | [[mris_curvature]] + `cp` | mean curvature of corrected smoothwm |
| `surf/lh.white_corrected`, `surf/lh.pial_corrected`, … | [[mris_make_surfaces]] `-suffix _corrected` | white/pial surfaces |

## Mathematical Foundations

None here. Topology correction is in [[mris_fix_topology]]; the mean ($H$) /
Gaussian ($K$) curvature computation is in [[mris_curvature]] (`-a 10` = 10
iterative averaging passes; `-w` writes the `.H`/`.K` files); the deformable
white/pial surface placement is in [[mris_make_surfaces]].

## Configuration Options

No options are parsed; everything except the subject ID is hard-coded.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; passed to `mris_fix_topology` and `mris_make_surfaces`. |

## Pipeline Context

Called by [[fix_subject_corrected]]. Not a
[[wiki/pipelines/recon-all|recon-all]] stage.

**Predecessor:** [[fix_subject_corrected]] → **This tool** → **Successor:**
analysis/inspection of the `lh.*_corrected` surface family.

## Gotchas and Caveats

> [!gotcha] Curvature input path looks wrong (`../subjects/…`)
> Steps 5–6 call `mris_curvature` on `../subjects/lh.smoothwm` and
> `../subjects/lh.smoothwm_corrected`
> ([L36](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L36),
> [L38](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh#L38)),
> i.e. a `subjects/` subdirectory under `scripts/` — yet the surfaces are written
> to `../surf/`, and the subsequent `cp` reads `../surf/lh.smoothwm.H`. The
> right-hemisphere worker [[fix_subject_corrected-rh]] correctly uses
> `../surf/rh.smoothwm`. This `../subjects/` path appears to be a copy-paste error
> that would make the left-hemisphere curvature step fail unless such a directory
> happens to exist. Behaviour described from the code as-is.

> [!gotcha] Preserves originals, builds a full corrected surface set
> Because `-suffix _corrected` is passed to both [[mris_fix_topology]] and
> [[mris_make_surfaces]], this worker writes `lh.orig_corrected`,
> `lh.white_corrected`, etc. alongside the canonical surfaces rather than
> overwriting them — the defining difference from [[fix_subject-lh]].

> [!gotcha] Not fail-fast
> `#!/bin/tcsh -f` (no `-e`): a failing step does **not** abort the script, so
> later steps (and the parent driver) keep running.

## Error Compensation and Guard Rails

- `touch NOTES` before appending guarantees the provenance file exists.
- No input validation. The `DIAG 0x04048` setting only affects diagnostic
  verbosity, not behaviour.

## Known Bugs

- [[00181]] — both `mris_curvature` calls read `../subjects/lh.smoothwm*` instead of `../surf/lh.smoothwm*`, inconsistent with the script's own `cp` target and the rh worker, so `lh.curv`/`lh.curv_corrected` end up stale or missing.

## Related Tools

- [[fix_subject_corrected]] — parent driver that runs this plus [[fix_subject_corrected-rh]].
- [[fix_subject_corrected-rh]] — right-hemisphere mirror (uses the correct `../surf/` curvature path).
- [[fix_subject-lh]] — the plain variant (overwrites `lh.orig`, stops after inflation).
- [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], [[mris_make_surfaces]] — the tools run.

## Confidence and Gaps

**High confidence:** the exact command sequence, the `_corrected` suffixing, and
the `DIAG`/`NOTES` setup are read directly from
[`scripts/fix_subject_corrected-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh).

> [!gap] `../subjects/` curvature path
> Whether the `../subjects/lh.smoothwm` path in the two `mris_curvature` calls is
> an intentional non-standard layout or a bug (it differs from the rh worker and
> from the `../surf/` `cp` target) cannot be resolved from the code alone.

## References

- FreeSurfer source: [`scripts/fix_subject_corrected-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected-lh) (v8.2.0).
- Registered in [`scripts/CMakeLists.txt:60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L60).
