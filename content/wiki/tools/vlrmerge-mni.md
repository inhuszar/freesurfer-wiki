---
title: "vlrmerge-mni"
type: tool
fs_version: "8.2.0"
source_language: "shell"          # tcsh
source_files:
  - "scripts/vlrmerge-mni"
families: []                       # standalone FSFAST/PETsurfer figure-making script
recon_all_stage: null
related:
  - "[[mri_surf2vol]]"
  - "[[mri_vol2vol]]"
  - "[[mris_apply_reg]]"
  - "[[mri_mask]]"
  - "[[fscalc]]"
  - "[[lta_convert]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[coordinate-systems]]"
  - "[[mris_preproc]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Both --mni152 and --no-mni152 set DoMNI152=1 (the --no-mni152 branch is broken), so the documented --no-mni152 custom-target workflow cannot actually be reached; flagged as a bug-like gotcha."
  - "On the custom-target (--no-mni152) path the per-hemi white surface is set to $hemi.sphere.reg rather than $hemi.white — almost certainly a copy/paste bug; flagged."
tags:
  - registration
  - mni152
  - surface
  - volume
  - fsfast
  - petsurfer
  - visualization
---

# vlrmerge-mni

## Summary

`vlrmerge-mni` ("volume + left/right merge, MNI") assembles a **single
MNI152-space volume** from the three pieces of a typical group GM analysis:
a left-hemisphere surface overlay, a right-hemisphere surface overlay, and a
subcortical grey-matter (SCGM) volume map. It is a presentation/figure-making
tool for studies — common in FSFAST or PETsurfer — where the left cortex, right
cortex, and subcortex were analysed separately. It resamples the SCGM volume
into the target space, paints each hemisphere's surface overlay into the cortical
ribbon with [[mri_surf2vol]], and merges everything into one volume that can be
overlaid on the MNI152 T1 in [[wiki/tools/freeview|freeview]]. Optionally it
applies a Bonferroni correction across the three spaces for significance maps.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/vlrmerge-mni`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni)
- **Binary/script location:** `$FREESURFER_HOME/bin/vlrmerge-mni`
- **Companion tool:** `scgm-mask` (generates the default SCGM mask; references this script)
- **FreeSurfer tools invoked:** [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L97) (resample SCGM, cubic), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L104) (apply SCGM mask), [`mris_apply_reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L129) (resample surface overlay between spheres), [`mri_surf2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L158-L159) (paint surface into ribbon + merge), [`fscalc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L172) (Bonferroni correction), `UpdateNeeded`, and `freeview` (the suggested viewer command).

## Purpose and Context

In a surface-based group study you usually analyse cortical signal on a surface
template (`fsaverage`) per hemisphere, and subcortical signal in a volume
template (an MNI152 space). To make a single figure or a single result volume,
those three result maps must be combined into one image in a common space.
`vlrmerge-mni` does exactly that, defaulting the common space to FreeSurfer's
**`fsmni152`** subject — a FreeSurfer surface reconstruction of the MNI152
template that ties the surface (`sphere.reg`, `white`, `ribbon`) and the volume
(`rawavg`) representations together.

It is run **by hand** at the very end of an analysis, for visualisation and
result export. It is not part of any recon-all/trac-all pipeline. The companion
`vlrmerge` in FSFAST does the analogous job in a subject's native space; this
variant targets MNI152.

