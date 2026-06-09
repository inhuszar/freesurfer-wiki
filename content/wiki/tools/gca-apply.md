---
title: "gca-apply"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gca-apply"
families: []                     # standalone GCA-atlas application wrapper
recon_all_stage: null
related:
  - "[[mri_em_register]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_ca_register]]"
  - "[[mri_ca_label]]"
  - "[[mri_ca_train]]"
  - "[[mri_segstats]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[gca-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hard-coded developer atlas paths for --hypothalamus / --hypothalamus-sym point into a personal cluster directory and are unlikely to exist in a normal install."
tags:
  - atlas
  - segmentation
  - gca
  - subcortical
  - aseg
---

# gca-apply

## Summary

`gca-apply` is a tcsh driver that applies a trained subcortical **GCA**
(Gaussian Classifier Atlas, see [[gca-format]]) to one subject, reproducing the
four volumetric atlas stages that [[wiki/pipelines/recon-all|recon-all]] runs —
[[mri_em_register]] (affine registration to the atlas), [[mri_ca_normalize]]
(atlas-guided intensity normalisation), [[mri_ca_register]] (nonlinear
morph to the atlas), and [[mri_ca_label]] (Bayesian volumetric labelling) — and
then summarises the resulting segmentation with [[mri_segstats]]. Its defining
feature is that it writes all of its outputs under **atlas-specific filenames**
(`<gcabase>.lta`, `<gcabase>.m3z`, `norm.<gcabase>.mgz`, `<gcabase>.aseg.mgz`,
`<gcabase>.stats`) so that running a non-standard or experimental atlas never
overwrites the canonical `recon-all` results (`aseg.mgz`, `norm.mgz`, etc.). It
is the per-subject "apply" counterpart to the atlas **training** scripts
[[wiki/tools/rebuild_gca_atlas.csh|rebuild_gca_atlas.csh]] / `gcatrain`, and is
the labelling engine invoked inside `jkgcatrain`'s jack-knife validation.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gca-apply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply)
- **Binary/script location:** `$FREESURFER_HOME/bin/gca-apply`
- **FreeSurfer tools invoked:** [`mri_em_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L93), [`mri_ca_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L114), [`mri_ca_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L140), [`mri_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L162), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L176-L180), and optionally [`mri_compute_seg_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L193-L194). Uses the shell utilities `getfullpath`, `UpdateNeeded`, and `fs_time`.

## Purpose and Context

When you train a new subcortical atlas — or want to test an existing one against
a subject — you need to run exactly the same volumetric labelling chain that
`recon-all` uses, but you do **not** want to clobber the subject's production
`aseg.mgz`, `norm.mgz`, or Talairach transforms. `gca-apply` solves this: it runs
the full pipeline (registration → normalisation → nonlinear morph → labelling →
segmentation statistics) and tags every output with the atlas's base name, so a
subject directory can hold the results of several different atlases side by side.

It is normally run **by hand** (or by a higher-level driver such as `jkgcatrain`)
and is *not* part of `recon-all` itself. The intended upstream state is a subject
that has been processed through `recon-all`'s `autorecon1` so that `nu.mgz` and
`brainmask.mgz` exist; the help text recommends
`recon-all -s subject -autorecon1 -no-talcheck`
([`scripts/gca-apply:548-554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L548-L554)) and stresses that these inputs should be created the **same way**
they were for the subjects the atlas was trained on, so that intensities match.

> [!gotcha] This is the "apply" half of a train/apply pair
> [[wiki/tools/rebuild_gca_atlas.csh|rebuild_gca_atlas.csh]] and `gcatrain`
> *build* a `.gca`; `gca-apply` *uses* one. The same four binaries
> ([[mri_em_register]], [[mri_ca_normalize]], [[mri_ca_register]],
> [[mri_ca_label]]) appear on both sides, but here they run once, for one
> subject, in apply mode rather than inside a training loop.

## Inputs

### Required Inputs

