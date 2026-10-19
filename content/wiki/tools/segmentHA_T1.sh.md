---
title: "segmentHA_T1.sh"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "HippoSF/segmentHA_T1.sh"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[segment_subregions]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[checkMCR.sh]]"
  - "[[mri_segstats]]"
  - "[[asegstats2table]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "The internal segmentation algorithm in run_segmentSubjectT1_autoEstimateAlveusML.sh (a compiled MATLAB/MCR binary) is not visible from this wrapper; the deformable-atlas fitting and Bayesian segmentation math is documented at the level the wrapper exposes only."
  - "Exact list of subfield and amygdala-nucleus labels emitted is not enumerated in this script; it is fixed by the atlas (AtlasMesh.gz) and compressionLookupTable.txt."
tags:
  - segmentation
  - hippocampus
  - amygdala
  - subfields
  - matlab-runtime
---

# segmentHA_T1.sh

## Summary

`segmentHA_T1.sh` segments the **hippocampal subfields** and the **nuclei of
the amygdala** from the T1-weighted scan that was already processed by the
main FreeSurfer pipeline ([[wiki/pipelines/recon-all|recon-all]]). It is a
tcsh wrapper that, for each hemisphere, calls a compiled MATLAB Runtime (MCR)
binary which fits a probabilistic atlas of the hippocampal formation to the
subject's intensities and produces per-structure volume tables and labelled
segmentation volumes. It is the "T1-only" entry point of the
HippoSF/amygdala module (a companion script handles the additional T1+T2 and
T2-only modes).

## Source Information

- **Language:** tcsh
- **Source file(s):** [`HippoSF/segmentHA_T1.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh)
- **Binary/script location:** `$FREESURFER_HOME/bin/segmentHA_T1.sh`
- **Compiled worker:** `run_segmentSubjectT1_autoEstimateAlveusML.sh` (an MCR
  wrapper around the segmentation binary), invoked at
  [`HippoSF/segmentHA_T1.sh:219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L219).

## Purpose and Context

The standard `aseg.mgz` from recon-all treats the hippocampus and amygdala as
single labels. This module subdivides them into anatomically meaningful
subregions using a Bayesian segmentation driven by an *ex vivo*, ultra-high
resolution atlas of the hippocampal formation (Iglesias et al., 2015) and a
manually-labelled atlas of the amygdaloid nuclei (Saygin & Kliemann et al.,
2017).

Because the segmentation is *adaptive* (it estimates the appearance of each
structure from the subject's own intensities rather than relying on a fixed
intensity model), the same atlas can be applied to scans of differing
contrast and resolution. This script targets the case where the **only**
input is the T1 that recon-all already used.

> [!gotcha] Newer unified entry point exists
> In FreeSurfer 8.x the subregion modules were consolidated under the
> Python driver [[segment_subregions]] (`segment_subregions hippo-amygdala
> --cross <subj>`), which calls the GEMS Python implementation rather than
> the MCR binaries used here. `segmentHA_T1.sh` remains available and is the
> historical/T1-specific wrapper. See [[segment_subregions]] for the
> structure-name-based interface and longitudinal mode.

## Inputs

### Required Inputs

The script takes positional arguments only:

```
segmentHA_T1.sh SUBJECT_ID [SUBJECT_DIR]
```

- **`SUBJECT_ID`** — the name of a subject directory under `$SUBJECTS_DIR`
  that has **already been processed with recon-all**.
- **`SUBJECT_DIR`** (optional) — a subjects directory that overrides (or
  substitutes for) the `SUBJECTS_DIR` environment variable. When supplied it
  is resolved to an absolute path with `getfullpath` at
  [`HippoSF/segmentHA_T1.sh:100`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L100).

The wrapper itself reads no flags. The only special arguments are `--help`
(prints usage and citations, exits 0) and the bare/over-long argument count
(prints usage, exits 1), handled at
[`HippoSF/segmentHA_T1.sh:20-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L20-L74).

The worker binary consumes recon-all outputs from the subject's `mri/`
directory. The wrapper explicitly checks for three of them before running, at
[`HippoSF/segmentHA_T1.sh:127-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L127-L135):

