---
title: "SAMSEG — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 12
last_agent_update: 2026-06-09
tags:
  - faq
  - samseg
  - lesion-segmentation
  - bayesian-segmentation
  - multicontrast
---

# SAMSEG — Frequently Asked Questions

This FAQ collects recurring questions about [[wiki/tools/samseg|samseg]] — FreeSurfer's
Bayesian whole-brain segmenter — that have been answered on the
mailing list. SAMSEG fits a generative probabilistic atlas to the
input image(s) in their native voxel grid, so it works on essentially
any contrast (T1, T2, FLAIR, PD, multi-contrast combinations) and any
resolution (including thick-slice anisotropic clinical data). It runs
cross-sectionally (`samseg` / `run_samseg`), longitudinally
(`run_samseg_long`), and with optional white-matter lesion segmentation
(`--lesion`). It also integrates with [[wiki/pipelines/recon-all|recon-all]] in two distinct
ways: as a more robust replacement for the standard Talairach
registration step (`-samseg-reg`), and as the subcortical-segmentation
backend for [[mri_gtmseg]] in PET partial-volume correction
(`gtmseg --samseg`).

> For tool reference, see [[wiki/tools/samseg|samseg]]. For the standard cortical
> pipeline, see [[wiki/pipelines/recon-all|recon-all]]. For longitudinal concepts, see
> [[longitudinal-processing]].

---

## Inputs and multi-contrast

### Does SAMSEG require isotropic voxels or a particular contrast?

**Short answer:** No — SAMSEG accepts whatever resolution, anisotropy,
and contrast you have, as long as all inputs to a single run share the
same voxel grid.

**Detail:** SAMSEG's generative probabilistic model adapts the atlas
deformation and the intensity Gaussian mixture to the native image
geometry, so it does not require resampling to isotropic voxels or to
1 mm. Van Leemput's exact phrasing was that "SAMSEG will happily 'eat'
whatever resolution you have in your images." This is by design: the
tool was developed for clinical acquisitions that are often thick-slice
or anisotropic (e.g. 1.33 × 1.33 × 2.0 mm FLAIR). Single-contrast runs
need no preprocessing:

```bash
run_samseg --input flair.nii.gz --output samseg_output/
```

For multi-contrast runs all inputs must live on the same voxel grid;
see the next entry.

**Provenance:** Mailing list, 2024-11-12 (Van Leemput). See
`raw/mailing-list/2024-10-samseg-multicontrast-resample-to-t1-grid.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[wiki/tools/mri_convert|mri_convert]]

---

### How do I prepare T1 + FLAIR for multi-contrast SAMSEG?

**Short answer:** Co-register FLAIR to T1, resample FLAIR to the T1
grid with [[wiki/tools/mri_convert|mri_convert]] `-rl`, then pass both volumes via `--input`.

**Detail:** SAMSEG requires every `--input` volume to share the same
dimensions, voxel sizes, and orientation. The recommended workflow is
to use the T1 as the geometric reference (it usually has the higher
in-plane resolution) and resample the FLAIR (or T2, PD, etc.) onto it:

```bash
mri_coreg --mov flair.nii.gz --ref t1.nii.gz --reg flair2t1.lta
mri_convert -rl t1.nii.gz -rt cubic flair.nii.gz flair_in_t1space.nii.gz
# (or apply the LTA explicitly with mri_vol2vol --reg flair2t1.lta)

run_samseg \
  --input t1.nii.gz flair_in_t1space.nii.gz \
  --pallidum-separate \
  --output samseg_output/
```

For longitudinal multi-contrast runs the registration target is
different — the per-timepoint, longitudinally-registered T1, not the
native T1; see the longitudinal entry below.

**Provenance:** Mailing list, 2024-11-12 (Van Leemput). See
`raw/mailing-list/2024-10-samseg-multicontrast-resample-to-t1-grid.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_coreg]], [[wiki/tools/mri_convert|mri_convert]], [[mri_vol2vol]]

---

## Lesion segmentation

### Why am I getting many false-positive lesions on multi-contrast SAMSEG?

