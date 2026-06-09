---
title: "trac-paths"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/trac-paths"
families: []                     # TRACULA stage script
recon_all_stage: null
related:
  - "[[wiki/pipelines/trac-all|trac-all]]"
  - "[[trac-preproc]]"
  - "[[dmri_paths]]"
  - "[[dmri_pathstats]]"
  - "[[dmri_mergepaths]]"
  - "[[dmri_trk2trk]]"
  - "[[dmri_bset]]"
  - "[[mri_vol2surf]]"
  - "[[mri_cor2label]]"
  - "[[mri_label2label]]"
  - "[[mris_anatomical_stats]]"
  - "[[tractstats2table]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Longitudinal path-reconstruction branch (dolong) and its CVS/SyN/FNIRT transform chains were read statically but not executed; one mris_anatomical_stats call in the longitudinal branch passes $subj rather than $subj_t (possible latent bug)."
tags:
  - tracula
  - diffusion
  - dmri
  - tractography
  - mcmc
---

# trac-paths

## Summary

`trac-paths` performs the actual probabilistic tractography for **a single
subject** in TRACULA — step 3 of the [[wiki/pipelines/trac-all|trac-all]]
pipeline. Driven by a sourced configuration file (`dmrirc.local`), it runs the
constrained-MCMC pathway reconstruction engine [[dmri_paths]] for every pathway in
the subject's `pathlist`, computes whole-path and along-path diffusion measures
with [[dmri_pathstats]], projects each pathway's endpoints onto the cortical
surface, and merges all reconstructed pathways into one labelled volume with
[[dmri_mergepaths]]. It also contains the automatic re-initialisation loop that
recovers pathways whose posterior collapsed to a single curve. Like
[[trac-preproc]], it is a tool-chaining script and is normally invoked only by
`trac-all`.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/trac-paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths)
- **Script location:** `$FREESURFER_HOME/bin/trac-paths`
- **Original author:** Anastasia Yendiki (MGH)
- **Invoked by:** [[wiki/pipelines/trac-all|trac-all]] (the `-path` stage), which writes `scripts/dmrirc.local` and passes it via `-c`.
- **Tools it drives:** [`dmri_bset`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L212), [`dmri_paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L415) (the MCMC engine), [`trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L405) (re-run for prior re-initialisation), [`dmri_trk2trk`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L535) (map mean reference paths), [`dmri_pathstats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L570), [`mri_vol2surf`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L618), `fscalc`, [`mri_binarize`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L644), [`mri_cor2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L657), [`mri_label2label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L668), [`mris_anatomical_stats`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L679), [`dmri_mergepaths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L700), and FSL `fslstats`/`fslmaths`.

## Purpose and Context

After [[trac-preproc]] has corrected the diffusion data, registered it to a
template, fitted a tensor, and built per-pathway anatomical priors, and after
`bedpostx` has produced the ball-and-stick model, `trac-paths` reconstructs each
pathway. The core is [[dmri_paths]], which runs an anatomically-constrained MCMC
that draws samples of the pathway consistent with both the diffusion orientation
distribution and the spatial/anatomical prior, yielding a voxelwise posterior
probability map (`path.pd.nii.gz`), a maximum-a-posteriori path (`path.map`), and a
spline. `trac-paths` then turns those into the quantitative outputs used for group
analysis.

Separating step 3 lets [[wiki/pipelines/trac-all|trac-all]] submit one
`trac-paths` per subject independently after the (cluster-heavy) bedpost step.

> [!gotcha] Designed to be called only by trac-all
> The help states: "This script is called by trac-all. Trac-all makes sure that a
> proper configuration file is written locally (scripts/dmrirc.local) and passed
> as an argument to this script." ([`scripts/trac-paths#L1371-L1373`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L1371-L1373)).

## Inputs

### Required Inputs

- **A sourced configuration file** (`-c <dmrirc.local>`): the only command-line
  requirement.
- **Completed [[trac-preproc]] outputs** for the subject: the corrected DWI
  (`dmri/dwi.nii.gz` + tables), the brain mask, the diffusion↔anatomical and
  diffusion↔template transforms in `dmri/xfms/`, the tensor fit
  (`dmri/dtifit*`), and the per-pathway priors / end ROIs / initial control
  points in `dlabel/<xspace>/` and `dlabel/diff/`.
