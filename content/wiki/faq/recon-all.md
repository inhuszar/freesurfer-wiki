---
title: "recon-all — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 25
last_agent_update: 2026-04-27
tags:
  - faq
  - recon-all
  - autorecon
  - pipeline
  - editing
  - flair
  - synthseg-flag
---

# recon-all — Frequently Asked Questions

This FAQ collects recurring questions about the standard
[[wiki/pipelines/recon-all|recon-all]] cortical-reconstruction pipeline that have been answered
on the FreeSurfer mailing list. It covers input handling and conform
behaviour, multi-modal acquisitions (FLAIR/T2, MP2RAGE, T1 maps,
pediatric data), manual editing and partial re-runs, threading and
parallelism, the SynthSeg / N4 / ANTs ecosystem, filesystem
requirements, and a number of FS 7→8 quirks. Note: the deep-learning
clinical variant has its own FAQ at [[recon-all-clinical]] — questions
about that pipeline belong there.

> For tool-level reference see [[wiki/pipelines/recon-all|recon-all]] (pipeline page). Related
> FAQs: [[recon-all-clinical]], [[longitudinal]], [[wiki/tools/samseg|samseg]],
> [[synthseg-and-synthsr]], [[surface-morphometry]].

---

## Inputs and conform behaviour

### Can I keep my input's original matrix size and avoid the 256³ zero-padding?

**Short answer:** No — recon-all always conforms to 256×256×256 at
1 mm isotropic; use the FsAnat-to-NativeAnat post-processing to map
outputs back into the native grid.

**Detail:** The pipeline calls `mri_convert --conform` early on, which
forces a 256³ / 1 mm isotropic geometry in standard near-RAS
orientation; if the input FOV is smaller than 256 mm in any dimension
the volume is zero-padded. This cannot be disabled — internal atlases,
surface algorithms and the coordinate frame all assume the conformed
geometry. To bring outputs (e.g. [[aparc+aseg.mgz]]) back into the
original T1 grid, use the FreeSurfer wiki's **FsAnat-to-NativeAnat**
recipe, which applies the inverse of the conform transform. The
pre-conform input is preserved in `mri/rawavg.mgz`.