**Short answer:** You forgot `--lesion-mask-pattern`. Without it, every
input contrast (including T1) is treated as lesion-sensitive and
SAMSEG produces spurious lesion voxels.

**Detail:** With multi-contrast `--lesion` runs, you must tell SAMSEG
which contrasts are lesion-sensitive via `--lesion-mask-pattern`. It
takes one space-separated integer per `--input` volume: `0` for a
contrast that is **not** lesion-sensitive (e.g. T1), `1` for a contrast
that **is** lesion-sensitive (e.g. FLAIR or T2). Common patterns:

| Inputs | `--lesion-mask-pattern` |
|--------|------|
| T1 only | `0` |
| FLAIR only | `1` |
| T1 + FLAIR | `0 1` |
| T1 + T2 + FLAIR | `0 0 1` |
| T1 + FLAIR + T2 | `0 1 0` |

The canonical T1+FLAIR call is:

```bash
samseg \
  --input T1.mgz FLAIR.mgz \
  --lesion --lesion-mask-pattern 0 1 \
  --output samseg_output/
```

> [!gotcha] Without `--lesion-mask-pattern`, T1 is treated as
> lesion-sensitive. Because WM is bright on T1, SAMSEG will label
> healthy WM as lesion and the output will be saturated with false
> positives.

**Provenance:** Mailing list, 2025-03-19 (Van Leemput). See
`raw/mailing-list/2025-03-samseg-lesion-mask-pattern-multi-contrast.md`.

**Related:** [[wiki/tools/samseg|samseg]]

---

### Why does the lesion volume in `samseg.stats` differ from the count of label-99 voxels in `seg.mgz`?

**Short answer:** `samseg.stats` is a partial-volume sum of the lesion
posterior probabilities; the label-99 count is a hard threshold on the
same posteriors (default `--threshold 0.3`). The two will always
differ, and the soft `samseg.stats` value is the more accurate volume
estimate.

**Detail:** SAMSEG's lesion class is special — it has an internal
probability map (the per-voxel lesion posterior) that is consumed in
two different ways:

| Measure | Source | How computed | Property |
|---------|--------|--------------|----------|
| `samseg.stats` lesion line | soft posterior sum | `Σ P(lesion\|voxel) × voxel_volume` | partial-volume aware; float |
| Label 99 in `seg.mgz` | hard threshold | voxels where `P(lesion) > --threshold` (default `0.3`) | integer count × voxel volume |

The threshold knob (`--threshold`) only affects `seg.mgz`; the
`samseg.stats` figure is always the soft sum and does not depend on
it. For statistical analyses where lesion load is the outcome, prefer
the `samseg.stats` value; use the binary label-99 mask when you need a
mask for downstream processing.

**Provenance:** Mailing list, 2023-11-16 to 2023-11-22 (Greve, Van
Leemput). See
`raw/mailing-list/2023-11-samseg-lesion-volume-partial-vs-binary-threshold-posteriors.md`,
`raw/mailing-list/2023-11-samseg-lesion-volume-stats-vs-label99-threshold.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_binarize]], [[mri_segstats]]

---

### How do I sweep different lesion thresholds without re-running SAMSEG?

**Short answer:** Run with `--save-posteriors`, then threshold
`<output>/posteriors/Lesions.mgz` with [[mri_binarize]] at whatever
cutoff you want.

**Detail:** Adding `--save-posteriors` to the SAMSEG command writes
the per-voxel lesion posterior probability map (values in `[0, 1]`) to
`<outputdir>/posteriors/Lesions.mgz`. You can then explore threshold
sensitivity offline:

```bash
run_samseg --input T1.mgz FLAIR.mgz \
           --lesion --lesion-mask-pattern 0 1 \
           --save-posteriors \
           --output samseg_out/

# Stricter threshold (0.5)
mri_binarize --i samseg_out/posteriors/Lesions.mgz --min 0.5 \
             --o lesion_mask_05.mgz
mri_segstats --seg lesion_mask_05.mgz --sum lesion_vol_05.txt

# More sensitive (0.1)
mri_binarize --i samseg_out/posteriors/Lesions.mgz --min 0.1 \
             --o lesion_mask_01.mgz
