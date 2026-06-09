---
title: "fspalm"
type: tool
fs_version: "8.2.0"
source_language: "Python"
source_files:
  - "scripts/fspalm"
families: []                     # standalone statistics wrapper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mri_glmfit-sim]]"
  - "[[mri_surfcluster]]"
  - "[[mri_volcluster]]"
  - "[[mri_segstats]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mris_fwhm]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact PALM MATLAB function signature (argument order/semantics of -ise, -C, -logp) is taken from the generated run_palm.m; the PALM implementation itself is external (Winkler) and was not read."
  - "fast_p2z (p-to-z conversion) is a FreeSurfer MATLAB helper invoked inside run_palm.m; its formula was not inspected."
tags:
  - statistics
  - permutation
  - multiple-comparisons
  - glm
  - surface
  - volume
---

# fspalm

## Summary

`fspalm` is a FreeSurfer wrapper around **PALM** (Permutation Analysis of Linear
Models), a permutation-based tool by Anderson Winkler for correcting
group-level statistical maps for multiple comparisons. It takes the output
directory of a [[wiki/tools/mri_glmfit|mri_glmfit]] analysis, translates the
FreeSurfer design matrix and contrasts into PALM's FSL-style `design.mat` /
`design.con` format, generates a MATLAB/Octave driver script
(`run_palm.m`) that calls the `palm` function with cluster-extent inference,
runs it, and then post-processes the family-wise-error-corrected p-value maps
into cluster tables using [[mri_surfcluster]] (surface analyses) or
[[mri_volcluster]] (volume analyses). It is the permutation-based alternative to
the Monte-Carlo simulation approach of [[mri_glmfit-sim]].

## Source Information

- **Language:** Python 3 (shebang `#!/usr/bin/env python3`)
- **Source file:** [`scripts/fspalm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm)
- **Binary/script location:** `$FREESURFER_HOME/bin/fspalm`
- **Launcher indirection:** the installed `$FREESURFER_HOME/bin/fspalm` is a tiny
  bash stub that execs the real script under the bundled Python interpreter:
  `exec $FREESURFER_HOME/bin/fspython $FREESURFER_HOME/python/scripts/fspalm "$@"`.
  The script in `scripts/fspalm` is what actually runs.
- **External engine:** the `palm` MATLAB function (and the `dcm2niix`-independent
  PALM toolbox) is **not** part of FreeSurfer's source; it must be on the
  MATLAB/Octave path. PALM was written by Dr. Anderson Winkler
  (`fsl.fmrib.ox.ac.uk/fsl/fslwiki/PALM`).
- **Tools invoked:** [`mri_convert`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L23) (nii.gz→nii coercion),
  [`matlab`/`octave`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L329-L332) (runs `run_palm.m`),
  [`mri_surfcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L348) /
  [`mri_volcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L396) (cluster post-processing),
  [`mri_segstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L364) (per-cluster mean of the input).

## Purpose and Context

A standard FreeSurfer group analysis fits a general linear model at every
surface vertex or volume voxel with [[wiki/tools/mri_glmfit|mri_glmfit]], yielding
an uncorrected significance map. Because tens of thousands of points are tested,
the map must be corrected for multiple comparisons. FreeSurfer's built-in route
is [[mri_glmfit-sim]], which estimates the cluster-extent null distribution by
Monte-Carlo simulation (or a precomputed Gaussian Z Monte-Carlo table). `fspalm`
offers the **permutation** alternative: it shuffles/sign-flips the data many
times to build an empirical null and reports **cluster-wise family-wise-error
(FWE) corrected p-values** without assuming a parametric form for the cluster-size
distribution.

`fspalm` is purely a *glue/preparation* tool: it never performs the permutation
itself. Its job is to (1) extract everything PALM needs from an existing
`mri_glmfit` run, (2) emit the design files and a MATLAB driver, (3) launch PALM,
and (4) reduce PALM's vertex/voxel FWE maps to labelled cluster tables. It is run
**by hand** after `mri_glmfit`; it is **not** part of
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Requires a dev-era `mri_surfcluster` / `mri_volcluster`
> The header comment notes the user needs the *development* (≥ 2018-03-15)
> version of [`mri_surfcluster` and `mri_volcluster`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L3),
> because `fspalm` relies on the `--sig2p-max` and `--bonferroni-max` options
> those builds added. In v8.2.0 these are standard, but the dependency is real if
> you mix binaries from different releases.