**Provenance:** Mailing list, 2023-09-10 (Greve). See
`raw/mailing-list/2023-09-recon-all-always-zero-pads-fsanat-to-nativeanat.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[wiki/tools/mri_convert|mri_convert]], [[rawavg.mgz]],
[[coordinate-systems]]

---

### Can I preserve the original image orientation through the conform step?

**Short answer:** Yes — pass `-conform-dc` to keep the original
direction cosines (the volume is still padded to 256³ at 1 mm).

**Detail:** By default `mri_convert --conform` rewrites the direction
cosines to a standard near-RAS orientation. The recon-all flag
`-conform-dc` (set via `scripts/recon-all` `ConformKeepDC=1`,
propagated to `mri_convert --conform-dc`) preserves the input's
direction cosines, which is useful when you need recon-all output to
stay in a specific scanner coordinate frame for downstream multi-modal
alignment without re-registration. Note that this only preserves
**orientation** — matrix size and voxel spacing are still conformed.
For the matrix-size question see the previous entry.

```bash
recon-all -s SUBJECT -i scan.nii.gz -all -conform-dc
```

**Provenance:** Mailing list, 2024-01-01 (Greve). See
`raw/mailing-list/2024-01-recon-all-conform-dc-preserve-orientation.md`.
Code-verified: `scripts/recon-all` (option parsed; applied at the
conform step).

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[wiki/tools/mri_convert|mri_convert]], [[coordinate-systems]]

---

### How do I switch the conform interpolation from trilinear to cubic spline?

**Short answer:** Add `-cubic` to the recon-all command line.

**Detail:** The default `mri_convert --conform` resampling uses
trilinear interpolation, which can blur images that require heavy
resampling (e.g. a rectangular FOV being padded and reoriented to
256³). Passing `-cubic` switches the conform call (and a couple of
later surface-pipeline resamples — pial-surface and a mapping step) to
cubic-spline interpolation. Greve recommends this for non-isotropic or
rectangular-FOV data where trilinear blurring is visible. Cubic can
introduce mild Gibbs-like ringing near sharp edges, so visually QC
the result.

```bash
recon-all -s SUBJECT -i input.nii.gz -all -cubic
```

**Provenance:** Mailing list, 2024-08-21 (Greve). See
`raw/mailing-list/2024-08-recon-all-cubic-conform-interpolation.md`.
Code-verified: `scripts/recon-all` (`-cubic` parsed and propagated).

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[wiki/tools/mri_convert|mri_convert]]

---

## Multi-modal and special acquisitions

### What does the `-FLAIR` (and `-T2`) flag actually use FLAIR for? Will it improve WM volumetrics?

**Short answer:** FLAIR is used **only** for pial-surface refinement —
it does not affect WM segmentation, skull stripping, or any other
stage; if you only care about WM, omit it.

**Detail:** When `-FLAIR <flair.nii>` (or `-T2 <t2.nii>`) is supplied,
the only additional pipeline stage is `mris_place_surface --mmvol
<flair> FLAIR` (or `T2`), which uses FLAIR/T2 contrast to refine the
GM/CSF boundary at the pial surface. All FLAIR processing in
`scripts/recon-all` is enclosed in
`if(($DoT2pial || $DoFLAIRpial) && ! $DoConf2Hires)`. Skull
stripping, [[wm.mgz]], the GCA atlas-based subcortical segmentation,
and parcellation are all computed from the T1 alone. Do **not** try
to use FLAIR as the primary `-i` input — its inverted GM/WM/CSF
intensity profile is incompatible with the T1-trained atlas; for
non-T1 primary inputs use [[mri_synthsr]] or
[[recon-all-clinical.sh]].

**Provenance:** Mailing list, 2024-01-12 (Greve). See
`raw/mailing-list/2024-01-flair-used-only-for-pial-surface-not-wm.md`.
Code-verified: `scripts/recon-all` (DoFLAIRpial gated).

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mris_place_surface]], [[mri_synthsr]],
[[recon-all-clinical]]

---

### Do I need to register the FLAIR to the T1 myself before `-FLAIRpial`?

**Short answer:** No — recon-all runs `bbregister --T2` automatically
on the raw FLAIR; supplying a manual transform is possible but
generally unnecessary.

**Detail:** `scripts/recon-all` (around lines 4610–4636) runs
`bbregister --s $subjid --mov $t2flairraw --lta FLAIRraw.auto.lta
--init-$BBRInit --T2 --gm-proj-abs 2 --wm-proj-abs 1`, with
`$BBRInit` defaulting to `coreg`. The auto-transform is saved as
`mri/transforms/FLAIRraw.auto.lta` and then copied to
`mri/transforms/FLAIRraw.lta` only if a manual LTA is not already
present and different (a `diff`-based check). If the auto-registration
is poor, you can replace `FLAIRraw.lta` manually and re-run only the
pial stage; the auto step always runs but will not overwrite a
distinct manual file. To inspect the registration, look at the
`tkregisterfv` command printed at the end of the bbregister log in
`$SUBJECTS_DIR/<subj>/scripts/`. Greve's overall guidance: the
auto-registration "is generally very good" and overriding it is not a
supported workflow.

**Provenance:** Mailing list, 2024-11-08–11 and 2024-11-12 (Greve).
See
`raw/mailing-list/2024-11-recon-all-flair-registration-automatic.md`
and
`raw/mailing-list/2024-11-flair-registration-in-recon-all-automatic-cannot-skip.md`.
Code-verified: `scripts/recon-all:4610-4636`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[bbregister]], [[mris_place_surface]]

---

### My UNI / MP2RAGE scan crashes at `talairach_avi` (`mpr2mni305 failed`). What now?

**Short answer:** Try `-samseg-reg` to compute the Talairach
registration with SAMSEG (contrast-agnostic) instead of `talairach_avi`;
even so, downstream stages may still fail on UNI contrast.

**Detail:** `talairach_avi` / `mpr2mni305` assumes MPRAGE-like T1
contrast. MP2RAGE UNI images have suppressed background noise and a
non-uniform T1 contrast that often breaks this step. The flag
`-samseg-reg` (`scripts/recon-all` `DoSamsegReg=1`) replaces the
standard registration with `run_samseg --reg-only`, which uses a
probabilistic atlas and is much more robust. Note `-samseg-reg` is
auto-disabled when `-samseg` or `-synthseg` is also given, since
those pipelines compute registration their own way. Greve warns the
rest of the recon-all stream can still fail on UNI contrast — for
truly robust UNI processing, consider [[recon-all-clinical]] or
synthesise a standard MPRAGE first via [[mri_synthsr]]. (A common
co-occurring failure is a missing `libquadmath.so.0` shared library
crashing `gauss_4dfp`; install `libquadmath0` and add to
`LD_LIBRARY_PATH`.)

**Provenance:** Mailing list, 2023-11-08 (Greve), with library-
dependency note from 2023-10-18 (Huang). See
`raw/mailing-list/2023-11-uni-scan-talairach-failure-samseg-reg-flag.md`.
Code-verified: `scripts/recon-all:1757-1762, 6393-6394, 8356, 8364`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[wiki/tools/samseg|samseg]], [[talairach_avi]],
[[mri_synthsr]], [[recon-all-clinical]]

---

### How should I run recon-all on 7 T MP2RAGE data?

**Short answer:** Use FreeSurfer 8 on the unstripped UNI image; add
`-hires` if you need to preserve sub-millimetre resolution; bias
correction is already handled internally by ANTs N4.

**Detail:** Greve's April 2025 guidance: since FS 7, recon-all uses
ANTs N4 internally (output written to [[nu.mgz]]), which copes well
with the unusual MP2RAGE intensity profile, so external bias
correction is not needed. Skull-stripped inputs are also fine. By
default the pipeline downsamples sub-mm data to 1 mm at the conform
step; use `-hires` to keep the native sub-mm grid — at the cost of
significantly longer processing and occasional surface-reconstruction
artefacts ("sometimes it does funny things"). For unstripped MP2RAGE
specifically, FS 8 (with SynthStrip and SynthSeg integrated more
deeply) "works well" — preferred over FS 7.

```bash
recon-all -s SUBJECT -i uni.nii.gz -all -hires
```

**Provenance:** Mailing list, 2025-04-18 (Greve). See
`raw/mailing-list/2025-04-mp2rage-7t-recon-all-antsbias-hires-flag.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_synthstrip]], [[mri_synthseg]],
[[nu.mgz]]

