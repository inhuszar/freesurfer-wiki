---
title: "print_unique_labels.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/print_unique_labels.csh"
families: []                     # standalone label-stats utility
recon_all_stage: null
related:
  - "[[compute_label_volumes.csh]]"
  - "[[mri_segstats]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[color-lut]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Hard dependency on FSL `fslstats` (not bundled with FreeSurfer 8.2.0); behaviour read from source, not executed end-to-end."
tags:
  - segmentation
  - label
  - stats
  - fsl
---

# print_unique_labels.csh

## Summary

`print_unique_labels.csh` lists the distinct integer label IDs present in a
segmentation/label volume. In its default mode it writes each label together with
its anatomical structure name (from the FreeSurfer Color Lookup Table) to a text
file; in `--list` mode it prints just the bare list of label IDs to stdout. Like
its sibling [[compute_label_volumes.csh]] it discovers the labels by histogramming
the volume with the FSL utility `fslstats`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/print_unique_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh)
- **Original author:** Lilla Zollei (created 2011-08-09; `--list` option added 2013-02-07)
- **Binary/script location:** `$FREESURFER_HOME/bin/print_unique_labels.csh`
- **External tools invoked:** [`fslstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L58) (FSL — **not** part of FreeSurfer), [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L50) (only when the input is not already gzipped), and `sed` to read `FreeSurferColorLUT.txt`.

## Purpose and Context

Before measuring or post-processing a segmentation it is often necessary to know
*which* structures it actually contains — e.g. to confirm that a manual tracing
includes the expected labels, or to drive a loop over present labels.
`print_unique_labels.csh` answers that question and, in its default mode,
annotates each label with the structure name from [[color-lut]] so the list is
human-readable.

It is one of the small FSL-backed label utilities by Lilla Zollei
([[compute_label_volumes.csh]], [[compute_interrater_variability.csh]]). It is
**standalone** and interactively run; nothing in recon-all calls it.

> [!gotcha] Requires FSL, not just FreeSurfer
> Label discovery is done with FSL's `fslstats`, which is **not** bundled with
> FreeSurfer 8.2.0 (absent from `$FREESURFER_HOME/bin`). FSL must be installed and
> on `$PATH`. The FreeSurfer-native way to list present labels without FSL is to
> read the first column of `mri_segstats --seg <vol> --sum <file>` output.

## Inputs

### Required Inputs

- **Label volume** (`--vol <labelvol>`): an integer-valued segmentation in any
  format [[wiki/tools/mri_convert|mri_convert]]/FSL can read (`.mgz`, `.nii`,
  `.nii.gz`, …). This is a **dense label volume**, not a `.label` surface file
  (see [[label-format]]).
- **One output mode** — either `--out <file>` (write the labelled list to a file)
  **or** `--list` (print bare IDs to stdout). At least one is required.

### Input Assumptions

> [!assumption] Non-negative integer labels, FSL-readable
> Voxel values are treated as non-negative integer label IDs. Labels are
> enumerated from a histogram spanning `[min, max]` (from `fslstats -R`, each
> bound truncated to an integer), keeping every bin with a non-zero count
> ([`scripts/print_unique_labels.csh:58-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L58-L73)). A very large label value
> forces a correspondingly large histogram and a slow run.

## Outputs

### Files Created

| Mode | Output | Contents |
|------|--------|----------|
| default (`--out`) | `<outputfile>` | header `Input file: <vol>`, then one line per label: `<structure> (label N)` |
| `--list` | *stdout only* | a single space-separated line of label IDs (no file, no names) |

In default mode the file's header line uses `>` (truncate) and each label line
appends with `>>` ([`scripts/print_unique_labels.csh:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L42), [`:91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L91)). In
both modes a count summary (`There are N unique lables …`, default) or the bare
list (`--list`) is also echoed to the terminal
([`scripts/print_unique_labels.csh:74-78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L74-L78)).

> [!gotcha] A temporary NIfTI copy may be created and deleted
> A non-`gz` input is converted to `<stem>.nii.gz` with
> [[wiki/tools/mri_convert|mri_convert]] for FSL and removed at the end
> ([`scripts/print_unique_labels.csh:48-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L48-L55), [`:96-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L96-L98)). The test matches only
> the literal suffix `gz`, so an `.mgz` input is converted to `.nii.gz`.

### Output Specifications

Label IDs are integers. In default mode each structure name is taken verbatim
from the matching line of `$FREESURFER_HOME/FreeSurferColorLUT.txt`
([[color-lut]]); a label absent from the LUT yields an empty name.

## Mathematical Foundations

None beyond label enumeration; there is no volume or intensity computation.

> [!math] Label discovery
> The present labels are the bin indices with non-zero counts in a unit-width
> histogram over the integer range of the volume:
> $$ \mathcal{L} = \{\, k \in [\min, \max] : h_k > 0 \,\}, \qquad
>    h = \texttt{fslstats}(\text{vol},\,-H,\,\text{bins},\,\min,\,\max) $$
> ([`scripts/print_unique_labels.csh:58-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L58-L73)). This is the same discovery
> step [[compute_label_volumes.csh]] uses, minus the per-label volume query.

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/print_unique_labels.csh:104-133`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L104-L133)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol` | string | *(required)* | Label volume to analyse. |
| `--out` | string | *(required unless `--list`)* | Output text file for the labelled list (label + structure name). |
| `--list` | flag | off | Print only the bare label IDs to stdout; suppresses the file output, the structure-name lookup, and the `Input file:` header. |
| `--version` | flag | — | Print the version string and exit. |
| `--help` | flag | — | Print help (the `BEGINHELP` block) and exit. |