- **A GCA atlas** — given with `--gca <file.gca>` (or one of the convenience
  presets `--gca-rb-2016`, `--hypothalamus`, `--hypothalamus-sym`). See
  [[gca-format]]. The file must exist
  ([`scripts/gca-apply:232-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L232-L235)).
- **A subject** — given with `--s <subject>`; the directory
  `$SUBJECTS_DIR/<subject>` must exist
  ([`scripts/gca-apply:418-423`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L418-L423)).
- **`mri/nu.mgz`** (or whatever `--input` names) and **`mri/brainmask.mgz`**
  (or whatever `--brainmask` names) inside the subject — both are required to
  exist ([`scripts/gca-apply:424-430`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L424-L430)).

### Input Assumptions

> [!assumption] Inputs must match the atlas's training preprocessing
> The intensity-normalisation input (`nu.mgz` by default) and the brain mask are
> assumed to have been produced the **same way** as for the atlas's training
> subjects, because [[mri_ca_normalize]] and [[mri_ca_label]] compare the
> subject's intensities against the atlas's Gaussian intensity models. The help
> recommends generating them with `recon-all -s subject -autorecon1
> -no-talcheck` ([`scripts/gca-apply:548-554`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L548-L554)). A mismatch (e.g. a different
> NU correction or a different skull-strip) degrades the labelling silently.

- The atlas must be a **volumetric** GCA (subcortical/whole-brain), not a surface
  GCS — the chain here is the `mri_ca_*` volume pipeline, not the `mris_ca_*`
  surface pipeline.
- `OMP_NUM_THREADS` defaults to `1` (or `$FS_OMP_NUM_THREADS` if set,
  [`scripts/gca-apply:30-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L30-L34)); the nonlinear morph
  ([[mri_ca_register]]) is the slow stage and the help warns a single-threaded
  run "may take 8 hours or so" ([`scripts/gca-apply:531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L531)).

## Outputs

### Files Created

All paths are relative to the output directory `<outdir>` (which defaults to the
subject directory, but can be redirected with `--o`). The script first creates
`<outdir>/stats`, `<outdir>/mri/transforms`, and `<outdir>/scripts`
([`scripts/gca-apply:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L61)). `<gcabase>` defaults to `basename <gca> .gca` and is
overridable with `--base`.

| File | Where | Produced by | Contents |
|------|-------|-------------|----------|
| `<gcabase>.lta` | `mri/transforms/` | [[mri_em_register]] (or copied from `--lta`) | affine atlas→subject registration ([[lta-format]]) |
| `norm.<gcabase>.mgz` | `mri/` | [[mri_ca_normalize]] (or copied from `--norm`) | atlas-normalised intensity volume ([[mgz]]) |
| `<gcabase>.m3z` | `mri/transforms/` | [[mri_ca_register]] | nonlinear morph field (skipped if `--m3z` supplies one) |
| `<gcabase>.aseg.mgz` | `mri/` | [[mri_ca_label]] | the volumetric segmentation ([[mgz]]) |
| `<gcabase>.stats` | `stats/` | [[mri_segstats]] | per-label volume / intensity table |
| `gca-apply.<gcabase>.log` | `scripts/` | the script | full command + per-stage log |
| `<DiceFile>`, `<DiceFile>.table` | `mri/` and CWD | [[mri_compute_seg_overlap]] | Dice overlap vs a reference seg (only with `--dice`) |

### Output Specifications

`<gcabase>.aseg.mgz` is an integer label volume in the subject's conformed
voxel space, with label IDs from the colour table passed via `--ctab` (default
`$FREESURFER_HOME/ASegStatsLUT.txt`). `norm.<gcabase>.mgz` is `uchar` intensity
data on the same grid. The `.stats` file is computed with **partial-volume
correction** using `norm.<gcabase>.mgz` as both the intensity and the PV
reference (`--pv $norm`, [`scripts/gca-apply:176-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L176-L180)); eTIV is added only if
`$SUBJECTS_DIR/<subject>/mri/transforms/talairach.xfm` exists
([`scripts/gca-apply:181-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L181-L182)).

## Mathematical Foundations

`gca-apply` is an **orchestrator** — it performs no numerical computation of its
own beyond run-time bookkeeping. All of the mathematics lives in the four C
binaries it calls.

> [!internal] The atlas mathematics live in the `mri_ca_*` / `mri_em_*` binaries
> The affine EM registration objective is in [[mri_em_register]]; the
> atlas-conditioned intensity renormalisation is in [[mri_ca_normalize]]; the
> nonlinear MAP morph (with the smoothness regulariser) is in
> [[mri_ca_register]]; and the per-voxel Bayesian MAP labelling
> $\hat{\ell}(x)=\arg\max_\ell p(I(x)\mid\ell)\,p(\ell\mid x)$, where the
> spatially varying prior $p(\ell\mid x)$ and per-label Gaussians come from the
> [[gca-format|GCA]], is in [[mri_ca_label]]. The GCA's construction is described
> in [[mri_ca_train]].

