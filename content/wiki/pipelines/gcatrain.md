---
title: "gcatrain"
type: pipeline
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gcatrain"
families: []                     # GCA-training orchestrator (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[gcaprepone]]"
  - "[[gcainit]]"
  - "[[jkgcatrain]]"
  - "[[gcatrainskull]]"
  - "[[mri_ca_train]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_em_register]]"
  - "[[mri_ca_label]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[gca-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The cluster-submission path (pbsubmit) is described from the script; the exact pbsubmit/scheduler behaviour and the polling loops were read but not executed end-to-end."
  - "Interaction of --xs/--x exclusion lists with a pre-existing gcadir (where the subject list is re-read from disk) is only partially constrained by the code."
tags:
  - atlas
  - training
  - segmentation
  - gca
  - subcortical
  - pipeline
---

# gcatrain

## Summary

`gcatrain` builds a [Gaussian Classifier Atlas (GCA)](#related-tools) for
whole-brain subcortical segmentation from a set of **manually labelled** training
subjects. It is a multi-stage orchestrator: it creates a fresh `SUBJECTS_DIR`
tree, copies each subject's raw data and manual segmentation into it, runs
[[wiki/pipelines/recon-all|recon-all]] far enough to produce `nu.mgz`
(via [[gcaprepone]]), builds a first single-subject atlas (via [[gcainit]]), then
iterates a **register-all-subjects-to-the-current-atlas → retrain** loop
([[mri_em_register]] + [[mri_ca_normalize]] + [[mri_ca_register]], then
[[mri_ca_train]]) until the requested number of iterations is reached. It is the
modern replacement for the legacy `rebuild_gca_atlas.csh` and is the entry point
for the whole GCA-training pipeline; jackknife cross-validation
([[jkgcatrain]]) and the with-skull atlas ([[gcatrainskull]]) are run afterwards
on the directory it produces.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain)
- **Binary/script location:** `$FREESURFER_HOME/bin/gcatrain`
- **Tools it orchestrates:** [`gcaprepone`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L146-L147) (per-subject preparation), [`gcainit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L189) (initial single-subject atlas), [`recon-all -gcatrain-iter`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L252-L253) (per-subject EM/CA registration each iteration, which itself runs [[mri_em_register]], [[mri_ca_normalize]], [[mri_ca_register]]), and [`mri_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L304-L308) (atlas estimation). Jobs are dispatched with `pbsubmit` and timed with `fs_time`.

## Purpose and Context

The whole-brain subcortical segmentation that [[mri_ca_label]] produces inside
[[wiki/pipelines/recon-all|recon-all]] (the `aseg.mgz`) is driven by a prior
atlas — the `.gca` file (default `RB_all_*.gca` in `$FREESURFER_HOME/average`).
That atlas is itself *trained* from a panel of subjects whose subcortical
structures were segmented **by hand**. `gcatrain` is the tool that performs that
training. It exists so that a site can rebuild or extend the standard FreeSurfer
subcortical atlas, or train a bespoke atlas on its own manually labelled cohort.

The central difficulty in atlas training is circular: to register a subject into
atlas space you need an atlas, but to build the atlas you need the subjects
registered. `gcatrain` breaks the circle with **iterative bootstrapping**:

1. Build a crude atlas from a single, well-aligned "init" subject
   ([[gcainit]], producing `gca.i01.gca`).
2. Register **every** subject to that atlas and re-estimate the atlas from all of
   them ([[mri_ca_register]] → [[mri_ca_train]], producing `gca.i02.gca`).
3. Optionally repeat step 2 against the freshly improved atlas for further
   iterations.

