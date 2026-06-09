---
title: "register.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/register.csh"
families: []                     # legacy standalone registration driver
recon_all_stage: null
related:
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[xsanatreg]]"
  - "[[mri_motion_correct]]"
  - "[[mri_robust_register]]"
  - "[[mri_transform_to_COR]]"
  - "[[registration-overview]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "Depends entirely on the AFNI toolkit (to3d, adwarp, 3dvolreg, 3drotate), which is not part of FreeSurfer and is not shipped in the v8.2.0 install; behaviour was inferred from the script, not run."
  - "Output is left as an AFNI BRIK/HEAD plus a single mri_convert call whose target argument and resulting layout are ambiguous; not verified against a real run."
tags:
  - registration
  - afni
  - legacy
  - cor
  - motion-correction
---

# register.csh

## Summary

`register.csh` is a **legacy** tcsh driver that rigid-body registers one
FreeSurfer **COR** volume to another using the **AFNI** toolkit (`to3d`,
`adwarp`, `3dvolreg`, `3drotate`), not FreeSurfer's own registration code. It
takes four positional arguments — a base COR directory, a moving COR directory,
a target voxel size, and an output directory — converts both COR stacks into
AFNI datasets under `/tmp/`, resamples them to the requested resolution, runs
`3dvolreg` to estimate the alignment, applies the estimated rotation/shift with
`3drotate`, and copies the registered AFNI dataset (plus a `mri_convert` pass) to
the output directory. It is an old, hard-wired utility with no flag parser and no
argument validation.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/register.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh)
- **Binary/script location:** `$FREESURFER_HOME/bin/register.csh`
- **External tools invoked (AFNI):** [`to3d`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L35), [`adwarp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L52), [`3dvolreg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L61), [`3drotate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L74) — all from the **AFNI** package, which is **not** part of FreeSurfer.
- **FreeSurfer tool invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L87) (final pass over the registered BRIK).

> [!gotcha] Requires AFNI, which FreeSurfer does not ship
> `to3d`, `adwarp`, `3dvolreg`, and `3drotate` are AFNI programs. They are
> **not** installed under `$FREESURFER_HOME/bin` in v8.2.0, so this script only
> runs where a separate AFNI installation is on `$PATH`. On a modern FreeSurfer
> system you would not use this; see [[xsanatreg]] (MINC `minctracc`) or
> [[mri_robust_register]] / [[mri_motion_correct]] instead.

## Purpose and Context

This is one of FreeSurfer's earliest registration utilities, from the era when
anatomy was stored as **COR** stacks (256 slices of 256×256 `uchar`, see
[[mri_transform_to_COR]] and [[subject-directory]]) and registration was farmed
out to AFNI. Its job is to bring a moving COR volume into alignment with a base
COR volume by a rigid-body (6-parameter) transform, at a user-chosen voxel size.

The modern FreeSurfer stack replaced this entirely: rigid alignment is now done
by [[mri_robust_register]], [[mri_coreg]], [[bbregister]], and (for within-series
motion) [[mri_motion_correct]]. `register.csh` survives in the tree as a legacy
artefact. It is **not** called by [[wiki/pipelines/recon-all|recon-all]] or any
current pipeline (a tree-wide grep finds no caller).

> [!gotcha] The script writes into fixed `/tmp/` paths
> Every intermediate is created at a hard-coded `/tmp/` location
> (`/tmp/base+orig`, `/tmp/new+orig`, etc.) and removed/overwritten with `rm`
> ([`scripts/register.csh:34-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L34-L87)). Two concurrent runs on the same
> machine will collide, and the `rm` lines assume those files are disposable.

## Inputs

`register.csh` has **no flags** — it is driven entirely by four positional
arguments:

### Required Inputs

| Position | Meaning |
|----------|---------|
| `$argv[1]` | **Base** COR directory (the fixed/reference volume). Its `COR-.info` is read and its `COR-???` slices are assembled by `to3d` ([`scripts/register.csh:25-37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L25-L37)). |
| `$argv[2]` | **Moving** COR directory (the volume to be registered to the base) ([`scripts/register.csh:44-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L44-L47)). |
| `$argv[3]` | **Target voxel size** (mm) passed to `adwarp -dxyz` to resample both datasets before registration ([`scripts/register.csh:52-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L52-L57)). |
| `$argv[4]` | **Output directory** to which the registered AFNI BRIK/HEAD and the `mri_convert` output are copied; it is created with `mkdir` ([`scripts/register.csh:82-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L82-L87)). |

