---
title: "mris_register"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_register/mris_register.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon3"
related:
  - "[[mris_sphere]]"
  - "[[mris_ca_label]]"
  - "[[wiki/pipelines/recon-all|recon-all]]"
status: review
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "MRISregister() optimization details (gradient computation, angular search) not traced — they live in the shared mrisurf library"
tags:
  - surface
  - registration
  - atlas
  - autorecon3
---

# mris_register

## Summary

`mris_register` registers a subject's spherical surface (`?h.sphere`) to a
group-average spherical atlas (`.gcs` file) by minimising the difference in
folding patterns between subject and atlas. The result (`?h.sphere.reg`) is
the registered sphere that brings all subjects into a common spherical
coordinate frame, enabling cross-subject vertex-wise comparisons and cortical
parcellation.

> [!gotcha] mris_register is called via rca-surfreg in recon-all 8.x
> In FreeSurfer 8.2.0, the surface registration stage in recon-all (`-surfreg`)
> calls the wrapper script `rca-surfreg`, not `mris_register` directly.
> The exact command issued by `rca-surfreg` (cross-sectional, no expert opts) is:
> ```
> mris_register -curv -threads $OMP_NUM_THREADS \
>     <surf>/?h.sphere <average>/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif <surf>/?h.sphere.reg
> ```
> with `-remove_negative 1` added under `--usenoneg`, and
> `-nosulc -norot <longbase>/surf/?h.sphere.reg` substituted for the input
> sphere under `--long`. The default `JosaReg` path (`--josa`) bypasses
> `mris_register` entirely in favour of `josareg`.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_register/mris_register.cpp` (1416 lines)
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_register`
- **Reference:** Fischl et al. (1999), NeuroImage 9(2):195–207

## Purpose and Context

Surface registration solves the problem of establishing vertex correspondence
across subjects (see [[registration-overview]] for the broader context, and
[[surface-representations]] for the family of FreeSurfer surface meshes).
Two subjects' cortical surfaces have very different shapes, but their folding
patterns (gyral/sulcal organisation) are broadly consistent. `mris_register`
aligns subjects' folding patterns on the sphere to a reference atlas, yielding
a vertex-to-vertex correspondence that is exploited by:

- [[mris_ca_label]] (cortical parcellation)
- [[mris_preproc]] and `mri_surf2surf` (cross-subject surface analysis)
- Morphometric comparisons in group studies

The atlas (`.tif` file) is a multi-frame spherical parameterization image
that encodes the population mean, variance, and degrees-of-freedom of the
inflated mean curvature and sulcal depth at every point of a uniform
spherical grid. The default atlas in FS 8.2.0 is
`?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif` (under
`$FREESURFER_HOME/average`), which is the v8 successor to the older
`?h.average.curvature.filled.buckner40.tif`.

## Inputs

### Required Inputs

| Argument | Description |
|----------|-------------|
| `insurf` | Subject sphere surface (e.g., `surf/lh.sphere`) |
| `atlas` | Group-average spherical parameterization image (`.tif`; e.g., `$FREESURFER_HOME/average/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`). With `-1`, this is instead a single subject's spherical surface. |
| `outsurf` | Output registered sphere (e.g., `surf/lh.sphere.reg`) |

> [!gotcha] Atlas file is a `.tif` parameterization, not a `.gcs`
> The default registration atlas is a multi-frame spherical parameterization
> stored as a `.tif` (`MRISPread()`); each frame stores mean, variance, and
> dof images of the population folding pattern. See [[mrisp-tif]] for the
> full format specification. The `.gcs` (GCSA, [[gcsa-format]]) format is
> a different beast — used by `-L` for manual label constraints and by
> [[mris_ca_label]], not for the registration target itself.

The tool also reads auxiliary surfaces from the subject directory:

| Implicit input | Description |
|----------------|-------------|
| `smoothwm` | Original surface for metric computation |
| `sphere` (canon_name) | Canonical sphere (default: `sphere`) |
| `inflated.H` | Mean [[curv-format|curvature]] of inflated surface (used in feature vector) |
| `sulc` | Sulcal depth (used in feature vector) |

### Input Assumptions

> [!assumption] Two feature types are used by default
> The tool uses `curvature_names[] = {"inflated.H", "sulc", NULL}` and
> `surface_names[] = {"inflated", "smoothwm", "smoothwm"}`. This means
> the feature vector encodes both the mean curvature of the inflated surface
> and the sulcal depth, combined across two surfaces.

