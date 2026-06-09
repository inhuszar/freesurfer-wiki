---
title: "recon-all-clinical — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 12
last_agent_update: 2026-06-09
tags:
  - faq
  - recon-all-clinical
  - synthseg
  - synthsr
  - clinical-mri
  - community-knowledge
---

# recon-all-clinical — Frequently Asked Questions

This FAQ collects recurring questions about the [[recon-all-clinical.sh]]
pipeline that have been answered by the FreeSurfer developers on the
mailing list. `recon-all-clinical` is a deep-learning pipeline (built
on [[mri_synthseg]] and [[mri_synthsr]]) for processing clinical-quality
MRI of arbitrary contrast, resolution, and slice thickness — its
behaviour and constraints differ in several important ways from the
standard [[wiki/pipelines/recon-all|recon-all]] pipeline.

> For tool reference, see [[recon-all-clinical.sh]]. For the standard
> pipeline, see [[wiki/pipelines/recon-all|recon-all]] and the [[longitudinal-processing]]
> concept page.

---

## Inputs and contrast

### Can `recon-all-clinical` accept multiple input scans like `recon-all -i scan1 -i scan2`?

**Short answer:** No — it accepts exactly one scan per run, but that
scan can be of any contrast and any resolution.

**Detail:** Standard [[wiki/pipelines/recon-all|recon-all]] supports multiple `-i` flags and
averages the inputs (motion-corrected) into a single T1. The clinical
pipeline does not — it expects one input volume only. The trade-off is
that the single input may be T1, T2, FLAIR, PD, or any other contrast,
and may be at any resolution from sub-millimetre isotropic down to
thick-slice clinical acquisitions; SynthSeg is contrast-agnostic, so
no contrast flag is needed. If you have multiple scans of the same
contrast and want to average, do it externally (e.g. `mri_motion_correct`,
`mri_average`, or `fslmerge -Tmean`) and pass the average as a single
`-i`. If you want T2/FLAIR-driven pial surface refinement, you must
run standard [[wiki/pipelines/recon-all|recon-all]] with `-T2` or `-FLAIR` instead — the
clinical pipeline cannot use additional modalities.

**Provenance:** Mailing list, 2023-11-13 (Iglesias). See
`raw/mailing-list/2023-11-recon-all-clinical-one-scan-limit.md` and
`raw/mailing-list/2023-11-recon-all-clinical-single-scan-only-any-contrast.md`.

**Related:** [[recon-all-clinical.sh]], [[wiki/pipelines/recon-all|recon-all]], [[mri_synthseg]]

---

### Can I run `recon-all-clinical` on a contrast-enhanced (gadolinium) T1?

**Short answer:** In principle yes for segmentation, but the surface
reconstruction will probably fail — the recommended workflow is to run
[[mri_synthsr]] first and feed its output to standard [[wiki/pipelines/recon-all|recon-all]].

**Detail:** [[mri_synthseg]] is robust to non-standard contrast, so the
volumetric segmentation step of `recon-all-clinical` may succeed on a
Gd-enhanced T1. However, the downstream surface placement step
(`recon-surf`) still uses intensity cues from the input image, and
gadolinium changes WM/GM/CSF intensity ratios in ways the surface
algorithms do not expect (vessels and lesions become hyperintense).
Iglesias's recommended workflow:

```bash
mri_synthsr --i ce_t1.mgz --o synthsr_t1.mgz
recon-all -s SUBJECT -i synthsr_t1.mgz -all
```

[[mri_synthsr]] both normalises the contrast to a standard 1 mm T1 and
inpaints lesion/enhancement signal abnormalities, producing an image
suitable for standard surface reconstruction. If you only need
subcortical volumes (no surfaces), `recon-all-clinical` directly on
the Gd-T1 may be sufficient.

**Provenance:** Mailing list, 2024-06-14 (Iglesias). See
`raw/mailing-list/2024-06-recon-all-clinical-contrast-enhanced-t1-synthsr.md`.

**Related:** [[recon-all-clinical.sh]], [[mri_synthsr]], [[mri_synthseg]], [[wiki/pipelines/recon-all|recon-all]]

---

## Outputs and differences from standard recon-all

### Why is `aseg.stats` missing from `recon-all-clinical` output, and how do I generate it?