```

Lower thresholds are more sensitive (more true positives, more false
positives); higher thresholds are more specific.

**Provenance:** Mailing list, 2023-11-22 (Van Leemput). See
`raw/mailing-list/2023-11-samseg-lesion-volume-partial-vs-binary-threshold-posteriors.md`,
`raw/mailing-list/2023-11-samseg-lesion-volume-stats-vs-label99-threshold.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_binarize]], [[mri_segstats]]

---

### How can I make SAMSEG more sensitive to subtle WM lesions?

**Short answer:** Two knobs, in increasing aggressiveness:
`--lesion-mask-structure White` (relax intensity masking) and
`--do-not-use-shape-model` (disable the VAE shape prior). The latter
recovers more true positives but also more false positives.

**Detail:** SAMSEG's lesion detection uses an intensity mask plus a
learned shape prior. Both can be relaxed:

- `--lesion-mask-structure` (default: `Cortex`) sets the reference
  structure used for intensity-based masking — voxels darker than the
  mean intensity of this structure on the lesion-sensitive contrast
  are excluded from lesion candidates. Switching to `White` raises the
  mask only above WM mean, allowing lesion candidates near the GM/WM
  boundary that the default would have rejected.
- `--do-not-use-shape-model` disables the VAE (variational
  autoencoder) lesion shape prior, which otherwise constrains
  segmented lesions to plausible shapes. Disabling it lets the model
  flag any hyperintense region.

Sensitivity ladder (from conservative to aggressive):

```bash
# Default
run_samseg --input T1.mgz FLAIR.mgz --lesion --lesion-mask-pattern 0 1 \
           --output samseg_out/

# More sensitive: relax intensity masking
run_samseg --input T1.mgz FLAIR.mgz --lesion --lesion-mask-pattern 0 1 \
           --lesion-mask-structure White \
           --output samseg_out/

# Most sensitive: drop the VAE shape prior as well
run_samseg --input T1.mgz FLAIR.mgz --lesion --lesion-mask-pattern 0 1 \
           --lesion-mask-structure White \
           --do-not-use-shape-model \
           --output samseg_out/
```

Both flags are also available on `run_samseg_long`. Use the more
aggressive settings only when you can tolerate (or post-process) the
extra false positives.

**Provenance:** Mailing list, 2024-01-05 (Cerri, Van Leemput). See
`raw/mailing-list/2024-01-samseg-lesion-sensitivity-lesion-mask-structure-shape-model.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_WMHsynthseg]]

---

## Longitudinal SAMSEG

### How do I prepare T1 + FLAIR data for `run_samseg_long`?

**Short answer:** First build the longitudinally-registered T1 series
with [[mri_robust_template]], then co-register each timepoint's FLAIR
to that timepoint's longitudinally-registered T1 with [[mri_coreg]] +
[[mri_vol2vol]], then call `run_samseg_long` with one
`--timepoint <T1_reg> <FLAIR_reg>` per timepoint.

**Detail:** Longitudinal SAMSEG expects each timepoint's contrasts to
share a common voxel grid with the unbiased base template. The
registration target for each timepoint's FLAIR is therefore the
**longitudinally-registered T1 of the same timepoint**, not the native
T1. The full workflow:

```bash
# 1. Build the unbiased template and longitudinally register all T1s.
mri_robust_template --mov tp0_t1.nii tp1_t1.nii \
  --template template.mgz --satit \
  --lta tp0_t1_to_template.lta tp1_t1_to_template.lta

mri_vol2vol --mov tp0_t1.nii --lta tp0_t1_to_template.lta \
            --o tp0_t1_reg.mgz --targ template.mgz
mri_vol2vol --mov tp1_t1.nii --lta tp1_t1_to_template.lta \
            --o tp1_t1_reg.mgz --targ template.mgz

# 2. Per timepoint, co-register FLAIR to that timepoint's registered T1.
mri_coreg  --mov tp0_flair.nii --ref tp0_t1_reg.mgz --reg tp0_FLAIRtoT1.lta
mri_vol2vol --mov tp0_flair.nii --reg tp0_FLAIRtoT1.lta \
            --o tp0_flair_reg.mgz --targ tp0_t1_reg.mgz

