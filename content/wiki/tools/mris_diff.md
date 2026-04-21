---
title: "mris_diff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_diff/mris_diff.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[surface-format]]"
  - "[[mri_seg_diff]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: high
last_agent_update: 2026-04-21
gaps:
  - "Behaviour of --renumbered flag is not fully detailed in source comments."
tags:
  - surface
  - comparison
  - quality-control
  - regression-testing
---

# mris_diff

## Summary

`mris_diff` compares two surfaces or surface-associated files (curvature files, annotation files) and reports whether they differ. It is the surface-domain analogue of `diff` for FreeSurfer files, widely used in regression testing and QA pipelines. The tool checks vertex coordinates, face normals, neighbour topology, curvature values, and parcellation annotations, returning exit code 0 if the files are identical and non-zero if they differ.

## Source Information

- **Language:** C++
- **Source file:** `mris_diff/mris_diff.cpp`
- **Authors:** Doug Greve, Bevin R Brett

## Purpose and Context

`mris_diff` is primarily a quality-control and testing tool. It is used to:
1. Verify that a software change does not alter surface outputs (regression testing).
2. Compare surfaces from two subjects or two processing runs.
3. Detect differences in curvature overlays or cortical parcellations between subjects or runs.

## Inputs

- Two surface files passed directly, or specified via `--s1`/`--s2` + `--hemi` + `--surf`.
- Optionally a curvature file pair (`--curv`) or annotation file pair (`--annot`).
- Optional: `--worst-bucket` file and `--okayBucketMax` for bucket-based tolerance comparisons.
- Optional: `--grid` specification for regular grid comparison.

## Outputs

- **stdout:** Human-readable report of differences (vertex counts, coordinate mismatches, etc.).
- **Exit code:** 0 = identical, non-zero = differs.
- **Optional RMS files:** `--xyz-rms` and `--angle-rms` write numeric RMS differences to files.

## Mathematical Foundations

For XYZ comparisons the tool computes per-vertex differences:

$$
\Delta v_i = \|v_i^{(1)} - v_i^{(2)}\|_2
$$

and reports the maximum and RMS over all vertices. For normal vectors:

$$
\Delta n_i = \arccos\left(\hat{n}_i^{(1)} \cdot \hat{n}_i^{(2)}\right)
$$

When `--ndist` is active, a normal-distance metric is reported.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--s1` | `<subject>` | — | Subject 1 name (uses `SUBJECTS_DIR`) |
| `--s2` | `<subject>` | — | Subject 2 name |
| `--sd1` | `<dir>` | `SUBJECTS_DIR` | Subjects directory for subject 1 |
| `--sd2` | `<dir>` | `SUBJECTS_DIR` | Subjects directory for subject 2 |
| `--hemi` | `lh\|rh` | — | Hemisphere |
| `--surf` | `<surfname>` | — | Surface name (e.g., `white`) |
| `--curv` | `<curvname>` | — | Compare curvature files |
| `--aparc` | `<annotname>` | — | Compare annotation (parcellation) files |
| `--aparc2` | `<annotname>` | — | Second annotation name for comparison |
| `--no-check-xyz` | — | XYZ checked | Skip vertex coordinate comparison |
| `--no-check-nxyz` | — | normals checked | Skip normal vector comparison |
| `--xyz-rms` | `<file>` | — | Write XYZ RMS difference to file |
| `--angle-rms` | `<file>` | — | Write angle RMS difference to file |
| `--ndist` | — | off | Compute normal distance metric |
| `--min-dist` | `surf1 surf2 exactflag mindist` | — | Compute and save vertex-by-vertex RMS distance |
| `--simple` | `surf1 surf2 [rmsdiff.mgz]` | — | Just report whether surfaces differ (fast mode) |
| `--si` | `surf1 surf2 [rmsdiff.mgz]` | — | Alias for `--simple` |
| `--simple-patch` | `surf patch1 patch2` | — | Report whether patches differ |
| `--thresh` | `<N>` | 0 | Threshold (note: not currently implemented) |
| `--maxerrs` | `<N>` | default | Stop after N errors |
| `--worst-bucket` | `<file>` | — | Write worst-case bucket analysis to file |
| `--okayBucketMax` | `<int>` | 1 | Maximum allowed bucket count |
| `--grid` | `[xyz] <spacing> <file>` | — | Compare on a regular grid |
| `--scanner-ras` | — | off | Convert surfaces to scanner RAS before comparison |
| `--renumbered` | — | off | Handle renumbered vertices |
| `--gdiag_no` | `<int>` | — | Set Gdiag_no diagnostic number |
| `--seed` | `<int>` | — | Set random seed (for degenerate normals) |
| `--debug` | — | off | Enable debug output |
| `--annot` | — | — | (Help text only) Mentioned in usage example as a synonym for `--aparc`; not implemented as a separate flag in the parser — use `--aparc` instead |
| `--log` | `<file>` | — | (Planned, not yet implemented) Would write output to a log file; listed as a TODO item in source |
| `--test-aparc` | `<vtxno> <val>` | — | (Planned, not yet implemented) Would test annotation value at a vertex; listed as a TODO item in source |
| `--test-curv` | `<vtxno> <val>` | — | (Planned, not yet implemented) Would test curvature value at a vertex; listed as a TODO item in source |
| `--test-surf-face` | `<faceno> <val> <field>` | — | (Planned, not yet implemented) Would test a face field value; listed as a TODO item in source |
| `--test-surf-vtx` | `<vtxno> <val> <field>` | — | (Planned, not yet implemented) Would test a vertex field value; listed as a TODO item in source |

## Configuration Interactions

- `--s1`/`--s2`/`--hemi`/`--surf` are alternatives to passing surface paths directly. Mixing both modes is not recommended.
- `--curv` and `--aparc` are mutually exclusive surface data comparisons; only one should be specified per invocation.
- `--worst-bucket` and `--okayBucketMax` work together: the bucket file records distribution of differences; `--okayBucketMax` sets the threshold for pass/fail.
- `--scanner-ras` changes the coordinate frame for XYZ comparisons and is relevant when surfaces from different scan sessions are being compared.
- `--simple` and its alias `--si` take surface paths as arguments directly and exit immediately, bypassing the full comparison workflow.

## Typical Use Cases

```bash
# Compare two white surfaces directly
mris_diff lh.white.run1 lh.white.run2

