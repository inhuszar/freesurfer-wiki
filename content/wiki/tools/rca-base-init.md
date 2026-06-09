---
title: "rca-base-init"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-base-init"
families: ["rca-*"]
recon_all_stage: null
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_robust_template]]"
  - "[[make_upright]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_concatenate_lta]]"
  - "[[mri_diff]]"
  - "[[longitudinal-processing]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The -skullstrip branch's brainmask_template.mgz creation is active, but the subsequent mri_mask step that would build brainmask.auto.mgz from T1.mgz is commented out and left to recon-all; the exact division of labour is described from comments."
  - "Whether -base-affine (affine base construction) is ever enabled by default recon-all invocations is not determined here; recon-all passes it only via expert options."
tags:
  - recon-all
  - longitudinal
  - base-subject
  - template
  - registration
  - robust-template
---

# rca-base-init

## Summary

`rca-base-init` is an internal **component script** of
[[wiki/pipelines/recon-all|recon-all]] that builds the **unbiased longitudinal
"base" (template) subject** from a set of same-individual time points. For each
cross-sectional time point it co-registers the brains with
[[mri_robust_template]], builds a median (or mean) `norm_template.mgz` and the
median `orig.mgz` of the base subject in an upright, unbiased mid-space, writes
the per-time-point `*_to_base.lta` transforms and their inverses, and prepares a
combined `brainmask_template.mgz` for the skull-strip step. The code was lifted
almost verbatim out of recon-all so the longitudinal base creation could live in
its own script; it is "mostly supposed to be run from within recon-all" but is a
standalone tcsh script.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-base-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-base-init`
- **Key helpers invoked:** [`mri_robust_template`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L166) (unbiased median/mean template + rigid/affine co-registration), [`make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L148) (single-time-point upright base), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L156) (apply LTA to create `orig.mgz`/`brainmask_template.mgz`), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L231) (invert the time-point→base transforms), and [`mri_diff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L121) (cross-time geometry check).

## Purpose and Context

FreeSurfer's **longitudinal stream** processes several scans of the same person
acquired at different times in a way that avoids any one time point biasing the
result. The key idea is an **unbiased within-subject template** — the "base"
subject — built in a half-way space so that no time point is privileged. All
time points are later resampled into this base and processed with the base as an
initialisation, dramatically improving the reliability of longitudinal
morphometry (Reuter et al., 2012).

`rca-base-init` creates that base. Its comment header is explicit: *"Mostly,
code was just cut out of recon-all … While this can be run outside of recon-all,
it is mostly supposed to be run from within recon-all"*
([`scripts/rca-base-init:1-8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L1-L8)). recon-all calls it in its
`-base` branch (the *Longitudinal Base Subject Creation* block) **before
AUTORECON 1**, after which the normal autorecon1/2/3 stages run on the base
subject. It is therefore not part of a single autorecon stage; it is a one-off
base-construction step that precedes the stage stream (hence
`recon_all_stage: null`).

Three input volumes per time point participate: `norm.mgz` (intensity-normalised
brain, used to build the geometric template), `${BaseSubjInvol}` (default
`orig.mgz`, used to build the base's `orig.mgz`), and `brainmask.mgz` (used to
build `brainmask_template.mgz`). The base is built in two flavours:

- **single time point** → make the one scan upright with [[make_upright]] so it
  is processed identically to multi-time-point bases;
- **≥ 2 time points** → an iterative robust median/mean template via
  [[mri_robust_template]] (rigid by default, optionally affine).

## Inputs

### Required Inputs

- **`-base baseid`** (or `-s baseid`) — the **new** base/template subject ID to
  create under `$SUBJECTS_DIR`. Must differ from every time-point ID
  ([`scripts/rca-base-init:364-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L364-L372)).
- **`-tp tpid`** (alias `-base-tp`), repeatable — one per cross-sectional time
  point. At least one is required
  ([`scripts/rca-base-init:433-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L433-L436)). Each `tpid` must be an
  **already cross-sectionally recon-ed** subject (its `mri/norm.mgz`,
  `mri/orig.mgz`, `mri/T1.mgz`, `mri/brainmask.mgz`, `mri/rawavg.mgz` must
  exist).

### Input Assumptions

