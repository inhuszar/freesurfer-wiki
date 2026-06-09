---
title: "mmppsp"
type: pipeline
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/mmppsp"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[wiki/tools/samseg|samseg]]"
  - "[[mris_place_surface]]"
  - "[[exvivo-hemi-proc]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_segment]]"
  - "[[mri_fill]]"
  - "[[mris_fix_topology]]"
  - "[[mris_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "mmppsp is labelled EXPERIMENTAL in its own help; default parameters (intensity bounds, wexpanddist=2, decimation face area 0.5) are tuned heuristics and not formally documented."
  - "The likelihood-vs-posterior scaling (110/wmmean, frame selection via UseProbs) is read from the script; the rationale for frame index 2 as the 'likelihood' frame is inferred from samseg's GlobalWM/GlobalGM probability volume layout, not confirmed against samseg internals."
  - "Several intended features are commented out in the source (mris_ca_label parcellation branch, aparc/rip-label options on the preaparc placement); documented as present-but-disabled."
tags:
  - surface
  - samseg
  - multimodal
  - pial
  - white
  - pipeline
  - experimental
  - exvivo
---

# mmppsp

## Summary

`mmppsp` — **MultiModal Posterior-Probability Surface Placement** — is an experimental tcsh pipeline that reconstructs white and pial cortical surfaces from the **tissue probability maps produced by [[wiki/tools/samseg|samseg]]**, rather than from a conventional intensity-normalized T1. Because [[wiki/tools/samseg|samseg]] is modality-independent (M3I) and can be driven by any number of input contrasts, surfaces placed on its probabilities are likewise modality-independent. The pipeline builds a synthetic "cortical-mass" / "subcortical-mass" intensity volume from samseg's white-matter and grey-matter likelihoods (or posteriors), then runs essentially the full classic FreeSurfer surface stream on that synthetic volume — white-matter segmentation, fill, tessellation, topology fix, sphere, spherical registration, white-surface placement, and pial-surface placement — finishing by calling [[wiki/pipelines/recon-all|recon-all]] sub-stages for parcellation, ribbon, and stats. It exists chiefly to place surfaces on **ex vivo** and **non-standard-contrast** data where the normal recon-all intensity assumptions do not hold, and is invoked by the [[exvivo-hemi-proc]] ex vivo pipeline.

## Source Information

- **Language:** tcsh shell script (multi-stage orchestrator)
- **Source file:** [`scripts/mmppsp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp)
- **Binary/script location:** `$FREESURFER_HOME/bin/mmppsp`
- **Status:** EXPERIMENTAL (stated in the help block, [`scripts/mmppsp:1172`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1172))

## Purpose and Context

The standard FreeSurfer surface stream assumes a 1 mm, intensity-normalized, T1-weighted brain in which white matter sits near a known intensity (≈110) and grey matter below it. That assumption breaks for ex vivo tissue, unusual field strengths, or multi-contrast acquisitions. [[wiki/tools/samseg|samseg]] sidesteps the assumption by modelling the data probabilistically and emitting, per tissue class, a probability/posterior volume. `mmppsp` turns those probability volumes back into a surface reconstruction:

1. It scales samseg's **white-matter** probability so its mean inside the WM segmentation maps to ~110, producing `SubCortMass.mgz` — a synthetic volume in which "white matter" reads like a normalized T1's white matter.
2. It adds the **grey-matter** probability to make `CortMass.mgz`, a synthetic volume whose grey ribbon reads like cortex.
3. It then drives the conventional tools ([[mri_segment]], [[mri_fill]], [[mris_fix_topology]], [[mris_sphere]], [[mris_register]], [[mris_place_surface]]) on those synthetic volumes, with intensity targets pinned to the synthetic 110 scale (`--white_border_hi 110`, etc.).
4. Finally it calls [[wiki/pipelines/recon-all|recon-all]] for parcellation (`-cortparc*`), ribbon, wmparc, and parcstats so the output is a (mostly) standard subject directory.

It is **not** part of recon-all; instead it is a sibling pipeline, called by [[exvivo-hemi-proc]] for ex vivo hemispheres ([`scripts/exvivo-hemi-proc:368-369`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L368-L369)). It builds a full subject directory under its output (`mri/`, `surf/`, `label/`, `scripts/`) by symlinking samseg outputs into the expected recon-all filenames.

> [!gotcha] Likelihood, not posterior, by default
> The help explains the choice: posteriors are heavily shaped by the spatial priors, so by default mmppsp places surfaces on the **likelihood** (`--likelihood`, `UseProbs=2`) to follow the data rather than the atlas ([`scripts/mmppsp:1172-1178`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1172-L1178)). `--posterior` switches to the posterior path.

## Inputs

### Required Inputs

- **A completed samseg run directory** — `--samseg <samsegdir>`, run with `--save-posteriors --save-probabilities` so that `posteriors/` and `probabilities/` are present. The pipeline checks for `<samsegdir>/posteriors` and for each label's posterior file ([`scripts/mmppsp:1114-1126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1114-L1126)). It reads `seg.mgz`, `mode01_bias_corrected.mgz`, `template.m3z`, `samseg.talairach.{lta,xfm}`, and the per-class probability/posterior volumes.
- **At least one hemisphere** — `--lh` and/or `--rh` (defaults to both if neither given).
- An **output/subject directory** — `--o <outdir>` (defaults to `<samsegdir>/surf`). Its basename becomes the subject ID and its parent becomes `SUBJECTS_DIR`.

