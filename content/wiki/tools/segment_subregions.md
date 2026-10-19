---
title: "segment_subregions"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "subregions/segment_subregions"
  - "python/gems/subregions/process.py"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[segmentHA_T1.sh]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[longitudinal-processing]]"
  - "[[asegstats2table]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-11
gaps:
  - "Per-structure label IDs, atlas files, and the mesh-fitting math live in gems.subregions.{thalamus,brainstem,hippocampus} and the GEMS C++ extension; only the driver-level behaviour is documented here from the entry-point script and process.py."
  - "The full set of accepted input image types is currently hard-coded to norm.mgz only; a source comment notes this is intended to be extended to multiple/variable inputs."
tags:
  - segmentation
  - subfields
  - thalamus
  - brainstem
  - hippocampus
  - amygdala
  - longitudinal
---

# segment_subregions

## Summary

`segment_subregions` is the unified FreeSurfer 8.x command-line entry point
for **subregion / subnuclei segmentation** of brain structures that recon-all
labels only coarsely. A single positional `structure` argument selects which
atlas to run — `thalamus`, `brainstem`, or `hippo-amygdala` — and the tool
performs either a **cross-sectional** (`--cross`) or a **longitudinal**
(`--long-base`) segmentation, writing labelled volumes and per-structure
volume tables into the subject's `mri/` directory. It is the Python/GEMS
successor to the older per-modality shell wrappers such as
[[segmentHA_T1.sh]].

## Source Information

- **Language:** Python (argparse entry point dispatching into the GEMS
  `subregions` package)
- **Source file(s):**
  - [`subregions/segment_subregions`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions) — the CLI driver
  - [`python/gems/subregions/process.py`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py) — `run_cross_sectional()` / `run_longitudinal()` orchestration and the `structure_names` registry
- **Binary/script location:** `$FREESURFER_HOME/bin/segment_subregions`

## Purpose and Context

recon-all's `aseg.mgz` carries the thalamus, brainstem, hippocampus, and
amygdala as single labels each. Three separate atlas-based methods subdivide
them:

- **thalamus** → thalamic nuclei (`ThalamicNuclei`)
- **brainstem** → brainstem substructures (`BrainstemSubstructures`)
- **hippo-amygdala** → hippocampal subfields + amygdaloid nuclei
  (`HippoAmygdalaSubfields`)

The mapping from structure name to model class is the `model_lookup`
dictionary at
[`python/gems/subregions/process.py:13-19`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L13-L19);
`structure_names` (the list shown in `--help`) is exactly its keys.

This tool consolidates what used to be a family of MCR shell wrappers into one
Python interface that runs the GEMS implementation directly and natively
supports longitudinal processing.

> [!gotcha] Relationship to segmentHA_T1.sh
> `segment_subregions hippo-amygdala --cross <subj>` covers the same anatomy
> as the legacy [[segmentHA_T1.sh]] (and its T2/T1T2 siblings), but uses the
> GEMS Python/C++ code path instead of the compiled MATLAB Runtime binary.
> Prefer this entry point in 8.x, especially for longitudinal subfield
> analysis.

## Inputs

### Required Inputs

```
segment_subregions STRUCTURE (--cross SUBJ | --long-base BASE) [options]
```

- **`STRUCTURE`** (positional) — one of `thalamus`, `brainstem`,
  `hippo-amygdala`. Validated against `model_lookup`; an unknown value is a
  fatal error.
- Exactly one process mode:
  - **`--cross SUBJ`** — cross-sectional segmentation of subject `SUBJ`.
  - **`--long-base BASE`** — longitudinal segmentation, where `BASE` is the
    base/template subject of a longitudinal stream.

Per-subject input volumes are read from `<subjects_dir>/<subj>/mri/`. The
input image and segmentation types are fixed in the driver at
[`subregions/segment_subregions:56-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L56-L57):

| File | Format | Role |
|------|--------|------|
| `mri/norm.mgz` | [[mgz]] | intensity-normalised T1 (`input_image_types`) |
| `mri/aseg.mgz` | [[mgz]] | reference whole-brain segmentation (`input_seg_type`) |
| `mri/wmparc.mgz` | [[mgz]] | **only for `hippo-amygdala`** — added as `wmParcFileName` ([`subregions/segment_subregions:91-93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L91-L93)) |

For `--long-base`, the set of timepoints is read from the **`base-tps`** file
inside the base subject; each line `TP` is expanded to the longitudinal
subject name `TP.long.BASE`
([`subregions/segment_subregions:103-104`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L103-L104)).

### Input Assumptions

> [!assumption] recon-all outputs must exist
> The driver expects `norm.mgz` and `aseg.mgz` (plus `wmparc.mgz` for
> hippo-amygdala) in each subject's `mri/` directory — i.e. the subject(s)
> must already be processed by [[wiki/pipelines/recon-all|recon-all]]. For
> longitudinal mode the base and all `*.long.BASE` timepoints must exist and a
> `base-tps` file must be present in the base subject.

