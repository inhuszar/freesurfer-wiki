---
title: "hiam_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "hiam_register/hiam_register.cpp"
families:
  - "hiam_*"
recon_all_stage: null
related:
  - "[[mris_register]]"
  - "[[hiam_make_template]]"
  - "[[hiam_make_surfaces]]"
  - "[[mrisp-tif]]"
  - "[[registration-overview]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Several integration weights are initialised twice with conflicting values in main(); the effective default is the last assignment, but the intent of the overwritten lines is unclear."
  - "Some curvature/original-property files are read by hard-coded relative names (e.g. 'hippocampus.curv', 'rh.hippocampus.curv') from the current directory rather than from a subject tree; the expected working directory is not documented in the source."
tags:
  - surface
  - hippocampus
  - amygdala
  - registration
  - spherical-morph
  - nonlinear-registration
---

# hiam_register

## Summary

`hiam_register` non-linearly registers an individual hippocampal (or amygdala) **spherical surface** to an average **template parameterization** built by [[hiam_make_template]]. It warps the input sphere so that its curvature pattern matches the template's, by minimising a weighted sum of a curvature-correlation term and several geometric regularisers (distance preservation, area/negative-area penalties, springs), integrated over a coarse-to-fine sequence of curvature-blurring scales. The output is the registered (morphed) surface, optionally accompanied by a per-vertex Jacobian (areal expansion/contraction) map. It is the hippocampus-and-amygdala ("hiam") fork of [[mris_register]].

## Source Information

- **Language:** C++
- **Source file:** [`hiam_register/hiam_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp)
- **Binary/script location:** `$FREESURFER_HOME/bin/hiam_register`
- **Key library routines:** [`MRISread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L157), [`MRISPread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L172), [`MRISprojectOntoSphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L192), [`MRISrigidBodyAlignGlobal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L655), [`MRISintegrate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L756), and [`MRISwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L209) (surface library `mrisurf*`).

## Purpose and Context

FreeSurfer's surface registration establishes a vertex-to-vertex correspondence between a subject and a template by treating the cortex (here, the hippocampal surface) as a sphere and morphing it so that aligned vertices carry the same folding/curvature signature. `hiam_register` is the **registration stage** of the hippocampal surface family: it takes the template produced by [[hiam_make_template]] and a single subject's spherical surface, and produces a registered surface in which vertex *i* corresponds to the same anatomical location across all registered subjects.

The registration is driven mainly by the **correlation** between the subject's curvature and the template's mean-curvature frame (`l_corr`), regularised so the warp does not tear or fold the surface. A local copy of the `mris_register` integration loop is embedded in this file ([`mrisRegister`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L450), [`mrisIntegrationEpoch`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L692)), specialised to the single "hippocampus" surface/curvature.

This is a stand-alone command; it is **not** called by [[wiki/pipelines/recon-all|recon-all]] or any shell script in the source tree. It is the third tool of the family: [[hiam_make_surfaces]] → [[hiam_make_template]] → **`hiam_register`**.

## Inputs

### Required Inputs

Three positional arguments ([`hiam_register.cpp:141-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L141-L146)):

```
hiam_register [options] <input surface> <average surface> <output surface>
```

1. **`<input surface>`** — the subject's hippocampal surface to be registered ([`MRISread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L157)). It is projected onto a sphere of `DEFAULT_RADIUS` before registration ([`:192`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L192)).
2. **`<average surface>`** — the template parameterization ([[mrisp-tif|MRI_SP]] `.tif`) from [[hiam_make_template]], read by [`MRISPread`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L172).
3. **`<output surface>`** — destination for the registered surface ([`MRISwrite`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L209)).

The tool additionally reads, by **hard-coded relative name**, a curvature file `<hemi>.hippocampus.curv` and original-geometry properties named `hippocampus` ([`:206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L206), [`:511-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L511-L514)).

### Input Assumptions

