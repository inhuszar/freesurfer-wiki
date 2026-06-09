---
title: "mris_anatomical_stats"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_anatomical_stats/mris_anatomical_stats.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_ca_label]]"
  - "[[mri_aparc2aseg]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
  - "[[surface-format]]"
  - "[[curv-format]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "MRISvolumeTH3() implementation not traced in shared lib — exact triangular decomposition not confirmed"
  - "FoldingIndex and IntrinsicCurvatureIndex exact formulations vs Fischl & Dale 2000 not verified from code"
  - "Exact semantics of -h/-m intensity-histogram outputs not traced through compute path"
tags:
  - surface
  - parcellation
  - morphometry
  - stats
  - autorecon3
---

# mris_anatomical_stats

## Summary

`mris_anatomical_stats` computes per-parcel surface morphometric statistics for
each region in a cortical parcellation [[annotation-format|annotation]] (`?h.aparc.annot`). For every
parcel it reports the number of vertices, surface area, gray matter volume (using
the TH3 pial-white prism method), mean and standard deviation of cortical
thickness, and four curvature-based shape measures. The results are written to
`stats/?h.aparc.stats` (or other named [[stats-format|stats files]]), which are the primary
outputs used for group-level cortical morphometry analysis.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_anatomical_stats/mris_anatomical_stats.cpp` (1742 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_anatomical_stats`
- **Original Author:** Bruce Fischl

## Purpose and Context

After cortical parcellation by [[mris_ca_label]], each surface vertex carries a
label identifying its anatomical region. `mris_anatomical_stats` aggregates these
per-vertex labels into per-region summary statistics, answering the fundamental
question: *how large, thick, curved, and gyrified is each cortical region in this
subject?*

In [[wiki/pipelines/recon-all|recon-all]] the tool is invoked four times per hemisphere across three
distinct stages (`-parcstats`, `-parcstats2`, `-parcstats3`):
- `aparc` (Desikan–Killiany), white surface → `stats/?h.aparc.stats`
- `aparc` (Desikan–Killiany), pial surface  → `stats/?h.aparc.pial.stats`
- `aparc.a2009s` (Destrieux),    white      → `stats/?h.aparc.a2009s.stats`
- `aparc.DKTatlas` (DKT atlas),  white      → `stats/?h.aparc.DKTatlas.stats`

These stats files are the standard inputs for group-level ROI analysis in
FreeSurfer (e.g., `aparcstats2table`, group comparison scripts).

## Inputs

### Required Inputs

| Argument | Position | Description |
|----------|----------|-------------|
| `subject` | 1 | Subject directory name |
| `hemi` | 2 | Hemisphere (`lh` or `rh`) |
| `surfname` | 3 (optional) | Surface to use (default: `white`) |

Implicit inputs (resolved from subject directory):

| File | Description |
|------|-------------|
| `surf/?h.white` | White surface (area computation, TH3 volume) |
| `surf/?h.pial` | Pial surface (TH3 gray matter volume) |
| `surf/?h.thickness` | Per-vertex cortical thickness (or other file via `-T`) |
| `surf/?h.area` | Per-vertex surface area (read from curvature file) |
| `surf/?h.curv` | Mean curvature (used for `MeanCurv` column) |
| `surf/?h.white.H` | Mean curvature on white surface |
| `surf/?h.white.K` | Gaussian curvature on white surface |
| `label/?h.aparc.annot` | Cortical parcellation annotation |
| `label/?h.cortex.label` | Cortex label (defines cortical vertices; used with `-cortex`) |
| `mri/ribbon.mgz` | Ribbon mask (read when computing TH3 volumes) |

### Input Assumptions

> [!assumption] Annotation must use FreeSurfer color table labels
> The annotation file (`?h.aparc.annot`) must contain labels from the FreeSurfer
> [[color-lut|color lookup table]]. Unknown (label 0), `corpuscallosum`, `Medial_wall`, and
> `Unknown` regions are skipped during statistics computation.

> [!assumption] White and pial surfaces must be coregistered
> The TH3 volume computation requires the white and pial surfaces to be in the
> same coordinate space and fully coregistered with each other. Since recon-all
> produces them together this is always true, but stand-alone use requires care.

> [!assumption] Thickness file must be in same surface topology
> The thickness file (default `surf/?h.thickness`, or the file specified by `-T`)
> must have one value per vertex in the same order as the annotation.

## Outputs

### Files Created