mri_coreg  --mov tp1_flair.nii --ref tp1_t1_reg.mgz --reg tp1_FLAIRtoT1.lta
mri_vol2vol --mov tp1_flair.nii --reg tp1_FLAIRtoT1.lta \
            --o tp1_flair_reg.mgz --targ tp1_t1_reg.mgz

# 3. Run longitudinal SAMSEG with one --timepoint per session.
run_samseg_long \
  --timepoint tp0_t1_reg.mgz tp0_flair_reg.mgz \
  --timepoint tp1_t1_reg.mgz tp1_flair_reg.mgz \
  --output outputDir/
```

The cross-sectional resample-to-T1 recipe (above) is **not**
sufficient for the longitudinal pipeline — the FLAIR must be in the
common longitudinal frame, not the native-session T1 frame.

**Provenance:** Mailing list, 2023-06-12 (Cerri). See
`raw/mailing-list/2023-06-samseg-longitudinal-multicontrast-flair-coreg-workflow.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_robust_template]], [[mri_coreg]], [[mri_vol2vol]], [[longitudinal-processing]]

---

### `run_samseg_long` crashes with `TypeError: transform() got an unexpected keyword argument 'affine'` — what's wrong?

**Short answer:** A surfa-API incompatibility in the FreeSurfer 8.0.0
release of `SamsegLongitudinal.py`. Replace the file with the patched
version (shipped via `fs8_updates.sh` and bundled in FS 8.2.0).

**Detail:** In FS 8.0.0 the longitudinal SAMSEG driver calls
`image0.transform(affine=...)`, but the bundled `surfa` library
renamed that keyword and no longer accepts `affine=`. The crash
happens during subject-specific template generation, well after the
cross-sectional samseg has succeeded. The fix is a drop-in replacement
of:

```
$FREESURFER_HOME/python/packages/gems/SamsegLongitudinal.py
```

(macOS path: `/Applications/freesurfer/8.0.0/python/packages/gems/SamsegLongitudinal.py`).
The corrected file is included in the official `fs8_updates.sh` patch
(released ~April 2025) and is the one shipped with FS 8.2.0; running a
current FS 8.2.0 install requires no manual patching. Cross-sectional
`samseg` is unaffected by this bug.

**Provenance:** Mailing list, 2025-03-09 to 2025-03-10 (Di Filippo /
Huang). See
`raw/mailing-list/2025-03-samseg-longitudinal-transform-affine-typeerror-fix.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[longitudinal-processing]]

---

## Output volumes and statistics

### How do I extract gray matter volume / BPF from SAMSEG without running `recon-all`?

**Short answer:** Parse `samseg.stats` directly with `fspython` —
SAMSEG already gives you per-structure volumes; sum the structures you
want.

**Detail:** `samseg.stats` lives in the SAMSEG output directory. Each
line has the format `structure_name, volume_mm3` (case-sensitive
names matching `FreeSurferColorLUT.txt`). For arbitrary aggregates
(e.g. total GM, BPF), parse it with FreeSurfer's bundled Python:

```python
# sum_volumes.py
structures_to_sum = ['Left-Cerebral-Cortex', 'Right-Cerebral-Cortex',
                     'Left-Caudate', 'Right-Caudate']  # extend as needed
total = 0.0
with open('samseg.stats') as f:
    for line in f:
        parts = line.strip().split(',')
        if len(parts) >= 2:
            name = parts[0].strip()
            volume = float(parts[1].strip())
            if name in structures_to_sum:
                total += volume
print(f"Total volume: {total} mm^3")
```

```bash
cd SAMSEG_OUTPUT_DIR
fspython sum_volumes.py
```

`fspython` ensures numpy and the rest of FreeSurfer's Python deps are
available without standing up a separate environment. SAMSEG does not
emit a brain-parenchymal-fraction line directly, so compute it as
`(WM + GM) / TIV` from the relevant `samseg.stats` rows.

**Provenance:** Mailing list, 2024-08-15 (Van Leemput). See
`raw/mailing-list/2024-08-samseg-volume-extraction-fspython-samseg-stats.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_segstats]], [[asegstats2table]]

