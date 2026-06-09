---
title: "feat2surf"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/feat2surf"
families: []                     # FSL/FEAT interoperability script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_vol2surf]]"
  - "[[reg2subject]]"
  - "[[aparc2feat]]"
  - "[[aseg2feat]]"
  - "[[feat2segstats]]"
  - "[[tksurfer]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - fsl
  - feat
  - surface
  - vol2surf
  - registration
  - interoperability
---

# feat2surf

## Summary

`feat2surf` samples the statistical volumes of an FSL FEAT analysis **onto the
FreeSurfer cortical surface** — both the individual subject's surface and a
stereotaxic surface atlas (default `fsaverage`) for group analysis. For every
relevant FEAT volume (everything in `featdir/stats/`, plus `cluster*` and
`rendered_thresh*` maps in the FEAT root) it runs [[mri_vol2surf]] once per
hemisphere and per target subject, using the `reg-feat2anat` registration to
carry functional voxels onto surface vertices. Results on the individual surface
are written in MGH format; results on the common surface are written in the
FEAT's native file format (`.nii`/`.nii.gz`/`.img`) so they can be re-imported
into FSL or viewed with [[tksurfer]]. It is the surface-sampling counterpart of
the segment-summarising [[feat2segstats]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/feat2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf)
- **Binary/script location:** `$FREESURFER_HOME/bin/feat2surf`
- **Original author:** Doug Greve
- **Core helper invoked:** [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L158-L164) (the volume→surface sampler) and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L92) (recovers the subject ID from the registration file).

> [!contradiction] Source header says "reg-feat2anat" but this is feat2surf
> The top-of-file comment block names the script `reg-feat2anat`
> ([`scripts/feat2surf:4-6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L4-L6))
> — a copy-paste leftover. The authoritative `VERSION` string is
> `feat2surf @FS_VERSION@` ([`scripts/feat2surf:23`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L23)),
> the usage banner prints `USAGE: feat2surf`, and the behaviour is surface
> sampling. This page documents **feat2surf**; the misleading header is cosmetic.

## Purpose and Context

FreeSurfer's strength is surface-based analysis, where fMRI statistics are
examined and group-averaged on the cortical sheet rather than in volume space.
FSL FEAT produces its statistics in functional volume space. `feat2surf` bridges
the two: it projects FEAT statistic volumes onto each subject's cortical surface
and resamples them to a common spherical atlas, enabling vertex-wise group
analysis and surface visualisation of FSL results.

It is part of the FreeSurfer/FSL bridge family (all by Doug Greve):

- `reg-feat2anat` — establishes the FEAT↔anatomical registration (run **first**).
- [[aparc2feat]] / [[aseg2feat]] — bring FreeSurfer segmentations *into* FEAT
  space.
- [[feat2segstats]] — summarise FEAT volumes by anatomical segment.
- **`feat2surf`** — sample FEAT volumes *onto* the cortical surface (this tool).

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run by hand
on completed FEAT analyses.

## Inputs

### Required Inputs

- **One or more FEAT directories** — given with `--feat` (repeatable) and/or
  `--featdirfile`. Each must contain
  `featdir/reg/freesurfer/anat2exf.register.dat` (from `reg-feat2anat`) and a
  `stats/` directory with FEAT outputs.
- **A FreeSurfer subject with surfaces** — read from the registration file (via
  [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L92)).
  The subject must have `$SUBJECTS_DIR/<subj>/surf/<hemi>.<Surf>` for each
  hemisphere (default surface `white`), and — if `--projfrac` is used —
  `<hemi>.thickness` ([`scripts/feat2surf:308-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L308-L321)).
- **A target atlas subject** — default `fsaverage`; must exist in
  `$SUBJECTS_DIR` (or be supplied via `$FREESURFER_HOME/subjects`).
- **`$SUBJECTS_DIR`** must be set and exist.

### Input Assumptions

> [!assumption] reg-feat2anat must already have been run
> `feat2surf` computes no registration. It requires
> `featdir/reg/freesurfer/anat2exf.register.dat` and aborts with
> "Try running reg-feat2anat" if it is missing
> ([`scripts/feat2surf:85-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L85-L90)).
> The FEAT output type (`.nii.gz`/`.nii`/`.img`) is auto-detected from
> `example_func` ([`scripts/feat2surf:96-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L96-L103)).