| File | Format | Role |
|------|--------|------|
| `mri/wmparc.mgz` | [[mgz]] | white-matter + cortical parcellation, used to constrain the fit |
| `mri/norm.mgz` | [[mgz]] | intensity-normalised, skull-stripped T1 (the appearance data) |
| `mri/transforms/talairach.xfm` | xfm | affine talairach transform (atlas initialisation) |

### Input Assumptions

> [!assumption] recon-all must be complete
> The subject must have been processed far enough that `wmparc.mgz`,
> `norm.mgz` and `talairach.xfm` exist. If any is missing the script aborts
> with "Has the subject been procesed with recon-all?"
> ([`HippoSF/segmentHA_T1.sh:127-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L127-L135)).

> [!assumption] High-resolution scans need recon-all -cm
> The `--help` text states that to analyse sub-millimetre scans at their
> native resolution they must first have been processed with the recon-all
> `-cm` (conform-to-min) flag
> ([`HippoSF/segmentHA_T1.sh:44-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L44-L45)).
> Standard 1 mm and high-resolution T1 scans are both supported.

## Outputs

The wrapper writes a per-hemisphere log and, after the worker finishes,
derives `.stats` files from the worker's volume tables. Files are written to
the subject's `mri/` and `stats/` directories. `$SUFFIX` is hard-coded to
`v22` ([`HippoSF/segmentHA_T1.sh:185`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L185)).

### Files Created

| File (under `$SUBJECTS_DIR/$SUBJECT_ID/`) | Created by | Contents |
|---|---|---|
| `mri/{lh,rh}.hippoSfVolumes-T1.v22.txt` | MCR worker | per-subfield volumes (mm³), one structure per line |
| `mri/{lh,rh}.amygNucVolumes-T1.v22.txt` | MCR worker | per-amygdala-nucleus volumes (mm³) |
| `mri/{lh,rh}.hippoAmygLabels-T1.v22.*` | MCR worker | labelled subfield/nucleus segmentation volume(s) |
| `stats/hipposubfields.{lh,rh}.T1.v22.stats` | this wrapper | volume table reformatted for [[asegstats2table]] |
| `stats/amygdalar-nuclei.{lh,rh}.T1.v22.stats` | this wrapper | amygdala-nucleus volume table for [[asegstats2table]] |
| `scripts/hippocampal-subfields-T1.log` | this wrapper | full run log |

