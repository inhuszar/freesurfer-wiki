---
title: "fslregister"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fslregister"
families: []                     # FSL-bridge wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[fsl_rigid_register]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
  - "[[tkregister2]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Help text vs. code disagree on the default --niters (help says 4, code default is 1) and --maxangle (BEGINHELP prose says 70, default and usage say 90)."
  - "BBR/--segreg branch ordering relative to the --no-mask flag was read but not exercised against mri_segreg."
tags:
  - registration
  - fsl
  - flirt
  - functional
  - bbregister
---

# fslregister

## Summary

`fslregister` is a tcsh wrapper that registers a **moveable volume** (typically
a functional, diffusion, or other secondary acquisition) to a subject's
**FreeSurfer anatomical** using FSL's **FLIRT**, and writes the result as a
FreeSurfer tkreg **`register.dat`**. It pulls the reference volume from the
subject's `$SUBJECTS_DIR/<subj>/mri/` tree (the `brainmask` by default),
optionally skull-strips the moveable with FSL **BET**, optionally runs a
translation-only pre-registration for difficult data, runs FLIRT (with an
optional multi-iteration refinement), converts the FSL matrix to a
`register.dat`, and can additionally emit an MGH [[lta-format|`.lta`]], reslice
the moveable into anatomical space, or hand off to boundary-based registration
([[mri_segreg]]). It is the FSL-backend engine historically used by
[[bbregister]] to compute its initial registration.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fslregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister)
- **Original author:** Doug Greve
- **Binary/script location:** `$FREESURFER_HOME/bin/fslregister`
- **External dependency:** **FSL** — calls `flirt.fsl`, `bet.fsl`/`betfunc`, `fslswapdim.fsl`, `fslorient.fsl`. FSL must be installed and on `PATH`.
- **Key FreeSurfer helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L146) (format conversion / frame selection), [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L229) (geometry init and FLIRT→`register.dat` conversion), [`mri_info --det`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L170) (determinant check), [`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L336) (dim-swap correction), [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L369) (`.lta` export), [`mri_segreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L352) (optional BBR), and the helpers `stem2fname`, `fname2stem`.

## Purpose and Context

Registering a low-resolution or different-contrast volume (BOLD, DWI, PET, …) to
a subject's high-resolution FreeSurfer anatomical is a recurring need: it is the
step that lets surface-based analysis sample functional data onto the cortex.
`fslregister` packages the FSL/FLIRT route to that registration *and* the
conversion into FreeSurfer's tkreg `register.dat` convention, so the output drops
straight into `mri_vol2surf`, `tkregister2`, etc. See [[coordinate-systems]] for
the FLIRT-vs-tkreg matrix conventions and [[registration-overview]] for where
this sits among FreeSurfer's registration tools.

