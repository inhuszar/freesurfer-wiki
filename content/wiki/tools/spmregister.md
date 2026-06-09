---
title: "spmregister"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/spmregister"
families: []                     # standalone registration wrapper
recon_all_stage: null
related:
  - "[[bbregister]]"
  - "[[mri_coreg]]"
  - "[[fslregister]]"
  - "[[tkregister2]]"
  - "[[lta_convert]]"
  - "[[mri_vol2vol]]"
  - "[[mri_segreg]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Internal numerics of the SPM coregistration (spm_coreg sampling/optimisation) live in the compiled fs_spmreg.glnxa64 / SPM, not in this script."
tags:
  - registration
  - spm
  - coregistration
  - cross-modal
---

# spmregister

## Summary

`spmregister` computes a rigid (6-DOF) registration between a "movable" volume
(typically a functional, EPI, or other secondary acquisition) and a FreeSurfer
subject's anatomical reference, using **SPM's `spm_coreg`** intensity-based
coregistration as the underlying solver, and writes the result as a FreeSurfer
[tkregister-style `register.dat`](#outputs) and/or an [`.lta`](#outputs). It is a
tcsh wrapper: it converts both volumes to a temporary SPM-readable format with
[[wiki/tools/mri_convert|mri_convert]], hands them to the SPM backend
([`fs_spmreg.glnxa64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L217)
or `fs_spmreg.m` under a live MATLAB+SPM), then converts SPM's solution into a
FreeSurfer registration with [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L233-L236).
It does **not** resample the data by default. `spmregister` is one of the
interchangeable *initialisation* engines offered by [[bbregister]] and is a
legacy alternative to the now-preferred [[mri_coreg]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister)
- **Binary/script location:** `$FREESURFER_HOME/bin/spmregister`
- **Original author:** Doug Greve
- **Key helpers invoked:** [[wiki/tools/mri_convert|mri_convert]] (volume → temporary SPM format, with optional `-ic 0 0 0` re-centring), the SPM coregistration backend `fs_spmreg` — either the compiled [`fs_spmreg.glnxa64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L217) (MCR) or `fs_spmreg.m` run under a user MATLAB ([`scripts/spmregister:198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L198)), `tkregister2_cmdl` (SPM geometry → FreeSurfer `register.dat`/`.lta`, [`scripts/spmregister:233-262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L233-L262)), and optionally [[mri_segreg]] (BBR refinement) and [[wiki/tools/mri_vol2vol|mri_vol2vol]] (optional output resampling).

## Purpose and Context

Many neuroimaging workflows need to map a functional/EPI volume onto a
FreeSurfer cortical reconstruction so that volumetric statistics can be sampled
onto the surface. `spmregister` solves the **cross-modal rigid alignment** part
of that problem by delegating to SPM's well-known `spm_coreg` mutual-information
optimiser, then re-expressing the answer in the FreeSurfer
[tkregister convention](#outputs) understood by
[[wiki/tools/mri_vol2vol|mri_vol2vol]], `mri_vol2surf`, [[wiki/tools/freeview|freeview]], and the
rest of the toolbox.

Historically, FreeSurfer offered three external initialisers for this task,
wrapped behind [[bbregister]]: `fsl_rigid_register`/[[fslregister]] (FSL FLIRT),
`spmregister` (SPM `spm_coreg`), and the native [[mri_coreg]]. In v8 the default
and recommended engine is [[mri_coreg]]; `spmregister` remains for sites that
prefer SPM or need to reproduce older results. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]; it is called on demand, most often
indirectly through [[bbregister]] `--init-spm` or by `reg-feat2anat`.

> [!gotcha] Requires an external SPM installation
> The numerical work is done by SPM's `spm_coreg`, not by FreeSurfer. The MATLAB
> path (`fs_spmreg.m`) needs a live MATLAB with SPM (SPM2/5 historically; SPM8 is
> partially detected — see Gotchas). The compiled path (`--bin`) needs a MATLAB
> Compiler Runtime (MCR). If neither is available, `spmregister` cannot run; use
> [[mri_coreg]] (no external dependency) instead.

## Inputs

### Required Inputs

- **Movable volume** — `--mov <volid>` ([`scripts/spmregister:386-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L386-L389)). Any volume readable by [[wiki/tools/mri_convert|mri_convert]] (`mgz`, `nii`, `nii.gz`, Analyze `img`, etc.). By default only the first frame is used. **Geometry must be valid** (direction cosines that roughly identify R/A/S); for SPM-style Analyze data this means a companion `.mat` file.
- **A reference anatomical**, specified one of two ways:
  - `--s <subjid>` — a FreeSurfer subject in `$SUBJECTS_DIR`; the reference is `mri/brainmask` (override with `--fsvol`). The subject name is embedded in the output `register.dat`.
  - `--fsvol <full/path/to.mgz>` — a reference volume directly (used when there is no subject directory).
- **An output transform** — at least one of `--reg <register.dat>` or `--lta <file.lta>` is required ([`scripts/spmregister:574-577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L574-L577)).

### Input Assumptions

> [!assumption] Valid geometry, RAS/LAS, single frame
> The mov volume must carry trustworthy voxel→world geometry. The script
> re-centres both volumes to the origin by default (`mri_convert -ic 0 0 0`,
> [`scripts/spmregister:160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L160) and
> [`:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L171)) so that SPM can find a starting alignment even
> when the two volumes do not overlap in native space (`zero_center`, the
> default). The SPM backend assumes a **RAS** convention
> (`defaults.analyze.flip = 0` in `fs_spmreg.m`); `--force-ras` exists for SPM2
> spatially-normalised volumes that lack a `.mat` file and would otherwise be
> assumed LAS. Only the first frame is registered unless `--frame`/`--mid-frame`
> is given.

If the geometry is wrong, the help text warns that SPM may produce an
unpredictable result, and — critically — if MATLAB throws an uncaught error a
`register.dat` is still produced from header geometry alone, which can *look*
correct for same-session anatomical/functional pairs (see
[Error Compensation](#error-compensation-and-guard-rails)).

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `register.dat` (`--reg`) | user path | tkregister-style registration: maps tkreg-RAS of the reference to tkreg-RAS of the mov. Line 1 is the subject name. See [[lta-format]] / `register.dat`. |
| `<file>.lta` (`--lta`) | user path | the same registration as a FreeSurfer [[lta-format]] linear transform array (richer: carries both volume geometries). |
| `<template>` (`--template-out`) | user path | the single mov frame actually used as the registration template (handy with `--frame`/`--mid-frame`). |
| `<outvol>` (`--o`) | user path | mov resampled into the reference space via [[wiki/tools/mri_vol2vol|mri_vol2vol]] (optional; the script normally does **not** resample). |
| `<segreg>` (`--bbr`/`--segreg`) | user path | BBR-refined registration from [[mri_segreg]], plus `<segreg>.segreg.cost`. |
| `spmregister.log` | alongside the mov volume | full command, environment, and per-step log (unless `--nolog`). |
| temporary `refvol.spmregister.<fmt>`, `movvol.spmregister.<fmt>`, `regfile.dat`, `spmregister.$$.m`, `spmregister.$$.err` | `tmpdir` (default `<movdir>/tmp.spmreg.$$`, deleted unless `--nocleanup`/`--tmp`) | SPM-format conversions, generated MATLAB job, error sentinel. |

### Output Specifications

The registration is a 4×4 **rigid** (6-DOF) transform by default. The
`register.dat`/`.lta` follow the FreeSurfer tkregister convention (see
[[coordinate-systems]] and [[lta-format]]); they describe how to resample the
mov into the reference but do not themselves contain image data. With the
experimental `--9`/`--12` flags the DOF is raised to 9 (affine + scale) or 12
(full affine) and `UseSPMGetSpace` is forced off (see Configuration
Interactions).

## Mathematical Foundations

`spmregister` itself performs no image math; it formats inputs and reformats
outputs. The estimation is **SPM's `spm_coreg`** — a multi-resolution,
information-theoretic intensity coregistration — executed inside the
`fs_spmreg` backend.

> [!math] What the SPM backend computes
> `fs_spmreg` runs `x = spm_coreg(VG, VF, defaults)` to estimate the rigid-body
> parameter vector `x` aligning source `VF` to target `VG`, using cost function
> `costfun` (default **normalised mutual information**, `nmi`), separation
> `[4 2]` mm and FWHM `[7 7]` mm. It then forms the homogeneous transform
> $$M = \big(\,\mathrm{spm\_matrix}(x)\,\big)^{-1}$$
> and applies it to the source geometry. With `UseSPMGetSpace=1` (the 6-DOF
> default) it updates the source `.mat` via `spm_get_space(VF) ← M·MM`. With
> `UseSPMGetSpace=0` it instead reads the source with `MRIread`, sets
> `vox2ras1 ← M·vox2ras1`, and writes a new volume with `MRIwrite`. The DOF→SPM
> parameter mapping is: 6 → `[0 0 0 0 0 0]`; 9 → append `[1 1 1]` (scales);
> 12 → append `[1 1 1 0 0 0]` (scales + shears). `tkregister2_cmdl --regheader`
> then converts the SPM-updated geometry into the FreeSurfer `register.dat`/`.lta`.

> [!internal] The estimator lives outside this script
> The optimisation, resampling kernels, and `.mat` handling are in the compiled
> `[[fs_spmreg.glnxa64]]` (or `matlab/fs_spmreg.m`) and in SPM's `spm_coreg`.
> `spmregister` only chooses the cost function, DOF, format, and re-centring.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/spmregister:368-552`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L368-L552)). Boolean flags take no argument.

#### Input / reference / output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--mov` | string | *(required)* | Movable/source volume (any [[wiki/tools/mri_convert|mri_convert]]-readable format). First frame used unless `--frame`/`--mid-frame`. |
| `--s` | string | — | FreeSurfer subject id in `$SUBJECTS_DIR`; reference is `mri/$fsvol`. Name is written into the `register.dat`. |
| `--fsvol` | string | `brainmask` | With `--s`, the reference volume basename under `mri/`; without `--s`, a full path to the reference volume. |
| `--reg` | string | *(req. unless `--lta`)* | Output tkregister-style `register.dat`. |
| `--lta` | string | *(req. unless `--reg`)* | Output FreeSurfer [[lta-format]] `.lta`. |
| `--o` | string | — | Resample mov into reference space and save here (via [[wiki/tools/mri_vol2vol|mri_vol2vol]]). |
| `--template-out` | string | — | Save the single mov frame used as the template. |

#### Frame selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--frame` | int | `0` | Register using this 0-based frame of the mov (passed to `mri_convert --frame`). |
| `--mid-frame` | bool | off | Register using the middle frame (FSL-style). Mutually exclusive with `--frame`. |

#### Geometry / coordinate handling

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--zero-center` | bool | **on** | Re-centre both volumes to origin (`mri_convert -ic 0 0 0`) so SPM can start even when volumes don't overlap natively. |
| `--zero-nocenter` | bool | off | Do **not** re-centre; keep native world coordinates. |
| `--force-ras` | bool | off | Force the mov geometry to RAS (`mri_convert --in_orientation RAS`); for SPM2 spatially-normalised volumes that have no `.mat` file (otherwise assumed LAS). |
| `--left-right-reverse` | bool | off | Left-right flip the mov before registration (`mri_convert --left-right-reverse`). Prints a loud warning. Know what you are doing. |
| `--mgz` | bool | auto | Tell `tkregister2_cmdl` the reference is `.mgz` (set automatically when the reference is found as `.mgz`). |

#### Estimation engine / DOF

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--bin` | bool | off (see `FS_SPMREG_USE_BIN`) | Use the compiled MCR backend `[[fs_spmreg.glnxa64]]` instead of a live MATLAB. Sets `monly=0`. |
| `--no-bin` | bool | on | Use the MATLAB path (`fs_spmreg.m` via the `matlab` binary). |
| `--mcr` | string | `/usr/pubsw/common/matlab/8.3` (or `$FS_MCRROOT`) | MCR root for the compiled backend; implies `--bin`. |
| `--matlab` | path | `matlab` (or `$FS_SPMREG_MATLAB`) | MATLAB binary to use for the `.m` path; errors if the path does not exist. |
| `--monly` | string (mfile) | off | Only **write** the MATLAB job file to this path and exit (do not run it); forces the MATLAB (non-bin) path. For debugging/manual runs. |
| `--9` | bool | off | *Experimental:* 9-DOF (rigid + anisotropic scale); forces `UseSPMGetSpace=0` (writes a resampled volume rather than updating the `.mat`). |
| `--12` | bool | off | *Experimental:* 12-DOF (full affine); forces `UseSPMGetSpace=0`. |
| `--spm_get_space` | bool | **on** | Apply the solution by updating the source `.mat` via SPM `spm_get_space`. |
| `--no-spm_get_space` | bool | off | Apply the solution via FreeSurfer `MRIread`/`MRIwrite` to `outvol` instead of `spm_get_space`. |

#### BBR refinement (optional second stage)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--bbr`<br>`--segreg` | string | off | After the SPM registration, refine with boundary-based registration via [[mri_segreg]], writing the refined reg here (plus `.segreg.cost`). |
| `--bbr-mask` | bool | **on** | Mask the BBR cost computation (default). |
| `--bbr-no-mask` | bool | off | Pass `--no-mask` to [[mri_segreg]] (do not mask the BBR cost). |

#### Format / housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nii` | bool | **on** | Use NIfTI as the temporary SPM-format (default). |
| `--img` | bool | off | Use Analyze `img` as the temporary format (incompatible with SPM8 — see Gotchas). |
| `--tmp`<br>`--tmpdir` | string | `<movdir>/tmp.spmreg.$$` | Temporary directory; setting it implies `--nocleanup`. |
| `--nocleanup` | bool | off | Keep temporary files. |
| `--nolog` | bool | off | Do not write `spmregister.log` (sends log to `/dev/null`). |
| `--umask` | octal | — | Set the process umask. |
| `--verbose` | bool | off | Verbose tcsh. |
| `--echo` | bool | off | `set echo` (trace each command). |
| `--debug` | bool | off | `set echo` + verbose. |
| `--dng` | bool | off | Developer/test toggle (sets an internal suffix; no user effect). |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

> [!contradiction] Help advertises only 6-DOF; code exposes 9 and 12
> `--help` and the `BEGINHELP` block describe a strictly rigid (6-DOF)
> registration and do not mention `--9`/`--12`. The parser
> ([`scripts/spmregister:531-538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L531-L538)) does accept them and the SPM
> backend implements 9/12-DOF. They are flagged "Experimental" in the source and
> force `--no-spm_get_space`. Code is authoritative: 9/12-DOF is available but
> unsupported.

### Configuration Interactions

> [!gotcha] `--9`/`--12` silently force `--no-spm_get_space`
> Selecting 9 or 12 DOF sets `UseSPMGetSpace=0`
> ([`scripts/spmregister:531-538`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L531-L538)), so the backend writes a
> resampled `outvol` via `MRIwrite` instead of updating the mov's `.mat`. This
> is by necessity — `spm_get_space` can only store a rigid pose — but it changes
> how the result is materialised.

> [!gotcha] `--monly` overrides `--bin`; `--bin`/`--mcr`/`--matlab` interact by order
> `--monly` sets `usebin=0` (the MATLAB path) regardless of any earlier `--bin`.
> `--bin` and `--no-bin` toggle the same `usebin`; `--mcr` implies `--bin`;
> `--matlab` only affects the MATLAB path. Because flags are processed
> left-to-right, the **last** engine-selecting flag wins. The default engine is
> taken from `FS_SPMREG_USE_BIN` ([`scripts/spmregister:53-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L53-L54)).

> [!gotcha] `--frame` and `--mid-frame` are mutually exclusive
> Specifying both is a hard error ([`scripts/spmregister:579-582`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L579-L582)).

> [!gotcha] At least one of `--reg`/`--lta` is mandatory
> With neither output specified the script exits with an error
> ([`scripts/spmregister:574-577`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L574-L577)). If only `--lta` is given,
> an internal `regfile.dat` is created in the tmp dir to drive the conversion.

Other interactions:

- `--bin`/`--mcr` require the MCR root to exist or the script aborts
  ([`scripts/spmregister:584-589`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L584-L589)).
- `--zero-center` (default) vs `--zero-nocenter`: leave the default on unless the
  two volumes already overlap in native space and you want to preserve that.
- `--bbr`/`--segreg` adds a [[mri_segreg]] BBR pass *after* SPM; `--bbr-mask`/
  `--bbr-no-mask` only matter when BBR is enabled.

## Typical Use Cases

### 1. Register an EPI/functional to a FreeSurfer subject

```bash
# Rigid SPM coregistration of a mean functional to subject "sub01"
spmregister --s sub01 --mov mean_func.nii.gz --reg func2anat.spm.dat
```

Produces a tkregister-style `register.dat` mapping `sub01`'s anatomical to the
functional. Check it with `tkregister2 --mov mean_func.nii.gz --reg func2anat.spm.dat --surf orig`.

### 2. Also emit an LTA and a resampled volume

```bash
spmregister --s sub01 --mov bold.nii.gz \
  --reg func2anat.dat --lta func2anat.lta \
  --o bold.in.anat.mgz
```

### 3. Use the compiled MCR backend (no live MATLAB)

```bash
setenv FS_MCRROOT /usr/pubsw/common/matlab/8.3
spmregister --s sub01 --mov epi.nii.gz --reg epi2anat.dat --bin
```

### 4. As the initialiser inside bbregister

```bash
# bbregister calls spmregister internally for its initial guess, then BBR-refines
bbregister --s sub01 --mov epi.nii.gz --bold --init-spm --reg epi2anat.dat
```

## Pipeline Context

`spmregister` is a stand-alone cross-modal registration tool. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]]. Within FreeSurfer it is one of
the selectable initialisation engines of [[bbregister]] (`--init-spm`,
[`scripts/bbregister:251-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L251-L252)), the sibling alternatives being
[[fslregister]] (`--init-fsl`) and the now-default [[mri_coreg]]
(`--init-coreg`). It is also invoked directly by the FSFAST FEAT bridge
`reg-feat2anat` ([`scripts/reg-feat2anat:283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/reg-feat2anat#L283)).

**Predecessor:** a movable volume (e.g. mean EPI) + a completed FreeSurfer
recon → **spmregister** → **Successors:** [[mri_segreg]] (BBR refinement, optional),
[[wiki/tools/mri_vol2vol|mri_vol2vol]] / `mri_vol2surf` (apply the registration),
[[lta_convert]] (convert the `register.dat`/`.lta` to other transform formats).

## Gotchas and Caveats

> [!gotcha] A registration is written even if SPM fails
> If MATLAB throws an *uncaught* error, the SPM step may not update the geometry,
> yet `tkregister2_cmdl --regheader` still writes a `register.dat` from header
> geometry alone (`BEGINHELP` "BUGS"). For same-session anatomical/functional
> pairs this header-only result can look plausible while being un-optimised.
> The reliable failure signal is the **error sentinel file**
> ([`scripts/spmregister:223-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L223-L228)); always check the log and the
> registration visually.

> [!gotcha] SPM8 + Analyze `img` is rejected
> The backend detects an SPM8 installation and, if the temporary format is
> `img`, errors out asking you to re-run with `--nii` (`fs_spmreg.m` lines
> 47-56). SPM8 left-right reverses Analyze input, so use NIfTI (the default).

> [!gotcha] Scalefactor warnings are harmless
> SPM prints "Warning: Assuming a scalefactor of 1 …" for the temporary volumes.
> The help explicitly says these can be ignored.

> [!gotcha] `--mov` must have trustworthy geometry
> SPM aligns using the world geometry; if the mov lacks a valid `.mat`/direction
> cosines the result is unpredictable. The `--force-ras` flag exists precisely
> for the SPM2-normalised case where no `.mat` is written and the data would
> otherwise be assumed LAS.

## Error Compensation and Guard Rails

- **Origin re-centring (default).** Both volumes are converted with
  `mri_convert -ic 0 0 0` so a starting alignment exists even when they do not
  overlap natively; disable with `--zero-nocenter`.
- **Existing outputs are backed up.** Before writing, an existing `--reg`/`--lta`
  is renamed with a timestamp suffix (`$DateString`,
  [`scripts/spmregister:186-191`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L186-L191)).
- **Error sentinel.** The backend signals failure only by creating the error
  file; the script checks for it and aborts with the captured MATLAB error
  ([`scripts/spmregister:223-228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L223-L228)).
- **MCR existence check.** With `--bin`/`--mcr`, a missing MCR root aborts before
  any work ([`scripts/spmregister:584-589`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L584-L589)).
- **Header-only fallback** (the double-edged guard rail in the gotcha above):
  `tkregister2_cmdl --regheader` always yields *some* registration.

## Related Tools

- [[bbregister]] — boundary-based registration wrapper that calls `spmregister` as one of its initialisers (`--init-spm`); the usual entry point.
- [[mri_coreg]] — FreeSurfer's native, dependency-free coregistration; the default/recommended replacement for `spmregister`.
- [[fslregister]] — the FSL FLIRT-based sibling initialiser (`--init-fsl`).
- [[mri_segreg]] — performs the optional BBR refinement (`--bbr`).
- [[tkregister2]] — the `tkregister2_cmdl` backend converts SPM geometry to `register.dat`/`.lta`; also the standard tool for checking/editing the result.
- [[wiki/tools/mri_convert|mri_convert]] — converts both volumes to the temporary SPM format and applies re-centring.
- [[wiki/tools/mri_vol2vol|mri_vol2vol]] — applies the registration (`--o`) and is the typical downstream consumer.
- [[lta_convert]] — converts the resulting `register.dat`/`.lta` between transform formats.
- [[fs_spmreg.glnxa64]] — the compiled SPM-coregistration backend this script drives.
- [[coordinate-systems]], [[lta-format]] — the conventions the output transform follows.
- `spm_t_to_b` *(see [[spm_t_to_b]])*, `spmmat2register` *(see [[spmmat2register]])* — the other (legacy) SPM-bridge utilities.

## Confidence and Gaps

**High confidence:** the complete flag set, defaults, mutual-exclusion rules, the
engine-selection logic, the conversion pipeline (mri_convert → fs_spmreg →
tkregister2_cmdl), the DOF→SPM-parameter mapping and the `nmi` default — all read
directly from [`scripts/spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister)
and the pre-compilation source `matlab/fs_spmreg.m`.

> [!gap] SPM-internal numerics
> The sampling, smoothing, and optimisation inside `spm_coreg` (and exactly how
> the compiled `[[fs_spmreg.glnxa64]]` differs from `fs_spmreg.m`) are part of
> SPM/the MCR build and are not reproduced here.

## References

- FreeSurfer source: [`scripts/spmregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister), pre-compilation backend [`matlab/fs_spmreg.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/fs_spmreg.m) (v8.2.0).
- Built-in help: `spmregister --help` (the `BEGINHELP` block, [`scripts/spmregister:636-721`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/spmregister#L636-L721)).
- SPM coregistration: Friston et al., *Spatial registration and normalization of images*, Human Brain Mapping 2(3):165–189, 1995; SPM `spm_coreg.m` documentation.
- See also: `tkregister2`, `mri_vol2surf`, `mri_convert`, `mri_coreg`, `fsl_rigid_register`.