## Inputs

### Required Inputs

- **`--glmdir PATH`** — an existing [[wiki/tools/mri_glmfit|mri_glmfit]] output
  directory. `fspalm` reads the following from it:
  - `mri_glmfit.log` — to recover the input data file (`y`) and to verify
    `--fwhm` was *not* used ([`scripts/fspalm:124-148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L124-L148)).
  - `Xg.dat` — the design matrix, reformatted into `design.mat`
    ([`scripts/fspalm:184-209`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L184-L209)).
  - one `C.dat` per contrast subdirectory — reformatted into `design.con`
    ([`scripts/fspalm:211-240`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L211-L240)).
  - a `mask.{mgz,mgh,nii,nii.gz}` volume ([`scripts/fspalm:242-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L242-L252)).
  - a `surface` marker file (present ⇒ surface-based analysis; absent ⇒
    volume-based) ([`scripts/fspalm:116-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L116-L122)).
- **`--cft FLOAT`** — voxel/vertex-wise cluster-forming threshold, expressed as
  $-\log_{10}(p)$.
- **`--cwp FLOAT`** — cluster-wise p-value threshold (a real probability, e.g.
  `0.05`), converted internally to $-\log_{10}$.
- **Exactly one of `--onetail` / `--twotail`** — the test tail (mutually
  exclusive, one required).

### Input Assumptions

> [!assumption] A complete, un-smoothed mri_glmfit run on fsaverage-space data
> `fspalm` assumes `--glmdir` is a finished `mri_glmfit` analysis whose input,
> mask, design (`Xg.dat`), and per-contrast `C.dat` files are all present, and
> whose input data still exist at the path recorded in `mri_glmfit.log`. For
> **surface** analyses it assumes `SUBJECTS_DIR` is set and the target subject's
> `?h.white` surface exists; the volume path hard-codes `fsaverage` as the target
> subject and uses the 2 mm `aparc+aseg` segmentation and registration shipped in
> `$FREESURFER_HOME/subjects/fsaverage/`.

> [!gotcha] The mri_glmfit run must NOT have used `--fwhm`
> If `mri_glmfit.log` shows `--fwhm` on its command line, `fspalm` aborts with an
> error ([`scripts/fspalm:137-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L137-L140)). Permutation inference needs the
> spatial smoothness to be baked into the data, not applied by the GLM. The fix
> the error prints: smooth explicitly with [[mris_fwhm]] / `mri_fwhm`, rerun
> `mri_glmfit` **without** `--fwhm`, then run `fspalm`.

## Outputs

All outputs are written **inside the PALM subdirectory** `glmdir/<name>` (default
`glmdir/palm`); `fspalm` `cd`s into it before running PALM
([`scripts/fspalm:262`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L262)).

### Files Created

| File / pattern | Created by | Contents |
|----------------|-----------|----------|
| `design.mat` | fspalm | FSL-format design matrix (`/NumWaves`, `/NumPoints`, `/Matrix`) translated from `Xg.dat`. |
| `design.con` | fspalm | FSL-format contrast matrix, one row per single-row `C.dat`. |
| `contrast_names.txt` | fspalm | Lookup of contrast index → contrast (subdirectory) name. |
| `run_palm.m` | fspalm | The generated MATLAB/Octave driver that calls `palm(...)`. |
| `fspalm.log` | fspalm | Log of the invocation, environment, and every post-processing command. |
| `mask.nii` | [[wiki/tools/mri_convert\|mri_convert]] | Only when the source mask was `.nii.gz` (PALM/MATLAB cannot read `.nii.gz`). |
| `<input>.nii` | [[wiki/tools/mri_convert\|mri_convert]] | Only when the GLM input was `.nii.gz`, converted to `.nii`. |
| `fsp_clustere_tstat_fwep[_cN]<fmt>` | PALM | **Cluster-extent FWE-corrected** $-\log_{10}(p)$ map per contrast — the headline result. |
| `fsp_dpv_tstat[_cN]<fmt>` (surface) / `fsp_vox_tstat[_cN]<fmt>` (volume) | PALM | Uncorrected per-vertex / per-voxel t-statistic p-value map per contrast (used to locate the peak). |
| `<con>.clustertable.summary` | [[mri_surfcluster\|mri_surfcluster]] / [[mri_volcluster\|mri_volcluster]] | Cluster table thresholded at the cluster-wise p-value. |
| `<con>.ocn<fmt>` | mri_surfcluster / mri_volcluster | Output cluster-number map (each cluster labelled by integer). |
| `<con>.ocn.annot` (surface) | mri_surfcluster | Annotation of the cluster map for FreeView. |
| `<con>.dpv.clustertable.summary` | mri_surfcluster / mri_volcluster | Cluster table built from the uncorrected dpv/vox map, masked to the FWE clusters (peak-vertex hack). |
| `<con>.y.ocn.dat` | [[mri_segstats\|mri_segstats]] | Mean of the GLM input averaged within each cluster. |

