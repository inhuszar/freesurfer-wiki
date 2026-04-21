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
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Step 2 elastic registration uses a C binary (not fully identified in source snippet); likely mri_nl_align or fem_elastic"
  - "Step 3 volumetric nonlinear alignment details not confirmed"
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
Uses the resampled surfaces to constrain a volumetric elastic registration. The moving brain's `norm.mgz` and `aseg.mgz` are morphed toward the template, with the resampled surfaces providing soft constraints on the cortical boundary location.

> [!gap] Step 2 binary not confirmed
> The elastic registration in Step 2 calls a sub-script (`CVS_step2.csh` logic embedded inline). The specific binary used (likely `mri_nl_align` with specific parameters or a finite-element elastic solver) was not confirmed from the source excerpt.

**Step 3 — Nonlinear volumetric alignment:**
Refines the elastic registration result by running a volumetric nonlinear alignment (likely `mri_nl_align` or `mri_vol2vol --morph`) using both the intensity (`norm.mgz`) and segmentation (`aseg.mgz`) information. The elastic and volumetric morphs are then combined via [[mri_concatenate_gcam]] into a single composite warp.

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
| `--nolog` / `--no-log` | — | off | Suppress log file creation |
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

1. Run [[recon-all]] for each subject.
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

## Related Tools

- [[mri_cvs_check]] — preflight check
- [[mri_cvs_data_copy]] — archive required files
- [[mris_register]] — Step 1 spherical surface registration
- [[mri_concatenate_gcam]] — compose the final warp from Steps 2 and 3

## Confidence and Gaps

Confidence is **high** for the overall pipeline structure and I/O. Lower for Step 2 internal binary details.

> [!gap] Step 2 elastic registration binary
> The specific binary called for elastic registration in Step 2 was not confirmed from the source excerpt. The complete CVS Step 2 logic may involve `mri_nl_align`, a finite element elastic solver, or another tool.
