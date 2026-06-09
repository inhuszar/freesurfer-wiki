---
title: "conf2hires"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/conf2hires"
families: []                     # standalone recon-all helper (no mri_*/mris_* family)
recon_all_stage: autorecon3
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mris_place_surface]]"
  - "[[mri_normalize]]"
  - "[[bbregister]]"
  - "[[mris_apply_reg]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_vol2vol]]"
  - "[[tkregister2]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The disabled `-T2`/`-FLAIR` direct-intensity branches (mris_place_surface --mmvol path replaced the older mris_make_surfaces -T2/-FLAIR flags) are commented out in the source; only the --mmvol pathway is exercised in v8.2.0."
  - "Interaction of --high-myelin / --alt-border-low with the high-myelin label is documented from the call site; the numerical effect of HighMyelinFactor on border placement lives in mris_place_surface and was not traced."
tags:
  - surface
  - hires
  - native-resolution
  - recon-all
  - pial
  - white
---

# conf2hires

## Summary

`conf2hires` takes a FreeSurfer recon that was generated on the **conformed**
(1 mm isotropic) volume and re-places the final **white** and **pial** surfaces
on the **native, high-resolution** acquisition (`rawavg.mgz`). It maps the
conformed `white.preaparc` surfaces into the high-resolution voxel space,
re-runs intensity normalization and surface placement there with
[[mris_place_surface]], optionally refines the pial against a second
(T2 or FLAIR) volume, and maps the resulting coordinates back into the conformed
space so that the rest of [[wiki/pipelines/recon-all|recon-all]] can proceed
unchanged. It is the engine behind `recon-all -conf2hires` (and the older
`recon-all.v6.hires` wrapper) and is the recommended way to obtain surfaces at
sub-millimetre resolution (e.g. 0.7–0.8 mm HCP-style or 7 T data) without giving
up the robust conformed-space stream.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/conf2hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires)
- **Binary/script location:** `$FREESURFER_HOME/bin/conf2hires`
- **Original author:** Doug Greve
- **Key FreeSurfer tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L138) (`--conform-dc --conform_min`), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L153), [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L171), [`mris_apply_reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L257), [`mri_normalize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L325), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L344), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L296), [`mris_place_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L386), [`bbregister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L514), [`mri_concatenate_lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L537), `vertexvol`, and `fsr-getxopts`/`fsr-checkxopts` for expert-option handling.

## Purpose and Context

FreeSurfer's standard stream **conforms** every input to 1 mm isotropic, 256³,
`uchar` because most of the algorithms and atlases were tuned at that
resolution. For high-resolution acquisitions (e.g. 0.7–0.8 mm structural scans,
7 T data, HCP data) that conforming throws away spatial detail at the
grey/white and pial boundaries. `conf2hires` recovers that detail: it keeps the
robust conformed-space processing for everything up to and including
`white.preaparc`, then **re-solves only the final surface placement** on the
native-resolution `rawavg.mgz`.

The script is normally **not** run by hand — it is invoked automatically by
[[wiki/pipelines/recon-all|recon-all]] when the `-conf2hires` flag is given
([`scripts/recon-all:4397-4419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4397-L4419)). At that flag, recon-all disables its own
final white/pial placement (`DoPialSurfs = 0`) and turns off hi-res conforming
(`HiRes = 0`, `ConformMin = 0`, `UseCubic = 0`) so that the conformed stream
runs normally and `conf2hires` does the high-resolution refinement instead
([`scripts/recon-all:7906-7918`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7906-L7918)). The legacy
[`recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires) wrapper does the same thing for the v6 stream.

> [!gotcha] `-conf2hires` is incompatible with `-hires`, `-cm`, and `-base`
> recon-all explicitly forbids combining `-conf2hires` with `-hires`, with `-cm`
> (conform-to-min), or with `-base` (longitudinal base), and it refuses to add
> or drop `-conf2hires` mid-recon
> ([`scripts/recon-all:8268-8307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8268-L8307)). Pick the conf2hires path **once**, at the
> start of a subject's recon. The whole point is that the conformed (1 mm)
> stream runs normally and conf2hires layers the hires placement on top.

## Inputs

### Required Inputs

`conf2hires` operates **in place** on an existing subject directory; it does not
take volume arguments. The required inputs all live under
`$SUBJECTS_DIR/<subject>/`:

- **`mri/rawavg.mgz`** — the native-resolution, motion-corrected average. This
  is the high-resolution target onto which surfaces are placed. Format: [[mgz]].
