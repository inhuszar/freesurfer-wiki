---
title: "topofit"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/topofit"
families:
  - "scripts"
recon_all_stage: "autorecon2"
related:
  - "[[dsurffe]]"
  - "[[mris_place_surface]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[josareg]]"
  - "[[mris_sphere]]"
  - "[[mris_apply_reg]]"
  - "[[mris_inflate]]"
  - "[[wiki/tools/freeview|freeview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The fit-cortex network internals (architecture, loss, the meaning of --io si/ds) live in the separately-versioned deepsurfer Python package, not in this script; described from dsurffe/deepsurfer at the call-site level only."
  - "The --ico7 downsampling path is present but the usage text says it 'does not work yet'; recon-all nonetheless invokes topofit with --ico7. Behaviour of the ico7 branch not verified on a live run."
  - "TF2 (topofit2) paths point at hard-coded developer directories (/autofs/vast/..., /space/iddhi/...) and are off by default; documented structurally only."
tags:
  - surface
  - deep-learning
  - topofit
  - cortex
  - white
  - pial
  - recon-all
---

# topofit

## Summary

`topofit` is the FreeSurfer driver script for **TopoFit**, a deep-learning method that places topologically-correct **white and pial cortical surfaces** directly from a brain volume in a single fast forward pass, replacing the classic tessellate → fix-topology → place-surface stream. The script calls [[dsurffe]] `fit-cortex` (the deepsurfer frontend) to produce an interior surface (→ white) and an exterior surface (→ pial) per hemisphere, links them into the subject's `surf/` directory under the standard FreeSurfer names, and can optionally generate the registration sphere (`--sphere`), the post-processing morphometry needed for downstream registration (`--post`: inflated, curv, sulc, thickness, area, volume), and a JOSA surface registration (`--josa`). It is wired into [[wiki/pipelines/recon-all|recon-all]] via the `-topofit` option, where it stands in for the entire conventional surface-generation block.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/topofit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit)
- **Binary/script location:** `$FREESURFER_HOME/bin/topofit`
- **Tools invoked:** [`dsurffe fit-cortex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L121) (the TopoFit network, via the deepsurfer package), [`mris_apply_reg --bci-xyz`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L175) (ico7 resampling), [`mris_sphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L221) (`--sphere`), [`mris_inflate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L268), [`mris_place_surface`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L278) (curv/thickness/area maps), [`mris_curvature`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L289), [`mris_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L331) (volume map; header fixup in TF2), [`josareg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L356) (`--josa`), and `mri_info`, `fs_time`, `UpdateNeeded`, `getfullpath`, `fspython`/`pip`.

## Purpose and Context

The classical FreeSurfer white/pial reconstruction is accurate but slow and elaborate: it fills the white-matter volume, tessellates it, fixes the mesh topology, then iteratively deforms the surface to intensity boundaries. **TopoFit** instead learns to deform a template mesh of fixed (spherical) topology onto the cortex, yielding white and pial surfaces that are **already topologically correct** and **already in vertex correspondence with a template**, in a fraction of the time. The `topofit` script is the operational wrapper around that model: it runs the network through [[dsurffe]], adopts the network's two output meshes as `?h.white` and `?h.pial`, and then — because TopoFit only produces the two surfaces — manufactures the rest of the conventional surf-directory entries either as **symlinks** (so tools expecting `orig`, `smoothwm`, `white.preaparc`, etc. still find a file) or, with `--post`, as genuine derived overlays.

It is run **standalone** for fast surface placement, or **inside [[wiki/pipelines/recon-all|recon-all]]** when the recon is launched with `-topofit 1` (surfaces) or `-topofit 2` (surfaces + sphere). In the recon-all context it disables fill, tessellate, smooth1, inflate1, qsphere, fix-topology, white-preaparc, white-surfs, smooth2, and pial-surfs — i.e. TopoFit **owns** the surface-generation stage. The headline TopoFit network is the same `fit-cortex` subcommand documented on the [[dsurffe]] page.

> [!gotcha] Surfaces are placed on a brain volume, not derived from wm.mgz
> Unlike the classic stream, topofit does not need `wm.mgz`/`filled.mgz`; it consumes a single brain volume (default `brain.finalsurfs.manedit.mgz`) and the network does the rest. recon-all keeps segmentation on only because later stages still need `wm.mgz`.

## Inputs

### Required Inputs

- **A brain volume** — `--i <invol>`, or implied by `--s <subject>` as `$SUBJECTS_DIR/<subject>/mri/<involname>.mgz` (default `involname = brain.finalsurfs.manedit`). Must exist; canonicalised with `getfullpath` ([`scripts/topofit:574-583`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L574-L583)).
- **An output directory** — `--o <outdir>`, or implied by `--s` as `$SUBJECTS_DIR/<subject>/surf`. Created if absent.
- The **deepsurfer** package must be installed in `fspython` (its location is discovered with `fspython -m pip show deepsurfer`, [`scripts/topofit:655`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L655)) and `FS_ALLOW_DEEP` must permit ML routines when run via recon-all.

### Input Assumptions

> [!assumption] A conformed, brain-extracted T1 (the recon-all "finalsurfs" volume)
> TopoFit expects the kind of volume recon-all feeds it: a 1 mm, conformed, intensity-normalized, skull-stripped brain (`brain.finalsurfs[.manedit].mgz`). The network was trained on such data; feeding raw or non-conformed volumes is outside its training distribution. The script does not conform the input itself — it passes `--i` straight to the network. GPU is **off by default** (`--cpu` is added unless `--gpu`).

## Outputs

### Files Created

Working outputs go under `<outdir>/work/`; the canonical surface names are created in `<outdir>/` as **symlinks**.

| File | Format | Contents |
|------|--------|----------|
| `work/cortex-int-<hemi>.srf` | [[surface-format\|surface]] | Network **interior** surface (becomes white). `.surf` extension in TF2 mode. |
| `work/cortex-ext-<hemi>.srf` | surface | Network **exterior** surface (becomes pial). |
| `<hemi>.white` → `work/cortex-int-<hemi>.srf` | symlink | White surface ([`scripts/topofit:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L192)). |
| `<hemi>.pial` → `work/cortex-ext-<hemi>.srf` | symlink | Pial surface ([`scripts/topofit:193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L193)). |
| `<hemi>.{orig.nofix,smoothwm.nofix,orig,smoothwm,white.preaparc,orig.premesh}` → `lh.white` | symlinks | Placeholders so classic-stream tools find a file (only with `--links`, default on; [`scripts/topofit:234-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L234-L235)). |
| `<hemi>.{pial.T1,pial}` → `lh.pial` | symlinks | Pial placeholders ([`scripts/topofit:236-237`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L236-L237)). |
| `<hemi>.sphere` | surface | Registration sphere (only with `--sphere`/`--post`/`--josa`). |
| `<hemi>.{inflated,inflated.H,curv,sulc,thickness,area,area.pial,volume}` | surface/overlay | Morphometry (only with `--post`). |
| `<hemi>.{white,pial}.ico7` | surface | fsaverage-ico7 downsampled white/pial (only with `--ico7`). |
| `log/topofit.*.log`, `log/invol.txt`, `log/ico7.txt` | text | Run log, recorded input, ico7-mode marker. |

