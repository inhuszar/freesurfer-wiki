---
title: "compute_label_volumes.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/compute_label_volumes.csh"
families: []                     # standalone label-stats utility
recon_all_stage: null
related:
  - "[[mri_segstats]]"
  - "[[print_unique_labels.csh]]"
  - "[[compute_interrater_variability.csh]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hard dependency on FSL `fslstats` (not bundled with FreeSurfer 8.2.0); behaviour was read from source, not executed end-to-end."
tags:
  - segmentation
  - label
  - volume
  - stats
  - fsl
---

# compute_label_volumes.csh

## Summary

`compute_label_volumes.csh` reports, for every label ID present in a
segmentation/label volume (or for one chosen label), the **number of voxels** and
the corresponding **physical volume in mm³**, and writes the result as a
human-readable text file. It is a thin tcsh wrapper around the FSL utility
`fslstats`: it histograms the label volume to discover which integer labels are
present, then for each label asks `fslstats` how many voxels fall in that label's
value range and what volume they occupy, and looks the label's anatomical name up
in the FreeSurfer colour table.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/compute_label_volumes.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh)
- **Original author:** Lilla Zollei (created 2010-04-21)
- **Binary/script location:** `$FREESURFER_HOME/bin/compute_label_volumes.csh`
- **External tools invoked:** [`fslstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L58) (FSL — **not** part of FreeSurfer), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L49) (only when the input is not already gzipped), and `sed` to read `FreeSurferColorLUT.txt`.

## Purpose and Context

When you have a discrete label volume — a manual segmentation, an `aseg`, a
[[mri_label2vol]] output, or any integer-valued atlas in voxel space — a common
question is simply "how big is each structure?" `compute_label_volumes.csh`
answers that without invoking the full FreeSurfer stats machinery: it enumerates
the labels actually present and tabulates voxel counts and mm³ volumes for each,
annotating them with structure names from the FreeSurfer Color Lookup Table
([[color-lut]]).

It belongs to a small family of FSL-backed label utilities written by Lilla
Zollei ([[print_unique_labels.csh]], [[compute_interrater_variability.csh]]) for
inspecting manual segmentations. It is a **standalone, interactively-run** tool;
nothing in recon-all calls it.

> [!gotcha] Requires FSL, not just FreeSurfer
> The actual counting is done by `fslstats`, an FSL program. A stock FreeSurfer
> 8.2.0 install does **not** ship `fslstats` (it is absent from
> `$FREESURFER_HOME/bin`), so FSL must be installed and on `$PATH`. The
> FreeSurfer-native equivalent that needs no FSL is
> `mri_segstats --seg <vol> --sum <file>`.

## Inputs

### Required Inputs

- **Label volume** (`--vol <labelvol>`): an integer-valued segmentation volume in
  any format [[wiki/tools/mri_convert|mri_convert]]/FSL can read (`.mgz`, `.nii`,
  `.nii.gz`, …). Voxel values are treated as label IDs. See [[label-format]] for
  the related sparse-label representation; this tool expects a **dense label
  volume**, not a `.label` surface file.
- **Output file** (`--out <file>`): path to the text report to write.

### Input Assumptions

> [!assumption] Integer labels, FSL-readable, isotropic-or-not handled by fslstats
> Voxel values are assumed to be **non-negative integers** (label IDs); the
> script histograms over the integer range `[min, max]` from `fslstats -R`,
> truncating each bound to an integer with the `:r` modifier
> ([`scripts/compute_label_volumes.csh:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L59-L63)). The reported mm³ comes
> from `fslstats -v`, which multiplies voxel count by the voxel volume read from
> the header, so the volume is correct for anisotropic data as long as the
> header voxel sizes are correct. Floating-point or label values far apart create
> a very large histogram (one bin per integer between min and max) and are slow.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<outputfile>` (from `--out`) | user-specified | Header line `Input file: <vol>` followed by one line per label: `Number of voxels and volume for <structure> (label N) is = (<count>, <vol>mm^3)` |

The output file is **truncated and rewritten** on each run (the header line uses
`>` ([`scripts/compute_label_volumes.csh:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L42)) and each label line appends
with `>>`). At the end the file is echoed to the terminal with `more`
([`scripts/compute_label_volumes.csh:103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L103)).

> [!gotcha] A temporary NIfTI copy may be created and deleted
> If the input is not already a `.gz` file, the script first converts it to
> `<stem>.nii.gz` with [[wiki/tools/mri_convert|mri_convert]] so FSL can read it,
> works on that copy, and `rm`s it at the end
> ([`scripts/compute_label_volumes.csh:47-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L47-L54), [`:105-107`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L105-L107)). The extension
> test keys on the literal suffix `gz`, so a `.mgz` input is **not** recognised as
> gzipped and is converted to `.nii.gz`; only `.nii.gz`/`.img.gz`-style names skip
> the conversion.

