---
title: "optseq2"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "optseq2/optseq2.cpp"
  - "utils/evschutils.cpp"
  - "include/evschutils.h"
families: []                     # standalone fMRI design optimizer (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[wiki/tools/mri_glmfit|mri_glmfit]]"
  - "[[mkanalysis-sess]]"
  - "[[selxavg3-sess]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact random-permutation routine that places NULL slots under the tNullMax back-to-back constraint (RandPermListLimit0) and the FOCB probability-matrix construction (EVScb1ProbMatrix / EVScb1IdealProbMatrix) live in utils/evschutils.cpp and were read at the call level but not line-by-line transcribed."
  - "The Matlab-4 .mat layout written for --mtx/--cmtx/--xtxideal is produced by the shared matfile/MatlabWrite code, not specified in optseq2.cpp."
tags:
  - fmri
  - experimental-design
  - efficiency
  - event-related
  - fsfast
  - optimization
---

# optseq2

## Summary

`optseq2` designs the timing and order of events for rapid-presentation
event-related (RPER) fMRI experiments. Given the scan length, the TR, a set of
event types (with durations and repetition counts), and an assumed
post-stimulus-delay (PSD) response window, it randomly generates a large number
of candidate **schedules** — sequences of events separated by jittered amounts
of NULL (fixation) — builds the corresponding finite-impulse-response (FIR) GLM
design matrix for each, scores each by a user-chosen statistical-efficiency cost
function, and keeps the best handful. The output schedules (in FSFAST "paradigm
file" format) are timing files you feed to your stimulus-presentation software
and later to your GLM analysis. `optseq2` is the standard FreeSurfer/FSFAST tool
for optimising event-related designs and is the successor to the original
`optseq`.

## Source Information

- **Language:** C++
- **Source files:**
  [`optseq2/optseq2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp) (driver, argument parsing, search loop,
  contrast/whitening matrices) and
  [`utils/evschutils.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp) (the event-schedule library: synthesis, FIR
  design matrices, cost computation), declared in
  [`include/evschutils.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/include/evschutils.h).
- **Original author:** Douglas N. Greve (Summer 2002).
- **Binary/script location:** `$FREESURFER_HOME/bin/optseq2`
- **Home page (from help):** `http://surfer.nmr.mgh.harvard.edu/optseq`

## Purpose and Context

In RPER fMRI, events are presented closely enough that their hemodynamic
responses overlap. To recover each event's response, the onsets must be
**jittered** — separated by variable inter-stimulus intervals — so that the
overlap can be removed by linear deconvolution. Not all jitter patterns are
equal: the statistical efficiency with which the responses (or contrasts among
them) can be estimated depends strongly on the exact order and timing. Because
the space of legal schedules is astronomically large, `optseq2` performs a
**random search**: it samples schedules, scores them by an efficiency-related
cost, and returns the best ones found.

`optseq2` is run **before** data collection, as the design step of an FSFAST
analysis. Its `*.par` outputs are used to present stimuli and are then supplied
to the FSFAST first-level analysis (`mkanalysis-sess`/`selxavg3-sess`) or to a
[[wiki/tools/mri_glmfit|mri_glmfit]] design, which fit the same FIR model
`optseq2` optimised. It is entirely off-line and processes no imaging data; it is
not part of [[wiki/pipelines/recon-all|recon-all]].

## Inputs

`optseq2` reads everything from command-line flags; there are no input data
volumes. To **design** a new experiment, the required quantities are the
acquisition timing (`--ntp`, `--tr`), the response window (`--psdwin`), at least
one event type (`--ev`), the search budget (`--nsearch` or `--tsearch`), how many
to keep (`--nkeep`), and an output stem (`--o`).

Alternatively, existing schedules can be **read back** with `--i`/`--in` to
re-score or re-export them (optionally with `--nosearch`).

### Required Inputs (design mode)

- **Number of time points** `--ntp` and **TR** `--tr` — define the run length
  $t_{\text{scan}} = N_{tp}\cdot TR + t_{\text{prescan}}$.
- **PSD window** `--psdwin PSDMin PSDMax [dPSD]` — the FIR response window. `dPSD`
  is the temporal sampling of the window *and* the granularity of event onsets;
  if omitted it defaults to the TR ([`optseq2/optseq2.cpp:1440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1440)).
- **One or more event types** `--ev label duration nreps` — each repeated for a
  separate event type (up to 500).
- **Search budget** `--nsearch` *or* `--tsearch` (mutually exclusive).
- **`--nkeep`** and **`--o`** (or an input via `--i`/`--in`).

### Input Assumptions

> [!assumption] Everything is quantised to dPSD; stim time must fit in scan time
> All of `PSDMin`, `PSDMax`, the TR, and every event duration must be integer
> multiples of `dPSD` (checked by `CheckIntMult`,
> [`optseq2/optseq2.cpp:214-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L214-L235), [`#L1441-L1444`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1441-L1444)); event onsets can therefore
> only land on multiples of `dPSD`. The total stimulation time must be strictly
> less than the total scan time (eq. 1 below), and the number of estimated
> parameters must be fewer than the number of time points (eq. 4 below);
> violating either is a hard error.

> [!gotcha] Do NOT include the NULL (fixation) condition as an event type
> The NULL/baseline condition is implicit — it is the jitter that `optseq2`
> inserts between events. Listing it as an `--ev` would be wrong; the help is
> explicit about this. Numeric event id `0` denotes NULL in the output paradigm
> files.

## Outputs

### Files Created

With output stem `outstem` (`--o`), `optseq2` writes
([`optseq2/optseq2.cpp:564-599`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L564-L599), [`#L1450-L1466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1450-L1466)):

| File / pattern | Format | Contents |
|----------------|--------|----------|
| `outstem-RRR.par` | paradigm file (ASCII) | one schedule per file, `RRR` = 3-digit zero-padded rank; `nkeep` of them. Four columns: onset time, numeric event id (0 = NULL), event duration, event label. |
| `outstem.sum` | ASCII summary | search conditions, per-schedule statistics table, ideal & actual FOCB matrices. Override with `--sum`. |
| `outstem.log` | ASCII log | running search-status lines (see column list under [Configuration Options](#complete-flag-reference)). Override with `--log`. |
| `outstem.xtxideal.mat` | Matlab-4 | the ideal $X^{\mathsf T}X$ for the nominal repetition counts ([`optseq2/optseq2.cpp:310-313`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L310-L313)). |
| `mtxstem_RRR.mat` | Matlab-4 | (only with `--mtx`) the full FIR+nuisance design matrix `X` for each kept schedule. |
| `cmtxfile` | ASCII / Matlab | (only with `--cmtx`) the contrast matrix `C`. |
| `SvIterFile` | ASCII | (only with `--sviter`) one line of costs per *every* iteration — can become very large. |

### Output Specifications

The `*.par` files are timing descriptors, not images. The design matrices in
`*.mat` are $N_{tp}\times N_\beta$ real matrices, where
$N_\beta = n_{\text{PSD}}\cdot n_{\text{EV}} + (\text{PolyOrder}+1)$, with
$n_{\text{PSD}} = (\text{PSDMax}-\text{PSDMin})/\text{dPSD}$. The FIR columns
encode, for each event type, a shifted unit response at each PSD bin; the
nuisance columns are the polynomial regressors (see below).

## Mathematical Foundations

### Forward model and the FIR design matrix

`optseq2` assumes a linear (deconvolution) model with no assumed hemodynamic
shape. For a schedule it builds an FIR design matrix `Xfir` (via
`EVSfirMtxAll`, [`utils/evschutils.cpp:156`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L156)) whose columns are, for each
event type, a set of $n_{\text{PSD}}$ unit-height regressors offset across the
PSD window $[\text{PSDMin},\text{PSDMax})$ in steps of `dPSD`. Optional
polynomial nuisance regressors `Xpoly` are appended to form
$X = [\,X_{\text{fir}}\;\;X_{\text{poly}}\,]$. The model is

$$
y = X\beta + n, \qquad \hat\beta = (X^{\mathsf T}X)^{-1}X^{\mathsf T} y,
$$

and a contrast is $\hat g = C\hat\beta$ ([`optseq2/optseq2.cpp:1180-1184`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1180-L1184)).
The polynomial regressors are built explicitly in the driver: order 0 is a column
of ones (baseline), order 1 a normalised linear ramp $(n-N_{tp}/2)/(N_{tp}/2)$,
order 2 a normalised quadratic — maximum order 2
([`optseq2/optseq2.cpp:201-210`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L201-L210), [`#L1469-L1472`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1469-L1472)).

### Cost functions (all derived from $C(X^{\mathsf T}X)^{-1}C^{\mathsf T}$)

The key quantity is the contrast covariance (up to noise variance)
$M = C\,(X^{\mathsf T}X)^{-1}C^{\mathsf T}$, a $J\times J$ matrix where $J$ is the
number of contrast rows. By default $C$ is the identity over the task
(non-nuisance) regressors, so $J = n_{\text{PSD}}\cdot n_{\text{EV}}$
([`utils/evschutils.cpp:833-840`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L833-L840)). From its diagonal, `EVSdesignMtxStats`
computes ([`utils/evschutils.cpp:851-864`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L851-L864)):

**Efficiency** — the cost maximised by default:

$$
\text{eff} \;=\; \frac{1}{\operatorname{trace}\!\big(C\,(X^{\mathsf T}X)^{-1}C^{\mathsf T}\big)}
\;=\; \frac{1}{\sum_{m} M_{mm}}.
$$

The trace measures the summed estimation variance of the contrast; maximising
`eff` minimises the average error in $\hat g$. Nuisance regressors are excluded
from the trace but included in the inverse.

**Variance Reduction Factor (VRF)** — per estimator, the inverse of its variance:

$$
\text{VRF}_m = \frac{1}{M_{mm}}, \qquad
\text{vrfavg} = \overline{\text{VRF}_m}, \qquad
\text{vrfstd} = \operatorname{std}_m(\text{VRF}_m),
$$

with `vrfmin`, `vrfmax`, `vrfrange` the order statistics over $m$.

The `--cost` flag selects which scalar is maximised
([`utils/evschutils.cpp:764-797`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L764-L797)):

| `--cost` | Maximised quantity (internally a "cost" to maximise) |
|----------|------------------------------------------------------|
| `eff` (default) | $\text{eff}$ |
| `vrfavg` | $\text{vrfavg}$ |
| `vrfavgstd` $W$ | $\text{vrfavg} - W\cdot\text{vrfstd}$ (penalise uneven VRFs) |
| `effinv` | $1/(\text{eff}+10^{-12})$ — finds the **worst** schedules |

(The header also defines `vrfstd` → $-\text{vrfstd}$ and `idealxtx` →
$-\text{idealxtxerr}$ cost ids, which exist in the library but are not advertised
in the usage block, [`utils/evschutils.cpp:779-790`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L779-L790).)

### First-order counter-balancing (FOCB)

Independently of timing, `--focb` pre-optimises the **order** of events so that
the empirical transition probabilities $P_{ij}$ (probability event type $j$ is
followed by type $i$) match the ideal expected from the repetition counts. The
FOCB error is the mean relative deviation
([`utils/evschutils.cpp:688-711`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L688-L711)):

$$
\text{cb1err} \;=\; \frac{1}{n_{\text{EV}}^2}\sum_{i,j}
\frac{\big|\,P^{\text{ideal}}_{ij} - P_{ij}\,\big|}{P^{\text{ideal}}_{ij}}.
$$

For each search iteration, `EVScb1Optimize` draws `--focb` random sequences and
keeps the one with the smallest `cb1err` before timing is added
([`utils/evschutils.cpp:371-393`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L371-L393)). FOCB requires ≥ 2 event types.

### Schedule synthesis (the jitter)

`EVSsynth` ([`utils/evschutils.cpp:261-366`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L261-L366)) builds the timing: it computes
the total NULL time $t_{\text{null}} = t_{\text{scan}} - t_{\text{stim}}$,
converts it to $\lfloor t_{\text{null}}/\text{dPSD}\rfloor$ NULL slots, and then
**randomly permutes** the non-NULL events among the NULL slots
(`RandPermListLimit0`), enforcing that no run of back-to-back NULL slots exceeds
$\lfloor(\text{tNullMax}-\text{tNullMin})/\text{dPSD}\rfloor$ when `--tnullmax` is
set, and forcing the first slot to be non-NULL. Onset times then accumulate by
`dPSD` for NULL slots and by (duration + `tNullMin`) for event slots.

### AR(1) prewhitening (`--ar1 rho`)

With `--ar1`, the design is whitened before computing costs. The driver forms the
AR(1) covariance $M_{mn} = \rho^{|m-n|}$, inverts it, Cholesky-decomposes the
inverse, and keeps the upper triangle as the whitening matrix $W$
([`optseq2/optseq2.cpp:1652-1690`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1652-L1690)); the stats are then computed on $WX$
([`utils/evschutils.cpp:825-828`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L825-L828)). $\rho$ must lie in $(-1,1)$.

### Refractory penalty (`--pen alpha T dtmin`)

Models response-amplitude reduction when an event follows soon after the
previous one. Each event $n$ is given a weight
([`utils/evschutils.cpp:968-993`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L968-L993)):

$$
w_n = 1 - \alpha\,\exp\!\Big(-\frac{\Delta t_n + t_{\min}}{T}\Big),
$$

where $\Delta t_n$ is the gap from the previous event's offset to this event's
onset (clamped at 0). The help cites Huettel & McCarthy (NI, 2000) for the
defaults $\alpha = 0.8$, $T = 2.2$ s. $\alpha$ must lie in $[0,1]$.

> [!internal] The schedule/efficiency math lives in `evschutils`
> The FIR matrix construction (`EVSfirMtxAll`), the ideal $X^{\mathsf T}X$
> (`EVSfirXtXIdeal`), schedule synthesis (`EVSsynth`), the cost computation
> (`EVScost`, `EVSdesignMtxStats`), the FOCB matrices, and the refractory
> weighting are all in [`utils/evschutils.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp). `optseq2.cpp` orchestrates
> the search and owns only the polynomial, contrast, and AR(1) matrices and the
> Kahan-summed cost statistics ([`optseq2/optseq2.cpp:406-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L406-L419)).

### Design constraints (checked before searching)

$$
\underbrace{\sum_e t_e\,n_e \;\le\; N_{tp}\,TR + t_{\text{prescan}}}_{\text{(1) time constraint}}
\qquad
\underbrace{N_\beta = n_{\text{PSD}}\,n_{\text{EV}} + (\text{PolyOrder}+1) \;<\; N_{tp}}_{\text{(4) DOF constraint}}
$$

Violating (1) raises a "Time Constraint Violation"
([`optseq2/optseq2.cpp:291-302`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L291-L302)); violating (4) a "DOF Constraint Violation"
([`optseq2/optseq2.cpp:237-251`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L237-L251)). The help's rule of thumb is to size the run
so NULL gets as much time as the average event:
$\sum_e t_e n_e \,(n_{\text{EV}}{+}1)/n_{\text{EV}} = N_{tp}TR + t_{\text{prescan}}$ (eq. 3).

## Configuration Options

### Complete Flag Reference

All flags enumerated from `parse_commandline`
([`optseq2/optseq2.cpp:611-835`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L611-L835)) and the embedded help. Flags use `--`
prefixes; values are positional after each flag.

#### Data acquisition

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ntp` | int | *(required)* | Number of time points (volumes) acquired in **one run** (not the whole session). |
| `--tr` | float (s) | *(required)* | Time between functional volumes, seconds. Must be an integer multiple of `dPSD`. |
| `--tprescan` | float (s) | `0` | Begin stimulation this many seconds before the first volume is acquired (lets early events' responses be sampled). |

#### Event response and nuisance descriptors

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--psdwin` | `PSDMin PSDMax [dPSD]` (s) | dPSD = TR | FIR peristimulus window: minimum and maximum post-stimulus delay, and the sampling/onset granularity `dPSD`. The whole event response must fit in this window. |
| `--ev` | `label duration nreps` | — | Define one event type: text label, stimulus duration (s, multiple of `dPSD`), and number of repetitions per run. Repeat for each event type (≤ 500). **Exclude NULL.** |
| `--repvar` | `pct [per-evt]` | off | Let the per-event repetition counts vary by ±`pct` % (optimise over $n_e$). Without `per-evt`, all event types scale together; with it, each varies independently. Total stim time is computed from the **maximum** possible reps. |
| `--polyfit` | int (0–2) | none | Add polynomial nuisance regressors up to this order (0 = baseline, 1 = +linear, 2 = +quadratic). Not included in the cost trace. |
| `--tnullmin` | float (s) | `0` | Force at least this much NULL between successive stimuli. Note duration + `tNullMin` must be a multiple of `dPSD`. |
| `--tnullmax` | float (s) | ∞ | Cap the longest contiguous NULL period. May be infeasible for a given parameter set ("could not enforce tNullMax"). |

#### Searching and cost

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nsearch` | int | — | Search over exactly this many schedules. Mutually exclusive with `--tsearch`. |
| `--tsearch` | float (hr) | — | Search for this many hours. Mutually exclusive with `--nsearch`. |
| `--focb` | int | `0` | Pre-optimise first-order counter-balancing: try this many random orderings per iteration and keep the best-balanced. Requires ≥ 2 event types. |
| `--ar1` | float | `0` | Prewhiten with an AR(1) model of parameter `rho` ∈ (−1, 1) when scoring. |
| `--pen` | `alpha T dtmin` | off | Refractory penalty $1-\alpha e^{-(\Delta t+t_{\min})/T}$; `alpha` ∈ [0, 1]. Greve cites $\alpha{=}0.8,\,T{=}2.2$. |
| `--evc` | `c1 … cN` | identity | Event contrast: one weight per event type. Builds the contrast matrix `C`. Weights are **not** renormalised. Mutually exclusive with `--C`. |
| `--C` | file | — | Load the contrast matrix from an ASCII file instead of `--evc`. Mutually exclusive with `--evc`. |
| `--cost` | `name [param]` | `eff` | Cost function: `eff`, `vrfavg`, `vrfavgstd W`, `effinv` (see [math](#cost-functions-all-derived-from-cxtx-1ct)). `vrfavgstd` requires the weight `W`. |
| `--sumdelays` | bool | off | When forming `C` from `--evc`, sum across the PSD delays so `C` has one row per contrast instead of one per delay. |
| `--seed` | long | time-of-day | Seed `drand48()` for reproducibility; omitted ⇒ seeded from `gettimeofday` microseconds. |

#### Output

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--nkeep` | int | *(required)* | Number of best schedules to save (`outstem-RRR.par`). Cheap to raise — keep more than you think you need. |
| `--o` | stem | — | Output stem; schedules go to `outstem-RRR.par`, and `outstem.sum`/`.log` are defaulted from it. |
| `--mtx` | stem | — | Also save each kept schedule's design matrix to `mtxstem_RRR.mat` (Matlab-4). |
| `--cmtx` | file | — | Save the contrast matrix to this file. |
| `--sum` | file | `outstem.sum` | Explicit summary-file path. |
| `--log` | file | `outstem.log` | Explicit log-file path (must differ from the summary file). |
| `--pctupdate` | float (%) | `10` | Print a status line every this-percent of the search. |
| `--sviter` | file | — | Save a costs line for **every** iteration (warning: huge file). |

#### Input / initialisation, help

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--i` | stem | — | Load all `instem-RRR.par` schedules to seed the search or (with `--nosearch`) re-score/re-export them. Cannot be combined with `--nkeep`. |
| `--in` | file (repeatable) | — | Like `--i` but name each schedule file individually. |
| `--nosearch` | bool | off | Do not search; only summarise/export the input schedules (requires `--i`/`--in`). |
| `--update` / `--noupdate` | bool | update on | Enable/disable periodic status printing. |
| `--debug` | bool | off | Verbose parser/debug output. |
| `--help` | bool | — | Print the full help page (the authoritative long-form documentation) and exit. |
| `--version` | bool | — | Print version string and exit. |

### Configuration Interactions

> [!gotcha] `--nsearch` and `--tsearch` are mutually exclusive
> Specify the search budget by iteration count **or** by wall-clock time, not
> both. The search loop terminates on whichever of `nSearch`/`tSearch` is set
> ([`optseq2/optseq2.cpp:350-358`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L350-L358)); the help states both may not be given.

> [!gotcha] `--evc` and `--C` cannot both be set
> Providing a contrast vector and loading a contrast matrix from file is an
> immediate error in either order ([`optseq2/optseq2.cpp:731-759`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L731-L759)). Choose one
> way to specify `C`.

> [!gotcha] `--i` (input schedules) conflicts with `--nkeep`
> When reading schedules in, `nKeep` is set from the number of input files;
> supplying `--nkeep` as well is an error
> ([`optseq2/optseq2.cpp:1416-1422`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1416-L1422)).

> [!gotcha] `--cost vrfavgstd` needs its weight argument
> `vrfavgstd` must be followed by a numeric weight $W$; omitting it (or following
> it with another flag) errors out ([`optseq2/optseq2.cpp:815-823`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L815-L823)).

> [!gotcha] The summary and log files must be different
> Defaulting both from `--o` keeps them distinct, but if you set `--sum` and
> `--log` to the same path the tool refuses to run
> ([`optseq2/optseq2.cpp:1496-1499`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1496-L1499)).

> [!gotcha] An output **or** an input is mandatory
> You must give `--o` or `--i`/`--in`; with neither, `optseq2` has nothing to
> write and exits ([`optseq2/optseq2.cpp:1446-1449`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1446-L1449)). When using only inputs
> without an output stem you must also name `--sum`/`--log` explicitly.

Other notable interactions:

- `--repvar` makes the ideal $X^{\mathsf T}X$ (and thus the FOCB ideal matrix)
  vary per iteration; the summary's printed ideal FOCB matrix uses the **nominal**
  reps, so it can disagree with the actual matrix (see [BUGS](#references)).
- `--focb` requires ≥ 2 event types; with one event type it errors
  ([`optseq2/optseq2.cpp:1404-1407`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1404-L1407)).
- `--evc` length must equal the number of `--ev` event types
  ([`optseq2/optseq2.cpp:1501-1504`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1501-L1504)).
- `--sumdelays` only affects the shape of `C` built from `--evc`.

## Typical Use Cases

### 1. Two-condition rapid event-related design

```bash
# 256 TRs at TR=2 s, FIR window 0-20 s; two conditions, 40 reps each, 2 s long.
optseq2 \
  --ntp 256 --tr 2 \
  --psdwin 0 20 2 \
  --ev cond_A 2 40 \
  --ev cond_B 2 40 \
  --nkeep 5 --nsearch 100000 \
  --o mydesign
# -> mydesign-001.par ... mydesign-005.par, mydesign.sum, mydesign.log
```

### 2. Optimise a specific contrast, time-bounded search

```bash
# Maximise efficiency for A-B; search for 1 hour, counter-balance the order.
optseq2 --ntp 256 --tr 2 --psdwin 0 20 2 \
  --ev A 2 40 --ev B 2 40 \
  --evc 1 -1 --sumdelays \
  --focb 100 --tsearch 1 \
  --nkeep 10 --o ab_contrast
```

### 3. Four conditions with jitter constraints and prescan (the bundled test)

```bash
# From optseq2/test.sh: emotion paradigm, NULL capped at 10 s, FOCB pre-opt.
optseq2 --ntp 180 --tr 2 --psdwin 0 24 1 \
  --ev Neutral-Short 3 24 --ev Neutral-Long 3 24 \
  --ev Fearful-Short 3 24 --ev Fearful-Long 3 24 \
  --polyfit 2 --tnullmax 10 --focb 100 \
  --nsearch 100 --nkeep 4 --o emot --seed 1234
```

### 4. Re-score existing schedules under a new cost

```bash
# Read schedules optimised elsewhere and report their stats only (no search).
optseq2 --ntp 256 --tr 2 --psdwin 0 20 2 \
  --ev A 2 40 --ev B 2 40 \
  --i mydesign --nosearch \
  --sum rescored.sum --log rescored.log
```

## Pipeline Context

`optseq2` is the **design** stage of an FSFAST event-related study and runs
entirely before imaging.

**Predecessor:** experimental-design decisions (conditions, run length, TR) →
**optseq2** → **Successors:** the stimulus-presentation program (which reads the
`*.par` schedule) and, after scanning, the FSFAST first-level GLM
(`mkanalysis-sess` defining the analysis, `selxavg3-sess` fitting it) or a
[[wiki/tools/mri_glmfit|mri_glmfit]] FIR/GLM that estimates the very responses
`optseq2` optimised. The `*.par` paradigm-file format is shared with FSFAST, so
the schedules drop directly into that analysis stream. `optseq2` has no
recon-all stage.

## Gotchas and Caveats

> [!gotcha] `vrfavgstd` is buggy with unequal repetition counts
> The help and source note that `vrfavgstd` mis-states the cost when event types
> have different numbers of repetitions, and recommend a prescan window ≥ the PSD
> window when using it ([`optseq2/optseq2.cpp:1228-1233`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1228-L1233)). Prefer `eff` or
> `vrfavg` unless you specifically need VRF-uniformity penalisation with equal
> reps.

> [!gotcha] dPSD controls onset granularity, not just window sampling
> Because event onsets are quantised to `dPSD`, a coarse `dPSD` (e.g. = TR)
> limits how finely the jitter can be placed. A finer `dPSD` (a fraction of the
> TR) allows more jitter resolution but increases $n_{\text{PSD}}$ and thus
> $N_\beta$, tightening the DOF constraint (eq. 4).

> [!gotcha] Equality in the time constraint leaves no room for jitter
> If $\sum_e t_e n_e$ is made equal to the scan time, there is no NULL time and
> hence no jitter — generally a poor design. The eq. 3 rule of thumb (NULL ≈ an
> average event) is a better target; combine with `--repvar` to optimise around
> it.

> [!gotcha] Reported ideal FOCB matrix uses nominal reps under `--repvar`
> With repetition variation on, the printed ideal counter-balance matrix is
> computed for the nominal reps, so comparing it against the actual matrix is not
> meaningful (the per-schedule `cb1err` is still correct). See BUGS in the help.

> [!gotcha] Ill-conditioned schedules are silently skipped
> Schedules whose $X^{\mathsf T}X$ is singular are discarded
> ([`optseq2/optseq2.cpp:398-401`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L398-L401)); if *all* are singular the run aborts with
> advice to add time points or reduce reps, and if fewer than `nkeep` are
> well-conditioned it keeps only those ([`optseq2/optseq2.cpp:496-511`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L496-L511)).

## Error Compensation and Guard Rails

- **Quantisation checks.** `PSDMin`, `PSDMax`, TR, and each event duration
  (+`tNullMin`) are verified to be integer multiples of `dPSD`, with targeted
  error messages ([`optseq2/optseq2.cpp:214-235`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L214-L235)).
- **Constraint enforcement.** The time constraint (eq. 1) and DOF constraint
  (eq. 4) are checked before the search, each with concrete remediation advice.
- **Default file names.** `outstem.sum` and `outstem.log` are auto-derived from
  `--o`, and `dPSD` defaults to the TR — reducing the number of flags a basic run
  needs ([`optseq2/optseq2.cpp:1440`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1440), [`#L1459-L1466`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1459-L1466)).
- **Numerical hygiene.** The running cost mean/variance use Kahan compensated
  summation to limit float error accumulation over millions of iterations
  ([`optseq2/optseq2.cpp:406-419`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L406-L419)).
- **Range checks.** `--ar1 rho` is rejected outside $(-1,1)$ and `--pen alpha`
  outside $[0,1]$ ([`optseq2/optseq2.cpp:703-721`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L703-L721)).
- **Writability pre-check.** The output `*.par`, summary, and log files are
  opened for writing up front so the search does not run only to fail at save
  ([`optseq2/optseq2.cpp:1450-1494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L1450-L1494)).

## Related Tools

- [[wiki/tools/mri_glmfit|mri_glmfit]] — fits the GLM/FIR model (including the contrasts) on the data collected with an `optseq2` design; the same `X` structure `optseq2` optimises.
- [[mkanalysis-sess]] — FSFAST analysis-definition step that consumes the `*.par` paradigm files.
- [[selxavg3-sess]] — FSFAST first-level GLM estimation that uses the `optseq2` schedules.
- `optseq` *(no wiki page yet)* — the original predecessor tool that `optseq2` supersedes.

## Confidence and Gaps

**High confidence:** the complete flag set and mutual-exclusion rules, the
default behaviours (`dPSD = TR`, derived `.sum`/`.log`), the output file set and
paradigm-file columns, the constraint equations (1)/(4), and the full cost-function
mathematics — efficiency $1/\operatorname{trace}(C(X^{\mathsf T}X)^{-1}C^{\mathsf T})$,
the per-estimator VRFs, the FOCB error, AR(1) whitening, the refractory weight,
and the polynomial/contrast matrices — all read directly from
[`optseq2/optseq2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp) and
[`utils/evschutils.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp).

> [!gap] NULL-placement permutation details
> The exact algorithm `RandPermListLimit0` uses to randomly permute event vs.
> NULL slots under the `--tnullmax` back-to-back limit (and its retry budget of
> 1,000,000) was read only at the call site
> ([`utils/evschutils.cpp:326-332`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp#L326-L332)), not transcribed line-by-line.

> [!gap] FOCB probability-matrix construction
> `EVScb1ProbMatrix` / `EVScb1IdealProbMatrix` (which produce $P_{ij}$ and
> $P^{\text{ideal}}_{ij}$) were used via their results; the precise counting and
> normalisation were not fully traced.

> [!gap] `.mat` byte layout
> The Matlab-4 layout of `--mtx`/`--cmtx`/`xtxideal` outputs is produced by the
> shared `MatlabWrite`/`matfile` code and is not specified here.

## References

- **optseq2 help page** — the authoritative long-form documentation, printed by
  `optseq2 --help` ([`optseq2/optseq2.cpp:909`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp#L909) onward); includes ALGORITHM
  OVERVIEW, COST FUNCTIONS, CHOOSING PARAMETERS, and BUGS.
- Dale, A.M. (1999). Optimal experimental design for event-related fMRI.
  *Human Brain Mapping* 8:109–114. *(cited in the help)*
- Dale, A.M., Greve, D.N., & Burock, M.A. (1999). Optimal Stimulus Sequences for
  Event-Related fMRI. *5th Int. Conf. on Functional Mapping of the Human Brain*,
  Düsseldorf. *(cited in the help)*
- Huettel, S.A. & McCarthy, G. (2000). *NeuroImage* — source of the refractory
  penalty defaults $\alpha = 0.8$, $T = 2.2$ s (cited at
  [`optseq2/optseq2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp) `--pen` help).
- FreeSurfer source: [`optseq2/optseq2.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/optseq2/optseq2.cpp),
  [`utils/evschutils.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/utils/evschutils.cpp) (v8.2.0).
- Optseq home page: `http://surfer.nmr.mgh.harvard.edu/optseq`.
