---
title: "fsfirst.fsl"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/fsfirst.fsl"
families: []                     # FSL-bridge subcortical-segmentation wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[mri_vol2vol]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[asegstats2table]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The commented-out explicit-FLIRT block (an alternative to --out_orientation RAS) is dormant; whether RAS conversion alone always matches FIRST's MNI152 expectation was not validated on edge-orientation data."
tags:
  - fsl
  - first
  - subcortical
  - segmentation
---

# fsfirst.fsl

## Summary

`fsfirst.fsl` is a tcsh wrapper that runs FSL's **FIRST** subcortical
segmentation tool (`run_first_all`) on a FreeSurfer input volume and packages the
result for FreeSurfer use. It converts the input to RAS-oriented NIfTI (so FIRST
sees the orientation it expects), runs FIRST, maps the resulting subcortical
segmentation back into the **source volume's** geometry, computes volumetric
segmentation statistics with [[mri_segstats]], and — if a reference
segmentation is supplied — computes **Dice** overlap with it via
[[mri_compute_seg_overlap]]. It can be driven either with explicit input/output
paths or with a single `--s <subject>`, in which case it pulls `orig.mgz` from a
recon-all subject, compares against `aseg.presurf.mgz`, and files the stats under
the subject's `stats/` directory.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/fsfirst.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl)
- **Binary/script location:** `$FREESURFER_HOME/bin/fsfirst.fsl`
- **External dependency:** **FSL** — calls `run_first_all` (FSL FIRST) and reads the FSL standard template `$FSLDIR/data/standard/MNI152_T1_1mm.nii.gz`. FSL must be installed with `$FSLDIR` set.
- **Key FreeSurfer helpers invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L97) (RAS conversion), [`mri_vol2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L135) (map segmentation back to source space), [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L142) (volume stats), [`mri_compute_seg_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L156) (Dice), and [`tkregister2_cmdl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L171) (export the input→MNI registration as `register.dat`/`.lta` for QA). Helpers: `fname2ext`, `getfullpath`.

## Purpose and Context

FSL **FIRST** is a Bayesian shape-and-appearance model that segments subcortical
grey-matter structures (thalamus, caudate, putamen, pallidum, hippocampus,
amygdala, accumbens, brainstem). `fsfirst.fsl` lets a FreeSurfer user run FIRST
without manually handling the format and orientation conversions FSL requires,
and returns the segmentation **in the source volume's space** together with
ready-to-tabulate statistics — making it straightforward to compare FIRST's
subcortical volumes against FreeSurfer's own `aseg`. It is offered as an
alternative/complementary subcortical segmentation to FreeSurfer's
`recon-all` aseg.

It is a **standalone** tool, run by hand. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]; rather, it is typically run *after*
recon-all so it can reuse `orig.mgz` and compare against `aseg.presurf.mgz`.

## Inputs

### Required Inputs

Exactly one of:

- **Input volume** (`--i`) — a T1 volume in any [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L97)-readable format,
  **plus** an output directory (`--o`); or
- **Subject** (`--s`) — a recon-all subject under `$SUBJECTS_DIR`, from which the
  input is set to `mri/orig.mgz`, the Dice reference to `mri/aseg.presurf.mgz`,
  the output to `mri/first`, and the stats to `stats/first.fsl.stats`
  ([`scripts/fsfirst.fsl:298-307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L298-L307)).