- **`mri/orig.mgz`** — the conformed (1 mm) volume; defines the conformed
  coordinate space that surfaces are mapped back into.
- **`mri/brain.finalsurfs.mgz`**, **`mri/wm.mgz`**, **`mri/aseg.presurf.mgz`**,
  **`mri/filled.mgz`** — the conformed-space volumes [[mris_place_surface]]
  needs (skull-stripped/normalized brain, white-matter segmentation, presurf
  aseg, filled WM).
- **`surf/?h.white.preaparc`** — the conformed-space white surfaces produced by
  recon-all up to the `white.preaparc` stage (for longitudinal subjects,
  `?h.orig_white`; see [`scripts/conf2hires:124-125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L124-L125)). Format:
  [[surface-format]].
- **`label/?h.aparc.annot`, `label/?h.cortex.label`, `label/?h.cortex+hipamyg.label`,
  `surf/autodet.gw.stats.?h.dat`** — the cortical parcellation, cortex masks,
  and auto-detected grey/white intensity statistics used to rip the medial wall
  and steer border detection.
- **(optional) `mri/orig/T2raw.mgz` or `mri/orig/FLAIRraw.mgz`** — a second
  contrast for pial refinement, required when `--T2` / `--FLAIR` is given.

### Input Assumptions

> [!assumption] A conformed recon already exists up to `white.preaparc`
> `conf2hires` assumes recon-all has been run through the creation of
> `?h.white.preaparc` (autorecon2). It does **not** create those surfaces; it
> refines them at native resolution and then lets recon-all finish. The
> `rawavg.mgz` is assumed to be the genuine high-resolution acquisition (it is
> resampled to a same-dimension high-res grid, `rawavg.cmdc.mgz`, via
> conform-direction-cosines / conform-min — [`scripts/conf2hires:138`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L138)).

## Outputs

### Files Created

All outputs are written under `$SUBJECTS_DIR/<subject>/mri/` and `.../surf/`.
The high-resolution working space is called **`rawavg.cmdc`** (raw average, with
**c**onformed **d**irection **c**osines so it shares the TkrRAS frame of
`orig.mgz`).

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `rawavg.cmdc0.mgz`, `rawavg.cmdc.mgz` | `mri/` | high-res grid with conformed direction cosines; `cmdc0` is rescaled to uchar, `cmdc` is the non-rescaled cubic-interpolated working volume |
| `transforms/conf2rawavg.cmdc.{dat,lta}` | `mri/transforms/` | registration conformed → rawavg.cmdc (`regC2R`) |
| `transforms/rawavg.cmdc.2conf.{dat,lta}` | `mri/transforms/` | registration rawavg.cmdc → conformed (`regR2C`, inverse of above) |
| `rawavg.wm.mgz`, `rawavg.aseg.presurf.mgz`, `rawavg.filled.mgz` | `mri/` | low-res control volumes resampled (nearest) into rawavg.cmdc space |
| `rawavg.brain.fs.mgz` | `mri/` | conformed `brain.finalsurfs.mgz` mapped into rawavg.cmdc space (mask source) |
| `rawavg.norm.mgz` | `mri/` | high-res intensity-normalized volume ([[mri_normalize]]) |
| `rawavg.brain.finalsurfs.mgz` | `mri/` | masked, normalized high-res volume the surfaces are placed in |
| `rawavg.brain.finalsurfs.conf.mgz` | `mri/` | the above mapped back to conformed space for convenience |
| `surf/?h.{white.preaparc,white,pial.T1}.rawavg` | `surf/` | surfaces in rawavg.cmdc space |
| `surf/?h.{white,pial.T1}.rawavg.conf` | `surf/` | the placed surfaces mapped back to conformed space |
| `surf/?h.white`, `surf/?h.pial.T1`, `surf/?h.pial` | `surf/` | **symlinks** to the `.rawavg.conf` surfaces — these become the recon's final surfaces |
| **Multimodal (`--T2`/`--FLAIR`) extras** | | |
| `transforms/{T2,FLAIR}raw.{auto.,}lta`, `...raw.rawavg.lta` | `mri/transforms/` | BBR registration of the second contrast to conformed and to rawavg.cmdc |
| `rawavg.{T2,FLAIR}.{prenorm,norm,}.mgz`, `conf.{T2,FLAIR}.mgz` | `mri/` | the second contrast resampled, normalized, masked into rawavg space and mapped back to conf |
| `surf/?h.pial.{T2,FLAIR}.rawavg`, `...rawavg.conf` | `surf/` | pial refined against the second contrast; `?h.pial` then symlinks here |
| `scripts/conf2hires.log` | `scripts/` | full command/environment log |

### Output Specifications

The defining geometric construction is **`rawavg.cmdc`**: `rawavg.mgz` resampled
so its direction cosines match the conformed volume (`--conform-dc`) and its
voxel size is the minimum native voxel size (`--conform_min`). Because of this,
`orig.mgz` (conformed) and `rawavg.cmdc.mgz` (hires) share the same TkrRAS
(surface) coordinate frame, so the conformed surfaces can be carried between the
two spaces by registration alone, with no resampling of vertex coordinates
beyond the affine `regC2R`/`regR2C`. Final surfaces are standard FreeSurfer
[[surface-format]] files in conformed-space coordinates (via the `.conf`
symlinks), so they overlay correctly on `orig.mgz` like any normal recon.

## Mathematical Foundations

`conf2hires` is mostly an **orchestrator**: the heavy numerics (border-value
detection, intensity normalization, BBR cost) live in the binaries it calls. The
one conceptually important construction it performs itself is the shared-frame
trick:

> [!math] Conformed ↔ hires coordinate sharing
> Let $V_\text{conf}$ be the conformed volume and $V_\text{raw}$ the native
> average. `mri_convert --conform-dc --conform_min` builds
> $V_\text{cmdc}$ from $V_\text{raw}$ with the conformed direction cosines and
> the minimum native voxel size. This makes the tkreg (surface) vox→RAS of
> $V_\text{cmdc}$ a pure scaling of that of $V_\text{conf}$, so a single rigid
> header registration $R_{C\to R}$ (and its inverse $R_{R\to C}$) maps surface
> vertices between the two spaces:
> $$ \mathbf{x}_\text{raw} = R_{C\to R}\,\mathbf{x}_\text{conf}, \qquad
>    \mathbf{x}_\text{conf} = R_{R\to C}\,\mathbf{x}_\text{raw}. $$
> The registrations are computed by `tkregister2_cmdl --regheader`
> ([`scripts/conf2hires:171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L171), [`:189`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L189)) and applied to vertices with
> [`mris_apply_reg --lta`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L257).

