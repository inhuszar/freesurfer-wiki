---
title: "thickdiffmap"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/thickdiffmap"
families: []                     # standalone longitudinal thickness-change driver
recon_all_stage: null
related:
  - "[[mris_thickness_diff]]"
  - "[[mris_surface_stats]]"
  - "[[mri_surf2surf]]"
  - "[[fsl_rigid_register]]"
  - "[[longitudinal-processing]]"
  - "[[fsaverage]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hardcoded paths in steps 3/4 (the groupstudy output dir, the local ./resampled list, and the lh.white surface in step 4) constrain multi-hemisphere/multi-pair use; behaviour with rh inputs in step 4 was reasoned from the code, not run."
tags:
  - surface
  - thickness
  - longitudinal
  - difference-map
  - group-analysis
---

# thickdiffmap

## Summary

`thickdiffmap` is a small four-stage tcsh driver that computes a **between-surface
cortical thickness difference map** for two scans of the same subject, maps it to
a common surface template, and accumulates group-wise statistics. Given a pair of
FreeSurfer subjects (an earlier and a later scan of one person), a common template
subject (e.g. `fsaverage`), a hemisphere, and a list of step numbers, it: (1)
rigidly aligns the two scans' `orig.mgz` with FSL via [[fsl_rigid_register]];
(2) computes the per-vertex thickness difference with [[mris_thickness_diff]];
(3) resamples that difference map onto the template with [[mri_surf2surf]]; and
(4) computes smoothed group mean/standard-deviation maps across all accumulated
pairs with [[mris_surface_stats]]. It is a thin orchestration layer — each step
is one call to an existing FreeSurfer/FSL tool — intended for longitudinal
thickness-change studies.

## Source Information

- **Language:** tcsh shell script (note the `-ef` shebang: `-e` aborts on the
  first command that returns non-zero)