### Output Specifications

The output surfaces are standard FreeSurfer triangle meshes carrying the input volume's geometry. The **native** TopoFit meshes are dense (≈246k vertices for white / ≈200k for pial per the script comment, [`scripts/topofit:163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L163)); with `--ico7` they are resampled to fsaverage ico7 topology (≈160k) through the TopoFit sphere via [[mris_apply_reg]] `--bci-xyz`. In TF2 mode the script additionally rewrites the surface header (`mris_convert --userealras --vol-geom`, then `--usesurfras`) because the TF2 backend does not fill it correctly ([`scripts/topofit:143-157`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L143-L157)).

## Mathematical Foundations

> [!internal] The surface-placement model lives in deepsurfer, not this script
> TopoFit is a learned mesh-deformation network: starting from a template mesh of fixed spherical topology, it predicts per-vertex displacements that warp the template onto the subject's white and pial boundaries, preserving topology and template vertex correspondence by construction. The architecture, training loss, and the `--io si`/`--io ds` I/O conventions are implemented in the **deepsurfer** Python package and dispatched by [[dsurffe]] `fit-cortex`. This script supplies no surface math of its own; the post-processing it *does* perform (inflation, curvature, thickness, area) is delegated to [[mris_inflate]], [[mris_curvature]], and [[mris_place_surface]]. See the original TopoFit paper (Hoopes et al., MIDL 2022) for the method.

