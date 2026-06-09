---
title: "make_upright"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_upright"
families: []
recon_all_stage: null
related:
  - "[[make_symmetric]]"
  - "[[make_hemi_mask]]"
  - "[[mri_robust_register]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[recon-all-exvivo]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - symmetry
  - alignment
  - preprocessing
---

# make_upright

## Summary

`make_upright` straightens a head/brain volume so it faces forward and sits
upright, **without** an external template. It registers the volume to its own
left-right-mirrored copy with [[mri_robust_register]] and takes the *half-way*
space of that registration as the output. Because the half-way space is exactly
midway between the image and its mirror, the result is symmetric about the
mid-sagittal plane — i.e. upright and forward-facing. It writes the straightened
volume and the LTA transform (input → upright space). It is the shared engine
behind [[make_symmetric]] and [[make_hemi_mask]] and is used to initialise ex vivo
and hi-res recon-all alignment.

## Source Information

- **Language:** csh shell script
- **Source file:** [`scripts/make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_upright`
- **Original author:** Martin Reuter
- **Tools invoked:** [`mri_convert --left-right-reverse-pix`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L58), [`mri_robust_register --satit --halfmov`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L62-L67).

## Purpose and Context

Some volumes (especially ex vivo specimens or obliquely acquired heads) are
tilted, so the mid-sagittal plane is not aligned with the image axes. Many
downstream steps work better when the head is upright and symmetric. `make_upright`
achieves this with a clever template-free trick: the half-way space between an
image and its mirror image is, by construction, the symmetric "average" of the two,
so registering an image to its own reflection and resampling into that half-way
space yields an upright, mid-sagittally-aligned volume. It is used to initialise
alignment in [[recon-all-exvivo]] (via `rca-base-init`) and the hi-res v6 path, and
is the core of the symmetry tools.

## Inputs

### Required Inputs

Three positional arguments
([`scripts/make_upright:27-49`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L27-L49)):

1. **`input.mgz`** — the volume to straighten.
2. **`output.mgz`** — the upright volume to write (its directory holds the temp dir).
3. **`map.lta`** — output LTA transform mapping input → upright (half-way) space.

### Input Assumptions

> [!assumption] A single anatomical volume with usable left-right contrast
> The method relies on the head being approximately left-right symmetric so that
> the robust registration to its mirror converges to the mid-sagittal alignment.
> Strongly asymmetric inputs (e.g. a single excised hemisphere) still produce an
> upright result but the "symmetry plane" is defined by whatever the robust
> registration finds. `--satit` lets [[mri_robust_register]] auto-estimate its
> saturation/sensitivity, so no manual parameter is needed.

## Outputs

### Files Created

| File | Produced by | Contents |
|------|-------------|----------|
| `output.mgz` | [[mri_robust_register]] `--halfmov` | the input resampled into the symmetric half-way (upright) space |
| `map.lta` | [[mri_robust_register]] `--halfmovlta` | LTA mapping the input volume into the upright space |

A temporary directory `tmp.make_upright.$$` next to the output holds the mirror,
the full LTA, and (commented-out) the half-destination/weights; it is removed at
the end ([`scripts/make_upright:50-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L50-L73)).

### Output Specifications

`output.mgz` has the same voxel grid/type as produced by the half-way resampling
in [[mri_robust_register]]; `map.lta` is a standard LTA (see [[lta-format]]).

## Mathematical Foundations

> [!math] Half-way space as the symmetry plane
> Let $M$ be the left-right mirror operator and $I$ the input. `make_upright`
> computes the rigid transform $R$ that registers $I$ to $M I$
> ([[mri_robust_register]]), then resamples $I$ into the **half-way** space — the
> space reached by applying $R^{1/2}$ (the matrix square root / geodesic midpoint
> of $R$). Because the midpoint between an image and its reflection lies on the
> mirror plane, the resampled volume is symmetric about the image's mid-sagittal
> plane, i.e. upright and forward-facing. The inverse-consistent, robust estimation
> of $R$ is the contribution of Reuter et al. (2010); see References.

> [!internal] Half-way space and robust cost
> The matrix-square-root half-way resampling (`--halfmov`/`--halfmovlta`) and the
> robust (saturated) registration cost (`--satit`) are implemented in
> [[mri_robust_register]].

## Configuration Options

`make_upright` has **no flags** — it is a fixed three-argument wrapper. Its
behaviour is entirely determined by the positional arguments above and the fixed
[[mri_robust_register]] invocation. Calling it with fewer than three arguments
prints the usage/description/reference block and exits
([`scripts/make_upright:27-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L27-L45)).

### Configuration Interactions

None — there are no options to interact. The only fixed choices baked into the
[[mri_robust_register]] call are `--satit` (auto saturation) and the use of
`--halfmov`/`--halfmovlta` to emit the half-way volume and transform.

## Typical Use Cases

### 1. Straighten a tilted anatomical

```bash
make_upright tilted.mgz upright.mgz tilted2upright.lta
```

### 2. As called by ex vivo / hi-res init

```bash
# rca-base-init:148
make_upright $normInVols[1] $subjdir/mri/norm_template.mgz $ltaXforms[1]
```

## Pipeline Context

`make_upright` is a low-level alignment primitive. It is **not** a step of the
standard [[wiki/pipelines/recon-all|recon-all]] stream, but it is called by
`rca-base-init` ([`scripts/rca-base-init:148`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/rca-base-init#L148))
and by the hi-res v6 recon path
([`scripts/recon-all.v6.hires:1221`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/recon-all.v6.hires#L1221)),
and it is wrapped by [[make_symmetric]] and [[make_hemi_mask]].

**Predecessor:** a raw/tilted anatomical volume → **make_upright** →
**Successors:** [[make_symmetric]] (mirror one hemi to make a symmetric head),
[[make_hemi_mask]] (keep one hemi), or template-initialised recon-all alignment.

## Gotchas and Caveats

> [!gotcha] The half-way space, not the input grid, defines "upright"
> The output lives in the registration's half-way space, so its orientation and
> field-of-view come from that space — `output.mgz` is **not** simply the input
> reoriented in place. To map other data into the same upright space, apply
> `map.lta` (this is exactly what [[make_symmetric]] and [[make_hemi_mask]] do).

> [!gotcha] Temp directory is created next to the output
> `tmp.make_upright.$$` is created in the **output** directory
> ([`scripts/make_upright:50-52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright#L50-L52));
> ensure that directory is writable.

## Error Compensation and Guard Rails

- `--satit` lets [[mri_robust_register]] auto-tune its robustness, avoiding a
  hand-set saturation parameter and making the tool turnkey.
- The temporary directory is removed unconditionally at the end; there are no
  per-step status checks (the script is short and relies on the child tools'
  own error reporting).

## Related Tools

- [[mri_robust_register]] — performs the robust, inverse-consistent registration and the half-way resampling.
- [[wiki/tools/mri_convert|mri_convert]] — produces the left-right-mirrored copy (`--left-right-reverse-pix`).
- [[make_symmetric]] — wraps `make_upright`, then mirrors one hemisphere onto the other.
- [[make_hemi_mask]] — wraps `make_upright`, then keeps one hemisphere and masks back.
- [[recon-all-exvivo]] — uses `make_upright` (via `rca-base-init`) to initialise alignment.

## Confidence and Gaps

**High confidence:** the three-argument interface, the no-flags design, the
half-way-space mechanism, and the exact [[mri_robust_register]] invocation — all
read directly from
[`scripts/make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright).

## References

- FreeSurfer source: [`scripts/make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_upright) (v8.2.0).
- Method: M. Reuter, H.D. Rosas, B. Fischl. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181–1196, 2010. [doi:10.1016/j.neuroimage.2010.07.020](http://dx.doi.org/10.1016/j.neuroimage.2010.07.020).