> [!gotcha] The subject identity comes from the registration file
> There is no `--subject`/`--s` flag (despite the help EXAMPLE showing
> `reg-feat2anat --feat … --subject bert` — that flag belongs to the *prior*
> step). `feat2surf` recovers the subject from `anat2exf.register.dat`.

## Outputs

### Files Created

For each FEAT directory, each input volume, each target subject, and each
hemisphere:

| File / pattern | Where | Format | Contents |
|----------------|-------|--------|----------|
| `<baseimg>mgh` (individual surface) | `featdir/reg_surf-<hemi>-<subject>/stats/` | MGH | The FEAT volume sampled onto the **individual** subject's surface (one value per vertex). |
| `<baseimg><fslext>` (common surface) | `featdir/reg_surf-<hemi>-<targid>/stats/` | FEAT's native type (`.nii`/`.nii.gz`/`.img`) | The same volume resampled onto the **atlas** surface (default `fsaverage`), `--reshape`d so vertex count fits format dimension limits (see Gotchas). |
| `feat2surf.log` | `featdir/reg/freesurfer/` | text | Full command, environment, and every `mri_vol2surf` invocation/output. A pre-existing log is rotated to `.log.bak`; suppressed with `--nolog`. |

`<baseimg>` is the input volume's basename with its extension stripped
([`scripts/feat2surf:130-131`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L130-L131)).
The set of inputs is: all `stats/*.<ext>`, plus `cluster*.<ext>` and
`rendered_thresh*.<ext>` from the FEAT root
([`scripts/feat2surf:107-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L107-L115)).
With `--cope-only`, only `cope*` and `varcope*` from `stats/` are mapped, and
**only to the atlas** (not the individual surface)
([`scripts/feat2surf:107-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L107-L115)).

### Output Specifications

The individual-surface outputs are MGH overlays with as many "voxels" as the
subject has surface vertices; the common-surface outputs are the same data on
the atlas mesh. The atlas output is stored in the FEAT volume format with the
vertex dimension factored into ≤ 32768-sized axes (see the surface-as-volume
gotcha). Both are vertex-indexed overlays suitable for [[tksurfer]]/`freeview`
display and (for the atlas) vertex-wise group statistics.

## Mathematical Foundations

`feat2surf` performs no arithmetic of its own. The sampling of functional voxels
onto surface vertices (and, for the atlas, the spherical resampling) is done by
[[mri_vol2surf]].