| File | Format | Content |
|------|--------|---------|
| `stats/?h.aparc.stats` | ASCII text | Per-parcel morphometric statistics |
| `stats/?h.aparc.a2009s.stats` | ASCII text | Same, for Destrieux parcellation |
| `stats/?h.aparc.DKTatlas.stats` | ASCII text | Same, for DKT atlas |

### Output File Structure

Each stats file contains two sections:

**Global measures (header comments):**
```
# Measure lhCortex, lhCortexVol, Left hemisphere cortical gray matter volume, ... mm^3
# Measure lhCortexSurf, lhWhiteSurfArea, Left hemisphere total white surface area, ... mm^2
# Measure lhCortex, lhThickAvg, Mean thickness of left hemisphere cortical gray matter, ... mm
# ...
```

**Per-region table (tab-delimited):**

| Column | Variable | Description |
|--------|----------|-------------|
| `StructName` | annotation label name | Region name from color table |
| `NumVert` | `dofs[i]` | Number of vertices in the parcel |
| `SurfArea` | `areas[i]` | Total surface area (mm²) |
| `GrayVol` | `volumes[i]` | Cortical gray matter volume via TH3 (mm³) |
| `ThickAvg` | mean of thickness | Mean thickness (mm) |
| `ThickStd` | std of thickness | Standard deviation of thickness (mm) |
| `MeanCurv` | `fmeans[i]` | Integrated rectified mean curvature (mm⁻¹) |
| `GausCurv` | `gmeans[i]` | Integrated rectified Gaussian curvature (mm⁻²) |
| `FoldInd` | `findices[i]` | Folding index (dimensionless) |
| `CurvInd` | `cindices[i]` | Intrinsic curvature index (dimensionless) |

## Mathematical Foundations

### Gray Matter Volume: TH3 Method

The default volume computation (`UseTH3Vol = 1`, enabled by `-th3`) uses
`MRISvolumeTH3()`, which computes the volume of the prism-shaped layer between
the white and pial surfaces for each triangular face:

$$
V_{\text{parcel}} = \sum_{f \in \text{parcel}} V_{\text{prism}}(f)
$$

where each prism has three vertices from the white surface and three from the
corresponding pial surface. The prism volume accounts for local thickness
variation across each triangle and is more accurate than ribbon-based voxel
counting, especially near gyral crowns and sulcal depths where the ribbon is
geometrically complex.

The TH3 label restriction additionally clips the volume to the cortex label,
excluding non-cortical surfaces (medial wall).

> [!gap] MRISvolumeTH3() triangular decomposition not traced
> The exact formula for the prism volume — whether it uses a decomposition into
> tetrahedra or another method — is in the shared `mrisurf` library and was
> not traced in this session.

### Surface Area

The surface area of each parcel is the sum of vertex areas assigned to that
parcel, where vertex area is the Voronoi-like area contribution of each vertex
to its surrounding triangles (stored in `surf/?h.area`):

$$
A_{\text{parcel}} = \sum_{v \in \text{parcel}} a_v
$$

### Thickness Statistics

For a parcel containing vertices $\mathcal{V}$:

$$
\bar{\tau} = \frac{1}{|\mathcal{V}|} \sum_{v \in \mathcal{V}} \tau(v), \quad
  \sigma_\tau = \sqrt{\frac{1}{|\mathcal{V}|-1} \sum_{v \in \mathcal{V}} (\tau(v) - \bar{\tau})^2}
$$

where $\tau(v)$ is the thickness at vertex $v$ (from `surf/?h.thickness`).
Vertices with thickness $\le$ `ignore_below` (default 0) or $\ge$ `ignore_above`
(default 20 mm) are excluded from the average.

### Curvature Measures

Let $\kappa_1(v)$ and $\kappa_2(v)$ be the two principal curvatures at vertex $v$
(computed from `surf/?h.white`):

**Mean curvature:** $H(v) = (\kappa_1(v) + \kappa_2(v)) / 2$

**Gaussian curvature:** $K(v) = \kappa_1(v) \cdot \kappa_2(v)$

**Integrated rectified mean curvature** (MeanCurv column):
$$
C_H = \frac{1}{A_{\text{parcel}}} \sum_{v \in \text{parcel}} |H(v)| \cdot a_v
$$

**Integrated rectified Gaussian curvature** (GausCurv column):
$$
C_K = \frac{1}{A_{\text{parcel}}} \sum_{v \in \text{parcel}} |K(v)| \cdot a_v
$$