The only "tuning" the script itself contributes is a fixed set of option choices
passed to those binaries (see [Configuration Interactions](#configuration-interactions)),
most notably the **v6 labelling options** `-relabel_unlikely 9 .3 -prior 0.5`
([`scripts/gca-apply:157-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L157-L160)), which post-process [[mri_ca_label]]'s output by
relabelling voxels whose assigned label is statistically unlikely within a 9-voxel
window.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gca-apply:221-402`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L221-L402)). Boolean flags take no argument.

#### Atlas and subject

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--gca` | string | *(required)* | Path to the GCA atlas to apply ([[gca-format]]). Must exist. |
| `--gca-rb-2016` | bool | — | Shortcut that sets `--gca` to `$FREESURFER_HOME/average/RB_all_2016-05-10.vc700.gca`, the standard distributed subcortical atlas. |
| `--hypothalamus` | bool | — | Developer convenience: sets `--gca`, `--ctab`, and `--base` for an experimental hypothalamic atlas under a personal cluster path (see gap). |
| `--hypothalamus-sym` | bool | — | As above, symmetric variant. |
| `--s` | string | *(required)* | Subject name; `$SUBJECTS_DIR/<subject>` must exist. |
| `--input` | string | `nu.mgz` | Intensity input under `mri/` fed to em-register/normalise. |
| `--brainmask` | string | `brainmask.mgz` | Brain mask under `mri/` used by all stages (`-mask`). |
| `--ctab` | string | `$FREESURFER_HOME/ASegStatsLUT.txt` | Colour table for [[mri_segstats]] label names; must exist. |

#### Output naming and location

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | subject dir | Output directory; built to mirror a `recon-all` subject tree. Use when you lack write permission to the source data — be sure the subject name appears in the path ([`scripts/gca-apply:566-572`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L566-L572)). |
| `--base` | string | `basename <gca> .gca` | Stem used to name every output file (the `<gcabase>` above). |
| `--log` | string | `<outdir>/scripts/gca-apply.<gcabase>.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |

#### Reusing precomputed stages

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--lta` | string | — | Use this affine LTA instead of running [[mri_em_register]] (it is copied to `<gcabase>.lta`). |
| `--norm` | string | — | Use this normalised volume instead of running [[mri_ca_normalize]] (copied to `norm.<gcabase>.mgz`). |
| `--m3z` | string | — | Use this existing morph (looked up at `<outdir>/transforms/<m3zSpec>`) instead of running [[mri_ca_register]]; must exist. |

#### Behaviour toggles

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--v6labopts` | bool | **on** | Add `-relabel_unlikely 9 .3 -prior 0.5` to the [[mri_ca_label]] command (the FreeSurfer 6 defaults). |
| `--no-v6labopts` | bool | — | Omit those options, reverting to the 5.3-style `mri_ca_label` command line ([`scripts/gca-apply:560-564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L560-L564)). |
| `--no-segstats` | bool | — | **Intended** to skip [[mri_segstats]] — but see the gotcha: in v8.2.0 this flag has no effect. |
| `--dice` | `DiceSeg DiceFile` | — | After labelling, run [[mri_compute_seg_overlap]] comparing the new aseg against `mri/<DiceSeg>`, writing `<DiceFile>` and `<DiceFile>.table`. |
| `--force-update` | bool | off | Recreate every output even if it is newer than its inputs; also sets the internal `Overwrite` flag. |
| `--gcareg-iters` | int | — | Pass `-gcareg-iters N` to [[mri_ca_register]] to cap iterations; documented as "only for testing" to make the morph run faster. |

#### Environment / housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--threads`<br>`--nthreads` | int | `1` | Set `OMP_NUM_THREADS` for the multi-threaded binaries. |
| `--sd`<br>`-sd` | string | `$SUBJECTS_DIR` | Set the subjects directory; must exist (canonicalised with `getfullpath`). |
| `--tmp`<br>`--tmpdir` | string | — | Set a temp dir; also disables cleanup (cleanup is currently a no-op anyway). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp cleanup (the `rm -rf` is commented out, [`scripts/gca-apply:202`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L202)). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--no-segstats` does nothing in v8.2.0
> The flag sets an internal `DoSegStats = 0`
> ([`scripts/gca-apply:299-301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L299-L301)), but that variable is **never read** — the
> [[mri_segstats]] block at [`scripts/gca-apply:172-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L172-L188) runs unconditionally
> (gated only by the `UpdateNeeded` timestamp check). So segstats is always
> computed despite the help promising otherwise. Code is authoritative.

> [!contradiction] Help vs. code: `--no-segstats`
> The usage text says `--no-segstats : do not compute segstats`
> ([`scripts/gca-apply:504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L504)), but the code has no branch honouring it. Treat
> segstats as mandatory output.

> [!gotcha] The "already exists" guards only fire **with** `--force-update`
> The block that errors when `<gcabase>.lta` / `.m3z` / `norm.*` / `.aseg` /
> `.stats` already exist is wrapped in `if($ForceUpdate)`
> ([`scripts/gca-apply:454-477`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L454-L477)) — and `--force-update` simultaneously sets
> `Overwrite = 1` ([`scripts/gca-apply:294-297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L294-L297)), which suppresses those very
> errors. Net effect: there is effectively **no** "refuse to overwrite" guard in
> normal use; re-running instead relies on per-stage `UpdateNeeded` timestamp
> checks to skip work that is already up to date.

> [!gotcha] `--lta`, `--norm`, `--m3z` short-circuit their stages
> Supplying `--lta` copies your file in place of running [[mri_em_register]];
> `--norm` likewise replaces [[mri_ca_normalize]]; `--m3z` replaces
> [[mri_ca_register]]. These are the levers for re-labelling quickly when the
> registration/normalisation are already trustworthy. Note `--m3z` is resolved at
> `<outdir>/transforms/<m3zSpec>` (not `<outdir>/mri/transforms/`,
> [`scripts/gca-apply:445-451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L445-L451)), so place the file accordingly.

- **`--gca` vs the presets** (`--gca-rb-2016`, `--hypothalamus*`): the presets
  simply set `--gca` (and the hypothalamus presets also set `--ctab`/`--base`);
  a later explicit `--gca` on the command line overrides them because parsing is
  left-to-right.
- **`--base` drives every filename**: change it whenever you apply more than one
  atlas to the same subject so the outputs do not collide.

## Typical Use Cases

### 1. Apply the standard distributed subcortical atlas

```bash
# nu.mgz + brainmask.mgz must already exist (autorecon1)
gca-apply --gca-rb-2016 --s subj01 --nthreads 4
# → mri/RB_all_2016-05-10.vc700.aseg.mgz, .stats, transforms, norm.*.mgz
```

### 2. Test a freshly trained atlas without touching production files

```bash
gca-apply --gca /atlases/myRB_all_2026.gca --s subj01 \
  --base myRB2026 --nthreads 8
# → mri/myRB2026.aseg.mgz, mri/norm.myRB2026.mgz, stats/myRB2026.stats
#   leaving the subject's real aseg.mgz/norm.mgz untouched
```

### 3. Re-label quickly using an existing morph, and score it

```bash
# Reuse a known-good .m3z, then Dice against the manual labels
gca-apply --gca /atlases/myRB_all_2026.gca --s subj01 --base myRB2026 \
  --m3z myRB2026.m3z \
  --dice seg_manual.mgz myRB2026.dice
```

### 4. Write outputs to a scratch tree (read-only source data)

```bash
gca-apply --gca-rb-2016 --s subj01 \
  --o /scratch/gcatest/subj01 --nthreads 4
```

## Pipeline Context

`gca-apply` is a stand-alone **atlas-application** wrapper. It is **not** called
by [[wiki/pipelines/recon-all|recon-all]]; rather it replays recon-all's
volumetric atlas stages on demand. Its place in the larger atlas workflow:

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] `-autorecon1`
(produces `nu.mgz`, `brainmask.mgz`) and the atlas-training scripts
[[mri_ca_train]] / [[wiki/tools/rebuild_gca_atlas.csh|rebuild_gca_atlas.csh]] /
`gcatrain` (produce the `.gca`) → **gca-apply** → **Successors:** inspection in
[[wiki/tools/freeview|freeview]], or `jkgcatrain` which calls `gca-apply` to
label held-out subjects during jack-knife validation
([`scripts/jkgcatrain:345`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L345)).