## Outputs

### Files Created

| File | Description |
|------|-------------|
| `outsurf` | Registered spherical surface; same topology as `sphere` but with vertices shifted to align folding patterns to atlas |
| `jacobian_fname` | (optional) Jacobian of the registration (area ratio) |

## Mathematical Foundations

### Registration Energy

The registration minimises a combination of a **correlation term** (surface
feature alignment to atlas) and a **metric distortion penalty**:

$$
E = -\lambda_{\text{corr}} \sum_v C(v, \text{atlas}(v)) + \lambda_{\text{dist}} \sum_{\langle i,j \rangle} (d_{ij} - d^0_{ij})^2 + \lambda_{\text{area}} \sum_f (A_f - A^0_f)^2
$$

Default energy weights:
- `l_corr = 1.0` (correlation to atlas)
- `l_dist = 5.0` (edge length distortion; was 0.5, and before that 0.1)
- `l_parea = 0.1` (face area preservation)
- `l_nlarea = 1.0` (nonlinear area term)
- `l_area = 0.0` (linear area term off)

Integration defaults:
- `niterations = 25`
- `n_averages = 1024` (initial; first pass uses `first_pass_averages = 16384`)
- `dt = 0.9` (momentum-based)
- `momentum = 0.95`
- `max_passes = 4`
- `min_degrees = 0.5°`, `max_degrees = 64°` (angular distortion limits)
- `nangles = 8` (rotation samples in angular search)

### Multi-scale registration

The atlas is represented as a spherical parameterisation at multiple scales
(the `atlas_size = 3` scales). `MRISregister()` is called once with these
multi-scale parameters.

> [!gap] Full MRISregister() optimisation details
> The exact gradient computation and angular search strategy inside
> `MRISregister()` are in the shared `mrisurf` library and were not traced.

## Configuration Options

The flags fall into eight functional groups: feature vector, energy weights,
optimization control, multi-resolution scheduling, integration scheme, surface
naming, registration mode, and outputs/diagnostics. Below, every flag is
described in terms of which internal `INTEGRATION_PARMS` field or global it
modifies and what effect this has on the registration.

### Positional arguments

| Argument | Description |
|----------|-------------|
| `insurf` | Subject's input sphere (`?h.sphere`). Read with `MRISread()`; vertex positions are projected back onto a sphere of `DEFAULT_RADIUS` before optimization (`MRISprojectOntoSphere()`, line 481). |
| `target` | Either a `.tif` spherical parameterization image (default) or, with `-1`, another subject's spherical surface from which the feature parameterization is computed on the fly. |
| `outsurf` | Output registered sphere. Written with `MRISwrite()` after the optimization completes. The base name is derived from the suffix of `outsurf` (`fname` after the first `.`) and used for diagnostic output filenames. |

### Feature-vector flags

