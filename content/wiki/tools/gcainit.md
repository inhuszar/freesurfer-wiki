---
title: "gcainit"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gcainit"
families: []                     # GCA-training helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[gcatrain]]"
  - "[[gcaprepone]]"
  - "[[mri_ca_train]]"
  - "[[mri_ca_normalize]]"
  - "[[mri_add_xform_to_header]]"
  - "[[gca-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - atlas
  - training
  - segmentation
  - gca
  - initialization
---

# gcainit

## Summary

`gcainit` builds the **initial** Gaussian Classifier Atlas (`gca.i01.gca`) from a
single, manually labelled "init" subject — the seed atlas that bootstraps the
iterative whole-brain GCA training driven by [[gcatrain]]. It intensity-normalises
the init subject against its own manual segmentation with [[mri_ca_normalize]]
(no atlas, no transform), then runs [[mri_ca_train]] on that one subject to
produce a coarse one-subject atlas. Every subsequent training iteration registers
all subjects to this first atlas, so `gcainit` provides the registration target
that makes the whole pipeline converge.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gcainit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit)
- **Binary/script location:** `$FREESURFER_HOME/bin/gcainit`
- **Tools it calls:** [`mri_add_xform_to_header`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L87) (record Talairach in the manual-seg header), [`mri_ca_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L95) (atlas-free intensity normalisation), and [`mri_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L106-L109) (build the initial GCA).

## Purpose and Context

GCA atlas training has a chicken-and-egg problem: registering a subject into atlas
space requires an atlas, but estimating the atlas requires registered subjects.
[[gcatrain]] solves this by first building a crude atlas from one subject and then
iteratively refining. `gcainit` is the script that builds that **first** atlas.

It runs *after* [[gcaprepone]] has prepared the init subject (so `nu.mgz`,
`brainmask.mgz`, and the manual Talairach `talairach.xfm` already exist) and is
invoked once by [[gcatrain]]
([`scripts/gcatrain:189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L189)). It is **not** a stand-alone
user tool and is **not** part of the ordinary
[[wiki/pipelines/recon-all|recon-all]] stream.

## Inputs

### Required Inputs

- **`--g gcadir`** — the atlas-training directory (becomes `SUBJECTS_DIR`), already
  populated by [[gcaprepone]]/[[gcatrain]]. It must contain
  `scripts/initsubject.txt`, `scripts/mantal.txt`, `scripts/manseg.txt`
  (and optionally `scripts/dosym.txt`), read at
  [`scripts/gcainit:71-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L71-L78).

For the init subject (read from `initsubject.txt`) the following must already
exist under `gcadir/<initsubject>/mri/`, and are checked at
[`scripts/gcainit:234-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L234-L249):

- `brainmask.mgz` — brain mask.
- `nu.mgz` — NU-corrected intensity volume.
- `transforms/talairach.xfm` — Talairach transform.
- `<manseg>` — the manual segmentation (named in `manseg.txt`).
- `transforms/<mantal>` — the manual Talairach transform (named in `mantal.txt`),
  used by [[mri_ca_train]] as the alignment for the single subject.

### Input Assumptions

> [!assumption] The init subject has already been prepared
> `gcainit` assumes [[gcaprepone]] has run on the init subject: a conformed
> `nu.mgz`, a `brainmask.mgz`, a `transforms/talairach.xfm`, the manual
> segmentation, and the manual Talairach transform are all present in the
> training directory. `gcainit` does not produce these; it only consumes them.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<initsubject>/mri/norm.i01.mgz` | per init subject | atlas-free intensity-normalised volume (from [[mri_ca_normalize]]) |
| `gca/gca.i01.gca` | `gcadir/gca/` | the **initial single-subject GCA** (from [[mri_ca_train]]) |
| (in-place) `<initsubject>/mri/<manseg>` | per init subject | manual segmentation with the Talairach written into its header |
| `log/gcainit.log` | `gcadir/log/` | this script's log |

The two declared outputs are `norm.i01.mgz` and `gca.i01.gca`
([`scripts/gcainit:251-254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L251-L254)).

### Output Specifications

`gca.i01.gca` is a Gaussian Classifier Atlas in [[gca-format]] built at **prior
spacing 2 mm and node spacing 8 mm** — deliberately coarser than the
node-spacing-4 atlas that [[gcatrain]]'s later iterations produce, because it is
estimated from a single subject and only needs to serve as a registration target.
`norm.i01.mgz` is a standard `mgz` intensity volume produced by
[[mri_ca_normalize]].

## Mathematical Foundations

`gcainit` itself performs no computation; the math is in the binaries it calls.

> [!internal] Atlas estimation and normalisation live in the mri_ca_* binaries
> The single-subject atlas (per-node Gaussian intensity model + label priors) is
> built by [[mri_ca_train]]; the atlas-free intensity normalisation is performed
> by [[mri_ca_normalize]]. See those pages and [[gca-format]] for the model and
> equations.

The one numerically meaningful choice `gcainit` makes is the **coarse node
spacing**: it calls `mri_ca_train -prior_spacing 2 -node_spacing 8`
([`scripts/gcainit:108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L108)), versus `-node_spacing 4` in
the all-subject training, reflecting the limited information in one subject.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gcainit:152-221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L152-L221)). The script takes no
training parameters of its own — almost everything is read from
`gcadir/scripts/`.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g`<br>`--o` | string | *(required)* | Atlas-training directory (output of [[gcaprepone]]); becomes `SUBJECTS_DIR`. The init subject, manual Talairach, and manual segmentation are read from its `scripts/` files. |
| `--dontrun`<br>`--dont-run` | bool | run on | Echo the [[mri_ca_normalize]]/[[mri_ca_train]] commands to the log but do not execute them (dry run). |
| `--done` | file | — | Write a done file: `0` on success, `1` on error. Used by [[gcatrain]] as the job sentinel. |
| `--nthreads`<br>`--threads` | int | `1` | OpenMP threads; sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS`. |
| `--log` | string | `gcadir/log/gcainit.log` | Explicit log file. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] Symmetry is inherited from gcatrain, not a flag here
> `gcainit` has no `--sym` flag. Whether the initial atlas is left–right symmetric
> is read from `gcadir/scripts/dosym.txt` (written by [[gcatrain]]); if present and
> set, `mri_ca_train -sym` is added ([`scripts/gcainit:74-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L74-L78),
> [`:107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L107)). This keeps the init atlas and the
> trained atlas consistently (a)symmetric.