Internally it is exactly the chain
[[mri_em_register]] → [[mri_ca_normalize]] → [[mri_ca_register]] →
[[mri_ca_label]] → [[mri_segstats]], using options chosen to mirror
`recon-all` (`-uns 3`, `-align-after`, `-nobigventricles`, and the v6 label
options) while deliberately *not* using a couple of the training-only options
(e.g. `-smooth 1.0 -levels 2`) that
[[wiki/tools/rebuild_gca_atlas.csh|rebuild_gca_atlas.csh]] passes to
[[mri_ca_register]] ([`scripts/gca-apply:136-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L136-L139)).

## Gotchas and Caveats

> [!gotcha] Single-threaded runs are very slow
> The nonlinear morph ([[mri_ca_register]]) dominates run time; the help warns of
> ~8 hours single-threaded ([`scripts/gca-apply:531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L531)). Use `--nthreads` (or set
> `FS_OMP_NUM_THREADS`). `--gcareg-iters 1` exists only to make test runs finish
> quickly and must not be used for real labelling.

> [!gotcha] It changes directory into `<outdir>/mri`
> Before running, the script does `cd $outdir/mri`
> ([`scripts/gca-apply:81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L81)) because [[mri_em_register]] writes scratch files into
> the current directory. The `--dice` table and any relative paths you pass are
> therefore resolved relative to `<outdir>/mri`, not your shell's CWD.

> [!gotcha] Hard-coded personal atlas paths
> `--hypothalamus` / `--hypothalamus-sym` point `--gca`/`--ctab` at a developer's
> cluster directory (`/autofs/cluster/fsm/users/greve/...`,
> [`scripts/gca-apply:280-292`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L280-L292)) that will not exist in a normal install.
> Use explicit `--gca`/`--ctab` instead.

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Every stage is guarded by `UpdateNeeded`, which compares
  the output's timestamp against its inputs; an up-to-date output is skipped
  (e.g. [`scripts/gca-apply:94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L94), [`scripts/gca-apply:154`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L154)). `--force-update`
  forces every stage to rerun.
