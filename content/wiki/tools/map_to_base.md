---
title: "map_to_base"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # bash
source_files:
  - "scripts/map_to_base"
families: []                     # standalone longitudinal helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[longitudinal-processing]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mris_transform]]"
  - "[[mri_label2label]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - longitudinal
  - registration
  - resampling
  - base
  - surface
---

# map_to_base

## Summary

`map_to_base` resamples a **single** volume or surface from one timepoint of a
FreeSurfer [longitudinal](longitudinal-processing) study into that study's
**base (template) space**, and writes the result into the base subject's
directory. It looks up the timepoint-to-base registration
(`<tp>_to_<base>.lta`) already created by the longitudinal stream and applies it
with [[wiki/tools/mri_convert|mri_convert]] (for volumes) or [[mris_transform]]
(for surfaces), choosing the interpolation method from a user-supplied reslice
type. It is a thin, single-file wrapper — one input per call.

## Source Information

- **Language:** bash shell script
- **Source file:** [`scripts/map_to_base`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base)
- **Binary/script location:** `$FREESURFER_HOME/bin/map_to_base`
- **Original author:** Martin Reuter (per the source header).
- **FreeSurfer tools invoked:**
  [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L93)
  (volumes) and
  [`mris_transform`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L101)
  (surfaces).

## Purpose and Context

In FreeSurfer's longitudinal pipeline, each subject is processed at several
**timepoints** (the cross-sectional runs), an unbiased **base** template is
built from all timepoints, and each timepoint is then re-processed *relative to*
that base, producing directories named `<tp>.long.<base>`
([[longitudinal-processing]]). The registration that aligns a timepoint to the
base is stored in the base subject as
`mri/transforms/<tp>_to_<base>.lta`.

`map_to_base` is the convenience tool for pulling **one** image or surface from a
timepoint (either its longitudinal directory `<tp>.long.<base>` or, with the
`cross` flag, its raw cross-sectional directory `<tp>`) into the base subject's
own `mri/` or `surf/` folder, applying that stored registration. Typical uses
are bringing each timepoint's `norm.mgz`, `aseg.mgz`, or `lh.white` into the
common base space so they can be compared or overlaid in one coordinate frame.

It is a **hand-run helper**, not a stage of
[[wiki/pipelines/recon-all|recon-all]]; it is used after longitudinal processing
has produced the base and the per-timepoint registrations.

## Inputs

### Required Inputs

Four positional arguments (a fifth is optional), parsed at
[`scripts/map_to_base:32-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L32-L67):

1. **`baseid`** — the base (template) subject ID. Must exist under
   `$SUBJECTS_DIR`.
2. **`tpid`** — the timepoint ID **without** the `.long.<base>` suffix (the
   script adds it). E.g. `tp1`, not `tp1.long.base`.
3. **`input`** — the file to map, named by its on-disk basename relative to the
   timepoint's `mri/` (or `surf/`) directory: e.g. `norm.mgz`, `aseg.mgz`,
   `lh.white`.
4. **`rt`** (reslice type) — one of `interpolate`, `nearest`, or `surface`
   (see the flag table). This both selects the tool (`mri_convert` vs
   `mris_transform`) and, for volumes, the interpolation kernel.
5. **`cross`** *(optional, 5th arg)* — if **any** 5th argument is present
   (the help suggests `1`), the input is taken from the *cross-sectional*
   timepoint directory `<tp>` instead of the longitudinal `<tp>.long.<base>`,
   and the output is tagged `-cross` rather than `-long`
   ([`scripts/map_to_base:64-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L64-L67)).