It is run **by hand** and, importantly, **by [[bbregister]]**, which calls
`fslregister --niters 1 --maxangle 90` to obtain a starting registration before
refining it with boundary-based registration ([`scripts/bbregister:239-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L239-L240)). It
is also used by `trac-preproc`, `reg-feat2anat`, `mni152reg`, and
`mri_create_t2combined`. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

## Inputs

### Required Inputs

- **Subject ID** (`--s`) — must exist under `$SUBJECTS_DIR`. The reference volume
  is taken from `$SUBJECTS_DIR/<subj>/mri/<fsvol>` (default `fsvol = brainmask`,
  changeable with `--fsvol`).
- **Moveable volume** (`--mov`) — the volume to register, in any format
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L146) reads. The first frame is used unless `--frame`/`--mid-frame`.
- **Output registration file** (`--reg`) — path for the FreeSurfer `register.dat`
  to be written (maps reference RAS ↔ moveable RAS).

### Input Assumptions

> [!assumption] Moveable geometry must be valid; reference is skull-stripped
> The moveable volume must carry **correct geometry** (a valid sform / SPM-style
> `.mat`), or — the help warns — "results may be unpredictable". The reference
> defaults to the FreeSurfer `brainmask`, which is already skull-stripped, so BET
> is **not** run on the reference by default; if you change `--fsvol` to a
> non-stripped volume you should add `--betref`.

- The moveable is converted to **NIfTI** before FLIRT; frame selection happens
  during that conversion.
- By default BET is **not** applied to the moveable in v8.2.0 (`betmov = 0`),
  despite older help text describing BET-on-by-default — see the contradiction
  below.

## Outputs

### Files Created

| File / pattern | When | Contents |
|----------------|------|----------|
| `register.dat` (`--reg`) | always | FreeSurfer tkreg registration mapping reference↔moveable. An existing one is backed up to `<reg>.<YYMMDDHHMM>` ([`scripts/fslregister:221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L221)). |
| `<reg>.fsl.mat` | always (unless `--fslmat`) | the raw FLIRT/FSL matrix. Path overridable with `--fslmat` ([`scripts/fslregister:222`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L222)). |
| `<reg>.fslregister.log` | unless `--nolog` | full run log ([`scripts/fslregister:86-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L86-L94)). |
| output volume (`--out`) | with `--out` | the moveable resliced into anatomical space by FLIRT, in the `--out` format. |
| template (`--template-out`) | with `--template-out` | the (frame-selected) moveable saved as a template — handy with `--frame`. |
| `.lta` (`--lta`) | with `--lta` | the transform as an MGH [[lta-format\|`.lta`]], via [`lta_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L368-L374). |
| `<segreg>` + `<segreg>.segreg.cost` | with `--bbr`/`--segreg` | BBR-refined registration and its cost, via [[mri_segreg]]. |

### Output Specifications

The `register.dat` is in FreeSurfer **tkreg** convention (reference→moveable
RAS). When the moveable has a **positive determinant** and `--allow-swap` is on
(the default), the script swaps the moveable's dimensions for FLIRT and then
*post-multiplies the swap back out* of the registration with
[`mri_matrix_multiply`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L334-L340), so the final `register.dat` still refers to the
original moveable geometry. See [[coordinate-systems]] for why a positive
determinant (a "non-radiological"/left-handed grid) needs special handling for
FLIRT. A `register.dat` whose first element is negative triggers a printed
left–right-reversal warning ([`scripts/fslregister:342-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L342-L349)).

## Mathematical Foundations

The affine optimisation is performed by **FSL FLIRT**; `fslregister` orchestrates
it and supplies/consumes the matrices.

> [!math] Two-stage FLIRT with optional iteration
> When `--trans` is on (default) the script first runs FLIRT with a
> **translation-only schedule** (`fsl.5.0.2.xyztrans.sch`) to robustly center the
> data ([`scripts/fslregister:251-265`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L251-L265)), then runs the **full** schedule
> (`flirt.newdefault.20080811.sch`) seeded from that result
> ([`scripts/fslregister:267-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L267-L284)). `--niters N` then re-runs the full
> registration $N-1$ more times, each seeded with the previous output, to reduce
> sensitivity to initialisation ([`scripts/fslregister:287-300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L287-L300)).

> [!internal] Geometry init and FLIRT→tkreg conversion
> The initial matrix (`--initxfm`, default on) is the header-geometry
> registration exported to FSL convention by
> [`tkregister2_cmdl --regheader --fslregout`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L226-L239). The FLIRT matrix is later
> converted to a `register.dat` by `tkregister2_cmdl --fslreg`
> ([`scripts/fslregister:317-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L317-L332)). The conversion math lives in
> [[tkregister2]] / the registration library, not in this script.

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/fslregister:404-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L404-L599)). These are **double-dash** flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`; supplies the reference and is written into `register.dat`. |
| `--mov` | string | *(required)* | Moveable/input volume to register (any `mri_convert`-readable format). |
| `--reg` | string | *(required)* | Output FreeSurfer `register.dat` path. |
| `--fsvol` | string | `brainmask` | FreeSurfer volume under `mri/` to use as the reference; a passed filename is reduced to its stem. |
| `--fslmat` | string | `<reg>.fsl.mat` | Path for the output FLIRT/FSL matrix. |
| `--initxfm` | bool | **on** | Initialise FLIRT from header geometry (default). |
| `--noinitxfm` | bool | — | Do not initialise from geometry. |
| `--initfslmat` | string | — | Supply an initial FLIRT matrix file (must exist); implies `--noinitxfm`. |
| `--niters` | int | `1` | Total FLIRT evaluations of the full schedule; each after the first is seeded by the previous result. (Help prose says 4 — see contradiction.) |
| `--dof` | int | `6` | FLIRT degrees of freedom. 6 = rigid (same-subject). |
| `--bins` | int | `256` | FLIRT histogram bins. |
| `--cost` | string | `corratio` | FLIRT cost function (passed straight to FLIRT; not validated here). |
| `--maxangle` | float (deg) | `90` | FLIRT search range ±`maxangle` on each rotation axis. |
| `--trans` | bool | **on** | Run a translation-only FLIRT pass before the full registration. |
| `--notrans`<br>`--no-trans` | bool | — | Skip the translation-only pre-pass. |
| `--allow-swap` | bool | **on** | Allow dimension swap of positive-determinant moveables (then swap back out of the final reg). |
| `--noallow-swap`<br>`--no-allow-swap` | bool | — | Do not perform the positive-determinant dim swap. |
| `--betmov` | bool | off | Run FSL BET (skull-strip) on the moveable before registration. |
| `--nobetmov` | bool | (default) | Do not BET the moveable. |
| `--betfunc` | bool | off | Use `betfunc` instead of plain `bet` on the moveable (also sets `--betmov`). |
| `--betfvalue` | float | `0.1` | `-f` fractional-intensity value passed to BET. |
| `--betref` | bool | off | BET the **reference** (needed only if `--fsvol` is not skull-stripped). |
| `--frame` | int | `0` | Register using this (0-based) frame of the moveable. |
| `--mid-frame` | bool | off | Register using the middle frame (via `mri_convert --mid-frame`). |
| `--out` | string | — | Have FLIRT reslice the moveable into anatomical space and write it here. |
| `--template-out` | string | — | Save the frame-selected moveable as a template volume. |
| `--lta` | string | — | Also export the registration as an MGH [[lta-format\|`.lta`]] (via `lta_convert`). |
| `--bbr`<br>`--segreg` | string | — | After FLIRT, refine with boundary-based registration ([[mri_segreg]]); argument is the output reg. Sets `DoSegReg`. |
| `--bbr-mask` | bool | **on** | Use the BBR cortical mask in `mri_segreg`. |
| `--bbr-no-mask` | bool | — | Disable the BBR mask (`mri_segreg --no-mask`). |
| `--no-new-schedule` | bool | off | Do **not** use `flirt.newdefault.20080811.sch` for the full pass. |
| `--verbose` | int | `0` | FLIRT verbosity level (numeric argument). |
| `--tmp` | string | `<movdir>/tmp.fslregister.$$` | Temp working dir; implies `--nocleanup`. |
| `--nocleanup` | bool | off | Keep temporaries. |
| `--cleanup` | bool | **on** | Delete temporaries (default). |
| `--nolog`<br>`--no-log` | bool | off | Do not write a log file. |
| `--debug` | bool | off | tcsh `verbose` + `echo`. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `--initxfm` and `--initfslmat` are mutually exclusive
> Specifying both is a hard error ([`scripts/fslregister:630-633`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L630-L633)). Because
> `--initxfm` is **on by default**, the way to use a supplied initial matrix is
> to pass `--initfslmat <file>` (which sets `initxfm = 0` itself) and *not* also
> add `--initxfm`.

- **`--betfunc` implies `--betmov`.** Selecting `betfunc` turns moveable BET on
  ([`scripts/fslregister:459-462`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L459-L462)); `--betfvalue` only matters when some BET is
  active.
- **`--mid-frame` overrides `--frame`.** When `DoMidFrame` is set the
  `mri_convert` call uses `--mid-frame` and ignores the `--frame` value
  ([`scripts/fslregister:157-161`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L157-L161)).
- **`--allow-swap` only acts on positive-determinant moveables.** The swap path
  is entered only when `mri_info --det` reports a positive determinant
  ([`scripts/fslregister:169-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L169-L186)); on a negative-determinant grid the flag has no
  effect.
