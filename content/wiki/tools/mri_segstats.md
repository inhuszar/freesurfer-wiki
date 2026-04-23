---
title: "mri_segstats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_segstats/mri_segstats.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_anatomical_stats]]"
  - "[[mri_ca_label]]"
  - "[[mri_seg_overlap]]"
  - "[[mri_seg_diff]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "The exact caching mechanism for brain volume statistics (--no-cached) is not documented here."
  - "PVE correction details for --pv are not fully extracted."
  - "--qa-stats output format and exact metrics computed are not fully documented."
  - "--synth and --seed interaction (random synthesis) not fully traced."
tags:
  - segmentation
  - statistics
  - morphometry
  - aseg
  - recon-all
  - ICV
  - volume
---

# mri_segstats

## Summary

`mri_segstats` is a core FreeSurfer tool that computes per-label statistics from a volumetric segmentation. In its standard form it reports voxel count, volume in mm³, and (optionally) intensity statistics (mean, std, SNR) from a co-registered input volume. It generates the `aseg.stats`, `wmparc.stats`, and related stats files that are the primary quantitative outputs of `recon-all` for downstream group studies. It also computes global brain volume measures including ICV (intracranial volume / eTIV).

## Source Information

- **Language:** C++
- **Source file:** `mri_segstats/mri_segstats.cpp`
- **Author:** Douglas N Greve

## Purpose and Context

`mri_segstats` is called by `recon-all` in the `autorecon3` stage to generate:
- `stats/aseg.stats` — subcortical segmentation statistics from `aseg.mgz`
- `stats/wmparc.stats` — white matter parcellation statistics from `wmparc.mgz`
- Various brain volume global measures embedded in the header of these `.stats` files

These files are the standard inputs to group-level analyses (e.g., `asegstats2table`, `aparcstats2table`). The header of each `.stats` file contains global measures: BrainSegVol, ICV, eTIV, supratentorial volume, etc.

## Inputs

**Primary inputs:**
- `--seg <file>`: Segmentation volume (required unless `--annot` is used)
- `--in <file>` / `--i <file>`: Optional input volume for intensity statistics
- `--annot <subj> <hemi> <annotname>`: Use a surface annotation as the segmentation (hemi and annotname are positional arguments to `--annot`, not separate flags)
- `--slabel <subj> <hemi> <labelfile>`: Use a surface label as the segmentation
- `--ctab <file>` / `--ctab-default`: [[color-lut|Colour lookup table]] for label names

**Optional volume-based inputs:**
- `--mask <file>`: Mask volume to restrict analysis
- `--pv <file>`: Partial volume effect correction volume
- `--brainmask <file>`: Brain mask for global volume computation
- `--in-intensity-name <name>`: Label for the intensity metric written to the stats header (e.g., `norm`)
- `--in-intensity-units <units>`: Units string for the intensity metric (e.g., `MR`)
- `--reg <file>`: Registration from input volume to segmentation space
- `--regheader`: Use volume headers for registration

## Outputs

- `--sum <file>`: Main statistics table (text; the [[stats-format|`.stats` file]]). Columns: index, segID, N-voxels, volume-mm3, labelname, mean-intensity, std-intensity, min, max, range.
- `--avgwf <file>`: Average waveform per label (for 4D functional inputs)
- `--avgwf-norm-mean`: Normalize average waveform by its mean across time (modifier for `--avgwf`)
- `--avgwf-remove-mean`: Remove the temporal mean from the average waveform (modifier for `--avgwf`)
- `--avgwfvol <file>`: Average waveform as a volume
- `--sfavg <file>`: Spatial average of waveform
- `--ctab-out <file>`: Output colour table matching the reported labels
- `--sumwf <file>`: Per-label average waveform summary (for 4D functional inputs)
- `--xfm2etiv <xfm> <outfile>`: Standalone eTIV computation from transform file

## Mathematical Foundations

For each label $\ell$ with voxel set $\mathcal{V}_\ell$:

$$
N_\ell = |\mathcal{V}_\ell|
$$
$$
V_\ell = N_\ell \cdot v_{\text{vox}} \quad \text{(mm}^3\text{)}
$$

where $v_{\text{vox}}$ is the voxel volume.

When an input volume $I$ is provided:

$$
\bar{I}_\ell = \frac{1}{N_\ell} \sum_{v \in \mathcal{V}_\ell} I(v), \quad \sigma_\ell = \sqrt{\frac{1}{N_\ell-1} \sum_{v \in \mathcal{V}_\ell} (I(v) - \bar{I}_\ell)^2}
$$

$$
\text{SNR}_\ell = \frac{\bar{I}_\ell}{\sigma_\ell}
$$

**eTIV (estimated total intracranial volume):**

$$
\text{eTIV} = \frac{V_{\text{atlas}}}{|\det(\mathbf{T}_{\text{Talairach}})|} \cdot k
$$

where $V_{\text{atlas}}$ is the atlas ICV, $\mathbf{T}_{\text{Talairach}}$ is the affine Talairach registration matrix, and $k = 1948.106$ is a scale factor empirically determined from MNI305 atlas dimensions.

**Euler number** (when `--euler` is requested): Reads `lheno` and `rheno` from the surface files and reports them in the header.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--seg` | `<file>` | — | Segmentation volume |
| `--sum` | `<file>` | — | Output statistics table (required) |
| `--in` / `--i` | `<file>` | — | Input volume for intensity statistics |
| `--reg` | `<file>` | — | Registration from `--in` to seg space |
| `--regheader` | — | off | Use volume headers for registration |
| `--ctab` | `<file>` | — | Colour lookup table |
| `--ctab-default` | — | off | Use `$FREESURFER_HOME/FreeSurferColorLUT.txt` |
| `--ctab-gca` | `<file>` | — | Read colour table from GCA atlas |
| `--ctab-out` | `<file>` | — | Write output colour table |
| `--id` | `<id> [...]` | all | Report only specified label IDs |
| `--excl-ctxgmwm` | — | off | Exclude cortical GM/WM labels |
| `--surf-ctx-vol` | — | off | Compute surface-based cortical volume |
| `--surf-wm-vol` | — | off | Compute surface-based WM volume |
| `--surf` | `<surfname>` | `white` | Surface name for surface-based volumes |
| `--annot` | `<subj> <hemi> <annot>` | — | Use annotation as segmentation |
| `--subject` | `<subj>` | — | Subject name (used with `--annot` and `--slabel`) |
| `--mask` | `<file>` | — | Mask volume |
| `--maskthresh` | `<float>` | 0.5 | Mask threshold |
| `--masksign` | `pos\|neg\|abs` | — | Mask sign |
| `--maskinvert` | — | off | Invert mask |
| `--maskerode` | `<int>` | 0 | Erode mask by N voxels |
| `--pv` | `<file>` | — | Partial volume correction volume |
| `--brainmask` | `<file>` | — | Brain mask for global stats |
| `--brain-vol-from-seg` | — | off | Compute brain volume from segmentation labels |
| `--subcortgray` | — | off | Report subcortical grey volume |
| `--totalgray` | — | off | Report total grey matter volume |
| `--supratent` | — | off | Report supratentorial volume |
| `--etiv` | — | off | Compute estimated ICV from Talairach transform |
| `--etiv-only` | — | off | Only report eTIV, then exit |
| `--talxfm` | `<file>` | — | Path to Talairach transform file for eTIV |
| `--stiv` | `<float>\|<file>` | — | Set intracranial volume directly |
| `--euler` | — | off | Read and report Euler numbers from surface files |
| `--seg-erode` | `<int>` | 0 | Erode segmentation by N voxels before stats |
| `--seg-from-input` | — | off | Construct segmentation from input volume |
| `--replace` | `<src> <tgt>` | — | Replace label `src` with `tgt` |
| `--replace-file` | `<file>` | — | File with pairs of label IDs to replace (same format as `--replace`) |
| `--exclude` / `--excludeid` | `<id>` | — | Exclude label ID from statistics |
| `--frame` | `<int>` | 0 | Frame of input volume to use |
| `--robust` | `<pct>` | off | Use robust mean/std (trim `pct`% tails) |
| `--snr` | — | off | Compute SNR per label |
| `--abs` | — | off | Use absolute value of input |
| `--sqr` | — | off | Use square of input |
| `--sqrt` | — | off | Use square root of input |
| `--mul` | `<float>` | 1.0 | Multiply input by value |
| `--div` | `<float>` | 1.0 | Divide input by value |
| `--acc` / `--accumulate` | — | off | Accumulate stats across multiple runs |
| `--non-empty` / `--nonempty` | — | on | Report only non-empty labels |
| `--empty` | — | off | Report all labels including empty ones |
| `--no-global-stats` | — | off | Suppress all global stat headers |
| `--segborder` | — | on | Exclude border voxels from label statistics |
| `--no-segborder` | — | off | Include border voxels |
| `--vox` | `c r s` | — | Report stats for a single voxel CRS |
| `--no-cached` | — | off | Do not use cached brain volume statistics |
| `--sd` | `<dir>` | `$SUBJECTS_DIR` | Override subjects directory |
| `--xfm2etiv` | `<xfm> <outfile>` | — | Compute eTIV from transform (standalone mode) |
| `--old-etiv-only` | — | off | Use older eTIV-only computation method and exit |
| `--sum` / `--o` | `<file>` | — | Output statistics table (required; `--o` is an alias) |
| `--sum-in` | `<file>` | — | Read an existing stats table as input (for accumulate mode) |
| `--sumwf` | `<file>` | — | Write per-label average waveform summary |
| `--avgwf` | `<file>` | — | Write per-label average waveform as a text file (one column per label, one row per frame) |
| `--avgwf-norm-mean` | `<float>` | — | Normalize each label's average waveform by dividing by the given value |
| `--avgwf-remove-mean` | — | off | Remove the temporal mean from each label's average waveform before writing |
| `--avgwfvol` | `<file>` | — | Write per-label average waveform as a binary MRI volume (labels as columns, frames as rows) |
| `--sfavg` | `<file>` | — | Write spatial frame average (per-frame mean across all voxels in each label) to a text file |
| `--seed` | `<int>` | — | Set random number generator seed (calls `setRandomSeed()`; independent of `--synth`) |
| `--in-intensity-name` | `<name>` | — | Label for the intensity metric in the output header (e.g., `norm`) |
| `--in-intensity-units` | `<units>` | — | Units string for the intensity metric (e.g., `MR`) |
| `--maskframe` | `<int>` | — | Frame of mask volume to use (for 4D mask inputs) |
| `--label-thresh` | `<float>` | — | Minimum label stat value; used with `--slabel` to threshold vertices |
| `--slabel` | `<subj> <hemi> <labelfile>` | — | Use a surface label file (subject/hemi/file) as the segmentation |
| `--segbase` | `<int>` | — | Base offset added to all segment IDs |
| `--rescale-by-seg` | — | off | Rescale input intensity values by segment ID (for use with certain atlases) |
| `--gtm-default-seg-merge` | — | off | Apply GTM default segment merging (combines certain sub-segmentations) |
| `--gtm-default-seg-merge-choroid` | — | off | Apply GTM default segment merging including choroid plexus |
| `--qa-stats` | — | off | Compute and report additional QA statistics (WM-SN SNR, etc.) |
| `--synth` | — | off | Synthesize random input data (for testing/simulation) |
| `--newprint` | — | on | Use new-format stats table output |
| `--no-newprint` | — | off | Use legacy stats table output format |
| `--dontrun` | — | off | Parse and validate options but do not execute (dry run) |
| `--usage` | — | — | Print usage and exit (alias for `--help`) |
| `--debug` | — | off | Debug output |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `--seg`, `--annot`, and `--slabel` are mutually exclusive primary input modes.
- --annot takes three positional arguments: subject, hemi, and annot name. There is no separate --hemi flag in `mri_segstats`.
- `--slabel` similarly takes subject, hemi, and label file as positional arguments.
- `--surf-ctx-vol` and `--surf-wm-vol` require `--subject` (and optionally `--surf`).
- `--supratent` requires `--surf-ctx-vol` (checks for surface-based cortical volume).
- `--totalgray` requires `--surf-ctx-vol`.
- `--etiv` requires the Talairach transform (default: `$SUBJECTS_DIR/<subj>/mri/transforms/talairach.xfm`; override with `--talxfm`).
- `--no-global-stats` sets `DoSurfWMVol = DoSurfCtxVol = DoSupraTent = BrainVolFromSeg = DoSubCortGrayVol = DoTotalGrayVol = DoEuler = 0` simultaneously.
- `--robust` replaces mean/std with trimmed robust estimates; `--snr` uses the same mean and std values.
- `--abs`, `--sqr`, `--sqrt` are applied to the input volume before statistics; these transform all voxel values.
- `--mul` and `--div` can both be specified; they multiply the value: the effective multiplier is the product of all `--mul` arguments divided by all `--div` arguments.
- `--pv` applies partial volume correction to volume estimates; requires the same resolution and registration as `--seg`.

## Typical Use Cases

```bash
# Generate aseg.stats (as called by recon-all)
mri_segstats --seg aseg.mgz \
  --sum stats/aseg.stats \
  --pv mri/norm.mgz \
  --empty \
  --brainmask mri/brainmask.mgz \
  --brain-vol-from-seg \
  --excludeid 0 \
  --excl-ctxgmwm \
  --supratent \
  --subcortgray \
  --in mri/norm.mgz \
  --in-intensity-name norm \
  --in-intensity-units MR \
  --surf-wm-vol \
  --surf-ctx-vol \
  --totalgray \
  --euler \
  --ctab $FREESURFER_HOME/FreeSurferColorLUT.txt \
  --subject subj001

