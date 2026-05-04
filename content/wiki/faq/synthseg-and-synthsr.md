---
title: "SynthSeg / SynthSR / SynthStrip / WMH-SynthSeg — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 14
last_agent_update: 2026-04-27
tags:
  - faq
  - synthseg
  - synthsr
  - synthstrip
  - wmhsynthseg
  - deep-learning
---

# SynthSeg / SynthSR / SynthStrip / WMH-SynthSeg — Frequently Asked Questions

This FAQ collects recurring mailing-list questions about the SynthX
family of contrast-agnostic deep-learning intensity tools shipped with
FreeSurfer: [[mri_synthseg]] (whole-brain segmentation),
[[mri_synthsr]] (super-resolution to a synthetic 1 mm T1),
[[mri_synthstrip]] (skull-stripping), and [[mri_WMHsynthseg]] (white
matter hyperintensity segmentation). All four share a
training-on-synthetic-images strategy that makes them robust across
contrasts and resolutions, and all four sit at the heart of the
[[recon-all-clinical]] pipeline. They also feed the standard
[[wiki/pipelines/recon-all|recon-all]] pipeline as opt-in (FS 7.x) or default (FS 8.x)
components, gated by the `FS_ALLOW_DEEP` environment variable in 7.x.

> For tool reference, see [[mri_synthseg]], [[mri_synthsr]],
> [[mri_synthstrip]], and [[mri_WMHsynthseg]]. For the clinical
> pipeline that wraps them, see the [[recon-all-clinical]] FAQ.

---

## SynthSeg (segmentation)

### Are SynthSeg label values compatible with `aparc+aseg.mgz` from `recon-all`?

**Short answer:** Yes — SynthSeg uses the same FreeSurfer LUT integer
indices as [[aparc+aseg.mgz]], so downstream tools that key off label
values work without modification.

**Detail:** Bruce Fischl confirmed on the mailing list that "the
SynthSeg label outputs are the same as the aparc+aseg.mgz that
recon-all creates." The SynthSeg output embeds a colortable derived
from `$FREESURFER_HOME/FreeSurferColorLUT.txt` (see [[color-lut]]),
and structure indices match those used by [[aseg.mgz]] and
[[aparc+aseg.mgz]]. Practical equivalences:

| recon-all output | SynthSeg equivalent |
|------------------|---------------------|
| `mri/aseg.mgz` (subcortical only) | `mri_synthseg --o seg.mgz` |
| `mri/aparc+aseg.mgz` (with cortical parcels) | `mri_synthseg --o seg.mgz --parc` |

Tools such as [[mri_segstats]], `mri_binarize --match`, and
`mri_label2vol` consume SynthSeg output unchanged. Two caveats: (1)
SynthSeg always resamples to 1 mm isotropic in MNI-aligned space
unless `--keepgeom` is used, so voxel-level comparison with
`aparc+aseg.mgz` (in conformed native space) requires registration;
and (2) without `--parc`, the cortex is a single grey-matter label per
hemisphere — no [[parcellation-schemes|Desikan–Killiany]] subdivisions.

**Provenance:** Mailing list, 2024-12-04 and 2024-12-21 (Fischl). See
`raw/mailing-list/2024-12-synthseg-labels-same-as-aparc-aseg.md` and
`raw/mailing-list/2024-12-synthseg-labels-match-aparc-aseg-desikan-killiany.md`.

**Related:** [[mri_synthseg]], [[aparc+aseg.mgz]], [[aseg.mgz]],
[[color-lut]], [[parcellation-schemes]]

---

### Why is choroid plexus missing from SynthSeg output?

**Short answer:** SynthSeg deliberately excludes choroid plexus
because the developers could not segment it reliably across the full
range of resolutions and contrasts SynthSeg targets.

