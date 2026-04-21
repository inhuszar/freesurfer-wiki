---
title: "bbregister"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/bbregister"
families:
  - "registration"
recon_all_stage: null
related:
  - "[[mri_coreg]]"
  - "[[mri_segreg]]"
  - "[[tkregister2]]"
  - "[[mri_vol2surf]]"
  - "[[mri_surf2surf]]"
  - "[[coordinate-systems]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "Exact cost function formulation for BBR not fully characterized from script alone — mri_segreg contains the actual implementation"
tags:
  - registration
  - bold
  - fmri
  - dti
  - boundary-based
---

# bbregister

## Summary

`bbregister` performs boundary-based registration (BBR) between a functional or diffusion MRI volume and a FreeSurfer subject's anatomical reconstruction. It uses the contrast gradient at the white-matter / grey-matter boundary to drive a surface-constrained rigid-body registration, producing a high-quality alignment between modalities that exploit the cortical surface rather than volumetric intensity matching alone. The result is written as a FreeSurfer register.dat file and optionally as an LTA or FSL matrix.

## Source Information

- **Language:** tcsh shell script
- **Source file:** `scripts/bbregister`
- **Binary:** `/usr/local/freesurfer/8.2.0/bin/bbregister`
- **Core computation delegated to:** `mri_segreg` (C binary — contains the BBR cost function)
- **Original author:** Doug Greve (MGH)

## Purpose and Context

`bbregister` registers non-T1-weighted volumes (BOLD fMRI, DTI, T2, etc.) to a FreeSurfer subject's reconstructed anatomy. Unlike intensity-based methods that match brain shape globally, BBR exploits the fact that white matter has a distinct and predictable signal relationship to grey matter at the cortical surface boundary. This makes it particularly robust for EPI volumes where distortion and dropout can make volumetric brain matching unreliable.

The tool is a two-pass wrapper:

1. **Pass 1:** Coarse brute-force search followed by a sub-sampled Powell optimization using `mri_segreg`.
2. **Pass 2:** Fine Powell optimization with full sampling using `mri_segreg`.

An initialization step (via `mri_coreg`, FSL FLIRT, SPM, or header information) provides a starting registration before BBR refines it.

## Inputs

| Input | Description | Format |
|-------|-------------|--------|
| Moving volume (`--mov`) | Functional or diffusion volume to register | MGH/NIfTI/DICOM |
| Subject ID (`--s`) | FreeSurfer subject in `SUBJECTS_DIR` | string |
| Contrast flag | `--bold`, `--t2`, `--dti`, or `--t1` | flag |
| Initial registration (`--init-reg`, optional) | Starting registration estimate | `.dat` or `.lta` |

Required environment variable: `SUBJECTS_DIR`.

The subject must have a completed FreeSurfer reconstruction (needs `mri/brainmask.mgz`, `surf/lh.white`, `surf/rh.white`, `label/lh.cortex.label`, `label/rh.cortex.label`).

## Outputs

| Output | Description | Format |
|--------|-------------|--------|
| `--reg <file>` | Registration matrix in FreeSurfer register.dat format | `.dat` |
| `--lta <file>` | Registration in LTA format (optional) | `.lta` |
| `--fslmat <file>` | Registration in FSL 4x4 matrix format (optional) | `.mat` |
| `<reg>.mincost` | Minimum BBR cost value achieved | text |
| `<reg>.param` | Final registration parameters (translation, rotation) | text |

## Mathematical Foundations

BBR minimizes a cost function that measures the similarity of image intensity to the expected signal profile across the white-matter/grey-matter boundary:

$$C(\mathbf{T}) = \frac{1}{N} \sum_{i=1}^{N} \rho\!\left( \text{sgn}(c) \cdot \frac{I_{\text{WM},i}(\mathbf{T}) - I_{\text{GM},i}(\mathbf{T})}{\sigma} \right)$$

where $\mathbf{T}$ is the 6-DOF rigid-body transform, $I_{\text{WM},i}$ and $I_{\text{GM},i}$ are intensities sampled on the white-matter and grey-matter sides of each surface vertex $i$, $c$ is the contrast sign (+1 for T2/BOLD/DTI, -1 for T1), and $\rho$ is a robust penalty function. $N$ is the number of surface vertices sampled. Optimization is performed with Powell's method.

> [!math] Surface sampling
> WM side is sampled by projecting 2 mm inward from the white surface (`--wm-proj-abs 2`). GM side is sampled at a fractional distance of 0.5 along the surface normal toward the pial surface (`--gm-proj-frac 0.5`), or at an absolute offset (`--gm-proj-abs`).