> [!gotcha] The generated `.stats` files are deliberately impoverished
> The wrapper builds the `.stats` files from the worker's `.txt` tables with a
> one-line `awk` transform at
> [`HippoSF/segmentHA_T1.sh:253-258`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L253-L258).
> A source comment warns that **voxel counts are set to 0, there is no
> intensity information, and the segmentation IDs in these files are
> meaningless** — only the volume (mm³) and the structure name are valid. The
> comment notes [[mri_segstats]] could be used instead, but then the volumes
> would *not* include the partial-volume correction that the atlas method
> provides
> ([`HippoSF/segmentHA_T1.sh:244-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L244-L249)).
> The files exist purely so that `asegstats2table` can collate volumes across
> subjects.

### Output Specifications

The atlas/segmentation is computed in the conformed T1 space of the subject.
The label numbering is defined by the atlas compression lookup table
(`compressionLookupTable.txt`), not by the standard FreeSurfer [[color-lut]];
the per-structure label IDs printed into the `.stats` files are sequential
line numbers and must not be interpreted as `aseg` labels (see gotcha above).

## Mathematical Foundations

The wrapper does not implement the segmentation; it parameterises and launches
the compiled worker. The fixed parameters passed at
[`HippoSF/segmentHA_T1.sh:177-219`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L177-L219)
are the only mathematical "knobs" visible from this script:

| Parameter | Value | Meaning (as exposed by the wrapper) |
|---|---|---|
| `RESOLUTION` | `0.333…` mm | working resolution at which the atlas mesh is fit (sub-millimetre) |
| `ATLASMESH` | `average/HippoSF/atlas/AtlasMesh.gz` | the deformable probabilistic atlas mesh |
| `ATLASDUMP` | `average/HippoSF/atlas/AtlasDump.mgz` | rasterised atlas priors |
| `LUT` | `average/HippoSF/atlas/compressionLookupTable.txt` | maps mesh classes to label names |
| `K` | `0.05` | mesh stiffness / regularisation weight of the deformation |
| `OPTIMIZER` | `L-BFGS` | optimiser used to fit the mesh to the data |
| `MRFCONSTANT` | `0` | Markov-random-field smoothing constant (0 = off) |

> [!internal] Actual algorithm is in the MCR binary
> The Bayesian generative-model fit (atlas deformation + Gaussian appearance
> estimation per structure) lives in the compiled
> `segmentSubjectT1_autoEstimateAlveusML` program. The published method is in
> Iglesias et al. (2015); the wrapper only supplies the atlas files and
> hyper-parameters above.

> [!math] Resolution choice
> The fit is performed at $\approx 0.33\,\text{mm}$ isotropic regardless of
> the input voxel size, which is finer than a standard 1 mm T1 — the atlas
> super-samples in order to place subfield boundaries with sub-voxel
> precision.

## Configuration Options

### Complete Flag Reference

This script has **no option flags**; behaviour is fixed and driven entirely by
the two positional arguments.

| Argument | Type | Default | Description |
|------|------|---------|-------------|
| `SUBJECT_ID` | string (positional 1) | (required) | recon-all subject to process |
| `SUBJECT_DIR` | string (positional 2) | `$SUBJECTS_DIR` | override the subjects directory ([`HippoSF/segmentHA_T1.sh:99-101`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L99-L101)) |
| `--help` | flag | — | print description + citations and exit 0 ([`HippoSF/segmentHA_T1.sh:34-74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L34-L74)) |

### Environment Variables Consulted

| Variable | Effect |
|---|---|
| `SUBJECTS_DIR` | subjects directory if positional 2 omitted ([`HippoSF/segmentHA_T1.sh:77-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L77-L96)) |
| `FREESURFER_HOME` | locates the MCR runtime (`MCRv97/`) and atlas files ([`HippoSF/segmentHA_T1.sh:177-181`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L177-L181)) |
| `ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS` | thread cap for ITK; **set to 1 if unset** ([`HippoSF/segmentHA_T1.sh:158-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L158-L160)) |

### Configuration Interactions

There are no flags to combine. The only interaction is between the two
positional arguments: supplying a second argument overrides `SUBJECTS_DIR`;
omitting it requires `SUBJECTS_DIR` to be set and non-empty (otherwise the
script aborts at
[`HippoSF/segmentHA_T1.sh:77-96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L77-L96)).

## Typical Use Cases

### Use Case 1: Standard subfield + amygdala segmentation

```bash
# After recon-all has finished for subject "bert"
export SUBJECTS_DIR=/data/subjects
segmentHA_T1.sh bert
```

Produces left and right hippocampal-subfield and amygdala-nucleus
segmentations and volume tables in `bert/mri/` and `bert/stats/`.

### Use Case 2: Override the subjects directory

```bash
segmentHA_T1.sh bert /data/other_study/subjects
```

Runs against `bert` under a different subjects directory without changing the
exported `SUBJECTS_DIR`.

### Use Case 3: High-resolution native-space analysis

```bash
# Sub-millimetre T1 must have been recon-all'd with -cm first
recon-all -s bert_hires -i hires_T1.nii.gz -all -cm
segmentHA_T1.sh bert_hires
```

## Pipeline Context

This is a **post-recon-all** add-on; it is not invoked by recon-all itself
(`recon_all_stage: null`). It depends on the cross-sectional recon-all stream
having produced `norm.mgz`, `wmparc.mgz` and `talairach.xfm`. Its outputs feed
group analysis via [[asegstats2table]].

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] → **This tool** → **Successor:** [[asegstats2table]]

For the modern unified driver (and for longitudinal subfield analysis), use
[[segment_subregions]].

## Gotchas and Caveats

> [!gotcha] IsRunning lock file
> Before running, the script writes a lock file
> `scripts/IsRunningHPsubT1.lh+rh` and refuses to start if it already exists,
> printing the offending file and the `rm` command needed to clear a stale
> lock ([`HippoSF/segmentHA_T1.sh:138-155`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L138-L155)).
> A crash leaves the lock behind, so a re-run after an unexpected death
> requires deleting it manually.

> [!gotcha] MCR must be installed
> The first thing the script does is call [[checkMCR.sh]]; if the MATLAB
> Compiler Runtime is missing it exits with status 1 before doing anything
> else ([`HippoSF/segmentHA_T1.sh:13-16`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L13-L16)).
> The runtime used is `$FREESURFER_HOME/MCRv97/`
> ([`HippoSF/segmentHA_T1.sh:177`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L177)).

> [!gotcha] tcsh 6.17.06 exit-code workaround
> The script detects tcsh 6.17.06 (which has an exit-code bug) and sets
> `anyerror` to force expected behaviour
> ([`HippoSF/segmentHA_T1.sh:3-10`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L3-L10)).

## Error Compensation and Guard Rails

- Aborts early if the subjects directory, the subject directory, or the three
  required recon-all outputs are missing
  ([`HippoSF/segmentHA_T1.sh:107-135`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L107-L135)).
- Caps ITK threads at 1 when unset, preventing runaway parallelism
  ([`HippoSF/segmentHA_T1.sh:158-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L158-L160)).