The script requires **more than 3** arguments; with 3 or fewer it prints the
usage block and exits 1
([`scripts/map_to_base:32-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L32-L54)).

### Input Assumptions

> [!assumption] Longitudinal directory structure and an existing tp→base LTA
> The script assumes a completed longitudinal setup under `$SUBJECTS_DIR`:
> the base subject `<base>/` exists, the timepoint directory exists
> (`<tp>.long.<base>/` for the default longitudinal mode, or `<tp>/` with the
> `cross` flag), and the registration
> `<base>/mri/transforms/<tp>_to_<base>.lta` exists. All three are checked
> explicitly and a missing one is a fatal error
> ([`scripts/map_to_base:69-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L69-L87)).
> `$SUBJECTS_DIR` and `$FREESURFER_HOME` must be set
> ([`scripts/map_to_base:25-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L25-L29)).

For volume reslice types, the script also reslices **like** the base file of the
same name (`-rl $base/mri/$input`), so a base volume of that name should exist to
define the output geometry (see Output Specifications).

## Outputs

### Files Created

A **single** output file is written into the base subject, named
`<tp><tag>.<input>` where `<tag>` is `-long` (default) or `-cross`
([`scripts/map_to_base:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L89)):

| Reslice type (`rt`) | Output directory | Output file | Tool used |
|---------------------|------------------|-------------|-----------|
| `interpolate` | `<base>/mri/` | `<tp>-long.<input>` (or `<tp>-cross.<input>`) | [[wiki/tools/mri_convert|mri_convert]] |
| `nearest` | `<base>/mri/` | `<tp>-long.<input>` | [[wiki/tools/mri_convert|mri_convert]] |
| `surface` | `<base>/surf/` | `<tp>-long.<input>` | [[mris_transform]] |

Example: `map_to_base base tp1 aseg.mgz nearest` →
`$SUBJECTS_DIR/base/mri/tp1-long.aseg.mgz`.

### Output Specifications

- **Volume reslice types** (`interpolate`, `nearest`) call
  `mri_convert -at <lta> [-rt nearest] -rl <base>/mri/<input> <infile> <outfile>`
  ([`scripts/map_to_base:91-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L91-L99)).
  `-at` applies the LTA (apply-transform), and `-rl` reslices the result **like**
  the base subject's same-named volume, so the output inherits the base's
  voxel grid, dimensions, and geometry. `interpolate` uses `mri_convert`'s
  default (trilinear) kernel; `nearest` forces nearest-neighbour (`-rt nearest`),
  which is required for label/segmentation volumes whose integer codes must not
  be interpolated.
- **Surface reslice type** (`surface`) calls
  `mris_transform <infile> <lta> <outfile>`
  ([`scripts/map_to_base:100-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L100-L101)),
  warping the vertex coordinates by the registration.

> [!math] Surface vs. volume transform direction
> [[mris_transform]] documents that, for a surface, the transform applied to
> vertex *coordinates* is the **inverse** of the same image-to-image transform
> applied to a *volume*. `map_to_base` hands the **same** `<tp>_to_<base>.lta`
> to both `mri_convert -at` and `mris_transform`; `mris_transform` internally
> inverts it so that volumes and surfaces both end up in base space. The user
> does not invert anything.

## Mathematical Foundations

`map_to_base` performs no math itself; it selects a transform and a resampler.
The geometric work is an affine resample of the input by the stored
linear-transform-array (LTA) registration $T_{tp\to base}$. For a volume,
the output sample at base voxel $x_b$ is the input sampled at
$T_{tp\to base}^{-1} x_b$ via `mri_convert`'s `-at`/`-rl` machinery; for a
surface, each vertex $v$ is moved to $T_{tp\to base}^{-1} v$ inside
[[mris_transform]]. The only decision encoded in this script is the
**interpolation kernel** (trilinear for `interpolate`, nearest-neighbour for
`nearest`) and the **resample target geometry** (`-rl <base>/mri/<input>`).

> [!internal] Transform application lives in the called tools
> The LTA application, inversion, and resampling are implemented in
> [[wiki/tools/mri_convert|mri_convert]] and [[mris_transform]] (and the shared
> LTA / transform library), not in this wrapper.

## Configuration Options