The only computation in the script proper is bookkeeping (timing, `UpdateNeeded` timestamp comparisons) and the ico7 resampling, which is itself delegated to [[mris_apply_reg]].

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/topofit:407-558`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L407-L558)).

#### Inputs / outputs / subject

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | (from `--s`) | Input brain volume. |
| `--o` | string | (from `--s`) | Output directory. |
| `--s` | string | — | Subject ID; sets `--i` to `mri/<involname>.mgz` and `--o` to `surf/`. |
| `--sd` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR`. |
| `--involname` | string | `brain.finalsurfs.manedit` | Volume basename used as input when `--s` is given. |
| `--hemi` | `lh`/`rh` | both | Restrict to one hemisphere. |
| `--lh` / `--rh` | bool | both | Restrict to left / right hemisphere. |

#### Surface products

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sphere` / `--no-sphere` | bool | off | Build `?h.sphere` from the TopoFit (or fsaverage, with ico7) sphere via [[mris_sphere]] `-o <white>`, minimizing metric distortion. |
| `--post` / `--no-post` | bool | off | Produce post-processing needed for registration: inflated, curv, sulc, inflated.H, thickness, area, area.pial, volume. **Implies `--sphere`.** |
| `--josa` / `--no-josa` | bool | off | Run [[josareg]] surface registration. **Implies `--post` (and `--sphere`).** |
| `--ico7` / `--no-ico7` | bool | off | Resample white/pial to fsaverage ico7 topology (usage text: "does not work yet" — see gotcha). |
| `--links` / `--no-links` | bool | links **on** | Create the placeholder symlinks (`orig`, `smoothwm`, `white.preaparc`, …) pointing at `lh.white`/`lh.pial`. |

#### Compute / model

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--threads` | int | `1` | Threads for the network and the post-processing tools. |
| `--gpu` / `--no-gpu` | bool | **off** (CPU) | Use the GPU for the network (`--cpu` is added when off). Does not apply to sphere creation. |
| `--model` | string | (package default) | Override the TopoFit model passed to `dsurffe --model`. |
| `--tf2` / `--tf1`<br>`--no-tf2` | bool | TF1 | Use the experimental topofit2 backend (hard-coded developer paths; see gaps) instead of `dsurffe`. |

#### Housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--no-force` | bool | — | Disable force-update (re-run only when outputs are stale; this is already the default behaviour). |
| `--log` | string | auto | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp dir; sets `cleanup=0`. |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporaries. |
| `--debug` | bool | off | `set echo`/`verbose`. |
| `--help`, `--version` | flag | — | Help / version. |

### Configuration Interactions

> [!gotcha] --post and --josa cascade onto --sphere
> The flags form an implication chain ([`scripts/topofit:470-486`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L470-L486)): `--josa` ⇒ `--post` ⇒ `--sphere`. So `--josa` alone triggers sphere creation, full morphometry, **and** registration. Conversely `--no-post` also turns off `--josa`. If you only want the two surfaces, pass none of these.