- On worker failure it removes the IsRunning lock and exits 1, so the next run
  is not blocked ([`HippoSF/segmentHA_T1.sh:230-241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/HippoSF/segmentHA_T1.sh#L230-L241)).

## Related Tools

- [[segment_subregions]] — newer, unified Python driver that supersedes the
  per-modality HippoSF wrappers; `hippo-amygdala` structure reproduces this
  segmentation and adds a longitudinal mode
- [[wiki/pipelines/recon-all|recon-all]] — mandatory upstream processing that
  produces the required `norm.mgz`, `wmparc.mgz`, `talairach.xfm`
- [[checkMCR.sh]] — verifies the MATLAB Runtime that the worker binary needs
- [[asegstats2table]] — collates the generated `.stats` volume tables across
  subjects
- [[mri_segstats]] — the general segmentation-statistics tool the wrapper
  deliberately *avoids* (it would drop the atlas partial-volume correction)
- [[color-lut]] — the standard FreeSurfer label scheme, which the subfield
  `.stats` IDs do **not** follow

## Confidence and Gaps

The wrapper's control flow, inputs, outputs, lock-file logic, and
hyper-parameters are fully readable and documented above with high confidence.

> [!gap] Segmentation internals
> The deformable-atlas fitting, per-structure appearance estimation, and the
> exact label set are inside the compiled MCR binary
> (`segmentSubjectT1_autoEstimateAlveusML`) and cannot be verified from this
> script. The published method (Iglesias 2015; Saygin/Kliemann 2017) is the
> authoritative reference for the algorithm.

## References

- Iglesias, J.E., Augustinack, J.C., Nguyen, K., et al. (2015). *A
  computational atlas of the hippocampal formation using ex vivo,
  ultra-high resolution MRI: Application to adaptive segmentation of in vivo
  MRI.* NeuroImage 115, 117–137.
  <http://dx.doi.org/10.1016/j.neuroimage.2015.04.042>
- Saygin, Z.M. & Kliemann, D. (joint 1st authors), Iglesias, J.E., et al.
  (2017). *High-resolution magnetic resonance imaging reveals nuclei of the
  human amygdala: manual segmentation to automatic atlas.* NeuroImage 155,
  370–382. <http://doi.org/10.1016/j.neuroimage.2017.04.046>
- FreeSurfer wiki: *Hippocampal Subfields and Nuclei of the Amygdala* —
  <https://surfer.nmr.mgh.harvard.edu/fswiki/HippocampalSubfieldsAndNucleiOfAmygdala>
