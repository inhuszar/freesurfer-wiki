---
title: "rca-long-tp-init"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/rca-long-tp-init"
families: []                     # recon-all component script (rca-* family of internal stage drivers)
recon_all_stage: autorecon2
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_add_new_tp]]"
  - "[[longmc]]"
  - "[[mri_map_cpdat]]"
  - "[[samseg2recon]]"
  - "[[longitudinal-pipeline]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Whether the `-conf2hires` branch (DoConf2Hires) is ever exercised through recon-all's longitudinal call is not confirmed; recon-all builds the call without -conf2hires, so the high-res longitudinal path is described from the script alone."
  - "The interaction between -cp-fp/-cp-force and cross-user/cross-platform copy semantics is documented from the in-source comment block; not independently reproduced."
tags:
  - longitudinal
  - recon-all
  - initialization
  - timepoint
---

# rca-long-tp-init

## Summary

`rca-long-tp-init` **initializes a longitudinal time-point subject** before the
rest of [[wiki/pipelines/recon-all|recon-all]] processes it. In FreeSurfer's
longitudinal stream, each session ("time point") is reconstructed using
information carried over from an unbiased within-subject **base** (template).
This script does that carry-over: it runs longitudinal motion correction
([[longmc]]) and then copies the base's brainmask, Talairach transform, aseg,
white/pial surfaces, and sphere into the time-point directory under the names the
later recon-all stages expect, and it maps the cross-sectional control points
into the time-point's space with [[mri_map_cpdat]]. The code was lifted almost
verbatim out of recon-all so that the longitudinal "seeding" logic lives in one
re-runnable place; it is normally invoked **by recon-all** at the start of a
`-long` (or `-long-samseg`) run, but can also be run standalone for testing.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init)
- **Binary/script location:** `$FREESURFER_HOME/bin/rca-long-tp-init`
- **Tools invoked:** [`longmc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L168) (longitudinal motion correction), [`mri_map_cpdat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L156) (map control points through the cross→base LTA), plus `cp`, the helpers `UpdateNeeded`, `fsr-getxopts` / `fsr-checkxopts`, `getfullpath`, and `fs_time`.

## Purpose and Context