> [!gotcha] --force-update is advertised but not implemented as a flag
> The usage block and recon-all both reference `--force`/force behaviour, but the **only** force-related case in the parser is `--no-force` ([`scripts/topofit:515-517`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L515-L517)); there is no `--force` case (it would fall through to the "unrecognized flag" error). `ForceUpdate` therefore stays at its default of 0 unless set elsewhere. The script relies on `UpdateNeeded` timestamp checks to decide what to recompute.

> [!gotcha] ico7 mode is sticky and must match prior runs
> The first run records whether `--ico7` was used in `log/ico7.txt`. A later run that disagrees (ico7 on a non-ico7 case, or vice versa) is a hard error ([`scripts/topofit:586-598`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L586-L598)). Pick one mode per output directory.

> [!gotcha] --links refuses to clobber real recon-all files
> If `--links` is on and `?h.white`/`?h.pial`/`?h.sphere` already exist as **real files** (not symlinks) — the signature of a prior classic recon-all run — the script aborts and tells you to delete them or use force ([`scripts/topofit:629-652`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L629-L652)).

## Typical Use Cases

### Fast white+pial placement for a subject

```bash
# Uses mri/brain.finalsurfs.manedit.mgz, writes surf/?h.white and surf/?h.pial.
topofit --s bert --threads 8
```

### Surfaces plus everything needed for surface registration

```bash
# Adds sphere, inflated, curv, sulc, thickness, area, volume.
topofit --s bert --post --threads 8
```

### One hemisphere from an explicit volume

```bash
topofit --i /data/brain.finalsurfs.mgz --o /data/tfsurf --lh --threads 8
```

### Inside recon-all

```bash
# -topofit 1: surfaces only; -topofit 2: surfaces + sphere.
recon-all -s bert -all -topofit 1
```

## Pipeline Context

`topofit` participates in [[wiki/pipelines/recon-all|recon-all]] when the recon is started with the `-topofit` option (config key `TopoFitLevel`, set in `recon-config.yaml`). recon-all invokes it as
`topofit --s $subjid --threads $OMP_NUM_THREADS --ico7` (adding `--$hemi` for single-hemi, `--sphere` when `TopoFitLevel == 2`, `--gpu` with `-use-gpu`) at [`scripts/recon-all:3529-3543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3529-L3543). When `TopoFitLevel >= 1`, recon-all **disables the entire classic surface stream** — fill, tessellate, smooth1, inflate1, qsphere, fix-topology, white-preaparc, white-surfs, smooth2, pial-surfs — and sets `IntensityBFS=110`; `TopoFitLevel >= 2` additionally disables the separate sphere stage ([`scripts/recon-all:8305-8323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8305-L8323)). It runs in the **autorecon2** surface phase, after segmentation/normalization and before parcellation and the morphometry/QA stages. It cannot be combined with `-conf2hires` ([`scripts/recon-all:8306-8309`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8306-L8309)).

**Predecessor:** segmentation/normalization producing `brain.finalsurfs[.manedit].mgz` → **topofit** (white + pial, optionally sphere/morphometry) → **Successors:** surface registration ([[josareg]] or [[mris_register]]), [[mris_place_surface]]-derived morphometry, cortical parcellation, and [[wiki/pipelines/recon-all|recon-all]]'s `cortribbon`/`wmparc`/`parcstats` stages.

## Gotchas and Caveats

> [!contradiction] recon-all passes --ico7, but topofit says it "does not work yet"
> recon-all hard-codes `--ico7` in its topofit invocation ([`scripts/recon-all:3531`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3531)), yet topofit's own usage lists `--ico7` as "downsample from native topofit mesh to ico7 (does not work yet)" ([`scripts/topofit:690`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L690)). The ico7 branch depends on developer template spheres under `/space/iddhi/.../topofit` ([`scripts/topofit:166-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L166-L168)); whether it produces correct results in a standard install is unverified. Treat ico7 output with caution and flag as a developer-facing path.

