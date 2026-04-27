---
title: "TRACULA and dMRI — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 6
last_agent_update: 2026-04-27
tags:
  - faq
  - tracula
  - dt_recon
  - dmri
  - tractography
---

# TRACULA and dMRI — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's diffusion MRI
tooling — primarily [[dt_recon]] (per-voxel diffusion-tensor fitting and
DTI metric computation) and TRACULA (`trac-all` / [[dmri_paths]] /
[[dmri_pathstats]], the global probabilistic white-matter tractography
pipeline). Both tools depend on a previously completed [[recon-all]] T1
reconstruction: TRACULA uses the cortical parcellation as anatomical
priors for tract reconstruction, and `dt_recon` registers the diffusion
volume to the T1 anatomy and projects metrics through the FreeSurfer
parcellation. Most questions below are answered by Greve and Maffei on
the FreeSurfer mailing list; the `Len_Center` semantics entry is
code-verified against the FS 8.2.0 source tree.

> For tool reference, see [[dt_recon]], [[dmri_paths]],
> [[dmri_pathstats]], and [[mri_glmfit]]. For the upstream T1 step, see
> [[recon-all]].

---

## dmrirc configuration

### Why does `trac-all -prep` fail when I set `ncpts` in my dmrirc but not `pathlist`?

**Short answer:** `ncpts` and `pathlist` must have the same length;
setting `ncpts` without `pathlist` causes a length mismatch because
TRACULA defaults to all 42 tracts when `pathlist` is omitted.

**Detail:** The `pathlist` variable selects the subset of tracts to
reconstruct, and `ncpts` specifies the number of control points per
tract — one entry per tract in `pathlist`. When `pathlist` is omitted,
TRACULA uses its built-in default of all 42 atlas tracts, so an
`ncpts` vector of any other length silently misaligns and configuration
parsing fails (the user-visible symptom is an "Unmatched quote" error
during `trac-all -prep`). Two correct usage patterns:

```tcsh
# Pattern A: subset of tracts — both pathlist and ncpts required,
#            and they must have the same length.
set pathlist = (rh.uf lh.uf rh.cst lh.cst)
set ncpts    = (7 7 6 6)

# Pattern B: all 42 default tracts — omit ncpts entirely
# (do not set pathlist either; both lines commented out).
```

> [!gotcha] Setting `ncpts` without `pathlist` is a silent
> configuration error. Either set both with matching lengths, or omit
> both and accept the 42-tract default.

**Provenance:** Mailing list, 2023-07-18 (Maffei). See
`raw/mailing-list/2023-07-tracula-dmrirc-pathlist-ncpts-pedir-dob0.md`.

**Related:** [[dmri_paths]], [[dmri_pathstats]], [[recon-all]]

---

### Why does TRACULA preprocessing complain about a missing PE direction when I set `dob0 = 2`?

**Short answer:** `dob0 = 2` activates topup-based B0 inhomogeneity
correction using reverse-polarity DWIs, which requires you to declare
the phase-encode direction of the acquisition via `pedir`.

**Detail:** TRACULA exposes three B0-distortion-correction modes via
`dob0`: `0` (off), `1` (fieldmap-based), and `2` (topup with
reverse-PE DWIs). Mode `2` cannot run without knowing which axis the
phase encoding was applied along. The `pedir` setting takes one of
`x`, `y`, `z`, `-x`, `-y`, or `-z` and should match the acquisition's
`PhaseEncodingDirection` (e.g. as recorded in a BIDS JSON sidecar,
converted to FSL/topup convention):

```tcsh
set dob0  = 2
set pedir = y      # or x, z, -x, -y, -z
```

> [!gotcha] Disabling B0 correction (`dob0 = 0`) does not eliminate
> the requirement: the same `pedir` value is also consumed by
> model-based eddy-current correction in `trac-all -prep`. If you have
> reverse-polarity DWIs or rely on eddy correction, set `pedir`
> regardless of `dob0`.

**Provenance:** Mailing list, 2023-07-18 (Maffei). See
`raw/mailing-list/2023-07-tracula-dmrirc-pathlist-ncpts-pedir-dob0.md`.

**Related:** [[dmri_paths]], [[recon-all]], [[registration-overview]]

---

## dt_recon prerequisites and registration QC

### Should I run `recon-all` directly on my DWI data before `dt_recon`?

**Short answer:** No — run [[recon-all]] on a separate T1 anatomical
scan first, then pass that subject ID to `dt_recon` along with the DWI.

**Detail:** [[recon-all]] is designed for T1-weighted structural MRI
and will fail or produce nonsensical surfaces if pointed at a DWI
volume. [[dt_recon]] is not a stand-alone pipeline — it consumes
[[recon-all]] outputs (the white/pial surfaces, the LTA transforms,
and the cortical parcellation) to register the DWI to T1 anatomy and
project DTI metrics through that parcellation. The correct order is:

```bash
# 1. Structural recon-all on the T1
recon-all -s SUBJECT -i T1.nii.gz -all

# 2. Then dt_recon on the DWI, referencing the same SUBJECT
dt_recon --i dwi.nii.gz --b bvals.txt --g bvecs.txt \
         --s SUBJECT --o $SUBJECTS_DIR/SUBJECT/dmri
```

The same prerequisite applies to TRACULA, which builds on `dt_recon`'s
outputs and likewise requires a completed `recon-all` subject
directory before `trac-all -prep` will run.

**Provenance:** Mailing list, 2023-11-09 (Greve). See
`raw/mailing-list/2023-11-dt-recon-requires-separate-t1-recon-all-first.md`.