### Complete Flag Reference

`map_to_base` is **purely positional** — it has no `-` option flags. The
arguments below are read by position
([`scripts/map_to_base:57-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L57-L67)).

| Argument | Position | Type | Default | Description |
|----------|----------|------|---------|-------------|
| `baseid` | 1 | string | *(required)* | Base/template subject ID under `$SUBJECTS_DIR`. |
| `tpid` | 2 | string | *(required)* | Timepoint ID **without** the `.long.<base>` suffix. |
| `input` | 3 | string | *(required)* | Basename of the file to map (e.g. `norm.mgz`, `aseg.mgz`, `lh.white`), relative to the timepoint's `mri/` or `surf/`. |
| `rt` | 4 | enum: `interpolate` \| `nearest` \| `surface` | *(required)* | Reslice type. `interpolate` → trilinear volume (T1/norm/orig); `nearest` → nearest-neighbour volume (aseg/labels); `surface` → warp a surface with `mris_transform`. An unrecognised value is a fatal error ([`scripts/map_to_base:102-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L102-L104)). |
| `cross` | 5 | (presence flag) | absent → use longitudinal dirs | If a 5th argument is given (help suggests `1`), read the input from the cross-sectional `<tp>/` directory and tag the output `-cross` instead of `-long` ([`scripts/map_to_base:64-67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L64-L67)). |

### Configuration Interactions

> [!gotcha] `rt` couples the directory, the tool, and the file type — choose it to match the data
> The reslice type does three things at once: it picks `surf/` vs `mri/`
> ([`scripts/map_to_base:61-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L61-L62)),
> it picks `mris_transform` vs `mri_convert`, and (for volumes) it picks the
> interpolation kernel. The three valid values map to data types as
> **`interpolate` → continuous volumes** (norm/T1/orig), **`nearest` →
> label/segmentation volumes** (aseg and friends, to avoid blending integer
> codes), **`surface` → surfaces** (lh.white, lh.pial, …). Using `interpolate`
> on `aseg.mgz` would corrupt the label codes; using a volume reslice type on a
> surface basename would look for it in `mri/` and fail.

> [!gotcha] The `cross` argument is presence-triggered, not value-checked
> Any non-empty 5th argument switches to cross-sectional mode — the script tests
> only the argument **count** (`$# -ge 5`), it never reads the value. So
> `map_to_base base tp1 norm.mgz interpolate 0` still uses the cross-sectional
> directory, despite the `0`. The help's `[cross]` convention is to pass `1`.

> [!gotcha] One input per invocation
> There is no batch mode and no flag interface; map each file with a separate
> call. (Tools like [[mri_label2label]] perform a different job — surface/label
> resampling between subjects — and are not a drop-in replacement here.)

## Typical Use Cases

### Use Case 1: Bring a timepoint's normalised T1 into base space

```bash
# Trilinear resample tp1's longitudinal norm.mgz into the base subject.
map_to_base base_subj tp1 norm.mgz interpolate
# → $SUBJECTS_DIR/base_subj/mri/tp1-long.norm.mgz
```

### Use Case 2: Bring a segmentation into base space (nearest-neighbour)

```bash
# aseg holds integer labels — must use nearest to preserve codes.
map_to_base base_subj tp2 aseg.mgz nearest
# → $SUBJECTS_DIR/base_subj/mri/tp2-long.aseg.mgz
```

### Use Case 3: Map a surface into base space

```bash
map_to_base base_subj tp1 lh.white surface
# → $SUBJECTS_DIR/base_subj/surf/tp1-long.lh.white
```

### Use Case 4: Map from the cross-sectional (non-longitudinal) run

```bash
# Pull the *cross-sectional* tp1 norm.mgz (dir = tp1, not tp1.long.base) into base space.
map_to_base base_subj tp1 norm.mgz interpolate 1
# → $SUBJECTS_DIR/base_subj/mri/tp1-cross.norm.mgz
```