---

### Can I feed a quantitative T1 map directly into recon-all?

**Short answer:** No — synthesise an MPRAGE-like T1w image first
(either by hand from the MR signal equation, or via [[mri_synthsr]]),
and run recon-all on that.

**Detail:** Quantitative T1 maps (3D-QALAS, MP2RAGE T1, IR-FLASH)
encode T1 in milliseconds: WM ≈ 800–900 ms, GM ≈ 1200–1500 ms,
CSF ≈ 4000 ms. This inverts/flattens the GM/WM contrast that
`mri_normalize`, [[mri_cc]] and [[mri_ca_label]] expect, and the
pipeline crashes early with `mri_cc: no WM voxels found with norm > 40`.
Greve's recommended workflow is to simulate MPRAGE contrast from the
T1 map, e.g. for an inversion-recovery MPRAGE
`S ∝ 1 − 2·exp(−TI/T1) + exp(−TR/T1)` with TI ≈ 900 ms, TR ≈ 2300 ms,
rescaled to uint8. Alternatively, [[mri_synthsr]] (FS 8.x) accepts
arbitrary contrasts and resolutions and produces a synthetic 1 mm T1
suitable as a recon-all input.

```bash
mri_synthsr --i T1map.nii.gz --o T1w_synth.nii.gz
recon-all -s SUBJECT -i T1w_synth.nii.gz -all
```

**Provenance:** Mailing list, 2024-01-18 (Greve). See
`raw/mailing-list/2024-01-t1map-simulate-mprage-then-recon-all.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_synthsr]], [[mri_cc]],
[[mri_ca_label]]

---

### What's the recommended pipeline for pediatric data (4–8 years)?

**Short answer:** For ages 4–6 there is an in-house preschooler
recon-all variant (and significant manual editing is usually required);
for ages roughly 4.5–5+ the regular pipeline may work depending on
data quality, and the FreeSurfer ChildBrainManualEdits guide is the
key resource.

**Detail:** Adult recon-all atlases and surface deformation models do
not generalise well to young children — myelination is incomplete, GM
is thicker, and WM/GM contrast can be locally inverted. Zöllei's
recommendation (Apr 2025): for ages 4–6 use the in-house preschooler
script (availability outside MGH not guaranteed); from about
4.5–5 years the regular [[wiki/pipelines/recon-all|recon-all]] may succeed with careful manual
editing per the
[ChildBrainManualEdits](https://surfer.nmr.mgh.harvard.edu/fswiki/ChildBrainManualEdits)
guide. For younger ages use [[infant-recon-all]]. For
difficult contrast or thick-slice data in this age band,
[[recon-all-clinical]] (deep-learning) is also worth trying. Within
standard recon-all, `-synthseg` (see entries below) is the most useful
robustness flag for pediatric segmentation failures.

> [!gap] The "in-house preschooler" recon-all variant referred to by
> Zöllei may not be publicly distributed; check the FreeSurfer GitHub
> for current availability.

**Provenance:** Mailing list, 2025-04-02 (Zöllei) and 2023-10-30
(Iglesias). See
`raw/mailing-list/2025-04-pediatric-4-8yo-freesurfer-pipeline-editing-guide.md`
and
`raw/mailing-list/2023-10-recon-all-synthseg-flag-difficult-pediatric-data.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[infant-recon-all]],
[[recon-all-clinical]], [[mri_synthseg]]

---

## Manual edits and re-running stages

### Should I edit `aseg.mgz` or `aseg.presurf.mgz` for manual segmentation corrections?

**Short answer:** Always edit [[aseg.presurf.mgz]] — [[aseg.mgz]] is a
derived product that gets overwritten when you re-run downstream
stages.

