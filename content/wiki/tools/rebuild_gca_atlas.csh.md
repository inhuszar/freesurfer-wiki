---
title: "rebuild_gca_atlas.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rebuild_gca_atlas.csh"
families: []                     # multi-stage subcortical GCA trainer
recon_all_stage: null
related:
  - "[[mri_ca_train]]"
  - "[[mri_em_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_register]]"
  - "[[gca-apply]]"
  - "[[gca-format]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Designed for an MGH cluster with pbsubmit; on a single machine the polling loops that wait for pbsubmit outputs will spin because the jobs are never actually launched (pbsubmit absent)."
tags:
  - atlas
  - segmentation
  - gca
  - subcortical
  - training
---

# rebuild_gca_atlas.csh

## Summary

`rebuild_gca_atlas.csh` is the (legacy) multi-stage tcsh driver that **builds a
subcortical GCA atlas** (a `.gca` volumetric Gaussian Classifier Atlas, see
[[gca-format]]) from a set of manually labelled training brains. It implements
the classic bootstrap-and-refine training loop: train a rough atlas from a single
reference subject, register every training brain to it, retrain from all
subjects, register again to the improved atlas, and retrain once more — producing
the final whole-brain atlas plus a "with-skull" variant used for skull-stripping.
It orchestrates [[mri_ca_normalize]], [[mri_ca_train]], [[mri_em_register]], and
[[mri_ca_register]], dispatching the heavy per-subject steps to a compute cluster
via `pbsubmit`. The atlas it produces is exactly the kind of `.gca` that
[[wiki/pipelines/recon-all|recon-all]] uses for `aseg.mgz` and that
[[gca-apply]] applies to individual subjects. It has largely been superseded by
the newer `gcatrain` driver.

## Source Information