`gcatrain` is **not** part of the per-subject [[wiki/pipelines/recon-all|recon-all]]
stream — it is an offline, developer/expert pipeline run once to produce the
atlas that recon-all later consumes. It does, however, *call* recon-all
internally through the dedicated `-gcatrain-iter` entry point (see
[Pipeline Context](#pipeline-context)).

> [!gotcha] Re-runnable and resumable
> `gcatrain` is designed to be run repeatedly on the same `gcadir`. After the
> first invocation, **all configuration is read back from
> `gcadir/scripts/*.txt`** and you may pass *only* `--g`, `--niters`, and
> scheduling flags. Specifying `--seg`, `--init`, `--ctab`, `--f`/subjects, or
> `--sd` against an existing `gcadir` is a hard error
> ([`scripts/gcatrain:562-608`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L562-L608)).
> Completed stages are skipped via per-stage `*.done` files, so a re-run simply
> continues from where it stopped — or adds iterations.

## Inputs

### Required Inputs (first invocation)

- **A subject list** — `--f subjectlistfile` (a text file, one subject ID per
  line; repeatable and combinable with individual `--s subject` flags;
  [`scripts/gcatrain:418-426`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L418-L426)).
- **An init subject + its manual Talairach transform** — `--init initsubject
  talairach_man.xfm` ([`scripts/gcatrain:403-407`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L403-L407)).
  The transform file must live in
  `$SUBJECTS_DIR/initsubject/mri/transforms/` and is the *only* manual linear
  registration used to seed the whole atlas.
- **A manual segmentation filename** — `--seg seg_edited10.mgz`
  ([`scripts/gcatrain:444-447`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L444-L447)). This basename
  must exist as `$SUBJECTS_DIR/<subject>/mri/<manseg>` for **every** subject.
- **A source `SUBJECTS_DIR`** — `--sd` (or the current `$SUBJECTS_DIR`); each
  subject must have `mri/orig/NNN.mgz` input volumes and the manual segmentation.
- **Number of iterations** — `--niters` (≥ 2 to actually train from all
  subjects; see gotcha).

Each subject is validated up front
([`scripts/gcatrain:632-652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L632-L652)): the
subject directory, the manual segmentation, and at least one
`mri/orig/[0-9][0-9][0-9].mgz` input volume must exist, and the init subject's
manual `.xfm` must be present.

### Input Assumptions

> [!assumption] Manually labelled, recon-able subjects with a hand Talairach for the init subject
> Inputs are individual subjects, each with raw conformed `mri/orig/NNN.mgz`
> volume(s) and a hand-edited subcortical segmentation (`manseg`). Only the
> **init** subject needs a manual Talairach transform; all other subjects are
> registered automatically. The data must be processable by `recon-all
> -autorecon1` (skull-strip, intensity normalisation, NU correction). Optional
> `tmp/control.dat` control-point files are carried along if present
> ([`scripts/gcaprepone:95-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcaprepone#L95-L103)).

## Outputs

### Files Created

Everything is written under the output directory `gcadir` (which becomes the new
`SUBJECTS_DIR`). Per-iteration files are tagged `iNN` (zero-padded iteration
number; iteration 1 is the init atlas).

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `gca/gca.i01.gca` | `gcadir/gca/` | initial single-subject atlas (from [[gcainit]]) |
| `gca/gca.iNN.gca` | `gcadir/gca/` | atlas trained from **all** subjects at iteration `NN` (the deliverable; e.g. `gca.i02.gca`) |
| `<subject>/mri/orig/NNN.mgz`, `mri/<manseg>` | per subject | copied raw inputs + manual segmentation (by [[gcaprepone]]) |
| `<subject>/mri/nu.mgz`, `brainmask.mgz`, `transforms/talairach.xfm` | per subject | `recon-all -autorecon1` products (by [[gcaprepone]]) |
| `<subject>/mri/norm.iNN.mgz` | per subject | CA-normalised volume for iteration `NN` |
| `<subject>/mri/transforms/talairach.iNN.lta` | per subject | linear atlas registration for iteration `NN` |
| `<subject>/mri/transforms/talairach.iNN.m3z` | per subject | non-linear (morph) atlas registration for iteration `NN` |
| `scripts/subjectlist.txt`, `initsubject.txt`, `mantal.txt`, `manseg.txt`, `src_subjects_dir.txt`, `noemreg.txt`, `dosym.txt` | `gcadir/scripts/` | frozen configuration, re-read on subsequent runs |
| `scripts/ctab.lut` | `gcadir/scripts/` | copied colour table, if `--ctab` was given |
| `log/done/*.done` | `gcadir/log/done/` | per-stage completion sentinels (`gcaprep.*`, `gcainit.*`, `gcareg.*.iNN`) |
| `log/gcatrain.Y…log`, `log/mri_ca_train.iNN.log`, per-subject `recon-all.iNN.log` | `gcadir/log/` & subject dirs | logs |
| `log/build-stamp.txt` | `gcadir/log/` | FreeSurfer build stamp recorded at first run (enforced on re-runs) |

### Output Specifications

The headline output is the trained atlas `gca/gca.iNN.gca` — a Gaussian
Classifier Atlas in [[gca-format]] at **prior spacing 2 mm / node spacing 4 mm**
(the init atlas in `gca.i01.gca` uses the coarser **node spacing 8 mm** set by
[[gcainit]]). The per-iteration `.lta`/`.m3z`/`norm.*` files are standard
FreeSurfer linear transforms, non-linear morphs, and `mgz` volumes; their
geometry is determined by [[mri_ca_register]]/[[mri_ca_normalize]], not by this
script.

## Mathematical Foundations

`gcatrain` performs **no numerical computation itself** — it is pure
orchestration (loops, job submission, file bookkeeping). All of the mathematics
lives in the binaries it drives:

> [!internal] The atlas model and registration math live in the mri_ca_* binaries
> The GCA model (per-node Gaussian intensity distributions and label priors), its
> estimation, and the EM/non-linear registration are implemented in
> [[mri_ca_train]], [[mri_ca_register]], [[mri_ca_normalize]], and
> [[mri_em_register]]. See those pages (and [[gca-format]]) for the model
> definition and the registration energy functionals. `gcatrain` only sets the
> spacings (`-prior_spacing 2 -node_spacing 4`) and the iteration schedule.

The only "algorithm" the script embodies is the **bootstrap iteration** itself:
iteration `i` registers every subject to `gca.i(i-1).gca` and retrains, so the
atlas and the registrations are refined jointly across iterations — a fixed-point
/ generalised-EM style scheme realised at the pipeline level.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gcatrain:373-549`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L373-L549)). Flags that set
training data (`--init`, `--seg`, `--ctab`, subjects) are accepted **only** on the
first run; on a re-run against an existing `gcadir` they error.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g`<br>`--o` | string | *(required)* | Output GCA-training directory; becomes the new `SUBJECTS_DIR`. If it already exists, configuration is read from `gcadir/scripts/` and most other data flags are forbidden. |
| `--niters` | int | *(required)* | Number of training iterations. Iteration 1 = build atlas from the init subject only; iteration ≥ 2 = register all subjects and retrain. Re-running with a larger value adds iterations. |
| `--f` | file | — | Text file of subject IDs (one per line) to add to the subject list. Repeatable; combinable with `--s`. File must exist. |
| `--s` | string | — | Add a single subject ID to the subject list. Repeatable. |
| `--init` | `subject xfm` | *(required, first run)* | Init subject ID and its manual Talairach transform filename (relative to `subject/mri/transforms/`). Seeds the first atlas. |
| `--seg` | string | *(required, first run)* | Filename of the manual segmentation volume (e.g. `seg_edited10.mgz`) present in every subject's `mri/` directory. |
| `--sd` | string | `$SUBJECTS_DIR` | Source `SUBJECTS_DIR` to copy subject data from (first run only). |
| `--ctab` | file | — | Colour table (LUT) passed to [[mri_ca_train]] via `-ctab`; copied into `scripts/ctab.lut`. File must exist. Optional. |
| `--sym`<br>`--no-sym` | bool | `--no-sym` | Build a left–right symmetric atlas (`mri_ca_train -sym`). Recorded in `dosym.txt` and honoured by [[gcainit]] too. |
| `--x` | file | — | File of subject IDs to **exclude** from the subject list (useful for jackknifing). |
| `--xs` | string | — | Exclude a single subject ID. Repeatable. Cannot exclude the init subject (hard error). |
| `--niters` re-run | — | — | (see `--niters`) On a populated dir, only `--g`/`--niters`/scheduling flags are needed. |
| `--no-submit` | bool | submit on | Run every stage **serially** in the foreground instead of dispatching to the cluster with `pbsubmit`. |
| `--nthreads`<br>`--threads` | int | `1` | OpenMP threads per job; sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS` and `pbsubmit -l nodes=1:ppn=$nthreads`. |
| `--pb` | string | — | Extra option string appended to every `pbsubmit` command. Repeatable. |
| `--pb-m` | bool | off | Add `-m $USER` to `pbsubmit` (e-mail the user when jobs start/finish). |
| `--prep-only` | bool | off | Only run preparation (sets `niters=1`, `DoInit=0`): copy data and `recon-all -autorecon1` for every subject; do **not** build any atlas. |
| `--gcareg-iters` | int | — | Pass `-gcareg-iters N` to recon-all → caps [[mri_ca_register]] iterations (`-n N`). For testing/speed only. |
| `--gcareg-tol` | float | — | Pass `-gcareg-tol` to recon-all → [[mri_ca_register]] `-tol`. For testing only. |
| `--no-emreg` | bool | EM-reg on | Do not use [[mri_em_register]]; propagated to [[gcaprepone]] (`--no-emreg`) and to the per-iteration `recon-all`. Recorded in `noemreg.txt`. |
| `--emreg` | bool | on | Re-enable [[mri_em_register]] (default). |
| `--no-strict` | bool | strict on | Do not require the FreeSurfer build stamp to match the one frozen at first run (`REQUIRE_FS_MATCH=0`). |
| `--nu10` | bool | off | Prepend `/usr/pubsw/packages/mni/1.4/bin` to `$PATH` (use the old MNI `nu_correct`). |
| `--nu12` | bool | (the default toolchain) | Prepend `/usr/pubsw/packages/mni/current/bin` to `$PATH`. |
| `--log` | string | `gcadir/log/gcatrain.Y….log` | Explicit log file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove intermediate temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] On an existing `gcadir`, data flags are forbidden — pass only `--g`/`--niters`
> If `gcadir` already exists, specifying any of `--s`/`--f` subjects, `--init`,
> `--ctab`, `--seg`, or `--mantal` aborts with an explicit error
> ([`scripts/gcatrain:562-608`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L562-L608)). The
> configuration is instead reloaded from `gcadir/scripts/*.txt`. To add
> iterations or resume, run `gcatrain --g <dir> --niters <N>` (plus scheduling
> flags) only.

> [!gotcha] `--niters 1` (or `--prep-only`) never trains from all subjects
> The training loop runs `while($iter < $niters)` starting at `iter=1`
> ([`scripts/gcatrain:235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L235)), so with
> `--niters 1` the loop body never executes and **only** `gca.i01.gca` (the
> single-subject init atlas) is produced. You need `--niters 2` to get the
> all-subject `gca.i02.gca`. `--prep-only` deliberately forces `niters=1` and
> also skips [[gcainit]] (`DoInit=0`).

> [!gotcha] FreeSurfer build stamp is enforced across runs
> The first run records `$FREESURFER_HOME/build-stamp.txt` into
> `gcadir/log/build-stamp.txt`. Every later run compares the current stamp to it
> and **aborts** if they differ ([`scripts/gcatrain:69-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L69-L84)),
> to stop you from mixing atlas iterations built with different FreeSurfer
> versions. Override with `--no-strict` only if you understand the risk.

Other interactions:

- `--no-emreg` is threaded through the entire pipeline: it sets `NoEMReg`, is
  written to `noemreg.txt`, passed to [[gcaprepone]] (`--no-emreg`), and added to
  each per-iteration `recon-all` call.
- `--sym` is honoured both by the all-subject [[mri_ca_train]] here and by
  [[gcainit]] (which reads `dosym.txt`), so the init atlas and the trained atlas
  are consistently (a)symmetric.
- `--gcareg-iters`/`--gcareg-tol` and `--nu10`/`--nu12` are testing/environment
  knobs and do not change the atlas-training logic.
- `--no-submit` turns every stage synchronous; the polling `while` loops that
  wait on `pbsubmit` jobs are skipped because each `$cmd` runs inline.

## Typical Use Cases

### 1. Build a fresh whole-brain atlas (first run)

```bash
# Two iterations (init atlas + one full retrain), 4 threads, cluster submission.
gcatrain --f subjectlist.txt \
  --init 990104_vc700 talairach_man.xfm \
  --seg seg_edited10.mgz \
  --niters 2 --g rb10-gcatrain --nthreads 4 \
  --sd /space/subjects/atlases/aseg_atlas
# Deliverable: rb10-gcatrain/gca/gca.i02.gca
```

### 2. Add a third iteration to an existing atlas

```bash
# Re-run: config is read back from rb10-gcatrain/scripts/. Pass only --g/--niters.
gcatrain --niters 3 --g rb10-gcatrain --nthreads 4
# Sees i01/i02 already done; performs iteration 3 -> gca.i03.gca
```

### 3. Run everything serially on one machine (no cluster)

```bash
gcatrain --f subjectlist.txt --init 990104_vc700 talairach_man.xfm \
  --seg seg_edited10.mgz --niters 2 --g rb10-gcatrain \
  --nthreads 8 --no-submit
```

### 4. Preparation only (copy data + autorecon1, no atlas)

```bash
gcatrain --f subjectlist.txt --init 990104_vc700 talairach_man.xfm \
  --seg seg_edited10.mgz --g rb10-gcatrain --prep-only --nthreads 4
```

### 5. Build a symmetric atlas

```bash
gcatrain --f subjectlist.txt --init 990104_vc700 talairach_man.xfm \
  --seg seg_edited10.mgz --niters 2 --g rb10-sym --sym --nthreads 4
```

## Pipeline Context

`gcatrain` is the **top-level driver** of the GCA-training pipeline. Internally it
sequences four stages, the first three of which are themselves FreeSurfer tools:

```
              ┌─────────────── per subject ───────────────┐
raw subjects → gcaprepone (recon-all -autorecon1) → nu.mgz, brainmask, manseg
                                  │
              init subject only ──┴──► gcainit ──► gca/gca.i01.gca
                                  │
   iteration loop (i = 2 … niters):
     foreach subject:
       recon-all -gcatrain-iter gca.i(i-1).gca iNN
         → mri_em_register → mri_ca_normalize → mri_ca_register
         → talairach.iNN.lta / norm.iNN.mgz / talairach.iNN.m3z
     mri_ca_train (all subjects) ──► gca/gca.iNN.gca
```

The per-iteration registration is delegated to
[[wiki/pipelines/recon-all|recon-all]] through the dedicated `-gcatrain-iter
<srcgca> i<NN>` entry point
([`scripts/recon-all:7261-7279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7261-L7279)).
That flag puts recon-all into a GCA-registration-only mode (`DoGCAReg=1`,
`DoCANormalize=1`, `DoCAReg=1`, with labelling and stats off) and sets
`GCAOutputName=i<NN>`, so the outputs are suffixed `.i<NN>`
([`scripts/recon-all:2655-2776`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2655-L2776)) — exactly the
`norm.iNN.mgz`, `talairach.iNN.lta`, and `talairach.iNN.m3z` that
[[mri_ca_train]] then consumes.

**Predecessor:** a manually labelled `SUBJECTS_DIR` → **gcatrain** →
**Successors:** [[jkgcatrain]] (jackknife cross-validation of `gca.iNN.gca`),
[[gcatrainskull]] (with-skull atlas from the same prepared directory), and
ultimately use of the trained `.gca` by [[mri_ca_label]] inside an ordinary
[[wiki/pipelines/recon-all|recon-all]] run.

It replaces the legacy `rebuild_gca_atlas.csh`
([`scripts/gcatrain:707-708`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L707-L708)).

## Gotchas and Caveats

> [!gotcha] Iteration 1 is just the init atlas, not "one full pass"
> Because `iter` starts at 1 and the loop condition is `iter < niters`, the count
> includes the init step. `--niters 2` yields one all-subject retrain
> (`gca.i02.gca`); `--niters 3` yields two; and so on. This off-by-one-feeling
> bookkeeping is by design ([`scripts/gcatrain:234-238`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L234-L238)).

> [!gotcha] `.done` files and `rm -f $trggca` act as crude job sentinels
> Completion is tracked by sentinel files in `log/done/` and, for
> [[mri_ca_train]], by removing the target `.gca` first and polling for its
> reappearance ([`scripts/gcatrain:310-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L310-L333)).
> A source comment flags this as "need better". If a job dies without writing its
> done file, the controlling `gcatrain` will wait (cluster mode) until you
> intervene.

> [!gotcha] Errors in submitted jobs are warned, not fatal
> In `pbsubmit` mode a per-subject `gcaprepone`/`gcareg` failure (done file
> containing `1`) only prints a `WARNING` and the pipeline continues
> ([`scripts/gcatrain:169-174`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L169-L174),
> [`:213-219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L213-L219)). Inspect the per-subject logs;
> a silently dropped subject degrades the atlas. In `--no-submit` mode a failure
> aborts immediately.

> [!gotcha] The init subject is always added to the prep list
> Even if the init subject is not in your `--f` list, it is prepended to the
> preparation list ([`scripts/gcatrain:127-130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L127-L130))
> and **cannot** be excluded with `--xs`/`--x`
> ([`scripts/gcatrain:611-617`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L611-L617)).

## Error Compensation and Guard Rails

- **Up-front validation.** Before any work, every subject's directory, manual
  segmentation, and `mri/orig/NNN.mgz` inputs are checked, as is the init
  subject's manual `.xfm` ([`scripts/gcatrain:632-652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L632-L652)).
- **Resumability.** Per-stage `*.done` sentinels let a re-run skip completed prep,
  init, and registration work rather than redo it.
- **Build-stamp guard.** A version mismatch aborts unless `--no-strict`
  ([`scripts/gcatrain:74-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L74-L84)).
- **Config freezing.** First-run settings are written to `scripts/*.txt` and
  re-read thereafter, so an accidental change of flags on a re-run is rejected
  rather than silently applied.

## Related Tools

- [[gcaprepone]] — per-subject preparation stage (copies data, runs `recon-all -autorecon1`); called once per subject by gcatrain.
- [[gcainit]] — builds the initial single-subject atlas `gca.i01.gca`; called once by gcatrain.
- [[mri_ca_train]] — the atlas-estimation binary; run by gcatrain at each iteration to produce `gca.iNN.gca`.
- [[mri_ca_register]] — non-linear subject↔atlas registration, run per subject each iteration (via recon-all).
- [[mri_ca_normalize]] — atlas-guided intensity normalisation producing `norm.iNN.mgz` (via recon-all).
- [[mri_em_register]] — linear EM registration producing `talairach.iNN.lta` (via recon-all; skipped with `--no-emreg`).
- [[mri_ca_label]] — the eventual *consumer* of the trained atlas (subcortical labelling inside recon-all).
- [[jkgcatrain]] — jackknife leave-one-out cross-validation, run after gcatrain on the same directory.
- [[gcatrainskull]] — trains the companion with-skull atlas from the same prepared directory.
- [[wiki/pipelines/recon-all|recon-all]] — both the internal per-iteration registration engine (`-gcatrain-iter`) and the downstream pipeline that uses the finished atlas.
- [[gca-format]] — the `.gca` atlas file format produced.
- `rebuild_gca_atlas.csh` *(no wiki page yet)* — the legacy script gcatrain replaces.

## Confidence and Gaps

**High confidence:** the full flag set, the first-run-vs-resume semantics, the
config-freezing/`scripts/*.txt` mechanism, the iteration bookkeeping, the
`-gcatrain-iter` recon-all hookup, and the stage ordering — all read directly
from [`scripts/gcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain) and the
corresponding recon-all block.

> [!gap] Cluster-submission behaviour not executed
> The `pbsubmit`/polling-loop path was read but not run end-to-end; the precise
> scheduler semantics (queueing, the `sleep 10`/`sleep 300` waits, partial-failure
> recovery) are described from the script alone.

> [!gap] Exclusion lists vs. a populated directory
> `--x`/`--xs` filter the subject list at parse time, but on a re-run the subject
> list is re-read from `scripts/subjectlist.txt`; how exclusions interact with an
> already-frozen list (and `xsubjectlist.txt`) is only partially constrained by
> the code ([`scripts/gcatrain:596-630`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L596-L630)).

## References

- FreeSurfer source: [`scripts/gcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain) (v8.2.0).
- Built-in help: `gcatrain --help` (the usage block and `BEGINHELP` text,
  [`scripts/gcatrain:673-748`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L673-L748)).
- recon-all GCA-training entry point: [`scripts/recon-all:7261-7279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7261-L7279).
- Fischl B. et al., *Whole brain segmentation: automated labeling of
  neuroanatomical structures in the human brain.* Neuron 33(3):341–355 (2002) —
  the GCA / `mri_ca_label` segmentation method this atlas feeds.
