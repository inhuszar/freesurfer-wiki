---
title: "make_hemi_mask"
type: tool
fs_version: "8.2.0"
source_language: "shell"
source_files:
  - "scripts/make_hemi_mask"
families: []
recon_all_stage: null
related:
  - "[[make_upright]]"
  - "[[make_symmetric]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_mask]]"
  - "[[mri_robust_register]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps: []
tags:
  - registration
  - symmetry
  - mask
  - hemisphere
  - preprocessing
---

# make_hemi_mask

## Summary

`make_hemi_mask` masks a head/brain volume down to a **single hemisphere**, in the
volume's *original* space. It calls [[make_upright]] to straighten the volume into
the symmetric half-way space (where the mid-sagittal plane is axis-aligned), keeps
only the requested hemisphere there with [[wiki/tools/mri_convert|mri_convert]]
`--left-right-keep`, maps that hemisphere mask **back** to the original space using
the inverse of the upright transform, and finally applies it as a mask to the
original input with [[mri_mask]]. The output is the original volume with one
hemisphere zeroed out.

## Source Information

- **Language:** csh shell script
- **Source file:** [`scripts/make_hemi_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask)
- **Binary/script location:** `$FREESURFER_HOME/bin/make_hemi_mask`
- **Original author:** Martin Reuter
- **Tools invoked:** [`make_upright`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L56), [`mri_convert --left-right-keep`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L59), [`mri_convert -ait` (inverse-apply LTA)](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L63), [`mri_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L66).

## Purpose and Context

Isolating one hemisphere in native space is needed for hemisphere-specific
processing — e.g. ex vivo single-hemisphere recons, or excluding the contralateral
side from an analysis — while keeping the data on its original grid. A naive
axis-aligned split fails when the head is tilted; `make_hemi_mask` solves this by
defining the hemisphere split in the **upright** space (via [[make_upright]]) and
then transporting the resulting mask back to the input grid. It is the
"keep one hemisphere" sibling of [[make_upright]] (straighten) and
[[make_symmetric]] (mirror).

## Inputs

### Required Inputs