These control what is being correlated against the atlas. The default feature
vector is built from `surface_names = {inflated, smoothwm, smoothwm}` paired
with `curvature_names = {inflated.H, sulc, NULL}` — i.e. the mean curvature
of the inflated surface and the sulcal-depth (`sulc`) overlay are stacked into
the feature vector. The third slot is unused unless explicitly populated.

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-curv` | — | flag set | Sets `IP_USE_CURVATURE` in `parms.flags`. This is **already on by default** (line 163 of `mris_register.cpp`); the flag is only meaningful as a counter to a prior `-nocurv` or to re-enable curvature inside the `-multi_scale` schedule which clears it. |
| `-nocurv` | — | OFF | Clears `IP_USE_CURVATURE`. Disables the smoothwm-curvature feature contribution in the final alignment epoch. |
| `-nosulc` | — | OFF | Sets `IP_NO_SULC` in `parms.flags`. Skips the initial sulc-only alignment epoch (used by `rca-surfreg` in longitudinal mode where the base subject's `sphere.reg` is already aligned by sulc). |
| `-inflated` | — | OFF | Sets `IP_USE_INFLATED`. Uses the inflated surface for the initial alignment epoch (in addition to the curvature/sulc passes). |
| `-noinflated` | — | OFF | Clears `IP_USE_INFLATED`. |
| `-infname <name>` | string | — | Renames the inflated surface used for feature computation: sets `inflated_name`, `surface_names[0]=name`, and `curvature_names[0]="<name>.H"` (allocated). Also sets `IP_USE_INFLATED` automatically. Use this when the inflated surface lives under a non-default filename. |
| `-sulc <name>` | string | — | Replaces the sulc curvature file used as `curvature_names[1]` and calls `MRISsetSulcFileName()` so that downstream code reads the renamed sulc. |
| `-surf0`<br>`-surf1`<br>`-surf2` | string | — | Override the named surface in slot 0, 1, or 2 of `surface_names[]`. Used to register against custom feature surfaces. |
| `-curv0`<br>`-curv1`<br>`-curv2` | string | — | Override the named curvature in slot 0, 1, or 2 of `curvature_names[]` and propagate via `MRISsetCurvatureName()`. |
| `-nsurfaces <n>` | int | 2 (effective) | Sets `parms.nsurfaces` — the number of (surface, curvature) feature slots actually consumed for alignment. Lower this to drop the third slot entirely. |
| `-C <file>` | string | — | Load an extra source curvature file into `mris->curv` before registration (read into the input surface, not the template). Used to inject a custom feature into the moving surface. |
| `-trinarize <thresh>` | float | 0.0 (off) | Sets `parms.trinarize_thresh`. When non-zero, curvature maps are mapped to {-1, 0, +1} based on whether they are below `-thresh`, within `[-thresh, +thresh]`, or above `+thresh`. Useful for binarising sulcal/gyral patterns. |
| `-median` | — | mean | Sets `which_norm = NORM_MEDIAN`. Feature maps are normalised by subtracting the median (rather than the mean). More robust to skewed curvature distributions. |
| `-nonorm` | — | mean | Sets `which_norm = NORM_NONE`. Disables feature normalisation. Use with caution — the energy comparison assumes zero-mean features. |
| `-nonmax` | — | OFF | Sets `parms.nonmax = 1`. Applies non-maximum suppression to the curvature/feature maps before parameterization. Sharpens ridge structures. |
| `-overlay <file> <navgs>` | string, int | — | Activates multiframe mode. Loads an extra overlay from `<subject>/label/<hemi>.<file>` (or from `parms.overlay_dir` if set), smooths it `<navgs>` times, and adds it as a new field via `SetFieldLabel(OVERLAY_FRAME, …)`. Each `-overlay` invocation appends one frame; up to `MAX_OVERLAYS=1000`. |
| `-distance <file> <navgs>` | string, int | — | Like `-overlay` but the field is registered as a `DISTANCE_TRANSFORM_FRAME` and uses `NORM_MAX` normalisation. Used for distance-transform features (e.g., distance to a label). |
| `-overlay-dir <dir>` | string | `label` | Sets `parms.overlay_dir`. Changes the subject sub-directory from which overlay files are read (default is `label/`). |
| `-vector` | — | OFF | Prints a help message listing all named multiframe field codes (via `ReturnFieldName(n)` for `n=0..NUMBER_OF_VECTORIAL_FIELDS-1`) and exits. Diagnostic only. |
| `-addframe <which_field> <where_in_atlas> <l_corr> <l_pcorr>` | int, int, float, float | — | Activates multiframe mode and appends a named field (by integer code) at slot `where_in_atlas` of the multiframe atlas with weights `(l_corr, l_pcorr)`. Errors out if that field already exists. |
| `-init` | — | OFF | Sets `use_initial_registration = 1`. In multiframe mode, performs an extra `MRISvectorRegister()` pre-alignment before the main registration pass. |
| `-ocorr <f>` | float | 1.0 | Sets the global `l_ocorr` used by subsequent `-overlay`/`-distance` invocations as their correlation weight. |

### Energy-weight flags

These set the Lagrangian coefficients of the SSE objective. **Critical
gotcha:** if none of the `-dist`/`-area`/`-parea`/`-nlarea`/`-spring`/`-corr`
flags is given, the variable `use_defaults = 1` causes lines 461–475 of
`mris_register.cpp` to **silently overwrite** `l_dist=5.0`, `l_corr=1.0`,
`l_parea=0.2` immediately after the parameterization is loaded — regardless of
prior settings. Setting any one of these flags clears `use_defaults`.

| Flag | Args | Default after override | Effect |
|------|------|------------------------|--------|
| `-corr <f>` | float | 1.0 | `parms.l_corr`. Weight of the correlation between subject feature parameterization and atlas mean-image. The dominant alignment term. Setting this clears `use_defaults`. |
| `-dist <f>` | float | 5.0 | `parms.l_dist`. Penalty on edge-length deviation from the original (smoothwm) metric. **Was 0.1, then 0.5, now 5.0** per source comment — strong protection against metric distortion. Setting this clears `use_defaults`. |
| `-parea <f>` | float | 0.2 | `parms.l_parea`. Penalty on per-face area deviation from original (linear-quadratic in area difference). Was 0.1 then bumped to 0.2 in the silent override. |
| `-nlarea <f>` | float | 1.0 | `parms.l_nlarea`. Non-linear area term — heavier penalty on large area excursions. |
| `-area <f>` | float | 0.0 | `parms.l_area`. Linear area term, off by default. Mostly kept for legacy. |
| `-spring <f>` | float | 0.0 | `parms.l_spring`. Spring smoothness term over the surface. Off by default. |
| `-E <f>` | float | 10000 | `parms.l_external`. Penalty applied per mismatched vertex in the manual label constraint mode (see `-L`). Very large by default so that labels are essentially required matches. |
| `-lap <f>` | float | 0.0 | `parms.l_lap`. Laplacian smoothness penalty. Off by default. |

### Optimization control

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-N <n>` | int | 25 | `parms.niterations`. Maximum gradient-descent iterations per pass at each scale. Setting this to 0 yields a rigid-only registration. |
| `-A <n>` | int | 1024 | `parms.n_averages`. Initial smoothing level of the feature parameterization image (number of pre-smoothing averaging passes applied to the parameterization at the coarsest scale). The first pass uses `parms.first_pass_averages = 16384` regardless. The schedule halves `n_averages` between passes until `parms.min_averages` (=0) is reached. |
| `-P <n>` | int | 4 | `max_passes`. Maximum number of times the multi-resolution schedule is iterated. |
| `-tol <f>` | float | 0.5 | `parms.tol`. Convergence tolerance: registration stops at a scale when the relative error change falls below `tol`. |
| `-error_ratio <f>` | float | 1.1 | `parms.error_ratio`. Threshold ratio at which the inner loop decides the energy is no longer decreasing fast enough and proceeds to the next scale. |
| `-dt <f>` | float | 0.9 | `parms.dt`. Integration time-step. Also sets `parms.base_dt = 0.2*dt`. |
| `-dt_inc <f>` | float | 1.0 | `parms.dt_increase`. Multiplicative growth factor on `dt` between successful steps. Default 1.0 = no growth. |
| `-dt_dec <f>` | float | 1.0 | `parms.dt_decrease`. Multiplicative shrinkage factor on `dt` after rejected steps. Default 1.0 = no shrinkage. |
| `-M <f>` | float | 0.95 | Sets `parms.momentum` and switches `parms.integration_type` to `INTEGRATE_MOMENTUM`. Momentum for the gradient descent. |
| `-lm` | — | line min. | Sets `parms.integration_type = INTEGRATE_LINE_MINIMIZE`. Default at init time (line 186 sets this last among three competing assignments). |
| `-search` | — | OFF | Sets `INTEGRATE_LM_SEARCH` — binary-search line minimization, slower but more robust to non-quadratic energies. |
| `-adaptive` | — | OFF | Sets `INTEGRATE_ADAPTIVE` — adaptive time step. |
| `-vsmooth` | — | OFF | Sets `parms.var_smoothness = 1` and allocates per-vertex `vsmoothness`, `dist_error`, `area_error`, `geometry_error` arrays. Enables a space/time varying smoothness weighting (heavier penalty in flat regions, lighter in highly curved regions). |
| `-remove_negative <0\|1>` | int | 1 | Post-registration cleanup. When `1`, after `MRISregister()` returns, calls `MRISremoveOverlapWithSmoothing()` for 1000 iterations to eliminate residual negative-area (folded) triangles. Set to 0 to keep raw output. |
| `-topology` | — | OFF | Sets `IPFLAG_PRESERVE_SPHERICAL_POSITIVE_AREA`. Forces the optimizer to maintain positive triangle areas throughout the unfolding (rejects steps that flip triangles). |

