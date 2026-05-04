---
title: "fsaverage — The Standard Average Brain"
type: concept
fs_version: "8.2.0"
related_tools:
  - "[[mris_register]]"
  - "[[mris_preproc]]"
  - "[[mri_vol2surf]]"
  - "[[mris_make_average_surface]]"
  - "[[mris_apply_reg]]"
  - "[[mri_surf2surf]]"
  - "[[mris_smooth]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
related_concepts:
  - "[[surface-representations]]"
  - "[[registration-overview]]"
  - "[[coordinate-systems]]"
  - "[[parcellation-schemes]]"
related_formats:
  - "[[surface-format]]"
  - "[[annotation-format]]"
  - "[[mrisp-tif]]"
  - "[[subject-directory]]"
status: review
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - fsaverage
  - atlas
  - registration
  - group-analysis
---

# fsaverage — The Standard Average Brain

## Overview

`fsaverage` is FreeSurfer's canonical average-brain template subject. It occupies
a fixed directory at `$FREESURFER_HOME/subjects/fsaverage` and is structured
identically to an ordinary reconstructed subject: it has `surf/`, `label/`, `mri/`,
and `stats/` subdirectories, and every surface file that a processed individual
subject would have. What distinguishes it is that its surfaces, curvature maps, and
parcellation annotations represent statistical averages over a set of healthy adult
brains rather than any single individual.

`fsaverage` serves three distinct but interrelated roles in the FreeSurfer ecosystem:

1. **Common reference space for surface-based group analysis.** Because cortical
   geometry varies substantially between individuals, comparing surface data
   (thickness, curvature, fMRI activation) across subjects requires establishing
   vertex-level correspondence. `fsaverage` is that common space: every subject's
   surface is warped onto `fsaverage`'s sphere before group statistics are computed.

2. **Atlas target for spherical registration.** During `recon-all`, `mris_register`
   (called via `rca-surfreg`) aligns each subject's `?h.sphere` to `fsaverage`'s
   sphere using folding features encoded as MRISP atlas files (`.tif`). The
   output is `?h.sphere.reg`, which defines the per-vertex mapping from subject
   to fsaverage space.

3. **Source of standard parcellation labels.** The label files in
   `fsaverage/label/` — including the Desikan-Killiany (`aparc.annot`),
   Destrieux (`aparc.a2009s.annot`), and Brodmann area annotations — serve as
   priors for `mris_ca_label`. After spherical registration, these atlas labels
   can be projected back from fsaverage onto any individual subject.

## Construction

`fsaverage` was built from 40 healthy adult subjects drawn from the Buckner
laboratory's data repository at Brigham and Women's Hospital. The subject
identifiers are publicly referenced in the construction logs:

```
004 008 017 021 032 039 040 045 049 067 073 074 080 084 091 092 093
095 097 099 102 103 106 108 111 114 123 124 128 129 130 131 133 136
138 140 141 144 145 149
```

The construction logs in `$FREESURFER_HOME/subjects/fsaverage/scripts/` record
that the surfaces were assembled on 14 August 2007 by Nick Schmansky using
FreeSurfer stable4, with annotations updated subsequently (e.g.,
`aparc.a2009s.annot` was added on 30 December 2010 using stable5). The same
40-subject cohort was reprocessed for `fsaverage5`, `fsaverage6`, and other
resolution variants using later FreeSurfer versions.

### The `mris_make_average_surface` Algorithm

The construction tool is `mris_make_average_surface` (source:
`mris_make_average_surface/mris_make_average_surface.cpp`). The default code
path since FreeSurfer ~7 uses the `MakeAverageSurf()` function
(`utils/mrisutils.cpp`, line 3227), which implements the following algorithm:

1. **Load the icosahedron.** An icosahedron of order 7 (163,842 vertices) is read
   from `$FREESURFER_HOME/lib/bem/ic7.tri` and scaled to radius 100 mm. This
   icosahedron defines the vertex topology of the output surface — all fsaverage
   surfaces share this fixed topology.