Three positional arguments
([`scripts/make_hemi_mask:27-50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L27-L50)):

1. **`hemi`** — `lh` or `rh`: the hemisphere to **keep**.
2. **`input.mgz`** — the volume to mask.
3. **`output.mgz`** — the masked output (in the input's original space).

### Input Assumptions

> [!assumption] Same assumptions as make_upright
> The volume should be an anatomical with usable left-right structure so the
> internal [[make_upright]] registration to its mirror converges (see that page).
> The hemisphere is defined relative to the upright mid-sagittal plane, then mapped
> back, so the split is robust to head tilt in the original image.

## Outputs

### Files Created

| File | Produced by | Contents |
|------|-------------|----------|
| `output.mgz` | [[mri_mask]] | the original input with only the requested hemisphere retained (other side zeroed) |

Temporary files — the upright volume `tmpupright.mgz` and its LTA `…mgz.lta` — are
created via `mktemp` in the current directory and removed at the end
([`scripts/make_hemi_mask:51-71`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L51-L71)).

### Output Specifications

`output.mgz` is on the **original** input grid (unlike [[make_symmetric]], whose
output stays in upright space) because the hemisphere mask is inverse-transformed
back before masking.

## Mathematical Foundations

The alignment math is in [[make_upright]] (half-way space; see that page's
`[!math]` callout). `make_hemi_mask` then performs: keep one side in upright space
($K_h$ via `--left-right-keep`), inverse-transform that mask to native space
($K_h \circ R$, where $R$ is the input→upright LTA, applied with `mri_convert
-ait`, nearest-neighbour), and multiply: $I_\text{out} = I \cdot \mathbb{1}[K_h
\circ R > 0]$ via [[mri_mask]].

> [!internal] Keep, inverse-apply, and mask
> `--left-right-keep` and inverse-LTA resampling (`-ait`, `-rt nearest`) are in
> [[wiki/tools/mri_convert|mri_convert]]; the final multiply is in [[mri_mask]];
> the upright alignment is in [[make_upright]] → [[mri_robust_register]].

## Configuration Options

`make_hemi_mask` has **no flags** — it is a fixed three-argument wrapper, the first
argument (`lh`/`rh`) selecting which hemisphere to keep. Fewer than three arguments
prints the usage/description/reference block and exits
([`scripts/make_hemi_mask:27-46`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L27-L46)).

### Configuration Interactions

> [!gotcha] `hemi` selects the hemisphere to *keep* (mask retains it)
> `make_hemi_mask lh in.mgz out.mgz` keeps the left hemisphere and zeros the right.
> The hemisphere is defined in upright space and then mapped back, so the kept
> region tracks the head's true mid-sagittal plane even if the input is tilted.

## Typical Use Cases

### 1. Keep only the left hemisphere in native space

```bash
make_hemi_mask lh subject.mgz subject.lh.mgz
```

### 2. Keep only the right hemisphere

```bash
make_hemi_mask rh subject.mgz subject.rh.mgz
```

## Pipeline Context

`make_hemi_mask` is a stand-alone pre-processing tool. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]. It wraps [[make_upright]] (and is a sibling
of [[make_symmetric]]); the inverse-transform-back step is what distinguishes it —
the result is in the original space, ready to feed hemisphere-specific processing.

**Predecessor:** a raw/tilted anatomical volume → **make_hemi_mask**
(internally [[make_upright]] → keep → inverse-LTA → [[mri_mask]]) →
**Successor:** single-hemisphere processing (e.g. an ex vivo recon on the kept
side).

## Gotchas and Caveats

> [!gotcha] Output is in original space (contrast with make_symmetric)
> Because the hemisphere mask is mapped back with the inverse LTA before masking,
> `output.mgz` stays on the input grid. [[make_symmetric]], by contrast, leaves its
> result in upright space.

> [!gotcha] Temp files are created in the current directory
> `mktemp -p ./` places the temporaries in the **current working directory**
> ([`scripts/make_hemi_mask:51`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask#L51));
> run it from a writable directory.

> [!gotcha] No flags, strict argument count
> There is no `--help`/`--version` handling beyond the usage block printed when too
> few arguments are supplied.

## Error Compensation and Guard Rails

- Inherits [[make_upright]]'s robust, `--satit` self-tuning registration, so the
  mid-sagittal split is robust to head tilt.
- Mask resampling back to native space uses nearest-neighbour (`-rt nearest`) to
  keep it binary.
- Temporary files are cleaned up at the end; there are no per-step status checks
  (relies on the child tools' error reporting).

## Related Tools

- [[make_upright]] — the straightening engine this wraps (and which provides the LTA).
- [[make_symmetric]] — sibling that mirrors a hemisphere instead of keeping one (output stays in upright space).
- [[wiki/tools/mri_convert|mri_convert]] — performs `--left-right-keep` and the inverse-LTA resampling.
- [[mri_mask]] — applies the hemisphere mask to the original volume.
- [[mri_robust_register]] — underlies the upright alignment.

## Confidence and Gaps

**High confidence:** the three-argument interface, the keep-then-map-back
semantics, the original-space output, and the
[[make_upright]] → [[wiki/tools/mri_convert|mri_convert]] → [[mri_mask]]
composition — all read directly from
[`scripts/make_hemi_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask).

## References

- FreeSurfer source: [`scripts/make_hemi_mask`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/make_hemi_mask) (v8.2.0).
- Method: M. Reuter, H.D. Rosas, B. Fischl. *Highly Accurate Inverse Consistent Registration: A Robust Approach.* NeuroImage 53(4):1181–1196, 2010. [doi:10.1016/j.neuroimage.2010.07.020](http://dx.doi.org/10.1016/j.neuroimage.2010.07.020).