**Detail:** The aseg chain is
[[aseg.auto.mgz]] → [[aseg.presurf.mgz]] → (mri_cc + post-processing) →
[[aseg.mgz]] → `aseg.stats`. Editing `aseg.mgz` directly will appear
to work — and `mri_segstats` will pick up the changes — until any
subsequent recon-all stage regenerates `aseg.mgz` from
`aseg.presurf.mgz`, silently discarding your edits. The correct
workflow: edit `aseg.presurf.mgz` in FreeView, then resume the
pipeline from after the aseg step:

```bash
freeview $SUBJECTS_DIR/SUBJECT/mri/aseg.presurf.mgz \
         $SUBJECTS_DIR/SUBJECT/mri/T1.mgz
# save edits, then:
recon-all -s SUBJECT -autorecon2-noaseg -autorecon3
```

> [!gotcha] Editing `aseg.mgz` and then running any downstream
> recon-all directive is the classic way to lose hours of manual
> editing. Edit `aseg.presurf.mgz` instead.

**Provenance:** Mailing list, 2023-10-12 (Greve). See
`raw/mailing-list/2023-10-edit-aseg-presurf-not-aseg-for-manual-corrections.md`.

**Related:** [[aseg.presurf.mgz]], [[aseg.mgz]], [[aseg.auto.mgz]],
[[mri_cc]], [[freeview-editing]]

---

### After editing `aseg.presurf.mgz`, will `aseg.stats` and `?h.aparc.stats` reflect my changes?

**Short answer:** `aseg.stats` will (because `aseg.mgz` is regenerated);
`?h.aparc.stats` may not, because `cortex.label` is not necessarily
recreated by `-autorecon2-noaseg -autorecon3`.

**Detail:** Huang (2023-07-03) confirmed that
`-autorecon2-noaseg -autorecon3` regenerates `aseg.mgz` from the
edited `aseg.presurf.mgz`, so `aseg.stats` reflects the corrections.
However, Huang was unsure whether `cortex.label` is rewritten by this
flag combination, and `?h.aparc.stats` depends on `cortex.label`. If
cortical-parcellation statistics matter for your analysis, run a more
complete reconstruction or verify that `cortex.label` has been
updated (compare timestamps before/after).

> [!gap] Whether `cortex.label` is reliably regenerated by
> `-autorecon2-noaseg -autorecon3` was left uncertain by the
> developer; verify per FS version before relying on `?h.aparc.stats`
> after aseg edits.

**Provenance:** Mailing list, 2023-07-03 (Huang). See
`raw/mailing-list/2023-06-recon-all-after-aseg-presurf-edits-autorecon2-noaseg.md`.

**Related:** [[aseg.presurf.mgz]], [[aseg.mgz]],
[[hemi.cortex.label]], [[hemi.aparc.stats]]

---

### My white surface under-grows in subcortical regions; control points and WM edits don't fix it. What else can I try?

**Short answer:** Diagnose with `?h.orig`, then create
`brain.finalsurfs.manedit.mgz` with the offending voxels painted to
255 and pass an expert-options file with `--restore-255` for
`WhitePreAparc`, `PlaceWhiteSurf`, and `T1PialSurf`.

**Detail:** First check whether `?h.orig` already shows the
under-estimation. If yes, the WM segmentation ([[wm.mgz]]) is the
culprit and a standard WM edit is appropriate. If `?h.orig` looks
correct but the final white surface drops back, the problem is in
surface placement and `--restore-255` is the right tool. The
mechanism: `mris_place_surface --restore-255` records voxels with
intensity 255 in `brain.finalsurfs.manedit.mgz` before the bright-WM
clipping step (`MRIclipBrightWM`), then resets them to 110 (standard
WM intensity) afterwards, so the surface placement treats them as
solid WM signal. Code-verified at
`mris_make_surfaces/mris_place_surface.cpp:517, 530-532, 994`;
applied automatically by recon-all when `$FixEntoWM` or `$FixACJ` are
set (`scripts/recon-all:3940, 4445, 4514`).

```bash
cp $SUBJECTS_DIR/SUBJECT/mri/brain.finalsurfs.mgz \
   $SUBJECTS_DIR/SUBJECT/mri/brain.finalsurfs.manedit.mgz
# paint problem voxels with value 255 in FreeView, save

cat > /tmp/expert.opts << 'EOF'
WhitePreAparc --restore-255
PlaceWhiteSurf --restore-255
T1PialSurf --restore-255
EOF

recon-all -s SUBJECT -autorecon2-wm -autorecon3 -expert /tmp/expert.opts
```

**Provenance:** Mailing list, 2024-03-06 (Greve). See
`raw/mailing-list/2024-03-wm-underestimation-restore-255-brain-finalsurfs-manedit.md`.
Code-verified: `mris_place_surface.cpp` and `scripts/recon-all`.

**Related:** [[mris_place_surface]], [[brain.finalsurfs.mgz]],
[[wm.mgz]], [[ctrl_pts.mgz]]