**Short answer:** It is missing by design; regenerate it with
[[mri_segstats]] from the segmentation volume.

**Detail:** The clinical pipeline is a streamlined deep-learning
workflow that does not run the full statistics suite of standard
[[wiki/pipelines/recon-all|recon-all]], so [[aseg.stats]] is not produced automatically. Any
downstream tool that consumes it (e.g. [[asegstats2table]]) will
otherwise fail. To rebuild it, run:

```bash
mri_segstats \
  --seg $SUBJECTS_DIR/SUBJECT/mri/aseg.mgz \
  --sum $SUBJECTS_DIR/SUBJECT/stats/aseg.stats \
  --pv $SUBJECTS_DIR/SUBJECT/mri/norm.mgz \
  --empty --brainmask $SUBJECTS_DIR/SUBJECT/mri/brainmask.mgz \
  --brain-vol-from-seg --excludeid 0 --excl-ctxgmwm \
  --supratent --subcortgray \
  --in $SUBJECTS_DIR/SUBJECT/mri/norm.mgz \
  --in-intensity-name norm --in-intensity-units MR \
  --surf-wm-vol --surf-ctx-vol --totalgray --euler \
  --ctab $FREESURFER_HOME/ASegStatsLUT.txt \
  --subject SUBJECT
```

For a minimal volume-only summary, the `--seg ... --sum ...` pair on
its own is sufficient.

**Provenance:** Mailing list, 2023-11-14 (Huang). See
`raw/mailing-list/2023-11-recon-all-clinical-no-aseg-stats-mri-segstats-workaround.md`.
Cross-referenced with `raw/mailing-list/2023-06-recon-all-clinical-colortable-ba-thresh-missing-741.md`.

**Related:** [[recon-all-clinical.sh]], [[mri_segstats]], [[aseg.mgz]], [[aseg.stats]], [[asegstats2table]]

---

### Why are `Left-choroid-plexus` / `Right-choroid-plexus` and `vessel` labels missing from the segmentation?

**Short answer:** [[mri_synthseg]] cannot reliably segment those thin,
low-contrast structures from arbitrary clinical scans, so the clinical
pipeline simply does not output them.

**Detail:** Standard [[wiki/pipelines/recon-all|recon-all]] uses an atlas-based GCA segmenter
on standardised 1 mm T1 input, which can pick out small structures
like choroid plexus and vessels. SynthSeg, trained to generalise
across contrasts and resolutions, cannot detect them reliably and
omits them from the output. Iglesias's suggested workaround if you
need a rough choroid plexus estimate: extract the ventricle ROI from
the SynthSeg segmentation, then split the underlying intensities into
CSF and choroid via optimal thresholding (e.g. Otsu). The standard
recon-all formula `VentricleChoroidVol − Left-Lateral-Ventricle −
Right-Lateral-Ventricle` does **not** transfer here because the
composite `VentricleChoroidVol` label is a standard-recon-all output.
If choroid plexus volume is a primary measurement, a dedicated
choroid plexus segmentation network is preferable.

**Provenance:** Mailing list, 2024-01-05 (Iglesias). See
`raw/mailing-list/2024-01-recon-all-clinical-missing-choroid-vessel-structures.md`.

**Related:** [[recon-all-clinical.sh]], [[mri_synthseg]], [[aparc+aseg.mgz]], [[color-lut]]

---

### Are volumes from `recon-all-clinical` and standard `recon-all` directly comparable?

**Short answer:** Volume estimates are highly correlated between the
two pipelines (see Figure 4 of the SynthSeg PNAS paper), but they
should not be naively pooled — and entorhinal cortex thickness in
particular has had a known bug.

**Detail:** The two pipelines use fundamentally different
methodology — standard [[wiki/pipelines/recon-all|recon-all]] uses GCA atlas-based segmentation
and iterative surface placement on a real T1, whereas the clinical
pipeline uses [[mri_synthsr]] super-resolution + [[mri_synthseg]]
segmentation + a deep-learning surface stage. Iglesias has confirmed
that volumes are highly correlated across structures (validated in
the PNAS paper) but the absolute values are not interchangeable.
A specific known defect from August 2023: entorhinal cortex thickness
from `recon-all-clinical` was approximately 3–4× larger than the
standard pipeline value.

