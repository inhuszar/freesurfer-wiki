---
title: "mris_topo_fixer"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_topo_fixer/mris_topo_fixer.cpp"
  - "mris_topo_fixer/mris_topology.cpp"
  - "mris_topo_fixer/patchdisk.cpp"
  - "mris_topo_fixer/face.cpp"
  - "mris_topo_fixer/loop.cpp"
  - "mris_topo_fixer/fastloop.cpp"
  - "mris_topo_fixer/vertex.cpp"
  - "mris_topo_fixer/segment.cpp"
  - "mris_topo_fixer/surface.cpp"
  - "mris_topo_fixer/globals.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_euler_number]]"
  - "[[mri_pretess]]"
  - "[[mris_make_surfaces]]"
  - "[[mris_fill]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps:
  - "The genetic algorithm for topology correction (referenced paper: Segonne, Grimson, Fischl IPMI 2005) details not fully documented from source."
tags:
  - surface
  - topology
  - correction
  - autorecon2
---

# mris_topo_fixer

## Summary

`mris_topo_fixer` corrects [[topology-correction|topological defects]] in a cortical surface tessellation, ensuring the result is a closed genus-0 surface (topologically equivalent to a sphere). It uses a genetic algorithm-based approach to find optimal patches for closing handles and holes in the triangulated surface. The algorithm uses local MRI intensity information to guide the selection of correction patches, producing anatomically plausible fixes. This is a critical step in the FreeSurfer pipeline — a topologically correct surface is required for spherical mapping and atlas registration.

## Source Information

- **Language:** C++
- **Source file(s):** `mris_topo_fixer/mris_topo_fixer.cpp` (main), plus supporting files: `mris_topology.cpp`, `patchdisk.cpp`, `face.cpp`, `loop.cpp`, `fastloop.cpp`, `vertex.cpp`, `segment.cpp`, `surface.cpp`, `globals.cpp`
- **Binary/script location:** `$FREESURFER_HOME/bin/mris_topo_fixer`
- **Original Author:** Florent Segonne
- **Reference:** F. Segonne, E. Grimson, B. Fischl (2005). "Genetic Algorithm for the Topology Correction of Cortical Surfaces." IPMI, pp. 393–405.

## Purpose and Context

After tessellation of the white matter volume (via `mri_tessellate`), the resulting surface may contain topological defects: handles (extra tunnel through the surface) or holes (missing surface patches). These are quantified by the Euler number $\chi = V - E + F$ (where $V$ = vertices, $E$ = edges, $F$ = faces). For a sphere, $\chi = 2$; deviations indicate defects.

`mris_topo_fixer` detects and corrects these defects so that $\chi = 2$. The corrected surface is written as `orig_corrected` by default, ready for subsequent processing by [[mris_make_surfaces]].

## Inputs

### Required Inputs

(Positional arguments: `<subject_name> <hemisphere>`)

- **`<subject_name>`** — FreeSurfer subject ID.
- **`<hemisphere>`** — `lh` or `rh`.

`SUBJECTS_DIR` must be set, or provided via `--sdir`.

The tool reads:
- `surf/<hemi>.orig` — the tessellated surface to be corrected.
- `mri/brain.mgz` (or `.mgz`-format brain volume) — for intensity guidance.
- `mri/wm.mgz` — white matter volume for intensity-guided patching.
- `surf/<hemi>.qsphere` — quick spherical mapping, used to select patches.

### Input Assumptions

> [!assumption] Input file format
> The tool checks for `.mgz` format (`MGZ = 1`). MGZ is the default format since FreeSurfer 6.x.

> [!assumption] qsphere must exist
> The `qsphere` surface (a quick spherical mapping of the original surface) must be present. It is generated earlier in the pipeline by `mris_sphere -q`.

## Outputs

### Files Created

- **`surf/<hemi>.orig_corrected`** — topologically corrected surface (genus-0, $\chi = 2$). This is the default output name (`out_name = "orig_corrected"`).
- Euler number statistics are printed to stdout before and after correction.

## Mathematical Foundations

