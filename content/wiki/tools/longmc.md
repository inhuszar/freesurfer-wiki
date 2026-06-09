---
title: "longmc"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/longmc"
families: ["long_*"]
recon_all_stage: autorecon1
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[longitudinal-processing]]"
  - "[[mri_robust_template]]"
  - "[[mri_concatenate_lta]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[long_submit_jobs]]"
  - "[[long_stats_slopes]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "longmc is invoked by rca-long-tp-init and recon-all.v6.hires, both via fsr-getxopts. The recon-all.v6.hires call omits -s (relying on -long to set subjid); the rca-long-tp-init call passes -s explicitly. No standalone wiki page yet exists for rca-long-tp-init to cross-link as the immediate caller."
  - "Two apparent defects (the -sd handler writes 'setenv SUBJECTS_DIR =' and the run-time-minutes divides seconds by 50 not 60) are read straight from the source; not yet confirmed against a bug tracker."
tags:
  - longitudinal
  - motion-correction
  - recon-all
  - autorecon1
  - registration
---

# longmc

## Summary

`longmc` performs the **motion-correction (MC) step of the longitudinal
recon-all stream** when building a longitudinal time-point subject
(`<tpNid>.long.<template>`). Instead of re-running motion correction from scratch,
it takes the cross-sectional raw inputs (`mri/orig/001.mgz`, `002.mgz`, …) of a
time point, **resamples / averages them into the within-subject base template
space** by concatenating the existing per-run registrations with the time-point→
base registration, and writes the longitudinal `mri/orig.mgz` and `mri/rawavg.mgz`.
With a single cross-sectional input it does a direct resample; with multiple inputs
it re-runs [[mri_robust_template]] using the concatenated transforms. It is a
small, fixed-purpose tcsh script called internally by recon-all (via
`rca-long-tp-init`); it is not normally run by hand.

## Source Information

- **Language:** tcsh shell script (`#!/bin/tcsh -f`)
- **Source file:** [`scripts/longmc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc)
- **Binary/script location:** `$FREESURFER_HOME/bin/longmc`
- **FreeSurfer tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L104) (resample with `-at`, convert to uchar), [`mri_robust_template`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L190) (average multiple inputs in base space), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L140) (compose registrations), [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L132) and [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L145) (conf2hires rawavg header registration), plus the shell helpers `UpdateNeeded`, `fname2stem`, and `fs_temp_file`.

## Purpose and Context

In the FreeSurfer longitudinal pipeline (see [[longitudinal-processing]]), each
time point is processed against an unbiased within-subject **base template** so
that results are not biased toward any single time point. To do this, a time
point's anatomy must be brought into the base template's voxel space. The
**motion-correction** step of recon-all — which in the cross-sectional stream
averages the multiple raw acquisitions (`001.mgz`, `002.mgz`, …) into `rawavg.mgz`
and then `orig.mgz` — is replaced in the longitudinal stream by `longmc`, which
performs the same averaging **but in base space**.

The key idea (from the source comments, [`scripts/longmc:80-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L80-L90)):
in the cross stream each input run already has an LTA (and intensity-scale file)
mapping it into the motion-corrected average. To put the time point in base space,
`longmc` **concatenates** each run's existing LTA with the time-point→base LTA, and
then re-runs the same averaging with the original `???.mgz` files and the new
composed LTAs. This re-uses the within-time-point alignment while landing the
result in base space, producing `mri/orig.mgz` and `mri/rawavg.mgz` for the
`<tpNid>.long.<template>` subject.

