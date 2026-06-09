---
title: "make_symmetric"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_symmetric"
families: []
recon_all_stage: null
related:
  - "[[make_upright]]"
  - "[[make_hemi_mask]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_robust_register]]"
  - "[[lta-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - symmetry
  - mirror
  - preprocessing
---

# make_symmetric

## Summary

`make_symmetric` produces a perfectly left-right **symmetric** version of a
head/brain volume by mirroring one hemisphere onto the other. It first calls
[[make_upright]] to straighten the volume into the symmetric half-way space (and to
obtain the input→upright transform), then uses
[[wiki/tools/mri_convert|mri_convert]] `--left-right-mirror` to replace the chosen
hemisphere's side with a reflection of the opposite side. The output is the
symmetrised volume in upright space, plus the LTA mapping the original input into
that space.

## Source Information

- **Language:** csh shell script
- **Source file:** [`scripts/make_symmetric`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_symmetric`
- **Original author:** Martin Reuter
- **Tools invoked:** [`make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric#L55), [`mri_convert --left-right-mirror`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric#L58).

## Purpose and Context

A symmetric head image is useful for building symmetric templates, for studies that
require left/right interchangeability, and as a pre-processing step where a
mid-sagittally aligned, mirror-symmetric volume simplifies later analysis.
`make_symmetric` is the "mirror one hemisphere" sibling of the Reuter symmetry
trio: [[make_upright]] (straighten only), `make_symmetric` (mirror to fully
symmetrise), and [[make_hemi_mask]] (keep one hemisphere). All three share the
half-way-space alignment of [[make_upright]].

## Inputs

### Required Inputs

Four positional arguments
([`scripts/make_symmetric:26-51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric#L26-L51)):

1. **`hemi`** — `lh` or `rh`: the hemisphere to **keep** and mirror onto the other side.
2. **`input.mgz`** — the volume to symmetrise.
3. **`output.mgz`** — the symmetric output.
4. **`map.lta`** — output LTA mapping the input into the upright space.

### Input Assumptions

> [!assumption] Same assumptions as make_upright
> The volume should be an anatomical with usable left-right structure so that
> [[make_upright]]'s registration to its mirror converges; see that page's
> assumption callout. The mirror direction is interpreted relative to the upright
> (half-way) space.

## Outputs

### Files Created

| File | Produced by | Contents |
|------|-------------|----------|
| `output.mgz` | [[wiki/tools/mri_convert|mri_convert]] `--left-right-mirror <hemi>` | symmetric volume (the kept hemi mirrored onto the other) in upright space |
| `map.lta` | passed through from [[make_upright]] | LTA mapping input → upright space |

A temp file `tmp.make_upright.<pid>.mgz` (the intermediate upright volume) is
written in the output directory and removed at the end
([`scripts/make_symmetric:53-61`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric#L53-L61)).

### Output Specifications

`output.mgz` is in the upright half-way space defined by [[make_upright]]; `map.lta`
is a standard LTA (see [[lta-format]]).

## Mathematical Foundations

The straightening math is entirely in [[make_upright]] (half-way space of the
register-to-mirror; see that page's `[!math]` callout). `make_symmetric` adds only
the final reflection: in upright space the mid-sagittal plane is axis-aligned, so
`--left-right-mirror <hemi>` copies the kept hemisphere's voxels to the mirrored
positions on the other side, yielding $I_\text{sym}(x) = I_\text{up}(\sigma(x))$
for the discarded side, where $\sigma$ is reflection across the mid-sagittal plane.

> [!internal] Reflection and half-way space
> `--left-right-mirror` is implemented in [[wiki/tools/mri_convert|mri_convert]];
> the half-way-space alignment is in [[make_upright]] →
> [[mri_robust_register]].

## Configuration Options

`make_symmetric` has **no flags** — it is a fixed four-argument wrapper. The only
"option" is the first argument (`lh`/`rh`) selecting which hemisphere is kept and
mirrored. Fewer than four arguments prints the usage/description/reference block and
exits ([`scripts/make_symmetric:26-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric#L26-L46)).

### Configuration Interactions

> [!gotcha] The `hemi` argument selects the hemisphere to *keep*
> `make_symmetric lh …` keeps the left hemisphere and mirrors it onto the right
> (and vice versa for `rh`). The mirror is applied in **upright** space, not the
> input's native orientation, so the left/right sense follows the straightened
> volume.

## Typical Use Cases

### 1. Symmetrise a head, keeping the left hemisphere

```bash
make_symmetric lh subject.mgz subject.symmetric.mgz subject2upright.lta
```

### 2. Keep the right hemisphere instead

```bash
make_symmetric rh subject.mgz subject.symmetric.mgz subject2upright.lta
```

## Pipeline Context

`make_symmetric` is a stand-alone pre-processing/template-construction tool. It is
**not** part of [[wiki/pipelines/recon-all|recon-all]]. It wraps [[make_upright]]
and shares its half-way-space alignment; its sibling [[make_hemi_mask]] keeps a
hemisphere rather than mirroring it.

**Predecessor:** a raw/tilted anatomical volume → **make_symmetric**
(internally [[make_upright]] → [[wiki/tools/mri_convert|mri_convert]] mirror) →
**Successor:** symmetric template building or downstream symmetric analysis.

## Gotchas and Caveats

> [!gotcha] Output is in upright space, not the input grid
> Because the symmetrisation happens after [[make_upright]], `output.mgz` is in the
> half-way upright space. Use `map.lta` to relate it back to the input.

> [!gotcha] No flags, strict argument count
> Unlike most FreeSurfer scripts there is no `--help`/`--version` handling beyond
> the usage block printed when too few arguments are supplied.

## Error Compensation and Guard Rails

- Inherits [[make_upright]]'s robust, `--satit` self-tuning registration.
- The intermediate upright volume is cleaned up at the end.
- No per-step status checks; relies on the child tools' own error reporting.

## Related Tools

- [[make_upright]] — the straightening engine this wraps (and which emits `map.lta`).
- [[make_hemi_mask]] — sibling that keeps one hemisphere as a mask rather than mirroring.
- [[wiki/tools/mri_convert|mri_convert]] — performs the `--left-right-mirror`.
- [[mri_robust_register]] — underlies the upright alignment.

## Confidence and Gaps

**High confidence:** the four-argument interface, the keep-and-mirror semantics,
the no-flags design, and the [[make_upright]] + [[wiki/tools/mri_convert|mri_convert]]
composition — all read directly from
[`scripts/make_symmetric`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric).

## References

- FreeSurfer source: [`scripts/make_symmetric`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_symmetric) (v8.2.0).
- Method: M. Reuter, H.D. Rosas, B. Fischl. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181–1196, 2010. [doi:10.1016/j.neuroimage.2010.07.020](http://dx.doi.org/10.1016/j.neuroimage.2010.07.020).