> [!gap] Verify whether the entorhinal-cortex thickness inflation
> reported by Iglesias in Aug 2023 (FS 7.x) has been resolved in
> FS 8.2.0 before comparing entorhinal thickness across pipelines.

**Provenance:** Mailing list, 2023-08-01 (Iglesias). See
`raw/mailing-list/2023-08-recon-all-clinical-etiv-entorhinal-thickness-caveat.md`.

**Related:** [[recon-all-clinical.sh]], [[wiki/pipelines/recon-all|recon-all]], [[mri_synthseg]], [[mri_synthsr]]

---

### Why does `brainmsk.mgz` from `recon-all-clinical` have no ventricles?

**Short answer:** In the clinical pipeline `mri/brainmsk.mgz` is a
synthetic mask that excludes ventricles; the equivalent of the
standard-pipeline `brainmsk.mgz` is `mri/synthSR.mgz`, which does
contain ventricles.

**Detail:** This is a naming/role mismatch between the two pipelines:
the file at `mri/brainmsk.mgz` in a `recon-all-clinical` subject does
not play the same role as in a standard [[wiki/pipelines/recon-all|recon-all]] subject. For
visualisation or downstream uses where you expect a brain volume
including ventricles, use `mri/synthSR.mgz` instead.

**Provenance:** Mailing list, 2023-06-27 (Mc Laughlin / Huang). See
`raw/mailing-list/2023-06-recon-all-clinical-colortable-ba-thresh-missing-741.md`.

**Related:** [[recon-all-clinical.sh]], [[brainmask.mgz]]

---

## Longitudinal compatibility

### Can `recon-all-clinical` be used with the FreeSurfer longitudinal pipeline?

**Short answer:** No — there is no longitudinal mode for
`recon-all-clinical`, and its outputs cannot be plugged into the
standard longitudinal pipeline either.

**Detail:** Two independent developer statements (Iglesias 2025-02,
Gopinath 2024-11) confirm there is no longitudinal version of
`recon-all-clinical` and no current plan to adapt the standard
[[longitudinal-processing]] pipeline to it. Two technical obstacles
make adaptation difficult: (1) the clinical pipeline targets
anisotropic thick-slice data, while the longitudinal pipeline
(unbiased base template, etc.) was designed for ~1 mm isotropic
input; and (2) the deep-learning steps ([[mri_synthseg]],
[[mri_synthsr]]) do not have established longitudinal counterparts.
The recommended workaround is to run `recon-all-clinical`
cross-sectionally at each timepoint and use the resulting
cross-sectional measurements in a longitudinal statistical model
(e.g. linear mixed effects).

**Provenance:** Mailing list, 2025-02-12 (Iglesias) and 2024-11-26
(Gopinath). See
`raw/mailing-list/2025-02-recon-all-clinical-no-longitudinal-pipeline-use-cross-sectional.md`,
`raw/mailing-list/2024-11-recon-all-clinical-no-longitudinal-support.md`,
`raw/mailing-list/2024-11-recon-all-clinical-incompatible-with-longitudinal-pipeline.md`.

**Related:** [[recon-all-clinical.sh]], [[longitudinal-processing]], [[mri_synthseg]]

---

### My study has clinical T1 at one timepoint and 1 mm 3D T1 at another — can I mix `recon-all-clinical` and standard `recon-all` across timepoints?

**Short answer:** No. The two pipelines produce intermediate files
(notably [[norm.mgz]]) that are not directly comparable, so the
unbiased base template step would be invalid.

**Detail:** Gopinath (2024-11-26) named [[norm.mgz]] specifically:
the clinical-pipeline `norm.mgz` is built from the [[mri_synthsr]]
synthesised T1 and has different intensity distribution and a
different vox2ras orientation (diagonal/positive rather than the
FS-conventional LIA-style orientation; this same header difference
is what causes the BEM-normals problem documented below). Iglesias
(2023-06-20) had previously confirmed the same point: clinical
intermediate files are not comparable to standard-pipeline
counterparts. The incompatibility is symmetric — neither
clinical-then-standard nor standard-then-clinical works. For
heterogeneous studies, options are:

- Process all timepoints with `recon-all-clinical` (no longitudinal
  pipeline; cross-sectional measurements only).
- Process all timepoints with standard [[wiki/pipelines/recon-all|recon-all]] (may fail or
  require manual editing on the thick-slice timepoints).
