---
title: "rca-surfreg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-surfreg"
families: []                     # recon-all component script (rca-* family of internal stage drivers)
recon_all_stage: autorecon3
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[surfreg]]"
  - "[[josareg]]"
  - "[[mris_register]]"
  - "[[mris_sphere]]"
  - "[[xhemireg]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The expert-options merge order (fsr-getxopts over the V8 / global / subject xopts files) is read from the call site only; fsr-getxopts itself was not audited and has no wiki page yet."
tags:
  - surface
  - registration
  - spherical-morph
  - recon-all
  - longitudinal
---

# rca-surfreg

## Summary

`rca-surfreg` is the **recon-all-internal driver for spherical surface
registration**. For each requested hemisphere it registers the subject's
`?h.sphere` to the FreeSurfer folding atlas, producing `?h.sphere.reg` in the
subject's `surf/` directory and a convenience symlink `?h.fsaverage.sphere.reg`.
It is a thin orchestration layer that selects one of two registration engines —
[[mris_register]] (the classical curvature-driven spherical morph, the default)
or [[josareg]] (a learning-based registration, selected with `--josa`) — and
handles the cross-sectional, longitudinal, and single-hemisphere variants of the
call. It is invoked by [[wiki/pipelines/recon-all|recon-all]] during
**autorecon3** (the `-surfreg` step) and again by `xhemireg` for the
inter-hemispheric (`xhemi`) registration. It is the pipeline counterpart of the
more general standalone [[surfreg]] driver.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-surfreg`
- **Tools invoked:** [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L112) (default registration engine), [`josareg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L136) (learning-based engine, with `--josa`), plus the FreeSurfer helpers `UpdateNeeded`, `fsr-getxopts` / `fsr-checkxopts` (expert-option handling), `getfullpath`, and `fs_time` (timing wrapper).

## Purpose and Context

Surface-based morphometry and group analysis require every subject's cortex to be
mapped into a common spherical coordinate frame. FreeSurfer does this by
registering each subject's inflated-then-spherized surface (`?h.sphere`) to a
**folding atlas** that encodes the average curvature/sulcal geometry across a
training population. The resulting `?h.sphere.reg` is the carrier of cortical
correspondence: every later step that resamples data between a subject and
`fsaverage` (cortical parcellation, `?h.thickness` sampling,
[[mri_surf2surf]], group GLMs) relies on it.

`rca-surfreg` exists so that this stage can be **factored out of the main
[[wiki/pipelines/recon-all|recon-all]] script** into a single re-runnable,
sbatch-friendly unit. recon-all calls it once during autorecon3; `xhemireg`
calls it to register a flipped hemisphere to `fsaverage_sym`. Unlike the
standalone [[surfreg]] command — which can target an arbitrary average subject
and write `?h.<target>.sphere.reg` — `rca-surfreg` always targets the built-in
folding-atlas `.tif` and writes the canonical `?h.sphere.reg` that the rest of the
stream expects.

> [!gotcha] Two engines, one output name
> Whether you use `mris_register` (default) or `josareg` (`--josa`), the output
> is the same `surf/?h.sphere.reg`. The choice of engine is therefore invisible to
> downstream tools but materially changes how the registration was computed. The
> `--josa` path is gated by recon-all's own `JosaReg` flag (which, when set, also
> forces the surfreg stage to run — see [`scripts/recon-all:8326`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8326)).

## Inputs

### Required Inputs

- **`--s <subject>`** — a FreeSurfer subject directory under `$SUBJECTS_DIR` that
  has already reached the spherical-morph stage. The script reads from
  `$SUBJECTS_DIR/<subject>/surf/`.