### Multi-resolution / angular search flags

The default registration runs `MRISregister()` once on the loaded
parameterization image; an internal coarse-to-fine schedule iterates over
parameterization smoothing levels. The angular search refers to the rigid
pre-alignment that searches for an initial sphere rotation by sampling
rotations on a uniform angle grid.

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-min_degrees <f>` | float | 0.5 | Smallest angular step (degrees) in the rigid pre-alignment search. |
| `-max_degrees <f>` | float | 64.0 | Largest angular step (degrees). The search starts at `max_degrees` and halves until reaching `min_degrees`. |
| `-nangles <n>` | int | 8 | Number of angles sampled per axis at each scale of the angular search. With three Euler axes, total samples per scale ≈ `nangles³`. |
| `-norot` | — | OFF | Sets `IP_NO_RIGID_ALIGN`. **Disables** the initial rigid (rotational) alignment search entirely. Used in longitudinal mode where the base subject's `sphere.reg` provides the starting rotation. |
| `-rotate <da> <db> <dg>` | 3 floats | 0,0,0 | Pre-rotates the input surface by `(dα, dβ, dγ)` (interpreted via `RADIANS()`, so the values are in degrees) before any optimization. Lets you test/seed a rotation manually. |
| `-reg <regfile.lta>` | string | — | Reads an LTA, converts to `REGISTER_DAT` if needed, extracts the rotational components (`LTAmat2RotMat`) and applies the resulting rotation to the surface before registration. Equivalent to `-rotate` but driven by a registration file. |
| `-reverse` | — | OFF | Mirrors the surface in X (`MRISreverse(REVERSE_X)`) before morphing. Used to register an LH surface against an RH atlas or vice versa. |
| `-multi_scale <n>` | int | 0 | Activates the multi-scale schedule ([lines 564–608](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp#L564-L608)). With `multi_scale=N`, runs `MRISregister()` `N` times: at iteration `i`, `l_dist = l_dist0 · 5^(N-1-i)` (i.e., distance penalty starts very high and is divided by 5 each iteration). The first iteration also disables curvature use (`IP_USE_CURVATURE` cleared) and adds `IPFLAG_NOSCALE_TOL`; subsequent iterations enable `IP_NO_RIGID_ALIGN` and clear `IP_USE_INFLATED`. If `parms.nbhd_size` is negative, an additional second epoch with long-range distances is run. A final epoch restores curvature use (`IP_USE_CURVATURE` and `IP_NO_SULC`). |
| `-sigma <f>` | float | — | Appends a Gaussian smoothing sigma to a list (max 10) used by `MRISsetRegistrationSigmas()`. The list defines the multi-sigma schedule of feature-map smoothing. |
| `-nbrs <n>` | int | 1 | Sets the neighbourhood ring size of the input surface (`MRISresetNeighborhoodSize`). Larger values pull in farther neighbours for the metric/edge terms. |
| `-vnum <n> <m>`<br>`-distances <n> <m>` | 2 ints | -10, 10 | Sets `parms.nbhd_size` and `parms.max_nbrs`. Negative `nbhd_size` is a flag for the `-multi_scale` second epoch. `max_nbrs` caps the per-vertex neighbour list. |
| `-S <f>` | float | 1.0 | `scale` global. Multiplies the original distances stored in the surface (`MRISscaleDistances`) and is passed to `MRISPalloc(scale, ...)` — controls the spatial resolution of the parameterization image. |

### Surface naming flags

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-O <name>` | string | `smoothwm` | `orig_name`. Name of the surface used as the **original metric reference** (read by `MRISreadOriginalProperties`). The metric distortion penalty `l_dist` is computed against this surface's edge lengths. |
| `-canon <name>` | string | `sphere` | `canon_name`. Name of the canonical sphere surface (read by `MRISreadCanonicalCoordinates`). Provides the canonical (uniform) spherical positions that anchor the optimization. |
| `-1` | — | OFF | `single_surf = True`. Treats the second positional argument as another subject's spherical surface rather than a `.tif` parameterization. The hemisphere is parsed from the filename (the two characters before the first `.`), and the auxiliary surfaces (`smoothwm`, `inflated`) and curvature files (`inflated.H`, `sulc`) are looked up in the target's own surf directory to build the parameterization on the fly. |
| `-sreg <surf>` | string | — | `starting_reg_fname`. Loads vertex positions from a saved registered sphere as the starting point of the optimization (replaces the default `sphere` start). |