> [!assumption] Input is (or can be projected to) a closed sphere
> The input surface is forcibly projected onto a sphere ([`MRISprojectOntoSphere`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L192)) and its status set to `MRIS_PARAMETERIZED_SPHERE` ([`:195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L195)). It must therefore be topologically a sphere — i.e. an already-spherized hippocampal surface, not an arbitrary patch.

> [!assumption] Template scale/resolution matches the surface
> The template parameterization must have been built (by [[hiam_make_template]]) with a compatible scale; the registration reads template frames 0–2 (mean, variance) and correlates against them.

> [!assumption] `hippocampus.curv` and original properties are findable
> The "original properties" reload ([`MRISreadOriginalProperties(mris, "hippocampus")`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L206)) and the in-loop curvature read ([`:511-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L511-L514)) use bare relative names; the program is expected to be run from a directory where those files resolve (typically the subject's `surf/`).

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `<output surface>` | path given as 3rd argument | the registered (spherically morphed) surface |
| Jacobian curvature file | path given to `-jacobian` | per-vertex areal expansion/contraction ratio, written as a curvature overlay ([`:210-218`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L210-L218)) — only with `-jacobian` |
| `<hemi>.<base>.out` | working directory | integration log (parameters, energies, timing), **only with `-w`** ([`:476-488`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L476-L488)) |
| `<hemi>.target`, `<hemi>.NNNNblur*`, `target.*.hipl`, `rotated`, … | working directory | intermediate curvature/parameterization snapshots, **only with `-w` (and verbose diagnostics)** ([`:567-657`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L567-L657)) |

### Output Specifications

The registered surface has the same vertex/face count as the input; only vertex positions (on the sphere) change. The Jacobian is computed as the ratio of registered to original per-vertex area, scaled by the global area ratio ([`compute_area_ratios`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L432-L448)), and stored in `v->curv` then written as a curvature file.

## Mathematical Foundations

Registration minimises an energy that rewards curvature agreement with the template while penalising metric distortion, integrated by gradient descent / line minimisation over decreasing blur scales.

> [!math] Registration energy
> The total cost combines a correlation (data) term and geometric regularisers, each with a weight `l_*` ([`mrisLogIntegrationParms2`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L814) enumerates the active terms):
> $$ E = l_\text{corr}\,E_\text{corr} \;+\; l_\text{dist}\,E_\text{dist} \;+\; l_\text{parea}\,E_\text{parea} \;+\; l_\text{nlarea}\,E_\text{nlarea} \;+\; l_\text{area}\,E_\text{area} \;+\; l_\text{spring}\,E_\text{spring}. $$
> - $E_\text{corr}$ — negative correlation between the subject curvature (parameterized to the sphere) and the template's mean-curvature frame; this is the term that actually drives alignment.
> - $E_\text{dist}$ — deviation of inter-vertex distances from their original values (preserves local metric).
> - $E_\text{parea}$ / $E_\text{nlarea}$ / $E_\text{area}$ — parametric and non-linear area penalties that resist shrinkage and, especially, **negative (folded) triangle area**.
> The built-in defaults set `l_corr = 1`, `l_dist = 0.1`, `l_parea = 0.2`, `l_nlarea = 1`, `l_area = 0` ([`:109-114`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L109-L114)), with a first-time-vs-subsequent adjustment chosen from the template's dof frame ([`:176-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L176-L188)).

> [!math] Coarse-to-fine multiscale integration
> The curvature of both subject and template is blurred at a decreasing sequence of scales `sigma ∈ {4.0, 2.0, 1.0, 0.5}` ([`:36-38`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L36-L38)). At each scale the subject sphere is parameterized, [`MRISPblur`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L584)-ed, normalised, and integrated by [`mrisIntegrationEpoch`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L692), which repeatedly halves the smoothing-averaging count `n_averages` (`256 → 64 → … → min_averages`) and calls [`MRISintegrate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L756). Coarse scales capture global shape; fine scales refine local folds.

> [!math] Initial rigid alignment, then unfolding
> On the first scale only, unless `-norot` is set, a global rigid rotation is found by [`MRISrigidBodyAlignGlobal(mris, parms, 0.5, 32.0, 8)`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L655) (angular search from 32° to 0.5° with 8 samples per scale) to seed the non-linear morph from a good pose ([`:647-659`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L647-L659)). After the scale loop the tolerance is tightened and the non-linear area weight boosted ($l_\text{nlarea}\times5$) for a final fold-removal epoch ([`:667-674`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L667-L674)).

> [!math] Jacobian of the mapping
> With `-jacobian`, each vertex stores the relative areal change ([`compute_area_ratios`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L432-L448)):
> $$ J_i = \frac{A_i}{A_i^\text{orig}\,\cdot\,(A_\text{total}/A_\text{total}^\text{orig})}, $$
> i.e. local area divided by original local area, normalised by the global area ratio, so $J_i>1$ marks expansion and $J_i<1$ contraction.

> [!internal] The optimiser lives in `mrisurf`
> [`MRISintegrate`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L756), [`MRISrigidBodyAlignGlobal`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L655), [`MRISPblur`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L584), and the energy-gradient terms are implemented in the surface library; this file mainly sets the `INTEGRATION_PARMS` and orchestrates the scale loop. See [[registration-overview]] and [[mris_register]].

## Configuration Options

### Complete Flag Reference

Parsed in [`get_option()`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L231-L402). Long forms are matched whole (case-insensitive); single-letter flags are case-insensitive and consume their argument(s). Setting any weight flag also clears `use_defaults`, disabling the automatic first-time/subsequent weight selection.

#### Registration weights (energy term coefficients)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-corr` | float | `1.0` | Weight `l_corr` of the curvature-correlation (alignment) term ([`:301-305`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L301-L305)). |
| `-dist` | float | `0.1` | Weight `l_dist` of the distance-preservation term ([`:262-266`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L262-L266)). |
| `-area` | float | `0.0` | Weight `l_area` of the (linear) area term ([`:281-285`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L281-L285)). |
| `-parea` | float | `0.2` | Weight `l_parea` of the parametric-area term ([`:286-290`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L286-L290)). |
| `-nlarea` | float | `1.0` | Weight `l_nlarea` of the non-linear (negative-area) penalty ([`:291-295`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L291-L295)). |
| `-spring` | float | `0.0` | Weight `l_spring` of the spring (smoothness) term ([`:296-300`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L296-L300)). |

#### Integration / optimisation control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-lm` | flag | line-minimization (default) | Use quadratic-fit line-minimization integration ([`:270-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L270-L272)). |
| `-search` | flag | off | Use binary-search line-minimization integration ([`:273-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L273-L275)). |
| `-adaptive` | flag | off | Use adaptive time-step integration ([`:312-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L312-L314)). |
| `-m` | float | `0.95` | Momentum integration with the given momentum coefficient ([`:345-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L345-L349)). |
| `-dt` | float | `0.9` | Integration time step (`base_dt` set to `0.2·dt`) ([`:276-280`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L276-L280)). |
| `-tol` | float (sci.) | `10` | Convergence tolerance (`%e` format) ([`:319-325`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L319-L325)). |
| `-n` | int | `25` | Iterations per integration step (`niterations`) ([`:365-369`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L365-L369)). |
| `-a` | int | `256` | Base number of curvature-averaging passes (`n_averages`) for the coarse-to-fine schedule ([`:355-359`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L355-L359)). |
| `-p` | int | `4` | Maximum number of unfolding passes (`max_passes`) ([`:385-389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L385-L389)). |
| `-error_ratio` | float | `1.1` | Error-increase ratio that triggers time-step reduction ([`:326-329`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L326-L329)). |
| `-dt_inc` | float | `1.0` | Time-step increase factor on a successful step ([`:330-333`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L330-L333)). |
| `-dt_dec` | float | `1.0` | Time-step decrease factor on a failed step ([`:340-343`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L340-L343)). |
| `-vnum`<br>`-distances` | int int | `0 0` | Long-range distance neighbourhood: `nbhd_size` and `max_nbrs` ([`:242-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L242-L247)). |
| `-nbrs` | int | `1` | Vertex neighbourhood size for metric/curvature computations ([`:315-318`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L315-L318)). |

#### Curvature and alignment behaviour

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-curv` | flag | **on** | Use curvature (`IP_USE_CURVATURE`) for the final alignment ([`:306-308`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L306-L308)); set by default at startup ([`:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L106)). |
| `-nocurv` | flag | off | Clear `IP_USE_CURVATURE` ([`:309-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L309-L311)). |
| `-norot` | flag | off (rotate **on**) | Disable the initial global rigid alignment (`IP_NO_RIGID_ALIGN`) ([`:267-269`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L267-L269)). |
| `-rotate` | float×3 | — | Pre-rotate the input surface by (α, β, γ) degrees before registration ([`:248-254`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L248-L254)). |
| `-reverse` | flag | off | Mirror-reverse the surface in X before morphing (e.g. to map one hemisphere onto the other's template) ([`:255-257`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L255-L257)). |
| `-c` | string | — | Read a source curvature from the given file ([`:351-354`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L351-L354)). |
| `-o` | string | `hippocampus` | Basename for the "original properties" reload ([`:380-384`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L380-L384)). |
| `-s` | float | `1.0` | Scale applied to distances (`MRISscaleDistances`) ([`:360-364`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L360-L364)). |

#### Output and diagnostics

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-jacobian` | string | — | Also write the per-vertex areal-Jacobian map (as a curvature file) to this path ([`:258-261`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L258-L261)). |
| `-w` | int | `100` | Enable diagnostic writing (`DIAG_WRITE`) and set the snapshot interval `write_iterations`; produces logs and intermediate surfaces ([`:370-375`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L370-L375)). |
| `-v` | int | — | Set the diagnostic vertex number `Gdiag_no` for per-vertex debug printouts ([`:376-379`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L376-L379)). |
| `--help` | flag | — | Print usage + description and exit ([`:238-239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L238-L239)). |
| `--version` | flag | — | Print FreeSurfer build version and exit ([`:240-241`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L240-L241)). |
| `-u`<br>`-?` | flag | — | Print usage and exit ([`:390-394`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L390-L394)). |

### Configuration Interactions

> [!gotcha] Any weight flag disables the automatic default schedule
> Setting `-corr`, `-dist`, `-area`, `-parea`, `-nlarea`, or `-spring` sets `use_defaults = 0` ([`:265`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L265) etc.). With `use_defaults` on (the startup state), the program **overrides** `l_dist`/`l_corr`/`l_parea` based on whether this is the first alignment into the template (judged from the template's dof frame, [`:176-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L176-L188)). Touch any weight and you opt out of that adaptive choice for **all** of them.

> [!gotcha] `-lm`, `-search`, `-adaptive`, `-m` are mutually competing integration modes
> Each sets `parms.integration_type` ([`:270-275`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L270-L275), [`:312-314`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L312-L314), [`:345-349`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L345-L349)). They are processed left-to-right, so the **last one on the command line wins**; combining them is not an error but only the final choice takes effect. The startup default is line-minimization.

> [!gotcha] `-curv` / `-nocurv` toggle the same flag bit
> Both manipulate `IP_USE_CURVATURE` ([`:306-311`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L306-L311)); whichever appears last decides. Curvature use is on by default ([`:106`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L106)). With curvature disabled, the second (curvature-refinement) `SURFACES` pass is skipped.

- `-rotate` and `-reverse` both pre-transform the surface before any registration; `-rotate` is applied first ([`:162-164`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L162-L164)), `-reverse` after the spherical projection ([`:193-194`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L193-L194)).
- `-norot` only suppresses the **initial** global rigid alignment; the non-linear morph still runs.
- The intermediate snapshot files (`<hemi>.target`, `*blur*`, `*.hipl`, `rotated`) appear only when `-w` is set **and** verbose diagnostics are on ([`:595-657`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L595-L657)).

## Typical Use Cases

### Use Case 1: Register a subject's hippocampal sphere to the template

```bash
cd /data/hippo_study/subj07/surf
hiam_register lh.hippocampus.sphere \
    /data/hippo_study/templates/lh.hippocampus.tif \
    lh.hippocampus.reg
```

Projects the input to a sphere, rigidly aligns it, then non-linearly morphs it to the template.

### Use Case 2: Register and save the areal-Jacobian map

```bash
hiam_register -jacobian lh.hippocampus.jacobian \
    lh.hippocampus.sphere \
    /data/hippo_study/templates/lh.hippocampus.tif \
    lh.hippocampus.reg
```

### Use Case 3: Skip the initial rotation and emphasise the data term

```bash
hiam_register -norot -corr 1.5 -dist 0.05 \
    lh.hippocampus.sphere \
    /data/hippo_study/templates/lh.hippocampus.tif \
    lh.hippocampus.reg
```

### Use Case 4: Map a right surface onto a left template by mirroring

```bash
hiam_register -reverse rh.hippocampus.sphere \
    /data/hippo_study/templates/lh.hippocampus.tif \
    rh.hippocampus.reg
```

## Pipeline Context

**Predecessor:** [[hiam_make_surfaces]] (per-subject surface) and the spherizing/curvature step that yields `hippocampus.sphere` + `hippocampus.curv`, plus [[hiam_make_template]] (the average template) → **hiam_register** → **Successor:** group analyses on registered hippocampal surfaces (e.g. vertex-wise thickness/curvature comparison across the aligned cohort).

It is not part of [[wiki/pipelines/recon-all|recon-all]]. It is the direct analogue of the cortical [[mris_register]], restricted to the hippocampal/amygdala surface.

## Gotchas and Caveats

> [!gotcha] Several integration parameters are assigned twice at startup
> In `main()` the integration type and time-step parameters are written, then immediately overwritten, e.g. `dt_increase`/`dt_decrease`/`error_ratio` are set to `1.01/0.99/1.03` and then to `1.0/1.0/1.1` ([`:118-123`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L118-L123)), and `integration_type` is set three times ending on `INTEGRATE_LINE_MINIMIZE` ([`:124-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L124-L126)). The **last assignment wins**, so the effective defaults are line-minimization with `dt_inc = dt_dec = 1.0`, `error_ratio = 1.1`; the earlier values are dead but can mislead a casual reader.

> [!gotcha] `-vnum` is handled twice in the parser
> There are two `-vnum` branches in `get_option` ([`:242-247`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L242-L247) and [`:334-339`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L334-L339)); the first (shared with `-distances`) is the one that matches. Both do the same thing (set `nbhd_size`/`max_nbrs`), so the duplicate is harmless.

> [!gotcha] Curvature/original-property files are read from the working directory
> The in-loop curvature read uses bare names like `rh.hippocampus.curv`/`lh.hippocampus.curv` ([`:511-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L511-L514)) and original properties are reloaded as `hippocampus` ([`:206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L206)). Run the tool from the directory holding those files (the subject's `surf/`), or the read will fail.

> [!gotcha] `-tol` uses scientific notation
> The tolerance is scanned with `%e` ([`:319-323`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L319-L323)); pass values like `-tol 1e-4`. A plain decimal still parses, but the field is intended for exponential input.

## Error Compensation and Guard Rails

- **Forced spherical projection.** Regardless of the input's exact geometry, the surface is projected onto a sphere of `DEFAULT_RADIUS` and tagged `MRIS_PARAMETERIZED_SPHERE` before registration ([`:192-195`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L192-L195)), so a slightly non-unit sphere is normalised automatically.
- **Adaptive first-time weights.** When weights are left at defaults, the program inspects the template's dof frame and picks a stronger distance term for the first alignment vs. a lighter one for subsequent passes ([`:176-188`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L176-L188)).
- **Negative-area removal.** A dedicated final epoch boosts the non-linear area weight (×5) and tightens tolerance to drive out residual folds ([`:667-674`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L667-L674)).
- **Quadrangular meshes are triangulated.** `IS_QUADRANGULAR` surfaces have their triangle links removed up front so the integrator sees triangles ([`:460-461`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L460-L461)).
- **Unreadable surface/template aborts** via `ErrorExit` ([`:158-160`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L158-L160), [`:173-175`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L173-L175)).

## Related Tools

- [[mris_register]] — the cortical original; identical multiscale energy-minimization framework applied to whole-hemisphere surfaces. Use it to understand every `l_*` term in depth.
- [[hiam_make_template]] — the **producer** of the `<average surface>` template this tool registers against.
- [[hiam_make_surfaces]] — produces the per-subject hippocampal surface upstream of the spherical mapping.
- [[mris_sphere]] / [[mris_inflate]] — the cortical spherical-mapping tools whose hippocampal equivalents must run before `hiam_register`.

## Confidence and Gaps

**High confidence:** the three positional arguments, the complete flag set with defaults, the energy-term weights and their default values, the `sigma` schedule, the initial-rigid-then-unfold structure, the Jacobian definition, the `use_defaults` opt-out behaviour, and the mutually-competing integration modes — all read directly from [`hiam_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp).

> [!gap] Conflicting double-initialisations
> The duplicated assignments to `dt_increase`/`dt_decrease`/`error_ratio`/`integration_type` ([`:118-126`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L118-L126)) make the *intended* defaults ambiguous even though the *effective* ones are clear (last write wins). Whether the earlier values were meant to be the defaults is unresolved.

> [!gap] Expected working directory / file provenance
> The hard-coded relative curvature and original-property names ([`:206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L206), [`:511-514`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp#L511-L514)) imply a specific run directory that the source never states explicitly. This page assumes the subject's `surf/`; confirmation would need the original (undocumented) hippocampal pipeline.

## References

- FreeSurfer source: [`hiam_register/hiam_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/hiam_register/hiam_register.cpp) (v8.2.0).
- Cortical original: [`mris_register/mris_register.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp).
- B. Fischl, M. I. Sereno, R. B. H. Tootell, A. M. Dale, "High-resolution intersubject averaging and a coordinate system for the cortical surface," *Human Brain Mapping* 8:272–284, 1999 — the spherical surface-registration method underlying both tools.