- **`--bbr`/`--segreg` is a post-step**, run *after* the FLIRT `register.dat`
  exists; `--bbr-mask`/`--bbr-no-mask` only matter when BBR is requested.
- **`--no-new-schedule`** changes only the *full* pass; the translation pre-pass
  always uses the bundled `xyztrans` schedule when `--trans` is on.

## Typical Use Cases

### Use Case 1: Register a BOLD run to its anatomical (the bbregister-style init)

```bash
# Geometry-initialised 6-DOF FLIRT of a functional to the subject anatomical
fslregister --s bert --mov bold.nii.gz --reg bold2anat.dat \
  --niters 1 --maxangle 90
```

This is essentially the call [[bbregister]] makes internally to seed
boundary-based registration.

### Use Case 2: Reslice the moveable and also export an LTA

```bash
fslregister --s bert --mov dwi_b0.nii.gz --reg dwi2anat.dat \
  --out dwi_in_anat.nii.gz --lta dwi2anat.lta
```

Writes the `register.dat`, the resliced volume, and an MGH `.lta`.

### Use Case 3: Difficult data — BET the moveable and iterate

```bash
fslregister --s bert --mov pet.nii.gz --reg pet2anat.dat \
  --betmov --betfvalue 0.3 --niters 3
```

Skull-strips the moveable, then runs the full FLIRT three times, each seeded by
the previous result.

## Pipeline Context

`fslregister` is **not** called by [[wiki/pipelines/recon-all|recon-all]]. Its
principal caller is [[bbregister]]:

**Predecessor (caller):** [[bbregister]] (FSL init path), `trac-preproc`,
`reg-feat2anat`, `mni152reg`, `mri_create_t2combined` → **This tool**
(calls `flirt.fsl`/`bet.fsl` + `tkregister2_cmdl`) → **Successor:**
[[mri_segreg]] (optional BBR refinement here), then surface sampling
(`mri_vol2surf`) or any tool that reads the `register.dat`.