**Euler number and genus:** For a closed triangulated surface with $V$ vertices, $E$ edges, and $F$ faces:
$$
\chi = V - E + F = 2(1 - g)
$$
where $g$ is the genus (number of handles). A sphere has $g = 0$, $\chi = 2$. Each handle or hole reduces $\chi$ by 2.

**Defect detection:** The algorithm identifies topological defects by analysing loops in the surface graph that are not contractible (i.e., cannot be shrunk to a point on the surface).

**Genetic algorithm for patch selection:** For each defect, the algorithm enumerates candidate patching surfaces from a set of pre-computed `PatchDisk` objects at multiple scales. It selects the patch that best fits the local MRI intensity profile using a genetic algorithm (GA) search over the space of valid patches:
- **Fitness function:** Combines MRI intensity matching (is the patch in the correct tissue?) with geometric smoothness terms.
- **GA operations:** Selection, crossover, and mutation over the population of candidate patches.
- **Self-intersection check:** Patches that produce self-intersections are penalised.

Parameters controlling the algorithm are in `TOPOFIX_PARMS`:
- `l_mri` — weight on MRI intensity term (default 0.0 in this version).
- `l_curv` — weight on curvature smoothness term (default 4.0).
- `l_qcurv` — weight on quasi-conformal curvature (default 0.0).
- `l_unmri` — unmyelinated MRI weight (default 1.0).
- `pct_over` — fractional overshoot in vertex count (default 1.1).
- `nattempts_percent` — fraction of GA iterations as attempts (default 0.15).
- `minimal_loop_percent` — fraction determining minimal loop size (default 0.4).

## Configuration Options

### Complete Flag Reference

Flags use single-dash prefix (e.g., `-asc`). All are case-insensitive.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `-asc` | boolean | false (`asc=0`) | Write output surface in ASCII text format instead of binary. |
| `-mgz` | boolean | true (`MGZ=1`) | Assume `.mgz` format for MRI volumes (brain, wm). Default is on; disable only if using legacy non-MGZ volumes. |
| `-fast` | boolean | false (`parms.mode=0`) | Enable fast mode (`parms.mode=1`), which reduces algorithm quality in exchange for speed. |
| `-verbose` | boolean | false | Enable diagnostic verbose output (`Gdiag = DIAG_VERBOSE`). |
| `-verbose_low` | boolean | false (`parms.verbose=1`) | Enable low-verbosity mode (`parms.verbose=VERBOSE_MODE_LOW`): prints minimal progress. |
| `-warnings` | boolean | false | Enable medium-verbosity mode (`parms.verbose=VERBOSE_MODE_MEDIUM`): prints warnings. |
| `-errors` | boolean | false | Enable high-verbosity mode (`parms.verbose=VERBOSE_MODE_HIGH`): exits when warnings appear. |
| `-write` | boolean | false (`parms.write=0`) | Write intermediate defect patch surfaces to disk for debugging. |
| `-mri <val>` | float | 0.0 (`parms.l_mri`) | Weight of MRI intensity term in the patch fitness function. |
| `-curv <val>` | float | 4.0 (`parms.l_curv`) | Weight of curvature smoothness term in the patch fitness function. |
| `-qcurv <val>` | float | 0.0 (`parms.l_qcurv`) | Weight of quasi-conformal curvature term in the patch fitness function. |
| `-unmri <val>` | float | 1.0 (`parms.l_unmri`) | Weight of the intensity-based term when `noint=0` (intensity enabled). |
| `-pct <val>` | float | 0.15 (`parms.nattempts_percent`) | Fraction of total GA attempts used as the number of iterations. |
| `-nmin <N>` | int | 10 (`parms.nminattempts`) | Minimum number of GA patch attempts per defect (must be ≥ 1). |
| `-loop_pct <val>` | float | 0.4 (`parms.minimal_loop_percent`) | Fraction that determines the minimal loop size considered for correction. |
| `-smooth <N>` | int | 0 (`parms.smooth`) | Smoothing mode applied to defect patches (0 = off). |
| `-match <0\|1>` | int | 1 (`parms.match`) | Enable (1) or disable (0) intensity-based local matching during patch selection. |
| `-seed <N>` | long | — | Set the random-number-generator seed for reproducible results. |
| `-out_name <name>` | string | `orig_corrected` | Name of the output corrected surface written to `surf/<hemi>.<name>`. |
| `-orig_name <name>` | string | `orig` | Name of the input surface read from `surf/<hemi>.<name>`. |
| `-int` | boolean | — | Enable intensity-guided patching (`noint=0`, `parms.no_self_intersections=0`). By default intensity guidance is disabled (`noint=1`). |
| `-no_intersection` | boolean | true (`parms.no_self_intersections=1`) | Penalise self-intersecting patches during candidate selection (default on). |
| `-minimal` | boolean | false | Minimal mode: cut only the minimal non-contractible loop, with one attempt and zero percent GA steps. |
| `-inverted_contrast` | boolean | — | Force contrast inversion (`parms.contrast=-1`): treat bright voxels as outside-brain. |
| `-detect_contrast` | boolean | true (`parms.contrast=-2`) | Automatically detect contrast polarity (default). |
| `-usual_contrast` | boolean | — | Force standard contrast (`parms.contrast=1`): treat dark voxels as outside-brain. |
| `-V <n>` | int | — | Debug vertex `n` (`Gdiag_no`). |
| `--version` | boolean | — | Print version string and exit (handled by `handleVersionOption`). |
| `--help` or `-help` | boolean | — | Print help and exit. |