**Detail:** Iglesias (first author of SynthSeg) stated explicitly that
"we never included the CP in SynthSeg because we didn't manage to
segment it reliably from images of any resolution and contrast." The
choroid plexus is small, morphologically complex, and its signal
characteristics shift substantially with acquisition parameters —
properties that defeat the contrast-agnostic training strategy. The
same exclusion applies to [[recon-all-clinical]] (which wraps SynthSeg
internally). If choroid plexus volume is required, alternatives are
standard [[wiki/pipelines/recon-all|recon-all]] on a good T1 (CP labels 31 / 63 are present in
[[aseg.mgz]] when found) or a dedicated CP-segmentation network from
the literature.

**Provenance:** Mailing list, 2025-01-13 (Iglesias). See
`raw/mailing-list/2025-01-synthseg-does-not-include-choroid-plexus.md`.

**Related:** [[mri_synthseg]], [[recon-all-clinical]],
[[aseg.mgz]], [[color-lut]]

---

### Should I use SynthSeg or SAMSEG to segment a non-T1 input such as an ADC map?

**Short answer:** Use [[mri_synthseg]] — Iglesias recommends it for
non-T1 contrasts because SAMSEG's atlas priors are calibrated to T1.

**Detail:** [[mri_synthseg]] 2.0 is contrast-agnostic by design: its
network is trained on synthetic intensity profiles spanning T1, T2,
FLAIR, ADC, CT, and beyond. SAMSEG, by contrast, fits a Gaussian
mixture model whose atlas priors are calibrated primarily to
T1-weighted intensities; it can run on non-T1 input but produces
coarser boundaries. For ADC maps specifically Iglesias replied
directly that SynthSeg "will give you a crisper 1 mm isotropic
segmentation." Suggested invocation for unusual contrasts:

```bash
mri_synthseg --i adc_map.nii.gz --o adc_seg.mgz --robust
```

The `--robust` flag enables a slower, more stable prediction path. Do
**not** use `--ct` for ADC — that flag is specific to Hounsfield-scale
CT (clips to [0, 80] HU). If you need the segmentation in the input's
native resolution rather than 1 mm isotropic, add `--keepgeom`.

**Provenance:** Mailing list, 2025-01-22 (Iglesias). See
`raw/mailing-list/2025-01-synthseg-preferred-for-non-t1-adc-maps.md`.

**Related:** [[mri_synthseg]], [[coordinate-systems]],
[[recon-all-clinical]]

---

### How do I enable SynthSeg's `--robust` mode inside `recon-all`?

**Short answer:** Pass it via a `recon-all -expert` options file
containing `mri_synthseg -robust`.

**Detail:** [[wiki/pipelines/recon-all|recon-all]] does not expose every internal SynthSeg flag
on its own command line. The standard escape hatch is the expert
options mechanism: each line names a tool and the additional flags to
append to its invocation.

```bash
echo "mri_synthseg -robust" > mri_synthseg.opt
recon-all -s SUBJECT -all -synthseg -expert mri_synthseg.opt
```

`--robust` selects a slower, more conservative network variant
recommended for clinical data, motion-corrupted scans, or unusual
pathology where the default SynthSeg produces visibly wrong output.
For systematic processing of non-standard acquisitions, consider
running [[mri_synthseg]] standalone (with `--robust`) or switching to
[[recon-all-clinical]], which is purpose-built for that regime.

**Provenance:** Mailing list, 2023-11-01 (Huang). See
`raw/mailing-list/2023-11-synthseg-robust-mode-recon-all-expert-options.md`.

**Related:** [[mri_synthseg]], [[wiki/pipelines/recon-all|recon-all]], [[recon-all-clinical]]

---

### Is SynthSeg robust to defaced or pre-skull-stripped input?

**Short answer:** Yes — Greve confirms SynthSeg is "extremely robust"
to both defacing and skull stripping; do not add anatomy back before
running it.