---

### Why is the corpus callosum missing from SAMSEG output, and how do I add it?

**Short answer:** SAMSEG's atlas does not model the corpus callosum.
Add it post-hoc by running [[mri_cc]] on the SAMSEG segmentation.

**Detail:** SAMSEG segments cortical and subcortical structures from
its probabilistic atlas, but the corpus callosum is not in that atlas
— in the standard [[wiki/pipelines/recon-all|recon-all]] pipeline the CC is delineated by a
separate WM-based midsagittal-plane procedure run by [[mri_cc]]. To
graft a CC segmentation onto a SAMSEG output, point `mri_cc` at the
SAMSEG `seg.mgz`:

```bash
mri_cc -aseg samseg/seg.mgz \
       -o    samseg/seg+cc.mgz \
       -lta  samseg/cc_up.lta \
       <subject>
```

Paths are relative to `SUBJECTS_DIR/<subject>/mri/`, and the tool also
needs `norm.mgz` (the bias-corrected T1) to live in the same
directory. The `-lta` output can be discarded if you don't need it.
The CC is split into sub-labels 251–255 (genu, anterior body,
mid-anterior body, central, isthmus, splenium).

> [!gotcha] If you process SAMSEG via [[samseg2recon]], `mri_cc` is run
> for you and a CC segmentation is already present — only run the
> manual step above when you used `samseg` / `run_samseg` directly.

**Provenance:** Mailing list, 2025-01-30 (Greve). See
`raw/mailing-list/2025-01-samseg-corpus-callosum-missing-use-mri-cc.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_cc]], [[aseg.mgz]]

---

## Integration with other tools

### My MP2RAGE / UNI scan fails `talairach_avi` in `recon-all`. What can I do?

**Short answer:** Add `-samseg-reg` to the `recon-all` command —
SAMSEG's contrast-agnostic atlas registration replaces
`talairach_avi`'s MPRAGE-style registration and is much more robust on
non-standard contrasts.

**Detail:** The default `recon-all` Talairach step uses `mpr2mni305` /
`talairach_avi`, which assumes MPRAGE-like contrast. UNI output from
MP2RAGE has a very different intensity profile (suppressed background,
non-uniform regional T1 contrast), so the registration frequently
fails outright. Switching to:

```bash
recon-all -s subject -i uni_scan.nii.gz -all -samseg-reg
```

makes `recon-all` compute the Talairach registration via SAMSEG's
probabilistic atlas, which adapts to whatever contrast it is given.

> [!gotcha] `-samseg-reg` is auto-disabled when you also pass
> `-samseg` or `-synthseg` (those pipelines handle registration their
> own way). And Greve cautions that even with `-samseg-reg`, UNI scans
> may still fail at later stages of `recon-all` that assume standard
> T1 contrast — for fully contrast-agnostic processing of clinical
> scans, see [[recon-all-clinical]] (the FAQ) and [[recon-all-clinical.sh]].

A separate `talairach_avi` failure mode is the missing `libquadmath`
shared library: `gauss_4dfp: error while loading shared libraries:
libquadmath.so.0`. Install `libquadmath0` (Ubuntu/Debian:
`sudo apt install libquadmath0`) and ensure it's on
`LD_LIBRARY_PATH`. This is unrelated to the contrast issue and either
or both can co-occur.

**Provenance:** Mailing list, 2023-11-08 (Greve), 2023-10-18 (Huang).
See `raw/mailing-list/2023-11-uni-scan-talairach-failure-samseg-reg-flag.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[wiki/pipelines/recon-all|recon-all]], [[recon-all-clinical]], [[recon-all-clinical.sh]]

---

### Why does `gtmseg` need `--samseg` on FreeSurfer 8 subjects?

**Short answer:** FS 8 dropped the nonlinear `talairach.m3z` warp from
`recon-all`. [[gtmseg]] previously consumed that warp for its
subcortical labelling; on FS 8 subjects you must instead use
`gtmseg --samseg`, which gets subcortical labels from a SAMSEG-based
segmentation.