> [!assumption] Each time point has already been run cross-sectionally
> `rca-base-init` reads, per time point, `mri/norm.mgz`, `mri/${BaseSubjInvol}`
> (default `orig.mgz`), `mri/T1.mgz`, `mri/brainmask.mgz`, and `mri/rawavg.mgz`
> ([`scripts/rca-base-init:111-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L111-L123)). These are products of a
> completed cross-sectional `recon-all -all`. The script does not create them; if
> any are missing the underlying tool fails. `setenv FS_LOAD_DWI 0` is set at the
> top ([`scripts/rca-base-init:10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L10)) so DWI loading never interferes.

> [!gotcha] Acquisition changes across time are warned, not blocked
> Before building the template the script runs `mri_diff --notallow-pix
> --notallow-geo` between each time point's `rawavg.mgz` and the first time
> point's ([`scripts/rca-base-init:120-129`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L120-L129)). If the geometry/voxel
> size differs it prints a prominent warning that resolution changes "can
> potentially bias a longitudinal study", **sleeps 10 seconds, and continues
> anyway** ([`scripts/rca-base-init:132-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L132-L140)). It does not stop.

## Outputs

All paths are under `$SUBJECTS_DIR/$baseid/` (`= $subjdir`). The directory
skeleton (`touch scripts mri/transforms surf tmp`) is created first
([`scripts/rca-base-init:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L65-L69)).

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `orig.mgz` | `mri/` | the base subject's input volume: upright single TP, or robust median/mean of all TPs' `${BaseSubjInvol}` |
| `norm_template.mgz` | `mri/` | unbiased median/mean of the time-point `norm.mgz` volumes (the geometric reference for the base) |
| `norm1_template.mgz` | `mri/` | initial rigid template (only with `-base-affine`) |
| `head_template.mgz` | `mri/` | affine head template from `T1.mgz` (only with `-base-affine`) |
| `brainmask_template.mgz` | `mri/` | combined brain mask mapped into base space (logical-OR of TP `brainmask.mgz`, or single-TP resample) |
| `<tp>_to_<base>.lta` | `mri/transforms/` | rigid (or final) transform from each time point into base space |
| `<base>_to_<tp>.lta` | `mri/transforms/` | the inverse transforms (`mri_concatenate_lta -invert1`) |
| `<tp>_to_<base>_norm.lta` | `mri/transforms/` | initial rigid `norm` transforms (only with `-base-affine`) |
| `<tp>_to_<base>_affine.lta` | `mri/transforms/` | affine head transforms (only with `-base-affine`) |
| `base-tps` | `$subjdir/` | text file listing the time-point IDs that make up the base |
| `touch/base.touch` | `touch/` | completion stamp for the base-input step |
| `rca-base-init.log` | `scripts/` | the script's own "local" log (always; recreated each run) |
| `recon-all.cmd`, `recon-all-status.log` | `scripts/` | command/status files appended to (defaults; overridable with `-cf`/`-sf`) |

### Output Specifications

The base is built in an **upright, unbiased mid-space**: for a single time point
[[make_upright]] rotates the scan upright and records the rotation as the
`<tp>_to_<base>.lta`; for multiple time points [[mri_robust_template]] places the
template at the geometric mean of all inputs. `orig.mgz` is produced at the same
voxel geometry as the template via `--noit` (no further iteration) using the
already-computed `<tp>_to_<base>.lta` as `--ixforms`
([`scripts/rca-base-init:214-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L214-L218)). The `brainmask_template.mgz` is
combined with **nearest-neighbour** resampling and `--average 0` (mean = logical
OR for masks) ([`scripts/rca-base-init:270-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L270-L275)).

## Mathematical Foundations

The numerical heavy lifting is the **unbiased robust template** estimation,
which lives entirely in [[mri_robust_template]]; `rca-base-init` only assembles
its command lines.