2. **Per-subject loop.** For each of the 40 input subjects:
   a. Read the subject's `?h.sphere.reg` (the spherically registered surface).
   b. Read the subject's target surface (default: `orig`, which corresponds to
      the `pial` surface in this context).
   c. Apply the subject's Talairach transform (`mri/transforms/talairach.xfm`)
      to the surface vertices. This maps each subject into a common linear
      reference space before averaging.
   d. Use `MRISapplyReg()` to resample the Talairach-transformed surface XYZ
      coordinates onto the icosahedron vertices via the sphere registration
      mapping (nearest-vertex lookup using a spatial hash).
   e. Accumulate the resampled XYZ into a running sum.

3. **Compute the mean.** Divide the accumulated XYZ sum by the number of
   subjects ($N = 40$) to obtain the mean vertex position at each icosahedron
   vertex:

$$
   \bar{x}_i = \frac{1}{N}\sum_{j=1}^{N} T_j \cdot \phi_j(x_i^{(j)})
$$

   where $\bar{x}_i$ is the average position of vertex $i$, $T_j$ is subject
   $j$'s Talairach transform, $\phi_j$ is the mapping from subject $j$'s sphere
   registration to the icosahedron, and $x_i^{(j)}$ is the corresponding surface
   vertex in subject $j$.

4. **Area normalisation.** After averaging, the group average surface area
   $\bar{A} = \frac{1}{N}\sum_j A_j$ is stored in the surface header as
   `group_avg_surface_area`. This is used by tools such as `mri_surf2surf` and
   `mris_preproc` to apply Jacobian correction when projecting data to/from
   fsaverage.

5. **Write output.** The average surface is written to
   `$SUBJECTS_DIR/fsaverage/surf/?h.<surfname>`.

> [!internal] Older parametric method
> The original code path (still present but not used by default) maps subject
> surfaces through a parametric spherical representation (MRISP, an
> `MRI_SP` structure encoding $\theta$-$\phi$ space). It is disabled because
> it produces abnormally large faces near the poles. The current default
> (`-surf2surf`) avoids this by using nearest-vertex lookup on the icosahedron
> directly. The flag `-no-surf2surf` switches back to the parametric method.

> [!gotcha] Fix for pole coincidence at ic7
> At icosahedron order 7 (163,842 vertices), vertex 0 and vertex 40969 can
> land at the same coordinate. The code explicitly calls `MRISfixAverageSurf7()`
> after averaging to correct this. This is specific to the ic7 topology and
> reflects a known artefact of the icosahedral subdivision scheme.

## Vertex Count and Resolution

`fsaverage` and its downsampled variants all use the icosahedral subdivision
topology. The vertex count follows the formula $V = 10 \cdot 4^n + 2$ and the
face count is $F = 20 \cdot 4^n$ for icosahedron order $n$:

| Variant | Ico order | Vertices/hemi | Faces/hemi | Avg vertex spacing |
|---------|-----------|--------------|------------|-------------------|
| `fsaverage3` | ic3 | 642 | 1,280 | ~14 mm |
| `fsaverage4` | ic4 | 2,562 | 5,120 | ~7 mm |
| `fsaverage5` | ic5 | 10,242 | 20,480 | ~3.5 mm |
| `fsaverage6` | ic6 | 40,962 | 81,920 | ~1.8 mm |
| `fsaverage` | ic7 | 163,842 | 327,680 | ~0.9 mm |

Vertex spacings are approximate; the `mris_info` output for `fsaverage` reports
`AvgVtxDist = 0.721953 mm` and `AvgVtxArea = 0.399269 mm²`.

The full-resolution `fsaverage` (ic7) is the default registration target. The
downsampled variants are used when computational cost is prohibitive — for
example, `fsaverage5` is commonly used for group fMRI analysis because the
~10k-vertex resolution is adequate after spatial smoothing (FWHM > 5 mm), and
processing is approximately 16× faster than at ic7.

