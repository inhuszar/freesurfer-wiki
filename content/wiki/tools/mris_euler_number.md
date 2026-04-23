---
title: "mris_euler_number"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_euler_number/mris_euler_number.cpp"
families:
  - "mris_*"
recon_all_stage: "autorecon2"
related:
  - "[[mris_fix_topology]]"
  - "[[mris_errors]]"
  - "[[mri_tessellate]]"
  - "[[recon-all]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - topology
  - euler-number
  - quality-control
  - recon-all
---

# mris_euler_number

## Summary

`mris_euler_number` computes the Euler number of a FreeSurfer surface mesh, which is the primary topological quality metric for cortical surfaces. For a topologically correct (genus-0, sphere-equivalent) surface, the Euler number should equal 2. Deviations indicate topological defects (handles or holes) that must be corrected before surface inflation and registration. This tool is called by `recon-all` in **autorecon2** to check the topology of `?h.orig.nofix` surfaces.

## Source Information

- **Language:** C++
- **Source file:** `mris_euler_number/mris_euler_number.cpp`
- **Author:** Bruce Fischl
- **Key library call:** `MRIScomputeEulerNumber()`, `MRIStopologicalDefectIndex()`

## Purpose and Context

The Euler characteristic is a topological invariant. A closed genus-0 triangulated surface (homeomorphic to a sphere) must satisfy $\chi = V - E + F = 2$. Cortical surface tessellations produced by `mri_tessellate` often have topological defects (handles) due to noise in the WM segmentation, resulting in $\chi < 2$. These must be corrected by [[mris_fix_topology]] before the surface can be inflated to a sphere.

`mris_euler_number` is the diagnostic tool that:
1. Reports the Euler number and number of holes/handles.
2. Reports the topological defect index.
3. Optionally writes the number of holes to a file.
4. In patch mode (`-p`), can attempt to remove topological defects via `MRISremoveTopologicalDefects()`.

## Inputs

- **Surface file** (positional arg 1): Any FreeSurfer surface (e.g., `lh.orig.nofix`, `lh.white`).

## Outputs

- **stdout**: Reports in the format:
  ```
  euler # = v-e+f = 2g-2: V - E + F = eno --> K holes
  F =2V-4: ...
  2E=3F: ...
  total defect index = dno
  ```
- **`-o` file**: Optional text file containing the number of holes (integer, one per line).

## Mathematical Foundations

For a closed triangulated surface with $V$ vertices, $E$ edges, and $F$ faces:

$$
\chi = V - E + F \quad \text{(Euler characteristic)}
$$

For a genus-$g$ closed surface:
$$
\chi = 2 - 2g
$$

For a topologically correct cortical hemisphere (genus 0): $\chi = 2$, $g = 0$.

**Number of holes:**
$$
\text{holes} = 1 - \frac{\chi}{2}
$$

A valid surface also satisfies:
$$
F = 2V - 4 \quad \text{(for a triangulated sphere)}
$$
$$
2E = 3F \quad \text{(Euler relation for triangulations)}
$$

The **topological defect index** (from `MRIStopologicalDefectIndex()`) measures the total number of vertices involved in topological defects.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `-o` | `<file>` | — | Write number of holes to text file |
| `-p` | — | off | Patch mode: attempt to remove topological defects via `MRISremoveTopologicalDefects()` |
| `-t` | `<float>` | 2.0 | Curvature threshold for defect removal in patch mode |
| `--version` | — | — | Print version and exit |
| `--help` | — | — | Print usage and exit |

## Configuration Interactions

- `-p` (patch mode) activates defect removal; it requires a valid surface and uses the curvature threshold `-t` to classify and remove defects. It reports Euler number before and after correction.
- `-o` only writes the number of holes (integer value), not the full Euler number report.
- `-o` is ignored when `-p` is set (patch mode uses different output format).

## Typical Use Cases

```bash
# Check topology of the raw tessellation
mris_euler_number lh.orig.nofix

# Check and write hole count to file
mris_euler_number -o lh.nholes.txt lh.orig.nofix

# Check topology of a corrected surface
mris_euler_number lh.white
```

**Example output for a surface with 5 handles:**
```
euler # = v-e+f = 2g-2: 130453 - 391356 + 261896 = -1007 --> 505 holes
F =2V-4: 261896 != 260902 (994)
2E=3F: 782712 != 785688 (-2976)

total defect index = 1007
```

## Pipeline Context

`mris_euler_number` is called by `recon-all` in **autorecon2**:

1. `mri_tessellate` produces `?h.orig.nofix`
2. `mris_extract_main_component` removes small disconnected components
3. **`mris_euler_number`** checks topology → reports hole count
4. `mris_fix_topology` corrects the topology → produces `?h.orig`
5. `mris_euler_number` is called again to verify the correction

The Euler numbers for both hemispheres are also reported as header entries in `stats/aseg.stats` via `mri_segstats --euler`.

## Gotchas and Caveats

> [!gotcha] Expected value is 2, not 0
> A topologically correct surface has Euler number 2, NOT 0. A value of 0 indicates 1 handle (1 topological defect).

> [!gotcha] Holes = (2 - eno) / 2
> The number of holes reported is `1 - eno/2`, which equals the genus $g = (2-\chi)/2$. For $\chi=2$, holes=0. For $\chi=0$, holes=1. For $\chi=-8$, holes=5. The stdout formula shows `1-eno/2`.

> [!gotcha] High defect count signals severe segmentation problems
> A very large number of holes (>100) typically indicates a problem with the WM segmentation (e.g., `filled.mgz`), not just noise. Investigate and re-segment rather than expecting topology fixing to succeed.

> [!gotcha] Defect index != number of holes
> The topological defect index counts the number of *vertices* involved in defects, which is larger than the number of holes. Both are useful diagnostics.

## Related Tools

- [[mris_fix_topology]] — corrects topological defects found by this tool
- [[mri_tessellate]] — generates the initial tessellation that this tool checks
- [[mris_extract_main_component]] — removes disconnected components before topology check
- [[mris_errors]] — measures metric (area/angle) distortions

## Confidence and Gaps

**Confident (from source):** Euler formula, hole count formula, all flags, output format, pipeline placement, relationship to `mris_fix_topology`.

**Uncertain:** None significant.
