---
title: "isolate_labels.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/isolate_labels.csh"
families: []                     # standalone label-extraction script (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
  - "[[label-format]]"
  - "[[isolate_labels_keeporigval.csh]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Relies on FSL (fslstats) being on PATH; FreeSurfer does not bundle FSL, so behaviour when FSL is absent was not exercised."
tags:
  - segmentation
  - labels
  - extraction
  - shape-analysis
  - fsl
---

# isolate_labels.csh

## Summary

`isolate_labels.csh` splits a multi-label segmentation volume into a set of
**single-label binary masks**, writing one mask file per label. For every label
it finds (or for one label named with `--L`/`--l`), it calls [[mri_binarize]]
with `--match` to produce a volume that is 1 inside that label and 0 everywhere
else, saved as `<outprefix>_label<ID>.mgz`. With `--keepval` the inside value is
set to the label ID itself instead of 1. The intended downstream use is
per-structure shape analysis, where each structure must live in its own volume.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/isolate_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh)
- **Original author:** Lilla Zollei (2011-02-14)
- **Binary/script location:** `$FREESURFER_HOME/bin/isolate_labels.csh`
- **External tools invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L95) (the actual mask extraction), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L49) (to obtain a NIfTI copy), and the **FSL** utility `fslstats` ([`scripts/isolate_labels.csh#L58`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L58)) for range/histogram queries.

## Purpose and Context

Shape-analysis and morphometry pipelines often need each anatomical structure as
its own image — a single binary object whose surface or skeleton can be
extracted independently. A FreeSurfer segmentation such as `aseg.mgz` packs dozens
of structures into one integer-valued volume, so a splitting step is required.
`isolate_labels.csh` is that splitting step: it enumerates the labels present in
the volume and emits one mask file per label.