**Related:** [[dt_recon]], [[recon-all]], [[bbregister]],
[[registration-overview]]

---

### How do I QC the DWI-to-T1 registration produced by `dt_recon`?

**Short answer:** `dt_recon` writes the exact `tkregisterfv` invocation
used for QC into `register.log`; run that command to inspect the
overlay, and a misaligned overlay there confirms a real registration
error rather than a display artifact.

**Detail:** When FA/MD maps look misaligned with the cortical
parcellation in [[freeview]], the first question is whether the
underlying DWI→T1 registration is wrong or only the visualisation is
wrong. [[dt_recon]] resolves this by recording the registration QC
command verbatim:

```bash
grep tkregisterfv $SUBJECTS_DIR/SUBJECT/dmri/register.log
# Run the command exactly as printed — it loads the correct --mov
# (FA / lowb) and --reg (LTA) used internally by dt_recon.
```

In `tkregisterfv`, the WM/GM boundaries on the diffusion image should
align with the FreeSurfer surfaces drawn from the T1; misalignment of
several millimetres indicates a genuine registration failure (commonly
caused by severe motion, large uncorrected B0 distortion, FOV
mismatch, or extreme orientation differences between the T1 and DWI
acquisitions). If registration fails, recompute it with
[[bbregister]] (`bbregister --t2 --dti`) and feed the resulting LTA
back into `dt_recon`/TRACULA, or rerun `dt_recon` with `--run
bbregister`.

**Provenance:** Mailing list, 2025-03-26 (Greve). See
`raw/mailing-list/2025-03-dt-recon-register-log-tkregisterfv-qc.md`.

**Related:** [[dt_recon]], [[bbregister]], [[freeview]],
[[registration-overview]]

---

## TRACULA outputs

### Why is `Len_Center` in `pathstats.overall.txt` larger than `Len_Max`?

**Short answer:** It is expected — `Len_Center` is the length of the
single representative *center streamline* of the bundle, not the
midpoint of the `[Len_Min, Len_Max]` range, and the center streamline
is constructed independently from the sampled streamlines so it can
be longer (or shorter) than any of them.

**Detail:** `Len_Min` and `Len_Max` summarise the per-sample
streamline lengths drawn by probabilistic tractography. `Len_Center`
comes from a different object: a single streamline traced through the
voxels most consistently visited across all samples (a kind of mode
of the probabilistic pathway map). Code-verified in
`trc/blood.cxx`:

```cpp
int Blood::GetLengthCenter() { return mCenterStreamline.size() / 3; }
```

Because the center streamline traces through the *core voxels* of the
bundle while individual sample streamlines may be clipped early or
diverge, the center streamline frequently exceeds the longest sampled
streamline. Practical guidance:

- Use `Len_Avg` as the typical-tract-length summary in group analyses.
- Treat `Len_Center` as a property of the representative center
  streamline (useful for visualisation and reference) — it is **not**
  bounded by `Len_Min`/`Len_Max`.
- `Len_Min` / `Len_Max` describe only the sampled population.

> [!gotcha] `Len_Center > Len_Max` is not a bug or a data quality
> issue; it reflects the construction of the center streamline. Do
> not filter subjects on this condition.

**Provenance:** Mailing list, 2025-07-21 (Monopoli). No developer
reply was captured in the thread; the interpretation above is derived
from FS 8.2.0 source code analysis. See
`raw/mailing-list/2025-07-tracula-len-center-semantics.md`.
Code-verified: [`trc/blood.cxx:4990`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/trc/blood.cxx#L4990),
[`trc/blood.cxx:4976`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/trc/blood.cxx#L4976),
[`trc/blood.cxx:4978`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/trc/blood.cxx#L4978),
[`trc/dmri_pathstats.cxx:290-291`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/trc/dmri_pathstats.cxx#L290-L291).

**Related:** [[dmri_pathstats]], [[dmri_paths]]

---

## Group analysis

### What is in TRACULA's `beta.mgh` GLM output, and how do I extract a specific effect?

**Short answer:** `beta.mgh` has one frame per design-matrix column,
and each frame's voxel values are the OLS regression coefficients for
that column; for any specific effect you want, define a contrast and
read `ces.mgh` / `sig.mgh` rather than indexing `beta.mgh` directly.

**Detail:** TRACULA group analysis runs [[mri_glmfit]] under the hood,
so the output layout is identical: a `beta.mgh` whose Nth frame is
the β coefficient for the Nth column of the design matrix specified
by your [[fsgd-format]] file (or `--X` matrix). For example, with a
design `(Intercept, Group1, Group2, Covariate)`:

- frame 0 → β for the intercept
- frame 1 → β for the Group1 indicator
- frame 2 → β for the Group2 indicator
- frame 3 → β for the covariate

Greve's recommendation is to express the question you actually want
to answer (a slope, a group difference, an interaction) as a contrast
vector, then read the corresponding contrast outputs:

- `ces.mgh` — contrast effect size (the linear combination of βs)
- `sig.mgh` — signed −log10(p) for the contrast

Reading `beta.mgh` directly is appropriate only when you need raw
coefficients (e.g. for plotting model fits or sanity checking) rather
than a hypothesis test:

```bash
# Pull the third design-matrix column's β (frame index 2) for plotting
mri_convert beta.mgh --frame 2 beta_col2.mgh
```

**Provenance:** Mailing list, 2024-03-05 (Greve). See
`raw/mailing-list/2024-03-tracula-glm-beta-file-design-matrix-columns.md`.

**Related:** [[mri_glmfit]], [[fsgd-format]], [[dmri_pathstats]]