> [!gotcha] Placeholder symlinks mean many "surfaces" are identical files
> With `--links`, `orig`, `smoothwm`, `white.preaparc`, `orig.premesh`, `orig.nofix`, `smoothwm.nofix` all point at `lh.white`, and `pial.T1`/`pial` point at `lh.pial`. They exist only so downstream tools find a file by the expected name; they are **not** independently computed surfaces.

> [!gotcha] Hard-coded developer paths in the TF2 branch
> The `--tf2` backend and the ico7 spheres reference absolute paths on Martinos-Center filesystems (`/autofs/vast/freesurfer/...`, `/space/iddhi/...`). These will not exist on a typical install; `--tf2` is off by default and effectively developer-only.

> [!gotcha] "No changes made" deletes the log
> If nothing needed updating, the script prints "no changes made" and removes the log file (unless `--log` was passed) to avoid accumulating empty logs ([`scripts/topofit:390-394`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L390-L394)).

## Error Compensation and Guard Rails

- **Skip-if-up-to-date:** every stage is guarded by `UpdateNeeded` (output vs input timestamps); re-runs only recompute stale products.
- **Mode consistency:** the ico7 marker file prevents mixing ico7 and non-ico7 runs in one output directory.
- **Real-file protection:** `--links` aborts rather than overwrite genuine recon-all surface files.
- **TF2 header repair:** because the topofit2 backend leaves the surface header incomplete, the script re-stamps the volume geometry with [[mris_convert]] before use.
- **Dependency check:** errors clearly if the deepsurfer package / its template sphere cannot be located when a sphere is requested ([`scripts/topofit:654-663`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit#L654-L663)).

## Related Tools

- [[dsurffe]] — the deepsurfer frontend; `dsurffe fit-cortex` **is** the TopoFit network this script drives.
- [[mris_place_surface]] — the classic surface-placement engine TopoFit replaces; still used here to compute curv/thickness/area maps.
- [[josareg]] — learned surface registration run by `--josa`.
- [[mris_sphere]] — builds the registration sphere (`--sphere`).
- [[mris_apply_reg]] — resamples white/pial to ico7 (`--ico7`, `--bci-xyz`).
- [[mris_inflate]] / [[mris_curvature]] — morphometry under `--post`.
- [[wiki/pipelines/recon-all|recon-all]] — orchestrates topofit via `-topofit`; topofit replaces its classic surface stream.
- [[wiki/tools/freeview|freeview]] — the script prints a ready-to-run freeview command to inspect the white (yellow) and pial (red) results.

## Confidence and Gaps

**High confidence** on the script's flags, the int→white / ext→pial mapping, the symlink scaffolding, the `--post`/`--josa`/`--sphere` cascade, the ico7 stickiness, and the recon-all integration (option, invocation, and the stages it disables) — all read directly from [`scripts/topofit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit) and [`scripts/recon-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all).

> [!gap] Network internals
> The TopoFit architecture/loss and the `--io si/ds` conventions live in the separately-versioned deepsurfer package (see [[dsurffe]]); only the call-site usage is documented here.

> [!gap] ico7 and TF2 paths
> The `--ico7` and `--tf2` branches depend on developer-only template files and are labelled experimental/non-working in the source; their real-world behaviour was not verified.

## References

- FreeSurfer source: [`scripts/topofit`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/topofit) (v8.2.0). recon-all integration: [`scripts/recon-all:3529-3543`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L3529-L3543), [`scripts/recon-all:8305-8323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all#L8305-L8323).
- TopoFit method: A. Hoopes, J. E. Iglesias, B. Fischl, D. Greve, A. V. Dalca, "TopoFit: Rapid Reconstruction of Topologically-Correct Cortical Surfaces," *MIDL* 2022.
- Module note (developer): the URL printed in the help block, `https://surfer.nmr.mgh.harvard.edu/fstest/dstmp/development/modules/topofit.html`.