> [!math] Unbiased within-subject template
> The base is the volume $T$ that minimises a robust registration cost to all $N$
> time points $\{I_i\}$ simultaneously, with each time point mapped by a rigid
> transform $M_i$ into a common mid-space. [[mri_robust_template]] alternates
> between (a) robustly registering each $I_i$ to the current $T$ (Tukey
> biweight, saturation `--sat 4.685`, [`scripts/rca-base-init:177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L177))
> and (b) re-estimating $T$ as the voxel-wise **median**
> (`--average ${robust_template_avg_arg}` = 1, [`scripts/rca-base-init:176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L176); value set at [`:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L24)) of the resampled
> time points. The mid-space is chosen so $\sum_i \log(M_i)$ is balanced — no
> single time point is the registration target — which is what makes the
> template *unbiased*. With one time point there is nothing to average, so
> [[make_upright]] simply puts the scan into the canonical upright orientation
> that the multi-TP template would have used.

> [!internal] Robust median template and transform inversion are external
> The median/mean estimation, the Tukey-biweight robust registration, and the
> half-way-space transform construction are all in [[mri_robust_template]]. The
> inverse transforms are computed by [[mri_concatenate_lta]] `-invert1`
> ([`scripts/rca-base-init:231-234`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L231-L234)). This script contributes no
> arithmetic of its own.

The constant `robust_template_avg_arg = 1` selects **median** (the script
comment: *"construct template from: 0 Mean, 1 Median"*,
[`scripts/rca-base-init:24`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L24)), passed as `--average`
([`:176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L176)); `--sat 4.685` ([`:177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L177))
is the standard Tukey saturation for the robust estimator.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-base-init:322-420`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L322-L420)). Boolean flags take no
argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-base` | string | *(required)* | New base/template subject ID to create. Must not equal any time-point ID. Sets `DoCreateBaseSubj=1`. |
| `-s` | string | — | Alternative way to set the subject ID (does **not** set the base flags; `-base` is the intended entry point). |
| `-tp`<br>`-base-tp` | string (repeatable) | *(≥1 required)* | A cross-sectional time-point subject to include in the base. Repeat once per time point. |
| `-base-affine` | bool | off | Build the base with an extra **affine** stage (initial rigid `norm` reg → affine head reg on `T1.mgz` → fine-tuned rigid). Also implicitly turns on `-base` handling. |
| `-base-invol` | string | `orig.mgz` | Per-time-point volume used to construct the base's `orig.mgz` (instead of `orig.mgz`). |
| `-base-init`<br>`-nobase-init` | bool | on | Whether to actually create the base input (`DoCreateBaseInput`). `-nobase-init` skips the template-building block. |
| `-skullstrip`<br>`-noskullstrip` | bool | on | Whether to build the combined `brainmask_template.mgz` in preparation for skull stripping. |
| `-sd` | string | `$SUBJECTS_DIR` | Subjects directory. (See gotcha — the handler has a tcsh bug.) |
| `-log` | string | `/dev/null` | Main log file; appended to by default (`LFappend=1`). recon-all passes its own `$LF`. |
| `-cf` | string | `<base>/scripts/recon-all.cmd` | Command file to append the issued commands to. |
| `-sf` | string | `<base>/scripts/recon-all-status.log` | Status file to append stage markers to. |
| `-nolog`<br>`-no-log` | bool | off | Send the main log to `/dev/null`. |
| `-debug`<br>`--debug` | bool | off | `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print help (the `BEGINHELP` block) and exit. |
| `-version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] The base ID must not be a time-point ID
> If any `-tp` equals the `-base` ID, the script errors with *"you need to
> specify a new ID for the base/template … It cannot be one of the time points"*
> ([`scripts/rca-base-init:364-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L364-L372)). The base is a brand-new subject.

> [!gotcha] `-base-affine` switches on three extra robust-template passes
> `-base-affine` falls through to the `-base` case (no `breaksw`,
> [`scripts/rca-base-init:340-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L340-L349)) so it also sets the base ID
> handling, **and** adds: an initial rigid `norm` template
> (`norm1_template.mgz`), an affine head template from `T1.mgz`
> (`head_template.mgz`, `--affine --ixforms`), and a fine-tuned rigid pass — only
> in the ≥2-time-point branch ([`scripts/rca-base-init:184-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L184-L211)). For a
> single time point it has no effect (the upright path is taken).

