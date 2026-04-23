---
title: "mri_watershed"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_watershed/mri_watershed.cpp"
  - "mri_watershed/mri_watershed.help.xml"
families:
  - "mri_*"
recon_all_stage: "autorecon1"
related:
  - "[[recon-all]]"
  - "[[mri_normalize]]"
  - "[[mri_em_register]]"
  - "[[mri_synthstrip]]"
  - "[[mri_ca_label]]"
  - "[[freeview-editing]]"
status: draft
confidence: high
last_agent_update: 2026-04-14
gaps:
  - "Trace of the deformable surface fitting (template deformation region params, preweight, basinprior) not done in detail — these live in helper functions beyond line 965"
  - "The 'brain atlas' path (-brain_atlas gca xform) and how it composes with the classical watershed are documented at high level only"
  - "mri_validate_skull_stripped.cpp is a companion binary whose role is not yet documented"
  - "Default values for -w, -b, -h are *conditional* on whether -brain_atlas was passed; the help text's 'defaults' are post-atlas-override values"
tags:
  - skull-stripping
  - watershed
  - brain-extraction
  - autorecon1
---

# mri_watershed

## Summary

`mri_watershed` is FreeSurfer's classical skull-stripping tool. It
takes a (bias-corrected) T1-weighted MRI volume, identifies the
brain tissue with a hybrid watershed-plus-deformable-surface
algorithm, and produces an output volume in which non-brain voxels
(skull, scalp, neck, eyes, dura, CSF outside the brain) are zeroed.
It is based on the paper:

> Ségonne, F., Dale, A. M., Busa, E., Glessner, M., Salvolini, U.,
> Hahn, H. K., & Fischl, B. *A hybrid approach to the skull-stripping
> problem in MRI*. NeuroImage 22(3):1160–1075, 2004.

The algorithm runs in three conceptual stages:

1. **Watershed segmentation** of the intensity basins to find the
   largest connected "brain basin" and a preliminary mask.
2. **Template-deformed surface fitting**: a spherical surface is
   fitted and deformed under a force field derived from image
   gradients, regularised against the statistics of a pre-computed
   surface template. With the `-atlas` flag (the default in
   `recon-all`) a GCA prior is used to correct the surface.
3. **Atlas-guided correction** (optional but on by default in
   `recon-all`): if the user passed `-brain_atlas <gca> <xform>`,
   the GCA prior is used both to seed the initial brain mask and to
   prevent the surface from leaking into non-brain regions.

Within [[recon-all]]'s autorecon1 Stage 5 it is called as:

```bash
mri_watershed -T1 \
    -brain_atlas $FREESURFER_HOME/average/<GCASkull> \
    transforms/talairach_with_skull.lta \
    T1.mgz brainmask.auto.mgz
```

The `talairach_with_skull.lta` input is produced by a prior
[[mri_em_register]] `-skull` call. The output `brainmask.auto.mgz`
is then `cp`'d to `brainmask.mgz` for downstream use.

In FreeSurfer 7+ / 8 the SynthStrip short-circuit
([[mri_synthstrip]]) is an alternative that bypasses `mri_watershed`
entirely when `-use-synthstrip` is passed.

## Source Information

- **Language:** C++ (with extensive use of the C `MRI` API; OpenMP
  hooks via `affine.hpp` on non-PPC / non-ARM64 architectures).
- **Source file(s):**
  - `mri_watershed/mri_watershed.cpp` — 11400 lines. Contains all
    of the watershed, deformable-surface, atlas-guided correction,
    and edit-preserving logic. `main()` at line 998; argument
    parser `get_option()` at line 584.
  - `mri_watershed/mri_watershed.help.xml` — XML-rendered help.
  - `mri_watershed/mri_validate_skull_stripped.cpp` — small
    companion utility, separately compiled.
- **Binary/script location:** `$FREESURFER_HOME/bin/mri_watershed`
- **Dependencies:** GCA I/O (`gca.h`), surface I/O (`mrisurf.h`),
  surface hashing (`mrishash.h`), icosahedron templates
  (`icosahedron.h`), transform and talairach utilities
  (`transform.h`, `talairachex.h`).