- Use [[mri_synthseg]] directly at each timepoint (volumetric only;
  bypasses the surface-pipeline mismatch entirely).

**Provenance:** Mailing list, 2024-11-26 (Gopinath) and 2023-05/06
(Iglesias). See
`raw/mailing-list/2024-11-recon-all-clinical-incompatible-with-longitudinal-pipeline.md`,
`raw/mailing-list/2024-11-recon-all-clinical-no-longitudinal-support.md`,
`raw/mailing-list/2023-06-recon-all-clinical-outputs-not-usable-as-cross-for-longitudinal.md`.

**Related:** [[recon-all-clinical.sh]], [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]], [[norm.mgz]]

---

### Is SynthSeg test–retest reliability good enough to substitute for the longitudinal pipeline?

**Short answer:** Greve's assessment is no — SynthSeg's reliability is
good in absolute terms but inferior to the longitudinal stream on
longitudinal data, because the longitudinal pipeline explicitly
models subject-specific anatomy via its unbiased template.

**Detail:** Running [[mri_synthseg]] independently per timepoint is
attractive when standard recon-all fails on difficult data, but
Greve has stated that for true longitudinal change detection the
shared-template approach of [[longitudinal-processing]] is more
sensitive. `mri_sclimbic_seg` likewise has no longitudinal mode —
the structures it segments are not in the longitudinal stream at
all. For mTBI / lesion / pathology cohorts, manual editing of
problem cases in the standard pipeline is generally preferable to
switching to a contrast-agnostic deep-learning tool for the entire
cohort.

**Provenance:** Mailing list, 2023-06-20 (Greve / Iglesias). See
`raw/mailing-list/2023-06-recon-all-clinical-outputs-not-usable-as-cross-for-longitudinal.md`.

**Related:** [[recon-all-clinical.sh]], [[mri_synthseg]], [[longitudinal-processing]]

---

## System requirements

### How much RAM does `recon-all-clinical` need? Mine OOMs at 16 GB.

**Short answer:** Effectively ~32 GB. The SynthSeg tensor allocation
exceeds 16 GB physical RAM, and swap is not a reliable substitute.

**Detail:** Standard [[wiki/pipelines/recon-all|recon-all]] runs comfortably on 16 GB, but
`recon-all-clinical` invokes [[mri_synthseg]], which allocates a
large 5-D tensor (`[1, 256, 256, 160, 72]` float32 ≈ 7.2 GB) plus
overhead during inference, so peak memory consistently exceeds 16 GB.
Empirical findings from the mailing list:

- Native Linux with a 16 GB swap file peaked at ~21 GB combined and
  still crashed — swap is not a workable substitute for RAM here.
- WSL: a 32 GB `.wslconfig` swap allowance over 16 GB RAM allowed
  ~27/30 scans to complete, but failures are unpredictable.
- Upgrading to 32 GB physical RAM resolved the issue in every
  reported case.

`fsbuild` recommends the official FreeSurfer VirtualBox VM over WSL
for users on Windows with marginal memory. Conforming inputs to
256³ before processing may slightly reduce peak memory but does not
change the fundamental requirement.

**Provenance:** Mailing list, 2023-07-13 to 2023-08-19 (fsbuild,
Fischl, Lynch). See
`raw/mailing-list/2023-08-recon-all-clinical-oom-32gb-ram-required-wsl-swap.md`.

**Related:** [[recon-all-clinical.sh]], [[mri_synthseg]]

---

## Known bugs and quirks

### `ERROR: cannot find colortable_BA_thresh.txt` — what's going on (FS 7.4.0 / 7.4.1)?

**Short answer:** It is a release-vs-dev script mismatch. Either
download the missing `colortable_BA_thresh.txt` from the GitHub dev
tree into `$FREESURFER_HOME/average/`, or rename the existing
`colortable_BA.txt` to `colortable_BA_thresh.txt`.

**Detail:** Around FS 7.4.0 the FreeSurfer wiki advised users to
replace `$FREESURFER_HOME/bin/recon-all-clinical.sh` with the
GitHub dev-branch version to fix an unrelated entorhinal bug. The
dev-branch script references `colortable_BA_thresh.txt`, which is
not shipped with the 7.4.0 / 7.4.1 binary release — hence the error.
Both fixes are confirmed correct by Huang (FreeSurfer build team):