- **The bedpostX directory** `dmri.bedpostX/` (from the `-bedp` stage).
- **The FreeSurfer recon** at `$SUBJECTS_DIR/$subj` (for the surface projection of
  endpoints: white surfaces and registration).
- **The training atlas** (`trainsubjlist`, `pathlist`, `ncpts`, `gmids`) as
  resolved by `trac-all`.

### Input Assumptions

> [!assumption] Pre-processing and bedpost already done
> `trac-paths` assumes [[trac-preproc]] and `bedpostx` have completed for this
> subject. It does *not* recompute corrections; it only re-selects the DWI subset
> (re-creating the `data.nii.gz`/`bvecs`/`bvals` symlinks) and runs the
> tractography. The presence of `dmri.bedpostX/` and the prior files is assumed.

## Outputs

### Files Created

For each pathway `<path>` and atlas mode `<avgmode>` (= `avg<ntrain>_<xspace>_<reg>`),
under `<dtroot>/<subj>/dpath/<path>_<avgmode>/`:

| File | Contents |
|------|----------|
| `path.pd.nii.gz` | voxelwise posterior probability of the pathway (the path distribution) |
| `path.map.nii.gz`, `path.map.txt` | maximum-a-posteriori (MAP) pathway volume and point list |
| `path.ref.txt` | reference path for along-tract analysis, mapped from the atlas mean ([[dmri_trk2trk]]) |
| `pathstats.overall.txt` | whole-path measures (FA, MD, AD, RD, length, count, …) for this subject ([[dmri_pathstats]]) |
| `pathstats.byvoxel.txt` | along-the-path measures sampled at each point ([[dmri_pathstats]]) |
| `endpt{1,2}.pd.nii.gz` | endpoint posterior maps |
| `endpt{1,2}.surf.{mgz,bin.mgz}` | endpoints projected to the cortical surface |
| `endpt{1,2}.surf.label` | surface label of the endpoint termination zone |
| `endpt{1,2}.surf.stats` | `mris_anatomical_stats` over the endpoint label |

And once per atlas mode in `dpath/` (or its `<nsample>samp/<ptype>/` subdir when
`dopathsubdirs=1`):

| File | Contents |
|------|----------|
| `merged_<avgmode>.mgz` | all reconstructed pathways merged into one labelled 4D volume, with the FreeSurfer colour LUT ([[dmri_mergepaths]]) |

### Output Specifications

Pathway distributions and endpoint maps are NIfTI-GZ in diffusion space; the
merged label volume is MGZ. Surface outputs are MGZ overlays and FreeSurfer
`.label` files in the subject's surface space. The stats files are plain text in
the column format read by [[tractstats2table]].

## Mathematical Foundations

The tractography mathematics is **not** in this script.

> [!internal] The MCMC sampler lives in dmri_paths
> The constrained global-probabilistic tractography — sampling pathways from the
> posterior given the ball-and-stick orientations and the anatomical/spatial prior,
> via Markov-chain Monte Carlo — is implemented in [[dmri_paths]]. The spline
> parameterisation is in [[dmri_spline]]; the along-tract and whole-tract scalar
> statistics in [[dmri_pathstats]]. See those pages.

`trac-paths` does compute two quantitative quantities directly:

> [!math] Endpoint surface scaling and the degenerate-path test
> Endpoint posteriors are projected to the surface by averaging over
> $n_{\text{proj}}=(\text{projmax}-\text{projmin})/\text{dproj}+1$ samples along the
> surface normal ([`scripts/trac-paths#L632`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L632), defaults
> $\text{projmin}=-3,\ \text{projmax}=3,\ \text{dproj}=0.1$), then multiplied back
> by $n_{\text{proj}}$ to recover a count. A pathway is flagged as **degenerate**
> (needing re-initialisation) when its posterior thresholded at $0.2\times$ its
> maximum has the same nonzero volume as the MAP path — i.e. the distribution is no
> wider than a single curve ([`scripts/trac-paths#L479-L497`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L479-L497)).

## Configuration Options

### Complete Flag Reference