> [!internal] Surface placement and normalization math are in the binaries
> Grey/white and pial border detection (`MRIScomputeBorderValues`, exposed via
> `--first-peak-d1/d2`), the multimodal pial cost (`--mmvol`), and the
> resolution-dependent normalization parameters all live in
> [[mris_place_surface]] and [[mri_normalize]]. The script only selects their
> options.

The script also documents a resolution caveat directly: because some
`mri_normalize` parameters are specified in **voxels** rather than millimetres,
the same flags behave differently at high resolution, which is why the pial
tends to extend slightly further out than in the conformed stream unless
`--copy-bias-from-conf` is used ([`scripts/conf2hires:1027-1036`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L1027-L1036)).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/conf2hires:706-923`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L706-L923)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | Subject ID under `$SUBJECTS_DIR`. |
| `--sd` | string | `$SUBJECTS_DIR` | Subjects directory. |
| `--T2`<br>`--t2` | bool | off | Refine the pial using the T2 volume `mri/orig/T2raw.mgz` (sets the multimodal mode to `T2`). |
| `--no-t2`<br>`--no-T2` | bool | on | Do not use a T2 for pial placement. |
| `--FLAIR`<br>`--flair` | bool | off | Refine the pial using the FLAIR volume `mri/orig/FLAIRraw.mgz`. |
| `--no-flair`<br>`--no-FLAIR` | bool | on | Do not use a FLAIR for pial placement. |
| `--bbr-con` | string | `t2` | BBR contrast type used to register the second contrast (`t1` or `t2`). |
| `--bbr-T2` | bool | (sets `t2`) | Shortcut: BBR contrast = `t2`. |
| `--bbr-T1` | bool | — | Shortcut: BBR contrast = `t1`. |
| `--mm-norm-sigma`<br>`--t2norm-sigma` | float | `8` | Smoothing σ (mm) for the second-contrast [[mri_normalize]]; strongly affects pial placement. |
| `--cubic` | bool | off | Use cubic interpolation when mapping `rawavg` to conformed space (only with `--copy-bias-from-conf`). |
| `--trilin` | bool | **on** | Use trilinear interpolation for that mapping (default). |
| `--copy-bias-from-conf` | bool | off | Compute the bias field from the conformed (1 mm) `brain.finalsurfs` and apply it at hires, instead of re-normalizing the rawavg directly — makes surfaces much closer to standard recon-all (see gotcha). |
| `--no-copy-bias-from-conf` | bool | on | Re-normalize the rawavg directly (the default). |
| `--norm-opts-rca` | bool | off | Use recon-all's `mri_normalize` options (`-seed 1234 -mprage -aseg rawavg.aseg.presurf.mgz`) for the direct high-res normalization. |
| `--norm-opts-c2h` | bool | on | Use conf2hires's own `mri_normalize` options (`-sigma 8 -erode 1 -min_dist 1`), the default. |
| `--first-peak-d1` | bool | off | Pass `--first-peak-d1` to [[mris_place_surface]] (refine border targets via the first derivative peak in `MRIScomputeBorderValues`). |
| `--no-first-peak-d1` | bool | on | Disable the above. |
| `--first-peak-d2` | bool | off | Pass `--first-peak-d2` to [[mris_place_surface]] (second-derivative first-peak refinement). |
| `--no-first-peak-d2` | bool | on | Disable the above. |
| `--high-myelin` | float | off | Enable high-myelin white placement: pass `--alt-border-low <hml> <factor>` to [[mris_place_surface]] using `label/?h.high-myelin.label`. The factor is between 0 (closer to white) and 1 (closer to cortical GM). |
| `--stopmask` | string | off | Pass `--stopmask <vol>` (a surface-constraint mask, `mri/stopmask.scm.mgz`) to white-surface placement. |
| `--longitudinal`<br>`--long` | `tpNid baseid` | off | Longitudinal mode: timepoint subject and base subject; sets subject = `tpNid.long.baseid` and uses `orig_white`/`orig_pial` as the source surfaces. |
| `--no-longitudinal`<br>`--no-long` | bool | on | Cross-sectional mode (default). |
| `--dev` | bool | off | Use `mris_make_surfaces.dev` (developer build; legacy path — checked for existence). |
| `--no-dev` | bool | on | Use the standard binary; default settable via `setenv CONF2HIRES_USEDEV`. |
| `-surfvolume` | bool | off | Generate per-vertex surface volume files via `vertexvol --th3`. |
| `-no-surfvolume` | bool | on | Skip surface-volume generation. |
| `--mps_n_averages`<br>`-mps_n_averages` | int | unset | Pass `--n_averages` to [[mris_place_surface]] (smoothing iterations). |
| `--expert`<br>`-expert` | string | unset | Expert-options file passed to the placement/registration calls via `fsr-getxopts`. Validated with `fsr-checkxopts`. |
| `-v8`<br>`--v8` | bool | `$FS_V8_XOPTS` | Apply the v8 global expert-options file `etc/global-expert-options.v8.txt`. |
| `-no-v8`<br>`--no-v8` | bool | — | Do not apply the v8 expert-options file. |
| `--force-update`<br>`-force-update` | bool | off | Re-run every step even if the output is newer than its inputs (overrides the `UpdateNeeded` skip). |
| `--log` | string | `scripts/conf2hires.log` | Explicit log file path. |
| `--nolog`<br>`--no-log` | bool | — | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temporary directory (sets `cleanup=0`). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporary files (cleanup is currently commented out at the end, [`scripts/conf2hires:677`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L677)). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |
| `--threads`<br>`--nthreads`<br>`--openmp` | int | `1` | Number of OpenMP threads (sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS`). |