### Input Assumptions

> [!assumption] samseg probabilities with the expected label set
> mmppsp assumes the samseg run used a GMM that produced `GlobalWM.mgz`, `GlobalGM*.mgz`, and the full `SubCortMassList` of subcortical/white posteriors. For non-whole-brain or ex vivo data the help directs you to an appropriate GMM (`--gmm` to samseg, e.g. the `exvivo.lh.suptent.*` shared-GMM files) ([`scripts/mmppsp:1187-1193`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1187-L1193)). The "likelihood" frame is taken as frame index `UseProbs` (=2) of the probability volumes; the WM scale is `110 / mean(GlobalWM likelihood inside eroded WM seg)`. Voxel resolution is read from `filled.mgz`; sub-millimetre data triggers mesh **decimation** via [[mris_remesh]].

## Outputs

### Files Created

mmppsp populates a near-complete subject directory. Key products (per hemisphere unless noted):

| File | Stage | Contents |
|------|-------|----------|
| `mri/SubCortMass.mgz` | mass build | Synthetic WM-mass volume (WM likelihood scaled to ~110), also linked as `brain.mgz`. |
| `mri/CortMass.mgz` | mass build | Synthetic cortical-mass volume (WM+GM), linked as `brainmask`/`brain.finalsurfs`/`brainmask.finalsurfs`. |
| `mri/mask.mgz` | mask | Dilated brain mask from the samseg seg. |
| `mri/wm.seg.mgz`, `mri/wm.asegedit.mgz`, `mri/wm.mgz` | WM seg | [[mri_segment]] → [[mri_edit_wm_with_aseg]] → [[mri_pretess]] white-matter volume. |
| `mri/filled.mgz` (+ `filled.auto.mgz`) | fill | [[mri_fill]] left/right filled WM (127=rh, 255=lh). |
| `surf/?h.orig.nofix(.predec)`, `?h.orig` | tess/fix | Tessellated and topology-fixed initial surface. |
| `surf/?h.smoothwm`, `?h.inflated`, `?h.sphere`, `?h.sphere.reg` | surf prep | Smoothed/inflated surface, sphere, registered sphere (+ `?h.fsaverage.sphere.reg` link). |
| `surf/?h.white.preaparc`, `?h.white`, `?h.curv` | white | White surface placement via [[mris_place_surface]] on `SubCortMass.mgz`. |
| `surf/?h.white.expand` | expand | White surface expanded by `wexpanddist` mm (init for pial) via [[mris_expand]]. |
| `surf/?h.pial` | pial | Pial surface placement via [[mris_place_surface]] on `CortMass.mgz`. |
| `label/?h.cortex.label`, `?h.cortex+hipamyg.label`, `?h.aparc.annot` | parc | Cortex labels and aparc parcellation. |
| `mri/aparc+aseg.mgz`, ribbon, wmparc, stats | recon-all sub-stages | Produced by the final `recon-all -cortparc2 …` call. |
| `scripts/log/mmppsp.*.log` (+ `mmppsp.log` link) | logging | Run log. |

### Output Specifications