> [!assumption] FREESURFER_HOME and SUBJECTS_DIR
> `FREESURFER_HOME` must be set or the tool aborts
> ([`subregions/segment_subregions:38-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L38-L39)).
> The subjects directory comes from `--sd` or, failing that, the
> `SUBJECTS_DIR` environment variable; if neither is set the tool aborts
> ([`subregions/segment_subregions:51-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L51-L53)).

> [!assumption] Single input modality
> Only `norm.mgz` is consumed. A source comment marks this as a known
> limitation to be extended later
> ([`subregions/segment_subregions:55-56`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L55-L56));
> there is no T2/FLAIR input path in this driver.

## Outputs

Per the driver, output segmentations and computed structure volumes are saved
to each subject's `mri/` subdirectory (the default `outDir` at
[`subregions/segment_subregions:88`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L88)),
unless redirected with `--out-dir` (cross-sectional only). An optional
`--suffix` is appended to output filenames (the `fileSuffix` parameter,
[`subregions/segment_subregions:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L30)
and `:71`).

### Files Created

The exact filenames are constructed inside each structure's model class
(`extract_segmentation()` / `postprocess_segmentation()` in
`gems.subregions`), so they are not enumerated literally in this driver. What
the driver guarantees:

- a labelled subregion **segmentation volume** per structure (and per
  hemisphere for `hippo-amygdala`, which loops over `['left','right']` at
  [`subregions/segment_subregions:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L60-L63)),
- a **volume table** of the computed per-structure volumes,
- written into `mri/` (or `--out-dir`), with `--suffix` appended and, in
  longitudinal mode, a `.long` tag added to the suffix
  ([`python/gems/subregions/process.py:95-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L95-L99)).

> [!gap] Literal output filenames and label IDs
> The on-disk filenames and the integer label scheme for each atlas are set by
> the model classes in `gems.subregions.{thalamus,brainstem,hippocampus}` and
> are not visible in the entry-point script. Treat the per-structure label IDs
> as atlas-specific, not as standard [[color-lut]] / `aseg` labels.

### Output Specifications

Segmentations are produced in the subject's anatomical (conformed T1) space.
Volume tables are intended to be collated across subjects with
[[asegstats2table]] for group analysis.

## Mathematical Foundations

The driver itself only configures parameters and dispatches. The
cross-sectional pipeline is a four-step Bayesian atlas-fit, made explicit by
the progress prints in
[`python/gems/subregions/process.py:33-77`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L33-L77):

1. **Preprocess** inputs (`model.initialize()`).
2. **Align** the probabilistic atlas to the reference segmentation
   (`align_atlas_to_seg()`).
3. **Fit the mesh to the reference segmentation** (`fit_mesh_to_seg()`).
4. **Fit the mesh to the image** (`fit_mesh_to_image()`), then
   `extract_segmentation()` and `postprocess_segmentation()`.

> [!math] Longitudinal determinant correction
> In longitudinal mode the timepoint segmentations are affinely aligned to the
> base purely from the segmentations, and the **determinant of that transform
> is retained so the final per-timepoint volume estimates can be divided by
> it** — i.e. volumes are reported in native, not base, scale
> ([`python/gems/subregions/process.py:111-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L111-L120)).
> This is a key correctness detail of the unbiased longitudinal design.

> [!internal] Atlas fit implementation
> The mesh deformation, Gaussian-mixture appearance model, and optimisation
> are implemented in the GEMS C++ extension exposed through `gems` and used by
> the per-structure model classes. The published references (Iglesias 2015 for
> hippocampus; the thalamic-nuclei and brainstem atlas papers) describe the
> generative model.

## Configuration Options

### Complete Flag Reference

All flags are defined by `argparse` at
[`subregions/segment_subregions:25-35`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L25-L35).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `structure` | string (positional) | (required) | Atlas to run: `thalamus`, `brainstem`, or `hippo-amygdala` ([`:26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L26)) |
| `--cross` | string | — | Subject to segment cross-sectionally ([`:27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L27)) |
| `--long-base` | string | — | Base subject for longitudinal analysis; timepoints read from its `base-tps` file ([`:28`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L28)) |
| `--sd` | string | `$SUBJECTS_DIR` | Subjects directory; overrides the `SUBJECTS_DIR` env var ([`:29`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L29)) |
| `--suffix` | string | `""` (empty) | Output filename suffix ([`:30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L30)) |
| `--temp-dir` | string | auto | Alternative temp directory; deleted afterwards unless `--debug` ([`:31`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L31)) |
| `--out-dir` | string | `<subj>/mri` | Alternative output directory (**cross-sectional only**) ([`:32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L32)) |
| `--debug` | flag | off | Write intermediate debugging outputs (and keep the temp dir) ([`:33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L33)) |
| `--threads` | int | `1` | Number of threads the GEMS code may use ([`:34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L34)) |