### Configuration Interactions

> [!gotcha] `--copy-bias-from-conf` is what makes hires surfaces match recon-all
> By **default** conf2hires re-normalizes the high-res `rawavg` directly, which
> produces a pial that extends further out than the standard 1 mm stream — partly
> because the c2h `mri_normalize` options differ and partly because some
> `mri_normalize` parameters are defined in voxels, so they behave differently at
> sub-mm resolution. `--copy-bias-from-conf` instead reuses the **bias field
> already computed on the conformed volume**, giving final surfaces "much closer
> to that of recon-all" ([`scripts/conf2hires:316-370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L316-L370), [help](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L1027-L1036)). The author notes the
> non-default choice was kept because it "might have worked better for HCP".

> [!gotcha] `--cubic`/`--trilin` only matter with `--copy-bias-from-conf`
> The `--cubic`/`--trilin` interpolation choice governs the `rawavg → conf`
> mapping used **only** in the copy-bias path
> ([`scripts/conf2hires:288-289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L288-L289), help [`:997`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L997)). The interpolation **must** match the
> interp used when `orig.mgz` was originally created from `rawavg.mgz` (trilin in
> the standard stream), otherwise the copied bias field is misaligned.

> [!gotcha] `--norm-opts-rca` vs `--norm-opts-c2h` only affect the direct-normalize path
> The normalization-options switch selects between recon-all's `mri_normalize`
> flags and conf2hires's own flags; it is irrelevant when
> `--copy-bias-from-conf` is set, because that path computes the bias by division
> rather than running `mri_normalize` with these options.

Other interactions:

- **`--T2` and `--FLAIR` are mutually exclusive in practice** — each sets the
  single `MMode` variable, so the last one specified wins; only one second
  contrast is processed.
- When **no** `MMode` is set (no `--T2`/`--FLAIR`), `?h.pial` is symlinked
  directly to the T1 pial; with `MMode` set, `?h.pial` instead points to the
  second-contrast pial ([`scripts/conf2hires:479-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L479-L481), [`:653-655`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L653-L655)).
