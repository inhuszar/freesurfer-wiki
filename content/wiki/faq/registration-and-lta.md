---
title: "Registration and LTA Formats — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 11
last_agent_update: 2026-04-27
tags:
  - faq
  - registration
  - bbregister
  - mri_coreg
  - lta
  - register-dat
  - mris_register
  - cvs
---

# Registration and LTA Formats — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's registration
ecosystem that have been answered by the developers on the mailing list.
The relevant tools are [[bbregister]] (boundary-based volumetric
registration), [[mri_coreg]] (general intensity-based volumetric
registration; default initialiser for bbregister), [[lta_convert]]
(format conversion among LTA, register.dat, FSL `.mat`, ITK, etc.),
[[mris_register]] (cortical surface registration), and `cvs_register`
(combined volumetric+surface elastic registration). Two registration
file formats are still in everyday use — the modern [[lta-format]]
(`*.lta`) and the legacy `register.dat` (TKREG) format — and several
distinct coordinate spaces (scanner RAS, TkReg/surface RAS, MNI305,
voxel) underpin all of them. See [[registration-overview]] and
[[coordinate-systems]] for conceptual background.

> For tool reference pages, see [[bbregister]], [[mri_coreg]],
> [[lta_convert]], [[mri_vol2vol]], [[mri_label2label]], and
> [[mris_register]].

---

## bbregister tips

### What initialisation should I use with `bbregister`? Should I use `--init-fsl`?

**Short answer:** No — the default ([[mri_coreg]]) works better than
FSL FLIRT initialisation; `--init-header` is a reasonable fallback.

**Detail:** The default `bbregister` initialiser is [[mri_coreg]],
which Greve recommends over `--init-fsl` (FSL FLIRT). `--init-header`
uses the image header geometry directly and is a good fallback when
header alignment is already approximately correct (e.g. same scanner
session). For multi-step workflows you can also pass `--init-reg
<file>` to start from an existing registration. A summary of the
options:

| Flag | Method | Recommendation |
|------|--------|----------------|
| (none) | [[mri_coreg]] (default) | Preferred |
| `--init-header` | Image header geometry | Good fallback |
| `--init-fsl` | FSL FLIRT | Avoid — inferior to mri_coreg |
| `--init-reg <file>` | Existing registration | Use for multi-step chains |

For DTI data specifically, `--init-fsl` may sometimes help when
header-based initialisation fails — but try the default first.

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-bbregister-tips-avoid-init-fsl-use-t2-check-cost.md`.

**Related:** [[bbregister]], [[mri_coreg]], [[registration-overview]]

---

### Which contrast flag (`--t1` vs `--t2`) should I pass to `bbregister` for NM-MRI / FLAIR / MTR?

**Short answer:** Pass `--t2` for any sequence in which grey matter
appears brighter than white matter; pass `--t1` only for true
T1-weighted data.

**Detail:** The contrast flag controls the sign of the intensity
gradient that the boundary-based cost function expects across the
WM/GM boundary. Use `--t1` for T1-weighted scans (WM brighter than
GM); use `--t2` for T2-weighted, FLAIR, neuromelanin-sensitive (NM-MRI),
and magnetisation-transfer-ratio (MTR) scans (GM brighter than WM).
Mismatching the flag drives the optimiser the wrong way and produces
poor or completely failed registrations even when initialisation is
fine.

```bash
# T2-weighted, NM-MRI, MTR, FLAIR
bbregister --mov scan.mgz --reg reg.lta --s SUBJECT --t2

# T1-weighted
bbregister --mov scan.mgz --reg reg.lta --s SUBJECT --t1
```

For diffusion data, use `--dti` instead (BBR with a DTI-specific
cost setup).

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-bbregister-tips-avoid-init-fsl-use-t2-check-cost.md`.

**Related:** [[bbregister]], [[mri_coreg]]

---

### How do I tell whether a `bbregister` result is good?

**Short answer:** Check the `*.mincost` file — cost should be below
about 0.5 — and visually verify by overlaying the white surfaces on
the moving volume.

**Detail:** `bbregister` writes a `<reg>.mincost` file alongside the
output registration. The first column is the final boundary-based
cost. Greve's rough thresholds:

- `cost < 0.5` — good registration
- `cost 0.5 – 0.7` — borderline; inspect visually
- `cost > 0.7` — poor; investigate (wrong contrast flag, bad
  initialisation, partial FOV mismatch, etc.)

Always confirm visually by loading the cortical surfaces over the
moving volume — the white surface should align with the WM/GM
intensity transition:

```bash
tkregisterfv --mov scan.mgz --reg reg.lta --surfs
# or in FreeView:
freeview -v scan.mgz \
         -f $SUBJECTS_DIR/SUBJECT/surf/lh.white \
            $SUBJECTS_DIR/SUBJECT/surf/rh.white \
            --reg reg.lta
```

When sending screenshots to the mailing list for help, always include
the surfaces — registration quality is far easier to judge with the
boundary overlaid.

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-bbregister-tips-avoid-init-fsl-use-t2-check-cost.md`.

**Related:** [[bbregister]], [[freeview]]

---

### `bbregister` is failing on a partial-FOV scan acquired in a different session — what do I do?

**Short answer:** Use a two-step chain through an intermediate
volume that bridges the moving and reference data, then concatenate
the LTAs with [[mri_concatenate_lta]].

**Detail:** Large between-session motion or a partial field-of-view
that excludes most of the brain makes a single-step BBR brittle. Add
a low-resolution full-brain reference volume from the same session as
the moving scan (e.g. a quick EPI for an fMRI study) and register in
two stages:

```bash
# Step 1: moving scan to the intra-session reference
bbregister --mov func.nii.gz --reg func2epi.lta --s SUBJECT --t2

# Step 2: intra-session reference to the recon-all anatomy
bbregister --mov epi_ref.nii.gz --reg epi2t1.lta --s SUBJECT --t2

# Step 3: chain
mri_concatenate_lta func2epi.lta epi2t1.lta func2t1.lta
```

The same chained-registration strategy is also the recommended
approach when the partial FOV target is MNI152 rather than the
subject's own anatomy — see "How do I register a partial-FOV scan
to MNI152?" below.

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-bbregister-tips-avoid-init-fsl-use-t2-check-cost.md`.

**Related:** [[bbregister]], [[mri_concatenate_lta]], [[lta_convert]]

---

## mri_coreg, mat2par, and rigid parameters

### How do I extract the 12 affine (or 6 rigid) parameters from an LTA file?

**Short answer:** `mri_coreg --mat2par file.lta` prints the 12-DOF
decomposition (3 translations, 3 rotation angles in degrees, 3 scales,
3 shears) to stdout.

**Detail:** This is the canonical way to decompose any FreeSurfer LTA
into human-readable parameters — useful for QC reports, publication
methods sections, and debugging. The tool reads the LTA, converts it
to `LINEAR_RAS_TO_RAS` (or `LINEAR_VOX_TO_VOX` with `--mat2par-vox`),
inverts it, and calls `TranformExtractAffineParams()` to decompose
the 4×4 matrix; see `mri_coreg.cpp:727-740` and
`utils/transform.cpp:5308-5357`.

```bash
# 12 parameters in RAS space:
mri_coreg --mat2par registration.lta

# 12 parameters in voxel space:
mri_coreg --mat2par-vox registration.lta
```

Output is twelve space-separated floats:

```
p[0..2]  tx, ty, tz       translations (mm; last column of the matrix)
p[3..5]  rx, ry, rz       rotation angles (DEGREES, via QR decomposition)
p[6..8]  sx, sy, sz       scales (always positive)
p[9..11] hxy, hxz, hyz    shears (off-diagonal R entries normalised by scale)
```

For a rigid registration (e.g. from [[bbregister]] or
[[mri_robust_register]] in rigid mode), scales are ≈ 1 and shears ≈ 0;
the first 6 numbers carry the geometry. The reverse operation rebuilds
an LTA from 12 parameters plus source/target volumes:

```bash
mri_coreg --par2mat tx ty tz ax ay az sx sy sz hxy hxz hyz \
          source.mgz target.mgz output.lta
```

A related helper, `mri_coreg --mat2rot input.lta output.lta`, writes
out a pure-rotation LTA (drops shear and scale) — useful when an
upstream tool emitted an affine LTA but you want only the rigid part.

> [!gotcha] Translation values "depend upon the coordinate system, so
> they are kind of arbitrary" (Greve) — they are the last column of
> the chosen 4×4 matrix and may look numerically large without
> reflecting any large anatomical displacement. Compare across
> registrations only when they share the same coordinate frame.

**Provenance:** Mailing list, 2024-09-30 (Greve) and 2024-10-09
(Hoffmann, Greve). See
`raw/mailing-list/2024-09-mri-coreg-mat2par-extract-rigid-params-from-lta.md`,
`raw/mailing-list/2024-10-mri-coreg-mat2par-extract-rigid-parameters-from-lta.md`.
Code-verified: `mri_coreg.cpp:727-773`, `utils/transform.cpp:5308-5357`.

**Related:** [[mri_coreg]], [[lta_convert]], [[lta-format]]

---

### How do I align a non-MRI image (CT, PET, fluorescence, …) to a `recon-all` subject's space?

**Short answer:** Use `mri_coreg --mov ... --s SUBJECT --reg reg.lta`
to compute the transform, then `mri_vol2vol --mov ... --lta reg.lta`
to apply it.

**Detail:** Any modality that was acquired in a separate session or
with a different contrast from the T1 used for [[recon-all]] — CT,
PET, ASL, fluorescence overlays — can be brought into the same voxel
grid as FreeSurfer's outputs (`aseg.mgz`, parcellation volumes, etc.)
with a two-step [[mri_coreg]] / [[mri_vol2vol]] workflow. With
`--s subject`, [[mri_coreg]] uses the subject's `T1.mgz` (or
`brain.mgz`) as the fixed target.

```bash
# Step 1 — compute registration (rigid by default; --dof 12 for affine)
mri_coreg \
  --mov non_mri.nii.gz \
  --s subject \
  --reg reg.lta

# Step 2 — apply transform onto the FS subject grid
mri_vol2vol \
  --mov non_mri.nii.gz \
  --lta reg.lta \
  --o non_mri_in_fs_space.nii.gz

# For label/segmentation volumes, preserve integer labels:
mri_vol2vol --mov seg.nii.gz --lta reg.lta --o seg_fs.nii.gz --interp nearest
```

[[bbregister]] is preferred for functional MRI (fMRI, ASL) because
its boundary-based cost function exploits WM/GM contrast; for
non-MRI modalities (CT, PET, histology) [[mri_coreg]] is the
recommended tool. Verify visually with FreeView or `tkregisterfv`.

**Provenance:** Mailing list, 2025-03-18 (Greve). See
`raw/mailing-list/2025-03-mri-coreg-vol2vol-align-non-mri-to-freesurfer-space.md`.

**Related:** [[mri_coreg]], [[mri_vol2vol]], [[bbregister]]

---

## lta_convert and the LTA vs register.dat distinction

### Do `.lta` and `register.dat` ever produce different `mri_vol2vol` output? What is the `fscale` field?

**Short answer:** No — they should produce identical
[[mri_vol2vol]] output. `fscale` was a display-brightness setting
for the legacy tkregister GUI and is irrelevant to volumetric
transforms.

**Detail:** `register.dat` is the historical TKREG-format file (a
plain-text 4×4 in tkReg RAS, with header lines naming the subject
and a few legacy fields); the modern [[lta-format]] is a structured
file that records source and target geometry alongside a
typed transform matrix (`LINEAR_RAS_TO_RAS`, `LINEAR_VOX_TO_VOX`,
or `LINEAR_CORONAL_RAS_TO_CORONAL_RAS`). Both encode the same rigid
transform when produced by the same registration; if [[mri_vol2vol]]
gives different output from the two file types, that indicates a
bug or a coordinate-system mismatch — Greve asks for command lines
and screenshots in that case.

The `fscale = 0.1` field that sometimes appears in LTA / register.dat
is purely the legacy tkregister GUI's image-brightness scaling. It
has no effect on [[mri_vol2vol]], [[bbregister]], or any other modern
FreeSurfer tool.

| Feature | register.dat | `.lta` |
|---------|--------------|--------|
| Layout | Plain text, 4×4 + minimal header | Structured (geometry + typed matrix) |
| Coordinate frame | tkReg RAS | RAS, voxel, or coronal RAS |
| Where it comes from | Older `bbregister`, `tkregister2`, `dt_recon` | Modern FreeSurfer registration tools |
| `mri_vol2vol` flag | `--reg register.dat` | `--lta register.lta` |
| Equivalent transform? | Yes (same registration) | Yes |

**Provenance:** Mailing list, 2023-10-18 to 2023-11-08 (Huang, Greve).
See `raw/mailing-list/2023-11-lta-dat-registration-format-differences-fscale.md`.

**Related:** [[lta_convert]], [[lta-format]], [[mri_vol2vol]],
[[bbregister]]

---

### How do I convert a `register.dat` to `.lta`? Why does `lta_convert --inreg ... --outreg ...` complain about a missing `COR-.info`?

**Short answer:** Always pass `--src` and `--trg` to point at the
moving and target volumes; without them, `lta_convert` falls back to
looking for legacy COR-format data and errors out.

**Detail:** `register.dat` is a TKREG file that historically assumed
COR-format volumes with `c_(r,a,s) = 0`. When you give `lta_convert`
only `--inreg register.dat`, it tries to dig the original source and
target volumes out of paths embedded in the file's header — and
typical errors look like:

```
INFO: This REGISTER_DAT transform is valid only for volumes between
COR types with c_(r,a,s) = 0.
error: corRead(): can't open file .../dtrecon/COR-.info
ERROR readREG: cannot read src MRI
```

The fix is to specify the actual source and target geometry on the
command line:

```bash
lta_convert \
  --inreg register.dat \
  --src dti.nii.gz \                  # mov volume from the original registration
  --trg $SUBJECTS_DIR/SUBJECT/mri/orig.mgz \
  --outlta reg.lta
```

This is exactly the registration that downstream tools such as
`vol2subfield` (mapping DTI onto hippocampal subfields) expect —
input volume → `orig.mgz`. If [[bbregister]] gives better alignment
than the `dt_recon`-produced `register.dat`, you can also recompute
directly:

```bash
bbregister --s SUBJECT --mov dti_mean.nii.gz --reg reg.lta --dti
```

**Provenance:** Mailing list, 2023-11-29 to 2023-11-30 (Choi, Huang).
See `raw/mailing-list/2023-11-lta-convert-register-dat-to-lta-needs-src-trg.md`.

**Related:** [[lta_convert]], [[lta-format]], [[bbregister]],
[[mri_vol2vol]]

---

### How do I create an LTA file from a 4×4 matrix produced by an external tool (SPM, ANTs, FSL …)?

**Short answer:** Generate a template LTA with `lta_convert
--identity`, then edit the transform type and the 4×4 matrix block
in a text editor and validate with `tkregisterfv`.

**Detail:** [[lta_convert]] does not have a direct "matrix in →
LTA out" mode for a bare 4×4, but it can generate a fully-formed
identity LTA against any source/target pair, which is then trivial
to edit:

```bash
# 1. Template LTA with identity transform and correct geometry
lta_convert \
  --src source.mgz \
  --trg target.mgz \
  --outlta template.lta \
  --identity
```

In the resulting file, set the `type` field to match the coordinate
system of your matrix and replace the 4×4 block:

| Code | Meaning | Use when … |
|------|---------|------------|
| `0` | `LINEAR_VOX_TO_VOX` | Matrix is voxel→voxel (e.g. FSL FLIRT-style) |
| `1` | `LINEAR_RAS_TO_RAS` | Matrix is scanner-RAS→scanner-RAS (SPM, ANTs) |
| `2` | `LINEAR_CORONAL_RAS_TO_CORONAL_RAS` | Coronal RAS |

Then validate by overlay and apply:

```bash
tkregisterfv --mov source.mgz --targ target.mgz --reg template.lta
mri_vol2vol --mov source.mgz --targ target.mgz --lta template.lta --o aligned.mgz
```

> [!gotcha] Picking the wrong `type` (e.g. labelling a FSL
> voxel-to-voxel matrix as `LINEAR_RAS_TO_RAS`) does not produce an
> error message — it produces a silently incorrect alignment.
> Confirm the convention of your external tool before editing.

For FSL `.mat` files specifically, `lta_convert --infsl` and
`mri_fslmat_to_lta` skip the manual edit. For ITK / ANTs `.txt` or
`.mat` files, `lta_convert --initk` does the same.

**Provenance:** Mailing list, 2023-11-15 (Greve). See
`raw/mailing-list/2023-11-create-lta-from-custom-matrix-lta-convert.md`.

**Related:** [[lta_convert]], [[lta-format]], [[mri_vol2vol]],
[[mri_concatenate_lta]]

---

## Coordinate space conversions

### What is the formula for converting between scanner RAS and tkReg (surface) RAS?

**Short answer:**
`tkrRAS = tkrvox2ras × inv(vox2ras) × scannerRAS`, and
`scannerRAS = vox2ras × inv(tkrvox2ras) × tkrRAS`.

**Detail:** FreeSurfer maintains two distinct RAS frames per volume:

- **scanner RAS** — derived from the DICOM/NIfTI header
  (`vox2ras`); this is the FSL/NIfTI-compatible world frame.
- **tkReg RAS** — computed from the conformed volume's centre
  (`vox2ras-tkr`); this is the frame in which surface vertices in
  `lh.pial`, `lh.white`, `rh.white`, etc. are stored.

Surface vertex coordinates are in **tkReg RAS**, so any conversion
that crosses surface ↔ scanner-RAS boundaries needs the formula
above. Both matrices are obtainable from [[mri_info]]:

```bash
mri_info --vox2ras       subject/mri/orig.mgz   # vox → scanner RAS
mri_info --vox2ras-tkr   subject/mri/orig.mgz   # vox → tkReg RAS
```

In Python via nibabel:

```python
import nibabel as nib, numpy as np

img = nib.load('subject/mri/orig.mgz')
vox2ras    = img.header.get_vox2ras()       # voxel → scanner RAS
tkrvox2ras = img.header.get_vox2ras_tkr()   # voxel → tkReg RAS

def scanner_to_tkr(scanner_ras):
    return tkrvox2ras @ np.linalg.inv(vox2ras) @ np.append(scanner_ras, 1.0)

def tkr_to_scanner(tkr_ras):
    return vox2ras @ np.linalg.inv(tkrvox2ras) @ np.append(tkr_ras, 1.0)
```

**Provenance:** Mailing list, 2023-12-18 (Huang). See
`raw/mailing-list/2023-12-scanner-ras-to-tkrras-conversion-formula.md`.

**Related:** [[coordinate-systems]], [[mri_info]], [[mri_convert]]

---

### My `.label` file says `vox2ras=TkReg` — is that MNI305? How do I get the label into fsaverage / MNI305 space?

**Short answer:** No — surface label files are in the subject's own
TkReg (surface RAS) space. fsaverage is in MNI305 space, so map the
label to fsaverage via [[mri_label2label]] using the spherical
registration.

**Detail:** A FreeSurfer surface [[label-format]] file contains
vertex coordinates in **subject-native TkReg space** (the same frame
the cortical surfaces live in). The header line `vox2ras=TkReg` is a
declaration of that space, not of MNI305. Huang's confirmation:
"FreeSurfer fsaverage is in MNI305 space" — so transferring the
label to fsaverage via the per-subject `sphere.reg` produced by
[[recon-all]] is exactly equivalent to placing it in MNI305 surface
space.

```bash
mri_label2label \
  --srcsubject SUBJECT \
  --srclabel SUBJECT/label/rh.my_roi.label \
  --trgsubject fsaverage \
  --trglabel rh.my_roi.fsaverage.label \
  --hemi rh \
  --regmethod surface
```

The `--regmethod surface` mode uses the per-vertex spherical
registration (`?h.sphere.reg`), not a volumetric transform —
preferable for cortical ROIs. For volumetric MNI305 coordinates of
surface points you would have to combine surface→volume projection
with the Talairach transform; this is rarely what users actually
want.

**Provenance:** Mailing list, 2025-02-14 (Huang). See
`raw/mailing-list/2025-02-label-file-tkreg-space-convert-to-mni305-mri-label2label.md`.

**Related:** [[mri_label2label]], [[label-format]], [[fsaverage]],
[[coordinate-systems]]

---

### How do I register a partial-FOV scan to MNI152?

**Short answer:** Don't go directly — chain partial-FOV → full-FOV
within-subject → MNI152 and concatenate the two LTAs.

**Detail:** Direct partial-FOV-to-MNI152 registration usually fails
because the template covers regions (cerebellum, inferior temporal
lobe, …) that simply aren't in the moving volume; global cost
functions then drift to absorb the missing data. The robust strategy
is a within-subject bridge:

```
partial_fov  ──[reg1]──>  full_fov_subject  ──[reg2]──>  MNI152
```

```bash
# Step 1 — partial FOV to a full-FOV scan from the same subject
mri_robust_register \
  --mov partial_fov.mgz \
  --dst full_fov_T1.mgz \
  --lta partial_to_full.lta \
  --satit
# (mri_coreg works equivalently if the two volumes are intra-session)

# Step 2 — full FOV to MNI152.  If recon-all already ran on the
# full FOV, the linear transform is already there:
ls $SUBJECTS_DIR/SUBJECT/mri/transforms/talairach.xfm.lta

# Otherwise compute it:
mri_robust_register \
  --mov full_fov_T1.mgz \
  --dst $FREESURFER_HOME/average/MNI152_T1_1mm.mgz \
  --lta full_to_mni.lta \
  --satit

# Step 3 — concatenate and apply
mri_concatenate_lta partial_to_full.lta full_to_mni.lta partial_to_mni.lta
mri_vol2vol \
  --mov  partial_fov.mgz \
  --targ $FREESURFER_HOME/average/MNI152_T1_1mm.mgz \
  --lta  partial_to_mni.lta \
  --o    partial_fov_in_mni.mgz
```

**Provenance:** Mailing list, 2023-11-22 (Greve). See
`raw/mailing-list/2023-11-partial-fov-to-mni-registration-chain.md`.

**Related:** [[mri_robust_register]], [[mri_coreg]],
[[mri_concatenate_lta]], [[mri_vol2vol]]

---

## Surface registration with mris_register

### To project an external atlas's parcellation onto my subjects, which direction should `mris_register` go?

**Short answer:** Register **atlas → subject** (atlas as the moving
sphere, subject as the target). Registering subject → atlas is the
wrong direction for transferring atlas labels to subject space.

**Detail:** The correct workflow for projecting an external atlas
annotation onto FreeSurfer subjects, per Zollei's correction on the
mailing list:

1. **Register atlas sphere to subject sphere.** [[mris_register]]
   needs the *atlas's* `smoothwm` surface so that its curvature can
   be computed for alignment; without that file the registration
   cannot proceed (Fischl: "the registration depends on the curvature
   of the smoothwm surface (among other things)"):

   ```bash
   mris_register -1 atlas/lh.sphere subject/lh.sphere atlas_to_subject.reg
   ```

2. **Transfer the annotation:**

   ```bash
   mri_surf2surf \
     --srcsubject atlas \
     --trgsubject subject \
     --hemi lh \
     --sval-annot atlas/lh.aparc.annot \
     --tval        subject/label/lh.atlas_annot.annot \
     --reg atlas_to_subject.reg
   ```

3. **Convert to label files if needed:**

   ```bash
   mri_annotation2label --subject subject --hemi lh \
                        --annotation atlas_annot \
                        --outdir subject/label/
   ```

> [!gotcha] If you registered subject → atlas and then tried to
> transfer labels, that is the wrong direction — re-run the
> registration with the arguments swapped.

> [!gap] Vertex-count mismatch between the atlas and the subject
> (e.g. a non-ico7 atlas with 127,845 vertices vs. the FreeSurfer
> standard 163,842) was reported in this thread without a clean
> resolution. If your external atlas is not a standard
> icosahedral mesh, resampling it to ico7 first is the most
> reliable workaround; in some cases `mri_annotation2label` has been
> reported to stall at "calling annotation2labelV2()..." after
> registration with non-standard atlas surfaces.

**Provenance:** Mailing list, 2025-03-26 to 2025-04-04 (Bradley,
Fischl, Zollei). See
`raw/mailing-list/2025-03-mris-register-external-atlas-register-atlas-to-subject-direction.md`.

**Related:** [[mris_register]], [[mri_surf2surf]],
[[mri_annotation2label]], [[fsaverage]]

---

## CVS / macOS arm64

### Why does `cvs_register` fail on macOS arm64 with "surf2vol: command not found"?

**Short answer:** The `surf2vol` binary (part of `fem_elastic`, which
`cvs_register` calls) is not built for Apple Silicon in FS 8.0.0 —
run CVS on Linux or in a Linux container.

**Detail:** The Constrained Volumetric (CVS) surface-and-volume
registration pipeline (`cvs_register`) drives `fem_elastic`'s
`surf2vol` binary internally. That binary is shipped in the
FS 8.0.0 Linux build but is **absent from the macOS arm64 build**, so
`cvs_register` cannot run on Apple Silicon. Other FreeSurfer tools
([[recon-all]], [[mri_synthseg]], etc.) work fine on macOS arm64;
this is specific to the CVS pipeline.

Workarounds:

1. **Linux machine or HPC cluster** — CVS works on the Linux build.
2. **Linux container on the Mac** — for example:

   ```bash
   docker run -v $SUBJECTS_DIR:/subjects \
     freesurfer/freesurfer:8.0.0 \
     cvs_register -mov SUBJECT -template MNI152 -sd /subjects
   ```

3. **Watch the release notes** — the missing arm64 binary may be
   added in a later 8.x point release.

> [!gap] Check the latest FS release notes before assuming this is
> still the case — the arm64 build may have caught up since the
> 2025-03 thread.

**Provenance:** Mailing list, 2025-03-19 (Zöllei). See
`raw/mailing-list/2025-03-cvs-register-surf2vol-absent-macos-arm64.md`.

**Related:** [[mri_synthmorph]], [[registration-overview]]