## Purpose and Context

Cortical reconstruction tools rely on a binary brain/non-brain mask
that is tight enough that pial surfaces do not wander into dura or
eye fat, but inclusive enough that every cortical voxel survives.
Classical intensity thresholds do not work because the T1 intensity
of the skull and dura overlaps the gray-matter range. `mri_watershed`
solves the problem by first finding the largest "brain basin" at a
low intensity pre-flood, then fitting a deformable sphere whose
shape is constrained to match the statistics of a hand-curated
training set. The atlas-aware extension uses a skull-containing GCA
to seed the surface and prevent common failure modes.

The tool predates the modern learning-based skull strippers
([[mri_synthstrip]], FSL BET, HD-BET) by over a decade and is still
the default in `recon-all` v8.2.0, although the `-use-synthstrip`
option is increasingly preferred for noisy or pathological data.
Within `recon-all`, it is the *only* tool that creates the
`brainmask.mgz` that every autorecon2 stage downstream depends on
(unless SynthStrip or a custom `-xmask` is passed).

## Inputs

### Required positional arguments

| Position | Argument | Description |
|---------:|----------|-------------|
| 1 | `<in volume>` | Input (bias-corrected, intensity-normalised) volume. `recon-all` passes `T1.mgz`. |
| 2 | `<out volume>` | Output skull-stripped volume. `recon-all` writes `brainmask.auto.mgz`. |

### Key inputs to behaviour (flags)

| Flag | Description |
|------|-------------|
| `-brain_atlas <gca> <xform>` | Atlas-aware mode. `<gca>` is a GCA that includes skull labels; `<xform>` is the subject→atlas LTA (typically from [[mri_em_register]] `-skull`). Turns on the "atlas correction" path and uses the GCA prior to seed and bound the segmentation. |
| `-T1` | Tells the algorithm that the input is a T1-normalised volume in which WM intensity is ~110. Adjusts the internal intensity thresholds accordingly. This is set by `recon-all` when `INVOL = T1` (the default). |
| `-atlas` | Enables atlas-guided correction of the surface (distinct from `-brain_atlas`: `-atlas` is a flag that sets `parms->atlas = 1`, while `-brain_atlas` actually loads a GCA and transform). |

### Input assumptions

- **T1-weighted contrast** with approximately 1 mm isotropic
  resolution.
- **Bias-corrected** — residual multiplicative non-uniformity
  breaks the watershed basin topology.
- **WM centred at intensity 110** (the downstream tools' canonical
  target). `mri_watershed` tunes its internal histograms around this
  value; a drastically different intensity scale leads to a failed
  fit. Pass an explicit `-t <threshold>` if the WM mode is not at
  110.
- **FOV ≤ 256 mm** — the watershed basin search is heap-bounded
  around a 256³ volume.

> [!assumption] WM at intensity 110
> `-T1` configures the algorithm assuming WM grey value ~110, GM
> ~80–90, CSF ~30, skull ~0 (the post-[[mri_normalize]] scale). The
> `-man <csf_max> <transition> <gm>` flag can override the
> thresholds for edge cases.

## Outputs

### Files Created

| File | Format | Description |
|------|--------|-------------|
| `<out volume>` | MGZ / NIfTI / … | The input volume with non-brain voxels set to 0. Preserved intensities inside the brain. |
| `<surfname>`, `<surfname>_inner_skull_surface`, etc. | FreeSurfer surface | Written when `-surf`, `-brainsurf`, or `-shk_br_surf` are used. |
| Label volume | MGZ | When `-LABEL` is passed, the output volume is labelled: 0 = exterior, 1 = scalp, 2 = skull, 3 = csf, 4 = gray, 5 = white, 6 = fat tissue. |

### Output Specifications

- The output has the **same geometry** as the input (vox2ras,
  dimensions, direction cosines). Only voxel values outside the
  brain are changed, typically to zero.
- The **data type** is preserved from the input.
- The **WM/GM/CSF intensities** inside the brain are preserved;
  `mri_watershed` does not modify them.