`<fmt>` is `.nii` for NIfTI input and `.mgz` for `.mgh`/`.mgz` input
([`scripts/fspalm:150-153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L150-L153)). The `_cN` suffix appears only when there is
more than one contrast ([`scripts/fspalm:264-278`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L264-L278)).

### Output Specifications

The headline `fsp_clustere_tstat_fwep` map holds **signed** $-\log_{10}$(FWE
p-value) values (PALM is run with `-logp`); the cluster post-processing thresholds
it at $-\log_{10}(\text{cwp})$. Surface maps live on the target subject's `white`
surface; volume maps live in the `fsaverage` 2 mm space (the registration
`mri.2mm/reg.2mm.dat` is supplied to `mri_volcluster`). Geometry and data type are
inherited from the GLM input via PALM and the cluster tools; `fspalm` itself does
no resampling.

## Mathematical Foundations

`fspalm` performs little maths directly — the permutation inference is entirely
inside the external `palm` function — but it makes three concrete numerical
choices when it writes `run_palm.m`:

> [!math] Two-tailed CFT correction (+0.301)
> PALM emits **one-tailed** p-values. For a two-tailed test, `fspalm` raises the
> cluster-forming threshold by $0.301$ in $-\log_{10}$ units
> ([`scripts/fspalm:298-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L298-L308)):
> $$\text{cft}_{2\text{-tail}} = \text{cft} + \log_{10} 2 \approx \text{cft} + 0.301$$
> Since $\log_{10} 2 \approx 0.301$, adding it halves the per-tail p-value
> threshold (e.g. $\text{sig}=2 \Rightarrow p=0.01$ becomes
> $\text{sig}=2.301 \Rightarrow p=0.005$). The source comment notes this mirrors
> what [[mri_glmfit-sim]] does; the original PALM author (AW) considered it
> unnecessary because the CFT is arbitrary, but it was kept for consistency.

> [!math] Threshold conversion to a Z cluster-forming value
> `run_palm.m` converts the p-value threshold to a Gaussian Z score for PALM's
> `-C` (cluster-forming) option:
> $$p_{\text{thresh}} = 10^{-\text{cft}}, \qquad z_{\text{thresh}} = \texttt{fast\_p2z}(p_{\text{thresh}})$$
> ([`scripts/fspalm:309-310`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L309-L310)). `fast_p2z` is a FreeSurfer MATLAB
> helper (not inspected here). The cluster-wise threshold is likewise
> $\text{cwpsig} = -\log_{10}(\text{cwp})$ ([`scripts/fspalm:341`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L341)).

> [!math] Automatic one-sample sign-flipping (`-ise`)
> If `Xg.dat` is a single column of all ones — i.e. a one-sample group mean —
> `fspalm` appends PALM's `-ise` flag (independent sign-flipping) so the
> permutation scheme uses sign flips rather than label shuffles
> ([`scripts/fspalm:195-198`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L195-L198)).