It is invoked **inside recon-all's longitudinal motion-correction stage** by
`rca-long-tp-init` ([`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L168), the `-long` branch of
`DoMotionCor`) and by `recon-all.v6.hires` ([`scripts/recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires#L1337)). Both pass site-specific extra options via
`fsr-getxopts longmc`. It is therefore an **autorecon1-stage** helper, run once per
longitudinal time point, not a user-facing command.

## Inputs

### Required Inputs

`longmc` is told which time point and base to operate on with `-long <tpNid>
<longbaseid>`, which sets `subjid = <tpNid>.long.<longbaseid>`
([`scripts/longmc:245-256`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L245-L256)). From the current `$SUBJECTS_DIR` it reads:

- **Cross-sectional raw runs** of the time point: `${tpNid}/mri/orig/[0-9][0-9][0-9].mgz`
  (`001.mgz` and any additional runs). At least `001.mgz` must exist, or the
  script errors ([`scripts/longmc:348-355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L348-L355)). Format: [[mgz]].
- **Per-run registrations and intensity scales** (only when there is more than one
  run): for each `NNN.mgz`, the files `NNN.lta` and `NNN-iscale.txt` must exist
  ([`scripts/longmc:357-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L357-L372)).
- **Time-point→base registration:**
  `${longbaseid}/mri/transforms/${tpNid}_to_${longbaseid}.lta`, which must exist
  ([`scripts/longmc:374-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L374-L378)). Format: [[lta]].

Both `${tpNid}` and `${longbaseid}` subject directories must be present under
`$SUBJECTS_DIR` ([`scripts/longmc:339-344`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L339-L344)).

### Input Assumptions

> [!assumption] The base and the time-point→base registration already exist
> `longmc` is a downstream step: it assumes the within-subject base template has
> been created and that the time-point→base LTA
> (`${tpNid}_to_${longbaseid}.lta`) has been computed by the earlier longitudinal
> initialization (in the cross stream these come from `mri_robust_template`). It
> also assumes the cross-sectional run(s) and their per-run LTAs/iscales are in
> place. It does **not** compute any new registration to the base; it only
> composes and resamples.

> [!gotcha] T2/FLAIR are not handled here
> The source comment notes that T2 and FLAIR inputs do not need to be handled by
> `longmc` in either the normal stream or conf2hires
> ([`scripts/longmc:82-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L82-L83)); `longmc` only produces the T1 `orig.mgz`/
> `rawavg.mgz`.

## Outputs

### Files Created

Written into `$SUBJECTS_DIR/<tpNid>.long.<longbaseid>/mri/`:

| File | Contents |
|------|----------|
| `orig.mgz` | The motion-corrected, base-space conformed volume (uchar), the longitudinal analogue of the cross `orig.mgz`. Always produced. |
| `rawavg.mgz` | The base-space raw average. In the normal stream it is a plain resample/average; in conf2hires it is produced via a header-only registration (see below). |
| `mri/orig/NNN.lta`, `mri/orig/NNN-iscale.txt` | Copies of the per-run LTA / intensity-scale files brought into the long subject (multi-run case, [`scripts/longmc:164-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L164-L168)). |
| `mri/orig/NNN-to-base.lta` | Per-run LTA composed with the time-point→base LTA (multi-run case, [`scripts/longmc:173-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L173-L183)). |
| `mri/transforms/rawavgcross2conf.lta`, `rawavgcross2base.lta` | conf2hires-only registrations relating the cross rawavg to conf/base space ([`scripts/longmc:128-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L128-L146)). |
| `scripts/longmc.log` | Run log (command line, build stamp, timing). Default path; override with `--log`, disable with `--no-log`. |

It also creates the `mri/orig`, `mri/transforms`, and `scripts` subdirectories of
the long subject if missing ([`scripts/longmc:56-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L56-L58)).

### Output Specifications

`orig.mgz` is written as 8-bit `uchar` ([`mri_convert -odt uchar`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L104)), in the base template's voxel geometry. The single-input path resamples
directly with cubic interpolation (`mri_convert -at <reg> -rt cubic`); the
multi-input path averages with `mri_robust_template --average 1 --noit` using the
composed transforms and per-run intensity scales, then converts the resulting
rawavg to `orig.mgz`. All outputs share the base template's [[coordinate-systems|coordinate system]].

## Mathematical Foundations

The core operation is **transform composition followed by resampling/averaging**.

> [!math] Composed registration to base space
> For each cross-sectional run $r$ with registration $L_r$ (run→cross-average) and
> the time-point→base registration $L_{\text{tp}\to\text{base}}$, the run→base
> transform is the composition
> $$L_{r\to\text{base}} = L_{\text{tp}\to\text{base}} \circ L_r$$
> formed by [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L176). The base-space average is then
> $\bar I = \tfrac{1}{N}\sum_r s_r\,I_r\!\circ\!L_{r\to\text{base}}^{-1}$ with
> per-run intensity scales $s_r$, computed by [[mri_robust_template]] in
> `--average 1 --noit` mode (no iterative re-registration — the transforms are
> fixed) using `--iscalein`.

With a **single** input the average is trivial, so `longmc` skips
`mri_robust_template` and directly applies $L_{\text{tp}\to\text{base}}$ with
`mri_convert -at` (cubic) to make both `orig.mgz` and `rawavg.mgz`
([`scripts/longmc:95-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L95-L122)).

> [!internal] The numerical resampling/averaging lives in the called binaries
> `longmc` itself does no pixel math; the interpolation and intensity-weighted
> averaging are done by [[wiki/tools/mri_convert|mri_convert]] and
> [[mri_robust_template]], and the matrix composition by [[mri_concatenate_lta]].
> See [[mri_robust_template]] for the robust averaging model.

> [!math] conf2hires rawavg via header-only registration
> In conf2hires mode, `rawavg.mgz` must stay at native (hi-res) resolution but be
> *in register* with the base. `longmc` computes the cross rawavg→conf registration
> with `tkregister2_cmdl --regheader`, composes it with the tp→base LTA via
> `mri_concatenate_lta`, then applies it with `mri_vol2vol --no-resample` so only
> the header (not the voxels) is changed ([`scripts/longmc:123-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L123-L152)).

## Configuration Options

### Complete Flag Reference

Enumerated from the argument-parsing loop ([`scripts/longmc:237-327`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L237-L327)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-long`<br>`-longitudinal` | `<tpNid> <longbaseid>` | *(required)* | The cross time-point name and the base/template name. Sets `subjid = <tpNid>.long.<longbaseid>`. Trailing slashes are stripped. |
| `-s`<br>`--s` | string | derived from `-long` | Override the long subject id. Must be given **after** `-long` (it overwrites the value `-long` computed). For testing. |
| `-sd`<br>`--sd` | string | `$SUBJECTS_DIR` | Subjects directory. **See the defect note below — the handler is buggy in v8.2.0.** |
| `-conf2hires`<br>`--conf2hires` | bool | off | Enable the conf2hires rawavg handling (header-only registration of the native-resolution rawavg into base space). |
| `-no-conf2hires`<br>`--no-conf2hires` | bool | (off) | Disable conf2hires handling. |
| `-force-update`<br>`--force-update` | bool | **on** (via `RCA_LONGMC_FORCE_UPDATE=1`) | Recompute outputs even if `UpdateNeeded` says they are current. |
| `-no-force-update`<br>`--no-force-update` | bool | off | Honour the `UpdateNeeded` timestamp check (skip up-to-date outputs). Equivalent to `setenv RCA_LONGMC_FORCE_UPDATE 0`. |
| `--log` | string | `<subj>/scripts/longmc.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | *(unused)* | Set a temp dir (also disables cleanup). The tmpdir machinery is commented out in this version. |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp-dir cleanup (currently inert — the tmpdir block is commented out). |
| `-debug`<br>`--debug` | bool | off | Enable `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print usage + help and exit. |
| `-version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `-s` must come after `-long`
> `-long` computes `subjid = <tpNid>.long.<longbaseid>`; `-s` overwrites it.
> Because flags are parsed left-to-right, `-s myid -long tp base` would have
> `-long` clobber the override. The usage text explicitly says `-s` "must be after
> -long" ([`scripts/longmc:264`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L264), [`400`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L400)).

> [!gotcha] Force-update is ON by default
> `RCA_LONGMC_FORCE_UPDATE` defaults to `1` ([`scripts/longmc:17-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L17-L18)),
> so `longmc` recomputes its outputs every run regardless of timestamps. The
> source comment says this is deliberate until the `UpdateNeeded` logic is tested
> more thoroughly. Pass `-no-force-update` (or `setenv RCA_LONGMC_FORCE_UPDATE 0`)
> to enable skip-if-current behaviour.

> [!gotcha] conf2hires changes how `rawavg.mgz` is produced
> Without `-conf2hires`, the single-input path makes `rawavg.mgz` by a plain
> cubic resample. With `-conf2hires`, the single-input path instead builds
> `rawavgcross2conf.lta` / `rawavgcross2base.lta` and uses
> `mri_vol2vol --no-resample` so the native-resolution rawavg is re-headered, not
> resampled ([`scripts/longmc:112-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L112-L153)). recon-all sets this flag when the
> subject was processed with conf2hires.

## Typical Use Cases

### Use Case 1: How recon-all calls it (single/multi-run, normal stream)

```bash
# As emitted by rca-long-tp-init in the longitudinal motion-correction step:
longmc -long tp01 OAS_base -s tp01.long.OAS_base
```

This reads `OAS_base/.../tp01_to_OAS_base.lta` and `tp01/mri/orig/0??.mgz`, and
writes `tp01.long.OAS_base/mri/orig.mgz` and `rawavg.mgz` in base space.

### Use Case 2: conf2hires longitudinal time point

```bash
longmc -long tp01 OAS_base -s tp01.long.OAS_base -conf2hires
```

### Use Case 3: Manual re-run honouring timestamps (testing)

```bash
setenv SUBJECTS_DIR /studies/long
longmc -long tp02 OAS_base -s tp02.long.OAS_base -no-force-update
```

## Pipeline Context

`longmc` is an **internal autorecon1 step** of the longitudinal recon-all stream.
It is **called by** [[wiki/pipelines/recon-all|recon-all]] — specifically by the
`-long` branch of the motion-correction stage in `rca-long-tp-init`
([`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L166-L178)), and by the equivalent code in
`recon-all.v6.hires` ([`scripts/recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires#L1336-L1347)). In both, extra
options are injected with `fsr-getxopts longmc <xopts-file>`.

**Predecessor:** within-subject base template creation +
`${tpNid}_to_${longbaseid}.lta` (longitudinal init via [[mri_robust_template]]) →
**`longmc`** (produces base-space `orig.mgz`/`rawavg.mgz`) → **Successor:** the
remaining recon-all longitudinal steps (skull strip, normalization, surfaces) on
the long time-point subject.

This is the longitudinal replacement for the cross-sectional motion-correction
that builds `rawavg.mgz`/`orig.mgz`. See [[longitudinal-processing]] for the full
cross → base → long flow, and [[long_submit_jobs]] for the batch driver that
queues the long recon-all jobs containing this step.

## Gotchas and Caveats

> [!gotcha] `-sd` handler is broken (writes a literal `=`)
> The `-sd`/`--sd` case runs `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/longmc:268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L268)). In tcsh, `setenv` takes **no** `=`; this sets
> `SUBJECTS_DIR` to the literal string `=` and then tries to treat the intended
> path as an extra word. In practice `-sd` does **not** reliably set the subjects
> directory — set `$SUBJECTS_DIR` in the environment instead. (recon-all passes
> the subjects dir via the environment / `-s`, not `-sd`, so the in-pipeline use is
> unaffected.) See Confidence and Gaps.

> [!gotcha] `--tmp`/`--cleanup` flags are inert
> The temp-directory block is commented out ([`scripts/longmc:50-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L50-L54), [`208-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L208-L209)), so `--tmp`, `--tmpdir`, `--nocleanup`, and
> `--cleanup` set variables that are never used. They have no effect in v8.2.0.

> [!gotcha] At least `001.mgz` must exist in the cross orig dir
> If `${tpNid}/mri/orig/` contains no `NNN.mgz`, `longmc` aborts with guidance to
> create `001.mgz` (and `002.mgz`, … for extra runs)
> ([`scripts/longmc:348-355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L348-L355)). The multi-run case additionally requires each
> `NNN.lta` and `NNN-iscale.txt`.

> [!gotcha] Reported run-time-in-minutes is miscalculated
> The "Longmc-Run-Time-Min" line divides elapsed seconds by **50**, not 60
> ([`scripts/longmc:215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L215)), so the logged minutes figure is ~20% too large.
> Cosmetic (affects only the log), but the number is wrong.

## Error Compensation and Guard Rails

- **Skip-if-current (optional).** `UpdateNeeded <out> <deps…>` gates each step, so
  an up-to-date output is skipped — **but only when force-update is off**; it is on
  by default ([`scripts/longmc:17-18`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L17-L18), [`102-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L102-L110)).
- **Existence checks before running.** The base, the tp→base LTA, the cross runs,
  and (multi-run) the per-run LTA/iscale files are all verified in `check_params`,
  with explicit errors if missing ([`scripts/longmc:333-378`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L333-L378)).
- **Output-directory creation.** `mri/orig`, `mri/transforms`, and `scripts` are
  created up front ([`scripts/longmc:56-58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L56-L58)).
- **Fail-fast on sub-command error.** Every `mri_*` call is followed by
  `if($status) goto error_exit`, which prints `ERROR:` and exits 1
  ([`scripts/longmc:230-233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L230-L233)).

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `-sd`/`--sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.
- [[00153]] — end-of-run "Run-Time-Min" computed as `tSecRun/50` instead of `/60`, inflating the logged minute figure by 20% (cosmetic, log-only).

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — calls `longmc` (via `rca-long-tp-init`)
  as the longitudinal motion-correction step.
- [[mri_robust_template]] — averages multiple cross runs into base space using the
  composed transforms (multi-run path).
- [[mri_concatenate_lta]] — composes each run's LTA with the time-point→base LTA.
- [[wiki/tools/mri_convert|mri_convert]] — resamples a single input into base space
  and converts to uchar.
- `tkregister2_cmdl`, `mri_vol2vol` *(no wiki page yet)* — conf2hires rawavg
  header registration.
- [[long_submit_jobs]] — batch driver that submits the long recon-all jobs that run
  this step.
- [[long_stats_slopes]] / [[long_stats_tps]] — downstream statistics over the
  longitudinal results.
- [[longitudinal-processing]] — the concept page for the whole stream.

## Confidence and Gaps

**High confidence:** the complete flag set, the single- vs. multi-input code
paths, the transform-composition + averaging approach, the conf2hires rawavg
handling, the required inputs, and the force-update default — all read directly
from [`scripts/longmc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc), and the recon-all invocation confirmed in
[`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L168) and
[`scripts/recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires#L1337).

> [!gap] `-sd` and run-time-minutes look like genuine bugs
> The `-sd` handler (`setenv SUBJECTS_DIR = $argv[1]`,
> [`scripts/longmc:268`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L268)) and the run-time-minutes divisor (`/50`,
> [`scripts/longmc:215`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc#L215)) both look like defects rather than intended
> behaviour. They are reported here from the source; neither has been confirmed
> against an upstream issue. Because recon-all passes the subjects dir via the
> environment and `-s` (not `-sd`), the broken `-sd` does not affect the
> in-pipeline use.

## References

- FreeSurfer source: [`scripts/longmc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/longmc) (v8.2.0).
- Invocation: [`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L166-L178) and [`scripts/recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires#L1336-L1347).
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-Subject Template Estimation for Unbiased Longitudinal Image Analysis.* NeuroImage 61(4):1402-1418, 2012. <http://dx.doi.org/10.1016/j.neuroimage.2012.02.084> — the longitudinal stream this step belongs to.
