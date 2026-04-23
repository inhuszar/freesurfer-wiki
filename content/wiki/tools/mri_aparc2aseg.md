---
title: "mri_aparc2aseg"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_aparc2aseg/mri_aparc2aseg.cpp"
families:
  - "mri_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_ca_label]]"
  - "[[mri_ca_label]]"
  - "[[mris_anatomical_stats]]"
  - "[[recon-all]]"
status: review
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Exact ribbon intersection algorithm (FindClosestLRWPVertexNo) not traced in detail"
  - "CCSegment() function for connected-component correction not traced"
tags:
  - segmentation
  - parcellation
  - volume
  - autorecon3
---

# mri_aparc2aseg

## Summary

`mri_aparc2aseg` projects the cortical parcellation labels from
[[mris_ca_label]] (stored as surface [[annotation-format|annotations]] on `?h.aparc.annot`) back into
volumetric space, producing the combined parcellation+segmentation volume
`aparc+aseg.mgz`. For each cortical voxel (those labeled 3=Left-Cerebral-Cortex
or 42=Right-Cerebral-Cortex in the aseg), it finds the closest cortical surface
vertex and assigns that vertex's parcellation label. Voxels outside the cortical
ribbon are set to 0 (Unknown) by default.

## Source Information

- **Language:** C++
- **Source file(s):** `mri_aparc2aseg/mri_aparc2aseg.cpp` (1793 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_aparc2aseg`
- **Original Author:** Doug Greve

## Purpose and Context

The cortical parcellation (`?h.aparc.annot`) is defined on the surface.
Most volumetric analyses and some subcortical tools need parcel labels in
volume space. `mri_aparc2aseg` bridges this gap by:

1. Taking the aseg as the template (providing non-cortical labels)
2. For every cortical voxel, finding the nearest point on both white and pial
   surfaces
3. If the voxel is inside the cortical ribbon (between white and pial surfaces),
   assigning the parcellation label of the closest vertex
4. Combining these cortical labels with the subcortical labels from the aseg

The result (`aparc+aseg.mgz`) contains both subcortical labels (from aseg)
and cortical parcellation labels (from aparc), making it the standard
combined segmentation used in many FreeSurfer analyses.

## Inputs

### Required Inputs

The tool is invoked via named flags (not positional arguments):

| Flag | Default | Description |
|------|---------|-------------|
| `--s <subjid>` | — | Subject name (sets up all implicit paths) |
| `--o <outvol>` | `mri/<annot>+aseg.mgz` | Output volume |
| `--aseg <name>` | `aseg` | Input aseg base name (resolved under `mri/` or as a path) |
| `--annot <name>` | `aparc` | Annotation stem (reads `lh.<name>.annot`, `rh.<name>.annot`) |
| `--volmask` | (default ON) | Use precomputed `ribbon.mgz` for the cortical-ribbon test |

Implicit inputs (resolved from subject directory):

| File | Description |
|------|-------------|
| `surf/lh.white`, `surf/rh.white` | White surface for ribbon computation |
| `surf/lh.pial`, `surf/rh.pial` | Pial surface for ribbon computation |
| `label/lh.aparc.annot`, `label/rh.aparc.annot` | Cortical parcellation |
| `mri/ribbon.mgz` | Pre-computed cortical ribbon mask |
| `mri/aseg.mgz` | Base volumetric segmentation |

### Input Assumptions

> [!assumption] aseg and surfaces must be coregistered
> The aseg and the white/pial surfaces must be in the same coordinate frame
> ([[coordinate-systems|Surface RAS]]). Since [[recon-all]] produces them together this is always true,
> but stand-alone use requires care.

> [!assumption] ribbon.mgz defines in/out-of-cortex
> By default, voxels outside the ribbon (as computed by `mri_ribbon` from the
> white and pial surfaces) are set to unknown (0). Pass `--noribbon` to
> assign parcellation labels to all aseg cortical voxels regardless of ribbon.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `mri/aparc+aseg.mgz` | [[mgz]] INT | Combined parcellation: subcortical labels from aseg + cortical labels from aparc |
| `mri/aparc.a2009s+aseg.mgz` | [[mgz]] INT | Same with Destrieux (a2009s) parcellation |

Label ranges in the output (FreeSurfer [[color-lut|LUT]]):
- 1000–1035: Left hemisphere cortical parcellation
- 2000–2035: Right hemisphere cortical parcellation
- 1–999, 1036+: Subcortical labels from aseg

## Mathematical Foundations

### Closest Vertex Assignment

For each voxel $v$ labeled as cortex in the aseg:

1. Convert voxel position to Surface RAS coordinates.
2. Find the closest vertex on `lh.white`, `lh.pial`, `rh.white`, `rh.pial`
   using a spatial hash table (`MHT`).
3. If the closest vertex is within the ribbon and within a distance threshold,
   assign the annotation label of that vertex.
4. The label offset depends on hemisphere: left hemisphere labels get +1000,
   right hemisphere labels get +2000.

The `FindClosestLRWPVertexNo()` function searches all four surfaces
simultaneously and returns the hemisphere and vertex number of the closest
surface point.

> [!gap] Ribbon intersection check details not traced
> The exact distance threshold and how the ribbon check is implemented in
> `FindClosestLRWPVertexNo` were not traced in detail in this session.

## Configuration Options

### Complete Flag Reference

Identifiers and I/O:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subjid>` | string | — | Subject name; resolves all implicit input paths under `$SUBJECTS_DIR/<subjid>`. Required. |
| `--sd <dir>` | string | `$SUBJECTS_DIR` env | Override the subjects directory (also sets `SUBJECTS_DIR` for child calls). |
| `--o <outvol>` / `--oaseg` | string | `mri/<annotname>+aseg.mgz` | Output segmentation volume. |
| `--oaparc <vol>` | string | — | Optional separate output containing only the cortical parcellation (without subcortical labels merged in). |
| `--aseg <name>` | string | `aseg` | Input aseg base name (resolved as `$SUBJECTS_DIR/<subj>/mri/<name>.mgz` or `.mgh`, or as a direct path). |
| `--annot <name>` | string | `aparc` | Annotation stem; reads `label/lh.<name>.annot` and `label/rh.<name>.annot`. |
| `--annot-table <file>` | string | `$FREESURFER_HOME/Simple_surface_labels2009.txt` | Override the annotation-id-to-label mapping table (used when the annotation has no embedded color table). |
| `--ctxseg <vol>` | string | — | Use this volume as the cortex segmentation source instead of `aseg.mgz`. Only valid together with `--rip-unknown`. |
| `--dist <vol>` | string | — | Write the per-voxel surface distance used during the closest-vertex assignment to this volume (debugging output). |

Algorithm and labelling:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--volmask` / `--new-ribbon` | bool | ON | Use the precomputed `mri/ribbon.mgz` ("new" ribbon) to decide whether a voxel is inside the cortical ribbon. This is the default and is also what `recon-all` passes explicitly. |
| `--old-ribbon` | bool | OFF | Use the legacy in-tool ribbon test instead of `ribbon.mgz`. Mutually exclusive with `--new-ribbon`/`--volmask`. |
| `--noribbon` | bool | OFF | Disable the ribbon test entirely; assign a parcellation label to every aseg cortex voxel regardless of whether it lies between the white and pial surfaces. |
| `--labelwm` | bool | OFF | Label white-matter voxels with the parcellation of the nearest cortical vertex (this is how `wmparc.mgz` is produced; output labels are offset by 3000/4000 for lh/rh). |
| `--wmparc-dmax <d>` | float (mm) | `5.0` | Maximum allowed surface-to-voxel distance when assigning WM voxels in `--labelwm` mode. Voxels farther than this from any cortical vertex are left unlabelled. |
| `--hypo-as-wm` | bool | OFF | When `--labelwm` is on, also relabel WM-hypointensity voxels (aseg labels 77/78/79) as parcellated WM. |
| `--rip-unknown` | bool | OFF | Mark vertices labelled "unknown" in the annotation as ripped, so that voxels nearest to them are not assigned a cortical label. |
| `--fix-parahipwm` | bool | ON (when `--labelwm`) | Repair parahippocampal WM mislabellings during `--labelwm`. Silently disabled if --labelwm is not set. |
| `--no-fix-parahipwm` | bool | OFF | Disable the parahippocampal WM fix. |
| `--lh` | bool | OFF | Process left hemisphere only (sets `LHOnly=1`, disables RH). |
| `--rh` | bool | OFF | Process right hemisphere only (sets `RHOnly=1`, disables LH). |
| `--a2005s` | bool | OFF | Shortcut: set `annotname=aparc.a2005s` and `baseoffset=100` (Christophe Destrieux 2005 parcellation). |
| `--a2009s` | bool | OFF | Shortcut: set `annotname=aparc.a2009s` and `baseoffset=10100` (Destrieux 2009 parcellation). |
| `--base-offset <n>` | int | `0` | Manually set the base offset added to annotation indices before the hemisphere offset (1000/2000) is applied. |
| `--relabel <norm> <xform> <gca> <intensities>` | 4 strings | unset | Run a GCA-based relabelling of unlikely voxels interior to the white surface using the given norm volume, talairach transform, GCA atlas and label-intensities file. |
| `--no-relabel` | bool | — | Clear any previously set `--relabel` arguments. |
| `--smooth_normals <n>` | int | `10` | Number of iterations used to smooth surface normals before the BRF dot-product check that rejects vertices on the wrong sulcal bank. |

Performance and debugging:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--hashres <r>` | float | `16` | Voxel resolution (mm) of the spatial hash table (`MHT`) used for closest-vertex queries. Smaller = faster lookups, more memory. |
| `--no-hash` | bool | OFF | Disable the hash table; fall back to brute-force `MRISfindClosestVertex` (very slow, debugging only). |
| `--threads <n>` / `--nthreads <n>` | int | `1` | Number of OpenMP threads (no-op if FreeSurfer was built without OpenMP). |
| `--debug_voxel <c> <r> <s>` | 3 ints | unset | Set the global `Gx,Gy,Gz` voxel for verbose per-voxel debug output. |
| `--crs-test <c> <r> <s>` | 3 ints | unset | Run a single closest-vertex query at the given column/row/slice and exit-style debug. |
| `--debug` | bool | OFF | Enable command-line parser debug printing. |
| `--version` | — | — | Print version and exit. |
| `--help`, `-h`, `--usage`, `-u` | — | — | Print help (XML-rendered) and exit. |

### Configuration Interactions

> [!gotcha] --new-ribbon, --old-ribbon and --noribbon are mutually exclusive
> `check_options()` exits with an error if both --old-ribbon and --new-ribbon/--volmask are passed. --noribbon clears both. The default is `UseNewRibbon=1` (i.e. `ribbon.mgz` is used) even if no ribbon flag is given, so `recon-all` passes --volmask explicitly only for clarity.

> [!gotcha] --ctxseg requires --rip-unknown
> `check_options()` enforces this; passing --ctxseg alone aborts with "can only use --ctxseg with --rip-unknown".

> [!gotcha] --fix-parahipwm only takes effect with --labelwm
> If --labelwm is not set, `FixParaHipWM` is silently reset to 0 in `check_options()`, regardless of whether `--fix-parahipwm` was passed.

> [!gotcha] --hypo-as-wm only matters in --labelwm mode
> `LabelHypoAsWM` is consumed only inside the WM-parcellation branch; it has no effect on a plain `aparc+aseg` run.

> [!gotcha] --a2005s / --a2009s overwrite --annot
> Both flags directly assign `annotname` and `baseoffset`. If they appear after `--annot`, they silently replace the user-supplied stem; if they appear before, a later `--annot` will win for the stem but the `baseoffset` set by `--a2009s` (10100) or `--a2005s` (100) is preserved unless `--base-offset` is also given.

> [!gotcha] --lh and --rh are mutually overriding
> Each clears the other's flags rather than producing an error; the last one on the command line wins.

> [!gotcha] Cortical label offsets are fixed
> Left cortical labels = annotation index + 1000 + `baseoffset`. Right = + 2000 + `baseoffset`. These offsets match the FreeSurfer color LUT for the default `aparc` parcellation (`baseoffset=0`); the Destrieux schemes shift the range via `--a2005s`/`--a2009s`.

## Typical Use Cases

### Use Case 1: Standard aparc+aseg generation (recon-all)

```bash
mri_aparc2aseg --s subjid --volmask --o mri/aparc+aseg.mgz
```

### Use Case 2: Destrieux parcellation volume

```bash
mri_aparc2aseg --s subjid --a2009s --o mri/aparc.a2009s+aseg.mgz
```

### Use Case 3: No ribbon constraint

```bash
mri_aparc2aseg --s subjid --noribbon --o mri/aparc+aseg.noribbon.mgz
```

## Pipeline Context

**autorecon3 — aparc2aseg stage** (recon-all ~line 5050)

```
mris_ca_label → label/lh.aparc.annot, label/rh.aparc.annot
mri_ca_label → mri/aseg.auto_noCCseg.mgz (→ aseg.presurf.mgz)
mris_make_surfaces → surf/lh.white, surf/lh.pial, surf/rh.white, surf/rh.pial
                                ↓
  mri_aparc2aseg --s $subjid --volmask --o mri/aparc+aseg.mgz
                                ↓
                     mri/aparc+aseg.mgz
```

Called three times in autorecon3 for the three parcellation schemes (aparc,
a2009s, DKTatlas).

## Gotchas and Caveats

> [!gotcha] Cortex voxels outside the ribbon become Unknown
> Voxels labeled as cortex in the aseg but outside the pial-white ribbon
> receive label 0 (Unknown). In some subjects with poor pial surface
> placement, cortical voxels near sulcal walls can fall outside the ribbon
> and be mislabeled as Unknown.

> [!gotcha] Output labels ≠ aseg labels for cortical regions
> The aparc+aseg uses labels 1000–1035 (lh) and 2000–2035 (rh) for cortical
> regions, which are different from the aseg labels 3 (Left-Cerebral-Cortex)
> and 42 (Right-Cerebral-Cortex). Scripts that expect aseg-style labels must
> be updated to handle aparc+aseg ranges.

## Related Tools

- [[mris_ca_label]] — produces the surface annotation used as input
- [[mri_ca_label]] — produces the aseg used as the base volume
- [[mris_anatomical_stats]] — computes morphometric statistics using aparc+aseg

## Confidence and Gaps

Confidence **high** for the algorithm overview, flags, and pipeline context.

> [!gap] Closest vertex search radius and distance thresholds
> The exact distance limits in `FindClosestLRWPVertexNo()` were not traced.

## References

- Fischl, B. (2012). *FreeSurfer.* NeuroImage, 62(2):774–781.
- Documentation at: `https://surfer.nmr.mgh.harvard.edu/fswiki/mri_aparc2aseg`
  (accession: 2026-04-14)