> [!gotcha] No --sdir flag exists
> Unlike many FreeSurfer tools, `mris_topo_fixer` does **not** have a command-line flag to override `SUBJECTS_DIR`. The subjects directory is read exclusively from the `$SUBJECTS_DIR` environment variable. Ensure this is set before running.

### Configuration Interactions

- `-int` (enable intensity) sets `noint=0` AND `parms.no_self_intersections=0`. So enabling intensity guidance also disables the self-intersection penalty. If you want both, set `-no_intersection` after `-int`.
- `-minimal` overrides `-pct` and `-nmin`: it sets `nattempts_percent=0` and `nminattempts=1`.
- `-inverted_contrast` and `-usual_contrast` both override the default `-detect_contrast` mode; the last flag parsed wins.
- `-verbose_low`, `-warnings`, and `-errors` set increasing levels of verbosity to `parms.verbose`; the last one parsed wins.

## Typical Use Cases

### Use Case 1: Fix topology of left hemisphere surface (called by recon-all)

```bash
mris_topo_fixer subject lh
```

Reads `lh.orig`, corrects topology, writes `lh.orig_corrected`.

## Pipeline Context

`mris_topo_fixer` is called in `autorecon2` as part of the cortical surface generation sequence:

**Predecessor:** [[mri_pretess]] + `mri_tessellate` (surface tessellation) → **This tool** → [[mris_make_surfaces]] (surface refinement)

The corrected `orig_corrected` surface feeds into subsequent deformation and smoothing steps.

## Gotchas and Caveats

> [!gotcha] Euler number printed before and after
> The tool prints Euler number, vertex count, face count, and edge count at both input and output. These should be checked to confirm correction was successful (output $\chi$ should equal 2).

> [!gotcha] `pct_over = 1.1` means 10% vertex count tolerance
> The `pct_over` parameter allows the corrected surface to have up to 10% more vertices than the original (to accommodate patch insertion). This is a hard upper bound on correction complexity.

> [!gotcha] noint=1 means intensity guidance is disabled by default
> Despite the name implying intensity guidance, the default compilation sets `noint = 1` (no intensity). The `l_unmri = 1.0` parameter is set but may not be active when `noint = 1`. Verify the interaction between `noint` and `l_unmri` in `mris_topology.cpp`.

## Related Tools

- [[mris_euler_number]] — computes and reports the Euler number of a surface without fixing it
- [[mri_pretess]] — prepares the white matter volume for tessellation (precedes this step)
- [[mris_make_surfaces]] — refines surfaces after topology is fixed
- [[mris_fill]] — fills the white matter volume (used upstream)

## Confidence and Gaps

Confidence is **high** for the full flag list (derived from complete reading of `get_option()`) and I/O paths. The internal GA implementation details were not fully traced.

## References

- Segonne F, Grimson E, Fischl B (2005). "Genetic Algorithm for the Topology Correction of Cortical Surfaces." *Information Processing in Medical Imaging (IPMI)*, pp. 393–405.