The actual `palm` invocation written into the script is
`palm('-i',input,'-m',maskfile,'-d','design.mat','-t','design.con','-logp','-n',iters,'-C',zthresh,'-o','fsp', …extra)`
([`scripts/fspalm:316-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L316-L318)).

> [!internal] The permutation engine is external
> The null-distribution construction, sign-flip/shuffle exchangeability, and
> cluster-extent FWE computation all live in Winkler's `palm` MATLAB toolbox,
> which FreeSurfer does not ship. `fspalm` only sets its arguments.

## Configuration Options

### Complete Flag Reference

Enumerated from the `argparse` setup
([`scripts/fspalm:55-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L55-L75)). With no arguments at all, `fspalm`
prints help and exits 1 ([`scripts/fspalm:77-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L77-L79)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--glmdir` | string (path) | *(required)* | The [[wiki/tools/mri_glmfit\|mri_glmfit]] output directory to prepare and analyse. |
| `--cft` | float ($-\log_{10}p$) | *(required)* | Vertex/voxel-wise cluster-forming threshold. Raised by 0.301 for `--twotail`. |
| `--cwp` | float (p) | *(required)* | Cluster-wise p-value threshold (a probability, e.g. `0.05`). |
| `--onetail` | bool | *(one required)* | One-tailed test. Mutually exclusive with `--twotail`. |
| `--twotail` | bool | *(one required)* | Two-tailed test; appends PALM `-twotail` and raises the CFT (see Math). |
| `--name` | string | `palm` | Name of the PALM subdirectory created under `--glmdir`. |
| `--iters` | int | `10` | Number of PALM permutations (`-n`). The default of 10 is for testing only — see gotcha. |
| `--monly` | bool | off | Only write `run_palm.m` (and design files); do not launch MATLAB/Octave. |
| `--pponly` | bool | off | Post-processing only: skip writing/running `run_palm.m` and reuse existing PALM outputs. |
| `--octave` | bool | off (MATLAB) | Run the driver with Octave (`octave --no-gui`) instead of MATLAB. |
| `--centroid` | bool | off | Add `--centroid` to the surface `mri_surfcluster` post-processing (report cluster centroids). Surface only. |
| `--2spaces` | bool | off | Bonferroni-correct the cluster p-values across 2 spaces (`--bonferroni-max 2`), e.g. two hemispheres. |
| `--3spaces` | bool | off | Bonferroni-correct across 3 spaces (`--bonferroni-max 3`), e.g. two hemispheres + subcortex. |
| `--pargs` | string | — | Extra arguments passed verbatim to the `palm` function. Must use `--pargs="-flag …"` syntax (see gotcha). |

### Configuration Interactions

> [!gotcha] `--onetail` and `--twotail` are mutually exclusive and one is mandatory
> They are defined in a `required=True` mutually-exclusive group
> ([`scripts/fspalm:61-64`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L61-L64)). Supplying neither, or both, is an `argparse`
> error. `--twotail` additionally appends the PALM `-twotail` option and bumps the
> CFT by 0.301.

> [!gotcha] `--pargs` needs the `=`-attached form
> `argparse` would otherwise treat a leading-dash value (e.g. `--pargs "-T"`) as a
> new option. `fspalm` overrides the parser's error handler to detect this and
> tells you to write `--pargs="-flag1 -flag2"` instead
> ([`scripts/fspalm:29-39`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L29-L39)). Each token is single-quoted and forwarded into
> the `palm(...)` call ([`scripts/fspalm:84-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L84-L86)).

> [!gotcha] `--monly` and `--pponly` bracket the PALM run
> `--monly` stops **before** PALM (prep only — you then run `run_palm.m` yourself),
> while `--pponly` skips **the PALM run and its prep** and jumps straight to cluster
> post-processing of pre-existing `fsp_*` outputs ([`scripts/fspalm:281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L281),
> [`scripts/fspalm:321-324`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L321-L324)). Used together, `--pponly` wins (the
> whole prep+run block is skipped) but post-processing will then fail unless the
> PALM outputs already exist.

> [!gotcha] `--centroid` is surface-only
> The volume branch has no centroid option; `--centroid` is appended only in the
> `mri_surfcluster` path ([`scripts/fspalm:353`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L353)). On a volume analysis it is
> silently ignored.

> [!gotcha] `--2spaces` / `--3spaces` are not mutually exclusive in code
> Both simply append a `--bonferroni-max N` to the cluster command; if both are
> given, both are appended ([`scripts/fspalm:354-355`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L354-L355),
> [`scripts/fspalm:403-404`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L403-L404)), so the last one on the command line
> effectively wins inside the cluster tool. Use exactly one.

### Surface vs. volume auto-detection

The presence of a `surface` file in `--glmdir` switches the entire downstream
behaviour ([`scripts/fspalm:116-122`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L116-L122)): surface analyses load the target
subject and hemisphere from that file, pass the `white` surface (and average-area
file if present) to PALM, and post-process with [[mri_surfcluster]]; volume
analyses hard-code `fsaverage` as the target and post-process with
[[mri_volcluster]]. This is automatic and not user-selectable.

> [!gotcha] Surface input cannot be NIfTI
> For a surface analysis the GLM input and mask must be `.mgh`/`.mgz`; a `.nii`/
> `.nii.gz` input or mask aborts with an explicit error
> ([`scripts/fspalm:254-259`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L254-L259)).

## Typical Use Cases

### Use Case 1: Surface group analysis, two-tailed

```bash
# Cluster-forming threshold p<0.01 (-log10 = 2), cluster-wise FWE p<0.05.
fspalm --glmdir /studies/grp/lh.thickness.glmdir \
       --cft 2 --cwp 0.05 --twotail --iters 5000
```

Prepares `lh.thickness.glmdir/palm/`, runs PALM with 5000 sign-flips/permutations,
and writes a per-contrast cluster table on the `lh` `white` surface, with the
two-tailed CFT internally set to 2.301.

### Use Case 2: Prepare only, run PALM yourself later

```bash
fspalm --glmdir /studies/grp/vol.glmdir --cft 1.3 --cwp 0.05 --onetail --monly
# then, in MATLAB:
#   cd /studies/grp/vol.glmdir/palm; run_palm
```

`--monly` stops after writing `design.mat`, `design.con`, and `run_palm.m` — handy
for inspecting or editing the PALM call before committing to a long run.

### Use Case 3: Re-run only the cluster post-processing

```bash
# PALM already finished; just regenerate cluster tables with a Bonferroni
# correction for two hemispheres.
fspalm --glmdir /studies/grp/lh.thickness.glmdir \
       --cft 2 --cwp 0.05 --twotail --pponly --2spaces
```

### Use Case 4: Run under Octave (no MATLAB licence)

```bash
fspalm --glmdir /studies/grp/vol.glmdir --cft 1.3 --cwp 0.05 \
       --onetail --octave --iters 5000
```

## Pipeline Context

`fspalm` is a standalone group-statistics tool. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] (no reference in `recon-all` or `trac-all`).
It sits at the very end of a vertex/voxel-wise group GLM workflow:

**Predecessor:** [[mris_preproc]] / [[mri_glmfit-sim]]-style data assembly →
[[wiki/tools/mri_glmfit|mri_glmfit]] (fit the GLM, producing `--glmdir`) →
**fspalm** (permutation FWE correction) → **Successor:** inspect cluster tables /
overlay `<con>.ocn.annot` in [[wiki/tools/freeview|freeview]].

It is a sibling/alternative to [[mri_glmfit-sim]]: where `mri_glmfit-sim`
corrects via Monte-Carlo Z simulation (or a cached CDF), `fspalm` corrects via
data permutation through the external PALM toolbox.

## Gotchas and Caveats

> [!gotcha] The default `--iters 10` is a smoke-test value, not for real analysis
> The default is `10` ([`scripts/fspalm:68`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L68)). Ten permutations cannot
> resolve a p-value below 0.1; real analyses use thousands (commonly 5000–10000).
> Always set `--iters` explicitly.

> [!gotcha] No PALM return code — success is inferred from output files
> MATLAB/Octave do not return a useful exit status, so after the run `fspalm`
> checks that each expected `fsp_clustere_tstat_fwep` file exists and errors if
> not ([`scripts/fspalm:335-338`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L335-L338)). A PALM failure therefore surfaces as
> "cannot find expected palm output", not as the underlying MATLAB error — read
> the console for the real cause.

> [!gotcha] Multi-row contrasts are silently dropped
> Only single-row `C.dat` contrasts (t-contrasts) are exported; a contrast file
> with more than one row prints a warning and is **excluded** from `design.con`
> ([`scripts/fspalm:221-225`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L221-L225)). F-contrasts from `mri_glmfit` are not
> carried into PALM.

> [!gotcha] The "dpv" cluster table is an acknowledged hack
> The peak-vertex/voxel localisation re-runs the cluster tool on the uncorrected
> map masked to the FWE clusters. The source comments warn that cluster ordering
> is **not guaranteed** to match between the two passes
> ([`scripts/fspalm:373-377`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L373-L377)), so peak coordinates in the `.dpv` table
> should be cross-checked against the main cluster map.

> [!gotcha] Output directory is reused, not wiped
> Unless `--pponly` is set, only the stale `fsp_clustere_tstat_fwep` files are
> deleted before a run ([`scripts/fspalm:282-284`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L282-L284)); other artefacts from a
> previous run in the same `--name` directory may linger. Use a fresh `--name` for
> a clean run.

## Error Compensation and Guard Rails

- **`.nii.gz` → `.nii` coercion.** MATLAB cannot read gzip-compressed NIfTI, so
  both the GLM input and the mask are auto-converted with
  [[wiki/tools/mri_convert|mri_convert]] when they are `.nii.gz`
  ([`scripts/fspalm:20-26`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L20-L26), [`scripts/fspalm:145-147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L145-L147),
  [`scripts/fspalm:250-252`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L250-L252)).
- **`--fwhm` guard.** Refuses to run if the GLM was smoothed via `--fwhm` (see
  Inputs gotcha).
- **One-sample auto `-ise`.** Detects an all-ones design and switches PALM to
  sign-flipping automatically.
- **Existence checks throughout.** Missing `--glmdir`, `mri_glmfit.log`, input
  file, `Xg.dat`, any contrast `C.dat`, mask, `SUBJECTS_DIR`, target subject, or
  surface file each abort with a specific message
  ([`scripts/fspalm:92-95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L92-L95), [`scripts/fspalm:126-127`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L126-L127),
  [`scripts/fspalm:141-144`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L141-L144), [`scripts/fspalm:161-171`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L161-L171),
  [`scripts/fspalm:187-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L187-L188), [`scripts/fspalm:248-249`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L248-L249)).
- **Per-command failure handling.** Every `mri_surfcluster`/`mri_volcluster`/
  `mri_segstats` call checks its return code and aborts on non-zero, naming the
  failed step ([`scripts/fspalm:361-362`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L361-L362) and following).

## Related Tools

- [[wiki/tools/mri_glmfit|mri_glmfit]] — produces the `--glmdir` that `fspalm` consumes; its design (`Xg.dat`) and contrasts (`C.dat`) are translated for PALM.
- [[mri_glmfit-sim]] — the Monte-Carlo alternative to `fspalm` for cluster-wise FWE correction; `fspalm` mirrors several of its conventions (the +0.301 two-tailed CFT bump, `--bonferroni-max`).
- [[mri_surfcluster]] — surface cluster-detection / table generation used in post-processing (and to locate peaks).
- [[mri_volcluster]] — volume analogue of `mri_surfcluster`, used for volume analyses.
- [[mri_segstats]] — computes the mean of the GLM input within each detected cluster (`<con>.y.ocn.dat`).
- [[wiki/tools/mri_convert|mri_convert]] — coerces `.nii.gz` inputs/masks to `.nii` for MATLAB.
- [[mris_fwhm]] — the explicit smoothing tool the error message recommends instead of `mri_glmfit --fwhm`.
- `palm` *(external, no wiki page)* — Anderson Winkler's PALM MATLAB toolbox; the actual permutation engine, not shipped with FreeSurfer.

## Confidence and Gaps

**High confidence:** the complete flag set, mutual-exclusion rules, the
surface/volume auto-switch, the `.nii.gz` coercion, the `--fwhm` refusal, the
one-sample `-ise` logic, the +0.301 two-tailed CFT correction, the exact PALM
command line written into `run_palm.m`, and every post-processing command — all
read directly from [`scripts/fspalm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm).

> [!gap] PALM internals and `fast_p2z`
> The semantics of PALM's own options (`-ise`, `-C`, `-logp`, `-twotail`) and the
> `fast_p2z` p-to-z conversion are defined outside this script (the external PALM
> toolbox and a FreeSurfer MATLAB helper, respectively) and were not inspected
> here. The descriptions of how `fspalm` *invokes* them are exact; the underlying
> numerics are not re-derived.

> [!gap] Volume target subject is hard-coded
> The volume branch assumes `fsaverage` (with the bundled 2 mm `aparc+aseg` and
> `reg.2mm.dat`); the source comment notes there is "no way to figure this out"
> for CVS or other targets and that the user would have to specify it
> ([`scripts/fspalm:179-182`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm#L179-L182)). Volume analyses in a non-fsaverage 2 mm space
> are not supported by this script as written.

## References

- FreeSurfer source: [`scripts/fspalm`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/fspalm) (v8.2.0).
- FsPalm wiki: https://surfer.nmr.mgh.harvard.edu/fswiki/FsPalm
- PALM (Permutation Analysis of Linear Models), A. Winkler: https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/PALM
- Winkler AM, Ridgway GR, Webster MA, Smith SM, Nichols TE. "Permutation inference for the general linear model." *NeuroImage* 92 (2014): 381-397.
