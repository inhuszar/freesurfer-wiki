---
title: "jkgcatrain"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/jkgcatrain"
families: []                     # GCA-training helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[gcatrain]]"
  - "[[mri_ca_train]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_label]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[gca-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "gca-apply (used in the BEGINHELP performance-testing recipe to label/Dice each leave-one-out atlas) is not yet documented in the wiki; its exact options are out of scope here."
  - "The cluster-submission path (pbsubmit) and the disabled waiting loop are described from the script; not executed end-to-end."
tags:
  - atlas
  - training
  - segmentation
  - gca
  - jackknife
  - validation
---

# jkgcatrain

## Summary

`jkgcatrain` performs **jackknife (leave-one-out) training** of a Gaussian
Classifier Atlas, for cross-validating an atlas built by [[gcatrain]]. For each
training subject it re-runs [[mri_ca_train]] on **all the other** subjects,
producing one leave-one-out atlas per subject
(`gca/x.<subject>.gca.iNN.gca`). Each such atlas can then be applied back to the
held-out subject (via `gca-apply`/[[mri_ca_label]]) and compared to that
subject's manual segmentation with [[mri_compute_seg_overlap]] to obtain an
unbiased Dice estimate of atlas-based segmentation accuracy. Because all subjects
were already registered to the initial atlas by [[gcatrain]], `jkgcatrain` only
needs to retrain — it does **not** repeat the expensive registration — making it
far cheaper than re-running [[gcatrain]] N times.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/jkgcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain)
- **Binary/script location:** `$FREESURFER_HOME/bin/jkgcatrain`
- **Tool it calls:** [`mri_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L99-L100) (one leave-one-out atlas per subject), timed with `fs_time` and dispatched with `pbsubmit`. The performance-testing recipe in its help additionally uses `gca-apply`, [[mri_ca_label]], and [[mri_compute_seg_overlap]].

## Purpose and Context

Once [[gcatrain]] has produced a whole-brain GCA, you want to know how accurately
that atlas will segment a *new* subject. Estimating accuracy on the very subjects
used to build the atlas is optimistically biased. The standard remedy is
**leave-one-out cross-validation**: for each subject, build an atlas from the
others, segment the held-out subject with it, and measure overlap against its
manual labels.

`jkgcatrain` implements the training half of that procedure. Its key efficiency is
that it reuses the per-subject registrations (`norm.iNN.mgz`,
`talairach.iNN.m3z`) that [[gcatrain]] already computed against the initial atlas
— so each leave-one-out atlas is a single [[mri_ca_train]] call over the remaining
subjects, with no new [[mri_ca_register]]. The script's own help notes this is why
it is "much faster than running gcatrain multiple times leaving out a subject"
([`scripts/jkgcatrain:319-329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L319-L329)).

It is run **after** [[gcatrain]] on the same directory and is **not** part of the
ordinary [[wiki/pipelines/recon-all|recon-all]] stream.

## Inputs

### Required Inputs

- **`--g gcadir`** — a directory previously built by [[gcatrain]] (becomes
  `SUBJECTS_DIR`). It must contain `scripts/subjectlist.txt` and
  `scripts/manseg.txt` (read at
  [`scripts/jkgcatrain:78-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L78-L79)) and, for each
  subject, the registration products of the chosen iteration:
  `<subject>/mri/norm.iNN.mgz` and `<subject>/mri/transforms/talairach.iNN.m3z`.
- **`--iter N`** — which [[gcatrain]] iteration's registrations to train from
  (usually 2). Mandatory ([`scripts/jkgcatrain:280-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L280-L284)).

### Input Assumptions

> [!assumption] gcatrain has already run for this iteration
> Each subject is assumed to carry the iteration-`NN` outputs that [[gcatrain]]
> produced via `recon-all -gcatrain-iter`: the CA-normalised `norm.iNN.mgz` and
> the non-linear morph `talairach.iNN.m3z` (and the manual segmentation named in
> `manseg.txt`). `jkgcatrain` consumes these directly; it does not register
> anything itself.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `gca/x.<subject>.gca.iNN.gca` | `gcadir/gca/` | the leave-one-out atlas trained from all subjects **except** `<subject>` |
| `log/mri_ca_train.iNN.x.<subject>.log` | `gcadir/log/` | per-subject `mri_ca_train` log |
| `log/jkgcatrain.Y…log` | `gcadir/log/` | this script's log |