# Compare white surfaces between two subjects
mris_diff --s1 subj001 --s2 subj002 --hemi lh --surf white

# Compare curvature files
mris_diff --s1 subj001 --s2 subj002 --hemi lh --curv curv

# Compare annotation (parcellation) files
mris_diff --s1 subj001 --s2 subj002 --hemi lh --aparc aparc

# Write RMS differences to files
mris_diff --xyz-rms /tmp/xyz_rms.txt --angle-rms /tmp/ang_rms.txt lh.white.v1 lh.white.v2

# Fast check (just report whether surfaces differ)
mris_diff --simple lh.white.v1 lh.white.v2
```

## Pipeline Context

`mris_diff` is not called by `recon-all`. It is used in:
- FreeSurfer regression test suites to detect regressions between software versions.
- QA workflows comparing reprocessed subjects.

Related tools in the pipeline that produce surfaces: [[mris_smooth]], [[mris_inflate]], [[mris_register]].

## Gotchas and Caveats

> [!gotcha] Exit code semantics
> The tool exits with a non-zero code if any difference is found. In shell scripts, test with `if mris_diff ...; then echo same; fi`.

> [!gotcha] tkRAS vs scanner RAS
> By default, comparisons use tkregister (surface) RAS. When comparing surfaces from different scanners, use `--scanner-ras` to avoid spurious differences from different FOV centres.

> [!gap] Renumbered vertices
> The `--renumbered` flag is parsed but its implementation details are not fully documented in the source comments.

## Related Tools

- [[mri_seg_diff]] — analogous tool for segmentation volume differences
- [[surface-format]] — FreeSurfer surface file format
- [[mris_anatomical_stats]] — generates surface morphometric statistics

## Confidence and Gaps

**Confident (from source):** All flag descriptions, surface/curvature/annotation comparison modes, exit code semantics, RMS output files.

**Uncertain:** Exact behaviour of `--renumbered`; grid comparison mode details.

> [!gap] Unimplemented flags
> The source lists `--test-surf-vtx`, `--test-surf-face`, `--test-aparc`, `--test-curv`, and `--log` as TODO items in a developer comment at the top of the file. These flags are not handled in `parse_commandline()` in version 8.2.0 and will cause an "Option unknown" error if passed. The `--annot` flag appears only in a help-text usage example as a synonym for `--aparc`; the actual parser uses `--aparc`.
