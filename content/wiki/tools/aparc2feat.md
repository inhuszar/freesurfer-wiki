---
title: "aparc2feat"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/aparc2feat"
families: []                     # FSL/FEAT interoperability script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[aseg2feat]]"
  - "[[mri_label2vol]]"
  - "[[reg2subject]]"
  - "[[feat2segstats]]"
  - "[[feat2surf]]"
  - "[[mri_segstats]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - fsl
  - feat
  - parcellation
  - aparc
  - registration
  - interoperability
---

# aparc2feat

## Summary

`aparc2feat` resamples a FreeSurfer **cortical parcellation** (the
`lh.aparc.annot` / `rh.aparc.annot` surface annotation produced by
[[wiki/pipelines/recon-all|recon-all]]) into the functional space of an
**FSL FEAT** analysis directory, producing a labelled volume that is
voxel-for-voxel registered to the FEAT `example_func`. It is a thin tcsh
front-end for [[mri_label2vol]]: for each hemisphere it fills the annotation
into the FEAT functional grid by projecting through the cortical ribbon
(0–100 % of thickness) and writes `<hemi>.aparc.<ext>` into
`featdir/reg/freesurfer/`. The resulting volume lets you build cortical
region-of-interest masks (in `fslmaths`/`tkmedit`) or extract per-region
functional statistics directly in FEAT's own space. It requires that
`reg-feat2anat` has already established the anatomical-to-functional
registration.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/aparc2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat)
- **Binary/script location:** `$FREESURFER_HOME/bin/aparc2feat`
- **Original author:** Doug Greve
- **Core helper invoked:** [`mri_label2vol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L86-L90) (the actual surface→volume resampling) and [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L76) (reads the subject ID out of the registration file).

## Purpose and Context

FSL's FEAT performs first- and higher-level fMRI GLM analysis in a functional
(EPI) space that is unrelated to FreeSurfer's anatomical conventions. To bring
FreeSurfer's anatomically-precise cortical parcellation into that space — so a
researcher can, for example, average a contrast over the calcarine sulcus or
the precentral gyrus — the surface annotation must be projected into the EPI
voxel grid using the FEAT↔anatomical registration.

`aparc2feat` automates exactly that for the **cortical surface** parcellation.
It is one of a small family of FreeSurfer/FSL bridge scripts:

- `reg-feat2anat` — establishes the registration (run **first**).
- **`aparc2feat`** — imports the cortical (surface) parcellation (this tool).
- [[aseg2feat]] — imports the subcortical (volume) `aseg` segmentation.
- [[feat2segstats]] — extracts per-segment statistics from FEAT volumes using
  one of these imported segmentations.
- [[feat2surf]] — the complementary direction: samples FEAT statistic volumes
  *onto* the FreeSurfer surface.

It is **not** part of [[wiki/pipelines/recon-all|recon-all]]; it is run by hand
after both a FreeSurfer reconstruction and an FSL FEAT analysis exist for the
same subject.

## Inputs

### Required Inputs

- **One or more FEAT directories** — given with `--feat` (repeatable) and/or
  listed in a file given with `--featdirfile`. Each must contain a completed
  `reg-feat2anat` registration at
  `featdir/reg/freesurfer/anat2exf.register.dat`
  ([`scripts/aparc2feat:184-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L184-L188))
  and an `example_func` image (`.img`, `.nii`, or `.nii.gz`).
- **A FreeSurfer subject** — the subject name is **read from the registration
  file**, not given on the command line. The script uses
  [`reg2subject --r anat2exf.register.dat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L76)
  to recover it, then requires `$SUBJECTS_DIR/<subject>/label/<hemi>.<annot>.annot`
  to exist for each hemisphere.
- **`$SUBJECTS_DIR`** must be set and the subject's recon (specifically the
  cortical annotation and the surfaces `mri_label2vol` needs) must be complete.

### Input Assumptions

> [!assumption] reg-feat2anat must already have been run
> `aparc2feat` does **not** compute any registration. It assumes
> `featdir/reg/freesurfer/anat2exf.register.dat` already exists (the
> [tkregister-style](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L88)
> anatomical→functional register matrix written by `reg-feat2anat`) and that
> `example_func` defines the target functional geometry. If the registration
> file is missing the script aborts with
> "You must run reg-feat2anat first"
> ([`scripts/aparc2feat:184-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L184-L188)).

> [!gotcha] The subject identity comes from the registration file
> The FreeSurfer subject is taken from inside `anat2exf.register.dat` (via
> [`reg2subject`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L76),
> and as a fallback the first line of the file at
> [`scripts/aparc2feat:198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L198)).
> There is no `--subject`/`--s` flag. If that file names the wrong subject, the
> wrong parcellation will be resampled with no warning.

## Outputs

### Files Created

For each FEAT directory and each hemisphere:

| File / pattern | Where | Contents |
|----------------|-------|----------|
| `<hemi>.<annot><fslext>` (e.g. `lh.aparc.nii.gz`, `rh.aparc.nii.gz`) | `featdir/reg/freesurfer/` | The cortical parcellation resampled into the FEAT functional grid; each voxel value is a parcellation label index. |
| `aparc2feat.log` | `featdir/reg/freesurfer/` | Full command, environment, and the `mri_label2vol` invocation/output. A pre-existing log is rotated to `.log.bak` ([`scripts/aparc2feat:62-64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L62-L64)). |

