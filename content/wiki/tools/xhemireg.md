---
title: "xhemireg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh
source_files:
  - "scripts/xhemireg"
families: []                     # standalone cross-hemisphere tool (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[surfreg]]"
  - "[[xhemi-tal]]"
  - "[[mri_vol2vol]]"
  - "[[mri_surf2surf]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[lta_convert]]"
  - "[[mri_coreg]]"
  - "[[make_folding_atlas]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Talairach handling is split across three modes (--tal-compute via rca-talairach, --tal-estimate via mri_coreg --lrrev, and the dedicated xhemi-tal script); only the script-level orchestration was traced, not the rca-talairach internals."
  - "The --gcaprep branch (symmetric GCA atlas training) sets DoTal but the running code keys on DoComputeTal/DoEstimateTal; the exact talairach behaviour in gcaprep mode is ambiguous in the source."
tags:
  - cross-hemisphere
  - xhemi
  - symmetry
  - registration
  - left-right
  - fsaverage_sym
---

# xhemireg

## Summary

`xhemireg` builds a **left-right mirror-reversed** copy of a FreeSurfer subject so
that the two hemispheres can be compared, averaged, or registered in a common
**symmetric** frame. It creates a `xhemi/` sub-subject in which the source
hemisphere's volumes, surfaces, overlays, labels, and annotations have been
flipped across the L-R axis and re-tagged with the opposite hemisphere name (so a
flipped `lh` becomes `rh` and vice versa). Optionally it recomputes the Talairach
registration and runs surface-based registration to the symmetric template
`fsaverage_sym`, producing the `xhemi.reg` / `sphere.reg` needed for
inter-hemispheric and symmetric-atlas analyses. It is the foundation of
FreeSurfer's cross-hemisphere ("xhemi") workflow and of symmetric folding-atlas
construction.

## Source Information

- **Language:** csh shell script (`#!/bin/csh -f`)
- **Source file:** [`scripts/xhemireg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg)
- **Binary/script location:** `$FREESURFER_HOME/bin/xhemireg`
- **Key FreeSurfer tools invoked:** [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L137), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L170), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L179) (`--left-right-swap-label`), [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L112) (`--orientation`), [`mri_surf2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L269), [`mri_coreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L216) (`--lrrev`), `rca-talairach`, `rca-surfreg`, `mri_concatenate_lta`, and `UpdateNeeded`/`getfullpath`.

## Purpose and Context

Many neuroimaging questions are about **hemispheric asymmetry** or require pooling
the two hemispheres into one model. FreeSurfer answers these with a symmetric
template, `fsaverage_sym`, onto which both hemispheres of a subject can be
registered. To get there you first need a mirror-image version of the subject so
that, e.g., the left hemisphere can be treated as a right hemisphere on the same
template. `xhemireg` produces exactly that mirror copy:

- It computes an L-R reversal registration from the volume orientation (no
  external registration needed), applies it to the anatomical volumes and to the
  surfaces, **swaps left/right label codes** in the segmentations, and copies the
  scalar overlays/labels/annotations to the opposite hemisphere.
- It then (optionally) recomputes Talairach and runs surface registration so the
  flipped hemisphere lands on `fsaverage_sym`.

`xhemireg` is **not** part of [[wiki/pipelines/recon-all|recon-all]]. It is run
after a normal recon, and is the workhorse behind two higher-level tools:
[[surfreg]] (which calls `xhemireg --s $subject` automatically when the `--xhemi`
flag is used and the `xhemi/` directory is missing, [`scripts/surfreg:67-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L67-L68))
and [[make_folding_atlas]] (which runs `xhemireg` per subject when building a
symmetric folding atlas, [`scripts/make_folding_atlas:103-105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L103-L105)). It is also
used to create symmetric GCA atlases (`--gcaprep`).

## Inputs

### Required Inputs

- **Subject ID** (`--s subject`) — an existing recon under `$SUBJECTS_DIR`
  containing the volumes, surfaces, overlays, labels, and annotations to be
  flipped. The subject directory must exist ([`scripts/xhemireg:448-451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L448-L451)).