**Detail:** Atlas-based segmenters typically rely on intensity
normalisation that assumes a full FOV including skull and face;
removing those regions can destabilise the priors. SynthSeg's
synthetic-intensity training removes that dependency, and Greve's
direct experience is that defaced inputs (pydeface, mri_deface, etc.)
and pre-stripped inputs both segment correctly. This makes SynthSeg
and [[recon-all-clinical]] safe choices for anonymised datasets.
Caveat: minor volume differences may appear at structures adjacent to
the removed region (e.g. temporal poles near a defaced face), so
"robust" means correct labels — not bit-identical output to a full-FOV
scan. Hippocampal-subfield segmentation, by contrast, is **not** part
of SynthSeg as of FS 8.2.0; integration is on the to-do list but is
made tricky by resolution differences between SynthSeg's general
training set and the high-resolution subfield model.

**Provenance:** Mailing list, 2023-11-09 (Greve, Iglesias). See
`raw/mailing-list/2023-11-synthseg-robust-defacing-skull-stripping.md`.

**Related:** [[mri_synthseg]], [[recon-all-clinical]]

---

### `mri_synthseg --vol` and `--qc` overlap or lose data — what's wrong?

**Short answer:** They are writing to the same CSV path; give them
different output files.

**Detail:** `--vol` (per-structure volumes in mm³) and `--qc` (Dice-style
QC scores per subject) each open the file you point them at and write
their own table; if you give both flags the same path, the second
write clobbers the first and you silently lose one set of numbers.
Iglesias confirmed this on the mailing list and committed to adding a
validation check in a future release, but the safe pattern is always:

```bash
mri_synthseg \
  --i T1.mgz \
  --o synthseg.mgz \
  --vol synthseg_volumes.csv \
  --qc  synthseg_qc.csv
```

> [!gotcha] If your `--vol` CSV looks suspicious (missing volume
> columns, only QC scores), check whether you accidentally pointed
> `--vol` and `--qc` at the same path — there is no error message,
> just data loss.

**Provenance:** Mailing list, 2023-10-16 (Iglesias). See
`raw/mailing-list/2023-10-synthseg-vol-qc-must-not-share-csv-output-path.md`.

**Related:** [[mri_synthseg]], [[synthseg.vol.csv]]

---

### How is SynthSeg's eTIV computed? Can I reproduce it by thresholding the segmentation?

**Short answer:** It is the sum of soft (probabilistic) volumes for a
fixed list of ~35 structures, not an MNI-registration estimate;
thresholding at 0.5 is close but not exactly identical.

**Detail:** SynthSeg/SAMSEG eTIV comes from the `icv()` function in
`python/gems/utilities.py`, which sums fractional volumes from the
probabilistic segmentation across a fixed structure list (brainstem,
cerebellum cortex / WM, ventricles, cortical and subcortical structures,
WM hypointensities, lesions, vermis area, corpus callosum, pons, etc.).
This differs from the standard [[wiki/pipelines/recon-all|recon-all]] eTIV, which scales an
MNI305 atlas-registration determinant. Iglesias confirmed on the
mailing list that hard-thresholding the discrete output at 0.5 "would
be very close but not exactly the same," because each voxel
contributes a fraction of its volume to each structure proportional to
its posterior probability — thresholding collapses that to a 0/1
assignment per voxel.

The result is written to `sbtiv.stats` and `aseg.stats` as
`EstimatedTotalIntraCranialVol`, and to [[synthseg.tiv.dat]] from the
clinical pipeline.

> [!gotcha] SynthSeg eTIV and standard `recon-all` eTIV use different
> methodologies. Values are similar but not interchangeable; do not
> mix them within a single statistical analysis.

**Provenance:** Mailing list, 2025-07-01 (Iglesias). See
`raw/mailing-list/2025-06-synthseg-etiv-computation-method.md`.

**Related:** [[mri_synthseg]], [[synthseg.tiv.dat]],
[[synthseg.vol.csv]], [[aseg.stats]]

---

### `recon-all` in FS 8 crashes with `ValueError: no field of name pixdim` — why?

**Short answer:** Your subject ID contains `.nii`; rename it to
`_nii` (or remove the extension entirely) and re-run.