### Configuration Interactions

> [!gotcha] `--cross` and `--long-base` are mutually exclusive and one is required
> Specifying both is a fatal error; specifying neither is also a fatal error
> ([`subregions/segment_subregions:45-48`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L45-L48)).

- `--out-dir` is honoured **only** in cross-sectional mode — it is passed as
  `out_dir` for `--cross` and ignored for the longitudinal path
  ([`subregions/segment_subregions:96-99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L96-L99)).
- `--temp-dir` is removed at the end unless `--debug` is given.
- `--threads` is applied immediately via `subregions.set_thread_count()`
  ([`subregions/segment_subregions:41-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L41-L42)).
- For `hippo-amygdala`, the driver runs the model **twice** (left then right
  hemisphere); other structures run once
  ([`subregions/segment_subregions:60-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L60-L63)).

## Typical Use Cases

### Use Case 1: Cross-sectional thalamic nuclei

```bash
export SUBJECTS_DIR=/data/subjects
segment_subregions thalamus --cross bert
```

### Use Case 2: Cross-sectional hippocampal subfields + amygdala

```bash
segment_subregions hippo-amygdala --cross bert --threads 4
```

Runs both hemispheres; writes subfield and amygdala-nucleus segmentations and
volumes into `bert/mri/`.

### Use Case 3: Longitudinal brainstem segmentation

```bash
# 'base' must be a longitudinal base subject with a base-tps file,
# and each timepoint must already be processed as TP.long.base
segment_subregions brainstem --long-base base
```

Timepoints are taken from `SUBJECTS_DIR/base/base-tps`, each expanded to
`TP.long.base`.

## Pipeline Context

A **post-recon-all** add-on, not invoked by recon-all itself
(`recon_all_stage: null`). Cross-sectional mode follows the standard
recon-all stream; longitudinal mode follows the
[[longitudinal-processing]] stream (base + `*.long.base` timepoints). Outputs
feed group analysis through [[asegstats2table]].

**Predecessor:** [[wiki/pipelines/recon-all|recon-all]] (or
[[longitudinal-processing]]) → **This tool** → **Successor:**
[[asegstats2table]]

## Gotchas and Caveats

> [!gotcha] Longitudinal timepoints come from base-tps, not the command line
> You do not list timepoints on the command line for `--long-base`. The driver
> opens `SUBJECTS_DIR/<base>/base-tps`, reads one timepoint per non-empty
> line, and forms `TP.long.<base>` for each
> ([`subregions/segment_subregions:102-106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L102-L106)).
> A missing or empty `base-tps` means no timepoints are processed.

> [!gotcha] Volumes are native-scale, not base-scale
> Longitudinal volume estimates are divided by the determinant of the
> timepoint→base affine so they reflect native anatomy
> ([`python/gems/subregions/process.py:111-120`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L111-L120)).

## Error Compensation and Guard Rails

- Fatal-errors out if `FREESURFER_HOME` is unset, if the subjects directory
  cannot be resolved, or if the cross/longitudinal mode selection is invalid
  ([`subregions/segment_subregions:38-53`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/subregions/segment_subregions#L38-L53)).
- An unknown `structure` value is rejected with the list of valid options
  ([`python/gems/subregions/process.py:22-30`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/python/gems/subregions/process.py#L22-L30)).

## Related Tools

- [[segmentHA_T1.sh]] — legacy MCR wrapper for the hippocampus/amygdala
  segmentation that `segment_subregions hippo-amygdala` supersedes
- [[wiki/pipelines/recon-all|recon-all]] — produces the required `norm.mgz`,
  `aseg.mgz`, `wmparc.mgz`
- [[longitudinal-processing]] — the base/timepoint stream used by `--long-base`
- [[asegstats2table]] — collates the per-structure volume tables across
  subjects
- [[color-lut]] — standard FreeSurfer label scheme (note: subregion atlas
  labels are atlas-specific, not standard `aseg` IDs)

## Confidence and Gaps

The CLI, mode selection, input/output directory logic, hemisphere looping, and
the longitudinal determinant correction are all directly readable and
documented above with high confidence.

> [!gap] Atlas internals and exact filenames
> The label sets, atlas mesh files, and the deformation/appearance
> optimisation are inside `gems.subregions.{thalamus,brainstem,hippocampus}`
> and the compiled GEMS extension; the literal output filenames are produced
> there. These were not opened for this page.

## References

- Iglesias, J.E., et al. (2015). *A computational atlas of the hippocampal
  formation using ex vivo, ultra-high resolution MRI…* NeuroImage 115,
  117–137.
- Saygin, Z.M. & Kliemann, D., et al. (2017). *High-resolution MRI reveals
  nuclei of the human amygdala…* NeuroImage 155, 370–382.
- FreeSurfer wiki: subregion segmentation modules (thalamic nuclei, brainstem
  substructures, hippocampal subfields).