All five variants were built from the same 40-subject Buckner cohort, just
triangulated at different icosahedron orders.

> [!assumption] Symmetric topology
> Every fsaverage variant is based on the icosahedral tessellation, meaning the
> topology is perfectly regular (every interior vertex has exactly 6 neighbours).
> Individual subject surfaces processed by `recon-all` do NOT share this
> topology — their surfaces are generated by marching cubes tessellation and
> then remeshed. Correspondence is established only via the sphere registration,
> not by raw vertex index.

## The fsaverage Directory Contents

```
$FREESURFER_HOME/subjects/fsaverage/
├── surf/
│   ├── lh.white, rh.white          # Average white matter surface (ic7 topology)
│   ├── lh.pial, rh.pial            # Average pial surface
│   ├── lh.inflated, rh.inflated    # Inflated surface (for visualisation)
│   ├── lh.sphere, rh.sphere        # Unit sphere (ic7 tessellation)
│   ├── lh.sphere.reg, rh.sphere.reg  # Canonical registration surface (= sphere for fsaverage itself)
│   ├── lh.curv, rh.curv            # Average curvature
│   ├── lh.sulc, rh.sulc            # Average sulcal depth
│   ├── lh.avg_curv, rh.avg_curv    # Smoothed average curvature (registration target)
│   ├── lh.avg_sulc, rh.avg_sulc    # Smoothed average sulcal depth
│   ├── lh.area, rh.area            # Average surface area per vertex
│   ├── lh.thickness, rh.thickness  # Average cortical thickness
│   ├── lh.smoothwm, rh.smoothwm    # Smoothed white surface
│   ├── lh.orig, rh.orig            # Average orig surface
│   ├── lh.white_avg, rh.white_avg  # White avg (used in construction)
│   ├── lh.pial_avg, rh.pial_avg    # Pial avg (used in construction)
│   ├── lh.inflated_avg             # Inflated avg
│   ├── lh.white.avg.area.mgh       # Per-vertex average white surface area (MGH)
│   ├── lh.pial.avg.area.mgh        # Per-vertex average pial surface area (MGH)
│   ├── lh.fsaverage_sym.sphere.reg # Registration to fsaverage_sym (inter-hemi symmetry)
│   └── lh.cortex.patch.*           # Cortex patches (flat, 3D)
│
├── label/
│   ├── lh.aparc.annot              # Desikan-Killiany parcellation (34 regions/hemi)
│   ├── lh.aparc.a2009s.annot       # Destrieux parcellation (74 regions/hemi)
│   ├── lh.aparc.a2005s.annot       # Older Destrieux atlas
│   ├── lh.aparc.label              # Cortical label (all parcellated vertices)
│   ├── lh.cortex.label             # Cortex mask (excludes medial wall)
│   ├── lh.Medial_wall.label        # Medial wall label
│   ├── lh.BA*.label                # Brodmann area labels (ex vivo)
│   ├── lh.PALS_B12_*.annot         # PALS B12 atlas annotations
│   ├── lh.Yeo2011_7Networks_N1000.annot  # Yeo 7-network parcellation
│   ├── lh.Yeo2011_17Networks_N1000.annot # Yeo 17-network parcellation
│   └── lh.oasis.chubs.annot        # OASIS CHUBs parcellation
│
└── mri/
    ├── T1.mgz                       # Average T1 volume (MNI305 space)
    ├── orig.mgz                     # Average orig volume
    ├── brain.mgz                    # Skull-stripped brain
    ├── aseg.mgz                     # Average subcortical segmentation
    ├── aparc+aseg.mgz               # Average parcellation + segmentation
    ├── ribbon.mgz                   # Cortical ribbon mask
    ├── mni305.cor.mgz               # MNI305 template (used as volume geometry reference)
    └── transforms/
        ├── talairach.xfm            # Identity transform (fsaverage is in MNI305 space)
        └── reg.mni152.2mm.dat       # Registration to MNI152 2mm space
```

