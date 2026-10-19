---
title: "mri_cvs_register"
type: tool
fs_version: "8.2.0"
source_language: "shell (tcsh)"
source_files:
  - "mri_cvs_register/mri_cvs_register"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_cvs_check]]"
  - "[[mri_cvs_data_copy]]"
  - "[[mris_register]]"
  - "[[mri_em_register]]"
  - "[[mri_concatenate_gcam]]"
  - "[[surf2vol]]"
  - "[[exportGcam]]"
  - "[[mri_nl_align]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-10-19
gaps: []
tags:
  - cvs
  - registration
  - nonlinear
  - surface
  - atlas
---

# mri_cvs_register

## Summary

`mri_cvs_register` implements the Combined Volumetric and Surface (CVS) registration method, which jointly aligns a subject's cortical surface representation and volumetric MRI to a target atlas. The pipeline runs in three steps: (1) spherical surface registration using [[mris_register]], (2) elastic volumetric registration using resampled surface information, and (3) nonlinear volumetric morphing. The final output is a composite warp field (`.m3z`) that maps the subject brain to the template space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `mri_cvs_register/mri_cvs_register`
- **Original author:** Lilla Zollei (2009–2017)

## Purpose and Context

Standard FreeSurfer registration (e.g., [[mri_em_register]]) optimizes only volumetric or only surface alignment. CVS improves inter-subject registration by leveraging both cortical surface shape (curvature, sulcal depth) and volumetric intensity (norm/T1) in a unified framework. It is designed for group analysis requiring accurate whole-brain spatial normalization, including subcortical structures.

The default template is `cvs_avg35` (35-subject average), included in the FreeSurfer distribution. An MNI152-space CVS template (`cvs_avg35_inMNI152`) is also available.

## Inputs

Required:
- **`--mov movingid`**: moving subject ID (must have completed `recon-all`)
- **`--template templateid`**: template subject ID (default: `cvs_avg35`)
- `$SUBJECTS_DIR` must be set

Optional inputs:
- `--outdir outdir`: output directory (default: `$SUBJECTS_DIR/$movingid/cvs/`)
- `--asegfname name`: aseg filename without extension (default: `aseg`)
- `--templatedir dir`: directory for template (default: `$SUBJECTS_DIR`)
- `--nolog` / `--no-log`: suppress log files
- `--hemi hemi`: register only one hemisphere
- `--masktargethemi` / `--maskmovinghemi`: mask full brain to one hemisphere (for ex-vivo)

## Outputs

In `outdir/` (default `$SUBJECTS_DIR/movingid/cvs/`):
- **`el_reg_to{templateid}.tm3d`**: elastic registration morph (Step 2)
- **`combined_to{templateid}_elreg_afteraseg-norm.m3z`** or similar: final combined warp (Step 3)
- Log files: `{movingid}_to_{templateid}.mri_cvs_register.*.log` and `summary.*.log`
- Resampled surfaces: `?h.resample.{white,pial}`, `?h.resample.aparc.annot`

The final output morph can be applied to any co-registered subject volume using `mri_vol2vol` with the `--m3z` flag.

## Mathematical Foundations

**Step 1 — Surface registration:**
Uses [[mris_register]] with `-inflated` and `-dist 1.0` flags to align the subject's spherical surface to the template's spherical surface, producing `?h.cvs.to{template}.sphere.reg`.

Surfaces are then resampled to the template space using `mris_resample`, producing white/pial surfaces in atlas geometry.

**Step 2 — Elastic registration:**
Uses the resampled surfaces to constrain a volumetric elastic registration. The moving brain's `norm.mgz` and `aseg.mgz` are morphed toward the template, with the resampled white (and pial) surfaces providing displacement constraints on the cortical boundary location.

