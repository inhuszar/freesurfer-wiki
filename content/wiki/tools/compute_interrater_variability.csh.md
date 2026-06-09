---
title: "compute_interrater_variability.csh"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/compute_interrater_variability.csh"
families: []                     # standalone segmentation-comparison utility
recon_all_stage: null
related:
  - "[[mri_compute_overlap]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[mri_hausdorff_dist]]"
  - "[[compute_label_volumes.csh]]"
  - "[[print_unique_labels.csh]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - segmentation
  - label
  - overlap
  - dice
  - jaccard
  - reliability
---

# compute_interrater_variability.csh

## Summary

`compute_interrater_variability.csh` quantifies how closely two label volumes
agree — typically the same region segmented by two different raters, or by one
rater at two time points. It runs three FreeSurfer comparisons on the pair and
writes their results to three text files plus a timestamped log: the **mean**
Hausdorff distance, the **max** Hausdorff distance (both from
[[mri_hausdorff_dist]]), and per-label **volume difference, Dice, and Jaccard**
overlap (from [[mri_compute_overlap]]). It is a thin tcsh wrapper that simply
sequences those two tools with a shared output prefix.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/compute_interrater_variability.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh)
- **Original author:** Lilla Zollei (created 2010-04-27)
- **Binary/script location:** `$FREESURFER_HOME/bin/compute_interrater_variability.csh`
- **Tools invoked:** [`mri_hausdorff_dist`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L58) (mean, then with `-max`), [`mri_compute_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L70) (`-a -s -l`).

## Purpose and Context

Manual segmentation is the reference standard for many neuroimaging measurements,
but it is subject to inter- and intra-rater variability. Before trusting a manual
protocol — or before accepting an automated segmentation as a substitute for a
manual one — you need to quantify how reproducible the labels are.
`compute_interrater_variability.csh` packages the standard FreeSurfer reliability
measures into one call so that comparing two segmentations does not require
remembering the individual tools and flags.

The three measures it reports are complementary:

- **Hausdorff distance** (mean and max) — a *boundary* discrepancy in millimetres;
  smaller means the two label surfaces lie closer together. The max Hausdorff is
  sensitive to the single worst-disagreeing point; the mean is more robust.
- **Dice and Jaccard** — *overlap* coefficients in [0, 1]; larger means greater
  volumetric agreement. Reported per label, alongside the raw volume difference.

It is one of Lilla Zollei's small label-utility scripts
([[compute_label_volumes.csh]], [[print_unique_labels.csh]]) and is **standalone**
— nothing in recon-all calls it. Unlike its siblings it does **not** depend on
FSL; both back-end tools are native FreeSurfer binaries.

> [!gotcha] The two inputs must be in the same voxel space
> Both Hausdorff and overlap are computed voxel-wise across the pair of volumes;
> the two segmentations must share geometry (dimensions, voxel size, and frame of
> reference). The script does no resampling. Compare segmentations of the *same*
> subject in a common space, or co-register first.

## Inputs

### Required Inputs

- **Volume 1** (`--vol1 <labelvol1>`): the first label volume (e.g. rater 1).
- **Volume 2** (`--vol2 <labelvol2>`): the second label volume (e.g. rater 2).
- **Output prefix** (`--out <prefix>`): a path prefix; the script appends three
  fixed suffixes to it (see Outputs).

Inputs are dense integer label volumes in any format the FreeSurfer readers
accept (`.mgz`, `.nii.gz`, …). They are *not* `.label` surface files — see
[[label-format]].

### Input Assumptions

> [!assumption] Two co-registered integer label volumes of the same structure(s)
> The volumes are assumed to label the same anatomy in the same space, with
> corresponding integer label IDs. Hausdorff distance and Dice/Jaccard are only
> meaningful for matching labels in a shared coordinate frame. The script passes
> the volumes straight to the comparison tools with no conforming or
> registration.

## Outputs

### Files Created

For an output prefix `P` the script writes
([`scripts/compute_interrater_variability.csh:57-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L57-L73)):