### Input Assumptions

> [!assumption] Inputs are 256³ uchar COR directories
> Both `to3d` calls hard-code the geometry as `256:256:1` planes over `COR-???`
> with `-xSLAB 128R-128L -ySLAB 128I-128S -zSLAB 128P-128A`
> ([`scripts/register.csh:31-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L31-L47)), i.e. the classic 256×256×256,
> 1 mm, `uchar` FreeSurfer COR volume centred at the origin. Non-COR or
> non-256³ inputs are not supported. There is **no** argument validation: missing
> arguments produce raw tcsh "Subscript out of range" errors.

## Outputs

### Files Created

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `reg.res+orig.BRIK` / `.HEAD` | `$argv[4]/` (copied from `/tmp/`) | The moving volume after rigid registration to the base, as an AFNI dataset ([`scripts/register.csh:84-85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L84-L85)). |
| *(mri_convert output)* | `$argv[4]` | Result of `mri_convert -raw 256 256 256 uchar /tmp/reg.res+orig.BRIK $argv[4]` — re-reads the registered BRIK as a raw 256³ `uchar` volume ([`scripts/register.csh:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L87)). |
| `base+orig`, `new+orig`, `base.res+orig`, `new.res+orig`, `dset+orig`, `regist.afni` | `/tmp/` | AFNI intermediates and the `3dvolreg` motion-parameter dump; left in `/tmp/` (not copied out). |

### Output Specifications

The primary product is an **AFNI** dataset (`reg.res+orig`) in the output
directory, plus whatever the final `mri_convert -raw 256 256 256 uchar` pass
writes there. The registration is **rigid-body**: `3dvolreg` estimates three
rotations and three shifts, which are then re-applied with `3drotate`. See
[[coordinate-systems]] for the AFNI vs. FreeSurfer axis conventions implied by
the `I/R/A` and `S/L/P` suffixes used in the `3drotate` call.

> [!gotcha] The final `mri_convert` target argument is ambiguous
> The last line passes `$argv[4]` (the output **directory**) as the
> `mri_convert` output argument ([`scripts/register.csh:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L87)). Whether
> `mri_convert` interprets that as a COR directory or errors depends on the
> directory's state; this was not run. Treat the exact final on-disk layout as
> unverified.

## Mathematical Foundations

The registration model is a **6-parameter rigid-body** transform, computed
entirely by **AFNI `3dvolreg`** and re-applied by **AFNI `3drotate`** — there is
no FreeSurfer-side math in this script.

> [!math] Rigid-body alignment, applied as roll/pitch/yaw + shift
> `3dvolreg` aligns the (resampled) moving dataset to the base and writes six
> motion parameters to `regist.afni` ([`scripts/register.csh:61-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L61-L69)).
> The script then reads those six numbers and applies them to the *original*
> (un-resampled) moving volume with
> `3drotate -rotate <θ_I> <θ_R> <θ_A> -ashift <s_S> <s_L> <s_P>`
> ([`scripts/register.csh:69-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L69-L75)), i.e. three rotations about the
> I/R/A axes and three translations along the S/L/P axes in AFNI's Dicom-order
> convention. The numerical optimisation that yields these parameters lives in
> AFNI, not here.

## Configuration Options

### Complete Flag Reference

`register.csh` has **no command-line flags** — all behaviour is fixed in the
script body and controlled only by the four positional arguments above. A few
behaviours worth noting are hard-coded constants rather than options:

| Hard-coded setting | Value | Where |
|--------------------|-------|-------|
| Slab geometry | `-xSLAB 128R-128L -ySLAB 128I-128S -zSLAB 128P-128A` | [`scripts/register.csh:36-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L36-L46) |
| Data type / dims for `to3d` | `3Db:0:0 … :256:256:1` over `COR-???` | [`scripts/register.csh:31-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L31-L47) |
| `3dvolreg` max iterations | `-maxite 32` | [`scripts/register.csh:61-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L61-L62) |
| Working directory | `/tmp/` (fixed) | [`scripts/register.csh:34-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L34-L49) |
| Final raw geometry | `256 256 256 uchar` | [`scripts/register.csh:87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L87) |

### Configuration Interactions

> [!gotcha] No argument checking at all
> Unlike the other scripts in this family, `register.csh` has neither a flag
> parser nor a `check_params` block. Omitting or misordering the four positional
> arguments yields bare tcsh errors (`argv: Subscript out of range`), and the
> only "interaction" is positional order: base, moving, voxel size, output dir.

- The third argument (`-dxyz`) is applied identically to **both** the base and
  the moving dataset before registration, so it sets the resolution at which
  `3dvolreg` operates, not the resolution of the final output (the rotation is
  re-applied to the original moving volume).

## Typical Use Cases

### 1. Rigidly register one COR volume to another (legacy)

```bash
# Register the moving COR stack to the base COR stack at 1 mm,
# writing the result into ./registered (requires AFNI on $PATH).
register.csh /path/to/base_COR /path/to/moving_COR 1 ./registered
```

This assembles both COR stacks into AFNI datasets, resamples to 1 mm, runs
`3dvolreg`, applies the estimated rigid transform with `3drotate`, and copies the
registered dataset to `./registered`.

> [!gotcha] Prefer modern equivalents
> For any new work, use [[mri_robust_register]] or [[mri_coreg]] for anatomical
> rigid registration, [[mri_motion_correct]] for within-series motion, or
> [[xsanatreg]] if you specifically need the MINC `minctracc` path. `register.csh`
> is retained only for backward compatibility.

## Pipeline Context

`register.csh` is a **standalone legacy** driver. It is not invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all` (no caller exists in the
script tree).

**Predecessor:** two COR directories (e.g. from
[[mri_transform_to_COR]] or an old `recon-all` run) → **register.csh** (via AFNI)
→ **Successor:** an AFNI `reg.res+orig` dataset / raw 256³ volume in the output
directory, for manual downstream use.

## Gotchas and Caveats

> [!gotcha] Commented-out MATLAB and copy paths
> The script contains large commented-out blocks — an `AVW2COR` MATLAB
> conversion and several alternative copy steps
> ([`scripts/register.csh:80-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L80-L98)). These are inert; only the active
> lines run. They are remnants of an older workflow and are not executed.

> [!gotcha] Output dataset stays in AFNI orientation
> The registered result is produced and copied as an AFNI `+orig` dataset. Its
> orientation follows AFNI conventions, which differ from FreeSurfer's; interpret
> it with care (see [[coordinate-systems]]).

## Error Compensation and Guard Rails

There are essentially none. The script:

- pre-emptively `rm`s its `/tmp/` intermediates before each step
  ([`scripts/register.csh:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L34),
  [`scripts/register.csh:44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L44)), so a stale file from a prior run does
  not block it;
- creates the output directory with `mkdir` (which errors if it already exists,
  since the conditional guard around it is commented out,
  [`scripts/register.csh:81-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh#L81-L83));

but it does **not** validate its arguments, check that AFNI tools exist, or check
any exit status. Failures surface as raw tool errors.

## Related Tools

- [[xsanatreg]] — the MINC/`minctracc` counterpart for cross-session anatomical registration; the more commonly retained legacy path.
- [[mri_robust_register]] — modern robust rigid/affine volume registration; the present-day replacement for this script.
- [[mri_motion_correct]] — registers a series of acquisitions to the first (within-subject motion correction).
- [[wiki/tools/mri_convert|mri_convert]] — used at the end to re-read the registered BRIK as a raw 256³ `uchar` volume.
- [[mri_transform_to_COR]] — produces the COR directories that are this script's inputs.
- [[registration-overview]], [[coordinate-systems]] — background on registration and the AFNI-vs-FreeSurfer coordinate conventions.

## Confidence and Gaps

**Medium confidence.** The control flow, the four positional arguments, the
hard-coded geometry, and the AFNI tool sequence are all read directly from
[`scripts/register.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh).
Confidence is capped at medium because the behaviour depends on **AFNI**, which
is external and absent from this install, so the script was not run.

> [!gap] AFNI dependency not exercised
> `to3d`, `adwarp`, `3dvolreg`, and `3drotate` are not present in the v8.2.0
> `$FREESURFER_HOME/bin`. The exact AFNI dataset produced and the semantics of
> the `3drotate` axis suffixes were inferred from the script and AFNI conventions,
> not verified by running it.

> [!gap] Final `mri_convert` output layout
> The last `mri_convert -raw 256 256 256 uchar … $argv[4]` writes into the output
> *directory* argument; the resulting file/COR layout was not confirmed.

## References

- FreeSurfer source: [`scripts/register.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/register.csh) (v8.2.0).
- AFNI documentation (external) for `to3d`, `adwarp`, `3dvolreg`, `3drotate` — the programs this script orchestrates.