- **Per-hemisphere surface files** (the registration dependencies, checked via
  `UpdateNeeded` at [`scripts/rca-surfreg#L107-L110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L107-L110)):
  - `?h.sphere` — the spherized surface to be registered (the moving surface;
    produced upstream by [[mris_sphere]]).
  - `?h.curv`, `?h.sulc`, `?h.smoothwm` — curvature/sulcal geometry consumed by
    the `-curv` registration.
- **Folding atlas (`.tif`)** — the registration target, located at
  `<tif-path>/<hemi>.<tif-name>`; by default
  `$FREESURFER_HOME/average/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`
  ([`scripts/rca-surfreg#L22-L23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L22-L23)).

For the **longitudinal** path (`--long <longbaseid>`), the base subject's
`surf/?h.sphere.reg` is additionally required and is used as the initialization
and target ([`scripts/rca-surfreg#L109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L109), [`#L115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L115)).

### Input Assumptions

> [!assumption] The subject is at the spherical-morph stage
> `rca-surfreg` assumes `?h.sphere` and the curvature files already exist (i.e.
> recon-all has run through `-sphere`). It does **not** create the sphere; it only
> registers it. If the dependencies are missing, [[mris_register]] fails and the
> script exits with an error. Inputs are taken from the standard recon-all
> `surf/` layout — there is no flag to point at arbitrary surfaces (that is what
> the standalone [[surfreg]] is for).

## Outputs

### Files Created

| File / path | Where | Contents |
|-------------|-------|----------|
| `?h.sphere.reg` | `<subject>/surf/` | The registered spherical surface — cortical correspondence to the folding atlas. The principal output. |
| `?h.fsaverage.sphere.reg` | `<subject>/surf/` | Symlink to `?h.sphere.reg` (with the `$FS_GII` suffix if GIFTI output is active), created so downstream tools can refer to the fsaverage registration by name ([`scripts/rca-surfreg#L127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L127)). |
| `rca-surfreg.Y…M…log` | `<subject>/scripts/` | Per-run local log (command line, build stamp, timing). |

When `--josa` is used, the registered sphere(s) and links are produced by
[[josareg]] (invoked with `--no-post --links`), not by the loop above; the output
filenames are the same.

### Output Specifications

`?h.sphere.reg` is a FreeSurfer surface file (see [[surface-format]]): the same
vertex set and topology as `?h.sphere`, but with each vertex's spherical
coordinates moved so that the subject's folding pattern aligns with the atlas.
Vertex *i* in `?h.sphere.reg` corresponds to the same anatomical point as vertex
*i* in `?h.white`/`?h.pial`; only the spherical coordinates change. Output
geometry is inherited from the input sphere.

## Mathematical Foundations

`rca-surfreg` performs **no mathematics itself** — it builds and dispatches a
command line. The spherical registration energy (a curvature-correlation term
penalising mismatch between the subject's and the atlas's folding, regularised by
a metric-distortion / areal term) is minimised inside the engine.

> [!internal] The registration math lives in the engine, not this script
> The classical optimisation is implemented in [[mris_register]] (driven here
> with `-curv`, which adds the curvature term); the learning-based alternative is
> implemented in [[josareg]]. See those pages for the objective functions and the
> folding-atlas (`.tif`/`mrisp`) representation. `rca-surfreg` only selects the
> engine, the `-curv` mode, the optional `-remove_negative 1`, and (in the
> longitudinal case) `-nosulc -norot` plus the base registration as initializer.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-surfreg#L178-L315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L178-L315)). Both `--flag` and `-flag` spellings
are accepted where listed. Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s`<br>`-s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--sd`<br>`-sd`<br>`--sdir` | string | `$SUBJECTS_DIR` | Override the subjects directory (sets `SUBJECTS_DIR`). |
| `--threads`<br>`-threads` | integer | `1` | Number of OpenMP threads; sets both `OMP_NUM_THREADS` and `FS_OMP_NUM_THREADS`, and is passed to the engine via `-threads`. |
| `--tif-path`<br>`-tif-path` | string | `$FREESURFER_HOME/average` | Directory holding the folding-atlas `.tif` target. |
| `--tif-name`<br>`-tif-name` | string | `folding.atlas.acfb40.noaparc.i12.2016-08-02.tif` | Atlas filename **without** the `?h.` prefix; the script prepends the hemisphere. |
| `--josa`<br>`-josa` | bool | off | Use [[josareg]] (learning-based) instead of [[mris_register]]. |
| `--lh`<br>`-lh` | bool | both | Register only the left hemisphere. |
| `--rh`<br>`-rh` | bool | both | Register only the right hemisphere. |
| `--long`<br>`-long <longbaseid>` | string | off | Longitudinal mode: initialize/target from the base subject `<longbaseid>` and add `-nosulc -norot`; the base's `?h.sphere.reg` is required. |
| `--usenoneg`<br>`-usenoneg` | bool | off | Add `-remove_negative 1` to the `mris_register` command (forbids folds/negative-area triangles in the result). |
| `--force`<br>`--no-force` | bool | off | Force re-registration even if `?h.sphere.reg` is newer than its inputs (otherwise an up-to-date output is skipped via `UpdateNeeded`). |
| `-expert <file>` | string | — | Expert-options file passed through `fsr-checkxopts`/`fsr-getxopts`; lets advanced users inject extra `mris_register` arguments. |
| `--dontrun`<br>`-dontrun` | bool | off (runs) | Build and echo the commands but do not execute them (dry run). |
| `--log <file>` | string | auto (`scripts/rca-surfreg.*.log`) | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--o <dir>` | string | — | **Accepted but unused** — parsed and stored, then ignored ([`scripts/rca-surfreg#L276-L280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L276-L280)). |
| `--i <vol>` | string | — | **Accepted but unused** — parsed and stored, then ignored ([`scripts/rca-surfreg#L282-L286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L282-L286)). |
| `--tmp`<br>`--tmpdir <dir>` | string | auto | Temp directory (sets `cleanup=0`). Note: the script never actually creates or uses a tmp dir in v8.2.0 (the `mkdir`/`rm` lines are commented out). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp-dir cleanup (no effect, as above). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print usage and exit. |
| `-version` | bool | — | Print the version string and exit. |

> [!gotcha] `--o` and `--i` do nothing
> The `--o` (output dir) and `--i` (input volume) flags are parsed but explicitly
> marked "Not used" in the source ([`scripts/rca-surfreg#L279`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L279), [`#L285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L285)). They
> exist for interface symmetry with other `rca-*` scripts. Output always goes to
> `<subject>/surf/`.

### Configuration Interactions

> [!gotcha] `--josa` overrides almost everything in the `mris_register` path
> When `--josa` is set, the entire `mris_register` hemisphere loop is skipped and
> a single [[josareg]] call is issued instead ([`scripts/rca-surfreg#L135-L144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L135-L144)).
> Consequently `--tif-path`, `--tif-name`, `--usenoneg`, and the `--long`
> mris_register options have **no effect** with `--josa`; only `--lh`/`--rh`,
> `--threads`, `--force`, and expert options carry through. The expert-options key
> also changes: it is read for `mris_register` in the default path but for the
> pseudo-tool `rca-josareg` in the `--josa` path ([`scripts/rca-surfreg#L119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L119) vs [`#L139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L139)).

> [!gotcha] `--long` changes the mris_register invocation, not just the target
> In longitudinal mode the command becomes `mris_register -curv -nosulc -norot
> <base>/surf/?h.sphere.reg <atlas> <out>` ([`scripts/rca-surfreg#L114-L118`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L114-L118)).
> The base time point's registration is used as the **starting point** and
> rotation/sulc terms are disabled, so each time point inherits the base's
> correspondence rather than registering from scratch. This keeps longitudinal
> time points mutually consistent.

- `--lh` and `--rh` each set `hemilist` to a single hemisphere; specifying both
  on the command line is not additive — the **last one wins** (each assignment
  replaces the list), so `--lh --rh` registers only the right hemisphere.
- `--usenoneg` only augments the `mris_register` path; it is silently inert under
  `--josa`.
- `--force` bypasses the `UpdateNeeded` skip for **all** hemispheres in the
  mris_register path, and is passed through as `--force` to `josareg`.

## Typical Use Cases

### 1. As recon-all calls it (cross-sectional, both hemispheres)

```bash
# Exactly the command recon-all issues during autorecon3 (-surfreg step):
rca-surfreg --s subj01 --threads 8 \
  --tif-path $FREESURFER_HOME/average \
  --tif-name folding.atlas.acfb40.noaparc.i12.2016-08-02.tif
# → surf/lh.sphere.reg, surf/rh.sphere.reg (+ ?h.fsaverage.sphere.reg links)
```

### 2. Re-run a single hemisphere after editing

```bash
# Only the left hemisphere needed re-registration; force past the timestamp check.
rca-surfreg --s subj01 --lh --threads 8 --force
```

### 3. Learning-based registration

```bash
# Use josareg instead of the classical spherical morph.
rca-surfreg --s subj01 --josa --threads 8
```

### 4. Longitudinal time point

```bash
# Initialize/target from the base subject's registration (recon-all -long path).
rca-surfreg --s tp1.long.base01 --long base01 --threads 8
```

## Pipeline Context

`rca-surfreg` is the `-surfreg` step of [[wiki/pipelines/recon-all|recon-all]],
which runs in **autorecon3** (the stage that also does average-curvature,
cortical parcellation, and statistics). recon-all builds the call at
[`scripts/recon-all:4212-4227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4212-L4227):

```tcsh
set cmd = (rca-surfreg --s $subjid --threads $OMP_NUM_THREADS \
   --tif-path $AvgCurvTifPath --tif-name $AvgCurvTif)
if($#hemilist == 1) set cmd = ($cmd --$hemilist)
if($longitudinal) set cmd = ($cmd --long $longbaseid)
if($UseNoNeg) set cmd = ($cmd --usenoneg)
if($JosaReg) set cmd = ($cmd --josa)
if($ForceUpdate) set cmd = ($cmd --force)
if($XOptsFile) set cmd = ($cmd --expert $XOptsFile)
```

It runs **after** the sphere has been made (`-sphere`, [[mris_sphere]]) and
**before** average-curvature (`-avgcurv`), the Jacobian-white step, and cortical
parcellation (`mris_ca_label`), all of which consume `?h.sphere.reg`. It is also
invoked by `xhemireg` for the inter-hemispheric registration
([`scripts/xhemireg:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L313)), there with `-hemi <trghemi>`.

**Predecessor:** [[mris_sphere]] (`?h.sphere`) → **rca-surfreg** (`?h.sphere.reg`)
→ **Successors:** `mris_ca_label` (cortical parcellation), surface resampling
([[mri_surf2surf]]), and group analysis.

## Gotchas and Caveats

> [!gotcha] Output name does not encode the target
> `rca-surfreg` always writes `?h.sphere.reg` (registration to the folding atlas /
> fsaverage). The standalone [[surfreg]] writes a target-tagged name like
> `?h.<target>.sphere.reg`. If you need registration to a non-fsaverage average
> subject, use [[surfreg]], not this script.

> [!gotcha] Skip-if-up-to-date can mask a changed atlas
> `UpdateNeeded` compares `?h.sphere.reg` against the input surfaces only — not
> against the `.tif` atlas ([`scripts/rca-surfreg#L107-L110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L107-L110)). If you change
> `--tif-name`/`--tif-path` but the inputs are unchanged, the existing output is
> reused. Add `--force` when you change the target.

> [!gotcha] `--lh --rh` does not register both
> Because each hemisphere flag *replaces* `hemilist`, passing both leaves only the
> last. To do both hemispheres, pass neither (the default is `lh rh`).

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Each hemisphere is skipped when `?h.sphere.reg` is newer
  than its dependencies, unless `--force` is given. This makes re-runs of
  autorecon3 cheap.
- **Hard exit on engine failure.** A non-zero return from `mris_register` or
  `josareg`, or from the symlink creation, jumps to `error_exit` and aborts
  ([`scripts/rca-surfreg#L125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L125), [`#L143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L143)).
- **Existence checks.** Missing subject or (in longitudinal mode) missing base
  directory cause an early exit in `check_params`
  ([`scripts/rca-surfreg#L323-L340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L323-L340)).
- **No silent data modification** of volumes — this stage only writes surface
  registration files and symlinks.

## Related Tools

- [[surfreg]] — the general-purpose standalone surface-registration driver; register to *any* average subject and write `?h.<target>.sphere.reg`. `rca-surfreg` is the recon-all-internal, fsaverage-targeted analogue.
- [[mris_register]] — the default registration engine `rca-surfreg` drives (`-curv`).
- [[josareg]] — the learning-based engine selected by `--josa`.
- [[mris_sphere]] — produces the `?h.sphere` input.
- [[xhemireg]] — calls `rca-surfreg` for the inter-hemispheric (`xhemi`) registration.
- [[wiki/pipelines/recon-all|recon-all]] — the orchestrator; this is its `-surfreg` (autorecon3) step.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the two engine paths and
their mutual exclusion, the longitudinal `mris_register` options, the
single-hemisphere behaviour, the output `?h.sphere.reg` and `?h.fsaverage.sphere.reg`
link, the `UpdateNeeded` skip, the unused `--o`/`--i`, and the exact recon-all and
xhemireg call sites — all read directly from
[`scripts/rca-surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg),
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all), and [`scripts/xhemireg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg).

> [!gap] Expert-options merge order
> The script merges up to three expert-option files via `fsr-getxopts`
> (`$V8XoptsFile`, `$GlobXOptsFile`, `$XOptsFile`,
> [`scripts/rca-surfreg#L119`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L119)). The precedence among them is governed by
> `fsr-getxopts`, which was not audited here.

## References

- FreeSurfer source: [`scripts/rca-surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg) (v8.2.0).
- recon-all call site: [`scripts/recon-all:4212-4227`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4212-L4227).
- xhemi call site: [`scripts/xhemireg:313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/xhemireg#L313).
- Fischl B, Sereno MI, Tootell RBH, Dale AM. *High-resolution intersubject averaging and a coordinate system for the cortical surface.* Hum Brain Mapp 1999;8:272–284 — the spherical-registration method underlying [[mris_register]].