### Constraint and label flags

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-annot <annot_name>` | string | — | Reads an annotation file with `MRISreadAnnotation()`, then calls `MRISripMedialWall()` to mark all medial-wall vertices `ripflag=1`. Ripped vertices are excluded from the optimization. |
| `-keep-label <labelfile>` | string | — | Reads a `.label`, builds a vertex mask, and rips every vertex **outside** the label (inverse of `-annot`'s effect — only the labelled cortex participates in registration). |
| `-L <labelfile> <gcsa.gcs> <label_name>` | 3 strings | — | Adds a manual label constraint: reads a label, reads a GCSA atlas, looks up the label name in the colortable, and registers `gcsaSSE` as the external SSE function. During optimization, vertices in the label that map to GCSA prior nodes whose top label does not match the requested annotation contribute `parms.l_external` to the SSE per mismatch. Up to 100 labels (`MAX_LABELS`). |

### Output and diagnostics

| Flag | Args | Default | Effect |
|------|------|---------|--------|
| `-jacobian <file>` | string | — | After registration, computes per-vertex `v->curv = v->area / (v->origarea * area_scale)` (in `compute_area_ratios`) and writes the result with `MRISwriteCurvature()`. The file is therefore a curvature-format surface file containing the registration's per-vertex Jacobian (face area ratio). |
| `-W <n>` | int | 100 | `parms.write_iterations`. Writes intermediate diagnostic surfaces every `n` iterations. Also sets `Gdiag |= DIAG_SHOW | DIAG_WRITE`. |
| `-V <vno>` | int | — | `Gdiag_no`. Prints diagnostic info for vertex number `vno` during optimization. |
| `-rusage <file>` | string | — | `rusage_file`. Resource-usage log path. (Note: declared but the value is set; the actual write is performed by upstream code via `getrusage`.) |
| `-threads <n>` | int | 1 | Sets `omp_set_num_threads(n)` if compiled with OpenMP. The optimization scales over threads in the inner loops of `MRISregister`. |
| `-?`<br>`-H`<br>`-U`<br>`--help`<br>`--usage` | — | — | Prints the auto-generated help (compiled-in `mris_register.help.xml`) and exits. The dashed forms are matched literally against `-help`/`-usage` after the parser strips one leading `-`, so users must type `--help`/`--usage`. |
| `--version` | — | — | Prints the version string and exits. Matched literally against `-version` after one dash is stripped. |

### Configuration interactions

> [!gotcha] Silent default override of energy weights
> Lines 461–475 of `mris_register.cpp` contain an `if (use_defaults)` block
> that **overwrites** `parms.l_dist=5.0`, `parms.l_corr=1.0`, `parms.l_parea=0.2`
> after the parameterization image is loaded. This block runs unless one of
> `-dist`/`-corr`/`-area`/`-parea`/`-nlarea`/`-spring` was given (those six
> flags are the only ones that clear `use_defaults`). Consequently, `-N`,
> `-tol`, `-A` etc. do **not** preserve other energy weights you might have
> set — only the six `-dist`-family flags do. The two branches of the `if`
> (1st pass vs. subsequent) are currently identical, but the structure exists
> in case the historical distinction is restored.

> [!gotcha] No standalone `-pcorr` flag exists
> Although `parms.l_pcorr` (partial-correlation weight) is referenced in the
> code, there is **no command-line flag** that sets it directly in this tool.
> The only way to populate it is via the 4th positional argument of `-addframe`
> (the per-field `l_pcorr`). In multiframe mode, line 541 zeroes both
> `parms.l_corr` and `parms.l_pcorr` immediately before the main vector
> registration call, so global values would be discarded anyway.

> [!gotcha] -curv is on by default; -curv on the command line is redundant
> The constructor sets `parms.flags |= IP_USE_CURVATURE` at line 163. Passing
> `-curv` simply sets the same flag again. The flag is only meaningful as a
> re-enable when `-multi_scale` (which clears `IP_USE_CURVATURE` for the
> intermediate epochs) or `-nocurv` was previously used. `rca-surfreg` passes
> `-curv` for explicitness, not because it is required.

> [!gotcha] -norot is only used in longitudinal mode by rca-surfreg
> `rca-surfreg` (the wrapper used in `recon-all -surfreg`) passes `-norot`
> only when `--long <baseid>` is given, in which case the starting sphere is
> the longitudinal base subject's `sphere.reg`. In the standard cross-sectional
> case, `mris_register` is called with the rigid pre-alignment **enabled**.

> [!gotcha] -1 (single subject target) auto-discovers feature files
> When `-1` is given, the surface_names and curvature_names arrays are read
> from the target's own surf directory: e.g., for target
> `/path/to/lh.sphere`, the code looks for `/path/to/lh.inflated`,
> `/path/to/lh.smoothwm`, `/path/to/lh.inflated.H`, `/path/to/lh.sulc`.
> Missing any of these is a fatal error.

> [!gotcha] -infname has triple effect
> A single `-infname my_inflated` simultaneously: (i) sets the inflated
> surface name globally for `MRISsetInflatedFileName()`, (ii) overrides
> `surface_names[0]`, (iii) overrides `curvature_names[0]` to `"my_inflated.H"`,
> and (iv) sets `IP_USE_INFLATED`. There is no way to do just one of these.

> [!gotcha] -overlay/-distance/-addframe activate multiframe mode
> The first call to any of these three flags calls `initParms()`, sets
> `multiframes = 1`, and adds `IP_USE_MULTIFRAMES` to `parms.flags`. After
> this point, `MRISvectorRegister()` runs instead of `MRISregister()`. In
> multiframe mode, `parms.l_corr` and `parms.l_pcorr` are zeroed before the
> main vector registration call ([line 541](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_register/mris_register.cpp#L541)), so the per-field correlation
> weights set via `-addframe`/`-overlay` are the only correlation terms.

> [!gotcha] -jacobian writes a curvature-format file
> The Jacobian output is written via `MRISwriteCurvature()` — it is a
> curvature-format binary surface file (see [[curv-format]]), not text.
> Each value is the per-vertex face-area ratio
> `area_after / (area_before · global_scale)`, where the global scale
> normalises by the ratio of total post- vs. pre-registration surface area.

> [!gotcha] -A and -P interact via the inner schedule
> `-A` sets the *initial* averaging level. The internal schedule halves
> `n_averages` between passes. `-P` caps the number of passes. So with
> default `-A 1024 -P 4`, the schedule visits {1024, 512, 256, 128} averaging
> levels at most. Increasing `-A` without increasing `-P` extends only the
> coarse end and may not reach as fine a level.

## Typical Use Cases

### Use Case 1: Standard surface registration (via rca-surfreg)

The actual command issued in cross-sectional recon-all:
```bash
mris_register -curv -threads 8 surf/lh.sphere \
    $FREESURFER_HOME/average/lh.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif \
    surf/lh.sphere.reg
