---
title: "mri_defacer"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_deface/mri_defacer.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_deface]]"
  - "[[mri_coreg]]"
  - "[[mgz]]"
status: draft
confidence: medium
last_agent_update: 2026-04-21
gaps:
  - "Template surface and label files required are not documented (mideface library)"
  - "MIDEFACE library internals not characterized"
  - "--gdiag flag appears in print_usage() but has no corresponding parse_commandline() handler; may be handled by a global FreeSurfer mechanism"
tags:
  - defacing
  - de-identification
  - privacy
  - surface-based
---

# mri_defacer

## Summary

`mri_defacer` is a newer FreeSurfer tool for removing facial features from MRI volumes. It uses a surface-based approach via the `mideface` library, working with a template surface registered to the input, label files defining the facial region, and distance-based masking to zero out facial voxels while preserving the brain. It optionally embeds a watermark in the defaced volume for data provenance tracking.

## Source Information

- **Language:** C++
- **Source file:** `mri_deface/mri_defacer.cpp`
- **Original author:** Douglas N. Greve
- **Dependencies:** `mideface.h` library

## Purpose and Context

Unlike the atlas-based [[mri_deface]] which requires two GCA files, `mri_defacer` uses a parameterized surface mesh registered to the input volume to define the face region. This gives finer control over what is removed, can handle a wider variety of head shapes, and avoids dependence on volumetric atlas registration quality.

The tool also supports optional watermarking — embedding a visible or invisible pattern into the defaced volume to indicate it has been processed and to record provenance.

## Inputs

Required (inferred from global variable declarations):
- **`--i involpath`**: input volume to deface
- **`--hm headmaskpath`**: head mask volume
- **`--ts tempsurfpath`**: template surface registered to the input
- **`--reg regpath`**: registration between template and input space
- **`--tl templabelpathlist...`**: one or more template label files defining the facial region
- **`--o outvolpath`**: output defaced volume

Optional:
- **`--m facesegpath`**: output face segmentation
- **`--min minsurfpath`** / **`--max maxsurfpath`**: output min/max surfaces
- **`--distdat distdatpath`**, **`--distbounds distboundspath`**: distance-related outputs
- **`--distoverlay distoverlaypath`**: surface overlay of distances
- **`--stats statspath`**: statistics output
- **`--w watermarkpath d`**: path to watermark label file and watermark intensity (float, default 1); both arguments are required
- **`--xmask xmaskpath`**: exclude voxels inside this mask from defacing

## Outputs

- **`outvolpath`**: defaced volume with facial voxels zeroed out
- Optional: face segmentation, surface files, distance data, stats

## Mathematical Foundations

The approach is based on the `mideface` (Minimally Invasive Defacing) library:
1. A template surface mesh is registered to the input volume (using --reg).
2. Label files define facial regions on the template surface.
3. For each input voxel, its distance from the face surface is computed.
4. Voxels within the face region that are below a distance threshold are zeroed out.

The `MRISpaintSphere()` function (defined in this file but unused in the binary) provides a utility for painting image content onto a spherical surface using phi/theta coordinates — likely used for the watermark.

## Configuration Options

