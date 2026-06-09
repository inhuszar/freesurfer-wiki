---
title: "FreeSurfer Subject Directory"
type: format
fs_version: "8.2.0"
file_extensions: []
produced_by:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mksubjdirs]]"
  - "[[rca-surfreg]]"
  - "[[pctsurfcon]]"
  - "[[vertexvol]]"
consumed_by:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mri_info]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2vol]]"
  - "[[mris_preproc]]"
  - "[[mris_anatomical_stats]]"
  - "[[wiki/tools/freeview|freeview]]"
  - "[[check_subject]]"
related:
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[mgz]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
  - "[[coordinate-systems]]"
  - "[[surface-representations]]"
  - "[[registration-overview]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Exact provenance of every file produced by optional longitudinal/base recon-all branches not exhaustively enumerated"
  - "xhemi/ subdirectory structure produced by xhemireg / surfreg -xhemi only sketched"
  - "bem/ contents depend on user-supplied BEM generation; not part of core recon-all"
tags:
  - format
  - layout
  - recon-all
  - subject
---

# FreeSurfer Subject Directory

## Overview

A **FreeSurfer subject directory** (also called a "recon directory" or
"subject tree") is the canonical on-disk container for the complete output
of the [[wiki/pipelines/recon-all|recon-all]] cortical reconstruction pipeline for a single subject.
It is a plain UNIX directory — not an archive or database — whose subfolder
layout and filename conventions are treated by every FreeSurfer tool as an
implicit file-system API. Tools locate files by **constructing paths
relative to `$SUBJECTS_DIR/<subjid>`** rather than taking them as
command-line arguments, so the layout is load-bearing: a correctly named
file in the wrong directory will not be found, and a file in the right
directory with an unexpected extension may break downstream stages.

The directory is created empty by the [[mksubjdirs]] helper (or
implicitly by `recon-all -i ...`) and is progressively populated as
recon-all advances through autorecon1 (volumetric preprocessing),
autorecon2 (white-matter segmentation, surface placement, subcortical
labelling), and autorecon3 (surface inflation, spherical registration,
cortical parcellation, morphometric statistics).