The output extension `<fslext>` matches the FEAT `example_func` (`.img`, `.nii`,
or `.nii.gz`), detected at
[`scripts/aparc2feat:79-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L79-L81).
With a non-default `--annot`, the basename changes accordingly (e.g.
`--a2009s` → `lh.aparc.a2009s.nii.gz`).

### Output Specifications

The output is an integer-labelled volume **identical in geometry to
`example_func`** (same matrix size, voxel size, and orientation) and in
voxel-for-voxel correspondence with the FEAT data. Each voxel holds the
parcellation index of the cortical region projected to that location. For the
default `aparc` annotation, the index→structure correspondence is given in
`$FREESURFER_HOME/Simple_surface_labels2002.txt` (e.g. calcarine sulcus = 44),
as noted in the script's own help
([`scripts/aparc2feat:278-283`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L278-L283)).
The exact data type and unfilled-voxel value are determined by
[[mri_label2vol]].

## Mathematical Foundations

`aparc2feat` performs no arithmetic itself — it is a dispatcher. The geometric
work (composing the anatomical→functional registration with the surface
vertex→voxel mapping, projecting each cortical label along the surface normal
through the ribbon, and rasterising into the functional grid) is done entirely
by [[mri_label2vol]].

> [!internal] The resampling math lives in mri_label2vol
> The fixed invocation is
> [`mri_label2vol --annot … --temp example_func --reg anat2exf.register.dat --o … --hemi <h> --subject <subj> --proj frac 0 1 .1`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L86-L90).
> `--proj frac 0 1 .1` samples the cortical ribbon from the white surface
> (fraction 0) to the pial surface (fraction 1) in steps of 0.1 of the local
> thickness, labelling every functional voxel the projection passes through. See
> [[mri_label2vol]] for the projection and voxelisation algorithm.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/aparc2feat:113-170`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L113-L170)).
Boolean flags take no argument.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--feat` | string (repeatable) | *(required)* | A FEAT output directory. Specify multiple times to process several analyses. Each must contain `reg/freesurfer/anat2exf.register.dat`. |
| `--featdirfile` | string (filename) | — | An ASCII file listing FEAT directories (one per line / whitespace-separated); its contents are appended to the directory list. Can be combined with `--feat` and repeated. |
| `--hemi` | string (`lh`\|`rh`) | both `rh lh` | Resample only the named hemisphere. By default both hemispheres are processed. |
| `--annot` | string | `aparc` | Use a different surface annotation, i.e. `$SUBJECTS_DIR/<subj>/label/<hemi>.<annot>.annot`. The output basename becomes `<hemi>.<annot>`. |
| `--a2005s` | bool | off | Shorthand for `--annot aparc.a2005s` (the 2005 Destrieux atlas). |
| `--a2009s` | bool | off | Shorthand for `--annot aparc.a2009s` (the 2009 Destrieux atlas). |
| `--usedev` | bool | off | Run the development build of `mri_label2vol` from `$DEV/mri_label2vol/mri_label2vol` instead of the one on `PATH` ([`scripts/aparc2feat:85`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L85)). Developer-only. |
| `--debug` | bool | off | Enable `set echo`/`verbose` command tracing. |
| `--help` | bool | — | Print full help (the `BEGINHELP` block) and exit. |
| `--version` | bool | — | Print the version string and exit. |

### Configuration Interactions

> [!gotcha] `--annot`, `--a2005s`, and `--a2009s` all set the same variable
> These three flags write to one variable (`annot`) and are applied left to
> right ([`scripts/aparc2feat:141-152`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L141-L152)).
> The **last one on the command line wins**: `--a2009s --annot aparc` resolves to
> `aparc`, while `--annot aparc --a2009s` resolves to `aparc.a2009s`. They are
> not additive — you get exactly one annotation.

- `--feat` and `--featdirfile` are **additive**, not exclusive; lists from both
  are concatenated, and either may be repeated.
- `--hemi` narrows the default two-hemisphere loop to one hemisphere; there is
  no way to request a custom pair other than the default both.
- The script requires the chosen annotation to exist for **every** requested
  hemisphere before doing any work; a missing `<hemi>.<annot>.annot` is a fatal
  pre-flight error ([`scripts/aparc2feat:204-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L204-L210)).

## Typical Use Cases

### 1. Import the standard cortical parcellation into one FEAT analysis

```bash
# Registration must already exist (reg-feat2anat).
aparc2feat --feat fbert.feat
# → fbert.feat/reg/freesurfer/lh.aparc.nii.gz and rh.aparc.nii.gz
```

### 2. Build a cortical ROI mask in the functional space

```bash
aparc2feat --feat fbert.feat
# Calcarine sulcus = label 44 (Simple_surface_labels2002.txt)
fslmaths fbert.feat/reg/freesurfer/lh.aparc.nii.gz \
         -thr 44 -uthr 44 \
         fbert.feat/reg/freesurfer/lh.calc_sulc.nii.gz
```