**Detail:** In FreeSurfer 8, [[mri_synthseg]] runs as an early step of
[[wiki/pipelines/recon-all|recon-all]] and parses the subject identifier when constructing
file paths. If the subject ID happens to end in `.nii` (or `.nii.gz`,
or `.mgz`), nibabel's header parser is misled into treating the
subject ID as a NIfTI filename and fails with `ValueError: no field
of name pixdim` because the converted MGH file has no NIfTI `pixdim`
field. Yujing Huang diagnosed this on the mailing list — the user
confirmed the rename fix worked.

| Wrong subject ID | Correct |
|------------------|---------|
| `sub-AH002_ses-01_T1w.nii` | `sub-AH002_ses-01_T1w_nii` (or `sub-AH002_ses-01_T1w`) |
| `subject.001.nii` | `subject_001_nii` |

```bash
mv $SUBJECTS_DIR/sub-AH002_ses-01_T1w.nii \
   $SUBJECTS_DIR/sub-AH002_ses-01_T1w_nii
recon-all -s sub-AH002_ses-01_T1w_nii -all
```

> [!gotcha] This error did not occur in FS 7 because `recon-all` did
> not call `mri_synthseg` there. A subject ID inherited from a FS 7
> pipeline may suddenly fail in FS 8.

**Provenance:** Mailing list, 2025-03-06 (Huang). See
`raw/mailing-list/2025-03-mri-synthseg-valueerror-pixdim-nii-in-subject-id.md`.

**Related:** [[mri_synthseg]], [[wiki/pipelines/recon-all|recon-all]]

---

### EasyReg reports "no cortical labels found" even though I ran SynthSeg with `--parc` — what's going on?

**Short answer:** EasyReg cached an earlier SynthSeg output without
cortical parcels; delete the cached `*_synthseg.nii.gz` files next to
your inputs and re-run.

**Detail:** `mri_easyreg` calls [[mri_synthseg]] internally and caches
its output as `<input>_synthseg.nii.gz` next to each input image. If
those cached files were produced by an earlier run without `--parc`,
EasyReg reuses them and never re-invokes SynthSeg — even if you have
since run `mri_synthseg --parc` separately on the same images. The
externally produced parcellated segmentation is not auto-detected.
Iglesias's workaround:

```bash
rm ima1_synthseg.nii.gz ima2_synthseg.nii.gz
mri_easyreg ...   # forces regeneration with --parc
```

**Provenance:** Mailing list, 2023-09-05 (Iglesias). See
`raw/mailing-list/2023-09-easyreg-cortical-parcels-missing-delete-cached-synthseg.md`.

**Related:** [[mri_synthseg]]

---

## SynthSR (super-resolution)

### How should I run hippocampal-subfield segmentation on thick-slice (e.g. 6 mm) clinical MRI?

**Short answer:** Run [[mri_synthsr]] first to produce a synthetic
1 mm isotropic T1, then run `segment_subregions` on that — never
directly on the thick-slice scan.

**Detail:** Hippocampal subfield models are trained on 0.38–1 mm
isotropic data; at 6 mm slice thickness the hippocampus spans only
1–2 slices and landmark detection becomes unreliable. Iglesias
explicitly does **not** recommend running `segmentHA_T1.sh` /
`segment_subregions hippo-amygdala` on thick-slice input. The
recommended pipeline:

```bash
# Step 1: super-resolve the thick-slice T1 (and T2 if available)
mri_synthsr --i clinical_T1.mgz --o synthsr_T1.mgz
mri_synthsr --i clinical_T2.mgz --o synthsr_T2.mgz   # optional

# Step 2: feed the SynthSR output into recon-all, then segment subregions
recon-all -s SUBJECT -i synthsr_T1.mgz -all
segment_subregions hippo-amygdala --cross SUBJECT --sd $SUBJECTS_DIR
```

If both T1 and T2 are available, processing each through SynthSR
separately and visually picking the better result is reasonable —
SynthSR is contrast-agnostic.