> [!gotcha] `fsmni152` must be installed
> In the default (MNI152) mode the script requires `$FREESURFER/subjects/fsmni152`
> and aborts with download/install instructions if it is missing
> ([`scripts/vlrmerge-mni:358-375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L358-L375)). It is a separately distributed package
> (`fsmni152.tar.gz`), not part of the base FreeSurfer install.

## Inputs

### Required Inputs

- **`--scgm <vol>`** — the subcortical grey-matter overlay volume (a group map).
  May be in **any** MNI152 variant (SPM, FSL, AFNI; 1.0/1.5/2.0 mm) as long as
  its stored geometry aligns it with `fsmni152`.
- **`--lh <overlay>`** and/or **`--rh <overlay>`** — per-hemisphere surface
  overlays (group maps) on the `--surf-s` surface subject (default `fsaverage`).
  At least one hemisphere is required. Provide both for a full brain.
- **`--o <outvol>`** — the merged output volume (typically `.nii.gz`).

### Input Assumptions

> [!assumption] Surfaces on fsaverage, volume in MNI152, all grey-matter maps
> The default workflow assumes cortical overlays were computed on `fsaverage`
> and the subcortical map in an MNI152 space; the script resamples the overlays
> onto the `fsmni152` sphere and paints them into the `fsmni152` ribbon, and
> resamples the SCGM volume to the `fsmni152` `rawavg` geometry. The whole tool
> is explicitly **only for grey-matter voxels** — the surface overlays take
> priority wherever cortex and subcortex overlap. If the overlays are already on
> `fsmni152`, pass `--surf-s fsmni152` to skip the surface resampling.

- The SCGM volume's header geometry must place it in registration with
  `fsmni152` (a plain `--regheader` vol2vol is used).
- A default subcortical mask
  (`mni_icbm152_nlin_asym_09c/synthseg.t1.subcortgm.mask.nii.gz`) is applied
  unless `--no-mask` is given or a custom `--scgm-mask` is supplied.

## Outputs

### Files Created

| File | Format | Contents |
|------|--------|----------|
| `<outvol>` (e.g. `merged.nii.gz`) | NIfTI (or whatever `--o` extension) | The merged SCGM + LH + RH map in `fsmni152` space. |
| `<outvol>.vlrmerge-mni.log` | text | Default log (unless `--log`/`--no-log`). |
| `tmpdir/scgmvol.nii.gz` | NIfTI | SCGM volume resampled (cubic) into target geometry. |
| `tmpdir/ov.<target>.<hemi>.nii.gz` | NIfTI | Surface overlay resampled onto the target sphere. |
| `tmpdir/merge.vol.nii.gz` | NIfTI | Intermediate after the first hemisphere is painted. |

Temporary files are placed in `/scratch/tmpdir.vlrmerge-mni.$$` (or beside the
output if `/scratch` is unwritable) and deleted unless `--nocleanup`/`--d`/`--tmp`
is given.

### Output Specifications

The output volume inherits the geometry of the merge volume, which is the
resampled SCGM volume in the target (`fsmni152` `rawavg`) space. Values are the
input statistic (e.g. a contrast or $-\log_{10}p$); with `--correct` they are
Bonferroni-adjusted (see below). The script prints a ready-to-run
[[wiki/tools/freeview|freeview]] command that loads the MNI152 T1 with the merged
volume as a heat overlay
([`scripts/vlrmerge-mni:178-183`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L178-L183)).

## Mathematical Foundations

`vlrmerge-mni` is a resample-and-composite tool; the heavy lifting (trilinear/
cubic interpolation, barycentric surface→volume painting, ribbon fill) is done by
the helper binaries. The only explicit arithmetic is the optional multiple-
comparisons correction.

> [!math] Bonferroni correction across three spaces (`--correct`)
> With `--correct`, the merged significance volume is passed through
> [`fscalc $outvol bcor 3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L172). For $-\log_{10}p$ maps the `bcor`
> operation applies a Bonferroni factor of $N=3$ (left hemi, right hemi,
> subcortex), i.e. it converts each voxel's $p$ to $\min(1, 3p)$ in the
> $-\log_{10}$ domain. It **assumes** that within-space correction has already
> been applied to each input.

> [!math] Surface → ribbon painting with priority to cortex
> Each hemisphere overlay is painted into the cortical ribbon with
> `mri_surf2vol --so <white> <overlay> --ribbon <ribbon> --merge <invol>`
> ([`scripts/vlrmerge-mni:158-159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L158-L159)). Using the SCGM volume as the initial
> `--merge` target means that wherever cortex and subcortex overlap, the
> **surface value overwrites** the volume value
> ([source comment](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L137-L140)). The two hemispheres are
> chained: LH paints onto the SCGM volume → `merge.vol`, then RH paints onto
> `merge.vol` → the final output.

> [!internal] Interpolation and registration live in the helpers
> Cubic resampling is in [[mri_vol2vol]]; spherical overlay resampling is in
> [[mris_apply_reg]]; the ribbon-aware surface→volume projection is in
> [[mri_surf2vol]]. This script only wires them together.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/vlrmerge-mni:217-350`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L217-L350)). Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o` | string | *(required)* | Output merged volume path. |
| `--scgm` | string | *(required)* | Subcortical grey-matter overlay volume (any aligned MNI152 variant). |
| `--lh` | string | — | Left-hemisphere surface overlay; appends `lh` to the hemisphere list. At least one of `--lh`/`--rh` required. |
| `--rh` | string | — | Right-hemisphere surface overlay; appends `rh` to the hemisphere list. |
| `--surf-s`<br>`--surf-subject` | string | `fsaverage` | Surface subject the overlays live on. Use `fsmni152` if overlays are already on the MNI152 surface (skips the `mris_apply_reg` resampling). |
| `--mni152` | bool | **on** | Target the `fsmni152` space (sets target subject, surface→volume LTA, template, and default SCGM mask). The default. |
| `--no-mni152` | bool | (see gotcha) | Intended to disable MNI152 mode and use a custom `--s` target — but **also sets `DoMNI152=1`** (broken; see gotcha). |
| `--s` | string | — | Custom target subject (intended for use with a working `--no-mni152`). Mutually exclusive with `--mni152`. |
| `--scgm-mask` | string | `…/synthseg.t1.subcortgm.mask.nii.gz` | SCGM mask volume applied to the resampled SCGM (e.g. from the `scgm-mask` script). |
| `--mask` | bool | **on** | Apply a SCGM mask (the default). |
| `--no-mask` | bool | — | Do not apply any SCGM mask (e.g. if the input is already masked). |
| `--v-reg` | string | — | Registration to bring the SCGM volume into the output space (used on the custom-target path). |
| `--s-reg` | string | — | Registration (LTA) to bring the surface into the output space (used on the custom-target path). |
| `--correct` | bool | off | Bonferroni-correct the merged volume across the 3 spaces via `fscalc … bcor 3` (assumes per-space correction already done). |
| `--force` | bool | off | Force recomputation of each step even if `UpdateNeeded` says the output is current. |
| `--no-force` | bool | **on** | Skip steps whose output is up to date (the default). |
| `--d` | string | — | Output **directory** (mainly for debugging): sets `outvol=<dir>/vlrmerge.nii.gz` and keeps the tmpdir. |
| `--tmp`<br>`--tmpdir` | string | auto | Use this temp directory and do not clean it up. |
| `--sd` | string | `$SUBJECTS_DIR` | Override `$SUBJECTS_DIR`. |
| `--log` | string | `<outvol>.vlrmerge-mni.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | — | Disable logging (log to `/dev/null`). |
| `--nocleanup` | bool | off (cleanup on) | Keep the temp directory. |
| `--cleanup` | bool | **on** | Delete the temp directory (the default). |
| `--debug` | bool | off | `set echo`/verbose tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--mni152` and `--s` are declared mutually exclusive
> Specifying both a custom target subject (`--s`) and MNI152 mode is a hard error
> ("cannot spec --s and --mni152", [`scripts/vlrmerge-mni:396-399`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L396-L399)).
> Because MNI152 mode is on by default, you would in principle pass `--no-mni152
> --s <subj>` to use a custom target — but see the next gotcha.

> [!gotcha] `--no-mni152` does not actually disable MNI152 mode (bug)
> Both the `--mni152` and the `--no-mni152` cases set `DoMNI152 = 1`
> ([`scripts/vlrmerge-mni:280-286`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L280-L286)). As written, MNI152 mode can never be
> turned off, so the custom-target (`--s`/`--v-reg`/`--s-reg`) workflow described
> in the help is unreachable in v8.2.0. Treat this script as MNI152-only.

> [!gotcha] `--surf-s fsmni152` skips overlay resampling
> When the surface subject equals the target (`fsmni152`/`fsaverage`), the
> spheres match and `mris_apply_reg` would be a no-op; if your overlays are
> already on the MNI152 surface, pass `--surf-s fsmni152` so they are used
> directly. With the default `fsaverage`, overlays are first resampled onto the
> `fsmni152` sphere.

> [!gotcha] `--scgm-mask` vs `--no-mask`
> A mask is applied by default. Provide `--scgm-mask` to substitute a custom
> subcortical mask, or `--no-mask` to skip masking entirely (use when the SCGM
> input is pre-masked). `--no-mask` overrides the default mask.

Other interactions:

- `--d <dir>` and `--tmp <dir>` both imply `--nocleanup`.
- `--force` re-runs every stage; otherwise each `mri_vol2vol`/`mris_apply_reg`/
  `mri_surf2vol` step is skipped when `UpdateNeeded` reports its output current.
- `--correct` should only be used on $-\log_{10}p$ inputs that were already
  corrected within each space.

## Typical Use Cases

### 1. Merge LH + RH + SCGM group maps into MNI152

```bash
# fsaverage surface overlays + an MNI152 subcortical map -> one volume
vlrmerge-mni --o merged.nii.gz \
  --scgm mean.mni152-1.0mm.nii.gz \
  --lh mean.fsaverage.lh.nii.gz \
  --rh mean.fsaverage.rh.nii.gz
```

Resamples and composites the three maps, then prints a `freeview` command to
overlay `merged.nii.gz` on the MNI152 T1.

### 2. Merge significance maps with Bonferroni correction

```bash
# Inputs are -log10(p) maps already corrected within each space:
vlrmerge-mni --o sig.merged.nii.gz \
  --scgm sig.scgm.mni152.nii.gz \
  --lh sig.lh.nii.gz --rh sig.rh.nii.gz \
  --correct
```

### 3. Overlays already on the MNI152 surface

```bash
vlrmerge-mni --o merged.nii.gz \
  --scgm scgm.mni152.nii.gz \
  --lh lh.fsmni152.nii.gz --rh rh.fsmni152.nii.gz \
  --surf-s fsmni152
```

## Pipeline Context

`vlrmerge-mni` is a terminal **visualisation / result-export** step, not part of
[[wiki/pipelines/recon-all|recon-all]].

**Predecessors:** a surface group analysis on `fsaverage` (per hemisphere, e.g.
via [[mris_preproc]] + [[wiki/tools/mri_glmfit|mri_glmfit]]) and a volumetric
subcortical group analysis in MNI152 → **vlrmerge-mni** → **Successor:**
[[wiki/tools/freeview|freeview]] for figure-making. It is the MNI152 counterpart
of the FSFAST `vlrmerge` script.

Internally it chains [[mri_vol2vol]] (SCGM resample), [[mri_mask]] (SCGM mask),
[[mris_apply_reg]] (overlay resample), [[mri_surf2vol]] (ribbon paint + merge),
and [[fscalc]] (correction).

**Predecessor:** [[mris_preproc]]/[[wiki/tools/mri_glmfit|mri_glmfit]] (surface)
+ MNI152 volume analysis → **vlrmerge-mni** → **Successor:**
[[wiki/tools/freeview|freeview]]

## Gotchas and Caveats

> [!gotcha] Custom-target white surface is mis-set to `sphere.reg` (likely bug)
> On the `--no-mni152` custom-target branch the per-hemisphere "white" surface
> used for the ribbon painting is set to `$hemi.sphere.reg` instead of
> `$hemi.white` ([`scripts/vlrmerge-mni:155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L155)), whereas the `fsmni152`
> branch correctly uses `$hemi.white`. This path is in any case unreachable
> because `--no-mni152` is broken (above), but the line is clearly a copy/paste
> error.