# Intensity stats from T2 in aseg labels
mri_segstats --seg aseg.mgz --in T2.mgz --sum aseg_T2stats.txt --ctab-default

# Annotation-based stats (like mris_anatomical_stats output)
mri_segstats --annot subj001 lh aparc \
  --surf white \
  --sum stats/lh.aparc.stats \
  --ctab $FREESURFER_HOME/FreeSurferColorLUT.txt

# Only compute eTIV from transform
mri_segstats --xfm2etiv mri/transforms/talairach.xfm /tmp/etiv.txt

# Robust statistics with SNR
mri_segstats --seg aseg.mgz --in flair.mgz --robust 5 --snr --sum aseg_flair_robust.txt
```

## Pipeline Context

`mri_segstats` is called by `recon-all` during **autorecon3** to generate:
- `stats/aseg.stats`
- `stats/wmparc.stats`

The global header entries in `aseg.stats` include brain volumes (BrainSegVol, BrainVol, ICV, eTIV, etc.) and Euler numbers used for QC. These header fields are parsed by `asegstats2table` for group-level analyses.

Prerequisites:
- `aseg.mgz` (from [[mri_ca_label]])
- `norm.mgz` (from [[mri_normalize]])
- `brainmask.mgz` (from [[mri_watershed]])
- `wmparc.mgz` (from [[mri_aparc2aseg]])
- Talairach transform for eTIV

## Gotchas and Caveats

> [!gotcha] eTIV scale factor
> The eTIV computation uses a hardcoded scale factor of 1948.106 calibrated for the MNI305 atlas. This is the correct value for FreeSurfer's `talairach.xfm`. Using a transform to a different atlas will produce incorrect eTIV.

> [!gotcha] --segborder is on by default
> Border voxels (adjacent to a different label) are excluded from intensity statistics by default. Use `--no-segborder` to include them. This affects intensity mean/std but NOT the volume count.

> [!gotcha] --empty vs default
> By default (`--non-empty`), only labels with at least one voxel in the segmentation are reported. Use `--empty` to report all labels from the colour table, including those with zero voxels.

> [!gotcha] Global stats require specific flags
> The global brain volume measures (BrainSegVol, eTIV, etc.) are only computed when the corresponding flags are set. `recon-all` uses a very specific combination. Not all flags are needed for simple volume-only runs.

> [!gotcha] Frame selection for 4D inputs
> For 4D inputs, `--frame N` selects a specific frame (0-based). Without this, frame 0 is used. There is no `--frame-avg` flag in `mri_segstats`; to compute average waveforms, use `--avgwf` or `--avgwfvol`.

> [!internal] Cached brain volumes
> The tool can use cached brain volume statistics (enabled by default with `--no-cached` to disable). The cache is stored in the subject's `stats/` directory.

## Related Tools

- [[mris_anatomical_stats]] — surface-based morphometric statistics (thickness, area, curvature)
- [[mri_ca_label]] — generates `aseg.mgz` (primary input)
- [[mri_seg_overlap]] — overlap between two segmentations
- [[mri_seg_diff]] — difference between two segmentations
- [[recon-all]] — calls this tool in autorecon3

## Confidence and Gaps

**Confident (from source):** Complete flag set, eTIV formula and scale factor, border voxel handling, per-label statistics (N, volume, mean, std, SNR), robust statistics, global brain volume flags, Euler number reporting.

**Uncertain:** Exact caching mechanism for brain volume statistics; partial volume correction details.

> [!gap] PVE correction
> The `--pv` option applies partial volume correction but the exact algorithm is not described in the source headers available. The correction uses the PV volume to adjust volume estimates per label.
