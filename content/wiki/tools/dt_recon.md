---
title: "dt_recon"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/dt_recon"
families:
  - "dt_*"
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_concat]]"
  - "[[bbregister]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Exact tensor model equations used by mri_glmfit --dti not verified"
tags:
  - diffusion
  - dti
  - pipeline
---

# dt_recon

## Summary

`dt_recon` is a tcsh pipeline script that performs diffusion tensor reconstruction from a raw DWI volume. It runs eddy current / motion correction (via FSL's `eddy_correct`), fits the diffusion tensor using `mri_glmfit --dti`, registers the result to the FreeSurfer subject anatomy via `bbregister`, and optionally resamples FA and other tensor-derived maps to Talairach space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/dt_recon`
- **Requires:** FSL (`eddy_correct`), FreeSurfer subject directory (when using registration)

## Purpose and Context

Diffusion tensor imaging (DTI) yields estimates of fractional anisotropy (FA), mean diffusivity (MD), and principal eigenvectors per voxel. `dt_recon` automates the complete workflow from raw 4D DWI data through eddy correction, tensor fitting, co-registration to structural MRI, and projection to standard space. It serves as a lightweight DTI pipeline analogous to `recon-all` for structural data.

## Inputs

| Input | Description |
|-------|-------------|
| `--i <invol>` | Input 4D DWI volume (any format readable by `mri_convert`) |
| `--b <bvals> <bvecs>` | b-value and b-vector files (text, FSL format) |
| `--s <subject>` | FreeSurfer subject ID (required for registration) |
| `--o <outputdir>` | Output directory |

Optional b-value / b-vector information can alternatively be derived from DICOM header via `--info-dump`.

## Outputs

All outputs are written to `<outputdir>/`. Key files:

| File | Description |
|------|-------------|
| `dwi.nii.gz` | Input DWI converted to NIfTI |
| `dwi-ec.nii.gz` | Eddy-corrected DWI |
| `beta.nii.gz` | GLM fit output (tensor elements) |
| `lowb.nii.gz` | Mean b=0 image |
| `register.lta` | Registration from DWI to structural space |
| `FA.nii.gz`<br>`MD.nii.gz` | Derived scalar maps |
| `dt_recon.log` | Processing log |

## Mathematical Foundations

The diffusion tensor $\mathbf{D}$ is estimated by fitting the Stejskal-Tanner equation:

$$
S_i = S_0 \exp(-b_i \mathbf{g}_i^\top \mathbf{D} \mathbf{g}_i)
$$

where $S_i$ is the signal in the $i$-th diffusion-weighted direction, $b_i$ is the b-value, $\mathbf{g}_i$ is the gradient direction unit vector, and $S_0$ is the non-diffusion-weighted signal. Taking the log linearises the equation:

$$
\ln(S_i / S_0) = -b_i \mathbf{g}_i^\top \mathbf{D} \mathbf{g}_i
$$

This is solved as a general linear model via `mri_glmfit --dti`. The six unique tensor elements ($D_{xx}, D_{yy}, D_{zz}, D_{xy}, D_{xz}, D_{yz}$) are the regression coefficients.

Scalar maps (FA, MD, eigenvalues) are derived from $\mathbf{D}$ via eigendecomposition.

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i <invol>` | volume | required | Input 4D DWI volume |
| `--b <bvals> <bvecs>` | files | required | b-values and b-vectors |
| `--s <subject>`<br>`--subject <subject>` | string | required (with reg) | FreeSurfer subject ID; both forms are equivalent. |
| `--o <outdir>` | string | required | Output directory |
| `--info-dump <dat>` | file | — | DICOM info dump (alternative to `--b`) |
| `--ecref <TP>` | int | 0 | 0-based reference time point for eddy correction |
| `--no-ec` | flag | off | Disable eddy current / motion correction |
| `--no-reg` | flag | off | Skip registration and Talairach resampling |
| `--reg <lta>` | file | — | Provide pre-existing registration instead of running bbregister |
| `--no-tal` | flag | off | Skip Talairach resampling (keep registration) |
| `--bval-thresh <n>` | float | 0 | b-value threshold to identify b=0 frames |
| `--sd <subjectsdir>` | string | $SUBJECTS_DIR | Override SUBJECTS_DIR |
| `--mask <vol>` | volume | — | Brain mask for tensor fitting |
| `--prune_thr <thr>` | float | — | Pruning threshold for `mri_glmfit` |
| `--eres-save` | flag | off | Save residuals from GLM fit |
| `--no-eres-save` | flag | on | Disable saving residuals (default). |
| `--pca` | flag | off | PCA of residuals |
| `--init-fsl` | flag | off | Initialize bbregister with FSL |
| `--init-spm` | flag | off | Initialize bbregister with SPM |
| `--init-coreg` | flag | on | Initialize bbregister with FreeSurfer coreg (default) |
| `--threads <n>` | int | 1 | Number of threads for bbregister |
| `--force` | flag | off | Force reprocessing even if outputs exist |
| `--verbose` | flag | off | Enable verbose output (sets the tcsh `verbose` flag). |
| `--echo` | flag | off | Echo every command before execution (sets the tcsh `echo` flag). |
| `--debug` | flag | off | Enable verbose output and command echo (sets both `--verbose` and `--echo`). |
| `--version` | flag | — | Print script version string and exit. |
| `--help` | flag | — | Print usage summary and extended help text; exit. |

> [!note] Audit noise: `--i` false positive C3
> The source has `case "--i"` at line 323 **without** a trailing colon. The shell extractor only captures `case` statements ending with `:`, so `--i` is missed by the extractor and reported as C3 (in wiki but not in source). The flag is real and confirmed from the source.

> [!note] Noise tokens filtered from C1 audit
> An audit reported 19 flags as missing from this page. All 19 are noise — they do not appear in the `dt_recon` `parse_args` switch statement and are not valid options for this tool:
> - `--12` — not a flag; likely extracted from a bbregister `--12` (12-DOF) call inside the script body (see Gotchas).
> - `--bold`, `--c`, `--mean`, `--min`, `--r`, `--tag`, `--w`, `--y` — not flags; fragments from sub-tool command strings or prose in the help text.
> - `--dti`, `--fsgd`, `--glmdir` — flags for `mri_glmfit`, which is called internally; not `dt_recon` options.
> - `--init-` — truncated token (the real flags `--init-fsl`, `--init-spm`, `--init-coreg` are already documented).
> - `--interp` — a `mri_convert` flag; not a `dt_recon` option.
> - `--lta`, `--mov`, `--surf` — `bbregister` flags; not `dt_recon` options.
> - `--nii.gz` — a file extension, not a flag.
> - `--tal` — not a flag; `--no-tal` is (already documented).

## Configuration Interactions

- `--no-reg` implies `--no-tal`; both registration and Talairach resampling are skipped together.
- `--reg <lta>` bypasses running bbregister but still requires `--s` to extract the subject name (via `reg2subject`).
- `--b` is currently required; DICOM-only mode (`--info-dump` without `--b`) appears partially implemented but the validation at line 513–515 enforces `--b`.
- `--init-fsl`, `--init-spm`, and `--init-coreg` are mutually exclusive bbregister initialisation modes.

> [!gotcha] FSL dependency
> `eddy_correct` must be on the `PATH`. The script calls `which eddy_correct` and exits with an error if not found, even when --no-ec is used during the parameter check. This may be a bug — the check happens regardless of --no-ec.

> [!gotcha] DICOM mode incomplete
> Despite supporting `--info-dump`, the check_params section (line 513) requires `--b bvals bvecs` unconditionally. DICOM-only mode may not work as intended.

## Typical Use Cases

```bash
# Basic DTI reconstruction with registration
dt_recon \
  --i dwi.nii.gz \
  --b bvals.txt bvecs.txt \
  --s my_subject \
  --o dt_recon_output

# Skip eddy correction (data already corrected)
dt_recon \
  --i dwi_corrected.nii.gz \
  --b bvals.txt bvecs.txt \
  --s my_subject \
  --o dt_recon_output \
  --no-ec

# No registration (diffusion-only, no T1)
dt_recon \
  --i dwi.nii.gz \
  --b bvals.txt bvecs.txt \
  --o dt_recon_output \
  --no-reg

# Use pre-existing registration
dt_recon \
  --i dwi.nii.gz \
  --b bvals.txt bvecs.txt \
  --reg existing_register.lta \
  --o dt_recon_output
```

## Pipeline Context

`dt_recon` is a standalone diffusion pipeline, not a stage of `recon-all`. It expects a fully processed FreeSurfer subject directory to exist (completed `recon-all`) when registration is requested. The output can feed downstream tractography tools such as `trac-all`.

## Gotchas and Caveats

- Requires FSL to be installed and sourced before running (for `eddy_correct` and `FSLOUTPUTTYPE`).
- The script forces `FSLOUTPUTTYPE=NIFTI_GZ`; this overrides any existing FSL environment setting.
- Output files use `UpdateNeeded` checks, so re-runs skip steps whose outputs already exist — unless `--force` is given.
- For the `fsaverage` subject, bbregister is automatically called with `--12` (12-DOF linear registration) instead of the default boundary-based registration.

## Related Tools

- [[wiki/tools/mri_glmfit|mri_glmfit]] — underlying GLM/tensor fitting engine
- [[wiki/tools/mri_convert|mri_convert]] — format conversion used at start of pipeline
- [[mri_concat]] — used for averaging b=0 frames
- [[bbregister]] — DWI-to-structural registration

## Confidence and Gaps

**Medium confidence:** pipeline structure and flag behaviour are clear from the script. Tensor fitting details depend on `mri_glmfit --dti` internals.

> [!gap] Tensor GLM design matrix
> The exact construction of the DTI design matrix in `mri_glmfit --dti` (how b-vectors and b-values are assembled into the design) is not verified here. Consult `mri_glmfit` source.

> [!gap] DICOM-only mode
> Whether `--info-dump` without `--b` works in practice is unclear due to the unconditional `--b` requirement in `check_params`.