> [!gotcha] `sphere.reg` is identity for fsaverage
> For a regular subject, `?h.sphere.reg` differs from `?h.sphere` — it is the
> sphere after registration to fsaverage space. For fsaverage itself,
> `?h.sphere.reg` is effectively the same as `?h.sphere`, because fsaverage
> defines the target space. Tools that read `sphere.reg` for registration
> will find an identity mapping when operating on fsaverage directly.

### Atlas TIF Files

The atlas files used for spherical registration live in `$FREESURFER_HOME/average/`,
not inside the `fsaverage` subject directory itself. The primary registration
atlas for modern FreeSurfer is:

```
$FREESURFER_HOME/average/lh.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif
$FREESURFER_HOME/average/rh.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif
```

These are MRISP (MRI Spherical Parametrization) files encoding the average
curvature and sulcal depth of the 40 Buckner subjects, sampled on the fsaverage
sphere. The name encodes: `acfb40` = average curvature folding buckner-40,
`noaparc` = constructed without parcellation constraint, `i12` = 12 iterations
of smoothing, date-stamped 2016-08-02. Older atlas files such as
`lh.average.curvature.filled.buckner40.tif` and `lh.average.tif` remain in the
directory for backward compatibility but are not used by default in FreeSurfer 8.

## Registration to fsaverage

Every subject processed by `recon-all` goes through the `-surfreg` stage, which
calls `rca-surfreg` (source: `scripts/rca-surfreg`), which calls `mris_register`.

The input features for registration are mean curvature (`?h.curv`) and sulcal
depth (`?h.sulc`) on the subject's sphere. These are matched to the atlas TIF
file using a gradient-descent optimisation on the sphere. The result is saved as:

```
$SUBJECTS_DIR/<subject>/surf/?h.sphere.reg
```

This file records the position of each vertex on the sphere after alignment to
fsaverage's sphere. Concretely, if subject vertex $v$ has position
$\mathbf{p}_v^{\text{sphere.reg}}$ on the fsaverage sphere, then the nearest
fsaverage vertex $u$ satisfies:

$$
u = \arg\min_{u' \in V_{\text{fsaverage}}} \left\|\mathbf{p}_v^{\text{sphere.reg}} - \mathbf{p}_{u'}^{\text{sphere}}\right\|
$$

This nearest-vertex correspondence is used by `mri_surf2surf`, `mris_preproc`,
and `mris_apply_reg` to resample any per-vertex scalar map (thickness, curvature,
fMRI activation, etc.) from subject space to fsaverage space.

`rca-surfreg` also creates a symlink `?h.fsaverage.sphere.reg -> ?h.sphere.reg`
in the subject's `surf/` directory for backward compatibility with tools that
look for the longer filename.

> [!gotcha] `sphere` vs `sphere.reg` — do not confuse them
> `?h.sphere` is the subject's inflated sphere before registration — it has the
> correct unit-sphere topology but arbitrary vertex placement. `?h.sphere.reg`
> is the registered version: vertex positions have been shifted to align folding
> features with the fsaverage atlas. Only `sphere.reg` establishes inter-subject
> correspondence. Using `sphere` instead of `sphere.reg` as the registration
> surface in downstream tools is a common mistake that produces incorrect spatial
> correspondence.

## Group Analysis Workflow

The standard workflow for surface-based group analysis uses fsaverage as the
common space:

### Step 1 — Individual surface registration (done by `recon-all`)

```bash
# This runs automatically during recon-all -autorecon3
rca-surfreg --s <subject>
# Produces: $SUBJECTS_DIR/<subject>/surf/?h.sphere.reg
```

### Step 2a — Project morphometric maps to fsaverage (batch)