- **Fail-fast.** After each binary the script checks `$status` and exits `1`
  on any non-zero return (e.g. [`scripts/gca-apply:104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L104), [`scripts/gca-apply:165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L165)),
  so a failed registration aborts the whole run rather than mislabelling.
- **Input existence checks.** `--gca`, `--ctab`, `--lta`, `--norm`, the subject
  directory, and `nu.mgz`/`brainmask.mgz` are all verified to exist before any
  work starts ([`scripts/gca-apply:408-451`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L408-L451)).
- **eTIV is conditional.** [[mri_segstats]] only computes eTIV if a
  `talairach.xfm` exists ([`scripts/gca-apply:181-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L181-L182)); otherwise that column is
  simply absent rather than the run failing.

## Known Bugs

- [[00167]] — `--no-segstats` sets the unread `DoSegStats` (segstats always runs), and the `--force-update` overwrite guards can never refuse because `--force-update` also sets `Overwrite=1`.

## Related Tools

- [[mri_em_register]] — affine atlas→subject registration; the first stage (or supply `--lta`).
- [[mri_ca_normalize]] — atlas-guided intensity normalisation; second stage (or supply `--norm`).
- [[mri_ca_register]] — nonlinear GCA morph; third and slowest stage (or supply `--m3z`).
- [[mri_ca_label]] — Bayesian volumetric labelling; produces `<gcabase>.aseg.mgz`.
- [[mri_segstats]] — per-label volume/intensity statistics over the new aseg.
- [[mri_compute_seg_overlap]] — Dice scoring against a reference seg (with `--dice`).
- [[mri_ca_train]] — trains the volumetric GCA that this script applies.
- [[wiki/tools/rebuild_gca_atlas.csh|rebuild_gca_atlas.csh]] — the (older) atlas-build counterpart to this apply script.
- `gcatrain` *(no wiki page yet)* — the modern atlas-build driver that replaces `rebuild_gca_atlas.csh`.
- `jkgcatrain` *(no wiki page yet)* — jack-knife validation driver that calls `gca-apply` to label held-out subjects.
- [[wiki/pipelines/recon-all|recon-all]] — runs the same volumetric stages in production (writing the canonical `aseg.mgz`).

## Confidence and Gaps

**High confidence:** the full flag set and defaults, the five-stage pipeline and
the exact binaries/options invoked, the atlas-specific output naming, the
`UpdateNeeded` skip / fail-fast behaviour, the `--no-segstats` no-op, and the
overwrite-guard quirk — all read directly from
[`scripts/gca-apply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply).

> [!gap] Personal atlas presets
> `--hypothalamus` / `--hypothalamus-sym` reference a developer's private cluster
> paths and were not exercised; their atlases are unlikely to be present in a
> released `$FREESURFER_HOME`.

## References

- FreeSurfer source: [`scripts/gca-apply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply) (v8.2.0).
- Built-in help: `gca-apply --help` (the `BEGINHELP` block, [`scripts/gca-apply:526-575`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gca-apply#L526-L575)).
- Caller: [`scripts/jkgcatrain:345-357`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/jkgcatrain#L345-L357) (jack-knife labelling).
- Fischl B. et al., *Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain*, Neuron 33(3):341–355, 2002 — the GCA subcortical segmentation method this script applies.