---

### Why does the `recon-all` aparc differ from a `mri_surf2surf`-resampled fsaverage aparc?

**Short answer:** Because the recon-all aparc is generated by a full
Bayesian surface parcellation per subject, not by resampling from
fsaverage — so vertex counts and parcel boundaries will differ.

**Detail:** Fischl confirmed (2023-09-10) that `?h.aparc.annot` from
recon-all is the output of a complete Bayesian segmentation on the
individual surface (using subject-specific curvature/folding plus an
atlas prior, with boundary fine-tuning), implemented by
[[mris_ca_label]]. Resampling fsaverage labels via
[[mri_surf2surf]] `--sval-annot` is a different, simpler operation
that just transfers labels along the spherical registration. Greve's
qualifier "some of them (eg, aparc)" suggests Bayesian refinement
applies to aparc (Desikan-Killiany) and likely aparc.a2009s
(Destrieux), but not necessarily to all annotation files (e.g.
manually defined or transferred atlas labels). Differences in vertex
count per parcel are expected and not a sign of error; for group
studies, applying the same method to every subject is what matters.
The recon-all-native parcellation is preferred for accuracy where
available.

**Provenance:** Mailing list, 2023-09-10 (Fischl, Greve). See
`raw/mailing-list/2023-09-aparc-parcellation-surface-bayesian-not-just-fsaverage-resampling.md`.

**Related:** [[mris_ca_label]], [[mri_surf2surf]],
[[parcellation-schemes]], [[fsaverage]]

---

### How do I pass custom `mri_watershed` (or `mri_synthseg`) flags inside `-autorecon1`?

**Short answer:** Use the expert-options mechanism — create a text
file containing `mri_watershed <flags>` (or `synthseg -robust`, etc.)
and pass it via `-expert`.

**Detail:** Each line in the expert-options file names an internal
tool and lists extra arguments to append to that tool's invocation.
Multiple tools can coexist in a single file:

```text
mri_watershed -less -h 5
synthseg -robust
mri_normalize -gentle
```

```bash
recon-all -s SUBJECT -autorecon1 -expert /path/to/xopts.txt
```

> [!gotcha] For SynthSeg robust mode the line must read
> `synthseg -robust` (the wrapper script name) — **not**
> `mri_synthseg -robust` (the binary name). For mri_watershed, the
> flags only take effect if SynthStrip is not the active stripper.
> From FS 7.3 onwards `-synthstrip` is default; use
> `-watershedonly` to force watershed if you need to tune it.

**Provenance:** Mailing list, 2023-08-02 (Greve) and 2023-11-02
(Huang). See
`raw/mailing-list/2023-08-mri-watershed-expert-options-recon-all-autorecon1.md`
and
`raw/mailing-list/2023-11-recon-all-synthseg-fs-allow-deep-freesurfer-env-var.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_watershed]], [[mri_synthstrip]],
[[mri_synthseg]]

---

### `recon-all -subcortseg` produced `aseg.auto.mgz` but no `aseg.mgz` — bug?

**Short answer:** Not a bug — `-subcortseg` only runs the
subcortical-segmentation stage; [[aseg.mgz]] is created by downstream
post-processing (corpus-callosum labelling, etc.). Run those stages
or, if you only need the segmentation, call `mri_synthseg` directly.

**Detail:** Within recon-all, `aseg.auto.mgz` (or its SynthSeg
equivalent) is post-processed by [[mri_cc]] and other steps to
become [[aseg.mgz]]. Stopping at `-subcortseg` therefore gives you
[[aseg.auto.mgz]] only. Greve's recommendation if all you need is a
subcortical seg:

```bash
mri_synthseg --i $SUBJECTS_DIR/SUBJECT/mri/orig.mgz \
             --o $SUBJECTS_DIR/SUBJECT/mri/synthseg.mgz
```

If you specifically need `aseg.mgz`, run the additional stages (e.g.
`-cc-segmentation -seg-stats`) or fall back to a full pipeline run.

**Provenance:** Mailing list, 2025-01-23 (Greve). See
`raw/mailing-list/2025-01-recon-all-subcortseg-produces-aseg-auto-not-aseg.md`.

**Related:** [[aseg.mgz]], [[aseg.auto.mgz]], [[mri_synthseg]],
[[mri_cc]]

---

### How do I recover from "autorecon1_norm.mgz not found" or a Talairach failure mid-`-autorecon1`?

**Short answer:** Re-run with `-canorm`; if Talairach still fails,
add `-gcareg`; if both fail, fall back to `-all`.

**Detail:** `autorecon1_norm.mgz` is produced by the canonical
normalisation step. When it goes missing (e.g. an interrupted run, or
non-standard input geometry like a 512×512×90 volume), subsequent
stages including Talairach registration crash. Huang's escalating fix:

```bash
recon-all -s SUBJECT -autorecon1 -canorm
# if Talairach also fails:
recon-all -s SUBJECT -autorecon1 -canorm -gcareg
# last resort:
recon-all -s SUBJECT -all
```

`-canorm` runs [[mri_normalize]] on the orig volume to (re)create the
normalised reference; `-gcareg` re-registers the normalised volume to
the GCA atlas (Talairach space).

**Provenance:** Mailing list, 2025-03-12 (Huang). See
`raw/mailing-list/2025-03-recon-all-autorecon1-partial-failure-canorm-gcareg.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_normalize]], [[talairach.lta]],
[[mri_em_register]]