**Provenance:** Mailing list, 2025-03-18 (Iglesias). See
`raw/mailing-list/2025-03-synthsr-preprocess-thick-slice-before-segmentha.md`.

**Related:** [[mri_synthsr]], [[wiki/pipelines/recon-all|recon-all]], [[recon-all-clinical]]

---

## SynthStrip (skull-stripping)

### Why does `recon-all` skull-stripping fail in FS 7.3 even though `mri_synthstrip` works standalone?

**Short answer:** SynthStrip was added in FS 7.3 but was not the
default until the FS 8.0 beta; in FS 7.3 you must pass `-synthstrip`
**and** set `FS_ALLOW_DEEP=1`.

**Detail:** Hoffmann clarified the timeline on the mailing list:

| Version | SynthStrip status in `recon-all` |
|---------|----------------------------------|
| FS 7.2 and earlier | Not available |
| FS 7.3, 7.4.x | Available, opt-in via `-synthstrip` (and `FS_ALLOW_DEEP=1`) |
| FS 8.0 beta and later (incl. 8.2.0) | Default skull stripper — no flag needed |

In FS 7.3 the default skull stripper is still `mri_watershed`, which
can over-strip at the cerebellum or occipital pole on non-standard
inputs. To opt into SynthStrip:

```bash
FS_ALLOW_DEEP=1 recon-all -s $SUBJECT -i input.nii.gz -all -synthstrip
```

`FS_ALLOW_DEEP=1` is the gate that permits deep-learning tools inside
[[wiki/pipelines/recon-all|recon-all]] in FS 7.x; without it the `-synthstrip` flag may fall
back silently to watershed. In FS 8.x the variable is no longer
required — SynthStrip runs by default.

**Provenance:** Mailing list, 2025-02-27 (Hoffmann). See
`raw/mailing-list/2025-03-synthstrip-not-default-in-fs73-fs-allow-deep-required.md`.

**Related:** [[mri_synthstrip]], [[wiki/pipelines/recon-all|recon-all]]

---

### How do I pass extra flags (e.g. `--no-csf`) to SynthStrip inside `recon-all`?

**Short answer:** Use the `recon-all -expert` options file with a
line `synthstrip --no-csf`; this appends the flag to the internal
`mri_synthstrip` call.

**Detail:** Hoffmann recommended `--no-csf` for SynthStrip inside
[[wiki/pipelines/recon-all|recon-all]] back in FS 7.3, because it produces a brain mask
similar to the legacy `mri_watershed` algorithm (excludes CSF,
preserving the cortical ribbon). The mechanism is the standard expert
options file:

```bash
echo "synthstrip --no-csf" > expert-options.txt
recon-all -s $SUBJECT -i T1.mgz -all -synthstrip -synthseg \
          -expert expert-options.txt
```

Internally `recon-all` calls `fsr-getxopts synthstrip ...` and
appends matching lines to the `mri_synthstrip` invocation. Whether
recon-all's `-T2` flag (T2-driven dura/pial refinement) interacts
usefully with SynthStrip remained unresolved at the time
("remains to be seen," Hoffmann); test on your own data before
relying on the combination.

> [!gap] No definitive guidance has been published on the
> `-synthstrip` plus `-T2` interaction; treat it as untested in
> production.

**Longitudinal note:** `-synthstrip` only matters for cross-sectional
runs. The longitudinal `-base` and `-long` stages reuse the brain
mask produced during the cross-sectional template run, so the flag
has no effect there. `-synthseg`, by contrast, may need to be
specified at the base stage as well if SynthSeg is required throughout
(Hoffmann was uncertain; verify on your data).

**Provenance:** Mailing list, 2023-06-21 (Hoffmann) and 2024-06-07
(Hoffmann). See
`raw/mailing-list/2023-06-synthstrip-no-csf-flag-recommended-t2-interaction.md`
and `raw/mailing-list/2024-06-recon-all-synthstrip-synthseg-expert-options.md`.