- Download the file from the FreeSurfer GitHub `dev` branch and
  drop it in `$FREESURFER_HOME/average/`, or
- Rename the existing `$FREESURFER_HOME/average/colortable_BA.txt`
  to `colortable_BA_thresh.txt`.

**Provenance:** Mailing list, 2023-06-27 and 2023-11-14 (Huang). See
`raw/mailing-list/2023-06-recon-all-clinical-colortable-ba-thresh-missing-741.md`,
`raw/mailing-list/2023-11-recon-all-clinical-no-aseg-stats-mri-segstats-workaround.md`.

**Related:** [[recon-all-clinical.sh]]

---

### My MEG/EEG sensors land in space when I make BEM surfaces from `recon-all-clinical` output (FS 8.1).

**Short answer:** The clinical pipeline writes volumes with a
diagonal/positive vox2ras header rather than the FS-conventional
orientation; tools like mne-python's watershed BEM are sensitive
to this and produce surfaces with inverted normals. Run
[[wiki/tools/mri_convert|mri_convert]] `--conform` on the volume before BEM generation as
a workaround.

**Detail:** All `recon-all-clinical` output volumes share the same
RAS world coordinates as standard [[wiki/pipelines/recon-all|recon-all]] volumes, so this is
not a true geometric mismatch — it is purely a vox2ras header
orientation difference. Tools that work directly in RAS are
unaffected; tools that consume vox2ras orientation conventions
(such as mne-python's watershed BEM) interpret the header as having
opposite winding and produce surfaces whose normals point inward.
Iglesias has acknowledged this and stated that producing
FS-orientation volumes is a planned fix for `recon-all-clinical`,
but the workaround is to reorient the volume yourself first:

```bash
mri_convert --conform $SUBJECTS_DIR/SUBJECT/mri/norm.mgz norm_conformed.mgz
# then point the BEM tool at norm_conformed.mgz
```

In the originally reported case, 7/8 subjects retained 99–100%
source retention after this workaround.

**Provenance:** Mailing list, 2026-03-25 to 2026-03-26 (Peled /
Iglesias). See
`raw/mailing-list/2026-03-recon-all-clinical-bem-inverted-normals.md`.

**Related:** [[recon-all-clinical.sh]], [[wiki/tools/mri_convert|mri_convert]], [[norm.mgz]], [[coordinate-systems]]

---

### Why is entorhinal cortex thickness from `recon-all-clinical` so much larger than from standard `recon-all`?

**Short answer:** Iglesias confirmed in August 2023 that
`recon-all-clinical` produced entorhinal cortex thickness ~3–4×
larger than standard [[wiki/pipelines/recon-all|recon-all]] — a known bug under
investigation at the time. Verify whether it is fixed in your FS
version before comparing entorhinal thickness across pipelines.

**Detail:** The discrepancy is specific to entorhinal cortex
thickness; volume estimates across the rest of the brain are
highly correlated between the two pipelines (see the SynthSeg PNAS
validation paper, Figure 4). If you need hippocampal-subregion or
entorhinal-thickness measures from a clinical-quality scan,
Iglesias's recommended workaround is the SynthSR-then-recon-all
chain: run `recon-all-clinical` to obtain its synthetic 1 mm T1
(`mri/synthSR.mgz` or equivalent), treat that as the input to
standard [[wiki/pipelines/recon-all|recon-all]], then run `segment_subregions` on the
standard subject directory.

> [!gap] As of FS 8.2.0 (April 2026) it has not been re-verified
> whether the 3–4× entorhinal thickness inflation is still present.
> Test before relying on entorhinal thickness from
> `recon-all-clinical` output.

**Provenance:** Mailing list, 2023-08-01 (Iglesias). See
`raw/mailing-list/2023-08-recon-all-clinical-etiv-entorhinal-thickness-caveat.md`.

**Related:** [[recon-all-clinical.sh]], [[wiki/pipelines/recon-all|recon-all]], [[mri_synthsr]], [[mri_synthseg]]

---

## See also

- [[rca-rcac-prep]] — packages the "run the clinical / SynthSR + SynthSeg
  deep-learning tools first, then hand the cleaned-up volume to the standard
  [[wiki/pipelines/recon-all|recon-all]] surface stream" workflow recommended in several entries
  above, as a single preprocessing script.