- **Language:** tcsh shell script (original author: Xiao Han)
- **Source file:** [`scripts/rebuild_gca_atlas.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh)
- **Binary/script location:** `$FREESURFER_HOME/bin/rebuild_gca_atlas.csh`
- **FreeSurfer tools invoked:** [`mri_ca_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L168), [`mri_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L210), [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L239), [`mri_ca_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L266), plus [`mri_info`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L118) (float-format check), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L454) and [`recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L478-L487) (only in the `create_inputs` helper). Heavy steps are submitted with `pbsubmit`.

## Purpose and Context

A subcortical GCA atlas encodes, at each spatial location, a prior probability
over anatomical labels and per-label Gaussian intensity models. Building one
requires a chicken-and-egg bootstrap: you cannot register a brain to the atlas
until the atlas exists, but you cannot build a good atlas without first aligning
all the brains. `rebuild_gca_atlas.csh` resolves this by the standard iterative
recipe used to produce FreeSurfer's distributed `RB_all_*.gca` atlases:

1. **Normalise** every training brain's intensities using its *manual*
   segmentation as a guide ([[mri_ca_normalize]] with `-seg`).
2. **Bootstrap** a coarse atlas (`GCA_one`) from a single reference subject
   (`$ONE_SUBJECT`), aligned to Talairach ([[mri_ca_train]]).
3. **Register** each brain to `GCA_one` ([[mri_em_register]] →
   [[mri_ca_normalize]] → [[mri_ca_register]]), producing nonlinear morphs.
4. **Retrain** a finer atlas (`GCA`) from all subjects using those morphs.
5. **Re-register** every brain to `GCA` and **retrain once more** to get the
   final atlas, then train a separate **with-skull** atlas
   (`GCA_all_withskull`) from the no-neck volumes for use in skull-stripping.

It is a **developer / atlas-builder** tool, designed (per its header) to run on a
cluster ("launchpad"). It is *not* called by `recon-all`; it *produces* the atlas
`recon-all` consumes. The header documents the required setup
([`scripts/rebuild_gca_atlas.csh#L6-L27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L6-L27)): a `subjects.csh` in
`$SUBJECTS_DIR/scripts/` defining `$SUBJECTS` and `$ONE_SUBJECT`, and per-subject
`nu.mgz`, `brainmask.mgz`, `nu_noneck.mgz`, and `seg_edited.mgz`.

> [!gotcha] Superseded by `gcatrain`
> The newer `gcatrain` script is the intended replacement ("It is meant to
> replace rebuild_gca_atlas.csh", [`scripts/gcatrain:708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L708)).
> `rebuild_gca_atlas.csh` remains for reproducing older atlases and for reference.

## Inputs

### Required Inputs

- **`$SUBJECTS_DIR/scripts/subjects.csh`** — sourced to set `$SUBJECTS` (the
  training list) and `$ONE_SUBJECT` (the bootstrap reference); may optionally set
  `$GCA_PRE` to override the output prefix (default `RB`)
  ([`scripts/rebuild_gca_atlas.csh#L49-L54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L49-L54)).
- For **every** training subject (and `$ONE_SUBJECT`), under `mri/`:
  `seg_edited.mgz` (manual segmentation), `nu.mgz`, `brainmask.mgz`, and
  `nu_noneck.mgz` — all are checked to exist and to **not** be `FLOAT` type
  ([`scripts/rebuild_gca_atlas.csh#L103-L125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L103-L125)).
- Optionally, a manual Talairach registration
  `mri/transforms/talairach_man.xfm` for `$ONE_SUBJECT` to align the atlas to
  Talairach space ([`scripts/rebuild_gca_atlas.csh#L197-L208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L197-L208)).

### Input Assumptions

> [!assumption] Carefully edited masks and integer-typed inputs
> The header warns that `brainmask.mgz` must be inspected so no brain is stripped
> ([`scripts/rebuild_gca_atlas.csh#L20-L22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L20-L22)), and the input loop rejects any volume in
> `FLOAT` format because [[mri_ca_train]] cannot consume it (it even prints the
> fix: `mri_convert -odt uchar -ns 1 …`, [`scripts/rebuild_gca_atlas.csh#L117-L123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L117-L123)).
> `seg_edited.mgz` is assumed to be a high-quality manual label volume; the whole
> atlas's accuracy derives from it.

- A compute cluster providing `pbsubmit` is assumed; the script submits the
  per-subject normalisation/registration/training jobs and then **polls** for
  their output files in `sleep`-based wait loops.

## Outputs

### Files Created

Written under `$SUBJECTS_DIR/average/`
([`scripts/rebuild_gca_atlas.csh#L137-L140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L137-L140); `<DATE>` = `date +%F`, `<PRE>` = `$GCA_PRE`,
default `RB`):

| File | Contents | Produced by |
|------|----------|-------------|
| `<PRE>_one_<DATE>.gca` | bootstrap atlas from `$ONE_SUBJECT` | [[mri_ca_train]] (stage 1) |
| `<PRE>_all_<DATE>.gca` | **final** whole-brain subcortical atlas ([[gca-format]]) | [[mri_ca_train]] (stage 3, retrain) |
| `<PRE>_all_withskull_<DATE>.gca` | with-skull atlas (for [[mri_em_register]] skull-strip) | [[mri_ca_train]] (no-neck) |
| `rebuild_gca_atlas_<DATE>.log` | full per-stage command log | the script |

Per-subject intermediates written under each `mri/` and `mri/transforms/`:
`norm.mgz` (`$T1_VOL`), `talairach_one.lta` / `talairach_one.m3z` (registration
to the bootstrap atlas), and `talairach.lta` / `talairach.m3z` (registration to
the final atlas).

### Output Specifications

The `.gca` files are binary volumetric atlases (node spacing 4 mm, prior spacing
2 mm for the all-subject atlases; node spacing 8 mm for the one-subject bootstrap
— [`scripts/rebuild_gca_atlas.csh#L210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L210), [`scripts/rebuild_gca_atlas.csh#L306`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L306), [`scripts/rebuild_gca_atlas.csh#L400`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L400)). See
[[gca-format]] for the byte layout and [[mri_ca_train]] for the meaning of the
spacings.

## Mathematical Foundations

The script performs no math itself; it sequences the training/registration
binaries.

> [!internal] Atlas estimation and morphing live in the `mri_ca_*` binaries
> [[mri_ca_train]] estimates the per-node label priors and per-label Gaussian
> intensity models that constitute the GCA; [[mri_em_register]] solves the affine
> EM alignment; [[mri_ca_register]] solves the nonlinear MAP morph (with a
> smoothness regulariser); [[mri_ca_normalize]] performs atlas-conditioned
> intensity normalisation. The iterative "train → register → retrain" loop here is
> a classic atlas-bootstrapping scheme: each pass yields better morphs, which yield
> a sharper atlas. The specific `mri_ca_train` resolutions (`-node_spacing`,
> `-prior_spacing`) set the spatial granularity of those estimates.

The fixed [[mri_ca_register]] options differ slightly between stages — the
bootstrap and first refinement pass `-smooth 1.0 -levels 2`
([`scripts/rebuild_gca_atlas.csh#L266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L266)) while the final pass uses `-smooth 1.0`
without `-levels` ([`scripts/rebuild_gca_atlas.csh#L369`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L369)). (These are the
training-specific options that [[gca-apply]] deliberately omits.)

## Configuration Options

### Complete Flag Reference

This script is **not** a flag parser; it is configured by editing `subjects.csh`
and by a single positional **stage selector**. The only command-line input is an
optional first argument that jumps to a particular stage
([`scripts/rebuild_gca_atlas.csh#L67-L68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L67-L68), [`scripts/rebuild_gca_atlas.csh#L75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L75), [`scripts/rebuild_gca_atlas.csh#L155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L155), [`scripts/rebuild_gca_atlas.csh#L295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L295)):

| Argument `$1` | Effect |
|---------------|--------|
| *(none)* | Run the whole pipeline: normalise → bootstrap → register-to-one → retrain → register-to-final → retrain (+ with-skull). |
| `create_inputs` | Jump to the input-preparation helper (build `orig.mgz`/`nu.mgz`/`nu_noneck.mgz`/`brain.mgz` via [[wiki/tools/mri_convert\|mri_convert]] and `recon-all` steps) and exit before atlas building. |
| `1` | Run only **stage 1** (normalise + bootstrap + register-to-one), then stop — so you can prune `$SUBJECTS` to well-aligned brains. |
| `2` | **Skip** stage 1 and start at **stage 2** (retrain from all subjects using the one-subject morphs). |

Settings configured in `subjects.csh` (not on the command line): `$SUBJECTS`,
`$ONE_SUBJECT`, and the optional `$GCA_PRE` prefix. In-script variables fix the
filenames: `SEG_VOL=seg_edited.mgz`, `ORIG_VOL=nu.mgz`, `MASK_VOL=brainmask.mgz`,
`T1_NONECK=nu_noneck.mgz`, `TAL_MAN=talairach_man.xfm`, `RunIt=1`
([`scripts/rebuild_gca_atlas.csh#L103-L108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L103-L108), [`scripts/rebuild_gca_atlas.csh#L65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L65)). `OMP_NUM_THREADS` is
hard-set to 3 ([`scripts/rebuild_gca_atlas.csh#L60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L60)).

> [!gotcha] `RunIt=0` is a dry run
> Setting `RunIt=0` (by editing the script, [`scripts/rebuild_gca_atlas.csh#L65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L65)) echoes
> every command into the log **without executing** any of them — useful for
> previewing the full job stream before committing cluster time.

### Configuration Interactions

> [!gotcha] The stage selector resumes a long, partially-completed build
> Because the atlas build can take many hours of cluster time, the `1`/`2`
> arguments let you stop after the first alignment pass (`1`), manually drop
> poorly-aligned subjects from `subjects.csh`, then resume from the retrain step
> (`2`). There is also a dormant `stage3:` label
> ([`scripts/rebuild_gca_atlas.csh#L330`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L330)) reachable only by falling through stage 2,
> not by an argument.

> [!gotcha] `create_inputs` runs `recon-all`, not the atlas build
> Passing `create_inputs` regenerates the per-subject input volumes by running
> `recon-all` steps (`-nuintensitycor -talairach -normalization -skullstrip
> -subcortseg -normalization2`) and exits; it does **not** build the atlas. A
> source comment notes `-nosubcortseg` would be the better choice since a
> subcortical atlas may not yet exist ([`scripts/rebuild_gca_atlas.csh#L483-L485`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L483-L485)).

- The **manual Talairach** for `$ONE_SUBJECT` is used only if
  `talairach_man.xfm` exists; otherwise the script falls back to
  `talairach.xfm`, and if neither exists the bootstrap atlas is built with no
  `-xform` ([`scripts/rebuild_gca_atlas.csh#L197-L208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L197-L208)) — meaning the final atlas may not
  be Talairach-aligned.

## Typical Use Cases

### 1. Full atlas rebuild on a cluster

```bash
setenv SUBJECTS_DIR /space/.../aseg_atlas   # contains scripts/subjects.csh
rebuild_gca_atlas.csh
# → average/RB_all_<DATE>.gca, RB_all_withskull_<DATE>.gca, RB_one_<DATE>.gca
```

### 2. Two-phase build with manual QC of alignment

```bash
rebuild_gca_atlas.csh 1          # stop after registering to the bootstrap atlas
#   ... edit subjects.csh to drop poorly-aligned subjects ...
rebuild_gca_atlas.csh 2          # resume: retrain and finish
```

### 3. (Re)generate the per-subject input volumes first

```bash
rebuild_gca_atlas.csh create_inputs   # builds nu.mgz/brain.mgz etc. via recon-all
```

## Pipeline Context

A stand-alone, cluster-oriented **atlas-builder**. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]; it *produces* the subcortical `.gca` that
`recon-all` later uses (and that [[gca-apply]] applies per subject).

**Predecessors:** manually segmented training brains (`seg_edited.mgz`) +
`recon-all`-derived `nu.mgz`/`brainmask.mgz`/`nu_noneck.mgz` (optionally via this
script's own `create_inputs`) → **rebuild_gca_atlas.csh** (→ [[mri_ca_normalize]]
/ [[mri_ca_train]] / [[mri_em_register]] / [[mri_ca_register]]) → **Successors:**
[[wiki/pipelines/recon-all|recon-all]] (`aseg.mgz` via the new atlas) and
[[gca-apply]] (apply/validate the atlas on individual subjects).

It is the older counterpart to `gcatrain`, and shares its entire binary toolset
with [[gca-apply]] (the apply-side script), differing in that those binaries here
run in a training loop over many subjects rather than once for one subject.

## Gotchas and Caveats

> [!gotcha] Polling loops assume `pbsubmit` actually launched the jobs
> After each `pbsubmit` batch the script enters a `while` loop that `sleep 30`s
> until the expected output file appears (e.g.
> [`scripts/rebuild_gca_atlas.csh#L176-L187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L176-L187)). On a host without a working `pbsubmit`
> queue the jobs never run, the files never appear, and the loop spins
> indefinitely. This script effectively requires the MGH cluster environment.

> [!gotcha] Dates in filenames mean re-runs do not overwrite prior atlases
> Every output embeds `date +%F`, so a build started on a new day produces new
> `.gca`/log names rather than overwriting yesterday's. Within a day, the script
> `rm -f`s the targets before regenerating.

## Error Compensation and Guard Rails

- **Input pre-flight.** Before any atlas work, every subject's four required
  inputs are checked for existence and rejected if `FLOAT`-typed, with the exact
  conversion command printed ([`scripts/rebuild_gca_atlas.csh#L110-L125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L110-L125)).
- **Talairach fallback chain.** `talairach_man.xfm` → `talairach.xfm` → none, so
  a missing manual transform degrades gracefully rather than aborting
  ([`scripts/rebuild_gca_atlas.csh#L197-L208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L197-L208)).
- **`mri_ca_train -check`** is passed in the bootstrap and first retrain so the
  trainer validates its inputs ([`scripts/rebuild_gca_atlas.csh#L211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L211), [`scripts/rebuild_gca_atlas.csh#L307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh#L307)).
- **Stale-output removal.** Each stage `rm -f`s its target before regenerating
  (guarded by `$RunIt`) so a partial previous run is not mistaken for completion.

## Related Tools

- [[mri_ca_train]] — the binary that estimates each `.gca`; called four times across the stages.
- [[mri_em_register]] — affine registration of each brain to the atlas.
- [[mri_ca_normalize]] — atlas-/seg-guided intensity normalisation.
- [[mri_ca_register]] — nonlinear morph of each brain to the atlas.
- [[gca-apply]] — applies a finished `.gca` to one subject (the apply-side counterpart, sharing all four binaries).
- `gcatrain` *(no wiki page yet)* — the modern replacement for this script.
- [[wiki/pipelines/recon-all|recon-all]] — consumes the resulting subcortical atlas to produce `aseg.mgz`.
- [[gca-format]] — the `.gca` file format produced here.

## Confidence and Gaps

**High confidence:** the five-stage train/register/retrain control flow, the
stage-selector arguments (`create_inputs`/`1`/`2`), the per-subject input checks
and float rejection, the exact binaries and their `-node_spacing`/`-prior_spacing`/
`-smooth`/`-levels` options, the three output `.gca` names, and the
`subjects.csh`-driven configuration — all read directly from
[`scripts/rebuild_gca_atlas.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh). The script has no `--help`/`BEGINHELP`.

> [!gap] Cluster dependence
> The `pbsubmit` + polling design ties this script to a PBS-style cluster; its
> behaviour on a single workstation (where `pbsubmit` is absent) was not
> exercised and the wait loops would not terminate.

## References

- FreeSurfer source: [`scripts/rebuild_gca_atlas.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rebuild_gca_atlas.csh) (v8.2.0, original author Xiao Han).
- Replacement driver: [`scripts/gcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain) ("meant to replace rebuild_gca_atlas.csh", [`scripts/gcatrain:708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L708)).
- Fischl B. et al., *Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain*, Neuron 33(3):341–355, 2002 — the GCA subcortical atlas/segmentation method.