Supplying both `--i` and `--s`, or neither, is a hard error
([`scripts/fsfirst.fsl:289-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L289-L296)).

### Input Assumptions

> [!assumption] T1, reoriented to RAS for FIRST
> The input is expected to be a whole-head **T1** volume (the FIRST model and the
> MNI152 1 mm template assume T1 contrast). The wrapper does **not** require any
> particular input orientation because it converts the input to **RAS** NIfTI
> before calling FIRST ([`scripts/fsfirst.fsl:96-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L96-L97)); FIRST internally registers
> that to the MNI152 template. The FSL standard template
> `$FSLDIR/data/standard/MNI152_T1_1mm.nii.gz` must exist
> ([`scripts/fsfirst.fsl:322-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L322-L325)).

- With `--s`, the subject must have completed enough of recon-all to have
  `orig.mgz` (and `aseg.presurf.mgz` for Dice).

## Outputs

### Files Created

All paths are under the output directory (`--o`, or `mri/first` with `--s`):

| File | When | Contents |
|------|------|----------|
| `source.<ext>` | always | symlink to the original input ([`scripts/fsfirst.fsl:82-83`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L82-L83)). |
| `input.ras.nii.gz` | always | the input reoriented to RAS — the volume actually fed to FIRST. |
| `first.nii.gz` (+ FIRST's per-structure files) | always | raw FIRST output base; FIRST also writes `first_all_fast_firstseg.nii.gz` and per-structure mesh/vtk files. |
| `first_all_fast_firstseg.nii.gz` | always | FIRST's combined subcortical label volume (in RAS/FIRST space). |
| **`source.first_all_fast_firstseg.nii.gz`** | always | **the primary output** — FIRST's segmentation resampled (nearest-neighbour) back into the **source** geometry ([`scripts/fsfirst.fsl:133-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L133-L139)). |
| stats file | always | volumetric stats: `first.fsl.stats` in `--o`, or `stats/first.fsl.stats` with `--s` ([`scripts/fsfirst.fsl:142-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L142-L149)). |
| `first.dice.log`, `first.dice.table.dat` | with `--dice`/`--s` | Dice overlap log and table vs. the reference segmentation ([`scripts/fsfirst.fsl:152-165`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L152-L165)). |
| `input.ras_to_std_sub.mat`, `reg.input.ras_to_std_sub.dat`, `reg.input.ras_to_std_sub.lta` | always | the input→MNI152 registration in FSL, tkreg `register.dat`, and [[lta-format\|`.lta`]] forms, for QA ([`scripts/fsfirst.fsl:171-176`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L171-L176)). |
| `fsfirst.fsl.log` | unless `--nolog` | run log ([`scripts/fsfirst.fsl:60-72`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L60-L72)). |

### Output Specifications

The canonical deliverable is
**`source.first_all_fast_firstseg.nii.gz`** — a subcortical **label** volume on
the **source** voxel grid, produced with nearest-neighbour interpolation to
preserve integer labels ([`scripts/fsfirst.fsl:135-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L135-L136)). The stats file is a
standard [[mri_segstats]] summary keyed by the default colour table, excluding
label 0; with `--s` it also includes eTIV. The exported registrations describe
the input→MNI152 mapping (the FIRST registration "may not look good outside of
the subcortical region", per the script's own comment,
[`scripts/fsfirst.fsl:167-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L167-L170)). See [[coordinate-systems]] for the RAS/MNI152
relationship.

## Mathematical Foundations

The segmentation itself — Bayesian active-shape/appearance modelling of
subcortical structures — is performed by **FSL FIRST** (`run_first_all`), not by
this wrapper. `fsfirst.fsl` contributes orientation/geometry bookkeeping and
post-hoc measurement:

> [!internal] FIRST model
> FIRST fits surface meshes to each subcortical structure using a Bayesian model
> of shape and appearance learned from manually labelled training data, after
> affine registration to MNI152. The algorithm is described in Patenaude et al.
> (2011). This script only feeds it a RAS T1 and reads back the labels.

> [!math] Dice overlap (optional)
> When `--dice` (or `--s`) is given, agreement between FIRST's labels and the
> reference segmentation is summarised by the **Dice coefficient**,
> $\mathrm{Dice}(A,B) = \dfrac{2\,|A \cap B|}{|A| + |B|}$, computed per structure
> by [`mri_compute_seg_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L156).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the argument parser
([`scripts/fsfirst.fsl:211-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L211-L281)). These are **double-dash** flags.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | string | *(one of `--i`/`--s` required)* | Input T1 volume (any `mri_convert`-readable format). |
| `--o` | string | required with `--i` (set to `mri/first` with `--s`) | Output directory; created if absent. |
| `--s` | string | *(one of `--i`/`--s` required)* | recon-all subject: sets input=`orig.mgz`, dice ref=`aseg.presurf.mgz`, out=`mri/first`, stats=`stats/first.fsl.stats`. |
| `--sd` | string | `$SUBJECTS_DIR` | Override the subjects directory. |
| `--dice` | string (seg) | — (auto with `--s`) | Compute Dice overlap of the FIRST result against this reference segmentation. |
| `--log` | string | `<outdir>/fsfirst.fsl.log` | Explicit log-file path. |
| `--nolog`<br>`--no-log` | bool | off | Send the log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | — | Temporary directory; implies `--nocleanup`. (Currently the tmpdir is not actively used — the creation/cleanup is commented out.) |
| `--nocleanup` | bool | off | Keep temporaries. |
| `--cleanup` | bool | **on** | Delete temporaries (default; presently a no-op since cleanup is commented out). |
| `--debug` | bool | off | tcsh `verbose` + `echo`. |
| `--help` | bool | — | Print full help (the `BEGINHELP` block) and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--i` and `--s` are mutually exclusive and one is required
> The script errors if both `--i` and `--s` are given, and also if neither is
> ([`scripts/fsfirst.fsl:289-296`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L289-L296)). Use `--i …` `--o …` for an arbitrary volume, or
> `--s subject` to operate on a recon-all subject with all paths inferred.

- **`--s` auto-sets `--dice`.** In subject mode the Dice reference defaults to
  `aseg.presurf.mgz`, so a Dice table is produced without passing `--dice`
  explicitly. In `--i` mode, Dice is computed only if you pass `--dice`.
- **`--o` is implicit under `--s`.** With `--s` the output directory defaults to
  `$SUBJECTS_DIR/<subj>/mri/first` and the stats go to the subject's `stats/`
  folder; an explicit `--o` is needed only in `--i` mode.
- **`--sd` must precede use of the subject.** It overrides `$SUBJECTS_DIR` for
  the `--s` lookups.

## Typical Use Cases

### Use Case 1: Run FIRST on a recon-all subject (with Dice vs. aseg)

```bash
# Uses orig.mgz, compares to aseg.presurf.mgz, stats -> stats/first.fsl.stats
fsfirst.fsl --s bert
```

Produces `mri/first/source.first_all_fast_firstseg.nii.gz`,
`stats/first.fsl.stats`, and `mri/first/first.dice.table.dat`.

### Use Case 2: Run FIRST on an arbitrary T1

```bash
fsfirst.fsl --i /data/sub01/T1.mgz --o /data/sub01/first
```

### Use Case 3: Run on an arbitrary volume and compute Dice vs. a reference

```bash
fsfirst.fsl --i T1.mgz --o firstout --dice manual_subcort.mgz
```

### Use Case 4: Tabulate results across subjects

```bash
# After running fsfirst.fsl --s on several subjects:
asegstats2table -t subcort.volume.first.dat \
  --statsfile=first.fsl.stats --subjectsfile=slist.txt
```

(As documented in the script's help, [`scripts/fsfirst.fsl:370-372`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L370-L372).)

## Pipeline Context

`fsfirst.fsl` is a **standalone** subcortical-segmentation tool. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]], but in `--s` mode it consumes
recon-all outputs:

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (provides `orig.mgz` and
`aseg.presurf.mgz` in `--s` mode) → **This tool** (wraps FSL `run_first_all`) →
**Successors:** [[asegstats2table]] (compile the stats across subjects),
or any analysis that reads `source.first_all_fast_firstseg.nii.gz`. The exported
[[lta-format|`.lta`]] makes the FIRST registration available to FreeSurfer
resampling tools for QA.

## Gotchas and Caveats

> [!gotcha] FIRST registration is only reliable subcortically
> The script notes the input→MNI152 registration it exports "may not look good
> outside of the subcortical region" ([`scripts/fsfirst.fsl:167-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L167-L170)). FIRST is
> optimised for the deep grey structures; do not treat its registration or labels
> as cortical.

> [!gotcha] Output label volume is in source space, via nearest-neighbour
> The primary `source.first_all_fast_firstseg.nii.gz` is resampled to the source
> grid with nearest-neighbour interpolation ([`scripts/fsfirst.fsl:135-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L135-L136)) to
> keep labels integer. If your source grid is coarse, thin structures may lose
> voxels relative to FIRST's native-space result (`first_all_fast_firstseg.nii.gz`).

> [!gotcha] Run-time-in-minutes is computed with /50, not /60
> The "Run-Time-Min" line divides the elapsed seconds by **50** instead of 60
> ([`scripts/fsfirst.fsl:188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L188)), so the reported minutes are ~20% too high. This is
> cosmetic (log only) but the figure should not be trusted; the seconds and hours
> lines are correct.

> [!gotcha] `--s` overwrites under the subject's mri/ and stats/
> Subject mode writes into `mri/first/` and `stats/first.fsl.stats`; the log file
> is removed and recreated each run ([`scripts/fsfirst.fsl:60-62`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L60-L62)). Re-running
> replaces these outputs.

## Error Compensation and Guard Rails

- **Orientation handling:** the input is converted to **RAS** before FIRST
  ([`scripts/fsfirst.fsl:96-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L96-L97)) so arbitrary input orientations are accepted.
- **Geometry restoration:** the FIRST segmentation is mapped back to the source
  geometry, so the deliverable aligns with the user's input volume.
- **Template/path checks:** missing input, missing subject, or a missing MNI152
  template each abort with a clear error
  ([`scripts/fsfirst.fsl:289-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L289-L325)).
- **Stale Dice log removed** before recompute to avoid append duplication
  ([`scripts/fsfirst.fsl:153-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L153-L155)).

> [!gotcha] `--sd` assignment has a tcsh syntax quirk
> The `--sd` handler runs `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/fsfirst.fsl:231`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L231)). In tcsh, `setenv` does not take an `=`, so this sets
> `SUBJECTS_DIR` to the literal string `=` and the real path becomes a stray
> argument. Prefer exporting `SUBJECTS_DIR` in the environment, or using `--s`
> with the directory already set, rather than relying on `--sd`.

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `--sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.
- [[00153]] — end-of-run "Run-Time-Min" computed as `tSecRun/50` instead of `/60`, inflating the logged minute figure by 20% (cosmetic, log-only).

## Related Tools

- [[mri_segstats]] — computes the subcortical volume statistics from the FIRST segmentation.
- [[mri_vol2vol]] — resamples the FIRST segmentation back into the source volume's geometry.
- [[mri_compute_seg_overlap]] — computes Dice overlap vs. a reference segmentation.
- [[asegstats2table]] — compiles `first.fsl.stats` across subjects into a table.
- [[wiki/tools/mri_convert|mri_convert]] — performs the RAS reorientation FIRST needs.
- [[coordinate-systems]] — RAS vs. MNI152 background for the conversions and exported registration.
- `run_first_all` *(no wiki page — FSL)* — the FSL FIRST driver this wraps.

## Confidence and Gaps

**High confidence:** the `--i`/`--s` mutual exclusion and the subject-mode path
inference, the RAS-convert → FIRST → map-back → segstats → Dice flow, the full
flag set, the primary output `source.first_all_fast_firstseg.nii.gz`, and the
exported QA registrations — all read directly from
[`scripts/fsfirst.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl). The `/50` run-time and `--sd` `setenv =`
issues are visible defects in the source.

> [!gap] Dormant explicit-FLIRT path
> An `if(0)` block ([`scripts/fsfirst.fsl:102-121`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L102-L121)) contains an alternative that
> would run FLIRT to MNI152 explicitly and pass the matrix to FIRST; it is
> disabled in favour of the `--out_orientation RAS` conversion. Whether RAS
> conversion alone always satisfies FIRST on unusual input geometries was not
> tested.

## References

- FreeSurfer source: [`scripts/fsfirst.fsl`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl) (v8.2.0).
- Built-in help: `fsfirst.fsl --help` (the `BEGINHELP` block, [`scripts/fsfirst.fsl:360-380`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fsfirst.fsl#L360-L380)).
- FSL FIRST: Patenaude B, Smith SM, Kennedy DN, Jenkinson M. *A Bayesian model of shape and appearance for subcortical brain segmentation.* NeuroImage 56(3):907–922, 2011. https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FIRST
