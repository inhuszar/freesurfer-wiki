---
title: "mri_ca_label"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_ca_label/mri_ca_label.cpp"
families:
  - "mri_ca_*"
  - "mri_*"
recon_all_stage: "autorecon2"
related:
  - "[[mri_em_register]]"
  - "[[mris_ca_label]]"
  - "[[mri_normalize]]"
  - "[[recon-all]]"
status: review
confidence: medium
last_agent_update: 2026-04-14
gaps:
  - "GCA atlas MAP labeling with Gibbs MRF priors — full derivation in shared gca lib not traced"
  - "renormalize_align (-align) procedure: full renormalisation algorithm not traced"
  - "nowmsa effect: which WMSA labels are removed from the atlas"
  - "relabel_unlikely: full re-labeling algorithm not traced"
tags:
  - segmentation
  - atlas
  - subcortical
  - autorecon2
---

# mri_ca_label

## Summary

`mri_ca_label` performs **subcortical and whole-brain volumetric labeling**
using a [[gca-format|Gaussian Classifier Atlas]] (GCA). Given a normalised T1 volume and a
non-linear warp to MNI305 space (`transforms/talairach.m3z`), it computes the
MAP (maximum a posteriori) label assignment for every voxel by maximising the
posterior probability under a GCA generative model with Gibbs MRF priors.

The primary output is `mri/aseg.auto_noCCseg.mgz` — a whole-brain volumetric
segmentation using the FreeSurfer color lookup table labels. This file is the
starting point for the aseg segmentation (corpus callosum labels are added
subsequently).

## Source Information

