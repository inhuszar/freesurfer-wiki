---
title: "FreeSurfer FAQ — index"
type: faq
fs_version: "8.2.0"
entry_count: 0
last_agent_update: 2026-06-11
sources:
  - mailing-list
  - dialogue
tags:
  - faq
  - index
  - community-knowledge
---

# FreeSurfer FAQ — index

This is the landing page for the FreeSurfer Documentation Project's FAQ
collection. Each topic page gathers provenance-tracked questions and answers
synthesised from the FreeSurfer mailing-list archives and from agent dialogue
(see `schema/faq-and-learning.md`). Answers cite the wiki pages and source code
they are derived from.

> [!note] FAQ links are always path-qualified
> Every FAQ basename collides with a tool, pipeline, or concept page of the
> same name, so reference an FAQ page as `[[wiki/faq/<topic>|… FAQ]]`, never as
> a bare `[[<topic>]]`.

## Topics

### Pipelines & whole-brain processing
- [[wiki/faq/recon-all|recon-all FAQ]] — the main cortical reconstruction pipeline
- [[wiki/faq/recon-all-clinical|recon-all-clinical FAQ]] — clinical / low-field / non-T1 reconstruction
- [[wiki/faq/longitudinal|longitudinal FAQ]] — the two-stage longitudinal stream

### Registration, conversion & coordinates
- [[wiki/faq/mri_convert|mri_convert FAQ]] — conversion, conforming, resampling
- [[wiki/faq/mri_vol2vol-and-vol2surf|vol2vol / vol2surf FAQ]] — moving data between volumes and surfaces
- [[wiki/faq/registration-and-lta|registration & LTA FAQ]] — transforms, `.lta`, `register.dat`

### Segmentation
- [[wiki/faq/samseg|SAMSEG FAQ]] — Bayesian whole-brain / lesion segmentation
- [[wiki/faq/subregion-segmentation|subregion segmentation FAQ]] — hippocampus, thalamus, brainstem, hypothalamus
- [[wiki/faq/synthseg-and-synthsr|SynthSeg / SynthSR FAQ]] — contrast-agnostic deep-learning tools

### Deep-learning registration & PET
- [[wiki/faq/synthmorph|SynthMorph FAQ]] — learning-based registration
- [[wiki/faq/petsurfer|PETSurfer FAQ]] — PET partial-volume correction & analysis

### Morphometry & statistics
- [[wiki/faq/surface-morphometry|surface morphometry FAQ]] — thickness, area, curvature
- [[wiki/faq/mri_glmfit|mri_glmfit FAQ]] — the general linear model

### Diffusion
- [[wiki/faq/tracula-and-dmri|TRACULA / dMRI FAQ]] — diffusion tractography

### Tools & environment
- [[wiki/faq/freeview|FreeView FAQ]] — the visualisation GUI
- [[wiki/faq/installation-and-platform|installation & platform FAQ]] — install, MCR, OS issues

## Contributing

Substantive Q&A discovered through Claude Code is archived to `raw/dialogue/`
and folded into these pages during FAQ synthesis. See `schema/faq-and-learning.md`.
