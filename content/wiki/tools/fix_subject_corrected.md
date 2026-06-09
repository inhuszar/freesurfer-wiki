---
title: "fix_subject_corrected"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fix_subject_corrected"
families: []                     # standalone legacy topology-fix driver
recon_all_stage: null            # NOT called by recon-all
related:
  - "[[fix_subject_corrected-lh]]"
  - "[[fix_subject_corrected-rh]]"
  - "[[fix_subject]]"
  - "[[mris_fix_topology]]"
  - "[[mris_make_surfaces]]"
  - "[[mris_curvature]]"
  - "[[mris_sphere]]"
  - "[[mris_smooth]]"
  - "[[mris_inflate]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "umask 0 makes all created files world-writable; whether this was intentional (shared-lab scratch) or an oversight is not determinable from the code."
tags:
  - surface
  - topology
  - legacy
  - reconstruction
---

# fix_subject_corrected

## Summary

`fix_subject_corrected` is a legacy tcsh driver that runs the surface
topology-correction step for **both hemispheres** of one subject and writes the
results to a *parallel* set of surfaces named with a `_corrected` suffix. It
calls the two hemisphere workers [[fix_subject_corrected-lh]] and
[[fix_subject_corrected-rh]]. Unlike the plain [[fix_subject]] driver — which
overwrites the canonical `?h.orig` and stops after re-inflating — the "corrected"
variant runs [[mris_fix_topology]] with `-suffix _corrected` (so the original
surfaces are left intact), then continues all the way through curvature
computation ([[mris_curvature]]) and **white/pial surface generation**
([[mris_make_surfaces]]). It is a stand-alone, manually-invoked tool and is
**not** part of [[wiki/pipelines/recon-all|recon-all]].

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/fix_subject_corrected`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected)
- **Binary/script location:** `$FREESURFER_HOME/bin/fix_subject_corrected`
- **Scripts invoked:** [`fix_subject_corrected-lh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected#L23) and [`fix_subject_corrected-rh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected#L24), which call [[mris_sphere]], [[mris_fix_topology]], [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], and [[mris_make_surfaces]].

## Purpose and Context

This is the "keep both versions" topology-fix driver. Where [[fix_subject]]
replaces the cortical surface in place, `fix_subject_corrected` builds a second,
topologically-corrected surface family suffixed `_corrected`, so the uncorrected
and corrected reconstructions can be compared side by side (e.g. to inspect how
much a manual white-matter edit changed the surface). It then takes the corrected
white-matter surface all the way to white/pial surfaces, making it a fuller
re-reconstruction of one subject than the plain driver.

> [!gotcha] Not part of modern recon-all
> Like [[fix_subject]], `fix_subject_corrected` is **not** called by
> [[wiki/pipelines/recon-all|recon-all]]. `recon-all` performs topology
> correction inline (see
> [`scripts/recon-all:3732`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3732))
> and generates surfaces with its own staged calls. This driver is a legacy
> convenience script.

## Inputs

### Required Inputs

- **`$1` — subject ID.** The only positional argument; locates
  `$SUBJECTS_DIR/$1/`.
- **`$SUBJECTS_DIR`** must be set.
- The subject directory must already contain the per-hemisphere inputs the
  workers consume — at minimum `surf/?h.inflated` and the smoothed white-matter
  surfaces (see [[fix_subject_corrected-lh]] for the exact list).

### Input Assumptions

> [!assumption] Prior reconstruction outputs must exist
> The driver assumes white-matter tessellation, smoothing, and inflation have
> already run, plus the brain-mask/intensity volumes that [[mris_make_surfaces]]
> needs (e.g. `mri/brain`, `mri/wm`, `mri/filled`). Producing those is *not* part
> of this script; the steps that would create them are commented out in the
> hemisphere workers.

## Outputs

`fix_subject_corrected` itself writes only the `NOTES` provenance file (via its
workers). The substantive outputs are produced per hemisphere by
[[fix_subject_corrected-lh]] / [[fix_subject_corrected-rh]]:

| File (per hemisphere) | Written by | Contents |
|-----------------------|------------|----------|
| `surf/?h.qsphere` | [[mris_sphere]] | quasi-homeomorphic sphere |
| `surf/?h.orig_corrected` | [[mris_fix_topology]] `-suffix _corrected` | topology-corrected surface (the **original `?h.orig` is preserved**) |
| `surf/?h.smoothwm_corrected` | [[mris_smooth]] | smoothed corrected surface |
| `surf/?h.inflated_corrected` | [[mris_inflate]] | inflated corrected surface |
| `surf/?h.curv`, `surf/?h.curv_corrected` | [[mris_curvature]] (`.H` → copied) | mean-curvature maps of the uncorrected/corrected smoothwm |
| `surf/?h.white_corrected`, `surf/?h.pial_corrected`, … | [[mris_make_surfaces]] `-suffix _corrected` | white/pial surfaces built from the corrected `?h.orig_corrected` |
| `NOTES` | the workers | provenance log (command line, user, host, date) |

See [[fix_subject_corrected-lh]] / [[fix_subject_corrected-rh]] for the full,
exact command sequence.

## Mathematical Foundations

None in this script — it is a dispatcher. Topology correction is in
[[mris_fix_topology]]; curvature ($H$ mean, $K$ Gaussian) is in
[[mris_curvature]]; the deformable white/pial surface placement is in
[[mris_make_surfaces]].

> [!internal] Algorithms live in the surface library
> All numerical work happens in the invoked `mris_*` binaries and the `mrisurf`
> library, not here.

## Configuration Options

### Complete Flag Reference

`fix_subject_corrected` parses **no options** — only one positional argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `$1` (subject) | string | *(required)* | FreeSurfer subject ID under `$SUBJECTS_DIR`. Forwarded to `fix_subject_corrected-lh` / `-rh`. |

The script sets `umask 0`
([`scripts/fix_subject_corrected:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected#L21))
before dispatching, so files the workers create are world-readable/writable.

### Configuration Interactions

None — no flags. The meaningful choice is plain [[fix_subject]] (overwrite
`?h.orig`, stop after inflation) versus this corrected driver (write `_corrected`
surfaces, continue through white/pial generation).

> [!gotcha] `umask 0` makes outputs world-writable
> [`scripts/fix_subject_corrected:21`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected#L21)
> sets `umask 0`, so every file the hemisphere workers create gets mode `0666`/
> `0777`. On a shared system this is a permissions footgun; the plain
> [[fix_subject]] driver does not do this.

## Typical Use Cases

### Build a corrected surface family for one subject

```bash
setenv SUBJECTS_DIR /data/subjects
fix_subject_corrected bert
# → fix_subject_corrected-lh bert, then fix_subject_corrected-rh bert
# → produces lh.orig_corrected, lh.white_corrected, ... alongside the originals
```

Use this when you want to *compare* an edited reconstruction against the original
rather than replace it: the `_corrected` surfaces sit next to the canonical ones.

## Pipeline Context

`fix_subject_corrected` is a stand-alone, manually-invoked driver. It is **not** a
stage of [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** white-matter tessellation/smoothing/inflation (historically
`mri_tessellate` → [[mris_smooth]] → [[mris_inflate]]) → **fix_subject_corrected**
→ **Successors:** [[fix_subject_corrected-lh]] and [[fix_subject_corrected-rh]],
which run topology correction, curvature, and white/pial surface generation.

**Predecessor:** [[mris_inflate]] → **This tool** → **Successor:** [[fix_subject_corrected-lh]] / [[fix_subject_corrected-rh]]

## Gotchas and Caveats

> [!gotcha] Preserves the original surfaces (unlike `fix_subject`)
> Because the workers pass `-suffix _corrected` to [[mris_fix_topology]] and
> [[mris_make_surfaces]], the corrected reconstruction is written under
> `_corrected` names; the canonical `?h.orig`, `?h.white`, etc. are **not**
> overwritten. This is the defining difference from [[fix_subject]].

> [!gotcha] Does more than topology correction
> The corrected workers continue past inflation to compute curvature
> ([[mris_curvature]]) and to build white/pial surfaces
> ([[mris_make_surfaces]]). It is therefore a heavier operation than the plain
> driver, not a drop-in equivalent.

## Error Compensation and Guard Rails

- **Does NOT fail fast.** The shebang is `#!/bin/tcsh -f`
  ([`scripts/fix_subject_corrected:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected#L1)) —
  note the absence of `-e`. If `fix_subject_corrected-lh` fails, the driver
  **still runs** `fix_subject_corrected-rh`. (Contrast [[fix_subject]], which uses
  `-ef` and aborts on the first failure.)
- No input validation, no `--help`. All guard rails are in the `mris_*` binaries.

## Related Tools

- [[fix_subject_corrected-lh]] / [[fix_subject_corrected-rh]] — the per-hemisphere workers this driver calls.
- [[fix_subject]] — the plain sibling driver that overwrites `?h.orig` and stops after inflation.
- [[mris_fix_topology]] — topology-correction program; here run with `-suffix _corrected`.
- [[mris_make_surfaces]] — builds white/pial surfaces from the corrected `?h.orig_corrected`.
- [[mris_curvature]] — computes the mean-curvature maps copied to `?h.curv`/`?h.curv_corrected`.
- [[mris_sphere]], [[mris_smooth]], [[mris_inflate]] — surface steps run by the workers.
- [[wiki/pipelines/recon-all|recon-all]] — performs the equivalent steps internally (does not call this script).

## Confidence and Gaps

**High confidence:** control flow (both hemispheres, serial, no fail-fast), the
`umask 0`, and delegation to the `-lh`/`-rh` corrected workers are read directly
from [`scripts/fix_subject_corrected`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected).

> [!gap] Intent of `umask 0`
> Whether the world-writable `umask 0` was a deliberate choice for a shared
> scratch area or a leftover is not determinable from the code.

## References

- FreeSurfer source: [`scripts/fix_subject_corrected`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fix_subject_corrected) (v8.2.0).
- Registered as an installed script in [`scripts/CMakeLists.txt:59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/CMakeLists.txt#L59).
- Fischl, Liu & Dale (2001), *Automated manifold surgery…* IEEE TMI 20(1):70–80 — the topology-correction method in [[mris_fix_topology]].
