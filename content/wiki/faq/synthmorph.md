---
title: "SynthMorph — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 6
last_agent_update: 2026-04-27
tags:
  - faq
  - synthmorph
  - mri_warp_convert
  - registration
  - deep-learning
  - m3z
---

# SynthMorph — Frequently Asked Questions

This FAQ collects recurring questions about [[mri_synthmorph]] and the
adjacent warp-format conversion tool [[mri_warp_convert]] that have been
answered by the FreeSurfer developers on the mailing list. SynthMorph is
a contrast-agnostic deep-learning registration framework that supports
both global (rigid, affine) and deformable (nonlinear) modes; it is
trained on synthetic anatomical inputs so it generalises across MRI
contrasts without per-contrast retraining. [[mri_warp_convert]] handles
interoperability between FreeSurfer's native warp formats
([[m3z-format]], MGZWARP, RAS displacement) and the FSL/ANTs/ITK
representations consumed by other neuroimaging pipelines.

> For tool reference, see [[mri_synthmorph]] and [[mri_warp_convert]].
> For the broader registration landscape and within-subject alternatives,
> see [[registration-overview]] and [[bbregister]].

---

## Models and modes

### Why does `mri_synthmorph` give poor FA-to-MNI152 alignment with the default settings?

**Short answer:** Because the default model is deformable, which assumes
the inputs are already approximately aligned — for cross-modality or
template registration you should explicitly select the affine model with
`-m affine`.

**Detail:** [[mri_synthmorph]] supports three registration models:
deformable/nonlinear (the default, `-m deform`), global affine
(`-m affine`, 12 parameters), and rigid (`-m rigid`, 6 parameters). The
deform model expects the moving and fixed images to share an approximate
pose; if they do not, the nonlinear field has to absorb a large global
transform and the result degrades (e.g. corpus callosum failing to land
on the template). For DTI FA-to-MNI152 normalisation, SynthMorph
developer Malte Hoffmann recommends starting from the affine model:

```bash
mri_synthmorph -m affine fa.nii.gz template.nii.gz -o fa_in_MNI.nii.gz
```

A two-step strategy that further improves accuracy is to register the
subject's T1 to the template (e.g. via `mri_synthmorph -m affine`) and
then apply the same transform to the FA map; `dt_recon` already places
the DTI in the subject's T1 space via [[bbregister]], preserving
within-subject correspondence. In FS 8.x the command-line interface
moved to subcommands (`register`, `apply`, `label`, `shapes`); see
[[mri_synthmorph]] for the current syntax.

> [!gotcha] The default deform model is not the right choice when the
> moving and fixed images differ by a large pose (e.g. a native-space
> FA map vs. an MNI152 template). Try `-m affine` first, then optionally
> chain a deform step on the affine-aligned output.

**Provenance:** Mailing list, 2023-09-05 (Hoffmann, Anderson). See
`raw/mailing-list/2023-09-mri-synthmorph-affine-model-dti-fa-registration.md`.

**Related:** [[mri_synthmorph]], [[bbregister]], [[registration-overview]]

---

### Has SynthMorph been validated for fMRI (EPI) to T1 registration as a replacement for `bbregister`?

**Short answer:** No — Hoffmann (2024-12) explicitly states this use
case has not been explored, and Fischl notes a model mismatch:
[[bbregister]] is rigid within-subject by default, whereas the standard
SynthMorph workflow is deformable.

**Detail:** As of FS 8.0.0, SynthMorph has not been validated for
EPI-to-T1 functional registration. [[bbregister]] uses boundary-based
registration tuned for the EPI/T1 contrast difference and operates as a
rigid (within-subject) alignment; SynthMorph would have to be invoked in
rigid or affine mode (`mri_synthmorph -m rigid` / `-m affine`) to play
the same role, and that scenario is explicitly outside its training
distribution. The recommended workflow for fMRI-to-T1 alignment in
FreeSurfer therefore remains [[bbregister]]. SynthMorph's validated
strengths are cross-subject and cross-contrast anatomical registration
(e.g. T1↔T2, FA↔MNI152), not within-subject contrast-to-contrast
alignment.

> [!gap] Whether `mri_synthmorph -m rigid` / `-m affine` produces
> bbregister-quality EPI-to-T1 registration in practice is unstudied.
> Treat any such use as exploratory, and validate with downstream
> overlap metrics before relying on it.

**Provenance:** Mailing list, 2024-12-13 (Hoffmann, Fischl). See
`raw/mailing-list/2024-11-synthmorph-not-validated-for-fmri-to-t1-registration.md`.

**Related:** [[mri_synthmorph]], [[bbregister]], [[registration-overview]]

---

## Regularisation

### How do I adjust the deformation regularisation strength in `mri_synthmorph`?

**Short answer:** In FS 8.x use the `-r lambda` flag with `0 < lambda < 1`;
in FS 7.4.1 the regularisation is hard-coded to 1 and `-r` is unavailable
— either upgrade to FS 8.x or run the SynthMorph Docker image for
adjustable regularisation.

**Detail:** The regularisation strength controls how flexible the
deformation field is allowed to be — smaller values produce a more
elastic warp (more local detail, higher risk of overfitting), larger
values yield a stiffer warp (closer to affine). Two regimes:

- **FS 7.4.1 (and earlier 7.x).** SynthMorph's regularisation is fixed
  at λ = 1 and there is no user-facing control. The `-s` flag in 7.4.1
  selects the input subject type (`brain` vs `anatomy`), not
  regularisation. Hoffmann's recommended workarounds are the official
  SynthMorph Docker Hub image (`hoffmanm/synthmorph`, also runnable via
  Podman or Apptainer/Singularity) or a stable FreeSurfer dev build —
  both expose the working `-r` flag.
- **FS 8.x (code-verified for 8.2.0).** The `-r` flag is now part of the
  release. The constraint is the open interval `(0, 1)` — the source
  raises `regularization strength not in open interval (0, 1)` if
  violated. Default is λ = 1, which reproduces the FS 7.4.1 behaviour
  and is the most-regularised setting; smaller values relax the warp.

  ```bash
  # Default behaviour (lambda = 1, fully regularised)
  mri_synthmorph register -o warp.nii mov.nii fix.nii

  # Custom regularisation
  mri_synthmorph register -r 0.25 -o warp.nii mov.nii fix.nii
  ```

  For Docker users:

  ```bash
  docker run --rm -v $(pwd):/data hoffmanm/synthmorph register \
    -m deformable -r 0.5 /data/moving.nii /data/fixed.nii \
    -o /data/warp.nii
  ```

Note also that FS 8.x restructured `mri_synthmorph` into subcommands
(`register`, `apply`, `label`, `shapes`); the 7.4.1 single-command
interface is no longer used.

> [!gotcha] If you script against `mri_synthmorph -r` and target both
> FS 7.4.1 and 8.x, the 7.4.1 binary will silently ignore (or in some
> builds error on) the flag. Detect the FreeSurfer version up-front
> rather than assuming the flag is honoured.

**Provenance:** Mailing list, 2024-10-21 (Hoffmann, Jones). See
`raw/mailing-list/2024-10-synthmorph-regularization-r-flag-fixed-in-v8.md`
and `raw/mailing-list/2024-10-synthmorph-regularization-fixed-in-741-use-docker-for-adjustable.md`.
Code-verified: `mri_synthmorph/mri_synthmorph` (FS 8.2.0).

**Related:** [[mri_synthmorph]], [[registration-overview]]

---

## Warp format conversion

### How do I convert a SynthMorph deformation field for use in ANTs/ITK pipelines?

**Short answer:** Run [[mri_warp_convert]] with `--inras` (universal,
works on FS 7.4.1) or `--inmgzwarp` (post-7.4.1 / FS 8.x), passing the
moving image as the source geometry and `--outitk` for ANTs/ITK output.

**Detail:** SynthMorph warps are stored in FreeSurfer's MGZWARP format
with RAS (Right-Anterior-Superior) displacements; Hoffmann notes the two
representations "are not generally equivalent", so you must tell
[[mri_warp_convert]] which one you have. Two paths:

- **FS 7.4.1 (the `--inras` workaround):**

  ```bash
  mri_warp_convert -g moving.nii --inras synthmorph.nii --outitk ants.nii
  ```

  `-g moving.nii` supplies the source geometry (the moving image used in
  the original registration), `--inras` declares the SynthMorph warp as
  a RAS displacement field, and `--outitk` writes the ANTs/ITK form.

- **FS dev build (post-July 2023) and FS 8.x:** the `--inmgzwarp` flag
  was added after the 7.4.1 release and consumes the MGZWARP form
  directly. On 7.4.1 you will get an "unknown option" error and must
  fall back to `--inras`.

For FSL warp output, [[mri_warp_convert]] exposes `--outfsl`; consult
`mri_warp_convert --help` for the exact option set on your release.

**Provenance:** Mailing list, 2024-12-17 (Hoffmann). See
`raw/mailing-list/2024-12-mri-warp-convert-synthmorph-to-ants-itk-format.md`.

**Related:** [[mri_warp_convert]], [[mri_synthmorph]], [[m3z-format]], [[coordinate-systems]]

---

### How do I directly edit the displacement values inside an `.m3z` warp field?

**Short answer:** You cannot edit `.m3z` directly with the FreeSurfer
toolbox — round-trip via [[mri_warp_convert]] to FSL NIfTI warp format,
edit the per-direction frames with standard tools, then convert back to
m3z.

**Detail:** [[m3z-format]] stores the warp as three frames (x, y, z
displacement in mm). Direct manipulation is awkward: `mri_convert`
either fails or collapses the multi-frame structure to a single frame,
[[mris_calc]] does not act on m3z, and FreeView's volume edits save back
as mgz rather than m3z. Greve's recommended workflow round-trips through
the FSL warp NIfTI representation, which is a 4-D volume with three
volumes along the 4th axis — trivially editable in
Python/MATLAB/FSL/nibabel:

```bash
# 1. m3z -> FSL NIfTI warp
mri_warp_convert --inm3z input.m3z --outfsl output_fsl.nii.gz \
  --insrcgeom src.mgz

# 2. Edit individual displacement components
#    (e.g. zero out the z-direction in Python or fslmaths)

# 3. FSL NIfTI warp -> m3z
mri_warp_convert --infsl edited_fsl.nii.gz --outm3z output.m3z \
  --insrcgeom src.mgz
```

The original use case for this round-trip was combining
`mri_gradunwarp` outputs from acquisitions with different slice
geometries: zeroing the through-plane component of one warp before
fusing it with another. The same recipe also works for ANTs/ITK
displacement fields via `--inm3z … --outitk` (and the inverse with
`--initk … --outm3z`).

> [!gotcha] `--insrcgeom` is mandatory in both directions — without it
> the round-trip cannot reconstruct the source-image voxel-to-RAS
> mapping that an m3z encodes implicitly. Pass the same source-geometry
> volume that was used when the m3z was originally produced.

**Provenance:** Mailing list, 2023-06-20 (Greve, Proulx). See
`raw/mailing-list/2023-06-mri-warp-convert-outfsl-m3z-editing.md`.

**Related:** [[mri_warp_convert]], [[m3z-format]], [[lta-format]], [[lta_convert]]

---

### Is there a single recipe that summarises the warp-format interconversions supported by `mri_warp_convert`?

**Short answer:** Pick the `--in*` flag matching your input
representation (m3z, FSL NIfTI, ITK, MGZWARP, or RAS displacement) and
the `--out*` flag matching the target, and always supply a source
geometry (`--insrcgeom` or `-g`).

**Detail:** [[mri_warp_convert]] is the canonical bridge between
FreeSurfer-native and external warp representations. The pairings used
in practice (and confirmed on the mailing list):

| Input | Flag | Output | Flag | Typical use |
|---|---|---|---|---|
| FreeSurfer m3z | `--inm3z` | FSL NIfTI 4-D warp | `--outfsl` | Edit displacement frames in fslmaths/Python |
| FSL NIfTI 4-D warp | `--infsl` | FreeSurfer m3z | `--outm3z` | Re-import edited warp into FS pipelines |
| MGZWARP (SynthMorph) | `--inmgzwarp` | ITK/ANTs | `--outitk` | Apply SynthMorph warp in ANTs (FS post-7.4.1) |
| RAS displacement (SynthMorph) | `--inras` | ITK/ANTs | `--outitk` | Same as above, works on FS 7.4.1 |

`-g moving.nii` (or `--insrcgeom src.mgz`) supplies the source-image
geometry in every case; without it the converter cannot resolve the
voxel-to-world mapping. For affine-only transforms (rather than
displacement fields), use [[lta_convert]] instead — see
[[lta-format]].

> [!gap] The full set of `--out*` targets supported by your specific
> build is best read from `mri_warp_convert --help`; flag availability
> changed between FS 7.4.x and 8.x.

**Provenance:** Mailing list, 2023-06-20 (Greve) and 2024-12-17
(Hoffmann). See
`raw/mailing-list/2023-06-mri-warp-convert-outfsl-m3z-editing.md`,
`raw/mailing-list/2024-12-mri-warp-convert-synthmorph-to-ants-itk-format.md`.

**Related:** [[mri_warp_convert]], [[m3z-format]], [[lta-format]], [[lta_convert]], [[mri_synthmorph]]