> [!assumption] `SUBJECTS_DIR` parent
> All FreeSurfer tools assume the subject directory lives directly under
> `$SUBJECTS_DIR`, i.e. the full path is `$SUBJECTS_DIR/<subjid>`. The
> subject is referenced everywhere by its *basename* (`<subjid>`) and the
> tools prepend `$SUBJECTS_DIR/` automatically. See
> [Gotchas](#gotchas) below.

## Creation

### Via `mksubjdirs`

The canonical creator is the shell script `scripts/mksubjdirs` (47 lines,
tcsh). It performs only three operations:

```tcsh
mkdir <subjid>
chmod g+rws <subjid>
cd <subjid>
mkdir -p  mri scripts surf tmp label morph mpg tiff touch stats
mkdir -p  mri/transforms mri/orig
chmod -R g+rw .
```

Note that `mksubjdirs` creates **ten** top-level subdirectories, five of
which (`morph`, `mpg`, `tiff`, `tmp`, `touch`) are legacy/workspace folders
that most modern recon-all runs populate sparsely or not at all. It does
**not** create `label/`'s contents, `bem/`, `xhemi/`, or `trash/`; these
are produced by recon-all or by the user on demand.

> [!gotcha] Group-writable `setgid` bit
> `mksubjdirs` applies `chmod g+rws` at the top level, giving the directory
> the **setgid** bit so new files inherit the parent's group. This is by
> design for shared lab storage. If you tar/copy a subject tree without
> preserving permissions (`cp -rp`, `tar -p`), collaborators on other
> groups may not be able to modify the copy.

### Via `recon-all -i`

Running `recon-all -i <input.nii.gz> -s <subjid> -all` automatically
creates the directory (calling `mksubjdirs` internally), copies the input
volume to `mri/orig/001.mgz` (or `002.mgz`, `003.mgz`, ... for multi-run
averages), and then executes the full pipeline. The exact intake logic
lives in `scripts/recon-all` around the `-i` / `-iscale` / `-T2` / `-FLAIR`
flag handlers.

## Top-level Layout

The directories below are listed in the rough order of their appearance
during a full recon-all run. Directories marked **core** are always
populated by recon-all; directories marked **legacy** are created empty
and usually remain so; directories marked **on-demand** appear only when
the user invokes an optional workflow.

```
$SUBJECTS_DIR/<subjid>/
├── mri/            (core)      Volumetric data (MGZ)
│   ├── orig/                   Raw input volume(s) as copied in
│   ├── transforms/             All linear and non-linear transforms
│   │   ├── bak/                Auto-backup of overwritten transforms
│   │   └── synthmorph*/        SynthMorph non-linear warps (FS 8.x)
│   └── tmp/                    Scratch volumes for recon-all stages
├── surf/           (core)      Cortical surface meshes + per-vertex overlays
├── label/          (core)      Surface labels and cortical parcellations
├── stats/          (core)      Morphometric statistics (ASCII tables)
├── scripts/        (core)      Logs, status files, configuration, state
├── touch/          (core)      Stage completion sentinels
├── tmp/            (legacy)    Top-level scratch (mostly empty in FS 8.x)
├── trash/          (on-demand) Files moved aside by -clean / manedits
├── bem/            (on-demand) Boundary element meshes (MNE workflows)
├── xhemi/          (on-demand) Contralateral surface registration (xhemireg)
├── morph/          (legacy)    Empty in FS 8.x
├── mpg/            (legacy)    Empty in FS 8.x
└── tiff/           (legacy)    Empty in FS 8.x
```

## `mri/` — Volumetric Data

All volumes are stored as [[mgz]]. Filenames encode processing history in
a predictable progression from `rawavg` → `orig` → `nu` → `T1` → `brain` →
`norm` → `wm` → `filled` → segmentation/labelling outputs. The table below
groups files by pipeline stage.

### Input and conforming

| File | Produced by | Contents |
|------|-------------|----------|
| `mri/orig/001.mgz`, `002.mgz`, ... | `recon-all -i` | Raw input volume(s), one per `-i` invocation, unconformed |
| `mri/orig/<N>.lta`, `<N>-iscale.txt` | [[mri_robust_template]] | Per-run motion-correction LTA and intensity scale |
| `mri/rawavg.mgz` | [[mri_motion_correct2]] / averaging | Motion-corrected average of all `mri/orig/*.mgz` inputs |
| `mri/orig.mgz` | [[wiki/tools/mri_convert|mri_convert]] (`-c`) | `rawavg.mgz` conformed to 256³, 1 mm isotropic, UCHAR — the reference space for the rest of the pipeline |
| `mri/rawavg2orig.lta` | recon-all | LTA from raw-average voxel space to conformed `orig.mgz` space |

> [!internal] `orig.mgz` defines the subject frame
> Every subsequent volume and every surface in `surf/` is registered to the
> conformed `orig.mgz` voxel/RAS grid. The vox2ras and vox2ras-tkr
> matrices of `orig.mgz` are the `Norig` and `Torig` used in the
> canonical Vox↔SurfaceRAS↔ScannerRAS chain described in
> [[coordinate-systems]].

### Bias correction, normalisation, and skull stripping

| File | Produced by | Contents |
|------|-------------|----------|
| `mri/nu.mgz` | [[mri_nu_correct.mni]] | `orig.mgz` after N3/N4 bias-field correction |
| `mri/antsdn.brain.mgz` | ANTs DenoiseImage (FS 8.x) | Denoised brain used as input to SynthStrip when enabled |
| `mri/synthstrip.mgz` | [[mri_synthstrip]] | Brain mask from the SynthStrip CNN |
| `mri/T1.mgz` | [[mri_normalize]] (Stage 4) | Stage-1 intensity-normalised volume (WM target = 110) |
| `mri/brainmask.mgz` | [[mri_watershed]] / SynthStrip | Skull-stripped brain used as the reference for downstream steps |
| `mri/brain.mgz` | [[mri_normalize]] (Stage 12) | Second-pass normalisation after skull stripping |
| `mri/brain.finalsurfs.mgz` | recon-all | Volume used for `?h.pial` placement; can be hand-edited (see below) |
| `mri/brain.finalsurfs.manedit.mgz` | user | Optional manual edit layer preserved across reruns |
| `mri/norm.mgz` | [[mri_normalize]] | Normalised volume used for GCA-based labelling |

### White-matter segmentation and filling

| File | Produced by | Contents |
|------|-------------|----------|
| `mri/wm.seg.mgz` | [[mri_segment]] | Histogram-based WM segmentation (pre-edit) |
| `mri/wm.asegedit.mgz` | `mri_edit_wm_with_aseg` | WM segmentation after cleanup using `aseg.presurf.mgz` |
| `mri/wm.mgz` | recon-all | Final WM mask used as the input to `mri_fill`; hand-editable |
| `mri/filled.auto.mgz` | `mri_fill` | Filled WM volume with cortex label 255 (lh) / 127 (rh), before edits |
| `mri/filled.mgz` | recon-all | Hand-editable filled volume (`filled.auto.mgz` copy unless edited) |
| `mri/ctrl_pts.mgz` | [[mri_normalize]] | WM control-point mask used by the normalisation stage |

### Subcortical and joint labelling

| File | Produced by | Contents |
|------|-------------|----------|
| `mri/aseg.auto_noCCseg.mgz` | [[mri_ca_label]] | GCA-based subcortical labels before corpus-callosum insertion |
| `mri/aseg.auto.mgz` | `mri_cc` | `aseg.auto_noCCseg.mgz` plus corpus-callosum labels 251–255 |
| `mri/aseg.presurf.mgz` | recon-all | `aseg` used to guide WM edits *before* surface placement |
| `mri/aseg.presurf.hypos.mgz` | `mri_edit_segmentation_with_surfaces` | `aseg.presurf.mgz` with hypointensity labels reinserted |
| `mri/aseg.mgz` | recon-all | Final joint cortical+subcortical segmentation (autorecon3 output) |
| `mri/aparc+aseg.mgz` | [[mri_aparc2aseg]] | aseg with cortical ribbon relabelled by the DK atlas parcellation |
| `mri/aparc.a2009s+aseg.mgz` | [[mri_aparc2aseg]] | Same, using the Destrieux a2009s atlas |
| `mri/aparc.DKTatlas+aseg.mgz` | [[mri_aparc2aseg]] | Same, using the Mindboggle DKTatlas40 |
| `mri/wmparc.mgz` | `mri_aparc2aseg --wmparc-dmax` | Gyral white-matter parcellation (labels 3000+/4000+) |
| `mri/synthseg.rca.mgz` | SynthSeg CLI (FS 8.x) | Optional SynthSeg-based segmentation used for ICV / QC |

### Cortical ribbon and distance fields

| File | Produced by | Contents |
|------|-------------|----------|
| `mri/lh.ribbon.mgz`, `mri/rh.ribbon.mgz` | `mris_volmask` | Per-hemisphere cortical ribbon mask (GM between white and pial) |
| `mri/ribbon.mgz` | `mris_volmask` | Combined ribbon (labels 3 = lh GM, 42 = rh GM, 2/41 = WM) |
| `mri/lh.white.distfield.mgz`, `mri/rh.white.distfield.mgz` | recon-all (FS 8.x) | Signed distance field to the white surface |
| `mri/lh.pial.distfield.mgz`, `mri/rh.pial.distfield.mgz` | recon-all (FS 8.x) | Signed distance field to the pial surface |
| `mri/mca-dura.mgz`, `mri/vsinus.mgz` | FS 8.x QC stages | Middle cranial artery / venous sinus masks for pial correction |
| `mri/entowm.mgz` | FS 8.x | Entorhinal WM mask used for thickness rescue |
| `mri/surface.defects.mgz` | `mris_topo_fixer` | Volume showing topological defects detected during surface fixing |
| `mri/mrisps.white.mgz`, `mri/mrisps.wpa.mgz` | recon-all | Cached MRISP spherical parameterisations for registration/QC |

### `mri/transforms/` — linear and non-linear transforms

| File | Produced by | Contents |
|------|-------------|----------|
| `transforms/talairach.xfm` | [[talairach_avi]] | MNI `.xfm` affine from `orig.mgz` voxel space to MNI305 — the original "Talairach" transform |
| `transforms/talairach.xfm.lta` | recon-all | Same transform converted to LTA form |
| `transforms/talairach.lta` | [[mri_em_register]] | GCA-refined affine, used by `mri_ca_label` and friends |
| `transforms/talairach_with_skull.lta` | [[mri_em_register]] (`-skull`) | Skull-aware GCA registration used by the watershed initial fit |
| `transforms/cc_up.lta` | `mri_cc` | Corpus-callosum-aligned LTA used to define the midsagittal plane |
| `transforms/synthmorph.1.0mm.1.0mm/` | `fs-synthmorph-reg` (FS 8.x) | SynthMorph non-linear warp grids at the conformed resolution |
| `transforms/synthmorph.mni305/` | `fs-synthmorph-reg` (FS 8.x) | SynthMorph non-linear warp to MNI305 |
| `transforms/bak/` | recon-all | Automatic backups of any `talairach*.lta` overwritten by a rerun |

See [[coordinate-systems]] for the formal definitions and
[[registration-overview]] for the file formats (`.xfm`, `.lta`).

> [!gotcha] "Talairach" ≠ Talairach
> All files named `talairach*.xfm` or `talairach*.lta` map to **MNI305**,
> not to Talairach 1988 space. The Brett piecewise transform to
> approximate-Talairach is applied at runtime only when a user explicitly
> requests it (e.g. via `tkregister2 --talxfm`). This is documented in
> full in [[coordinate-systems]].

## `surf/` — Cortical Surface Meshes and Overlays

The `surf/` directory contains both binary triangle meshes (see
[[surface-format]]) and per-vertex scalar overlays (see [[curv-format]]).
All filenames are prefixed by hemisphere: `lh.` (left) or `rh.` (right).
Files without a `lh.`/`rh.` prefix are shared (there are normally none in
a plain recon-all output).

### Surface meshes

The surface hierarchy mirrors the stages of the recon-all surface stream.
Each file contains triangle geometry in the **Surface RAS (tkreg)**
coordinate frame; see [[surface-representations]] for the conceptual
hierarchy.

| File | Stage | Contents |
|------|-------|----------|
| `?h.orig.nofix` | [[mri_tessellate]] | Raw tessellation of `filled.mgz`, before topology correction |
| `?h.qsphere.nofix` | [[mris_sphere]] (`-q`) | Quick spherical projection used to find topological defects |
| `?h.inflated.nofix` | [[mris_inflate]] | Inflation of the `nofix` surface for topology analysis |
| `?h.orig.premesh` | `mris_topo_fixer` | Topology-corrected mesh before remeshing |
| `?h.orig` | `mris_remesh` / `mris_topo_fixer` | Topology-corrected tessellation, vertex correspondence with all later surfaces |
| `?h.smoothwm` | [[mris_smooth]] | `orig` after Laplacian smoothing — used as the input to inflation |
| `?h.smoothwm.nofix` | [[mris_smooth]] | Smoothed form of `orig.nofix`, kept for QC |
| `?h.inflated` | [[mris_inflate]] | Inflated white surface (not anatomical) |
| `?h.sphere` | [[mris_sphere]] | Distortion-minimised sphere |
| `?h.sphere.reg` | [[mris_register]] | Subject sphere registered to the group-average atlas |
| `?h.fsaverage.sphere.reg` | [[mris_register]] / [[rca-surfreg]] | Same, registered to fsaverage if a second atlas was requested |
| `?h.white.preaparc` | `mris_place_surface` (white pass 1) | White surface produced before cortical parcellation is available |
| `?h.white` | `mris_place_surface` (white pass 2) | Final white surface after parcellation-informed refinement |
| `?h.pial.T1` | `mris_place_surface` | Pial surface placed against the T1 volume (before T2/FLAIR refinement if any) |
| `?h.pial` | `mris_place_surface` | Final pial surface (identical to `pial.T1` if no T2/FLAIR step) |

> [!gotcha] `?h.white` vs. `?h.white.preaparc`
> `?h.white.preaparc` is the white surface used to *seed* cortical
> parcellation; `?h.white` is produced later, after parcellation, and is
> the surface most downstream tools expect. Passing the wrong one to
> [[mris_anatomical_stats]] or [[mri_vol2surf]] silently changes results.

### Per-vertex scalar overlays (curv files)

These are stored in the [[curv-format]] format (new format, `0xFFFFFF`
magic). Filenames without an extension are curv files; filenames with
`.H`, `.K`, `.S`, `.C`, `.FI`, `.BE`, `.K1`, `.K2` are Talairach-style
shape indices computed by `mris_curvature`.

| File | Produced by | Contents |
|------|-------------|----------|
| `?h.curv` | [[mris_smooth]] | Mean curvature of the white surface |
| `?h.sulc` | [[mris_inflate]] | Signed sulcal depth (inflation displacement) |
| `?h.avg_curv` | recon-all | Average curvature from the atlas after registration |
| `?h.area` | `mris_place_surface` | Vertex areas on the white surface |
| `?h.area.pial` | `mris_place_surface` | Vertex areas on the pial surface |
| `?h.area.mid` | [[vertexvol]] | Vertex areas on the mid-thickness surface (computed as a by-product of `?h.volume`) |
| `?h.volume` | [[vertexvol]] | Per-vertex cortical volume (TH3 method, see [[surface-representations]]) |
| `?h.thickness` | `mris_place_surface` | Cortical thickness (white-to-pial distance) |
| `?h.curv.pial` | `mris_curvature` | Mean curvature of the pial surface |
| `?h.jacobian_white` | recon-all | Log-area distortion between subject sphere and atlas |
| `?h.w-g.pct.mgh` | [[pctsurfcon]] | White/grey contrast ratio (in MGH format, not curv) |
| `?h.inflated.H`, `?h.inflated.K` | `mris_curvature` | Mean and Gaussian curvature of the inflated surface |
| `?h.smoothwm.{H,K,S,C,FI,BE,K1,K2}.crv` | `mris_curvature` | Shape-index decomposition of `smoothwm` (used for atlas features) |

### Topology-fix bookkeeping

| File | Contents |
|------|----------|
| `?h.defect_labels` | Per-vertex integer labels for each topological defect |
| `?h.defect_borders` | 0/1 marker of defect borders |
| `?h.defect_chull` | Convex-hull markers around each defect |
| `?h.defects.pointset` | Freeview-compatible point set of defect centroids |
| `autodet.gw.stats.lh.dat`, `autodet.gw.stats.rh.dat` | GM/WM intensity stats used by `mris_place_surface` |

## `label/` — Surface Labels and Annotations

Two file types live here: **[[label-format|`.label`]]** (ASCII per-vertex lists, one label
per file) and **[[annotation-format|`.annot`]]** (binary parcellation, one label-per-vertex for
the whole hemisphere). [[color-lut|Colour tables]] are stored in matching `.ctab`
files.

| File | Produced by | Contents |
|------|-------------|----------|
| `?h.cortex.label` | recon-all | All cortical vertices (i.e. excluding medial wall). Required by many downstream tools as a mask |
| `?h.nofix.cortex.label` | recon-all | Cortex label on the pre-topofix surface, used during the topology pass |
| `?h.cortex+hipamyg.label` | recon-all | Cortex label extended to hippocampus/amygdala boundary |
| `?h.aparc.annot` | [[mris_ca_label]] | DK40 atlas parcellation (Desikan-Killiany, 36 labels/hemi) |
| `?h.aparc.a2009s.annot` | [[mris_ca_label]] | Destrieux 2009 atlas (75 labels/hemi) |
| `?h.aparc.DKTatlas.annot` | [[mris_ca_label]] | Mindboggle DKTatlas40 (31 labels/hemi) |
| `aparc.annot.ctab`, `aparc.annot.a2009s.ctab`, `aparc.annot.DKTatlas.ctab` | [[mris_ca_label]] | Colour tables referenced by the annotations |
| `?h.BA*_exvivo.label` / `?h.BA_exvivo.annot` | `mri_label2label` | Brodmann-area labels from the exvivo atlas |
| `?h.BA*_exvivo.thresh.label` / `?h.BA_exvivo.thresh.annot` | `mri_label2label` | Thresholded (most-probable) BA labels |
| `?h.entorhinal_exvivo.label`, `?h.MT_exvivo.label`, `?h.V1_exvivo.label`, `?h.V2_exvivo.label`, `?h.perirhinal_exvivo.label` | `mri_label2label` | Additional exvivo-atlas labels |
| `?h.FG[1-4].mpm.vpnl.label`, `?h.hOc[1-4v].mpm.vpnl.label`, `?h.mpm.vpnl.annot` | `mri_label2label` | VPNL maximum-probability atlas (Rosenke 2021) |
| `BA_exvivo.ctab`, `BA_exvivo.thresh.ctab` | atlas distribution | Colour tables for the exvivo BA annots |

> [!gotcha] Vertex indices are per-surface
> `.label` files store vertex **indices**, not vertex coordinates. They
> are only meaningful against the surface with which they were created
> (almost always `?h.white` / `?h.orig`). Applying a label to a surface
> with a different vertex count — e.g. `?h.orig.nofix` — will
> silently label the wrong anatomy.

## `stats/` — Morphometric Statistics

Plain ASCII tables consumed by `asegstats2table` / `aparcstats2table` for
group analysis. Each file is produced by [[mris_anatomical_stats]] or
`mri_segstats`.

| File | Produced by | Contents |
|------|-------------|----------|
| `aseg.stats` | `mri_segstats` | Volume of every label in `aseg.mgz`; eTIV; CSF; brain-segmentation volumes |
| `wmparc.stats` | `mri_segstats` | Volume of every label in `wmparc.mgz` |
| `brainvol.stats` | recon-all | Summary brain/ICV volumes (computed from `ribbon.mgz` and the Talairach affine) |
| `?h.aparc.stats` | [[mris_anatomical_stats]] | Per-parcel surface area, GM volume, mean thickness, curvature, etc. for `aparc.annot` |
| `?h.aparc.a2009s.stats` | [[mris_anatomical_stats]] | Same, for `aparc.a2009s.annot` |
| `?h.aparc.DKTatlas.stats` | [[mris_anatomical_stats]] | Same, for `aparc.DKTatlas.annot` |
| `?h.aparc.pial.stats` | [[mris_anatomical_stats]] | Same, but computed against the pial surface (pial-referred areas/volumes) |
| `?h.BA_exvivo.stats`, `?h.BA_exvivo.thresh.stats` | [[mris_anatomical_stats]] | Per-BA stats |
| `?h.curv.stats` | `mris_curvature_stats` | Distributional curvature statistics for the hemisphere |
| `?h.w-g.pct.stats` | `mri_segstats` | White/grey contrast per parcel |
| `entowm.stats`, `vsinus.stats` | FS 8.x QC | Volumes of the entorhinal-WM and venous-sinus masks |
| `synthseg.vol.csv`, `synthseg.tiv.dat` | SynthSeg CLI | SynthSeg-based volumes and ICV (FS 8.x) |

All `stats/*` files are line-oriented with `#`-prefixed headers; the
column count and order are documented in the header block.

## `scripts/` — Logs, Status, and Configuration

This directory is the "operating system" of the subject: recon-all uses
files here to coordinate reruns, record exactly what was done, and decide
whether stages can be skipped.

| File | Purpose |
|------|---------|
| `recon-all.log` | Complete stdout/stderr of all recon-all runs on this subject, concatenated |
| `recon-all-status.log` | Per-stage status (started/finished/exited), used by [[check_subject]] and `recon-all -status` |
| `recon-all.cmd` | The exact `recon-all` command line that was used |
| `recon-all.env` | Snapshot of relevant environment variables at invocation time |
| `recon-all.done` | Sentinel file written when a full run completes successfully |
| `recon-all.local-copy` | Marker indicating that recon-all was run from a local working copy |
| `recon-config.yaml` | Auto-generated YAML capturing every resolved option (FS 8.x; see [[wiki/pipelines/recon-all|recon-all]] configuration section) |
| `build-stamp.txt`, `lastcall.build-stamp.txt` | FreeSurfer build identifier at the time of the run / the last run |
| `patchdir.txt` | Optional path to a patch directory used by this run |
| `ponscc.cut.log` | Corpus-callosum cut log from `mri_cc` |
| `defect2seg.log`, `seg2cc.log`, `pctsurfcon.log` | Per-stage ancillary logs |
| `rca-surfreg.YYYYY.MMMMM.*.log` | Timestamped log of each `rca-surfreg` invocation |
| `unknown-args.txt` | Arguments recon-all did not recognise (FS 8.x diagnostic) |
| `log/` | Sub-folder for overflow stage logs |
| `IsRunning.lh+rh` (transient) | Lock file preventing concurrent runs; **must be removed manually** after a crash |

> [!gotcha] `IsRunning.lh+rh`
> recon-all refuses to start if this file exists, to prevent two processes
> from corrupting the same subject. If a run crashes or is killed, the
> file is left behind and must be removed explicitly (`rm
> scripts/IsRunning.lh+rh`) before a retry. Passing `-no-isrunning`
> **does not** mean "ignore the check" — it removes the file for you,
> which is a very different semantic. See the [[wiki/pipelines/recon-all|recon-all]] page.

## `touch/` — Stage Sentinels

Every recon-all stage writes a zero-or-small file under `touch/` when it
completes. These are the *fine-grained* status flags used by
`-isxopts`/`-nofill`-style resume logic. Filenames follow the pattern
`<stage>.touch` for non-hemispheric stages and `?h.<stage>.touch` for
hemispheric stages, and their contents (when non-empty) are the shell
command the stage executed. Typical sentinels include:

```
conform.touch              talairach.touch            nu.touch
em_register.touch          ca_normalize.touch         ca_register.touch
ca_label.touch             fill.touch                 lh.tessellate.touch
lh.smoothwm{1,2}.touch     lh.inflate{1,2}.touch      lh.qsphere.touch
lh.fix.touch               lh.white.preaparc.touch    lh.sphere.touch
lh.sphreg.touch            lh.jacobian_white.touch    lh.avgcurv.touch
lh.cortparc.touch          lh.pial.touch              lh.aparc.touch
lh.pctsurfcon.touch        lh.parcstats.touch         cortical_ribbon.touch
apas2aseg.touch            asegmerge.touch            inorm{1,2}.touch
```

(and the `rh.*` analogues).

> [!gotcha] Touch files ≠ completion proof
> A present touch file means recon-all *believed* the stage finished, not
> that the output is valid. After hand-edits, delete both the output
> file(s) **and** the matching touch file, otherwise a rerun may skip the
> stage.

## `tmp/`, `trash/`, `bem/`, `xhemi/` and Legacy Directories

- `mri/tmp/` — scratch volumes written by individual recon-all stages;
  deleted at stage exit on success. Persistent contents usually indicate
  a crashed stage.
- `tmp/` (top level) — legacy scratch, created empty by `mksubjdirs`,
  essentially unused by modern recon-all.
- `trash/` — destination for files moved out of the way by `recon-all
  -clean` or by user hand-edits. Not created automatically; appears if
  the user or a cleanup helper puts something there.
- `bem/` — populated only when BEM meshes are generated for MNE/MEG
  workflows (`mne_watershed_bem`, `mri_watershed -surf`). Not part of a
  plain recon-all run.
- `xhemi/` — produced by `xhemireg` / `surfreg -xhemi`. Internally it is
  *itself* a near-complete subject directory, with `mri/`, `surf/`,
  `label/` subfolders containing the left hemisphere mapped onto the
  right-hemisphere atlas (and vice versa). Used for lateralisation
  analyses.
- `morph/`, `mpg/`, `tiff/` — legacy directories created empty by
  `mksubjdirs` and used by obsolete workflows (`tkmedit` screenshot
  dumps, paint-style segmentations). They are typically empty in FS 8.x
  but are still created for backwards compatibility.

## Filename Conventions

### Hemisphere prefix

Every surface file is prefixed `lh.` or `rh.`. In filename globs the
conventional wildcard is `?h.*`; in scripts, the recon-all variable
`$hemi` is set to `lh` or `rh`.

### Processing-stage suffixes

| Suffix | Meaning |
|--------|---------|
| `.nofix` | Produced before topology correction |
| `.premesh` | Produced after topology correction but before remeshing |
| `.preaparc` | Produced before cortical parcellation is available |
| `.T1` | Placed using the T1 volume (distinct from a subsequent T2/FLAIR refinement) |
| `.manedit` | Hand-edited version of an auto-generated file, preserved across reruns |
| `.auto` | Automatically generated; may be overwritten by a hand-edited sibling |
| `.orig` (in `mri/`) | Conformed reference volume — note the clash with `?h.orig` in `surf/`, which is the topology-fixed surface |
| `.reg` (on `?h.sphere.reg`) | Registered to the atlas (spherical) |

### File-format suffixes

| Suffix | Format | Reference |
|--------|--------|-----------|
| `.mgz`, `.mgh` | Volumetric binary | [[mgz]] |
| *(none, on surfaces)* | Binary triangle mesh | [[surface-format]] |
| *(none, on curvature files)* | Binary per-vertex scalar (new-format curv) | [[curv-format]] |
| `.annot` | Binary per-vertex parcellation (vertex → RGB+label) | [[annotation-format]] |
| `.label` | ASCII vertex-index list | [[label-format]] |
| `.ctab` | ASCII colour table | [[color-lut]] |
| `.lta` | Linear transform array (binary or ASCII) | [[lta-format]] |
| `.xfm` | MNI transform | [[registration-overview]] |
| `.stats` | ASCII morphometric table | [[stats-format]] |
| `.dat` | ASCII key-value (`autodet.gw.stats`, `register.dat`, etc.) | [[registration-overview]] |
| `.tif` | MRISP spherical parameterisation | [[mrisp-tif]] |
| `.gcs` | Gaussian classifier surface atlas | [[gcsa-format]] |

## Coordinate System

All volumes in `mri/` share the conformed `orig.mgz` voxel/RAS grid
(256³ uint8, 1 mm isotropic, LIA orientation unless `-cm` / `-notal-check`
is used). All surfaces in `surf/` are stored in **Surface RAS (tkreg)**,
which differs from Scanner RAS by the half-bounding-box shift. See
[[coordinate-systems]] for the formal derivation of `Norig`, `Torig`, and
the vox2ras-tkr transformation.

> [!gotcha] Don't apply `talairach.xfm` to surfaces directly
> `mri/transforms/talairach.xfm` is a Scanner-RAS-to-MNI305 affine; it
> cannot be applied directly to a surface stored in Surface RAS. The
> correct operation is `M_talxfm * Norig * inv(Torig)` — the
> `Norig * inv(Torig)` factor devolves the half-voxel shift. See
> [[coordinate-systems]] for the full derivation.

## Tools That Read/Write This Layout

Every FreeSurfer tool that takes `-s <subjid>` or consults
`$SUBJECTS_DIR` reads or writes files in this layout. Notable cases:

| Tool | Role |
|------|------|
| [[wiki/pipelines/recon-all|recon-all]] | Creates and populates the entire tree |
| [[mksubjdirs]] | Creates an empty tree |
| [[mri_info]] | Inspects individual `mri/*.mgz` files |
| [[mri_vol2surf]] | Reads `mri/*.mgz` and `surf/?h.white` / `?h.pial`, writes to `surf/` or a user-supplied path |
| [[mri_surf2vol]] | Inverse of `mri_vol2surf`; uses `surf/?h.white` and `mri/ribbon.mgz` |
| [[mri_label2vol]] | Reads `label/*.label` / `label/*.annot` and writes MGZ label volumes |
| [[mris_anatomical_stats]] | Writes `stats/?h.aparc*.stats` |
| [[mris_preproc]] | Walks `$SUBJECTS_DIR/<subj>/surf/` for every subject listed |
| [[wiki/tools/freeview|freeview]] | Can open a subject by directory; auto-loads standard files based on layout |
| `tkregister2` / `bbregister` | Produces `transforms/*.lta` and `register.dat` anchored to `orig.mgz` |

## Conversion and Portability

There is no single conversion tool for a subject directory — it is a
composite of many file formats. To relocate a subject:

```bash
cp -rp $SUBJECTS_DIR/<subjid> /dest/
# or, preserving ownership and permissions:
tar -C $SUBJECTS_DIR -cpf - <subjid> | tar -C /dest -xpf -
```

Always use `-p` to preserve the `setgid` bit and group ownership. Never
use `rsync` without `-a` / `-p` unless you accept that permissions will be
reset to the mover's umask.

To convert individual files to non-FreeSurfer formats:

- Volumes (`mri/*.mgz` → NIfTI): [[wiki/tools/mri_convert|mri_convert]]
- Surfaces (`surf/?h.white` → GIFTI): `mris_convert --to-gifti` or
  `mris_convert --to-scanner` (to convert *into* Scanner RAS)
- Labels (`label/*.label` → NIfTI volume): [[mri_label2vol]]
- Annots (`label/?h.aparc.annot` → NIfTI volume):
  [[mri_aparc2aseg]] then [[wiki/tools/mri_convert|mri_convert]]

## Gotchas

> [!gotcha] `SUBJECTS_DIR` is not optional
> Every recon-all-aware tool resolves subject IDs against `$SUBJECTS_DIR`.
> If the variable is unset, tools default to `$FREESURFER_HOME/subjects`,
> which usually contains only the shipped atlases — silently the wrong
> directory. Always `export SUBJECTS_DIR=...` before running anything.

> [!gotcha] Absolute paths break the conventions
> Passing an absolute path like `/data/subjects/s01` as the subject ID
> will *sometimes* work (because some tools `basename` it) and sometimes
> produce a nonsense path `$SUBJECTS_DIR//data/subjects/s01/surf/...`.
> Pass only the subject *basename* and set `SUBJECTS_DIR` correctly.

> [!gotcha] Hand edits vs. reruns
> recon-all preserves hand-edited files (`wm.mgz`, `brain.finalsurfs.mgz`,
> `aseg.presurf.mgz`, `?h.white` via `{wm,brain,aseg}.*.manedit.mgz`)
> only if you also **delete the matching `touch/` sentinel** and use the
> appropriate resume flag (`-autorecon2-wm`, `-autorecon2-cp`,
> `-autorecon-pial`, etc.). Without the sentinel-delete, the stage is
> skipped and your edit has no effect.

> [!gotcha] `fsaverage` is a symlink, not a subject
> Surface-space group analyses expect `$SUBJECTS_DIR/fsaverage` to exist.
> The standard recipe is `ln -s $FREESURFER_HOME/subjects/fsaverage
> $SUBJECTS_DIR/fsaverage`. `rca-surfreg` creates this symlink
> automatically when it runs; standalone tools do not.

> [!gotcha] `orig.mgz` ≠ `orig/001.mgz`
> `mri/orig.mgz` is the **conformed** reference volume; `mri/orig/001.mgz`
> is a **raw** input copy. They are both canonical, both called "orig",
> and in the same `mri/` tree — the only disambiguator is whether there
> is a slash. Confusing them is a frequent source of wrong-geometry bugs.

> [!gotcha] Setgid bit and NFS
> The `chmod g+rws` that `mksubjdirs` applies does not always survive an
> NFS mount with `nosuid`. On such shares, files created by different
> users end up with different primary groups and later reruns may fail
> to overwrite them. Check with `ls -ld $SUBJECTS_DIR/<subjid>`.

> [!contradiction] `mksubjdirs` creates `morph/`, `mpg/`, `tiff/`
> These directories exist in every fresh subject tree but have no writer
> in modern recon-all. They are harmless but can confuse users inspecting
> a clean subject and assuming the emptiness means a failed run.

## References

- Source code: `scripts/mksubjdirs` (subject directory creator)
- Source code: `scripts/recon-all` (populator — see [[wiki/pipelines/recon-all|recon-all]] for the
  mapping from stages to directory locations)
- FreeSurfer wiki: [ReconAllOutputFiles](https://surfer.nmr.mgh.harvard.edu/fswiki/ReconAllOutputFiles)
  (authoritative list for FS ≤7.x; used here as cross-reference, not as
  primary source)
- Related pages: [[wiki/pipelines/recon-all|recon-all]], [[coordinate-systems]],
  [[surface-representations]], [[registration-overview]], [[mgz]],
  [[surface-format]], [[curv-format]]

## Confidence and Gaps

High confidence on the directory structure and the provenance of every
file listed — derived from direct inspection of `mksubjdirs`, a complete
`bert` subject produced by FS 8.2.0 recon-all, and the stage-by-stage
mapping documented in [[wiki/pipelines/recon-all|recon-all]].

> [!gap] Longitudinal/base subjects
> `recon-all -base` and `recon-all -long <tpN> <base>` produce subject
> directories with additional files and naming conventions
> (`base-tps`, `long.<tpN>.<base>`, cross-timepoint transforms in
> `mri/transforms/`). These are not enumerated here.

> [!gap] `xhemi/` internal layout
> `xhemi` is itself almost a full subject tree; the exact subset of
> files it contains has not been verified against source.

> [!gap] `bem/` generation paths
> BEM mesh generation is outside the plain recon-all stream and depends
> on which MEG/MNE workflow produced the files.
