---
title: "mri_build_priors"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_build_priors/mri_build_priors.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_ca_train]]"
  - "[[mri_ca_label]]"
  - "[[mri_classify]]"
  - "[[mgz]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Attic status — availability uncertain"
  - "Algorithm and purpose only partially inferred from filename and source"
tags:
  - atlas
  - priors
  - classification
  - attic
---

# mri_build_priors

## Summary

`mri_build_priors` is a tool in the `attic/` directory that builds spatial prior probability maps for tissue classification. It is associated with the earlier MRI classification framework (`mriclass.h`, `classify.h`) that preceded the GCA (Gaussian Classifier Atlas) approach. These priors were used by [[mri_classify]] to bias voxel-level tissue classification with spatial location information.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_build_priors/mri_build_priors.cpp`
- **Original author:** Bruce Fischl (inferred from copyright)

> [!gotcha] Attic status
> This tool is in `attic/` and is almost certainly not compiled or distributed in standard FreeSurfer 8.2.0.

## Purpose and Context

In early FreeSurfer classification pipelines, spatial priors encoded the probability of each tissue class (WM, GM, CSF, etc.) at each atlas-space voxel. `mri_build_priors` presumably accumulated these priors from a training set of manually labeled volumes by computing, at each location, the empirical frequency of each class label.

The GCA framework (used since FreeSurfer v3) superseded this approach with a joint intensity-location probabilistic model. This tool is now only relevant for understanding legacy FreeSurfer pipeline history.

## Confidence and Gaps

> [!gap] Insufficient information — stub page
> This is a minimal stub. The tool is attic status and not relevant to current FreeSurfer 8.2.0 pipelines.

## Related Tools

- [[mri_ca_train]] — the current atlas training tool (GCA framework)
- [[mri_classify]] — the legacy classifier that used these priors
