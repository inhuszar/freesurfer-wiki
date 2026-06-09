---
title: "PETSurfer — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 11
last_agent_update: 2026-06-09
tags:
  - faq
  - petsurfer
  - mri_gtmpvc
  - gtmseg
  - pet
  - partial-volume-correction
---

# PETSurfer — Frequently Asked Questions

This FAQ collects recurring questions about **PETSurfer**, FreeSurfer's
PET analysis pipeline. PETSurfer is built on two cooperating tools:
[[mri_gtmseg]], which produces a high-resolution combined cortical /
subcortical segmentation (`gtmseg.mgz`) inside a [[wiki/pipelines/recon-all|recon-all]] subject
directory, and [[mri_gtmpvc]], which performs Geometric Transfer Matrix
(GTM) partial volume correction (PVC) and reference-region
quantification (e.g. SUVR) of a PET volume coregistered to the
subject's T1. For simple mean-in-mask extractions that do not need
PVC, [[mri_segstats]] is the appropriate tool. The questions below
consolidate developer answers from the FreeSurfer mailing list on
gtmseg setup, mri_gtmpvc usage, reference regions, custom ROIs,
kinetic modelling, and FS 7→8 compatibility.

> For tool reference, see [[mri_gtmseg]], [[mri_gtmpvc]], and
> [[mri_segstats]]. For the upstream anatomical pipeline, see
> [[wiki/pipelines/recon-all|recon-all]].

---

## gtmseg

### Why does `gtmseg` fail or produce wrong output on FreeSurfer 8 subjects?

**Short answer:** Pass `--samseg`. FS 8.0.0+ no longer generates
`talairach.m3z`, which the legacy `gtmseg` path required for
subcortical labelling.

**Detail:** [[mri_gtmseg]] historically used the nonlinear Talairach
warp (`mri/transforms/talairach.m3z`) produced by FS 7.x [[wiki/pipelines/recon-all|recon-all]]
to map subcortical structures into the GTM segmentation. FreeSurfer
8.0.0 dropped the nonlinear-warp step from the default pipeline, so
FS 8 subjects do not have `talairach.m3z`. On those subjects, the
default [[gtmseg]] invocation either errors with a file-not-found or
silently falls back to an incorrect mapping. The fix is to use the
[[wiki/tools/samseg|samseg]]-based subcortical segmentation path:

```bash
gtmseg --s SUBJECT --samseg
```

If `talairach.m3z` happens to be present (e.g. an FS 7 subject that
was not reprocessed), the legacy path can still work — but the
recommended approach for any FS 8 subject is always `--samseg`.

**Provenance:** Mailing list, 2025-03-11 (Greve). See
`raw/mailing-list/2025-03-gtmseg-samseg-flag-required-fs8-talairach-m3z-removed.md`.

**Related:** [[mri_gtmseg]], [[wiki/tools/samseg|samseg]], [[mri_gtmpvc]], [[wiki/pipelines/recon-all|recon-all]]

---

### `gtmseg` on Ubuntu 24 fails with `ModuleNotFoundError: No module named 'samseg.gems.gemsbindings'` — what's the fix?

**Short answer:** Apply the 2026-03-25 patch to FreeSurfer 8.2.0; do
not work around it with `--no-samseg`.

**Detail:** Ubuntu 24 ships Python 3.12, but the FS 8.2.0 base
release shipped a `gemsbindings` C extension built against an older
Python ABI. On Ubuntu 24 the import fails before [[mri_gtmseg]] can
start, because `--samseg` is required on FS 8 subjects (see the
preceding question) and `--samseg` pulls in the broken bindings.
Yujing Huang (FreeSurfer build team) released a patch on 2026-03-25
that rebuilds `gemsbindings` for Ubuntu 24's Python; users must
download and apply it manually from the FS 8.2.0 downloads page —
no new package tarball was issued.

> [!gotcha] Do **not** "fix" this with `gtmseg --no-samseg`. Huang
> retracted that initial workaround on the same thread, confirming
> it produces substantively different PVC results because the
> fallback segmentation differs from the [[wiki/tools/samseg|samseg]] one. On FS 8
> subjects, `--samseg` is the only correct path.