| File | Produced by | Contents |
|------|-------------|----------|
| `P.mean.haus.txt` | `mri_hausdorff_dist` | mean Hausdorff distance (mm) between the two label boundaries |
| `P.max.haus.txt` | `mri_hausdorff_dist -max` | maximum Hausdorff distance (mm) |
| `P.overlap.txt` | `mri_compute_overlap -a -s -l` | per-label volume difference, Dice and Jaccard, with segmentation label names |
| `mri_interrater_variability.<YYMMDDHHMM>.log` | this script | full run log: date, arguments, host, and every command's stdout (a pre-existing log of the same name is rotated to `.old`) |

The log filename is built from a timestamp at run time
([`scripts/compute_interrater_variability.csh:40-43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L40-L43)) and is written into the
**current working directory**, not next to the output prefix.

### Output Specifications

Hausdorff outputs are distances in millimetres (single values). The overlap file
is a per-label table whose exact column layout is defined by
[[mri_compute_overlap]]; the `-s` flag makes it print structure names from the
colour table, `-a` makes it report all labels, and `-l <file>` directs the table
to the file ([`scripts/compute_interrater_variability.csh:70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L70)).

## Mathematical Foundations

The script itself does no arithmetic; the measures are computed by the two
back-end tools.

> [!math] Dice and Jaccard overlap
> For a given label with voxel sets $A$ (vol1) and $B$ (vol2),
> $$ \mathrm{Dice}(A,B) = \frac{2\,|A \cap B|}{|A| + |B|}, \qquad
>    \mathrm{Jaccard}(A,B) = \frac{|A \cap B|}{|A \cup B|}. $$
> Both lie in $[0,1]$; 1 is perfect agreement. The volume difference is
> $|A| - |B|$ (in voxels/mm³). These are computed in [[mri_compute_overlap]].

> [!math] Hausdorff distance
> With $d(a,B) = \min_{b \in B}\|a-b\|$ the distance from a boundary point $a$ to
> the nearest point of the other boundary, the **directed** Hausdorff distance is
> $h(A,B) = \max_{a \in A} d(a,B)$ and the symmetric (max) Hausdorff is
> $H(A,B) = \max\bigl(h(A,B), h(B,A)\bigr)$. The "mean" variant averages the
> nearest-neighbour distances instead of taking their maximum. Both are computed
> in [[mri_hausdorff_dist]] (mean is the default; `-max` selects the maximum).

> [!internal] All computation is in the sub-tools
> See [[mri_hausdorff_dist]] and [[mri_compute_overlap]] for the exact algorithms,
> boundary extraction, and per-label handling.

## Configuration Options

### Complete Flag Reference