The elastic stage is the `fem_elastic` executable [[surf2vol]], invoked inline at [`mri_cvs_register/mri_cvs_register:389-440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L389-L440) with the fixed option set `-lin_res 20 -ksp_rtol 1.0e-9 -penalty_weight 1000 -fem_steps 17 -elt_vol_range 5.0,10.0 -topology_old -compress -pc_type jacobi -ksp_type preonly -poisson .3 -young 1000 -cache_transform $outdir/transform.txt`. It writes `el_reg_to{templateid}.tm3d` (plus `.mgz` and `.affine.mgz`), which [[exportGcam]] then converts to `el_reg_to{templateid}.m3z`. The script's comment block at [`mri_cvs_register/mri_cvs_register:373-386`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L373-L386) records how these parameters were tuned empirically.

**Step 3 — Nonlinear volumetric alignment:**
Refines the elastic registration result with [[mri_nl_align]] ([`mri_cvs_register/mri_cvs_register:603-606`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L603-L606), [`:702-705`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L702-L705)), using the intensity (`norm.mgz`) and segmentation (`aseg.mgz`) volumes after they have been resampled through the elastic `.m3z` with `mri_vol2vol --m3z`. The elastic and volumetric morphs are then combined via [[mri_concatenate_gcam]] ([`:621`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L621), [`:728`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mri_cvs_register/mri_cvs_register#L728)) into a single composite warp.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--mov movingid` | string | required | Moving subject ID |
| `--template templateid` | string | `cvs_avg35` | Template subject ID (default applied in `check_params` when omitted) |
| `--outdir dir` | path | `$SUBJECTS_DIR/movingid/cvs/` | Output directory |
| `--templatedir dir` | path | `$SUBJECTS_DIR` | Template base directory |
| `--asegfname name` | string | `aseg` | Aseg filename stem (extension stripped automatically) |
| `--nointensity` | — | off | Skip intensity-based registration (Step 3 norm) |
| `--noaseg` | — | off | Skip aseg-based registration (Step 3 aseg) |
| `--step1` | — | off | Run only Step 1 (surface registration) |
| `--step2` | — | off | Run only Step 2 (elastic registration) |
| `--step3` | — | off | Run only Step 3 (volumetric nonlinear) |
| `--nolog`<br>`--no-log` | — | off | Suppress log file creation |
| `--keepelreg` | — | off | Keep intermediate elastic registration `.tm3d` file |
| `--keepallm3z` | — | off | Keep all intermediate `.m3z` files |
| `--m3d` | — | off | Use `.m3d` (uncompressed) format instead of `.m3z` |
| `--hemi hemi` | lh or rh | both | Register only one hemisphere |
| `--masktargethemi` | — | off | Apply hemimask to target (for ex-vivo/single-hemi) |
| `--maskmovinghemi` | — | off | Apply hemimask to moving subject |
| `--openmp N` | int | 0 (serial) | Enable OpenMP with N threads |
| `--downsample N` | int | off | Downsample morphs by factor N |
| `--mni` | — | off | Use `cvs_avg35_inMNI152` template (sets `usingCVSMNItemplate=1`) |
| `--nocleanup` | — | off | Preserve intermediate files (sets `keepelreg=1`, `keepallm3z=1`, `cleanup=0`) |
| `--cleanall` | — | off | Force recompute all three steps (surface, elastic, volumetric) |
| `--cleansurfreg` | — | off | Force recompute Step 1 surface registration |
| `--cleanelreg` | — | off | Force recompute Step 2 elastic registration |
| `--cleanvolreg` | — | off | Force recompute Step 3 volumetric registration |
| `--voltype type` | string | `norm` | Volume type to use for registration |
| `--verbose N` | int | — | Verbosity level |
| `--debug` | — | off | Enable verbose shell tracing (`set echo`); prints every command to stdout |

## Configuration Interactions

- `--nointensity` and `--noaseg` together skip the entire volumetric component (`DoAllSteps=0`); only Step 1 surface registration runs.
- `--step1`, `--step2`, `--step3` are single-step flags for resuming an interrupted run. They do not check that prerequisite outputs from prior steps exist.
- `--keepelreg` preserves the intermediate Step 2 `.tm3d` elastic morph file; useful for debugging registration quality at each stage.
- When `--template` is omitted, `check_params` automatically sets the template. If `--mni` was given (or the template name equals `cvs_avg35_inMNI152`), the MNI-space CVS template is used; otherwise `cvs_avg35` is used and `TEMPLATE_DIR` is set to `$FREESURFER_HOME/subjects/`.
- `--nocleanup` is a composite flag that also sets `keepelreg=1` and `keepallm3z=1`.
- `--cleanall` forces all three steps to recompute even if outputs exist (equivalent to `--cleansurfreg --cleanelreg --cleanvolreg`).

## Typical Use Cases

Register subject to the default CVS template (`cvs_avg35`):
```bash
mri_cvs_register --mov subject001
```

Register to MNI152-space CVS template (`cvs_avg35_inMNI152`):
```bash
mri_cvs_register --mov subject001 --mni
```

Register to a custom template:
```bash
mri_cvs_register --mov subject001 --template mytemplate \
  --templatedir /data/templates
```

Resume from Step 3 only (Steps 1 and 2 already done):
```bash
mri_cvs_register --mov subject001 --step3
```

## Pipeline Context

CVS registration is a post-`recon-all` step for group analysis:

1. Run [[wiki/pipelines/recon-all|recon-all]] for each subject.
2. Optionally run [[mri_cvs_check]] to verify required files.
3. Run `mri_cvs_register` for each subject → template.
4. Apply the output warp to any co-registered volume using `mri_vol2vol --m3z`.

## Gotchas and Caveats

> [!gotcha] Long runtime
> CVS registration is computationally intensive — expect 6–24 hours per subject depending on hardware. Use `--openmp N` to parallelize where possible.

> [!gotcha] Requires curvature files
> Steps 1 requires `?h.inflated.H` and `?h.inflated.K` curvature files. If missing, they are computed automatically using `mris_curvature -w -distances 10 10`. This adds extra runtime.

> [!gotcha] Step resume logic is fragile
> The `--step1`, `--step2`, `--step3` flags each run only that single step. They do not check whether the prerequisite output from previous steps exists. Running `--step3` without Step 2 output will fail.

> [!gotcha] Morph file format gzip issues
> The source notes that `.m3z` (gzip-compressed) files can cause gzip errors on some systems. Use `--m3d` to switch to the uncompressed `.m3d` format if this occurs.

> [!gotcha] Output directory path
> If --outdir is not specified, outputs go to `$SUBJECTS_DIR/$movingid/cvs/`, which is created automatically. Ensure write permissions.


## Known Bugs

Defects from the 2026-10-19 `fem_elastic/` audit that reach this page's workflow, most severe first:

- [[00195]] — severity 4: surf2vol — -aparc medial-wall exclusion is a no-op: FS≥5 annotation-0 vertices match no colour-table index, ripCounter=0, ~33k medial-wall BCs drive every mri_cvs_register elastic stage
- [[00199]] — severity 4: surf2vol — FEM core Element3d caches node-displacement interpolation once and never invalidates it, so untangling edits are ignored for already-queried elements (CVS default path)
- [[00200]] — severity 4: mri_cvs_register/surf2vol — preonly+jacobi applies one diagonal scaling per step; deep WM moved 0.008 of 3 vox in test; CG until 2011-10 (3916ce1fbc); intent a [!gap]
- [[00197]] — severity 3: surf2vol — create_surf_container uses OR where AND is intended: srcPoints=0 on the CVS default path, -use_pial_for_surf never uses pial, -surf_subsample value ignored, UB debug iterator
- [[00201]] — severity 3: surf2vol — -compress delta grid and FEM box hard-coded to 256³: fixed volumes >256 voxels get zeros/invalid GCAM beyond index 255 (default 256³ templates unaffected)
- [[00203]] — severity 3: mri_cvs_register — affine cache transform.txt has no key and is never deleted; reruns, other hemisphere/template or --clean* silently reuse a stale affine
- [[00207]] — severity 3: surf2vol — Element3d stiffness omits the V_e factor (commented out since 2008): K ∝ 1/h² not h; developer intent unknown, CVS parameters were tuned empirically
- [[00213]] — severity 3: applyMorph/morph lib — DeltaTransform3d::invert negates only frame 0 (x); point lists through `field` (surf2vol -compress) morphs get inverted x, forward y,z
- [[00223]] — severity 3: surf2vol/mri_cvs_register — old untangler crop 'bfs' is a DFS with global visited flags; radius-3 patches keep 782–884 of 1007 elements (harness), radius 4 loses 34–44%; CVS default path
- [[00196]] — severity 2: surf2vol — powell_lin tests ripflag on the moving surface (never annotated) instead of the fixed one; latent behind 00195, medial wall would still enter the affine fit
- [[00204]] — severity 2: surf2vol/createMorph — read_transform accepts an 11-number (or non-numeric 12th token) affine file; z translation silently 0
- [[00205]] — severity 2: surf2vol — failed writes, caught exceptions and PETSc option-parse errors all exit 0 (mri_cvs_register cannot detect them); parse() result ignored, compress uninitialised
- [[00208]] — severity 2: surf2vol — new[]/delete mismatch in SmallMatrix::inplace_transpose (per active MFC per FEM step) and ZlibStringCompressor::setBufferSize; UB, benign on glibc, Valgrind-confirmed; dangling m_buffer
- [[00209]] — severity 2: surf2vol / exportGcam / createMorph — leaks: comm_solution overwrites its new[] with VecGetArray, setup_load_sym frees nothing, ZlibStringCompressor has no destructor (peak-memory inflation)
- [[00217]] — severity 2: surf2vol/exportGcam/applyMorph — DeltaTransform3d samples validity mask trilinearly (comment says nearest); 1-voxel boundary rim accepted with damped displacement
- [[00221]] — severity 2: exportGcam — GCAMwrite result ignored (bad extension or unwritable path exits 0, no file); --test + --bbox_threshold aborts (exit 252) after writing; empty bbox gives negative dims
- [[00224]] — severity 2: surf2vol — TMesh::dir_img never reads signalTopology; inverted elements always invalidate points (mask 0 in convert_to_delta), contradicting the header contract; intent open

## Related Tools

- [[mri_cvs_check]] — preflight check
- [[mri_cvs_data_copy]] — archive required files
- [[mris_register]] — Step 1 spherical surface registration
- [[surf2vol]] — Step 2 surface-driven elastic (FEM) registration
- [[exportGcam]] — Step 2 conversion of the elastic `.tm3d` morph to `.m3z`
- [[mri_nl_align]] — Step 3 volumetric nonlinear alignment
- [[mri_concatenate_gcam]] — compose the final warp from Steps 2 and 3

## Confidence and Gaps

Confidence is **high** for the overall pipeline structure and I/O. The Step 2 binary ([[surf2vol]] + [[exportGcam]]) and the Step 3 tools ([[mri_nl_align]], [[mri_concatenate_gcam]], `mri_vol2vol --m3z`) were confirmed against the v8.2.0 script on 2026-10-19; the internals of the elastic stage are documented on the [[surf2vol]] page.
