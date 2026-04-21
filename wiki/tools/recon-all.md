---
title: "recon-all"
type: tool
fs_version: "8.2.0"
source_language: "tcsh"
source_files:
  - "scripts/recon-all"
families:
  - "scripts"
recon_all_stage: null
related:
  - "[[recon-all]]"
  - "[[recon-all-clinical.sh]]"
  - "[[recon-all-exvivo]]"
  - "[[mri_convert]]"
  - "[[mri_em_register]]"
  - "[[mris_make_surfaces]]"
  - "[[freeview]]"
  - "[[freeview-editing]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - pipeline
  - recon-all
  - cortical-reconstruction
---

# recon-all

## Summary

`recon-all` is FreeSurfer's master cortical reconstruction pipeline. Given a T1-weighted MRI volume, it orchestrates approximately 30–40 processing stages to produce a complete cortical surface model, subcortical segmentation, cortical parcellation, and morphometric statistics. The pipeline spans skull stripping, intensity normalization, Talairach registration, white matter segmentation, surface tessellation and deformation, spherical mapping, atlas-based labeling, and morphometric analysis.

> [!internal] Full pipeline documentation
> A full pipeline page exists at [[recon-all]]. This tool page is a brief stub. For stage-by-stage documentation, input/output specifications, and configuration, see the pipeline page.

## Source Information

- **Language:** tcsh (shell script)
- **Source file(s):** `scripts/recon-all`
- **Binary/script location:** `$FREESURFER_HOME/bin/recon-all`

## Purpose and Context

`recon-all` is the entry point for standard single-subject cortical surface analysis. It calls dozens of individual FreeSurfer tools in the correct order, managing dependencies, intermediate files, and error handling. The pipeline is divided into three stages: `autorecon1` (skull stripping and Talairach registration), `autorecon2` (surface generation), and `autorecon3` (parcellation and statistics).

For full documentation, see the [[recon-all]] pipeline page.

## Basic Usage

```bash
# Process a new subject from a DICOM or NIfTI T1 scan
recon-all -i /path/to/T1.nii.gz -s subject_id -all

# Run only autorecon1
recon-all -s subject_id -autorecon1

# Run from autorecon2 onward (after editing)
recon-all -s subject_id -autorecon2 -autorecon3
```

## Related Tools

- [[recon-all]] — full pipeline page (see this for complete documentation)
- [[recon-all-clinical.sh]] — rapid clinical variant using SynthSeg/SynthSR shortcuts
- [[recon-all-exvivo]] — ex vivo tissue reconstruction pipeline
- [[freeview]] — primary GUI for inspecting recon-all outputs and diagnosing surface errors
- [[freeview-editing]] — manual correction of `wm.mgz` and `brainmask.mgz` between autorecon stages

## Confidence and Gaps

See [[recon-all]] pipeline page for full confidence and gap assessment.