The FreeSurfer longitudinal pipeline ([Reuter et al. 2012](#references)) processes
two or more scans of the same individual in three passes:

1. **Cross-sectional** — each time point is reconstructed independently
   (ordinary recon-all).
2. **Base** — an unbiased within-subject template is built from all time points
   (`recon-all -base`).
3. **Longitudinal** — each time point is re-processed, *initialized from the
   base*, so the result is consistent across sessions and less noisy
   (`recon-all -long <tp> <base>`).

`rca-long-tp-init` implements the **seeding of pass 3**: it transfers the base's
results into the longitudinal time-point directory
(`<tp>.long.<base>`) so the downstream recon-all stages start from the template
rather than from scratch. The script's own header notes that "code was just cut
out of recon-all" and that some constructs look redundant (e.g. `longitudinal` is
hard-set to 1 and then re-checked) precisely to keep parity with the original
in-line code ([`scripts/rca-long-tp-init#L2-L11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L2-L11)).

> [!gotcha] It runs from within recon-all, and its log says "rca-base-init"
> Although the script is `rca-long-tp-init`, its local log file is named
> `scripts/rca-base-init.log` and the log header reads "Log file for
> rca-base-init" ([`scripts/rca-long-tp-init#L110`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L110), [`#L116`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L116)). recon-all also
> reads its expert options under the key `rca-base-init`
> ([`scripts/recon-all:1207`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1207)). This naming is a historical artefact of
> the base/long refactor; the script does long-time-point init, not base init.

## Inputs

### Required Inputs

- **`-long <tpNid> <longbaseid>`** — the cross-sectional time-point subject ID and
  the base (template) subject ID. From these the script derives the longitudinal
  subject ID `subjid = <tpNid>.long.<longbaseid>`
  ([`scripts/rca-long-tp-init#L341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L341)). Both must exist under `$SUBJECTS_DIR`.
  (Alternatively `-long-samseg <base> <longtp>` for the SAMSEG longitudinal
  variant, which sets a different `subjid` and skips the copy block — see
  Configuration Interactions.)
- A completed **base** subject `<longbaseid>` containing `mri/brainmask.mgz`,
  `mri/transforms/talairach.lta`, `mri/aseg.mgz`, `surf/?h.white`, `surf/?h.pial`,
  and `surf/?h.sphere` — these are the files copied into the time point.
- A completed **cross-sectional** time point `<tpNid>` (its `orig` inputs feed
  [[longmc]]; its `tmp/control.dat`, if present, is mapped into the time point).
- The base→time-point registration
  `<base>/mri/transforms/<tpNid>_to_<base>.lta`, used by [[mri_map_cpdat]] to move
  control points into the time point's space.

### Input Assumptions

> [!assumption] Base and cross-sectional runs already exist
> This script does no reconstruction of its own beyond [[longmc]]; it assumes
> both the cross-sectional time point and the base template have been fully
> processed and that `mri_add_new_tp` has registered the time point to the base
> (recon-all does this immediately before calling the script — see Pipeline
> Context). It only seeds the longitudinal directory; the actual surface/volume
> processing happens in the recon-all stages that follow.

## Outputs

### Files Created

All paths below are under the longitudinal subject directory
`$SUBJECTS_DIR/<tpNid>.long.<longbaseid>/`. Most are **copies of base outputs**,
renamed to the names recon-all's longitudinal stages expect.

| File / path | Source | Purpose |
|-------------|--------|---------|
| `scripts/long.base-tps` | copy of `<base>/base-tps` | List of all time points in the base. |
| `scripts/long.base` | written | Records the base subject ID. |
| `scripts/long.cross` | written | Records the cross-sectional time-point ID. |
| `tmp/control.dat` | `mri_map_cpdat` of `<tp>/tmp/control.dat` | Cross-sectional control points mapped into the time point (skipped if `-uselongbasectrlvol`). |
| `mri/brainmask_<base>.mgz` | copy of `<base>/mri/brainmask.mgz` | Base brainmask, used as the longitudinal skull-strip seed. |
| `mri/transforms/talairach.lta` | copy of `<base>/.../talairach.lta` | Base Talairach transform (skips re-running em_register). |
| `mri/aseg_<base>.mgz` | copy of `<base>/mri/aseg.mgz` | Base subcortical segmentation, carried into CA-normalize. |
| `surf/?h.orig`, `surf/?h.orig_white` | copy of `<base>/surf/?h.white` | Base white surface as the longitudinal starting white. |
| `surf/?h.orig_pial` | copy of `<base>/surf/?h.pial` | Base pial as the longitudinal starting pial. |
| `surf/?h.sphere` | copy of `<base>/surf/?h.sphere` | Base sphere (sphere step skipped in long). |
| `touch/*.touch` | written | Stage "done" markers (`longmc.touch`, `em_register.touch`, `?h.sphmorph.touch`) so recon-all treats the copied results as already computed. |
| `scripts/rca-base-init.log` | written | Local log (see gotcha above). |

The script also `mkdir`s the standard time-point subtree (`touch scripts
mri/transforms surf tmp`) if missing ([`scripts/rca-long-tp-init#L104-L106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L104-L106)),
and (when passed `-cf`/`-sf`) appends its commands to the recon-all `cmd` and
`status` files.

### Output Specifications

The copied volumes and surfaces retain the **base subject's** geometry and data
type — that is the whole point: the time point inherits the template's coordinate
frame and surface topology so all sessions are mutually registered. The `?h.orig`
/ `?h.orig_white` / `?h.orig_pial` triplet seeds the surface-deformation stages;
`brainmask_<base>.mgz` and `aseg_<base>.mgz` carry the base's masking and
segmentation; `talairach.lta` carries the base's linear registration.

## Mathematical Foundations

`rca-long-tp-init` itself is almost entirely **file management** — `cp`,
symlink-free copies, and `UpdateNeeded` timestamp checks. The two places real
computation is delegated:

- **Longitudinal motion correction** is done by [[longmc]] (registers and averages
  the time point's runs into the base space).
- **Control-point mapping** applies the cross→base affine LTA to each control
  point coordinate, via [[mri_map_cpdat]] (`-in <cross control.dat> -lta
  <tpN_to_base.lta> -out <tp control.dat>`,
  [`scripts/rca-long-tp-init#L156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L156)).

> [!internal] The longitudinal model lives elsewhere
> The unbiased within-subject template construction and the inverse-consistent
> robust registration that make the longitudinal stream work are implemented in
> the base-building tools and `mri_robust_template`, not here. This script only
> *consumes* the base and the cross→base LTA. See [[longitudinal-pipeline]].

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/rca-long-tp-init#L314-L468`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L314-L468)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-long`<br>`-longitudinal <tp> <base>` | 2 strings | *(required\*)* | Longitudinal mode. `tp` = cross-sectional time-point ID, `base` = template ID; sets `subjid=<tp>.long.<base>`. Trailing slashes are stripped via `basename`. |
| `-long-samseg <base> <longtp>` | 2 strings | — | SAMSEG longitudinal variant: sets `LongSamseg=1` and `subjid=<longtp>` (arbitrary name allowed). **Skips** the entire copy/motion-correction block. See [[samseg2recon]]. |
| `-s`<br>`-subject`<br>`-subjid`<br>`-sid <id>` | string | derived | Override the subject ID (basename-stripped). "Good for testing; put **after** `-long`," per the source. |
| `-sb <id>` | string | — | Hidden: like `-s` but **without** `basename` stripping (needed for xhemi-style subject subdirs). |
| `-sd <dir>` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `-uselongbasectrlvol` | bool | off | Use the base control-point volume; **suppresses** mapping the cross-sectional `control.dat` into the time point. |
| `-hemi <lh\|rh>` | string | `lh rh` | Restrict copying/seeding to one hemisphere. |
| `-conf2hires` | bool | off | High-resolution longitudinal path: sets `DoConf2Hires=1` and turns off the pial-copy block (`DoPialSurfs=0`, done later in conf2hires); also sets `DoSurfVolume=1`, `HiRes=0`, `ConformMin=0`, `UseCubic=0`. |
| `-expert <file>` | string | — | Expert-options file (validated by `fsr-checkxopts`); its `longmc` entries are injected into the [[longmc]] call. |
| `-dontrun` | bool | off (runs) | Echo commands without executing (dry run). |
| `--force-update` | bool | off | Copy/recompute even if the destination is newer than the source (bypass `UpdateNeeded`). |
| `-cp-fp`<br>`-no-cp-fp` | bool | off | Set `FS_RCA_LONG_TP_INIT_CP_FP`; when on, copies use `cp -f -p` (preserve mode/timestamps). See cross-user gotcha. |
| `-cp-force`<br>`-no-cp-force` | bool | off | Set `FS_RCA_LONG_TP_INIT_CP_FORCE`; when on, always copy regardless of the `UpdateNeeded` result. |
| `-log <file>` | string | `/dev/null` | recon-all's main log to **append** to (the script always also writes `scripts/rca-base-init.log`). |
| `-cf <file>` | string | `scripts/recon-all.cmd` | recon-all `cmd` file to append issued commands to. |
| `-sf <file>` | string | `scripts/recon-all-status.log` | recon-all `status` file. |
| `-nolog`<br>`-no-log` | bool | — | Send the appended log to `/dev/null`. |
| `-debug`<br>`--debug` | bool | off | `set echo`/`verbose` tracing. |
| `-help` | bool | — | Print usage and exit. |
| `-version` | bool | — | Print the version and exit. |

\* Either `-long` (or `-long-samseg`), or one of the `-s`-family flags, must set
`subjid`; otherwise `check_params` errors with "must spec -long"
([`scripts/rca-long-tp-init#L476-L479`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L476-L479)).

The script also honours two **environment variables** as the master switches that
the `-cp-*` flags set: `FS_RCA_LONG_TP_INIT_CP_FP` and
`FS_RCA_LONG_TP_INIT_CP_FORCE` (both default 0,
[`scripts/rca-long-tp-init#L25-L30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L25-L30)). It also sets `FS_LOAD_DWI 0` to stop
DWI loading ([`scripts/rca-long-tp-init#L13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L13)).

### Configuration Interactions

> [!gotcha] `-long-samseg` is a different code path, not a modifier of `-long`
> Setting `-long-samseg` puts `LongSamseg=1`, which **wraps the entire copy /
> motion-correction / control-point block in `if(! $LongSamseg)`**
> ([`scripts/rca-long-tp-init#L138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L138)). In SAMSEG longitudinal mode the time
> point is seeded by `samseg2recon` instead, so this script does essentially
> nothing but set up the subject ID and directories. recon-all dispatches the two
> cases separately ([`scripts/recon-all:1204`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1204) vs [`:1228`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1228)).

> [!gotcha] `-conf2hires` suppresses the pial copy
> With `-conf2hires`, `DoPialSurfs` is set to 0, so `?h.orig_pial` is **not**
> copied in the dedicated pial block — but it is still copied in the white-surface
> block ([`scripts/rca-long-tp-init#L252-L258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L252-L258)), with a comment that the pial
> placement is finished later by conf2hires. Don't expect the standalone pial
> block to run under `-conf2hires`.

> [!gotcha] `-uselongbasectrlvol` skips control-point mapping entirely
> The cross-sectional `control.dat` is mapped into the time point **only** when
> `-uselongbasectrlvol` is *not* set ([`scripts/rca-long-tp-init#L151`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L151)). If you
> ask to use the base control volume, the time point inherits the base's control
> handling and the per-time-point control points are ignored.

- `-s`/`-subjid` must come **after** `-long` on the command line, because `-long`
  recomputes `subjid` from `<tp>.long.<base>` and would overwrite an earlier `-s`.
- `--force-update` and `-cp-force` overlap: `--force-update` forces the
  `UpdateNeeded`-guarded copies/commands, while `-cp-force`
  (`FS_RCA_LONG_TP_INIT_CP_FORCE`) is the older switch that the individual `cp`
  guards also test. Either one forces the copy.

## Typical Use Cases

### 1. As recon-all calls it (standard longitudinal time point)

```bash
# recon-all -long tp1 base01 ... issues, near the top of the run:
rca-long-tp-init -long tp1 base01 -s tp1.long.base01 \
  -log .../scripts/recon-all.log \
  -cf  .../scripts/recon-all.cmd \
  -sf  .../scripts/recon-all-status.log
# → seeds tp1.long.base01/ from base01 (brainmask, talairach.lta, aseg,
#   ?h.white/pial/sphere, mapped control.dat) and runs longmc.
```

### 2. SAMSEG longitudinal time point

```bash
rca-long-tp-init -long-samseg base01 longtp01 -s longtp01
# Sets up the subject ID/dirs only; seeding is done by samseg2recon.
```

### 3. Standalone, single hemisphere, dry run (testing)

```bash
rca-long-tp-init -long tp1 base01 -hemi lh -dontrun
```

## Pipeline Context

`rca-long-tp-init` runs at the **start of recon-all's longitudinal block**, before
the volumetric (autorecon2) processing of the time point — it seeds the data that
autorecon2/autorecon3 then refine, so it is classified here under **autorecon2**.
recon-all builds the call at
[`scripts/recon-all:1195-1232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1195-L1232):

```tcsh
if($longitudinal && ! $LongSamseg) then
  if($DoAddTp) then
    set cmd = (mri_add_new_tp $longbaseid $tpNid)   # register tp -> base
    ...
  endif
  set cmd = (rca-long-tp-init -long $tpNid $longbaseid -s $subjid -log $LF -cf $CF -sf $SF)
  if($UseLongbaseCtrlVol) set cmd = ($cmd -uselongbasectrlvol)
  if($#hemilist == 1) set cmd = ($cmd -hemi $hemilist)
  ...
endif
if($longitudinal && $LongSamseg) then
  set cmd = (rca-long-tp-init -long-samseg $longbaseid $subjid -log $LF -cf $CF -sf $SF)
  ...
endif
```

Multiple later recon-all blocks that *used* to do the copying now defer to this
script — the source is dotted with markers such as "Code that copied brainmask
now in rca-long-tp-init" ([`scripts/recon-all:2301`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2301)), "longitudinal copy of
talairach.lta now done in rca-long-tp-init" ([`scripts/recon-all:2662`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2662)),
"longitudinal copy of aseg now done in rca-long-tp-init"
([`scripts/recon-all:2715`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L2715)), and "longitudinal copying of sphere now done
in rca-long-tp-init" ([`scripts/recon-all:4180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4180)).

**Predecessor:** [[mri_add_new_tp]] (registers the cross-sectional time point to
the base) → **rca-long-tp-init** (seeds the longitudinal directory) →
**Successors:** recon-all autorecon2/autorecon3 longitudinal stages (white/pial
deformation, [[rca-surfreg]], parcellation), each of which finds its inputs
already in place.

## Gotchas and Caveats

> [!gotcha] Cross-user / cross-platform copy quirk drives the `-cp-*` flags
> The header comment explains the design: copies were originally `cp
> --preserve=timestamps`, which fails on macOS, so it was changed to `cp -p`; but
> `cp -p` can error when the copying user differs from the file owner. The script
> now does a plain `cp` and relies on `UpdateNeeded` to decide whether a copy is
> needed, restoring the old behaviour only when `-cp-fp` **and** `-cp-force` are
> set ([`scripts/rca-long-tp-init#L15-L30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L15-L30)). If a longitudinal run fails on a
> copy with a permissions error, try `-no-cp-fp`.

> [!gotcha] `?h.orig`, `?h.orig_white`, `?h.orig_pial` all come from the base
> The longitudinal white surface is *initialized* from the base's `?h.white`
> (copied to both `?h.orig` and `?h.orig_white`) and the pial from the base's
> `?h.pial` ([`scripts/rca-long-tp-init#L235-L258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L235-L258)). The time point therefore
> starts from the template's surfaces, not its own cross-sectional surfaces — this
> is intended and is what makes the longitudinal results consistent.

> [!gotcha] `-sd` has a stray `=` in the assignment
> The `-sd` case does `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/rca-long-tp-init#L324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L324)); in tcsh `setenv` does not take an `=`,
> so this sets `SUBJECTS_DIR` to the literal `=` and the directory becomes the
> next token only by accident of argument shifting. Prefer setting `SUBJECTS_DIR`
> in the environment or via recon-all rather than this flag. *(Behaviour observed
> from the source; recon-all does not use `-sd` here.)*

## Error Compensation and Guard Rails

- **Skip-if-up-to-date.** Every copy is guarded by `UpdateNeeded
  <dest> <source...>`, so re-running a partially-completed longitudinal init only
  recopies what changed. `--force-update` or `-cp-force` overrides this.
- **Hard exit on any failed step.** Each `cp`/command is followed by `if($status)
  goto error_exit`, so a single failure aborts the seeding.
- **Directory auto-creation.** The standard time-point subtree is created if
  absent ([`scripts/rca-long-tp-init#L104-L106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init#L104-L106)).
- **DWI load disabled** (`FS_LOAD_DWI 0`) to avoid spurious diffusion-load
  attempts during the copy stage.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the orchestrator; this is the first step of its longitudinal (`-long`) block.
- [[mri_add_new_tp]] — registers a cross-sectional time point to the base; runs immediately before this script.
- [[longmc]] — longitudinal motion correction, invoked by this script. *(no wiki page yet)*
- [[mri_map_cpdat]] — maps the cross-sectional control points into the time-point space.
- [[samseg2recon]] — builds the base/time-point subjects in the SAMSEG longitudinal (`-long-samseg`) variant. *(no wiki page yet)*
- [[longitudinal-pipeline]] — the conceptual overview of the three-pass longitudinal stream.

## Confidence and Gaps

**High confidence:** the complete flag set and aliases, the derivation of
`subjid=<tp>.long.<base>`, the full list of copied artefacts and their renames,
the `-long-samseg` short-circuit, the control-point mapping condition, the
`-cp-fp`/`-cp-force` semantics, the touch markers, and the exact recon-all call
sites — all read directly from
[`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init) and
[`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] `-conf2hires` longitudinal path
> The high-resolution longitudinal branch (`DoConf2Hires`) is present in the
> script but recon-all builds the `rca-long-tp-init` call **without**
> `-conf2hires` ([`scripts/recon-all:1204-1208`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1204-L1208)), so whether/when this branch
> is exercised through the pipeline is unconfirmed.

## References

- FreeSurfer source: [`scripts/rca-long-tp-init`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-long-tp-init) (v8.2.0).
- recon-all call site: [`scripts/recon-all:1195-1232`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L1195-L1232).
- Reuter M, Schmansky NJ, Rosas HD, Fischl B. *Within-subject template estimation for unbiased longitudinal image analysis.* NeuroImage 2012;61(4):1402–1418 — the longitudinal stream this script seeds.