> [!gotcha] `setenv SUBJECTS_DIR = …` — `-sd` writes a literal "="
> The `-sd` handler is `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/rca-base-init:337`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L337)). In tcsh `setenv` takes
> `setenv NAME value` with **no `=`**, so this sets `SUBJECTS_DIR` to the literal
> string `=` (the path becomes the next argument). recon-all does not use `-sd`
> (it relies on the inherited `$SUBJECTS_DIR`), so the bug is latent there; avoid
> `-sd` when running by hand. *(Reported as a defect — see the bug catalogue.)*

- `-base-init` is on by default and `-base` sets `DoCreateBaseSubj=1`, so the
  template-building block runs unless you pass `-nobase-init`. The script header
  notes `DoCreateBaseSubj` is redundantly set/checked because the code was cut
  from recon-all ([`scripts/rca-base-init:2-6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L2-L6)).
- `-skullstrip` (default on) builds `brainmask_template.mgz`; the subsequent step
  that turns it into `brainmask.auto.mgz` from `T1.mgz` is **left to recon-all**
  and is commented out here (see Pipeline Context).

## Typical Use Cases

### 1. As recon-all calls it (the normal path)

```bash
# Exactly what recon-all runs in its -base block (recon-all:1344-1348):
rca-base-init -base templ_subj -tp tp1 -tp tp2 -tp tp3 \
  -log $LF -cf $CF -sf $SF
```

This is triggered when the user runs the longitudinal base step, e.g.
`recon-all -base templ_subj -tp tp1 -tp tp2 -tp tp3 -all` — recon-all does the
arg handling and then calls `rca-base-init` for the base-construction part.

### 2. Build an unbiased base by hand

```bash
setenv SUBJECTS_DIR /data/long
rca-base-init -base subjBase -tp subj_v1 -tp subj_v2
# → $SUBJECTS_DIR/subjBase/mri/{orig.mgz,norm_template.mgz,brainmask_template.mgz}
#   and mri/transforms/subj_v1_to_subjBase.lta etc.
```

### 3. Affine base construction

```bash
rca-base-init -base subjBase -base-affine -tp subj_v1 -tp subj_v2 -tp subj_v3
# adds head_template.mgz and the affine *_to_*_affine.lta transforms
```

## Pipeline Context

`rca-base-init` runs in the **Longitudinal Base Subject Creation** block of
[[wiki/pipelines/recon-all|recon-all]], at
[`scripts/recon-all:1339-1357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1339-L1357) — **immediately before AUTORECON 1**
(`##---------- AUTORECON 1` at [`scripts/recon-all:1359`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1359)).
The exact invocation is:

```tcsh
if ($DoCreateBaseInput && $DoCreateBaseSubj) then
  ...
  set cmd = (rca-base-init -base $subjid)
  foreach s ($BaseSubjsList)
    set cmd = ($cmd -tp $s)
  end
  set cmd = ($cmd -log $LF -cf $CF -sf $SF)
  set xopts = `fsr-getxopts rca-base-init $V8XoptsFile $GlobXOptsFile $XOptsFile`;
  set cmd = ($cmd $xopts)
  ...
endif
```

recon-all also reads expert options for `rca-base-init` (via `fsr-getxopts`) both
here and at [`scripts/recon-all:1207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1207)/[`:1349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1349),
and notes that the `brainmask.auto.mgz` step "Cannot move below to rca-base-init
because of T1.mgz" ([`scripts/recon-all:2327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2327)) — i.e. that part of
skull-stripping deliberately stays in recon-all. The matching commented-out
`mri_mask` block in this script ([`scripts/rca-base-init:283-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L283-L298))
documents that division of labour.

After `rca-base-init` finishes, recon-all proceeds through AUTORECON 1/2/3 on the
base subject as usual; the per-time-point longitudinal runs (`-long tp base`)
then resample each time point into this base.

**Predecessor:** cross-sectional `recon-all -all` on each time point (produces
`norm.mgz`, `orig.mgz`, `T1.mgz`, `brainmask.mgz`) → **rca-base-init** →
**Successor:** AUTORECON 1/2/3 on the base subject, then longitudinal time-point
processing.

## Gotchas and Caveats

> [!gotcha] Single time point still creates a "base"
> A base built from one `-tp` is not skipped — it is made by uprighting that
> scan with [[make_upright]] so single-TP subjects flow through the longitudinal
> stream identically to multi-TP subjects
> ([`scripts/rca-base-init:142-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L142-L161)).

> [!gotcha] Geometry-mismatch warning auto-continues after 10 s
> See the cross-time `mri_diff` check above: a resolution/geometry change across
> time points produces a warning and a 10-second pause, then proceeds. In a
> non-interactive recon-all run this means the bias risk is logged but not
> prevented.

> [!gotcha] `brainmask_template.mgz` is mean=logical-OR of all masks
> The multi-TP brain mask is combined with `mri_robust_template --average 0`
> (mean) plus `--finalnearest`, which for binary masks yields a logical OR of the
> mapped time-point masks ([`scripts/rca-base-init:269-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L269-L275)) — the base
> mask is the union of all time-point masks, not their intersection.

> [!gotcha] The script keeps a separate "local" log
> Regardless of `-log`, `rca-base-init` always writes `scripts/rca-base-init.log`
> (`$LLF`) and removes any previous copy
> ([`scripts/rca-base-init:73-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L73-L74)). The `-log`/`-cf`/`-sf` files are
> *appended* to (so recon-all's main log is preserved).

## Error Compensation and Guard Rails

- **Directory skeleton auto-created.** `touch/scripts/mri/transforms/surf/tmp`
  are made before anything runs ([`scripts/rca-base-init:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L65-L69)).
- **Cross-time geometry check** (warn + 10 s pause, not fatal) guards against
  silently mixing incompatible acquisitions (see gotchas).
- **Hard exits** on missing subject ID, missing `-tp` list, or a base ID equal to
  a time point ([`scripts/rca-base-init:428-436`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L428-L436),
  [`:364-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L364-L372)).
- **Every sub-command's status is checked**; any non-zero status jumps to
  `error_exit` and returns 1, so recon-all aborts the base build on the first
  failure.
- **`FS_LOAD_DWI 0`** is forced at startup so diffusion auto-loading cannot
  interfere with the anatomical template build.

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `-sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.

## Related Tools

- [[mri_robust_template]] — does the unbiased median/mean template estimation and the rigid/affine co-registration that is the core of the base build.
- [[make_upright]] — creates the single-time-point upright base and its transform.
- [[wiki/tools/mri_convert|mri_convert]] — applies the time-point→base LTA (with `-at`) to create `orig.mgz` and the single-TP `brainmask_template.mgz`.
- [[mri_concatenate_lta]] — inverts the `<tp>_to_<base>.lta` transforms to produce `<base>_to_<tp>.lta`.
- [[mri_diff]] — performs the cross-time geometry/voxel-size consistency check.
- [[wiki/pipelines/recon-all|recon-all]] — calls this script in its `-base` branch before autorecon1.
- [[longitudinal-processing]] — the longitudinal stream this base subject feeds.

## Confidence and Gaps

**High confidence:** the full flag set, the required `-base`/`-tp` inputs, the
single- vs multi-time-point branching, the median template (`--average 1`,
`--sat 4.685`), the affine extension under `-base-affine`, the union brain mask,
the inverse-transform construction, the redundant "local" log, and the exact
recon-all call site (before AUTORECON 1) — all read directly from
[`scripts/rca-base-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init) and
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] brainmask.auto.mgz hand-off
> The `mri_mask`-based creation of `brainmask.auto.mgz` from `T1.mgz` and
> `brainmask_template.mgz` is commented out here and explicitly left to recon-all
> (because `T1.mgz` is created there). The precise sequencing of that hand-off is
> inferred from the comments at
> [`scripts/rca-base-init:283-298`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L283-L298) and
> [`scripts/recon-all:2327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2327).

> [!gap] Default use of -base-affine
> Whether default longitudinal runs ever enable `-base-affine` is decided by
> recon-all/expert options, not this script; not verified here.

## References

- FreeSurfer source: [`scripts/rca-base-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init) (v8.2.0).
- Call site: [`scripts/recon-all:1339-1357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1339-L1357) (Longitudinal Base Subject Creation).
- Method: Reuter, Schmansky, Rosas, Fischl. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis*. NeuroImage 61(4):1402–1418, 2012.
- FreeSurfer wiki: LongitudinalProcessing (referenced by the script's error message).
