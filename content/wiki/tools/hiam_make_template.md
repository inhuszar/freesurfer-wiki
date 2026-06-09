---
title: "hiam_make_template"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "hiam_make_template/hiam_make_template.cpp"
families:
  - "hiam_*"
recon_all_stage: null
related:
  - "[[mris_make_template]]"
  - "[[hiam_register]]"
  - "[[hiam_make_surfaces]]"
  - "[[mrisp-tif]]"
  - "[[surface-representations]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Provenance of the per-subject inputs (hippocampus.sphere, hippocampus.curv) is not produced by any script in this tree; the upstream hippocampal-surface pipeline that creates them is undocumented here."
  - "The `if (1 || ...)` guard means the template-update branch (reading an existing template) is dead code; behaviour when extending an existing template is therefore untested from this source."
tags:
  - surface
  - hippocampus
  - amygdala
  - template
  - registration
  - spherical-parameterization
---

# hiam_make_template

## Summary

`hiam_make_template` builds an **average spherical-coordinate template** of a hippocampal (or amygdala) surface from a set of subjects. For each subject it reads a spherical surface and a curvature ("hippocampus.curv") map, projects the curvature into spherical parameter space, and accumulates the mean / variance / degrees-of-freedom across subjects into a parameterized template ([[mrisp-tif|MRI_SP]]). Unless disabled, it performs a rigid (rotational) alignment of every subject to a first-pass average before re-accumulating, so the final template is rotation-normalised. The output is a single `.tif`-style parameterization file that [[hiam_register]] later uses as the registration target. It is the hippocampus-and-amygdala ("hiam") fork of [[mris_make_template]].

## Source Information

- **Language:** C++
- **Source file:** [`hiam_make_template/hiam_make_template.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp)
- **Original author:** Bruce Fischl (header notes it is "a modified version of mris_make_template.c … applied on hippocampus and amygdala").
- **Binary/script location:** `$FREESURFER_HOME/bin/hiam_make_template`
- **Key library routines:** [`MRISPalloc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L102), [`MRIStoParameterization`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L168), [`MRISPcombine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L169), [`MRISrigidBodyAlignGlobal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L235), and [`MRISPwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L294) (all in `libutils`/`mrisurf`).

## Purpose and Context

Surface-based registration in FreeSurfer aligns an individual's folding pattern to a **template** expressed in spherical coordinates. For the cortex this template is built by [[mris_make_template]] from `fsaverage`-style training subjects. `hiam_make_template` is the analogue for the **hippocampus and amygdala**: it constructs the spherical-parameterization template that the hippocampal surface registration ([[hiam_register]]) registers against.

Each "image" in the parameterization carries the per-vertex curvature statistic; the template stores three frames per surface — **mean**, **variance**, and **dof** ([`hiam_make_template.cpp:53-55`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L53-L55)). Because only a single surface ("hippocampus") with a precomputed curvature ("hippocampus.curv") is configured ([`:50-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L50-L51)), the template has exactly 3 parameter frames.

This is a stand-alone research command; it is **not** invoked by [[wiki/pipelines/recon-all|recon-all]] or by any shell script in the source tree. It is the second of three tools in the hippocampal surface family: [[hiam_make_surfaces]] reconstructs the per-subject surface, **`hiam_make_template`** averages a cohort into a template, and [[hiam_register]] registers a new subject to that template.

## Inputs

### Required Inputs

Positional arguments ([`hiam_make_template.cpp:85-98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L85-L98)):

```
hiam_make_template [options] <hemi> <surface name> <subject1> <subject2> ... <output name>
```

1. **`<hemi>`** — hemisphere prefix used to build the surface path (`lh` or `rh`).
2. **`<surface name>`** — the spherical surface basename, read as `$SUBJECTS_DIR/<subject>/surf/<hemi>.<surface name>` ([`:122-124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L122-L124)). This must be a **sphere** (it is parameterized directly).
3. **One or more `<subject>` names** — each contributes one surface to the average.
4. **`<output name>`** — destination path for the template parameterization (written last).

