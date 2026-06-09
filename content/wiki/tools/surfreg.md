---
title: "surfreg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/surfreg"
families: []                     # standalone surface-registration driver (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[mris_convert]]"
  - "[[josareg]]"
  - "[[mris_sphere]]"
  - "[[mrisp-tif]]"
  - "[[fsaverage]]"
  - "[[registration-overview]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The xhemireg --tal-estimate path (used when --init-from-tal and --xhemi are combined) is described from the surfreg source only; xhemireg itself was not audited."
tags:
  - surface
  - registration
  - spherical-morph
  - atlas
  - xhemi
---

# surfreg

## Summary

`surfreg` is a standalone tcsh driver that performs **spherical surface
registration** of one subject's cortical hemisphere(s) to a target average
subject. It wraps [[mris_register]]: for each hemisphere it aligns the subject's
`?h.sphere` to the target's folding atlas (`?h.reg.template.tif`, or the built-in
`fsaverage` folding atlas) and writes `?h.<target>.sphere.reg` into the subject's
`surf/` directory. It can register to any average subject, to `fsaverage`, or — in
`--xhemi` mode — to the contralateral hemisphere of `fsaverage_sym` for left/right
asymmetry studies. After registration it (by default) re-centres each output
sphere and stamps it with the `fsaverage` volume geometry via [[mris_convert]] so
that two spheres overlay cleanly in [[wiki/tools/freeview|freeview]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg)
- **Binary/script location:** `$FREESURFER_HOME/bin/surfreg`
- **Tools invoked:** [`mris_register`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L92) (the registration engine), [`mris_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L108) (re-centre + set volume geometry), and `xhemireg` (auto-run when `--xhemi` is requested but the `xhemi/` directory is missing, [`scripts/surfreg#L70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L70)).

## Purpose and Context

Surface-based group analysis requires every subject's cortex to be brought into a
common spherical coordinate system. FreeSurfer does this by registering each
subject's spherical surface to a **folding atlas** that encodes the average
curvature/sulcal pattern. `surfreg` is the user-facing command for running that
registration **outside** the full pipeline — to register to a *custom* average
subject built with [[make_average_surface]], to redo `fsaverage` registration with
different options (e.g. `--no-annot`), or to perform **cross-hemisphere
(xhemi)** registration to `fsaverage_sym` for interhemispheric-asymmetry studies.

Within [[wiki/pipelines/recon-all|recon-all]] the analogous ipsilateral step
(`-surfreg`) is handled by the internal driver `rca-surfreg`, **not** by
`surfreg` (see [Pipeline Context](#pipeline-context)). `surfreg` is the
standalone sibling that exposes the same underlying [[mris_register]] call with a
broader, more explicit option set; it is also the tool used by
[[recon-all-exvivo]] (`exvivo-hemi-proc`) for `fsaverage_sym` registration.

The output naming follows the convention `?h.<target>.sphere.reg`, except that
for `target == fsaverage` the shorter `?h.sphere.reg` is used (matching
recon-all's output).

## Inputs

### Required Inputs

- **Subject** (`--s <subject>`) — a subject directory under `$SUBJECTS_DIR`
  containing `surf/?h.sphere` (see [[surface-format]]).
- **Target** (`--t <target>`) — the average subject to register to. Either an
  average subject directory under `$SUBJECTS_DIR` that contains
  `?h.reg.template.tif`, or one of the special names `fsaverage` /
  `fsaverage_sym` (auto-symlinked from `$FREESURFER_HOME/subjects` if absent,
  [`scripts/surfreg#L265-274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L265-L274)).
- **An annotation decision** — one of `--aparc`, `--annot <name>`, or
  `--no-annot` is **mandatory**; the script aborts if none is given
  ([`scripts/surfreg#L317-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L317-L323)).

### Input Assumptions

> [!assumption] A spherical surface and a `.tif` folding atlas must already exist
> `surfreg` assumes the subject already has `surf/?h.<init-surf>` (default
> `?h.sphere`, from [[mris_sphere]] / [[sphere_subject]]) and that the target
> provides the folding atlas: `?h.reg.template.tif` in the target's directory, or
> the built-in `fsaverage` atlas
> `$FREESURFER_HOME/average/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`
> ([`scripts/surfreg#L82-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L82-L89)). For `--annot`/`--aparc` the subject must
> also have `label/?h.<annot>` so [[mris_register]] can rip the medial wall. The
> atlas `.tif` is a spherical parameterisation image — see [[mrisp-tif]].

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `?h.<target>.sphere.reg` (or `?h.sphere.reg` for `fsaverage`) | `$SUBJECTS_DIR/<subject>/surf/` (or `…/xhemi/surf/` with `--xhemi`) | The registered spherical surface — the subject's sphere warped into the target's atlas space. Overridable with `--o`. |
| `surfreg.<target>.log` or `surfreg.<target>.<hemi>.log` | `…/scripts/` | Run log (command line, host, per-hemisphere `mris_register` output, run-time). Overridable with `--log`. |

With `--xhemi`, if `xhemi/lrrev.register.dat` is missing, `surfreg` first runs
`xhemireg --s <subject>` (optionally `--tal-estimate`), which populates the
subject's `xhemi/` tree; those files are produced by `xhemireg`, not directly by
`surfreg`.

### Output Specifications

`?h.<target>.sphere.reg` is a binary FreeSurfer surface file with the subject's
original vertex count and connectivity; the vertex coordinates lie on a sphere in
the target's registered frame. By default ([`--set-vol-geom`], on) the file is
post-processed with `mris_convert --center --vol-geom <fsaverage orig.mgz>` so
that it is centred at the origin and carries the `fsaverage` volume geometry
([`scripts/surfreg#L101-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L101-L112)). This is cosmetic for applying the
registration but makes two spheres overlay correctly in
[[wiki/tools/freeview|freeview]].

## Mathematical Foundations

The registration mathematics is entirely in [[mris_register]]; `surfreg` only
assembles its command line.

> [!internal] Spherical registration energy is in `mris_register`
> [[mris_register]] performs a coarse-to-fine spherical morph: it first aligns
> the large-scale folding pattern carried by `?h.sulc`, then refines on the
> small-scale `?h.curv` pattern, minimising an MRF/energy functional that trades
> off atlas match against metric distortion. `surfreg` passes `-curv` (use the
> curvature term), optionally `-reg <lta>` (initialise from an affine
> rotation), optionally `-annot <annot>` (rip the medial wall), and optionally
> `-remove_negative 1` (un-fold negative-area triangles). See [[mris_register]]
> for the functional and [[registration-overview]] for the broader picture.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/surfreg#L133-243`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L133-L243)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject to register (directory under `$SUBJECTS_DIR`). |
| `--t` | string | *(required)* | Target average subject (e.g. `fsaverage`, `fsaverage_sym`, or a custom average with `?h.reg.template.tif`). |
| `--lh` | bool | see note | Register only the left hemisphere. |
| `--rh` | bool | see note | Register only the right hemisphere. |
| `--lhrh` | bool | on (non-xhemi) | Register both hemispheres. Default when `--xhemi` is **not** used. |
| `--xhemi` | bool | off | Cross-hemisphere registration: replace `<subject>` with `<subject>/xhemi`; auto-runs `xhemireg` if `xhemi/` is missing. Default hemisphere becomes `lh` only. |
| `--aparc` | bool | — | Set the rip annotation to `aparc.annot` (the historical recon-all behaviour). Satisfies the mandatory annotation choice. |
| `--annot` | string | — | Use `label/?h.<name>` to rip the medial wall during registration. Satisfies the mandatory annotation choice. |
| `--no-annot` | bool | — | Do **not** use an annotation to rip (recommended — see gotcha). Satisfies the mandatory annotation choice. |
| `--noneg` | bool | off | Add `-remove_negative 1` to [[mris_register]] (eliminate folded/negative-area triangles). |
| `--init-reg`<br>`--init-surf` | string | `sphere` | Name of the input spherical surface (`?h.<init-surf>`); do **not** include the `?h.` prefix. |
| `--lta` | string (file) | — | LTA whose rotational component initialises the spherical registration (`mris_register -reg`). The file must exist. Mutually exclusive in effect with `--init-from-tal`. |
| `--init-from-tal`<br>`--lta-init-from-tal` | bool | off | Initialise from `mri/transforms/talairach.xfm.lta` instead of a user LTA. Clears any `--lta`. |
| `--o` | string | `<target>.sphere.reg` (or `sphere.reg` for `fsaverage`) | Output surface name (`?h.<o>`); do **not** include the `?h.` prefix. |
| `--set-vol-geom` | bool | **on** | After registration, re-centre and stamp the output with `fsaverage` volume geometry via [[mris_convert]]. |
| `--no-set-vol-geom` | bool | — | Skip the re-centre / volume-geometry step. |
| `--threads` | int | `1` | Threads passed to `mris_register -threads` for parallel registration. |
| `--log` | string (file) | `scripts/surfreg.<target>[.<hemi>].log` | Explicit log-file path. |
| `--debug` | bool | off | `set echo` / `set verbose` tracing. |
| `--help` | bool | — | Print help (usage + the `BEGINHELP` block) and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] An annotation choice is mandatory — and `--no-annot` is now recommended
> `surfreg` refuses to run unless exactly one of `--aparc`, `--annot`, or
> `--no-annot` is supplied ([`scripts/surfreg#L317-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L317-L323)). The error
> message itself advises `--no-annot`, because ripping with an annotation "has
> been found to sometimes cause artifacts around the edge of the medial wall".
> `--aparc`/`--annot` reproduce older behaviour. The three are mutually
> exclusive (each just sets the internal `annot` variable; the **last** one on
> the command line wins, and all set `AnnotSet=1`).

> [!gotcha] `--lta` and `--init-from-tal` override one another
> `--lta <file>` sets an explicit initialisation LTA and clears the tal flag;
> `--init-from-tal` clears `--lta` and instead uses
> `mri/transforms/talairach.xfm.lta` ([`scripts/surfreg#L167-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L167-L181)). Whichever
> appears **later** on the command line wins. Without either, no `-reg` is passed
> and `mris_register` starts from the rigid alignment of the input sphere.

> [!gotcha] `--xhemi` changes the hemisphere default and the working directory
> With `--xhemi`, the subject directory becomes `<subject>/xhemi`, the default
> hemisphere set shrinks to **lh only** (override with `--rh`/`--lhrh` placed
> **after** `--xhemi`), and a target of `fsaverage_sym` is typical. If
> `xhemi/lrrev.register.dat` does not exist, `surfreg` runs `xhemireg` first
> ([`scripts/surfreg#L65-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L65-L78)); with `--init-from-tal` it adds
> `--tal-estimate` to that `xhemireg` call.

> [!gotcha] Refuses to overwrite an existing output
> If `?h.<o>` already exists, `surfreg` aborts with "output already exists"
> ([`scripts/surfreg#L306-309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L306-L309)). Delete the old `?h.sphere.reg` (or choose a
> new `--o`) before re-running. This is the opposite of the
> [[sphere_subject]]/[[reinflate_subject]] wrappers, which overwrite silently.

Other interactions:

- `--lh`/`--rh`/`--lhrh` each **replace** the hemisphere list (they do not
  accumulate); the last one wins.
- For a non-`fsaverage` target the atlas is `<target>/?h.reg.template.tif`; for
  `fsaverage` it is the built-in `folding.atlas.acfb40.noaparc.i12` atlas.
- `--o` and the target name jointly determine the default output (`sphere.reg`
  for `fsaverage`, `<target>.sphere.reg` otherwise).

## Typical Use Cases

### 1. Register a subject to fsaverage (recommended, no annotation rip)

```bash
# Produces lh.sphere.reg and rh.sphere.reg in <subject>/surf/.
surfreg --s bert --t fsaverage --no-annot --threads 4
```

This is the standalone equivalent of the recon-all `-surfreg` step (which
internally runs `mris_register` via `rca-surfreg`).

### 2. Register to a custom group template

```bash
# Target is a study-specific average built with make_average_surface,
# carrying ?h.reg.template.tif. Output: ?h.mystudy.sphere.reg.
surfreg --s subj01 --t mystudy_avg --no-annot
```

### 3. Cross-hemisphere registration for asymmetry analysis

```bash
# Register the left hemi of bert into the right-hemi atlas of fsaverage_sym
# (xhemireg is run automatically if xhemi/ is missing).
surfreg --s bert --t fsaverage_sym --xhemi --lh --no-annot
```

### 4. Initialise the spherical morph from the Talairach rotation

```bash
surfreg --s bert --t fsaverage --no-annot --init-from-tal
```

Uses the rotational part of `talairach.xfm.lta` as the starting alignment for
`mris_register`, which can help when the default rigid sphere alignment is poor.

## Pipeline Context

`surfreg` sits at the **spherical-registration** position of the surface stream,
immediately after the sphere is created and before any atlas-based mapping
(parcellation, group analysis).

> [!gotcha] recon-all does not call `surfreg`
> The recon-all `-surfreg` stage invokes the internal driver **`rca-surfreg`**
> ([`scripts/recon-all#L4213`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4213)), which runs `mris_register` directly
> (or [[josareg]] when `--josa`). `surfreg` is the *standalone* tool that does the
> same job with an explicit option set; it is what users run to register to a
> custom template or to do `--xhemi` registration, and it is used by
> [[recon-all-exvivo]] (`exvivo-hemi-proc`) for `fsaverage_sym`.

**Predecessor:** [[sphere_subject]] / [[mris_sphere]] (writes `?h.sphere`) →
**surfreg** (writes `?h.<target>.sphere.reg`) → **Successors:** atlas-based
parcellation (`mris_ca_label`), surface resampling ([[mris_apply_reg]]),
[[make_average_surface]], or group analysis.

## Gotchas and Caveats

> [!gotcha] Output naming depends on the target
> For `fsaverage` the output is `?h.sphere.reg`; for every other target it is
> `?h.<target>.sphere.reg` ([`scripts/surfreg#L283-286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L283-L286)). Scripts that
> consume the result must account for the two naming patterns.

> [!gotcha] `fsaverage_sym` is auto-symlinked into `$SUBJECTS_DIR`
> If the target is `fsaverage_sym` and it is not already in `$SUBJECTS_DIR`,
> `surfreg` creates a symlink to `$FREESURFER_HOME/subjects/fsaverage_sym`
> ([`scripts/surfreg#L265-274`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L265-L274)). (Other missing targets are a hard error;
> only `fsaverage_sym` is auto-linked here. `fsaverage` itself is expected to be
> present or symlinked already.)

> [!gotcha] The `fsaverage` atlas is a fixed, dated file
> The built-in target uses `?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`
> under `$FREESURFER_HOME/average` — a 2016 "no-aparc" folding atlas. The
> commented-out alternative `average.curvature.filled.buckner40.tif` in the
> source is **not** used. If that file is missing the run aborts.

## Error Compensation and Guard Rails

- **Pre-flight existence checks.** Before running anything, `surfreg` verifies
  the subject, the target (auto-linking `fsaverage_sym`), the atlas `.tif`, the
  input sphere, and — for `--init-from-tal` — the Talairach LTA, and it refuses
  to clobber an existing output ([`scripts/surfreg#L249-315`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L249-L315)).
- **Auto-xhemireg.** In `--xhemi` mode a missing `xhemi/` tree is built
  automatically by calling `xhemireg` rather than failing.
- **Volume-geometry normalisation.** By default each output sphere is re-centred
  and stamped with `fsaverage` geometry so spheres overlay in freeview; disable
  with `--no-set-vol-geom`.
- **Fail-fast on sub-command error.** After each `mris_register`/`mris_convert`
  call the script checks `$status` and exits non-zero on failure, so a broken
  hemisphere stops the run.

## Related Tools

- [[mris_register]] — the spherical-morph engine `surfreg` wraps; all registration math lives here.
- [[josareg]] — the learned (JOSA / SphereMorph) alternative registration driver; recon-all can use it in place of `mris_register` via `rca-surfreg --josa`.
- [[mris_convert]] — used with `--center --vol-geom` to normalise the output sphere's geometry.
- [[mris_sphere]] / [[sphere_subject]] — produce the `?h.sphere` input.
- [[mris_apply_reg]] — applies the resulting `?h.sphere.reg` to resample surface overlays between subject and atlas.
- [[make_average_surface]] — builds the custom `?h.reg.template.tif` targets that `surfreg` can register to.
- `xhemireg` *(no wiki page yet)* — sets up the `xhemi/` left-right-reversed tree that `--xhemi` registration uses.
- [[mrisp-tif]] — the `.tif` spherical-parameterisation atlas format.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the mandatory-annotation
rule, the `--lta`/`--init-from-tal` override, the `--xhemi` directory/hemisphere
behaviour, the output-naming rule, the overwrite guard, and the
`mris_register`/`mris_convert` command construction — all read directly from
[`scripts/surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg). The `--help`/usage text matches the source.

> [!gap] `xhemireg --tal-estimate` not audited
> When `--init-from-tal` is combined with `--xhemi`, `surfreg` passes
> `--tal-estimate` to `xhemireg`. The exact effect of that option inside
> `xhemireg` was not verified here (xhemireg has no wiki page yet).

## References

- FreeSurfer source: [`scripts/surfreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg) (v8.2.0), including the `BEGINHELP` block at [`scripts/surfreg#L370-385`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/surfreg#L370-L385).
- Fischl, Sereno, Tootell & Dale (1999), *High-resolution intersubject averaging and a coordinate system for the cortical surface*, Human Brain Mapping 8(4):272–284 — the spherical-registration method implemented by `mris_register`.
- Greve et al. (2013), *A surface-based analysis of language lateralization and cortical asymmetry* (J. Cogn. Neurosci.) — context for `fsaverage_sym`/xhemi registration.