**Related:** [[mri_synthstrip]], [[mri_synthseg]], [[wiki/pipelines/recon-all|recon-all]],
[[synthstrip.mgz]]

---

## WMH-SynthSeg

### `mri_WMHsynthseg` is killed mid-run with no error message — what's wrong, and can I fit it on a smaller machine?

**Short answer:** It ran out of RAM ([[mri_WMHsynthseg]] needs ~32 GB
in standard mode); use the `--crop` flag to do a two-pass run that
fits in much less memory.

**Detail:** A bare `Killed` message during the "Pushing data through
the CNN" step is the Linux OOM killer terminating the process —
Iglesias has confirmed `mri_WMHsynthseg` requires "about 32 GB" of
RAM. WSL machines are particularly prone to this because their
default memory cap is much smaller than the host (raise it via
`.wslconfig`). The fix that does not require buying RAM is the
`--crop` flag:

```bash
mri_WMHsynthseg --i T1.mgz FLAIR.mgz --o out/ --crop
```

Per `mri_WMHsynthseg/WMHSynthSeg/inference.py`, `--crop` does two
passes: it first localises the brain region, then processes a cropped
192×224×192 cuboid. This substantially reduces both CPU RAM and GPU
VRAM. It is the recommended option for systems below 32 GB and for
GPU runs with limited VRAM. Possible cost: minor accuracy reduction
at the cuboid margins for very large brains or peripheral lesions.

> [!gotcha] `--cpu` forces CPU mode but does **not** reduce peak RAM;
> it only avoids the GPU. To reduce memory, use `--crop`.

**Provenance:** Mailing list, 2023-12-21 and 2024-10-07 (Iglesias).
See
`raw/mailing-list/2023-12-wmh-synthseg-memory-32gb-ram-requirement.md`
and `raw/mailing-list/2024-10-wmhsynthseg-crop-flag-gpu-memory-reduction.md`.

**Related:** [[mri_WMHsynthseg]]

---

## Cross-cutting

### How do I turn on SynthStrip and SynthSeg inside `recon-all`, and what do they replace?

**Short answer:** Pass `-synthstrip` and `-synthseg` on the `recon-all`
command line; in FS 8 SynthStrip is already the default, but
`-synthseg` still has to be requested explicitly.

**Detail:** The `recon-config.yaml` distributed with FreeSurfer
(checked at FS 8.2.0) defines two top-level flags:

| Flag | Replaces | Default |
|------|----------|---------|
| `-synthstrip` | `mri_watershed` (skull stripping) | `False` in 7.x; effectively on in 8.x |
| `-synthseg` | `ca_register` + `ca_label` (won't create `talairach.m3z`) | `False` |

A practical cross-sectional command using both:

```bash
recon-all -s SUBJECT -i T1.mgz -all -synthstrip -synthseg \
          -expert expert-options.txt
# expert-options.txt:
#   synthstrip --no-csf
#   mri_synthseg -robust    # only if needed
```

Two consequences worth noting:

1. `-synthseg` skips the GCA/Talairach atlas registration, so
   `talairach.m3z` is **not** created. Tools that depend on it
   (some volumetric eTIV calculators, certain
   [[coordinate-systems|MNI305 transforms]]) will fail or fall back.
2. For [[wiki/pipelines/recon-all|recon-all]] longitudinal runs, `-synthstrip` only matters at
   the cross-sectional stage — base and long inherit the
   cross-sectional brain mask. Whether `-synthseg` must be repeated at
   the base stage was not definitively answered by the developers
   (Hoffmann: "not sure, sorry"); verify on your own pipeline.

**Provenance:** Mailing list, 2024-06-07 (Hoffmann). See
`raw/mailing-list/2024-06-recon-all-synthstrip-synthseg-expert-options.md`.

**Related:** [[mri_synthstrip]], [[mri_synthseg]], [[wiki/pipelines/recon-all|recon-all]],
[[recon-all-clinical]]
