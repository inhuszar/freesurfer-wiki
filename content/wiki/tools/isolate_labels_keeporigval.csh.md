---
title: "isolate_labels_keeporigval.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/isolate_labels_keeporigval.csh"
families: []                     # standalone label-extraction script
recon_all_stage: null
related:
  - "[[isolate_labels.csh]]"
  - "[[mri_binarize]]"
  - "[[mri_segstats]]"
  - "[[label-format]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hard-depends on FSL (fslstats, fslmaths) on PATH; FreeSurfer does not bundle FSL, so absence-of-FSL behaviour was not exercised."
tags:
  - segmentation
  - labels
  - extraction
  - shape-analysis
  - fsl
---

# isolate_labels_keeporigval.csh

## Summary

`isolate_labels_keeporigval.csh` splits a multi-label segmentation into
**one volume per label**, where each output keeps the **original label value**
(not a 0/1 mask). For each label it runs [[mri_binarize]] `--match` to build a
binary mask, then multiplies that mask by the label ID with the **FSL** tool
`fslmaths -mul`, producing `<outprefix>_label<ID>.origval.nii.gz`. It is the
value-preserving twin of [[isolate_labels.csh]] and is intended for
per-structure shape analysis.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/isolate_labels_keeporigval.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh)
- **Original author:** Lilla Zollei (2012-05-31)
- **Binary/script location:** `$FREESURFER_HOME/bin/isolate_labels_keeporigval.csh`
- **External tools invoked:** [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L95) (mask extraction), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L50) (NIfTI working copy), and the **FSL** utilities `fslstats` ([`#L59`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L59)) and `fslmaths` ([`#L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L96)).

## Purpose and Context

This is the value-preserving companion to [[isolate_labels.csh]]. Both exist to
break a packed segmentation (e.g. `aseg.mgz`) into individual single-structure
volumes for shape/morphometry work. The difference is the output value: the plain
script writes a binary mask (or, with `--keepval`, uses `mri_binarize --binval`),
whereas **this** script always emits the structure carrying its **own integer
ID** as the foreground value, accomplished by an extra FSL multiplication step.

It is a **standalone** helper run by hand after segmentation; it is **not** part
of [[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] One value-carrying file per label, output as `.nii.gz`
> The script writes a **separate** file for every label,
> `<outprefix>_label<ID>.origval.nii.gz`, with the label ID as the foreground
> value ([`scripts/isolate_labels_keeporigval.csh#L95-L97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L95-L97)). Note the output
> is **NIfTI** here, whereas [[isolate_labels.csh]] writes `.mgz`.

## Inputs

### Required Inputs

- **Label (segmentation) volume** — `--vol`. Any
  [[wiki/tools/mri_convert|mri_convert]]-readable format; voxels are integer
  structure IDs.
- **Output prefix** — `--outprefix`. Output names become
  `<outprefix>_label<ID>.origval.nii.gz`.

### Input Assumptions

> [!assumption] Integer labels, FSL on PATH
> The volume must hold integer IDs, and **FSL** must be installed (`fslstats` for
> range/histogram, `fslmaths` for the value multiply —
> [`scripts/isolate_labels_keeporigval.csh#L59-L64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L59-L64),
> [`#L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L96)). FreeSurfer does not bundle FSL. Labels
> are assumed non-negative and contiguous enough for one histogram bin per ID.

> [!gotcha] Input is auto-converted to NIfTI in place and then deleted
> A non-gzipped input is converted to `<stem>.nii.gz` beside the input file and
> removed at the end ([`scripts/isolate_labels_keeporigval.csh#L49-L55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L49-L55),
> [`#L103-L105`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L103-L105)).

## Outputs

### Files Created

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `<outprefix>_label<ID>.origval.nii.gz` | [[nifti]] | One per label: voxels equal to `<ID>` inside the structure, `0` elsewhere. |

The intermediate binary mask `<outprefix>_label<ID>.nii.gz` is created by
`mri_binarize` and then **deleted** after the `fslmaths` multiply
([`scripts/isolate_labels_keeporigval.csh#L97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L97)).

### Output Specifications

Geometry is inherited from the input. Foreground value is the integer label ID;
background is `0`. Output is gzipped NIfTI.

## Mathematical Foundations

> [!math] Mask, then scale to the label value
> For each discovered label $L$: $\text{mask} = \mathbb{1}[\,\text{vol} = L\,]$
> via [[mri_binarize]] `--match L`, then
> $\text{out} = L \cdot \text{mask}$ via `fslmaths -mul L`
> ([`scripts/isolate_labels_keeporigval.csh#L95-L96`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L95-L96)). Label discovery uses
> the same FSL histogram trick as [[isolate_labels.csh]]: bins from `min` to
> `max`, one integer per bin, every non-zero bin is a present label
> ([`#L57-L74`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L57-L74)).

## Configuration Options

### Complete Flag Reference

Flags from the argument parser
([`scripts/isolate_labels_keeporigval.csh#L113-L143`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L113-L143)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol` | string | *(required)* | Input label/segmentation volume. |
| `--outprefix` | string | *(required)* | Prefix for output files; each becomes `<outprefix>_label<ID>.origval.nii.gz`. |
| `--L`<br>`--l` | integer | all labels | Isolate only this one label ID (sets `doAll = 0`). |
| `--version` | bool | — | Print version and exit. |
| `--help` | bool | — | Print help and exit. |

> [!contradiction] No `--keepval` flag here (value preservation is always on)
> Unlike [[isolate_labels.csh]], this script has **no** `--keepval` option — the
> argument parser does not handle it ([`scripts/isolate_labels_keeporigval.csh#L117-L141`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L117-L141)). Keeping the
> original value is the script's fixed, defining behaviour. Passing `--keepval`
> would hit the `default:` case and abort with "Flag --keepval unrecognized".

### Configuration Interactions

- `--L`/`--l` switches off the all-labels sweep; they are exact synonyms.
- There are no mutually-exclusive flags — the option set is minimal.

## Typical Use Cases

### 1. Split aseg, each structure carrying its own ID

```bash
isolate_labels_keeporigval.csh \
  --vol $SUBJECTS_DIR/bert/mri/aseg.mgz --outprefix /tmp/bert/aseg
# → /tmp/bert/aseg_label10.origval.nii.gz  (voxels = 10),
#   /tmp/bert/aseg_label11.origval.nii.gz  (voxels = 11), ...
```

### 2. Isolate one structure, value preserved

```bash
isolate_labels_keeporigval.csh --vol aseg.mgz --outprefix /tmp/hip --L 17
# → /tmp/hip_label17.origval.nii.gz  (left hippocampus, voxels = 17)
```

## Pipeline Context

A **standalone** post-segmentation utility, **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`.

**Predecessor:** a segmentation (`aseg.mgz`,
[[mri_aparc2aseg|aparc+aseg.mgz]], or [[wiki/tools/samseg|samseg]] output) →
**isolate_labels_keeporigval.csh** → **Successor:** per-structure shape analysis,
or merging the value-carrying masks back together.

## Gotchas and Caveats

> [!gotcha] Output extension differs from the sibling script
> This script writes **`.origval.nii.gz`**; [[isolate_labels.csh]] writes
> `.mgz`. Downstream scripts keyed on one extension will not pick up the other.

> [!gotcha] Per-label FSL volume query
> As in the sibling script, each label triggers `fslstats -l -u -v` to print its
> voxel count and volume before extraction
> ([`scripts/isolate_labels_keeporigval.csh#L87-L93`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L87-L93)).

> [!gotcha] Usage banner has a typo
> The `usage_exit` banner prints `USAGE: isoltae_labels`
> ([`scripts/isolate_labels_keeporigval.csh#L169`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L169)) — a harmless misspelling of
> "isolate". The actual command name is unaffected.

## Error Compensation and Guard Rails

- **Format normalisation:** non-gzipped input auto-converted to `.nii.gz` and the
  temporary copy removed ([`scripts/isolate_labels_keeporigval.csh#L49-L55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L49-L55)).
- **Required-argument checks** for `--vol` and `--outprefix`
  ([`#L150-L158`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh#L150-L158)).
- No guard rail for a missing FSL install; `fslstats`/`fslmaths` would fail.

## Related Tools

- [[isolate_labels.csh]] — the binary-mask sibling. Key differences: it writes `.mgz` (this writes `.nii.gz`); it offers `--keepval` to set the foreground value via `mri_binarize --binval`, whereas this script **always** preserves the value via a separate FSL `fslmaths -mul` step.
- [[mri_binarize]] — produces the per-label mask that is then scaled.
- [[mri_segstats]] — statistics over a segmentation or the isolated structures.
- [[label-format]] — surface `.label` files (a distinct, vertex-list label concept); this tool operates on **volume** integer labels.
- [[wiki/tools/mri_convert|mri_convert]] — used internally for the NIfTI working copy.

## Confidence and Gaps

**High confidence:** complete (minimal) flag set, the `.origval.nii.gz` naming,
the mask-then-`fslmaths -mul` mechanism, and the absence of `--keepval` — read
directly from the source and confirmed against `--help`.

> [!gap] FSL must be present
> Hard dependency on `fslstats`/`fslmaths`, which FreeSurfer does not ship.
> Behaviour without FSL was not exercised.

## References

- FreeSurfer source: [`scripts/isolate_labels_keeporigval.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/isolate_labels_keeporigval.csh) (v8.2.0).
- Built-in help: `isolate_labels_keeporigval.csh --help`.
