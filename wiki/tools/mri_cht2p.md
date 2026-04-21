---
title: "mri_cht2p"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "attic/mri_cht2p/mri_cht2p.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_cluster]]"
  - "[[mri_volcluster]]"
status: draft
confidence: low
last_agent_update: 2026-04-15
gaps:
  - "Attic status — likely not in standard distribution"
  - "Purpose only partially clear from source"
  - "CHT format not documented in available sources"
tags:
  - statistics
  - cluster
  - threshold
  - attic
---

# mri_cht2p

## Summary

`mri_cht2p` is a small utility in the `attic/` directory that reads and writes Cluster Height Table (CHT) files. The CHT format appears to store lookup tables for cluster-size-based statistical threshold correction in volume-based statistical analysis. The tool tests the CHT I/O functionality and a binomial probability calculation.

## Source Information

- **Language:** C++
- **Source file:** `attic/mri_cht2p/mri_cht2p.cpp`

> [!gotcha] Attic and test status
> The `main()` function begins with `exit(1)` after a test binomial probability computation. The actual CHT operations are unreachable in the source as written, suggesting this is a developer test/debug tool, not a production utility.

## Purpose and Context

Cluster-size thresholding in statistical brain imaging corrects for multiple comparisons by computing the probability that a random field would produce a cluster of at least a given size by chance. The CHT (Cluster Height Table) appears to be a precomputed lookup table used by tools such as [[mri_cluster]] to perform this correction.

`mri_cht2p` was likely used to generate or validate these tables, rather than being a user-facing analysis tool.

## Confidence and Gaps

> [!gap] Stub — attic test utility
> The source code is a test harness. This tool is not user-facing and likely not compiled in standard distributions. Documented here only for completeness.

## Related Tools

- [[mri_cluster]] — performs cluster-based threshold analysis on statistical maps
- `mri_volcluster` — volume cluster thresholding