- **Source file:** [`scripts/thickdiffmap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap)
- **Binary/script location:** `$FREESURFER_HOME/bin/thickdiffmap`
- **Helpers invoked, one per step:**
  [`fsl_rigid_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L48) (step 1),
  [`mris_thickness_diff`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L65) (step 2),
  [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L88) (step 3),
  [`mris_surface_stats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L108) (step 4).

## Purpose and Context

To detect cortical thinning (or thickening) between two time points of the same
participant, FreeSurfer can compute a vertex-wise thickness difference, but doing
so correctly requires (a) bringing the two scans into a common rigid alignment so
the thickness sampling is comparable, (b) computing the difference on a shared
surface coordinate system, (c) resampling each subject's difference map onto a
group template, and (d) summarising across a cohort of pairs. `thickdiffmap`
chains those four operations behind a single command, with the steps selectable so
they can be run incrementally or re-run individually.

It is a **standalone research/longitudinal** utility — it is not called by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`. Both scans must already be
fully processed FreeSurfer subjects (so that `orig.mgz`, `?h.white`,
`?h.thickness`, and `sphere.reg` exist). It predates and is conceptually adjacent
to the modern [[longitudinal-processing]] stream, but operates directly on
cross-sectional subjects rather than through a base/template subject.

## Inputs

### Required Inputs (positional)

`thickdiffmap` does **not** use `--flag` parsing; it takes four positional
arguments followed by one or more step numbers
([`scripts/thickdiffmap:3-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L3-L37)):

```
thickdiffmap <subjscan1> <subjscan2> <commonsubj> <hemi> <step>...
```

| Position | Name | Meaning |
|----------|------|---------|
| 1 | `subjscan1` | First (earlier) scan — a FreeSurfer subject ID under `$SUBJECTS_DIR`. |
| 2 | `subjscan2` | Second (later) scan of the **same** person — a separate FreeSurfer subject ID. |
| 3 | `commonsubj` | Template subject to resample onto (e.g. `fsaverage`). |
| 4 | `hemi` | Hemisphere to process (`lh` or `rh`). |
| 5… | `step…` | One or more of `1 2 3 4` selecting which stages to run. |

Required files (read by the steps): `mri/orig.mgz` for both scans (step 1);
`surf/<hemi>.white` and `surf/<hemi>.thickness` for both scans (step 2);
`surf/<hemi>.sphere.reg` for the source and template (step 3, via `mri_surf2surf`);
`surf/lh.white` of the template (step 4 — see gotcha).

### Input Assumptions

> [!assumption] Two finished FreeSurfer subjects that are repeat scans of one person
> Both inputs must be completed `recon-all` subjects (`orig.mgz`, white surface,
> thickness, spherical registration present). They are assumed to be **two scans
> of the same individual** — step 1 rigidly registers them with a 9-DOF
> (translation+rotation+scale) FSL FLIRT and the difference in step 2 is only
> meaningful for the same brain. The template (`commonsubj`) must have a standard
> surface (`sphere.reg`, `lh.white`).

## Outputs

### Files Created

Paths are relative to `$SUBJECTS_DIR/` unless noted. `_to_` expands to
`<subjscan1>_to_<subjscan2>`.

| Step | File | Where | Contents |
|------|------|-------|----------|
| 1 | `orig_<subjscan1>_to_<subjscan2>.mgz` | `<subjscan2>/mri/` | scan1 resampled into scan2 space (FLIRT output). |
| 1 | `<subjscan1>_to_<subjscan2>.lta` | `<subjscan1>/mri/transforms/` | the 9-DOF rigid+scale transform (LTA). |
| 2 | `<hemi>.thickness_diff_<subjscan1>_to_<subjscan2>.mgh` | `<subjscan1>/surf/` | per-vertex **absolute** thickness difference map. |
| 2 | `<hemi>.thickness_diff_<subjscan1>_to_<subjscan2>.log` | `<subjscan1>/surf/` | `mris_thickness_diff` log. |
| 3 | `<subjscan1>_<hemi>_thickness_diff_<subjscan1>_to_<subjscan2>_resampled_to_<commonsubj>.mgh` | `groupstudy/` | the difference map resampled onto the template. |
| 3 | `resampled` | current working directory | a text file to which the resampled output path is **appended** (the list consumed by step 4). |
| 4 | `<hemi>_mean_60.mgh`, `<hemi>_absmean_60.mgh`, `<hemi>_absstd_60.mgh`, `pair1_<hemi>_std_60.mgh` | `groupstudy/` | group-wise smoothed (60-iter) mean / abs-mean / abs-std / std maps across all rows of `resampled`. |

### Output Specifications

The thickness difference map (step 2) and all downstream maps are
**one-value-per-vertex** surface overlays in `.mgh` (curv-style). Step 2 emits the
**absolute** thickness difference (the `-abs` flag), so the map is non-negative.
Step 3 places it on the template's vertex grid; step 4's outputs are smoothed
group statistics on that same grid (see [[fsaverage]] for the template surface,
and [[mris_surface_stats]] for the exact statistics). The LTA from step 1 is a
linear transform in [[lta-format]].

## Mathematical Foundations

`thickdiffmap` performs no math itself; every quantitative operation is delegated.

> [!math] What each step computes (in its helper)
> - **Step 1 — rigid alignment:** a 9-DOF FLIRT registration with the
>   correlation-ratio cost (`-dof 9 -cost corratio`,
>   [`scripts/thickdiffmap:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L52-L53)), yielding scan1→scan2 as an LTA.
> - **Step 2 — thickness difference:** [[mris_thickness_diff]] applies that
>   transform (`-xform`) and computes the per-vertex difference between the two
>   `?h.thickness` curvs (`-src_type curv`), here as the **absolute** value
>   (`-abs`) with no smoothing (`-nsmooth 0`,
>   [`scripts/thickdiffmap:65-76`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L65-L76)).
> - **Step 3 — resampling:** [[mri_surf2surf]] maps the difference from
>   `subjscan1` to the template through the spherical registration
>   (`--surfreg sphere.reg`).
> - **Step 4 — group stats:** [[mris_surface_stats]] smooths by 60 iterations
>   and writes mean, abs-mean, abs-std (and a `std`) across the accumulated maps
>   ([`scripts/thickdiffmap:108-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L108-L115)).

> [!internal] All computation is in the called tools
> See [[mris_thickness_diff]] for the difference algorithm and how the linear
> transform is applied to the thickness sampling, and [[mris_surface_stats]] for
> the smoothing and the mean/std definitions.

## Configuration Options

`thickdiffmap` has **no option flags** — behaviour is fixed by the four
positional arguments and the step list. The configurable surface choices
(`-abs`, `-nsmooth 0`, `-dof 9`, `-nsmooth 60`, etc.) are **hardcoded** in the
helper invocations and are not exposed on `thickdiffmap`'s command line.

| "Option" | Where set | Effect |
|----------|-----------|--------|
| step `1` | argument | run rigid alignment ([[fsl_rigid_register]]). |
| step `2` | argument | run thickness-difference computation ([[mris_thickness_diff]]). |
| step `3` | argument | resample difference map to the template ([[mri_surf2surf]]). |
| step `4` | argument | compute group statistics ([[mris_surface_stats]]). |
| `-abs` (thickness diff) | hardcoded ([`scripts/thickdiffmap:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L70)) | difference map is absolute-valued. |
| `-dof 9 -cost corratio` | hardcoded ([`scripts/thickdiffmap:52-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L52-L53)) | FLIRT registration parameters. |
| `-nsmooth 60` (group stats) | hardcoded ([`scripts/thickdiffmap:109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L109)) | smoothing for the group maps. |

### Configuration Interactions

> [!gotcha] Steps are order-sensitive and stateful via the `resampled` file
> The steps form a pipeline: 2 needs the LTA from 1, 3 needs the diff map from 2,
> 4 reads the `resampled` list that 3 **appends** to. Running step 4 alone
> consumes whatever `resampled` currently holds — including paths appended by
> *previous* invocations on other subject pairs. This is the intended mechanism
> for accumulating a cohort (run steps 1–3 per pair, then step 4 once), but it
> means the working directory's `resampled` file is shared mutable state.

> [!gotcha] `resampled` is a relative path in the current directory
> Step 3 writes to `./resampled` and step 4 reads `./resampled`
> ([`scripts/thickdiffmap:96,107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L96)). You must run all related
> invocations from the **same working directory**, and clear/rotate `resampled`
> between independent cohorts.

## Typical Use Cases

### 1. Full single-pair run

```bash
# All four steps for one subject pair onto fsaverage, left hemisphere.
thickdiffmap subj1 subj1a fsaverage lh 1 2 3
```

(The built-in example runs steps 1–3; step 4 is added once the cohort is built.)

### 2. Accumulate a cohort, then summarise

```bash
cd /path/to/groupwork        # resampled list lives here
rm -f resampled              # start a fresh cohort
foreach pair ( "s1 s1a" "s2 s2a" "s3 s3a" )
  set a = ($pair)
  thickdiffmap $a[1] $a[2] fsaverage lh 1 2 3
end
# Now compute group mean/std across all three pairs:
thickdiffmap s1 s1a fsaverage lh 4
```

### 3. Re-run only the difference step

```bash
# After editing thickness, recompute just step 2 (step 1 LTA already exists).
thickdiffmap subj1 subj1a fsaverage lh 2
```

## Pipeline Context

`thickdiffmap` is a **standalone longitudinal** post-processing driver. It is
**not** part of [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** two completed [[wiki/pipelines/recon-all|recon-all]] subjects
(repeat scans) → **thickdiffmap** (FLIRT → thickness diff → resample → group
stats) → **Successor:** surface-based group statistical analysis (e.g.
[[mri_glmfit]] on the resampled maps, or direct inspection of the step-4 mean/std
overlays).

Internally it is a sequence of four tools: [[fsl_rigid_register]] →
[[mris_thickness_diff]] → [[mri_surf2surf]] → [[mris_surface_stats]]. It is an
alternative, surface-thickness-specific workflow to the general
[[longitudinal-processing]] stream.

## Gotchas and Caveats

> [!gotcha] `-ef` shebang: aborts on the first failing command
> The script starts `#!/bin/tcsh -ef` ([`scripts/thickdiffmap:1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L1)). The
> `-e` means any command exiting non-zero terminates the whole script
> immediately, with no cleanup or error message of its own. There is no
> `error_exit` handler; a failed FLIRT/`mris_thickness_diff` just stops the run.

> [!gotcha] Step 4 hardcodes `lh.white` and a `pair1_` prefix
> The group-stats surface is `${templsubj}/surf/lh.white` regardless of the
> `hemi` argument, and one output is literally `pair1_${hemi}_std_60.mgh`
> ([`scripts/thickdiffmap:110-111`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L110-L111)). For `rh` runs the statistics are
> still computed on the **left** template surface. Treat this script as a
> template/example to adapt rather than a polished multi-hemisphere tool.

> [!gotcha] Outputs land in a fixed `groupstudy/` directory
> Steps 3 and 4 write to `$SUBJECTS_DIR/groupstudy/`
> ([`scripts/thickdiffmap:92,98,111-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L92)), created on demand. All pairs and
> hemispheres share this directory; filenames disambiguate by subject/hemi but the
> location is not configurable.

> [!gotcha] Difference map is absolute-valued
> Because step 2 uses `-abs`, the map records the **magnitude** of thickness
> change, not its sign — you cannot distinguish thinning from thickening from this
> output alone.

## Error Compensation and Guard Rails

- **Argument-count check.** Fewer than 5 arguments prints the usage and exits 1
  ([`scripts/thickdiffmap:3-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L3-L19)). There are no other input validations —
  missing files surface as errors from the helper tools.
- **Abort-on-error via `-e`.** The shell-level `-e` flag is the only error
  handling; the script has no explicit status checks after each command.
- **Idempotent directory creation.** `mkdir -p $SUBJECTS_DIR/groupstudy` is safe
  to re-run ([`scripts/thickdiffmap:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L98)). The `resampled` list, however, is
  **appended** to, not overwritten — clear it manually between cohorts.

## Related Tools

- [[mris_thickness_diff]] — the core per-vertex thickness-difference computation (step 2).
- [[mris_surface_stats]] — group mean/std smoothing of the resampled maps (step 4).
- [[mri_surf2surf]] — resamples the difference map onto the template surface (step 3).
- [[fsl_rigid_register]] — the FSL FLIRT wrapper that rigidly aligns the two scans (step 1).
- [[longitudinal-processing]] — the general FreeSurfer longitudinal stream; an alternative way to measure within-subject thickness change.
- [[fsaverage]] — the usual `commonsubj` template.

## Confidence and Gaps

**High confidence:** the positional-argument interface, the step→tool mapping,
every hardcoded helper flag, the output filenames, and the stateful `resampled`
accumulation — all read directly from
[`scripts/thickdiffmap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap).

> [!gap] Hemisphere/multi-pair rough edges in step 4
> Step 4's hardcoded `lh.white` surface and `pair1_` output prefix mean the
> group-stats stage was clearly written for a specific study layout. Behaviour
> for `rh` cohorts and for many pairs is reasoned from the code, not exercised;
> adapt the script for production multi-hemisphere use.

## References

- FreeSurfer source: [`scripts/thickdiffmap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap) (v8.2.0).
- Built-in usage: `thickdiffmap` with no arguments ([`scripts/thickdiffmap:3-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/thickdiffmap#L3-L19)).
- Component tools: [[mris_thickness_diff]], [[mris_surface_stats]], [[mri_surf2surf]], [[fsl_rigid_register]].