> [!internal] The volume→surface sampling lives in mri_vol2surf
> The fixed core invocation is
> [`mri_vol2surf --src <img> --srcreg anat2exf.register.dat --trgsubject <targ> --hemi <h> --out <out> --surf <Surf> [--reshape] [--projfrac F]`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L158-L164).
> When the target is the **atlas** (≠ the subject), `--reshape` is added and the
> output keeps the FEAT format; when the target **is** the subject, no reshape is
> used and the output is MGH
> ([`scripts/feat2surf:140-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L140-L146)).
> `--projfrac` samples at a fraction of cortical thickness along the surface
> normal. See [[mri_vol2surf]] for the sampling and resampling algorithms.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/feat2surf:194-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L194-L272)).
Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--feat` | string (repeatable) | *(required)* | A FEAT output directory; repeatable. |
| `--featdirfile` | string (filename) | — | ASCII file listing FEAT directories; contents appended. Combinable with `--feat`, repeatable. |
| `--projfrac` | float | `0` (surface itself) | Sample at this fraction of the cortical thickness along the surface normal (e.g. `0.5` = mid-ribbon). Requires `<hemi>.thickness` for the subject. Passed to `mri_vol2surf --projfrac`. |
| `--hemi` | string (`lh`\|`rh`) | both `lh rh` | Process only the named hemisphere; validated to be exactly `lh` or `rh` ([`scripts/feat2surf:232-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L232-L239)). |
| `--target` | string (subject) | `fsaverage` | The atlas subject defining the common surface space. |
| `--surf` | string | `white` | Which surface to sample onto (`white`, `pial`, …); must exist as `<hemi>.<surf>`. |
| `--cope-only` | bool | off | Map only `cope*`/`varcope*` from `stats/`, and only to the atlas target (skip the individual surface and the `cluster*`/`rendered*` maps). |
| `--out` | string (dir) | `featdir/reg_surf-<hemi>-<targ>/stats` | Override the output directory (documented as "for testing"). Applies to **all** hemispheres/targets, so it can collide — see gotcha. |
| `--nolog` | bool | off | Do not write a log file (logs to `/dev/null`). |
| `--dontrun` | bool | off | Print/log the `mri_vol2surf` commands but do not execute them (dry run). |
| `--usedev` | bool | off | Use the development build `$DEV/mri_vol2surf/mri_vol2surf` ([`scripts/feat2surf:159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L159)). Developer-only. |
| `--debug` | bool | off | Enable `set echo`/`verbose` command tracing. |
| `--help` | bool | — | Print full help and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--cope-only` changes *both* the input set and the targets
> Normally `feat2surf` maps **all** of `stats/*` plus `cluster*`/`rendered*` onto
> **both** the individual surface and the atlas. `--cope-only` restricts the
> input to `cope*`/`varcope*` **and** restricts the targets to only the atlas
> (`subjectlist = ($TargetSubj)` instead of `($subject $TargetSubj)`)
> ([`scripts/feat2surf:107-115`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L107-L115)).
> So with `--cope-only` you get **no** individual-surface MGH outputs.

> [!gotcha] `--projfrac` requires thickness files
> Passing `--projfrac` makes the pre-flight check additionally require
> `<hemi>.thickness` for the subject, aborting if absent
> ([`scripts/feat2surf:314-320`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L314-L320)).
> Without `--projfrac` the data are sampled exactly on the chosen surface
> (fraction 0) and thickness is not needed.

> [!gotcha] `--out` is a single directory for every hemisphere/target
> When `--out` is given, *all* hemisphere × target combinations write into that
> one directory ([`scripts/feat2surf:149-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L149-L156)),
> so the per-`reg_surf-<hemi>-<targ>` separation is lost and same-named outputs
> can overwrite each other. It is documented as a testing/debug option for good
> reason; leave it unset for normal use.

- `--feat` and `--featdirfile` are additive and repeatable.
- `--hemi` narrows the default both-hemisphere loop; `--target`/`--surf` change
  the atlas and surface used by every `mri_vol2surf` call.
- `--dontrun` is compatible with everything and is the safe way to preview the
  exact commands.

## Typical Use Cases

### 1. Sample a FEAT analysis onto the surface (subject + fsaverage)

```bash
# Registration must already exist (reg-feat2anat).
feat2surf --feat fbert.feat
# → fbert.feat/reg_surf-{lh,rh}-bert/stats/*.mgh        (individual)
# → fbert.feat/reg_surf-{lh,rh}-fsaverage/stats/*.nii.gz (atlas)
```

### 2. View a z-stat on the native and common surfaces

```bash
feat2surf --feat fbert.feat
tksurfer bert      lh inflated -overlay fbert.feat/reg_surf-lh-bert/stats/zstat1.nii.gz
tksurfer fsaverage lh inflated -overlay fbert.feat/reg_surf-lh-fsaverage/stats/zstat1.nii.gz
```

(From the script's own help EXAMPLE,
[`scripts/feat2surf:426-443`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L426-L443).)

### 3. Mid-ribbon sampling, left hemisphere only, COPEs to the atlas only

```bash
feat2surf --feat fbert.feat --projfrac 0.5 --hemi lh --cope-only
```

### 4. Dry run to inspect the commands

```bash
feat2surf --feat fbert.feat --dontrun
```

## Pipeline Context

`feat2surf` is a stand-alone FreeSurfer↔FSL bridge tool; it is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (produces the surfaces
and `fsaverage` registration), FSL FEAT (produces `stats/*`), **and**
`reg-feat2anat` (produces `anat2exf.register.dat`) → **feat2surf** →
**Successors:** [[tksurfer]]/`freeview` for visualisation, or surface-based group
GLM (e.g. [[wiki/tools/mri_glmfit|mri_glmfit]]) on the atlas-resampled overlays.
The segment-summary analogue is [[feat2segstats]]; the opposite-direction tools
are [[aparc2feat]]/[[aseg2feat]].

## Gotchas and Caveats

> [!gotcha] Surface overlays are stored in "volume" formats with factored dims
> Because surface data have ~150,000 vertices but ANALYZE/NIFTI cannot represent
> a dimension above 2¹⁵ = 32768, the atlas output factors the vertex count into
> smaller axes (e.g. fsaverage's 163842 vertices → 1974 × 83). This is why the
> spatial dimensions of the output do **not** correspond to a real volume. For
> individual subjects the vertex count may have no factor below 32768, so those
> outputs are written in **MGH** (which has no such limit). This is described in
> the script's own BUGS note ([`scripts/feat2surf:446-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L446-L460)).

> [!gotcha] Individual-surface output format is MGH despite the `.mgh`-less name
> The individual-surface branch sets `outext = mgh` (no dot) and appends it to
> the basename, so files are named like `zstat1mgh`
> ([`scripts/feat2surf:142-156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L142-L156)).
> The help says output is "stored in mgz/mgh format"; the on-disk basename simply
> concatenates `mgh` without a separating dot.

> [!gotcha] Hard stop on the first `mri_vol2surf` failure
> Any non-zero return aborts the whole run with `exit 1`
> ([`scripts/feat2surf:172-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L172-L176)),
> so remaining images / FEAT directories are not processed.

## Error Compensation and Guard Rails

- **Format auto-detection.** The FEAT type is read from `example_func`; the
  script errors if it cannot determine it
  ([`scripts/feat2surf:96-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L96-L103)).
- **Format-aware output.** Atlas outputs keep the FEAT format with reshaping;
  individual outputs use MGH to dodge the 32768-dimension limit (see gotcha).
- **Pre-flight existence checks** for the registration, `$SUBJECTS_DIR`, the
  subject, each surface, and (with `--projfrac`) the thickness file
  ([`scripts/feat2surf:287-321`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L287-L321)).
- **Empty-input guard.** If no `.img`/`.nii`/`.nii.gz` files are found in
  `stats/`, it aborts rather than producing nothing
  ([`scripts/feat2surf:117-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L117-L121)).
- **`--dontrun`** lets you validate the plan without writing any surface data.

## Related Tools

- [[mri_vol2surf]] — the engine that samples functional volumes onto surface
  vertices and resamples to the atlas; all the geometry happens here.
- [[reg2subject]] — reads the FreeSurfer subject name from the register file.
- [[feat2segstats]] — the segment-summary counterpart (FEAT volumes → per-
  structure tables instead of per-vertex overlays).
- [[aparc2feat]] / [[aseg2feat]] — the opposite-direction bridges (FreeSurfer
  segmentations → FEAT volume space).
- [[tksurfer]] — displays the resulting surface overlays.
- `reg-feat2anat` *(no wiki page yet)* — the prerequisite that creates
  `anat2exf.register.dat`.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — surface-based group GLM that can run on
  the atlas-resampled overlays this tool produces.

## Confidence and Gaps

**High confidence:** the complete flag set, the input image set (stats + cluster
+ rendered), the dual individual/atlas targeting, the `--cope-only` narrowing of
both inputs and targets, the MGH-vs-FEAT-format output rule, the surface-as-
volume dimension factoring, and the fatal-on-error behaviour — all read directly
from [`scripts/feat2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf).
The misleading `reg-feat2anat` header comment is a confirmed copy-paste artefact
(VERSION and usage are `feat2surf`).

> [!gap] Behaviour of the self-referential `imglist` rebuild
> Lines [`scripts/feat2surf:111-113`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L111-L113)
> rebuild `imglist` by `ls`-ing the previous `$imglist` together with the
> `cluster*`/`rendered_thresh*` globs; the exact de-duplication this produces in
> edge cases (no cluster maps present) was read but not exercised on real data.

## References

- FreeSurfer source: [`scripts/feat2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf) (v8.2.0).
- Built-in help: `feat2surf --help` (the `BEGINHELP` block,
  [`scripts/feat2surf:374-460`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/feat2surf#L374-L460)).
- Companions: [[feat2segstats]], [[aparc2feat]], [[aseg2feat]].