(The help shows the equivalent legacy `avwmaths` command,
[`scripts/aparc2feat:285-289`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L285-L289).)

### 3. Use the Destrieux 2009 atlas and only the left hemisphere

```bash
aparc2feat --feat fbert.feat --a2009s --hemi lh
# → fbert.feat/reg/freesurfer/lh.aparc.a2009s.nii.gz
```

### 4. Batch several FEAT directories from a list file

```bash
ls -d /study/sub-*/run1.feat > featdirs.txt
aparc2feat --featdirfile featdirs.txt
```

## Pipeline Context

`aparc2feat` is a stand-alone FreeSurfer↔FSL bridge tool; it is **not** invoked
by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`. It sits between an
existing FreeSurfer reconstruction + FSL FEAT analysis and downstream
ROI/statistics extraction.

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] (produces the
`?h.aparc.annot` and surfaces) **and** `reg-feat2anat` (produces
`anat2exf.register.dat`) → **aparc2feat** → **Successors:**
[[feat2segstats]] (per-region statistics from FEAT volumes), `fslmaths`/`tkmedit`
ROI masking. Its subcortical counterpart is [[aseg2feat]]; the reverse-direction
tool is [[feat2surf]].

## Gotchas and Caveats

> [!gotcha] No `--standard`/standard-space option here
> Unlike [[aseg2feat]], `aparc2feat` only ever resamples into the **native
> functional** space (it always uses `anat2exf.register.dat` and writes into
> `reg/freesurfer/`). There is no flag to project the cortical parcellation into
> FSL standard (MNI) space.

> [!gotcha] Output always lands in `reg/freesurfer/`, overwriting silently
> The output path is fixed to
> `featdir/reg/freesurfer/<hemi>.<annot><ext>`
> ([`scripts/aparc2feat:89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L89));
> there is no `--o`. Re-running overwrites the previous result (only the log is
> backed up to `.log.bak`).

> [!gotcha] Hard stop on the first `mri_label2vol` failure
> If `mri_label2vol` returns non-zero for any hemisphere, the script prints
> `ERROR: with …` and exits immediately
> ([`scripts/aparc2feat:95-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L95-L99)),
> so later FEAT directories in a multi-`--feat` batch are **not** processed.
> (Contrast [[aseg2feat]], which `continue`s past a failure.)

## Error Compensation and Guard Rails

- **Pre-flight existence checks.** Before doing any resampling the script
  verifies the registration file, `$SUBJECTS_DIR`, the subject directory, and
  the requested annotation for every hemisphere
  ([`scripts/aparc2feat:176-214`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L176-L214)),
  failing fast with a specific message.
- **Format auto-detection.** The FEAT output type (`.img`/`.nii`/`.nii.gz`) is
  detected from `example_func` and reused for the output, so the labelled volume
  matches the analysis's file format
  ([`scripts/aparc2feat:79-81`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L79-L81)).
- **No silent data modification** of your functional data — the script only
  *adds* a labelled volume to `reg/freesurfer/`.

## Related Tools

- [[mri_label2vol]] — the engine that actually projects the surface annotation
  into the functional grid; all geometry happens here.
- [[aseg2feat]] — companion script for the **subcortical** `aseg` segmentation.
- [[reg2subject]] — reads the FreeSurfer subject name out of the registration
  file.
- [[feat2segstats]] — typical downstream consumer; computes per-segment summary
  statistics on FEAT volumes using an imported parcellation.
- [[feat2surf]] — the reverse mapping: FEAT statistics → FreeSurfer surface.
- [[mri_segstats]] — the lower-level per-segment statistics engine used by
  [[feat2segstats]].
- `reg-feat2anat` *(no wiki page yet)* — the prerequisite that creates
  `anat2exf.register.dat`.
- [[wiki/tools/mri_glmfit|mri_glmfit]] — FreeSurfer's native GLM; the
  FreeSurfer-internal alternative to running the GLM in FSL FEAT.

## Confidence and Gaps

**High confidence:** the complete flag set, the fixed `mri_label2vol`
invocation and `--proj frac 0 1 .1` projection, the output naming and location,
the reliance on `reg-feat2anat`/`reg2subject`, and the fatal-on-error behaviour
— all read directly from
[`scripts/aparc2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat).

> [!gap] Label-index lookup table version
> The help points at `Simple_surface_labels2002.txt` for the default `aparc`
> index→structure mapping. For `--a2005s`/`--a2009s` (Destrieux) the relevant
> lookup is the corresponding `aparc.annot.*.ctab` / `FreeSurferColorLUT.txt`
> entries; the script does not emit a colour table, so the user must match
> indices to names externally.

## References

- FreeSurfer source: [`scripts/aparc2feat`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat) (v8.2.0).
- Built-in help: `aparc2feat --help` (the `BEGINHELP` block,
  [`scripts/aparc2feat:253-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/aparc2feat#L253-L294)).
- Companion: `reg-feat2anat --help` and [[aseg2feat]].