## Pipeline Context

`map_to_base` is a post-processing helper for the **longitudinal** stream. It is
**not** invoked by [[wiki/pipelines/recon-all|recon-all]].

**Predecessor:** longitudinal processing — base creation and the per-timepoint
`recon-all -long` runs that write `<base>/mri/transforms/<tp>_to_<base>.lta`
(see [[longitudinal-processing]]) → **map_to_base** → **Successor:** any
base-space comparison/visualisation of the mapped `<tp>-long.<input>` files
(overlay in [[wiki/tools/freeview|freeview]], difference maps, group analysis).

## Gotchas and Caveats

> [!gotcha] `tpid` must omit the `.long.<base>` suffix
> Pass the bare timepoint ID; the script forms `<tp>.long.<base>` itself
> ([`scripts/map_to_base:65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L65)).
> Passing the full `tp1.long.base` would make it look for
> `tp1.long.base.long.base`, which does not exist.

> [!gotcha] Volume output geometry is the base's same-named file
> `-rl $bdir/mri/$input` reslices the output **like** the base subject's file of
> the same name
> ([`scripts/map_to_base:94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L94),
> [`scripts/map_to_base:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L98)).
> If `<base>/mri/<input>` is missing, `mri_convert` has no reslice target; ensure
> the base subject contains a file of that name (it normally does for standard
> recon-all outputs like `norm.mgz`/`aseg.mgz`).

> [!gotcha] Output overwrites silently
> If `<tp>-long.<input>` already exists in the base directory it is overwritten
> by the called tool without warning.

## Error Compensation and Guard Rails

- **Environment check.** Aborts if `$FREESURFER_HOME` is unset
  ([`scripts/map_to_base:25-29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L25-L29)).
- **Existence checks before doing anything.** The input file, the base subject
  directory, and the `<tp>_to_<base>.lta` registration are each checked, with a
  specific error and a non-zero exit if missing
  ([`scripts/map_to_base:69-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L69-L87)).
  The LTA check's message explicitly reminds the user that the timepoint must be
  part of this base.
- **Reslice-type validation.** An unknown `rt` is rejected with
  `ERROR: Reslice type: <rt> not recognized`
  ([`scripts/map_to_base:102-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L102-L104)).
- **Command echo.** The constructed command is printed before being `eval`-ed
  ([`scripts/map_to_base:107-108`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L107-L108)),
  so the exact `mri_convert`/`mris_transform` invocation is visible in logs.

## Related Tools

- [[longitudinal-processing]] — the workflow that creates the base and the
  `<tp>_to_<base>.lta` registrations this tool depends on.
- [[wiki/tools/mri_convert|mri_convert]] — applies the LTA and reslices for the
  `interpolate`/`nearest` (volume) paths.
- [[mris_transform]] — warps surfaces for the `surface` path; inverts the
  volume-style transform internally.
- [[mri_label2label]] — a related but distinct mapping tool (label/surface
  resampling between subjects); not a substitute for base-space volume mapping.

## Confidence and Gaps

**High confidence:** the four/five positional arguments, the `interpolate` /
`nearest` / `surface` dispatch, the exact `mri_convert -at/-rt/-rl` and
`mris_transform` command lines, the `-long`/`-cross` output naming, the
`mri/` vs `surf/` selection, the LTA/base-dir/input existence checks, and the
presence-triggered `cross` argument — all read directly from
[`scripts/map_to_base`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base)
and confirmed against the script's usage output.

## References

- FreeSurfer source: [`scripts/map_to_base`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base) (v8.2.0).
- Usage block: printed by running `map_to_base` with too few arguments
  ([`scripts/map_to_base:32-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/map_to_base#L32-L54)).
- Method context: Reuter et al., "Within-subject template estimation for
  unbiased longitudinal image analysis," *NeuroImage* 61(4):1402–1418 (2012) —
  the longitudinal base/template framework these registrations come from.