One atlas is written per subject (`x.<subject>.gca.iNN.gca`,
[`scripts/jkgcatrain:93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L93)). The downstream Dice
files (`dice.x.<subject>.gca.iNN.dat`) shown in the help recipe are produced by
the separate `gca-apply`/[[mri_compute_seg_overlap]] step, not by this script.

### Output Specifications

Each `x.<subject>.gca.iNN.gca` is a Gaussian Classifier Atlas in [[gca-format]],
built at the same **prior spacing 2 mm / node spacing 4 mm** as [[gcatrain]]'s
all-subject atlas ([`scripts/jkgcatrain:99-100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L99-L100)), so it is
directly comparable to the full atlas.

## Mathematical Foundations

`jkgcatrain` performs no numerical computation itself — it constructs leave-one-out
subject lists and dispatches one [[mri_ca_train]] per subject.

> [!internal] Atlas estimation lives in mri_ca_train
> The GCA model and its estimation are implemented in [[mri_ca_train]]; see that
> page and [[gca-format]]. The accuracy metric used to evaluate the held-out
> subjects is the Dice overlap computed by [[mri_compute_seg_overlap]].

The statistical idea it realises is **leave-one-out cross-validation**: $N$
atlases, each trained on $N-1$ subjects, used to score the one omitted subject —
an (approximately) unbiased estimate of out-of-sample segmentation performance.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/jkgcatrain:177-267`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L177-L267)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g`<br>`--o` | string | *(required)* | The [[gcatrain]] output directory; becomes `SUBJECTS_DIR`. The subject list and manual-seg name are read from its `scripts/` files. |
| `--iter` | int | *(required)* | Iteration number whose registrations to train from (usually 2). Sets the `iNN` suffix and the `norm.iNN.mgz`/`talairach.iNN.m3z` inputs. |
| `--nthreads`<br>`--threads` | int | `1` | OpenMP threads per `mri_ca_train` job; sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS` and `pbsubmit -l nodes=1:ppn=$nthreads`. |
| `--no-submit` | bool | submit on | Run the per-subject `mri_ca_train` jobs serially in the foreground instead of dispatching with `pbsubmit`. |
| `--pb` | string | — | Extra option string appended to every `pbsubmit` command. Repeatable. |
| `--pb-m` | bool | off | Add `-m $USER` to `pbsubmit` (e-mail the user when jobs start/finish). |
| `--rebuild-gca` | bool | off | Preset that mimics the old `rebuild_gca` flow: sets `m3z=talairach_one.m3z`, `normname=norm.mgz`, and `iter=2` (so it reads those fixed inputs instead of the `iNN`-suffixed ones). |
| `--done` | file | — | Write a done file: `0` on success, `1` on error. |
| `--log` | string | `gcadir/log/jkgcatrain.Y…log` | Explicit log file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--rebuild-gca` overrides the input names and forces iter 2
> `--rebuild-gca` hard-sets `m3z=talairach_one.m3z`, `normname=norm.mgz`, and
> `iter=2` ([`scripts/jkgcatrain:223-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L223-L228)). Because flags
> are processed left to right, this overrides a preceding `--iter`; and these
> fixed input names (`norm.mgz`, `talairach_one.m3z`) must exist for every
> subject. Its purpose is to reproduce the legacy `rebuild_gca` behaviour rather
> than the `iNN`-suffixed [[gcatrain]] outputs. The source comment marks it
> tentative ("Mimics rebuild_gca script (?)").

> [!gotcha] Existing leave-one-out atlases are skipped
> If `gca/x.<subject>.gca.iNN.gca` already exists, that subject is skipped and the
> loop continues ([`scripts/jkgcatrain:94-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L94-L97)), so a re-run only
> fills in missing atlases. The target file is removed before (re)training and
> serves as a crude done sentinel ([`scripts/jkgcatrain:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L102)).

Other interactions:

- `--no-submit` makes each `mri_ca_train` run inline and abort on error; in
  `pbsubmit` mode jobs are fire-and-forget with a `sleep 10` between submissions.
- A built-in post-submission waiting loop exists but is **disabled** (`if(0)`,
  [`scripts/jkgcatrain:120-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L120-L140)); in cluster mode the script
  returns after submitting and you must wait for the jobs yourself.

## Typical Use Cases

### 1. Jackknife the iteration-2 atlas (normal use)

```bash
# After gcatrain ... --niters 2 --g all39, cross-validate it:
jkgcatrain --g all39 --iter 2 --threads 4
# Creates all39/gca/x.<subject>.gca.i02.gca for every subject.
```

### 2. Run serially (no cluster)

```bash
jkgcatrain --g all39 --iter 2 --threads 8 --no-submit
```

### 3. Score the held-out subjects (from the help recipe)