The surfaces are standard FreeSurfer triangle meshes in the geometry of the synthetic mass volumes (which inherit samseg's `mode01_bias_corrected.mgz` geometry). White/pial intensity targets are expressed on the synthetic ~110 scale, **not** raw input intensities. Sub-millimetre inputs are remeshed to a target face area of `DecimationFaceArea = 0.5` mm² ([`scripts/mmppsp:42,553-564`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L553-L564)).

## Mathematical Foundations

The one genuinely quantitative step in the script is the **probability-to-intensity scaling** that makes samseg's likelihoods look like a normalized T1:

> [!math] Scaling white-matter likelihood to 110
> Let $p_{\text{WM}}$ be the GlobalWM likelihood volume (frame `UseProbs`). The pipeline computes the mean of $p_{\text{WM}}$ inside a 2-voxel-eroded WM segmentation with [[mri_segstats]], $\overline{p_{\text{WM}}}$, and forms the scale
> $$ s = \frac{110}{\overline{p_{\text{WM}}}}. $$
> `SubCortMass` is then $s \cdot p_{\text{WM}}$ masked by the brain mask, and the upper WM-segmentation bound defaults to $\mathrm{WMSeg\_whi} = s \cdot \max(p_{\text{WM}})$ ([`scripts/mmppsp:283-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L283-L302)). The cortical mass adds the (identically scaled) GlobalGM likelihood to the subcortical mass ([`scripts/mmppsp:342-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L342-L358)).

In the **posterior** path (`--posterior`, `UseProbs=-1`) the masses are instead built by summing the per-label posterior volumes and multiplying by 110 with [[mri_concat]] `--sum --mul 110` ([`scripts/mmppsp:191-255`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L191-L255)). All subsequent surface mathematics (segmentation, filling, tessellation, topology correction, inflation, spherical mapping, registration, surface deformation) is delegated to the standard FreeSurfer tools listed under [Processing Stages](#processing-stages-pipeline-context).

## Configuration Options

### Complete Flag Reference

All flags enumerated from the parser ([`scripts/mmppsp:954-1096`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L954-L1096)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--samseg` | string | *(required)* | samseg run directory (needs `posteriors/` and `probabilities/`). |
| `--o` | string | `<samsegdir>/surf` | Output/subject directory; basename = subject, parent = `SUBJECTS_DIR`. |
| `--sd` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` (note: also re-derived from `--o`). |
| `--lh` | bool | both | Process the left hemisphere (append). |
| `--rh` | bool | both | Process the right hemisphere (append). |
| `--likelihood` | bool | **on** (`UseProbs=2`) | Place surfaces on the GlobalWM/GlobalGM **likelihood**. |
| `--posterior` | bool | off (`UseProbs=-1`) | Place surfaces on summed **posteriors** instead (priors-influenced). |
| `--putamen-is-gm` / `--no-putamen-is-gm` | bool | off | Add `Putamen.mgz` probability to the GM mass (treat putamen as cortex-like). |
| `--no-initsphreg` | bool | init on | Do **not** seed [[mris_register]] rotation with `samseg.talairach.lta`. |
| `--seg-wlo`<br>`-seg-wlo`<br>`-wlo` | float | (mri_segment default) | Lower WM intensity bound passed to [[mri_segment]] `-wlo`. (No matching `-whi` CLI flag; the high bound is computed, see math.) |
| `--wexpanddist` | float mm | `2` | Distance to expand the white surface to initialize the pial ([[mris_expand]]); `0` links white→white.expand (no expansion). |
| `--stop-after` | enum | — | Stop after a named stage: `tess`, `fix`, `preaparc`, `sphere`, `spherereg`, `white`, `pial` (see below). |
| `--force-update` | bool | off | Recompute every stage regardless of timestamps. |
| `--threads` | int | `1` | Threads; also sets `OMP_NUM_THREADS`/`FS_OMP_NUM_THREADS` for the re-entrant recon-all calls. |
| `--log` | string | auto | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | — | Log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | auto | Temp dir; sets `cleanup=0`. |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temporaries. |
| `--debug` | bool | off | `set echo`/`verbose`. |
| `--help`, `--version` | flag | — | Help / version. |

### Configuration Interactions

> [!gotcha] --likelihood and --posterior select entirely different mass-construction code paths
> They set `UseProbs` to `2` and `-1` respectively, which branch the whole subcortical/cortical-mass build between a likelihood-scaling path and a posterior-summing path ([`scripts/mmppsp:191-373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L191-L373)). The last one on the command line wins. Likelihood is the recommended default.

> [!gotcha] --stop-after gates a single shared loop, not separate jobs
> The seven stop points set one of `StopAfter{Tess,Fix,PreAparc,Sphere,SphereReg,White,Pial}` and `goto done_exit` mid-loop. With both hemispheres requested, a `--stop-after` fires inside the **per-hemisphere** loop, so it halts during the first hemisphere reached — useful for staged debugging, less so for producing a balanced partial subject. The same stage names are surfaced one level up by [[exvivo-hemi-proc]] as `--stop-mmppsp-after`.

> [!gotcha] --wexpanddist 0 skips expansion entirely
> Setting `--wexpanddist 0` does not expand the white surface; it just symlinks `?h.white.expand → ?h.white`, so the pial placement initializes from the unexpanded white ([`scripts/mmppsp:844-848`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L844-L848)). The script comment notes the expansion was added to work around a CortMass-calculation issue the author "can't remember"; treat the default of 2 mm as a heuristic.

> [!gotcha] Edit-aware re-runs
> mmppsp is designed to **respect manual edits**. It keeps `*.auto.mgz` copies of `SubCortMass`/`CortMass`/`filled` and uses [[mri_diff]] `--merge-edits` to fold edits forward; it checks `wm.mgz` for edits with [[mri_binarize]] `--count` and, if edited and different from `wm.seg.mgz`, copies the edit in and adds `-keep` to [[mri_segment]] ([`scripts/mmppsp:394-418`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L394-L418)). The help states "I *think* it should respect edits."

## Typical Use Cases

### Whole-brain in vivo, both hemispheres

```bash
# 1) samseg with probabilities + posteriors saved:
samseg --i input1.mgz --o samsegdir --save-posteriors --save-probabilities --threads 8
# 2) place surfaces on the likelihood:
mmppsp --samseg samsegdir --o $SUBJECTS_DIR/subjname --threads 8
```

### Single hemisphere (e.g. ex vivo)

```bash
# Use an appropriate exvivo GMM in the samseg call; then:
mmppsp --samseg samsegdir --o $SUBJECTS_DIR/exvivo_lh --lh --threads 8
```

### Stop after the white surface for QC

```bash
mmppsp --samseg samsegdir --o $SUBJECTS_DIR/subjname --stop-after white
```

### Posterior-based placement

```bash
mmppsp --samseg samsegdir --o $SUBJECTS_DIR/subjname --posterior
```

## Processing Stages (Pipeline Context)

mmppsp runs, in order, the following (most steps guarded by `UpdateNeeded`):

1. **Set-up / symlinks** — link samseg outputs into recon-all filenames; convert `talairach.xfm`→`.lta` via [[lta_convert]].
2. **Mask** — [[mri_binarize]] builds a dilated brain mask.
3. **Mass build** — scale GlobalWM (and GlobalGM) likelihood (or sum posteriors) → `SubCortMass.mgz`, `CortMass.mgz`.
4. **WM volume** — [[mri_segment]] → [[mri_edit_wm_with_aseg]] → [[mri_pretess]] → `wm.mgz`.
5. **Fill** — [[mri_fill]] (with optional `entowm` entorhinal fix) → `filled.mgz`.
6. **Tessellate** — [[mri_pretess]] + [[mri_tessellate]] `-new` + [[mris_extract_main_component]] → `?h.orig.nofix.predec`; optional [[mris_remesh]] decimation for sub-mm data → `?h.orig.nofix`.
7. **Surface prep** — [[mris_smooth]] → [[mris_inflate]] → [[mris_sphere]] `-q` (qsphere).
8. **Topology fix** — [[mris_fix_topology]] → `?h.orig`; [[defect2seg]].
9. **White (preaparc)** — [[mris_autodet_gwstats]] then [[mris_place_surface]] `--white` on `SubCortMass.mgz` → `?h.white.preaparc`.
10. **Cortex label / smooth / inflate / sphere** — [[mri_label2label]] `--label-cortex`, [[mris_smooth]], [[mris_inflate]], [[mris_curvature]], [[mris_sphere]].
11. **Spherical registration** — [[mris_register]] (seeded by talairach.lta unless `--no-initsphreg`) → `?h.sphere.reg`.
12. **Parcellation** — `recon-all -cortparc` (the `mris_ca_label` branch is present but commented out).
13. **White surface** — [[mris_place_surface]] `--white` (with aparc, rip labels) → `?h.white`, `?h.curv`.
14. **Expand + Pial** — [[mris_expand]] → [[mris_place_surface]] `--pial` on `CortMass.mgz` → `?h.pial`.
15. **Finalize** — [[defect2seg]]; `recon-all -cortparc2 -cortparc3 -balabels -apas2aseg -aparc2aseg -cortribbon -wmparc -parcstats -parcstats2 -parcstats3 -curvHK`.

**Predecessor:** [[wiki/tools/samseg|samseg]] (`--save-probabilities --save-posteriors`) → **mmppsp** → **Successor:** a standard analysis on the resulting subject directory; when launched from [[exvivo-hemi-proc]], mmppsp is the surface-placement core of that ex vivo pipeline.

## Gotchas and Caveats

> [!gotcha] EXPERIMENTAL — interfaces and defaults may change
> The help banner labels mmppsp experimental. Default intensity bounds, the 110 scaling, `wexpanddist=2`, and `DecimationFaceArea=0.5` are tuned heuristics, not validated parameters. Results on novel contrasts should be QC'd carefully.

> [!gotcha] Output directory IS the subject
> `--o` is treated as a subject directory: its basename is the subject ID and its parent silently becomes `SUBJECTS_DIR` ([`scripts/mmppsp:86-89`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L86-L89)). Point `--o` at `$SUBJECTS_DIR/<subject>`, not at an arbitrary scratch folder, or recon-all sub-stages will write to the wrong place.

> [!gotcha] Calls recon-all internally (re-entrant)
> Stages 12 and 15 invoke [[wiki/pipelines/recon-all|recon-all]] on the same subject. mmppsp exports `FS_OMP_NUM_THREADS` so those nested recon-all runs honour `--threads`. A failure inside the nested recon-all surfaces as an mmppsp error.

> [!gotcha] Disabled/commented features
> The alternative parcellation via [[mris_ca_label]] (an `if(0)` block, [`scripts/mmppsp:797-810`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L797-L810)) and several `--aparc/--rip-label/--rip-bg` options on the *preaparc* white placement are present but commented out. Do not rely on them.

## Error Compensation and Guard Rails

- **Resumable / edit-aware:** nearly every stage is wrapped in `UpdateNeeded`, and the mass/fill/wm volumes keep `.auto` copies with [[mri_diff]] `--merge-edits` so manual edits survive re-runs (the central design goal).
- **Input validation:** errors if `--samseg` is missing, if `posteriors/` is absent, or if any required posterior / init-surface / rip-label file is missing ([`scripts/mmppsp:1104-1132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1104-L1132)).
- **Resolution-aware meshing:** sub-millimetre `filled.mgz` automatically triggers [[mris_remesh]] decimation to keep mesh size manageable.
- **Entorhinal WM fix:** if `entowm.mgz` exists, the fill is patched to force ento-WM labels (3006/4006) into `filled.mgz` and a freezing overlay is sampled to the surface ([`scripts/mmppsp:473-485,651-665`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L473-L485)).
- **Per-stage status checks:** any failed tool triggers `goto error_exit` (exit 1).

## Related Tools

- [[wiki/tools/samseg|samseg]] — produces the probability/posterior volumes mmppsp consumes; must be run with `--save-probabilities --save-posteriors`.
- [[exvivo-hemi-proc]] — the ex vivo hemisphere pipeline that calls mmppsp (`--stop-mmppsp-after` forwards `--stop-after`).
- [[mris_place_surface]] — the white and pial placement engine, run here on the synthetic mass volumes.
- [[mri_segment]] / [[mri_fill]] / [[mris_fix_topology]] / [[mris_sphere]] / [[mris_register]] — the classic surface-stream tools mmppsp orchestrates on samseg-derived intensities.
- [[mris_remesh]] — decimates the tessellation for sub-millimetre inputs.
- [[wiki/pipelines/recon-all|recon-all]] — called internally for parcellation, ribbon, wmparc, and stats; mmppsp is a sibling/alternative surface pipeline, not a recon-all stage.

## Confidence and Gaps

**High confidence** on the stage sequence, the flag set, the likelihood/posterior branch, the `--stop-after` mechanism, the edit-merging guard rails, the synthetic-mass scaling, and the samseg/[[exvivo-hemi-proc]] context — all read directly from [`scripts/mmppsp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp).

> [!gap] Heuristic parameters
> The numeric choices (scale to 110, `wexpanddist=2`, decimation face area 0.5, the white/pial intensity bounds) are tuned values without formal documentation; their sensitivity is unknown.

> [!gap] Likelihood frame index
> The "likelihood" is frame `UseProbs=2` of samseg's `GlobalWM.mgz`/`GlobalGM*.mgz`. The exact meaning of that frame depends on samseg's probability-volume layout and was not confirmed against samseg internals.

> [!gap] Disabled branches
> The `mris_ca_label` parcellation and several rip/aparc options on the preaparc placement are commented out in v8.2.0; their intended behaviour is not documented here.

## References

- FreeSurfer source: [`scripts/mmppsp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp) (v8.2.0).
- Caller: [`scripts/exvivo-hemi-proc:368-369`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/exvivo-hemi-proc#L368-L369).
- Built-in help / workflow notes: the `BEGINHELP` block, [`scripts/mmppsp:1170-1201`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/mmppsp#L1170-L1201).
- Method background: [[wiki/tools/samseg|samseg]] (Puonti et al., *NeuroImage* 2016) for the probabilistic segmentation the surfaces are placed on.