```

### Use Case 2: Longitudinal surface registration

```bash
mris_register -curv -threads 8 -nosulc -norot \
    $SUBJECTS_DIR/$base/surf/lh.sphere.reg \
    $FREESURFER_HOME/average/lh.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif \
    surf/lh.sphere.reg
```
The base subject's already-registered sphere is used as the starting point;
the rigid pre-alignment and initial sulc epoch are skipped.

### Use Case 3: Jacobian registration (dist=0, for distortion analysis)

```bash
mris_register -curv -norot -jacobian surf/lh.jacobian_dist0 -dist 0 \
    surf/lh.sphere.reg atlas.tif surf/lh.sphere.dist0.jacobian.reg
```
With `-dist 0`, the metric distortion penalty is removed entirely so the
output Jacobian reflects only the correlation-driven deformation. Useful for
quantifying how much each region was stretched/compressed by the registration.

### Use Case 4: Register one subject directly to another

```bash
mris_register -1 surf/lh.sphere /path/to/target/lh.sphere lh.sphere.target.reg
```
With `-1`, no template `.tif` is used. The target's `inflated`, `smoothwm`,
`inflated.H`, and `sulc` are read from the target's surf directory and a
parameterization image is built on the fly.

## Pipeline Context

**autorecon3 — Surface Registration** (recon-all lines 4212–4226)

In FS 8.2.0, the surfreg stage is:
```bash
rca-surfreg --s $subjid --threads $OMP_NUM_THREADS \
    --tif-path $AvgCurvTifPath --tif-name $AvgCurvTif \
    [--long $longbaseid] [--usenoneg] [--josa] [--expert $XOptsFile]