**Folding Index** (Fischl & Dale 2000):
$$
\text{FI} = \frac{1}{4\pi} \sum_{v \in \text{parcel}} |\kappa_1(v)| (|\kappa_1(v)| - |\kappa_2(v)|) \cdot a_v
$$

where $|\kappa_1| \ge |\kappa_2|$ (principal curvatures sorted by absolute value).
FI measures how much a surface folds beyond a sphere.

**Intrinsic Curvature Index** (related to Gauss-Bonnet theorem):
$$
\text{ICI} = \frac{1}{4\pi} \sum_{v \in \text{parcel}} \max(0, K(v)) \cdot a_v
$$

Positive Gaussian curvature (gyral crowns, sulcal depths) contributes to ICI;
negative curvature (saddle points) does not.

> [!gap] FoldingIndex and IntrinsicCurvatureIndex exact formulations
> The exact expressions above are from Fischl & Dale (2000) and the FreeSurfer
> manual. Their precise implementation in `mris_anatomical_stats.cpp` (the
> exact normalization factors and how `findices[i]` / `cindices[i]` are
> accumulated) was not verified line-by-line from the source in this session.

## Configuration Options

### Complete Flag Reference

Option parsing is in `get_option()` ([lines 1115–1287](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L1115-L1287)). Multi-letter flags are
matched case-insensitively with `stricmp`; single-letter flags fall through a
`switch (toupper(*option))`, so e.g. `-a` and `-A`, `-b` and `-B`, `-l` and `-L`
are all equivalent. Long options also accept a leading `--` (e.g. `--help`,
`--version`).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `subject` | positional 1 | — | Subject directory name (under `$SUBJECTS_DIR`) |
| `hemi` | positional 2 | — | Hemisphere (`lh` or `rh`) |
| `surfname` | positional 3 (optional) | `white` (`WHITE_MATTER_NAME`) | Surface read as `surf/?h.<surfname>` for area/curvature stats. Note: this is the surface used for vertex enumeration, areas and curvature; the white/pial pair used for TH3 volume is set via `-white`/`-pial`. |
| `-a <annot>` | string | unset | Annotation file stem; reads `label/?h.<annot>.annot`. If omitted the tool falls back to a label file (`-l`). |
| `-b` (or `-B`) | bool | OFF | Tabular output mode: write one short-format line per structure (set `tabular_output_flag`). |
| `-c <ctabfile>` (or `-C`) | string | unset | Output color table file path written alongside the per-parcel stats (`annotctabfile`). |
| `-cortex <labelfile>` | string | unset | Mask `NumVert`, `SurfArea`, and `MeanThickness` to vertices listed in `<labelfile>` (loaded via `LabelRead`). **Takes an argument** — it is not a bool. recon-all passes `-cortex ../label/$hemi.cortex.label`. |
| `-COR` | bool | OFF | Treat companion volumes (e.g. `wm`, `ribbon`) as legacy COR format instead of MGZ. Sets `MGZ = 0`. |
| `-crosscheck` | bool | OFF | Cross-check whole-cortex `NumVert` and `SurfArea` against the sum across all annotation structures (sets `crosscheck = 1`). |
| `-f <tablefile>` (or `-F`) | string | unset | Write the per-parcel stats table to `<tablefile>` (`tablefile`). recon-all uses this for `stats/?h.aparc.stats` etc. |
| `-h <histofile>` (or `-H`) | string | unset | Write histograms of intensity distributions inside the cortical ribbon to `<histofile>` (sets `histo_flag = 1`, `gray_histo_name`). Used together with `-m`. |
| `-I <ignore_below> <ignore_above>` (or `-i`) | float float | `0` and `20` | **Two arguments.** Restrict the thickness range used in mean/std to `(ignore_below, ignore_above)` mm; vertices outside this range are dropped from the thickness statistics. |
| `-l <labelfile>` (or `-L`) | string | unset | Limit the entire computation to vertices inside `<labelfile>` (`label_name`). Used in single-label mode (no `-a`). |
| `-log <file>` | string | unset | Tee the per-structure summary to `<file>` (`log_file_name`). Despite the name, this is a *log file*, not "log scale output". |
| `-m <mri>` (or `-M`) | string | unset | Compute intensity histograms for each parcel using `<mri>` as the source volume (`mri_name`). Pairs with `-h`. |
| `-mgz` | bool | **ON** | Read companion volumes (`wm`, `ribbon`, ...) in MGZ format. `MGZ` is initialised to `1`, so this flag is redundant when set explicitly; it exists for symmetry with `-COR`. |
| `-noheader` | bool | OFF | Suppress the `#`-comment header block at the top of the log/stats file (`noheader = 1`). |
| `-noglobal` | bool | OFF | Skip computation of whole-hemisphere global measures (`DoGlobalStats = 0`). recon-all sets this when run as `-rh-only` or `-lh-only`. |
| `-nsmooth <n>` | int | `0` | Smooth the thickness map by `<n>` nearest-neighbour averaging steps before computing per-parcel statistics. |
| `-pial <name>` | string | `pial` | Pial surface stem used for TH3 volume (`surf/?h.<name>`). |
| `-sdir <dir>` | string | `$SUBJECTS_DIR` | Override `SUBJECTS_DIR` for this run; also `putenv`'d into the process environment. |
| `-suffix <s>` | string | — | **Removed.** Accepted for backwards compatibility; emits a warning and ignores the argument. |
| `-T <name>` (or `-t`) | string | `thickness` | Thickness overlay stem (`surf/?h.<name>`). Note that there is no `-t <table>` flag — the table file is `-f`. |
| `-th3` | bool | ON | Use the TH3 (pial-white prism) volume method (`UseTH3Vol = 1`). This is the initialised default; the flag exists so the option can be propagated explicitly via `$TH3Opt`. |
| `-no-th3` | bool | OFF | Disable TH3 and fall back to ribbon-style volume accounting unless the input was already pre-computed as TH3. |
| `-v <vno>` (or `-V`) | int | `-1` | Set diagnostic vertex number (`Gdiag_no`) for verbose tracing. |
| `-white <name>` | string | `white` | White surface stem used for area and TH3 volume (`surf/?h.<name>`). |
| `-?`<br>`-u`<br>`-U` | bool | — | Print the short usage string (`print_usage`). |
| `--help`<br>`--usage` | bool | — | Print the long help (XML help payload) and exit. |
| `--version` | bool | — | Print version info and exit. |