### Output Specifications

Counts are integer voxel counts; volumes are in mm³ as returned by `fslstats -v`.
Structure names are taken verbatim from the first column of the matching line in
`$FREESURFER_HOME/FreeSurferColorLUT.txt` ([[color-lut]]); a label not present in
the LUT yields an empty structure name.

## Mathematical Foundations

The arithmetic is elementary and is performed by `fslstats`, not by this script:

> [!math] Per-label volume
> For label $L$, the script counts voxels whose value lies strictly inside
> $(L-1,\,L+1)$ and reports the volume as that count times the voxel volume:
> $$ V_L = N_L \cdot (\Delta x \,\Delta y \,\Delta z), \qquad
>    N_L = \bigl|\{v : L-1 < I(v) < L+1\}\bigr| $$
> realised as `fslstats $vol -l $(L-1) -u $(L+1) -v`
> ([`scripts/compute_label_volumes.csh:82-87`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L82-L87)). The
> $(L-1, L+1)$ open interval with integer voxel sizes selects exactly the voxels
> equal to $L$. Label discovery uses a histogram with one bin per integer:
> `fslstats $vol -H $bins $min $max`, keeping every bin with a non-zero count
> ([`scripts/compute_label_volumes.csh:61-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L61-L73)).

> [!internal] Voxel volume comes from FSL
> The conversion from voxel count to mm³ is done inside `fslstats` (the `-v`
> output), which reads the voxel dimensions from the NIfTI header. This script
> never touches the geometry.

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/compute_label_volumes.csh:113-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L113-L145)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol` | string | *(required)* | Label volume to analyse. |
| `--out` | string | *(required)* | Output text file for the results. |
| `--L`<br>`--l` | int | *(all labels)* | Restrict the report to a single label ID; turns off the "all labels" scan (`doAll=0`). |
| `--version` | flag | — | Print the version string (`@FS_VERSION@`) and exit. |
| `--help` | flag | — | Print help (the `BEGINHELP` block) and exit. |

### Configuration Interactions

> [!gotcha] `--L`/`--l` switches off automatic label discovery
> By default (`doAll=1`) the script histograms the whole volume to find every
> present label. Passing `--L`/`--l <id>` sets `doAll=0`
> ([`scripts/compute_label_volumes.csh:131-136`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L131-L136)) and reports **only** that
> one label — even if it is absent from the volume (in which case the count is 0).
> `--L` and `--l` are exact synonyms.

- **Both `--vol` and `--out` are mandatory;** omitting either is a hard error
  ([`scripts/compute_label_volumes.csh:152-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L152-L160)). Unlike
  [[print_unique_labels.csh]] there is no terminal-only mode — a file is always
  written.

## Typical Use Cases

### 1. Tabulate every structure in an aseg

```bash
compute_label_volumes.csh --vol aseg.mgz --out aseg_volumes.txt
# → one line per label present, each with voxel count and mm^3,
#   annotated with FreeSurferColorLUT names.
```

### 2. Volume of a single manual label

```bash
# How big is the left hippocampus (label 17)?
compute_label_volumes.csh --vol manual_seg.nii.gz --L 17 --out lhippo_vol.txt
```

## Pipeline Context

A **standalone** label-measurement utility. It is not part of
[[wiki/pipelines/recon-all|recon-all]] and has no caller in the FreeSurfer source
tree.

**Predecessor:** any tool that produces a discrete label volume — a manual
segmentation, [[mri_label2vol]] (sparse `.label` → dense volume), or recon-all's
`aseg.mgz` → **this script** → **Successor:** typically none; the text report is
the end product. For the same measurement without an FSL dependency, and with
richer per-structure statistics (mean intensity, std, etc.), use [[mri_segstats]]
instead.

**Predecessor:** [[mri_label2vol]] / manual segmentation → **compute_label_volumes.csh** → **Successor:** *(text report)*

## Gotchas and Caveats

> [!gotcha] Histogram cost scales with the label-value range
> The label-discovery histogram allocates one bin per integer between the
> volume's min and max value ([`scripts/compute_label_volumes.csh:59-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L59-L63)).
> An `aseg` (labels up to ~5000) is fine, but a volume containing a stray very
> large value forces a correspondingly huge histogram and a slow run. Use `--L`
> to bypass discovery when you only need one structure.

> [!gotcha] Structure-name lookup is by column-padded `sed`
> The anatomical name is scraped from `FreeSurferColorLUT.txt` with three
> different `sed` patterns chosen by the label's digit count (<10, <100, ≥100),
> matching the LUT's fixed-width formatting
> ([`scripts/compute_label_volumes.csh:89-97`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L89-L97)). A custom or differently
> spaced LUT can defeat the match and leave the structure name blank, while the
> count and volume remain correct.

> [!gotcha] `.mgz` input triggers a NIfTI round-trip
> Because the gzip test matches only the literal suffix `gz`, an `.mgz` input is
> treated as "not gzipped" and converted to `.nii.gz` via
> [[wiki/tools/mri_convert|mri_convert]] before processing. This is harmless for
> integer labels but adds an extra read/write.

## Error Compensation and Guard Rails

- **Auto-conversion for FSL.** Non-`gz` inputs are transparently converted to
  `.nii.gz` so `fslstats` can read them, and the temporary file is removed
  afterwards ([`scripts/compute_label_volumes.csh:47-54`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L47-L54)).
- **Required-argument checks.** Missing `--vol` or `--out` aborts with a clear
  message ([`scripts/compute_label_volumes.csh:150-162`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh#L150-L162)).
- **No geometry modification.** The script does not reslice or reorient; it only
  counts. Volumes are as accurate as the input header's voxel sizes.
- **No `fslstats` presence check.** The script assumes FSL is installed; if
  `fslstats` is missing the failure surfaces as a shell "command not found" rather
  than a friendly error.

## Related Tools

- [[mri_segstats]] — the FreeSurfer-native, no-FSL equivalent; tabulates per-label voxel counts, volumes, and intensity statistics and is the recommended alternative.
- [[print_unique_labels.csh]] — sibling script (same author/idiom) that lists *which* labels are present without volumes.
- [[compute_interrater_variability.csh]] — sibling script comparing two label volumes (overlap/Hausdorff).
- [[wiki/tools/mri_convert|mri_convert]] — used internally to produce a NIfTI copy for FSL.
- [[mri_label2vol]] — produces dense label volumes (from `.label` files) that this tool can then measure.
- [[color-lut]] — the `FreeSurferColorLUT.txt` table from which structure names are read.

## Confidence and Gaps

**High confidence:** complete flag set, the FSL `fslstats` dependency, the
histogram-based label discovery, the $(L-1,L+1)$ counting interval, the
single-label `--L`/`--l` mode, the temporary-NIfTI conversion, and the
LUT-name lookup — all read directly from
[`scripts/compute_label_volumes.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh).

> [!gap] Not executed end-to-end
> `fslstats` is not present in this FreeSurfer install, so the exact column order
> of its `-v`/`-H` output (and therefore the `${tmp[1]}`/`${tmp[2]}` field
> assignments) was confirmed from the script and FSL conventions but not run
> against a real volume here.

## References

- FreeSurfer source: [`scripts/compute_label_volumes.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_label_volumes.csh) (v8.2.0).
- FSL `fslstats` documentation (FMRIB Software Library) — the back end that performs the counting.