`trac-paths` takes only run-control flags; **all analysis parameters come from the
sourced config**. Flags parsed at
[`scripts/trac-paths#L1224-L1313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L1224-L1313):

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-c <file>` | string | *(required)* | Configuration (dmrirc.local) file to source; must exist and be readable. |
| `-log <file>` | string | `<dir(rcfile)>/trac-all.log` | Log file path. |
| `-nolog` | bool | log on | Send the log to `/dev/null`. |
| `-cmd <file>` | string | `<dir(rcfile)>/trac-all.cmd` | Command-record file. |
| `-nocmd` | bool | cmd on | Send the command record to `/dev/null`. |
| `-no-isrunning` | bool | check on | Do not create/check the `IsRunning.trac` lock. |
| `-time`<br>`-notime` | bool | off | Wrap main commands in `fs_time`. |
| `-umask <mask>` | string | `002` | Unix file-permission mask. |
| `-grp <gid>` | string | — | Assert current primary group equals `<gid>`. |
| `-allowcoredump` | bool | off | `limit coredumpsize unlimited`. |
| `-debug` | bool | off | Verbose output; also passed to [[dmri_paths]] as `--debug`. |
| `-dontrun` | bool | run | Echo every command without executing. |
| `-onlyversions` | bool | off | Sets `DoVersionsOnly`. |
| `-version` | bool | — | Print script version and exit. |
| `-help` | bool | — | Print the full help and exit. |

(As in [[trac-preproc]], a literal `;` token terminates the parse loop so
`trac-all` can chain invocations.)

### Configuration Interactions

The behaviour is governed by the **config variables**:

- **`bmax`/`bshell`** select the DWI subset via [[dmri_bset]] (re-creating the
  `data.nii.gz`/`bvecs`/`bvals` symlinks); absent both, all DWIs are used
  ([`scripts/trac-paths#L207-L260`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L207-L260)).
- **Prior type** (`dosegprior`/`dotangprior`/`doxyzprior`) chooses which priors are
  passed to [[dmri_paths]] (`--nprior`/`--lprior`/`--seg`, `--tprior`/`--cprior`,
  or `--prior`) and, with `dopathsubdirs=1`, names the output subdirectory
  (`seg14`/`tang`/`xyz`/`none`/combinations).
- **`overwrite`** controls collision handling: `1` deletes a pre-existing pathway
  directory, `0` renames it to `<dir>.v<N>` ([`scripts/trac-paths#L363-L386`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L363-L386)).
- **`usetrunc`** switches the prior file names to the `_all` (truncated-spline)
  variants.
- **`usemaskanat`** selects the brain mask (anatomical-seg mask vs low-b BET mask).
- **`nburnin`/`nsample`/`nupdate`/`nkeep`** are the MCMC counts handed to
  [[dmri_paths]] (`--nb/--ns/--nu/--nk`).
- **`doinitprop`** adds the per-control-point std-dev files (`--sdp`) for proposal
  initialisation.

> [!gotcha] Re-initialisation re-runs trac-preproc and can loop up to 5 times
> When a pathway is flagged degenerate, `trac-paths` writes a `dmrirc.local.reinit`
> that forces `dopriors=1`/`reinit=1` and re-runs [[trac-preproc]] to rebuild the
> priors with a fresh spline initialisation, then re-runs [[dmri_paths]] — up to 5
> repetitions ([`scripts/trac-paths#L394-L526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L394-L526)). This is the script's most
> surprising control-flow: a tractography step that calls the pre-processing step.

> [!gotcha] Endpoint surface projection is skipped for some pathways
> Cerebellar pathways (`mcp`) are skipped entirely for surface projection, and
> non-cortical endpoints of specific tracts are skipped per endpoint (e.g. the
> thalamic end of `*.ar`, the brainstem end of `*.cst`, the subcortical end of
> `*.fx`/`*.or`/`*.atr`) ([`scripts/trac-paths#L586-L615`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L586-L615)). Inter-hemispheric
> pathways (`cc.*`, `acomm`) are handled with both hemispheres.

## Typical Use Cases

### 1. As run by trac-all (the normal path)

```bash
# trac-all writes dmrirc.local and calls:
trac-paths -c $SUBJECTS_DIR/subj01/scripts/dmrirc.local \
  -log $SUBJECTS_DIR/subj01/scripts/trac-all.log \
  -cmd $SUBJECTS_DIR/subj01/scripts/trac-all.cmd
```

### 2. Re-run one subject's tractography standalone

```bash
# Requires completed trac-preproc + bedpostx and a valid dmrirc.local.
trac-paths -c $SUBJECTS_DIR/subj01/scripts/dmrirc.local -no-isrunning
```

## Pipeline Context

`trac-paths` is **step 3** of TRACULA, invoked by the
[[wiki/pipelines/trac-all|trac-all]] `-path` stage.

**Predecessor:** [[trac-preproc]] (step 1) and `bedpostx` (step 2), all driven by
[[wiki/pipelines/trac-all|trac-all]] → **trac-paths** (MCMC tractography + per-path
stats) → **Successor:** [[wiki/pipelines/trac-all|trac-all]] `-stat` (cohort tables
via [[dmri_group]]) and then [[tractstats2table]].

It is **not** part of [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] Output layout depends on dopathsubdirs
> With `dopathsubdirs=0` (default) results go directly in `dpath/<path>_<avgmode>/`.
> With `dopathsubdirs=1` they nest under `dpath/<nsample>samp/<ptype>/…`, where
> `<ptype>` encodes the prior combination. Downstream tools must be pointed at the
> matching directory.

> [!gotcha] Reference path requires the training atlas mean tracks
> The along-tract reference (`path.ref.txt`) is only created if the training
> directory's `<xspace>/<path>.mean.trk` exists
> ([`scripts/trac-paths#L529-L560`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L529-L560)); otherwise along-tract stats fall back to the
> path's own MAP frame.

## Error Compensation and Guard Rails

- **Degenerate-pathway recovery** via the up-to-5× re-initialisation loop (see
  above), which drops only the offending pathways from the lists and retries them
  ([`scripts/trac-paths#L469-L526`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L469-L526)).
- **Non-destructive overwrite** option (`overwrite=0` renames to `.v<N>`).
- **Empty-endpoint guard**: if a projected endpoint label has zero surface
  vertices it is skipped rather than erroring
  ([`scripts/trac-paths#L654-L655`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L654-L655)).
- **Per-pathway existence checks** (`-e path.map.txt`, `-e path.pd.nii.gz`) skip
  pathways that did not reconstruct, so one failed tract does not abort the rest.
- On any error the script writes `scripts/trac-all.error`, removes the lock, and
  exits 1 (`error_exit`, [`scripts/trac-paths#L1195-L1221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L1195-L1221)).

## Known Bugs

- [[00183]] — in the longitudinal branch, `mris_anatomical_stats` is passed `$subj` (base subject) instead of `$subj_t` (timepoint), so endpoint surface stats are computed against the wrong subject.

## Related Tools

- [[wiki/pipelines/trac-all|trac-all]] — the orchestrator that writes `dmrirc.local` and calls this script.
- [[trac-preproc]] — the step-1 sibling (also re-invoked here for prior re-initialisation).
- [[dmri_paths]] — the constrained-MCMC tractography engine that does the reconstruction.
- [[dmri_pathstats]] — whole-path and along-path anisotropy/diffusivity measures.
- [[dmri_mergepaths]] — merges all pathways into one labelled volume.
- [[dmri_trk2trk]] — maps the atlas mean tracks into the subject for along-tract referencing.
- [[mri_vol2surf]], [[mri_cor2label]], [[mri_label2label]], [[mris_anatomical_stats]] — endpoint-to-surface projection and labelling.
- [[tractstats2table]] — turns the resulting `pathstats.*.txt` into a group table.

## Confidence and Gaps

**High confidence:** the per-pathway reconstruction loop, the
[[dmri_paths]]/[[dmri_pathstats]]/[[dmri_mergepaths]] invocations, the
endpoint-surface projection and its skip rules, the degenerate-path
re-initialisation logic, the output layout, and the full run-control flag set —
all read directly from
[`scripts/trac-paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths).

> [!gap] Longitudinal branch not executed
> The `dolong` (longitudinal) reconstruction branch and its CVS/SyN/FNIRT transform
> chains were read but not run end-to-end. One `mris_anatomical_stats` call in that
> branch passes `$subj` rather than the time-point `$subj_t`
> ([`scripts/trac-paths#L1134-L1137`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths#L1134-L1137)), which looks like a latent bug; not
> verified here.

## References

- FreeSurfer source: [`scripts/trac-paths`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-paths) (v8.2.0).
- Companion: [`scripts/trac-all`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-all), [`scripts/trac-preproc`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/trac-preproc), `dmrirc.example`.
- Yendiki A. et al. *Front. Neuroinform.* 5:23 (2011) — TRACULA.