For every subject the tool also reads the **precomputed curvature** file `$SUBJECTS_DIR/<subject>/surf/<hemi>.hippocampus.curv` ([`:140-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L140-L148) and [`:221-229`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L221-L229)). `$SUBJECTS_DIR` must be set (or supplied with `-sdir`) or the tool aborts ([`:88-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L88-L95)).

### Input Assumptions

> [!assumption] Spherical surfaces + a `hippocampus.curv` per subject
> Each subject directory must contain `surf/<hemi>.<surface name>` (a sphere, since the code calls [`MRIStoParameterization`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L168) on it directly without first projecting) **and** `surf/<hemi>.hippocampus.curv`. These are outputs of the (undocumented-here) hippocampal-surface pipeline; this tool does not create them.

> [!assumption] Curvature is precomputed, not derived here by default
> The configured surface entry has a non-NULL curvature name, so the program always takes the "read precomputed curvature file" branch ([`:138-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L138-L148)). The alternative branch (recompute curvature from a named surface via the second fundamental form) is present but unreachable with the built-in configuration.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<output name>` | path given as last argument | the spherical-parameterization template ([[mrisp-tif|MRI_SP]] `.tif`), 3 frames (mean, variance, dof) per surface |
| `<hemi>.<base>.out` | working directory | iteration/alignment log, **only when `-w` (DIAG_WRITE) is enabled** ([`:194-200`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L194-L200)) |

The template is written by [`MRISPwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L294). See [[mrisp-tif]] for the on-disk parameterization format.

### Output Specifications

The parameterization is allocated with [`MRISPalloc(scale, PARAM_IMAGES)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L102) where `PARAM_IMAGES = 3` (one surface × mean/variance/dof). `scale` (default 1, set by `-s`) controls the angular sampling resolution of the parameter image.

## Mathematical Foundations

The template represents each subject's hippocampal curvature as a function on the sphere, then averages those functions vertex-coordinate-wise in spherical parameter space.

> [!math] Spherical parameterization and combination
> [`MRIStoParameterization`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L168) resamples the per-vertex curvature $c(\theta,\phi)$ onto a regular $(\theta,\phi)$ grid (the MRI_SP parameter image). [`MRISPcombine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L169) accumulates each subject into running mean/variance/count frames, so after $M$ subjects the template holds, per parameter cell,
> $$ \bar c = \frac{1}{M}\sum_{m=1}^{M} c_m, \qquad \sigma^2 = \frac{1}{M}\sum_{m=1}^{M}(c_m-\bar c)^2, \qquad \text{dof}=M. $$
> The curvature itself is normalised per subject by [`MRISnormalizeCurvature`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L164) using `NORM_MEAN` (mean-normalisation) so that subjects are on a common scale before averaging.

> [!math] Two-pass rigid alignment
> Unless `-norot` is given, the program builds the template **twice**. The first pass accumulates the raw (unaligned) subjects into `mrisp_template`. The second pass, for each subject, rigidly rotates the sphere to maximise correlation with that first-pass template,
> $$ R^\star = \arg\max_{R\in SO(3)} \; \mathrm{corr}\big(c_m\!\circ R,\ \bar c^{(1)}\big), $$
> via [`MRISrigidBodyAlignGlobal(mris, &parms, 4.0, 32.0, 8)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L235) (coarse-to-fine angular search, here from 32° down with 8 samples per scale, correlation weight `l_corr = 1`), then re-parameterizes the rotated surface into `mrisp_aligned`. The aligned accumulation replaces the template at the end ([`:288-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L288-L291)). This removes the arbitrary rotational pose of each input sphere so that folding patterns, not orientations, drive the average.

> [!internal] Parameterization, combination, and rigid search live in `mrisurf`
> [`MRIStoParameterization`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L168), [`MRISPcombine`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L169), [`MRISrigidBodyAlignGlobal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L235), [`MRIScomputeSecondFundamentalForm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L160), and [`MRISnormalizeCurvature`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L164) are implemented in the surface library (`mrisurf*`). See [[surface-representations]] and [[mris_make_template]] for the shared cortical version of this machinery.

## Configuration Options

### Complete Flag Reference

Parsed in [`get_option()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L305-L354). Single-letter flags are case-insensitive and consume their following argument; the long forms are matched whole.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-nbrs` | int | `1` | Vertex neighbourhood size used when curvature is (re)computed from a surface; larger values use a wider ring for the second-fundamental-form fit ([`:315-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L315-L318)). With the default precomputed-curvature path this has no effect. |
| `-sdir` | string | `$SUBJECTS_DIR` | Override the subjects directory used to locate `surf/` files ([`:319-322`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L319-L322)). |
| `-norot` | flag | off (alignment **on**) | Skip the rigid-body alignment pass; accumulate subjects in their input pose only ([`:323-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L323-L325)). |
| `-s` | float | `1` | Scale (angular resolution) of the spherical parameterization, passed to `MRISPalloc` and `MRIStoParameterization` ([`:332-336`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L332-L336)). |
| `-a` | int | `0` | Number of curvature-averaging iterations applied (`MRISaverageCurvatures`) when recomputing curvature ([`:337-341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L337-L341)). |
| `-w` | (int) | off | Enable diagnostic writing (`DIAG_WRITE`); if a number follows it is consumed. Turns on the `<hemi>.<base>.out` alignment log ([`:327-331`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L327-L331)). |
| `--help` | flag | — | Print usage + one-line description and exit ([`:311-312`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L311-L312)). |
| `--version` | flag | — | Print FreeSurfer build version and exit ([`:313-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L313-L314)). |
| `-u`<br>`-?` | flag | — | Print usage and exit ([`:342-346`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L342-L346)). |

### Configuration Interactions

> [!gotcha] `-norot` changes the meaning of the output, not just its speed
> With alignment on (default) the template is rotation-normalised: each subject is rigidly aligned to a first-pass average before final accumulation. With `-norot` the subjects are averaged **in whatever pose their input spheres happen to be**, which is only sensible if the inputs are already mutually aligned. The two modes produce materially different templates.

- `-nbrs`, `-a` only matter on the curvature-recompute path, which the built-in single-surface configuration (precomputed `hippocampus.curv`) does not take — so by default they are inert.
- `-w` (alignment log) only produces a file during the rigid-alignment pass, hence it does nothing when combined with `-norot` (no second pass runs).
- `-s` must be consistent with the scale expected by [[hiam_register]]; both allocate parameterizations and a mismatch in angular resolution would make the template and the to-be-registered surface incompatible.

## Typical Use Cases

### Use Case 1: Build a left-hippocampus template from a cohort

```bash
export SUBJECTS_DIR=/data/hippo_study
hiam_make_template lh hippocampus.sphere \
    subj01 subj02 subj03 subj04 subj05 \
    /data/hippo_study/templates/lh.hippocampus.tif
```

Reads `lh.hippocampus.sphere` + `lh.hippocampus.curv` for each subject, rigidly aligns them, and writes the averaged template.

### Use Case 2: Average pre-aligned surfaces without re-rotating

```bash
hiam_make_template -norot lh hippocampus.sphere \
    subj01 subj02 subj03 \
    /data/hippo_study/templates/lh.hippocampus.norot.tif
```

### Use Case 3: Coarser parameterization with a diagnostic log

```bash
hiam_make_template -s 2 -w lh hippocampus.sphere \
    subj01 subj02 subj03 \
    /data/hippo_study/templates/lh.hippocampus.tif
# also writes lh.<base>.out in the working directory
```

## Pipeline Context

**Predecessor:** [[hiam_make_surfaces]] (and the upstream step that spheres the surface and writes `hippocampus.curv`) produces each subject's `surf/<hemi>.hippocampus.sphere` and `surf/<hemi>.hippocampus.curv` → **hiam_make_template** averages a cohort into a template parameterization → **Successor:** [[hiam_register]] registers a new subject's hippocampal sphere to this template.

It is not part of [[wiki/pipelines/recon-all|recon-all]]. Functionally it mirrors the cortical [[mris_make_template]], restricted to a single hippocampal surface/curvature.

## Gotchas and Caveats

> [!gotcha] The "read existing template" branch is dead code
> The decision to create a fresh parameterization vs. read an existing one is guarded by `if (1 || !FileExists(template_fname))` ([`:99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L99)). The constant `1` forces the **create-new** branch always, so the program never reads an existing `template_fname` to extend it — every run starts the template from scratch and overwrites the output. The "subsequent alignments" path is effectively unreachable.

> [!gotcha] Only one surface and a fixed curvature name are configured
> `surface_names = {"hippocampus"}` and `curvature_names = {"hippocampus.curv"}` are hard-coded ([`:50-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L50-L51)). There is no flag to add surfaces or change the curvature basename; the amygdala is handled by running with appropriately-prepared inputs, not by a separate code path.

> [!gotcha] Output path is the last argument, not a flag
> `template_fname = argv[argc-1]` ([`:98`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L98)). Everything between `<surface name>` and the final argument is treated as a subject name, so a stray trailing token will be mistaken for the output filename (or a subject).

## Error Compensation and Guard Rails

- **Missing `$SUBJECTS_DIR` aborts early** with a clear message ([`:88-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L88-L95)).
- **Unreadable surface / curvature files abort** via `ErrorExit`/`Gerror` rather than producing a partial template ([`:129-132`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L129-L132), [`:146-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L146-L148)).
- **Per-subject curvature normalisation** (`NORM_MEAN`) compensates for inter-subject scale differences before averaging ([`:164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L164)).
- **Truncation checks** on every constructed path print a warning if `snprintf` would overflow `STRLEN` ([`:125-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L125-L127)).

## Related Tools

- [[mris_make_template]] — the cortical original this is forked from; same parameterization/averaging/rigid-alignment machinery, applied to whole-hemisphere surfaces.
- [[hiam_register]] — the **consumer**: registers an individual hippocampal sphere to the template this tool builds.
- [[hiam_make_surfaces]] — the **producer** of the per-subject hippocampal surfaces that feed this averaging step.
- [[mris_sphere]] / [[mris_inflate]] — the cortical analogues of the spherical-mapping step that must precede template building.

## Confidence and Gaps

**High confidence:** the argument order, the fixed surface/curvature configuration, the 3-frame (mean/variance/dof) template, the default-on two-pass rigid alignment and its disabling by `-norot`, the complete flag set with defaults, and the always-create-new behaviour — all read directly from [`hiam_make_template.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp).

> [!gap] Where do `hippocampus.sphere` / `hippocampus.curv` come from?
> This tool consumes per-subject spherical surfaces and curvature files but does not create them, and no script in the v8.2.0 tree wires up a hippocampal-surface pipeline. The upstream provenance (which tool spheres the [[hiam_make_surfaces]] output and writes its curvature) is unresolved from the source available here.

> [!gap] Extending an existing template is not exercised
> Because of the `if (1 || …)` guard ([`:99`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp#L99)), the branch that reads and adds to an existing template never runs; its behaviour is therefore undocumented/untested from this code.

## References

- FreeSurfer source: [`hiam_make_template/hiam_make_template.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_make_template/hiam_make_template.cpp) (v8.2.0).
- Cortical original: [`mris_make_template/mris_make_template.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_make_template/mris_make_template.cpp).
- B. Fischl, M. I. Sereno, R. B. H. Tootell, A. M. Dale, "High-resolution intersubject averaging and a coordinate system for the cortical surface," *Human Brain Mapping* 8:272–284, 1999 — the spherical-parameterization / template-averaging method.
