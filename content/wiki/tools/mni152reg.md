---
title: "mni152reg"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/mni152reg"
families: []
recon_all_stage: null
related:
  - "[[fslregister]]"
  - "[[bbregister]]"
  - "[[lta_convert]]"
  - "[[mri_vol2vol]]"
  - "[[tkregister2]]"
  - "[[coordinate-systems]]"
  - "[[lta-format]]"
  - "[[fsaverage]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - mni152
  - fsl
  - flirt
  - group-analysis
---

# mni152reg

## Summary

`mni152reg` computes a 12-DOF (affine) registration between a FreeSurfer
subject's anatomical and the **FSL MNI152** standard-space template, producing
a tkregister-style `register.dat` (and matching [[lta-format]] `.lta`) that maps
MNI152 space to the subject. It is a thin tcsh front-end for FreeSurfer's
[[fslregister]] (which itself drives FSL **FLIRT**); optionally it also resamples
the subject's `orig.mgz` into MNI152 space with [[wiki/tools/mri_vol2vol|mri_vol2vol]].
The registration's main purpose is to integrate FreeSurfer with higher-level FSL
functional analysis (GFEAT) for a single subject, particularly to prepare
volumetric FSL results for surface-based group analysis on [[fsaverage]].

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/mni152reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg)
- **Binary/script location:** `$FREESURFER_HOME/bin/mni152reg`
- **Key helpers invoked:** [[fslregister]] (the actual FLIRT registration, [`scripts/mni152reg:70-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L70-L71)) and [[wiki/tools/mri_vol2vol|mri_vol2vol]] (optional resampling with `--save-vol`, [`scripts/mni152reg:83-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L83-L84)).
- **External dependency:** FSL — the registration target is read from `$FSLDIR/data/standard` and the registration is performed by FLIRT via [[fslregister]].

## Purpose and Context