---

### `mri_fill: volume size must be greater than 0` — what's wrong?

**Short answer:** Almost always: multiple recon-all runs on the same
subject have left the directory in an inconsistent state. Restart
from scratch using the `-i` / `-I` flag instead of manually copying
files into `mri/orig/`.

**Detail:** Even when `mri_info` shows `aseg.presurf.mgz` and
`talairach.lta` at the correct 256³, `mri_fill` can still emit
"volume size must be greater than 0" because some other intermediate
input has been corrupted by overlapping runs. Huang's diagnosis: the
user had populated `mri/orig/001.mgz` by hand and then started
multiple recon-all instances, leaving partial outputs from different
runs colliding. Fix:

```bash
rm -rf $SUBJECTS_DIR/<subjid>
recon-all -s <subjid> -i <input.nii> -all
```

Always provide inputs via `-i` (or `-I`, which is `-i` plus a copy)
and never run two recon-all instances on the same subject
concurrently.

**Provenance:** Mailing list, 2023-06-29 (Huang). See
`raw/mailing-list/2023-06-recon-all-mri-fill-volume-size-zero-restart-clean.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_fill]], [[filled.mgz]]

---

## Threading, parallelism, and batch submission

### What's the most efficient way to run recon-all on hundreds of subjects?

**Short answer:** Run many cases in parallel, each with one (or two)
threads — never one case with many threads. A single 1 mm subject
takes 5–10 hours.

**Detail:** Greve's blunt rule: "It is more efficient to run two cases
simultaneously than one case with two CPUs." Within-subject
multi-threading (`-openmp N`) helps a few stages (e.g. surface
inflation) but most of the pipeline is single-threaded; returns
diminish quickly above ~2 threads per case. For N CPUs, prefer N
single-threaded jobs. The throughput-friendly batch is:

```bash
# bash for-loop (Huang's example) — fine for a few subjects
for i in {1..300}; do
  recon-all -all -s sub${i} -i ${i}.nii
done

# SLURM array (HPC)
#SBATCH --array=1-300
#SBATCH --cpus-per-task=2
#SBATCH --mem=16G
#SBATCH --time=24:00:00
i=$SLURM_ARRAY_TASK_ID
recon-all -all -s sub${i} -i ${i}.nii -threads $SLURM_CPUS_PER_TASK
```

Always run **one** subject end-to-end first to verify the pipeline
and inspect the output structure before launching the full batch.

**Provenance:** Mailing list, 2023-06-20 (Greve) and 2023-11-21
(Huang). See
`raw/mailing-list/2023-06-recon-all-multithreading-two-cases-better-than-two-cpus.md`
and
`raw/mailing-list/2023-11-recon-all-batch-submission-bash-loop.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]]

---

### Should I use `-parallel` to speed up recon-all?

**Short answer:** No. Use `-threads` / `-openmp` / `-nthreads` (which
are equivalent) instead. `-parallel` has no synchronisation around
shared files and causes silent failures, especially in longitudinal
runs.

**Detail:** `-parallel` runs multiple **stages** of recon-all
concurrently and is unsafe — there is no locking around shared
intermediate files. Two failure modes have been documented:
(a) longitudinal pipelines that crash at autorecon3 surface
registration when `-parallel` is on but succeed without it; and
(b) silent halts at "Surface Registration" with no ERROR line in the
log, caused by race conditions in `ln -s` calls when multiple stages
try to create the same symlink. Huang's fix in both cases: drop
`-parallel`, restart from `-autorecon3` (or earlier as needed). The
threading flags `-threads`, `-openmp`, and `-nthreads` are aliases of
each other and parallelise computation **within** individual programs
— they are safe.

```bash
recon-all -s SUBJECT -all -threads 4    # safe (intra-tool parallelism)
# DO NOT do this:
# recon-all -s SUBJECT -all -parallel
```