### Configuration Interactions

> [!gotcha] Annotation mode (`-a`) vs label mode (`-l`)
> The tool runs in one of two mutually exclusive modes:
> - **Annotation mode** — `-a <annot>` reads `label/?h.<annot>.annot` and
>   loops over every label in the embedded color table, producing the
>   per-parcel stats table.
> - **Single-label mode** — `-l <labelfile>` (or `-L`) loads a single label
>   file and produces statistics for that one label only.
>
> If neither is given, the tool computes stats for the whole `surfname`
> surface (no parcellation). `-a` and `-l` should not be combined.

> [!gotcha] `-cortex` takes an argument and is independent of `-l`
> Despite the name, `-cortex` is not a switch; it takes a label file path:
> `-cortex ../label/?h.cortex.label`. It restricts the *global* `NumVert`,
> `SurfArea`, and `MeanThickness` summary lines to vertices inside that
> label (it does NOT restrict per-parcel rows). It is independent of `-l`,
> which scopes the parcel computation itself.

> [!gotcha] `-th3` is ON by default; `-no-th3` reverts to ribbon counting
> `UseTH3Vol` is initialised to `1`, so `-th3` is redundant when explicit.
> recon-all still passes `$TH3Opt` (which expands to `-th3` by default) so
> the per-call command line is self-documenting. `-no-th3` falls back to
> ribbon-based volume accounting; the source comment notes that since
> 6/16/25 the per-vertex `?h.volume` overlay is itself computed with TH3,
> so even `-no-th3` may end up consuming TH3-derived per-vertex volumes.

> [!gotcha] `-I` (and `-i`) consumes TWO arguments
> Most flags take zero or one argument. `-I <ignore_below> <ignore_above>`
> consumes two floats and sets both thickness bounds at once. Passing only
> one numeric value will silently misparse the next token as the upper
> bound. recon-all does not pass this flag, so the defaults `(0, 20)` mm
> are used.

> [!gotcha] `-mgz` is the default; `-COR` is the legacy escape hatch
> `MGZ` is initialised to `1`, so the explicit `-mgz` flag in recon-all is
> a no-op kept for clarity. Use `-COR` only on legacy COR-format trees.

> [!gotcha] `-f` controls only the parcel table file
> Without `-f <tablefile>` the per-parcel table is printed to stdout only.
> The global summary lines go to `<log_file>` if `-log` is given. recon-all
> always sets `-f stats/?h.aparc.stats` (and friends).