It is the subject-anchored counterpart of [[fsl_rigid_register]]: that tool
registers any input to any reference; `fslregister` registers a moveable to a
**named subject's** anatomical and yields a `register.dat` directly.

## Gotchas and Caveats

> [!gotcha] Positive-determinant moveables are dimension-swapped for FLIRT
> FLIRT misbehaves on positive-determinant ("non-radiological") grids, so when
> `--allow-swap` is on (default) the script swaps the moveable's x dimension,
> registers, and then multiplies the swap transform back out of the final
> `register.dat` ([`scripts/fslregister:169-186`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L169-L186), [`334-340`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L334-L340)). The final
> matrix is correct for the original geometry, but intermediate FSL files refer
> to the swapped volume. Disable with `--no-allow-swap` only if you understand
> the determinant of your data.

> [!gotcha] Existing register.dat is renamed, not overwritten
> If `--reg` already exists it is moved to `<reg>.<YYMMDDHHMM>` before the new
> one is written ([`scripts/fslregister:221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L221)). Re-running accumulates timestamped
> backups.

> [!gotcha] `--betref` for non-default references
> BET is deliberately *not* run on the reference because the default `brainmask`
> is already skull-stripped. If you point `--fsvol` at a non-stripped volume
> (e.g. `T1`, `orig`), add `--betref` or the registration may be driven by skull.

> [!contradiction] Help text vs. code defaults
> The `BEGINHELP` prose claims the moveable is BET-stripped *by default*, that
> `--niters` defaults to **4**, and that `--maxangle` defaults to **70**
> ([`scripts/fslregister:771-800`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L771-L800)). The **code** sets `betmov = 0` (no BET by
> default), `nIters = 1`, and `maxangle = 90`
> ([`scripts/fslregister:32-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L32-L39)); the `--help` usage block agrees with the code.
> Code is authoritative.

## Error Compensation and Guard Rails

- **Determinant check + dim swap** for positive-determinant moveables
  (default), with the swap removed from the final registration.
- **Translation-only pre-pass** (`--trans`, default) robustly centers difficult
  data before the full FLIRT.
- **Geometry-based init** (`--initxfm`, default) compensates for the lack of
  direction cosines after Analyze/NIfTI conversion.
- **Left–right-reversal warning** when the resulting `register.dat` has a
  negative leading element ([`scripts/fslregister:342-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L342-L349)).
- **Automatic format conversion** of reference and moveable via
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L146); frame selection folded into that step.

## Related Tools

- [[bbregister]] — the primary caller; uses `fslregister` to compute an FSL/FLIRT initial registration before boundary-based refinement.
- [[fsl_rigid_register]] — sibling FSL/FLIRT wrapper that registers an arbitrary input to an arbitrary reference (not subject-anchored).
- [[mri_segreg]] — boundary-based registration invoked by the `--bbr`/`--segreg` option.
- [[tkregister2]] — performs the geometry init and FLIRT→`register.dat` conversion (`tkregister2_cmdl`).
- [[lta_convert]] — converts the registration to `.lta` (used by `--lta`).
- [[wiki/tools/mri_convert|mri_convert]] — format conversion and frame selection wrapping FLIRT.
- [[mri_matrix_multiply]] — multiplies the dim-swap transform back out of the final registration.
- [[coordinate-systems]] — FLIRT vs. tkreg vs. scanner-RAS conventions and the determinant/handedness issue.

## Confidence and Gaps

**High confidence:** complete double-dash flag set, the required subject/mov/reg
inputs, the translation + full + iterate FLIRT schedule, the positive-determinant
dim-swap and its removal from the final reg, the geometry init, the
`register.dat`/`.fsl.mat`/`.lta`/`--out` outputs, and the BBR hand-off — all read
directly from [`scripts/fslregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister).

> [!gap] Help/code default mismatch
> The documented defaults for `--niters` (4) and `--maxangle` (70) in the
> `BEGINHELP` prose do not match the code (1 and 90). The values above follow the
> code; if a downstream caller relies on the old documented defaults it must pass
> them explicitly.

## References

- FreeSurfer source: [`scripts/fslregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister) (v8.2.0).
- Built-in help: `fslregister --help` (the `BEGINHELP` block, [`scripts/fslregister:719-831`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fslregister#L719-L831)).
- Caller: [`scripts/bbregister:239-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L239-L240).
- FSL FLIRT: Jenkinson M, Smith SM. *A global optimisation method for robust affine registration of brain images.* Medical Image Analysis 5(2):143–156, 2001. https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLIRT
