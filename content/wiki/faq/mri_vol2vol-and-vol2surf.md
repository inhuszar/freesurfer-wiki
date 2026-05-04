---
title: "mri_vol2vol / mri_vol2surf / mri_surf2vol — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 14
last_agent_update: 2026-04-27
tags:
  - faq
  - mri_vol2vol
  - mri_vol2surf
  - mri_surf2vol
  - mri_volcluster
  - sampling
  - registration
---

# mri_vol2vol / mri_vol2surf / mri_surf2vol — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's volume- and
surface-resampling family — [[mri_vol2vol]], [[mri_vol2surf]],
[[mri_surf2vol]], [[mri_volcluster]], `vol2subfield`, and
[[mri_surf2volseg]]. Most of the questions concern the **registration
prerequisite** (these tools never compute a registration internally — you
must supply one), the difference between the legacy `register.dat`
format and modern [[lta-format|LTA]] files, and the canonical pipelines
for projecting a non-standard volumetric modality onto the cortical
surface or for baking a surface annotation back into a volume.

> For tool reference, see [[mri_vol2vol]], [[mri_vol2surf]],
> [[mri_surf2vol]], [[mri_volcluster]], [[mri_surf2volseg]]. For the
> background concepts, see [[coordinate-systems]] and
> [[registration-overview]].

---

## mri_vol2vol — resampling and header surgery

### How do I copy the header geometry from one volume to another without resampling the voxel data?

**Short answer:** Use `mri_vol2vol --no-resample` with either
`--regheader` (volumes already share RAS) or `--reg <lta>` (explicit
transform), or use `mri_convert --in_like` for equal-resolution volumes.

**Detail:** `--no-resample` is the critical flag — it preserves the
input voxel grid and matrix size, only updating the output header so
that the data is reported in the geometry of `--targ`. There are three
common patterns, depending on what you have:

```bash
# Volumes are already aligned in RAS (header-derived alignment is fine)
mri_vol2vol --mov vol1.mgz --targ vol2.mgz \
            --regheader --no-resample --o new_vol1.mgz

# An explicit registration exists
mri_vol2vol --mov vol1.mgz --targ vol2.mgz \
            --reg yourreg.lta --no-resample --o new_vol1.mgz

# Equal-resolution volumes — simpler one-liner
mri_convert run2.nii.gz --in_like run1.nii.gz run2-in-run1.nii.gz
```

[[wiki/tools/mri_convert|mri_convert]] `--in_like` copies header geometry (vox2ras) from a
reference volume but **requires identical matrix dimensions** between
input and reference, otherwise it errors out with "volume sizes do not
match". For mixed-resolution data the LTA-based [[mri_vol2vol]]
approach is the recommended path.

> [!gotcha] The MATLAB `MRIread` / `MRIwrite` workaround (read header
> from one volume, substitute another volume's data, write) silently
> fails when voxel sizes differ — it does not correct the vox2ras
> scaling, and the resulting file reports incorrect RAS coordinates in
> [[wiki/tools/freeview|freeview]].

**Provenance:** Mailing list, 2023-08-18 to 2023-08-28 (Greve / Proulx).
See `raw/mailing-list/2023-08-mri-vol2vol-copy-header-geometry-no-resample.md`.

**Related:** [[mri_vol2vol]], [[wiki/tools/mri_convert|mri_convert]], [[coordinate-systems]],
[[lta-format]]

---

### How do I transform `aseg.mgz` (or any segmentation) from native subject space to MNI305 space?

**Short answer:** `mri_vol2vol --interp nearest --mov aseg.mgz --reg
transforms/talairach.xfm.lta --o aseg.mni305.mgz`.

**Detail:** Every recon-all subject has a Talairach (MNI305) registration
written to `mri/transforms/talairach.xfm.lta` during the
`mri_em_register` stage. [[mri_vol2vol]] consumes that LTA directly and
resamples a subject volume into the MNI305 grid:

```bash
cd $SUBJECTS_DIR/SUBJECT/mri

mri_vol2vol \
    --interp nearest \
    --mov aseg.mgz \
    --reg transforms/talairach.xfm.lta \
    --o aseg.mni305.mgz
```

`--interp nearest` is mandatory for label volumes — trilinear
interpolation invents fractional label IDs and corrupts segmentations.
To resample to a specific MNI305 resolution (e.g. 2 mm to match a group
GLM result on `fsaverage`):

```bash
mri_vol2vol --interp nearest \
            --mov aseg.mgz \
            --reg transforms/talairach.xfm.lta \
            --targ $FREESURFER_HOME/subjects/fsaverage/mri.2mm/T1.mgz \
            --o aseg.mni305.2mm.mgz
```

> [!gotcha] `talairach.xfm.lta` maps to **MNI305** (the FreeSurfer
> Talairach), **not** MNI152. To reach MNI152 you need a separate
> nonlinear warp (e.g. via `cvs_avg35_inMNI152` or
> [[mri_synthmorph]]). MNI305 and MNI152 are not interchangeable.

**Provenance:** Mailing list, 2025-02-12 (Greve). See
`raw/mailing-list/2025-02-aseg-mgz-to-mni305-mri-vol2vol-talairach-xfm.md`.

**Related:** [[mri_vol2vol]], [[coordinate-systems]], [[fsaverage]],
[[mri_volcluster]]

---

### My v7.4.1 `mri_vol2vol --reg ...` workflow fails in FS 8 with "REGISTER_DAT transform is valid only for volumes between COR types". What changed?

**Short answer:** In FS 8 `bbregister` writes `.dat` files whose
embedded geometry can be missing or inconsistent; switch to `--lta` on
both ends and the failure goes away.

**Detail:** [[mri_vol2vol]]'s `--reg` path reads the file with the
legacy `regio_read_register()` and then calls `LTAchangeType(...,
LINEAR_VOX_TO_VOX)`, which requires valid `src` geometry. The FS 8
`bbregister` writes its `.dat` via an intermediate LTA whose geometry
can be empty, so the conversion errors out with:

```
This REGISTER_DAT transform is valid only for volumes between COR types.
LTAchangeType: src geometry must be valid
```

The `--lta` path (`mri_vol2vol.cpp:1329-1360`) reads the file as a
first-class [[lta-format|LTA]] and explicitly validates `src` and `dst`
geometry before proceeding. The fix is to keep everything in LTA form
end-to-end:

```bash
bbregister --s fs8 --mov "$b0" --lta reg.lta --dti
mri_vol2vol --mov "$mov" --targ T1.mgz --lta reg.lta --o "$output"
```

> [!gotcha] `mri_vol2vol --lta` requires the file to have a `.lta`
> extension. The `--reg` path is retained for backwards compatibility
> with older `.dat` files but is fragile with FS8-generated
> registrations — prefer `--lta` for new pipelines.

**Provenance:** Mailing list, 2025-07-05 to 2025-07-06 (Zahnert /
Greve). See `raw/mailing-list/2025-07-mri-vol2vol-reg-vs-lta-fs8.md`.

**Related:** [[mri_vol2vol]], [[bbregister]], [[lta-format]],
[[lta_convert]]

---

## mri_vol2surf — sampling a volume on a surface

### How do I project a non-standard volumetric modality (MTR, qMRI, ASL, PET) onto the cortical surface?

**Short answer:** Register with [[bbregister]] (`--t1` or `--t2`
depending on GM/WM contrast), QC with `tkregisterfv`, then sample with
`mri_vol2surf --projfrac 0.5` (single depth) or `--projfrac-avg 0 1
0.1` (ribbon average).

**Detail:** This is the canonical surface-projection pipeline for any
volumetric modality already in the subject's native space — MTR, QSM,
R1/R2/T1 maps, myelin water fraction, ASL CBF, PET (already registered),
fMRI activation, etc.:

```bash
# 1. Register to T1/surface space.
#    Use --t2 if GM > WM in your modality (e.g., T2, MTR, FLAIR).
#    Use --t1 if WM > GM (e.g., T1, QSM in some conventions).
bbregister --mov modality.nii.gz --reg reg.lta --s SUBJECT --t2

# 2. QC the registration.
tkregisterfv --mov modality.nii.gz --reg reg.lta

# 3a. Sample at a single depth (0=white, 0.5=midpoint, 1=pial).
mri_vol2surf --mov modality.nii.gz --reg reg.lta --hemi lh \
             --projfrac 0.5 --o lh.modality.mgh

# 3b. Average across the cortical ribbon (0% to 100% in 10% steps).
mri_vol2surf --mov modality.nii.gz --reg reg.lta --hemi lh \
             --projfrac-avg 0 1 0.1 --o lh.modality.mgh

# 4. Visualise.
tksurferfv SUBJECT lh inflated -aparc -ov lh.modality.mgh
```

`--projfrac` samples at a single fractional cortical depth; values
outside `[0, 1]` extrapolate beyond the ribbon. `--projfrac-avg
min max step` averages samples along the normal between two fractional
depths and is preferred for quantitative MRI, where values vary
systematically with cortical depth.

> [!gotcha] Choose the [[bbregister]] contrast flag from the modality's
> intensity profile, not its physical sequence name. Magnetisation
> transfer maps and FLAIR both have GM > WM and want `--t2` even though
> neither is a "T2" image.

**Provenance:** Mailing list, 2023-11-02 (Greve). See
`raw/mailing-list/2023-11-mri-vol2surf-project-nonstandard-modality-on-surface.md`
and `raw/mailing-list/2023-11-vol2surf-nonstandard-modality-bbregister-pipeline.md`.

**Related:** [[mri_vol2surf]], [[bbregister]],
[[registration-overview]], [[surface-representations]]

---

### `mri_vol2surf` returns an all-zero overlay even though my input volume has signal — what's wrong?

**Short answer:** You almost certainly passed a `register.dat`; switch
to the `.lta` produced by `bbregister --lta` and the zeros go away.

**Detail:** [[mri_vol2surf]] accepts both `.dat` and [[lta-format|LTA]]
registrations, but the geometry validation differs sharply
(`mri_vol2surf.cpp:383-425`). With an LTA the tool checks that the
`--mov` volume matches the LTA's stored source geometry, auto-inverts if
the user passed src/dst the wrong way, and converts to tkreg internally
for sampling. With a `.dat` the tool only compares voxel resolution
(`xsize`, `zsize`) and trusts the implicit tkreg convention. If the
functional volume's header was modified after `bbregister` ran (e.g. by
a co-registration step that rewrote the geometry), the tkreg-convention
mapping silently misaligns and every vertex samples zero-padding.

The LTA written by `bbregister --lta` (or `--ltaout`) embeds the source
and target geometry, so the registration is unambiguous regardless of
the functional volume's header:

```bash
bbregister --s SUBJ --mov func.nii.gz --lta reg.lta --init-fsl --bold
mri_vol2surf --mov func.nii.gz --reg reg.lta --hemi lh \
             --projfrac 0.5 --o lh.overlay.mgh
```

If only a `.dat` is available, [[lta_convert]] can sometimes promote it
to LTA, but the result may lack geometry — prefer regenerating with
`bbregister --lta`.

> [!gotcha] All-zero output is a **silent** failure mode of the `.dat`
> path — there is no parse error, no warning. If you see zeros where
> you expect signal, suspect the registration before you suspect the
> volume.

**Provenance:** Mailing list, 2024-11-12 to 2024-11-14 (Greve). See
`raw/mailing-list/2024-11-mri-vol2surf-zeros-from-dat-registration.md`.
Code-verified: `mri_vol2surf/mri_vol2surf.cpp` lines 383-425.

**Related:** [[mri_vol2surf]], [[bbregister]], [[lta-format]],
[[lta_convert]]

---

### How do I find the closest surface vertex to a 3-D coordinate (e.g. the centre of a lesion mask)?

**Short answer:** `mri_vol2surf --closest-vertex x y z coords ltafile
surf outfile`, with `coords=1` for scanner RAS or `coords=2` for tkreg
RAS, and `ltafile=nofile` if the coordinate is already in conformed
anatomical space.

**Detail:** This is the `--closest-vertex` mode of [[mri_vol2surf]] —
not a flag combination, but a positional command form:

```bash
# Coordinate from FreeView's "Scanner" RAS readout
mri_vol2surf --closest-vertex 45.2 -18.7 32.1 \
             1 \
             nofile \
             $SUBJECTS_DIR/SUBJECT/surf/lh.white \
             closest_vertex.mgz

# Coordinate from FreeView's "tkReg" RAS readout
mri_vol2surf --closest-vertex 45.2 -18.7 32.1 \
             2 \
             nofile \
             $SUBJECTS_DIR/SUBJECT/surf/lh.white \
             closest_vertex.mgz
```

Output is a single-vertex `.mgz` containing the index of the nearest
vertex on `surf`. Use `coords=1` (scanner RAS) when the XYZ comes from
[[wiki/tools/freeview|freeview]]'s "Scanner" coordinate display, and `coords=2` (tkreg RAS)
when it comes from the "tkReg" display. `nofile` is only correct when
the coordinate already lives in the conformed anatomical space (1 mm,
256³); otherwise pass an LTA mapping the coordinate frame to the
anatomical.

A typical use is lesion-to-cortex distance: take the centre-of-mass or
edge of a lesion mask in [[wiki/tools/freeview|freeview]], find the nearest white-surface
vertex with `--closest-vertex`, then propagate that vertex on the
surface for geodesic distance with [[mris_pmake]].

**Provenance:** Mailing list, 2023-11-22 (Greve). See
`raw/mailing-list/2023-11-mri-vol2surf-closest-vertex-to-coordinate.md`.

**Related:** [[mri_vol2surf]], [[wiki/tools/freeview|freeview]], [[coordinate-systems]],
[[surface-representations]]

---

### How do I visualise where `mri_vol2surf` is sampling on the volume?

**Short answer:** Load both the input volume and the surface output as
overlays in [[wiki/tools/freeview|freeview]], using the same registration on the volume.

**Detail:** [[mri_vol2surf]] computes, per vertex, a point in volume
space (white-surface position displaced by `--projfrac` × cortical
thickness along the normal), reads the volume value at that point, and
writes it to the surface overlay. To inspect where those sampling
points actually fall, [[wiki/tools/freeview|freeview]] can show both sides at once:

```bash
freeview mri/nu.mgz:overlay=overlay.mgz:reg=register.lta \
         -f surf/lh.white:overlay=overlay.lh.mgz
```

Then in the GUI:

1. Select `lh.white` in the upper-left panel.
2. Tick "Use overlay color" in the lower-left panel so the surface
   colours follow the overlay scheme rather than the default yellow.

This is a useful first-line QC step when an `mri_vol2surf` output is
unexpectedly zero or noisy. The mismatched-registration diagnosis (see
the `.dat` vs `.lta` entry above) is the most common culprit.

`--projfrac` semantics in this picture:

- `--projfrac 0` — sampling lies exactly on `lh.white`
- `--projfrac 0.5` — sampling at the midpoint between white and pial
- `--projfrac 1.0` — sampling on `lh.pial`
- `--projfrac 0.2` — displacement of `0.2 × thickness` outward along
  the normal at each vertex

**Provenance:** Mailing list, 2024-12-10 (Greve). See
`raw/mailing-list/2024-12-mri-vol2surf-visualize-sampling-with-freeview-overlay.md`.

**Related:** [[mri_vol2surf]], [[wiki/tools/freeview|freeview]], [[freeview-surfaces]],
[[freeview-volumes]]

---

### `mri_vol2surf --vol2surf` fails with `LTAalloc: could not allocate xforms` on a surface I converted from VTK. What's wrong?

**Short answer:** The converted surface lacks volume geometry; re-run
[[mris_convert]] with `-vol-geom <ref.mgz>` to embed the reference
volume's geometry in the surface file.

**Detail:** The `--vol2surf` mode requires either an LTA registration
with valid geometry, or `regheader` — and `regheader` requires the
surface itself to carry valid volume geometry
(`mri_vol2surf.cpp:1297, 1338`). When a non-FreeSurfer surface (VTK,
GIFTI without geometry, etc.) is converted with [[mris_convert]] and
the `-vol-geom` flag is omitted, the resulting `.surf` file has no
vox2ras matrix:

```
Volume Geometry vox2ras:     Not available
Volume Geometry vox2ras-tkr: Not available
```

`LTAread()` on this zeroed geometry produces a garbage transform
pointer size (e.g. `1085915240`), which `LTAalloc` then refuses to
allocate, hence the misleading "Cannot allocate memory" error.

The fix is to attach geometry at conversion time:

```bash
mris_convert -vol-geom reference.mgz input.vtk output.surf
```

After this, `mris_info output.surf` should show valid `vox2ras` /
`vox2ras-tkr` matrices, and `mri_vol2surf --vol2surf ... regheader ...`
will work.

> [!gap] The `--vol2surf` standalone interface is documented less
> thoroughly than the standard `--mov/--reg/--projfrac` form and does
> not support every flag of the main interface. Prefer the standard
> form whenever possible.

**Provenance:** Mailing list, 2025-06-16 to 2025-06-19 (Hengenius /
Greve). See `raw/mailing-list/2025-06-mri-vol2surf-non-fs-surfaces-missing-volgeom.md`.
Code-verified: `mri_vol2surf/mri_vol2surf.cpp:1297, 1338`;
`mris_convert/mris_convert.cpp:987`.

**Related:** [[mri_vol2surf]], [[mris_convert]], [[surface-format]],
[[lta-format]]

---

## mri_surf2vol — surface to volume

### How do I generate a single-voxel-thick binary mask along the grey/white boundary in volume space?

**Short answer:** `mri_surf2vol --mkmask --hemi lh --identity SUBJECT
--template ../mri/nu.mgz --o mask.lh.mgz`, run separately per
hemisphere.

**Detail:** This is the canonical use of [[mri_surf2vol]] `--mkmask` —
both Greve and Fischl recommended it for the same question. The
`--mkmask` flag generates a binary mask at the white-surface position
in the output voxel grid:

```bash
cd $SUBJECTS_DIR/<subject>/surf

mri_surf2vol --mkmask --hemi lh \
             --identity <subject> \
             --template ../mri/nu.mgz \
             --o mask.lh.mgz

mri_surf2vol --mkmask --hemi rh \
             --identity <subject> \
             --template ../mri/nu.mgz \
             --o mask.rh.mgz
```

- `--mkmask` — binary output marking white-surface voxels.
- `--identity <subject>` — identity registration from surface tkr space
  to the template (use when the template is the subject's own native
  T1 / `nu.mgz`).
- `--reg <regfile>` — alternative for non-identity targets (e.g.
  functional space).
- `--template` — defines the output grid (any volume in the desired
  space).

To get a **single** combined mask, run the two hemispheres separately
and combine with [[mri_binarize]] or simple arithmetic.

> [!gotcha] This is a **boundary** mask, not a WM mask. For a filled
> white-matter region use `mri_binarize --i aseg.mgz --match 2 41 --o
> wm_mask.mgz` instead. The two are not interchangeable.

**Provenance:** Mailing list, 2024-12-16 (Greve, Fischl). See
`raw/mailing-list/2024-12-mri-surf2vol-mkmask-grey-white-boundary-mask.md`.

**Related:** [[mri_surf2vol]], [[mri_binarize]], [[surface-representations]]

---

### Why doesn't `mri_surf2vol` accept a `.label` file? How do I project a cortical label into volume space?

**Short answer:** `mri_surf2vol` reads dense surface overlays only — use
[[mri_label2vol]] for a one-step label-to-volume projection, or convert
the label to an overlay first if you really need to go through
[[mri_surf2vol]].

**Detail:** [[mri_surf2vol]] expects per-vertex overlay formats
(`.mgh`, `.mgz`, `.curv`, `.w`, raw float overlays) — files where every
vertex carries a scalar value. A FreeSurfer [[label-format|.label]]
file is a **sparse** list of selected vertex indices with their RAS
coordinates and an optional scalar; the overlay readers have no way to
parse it. The only label-aware flag is `--mask-to-label`, which uses
the label as a *spatial mask* over which vertices contribute, not as
the data source itself (`mri_surf2vol.cpp:509-513, 338`).

The straightforward solution is [[mri_label2vol]], which projects a
label directly into a target volume in one step:

```bash
mri_label2vol --label roi.label \
              --temp template.mgz \
              --subject <subj> --hemi lh \
              --proj abs 0 3 0.1 \
              --o roi_vol.mgz
```

If you specifically need to round-trip through [[mri_surf2vol]] — e.g.
to combine the projection with another surface overlay — convert the
label to a binary surface overlay first:

```bash
# 1. Make a binary surface overlay from the label
mri_label2label --srclabel roi.label \
                --srcsubject <subj> --srchemi lh \
                --trgsubject <subj> --trghemi lh \
                --regmethod surface \
                --trglabel roi_mask.label
mris_convert --label roi_mask.label lh.white lh.roi_mask.mgh

# 2. Project the overlay to volume
mri_surf2vol --surfval lh.roi_mask.mgh --hemi lh \
             --subject <subj> --fill-projfrac 0 0.5 0.1 \
             --o roi_vol.mgz
```

| Goal | Tool |
|------|------|
| Label → binary volume mask (one step) | [[mri_label2vol]] |
| Label → surface overlay (for further processing) | [[mris_convert]] `--label` |
| Surface overlay → volume | [[mri_surf2vol]] |
| Restrict surf2vol output to a label region | [[mri_surf2vol]] `--mask-to-label` |

**Provenance:** Mailing list, 2025-02-10 to 2025-02-12 (Greve). See
`raw/mailing-list/2025-02-mri-surf2vol-does-not-accept-label-files.md`.
Code-verified: `mri_surf2vol/mri_surf2vol.cpp:338, 509-513`.

**Related:** [[mri_surf2vol]], [[mri_label2vol]], [[mri_label2label]],
[[mris_convert]], [[label-format]]

---

### How do I project a custom surface annotation (e.g. Yeo 17-network) into volume space?

**Short answer:** Use [[mri_surf2volseg]] with `--lh-annot` /
`--rh-annot` and per-hemisphere base offsets — it is the recon-all-era
replacement for `mri_aparc2aseg`.

**Detail:** [[mri_surf2volseg]] fills the cortical ribbon with
annotation label IDs and accepts any annotation file, so it is the
right tool for atlases beyond the default `aparc`:

```bash
cd $SUBJECTS_DIR/SUBJECT/mri

mri_surf2volseg \
    --i aseg.mgz \
    --label-cortex \
    --o yeo17+aseg.mgz \
    --lh-annot ../label/lh.Yeo2011_17Networks_N1000.annot 1000 \
    --rh-annot ../label/rh.Yeo2011_17Networks_N1000.annot 2000 \
    --lh-cortex-mask ../label/lh.cortex.label \
    --rh-cortex-mask ../label/rh.cortex.label \
    --lh-white ../surf/lh.white \
    --lh-pial  ../surf/lh.pial  \
    --rh-white ../surf/rh.white \
    --rh-pial  ../surf/rh.pial
```

The integer that follows each annotation file (here `1000` for lh,
`2000` for rh) is added to every label ID in that hemisphere, producing
unique values across hemispheres. A working invocation for the default
parcellation can always be recovered from the recon-all log:

```bash
grep mri_surf2volseg $SUBJECTS_DIR/SUBJECT/scripts/recon-all.log | head
```

> [!gotcha] Greve's mailing-list reply named `mris_surfseg2vol`, but
> that binary does not exist in FS 8.2.0. The correct name is
> `mri_surf2volseg`, the binary actually invoked by recon-all
> (`scripts/recon-all` line 5082 builds `aparc+aseg.mgz`, line 5121
> builds `wmparc.mgz`).

**Provenance:** Mailing list, 2024-03-10 (Greve). See
`raw/mailing-list/2024-03-mri-surf2volseg-project-annotation-to-volume.md`.

**Related:** [[mri_surf2volseg]], [[mri_aparc2aseg]],
[[mri_label2vol]], [[annotation-format]], [[parcellation-schemes]]

---

### Is there a tool that bakes a 1-D surface overlay (one value per vertex) back into a 3-D volume?

**Short answer:** No first-class tool — the closest match is
`mri_surf2vol` with a `--surfval` overlay (ribbon-filling, not strict
1-to-1 vertex→voxel), and a true point-mapping requires a manual
per-vertex script using the `vox2ras-tkr` matrix.

**Detail:** The forward direction (volume → surface) is well-supported
by [[mri_vol2surf]]. The reverse — strict mapping of N_vertices values
into a 3-D volume — has no dedicated FreeSurfer command. Two options
exist:

1. **`mri_surf2vol --surfval` (ribbon fill).** Projects values outward
   along the surface normal across a fractional-depth range, filling
   the cortical ribbon rather than touching one voxel per vertex. This
   is what most users actually want for visualisation:
   ```bash
   mri_surf2vol --surfval lh.overlay.mgh \
                --hemi lh \
                --projfrac 0.5 \
                --template-reg identity.nofile \
                --o overlay_vol.nii.gz
   ```

2. **Manual per-vertex mapping.** If you really need a 1-to-1
   vertex→voxel mapping, you have to read the surface, get the
   `vox2ras-tkr` of the reference volume (via [[mri_info]] /
   [[mris_info]]), invert it, and write each overlay value into the
   single voxel containing the vertex:
   ```python
   import numpy as np, nibabel as nib

   coords, _ = nib.freesurfer.read_geometry('lh.white')          # tkr RAS
   overlay   = nib.load('lh.overlay.mgh').get_fdata().squeeze()
   ref       = nib.load('mri/orig.mgz')
   ras2vox   = np.linalg.inv(ref.header.get_vox2ras_tkr())

   out = np.zeros(ref.shape)
   for i, xyz in enumerate(coords):
       v = (ras2vox @ np.append(xyz, 1))[:3]
       vi, vj, vk = np.round(v).astype(int)
       if all(0 <= a < s for a, s in zip([vi, vj, vk], ref.shape)):
           out[vi, vj, vk] = overlay[i]
   nib.MGHImage(out, ref.affine).to_filename('overlay_vol.mgz')
   ```

> [!gap] Huang explicitly noted that "FreeSurfer may lack a dedicated
> conversion tool for this task". If a future release adds one, this
> entry should be revised.

**Provenance:** Mailing list, 2025-02-26 (Huang). See
`raw/mailing-list/2025-02-no-tool-surface-overlay-mgh-to-3d-volume.md`.

**Related:** [[mri_surf2vol]], [[mri_vol2surf]], [[mris_info]],
[[mri_info]], [[coordinate-systems]]

---

## mri_volcluster — cluster reporting in standard space

### `mri_volcluster` runs on my MNI305 group result but the cluster summary has no anatomical ROI names. How do I fix it?

**Short answer:** Add `--reg $SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat`
so the tool can map cluster peaks to fsaverage anatomy.

**Detail:** [[mri_volcluster]] looks up anatomical names by querying the
[[fsaverage]] segmentation / Talairach atlas at each cluster peak. This
requires a registration that maps the input volume's coordinate frame
to fsaverage anatomy. After [[wiki/tools/mri_glmfit|mri_glmfit]] on fsaverage data the input
is in 2 mm MNI305 space, and that registration is **not** inferred
automatically — you must pass it explicitly:

```bash
mri_volcluster \
    --in sig.mgh \
    --thmin 2.0 \
    --reg $SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat \
    --sum cluster_summary.txt
```

The pre-computed `reg.2mm.dat` ships with the standard fsaverage
distribution. If it is missing, fsaverage itself is probably not
installed in your `$SUBJECTS_DIR` — copy from
`$FREESURFER_HOME/subjects/fsaverage/`:

```bash
ls $SUBJECTS_DIR/fsaverage/mri.2mm/reg.2mm.dat
```

> [!gotcha] [[mri_volcluster]] is the **volumetric** cluster tool. For
> surface-based cluster correction on fsaverage you want the
> `mri_glmfit-sim` workflow instead — different tool, different
> registration assumptions.

**Provenance:** Mailing list, 2023-11-25 (Greve). See
`raw/mailing-list/2023-11-mri-volcluster-roi-names-mni305-reg-2mm.md`.

**Related:** [[mri_volcluster]], [[wiki/tools/mri_glmfit|mri_glmfit]], [[fsaverage]],
[[coordinate-systems]]

---

## Registration prerequisites

### `vol2subfield` complains it cannot find `reg.lta`. Where is it supposed to come from?

**Short answer:** You have to make it yourself — typically with
[[bbregister]]. recon-all does not produce a functional/PET → anatomical
registration.

**Detail:** `vol2subfield` (part of the hippocampal-subfields /
PETSurfer workflow) maps values from a functional or PET volume into
hippocampal subfield parcels and requires an LTA registration mapping
the functional space to FreeSurfer anatomical space. recon-all only
sees the structural T1, so it never builds this registration. Use
[[bbregister]] with the appropriate contrast flag for your modality:

```bash
# fMRI (T2*-weighted BOLD)
bbregister --s SUBJECT --mov functional.nii.gz \
           --reg functional2anat.lta \
           --bold --init-fsl

# PET
bbregister --s SUBJECT --mov pet.nii.gz \
           --reg pet2anat.lta \
           --t2 --init-header

# High-res hippocampal T2
bbregister --s SUBJECT --mov t2_hippo.nii.gz \
           --reg t2hippo2anat.lta \
           --t2 --init-header
```

Then feed the LTA into `vol2subfield`:

```bash
vol2subfield --mov functional.nii.gz \
             --reg functional2anat.lta \
             --s SUBJECT --hemi lh \
             --o lh.subfield_vals.mgz
```

The same registration can drive [[mri_gtmpvc]] (PET partial-volume
correction), [[mri_vol2surf]], and [[mri_vol2vol]] — there is no
benefit to recomputing it for each downstream tool.

**Provenance:** Mailing list, 2023-11-28 (Greve / Kola). See
`raw/mailing-list/2023-11-vol2subfield-needs-reg-lta-use-bbregister.md`.

**Related:** [[bbregister]], [[mri_gtmpvc]], [[lta-format]],
[[registration-overview]]

---

## See also

- [[mri_vol2vol]], [[mri_vol2surf]], [[mri_surf2vol]],
  [[mri_volcluster]], [[mri_surf2volseg]] — tool reference pages
- [[bbregister]], [[mri_coreg]], [[lta_convert]] — registration tools
- [[lta-format]], [[mgz]], [[label-format]] — file formats
- [[coordinate-systems]], [[registration-overview]], [[fsaverage]],
  [[surface-representations]] — concept pages