> [!gotcha] `-a` annotation stem vs positional `surfname`
> The annotation is specified with `-a <annot>`, while the surface is a
> positional argument. There is **no** fourth positional argument. The
> recon-all invocation is, schematically:
> `mris_anatomical_stats $TH3Opt -mgz [-cortex ?h.cortex.label] -f $stats -b -a $annot -c $ctab $subjid $hemi white`
> Older documentation that lists `aparc` as a fourth positional is wrong.

> [!gotcha] Skipped label names are hard-coded
> The label names `corpuscallosum`, `unknown`, `Medial_wall`, and `Unknown`
> are always skipped ([lines 882–895](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_anatomical_stats/mris_anatomical_stats.cpp#L882-L895)) regardless of annotation. No flag
> controls this.

## Typical Use Cases

### Use Case 1: Standard Desikan–Killiany parcellation stats (recon-all)

```bash
mris_anatomical_stats -th3 -mgz \
    -cortex $SUBJECTS_DIR/$subjid/label/lh.cortex.label \
    -f $SUBJECTS_DIR/$subjid/stats/lh.aparc.stats -b \
    -a $SUBJECTS_DIR/$subjid/label/lh.aparc.annot \
    -c $SUBJECTS_DIR/$subjid/label/aparc.annot.ctab \
    $subjid lh white
```

### Use Case 2: Destrieux (a2009s) parcellation stats

```bash
mris_anatomical_stats -th3 -mgz \
    -cortex $SUBJECTS_DIR/$subjid/label/lh.cortex.label \
    -f $SUBJECTS_DIR/$subjid/stats/lh.aparc.a2009s.stats -b \
    -a $SUBJECTS_DIR/$subjid/label/lh.aparc.a2009s.annot \
    -c $SUBJECTS_DIR/$subjid/label/aparc.annot.a2009s.ctab \
    $subjid lh white
```

### Use Case 3: Stats for the pial surface (`?h.aparc.pial.stats`)

```bash
mris_anatomical_stats -th3 -mgz \
    -f $SUBJECTS_DIR/$subjid/stats/lh.aparc.pial.stats -b \
    -a $SUBJECTS_DIR/$subjid/label/lh.aparc.annot \
    -c $SUBJECTS_DIR/$subjid/label/aparc.annot.ctab \
    $subjid lh pial
```

### Use Case 4: DKT atlas parcellation stats

```bash
mris_anatomical_stats -th3 -mgz \
    -f $SUBJECTS_DIR/$subjid/stats/lh.aparc.DKTatlas.stats -b \
    -a $SUBJECTS_DIR/$subjid/label/lh.aparc.DKTatlas.annot \
    -c $SUBJECTS_DIR/$subjid/label/aparc.annot.DKTatlas.ctab \
    $subjid lh white
```

### Use Case 5: Single-label stats (no parcellation)

```bash
mris_anatomical_stats -th3 -mgz \
    -l $SUBJECTS_DIR/$subjid/label/lh.BA1_exvivo.label \
    $subjid lh white
```

## Pipeline Context

**autorecon3 — Parcellation Stats stage**

```
[[mris_ca_label]] → label/?h.aparc.annot
                       ↓
  mris_anatomical_stats $TH3Opt -mgz [-cortex ?h.cortex.label] \
      -f stats/?h.aparc.stats -b -a ?h.aparc.annot -c aparc.annot.ctab \
      $subjid $hemi white
                       ↓
              stats/?h.aparc.stats
```

**recon-all command pattern** (from `recon-all` lines ~5186–5287, three
distinct stages `-parcstats`, `-parcstats2`, `-parcstats3`):

```bash
set cmd = (mris_anatomical_stats $TH3Opt -mgz)
if ($RHonly || $LHonly) set cmd = ($cmd -noglobal)
if ($UseAseg)           set cmd = ($cmd -cortex ../label/$hemi.cortex.label)
set cmd = ($cmd -f $stats -b -a $annot -c $ctab $xopts $subjid $hemi $surfname)
```

`$TH3Opt` expands to `-th3` when `UseTH3Vol = 1` (the default). The
`-parcstats` stage runs the call twice (once with `surfname = white` →
`?h.aparc.stats`, once with `surfname = pial` → `?h.aparc.pial.stats`),
while `-parcstats2` and `-parcstats3` each run it once on `white` for the
Destrieux (`aparc.a2009s`) and DKT (`aparc.DKTatlas`) parcellations
respectively. Across both hemispheres this is **eight** invocations per
subject, not six.

**Predecessors:** [[mris_ca_label]] produces `?h.aparc*.annot`; pial and
white surfaces come from earlier autorecon2 stages.

**Successors:** None within the standard pipeline — the stats files are
terminal artifacts read by group-level scripts (`aparcstats2table`).
[[mri_aparc2aseg]] runs in parallel with the parcstats stages but does
not consume `?h.aparc.stats`.

## Gotchas and Caveats

> [!gotcha] GrayVol uses the TH3 prism method, not ribbon voxels
> The `GrayVol` column is computed from the geometric volume of white-to-pial
> surface prisms (`MRISvolumeTH3`), not from counting voxels in `ribbon.mgz`.
> This means two subjects can have the same ribbon volume but different
> `GrayVol` if their pial surface placement differs. The TH3 method is more
> sensitive to pial surface accuracy than the ribbon method.

> [!gotcha] Thickness bounds filter (ignore_below / ignore_above)
> By default, vertices with thickness ≤ 0 mm or ≥ 20 mm are excluded from
> `ThickAvg` and `ThickStd`. This prevents pathological thickness values (from
> pial surface placement errors) from contaminating the mean. In subjects with
> extreme atrophy, many cortical vertices may be filtered out, producing
> `NumVert` ≠ number of vertices used for thickness stats.

> [!gotcha] FoldInd and CurvInd are not per-vertex averages
> The `FoldInd` (folding index) and `CurvInd` (intrinsic curvature index) are
> integrated over the parcel surface area, not averaged per vertex. Larger
> parcels will generally have higher raw values. To compare across subjects
> or parcels of different sizes, normalise by surface area.

> [!gotcha] NumVert includes all annotation vertices, not just cortex
> Unless `-cortex` is passed, `NumVert` counts all vertices with the given
> annotation label, including non-cortical vertices (medial wall vertices
> that happen to be labelled). recon-all does NOT pass `-cortex` by default,
> so `NumVert` may include medial-wall vertices with cortical parcel labels
> if the annotation is not well-constrained.

> [!gotcha] Multiple calls produce separate files, not an accumulating file
> Each call to `mris_anatomical_stats` with `-a aparc`, `-a aparc.a2009s`,
> or `-a aparc.DKTatlas` produces a completely separate output file. There
> is no combined output; downstream tools like `asegstats2table` must be
> called separately for each parcellation.

## Related Tools

- [[mris_ca_label]] — produces `?h.aparc*.annot` (annotation input)
- [[mri_aparc2aseg]] — projects cortical labels to volume space (parallel output)
- [[pctsurfcon]] — companion surface-stats tool: computes the per-vertex white/grey percent-contrast overlay and per-parcel summary stats, complementing the thickness/area/curvature morphometrics produced here
- [[mris_calc]] — per-vertex arithmetic on the same surface overlays consumed here
- [[wiki/pipelines/recon-all|recon-all]] — the orchestrator that invokes this tool in the parcstats stages
- [[wiki/tools/freeview|freeview]] — visualises the input annotations and surfaces
- [[surface-format]] — geometry file the white/pial/surfname surfaces are read from
- [[curv-format]] — per-vertex overlay format used for `?h.thickness`, `?h.area`, `?h.curv`, `?h.white.H`, `?h.white.K`

## Confidence and Gaps

Confidence **high** for output column definitions, TH3 volume concept, recon-all
integration, and flag semantics. Mathematical formulas for curvature indices
are from Fischl & Dale (2000) — their exact code-level implementation was not
line-by-line verified.

> [!gap] MRISvolumeTH3 implementation
> The triangular prism decomposition inside `MRISvolumeTH3()` is in the shared
> `mrisurf` library and was not traced. The exact algorithm (tetrahedral
> decomposition vs. prismatic formula) was not confirmed from the source.

> [!gap] Intensity-histogram output (`-h`/`-m`) compute path
> The `-h <histofile>` / `-m <volume>` pair triggers a per-parcel intensity
> histogram dump but the downstream code that consumes those histograms (and
> its exact bin layout) was not traced in this session.

## References

- Fischl, B., Dale, A.M. (2000). *Measuring the thickness of the human cerebral
  cortex from magnetic resonance images.* PNAS, 97(20):11050–11055.
- Desikan, R.S., et al. (2006). *An automated labeling system for subdividing
  the human cerebral cortex on MRI scans into gyral based regions of interest.*
  NeuroImage, 31(3):968–980.
- Documentation: `https://surfer.nmr.mgh.harvard.edu/fswiki/mris_anatomical_stats`
  (accession: 2026-04-14)