```bash
# Concatenate thickness maps from multiple subjects onto fsaverage
mris_preproc \
  --hemi lh \
  --target fsaverage \
  --meas thickness \
  --s subj1 --s subj2 --s subj3 \
  --out lh.thickness.fsaverage.mgh
```

`mris_preproc` (source: `scripts/mris_preproc`) internally calls `mri_surf2surf`
for each subject, using `sphere.reg` as the registration surface. The output
is a 4D MGH file with one frame per subject.

### Step 2b — Project fMRI or volume data to fsaverage

```bash
# Project a stat volume onto the fsaverage surface
mri_vol2surf \
  --src subject/mri/stat.mgz \
  --reg subject/mri/register.dat \
  --hemi lh \
  --projfrac 0.5 \
  --trgsubject fsaverage \
  --out lh.stat.fsaverage.mgh
```

### Step 3 — Spatial smoothing on fsaverage

```bash
# Smooth on the fsaverage surface (FWHM in mm)
mris_smooth \
  -no-rescale \
  -fwhm 10 \
  $FREESURFER_HOME/subjects/fsaverage/surf/lh.white \
  lh.thickness.fsaverage.mgh \
  lh.thickness.fsaverage.s10.mgh
```

### Step 4 — Group statistics

```bash
# Vertex-wise GLM using mri_glmfit
mri_glmfit \
  --y lh.thickness.fsaverage.s10.mgh \
  --fsgd design.fsgd doss \
  --C contrast.mtx \
  --surf fsaverage lh \
  --glmdir lh.thickness.glm
```

> [!gotcha] Pre-registration is required before `mris_preproc`
> `mris_preproc` assumes that each subject listed with `--s` has already been
> registered to the target (fsaverage) via `recon-all`. If `?h.sphere.reg`
> does not exist or was generated with a different FreeSurfer version than the
> atlas TIF, the projection will be incorrect. Always confirm that `sphere.reg`
> exists for all subjects before running group analysis.

## fsaverage vs fsaverage5/6

### Resolution comparison

| Variant | Vertices | Faces | Avg spacing | Typical FWHM | Use case |
|---------|---------|-------|-------------|--------------|----------|
| `fsaverage5` | 10,242 | 20,480 | ~3.5 mm | ≥ 5 mm | Group fMRI, fast GLM |
| `fsaverage6` | 40,962 | 81,920 | ~1.8 mm | ≥ 3 mm | Higher-res group analysis |
| `fsaverage` | 163,842 | 327,680 | ~0.9 mm | ≥ 2 mm | Morphometry, cortical parcellation |

### Downsampling between resolutions

```bash
# Downsample from fsaverage (ic7) to fsaverage5 (ic5)
mri_surf2surf \
  --srcsubject fsaverage \
  --trgsubject fsaverage5 \
  --hemi lh \
  --sval lh.thickness.fsaverage.mgh \
  --tval lh.thickness.fsaverage5.mgh
```

Because all fsaverage variants share the same icosahedral topology and were
built from the same 40 subjects, resampling between them is exact in the sense
that every `fsaverage5` vertex has a corresponding `fsaverage` vertex (downsampling
simply selects a subset), though interpolation may be used for upsampling.

### Choosing a resolution

- **`fsaverage5`** is the conventional choice for fMRI group analysis. After
  typical spatial smoothing (6–10 mm FWHM), the ~3.5 mm vertex spacing is
  not the resolution bottleneck. Memory and computation are approximately
  16× less than at `fsaverage`.
- **`fsaverage6`** is appropriate when moderate spatial resolution is needed
  without full `fsaverage` cost — e.g., for resting-state connectivity parcellation.
- **`fsaverage`** should be used for morphometric group analysis (thickness,
  area, curvature) because the full resolution best captures fine-scale
  cortical geometry differences. It is also required for correct atlas-based
  parcellation with `mris_ca_label`.

## The fsaverage Symlink