## Mathematical Foundations

### Watershed segmentation

The input volume is treated as a topographic surface, where
intensity is "height". The watershed transform floods the volume
from the local minima and assigns each voxel to the basin of the
nearest minimum. The largest basin corresponds to the brain (once
a pre-flood level is subtracted to merge noise-level basins).

The algorithm supports five deformation modes (set by
`parms->template_deformation`):

- `0` (`-wat`): pure watershed, no template deformation.
- `1` (default): watershed + template-deformed surface.
- `2` (`-wat+temp`): watershed + first template smoothing only.
- `3` (`-first_temp`): first template smoothing + local matching.

### Surface template deformation

A spherical "brain surface" is initialised at the watershed
boundary and deformed by a force field whose terms are:

1. **Image gradient attraction**: voxels at the surface are pulled
   toward the nearest high-gradient intensity transition.
2. **Surface smoothness**: a Laplacian regulariser penalises high
   curvature (analogous to a membrane energy).
3. **Shape prior**: the deformed surface is constrained to match
   the statistics of a pre-trained icosahedral surface template
   (the classical `brain.template` file, not loaded here but
   implicit in the tool's parameters).

With `-atlas`, an additional *label* force is added that attracts
the surface toward voxels with high GCA brain prior.

### Atlas-guided correction (`-brain_atlas`)

Given a GCA prior $p(l\mid\mathbf{x})$ and the LTA transform
$\mathbf{M}$ from the subject to the GCA frame, the watershed
boundary is adjusted so that every voxel has brain-prior
$p(\text{brain} \mid \mathbf{M}\mathbf{x}) \ge \tau$ (with an
empirical threshold). This corrects common errors such as
over-stripping the cerebellum or under-stripping the dura.

### Preflooding height (`-h`)

The pre-flood height $H$ (in percent) controls how much the
watershed floods before basin merging starts. A larger $H$ produces
a more inclusive mask (less stripping), a smaller $H$ a more
aggressive one. The raw `init_parms()` default is **25**; this is
overridden to 10 when `-brain_atlas` is supplied (the standard
`recon-all` path) and to 15 when `-T1` is supplied without an
atlas. `recon-all` multi-strip mode (`-multistrip`) runs with
$H\in\{5, 10, 20, 30\}$ in parallel and picks the best result by
likelihood under a brain-atlas model.

> [!internal] Default tuning parameters
> The help text says: *"The default parameters are: -w 0.82 -b
> 0.32 -h 10 -seedpt -ta -wta"*. **These are the values that the
> code installs only when `-brain_atlas` (i.e. `parms->transform`)
> is set.** From `init_parms()`: `hpf=25`, `preweight=0`,
> `basinprior=0`, `preweightemp=0`, `seedprior=0`, `Tregion=0`,
> `threshold_analyze=100`, `dark_iter=10`, `template_deformation=1`,
> `watershed_analyze=1`. Inside `main()` after argument parsing,
> if `parms->transform` is non-NULL the code overrides them to:
> `Tregion=1`, `seedprior=1`, `preweightemp=1`, `basinprior=0.32`,
> `preweight=0.82`, and (if `hpf` is still 25) `hpf=10`. If `-T1`
> is passed without atlas, `hpf=25` is rewritten to `hpf=15`. So
> the "defaults" in the help text only hold for the standard
> `recon-all` invocation; bare `mri_watershed` runs with very
> different parameters.

## Configuration Options

The parser is `get_option()` at `mri_watershed.cpp:584–965`, dispatched
by `main()` (line 1027). Each multi-character flag is matched literally;
single-character flags (`-N`, `-S`, `-C`, `-B`, `-W`, `-R`, `-H`, `-T`)
are routed via the `strlen(option)==1` branch and case-folded with
`toupper()`, so e.g. `-n` and `-N` are equivalent. Unknown options
print "unknown option" and exit. The parser stops at the first
non-option token; the last two positional tokens are the input and
output volume names.

### Atlas inputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-brain_atlas <gca> <xform>` | path, path | none | Load a skull-containing GCA via `GCAread()` and a subject-to-atlas transform via `TransformRead()`. Sets `parms->gca` and `parms->transform`. Inside `main()`, having a non-NULL transform flips on the full atlas-guided pipeline: `Tregion=1`, `seedprior=1`, `preweightemp=1`, and (if not yet set) `basinprior=0.32`, `preweight=0.82`, `hpf=10`. **Used by `recon-all` by default.** |
| `-atlas` | bool flag | off | Sets `parms->atlas = 1`. Distinct from `-brain_atlas`: it does *not* load a GCA or transform; it only flips the "atlas analysis" mode flag, which gates a few code paths but cannot do real GCA-guided correction without `parms->transform`. |
| `-T1` | bool flag | off (set by `recon-all`) | Sets `parms->T1 = 1`. Tells the algorithm the input is a T1-normalised volume with WM near intensity 110 and adjusts the internal histograms accordingly. Also rewrites `parms->hpf` from its default 25 to 15 if no other `-h` was given. |
| `-noT1` | bool flag | off | Sets `parms->noT1analysis = 1`. Skips the T1-segment-analysis stage. |
| `-no_seedpt` | bool flag | off | Sets `parms->seedprior = 0`. Disables the "seed points with atlas (2 in cerebellum)" path that `-brain_atlas` would otherwise enable. |
| `-no_ta` | bool flag | off | Sets `parms->Tregion = 0`. Disables the template-deformation region parameters that `-brain_atlas` would otherwise enable. |
| `-no_wta` | bool flag | off | Sets `parms->preweightemp = 0`. Disables the preweighting in template deformation that `-brain_atlas` would otherwise enable. |

### Deformation modes

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-wat` | bool flag | off | `parms->template_deformation = 0`: pure watershed, no surface deformation. |
| `-wat+temp` | bool flag | off | `parms->template_deformation = 2`: watershed plus first template smoothing only. |
| `-first_temp` | bool flag | off | `parms->template_deformation = 3`: first template smoothing plus local matching only. |
| `-n`<br>`-N` | bool flag | off | `parms->watershed_analyze = 0`: disable the post-watershed analyse step. |
| `-more` | bool flag | `skull_type=0` | `parms->skull_type = 1`. Expands the deformable surface (less aggressive stripping). |
| `-less` | bool flag | `skull_type=0` | `parms->skull_type = -1`. Shrinks the deformable surface (more aggressive stripping). |
| `-copy` | bool flag | off | Sets the global `CopyOnly = 1`. After parsing, `main()` `MRIread()`s the input, `MRIwrite()`s it to the output, and exits. Used when the brain has already been stripped. |

### Preflood, thresholds, geometry, seed points

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-h <int_hpf>` | int (percent) | 25 raw; 10 with `-brain_atlas`; 15 with `-T1` (no atlas) | Sets `parms->hpf`. Watershed preflood height in percent. Larger = more inclusive (less stripping). |
| `-t <threshold>` | int | 100 | Sets `parms->threshold_analyze`. Threshold (percent) used by the post-watershed analyse step. The flag requires `argc >= 5`, so the input/output volumes must already follow it. |
| `-b <basinprior>` | float | 0 raw; 0.32 with `-brain_atlas` | Sets `parms->basinprior`. Atlas-prior basin-merging probability used during basin merging. |
| `-w <preweight>` | float | 0 raw; 0.82 with `-brain_atlas` | Sets `parms->preweight`. Pre-weight of atlas information in the template deformation. The parser refuses to set it twice (a second `-w` exits with "Double definition of the preweight"). |
| `-c <i> <j> <k>` | int, int, int (voxel) | unset (`cx=-1`) | Manually specify the brain centre in voxel coordinates. |
| `-r <int_r>` | int (voxels) | unset (`rb=-1`) | Manually specify the brain radius. |
| `-s <i> <j> <k>` | int, int, int (voxel) | none | Add a seed point. Repeatable, up to **30 seed points**. Each coordinate must be `>= 0`. |
| `-dark <n_iter>` | int | unused (default `dark_iter=10`) | Sets `parms->dark_iter`. Iterations of "move to closest darkest points" pre-processing. |
| `-man <csf_max> <transition> <gm>` | int, int, int | unused | Sets `parms->manual_params=1` plus `manual_CSF_MAX`, `manual_TRANSITION_intensity`, and `manual_GM_intensity`. Bypasses the automatic thresholding when the input is not on the standard FreeSurfer WM≈110 scale. |

### Outputs / QA

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-surf <surfname>` | path/prefix | unset | Sets `parms->brainsurf=1`, `parms->surf=1`, `parms->surfname`. Writes BEM surfaces (brain, inner skull, outer skull, scalp) using the prefix. Combine with `-useSRAS` to write them in surface-RAS coordinates. |
| `-useSRAS` | bool flag | off | Sets `parms->useSRAS=1` and rebinds the global `myWorldToVoxel`/`myVoxelToWorld` function pointers to the surface-RAS variants. Affects how surface vertex positions are mapped to/from voxel space. |
| `-brainsurf <surfname>` | path | unset | Sets `parms->brainsurf=1` and `parms->surfname`. Writes only the brain surface (no skull/scalp BEM). |
| `-shk_br_surf <h> <surfname>` | int (mm), path | unset | Sets `parms->brainsurf=1`, `parms->h_shk = h`, `parms->surfname`. Writes a brain surface shrunk inward by `h` (in mm). |
| `-surf_debug` | bool flag | off | Sets `parms->surf_dbg=1`. Writes surface trace information into the output volume for visualisation/debugging. |
| `-LABEL` | bool flag | off | Sets `parms->label=1`, `parms->brainsurf=1`, `parms->surf=1`. Writes a labelled output volume: 0=exterior, 1=scalp, 2=skull, 3=csf, 4=gray, 5=white, 6=fat tissue. If no `-surf`/`-brainsurf` was set, defaults `surfname="./"`. Assumes no bias field and FGM contrast. |
| `-mask <invol> <outvol>` | path, path | none | After watershed, also masks `<invol>` with the computed brain mask and writes to `<outvol>`. Repeatable; capped at `MAX_MASK_VOLUMES = 50`. |
| `-xmask <vol>` | path | none | Reads `<vol>` immediately via `MRIread()` and stores it in the global `xmasks[]`. Voxels where `xmask > 0` zero the corresponding voxel in the final output. Repeatable; capped at **20** (`MRI *xmasks[20]`). Applied as the *last* step in the pipeline. |
| `-xthresh <f>` | double | unset (`xthreshset=0`) | Sets the global `xthresh`. After watershed, voxels in the final mask whose intensity exceeds `<f>` are removed. |
| `-sa-xmask <invol> <outvol> <xmask1> [<xmask2> ...]` | path, path, path... | n/a | Stand-alone mode for testing: skips the entire watershed pipeline; reads `<invol>`, applies `ApplyXMasks()` with all listed exclusion masks, writes `<outvol>`, and exits immediately from `get_option()`. |
| `-rusage <file>` | path | unset | Sets the global `rusage_file`. Writes process resource usage (rusage) to `<file>` at end of run. |

### Keep-edits

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-keep <pre_edit> <post_edit> <new_out>` | path, path, path | unset (`KeepEdits=0`) | Sets `parms->KeepEdits=1`, `PreEditVolName`, `PostEditVolName`, `NewWithKeepVolName`. Both volumes must exist and be readable (the parser exits otherwise). After the new watershed, the difference between `<pre_edit>` and `<post_edit>` (the manual edits) is transferred onto `<new_out>`. Used by `recon-all` to preserve manual edits across re-runs. |

### Debug / help / version

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-debug_voxel <x> <y> <z>` | int, int, int | unset | Sets the globals `Gx`, `Gy`, `Gz`. Prints debug information at the named voxel. |
| `--help`<br>`--usage` | — | — | Inside `get_option()` the option is matched as `-help`/`-usage` (after stripping one leading `-`), so on the command line it must be passed as `--help`/`--usage`. Calls `usageHelp()` (the XML-rendered help) and exits. |
| `--version`<br>`--all-info` | — | — | Handled by `handleVersionOption()` *before* `get_option()` runs (line 1018). Prints version/build info and exits if no other arguments follow. |

## Configuration Interactions

> [!gotcha] `-brain_atlas` vs. `-atlas`
> These are two different flags. `-atlas` sets
> `parms->atlas = 1` (a general "atlas mode" flag) but does not
> load anything. `-brain_atlas <gca> <xform>` actually reads the
> GCA and the LTA and enables the full atlas correction path.
> `recon-all` uses `-brain_atlas` and does not pass `-atlas`. The
> help text at line 68 of the XML is ambiguous about this
> distinction.

> [!gotcha] `-n` / `-wat` / `-wat+temp` / `-first_temp` are mutually
> disabling
> Each of these sets `template_deformation` or `watershed_analyze`
> to a different value, overriding the previous. Passing multiple
> of them means the *last* one wins.

> [!gotcha] `-T1` vs. `-man`
> `-T1` sets the intensity thresholds assuming WM is at 110. If
> your input has been rescaled (e.g. WM at 1000), `-T1` produces
> a useless mask. Use `-man <csf_max> <transition> <gm>` to set
> the thresholds manually.

> [!gotcha] Multi-strip mode in `recon-all`
> `recon-all -multistrip` runs `mri_watershed` in parallel for
> each (input_vol, preflood_height) combination in `{orig,
> orig_nu, T1} × {5, 10, 20, 30}` (12 total), picks the one with
> the highest log-likelihood under a brain-atlas model, and uses
> that as the final mask. This is expensive but robust on
> problematic data.

> [!gotcha] `-keep` requires both a pre-edit and a post-edit
> volume
> The `-keep <pre> <post> <new>` flag is non-trivial to invoke
> correctly. It computes the *difference* between `<pre>` and
> `<post>` (the manual edits) and transfers them to `<new>`. If
> `<pre>` and `<post>` are identical, no edits are applied.

> [!gotcha] `-xmask` is applied *after* everything else
> The exclusion mask is the last operation in the pipeline. This
> matters when combining with `-keep`: the xmask will zero out
> voxels even if they were manually preserved by the keep
> operation.

> [!gotcha] `-w` cannot be set twice
> The parser explicitly refuses a second `-w` and exits with
> "Double definition of the preweight". This guards against a
> common typo in `recon-all` wrapper scripts.

> [!gotcha] `-brain_atlas` rewrites several other defaults
> Supplying a non-NULL transform via `-brain_atlas` causes
> `main()` to override `Tregion`, `seedprior`, `preweightemp`,
> `basinprior`, `preweight`, and (if untouched) `hpf` after
> argument parsing. This means the help text's "default
> parameters -w 0.82 -b 0.32 -h 10" are **not** the
> `init_parms()` defaults — they are the values installed only
> when `-brain_atlas` is supplied. Conversely, `-no_seedpt`,
> `-no_ta`, and `-no_wta` are only meaningful in the
> atlas-loaded case (otherwise they are no-ops).

> [!gotcha] One of `-ta`/`-seedpt`/`-b`/`-w`/`-wta` without a
> registration is a hard error
> `main()` enforces that if any of `Tregion`, `seedprior`,
> `basinprior`, `preweight`, or `preweightemp` are set but
> `parms->transform` is NULL, the program exits with "One of
> the flags you're using needs a registration file to be
> effective". So bare `-w 0.5` (without `-brain_atlas`) will
> abort.

> [!gotcha] `-useSRAS` changes the vertex coordinate convention
> With `-useSRAS`, surfaces are written in surface RAS (tkRAS)
> coordinates, which are the ones tkmedit expects. Without it,
> they are written in scanner RAS, which is what [[freeview]]
> expects by default. Mix-ups result in the surface appearing
> shifted. Always match the flag to your downstream viewer.

> [!gotcha] WM target is 110, not a parameter
> Unlike [[mri_normalize]], where the target is controlled by a
> compile-time constant, `mri_watershed`'s `-T1` mode hard-codes
> the assumption that WM = 110. You cannot change this via a
> flag — if your WM is at a different value, use `-man` or
> rescale first.

## Typical Use Cases

### Use case 1: recon-all default (atlas-guided, T1)

```bash
cd $SUBJECTS_DIR/<subj>/mri
mri_watershed -T1 \
    -brain_atlas $FREESURFER_HOME/average/RB_all_withskull_<DATE>.gca \
    transforms/talairach_with_skull.lta \
    T1.mgz brainmask.auto.mgz
```

This is the exact command assembled by `recon-all` at Stage 5
when `WSGcaAtlas = 1` and `EMRegStrip = 1` (the defaults). The
`talairach_with_skull.lta` must exist from a prior
[[mri_em_register]] `-skull` call.

### Use case 2: Aggressive strip (less tissue kept)

```bash
mri_watershed -T1 -less T1.mgz brain_aggressive.mgz
```

`-less` shrinks the surface; useful when the default mask
includes dura. `recon-all`'s `-wsless` flag adds `-less` to the
default command.

### Use case 3: Conservative strip (more tissue kept)

```bash
mri_watershed -T1 -more T1.mgz brain_conservative.mgz
```

`-more` expands the surface; useful when the default is clipping
the cerebellum. `recon-all`'s `-wsmore` flag adds `-more`.

### Use case 4: Override the preflood height

```bash
mri_watershed -T1 -h 5 T1.mgz brain.mgz
```

A lower preflood (5 %) produces a tighter strip; a higher
preflood (20, 30) produces a more inclusive one. `recon-all`'s
`-wspct <p>` flag forwards `-h <p>`.

### Use case 5: Preserve manual edits

```bash
mri_watershed -T1 -keep brainmask.auto.mgz brainmask.mgz brainmask.new.mgz \
    -brain_atlas $FREESURFER_HOME/average/RB_all_withskull_<DATE>.gca \
    transforms/talairach_with_skull.lta \
    T1.mgz brainmask.new.mgz
```

The tool computes the edit mask between `brainmask.auto.mgz` (old
auto) and `brainmask.mgz` (after manual edits), runs a fresh
strip, and applies the saved edits to the new result.

### Use case 6: Label output for anatomical QA

```bash
mri_watershed -T1 -LABEL T1.mgz tissue_labels.mgz
```

The output is a label map (1-6 for scalp, skull, csf, gray,
white, fat). Useful for sanity-checking the segmentation.

### Use case 7: Manual threshold override (non-110 data)

```bash
mri_watershed -man 60 100 85 input.mgz brain.mgz
```

`-man <csf_max> <transition> <gm>` sets the thresholds
explicitly, bypassing the `-T1` default.

## Pipeline Context

**Predecessor (in recon-all):**
- [[mri_normalize]] → `T1.mgz` (the input volume).
- [[mri_em_register]] `-skull` → `transforms/talairach_with_skull.lta`
  (the atlas LTA).

**This tool** produces `mri/brainmask.auto.mgz`, which
`recon-all` `cp`'s to `mri/brainmask.mgz` unless `brainmask.mgz`
already exists (in which case it is preserved, i.e. manual edits
are retained).

**Successors (in recon-all):**
- `brainmask.mgz` is the input mask to [[mri_em_register]]
  (autorecon2 Stage 6, for the skull-free atlas alignment).
- It is the mask to `mri_ca_normalize`, `mri_ca_register`, and
  [[mri_ca_label]].
- It is used as an initial input to [[mri_normalize]] for the
  autorecon2 Normalization2 pass.

**Predecessor:** [[mri_normalize]] + [[mri_em_register]] `-skull`
→ **mri_watershed** → **Successor:** [[mri_em_register]] (default)
or `mri_ca_normalize` (when `-gcareg` is off).

> [!gotcha] Watershed vs. SynthStrip
> `recon-all -use-synthstrip` short-circuits both the
> `mri_em_register -skull` call *and* `mri_watershed`. Instead,
> [[mri_synthstrip]] is run once on `orig.mgz` (Stage 1) and the
> resulting mask is applied to `T1.mgz` here. This means that
> when SynthStrip is used, `transforms/talairach_with_skull.lta`
> is *not* produced; downstream tools that expect this LTA
> should be aware of this. See the `[!gotcha]` in [[recon-all]].

## Error Compensation and Guard Rails

- **Cerebellum chopped off**: use `-atlas` (or the default
  `-brain_atlas` path) to pull the cerebellum back in. If that
  fails, `recon-all` auto-retries with a larger preflood in
  multistrip mode.
- **Dura included**: use `-less`, or `recon-all -wsless`.
- **CSF-dominated basin confusion**: use `-man` to raise the
  CSF_MAX threshold.
- **Seed-point placement fails**: use `-s <i> <j> <k>` to
  manually supply a seed point inside the brain.
- **Multi-strip ensemble**: `recon-all -multistrip` runs 12
  configurations and picks the best via `mri_log_likelihood`.
- **`-keep`**: used by `recon-all` to preserve manual edits
  across re-runs.
- **`-copy`**: short-circuits the whole pipeline when the input
  is already skull-stripped (e.g. from a previous run or an
  external tool).

## Related Tools

- [[mri_normalize]] — produces the `T1.mgz` input.
- [[mri_em_register]] — produces the
  `talairach_with_skull.lta` input (via the `-skull` flag).
- [[mri_synthstrip]] — the modern CNN-based skull stripper
  that can replace `mri_watershed` entirely.
- [[freeview-editing]] — GUI for manually correcting `brainmask.mgz` when the skull strip is imperfect (Voxel Edit / Recon Edit modes), before rerunning `autorecon2`
- `mri_gcut` — an alternative post-processor that runs after
  `mri_watershed` (via `recon-all -gcut`) to further remove
  dura.
- `mri_mask` — applies the resulting brain mask to other
  volumes.
- `mri_log_likelihood` — used by `recon-all -multistrip` to
  score competing watershed outputs.
- `mri_validate_skull_stripped` — a companion binary in the
  same directory that validates a skull-stripped volume.
- [[mri_ca_label]] — downstream consumer of `brainmask.mgz`.

## Confidence and Gaps

- **High confidence**: argument parsing (especially the 35 flags
  enumerated above), the high-level algorithm description
  (from the Ségonne 2004 paper and the XML help), the two
  `recon-all` modes (default and multi-strip), and the six
  gotchas.
- **Medium confidence**: the precise interaction between the
  template-deformation parameters (`-w`, `-b`, `-h`) and the
  `-brain_atlas` GCA prior. These are documented in the help
  text as having default values (`-w 0.82 -b 0.32 -h 10`) but
  the exact mathematical role is buried in the
  deformation-force code beyond line 965.
- **Low confidence**: the behaviour on non-T1 contrasts
  (`-man` allows it but is not widely tested), and on
  pathological data (large tumours, severe atrophy, paediatric
  brains).

> [!gap] Template-deformation math
> The default parameters `-w 0.82 -b 0.32 -h 10` have been
> unchanged since the original Ségonne 2004 paper, but the
> source code's mathematical implementation of the force field
> and the shape prior has not been traced line-by-line. A
> dedicated internal page on the watershed surface fit would
> fill this in.

> [!gap] `mri_validate_skull_stripped`
> The companion binary validates a skull-stripped volume (at
> what threshold of brain-prior agreement? returning what
> metric?). Needs a dedicated short page.

## References

- Source: `$FREESURFER_SOURCE/mri_watershed/mri_watershed.cpp`
  (11400 lines, FreeSurfer 8.2.0)
- Ségonne, F., Dale, A. M., Busa, E., Glessner, M., Salvolini, U.,
  Hahn, H. K. & Fischl, B. *A hybrid approach to the skull-
  stripping problem in MRI*. NeuroImage 22(3):1160–1075, 2004.
- FreeSurfer wiki:
  <https://surfer.nmr.mgh.harvard.edu/fswiki/mri_watershed>
  (accessed 2026-04-14)
- FreeSurfer tutorial: *Skull Strip*
  <https://surfer.nmr.mgh.harvard.edu/fswiki/FsTutorial/SkullStrip>
  (accessed 2026-04-14)