- **Hemisphere(s)** — `--lh`, `--rh`, or `--hemi <hemi>`; defaults to doing both
  `lh` and `rh` ([`scripts/xhemireg:453`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L453)). A flipped `lh` is written as `rh` and
  vice versa.

The specific volumes (`orig`, `T1`, `brain`, `brainmask`, `norm`, `aseg`,
`aseg.presurf`, `aparc+aseg`, `nu`), surfaces (`orig`, `white`, `pial`,
`smoothwm`, `sphere`, `inflated`), overlays, labels, and annotations are
hard-coded lists ([`scripts/xhemireg:37-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L37-L46)); missing items are skipped with a
warning rather than treated as errors.

### Input Assumptions

> [!assumption] A completed recon with a known orientation
> `xhemireg` expects a finished FreeSurfer subject and reads the **voxel
> orientation** of `mri/orig.mgz` ([[mri_info]] `--orientation`) to decide which
> axis to flip ([`scripts/xhemireg:112-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L112-L120)). The L-R axis is detected from the
> orientation string, so the input must have a valid header; conformed
> (LIA/256³) data is the normal case. Segmentations are flipped with
> nearest-neighbour interpolation and have their L/R label codes swapped.

## Outputs

### Files Created

By default everything is written to `$SUBJECTS_DIR/<subject>/xhemi/`
(override with `--o`). The directory is laid out like a mini subject
(`mri/`, `mri/transforms/`, `surf/`, `label/`, `scripts/`).

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `lrrev.register.dat`, `lrrev.register.lta` | `xhemi/` | the left-right reversal registration (with the 0.5-voxel centering term) |
| `lrrev.pure.register.dat` | `xhemi/` | the "pure" reversal (no centering term), used for `sphere`/`inflated` |
| `mri/<vol>.mgz` | `xhemi/mri/` | each anatomical volume reversed via [[mri_vol2vol]] (nearest interp); segmentations additionally L/R-label-swapped |
| `mri/transforms/talairach.xfm`(`.lta`) | `xhemi/mri/transforms/` | Talairach registration for the flipped subject (recomputed or estimated) |
| `surf/<trghemi>.<surf>` | `xhemi/surf/` | each surface reversed and renamed to the opposite hemisphere via [[mri_surf2surf]] |
| `surf/<trghemi>.<ov>` | `xhemi/surf/` | scalar overlays (curv, sulc, area, thickness, …) copied to the opposite hemisphere |
| `label/<trghemi>.<label>.label`, `label/<trghemi>.<annot>.annot` | `xhemi/label/` | labels and annotations copied to the opposite hemisphere |
| `surf/<trghemi>.sphere.reg` | `xhemi/surf/` | surface registration to `fsaverage_sym` (only with `--reg`) |
| `xhemireg.<srchemi>.log` | `xhemi/` (or `--o`) | per-hemisphere log |
| **`--gcaprep` extras** | `xhemi/mri/transforms/` | `reg.lrrev-to-norev.lta`, `<xfm>.lta`, `<xfm>` for symmetric GCA training |

### Output Specifications

The reversed volumes are [[mgz]] sharing the original geometry (the reversal is an
affine, applied with `--keep-precision`). Surfaces are standard
[[surface-format]] in the flipped subject's frame. The reversal registration is
stored as an [[lta-format]] transform. Crucially the output hemisphere name is the
**opposite** of the source (flipping `lh` writes `rh.*` files), which is what lets
both hemispheres be analysed as if they were the same side on `fsaverage_sym`.

## Mathematical Foundations