- `--bbr-con`/`--bbr-T1`/`--bbr-T2` only take effect when a second contrast is
  used (they control the BBR registration of that contrast).
- `--longitudinal` changes the source surfaces to `orig_white`/`orig_pial` and
  pulls the multimodal input from the cross-sectional timepoint if missing
  ([`scripts/conf2hires:495-502`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L495-L502)).

## Typical Use Cases

### 1. High-resolution recon via recon-all (recommended)

```bash
# conf2hires is invoked automatically; do NOT add -hires/-cm/-cubic.
recon-all -s sub-hires -i sub-hires_T1w.nii.gz -all -conf2hires
```

This runs the normal conformed stream, then `conf2hires` re-places the white and
pial on the native-resolution `rawavg.mgz`.

### 2. High-resolution recon with a T2 pial

```bash
recon-all -s sub-hires -i sub-hires_T1w.nii.gz -T2 sub-hires_T2w.nii.gz \
  -T2pial -all -conf2hires
```

recon-all forwards `--T2` to conf2hires, which refines the pial against the T2.

### 3. Run conf2hires by hand on an existing recon

```bash
# Subject already processed through white.preaparc with hires rawavg in place.
conf2hires --s sub-hires --threads 8 --copy-bias-from-conf
```

`--copy-bias-from-conf` keeps the final surfaces close to the standard 1 mm
result.

## Pipeline Context

`conf2hires` is an **autorecon3-stage** helper inside
[[wiki/pipelines/recon-all|recon-all]], invoked only with `-conf2hires`. It
slots in where recon-all would normally place its final white and pial surfaces;
recon-all sets `DoPialSurfs = 0` so it does not duplicate that work
([`scripts/recon-all:7906-7918`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7906-L7918)). The exact invocation is
([`scripts/recon-all:4397-4419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4397-L4419)):

```tcsh
conf2hires --threads $OMP_NUM_THREADS [--T2|--FLAIR] [--first-peak-d1] \
  [--high-myelin $HighMyelinFactor] [--stopmask $stopmaskscm] \
  (--longitudinal $tpNid $longbaseid | --s $subjid) [--cubic|--trilin] \
  [--force-update] $xopts
```

**Predecessor:** recon-all conformed stream through `?h.white.preaparc`
(autorecon2: [[mris_place_surface]] / [[mris_make_surfaces]]) → **conf2hires**
→ **Successor:** the remaining autorecon3 steps (curvature stats, parcellation,
`?h.thickness`, `aparc.stats`, etc.). The legacy
[`recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires) wrapper drives the same flow for the v6 stream.

## Gotchas and Caveats

> [!gotcha] Final surfaces are symlinks
> `?h.white`, `?h.pial.T1`, and `?h.pial` are created as **symbolic links** to
> the `.rawavg.conf` files ([`scripts/conf2hires:476-481`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L476-L481), [`:654-656`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L654-L656)). Copying a
> subject without preserving symlinks (or deleting the `.rawavg.conf` targets)
> breaks the final surfaces.

> [!gotcha] The pial extends further out by default
> Unless `--copy-bias-from-conf` is used, the high-res pial systematically sits
> a little further out than the conformed-stream pial, by design of the direct
> high-res normalization ([help](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L1027-L1036)). This is expected behaviour, not a defect.

> [!gotcha] `--SUBJECTS_DIR` via `--sd` has a tcsh quirk
> The `--sd` handler runs `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/conf2hires:730`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L730)); the stray `=` means `SUBJECTS_DIR` is set to the
> literal `=` and the directory becomes a second positional value. Prefer setting
> `$SUBJECTS_DIR` in the environment rather than relying on `--sd`.

