---
title: "vol2symsurf"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/vol2symsurf"
families: []                     # standalone symmetric-surface sampling driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[mris_apply_reg]]"
  - "[[mris_fwhm]]"
  - "[[surfreg]]"
  - "[[fscalc]]"
  - "[[reg2subject]]"
  - "[[fsaverage]]"
  - "[[xhemireg]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --fmt flag stores its value in `ofmt`, but the script uses `outfmt` (derived from the input extension); --fmt therefore appears to have no effect. The --lh/--rh flags set `hemilist`, which is never read (both hemispheres are always processed). Both read from source, not exercised."
tags:
  - surface
  - symmetric
  - fsaverage_sym
  - laterality
  - xhemi
  - sampling
---

# vol2symsurf

## Summary

`vol2symsurf` samples a volume onto the left–right symmetric surface template `fsaverage_sym` so that the left and right hemispheres of a subject end up in vertex-to-vertex correspondence. It first projects the volume onto the subject's own left and right cortical surfaces (default projection fraction 0.5), then resamples both onto the **left** hemisphere of `fsaverage_sym` — directly for the left hemi, and via the `xhemi` (mirrored) registration for the right hemi. Optionally it surface-smooths the result and computes a left-minus-right difference map or a laterality index. The output is one overlay per hemisphere on the symmetric template, plus (by default) the lh–rh contrast. It is a tcsh front end over [[mri_vol2surf]], [[mris_apply_reg]], [[mris_fwhm]], and [[fscalc]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vol2symsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf)
- **Binary/script location:** `$FREESURFER_HOME/bin/vol2symsurf`
- **Key helpers invoked:** [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L84) (volume→native surface), [`mris_apply_reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L100) (native surface→`fsaverage_sym`), [`mris_fwhm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L108) (optional surface smoothing), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L111) (no-smoothing copy/format), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L125) (lh–rh difference / LI), and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L212).

## Purpose and Context

Studying **hemispheric asymmetry** of a functional or quantitative measure requires putting the two hemispheres into a common coordinate frame so that homologous points can be compared. FreeSurfer provides `fsaverage_sym`, a single template that is symmetric across the midline; mapping both hemispheres onto its left hemisphere (using the `xhemi` cross-hemisphere registration for the right) yields vertex-for-vertex correspondence between left and right.