**Provenance:** Mailing list, 2023-11-08 (Huang) and 2025-03-01
(Huang). See
`raw/mailing-list/2023-11-recon-all-parallel-flag-collisions-longitudinal.md`
and
`raw/mailing-list/2025-03-recon-all-parallel-silent-ln-error.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[longitudinal-processing]]

---

### How much RAM does recon-all need? I'm getting `*** buffer overflow detected ***` with `-openmp 8`.

**Short answer:** Plan for ~16 GB minimum at default settings and
**don't** crank `-openmp` past what your free RAM supports — high
thread counts on a memory-limited box trigger intermittent
SIGABRT/buffer-overflow crashes. Use `-DoParallel` (sets OpenMP=4 and
ITK threads=4) as a safer mid-point.

**Detail:** fsbuild's measurements: Ubuntu 22 + FS 7.4.1 + recon-all
at default (single-thread) settings already consumes ~16 GB. On a
32 GB machine with the OS taking ~16 GB, jumping to `-openmp 8`
leaves no headroom and produces intermittent
`*** buffer overflow detected ***` / `Command terminated by signal 6`
crashes — characteristic of memory-allocation failures rather than
true buffer-overruns. The intermittent (not deterministic) failure
pattern is the giveaway. Mitigations: reduce `-openmp`, prefer
`-DoParallel`, monitor with `glances`, and avoid stacking multiple
recon-all jobs on the same host without budgeting RAM per job.

**Provenance:** Mailing list, 2025-02-22 (fsbuild). See
`raw/mailing-list/2025-02-recon-all-openmp-threads-memory-buffer-overflow-16gb-minimum.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]]

---

## SynthSeg, FS_ALLOW_DEEP, N4 vs ANTs denoising

### When and how do I use `recon-all -synthseg`?

**Short answer:** Use it whenever the standard atlas-based
segmentation fails (pediatric, clinical, non-standard contrast). You
also need `FS_ALLOW_DEEP=1` and `FREESURFER` set, and — if you used
fmriprep outputs — to copy `norm.mgz` to `mri/orig/001.mgz`.

**Detail:** `-synthseg` swaps the GCA atlas-based subcortical
segmentation for [[mri_synthseg]] within an otherwise-standard
recon-all (the cortical-surface pipeline still runs). It is distinct
from [[recon-all-clinical]], which is a separate deep-learning-only
pipeline. Required environment:

```bash
export FS_ALLOW_DEEP=1
export FREESURFER=$FREESURFER_HOME   # seg2recon needs this in addition to FREESURFER_HOME
recon-all -s SUBJECT -synthseg -all
```

`FS_ALLOW_DEEP=1` gates FreeSurfer's deep-learning routines; without
it you get `ERROR: cannot use ML routines`. The `seg2recon` script
called internally reads `$FREESURFER` separately from
`$FREESURFER_HOME`. If `mri/orig/001.mgz` is missing (common with
fmriprep-derived directories), copy `mri/norm.mgz` to it. To force
robust mode inside the pipeline, use an expert-options file
containing `synthseg -robust` (note: the wrapper name, not
`mri_synthseg`).

**Provenance:** Mailing list, 2023-10-30–11-02 (Iglesias, Huang). See
`raw/mailing-list/2023-10-recon-all-synthseg-flag-difficult-pediatric-data.md`
and
`raw/mailing-list/2023-11-recon-all-synthseg-fs-allow-deep-freesurfer-env-var.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_synthseg]], [[recon-all-clinical]],
[[norm.mgz]]

---

### Does recon-all apply ANTs denoising? Will I be double-denoising if I pre-process with ANTs?

**Short answer:** No — recon-all uses ANTs **N4** (bias correction
only, written to [[nu.mgz]]); it does **not** apply ANTs denoising.
External denoising before recon-all is fine and does not double up.

**Detail:** Greve confirmed (2023-11-15) that the only ANTs
component recon-all invokes is N4 bias-field correction, producing
[[nu.mgz]] from [[orig.mgz]] as the basis for all downstream stages.
ANTs denoising (`DenoiseImage`) is **not** part of the pipeline. If
you want denoising, apply it externally to the raw T1 before passing
it to `-i`. The only operation recon-all repeats is bias correction
(N4) — so external N4 + internal N4 is the one form of duplication
to be aware of; in that case see the next entry on
`-nonuintensitycor`.

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-ants-denoising-not-in-recon-all-only-n4.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[nu.mgz]], [[orig.mgz]]

---

## Filesystem and environment requirements

### What's wrong with `SUBJECTS_DIR` and why are paths with spaces fatal?

**Short answer:** `SUBJECTS_DIR` must be a directory **you** can
write to without sudo and **not** a subdirectory of
`$FREESURFER_HOME`; and absolutely no spaces anywhere in the input
path or the subjects directory.

**Detail:** Two common, unrelated misconfigurations:

1. **`SUBJECTS_DIR` under `$FREESURFER_HOME`.** The default
   `SetUpFreeSurfer.sh` points `SUBJECTS_DIR` at
   `$FREESURFER_HOME/subjects`, which contains the demo subject and
   `fsaverage`. On most installs this directory is write-protected
   for non-root users. recon-all needs to create symlinks (`ln -s`)
   inside the subject's `surf/` directory and writes will fail; do
   **not** work around this with `sudo`, which produces root-owned
   outputs. Override the default after sourcing setup:
   ```bash
   source $FREESURFER_HOME/SetUpFreeSurfer.sh
   mkdir -p $HOME/subjects
   export SUBJECTS_DIR=$HOME/subjects
   ```

2. **Spaces in input paths.** FreeSurfer's internal command
   construction does not properly quote paths, so a path like
   `/home/user/Subject 6/scan.nii.gz` is split at the space and you
   see `mri_convert: extra argument ("...")`. Rename directories to
   remove spaces; underscores or hyphens are safe.

> [!gotcha] After recon-all, `surf/lh.pial` is a **symlink** to
> `lh.pial.T1` (similarly `rh.pial`). On filesystems where symlinks
> are blocked or stripped (exFAT, FAT32, some NFS mounts, certain
> VirtualBox shared folders), `lh.pial` will be missing even though
> `lh.pial.T1` exists. Move `SUBJECTS_DIR` to a local POSIX
> filesystem.

**Provenance:** Mailing list, 2023-10-13–15 (fsbuild, Huang) and
2024-01-05–06 (Huang, fsbuild). See
`raw/mailing-list/2023-10-recon-all-subjects-dir-not-under-freesurfer-home-symlink-error.md`
and
`raw/mailing-list/2024-01-recon-all-space-in-path-subjects-dir-not-in-freesurfer-home.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[hemi.pial]], [[hemi.pial.T1]]