All flags from the argument parser
([`scripts/compute_interrater_variability.csh:79-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L79-L109)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--vol1` | string | *(required)* | First label volume (e.g. rater 1 / time point 1). |
| `--vol2` | string | *(required)* | Second label volume (e.g. rater 2 / time point 2). |
| `--out` | string | *(required)* | Output prefix; the three result files and (implicitly) the comparison content are named from it. |
| `--version` | flag | — | Print the version string and exit. |
| `--help` | flag | — | Print help (the `BEGINHELP` block) and exit. |

> [!gotcha] The usage text mislabels `--vol2`
> The `usage_exit` help prints the second input's flag as `--vol1` ("rater2 label
> volume") instead of `--vol2`
> ([`scripts/compute_interrater_variability.csh:138-139`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L138-L139)). The parser only
> accepts `--vol2` for the second volume ([`:92-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L92-L95)); the help line is a
> typo. Code is authoritative — use `--vol2`.

### Configuration Interactions

There are no interacting options: the three positional inputs are all required
and independent. The flags passed to the back-end tools (`-max` for the second
Hausdorff call; `-a -s -l` for overlap) are fixed in the script and not
user-configurable. To change them, call [[mri_hausdorff_dist]] or
[[mri_compute_overlap]] directly.

> [!gotcha] All three sub-steps must succeed
> The script checks `$status` after each tool and exits immediately on the first
> failure ([`scripts/compute_interrater_variability.csh:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L61), [`:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L67), [`:73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L73)). If, say,
> the mean Hausdorff fails, the max-Hausdorff and overlap files are never written.

## Typical Use Cases

### 1. Compare two raters' segmentations

```bash
compute_interrater_variability.csh \
  --vol1 rater1.hippo.mgz \
  --vol2 rater2.hippo.mgz \
  --out  hippo_r1_vs_r2
# → hippo_r1_vs_r2.mean.haus.txt, .max.haus.txt, .overlap.txt
#   + mri_interrater_variability.<timestamp>.log in the cwd
```

### 2. Intra-rater (test-retest) reliability

```bash
# Same rater, two tracings of the same scan.
compute_interrater_variability.csh \
  --vol1 tracing_session1.nii.gz \
  --vol2 tracing_session2.nii.gz \
  --out  amygdala_retest
```

## Pipeline Context

A **standalone** segmentation-comparison utility. It is not part of
[[wiki/pipelines/recon-all|recon-all]] and has no caller in the FreeSurfer source
tree. It is run by hand during the validation of a manual tracing protocol or
when benchmarking an automated segmentation against a manual gold standard.

**Predecessor:** two label volumes (manual tracings, or a manual vs an automated
[[mri_label2vol]]/`aseg` segmentation in the same space) → **this script** →
**Successor:** *(the three text reports — typically read into a stats package to
summarise reliability across structures/subjects)*.

## Gotchas and Caveats

> [!gotcha] Log goes to the current directory, results go to the prefix
> The `.mean.haus.txt`/`.max.haus.txt`/`.overlap.txt` files follow `--out`, but
> the timestamped `mri_interrater_variability.*.log` is always created in the
> directory you ran the command from
> ([`scripts/compute_interrater_variability.csh:42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L42)). Run from a clean
> working directory to keep the log with the results.

> [!gotcha] Overlap is reported, not a single agreement score
> The tool does not collapse the comparison to one number. You get per-label
> Dice/Jaccard plus two Hausdorff distances and must decide how to summarise them.
> For a single structure this is three files with one number each; for a
> multi-label volume the overlap file is a table.

> [!gotcha] `mri_compute_overlap`, not `mri_compute_seg_overlap`
> Despite the very similar name, this script uses [[mri_compute_overlap]] (the
> volume-difference / Dice / Jaccard tool), **not** the separate
> [[mri_compute_seg_overlap]] binary (which computes seg-vs-seg Dice over a fixed
> structure list for QA). They are different programs from different source files.

## Error Compensation and Guard Rails

- **Required-argument checks.** Missing `--vol1`, `--vol2`, or `--out` aborts with
  a clear message ([`scripts/compute_interrater_variability.csh:114-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L114-L124)).
- **Stop-on-error.** `$status` is checked after every sub-tool; the first failure
  ends the run ([`scripts/compute_interrater_variability.csh:61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L61), [`:67`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L67), [`:73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L73)).
- **Log rotation.** A pre-existing log of the same timestamped name is moved to
  `.old` rather than overwritten ([`scripts/compute_interrater_variability.csh:43`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh#L43)).
- **No input modification.** The volumes are passed through unchanged; the script
  performs no resampling or relabelling (so mismatched geometry is the user's
  responsibility — see the assumption above).

## Related Tools

- [[mri_hausdorff_dist]] — computes the mean (default) and `-max` Hausdorff boundary distances; called twice here.
- [[mri_compute_overlap]] — computes per-label volume difference, Dice, and Jaccard; called once with `-a -s -l`.
- [[mri_compute_seg_overlap]] — a *different*, similarly-named tool that scores segmentation-vs-segmentation Dice over a fixed structure list (QA-oriented); not the one this script uses, but a natural alternative.
- [[compute_label_volumes.csh]] — sibling script: per-label volumes of a single segmentation.
- [[print_unique_labels.csh]] — sibling script: which labels a segmentation contains.

## Confidence and Gaps

**High confidence:** the complete flag set, the three fixed comparisons and their
output suffixes, the exact back-end invocations (`-max`; `-a -s -l`), the
stop-on-error behaviour, the log-rotation and cwd log placement, and the
`--vol2` help typo — all read directly from
[`scripts/compute_interrater_variability.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh).
The Dice/Jaccard and Hausdorff definitions are standard and match the tools'
documented behaviour. No open gaps for the wrapper itself; the precise overlap
table layout is owned by [[mri_compute_overlap]].

## References

- FreeSurfer source: [`scripts/compute_interrater_variability.csh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/compute_interrater_variability.csh) (v8.2.0).
- L. R. Dice, "Measures of the amount of ecologic association between species," *Ecology* 26(3):297–302, 1945 (Dice coefficient).
- P. Jaccard, "The distribution of the flora in the alpine zone," *New Phytologist* 11(2):37–50, 1912 (Jaccard index).