```bash
# For each subject: label it with its leave-one-out atlas and Dice vs. manual seg.
foreach subject (`cat all39/scripts/subjectlist.txt`)
  gca-apply --s $subject --gca all39/gca/x.$subject.gca.i02.gca \
    --sd all39 --dice seg_edited10.mgz dice.x.$subject.gca.i02.dat \
    --lta all39/$subject/mri/transforms/talairach.i02.lta --overwrite --threads 3
end
```

This applies each leave-one-out atlas ([[mri_ca_label]]) to its held-out subject
and computes the Dice overlap ([[mri_compute_seg_overlap]]) against the manual
segmentation — the actual cross-validation metric. (See the full recipe in
[`scripts/jkgcatrain:341-373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L341-L373).)

## Pipeline Context

`jkgcatrain` is a **post-training cross-validation** stage. It runs after
[[gcatrain]] has built the atlas and registered every subject, and is **not**
part of the per-subject [[wiki/pipelines/recon-all|recon-all]] stream.

**Predecessor:** [[gcatrain]] (produces the `iNN` registrations and the full
atlas) → **jkgcatrain** (per-subject leave-one-out atlases
`x.<subject>.gca.iNN.gca`) → **Successor:** `gca-apply`/[[mri_ca_label]] +
[[mri_compute_seg_overlap]] to score each held-out subject (the help recipe).

It deliberately reuses [[gcatrain]]'s registrations, so unlike re-running
[[gcatrain]] N times it skips [[mri_ca_register]] entirely.

## Gotchas and Caveats

> [!gotcha] Requires the chosen iteration's registrations to exist
> `jkgcatrain` reads `norm.iNN.mgz` and `talairach.iNN.m3z` per subject; if you
> pass an `--iter` that [[gcatrain]] never ran, the per-subject `mri_ca_train`
> calls will fail on missing inputs. Use the same iteration you trained to
> (commonly 2).

> [!gotcha] Cluster mode does not wait for completion
> The waiting loop is disabled (`if(0)`), so in `pbsubmit` mode the script exits
> "Done submitting" while the `mri_ca_train` jobs are still running
> ([`scripts/jkgcatrain:118-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L118-L140)). Check the queue / the
> `gca/x.*.gca.iNN.gca` files before scoring.

## Error Compensation and Guard Rails

- **Resumability.** Existing `x.<subject>.gca.iNN.gca` files cause that subject to
  be skipped, so a re-run only trains the missing leave-one-out atlases.
- **Crude done sentinel.** The target atlas is `rm -f`'d before training and its
  reappearance signals completion (source comment: "use this as the done file,
  need better", [`scripts/jkgcatrain:102`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L102)).
- **Done file with status code.** Success writes `0`, an error writes `1` to
  `--done` ([`scripts/jkgcatrain:157-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L157-L172)).

## Related Tools

- [[gcatrain]] — produces the atlas and the per-subject registrations that `jkgcatrain` reuses; run it first.
- [[mri_ca_train]] — the atlas-estimation binary called once per held-out subject.
- [[mri_ca_register]] — the registration step `jkgcatrain` deliberately avoids repeating.
- [[mri_ca_label]] — applies each leave-one-out atlas to its held-out subject (via `gca-apply`) in the scoring step.
- [[mri_compute_seg_overlap]] — computes the Dice overlap between predicted and manual segmentations for cross-validation.
- [[gca-format]] — the `.gca` atlas file format produced.
- `gca-apply` *(no wiki page yet)* — the convenience wrapper used in the help recipe to label and Dice each held-out subject.

## Confidence and Gaps

**High confidence:** the complete flag set, the leave-one-out loop, the reuse of
[[gcatrain]] registrations (`norm.iNN.mgz`/`talairach.iNN.m3z`), the
`--rebuild-gca` preset, the skip-if-exists behaviour, and the disabled waiting
loop — all read directly from
[`scripts/jkgcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain).

> [!gap] `gca-apply` options
> The scoring half of the workflow relies on `gca-apply` (and its `--dice`/`--lta`
> options), which is not yet documented in this wiki; its exact interface is out
> of scope for this page.

> [!gap] Cluster-submission semantics
> The `pbsubmit` dispatch and the (disabled) polling loop were read but not
> executed; precise scheduler behaviour is described from the script only.

## References

- FreeSurfer source: [`scripts/jkgcatrain`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain) (v8.2.0).
- Built-in help: `jkgcatrain --help` (usage block + `BEGINHELP`,
  [`scripts/jkgcatrain:300-373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L300-L373)).