## Configuration Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--s <subject>` | string | required | FreeSurfer subject ID |
| `--mov <vol>` | file | required | Moving (functional/diffusion) volume |
| `--reg <file>` | file | required* | Output register.dat file |
| `--lta <file>` | file | — | Output LTA format registration |
| `--fslmat <file>` | file | — | Output FSL matrix |
| `--bold` / `--t2` / `--dti` | flag | required | Set contrast: positive (WM brighter than GM) |
| `--t1` | flag | — | Set contrast: negative (WM darker than GM) |
| `--init-coreg` | flag | on | Initialize with `mri_coreg` (default) |
| `--init-fsl` | flag | off | Initialize with FSL FLIRT |
| `--init-spm` | flag | off | Initialize with SPM |
| `--init-rr` | flag | off | Initialize with `mri_robust_register` |
| `--init-header` | flag | off | Initialize from volume headers (DICOM tags) |
| `--init-reg <file>` | file | — | Use a pre-computed registration as initialization |
| `--init-best` | flag | off | Try all init methods, use the one with lowest BBR cost |
| `--frame <n>` | int | all | Register a specific frame of a 4D volume |
| `--mid-frame` | flag | off | Use middle frame of 4D volume |
| `--6` | flag | on | 6 DOF (rigid body, default) |
| `--9` | flag | off | 9 DOF (rigid + scale) |
| `--12` | flag | off | 12 DOF (full affine) |
| `--gm-proj-frac <f>` | float | 0.5 | GM sampling fraction along surface normal |
| `--gm-proj-abs <mm>` | float | — | GM sampling absolute distance (overrides frac) |
| `--wm-proj-abs <mm>` | float | 2.0 | WM sampling distance from white surface |
| `--vsm <file>` | file | — | Voxel-shift map for EPI B0 distortion correction |
| `--vsm-pedir <n>` | int | 2 | Phase-encode direction (1=x, 2=y, 3=z) for VSM |
| `--surf <name>` | string | white | Surface to use as WM/GM boundary |
| `--fsvol <name>` | string | brainmask | FreeSurfer reference volume |
| `--lh-only` | flag | off | Restrict to left hemisphere |
| `--rh-only` | flag | off | Restrict to right hemisphere |
| `--label <file>` | file | — | Restrict registration to a label file |
| `--no-cortex-label` | flag | off | Do not restrict to cortex label |
| `--interp trilinear` | string | trilinear | Interpolation method |
| `--interp nearest` | string | — | Nearest-neighbor interpolation |
| `--tol <val>` | float | 1e-8 | Powell convergence tolerance |
| `--nmax <n>` | int | 36 | Maximum Powell iterations |
| `--cost-fail <thresh>` | float | — | Error if final cost exceeds threshold |
| `--rms <file>` | file | — | Write RMS difference from initial registration |
| `--o <vol>` | file | — | Write registered moving volume |
| `--template-out <vol>` | file | — | Write template (extracted frame) to file |
| `--sd <dir>` | dir | `$SUBJECTS_DIR` | Override subjects directory |
| `--feat <dir>` | dir | — | FSL FEAT directory shortcut |
| `--threads <n>` | int | 1 | Number of OMP threads |
| `--nocleanup` | flag | off | Do not remove temporary directory |
| `--debug` | flag | off | Verbose/debug output |
| `--nolog` | flag | off | Suppress log file creation |

## Configuration Interactions

- **Contrast flag is mandatory:** `--bold`, `--t2`, `--dti`, or `--t1` must be specified. `--bold`, `--t2`, and `--dti` all set the same positive contrast sign (+1). `--t1` sets negative contrast.
- **Initialization is mandatory (exactly one method):** One of `--init-coreg`, `--init-fsl`, `--init-spm`, `--init-rr`, `--init-header`, or `--init-reg` must be given. `--init-best` is mutually exclusive with explicit init flags.
- **`--reg` and `--lta` interact:** If `--reg` is given but the filename ends in `.lta`, bbregister automatically redirects to `--lta` mode and uses a `.dat` internally. Specifying `--lta` always produces an LTA; `--reg` produces register.dat.
- **`--frame` and `--mid-frame` are mutually exclusive.**
- **`--gm-proj-frac` and `--gm-proj-abs` are mutually exclusive.**
- **`--vsm` activates EPI masking** (`--epi-mask` is turned on automatically when `--vsm` is used).
- **`--6`, `--9`, `--12`** set DOF for both the init (via `--coreg-dof`) and the BBR optimization (via `--dof`). The default is 6 (rigid body).
- **`--lh-only` / `--rh-only`** restrict to one hemisphere's white surface, useful when one hemisphere has poor reconstruction quality.
- **`--init-best` with single method** causes an error — must specify at least two methods.