It is a **standalone helper**, not part of [[wiki/pipelines/recon-all|recon-all]].
It is typically run by hand after a segmentation exists. The companion script
[[isolate_labels_keeporigval.csh]] performs the same split but always writes the
original label value (via FSL `fslmaths`) rather than a 0/1 mask — see
[Related Tools](#related-tools) for the precise difference.

> [!gotcha] One file per label, not a single "rest-zeroed" volume
> Despite the name, the script does **not** produce a single segmentation with
> the unselected labels zeroed. It writes a **separate** mask volume for every
> label, named `<outprefix>_label<ID>.mgz`
> ([`scripts/isolate_labels.csh#L95-L98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L95-L98)). Run with `--L <ID>` to
> isolate just one structure into one file.

## Inputs

### Required Inputs

- **Label (segmentation) volume** — given with `--vol`. Any format
  [[wiki/tools/mri_convert|mri_convert]] can read (`mgz`, `nii.gz`, …). The voxel
  values are integer structure IDs (e.g. an [[mri_aparc2aseg|aparc+aseg]] or
  `aseg.mgz`).
- **Output prefix** — given with `--outprefix`. The per-label filenames are built
  by appending `_label<ID>.mgz` to this prefix.

### Input Assumptions

> [!assumption] Integer labels, FSL on PATH
> The script assumes the volume holds **integer** label IDs and that the
> third-party **FSL** package is installed and on `PATH` — it shells out to
> `fslstats` to find the data range and a per-value histogram
> ([`scripts/isolate_labels.csh#L58-L63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L58-L63)). FreeSurfer does **not**
> bundle FSL. The histogram approach implicitly assumes labels are non-negative
> and reasonably contiguous, because it allocates one histogram bin per integer
> between the volume min and max.

> [!gotcha] Input is silently converted to NIfTI in place
> If the input is not already gzipped (`${labelvol:e} != gz`), the script runs
> `mri_convert <vol> <vol-stem>.nii.gz`, writes that `.nii.gz` **next to your
> input file**, operates on it, and deletes it at the end
> ([`scripts/isolate_labels.csh#L48-L54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L48-L54), [`#L104-L106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L104-L106)). A pre-existing
> `<stem>.nii.gz` in that directory would be overwritten and then removed.

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `<outprefix>_label<ID>.mgz` | [[mgz]] | One file per isolated label: 1 inside the label, 0 elsewhere (or `<ID>` inside with `--keepval`). |

One such file is written for **each** label processed (all labels by default, or
the single `--L` label). The geometry (dimensions, voxel size, vox2ras) is
inherited unchanged from the input via [[mri_binarize]].

### Output Specifications

The masks are 8-bit/integer volumes on the input grid. The "inside" value is `1`
by default; with `--keepval` it is the label ID, passed as `mri_binarize
--binval <ID>` ([`scripts/isolate_labels.csh#L95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L95)). Everything not matching
the label is `0`.

## Mathematical Foundations

None of substance — this is a **dispatcher**. The only arithmetic it does itself
is integer bin-counting to discover which labels exist:

> [!math] Label discovery by histogram
> With no `--L`, the script asks FSL for the intensity range
> $[\,min,\,max\,]$ via `fslstats -R`, allocates $bins = (max - min) + 1$ bins,
> requests a histogram `fslstats -H $bins $min $max`, and treats every bin with a
> non-zero count as a present label
> ([`scripts/isolate_labels.csh#L57-L74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L57-L74)). The label value for bin $k$
> (1-indexed) is $min + (k-1)$, i.e. one integer per bin. The actual masking is
> delegated to [[mri_binarize]] `--match`.

## Configuration Options

### Complete Flag Reference

All flags are from the argument parser
([`scripts/isolate_labels.csh#L114-L148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L114-L148)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol` | string | *(required)* | Input label/segmentation volume (any [[wiki/tools/mri_convert|mri_convert]]-readable format). |
| `--outprefix` | string | *(required)* | Prefix for the output mask files; each becomes `<outprefix>_label<ID>.mgz`. |
| `--L`<br>`--l` | integer | all labels | Isolate only this one label ID. Turns off the "all labels" sweep (`doAll = 0`). |
| `--keepval` | bool | off (mask = 1) | Write the original label ID as the inside value (`mri_binarize --binval <ID>`) instead of `1`. |
| `--version` | bool | — | Print the version string and exit. |
| `--help` | bool | — | Print help (the `BEGINHELP` block) and exit. |

### Configuration Interactions

> [!gotcha] `--L`/`--l` disables auto-discovery; otherwise every label is written
> Supplying `--L <ID>` (or `--l <ID>`) sets `doAll = 0`, so only that label is
> processed ([`scripts/isolate_labels.csh#L134-L139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L134-L139)). Without it, the
> FSL histogram is scanned and **one file per present label** is emitted — which
> for a whole-brain `aseg` can be dozens of files. `--L` and `--l` are exact
> synonyms.

- `--keepval` only changes the inside value; it does not change which voxels are
  selected. It is the in-script equivalent of the separate
  [[isolate_labels_keeporigval.csh]] tool (which instead multiplies the mask by
  the ID with FSL `fslmaths`).

## Typical Use Cases

### 1. Split an entire aseg into per-structure binary masks

```bash
# One 0/1 mask per structure present in aseg.mgz
isolate_labels.csh --vol $SUBJECTS_DIR/bert/mri/aseg.mgz \
  --outprefix /tmp/bert/aseg
# → /tmp/bert/aseg_label10.mgz, /tmp/bert/aseg_label11.mgz, ...
```

### 2. Isolate a single structure, preserving its ID

```bash
# Left thalamus (ID 10), with value 10 inside instead of 1
isolate_labels.csh --vol aseg.mgz --outprefix /tmp/thal --L 10 --keepval
# → /tmp/thal_label10.mgz   (voxels = 10 inside, 0 outside)
```

## Pipeline Context

`isolate_labels.csh` is a **standalone** post-segmentation utility. It is **not**
called by [[wiki/pipelines/recon-all|recon-all]] or `trac-all`
(`grep` of both finds no reference).

**Predecessor:** a segmentation volume — e.g. from
[[wiki/pipelines/recon-all|recon-all]] (`aseg.mgz`,
[[mri_aparc2aseg|aparc+aseg.mgz]]) or [[wiki/tools/samseg|samseg]] →
**isolate_labels.csh** → **Successor:** per-structure shape/morphometry analysis
(surface extraction, skeletonisation), or [[mri_segstats]] on individual masks.

## Gotchas and Caveats

> [!gotcha] Each label triggers its own FSL volume query
> Before each `mri_binarize`, the script runs `fslstats -l <ID-1> -u <ID+1> -v`
> to print the voxel count and volume for the label
> ([`scripts/isolate_labels.csh#L86-L92`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L86-L92)). This is informational only, but it
> means FSL is invoked many times for a whole-brain segmentation.

> [!gotcha] Histogram binning can be huge for sparse high IDs
> Because the histogram allocates one bin per integer from `min` to `max`, a
> volume whose labels include large IDs (e.g. cortical-parcellation IDs in the
> thousands) allocates that many bins. It still works, but is wasteful; the
> tool was designed for compact subcortical label sets.

> [!gotcha] No write-directory check on `--outprefix`
> Unlike [[isolate_labels_keeporigval.csh]]'s sibling logic in other scripts, the
> output directory implied by `--outprefix` is not created; the parent directory
> must already exist or `mri_binarize` will fail to write.

## Error Compensation and Guard Rails

- **Format normalisation:** non-gzipped inputs are auto-converted to `.nii.gz`
  for the FSL stage and the temporary copy is removed afterward
  ([`scripts/isolate_labels.csh#L48-L54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L48-L54), [`#L104-L106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L104-L106)).
- **Required-argument checks:** missing `--vol` or `--outprefix` aborts with an
  error ([`scripts/isolate_labels.csh#L153-L163`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh#L153-L163)).
- No guard rail exists for a missing FSL installation; the `fslstats` call would
  simply fail.

## Related Tools

- [[mri_binarize]] — does the actual per-label extraction (`--match`, `--binval`); this script is essentially a loop around it.
- [[isolate_labels_keeporigval.csh]] — the sibling script. It always preserves the original value, but does so by `mri_binarize` **then FSL `fslmaths -mul <ID>`**, and writes `.nii.gz` (not `.mgz`). In this script, value preservation is instead a single `mri_binarize --binval` call enabled by `--keepval`.
- [[mri_segstats]] — compute statistics (volume, intensity) over a segmentation or over the isolated masks.
- [[label-format]] — FreeSurfer's surface `.label` format (a different, vertex-list, notion of "label"); this tool works on **volume** integer labels, not `.label` files.
- [[wiki/tools/mri_convert|mri_convert]] — used internally to produce the NIfTI working copy.

## Confidence and Gaps

**High confidence:** complete flag set, the one-file-per-label output convention,
the `--keepval`→`--binval` mapping, the FSL dependency, and the in-place NIfTI
conversion — all read directly from
[`scripts/isolate_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh) and confirmed against `--help`.

> [!gap] FSL must be present
> The script hard-depends on `fslstats`, which FreeSurfer does not ship. Its
> behaviour on a system without FSL was not exercised.

## References

- FreeSurfer source: [`scripts/isolate_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels.csh) (v8.2.0).
- Built-in help: `isolate_labels.csh --help`.