`recon-all` requires `fsaverage` to be accessible in `$SUBJECTS_DIR` because
many tools resolve subject names relative to that directory. The script handles
this automatically: during the `-label` stage, `recon-all` checks for
`$SUBJECTS_DIR/fsaverage`. If it is absent, it creates a symbolic link pointing
to `$FREESURFER_HOME/subjects/fsaverage`:

```tcsh
# From recon-all, scripts line ~5418
ln -s $FREESURFER_HOME/subjects/fsaverage
```

The same check is repeated during `-qcache`. The check also tests whether the
symlink points to a sufficiently up-to-date version of fsaverage: if
`lh.entorhinal_exvivo.thresh.label` is missing (added after FreeSurfer 5.3),
the old symlink is removed and replaced.

> [!gotcha] Stale symlink after FreeSurfer upgrade
> If `$SUBJECTS_DIR/fsaverage` was created as a symlink by an older FreeSurfer
> installation, it will point to the old `$FREESURFER_HOME`. After upgrading
> FreeSurfer and setting `FREESURFER_HOME` to the new installation, the existing
> symlink still points to the old location. If the old installation is still
> present the symlink will work but reference outdated atlas files; if it has
> been deleted, the symlink will be broken. Resolve by removing the stale symlink
> and letting `recon-all` recreate it, or creating it manually:
> ```bash
> cd $SUBJECTS_DIR
> rm fsaverage   # only if it is a symlink; check with ls -la
> ln -s $FREESURFER_HOME/subjects/fsaverage
> ```

> [!gotcha] SUBJECTS_DIR not set or different across tools
> Because the fsaverage symlink lives in `$SUBJECTS_DIR`, running tools with
> different values of `$SUBJECTS_DIR` (e.g., on a cluster where each job sets
> it independently) can cause some jobs to fail to find fsaverage. It is good
> practice to confirm `$SUBJECTS_DIR/fsaverage` exists in each compute
> environment before submitting batch jobs.

## fsaverage_sym — The Symmetric Average

`$FREESURFER_HOME/subjects/fsaverage_sym` is a related but distinct template
designed for inter-hemispheric comparisons. Unlike standard `fsaverage`, which
treats the two hemispheres independently, `fsaverage_sym` was constructed to be
left-right symmetric. It has 163,842 vertices per hemisphere (same as `fsaverage`)
and is used with the `surfreg.fsaverage_sym` registration pipeline. The file
`lh.fsaverage_sym.sphere.reg` in each subject's `surf/` directory encodes the
alignment to this symmetric template.

`fsaverage_sym` is not used in the main `recon-all` pipeline but is available
for studies requiring across-hemisphere comparison in a shared coordinate space.

## Common Misunderstandings

> [!gotcha] Vertex indices do not encode anatomy
> A statement like "vertex 50000 of fsaverage corresponds to the left motor
> cortex" is meaningless. The icosahedral tessellation assigns vertex indices
> based on subdivision order, not anatomy. The anatomical location of any vertex
> is determined only by its $(x, y, z)$ position in surface RAS space. Reporting
> results as vertex indices without coordinates is not reproducible.

> [!gotcha] fsaverage is not in MNI152 space
> The fsaverage volume (`mri/T1.mgz`) is in MNI305 space (the same space that
> FreeSurfer uses for Talairach registration), not MNI152 space. The file
> `mri/transforms/reg.mni152.2mm.dat` provides the registration between the
> two, but conversions are needed to compare fsaverage surface coordinates with
> FSL or SPM results in MNI152. See [[coordinate-systems]] for details.

> [!gotcha] The `talairach.xfm` in fsaverage is identity
> For a normal subject, `mri/transforms/talairach.xfm` encodes the affine
> registration to Talairach/MNI305 space. For fsaverage, this transform is
> the identity matrix because fsaverage is already defined in MNI305 space.
> Code that unconditionally applies the Talairach transform will get correct
> results for fsaverage only by coincidence.