> [!gotcha] Refuses to overwrite an existing initial atlas
> If `gca/gca.i01.gca` already exists, `gcainit` errors out
> ([`scripts/gcainit:256-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L256-L259)) rather than rebuild it. Remove the
> file (or let [[gcatrain]]'s done-file logic skip the step) to re-init.

> [!gotcha] `--dontrun` still does the header fix-up
> `--dontrun` only guards the `mri_ca_normalize`/`mri_ca_train` executions; the
> `mri_add_xform_to_header` call on the manual segmentation runs unconditionally
> ([`scripts/gcainit:87-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L87-L90)).

## Typical Use Cases

### 1. As dispatched by gcatrain (normal use)

```bash
# Exactly the call gcatrain builds for the init subject:
gcainit --g rb10-gcatrain \
  --done rb10-gcatrain/log/done/gcainit.990104_vc700.done --nthreads 4
# Produces rb10-gcatrain/gca/gca.i01.gca
```

### 2. Dry run to inspect the commands

```bash
gcainit --g rb10-gcatrain --dontrun
# Logs the mri_ca_normalize and mri_ca_train command lines without running them.
```

## Pipeline Context

`gcainit` is the **initial-atlas stage** of the GCA-training pipeline. It runs once
[[gcaprepone]] has prepared the init subject, and is invoked by [[gcatrain]]
([`scripts/gcatrain:182-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrain#L182-L200)). It is **not** part of the
per-subject [[wiki/pipelines/recon-all|recon-all]] stream.

**Predecessor:** [[gcaprepone]] (prepares the init subject's `nu.mgz`, mask,
Talairach) → **gcainit** (`gca.i01.gca`) → **Successor:** [[gcatrain]]'s iteration
loop, which registers every subject to `gca.i01.gca` ([[mri_ca_register]]) and
retrains ([[mri_ca_train]]) into `gca.i02.gca`.

## Gotchas and Caveats

> [!gotcha] Atlas-free normalisation uses literal "noatlas noxform" placeholders
> The normalisation call is `mri_ca_normalize -mask … -seg … nu.mgz noatlas
> noxform norm.i01.mgz` ([`scripts/gcainit:95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L95)).
> The strings `noatlas` and `noxform` are positional sentinels telling
> [[mri_ca_normalize]] to normalise against the **manual segmentation** rather than
> an atlas/transform — not filenames. Do not create files with those names.

> [!gotcha] Builds the atlas from the manual segmentation with `-check`
> `mri_ca_train` is run with `-T1 norm.i01.mgz -check <initsubject>`
> ([`scripts/gcainit:106-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L106-L109)). The `-check` option enables
> `mri_ca_train`'s subject-label sanity check; on a single subject this validates
> the manual segmentation used to seed the atlas.

## Error Compensation and Guard Rails

- **Up-front existence checks.** `brainmask.mgz`, `nu.mgz`, and the Talairach
  `.xfm` are verified before any work; a missing input is a clean error
  ([`scripts/gcainit:234-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L234-L249)).
- **No-overwrite guard.** An existing `gca.i01.gca` aborts the run rather than
  silently replacing it.
- **Done file with status code.** Success writes `0`, any failed step writes `1`
  to `--done` ([`scripts/gcainit:132-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L132-L148)), which [[gcatrain]] polls.
- **Header transform fix-up.** `mri_add_xform_to_header` records the Talairach in
  the manual-seg header so downstream tools "do not get unhappy" (source comment,
  [`scripts/gcainit:86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L86)).

## Related Tools

- [[gcatrain]] — the orchestrator that calls `gcainit` once for the init subject.
- [[gcaprepone]] — runs first, preparing the init subject's `nu.mgz`/mask/Talairach.
- [[mri_ca_train]] — builds the single-subject atlas `gca.i01.gca`.
- [[mri_ca_normalize]] — performs the atlas-free intensity normalisation (`norm.i01.mgz`).
- [[mri_add_xform_to_header]] — writes the Talairach transform into the manual segmentation header.
- [[gca-format]] — the `.gca` atlas file format produced.

## Confidence and Gaps

**High confidence:** the complete flag set, the inputs read from
`gcadir/scripts/`, the atlas-free `noatlas noxform` normalisation, the
coarse node spacing (8), the symmetry inheritance via `dosym.txt`, and the
no-overwrite guard — all read directly from
[`scripts/gcainit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit). No open questions.

## References

- FreeSurfer source: [`scripts/gcainit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit) (v8.2.0).
- Built-in help: `gcainit --help` (usage block,
  [`scripts/gcainit:275-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcainit#L275-L284)).
