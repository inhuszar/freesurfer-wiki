---
title: "josareg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/josareg"
families: []                     # standalone JOSA surface-registration driver (no mri_*/mris_* family)
recon_all_stage: autorecon3
related:
  - "[[mris_register_josa]]"
  - "[[mris_register]]"
  - "[[surfreg]]"
  - "[[mris_place_surface]]"
  - "[[mris_apply_reg]]"
  - "[[mri_segstats]]"
  - "[[mris_sphere]]"
  - "[[mrisp-tif]]"
  - "[[registration-overview]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact training data, atlas, and network architecture of the JOSA/spheremorph model in mris_register_josa are not determined from the script (see mris_register_josa)."
  - "The --post measure list (thickness, curv, [aparc]) and its stats output are driven by check_params; the post path is described from the script and was not executed end-to-end."
tags:
  - surface
  - registration
  - josa
  - spheremorph
  - deep-learning
  - atlas
---

# josareg

## Summary

`josareg` is a standalone tcsh driver for **JOSA learned spherical surface
registration**. For each hemisphere it (1) runs a rigid (rotation-only)
[[mris_register]] pass to bring the subject's sphere into coarse alignment with
the `fsaverage` folding atlas, then (2) calls [[mris_register_josa]] — a
pre-trained deep-learning model (SphereMorph, HDF5 weights) — to produce the
final non-linear registration `?h.josa.sphere.reg`. By default it links that
result to `surf/?h.sphere.reg`, so JOSA output drops in as a replacement for the
classic [[mris_register]]/[[surfreg]] result. It is the registration engine used
by [[wiki/pipelines/recon-all|recon-all]] when the `-josa` option is active
(via the internal `rca-surfreg` driver), and by [[topofit]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/josareg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg)
- **Binary/script location:** `$FREESURFER_HOME/bin/josareg`
- **Model files:** `$FREESURFER_HOME/models/mris_register_josa_20241121_{lh,rh}.h5` (per-hemisphere, [`scripts/josareg#L97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L97))
- **Tools invoked:** [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L131) (rigid init, `-N 0`), [`mris_register_josa`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L145) (the learned warp), [`mris_place_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L116) (`--curv-map`, to synthesise curvature if missing), plus `fs_time`/`UpdateNeeded` helpers; with `--post`, [`mris_apply_reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L181) and [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L201).

## Purpose and Context

Classic FreeSurfer spherical registration ([[mris_register]], driven by
[[surfreg]]) aligns a subject to a folding atlas by iterative energy
minimisation, which is accurate but slow. **JOSA** replaces the non-linear part
with a neural network ([[mris_register_josa]] / SphereMorph) that predicts the
registration field in a single forward pass, so the bulk of the work is a fast
inference step rather than a long optimisation.

`josareg` is the orchestration layer around that model. Its job is to:

1. Guarantee the model's input features exist — `?h.sulc`, `?h.curv`,
   `?h.inflated`, `?h.inflated.H` — synthesising `?h.curv` with
   [[mris_place_surface]] `--curv-map` if recon-all has not produced it yet
   ([`scripts/josareg#L108-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L108-L122)).
2. Produce a **rigid** initialisation with [[mris_register]] `-N 0`
   (rotation only, no surface deformation) against the `fsaverage` folding atlas.
3. Run the learned warp with [[mris_register_josa]].
4. Link the result to `surf/?h.sphere.reg` so downstream tools find it.

It is normally invoked by recon-all (through `rca-surfreg --josa`) or by
[[topofit]], but can be run directly on any subject that has the required surface
files.

> [!gotcha] Naming note (JOSA acronym)
> The companion binary's page ([[mris_register_josa]]) interprets "JOSA" as the
> *Journal of the Optical Society of America* publication describing the method,
> but flags this as unverified from source. This page follows that documented
> interpretation; treat the expansion as provisional.

## Inputs

### Required Inputs

- **Subject** (`--s <subject>`) **or surface directory** (`--surfdir <dir>`) —
  at least one is required ([`scripts/josareg#L376-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L376-L379)). With `--s`, the
  surface directory defaults to `$SUBJECTS_DIR/<subject>/surf`.
- **Surface feature files** in the surface directory, for each requested
  hemisphere: `?h.sphere`, `?h.sulc`, `?h.smoothwm`, `?h.inflated`,
  `?h.inflated.H` (checked at [`scripts/josareg#L388-395`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L388-L395)). `?h.curv` is
  **not** required — it is computed if absent. See [[surface-format]].
- **The `fsaverage` folding atlas** `$FREESURFER_HOME/average/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`
  (used by the rigid [[mris_register]] pass, [[mrisp-tif]] format) and the
  per-hemisphere **JOSA model** `models/mris_register_josa_20241121_?h.h5`.

### Input Assumptions

> [!assumption] Requires the inflated surface, its mean curvature, sulc, and a sphere
> Unlike the classic path, JOSA needs `?h.inflated.H` (the mean curvature of the
> inflated surface) in addition to `?h.sulc` and a `?h.sphere`. These come from
> [[mris_inflate]] / [[mris_sphere]] earlier in the stream. The `?h.white`
> surface is taken to be `?h.smoothwm` (in recon-all the registration is done
> before the white surface exists; in [[topofit]] `?h.smoothwm` is a link to
> `?h.white`) — see the source comment at
> [`scripts/josareg#L104-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L104-L106). `$SUBJECTS_DIR` must be set when using
> `--s`.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `?h.fsaverage.sphere.rigid.reg` | output dir (default `<surf>/josa/`) | Rigid (rotation-only) initialisation from [[mris_register]] `-N 0` |
| `?h.josa.sphere.reg` | output dir | The final JOSA learned registration (from [[mris_register_josa]]) — the main product |
| `?h.sphere.reg` (symlink) | `<surf>/` | Link to `?h.josa.sphere.reg`, created unless `--no-link` (see gotcha on link targets) |
| `?h.curv.josa` | output dir | Curvature synthesised by [[mris_place_surface]] `--curv-map`, **only if** `?h.curv` was missing |
| `josareg.Y…M…D…H…M….log` | `<outdir>/log/` | Run log (deleted if no work was done — see gotcha) |
| **`--post` only:** `?h.<meas>.josa.mgz`, `?h.aparc.josa.stats` | output dir | thickness/curv/aparc resampled to template space and stats, for debugging ([`scripts/josareg#L165-208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L165-L208)) |

### Output Specifications

`?h.josa.sphere.reg` and `?h.fsaverage.sphere.rigid.reg` are binary FreeSurfer
surface files carrying the subject's vertex count/connectivity with spherical
coordinates in the atlas frame. The `--post` outputs are `mgz`-format scalar
overlays sampled onto the `fsaverage` mesh by [[mris_apply_reg]] (`--streg`),
and the stats file is a [[mri_segstats]] summary using the `fsaverage` aparc.

## Mathematical Foundations

`josareg` itself does no math; it stages inputs and chains binaries. The two
substantive computations are external:

> [!internal] Rigid initialisation: `mris_register -N 0`
> The first pass uses [[mris_register]] with `-N 0`, which sets the
> neighbourhood/averaging schedule to zero
> ([`mris_register/mris_register.cpp:1078`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp#L1078)) so that **no surface
> deformation** is allowed — only a rigid rotation of the sphere is fitted to the
> atlas. The script comment states "-N 0 means rigid"
> ([`scripts/josareg#L130`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L130)). It also passes `-o $white -surf0
> $inflated -surf1 $white -surf2 $white -curv` to supply the surfaces and curvature
> term.

> [!internal] Learned warp: SphereMorph in `mris_register_josa`
> The non-linear registration field is predicted by the pre-trained model in
> [[mris_register_josa]] (TensorFlow / `spheremorph`, HDF5 weights). The inputs
> are the median-normalised `?h.sulc`, `?h.curv`, and `?h.inflated.H`, with the
> rigid sphere as the starting transform. The network architecture and training
> set are not described in the script — see [[mris_register_josa]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/josareg#L249-368`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L249-L368)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(one of `--s`/`--surfdir` required)* | Subject under `$SUBJECTS_DIR`; sets the surface dir to `<subject>/surf` and enables the `aparc` post-measure. |
| `--surfdir` | string (dir) | — | Use this surface directory directly (no `$SUBJECTS_DIR` lookup). Alternative to `--s`. |
| `--sd` | string (dir) | env | Set `$SUBJECTS_DIR` for this run. |
| `--o` | string (dir) | `<surf>/josa` | Output directory. Setting it changes how the `?h.sphere.reg` link is formed (see gotcha). |
| `--hemi` | `lh`\|`rh` | `lh rh` | Restrict to one hemisphere. |
| `--lh` | bool | — | Shortcut for `--hemi lh`. |
| `--rh` | bool | — | Shortcut for `--hemi rh`. |
| `--sphere-name` | string | `sphere` | Name of the input sphere (`?h.<name>`). |
| `--lta` | string (file) | — | Initialise the rigid [[mris_register]] pass with the rotational component of this LTA (`-reg`). Mutually exclusive with `--init-tal`. |
| `--init-tal` | bool | off | Use `mri/transforms/talairach.xfm.lta` as the rigid-init LTA. Requires `--s`. Mutually exclusive with `--lta`. |
| `--post` | bool | off | After registration, resample thickness/curv/(aparc) into template space and compute aparc stats — for QC/debugging. |
| `--no-post` | bool | **on** | Do not run the post-processing maps (the recon-all default). |
| `--links`<br>`--link` | bool | **on** | Symlink `?h.josa.sphere.reg` to `surf/?h.sphere.reg`. |
| `--no-links`<br>`--no-link` | bool | — | Do not create the `surf/?h.sphere.reg` link (e.g. when used as a non-default registration). |
| `--threads` | int | `1` | Threads passed to `mris_register`/`mris_register_josa`. |
| `--force` | bool | off | Recompute every step even if `UpdateNeeded` says outputs are current; also permits overwriting a real (non-symlink) `?h.sphere.reg`. |
| `--no-force` | bool | on | Honour `UpdateNeeded` timestamp checks (skip up-to-date steps). |
| `--log` | string (file) | `<outdir>/log/josareg.Y…log` | Explicit log path; marks the log as user-supplied (not auto-deleted). |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string (dir) | auto | Temp directory; also disables cleanup. (Temp dir is currently unused — see gotcha.) |
| `--nocleanup` | bool | — | Do not remove the temp dir. |
| `--cleanup` | bool | on | Remove the temp dir (currently a no-op — cleanup is commented out). |
| `--debug` | bool | off | `set echo` / `set verbose` tracing. |
| `--help` | bool | — | Print usage and exit. |
| `--version` | bool | — | Print the version string (`$Id$`) and exit. |

### Configuration Interactions

> [!gotcha] `--lta` and `--init-tal` are mutually exclusive
> Supplying both is a hard error ("cannot both --lta and --init-tal",
> [`scripts/josareg#L411-414`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L411-L414)). `--init-tal` simply sets the LTA to the
> subject's `talairach.xfm.lta`, so it also requires `--s` (it dereferences
> `$SUBJECTS_DIR/$subject/...`). The chosen LTA only steers the **rigid**
> [[mris_register]] pass, not the learned warp.

> [!gotcha] The `?h.sphere.reg` link target depends on whether `--o` was set
> With the default output dir, `--links` creates a **relative** link
> `?h.sphere.reg -> josa/?h.josa.sphere.reg` (portable). If you pass `--o
> <outdir>`, the link is **absolute** to `<outdir>/?h.josa.sphere.reg`
> ([`scripts/josareg#L154-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L154-L162)). Moving the subject afterwards can break the
> absolute link.

> [!gotcha] Refuses to clobber a real `?h.sphere.reg` unless `--force`
> If `surf/?h.sphere.reg` exists as a **real file** (not a symlink) — typically
> because recon-all already produced it — `josareg` aborts and tells you to
> delete it or use `--force` ([`scripts/josareg#L425-446`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L425-L446)). This protects an
> existing classic registration from being silently replaced by a link.

> [!gotcha] `--post` widens the input requirements
> With `--post`, the script also needs `?h.thickness`, `?h.curv`, and (when `--s`
> is used) `?h.aparc.annot`, and will error if thickness/curv are missing
> (`aparc` is allowed to be absent). Leave `--post` off (the recon-all default)
> for plain registration ([`scripts/josareg#L396-408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L396-L408)).

Other interactions:

- `--no-force` (default) makes every step idempotent via `UpdateNeeded`: a
  second run with no input changes does nothing and **deletes its own log** with
  an "INFO: josareg: no changes made" message ([`scripts/josareg#L231-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L231-L235)),
  unless `--log` was passed.
- `?h.curv` is auto-synthesised only when missing; if it exists it is used as-is.

## Typical Use Cases

### 1. JOSA-register a fully reconned subject

```bash
# Produce lh/rh.josa.sphere.reg and link them to surf/?h.sphere.reg.
# (Subject already has a real ?h.sphere.reg from recon-all → use --force.)
josareg --s bert --threads 4 --force
```

### 2. As recon-all runs it (internal)

```bash
# rca-surfreg builds this when recon-all is given -josa:
josareg --s bert --threads $OMP_NUM_THREADS --no-post --links
```

This is the exact command issued by the recon-all surfreg driver
([`scripts/rca-surfreg#L136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L136)).

### 3. Register a bare surface directory (e.g. from topofit), with QC maps

```bash
josareg --surfdir /data/topofit/sub01 --threads 8 --post --no-link
```

Runs JOSA on surfaces outside a standard subject tree and also resamples
thickness/curv to template space for inspection without overwriting any
`?h.sphere.reg`.

## Pipeline Context

`josareg` occupies the **spherical-registration** slot of the surface stream — the
same position as [[surfreg]] / `mris_register`, but using the learned model.

> [!gotcha] recon-all reaches josareg through `rca-surfreg --josa`, not directly
> When [[wiki/pipelines/recon-all|recon-all]] is run with `-josa` it sets
> `JosaReg`, and the `-surfreg` stage calls `rca-surfreg … --josa`
> ([`scripts/recon-all#L4218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4218)); `rca-surfreg` then invokes `josareg --s
> … --no-post --links` ([`scripts/rca-surfreg#L136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg#L136)). Without `-josa`,
> `rca-surfreg` runs [[mris_register]] directly instead. [[topofit]] also calls
> `josareg` (with `--post --no-link`).

**Predecessor:** [[mris_sphere]] / [[sphere_subject]] (writes `?h.sphere`) and
[[mris_inflate]] (writes `?h.inflated`, `?h.inflated.H`, `?h.sulc`) → **josareg**
(writes `?h.josa.sphere.reg`, links `?h.sphere.reg`) → **Successors:**
atlas-based parcellation, surface resampling ([[mris_apply_reg]]), group
analysis.

## Gotchas and Caveats

> [!gotcha] `?h.white` is taken from `?h.smoothwm`
> Because recon-all runs registration **before** the white surface exists, the
> script uses `?h.smoothwm` wherever it needs the "white" surface
> ([`scripts/josareg#L104-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L104-L106)). In [[topofit]] `?h.smoothwm` is a link to
> `?h.white`. If you craft inputs by hand, provide a sensible `?h.smoothwm`.

> [!gotcha] Synthesised curvature may differ from recon-all's
> When `?h.curv` is absent, it is generated via `mris_place_surface --curv-map
> ?h.smoothwm 2 10 ?h.curv.josa`. The source comment notes this may **not** be
> identical to the curvature recon-all computes after registration
> ([`scripts/josareg#L109-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L109-L113)), so JOSA results can depend slightly on
> whether curv pre-existed.

> [!gotcha] An empty run deletes its log
> If `UpdateNeeded` finds nothing to do and `--log` was not passed, the log file
> is removed to avoid accumulating empty logs ([`scripts/josareg#L231-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L231-L235)).
> Pass `--log <file>` if you need the log retained regardless.

> [!gotcha] The temp-dir machinery is currently inert
> A `$tmpdir` path is computed and `--tmp`/`--cleanup`/`--nocleanup` are parsed,
> but `mkdir $tmpdir` and the cleanup `rm -rf` are commented out
> ([`scripts/josareg#L66`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L66), [`scripts/josareg#L214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L214)). These flags
> therefore have no observable effect in v8.2.0.

## Error Compensation and Guard Rails

- **Idempotent steps.** Every stage is wrapped in `UpdateNeeded` so re-runs skip
  work whose outputs are newer than their inputs; `--force` overrides.
- **Missing-input checks.** `check_params` verifies the required surface files
  per hemisphere (and the `--post` extras) and aborts with a clear message if any
  are absent ([`scripts/josareg#L388-408`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg#L388-L408)).
- **Curvature auto-synthesis.** A missing `?h.curv` is generated rather than
  treated as fatal (with the caveat above).
- **Overwrite protection.** A real (non-symlink) `?h.sphere.reg` is protected
  unless `--force` is given.
- **Fail-fast.** After every sub-command the script checks `$status` and jumps to
  `error_exit` on failure.

## Related Tools

- [[mris_register_josa]] — the deep-learning model `josareg` drives; the actual learned warp lives here.
- [[mris_register]] — used by `josareg` for the rigid (`-N 0`) initialisation; also the classic, non-JOSA registration engine.
- [[surfreg]] — the classic standalone spherical-registration driver `josareg` is the learned alternative to.
- [[mris_place_surface]] — synthesises `?h.curv.josa` (`--curv-map`) when curvature is missing.
- [[mris_apply_reg]] / [[mri_segstats]] — used only in the `--post` QC path to map measures to template space and summarise them.
- [[mris_sphere]] / [[sphere_subject]] / [[mris_inflate]] — produce the sphere and inflated-surface inputs JOSA consumes.
- [[topofit]] — a learned surface-reconstruction pipeline that calls `josareg`.
- `rca-surfreg` *(no wiki page yet)* — the recon-all-internal driver that invokes either `mris_register` or `josareg`.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the two-stage
rigid-then-learned design, the `-N 0` rigid semantics, the input requirements,
the `?h.curv` auto-synthesis, the link-target behaviour, the overwrite guard, the
`--lta`/`--init-tal` exclusivity, and the empty-run log deletion — all read
directly from [`scripts/josareg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg) and cross-checked against
[`scripts/rca-surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-surfreg) and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] Model internals
> The training data, atlas, and SphereMorph network architecture behind
> `mris_register_josa_20241121_?h.h5` are not described in the script; see
> [[mris_register_josa]].

> [!gap] `--post` path not executed end-to-end
> The measure list (thickness, curv, optional aparc), the `mris_apply_reg`
> resampling, and the `mri_segstats` stats were read from the script but not run.

## References

- FreeSurfer source: [`scripts/josareg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/josareg) (v8.2.0).
- [[mris_register_josa]] — the model binary and its (provisional) JOSA citation.
- Fischl, Sereno, Tootell & Dale (1999), *High-resolution intersubject averaging and a coordinate system for the cortical surface*, Human Brain Mapping 8(4):272–284 — the classic spherical registration that JOSA replaces.