> [!gotcha] Registration quality depends on folding similarity
> `mris_register` aligns folding patterns (curvature + sulcal depth) between
> the subject and the fsaverage atlas. Subjects with highly atypical folding
> (e.g., lissencephaly, polymicrogyria) or poor-quality reconstructions
> (excessive holes, self-intersections in the inflated surface) will have poor
> sphere registration and thus poor correspondence with fsaverage. Checking
> `?h.sphere.reg` quality before group analysis is advisable.

## Confidence and Gaps

**High confidence (from source code and construction logs):**
- 40-subject Buckner cohort (subject IDs confirmed from `make_average_surface.log`)
- Icosahedral topology for all variants (confirmed from `mris_info` output and source)
- Vertex/face counts for all ic3–ic7 variants (formula $10 \cdot 4^n + 2$, verified)
- Algorithm in `MakeAverageSurf()` (read from `utils/mrisutils.cpp`)
- Talairach-space averaging (confirmed from source comments and code)
- Symlink creation logic (confirmed from `recon-all` source lines ~5396–5422)

**Medium confidence:**
- The exact date/circumstances of annotation updates (inferred from `recon-all.cmd` log)

> [!gap] Original paper citation
> The fsaverage template was described in the context of early FreeSurfer publications
> (Fischl et al., 1999; Fischl et al., 2001). A specific paper describing the
> Buckner-40 cohort and the construction methodology should be cited here. Human
> verification recommended to identify the canonical reference.

> [!gap] fsaverage3 and fsaverage4 construction logs
> The `scripts/` directories of `fsaverage3` and `fsaverage4` only contain
> `make_average_surface.log` and `make_average_volume.log`. The full provenance
> (which FreeSurfer version, exact command line) was not read for this page.
> Assumed to be the same 40-subject cohort at lower icosahedron orders, consistent
> with `fsaverage5` logs which confirm the same subject list.

> [!gap] MakeAverageSurf vs old parametric path — which was used for the included fsaverage?
> The `MakeAverageSurf()` surf2surf path was introduced around FreeSurfer 7.
> The fsaverage template shipped with FreeSurfer 8.2.0 was originally built in
> 2007 using the older parametric (MRISP) method, then regenerated or patched
> in subsequent releases. The `fix-surf7.log` file in `scripts/` confirms a
> post-hoc fix was applied. The exact version history of the shipped template
> is not fully documented.

## References

- FreeSurfer wiki: `https://surfer.nmr.mgh.harvard.edu/fswiki/FsAverage`
  (not archived for this page; accession date not recorded)
- Fischl B, Sereno MI, Tootell RBH, Dale AM (1999). High-resolution intersubject
  averaging and a coordinate system for the cortical surface. *Human Brain Mapping*,
  8(4), 272–284. doi:10.1002/(SICI)1097-0193(1999)8:4<272::AID-HBM10>3.0.CO;2-4
- Fischl B, van der Kouwe A, Destrieux C, et al. (2004). Automatically parcellating
  the human cerebral cortex. *Cerebral Cortex*, 14(1), 11–22. doi:10.1093/cercor/bhg087
- Source file (construction): `mris_make_average_surface/mris_make_average_surface.cpp`
- Source file (averaging algorithm): `utils/mrisutils.cpp`, function `MakeAverageSurf()` ([line 3227](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/mrisutils.cpp#L3227))
- Source file (surfreg pipeline): `scripts/rca-surfreg`
- Source file (group analysis): `scripts/mris_preproc`
- Construction log (original): `$FREESURFER_HOME/subjects/fsaverage/scripts/make_average_surface.log`
  (Tue Aug 14 13:33:45 EDT 2007, FreeSurfer stable4, author: Nick Schmansky)
- Construction log (area maps): `$FREESURFER_HOME/subjects/fsaverage/surf/mris_preproc.surface.lh.log`
  (Tue Aug 14 15:30:14 EDT 2007)