> [!math] Left-right reversal registration
> The reversal is encoded as a tkreg `register.dat` whose linear part flips the
> sign of the L-R voxel axis. `xhemireg` picks the axis from the orientation of
> `orig.mgz`: whichever of the three axes is L or R gets sign $-1$, the others
> $+1$ ([`scripts/xhemireg:108-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L108-L120)). Two variants are built:
> $$ M_\text{reg} = \begin{pmatrix} s_x & 0 & 0 & 1\\ 0 & s_y & 0 & 0\\ 0 & 0 & s_z & 0\\ 0 & 0 & 0 & 1\end{pmatrix}, \qquad
>    M_\text{pure} = \begin{pmatrix} s_x & 0 & 0 & 0\\ 0 & s_y & 0 & 0\\ 0 & 0 & s_z & 0\\ 0 & 0 & 0 & 1\end{pmatrix} $$
> with $s\in\{+1,-1\}$. $M_\text{reg}$ (the `1` in the top-right column is a
> half-voxel centering offset — "the same as `--left-right-reverse-pix`") is
> applied to volumes and to most surfaces; $M_\text{pure}$ (no offset) is applied
> to the `sphere` and `inflated` surfaces, which are centred at the origin
> ([`scripts/xhemireg:122-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L122-L152), [`:272-276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L272-L276)).

> [!math] Label-code swapping
> A geometric flip alone leaves segmentation labels semantically wrong (a flipped
> left-thalamus voxel still carries the left-thalamus code). For `aseg`,
> `aseg.presurf`, `aparc+aseg`, `wmparc`, and `aparc.a2009s+aseg`, `xhemireg`
> therefore runs [`mri_convert --left-right-swap-label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L177-L183) to exchange the
> left/right code pairs after the geometric reversal.

> [!internal] Surface transfer
> Surfaces are reversed and copied to the opposite hemisphere by
> [`mri_surf2surf --sval-xyz/--tval-xyz`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L269-L276) with the reversal registration as
> `--reg`. The Talairach-estimate path uses [`mri_coreg --lrrev`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L216), which
> derives an approximate registration for a left-right-reversed image. See
> [[mri_surf2surf]], [[mri_coreg]], and [[xhemi-tal]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/xhemireg:332-435`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L332-L435)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--lh` | bool | (both) | Flip the left hemisphere (map left → right). |
| `--rh` | bool | (both) | Flip the right hemisphere (map right → left). |
| `--hemi` | string | (both) | Flip the named hemisphere (`lh` or `rh`). Default is to do both. |
| `--o` | string | `<subject>/xhemi` | Output directory for the mirror sub-subject. |
| `--reg` | bool | off | After flipping, run surface-based registration ([`rca-surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L313)) to create `<hemi>.sphere.reg` on `fsaverage_sym`. |
| `--noreg`<br>`--no-reg` | bool | on | Do not run surface registration (default). |
| `--tal-compute` | bool | **on** | Recompute the Talairach registration for the flipped subject by actually registering (`rca-talairach --s <subject>/xhemi`). |
| `--no-tal`<br>`--no-tal-compute` | bool | — | Skip Talairach registration. |
| `--tal-estimate` | bool | off | Estimate the flipped Talairach from the **unflipped** one with [[mri_coreg]] `--lrrev` (faster, and better when a non-recon-all process produced the original xfm). Implies `--no-tal-compute`. |
| `--no-tal-estimate` | bool | on | Do not use the estimate path. |
| `--all-vol` | bool | off | Flip **every** `*.mgz`/`*.mgh` in `mri/` (auto-discovered) rather than the fixed volume list; also disables `--reg`. |
| `--zilles` | bool | off | Use a reduced volume list (`orig T1 brain brainmask nu norm`); disables `--reg`. |
| `--avgsubject`<br>`--avgeragesubject`<br>`--avgerage-subject` | bool | off | Volume list tuned for [[make_average_subject]] (`orig T1 brain brainmask aseg aparc+aseg`); disables `--reg`. (Note the misspelled aliases are the only spellings the code accepts.) |
| `--gcaprep` | `seg xfm` | off | Prepare data for **symmetric GCA atlas** training: flip `orig T1 nu brainmask <seg>`, build a registration of the reversed brainmask back to the un-reversed via [[mri_coreg]], and emit the corresponding `.lta`/`.xfm` (see `gcaprepone`). |
| `--threads` | int | `1` | Threads — **only** used by the `--gcaprep` `mri_coreg` and the `--reg` surfreg. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print help and exit. |

### Configuration Interactions

> [!gotcha] The three Talairach modes are mutually exclusive
> `--tal-compute` (recompute by registration, the default), `--tal-estimate`
> (derive from the unflipped xfm via `mri_coreg --lrrev`), and `--no-tal-compute`
> (skip) select different code paths via the `DoComputeTal`/`DoEstimateTal`
> flags. `--tal-estimate` explicitly turns `DoComputeTal` off
> ([`scripts/xhemireg:415-418`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L415-L418)). The estimate path is faster and is preferable
> when the original Talairach was produced outside recon-all. The dedicated
> [[xhemi-tal]] script implements the same idea as a standalone tool.

> [!gotcha] Volume-list presets disable surface registration
> `--all-vol`, `--zilles`, and the `--avgsubject` aliases all set `DoReg = 0`
> ([`scripts/xhemireg:358-391`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L358-L391)). They are for volume-only mirroring (e.g. feeding
> [[make_average_subject]]); to also build `sphere.reg` you must run a normal
> invocation with `--reg`.

> [!gotcha] `--threads` only helps `--gcaprep` and `--reg`
> The thread count is passed only to the `mri_coreg` in the `--gcaprep` branch
> and to `rca-surfreg` under `--reg`; the volume/surface flipping itself is
> single-threaded, so `--threads` has no effect on a plain mirror run
> ([`scripts/xhemireg:381-384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L381-L384), help [`:487`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L487)).

## Typical Use Cases

### 1. Create the xhemi mirror for cross-hemisphere registration

```bash
# Make the lh->rh and rh->lh mirror sub-subject, then register to fsaverage_sym.
xhemireg --s sub01 --reg
# (Usually you let surfreg do this for you: surfreg --s sub01 --t fsaverage_sym --xhemi --lh)
```

### 2. Volume-only mirror for an average subject

```bash
xhemireg --s sub01 --avgsubject     # flips a minimal volume set, no surfreg
```

### 3. Estimate Talairach instead of recomputing

```bash
xhemireg --s sub01 --tal-estimate --reg
```

Derives the flipped Talairach from the existing one (fast) rather than
re-registering to the MNI305 template.

## Pipeline Context

`xhemireg` is a **post-recon, cross-hemisphere preparation** tool. It is not
called by [[wiki/pipelines/recon-all|recon-all]] or trac-all, but it is called by:

- [[surfreg]] — when `--xhemi` is requested and `xhemi/` does not yet exist,
  surfreg runs `xhemireg --s <subject>` automatically before registering the
  flipped hemisphere to `fsaverage_sym` ([`scripts/surfreg:66-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L66-L68)).
- [[make_folding_atlas]] — runs `xhemireg` per subject (and then xhemi surfreg)
  while building a symmetric folding atlas ([`scripts/make_folding_atlas:92-138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas#L92-L138)).

**Predecessor:** a completed [[wiki/pipelines/recon-all|recon-all]] subject →
**xhemireg** → **Successor:** surface registration to `fsaverage_sym`
([[surfreg]] / `rca-surfreg`), then symmetric-atlas or asymmetry analysis. The
companion [[xhemi-tal]] computes the flipped Talairach analytically from the
original.

## Gotchas and Caveats

> [!gotcha] Output hemisphere is the opposite of the source
> Flipping the **left** hemisphere produces files named **`rh.*`** under
> `xhemi/surf` and `xhemi/label` (and vice versa) — this renaming is intentional
> and is what makes a left hemisphere comparable to right hemispheres on the
> symmetric template. Do not expect `xhemi/surf/lh.white` to be the flipped left
> hemisphere; it is the flipped *right*.

> [!gotcha] `sphere`/`inflated` use the "pure" reversal
> Volumes and most surfaces use `lrrev.register` (with a half-voxel centering
> offset), but `sphere` and `inflated` use `lrrev.pure.register` (no offset)
> because they are origin-centred ([`scripts/xhemireg:272-276`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L272-L276)). Using the wrong
> one would shift these surfaces by half a voxel.

> [!gotcha] Missing inputs are skipped, not errors
> If a listed volume/overlay/label/annotation is absent, `xhemireg` prints a
> warning and continues ([`scripts/xhemireg:159-167`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L159-L167), [`:284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L284), [`:295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L295)). The
> mirror subject will simply lack those files; check the log if a downstream tool
> complains about a missing `xhemi/...` file.

## Error Compensation and Guard Rails

- **Orientation-driven axis choice.** The L-R axis is read from the header rather
  than assumed, so the correct axis is flipped even for non-standard orientations
  ([`scripts/xhemireg:108-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L108-L120)).
- **Label-aware reversal.** Segmentations get their L/R codes swapped after the
  geometric flip, so the mirror aseg is semantically correct
  ([`scripts/xhemireg:177-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L177-L183)).
- **Idempotent.** Volume and surface steps are guarded by `UpdateNeeded`, so a
  re-run only redoes work whose inputs changed.
- **Nearest-neighbour for segs.** Segmentations are resampled with
  `--interp nearest` to avoid label blending ([`scripts/xhemireg:170-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L170-L174)).

## Related Tools

- [[surfreg]] — the usual front end; calls `xhemireg` and then registers the mirror hemisphere to `fsaverage_sym`.
- [[xhemi-tal]] — standalone computation of the flipped Talairach `talairach.xfm` from the original (the analytic counterpart to `--tal-estimate`).
- [[make_folding_atlas]] — builds a symmetric folding atlas using per-subject `xhemireg`.
- [[mri_vol2vol]] — applies the reversal registration to volumes.
- [[mri_surf2surf]] — applies the reversal to surfaces and copies them to the opposite hemisphere.
- [[wiki/tools/mri_convert|mri_convert]] — performs the `--left-right-swap-label` code exchange on segmentations.
- [[lta_convert]] — converts the reversal `register.dat` to an `.lta`.
- [[mri_coreg]] — `--lrrev` estimate path and `--gcaprep` registration.
- [[make_average_subject]] — a downstream consumer of volume-only mirrors.
- `rca-talairach`, `rca-surfreg` *(no wiki pages yet)* — recon-all helper scripts called for Talairach/surface registration.

## Confidence and Gaps

**High confidence:** complete flag set and aliases, the orientation-driven L-R
reversal, the two registration variants (`register` vs `pure`), the label-code
swapping, the opposite-hemisphere renaming, the volume-list presets, and the
caller relationships with [[surfreg]] and [[make_folding_atlas]] — all read from
[`scripts/xhemireg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg).

> [!gap] gcaprep Talairach behaviour
> The `--gcaprep` branch sets a `DoTal` variable that the main body does not key
> on (it uses `DoComputeTal`/`DoEstimateTal`), so the Talairach behaviour in
> gcaprep mode is ambiguous from the script alone ([`scripts/xhemireg:368-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L368-L379)).

> [!gap] rca-talairach internals
> The `--tal-compute` default delegates to `rca-talairach`, whose registration
> details are out of scope here.

## References

- FreeSurfer source: [`scripts/xhemireg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg) (v8.2.0).
- Callers: [`scripts/surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg), [`scripts/make_folding_atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_folding_atlas).
- Companion: [[xhemi-tal]] — analytic flipped-Talairach computation.
- FreeSurfer wiki (legacy): the `Xhemi` cross-hemisphere registration page — superseded for v8 by this code-anchored page.
