---
title: "mris_volume"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mris_volume/mris_volume.cpp"
families:
  - "mris_*"
recon_all_stage: null
related:
  - "[[mris_wm_volume]]"
  - "[[mris_anatomical_stats]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - surface
  - morphometry
  - volume
  - statistics
---

# mris_volume

## Summary

`mris_volume` computes the volume enclosed by a closed, genus-zero triangulated surface using the divergence theorem (Stokes' theorem). It takes a single surface file as input and prints the enclosed volume in mm³ to stdout. Requires the surface to have a valid topology (Euler number = 2).

## Source Information

- **Language:** C++
- **Source file:** `mris_volume/mris_volume.cpp`
- **Original authors:** Bruce Fischl and Xiao Han (MGH)
- **Key function:** `MRISvolumeInSurf()`

## Purpose and Context

This is a simple utility for measuring the total volume enclosed by any closed FreeSurfer surface (white, pial, inflated, etc.). It is useful for:
- Quantifying total brain or hemisphere volume from surface representations
- Verifying surface integrity (a degenerate surface will have an incorrect volume)
- Quick morphometric checks

For cortical and subcortical structure volumes broken down by parcellation, use [[mris_anatomical_stats]] instead. For white matter volume specifically (excluding subcortical structures), use [[mris_wm_volume]].

## Inputs

| Input | Description |
|---|---|
| Positional argument | Path to surface file (e.g., `lh.white`, `rh.pial`) |

The surface must be a closed, genus-zero (spherical topology) surface. The Euler number is checked; if it is not 2, the program exits with an error.

## Outputs

The enclosed volume (in mm³) is printed to stdout as a single floating-point number.

```
1234567.890123
```

With `-v`, additional diagnostic messages are also printed.

## Mathematical Foundations

> [!math] Divergence theorem (Gauss's theorem)
> The volume enclosed by a closed surface $\mathcal{S}$ is computed by:
> $$
> V = \frac{1}{3} \oint_{\mathcal{S}} \mathbf{r} \cdot \hat{n} \, dA
> $$
> where $\mathbf{r}$ is the position vector and $\hat{n}$ is the outward surface normal. For a triangulated surface, this reduces to a sum over faces:
> $$
> V = \frac{1}{6} \sum_{\text{faces}} (v_0 + v_1 + v_2) \cdot ((v_1 - v_0) \times (v_2 - v_0))
> $$
> This is equivalent to summing signed tetrahedra from the origin to each face. The function `MRISvolumeInSurf()` implements this formula.

The surface must have Euler number $\chi = V - E + F = 2$ (where $V$, $E$, $F$ are vertices, edges, faces) to ensure it is topologically spherical and the formula is valid.

## Configuration Options

| Flag | Description |
|---|---|
| `-v` | Verbose output (print timing, diagnostic messages) |
| `--version` | Print program version |

No other configuration options. The surface file is the only required argument.

## Configuration Interactions

No flags interact with each other.

## Typical Use Cases

**1. Compute volume of lh.white:**
```bash
mris_volume $SUBJECTS_DIR/bert/surf/lh.white
# Output: 543210.123456
```

**2. Compute volume of the inflated surface (not anatomically meaningful, but works):**
```bash
mris_volume $SUBJECTS_DIR/bert/surf/lh.inflated
```

**3. Verbose mode:**
```bash
mris_volume -v $SUBJECTS_DIR/bert/surf/rh.pial
```

## Pipeline Context

`mris_volume` is not called by `recon-all` directly. It is used as a post-processing analysis tool. Typical workflow:

```
recon-all → lh.white, rh.white, lh.pial, rh.pial
mris_volume lh.white   → total LH white matter sphere volume
mris_volume rh.pial    → total RH pial (total brain) volume
```

## Gotchas and Caveats

> [!gotcha] Topology check is strict
> If the surface has any topological defects (handles, non-manifold vertices), the Euler number will not equal 2 and the program exits with an error. Topological correction (`mri_topologycorrection` or `recon-all` topology-fix stages) must be run first.

> [!gotcha] Output is a raw number
> The output is just a floating-point number printed to stdout, with no units label. The value is in mm³ (assuming surface coordinates are in mm, which is the FreeSurfer default).

> [!gotcha] Not the same as cortical ribbon volume
> The volume computed is the geometric volume of the closed surface, not the cortical ribbon volume. The pial surface encloses the entire brain; the white surface encloses all white matter plus subcortical structures. See [[mris_wm_volume]] for WM-only volumes excluding subcortical structures.

## Related Tools

- [[mris_wm_volume]] — white matter volume excluding subcortical labels
- [[mris_anatomical_stats]] — per-label morphometric statistics including area and volume
- [[mri_binarize]] — binarize segmentation for volumetric measurements

## Confidence and Gaps

Source code read completely. Mathematical formula verified from source. Confidence is **high**.