**Provenance:** Mailing list, 2026-03-23 to 2026-03-26 (Demeusy /
Huang / fsbuild). See
`raw/mailing-list/2026-03-gtmseg-gemsbindings-ubuntu24.md`.

**Related:** [[mri_gtmseg]], [[wiki/tools/samseg|samseg]]

---

### How do I include brainstem subfields (e.g. inferior colliculus) in a PETSurfer GTM analysis?

**Short answer:** Resample `brainstem_structures.mgz` into `gtmseg`
space with `mri_vol2vol --regheader --interp nearest`, then merge
the labels you need (inferior colliculus = label 7100).

**Detail:** `brainstem_structures.mgz` (output of `segmentBS.sh` /
`mri_segment_brainstem`) is generated at the subject's native
resolution but its grid does not match `gtmseg.mgz` voxel-for-voxel.
Before passing to [[mri_gtmpvc]] the brainstem segmentation must be
resampled onto the gtmseg grid using header-based registration
(no separate registration file is needed — both volumes live in the
same anatomical space) and **nearest-neighbour** interpolation to
preserve integer label IDs:

```bash
mri_vol2vol --regheader \
            --mov $SUBJECTS_DIR/SUBJECT/mri/brainstem_structures.mgz \
            --targ $SUBJECTS_DIR/SUBJECT/mri/gtmseg.mgz \
            --interp nearest \
            --o brainstem-in-gtmseg.mgz
```

Inferior colliculus is label `7100` in the brainstem subfield LUT.
After resampling, extract or merge the labels you need into a
modified `gtmseg.mgz` (see the custom-segmentation question below
for the merge mechanics).

> [!gotcha] At gtmseg resolution, small brainstem structures
> adjacent to the hippocampus can pick up hippocampal voxels at
> their boundary because nearest-neighbour interpolation of an
> adjacent high-resolution structure has no smoothing. Inspect the
> resampled volume in [[wiki/tools/freeview|freeview]] before relying on it.

**Provenance:** Mailing list, 2024-09-30 (Pandya / Greve). See
`raw/mailing-list/2024-09-petsurfer-brainstem-subfields-gtmseg-alignment.md`.

**Related:** [[mri_gtmseg]], [[mri_gtmpvc]], [[mri_vol2vol]],
[[mri_binarize]]

---

## mri_gtmpvc

### Why are there negative uptake values in my GTM output? Is it a bug?

**Short answer:** No — the GTM is a linear-least-squares GLM with no
positivity constraint, and small regions surrounded by high-uptake
neighbours can legitimately solve to negative values.

**Detail:** [[mri_gtmpvc]] models PET image formation as
`observed = GTM × true_uptake + noise`, where the GTM matrix encodes
each segmentation region's contribution to each voxel after
convolution with the scanner PSF. Recovering `true_uptake` is a
GLM solve, and like any unconstrained GLM the solution can be
negative. For a small ROI surrounded by hot tissue, the PSF blurs
neighbouring signal into the ROI; if the deconvolution's estimate
of the neighbour contribution exceeds the observed PET value at the
ROI, the GLM returns a negative estimate. The physical
interpretation is "true uptake here is consistent with zero (or
very low), with the sign of the residual reflecting deconvolution
uncertainty."

| Situation | Interpretation |
|-----------|----------------|
| Small ROI, high-uptake neighbours | Expected; consistent with near-zero true uptake |
| Large ROI with negative values | Suspect — inspect PSF estimates and PET-to-T1 registration |
| Widespread negative values across the brain | Likely incorrect PSF or segmentation error |

> [!gotcha] Do **not** clip negative GTM values to zero before
> SUVR computation or downstream statistics. Clipping introduces
> upward bias. If a target region's PVC value is negative,
> document and consider excluding that ROI from the analysis
> rather than zero-clipping.

**Provenance:** Mailing list, 2023-10-15 (Greve). See
`raw/mailing-list/2023-10-gtm-negative-uptake-values-valid-glm.md`.

**Related:** [[mri_gtmpvc]], [[mri_gtmseg]]

---

### My PET scanner has different in-plane vs through-plane FWHM. How do I configure `mri_gtmpvc` for an anisotropic PSF?

**Short answer:** Use `--psf-col`, `--psf-row`, `--psf-slice` to
specify per-axis FWHM. Spatially-variant PSF (varying across the
volume) is **not** supported.

**Detail:** [[mri_gtmpvc]] distinguishes two cases. Axis-dependent
but spatially-uniform PSF — e.g. a scanner with `5.1 × 5.1 × 5.6` mm
FWHM — is handled by the per-axis flags:

```
--psf-col   <fwhm>   # FWHM in column (x) direction, mm
--psf-row   <fwhm>   # FWHM in row (y) direction, mm
--psf-slice <fwhm>   # FWHM in slice (z) direction, mm
```

For a fully spatially-variant PSF (PSF that changes with position
inside the volume, e.g. due to detector geometry), Greve's reply
on the mailing list was direct: "we don't have good options."
Users in that situation must look outside FreeSurfer.

> [!gotcha] "Row", "column", and "slice" refer to **voxel axes**,
> not anatomical axes (LR / AP / SI). Which voxel axis corresponds
> to which anatomical direction depends on the acquisition and the
> DICOM-to-NIfTI conversion. Inspect the PET volume with
> `mri_info` or [[wiki/tools/freeview|freeview]] and assign FWHM values to the axis
> they were measured along — do not assume `--psf-slice` is always
> the through-plane direction.

**Provenance:** Mailing list, 2025-06-17 to 2025-06-19 (Finn /
Greve). See `raw/mailing-list/2025-06-mri-gtmpvc-anisotropic-psf-flags.md`.
Code-verified: `mri_gtmpvc/mri_gtmpvc.cpp` (FS 8.2.0).

**Related:** [[mri_gtmpvc]], [[mri_info]], [[wiki/tools/freeview|freeview]]

---

### Should I run motion correction before or after PVC for dynamic PET?

**Short answer:** Motion correction first, PVC second.

**Detail:** When dynamic PET frames are motion-corrupted, the GTM
matrix (which assumes a fixed alignment between PET and the
anatomical segmentation) is invalidated frame-to-frame. Greve's
guidance on the mailing list is unambiguous: motion-correct the
4-D series first (e.g. with AFNI's `3dvolreg`, `mri_robust_register`,
or another rigid-body tool), then pass the motion-corrected series
through [[mri_gtmpvc]]. The PETSurfer tutorial demonstrates PVC on
raw dynamic data only because that tutorial does not include a
motion-correction step — it is not an endorsement of the order.

**Provenance:** Mailing list, 2025-01-28 to 2025-02-03 (Andrade Rey /
Greve). See
`raw/mailing-list/2025-01-petsurfer-patlak-not-implemented-motion-correct-first.md`.

**Related:** [[mri_gtmpvc]], [[mri_robust_register]]

---

### Does the `--save-input` output of `mri_gtmpvc` receive partial volume correction?

**Short answer:** No — `--save-input` writes the input PET prior to
PVC (probably with rescaling only). For voxel-wise PVC, use `--mgx`.

**Detail:** [[mri_gtmpvc]]'s native GTM output (`gtm.nii.gz`) is
**ROI-level** PVC: each segmentation region gets a single corrected
mean. The `--save-input` file is the PET as fed into the GTM,
ahead of any deconvolution — Greve's exact phrasing was "probably
just rescaling". For a voxel-wise PVC map you must enable the
Mueller–Gärtner correction with `--mgx`:

```bash
mri_gtmpvc --i pet.nii.gz \
           --reg pet2anat.lta \
           --seg gtmseg.mgz \
           --mgx 0.01 \
           --o gtmpvc_out/
```

`--mgx <thresh>` produces a voxel-level grey-matter PVC map that
can be used for surface-projected analyses, in contrast to the
region-level GTM output.

**Provenance:** Mailing list, 2024-09-30 (Pandya / Greve). See
`raw/mailing-list/2024-09-petsurfer-brainstem-subfields-gtmseg-alignment.md`.

**Related:** [[mri_gtmpvc]], [[mri_gtmseg]]

---

## Reference regions and SUVR

### How do I compute SUVR (rescale to a reference region) with `mri_gtmpvc`?

**Short answer:** Pass `--rescale Id1 [Id2 ...]` with segmentation
IDs from `FreeSurferColorLUT.txt` that are present in `gtmseg.mgz`.

**Detail:** `--rescale` instructs [[mri_gtmpvc]] to divide every
ROI's GTM-corrected uptake by the pooled mean of the listed
reference IDs, producing SUVR rather than raw counts in the output.
A typical white-matter reference uses both hemispheres pooled:

```bash
mri_gtmpvc --i pet.nii.gz \
           --reg pet2t1.lta \
           --seg gtmseg.mgz \
           --rescale 2 41 \
           --o gtmpvc_out/
```

Common reference-region IDs (verify against
`$FREESURFER_HOME/FreeSurferColorLUT.txt` for your FS version):

| Region | LUT ID |
|--------|--------|
| Left cerebral white matter | 2 |
| Right cerebral white matter | 41 |
| Left cerebellum cortex | 8 |
| Right cerebellum cortex | 47 |
| Brain-Stem (incl. pons) | 16 |

> [!gotcha] Every ID passed to `--rescale` **must already be a
> distinct label in `gtmseg.mgz`**. If a label is missing
> (e.g. you used a custom segmentation that doesn't include it),
> the rescale will fail or produce incorrect output. To use a
> custom reference region, first merge it into `gtmseg.mgz` with a
> non-conflicting label ID and pass that ID to `--rescale` (see
> the custom-segmentation question below).

**Provenance:** Mailing list, 2025-04-17 (Rojas Costa / Greve). See
`raw/mailing-list/2025-04-mri-gtmpvc-rescale-suvr-reference-region.md`.

**Related:** [[mri_gtmpvc]], [[mri_gtmseg]], [[color-lut]]

---

### Can I just use `mri_segstats` to extract a custom reference-region mean instead of running the full GTM?

**Short answer:** Yes — when you do not need PVC or tissue-fraction
estimation, `mri_segstats` is the right tool.

**Detail:** [[mri_gtmpvc]] solves a GLM that estimates every
segment's mean simultaneously while accounting for the PSF. For a
plain mean-in-mask extraction (e.g. cerebellar reference for an
externally-computed SUVR), that machinery is unnecessary — the
GTM-estimated reference mean and the simple ROI mean coincide
when the reference region is large and homogeneous. Use:

```bash
mri_segstats --seg reference_mask.mgz \
             --i pet_volume.mgz \
             --sum reference_stats.txt
```

The `Mean` column of `reference_stats.txt` is the reference value.
A SUVR map is then a one-liner:

```bash
mri_concat pet.mgz --o suvr.mgz --mul $(awk '/Mean/{...}' ...)
# or, equivalently
mri_calc pet.mgz / ref_mean = suvr.mgz   # if mri_calc is available
```

Reach for the full [[mri_gtmpvc]] workflow only when you need PVC,
tissue-fraction estimation, or SUVR computed jointly with the
deconvolution.

**Provenance:** Mailing list, 2025-03-27 (Greve). See
`raw/mailing-list/2025-03-pet-custom-roi-reference-region-mri-segstats.md`.

**Related:** [[mri_segstats]], [[mri_gtmpvc]], [[mri_gtmseg]]

---

## Custom segmentations and ROIs

### How do I include a custom atlas (or single ROI) as a GTM segment?

**Short answer:** Resample the custom segmentation into gtmseg space
with `mri_vol2vol --interp nearest`, merge the labels into
`gtmseg.mgz` using non-conflicting label IDs, and supply a matching
colour table (`--ctab`) to `mri_gtmpvc`.

**Detail:** PETSurfer keys all ROI bookkeeping off `gtmseg.mgz` and
its colour table, so any custom region must end up as a distinct
integer label inside that volume. The full workflow:

1. **Generate the standard gtmseg** (with [[wiki/tools/samseg|samseg]] on FS 8):

   ```bash
   gtmseg --s SUBJECT --samseg
   ```

2. **Resample the custom segmentation onto the gtmseg grid**, using
   nearest-neighbour to preserve integer IDs:

   ```bash
   mri_vol2vol \
     --mov custom_seg.mgz \
     --targ $SUBJECTS_DIR/SUBJECT/mri/gtmseg.mgz \
     --reg custom_to_subject.lta \
     --interp nearest \
     --o custom_seg_in_gtmseg_space.mgz
   ```

   If the custom segmentation is already in subject anatomical
   space, replace `--reg` with `--regheader`.

3. **Choose label IDs that do not collide** with anything in
   `$FREESURFER_HOME/FreeSurferColorLUT.txt` — IDs above 3000 not
   already listed are a safe pool.

4. **Merge the custom labels into gtmseg** by carving out the
   target voxels and inserting the new IDs (e.g. with
   [[mri_binarize]] + `mri_mask` + `mri_add_label`, or via a
   nibabel/numpy script).

5. **Write a colour table** in `ID  Name  R  G  B  A` format:

   ```
   3001  Custom_ROI_Left   255  0  0  0
   3002  Custom_ROI_Right    0  255  0  0
   ```

6. **Run `mri_gtmpvc`** with the modified segmentation and the
   custom ctab:

   ```bash
   mri_gtmpvc \
     --i pet.mgz \
     --reg pet_to_T1.lta \
     --seg gtmseg_custom.mgz \
     --ctab custom.ctab \
     --o gtmpvc_output/ \
     --gtm
   ```

Once a custom region has its own label ID inside `gtmseg.mgz`, it
behaves like any built-in region — including being eligible as a
`--rescale` reference (see the SUVR question above).

**Provenance:** Mailing list, 2023-11-09 (Greve). See
`raw/mailing-list/2023-11-petsurfer-custom-segmentation-gtmseg-workflow.md`.

**Related:** [[mri_gtmpvc]], [[mri_gtmseg]], [[mri_vol2vol]],
[[mri_binarize]], [[color-lut]]

---

## Kinetic modelling

### Does PETSurfer support Patlak (or other compartmental) kinetic modelling for dynamic PET?

**Short answer:** No. As of early 2025 Greve confirmed Patlak is
not implemented in FreeSurfer; use external kinetic-modelling tools.

**Detail:** PETSurfer's modelling stops at the GTM (region-level)
and Mueller–Gärtner (`--mgx`, voxel-level) PVC stages plus
SUVR rescaling. There is no Patlak graphical analysis, Logan,
two-tissue compartmental model, or other kinetic estimator built
in. Greve's exact words on the 2025-02-03 reply: *"I don't have
patlak implemented in FS; I'll add it to the list."* For FDG
hypometabolism mapping (e.g. epilepsy presurgical workup), users
should hand the PET data to a dedicated kinetic-modelling toolbox
(SPM Qmodeling, PMOD, etc.) and bring the parametric maps back to
FreeSurfer for surface projection or ROI extraction.

> [!gap] As of FS 8.2.0 (April 2026) Patlak modelling is still not
> in PETSurfer. Re-check before assuming this status holds in
> later releases.

**Provenance:** Mailing list, 2025-01-28 to 2025-02-03 (Andrade Rey /
Greve). See
`raw/mailing-list/2025-01-petsurfer-patlak-not-implemented-motion-correct-first.md`.

**Related:** [[mri_gtmpvc]], [[mri_gtmseg]]

---

## See also

PETSurfer-adjacent tools beyond the [[mri_gtmseg]] / [[mri_gtmpvc]]
core:

- [[gtmseg]] — the high-level tcsh driver that builds `gtmseg.mgz`
  (orchestrates [[xcerebralseg]] and [[mri_gtmseg]]); this is the
  command shown in the examples above.
- [[xcerebralseg]] — builds the whole-head (extra-cerebral) segmentation
  that `gtmseg` merges with the brain segmentation.
- [[gtmstats2table]] — collects per-region PVC values from a set of
  [[mri_gtmpvc]] output directories into a single subjects-by-ROI table
  (the `asegstats2table`/`aparcstats2table` analogue for GTM output).

---