## Typical Use Cases

```bash
# Register a BOLD EPI to a FreeSurfer subject (default init: mri_coreg)
bbregister --s subject01 \
           --mov bold_example_func.nii.gz \
           --reg bold2anat.dat \
           --bold

# Register DTI FA map, use FSL FLIRT for initialization, output LTA
bbregister --s subject01 \
           --mov dti_FA.nii.gz \
           --lta dti2anat.lta \
           --dti \
           --init-fsl

# Register BOLD with B0 distortion correction (voxel-shift map)
bbregister --s subject01 \
           --mov bold.nii.gz \
           --reg bold2anat.dat \
           --bold \
           --vsm fieldmap_vsm.nii.gz \
           --vsm-pedir 2

# Try all initialization methods and use the best result
bbregister --s subject01 \
           --mov bold.nii.gz \
           --reg bold2anat.dat \
           --bold \
           --init-best
```

To inspect registration results:
```bash
tkregisterfv --mov bold.nii.gz --reg bold2anat.dat --surfs --sd $SUBJECTS_DIR
```

## Pipeline Context

`bbregister` is not called directly by `recon-all` (which operates on T1 data). It is used in downstream analyses:

- **fMRI analysis:** Registers BOLD EPIs to the anatomical surface for surface-based analysis with `mri_vol2surf`.
- **DTI/dMRI:** Registers diffusion volumes to the anatomical space before surface projection.
- **FSL FEAT integration:** `--feat` flag automatically sets paths for FEAT analysis directories.
- **dt_recon pipeline:** `dt_recon` calls `bbregister` internally to register the FA map to the anatomical.

Typical pipeline position:
```
recon-all (anatomy) --> bbregister --> mri_vol2surf / mri_label2vol
```

## Gotchas and Caveats

> [!gotcha] Contrast flag is not optional
> Users frequently omit the contrast flag (`--bold`, `--t2`, `--t1`). The script will exit with "you must specify a contrast" in this case. `--bold`, `--t2`, and `--dti` are all equivalent (they all set positive contrast, where WM appears brighter than GM).

> [!gotcha] Output file extension determines format
> If `--reg` is given a filename ending in `.lta`, bbregister silently switches to LTA output mode. Users expecting a `.dat` file will find one under `<name>.dat` and an LTA at `<name>.lta`. This is handled in the `check_params` section of the script.

> [!gotcha] mri_coreg is default initialization (not FSL)
> The default initialization method in recent FreeSurfer versions is `mri_coreg`, not FSL FLIRT (though FSL was historically the default in older versions). Ensure `mri_coreg` is available or specify an alternative init method.

> [!gotcha] BBR_TEST_TOLERANCE environment variable
> If `$BBR_TEST_TOLERANCE` is set in the environment, it overrides convergence tolerances. This is intended for automated testing only and will produce unreliable registrations if set inadvertently.

> [!gotcha] Only .mgz/.mgh formats preserve transform names
> When using `--o` to save the registered volume, only `.mgz` and `.mgh` formats store the transform name in the header. The code enforces this restriction.

> [!gotcha] Visual inspection is essential
> A low BBR cost does not guarantee a correct registration. Gross misregistrations (e.g., left-right flips, wrong subject) can produce deceptively acceptable-looking cost values. Always verify with `tkregisterfv`.

## Related Tools

- [[mri_coreg]] — volumetric registration used for initialization
- [[mri_segreg]] — the C binary that implements the BBR cost function and optimization
- [[mri_vol2surf]] — projects volume data onto the surface using the bbregister output
- [[mri_label2vol]] — maps surface labels back to volume space
- [[tkregister2]] — GUI for inspecting and editing registrations
- [[dt_recon]] — diffusion tensor pipeline that calls bbregister internally
- [[coordinate-systems]] — understanding the register.dat transform convention

## Confidence and Gaps

The script logic is well-documented and the key parameters are clearly enumerated. Confidence is high for flags and workflow. The BBR cost function implementation lives in `mri_segreg` (C source), which is not fully analyzed here.

> [!gap] BBR cost function details
> The exact mathematical form of $\rho$ (the robust penalty in the BBR cost) and how sampling density is controlled in `mri_segreg` have not been fully inspected. The script passes parameters like `--slope1`, `--slope2`, `--offset2` to `mri_segreg` whose exact effect on the cost function requires reading `mri_segreg` source.

> [!gap] VSM registration space
> The exact coordinate space relationship between the VSM and the moving volume (controlled by `--vsm-reg`) is not fully characterized from the script alone.