**Detail:** In FS 7.x, `recon-all` produced
`mri/transforms/talairach.m3z` (the nonlinear morph to Talairach /
MNI305). FS 8.0.0 removed that step from the default pipeline, so
`talairach.m3z` no longer exists in FS 8 subject directories. Running
[[mri_gtmseg]] without `--samseg` on such a subject either fails with
a missing-file error or silently falls back to an incorrect mapping.
The fix is straightforward:

```bash
gtmseg --s SUBJECT --samseg
```

This reroutes `gtmseg` to use SAMSEG-based subcortical segmentation in
place of the missing nonlinear Talairach warp, restoring correct GTM
preparation for [[mri_gtmpvc]] downstream.

If you have a hybrid setup where a subject was originally processed
with FS 7 (so `talairach.m3z` is still on disk), `gtmseg` without
`--samseg` may still work — but for FS 8 subjects always pass
`--samseg`.

**Provenance:** Mailing list, 2025-03-11 (Greve). See
`raw/mailing-list/2025-03-gtmseg-samseg-flag-required-fs8-talairach-m3z-removed.md`.

**Related:** [[wiki/tools/samseg|samseg]], [[mri_gtmseg]], [[mri_gtmpvc]], [[wiki/pipelines/recon-all|recon-all]]

---

## Memory and errors

### `run_samseg` printed `maximalDeformation is too small; stopping` and then `Killed`. Did SAMSEG fail or succeed?

**Short answer:** Those two messages are unrelated. The first is a
normal convergence message from the GEMS optimiser; the second
("Killed") is the OS terminating the process — almost always
out-of-memory.

**Detail:** When you see this pair in a SAMSEG log:

1. **`Optimizer: maximalDeformation is too small; stopping`** — this
   is emitted by the GEMS mesh deformation optimiser whenever the
   maximum mesh displacement falls below the convergence threshold
   `maximalDeformationStopCriterion`. It is a routine "iteration done"
   message and is not an error. (The same message also shows up in
   the MATLAB/Python subregion segmenters: HippoSF, BrainstemSS,
   ThalamicNuclei, AANsegment.)
2. **`Killed`** — this comes from the shell, not from SAMSEG. Exit
   code 137 (= `128 + SIGKILL`) means an external entity killed the
   process. The usual culprit is the Linux OOM killer; on HPC
   schedulers it can also be the resource manager terminating the job
   for exceeding its memory allocation.

To confirm OOM after the fact: `dmesg | grep -i "killed process"` or
`journalctl -k | grep -i oom`. SAMSEG full-brain segmentation
typically needs 8–16 GB of RAM at 1 mm resolution; allocate
accordingly (`#SBATCH --mem=16G` on SLURM, `-l h_vmem=16G` on SGE) and
avoid running multiple SAMSEG jobs concurrently on the same node.

> [!gotcha] When OOM strikes, SAMSEG usually has already written
> partial intermediate files (transforms, cost logs) but no final
> `samseg.stats` / `seg.mgz`. The presence of partial output is not
> evidence of success — check that `samseg.stats` exists.

**Provenance:** Mailing list, 2024-06-05 (Cerri). See
`raw/mailing-list/2024-06-samseg-gems-maximaldeformation-killed-oom.md`.

**Related:** [[wiki/tools/samseg|samseg]]

---

## See also

Packaged helpers for the SAMSEG input-prep and output-bridging steps that
the manual workflows above perform by hand:

- [[fsr-import]] — import and tag multi-contrast inputs (T1/T2/FLAIR/…) for
  a SAMSEG run.
- [[fsr-coreg]] — co-register the imported modalities onto a common grid
  (the packaged equivalent of the manual [[mri_coreg]] + [[wiki/tools/mri_convert|mri_convert]]
  `-rl` recipe).
- [[fsr-longpreproc]] — longitudinal input preprocessing feeding
  `run_samseg_long`.
- [[seg2recon]] — turn a segmentation into a recon-all subject directory;
  `samseg2recon` (linked above) is its SAMSEG-specific sibling.