```

`rca-surfreg` (script at `$FREESURFER_HOME/bin/rca-surfreg`, 385 lines)
loops over hemispheres and, unless `--josa` is given, builds:
```bash
mris_register -curv -threads $OMP_NUM_THREADS \
    [-remove_negative 1]            # if --usenoneg
    [-nosulc -norot $longbase/surf/?h.sphere.reg]  # if --long, replaces input
    $surfdir/?h.sphere               # otherwise this is the input sphere
    $xopts                           # global expert options
    $AvgCurvTifPath/?h.$AvgCurvTif
    $surfdir/?h.sphere.reg
```

After registration, `rca-surfreg` creates the symlink
`?h.fsaverage.sphere.reg → ?h.sphere.reg` (where [[fsaverage]] is the group-average subject) so downstream tools (`mri_surf2surf`,
[[mris_preproc]]) find a target alias. With `--josa`, the wrapper instead calls
`josareg --s $subject --threads N --no-post --links` (a learned-deep-net
spherical registration) and `mris_register` is not run at all.

**Default atlas:** `$AvgCurvTifPath/?h.$AvgCurvTif` =
`$FREESURFER_HOME/average/?h.folding.atlas.acfb40.noaparc.i12.2016-08-02.tif`
(set in `rca-surfreg` line 23).

**Predecessors:** [[mris_sphere]] → `?h.sphere`
**Successors:** [[mris_ca_label]] → `?h.aparc.annot`

## Gotchas and Caveats

> [!gotcha] sphere.reg is not the same as sphere
> The output `sphere.reg` has vertices shifted relative to `sphere`. Both
> are on the same sphere radius, but vertex positions differ.
> `mris_ca_label` uses `sphere.reg` for atlas lookup; tools that work with
> `sphere` are not using the registered coordinates.

> [!gotcha] l_dist default was changed in recent versions
> The source comment notes: `l_dist = 5.0  // used to be 0.5, and before
> that 0.1`. This means the metric distortion penalty has been substantially
> increased over FreeSurfer versions. Registration with older atlases trained
> with different l_dist values may produce different results.

## Related Tools

- [[mris_sphere]] — produces `?h.sphere` (registration input)
- [[mris_ca_label]] — performs cortical parcellation using `?h.sphere.reg`
- [[mris_inflate]] — produces `inflated` and `sulc` (features used in registration)

### Driver, wrapper, and atlas scripts

- [[rca-surfreg]] — the recon-all `-surfreg` component script that issues the
  `mris_register` command (or `josareg`) and creates the `?h.fsaverage.sphere.reg`
  symlink.
- [[surfreg]] — a standalone wrapper that runs `mris_register` against a chosen
  folding atlas, used to (re)register a subject's sphere outside recon-all.
- [[josareg]] — the learned deep-net spherical-registration alternative that
  `rca-surfreg --josa` runs *instead of* `mris_register`.
- [[morph_subject]] — a legacy per-subject driver of the surface-morphing
  registration (the `mris_register` predecessor stage in classic recon flows).
- [[mksurfatlas]] — builds the `.tif` folding/curvature atlas that
  `mris_register` registers each subject against.

## Confidence and Gaps

Confidence **high** for flag semantics, defaults, and the recon-all/rca-surfreg
call chain — all read directly from `mris_register/mris_register.cpp` (1416
lines) and `scripts/rca-surfreg` (385 lines).


> [!gap] MRISregister() optimization internals
> The gradient computation, multi-resolution schedule, and angular search
> implementation inside `MRISregister()` (and its multiframe sibling
> `MRISvectorRegister()`) live in the shared `utils/mrisurf*.cpp` library
> and were not traced. The flags documented above set inputs to these
> functions; the exact gradient flow and stopping logic remain unread.

Format specifications for the two atlas file types this tool consumes are
now in [[mrisp-tif]] (the registration target) and [[gcsa-format]] (the
classifier atlas used by `-L` label constraints).

## References

- Fischl, B., Sereno, M.I., Dale, A.M. (1999). *Cortical Surface-Based
  Analysis II: Inflation, Flattening, and a Surface-Based Coordinate System.*
  NeuroImage, 9(2):195–207. [cited in source header]