> [!gotcha] Brain.finalsurfs edits may not map exactly
> Manual edits to the conformed `brain.finalsurfs.mgz` are carried to hires by
> nearest-neighbour resampling (`rawavg.brain.fs.mgz`); the script comment warns
> these edits "might not get mapped exactly right due to interpolation effects"
> ([`scripts/conf2hires:224-244`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L224-L244)).

> [!contradiction] Help advertises `--no-t2`/`--no-flair` defaults as 0
> The usage text prints `--t2 ... (default 0)` and `--flair ... (default 0)`,
> which is consistent with the code: both are off unless requested. When run
> inside recon-all, the second contrast is enabled only if `-T2pial`/`-FLAIRpial`
> was passed to recon-all ([`scripts/recon-all:4400-4401`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4400-L4401)).

## Error Compensation and Guard Rails

- **Idempotent / restartable.** Every step is wrapped in an `UpdateNeeded`
  check, so re-running conf2hires only redoes steps whose inputs changed; use
  `--force-update` to override. recon-all writes `scripts/conf2hires` (a touch
  file) on success so the stage is not repeated.
- **Hard prerequisite checks.** `check_params` aborts if the subject does not
  exist, and if `--T2`/`--FLAIR` is requested but `mri/orig/{T2,FLAIR}raw.mgz`
  is missing it tells the user to re-run with `--no-T2`/`--no-FLAIR`
  ([`scripts/conf2hires:940-955`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L940-L955)).
- **Manual-registration protection.** For the second contrast, if a hand-edited
  `transforms/{MMode}raw.lta` differs from the auto BBR result, conf2hires does
  **not** overwrite the manual file ([`scripts/conf2hires:508-533`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L508-L533)).
- **Shared-frame design** avoids resampling surface coordinates: vertices are
  carried by affine registration, not interpolated onto a grid, reducing
  geometric error.

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `--sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.

## Related Tools

- [[wiki/pipelines/recon-all|recon-all]] — the only normal caller; `-conf2hires` triggers this script.
- [[mris_place_surface]] — does the actual white and pial placement at high resolution.
- [[mris_make_surfaces]] — the older placement binary; reachable via `--dev`/`CONF2HIRES_USEDEV`.
- [[mri_normalize]] — high-resolution intensity normalization / bias-field estimation.
- [[bbregister]] — registers the optional T2/FLAIR contrast to the anatomical.
- [[mris_apply_reg]] — carries surface vertices between conformed and rawavg.cmdc spaces.
- [[mri_vol2vol]], [[wiki/tools/mri_convert|mri_convert]], [[tkregister2]] — build the rawavg.cmdc working space and the conf↔raw registrations.
- `recon-all.v6.hires` *(no wiki page yet)* — legacy v6 wrapper that runs the same conf2hires flow.

## Confidence and Gaps

**High confidence:** complete flag set and aliases, the rawavg.cmdc shared-frame
construction, the default direct-normalize vs `--copy-bias-from-conf` behaviour,
the symlink-based final surfaces, the recon-all invocation and its
`-hires`/`-cm`/`-base` mutual exclusions, and the T2/FLAIR pial pathway — all
read from [`scripts/conf2hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires) and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] Disabled direct-intensity T2/FLAIR branches
> The older `mris_make_surfaces -T2/-FLAIR ... -nsigma_above/-nsigma_below`
> calls are commented out ([`scripts/conf2hires:621-622`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L621-L622)); only the
> `mris_place_surface --mmvol` pathway is live in v8.2.0. The exact intensity
> model now lives in [[mris_place_surface]].

> [!gap] Numerical effect of `--high-myelin`
> The factor passed via `--alt-border-low` changes white-surface border
> placement in high-myelin cortex, but the precise effect is implemented in
> [[mris_place_surface]] and was not traced here.

## References

- FreeSurfer source: [`scripts/conf2hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires) (v8.2.0).
- recon-all integration: [`scripts/recon-all:4397-4419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L4397-L4419) and [`:7906-7918`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L7906-L7918).
- Legacy wrapper: [`scripts/recon-all.v6.hires`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires).
- Built-in help: `conf2hires --help` ([`scripts/conf2hires:1017-1041`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/conf2hires#L1017-L1041)).