| Flag | Arguments | Default | Description |
|------|-----------|---------|-------------|
| `--i` | `<vol>` | required | Input volume to deface |
| `--hm` | `<vol>` | required | Head mask volume |
| `--ts` | `<surf>` | required | Template surface registered to the input |
| `--l` | `<label> [DistInMin [DistInMax]]` | required (repeatable) | Template label file defining the facial region; optional per-label distance bounds |
| `--o` | `<vol>` | required | Output defaced volume |
| `--reg` | `<lta>` | none | Apply LTA registration to the template surface before defacing |
| `--m` | `<vol>` | none | Output face segmentation mask volume |
| `--min` | `<surf>` | none | Output minimum-distance surface |
| `--max` | `<surf>` | none | Output maximum-distance surface |
| `--w` | `<label> <d>` | none | Watermark label file and intensity factor `d` (float, default 1); raises the template surface in the watermark region |
| `--xmask` | `<vol>` | none | Exclude voxels inside this mask from defacing |
| `--ots` | `<surf>` | none | Output template surface after any watermark and/or ripple modifications |
| `--fill-const` | `<ConstIn> <ConstOut>` | off | Fill face region with constant values instead of zero; sets FillType=2 |
| `--dist-in-frac` | `<f>` | atlas default | Inward distance fraction for defacing bounds |
| `--dist-in-min` | `<mm>` | 2 | Global minimum inward distance (mm) |
| `--dist-in-max` | `<mm>` | 20 | Global maximum inward distance (mm) |
| `--dist-out-frac` | `<f>` | atlas default | Outward distance fraction for defacing bounds |
| `--dist-out-min` | `<mm>` | atlas default | Minimum outward distance (mm) |
| `--dist-out-max` | `<mm>` | atlas default | Maximum outward distance (mm) |
| `--distbounds` | `<file>` | none | Write per-label distance bounds to a text file |
| `--distdat` | `<file>` | none | Write per-vertex distance data to a text file |
| `--distoverlay` | `<vol>` | none | Save surface overlay of per-vertex distances |
| `--stats` | `<file>` | none | Write face intensity statistics to a text file |
| `--nperbin` | `<n>` | atlas default | Number of samples per histogram bin (for mode finding in float images) |
| `--nbinsmax` | `<n>` | atlas default | Maximum number of histogram bins |
| `--statframe` | `<frame>` | 0 | 0-based frame index used when computing intensity statistics |
| `--ripple` | `<amp> <period>` | off | Apply ripple distortion to the template surface (amplitude and period) |
| `--no-ripple` | (none) | off | Disable ripple distortion |
| `--ripple-center` | `<R> <A> <S>` | (0,0,0) | Set the centre point (RAS) for the ripple distortion |
| `--apply` | `<vol> <facemask> <reg|regheader> <out>` | — | Stand-alone mode: apply an existing face mask to another volume; use `regheader` if no registration file is needed |
| `--apply-ripple` | `<surf> <axis> <amp> <period> <label> <outsurf>` | — | Stand-alone mode: apply ripple to a surface and save; axis is 1 or 2 |
| `--check-code` | `<vol> [<outfile>]` | — | Stand-alone mode: check whether a mideface provenance code is embedded in the volume; prints 0 or 1 and optionally writes to `<outfile>` |
| `--gdiag` | `<diagno>` | 0 | Set FreeSurfer diagnostic level |
| `--debug` | (none) | off | Enable debug output |
| `--checkopts` | (none) | off | Check options and exit without processing |
| `--nocheckopts` | (none) | off | Do not exit after checking options |

## Configuration Interactions

> [!gap] Interactions not confirmed
> Configuration interactions depend on the full `parse_commandline()` and `check_options()` functions.

## Typical Use Cases

> [!gap] Usage examples not available
> The exact command-line syntax needs to be confirmed by running `mri_defacer --help`.

## Pipeline Context

Not called by [[recon-all]]. Applied to raw MRI before or after reconstruction as a de-identification step.

## Gotchas and Caveats

> [!gotcha] Requires mideface template files
> The template surface and labels required by `--ts` and `--tl` must come from a specific mideface template distributed with FreeSurfer. Locations not documented here.

> [!gotcha] Newer tool with less documentation
> `mri_defacer` is more recent than [[mri_deface]] and may have less community documentation. The mideface library is an ongoing development.

## Related Tools

- [[mri_deface]] — older GCA-based defacing tool
- [[mri_coreg]] — registration step that may be needed for `--reg`

## Confidence and Gaps

Confidence is **medium**. The complete `parse_commandline()` function has been read and all flags confirmed from source. The mideface library internals and the exact template file locations remain undocumented.

> [!gap] mideface library
> The `mideface.h` library is a FreeSurfer-internal component. Its full API and the template files it requires are not documented in this wiki.