`vol2symsurf` packages that workflow for *volume* inputs (e.g. a fMRI statistical map or a quantitative map already registered to the subject's anatomy). It samples the volume onto the cortex, transports both hemispheres to the symmetric template, and forms the asymmetry contrast in a single call. It is a manual analysis tool and is **not** part of [[wiki/pipelines/recon-all|recon-all]].

The required `fsaverage_sym` surface registrations are produced once per subject by [[surfreg]] (see prerequisites below). Building them takes a couple of hours but only needs to be done once.

> [!gotcha] Symmetry is what makes "lh vs rh" meaningful
> Because `fsaverage_sym` is left–right symmetric, sampling onto its left hemi is
> equivalent regardless of which subject hemisphere you started from; that is
> exactly the property that lets the script subtract the two hemispheres
> vertex-by-vertex ([`scripts/vol2symsurf:379-388`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L379-L388)).

## Inputs

### Required Inputs

- **Input volume** (`--i`, alias `--f`) — the volume to sample onto the surface (e.g. a functional statistic or quantitative map). Existence is checked at parse time ([`scripts/vol2symsurf:215-223`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L215-L223)).
- **A volume→anatomy registration** — either `--reg` (a registration whose subject is read with [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L212)) **or** `--regheader <subject>` (treat the volume header as already registered to that subject's anatomy). Exactly one is required ([`scripts/vol2symsurf:299-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L299-L306)).

### Prerequisite surface registrations

> [!assumption] Subject must be registered to `fsaverage_sym` (both normal and xhemi)
> The script requires these files to exist
> ([`scripts/vol2symsurf:321-342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L321-L342)):
> - `$SUBJECTS_DIR/<subj>/surf/<symhemi>.fsaverage_sym.sphere.reg`
> - `$SUBJECTS_DIR/<subj>/xhemi/surf/<symhemi>.fsaverage_sym.sphere.reg`
> - `$SUBJECTS_DIR/fsaverage_sym/surf/<symhemi>.sphere.reg`
>
> If the subject registrations are missing it tells you to run
> `surfreg --s <subj> --t fsaverage_sym --lh` and the `--xhemi` variant. `fsaverage_sym`
> must be present in `$SUBJECTS_DIR` (it ships with FreeSurfer).

### Input Assumptions

> [!assumption] Cortical sampling at projfrac 0.5
> The volume is sampled at a single cortical depth, the mid-thickness
> (`--projfrac .5` by default), restricted to the cortex label (`--cortex`)
> ([`scripts/vol2symsurf:84-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L84-L85)). The input is therefore expected to be
> a cortical contrast already in register with the subject anatomy via `--reg`.

## Outputs

### Files Created

With output stem `S`, output format `F` (the input's extension by default — see gotcha), and `symhemi` (`lh` by default), the script writes:

| File | Set by | Contents |
|------|--------|----------|
| `S.lh.F` | always | input sampled to `fsaverage_sym` from the subject's **left** hemisphere |
| `S.rh.F` | always | input sampled to `fsaverage_sym` from the subject's **right** hemisphere (via xhemi) |
| `S.lh-rh.F` | default (`--no-diff` to suppress) | simple left-minus-right difference |
| `S.li.lh-rh.F` | `--li` (replaces the simple difference) | laterality index $(lh-rh)/(lh+rh)$ |
| `<stem>.vol2symsurf.log` | always | run log |

The default stem encodes the smoothing and template:
`<funcstem>.fsaverage_sym.sm<FWHM>.<symhemi>` ([`scripts/vol2symsurf:314-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L314-L318)). For example, with
`--fwhm 7`, default output names are `func.fsaverage_sym.sm07.lh.lh.nii`,
`...lh.rh.nii`, and `...lh.lh-rh.nii`.

### Output Specifications

Each overlay is a surface scalar field on the `fsaverage_sym` left hemisphere (one value per vertex, per frame if the input is 4D). Both hemispheres share the same vertex indexing, so `S.lh.F` and `S.rh.F` are directly comparable. The lh–rh and LI maps are produced by [[fscalc]] from those two files.

## Mathematical Foundations

The only explicit arithmetic is the asymmetry contrast formed by [[fscalc]].

> [!math] Difference and laterality index
> With per-vertex left and right values $L$ and $R$:
> - **Simple difference** (default): $D = L - R$, via [`fscalc $lhout sub $rhout`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L129).
> - **Laterality index** (`--li`): $\text{LI} = (L-R)/(L+R)$. The script computes it
>   as [`fscalc $lhout pctdiff $rhout div 200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L125),
>   exploiting `pctdiff(L,R) = 200\,(L-R)/(L+R)` so that dividing by 200 yields the
>   standard LI in $[-1, 1]$.

> [!internal] Surface resampling and smoothing math live elsewhere
> The volume→surface projection (with `--projfrac`) is in [[mri_vol2surf]]; the
> spherical resampling between surfaces in [[mris_apply_reg]]; and the
> geodesic/iterative surface smoothing (`--fwhm`) in [[mris_fwhm]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser ([`scripts/vol2symsurf:168-287`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L168-L287)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i`<br>`--f` | string | *(required)* | Input volume to sample onto the surface. |
| `--reg` | string | *(required\*)* | Volume→anatomy registration; subject read from it. (\*or `--regheader`.) |
| `--regheader`<br>`--reg-header`<br>`--init-header` | string (subject) | off | Treat the volume header as registered to `<subject>`'s anatomy (no `--reg`). |
| `--o` | string | auto (`<funcstem>.fsaverage_sym.sm<FWHM>.<symhemi>`) | Output stem (hemi + format are appended). |
| `--fwhm` | float (mm) | `0` (none) | Surface-smooth each hemisphere by this FWHM via [[mris_fwhm]]. |
| `--projfrac` | float | `0.5` | Cortical sampling depth as a fraction of thickness ([[mri_vol2surf]] `--projfrac`). |
| `--sym-lh` | bool | **on** | Use the **left** hemi of `fsaverage_sym` as the symmetric target. |
| `--sym-rh` | bool | off | Use the **right** hemi of `fsaverage_sym` as the symmetric target. |
| `--no-diff` | bool | off (difference **on**) | Do not compute the lh–rh contrast. |
| `--li` | bool | off | Compute the laterality index $(lh-rh)/(lh+rh)$ instead of the simple difference. |
| `--no-li` | bool | on | Use the simple difference (cancels `--li`). |
| `--lh` | bool | (no effect) | Sets an unused `hemilist`; both hemispheres are always processed — see gotcha. |
| `--rh` | bool | (no effect) | As above. |
| `--fmt` | string | (no effect) | Stored in `ofmt`, which the script never reads — see gap. |
| `--log` | string | `<stem>.vol2symsurf.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Use a named temp directory and **do not** clean it up. |
| `--nocleanup` | bool | off | Keep the temporary directory. |
| `--cleanup` | bool | **on** | Remove the temporary directory when done. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version string and exit. |

### Configuration Interactions

> [!gotcha] `--reg` and `--regheader` are mutually exclusive
> Supplying both is a hard error ("cannot spec both --reg and --regheader",
> [`scripts/vol2symsurf:303-306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L303-L306)); supplying neither also errors.
> With `--reg` the subject comes from the registration; with `--regheader` you
> name the subject explicitly.

> [!gotcha] `--lh`/`--rh` do nothing — both hemispheres are always processed
> The hemisphere loop is hard-coded to `foreach hemi (lh rh)`
> ([`scripts/vol2symsurf:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L80)); the `hemilist` set by `--lh`/`--rh`
> is never consulted. You cannot restrict the run to a single source hemisphere
> with these flags. (This is inherent to producing the lh–rh contrast.)

> [!gotcha] `--fmt` has no effect; output format follows the input extension
> `--fmt` writes to variable `ofmt`, but the actual format `outfmt` is derived
> from the input volume's extension
> ([`scripts/vol2symsurf:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L313)) and `ofmt` is never read. To control
> the output format, give the input a file with the desired extension or set the
> output stem accordingly.

> [!gotcha] `--li` overrides the difference, `--no-diff` overrides everything
> If `--no-diff` is set, no contrast (difference or LI) is written, regardless of
> `--li` ([`scripts/vol2symsurf:119-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L119-L134)). Otherwise `--li` selects the LI form
> and `--no-li` the simple difference.

## Typical Use Cases

### 1. Asymmetry of a functional map (with smoothing)

```bash
vol2symsurf --reg register.dat --i func.nii --fwhm 7
# → func.fsaverage_sym.sm07.lh.lh.nii
#   func.fsaverage_sym.sm07.lh.rh.nii
#   func.fsaverage_sym.sm07.lh.lh-rh.nii
```

Samples `func.nii` onto both hemispheres of `fsaverage_sym`, smooths by 7 mm
FWHM, and writes the simple lh–rh difference.

### 2. Laterality index instead of a raw difference

```bash
vol2symsurf --reg register.dat --i func.nii --fwhm 7 --li
# → ... func.fsaverage_sym.sm07.lh.li.lh-rh.nii
```

Produces the bounded laterality index $(lh-rh)/(lh+rh)$ in place of the simple
difference.

### 3. Header-registered input, no asymmetry contrast

```bash
# Input already in the subject's anatomical space; just transport both hemis.
vol2symsurf --regheader subj01 --i qmap.mgz --no-diff --o qmap.sym
# → qmap.sym.lh.mgz, qmap.sym.rh.mgz
```

## Pipeline Context

`vol2symsurf` is a stand-alone analysis utility; it is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or [[trac-all]] (it appears only in
`scripts/CMakeLists.txt`).

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] for the subject, then
[[surfreg]] to register the subject to `fsaverage_sym` (both standard and
`--xhemi`, the latter relying on [[xhemireg]]), plus a volume→anatomy
registration ([[bbregister]]/[[mri_coreg]]) → **vol2symsurf** → **Successors:**
group analysis of the symmetric overlays or the lh–rh/LI maps (e.g.
[[wiki/tools/mri_glmfit|mri_glmfit]]).

It is the surface analogue of the volumetric sampling tools [[vol2subfield]] and
[[vol2segavg]]; here the resampling target is a symmetric *surface* template
rather than a volume segmentation.

## Gotchas and Caveats

> [!gotcha] Right hemi always uses the xhemi registration
> For the right hemisphere the source registration is taken from
> `$SUBJECTS_DIR/<subj>/xhemi/surf/...` rather than `surf/...`
> ([`scripts/vol2symsurf:95-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L95-L99)). Both hemispheres are mapped using
> `<symhemi>.fsaverage_sym.sphere.reg` (with `symhemi = lh` by default), which is
> what brings them into mutual vertex correspondence.

> [!gotcha] Smoothing happens on the symmetric template, after resampling
> When `--fwhm` > 0, [[mris_fwhm]] smooths on `fsaverage_sym`/`<symhemi>`
> *after* the data have been transported there
> ([`scripts/vol2symsurf:107-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L107-L112)); with `--fwhm 0` the data are merely
> format-converted with [[mri_convert]].

## Error Compensation and Guard Rails

- **Existence checks.** The input volume and (for `--reg`) the registration are
  checked at parse time; the subject directory and all three required
  `fsaverage_sym` sphere registrations are checked before processing
  ([`scripts/vol2symsurf:307-342`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L307-L342)).
- **Actionable error messages.** Missing subject↔`fsaverage_sym` registrations
  print the exact `surfreg` command (with and without `--xhemi`) needed to create
  them ([`scripts/vol2symsurf:327-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L327-L341)).
- **Fail-fast.** Each sub-command checks `$status` and jumps to `error_exit`,
  which prints the failing command and reminds the user to include the log file
  when reporting to the FreeSurfer list.
- **Default output naming.** If `--o` is omitted, a descriptive stem encoding the
  template, FWHM, and target hemi is generated automatically.

## Related Tools

- [[mri_vol2surf]] — samples the volume onto the subject's native cortical surface.
- [[mris_apply_reg]] — resamples a native-surface overlay onto `fsaverage_sym`.
- [[mris_fwhm]] — surface smoothing on the symmetric template.
- [[fscalc]] — forms the lh–rh difference or the laterality index.
- [[surfreg]] — creates the required subject↔`fsaverage_sym` registrations (standard and xhemi).
- [[xhemireg]] — produces the mirrored (`xhemi`) hemisphere used for the right side.
- [[reg2subject]] — reads the subject name from `--reg`.
- [[fsaverage]] — background on FreeSurfer average/template surfaces, including `fsaverage_sym`.
- [[vol2subfield]], [[vol2segavg]] — volumetric counterparts of this surface-sampling utility.

## Confidence and Gaps

**High confidence:** complete flag set, the two-stage sampling (native surface →
`fsaverage_sym`, with xhemi for the right hemi), the difference/LI math, the
prerequisite registrations, default output naming, and the guard rails — read
directly from [`scripts/vol2symsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf).

> [!gap] `--fmt` and `--lh`/`--rh` are inert
> `--fmt` stores into `ofmt`, which is never used (the real format `outfmt` comes
> from the input extension, [`scripts/vol2symsurf:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L313)), and
> `--lh`/`--rh` set an unread `hemilist` while the loop always processes both
> hemispheres ([`scripts/vol2symsurf:80`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L80)). These appear to be source
> oversights; behaviour read from source, not exercised.

## References

- FreeSurfer source: [`scripts/vol2symsurf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf) (v8.2.0).
- Built-in help: `vol2symsurf --help` (the `BEGINHELP` block, [`scripts/vol2symsurf:377-410`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vol2symsurf#L377-L410)).
- `fsaverage_sym` and cross-hemisphere analysis: Greve, D. N., et al. "A surface-based analysis of language lateralization and cortical asymmetry." *J. Cogn. Neurosci.* 25(9), 2013.