FSL functional analyses (FEAT/GFEAT) commonly report results in **MNI152**
standard space. To bring those results onto a FreeSurfer subject's cortical
surface — for visualisation or, more importantly, to combine subjects in a
surface-based group analysis on [[fsaverage]] — one needs the linear transform
between MNI152 and that subject's anatomical. `mni152reg` produces exactly that
transform, stored in the FreeSurfer tkregister convention so it can be used by
`mri_vol2surf`, [[wiki/tools/mri_vol2vol|mri_vol2vol]], `tkmedit`/`tksurfer`,
[[wiki/tools/freeview|freeview]], and `mris_preproc`.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run by hand
after a recon completes. It is also invoked internally by [[bbregister]]
([`scripts/bbregister:463`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/bbregister#L463)) and by the pons-segmentation
helper `segpons` ([`scripts/segpons:83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/segpons#L83)).

> [!gotcha] Volumetric registration — surfaces will not line up
> The transform is a **volumetric** affine alignment to MNI152. As the help notes,
> the cortical surfaces will *not* coincide with MNI152 when overlaid, because
> surface-to-surface correspondence is not what this computes. Use it to move
> volumetric data, not to claim surface alignment.

## Inputs

### Required Inputs

- **A FreeSurfer subject** — `--s <subject>` in `$SUBJECTS_DIR` ([`scripts/mni152reg:109-112`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L109-L112)). The subject must have completed enough of recon-all to provide the volumes [[fslregister]] needs (and `mri/orig.mgz` if `--save-vol` is used).

### Input Assumptions

> [!assumption] FSL is installed and provides the MNI152 target
> `$FSLDIR/data/standard/MNI152_T1_{1,2}mm_brain.nii.gz` (or the `_symmetric`
> variant with `--sym`) must exist; the script aborts if the target is not found
> ([`scripts/mni152reg:164-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L164-L172)). The brain-extracted MNI152 template
> is used, so the subject volume is registered to a skull-stripped target.

## Outputs

### Files Created

By default the outputs go to `$SUBJECTS_DIR/$subject/mri/transforms/`
([`scripts/mni152reg:39-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L39-L52)):

| File | When | Contents |
|------|------|----------|
| `reg.mni152.<res>mm.dat` | default | tkregister-style `register.dat` mapping MNI152 → subject (`<res>` is `1` or `2`). |
| `reg.mni152.<res>mm.lta` | default | the same registration as an [[lta-format]] `.lta`. |
| `reg.mni152.<res>mm.sym.dat` / `.sym.lta` | `--sym` | registration to the **symmetric** MNI152 target. |
| `<outreg>` and `<outreg>.lta` | `--o <outreg>` | user-chosen output paths (override the defaults). |
| `mri/mni152.orig.mgz` (or `mni152.sym.orig.mgz`) | `--save-vol` | the subject's `orig.mgz` resampled into MNI152 space (via [[wiki/tools/mri_vol2vol|mri_vol2vol]] `--inv`). |
| `scripts/mni152reg.log` (or `<outreg>.log`) | always | run log. |

### Output Specifications

The transform is a **12-DOF affine** in the FreeSurfer tkregister convention
(see [[coordinate-systems]] / [[lta-format]]). The default resolution is **2 mm**
because that is what FSL functional analysis uses; `--1` selects the 1 mm target.
The `.dat` and `.lta` describe the geometry only; image data is produced solely
by the optional `--save-vol` resampling.

## Mathematical Foundations

`mni152reg` performs **no** registration math itself — it selects the MNI152
target and delegates the 12-DOF affine estimation to FSL FLIRT through
[[fslregister]] (`--dof 12`, [`scripts/mni152reg:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L70)). The optional
volume output is a single linear resampling.

> [!internal] FLIRT is the estimator
> The affine optimisation (correlation-ratio cost, multi-resolution search) is
> FSL FLIRT, invoked via [[fslregister]]. `mni152reg` only fixes DOF=12, the
> target, and the output paths.

## Configuration Options

### Complete Flag Reference

All flags from the parser ([`scripts/mni152reg:101-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L101-L149)). Booleans take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s` | string | *(required)* | FreeSurfer subject id in `$SUBJECTS_DIR`. |
| `--1` | bool | off (2 mm) | Register to the **1 mm** MNI152 target instead of 2 mm. |
| `--2` | bool | **on** | Register to the 2 mm MNI152 target (the default; matches FSL functional analysis). |
| `--sym` | bool | off | Use the **symmetric** MNI152 target (`MNI152_T1_<res>mm_brain_symmetric.nii.gz`); output names gain a `.sym` tag. |
| `--o` | string | derived | Explicit output registration path (otherwise `mri/transforms/reg.mni152.<res>mm[.sym].dat`); the `.lta` and `.log` are derived from it. |
| `--save-vol` | bool | off | Also resample the subject's `orig.mgz` into MNI152 space via [[wiki/tools/mri_vol2vol|mri_vol2vol]]. |
| `--debug` | bool | off | `set echo` + verbose tracing. |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print full help and exit. |

### Configuration Interactions

> [!gotcha] `--1`/`--2` and `--sym` jointly determine the target file and the output names
> Resolution (`--1`/`--2`) picks `MNI152_T1_1mm`/`2mm`; `--sym` switches to the
> `_symmetric` template **and** inserts `.sym` into the default output filenames
> ([`scripts/mni152reg:42-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L42-L48), [`:164-168`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L164-L168)). The
> last resolution flag on the command line wins. With `--o` set, you choose the
> name yourself and the `.sym` auto-naming does not apply.

- `--o` overrides the default `mri/transforms/...` location and also redirects the
  log next to the output.
- `--save-vol` requires `mri/orig.mgz` to exist (it does after a standard recon).

## Typical Use Cases

### 1. Standard 2 mm MNI152 registration (for FSL GFEAT)

```bash
mni152reg --s sub01
# → $SUBJECTS_DIR/sub01/mri/transforms/reg.mni152.2mm.dat (+ .lta)
```

### 2. 1 mm registration, also save the resampled anatomical

```bash
mni152reg --s sub01 --1 --save-vol
# → reg.mni152.1mm.dat/.lta  and  mri/mni152.orig.mgz
```

### 3. Map an FSL zstat onto the subject surface

```bash
mni152reg --s sub01
mri_vol2surf --mov sub01.gfeat/cope1.feat/stats/zstat1.nii.gz \
  --reg $SUBJECTS_DIR/sub01/mri/transforms/reg.mni152.2mm.dat \
  --hemi lh --projfrac 0.5 --o lh.sub01.zstat1.mgh
```

### 4. Prepare multiple subjects for surface-based group analysis

```bash
# After running mni152reg --s on each subject, combine copes on fsaverage:
mris_preproc --hemi lh --target fsaverage \
  --iv sub1.gfeat/cope1.feat/stats/cope1.nii.gz $SUBJECTS_DIR/sub1/mri/transforms/reg.mni152.2mm.dat \
  --iv sub2.gfeat/cope1.feat/stats/cope1.nii.gz $SUBJECTS_DIR/sub2/mri/transforms/reg.mni152.2mm.dat \
  --out lh.fsaverage.cope1.mgh
```

## Pipeline Context

`mni152reg` is a stand-alone registration utility and is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. It runs after a subject's recon is
complete and feeds FSL↔FreeSurfer functional-analysis workflows.

**Predecessor:** a completed FreeSurfer subject (recon-all) + FSL with the MNI152
standard data → **mni152reg** → **Successors:** `mri_vol2surf` / `mris_preproc`
(map FSL volumetric results onto [[fsaverage]]), [[wiki/tools/mri_vol2vol|mri_vol2vol]],
[[lta_convert]] (convert the transform), or [[tkregister2]]/`tkregisterfv`
(check the registration).

It is invoked internally by [[bbregister]] and by `segpons` to obtain an
MNI152↔subject transform.

## Gotchas and Caveats

> [!gotcha] 2 mm is the default, not 1 mm
> Because FSL functional analysis works at 2 mm, the default target is 2 mm; pass
> `--1` for a 1 mm registration. The chosen resolution is baked into the output
> filename, so 1 mm and 2 mm registrations coexist without clobbering.

> [!gotcha] Output overwrites silently (no backup)
> The log is removed at start (`rm -f $LF`) and [[fslregister]] writes the reg
> directly; unlike [[spmregister]], `mni152reg` does not timestamp-back up a
> pre-existing `register.dat`. Re-running replaces the previous registration for
> the same resolution.

> [!gotcha] Requires `$FSLDIR` and FSL FLIRT
> No FSL, no registration: the target volume lookup and the FLIRT call both
> depend on a working FSL install.

## Error Compensation and Guard Rails

- **Existence checks** abort early if the subject is missing
  ([`scripts/mni152reg:159-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L159-L162)) or the MNI152 target file cannot be
  found ([`scripts/mni152reg:169-172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L169-L172)).
- **Scratch-aware tmp dir:** uses `/scratch` when writable, else the subject's
  `tmp/` ([`scripts/mni152reg:64-68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L64-L68)); [[fslregister]] is told to clean up.
- Every external call's exit status is checked; a failure aborts the script.

## Related Tools

- [[fslregister]] — the FLIRT wrapper that does the actual 12-DOF registration; `mni152reg` is a front-end for it.
- [[bbregister]] — calls `mni152reg` internally and is the general boundary-based registration tool for functional→anatomical alignment.
- [[wiki/tools/mri_vol2vol|mri_vol2vol]] — applies the registration / performs the `--save-vol` resampling.
- [[lta_convert]] — converts the resulting `register.dat`/`.lta` to other transform formats.
- [[tkregister2]] — `tkregisterfv` checks the registration visually.
- [[fsaverage]] — the common surface target for the group analyses this enables.
- [[coordinate-systems]], [[lta-format]] — the conventions of the output transform.

## Confidence and Gaps

**High confidence:** the complete flag set, default 2 mm target, output naming
(including the `.sym` variants), the FSL dependency, and the
[[fslregister]]→FLIRT delegation are all read directly from
[`scripts/mni152reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg).
No open questions.

## References

- FreeSurfer source: [`scripts/mni152reg`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg) (v8.2.0).
- Built-in help: `mni152reg --help` (the `BEGINHELP` block, [`scripts/mni152reg:204-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mni152reg#L204-L278)).
- FSL FLIRT: Jenkinson & Smith, *A global optimisation method for robust affine registration of brain images*, Medical Image Analysis 5(2):143–156, 2001.
- MNI152 template: Grabner et al., MICCAI 2006; the FSL `data/standard` MNI152 brains.