- **Language:** C++
- **Source file(s):** `mri_ca_label/mri_ca_label.cpp` (file at
  `mri_ca_label/mri_ca_label.cpp`, 3200+ lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_ca_label`
- **Reference:** Fischl et al. (2002), Neuron, 33:341–355

## Purpose and Context

`mri_ca_label` is the main subcortical atlas-based segmentation tool. It is
analogous to FSL's FIRST or SPM's tissue segmentation, but uses a GCA model
trained on manually labelled data. The GCA encodes, at each location in MNI
space, the prior probability of each anatomical label and the conditional
intensity distribution (Gaussian) for each label.

`mri_ca_label` is called in autorecon2 at the CALabel stage (recon-all line
3004), after:
- `norm.mgz` is available (bias-corrected, normalised T1)
- `transforms/talairach.m3z` is available (non-linear warp to MNI305)

The output is used for:
- WM segmentation assistance (`mri_edit_wm_with_aseg`)
- Pial surface placement constraints
- Cortical parcellation reference (via `AsegForSurf`)
- Corpus callosum labeling (subsequent step)
- Final `aseg.mgz` (after CC segmentation and reprocessing)

## Inputs

### Required Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `norm.mgz` | 1 | Bias-corrected, intensity-normalised T1 volume (WM ≈ 110) |
| `transforms/talairach.m3z` | 2 | Non-linear morphing transform to MNI305 space |
| `$GCA` | 3 | GCA atlas file (default: `RB_all_2020-01-02.gca`) |
| `aseg.auto_noCCseg.mgz` | 4 | Output volumetric segmentation |

### Input Assumptions

> [!assumption] Volume must be normalised to WM ≈ 110
> The GCA intensities are trained assuming WM = 110. The input must be
> the output of [[mri_normalize]] (or [[mri_nu_correct.mni]] followed by
> normalisation). Unnormalised volumes will produce poor segmentation.

> [!assumption] Non-linear warp required
> The GCA lookup is in atlas (MNI305) space. Without a valid `talairach.m3z` ([[m3z-format]]),
> the atlas prior is inapplicable. The tool requires `gcamorph.h` functionality.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `mri/aseg.auto_noCCseg.mgz` | [[mgz]] (INT) | Per-voxel anatomical label; labels from `FreeSurferColorLUT.txt` |
| `mri/aseg.auto_noCCseg.label_intensities.txt` | text | WM/GM intensity estimates per structure (written in longitudinal mode) |

## Mathematical Foundations

### GCA MAP Labeling

For each voxel $v$ at MNI-space position $x = T(v)$ (where $T$ is the
non-linear warp), the GCA provides:

1. **Prior** $p(l | x)$: probability of label $l$ at atlas location $x$
2. **Likelihood** $p(I(v) | l, x) = \mathcal{N}(I(v); \mu_{l,x}, \sigma^2_{l,x})$:
   Gaussian intensity model

The MAP label assignment maximises the posterior:

$$l^*(v) = \arg\max_l \; p(l | x) \cdot p(I(v) | l, x) \cdot \prod_{v' \in \mathcal{N}(v)} p(l | l_{v'})$$

The last term is the **Gibbs MRF prior**: the label probability conditioned on
the labels of neighbouring voxels $\mathcal{N}(v)$ (6-connected neighbourhood).
The `PRIOR_FACTOR` (default `1.0`, set by `-prior <f>`) scales the prior weight
relative to the data likelihood.

> [!gap] Full GCA MAP derivation not traced
> The complete implementation of `GCAcomputeMLElabels()`, the MRF Gibbs
> prior, and the ICM (Iterated Conditional Modes) optimisation are in the
> shared GCA library (`gca.c`). These were not traced in this session.

### Unlikely voxel re-labeling (`-relabel_unlikely`)

After the initial MAP labeling, voxels with low posterior probability under
their assigned label are re-labelled using a window-based approach:

```
-relabel_unlikely <window_size> <prior_thresh>
```

Default in recon-all: `-relabel_unlikely 9 .3`

Voxels where the GCA prior for the assigned label is below `prior_thresh`
(0.3) within a `window_size` (9 voxel) neighbourhood are relabelled.

### Atlas-guided renormalisation (`-align`)

When `-align` is specified (default in [[recon-all]] via `UseCAAlign = (-align)`),
the tool renormalises the GCA intensity models using structure-specific
alignment. Internally it sets `regularize = 0.5`, `regularize_mean = 0.5`,
`avgs = 2`, and `renormalize_align = 1`, equivalent to
`-renormalize -regularize_mean 0.5 -regularize 0.5 -a 2`. This improves
segmentation when the subject's intensity distribution differs from the
training-data mean.

## Configuration Options

The four positional arguments are required and must appear in order. All other
flags are case-insensitive (the parser uses `stricmp`). Flag names below use the
canonical lower-case form; `-PRIOR` and `-prior` are equivalent.

### Positional arguments

| Argument | Position | Description |
|----------|----------|-------------|
| `invol`  | 1 | Input normalised T1 volume (typically `norm.mgz`). Multi-input usage is supported when the GCA was trained on multiple modalities. |
| `xform`  | 2 | Non-linear morph (`talairach.m3z`) or `none` to skip warp loading. |
| `gca`    | 3 | Path to the GCA atlas file. |
| `outvol` | 4 | Output segmentation volume (MGZ). |

### Atlas and likelihood options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-prior <f>` | float | 1.0 | Sets the global Gibbs prior factor `PRIOR_FACTOR` that multiplies the MRF neighbourhood term relative to the data likelihood. Higher values weight neighbour-label compatibility more strongly. |
| `-nogibbs` | bool | OFF | Disable Gibbs MRF priors entirely (each voxel labelled by data likelihood × unary atlas prior only). |
| `-novar` | bool | OFF | Drop the variance term from the Gaussian likelihood (use means only). |
| `-pthresh <f>` | float | 0.7 | Posterior threshold used during adaptive renormalisation. |
| `-niter <n>` | int | 2 | Number of MLE iterations applied after MAP labeling. |
| `-n <n>` | int | 200 | Maximum number of Gibbs/ICM iterations (`max_iter`). |
| `-a <n>` | int | 0 | Apply a mean filter `n` times to the conditional densities before labeling. |
| `-gsmooth <sigma>` | float | -1 (off) | Gaussian-smooth the GCA conditional densities with the given sigma (mm). |
| `-regularize <f>` | float | 0 | Mix per-class and pooled covariances: `(1-f)·C_class + f·C_pooled`. |
| `-regularize_mean <f>` | float | 0 | Mix global and local class means: `f·μ_global + (1-f)·μ_local`. |
| `-relabel_unlikely <wsize> <prior_thresh>` | int, float | OFF (default `wsize=9`, `prior_thresh=0.3` if enabled) | Re-label voxels whose GCA prior under their assigned label is below `prior_thresh`, using a `wsize`³ neighbourhood. |
| `-nocerebellum` | bool | OFF | Remove cerebellum labels from the atlas before labeling. |
| `-nohippo` | bool | OFF | Disable the post-hoc hippocampus auto-edit step. |
| `-nowmsa` | bool | OFF | Remove all WMSA (white matter signal abnormality) labels from the atlas before labeling. |
| `-wmsa` | bool | OFF | Run a WM/WMSA relabeling postprocessing pass (requires multi-channel input with T2/PD). |
| `-bigventricles` | bool | OFF | Enable special handling for expanded ventricles. |
| `-nobigventricles` | bool | ON | Disable expanded ventricle handling. |
| `-expand` | bool | OFF | Expand ventricles in postprocessing. |
| `-fcd` | bool | OFF | Run focal cortical dysplasia detection postprocessing. |
| `-lh` | bool | OFF | Remove right-hemisphere labels (label LH only). |
| `-rh` | bool | OFF | Remove left-hemisphere labels (label RH only). |
| `-conform` | bool | OFF | Resample input volume(s) to 256³, 1 mm³ before labeling. |
| `-vent_topo_dist <f>` | float | 3.0 | Ventricle topology distance threshold (mm). |
| `-vent_topo_volume_thresh1 <f>` | float | 50.0 | Ventricle topology volume threshold 1 (mm³). |
| `-vent_topo_volume_thresh2 <f>` | float | 100.0 | Ventricle topology volume threshold 2 (mm³). |

### Renormalisation / cross-sequence options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-align` / `-align-after` / `-align-cross-sequence` | bool | OFF | Renormalise GCA intensity models using structure-aligned class statistics. Equivalent to setting `-renormalize`, `-regularize_mean 0.5`, `-regularize 0.5`, and `-a 2`. Used by `recon-all` (UseCAAlign default). |
| `-no_old_renormalize` | bool | OFF | Skip the initial `GCAmapRenormalize()` call when `-align` is in effect. |
| `-cross-sequence` / `-cross_sequence` | bool | OFF | Cross-sequence labeling preset: equivalent to `-renormalize 1 9 -a 2 -regularize 0.5`. |
| `-cross-sequence-new` / `-cross_sequence-new` | bool | OFF | Same as above but uses the new renormalisation routine. |
| `-renorm <fname>` / `-renormalize <fname>` | string | — | Renormalise using predicted intensity values from the named file. |
| `-renormalize_iter <wsize> <iter>` | int, int | — | Renormalise class means `iter` times after initial labeling using a `wsize` window. |
| `-write_renorm <file>` | string | — | Write renormalised GCA to `file`. |
| `-read_renorm <file>` | string | — | Read renormalised GCA from `file`. |
| `-save_gca <file>` | string | — | Save the (renormalised) GCA used for labeling to `file`. |
| `-histo-norm` | bool | OFF | Use prior subject histograms for initial GCA renormalisation. |
| `-h` | bool | OFF | Use the GCA to histogram-normalise the input image. |
| `-heq <template>` | string | — | Read template volume for histogram equalisation. |
| `-lscale <label> <scale>` | int, float | 1.0 per label | Scale the GCA mean intensity for one label by `scale`. May be repeated. Implicitly enables rescaling. |

### MR-physics / FLASH options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-tr <ms>` | float | -1 | TR in ms (used with FLASH forward model). |
| `-te <ms>` | float | -1 | TE in ms. |
| `-alpha <deg>` | float | -1 | Flip angle in degrees (stored as radians). |
| `-flash` | bool | OFF | Use FLASH forward model to predict intensities. |
| `-flash_parms <file>` | string | — | FLASH tissue parameters file. |
| `-normpd` | bool | OFF | Normalise PD image (2nd input) to GCA means. |

### Input / longitudinal / auxiliary options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-r <fname>` | string | — | Read a previously labelled volume to seed labeling. |
| `-l <label_fname> <reg_fname>` | string, string | — | Longitudinal mode: tp1 label volume and the linear transform from tp1 to current study. |
| `-ri <intensities>` / `-read_intensities <file>` | string | — | Read label-intensity scaling file (may be repeated, up to `MAX_READS=100`). |
| `-wm <fname>` | string | — | Insert white-matter segmentation from the named volume. |
| `-fwm <fname>` | string | — | Insert a fixed (held constant) white-matter segmentation. |
| `-mri <fname>` | string | — | Build the most-likely MR volume from the labelled output and write it to `fname`. |
| `-m <fname>` | string | — | Mask the final labeling with the named volume. |
| `-tl <gca>` | string | — | Auxiliary GCA used to label thin temporal lobe. |
| `-surf <dir> <name>` | string, string | — | Use surfaces `?h.<name>` from `<dir>` (used for cortex/WMSA constraints). |
| `-sd <dir>` | string | env | Override `SUBJECTS_DIR`. |
| `-example <T1> <seg>` | string, string | — | Use the given T1 and segmentation as an example pair. |
| `-insert-from-seg <seg> <idx1> [idx2 ...]` | string, ints | — | Copy the listed label indices from `seg` into the output. |
| `-sa-insert-from-seg <seg> <idx1> [...] <inseg> <outseg>` | strings | — | Stand-alone variant: read `inseg`, insert from `seg`, write `outseg`, and exit. |
| `-cblum-from-seg <seg>` | string | — | Insert cerebellum cortex/WM (labels 7, 8, 46, 47) from `seg`; zero CSF voxels (24) where `seg` says cerebellum. |
| `-sa-cblum-from-seg <seg> <inseg> <outseg>` | strings | — | Stand-alone version of `-cblum-from-seg`; exits after writing. |
| `-insert-wm-bet-putctx <topo>` | int | — | Insert WM between putamen and cortex with the given neighbourhood topology. |
| `-sa-insert-wm-bet-putctx <segvol> <topo> <outsegvol> <psfile>` | strings | — | Stand-alone variant; exits after writing. |
| `-sa-aqueduct <asegvol> <norm> <outsegvol>` | strings | — | Stand-alone aqueduct segmentation; exits after writing. |
| `-vent-fix <niters> <nmax> <topo>` | int, int, int | — | Iteratively grow ventricle labels into 0-valued voxels (typical: `-1 7000 1`). |
| `-sa-vent-fix <niters> <nmax> <topo> <inseg> <brainmask> <outseg>` | mixed | — | Stand-alone variant of `-vent-fix`; exits after writing. |

### Output and diagnostic options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-write_probs <prefix>` | string | — | Write per-label posterior probability maps. |
| `-write_likelihood <fname>` | string | — | Write per-voxel image likelihood under the chosen labeling. |
| `-wmsa_probs <fname>` | string | — | Write WMSA posterior probability map. |
| `-pregibbs <fname>` | string | — | Write the pre-Gibbs labeling to `fname`. |
| `-w <iters> <fname>` | int, string | — | Write Gibbs/ICM snapshots every `iters` iterations to `fname`. |
| `-e <n>` | int | 0 | Set the `expand_flag` value (border expansion). |
| `-f` | bool | OFF | Apply a thresholded mode filter to the output of labeling (current build hard-codes `filter=1`). |
| `-rusage <fname>` | string | — | Write resource-usage statistics to `fname`. |
| `-threads <n>` | int | OMP env | Set the number of OpenMP threads. |
| `-debug_voxel <x y z>` | int×3 | — | Verbose debug output at voxel `(x,y,z)`. |
| `-debug_node <x y z>` | int×3 | — | Verbose debug output at GCA node `(x,y,z)`. |
| `-debug_prior <x y z>` | int×3 | — | Verbose debug output at GCA prior `(x,y,z)`. |
| `-debug_label <l>` | int | — | Verbose debug output for label `l`. |
| `-debug` | bool | OFF | Enable `DIAG_WRITE | DIAG_VERBOSE_ON`. |
| `-v <n>` | int | — | Set `Gdiag_no` (per-voxel diagnostic id). |
| `-help` / `-usage` / `-u` / `-?` | bool | — | Print help XML and exit. |

### Configuration Interactions

> [!gotcha] -align is on by default in recon-all via UseCAAlign
> `recon-all` sets `UseCAAlign = (-align)`, so the `-align` flag is normally
> passed. Internally it is equivalent to enabling `-renormalize`, setting
> `-regularize_mean 0.5`, `-regularize 0.5`, and `-a 2`. There is no
> dedicated `-no-align` switch in the binary; to disable, edit the recon-all
> invocation. `-no_old_renormalize` only suppresses the *initial*
> `GCAmapRenormalize()` call inside the `-align` path.

> [!gotcha] -prior is a Gibbs weight, not a threshold
> Despite the name, `-prior <f>` sets `PRIOR_FACTOR` (default `1.0`), the
> scalar weight applied to the Gibbs MRF neighbourhood term during MAP
> optimisation. It is *not* an acceptance threshold. The threshold used by
> `-relabel_unlikely` is the second positional argument to that flag
> (`prior_thresh`, default `0.3` when enabled).

> [!gotcha] -lh and -rh are mutually exclusive in practice
> `-lh` removes RH labels from the atlas; `-rh` removes LH labels. Specifying
> both leaves no anatomical labels and produces an empty segmentation.

> [!gotcha] -nowmsa removes WMSA labels from atlas
> When enabled, WMSA (white matter signal abnormality) labels are removed from
> the GCA model before labeling. Useful in subjects where WMSA would otherwise
> cause misclassification of normal white matter. Mutually exclusive in spirit
> with `-wmsa` (which performs WM/WMSA relabeling postprocessing).

> [!gotcha] Stand-alone (-sa-*) flags exit immediately
> All flags prefixed `-sa-` (`-sa-insert-from-seg`, `-sa-cblum-from-seg`,
> `-sa-insert-wm-bet-putctx`, `-sa-aqueduct`, `-sa-vent-fix`) perform a
> single utility operation and call `exit()` before any GCA labeling occurs.
> The four positional GCA arguments are not required when these are used.

## Typical Use Cases

### Use Case 1: Standard recon-all subcortical segmentation

```bash
mri_ca_label -relabel_unlikely 9 .3 -prior 0.5 -align \
    norm.mgz transforms/talairach.m3z \
    $FREESURFER_HOME/average/RB_all_2020-01-02.gca \
    aseg.auto_noCCseg.mgz
```

## Pipeline Context

**autorecon2 — CALabel stage** (recon-all lines 3001–3040)

```
mri_em_register → transforms/talairach.lta
mri_ca_normalize → norm.mgz
mri_ca_register → transforms/talairach.m3z
                         ↓
mri_ca_label -relabel_unlikely 9 .3 -prior 0.5 [-align] \
    norm.mgz transforms/talairach.m3z $GCA aseg.auto_noCCseg.mgz
                         ↓
              aseg.auto_noCCseg.mgz
```

Default GCA file: `$GCADIR/$GCA` where `GCADIR` is typically
`$FREESURFER_HOME/average` and `GCA` is `RB_all_2020-01-02.gca`.

**Predecessors:** `mri_ca_register` (non-linear warp), [[mri_normalize]] (norm.mgz)
**Successors:** `mri_cc` (corpus callosum), `mri_edit_wm_with_aseg`

## Gotchas and Caveats

> [!gotcha] Output excludes corpus callosum labels
> The output is named `aseg.auto_noCCseg.mgz` because corpus callosum
> labels (251–255) are not assigned by `mri_ca_label`. They are added by
> the subsequent `mri_cc` step. The final `aseg.mgz` with CC labels is
> produced later.

> [!gotcha] WMSA labels may be present
> Unless `-nowmsa` is specified, the GCA atlas includes WMSA labels
> (77, 78, 79 in the FreeSurfer LUT). In subjects without actual WMSA,
> these voxels may be incorrectly labeled.

## Related Tools

- [[mri_em_register]] — linear registration to GCA atlas (prerequisite)
- [[mris_ca_label]] — cortical parcellation on the surface (complementary)
- [[mri_normalize]] — produces the `norm.mgz` input

## Confidence and Gaps

Confidence **medium** — recon-all call sites and flag semantics read from
source. Full GCA MAP algorithm and renormalization details are in shared lib.

## References

- Fischl, B., Salat, D.H., Busa, E., Albert, M., Dieterich, M., Haselgrove,
  C., van der Kouwe, A., Killiany, R., Kennedy, D., Klaveness, S., et al.
  (2002). *Whole Brain Segmentation: Automated Labeling of Neuroanatomical
  Structures in the Human Brain.* Neuron, 33:341–355.