---

## Known bugs and FS 7→8 quirks

### `recon-all -i T1.nii` (without a directive) crashes in FS 8 — was it always required?

**Short answer:** A processing directive is now mandatory in FS 8.
The historic two-call pattern `recon-all -i ...` (import) followed by
`recon-all -all` (process) crashes in FS 8 because `mri_synthstrip`
runs earlier than in FS 7 and tries to act before `orig.mgz` exists.

**Detail:** In FS 5–7 the bare `-i` form was a clean way to import
the file and exit. In FS 8 (Huang, March 2025) the import-only call
crashes with an `mri_synthstrip` error; Huang acknowledged this as a
missing error-check — recon-all should validate the presence of a
directive up front but does not. Always supply a directive:

```bash
# Import + run full pipeline (single call):
recon-all -s SUBJECT -i T1.nii -all
# Or just the first stage:
recon-all -s SUBJECT -i T1.nii -autorecon1
```

> [!gotcha] FS 7 muscle memory: `recon-all -i T1.nii; recon-all -all`
> works in FS 7 and dies in FS 8. Combine into one call with a
> directive. Whether the missing error-check has been added in
> FS 8.2.0 is unverified — best practice is to always pass a
> directive.

**Provenance:** Mailing list, 2025-03-06–07 (Huang). See
`raw/mailing-list/2025-03-recon-all-directive-required-fs8-no-implicit-run.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[mri_synthstrip]], [[orig.mgz]]

---

### `recon-all -nonuintensitycor` is in the help text but breaks the pipeline — what's the workaround?

**Short answer:** The flag is parsed but non-functional in FS 8.0.0
because no [[nu.mgz]] is produced when NU correction is skipped, so
later stages crash. Workaround: run `-autorecon1`, copy `orig.mgz` to
`nu.mgz`, then continue with `-autorecon2 -autorecon3`.

**Detail:** Users who want to use their own (e.g. ANTs N4 with custom
parameters, or B1+ correction for MP2RAGE) bias correction sensibly
reach for `-nonuintensitycor` to suppress the built-in N4. It sets
`DoNUIntensityCor=0` (around `recon-all:6556`) and skips the NU step
— but no replacement creates `mri/nu.mgz`, and `mri_normalize` /
`mri_em_register` immediately fail looking for it. Workaround:

```bash
# Run autorecon1 without the broken flag:
recon-all -s SUBJECT -autorecon1
# Substitute the externally bias-corrected volume as nu.mgz:
cp $SUBJECTS_DIR/SUBJECT/mri/orig.mgz $SUBJECTS_DIR/SUBJECT/mri/nu.mgz
# Continue:
recon-all -s SUBJECT -autorecon2 -autorecon3
```

This assumes `orig.mgz` was already bias-corrected externally before
import.

> [!gotcha] `-nonuintensitycor` appears in the help text and is
> accepted on the command line but breaks the pipeline in FS 8.0.0.
> Verify in your version before using it. Status in FS 8.2.0 is
> unverified.

**Provenance:** Mailing list, 2025-03-28 (Huang). See
`raw/mailing-list/2025-03-recon-all-nonuintensitycor-broken-nu-mgz-missing.md`.

**Related:** [[wiki/pipelines/recon-all|recon-all]], [[nu.mgz]], [[orig.mgz]],
[[mri_nu_correct.mni]]