### Configuration Interactions

> [!gotcha] `--list` vs `--out`: `--list` short-circuits the named output
> When `--list` is set (`onlylist=1`) the script skips writing the
> `Input file:` header, skips the per-label LUT name lookup entirely, and prints
> only the ID list to stdout ([`scripts/print_unique_labels.csh:41-44`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L41-L44),
> [`:74-94`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L74-L94)). You must supply **`--out` or `--list`**; supplying neither
> is rejected ([`scripts/print_unique_labels.csh:145-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L145-L148)). If both are
> given, `--list` wins and no file is written.

## Typical Use Cases

### 1. List labels with names to a file

```bash
print_unique_labels.csh --vol aseg.mgz --out aseg_labels.txt
# aseg_labels.txt: "Left-Hippocampus (label 17)", ... one per present label
```

### 2. Get just the IDs for scripting

```bash
# Capture the bare list to drive a loop.
set ids = `print_unique_labels.csh --vol manual_seg.nii.gz --list`
foreach id ($ids)
  # ... process label $id ...
end
```

## Pipeline Context

A **standalone** inspection utility; not part of
[[wiki/pipelines/recon-all|recon-all]] and not called anywhere in the FreeSurfer
source tree.

**Predecessor:** any tool producing a discrete label volume — manual
segmentation, [[mri_label2vol]], or recon-all's `aseg.mgz` → **this script** →
**Successor:** often [[compute_label_volumes.csh]] (to then measure the labels it
found) or a custom loop over the `--list` output.

**Predecessor:** [[mri_label2vol]] / manual segmentation → **print_unique_labels.csh** → **Successor:** [[compute_label_volumes.csh]]

## Gotchas and Caveats

> [!gotcha] Histogram cost scales with the label-value range
> Like its sibling, label discovery allocates one histogram bin per integer
> between the volume min and max ([`scripts/print_unique_labels.csh:58-63`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L58-L63)),
> so a stray very large value makes the run slow.

> [!gotcha] Structure names require the standard LUT layout
> Names are scraped from `FreeSurferColorLUT.txt` with digit-count-dependent
> `sed` patterns ([`scripts/print_unique_labels.csh:83-90`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L83-L90)); a
> non-standard LUT can leave names blank while the ID list stays correct. In
> `--list` mode the LUT is not consulted at all.

## Error Compensation and Guard Rails

- **Auto-conversion for FSL.** Non-`gz` inputs are converted to `.nii.gz` and the
  temporary file removed afterwards ([`scripts/print_unique_labels.csh:48-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L48-L55)).
- **Mode check.** The script requires `--vol` plus either `--out` or `--list`
  ([`scripts/print_unique_labels.csh:140-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh#L140-L148)).
- **No geometry modification.** The volume is read-only; only labels are reported.
- **No `fslstats` presence check.** A missing FSL surfaces as a shell
  "command not found".

## Related Tools

- [[compute_label_volumes.csh]] — sibling script that additionally reports voxel counts and mm³ per label.
- [[mri_segstats]] — FreeSurfer-native alternative that lists present labels (and their volumes/intensities) without FSL.
- [[wiki/tools/mri_convert|mri_convert]] — used internally to produce a NIfTI copy for FSL.
- [[mri_label2vol]] — produces dense label volumes whose contents this tool can enumerate.
- [[color-lut]] — the `FreeSurferColorLUT.txt` table from which structure names are read.

## Confidence and Gaps

**High confidence:** complete flag set, the two output modes and their
interaction, the FSL `fslstats` dependency, the histogram-based discovery, the
temporary-NIfTI conversion, and the LUT-name lookup — all read directly from
[`scripts/print_unique_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh).

> [!gap] Not executed end-to-end
> `fslstats` is not present in this install, so the exact `-R`/`-H` output column
> handling (`${tmp[1]}`/`${tmp[2]}`, the histogram array) was confirmed from the
> script and FSL conventions but not run against a real volume here.

## References

- FreeSurfer source: [`scripts/print_unique_labels.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/print_unique_labels.csh) (v8.2.0).
- FSL `fslstats` documentation (FMRIB Software Library) — the back end that discovers the labels.