> [!gotcha] SCGM input may be any aligned MNI152 variant
> The subcortical volume can be 1.0/1.5/2.0 mm and from SPM, FSL, or AFNI MNI152
> definitions — only the stored geometry matters, because resampling is by
> `--regheader`. Make sure the header actually aligns it with `fsmni152`.

> [!gotcha] Output defaults under `--d`
> `--d <dir>` does not just set the temp directory; it also redefines the output
> volume to `<dir>/vlrmerge.nii.gz` and disables cleanup
> ([`scripts/vlrmerge-mni:230-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L230-L235)).

## Error Compensation and Guard Rails

- **fsmni152 presence check** with actionable download/install instructions
  ([`scripts/vlrmerge-mni:358-375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L358-L375)).
- **Skip-if-up-to-date.** Every stage is guarded by `UpdateNeeded`, so re-runs
  only recompute changed steps unless `--force` is given.
- **Scratch fallback.** Temp files go to `/scratch` when writable, otherwise
  beside the output volume ([`scripts/vlrmerge-mni:65-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L65-L69)).
- **Input existence checks** for the output spec, SCGM volume, at least one
  overlay, the ribbon of any non-template target, and any supplied registrations
  ([`scripts/vlrmerge-mni:377-417`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L377-L417)).
- **Default SCGM mask** is auto-selected in MNI152 mode unless overridden.

## Known Bugs

- [[00166]] — both `--mni152` and `--no-mni152` set `DoMNI152=1` (custom-target path unreachable); in that path the white surface is mis-set to `$hemi.sphere.reg` instead of `$hemi.white`.

## Related Tools

- [[mri_surf2vol]] — paints each hemisphere overlay into the cortical ribbon and merges with the running volume (the core compositing step).
- [[mri_vol2vol]] — cubic-resamples the SCGM volume into the target geometry.
- [[mris_apply_reg]] — resamples a surface overlay from the source sphere (`fsaverage`) to the target sphere (`fsmni152`).
- [[mri_mask]] — applies the subcortical GM mask to the SCGM volume.
- [[fscalc]] — performs the optional `bcor 3` Bonferroni correction.
- [[wiki/tools/freeview|freeview]] — the suggested viewer; the script prints a ready-made overlay command.
- [[lta_convert]] — converts the `.lta`/`.dat` registrations consumed via `--s-reg`/`--v-reg` between formats.
- `vlrmerge` (FSFAST) *(no wiki page yet)* — the native-space counterpart of this MNI152 tool.

## Confidence and Gaps

**High confidence:** the full flag set, the three-input merge logic, the
cortex-over-subcortex priority via the chained `--merge`, the default SCGM
masking, the `fsmni152` requirement, the `UpdateNeeded` guards, and the
`fscalc bcor 3` correction — all read directly from
[`scripts/vlrmerge-mni`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni).

> [!gap] `--no-mni152` path is unreachable as written
> Both `--mni152` and `--no-mni152` set `DoMNI152=1`, so the custom-target
> workflow (`--s`, `--v-reg`, `--s-reg`) documented in the help cannot run in
> v8.2.0. The page therefore describes the MNI152 default path with confidence
> and the custom path only as intended-but-broken.

> [!gap] Custom-target `white` surface line
> The `$hemi.sphere.reg`-instead-of-`$hemi.white` assignment on the custom-target
> branch looks like a bug but cannot be exercised due to the above; not verified
> at runtime.

## References

- FreeSurfer source: [`scripts/vlrmerge-mni`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni) (v8.2.0).
- Built-in help: `vlrmerge-mni --help` (the `BEGINHELP` block, [`scripts/vlrmerge-mni:463-499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/vlrmerge-mni#L463-L499)).
- `fsmni152` data package: `https://ftp.nmr.mgh.harvard.edu/pub/dist/lcnpublic/dist/average/fsmni152.tar.gz`.
