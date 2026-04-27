---
title: "Subregion Segmentation — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 20
last_agent_update: 2026-04-27
tags:
  - faq
  - subregion-segmentation
  - hippocampal-subfields
  - thalamic-nuclei
  - brainstem-subfields
  - nextbrain
  - erc
  - aan
  - hypothalamic-subunits
---

# Subregion Segmentation — Frequently Asked Questions

This FAQ collects recurring questions about FreeSurfer's *post-recon-all*
subregion atlases and the deep-learning segmentation tools that use them.
The unified Python wrapper `segment_subregions` (FS 7.3+) covers the four
classical Bayesian (GEMS) atlases — hippocampal subfields and amygdala
nuclei, thalamic nuclei, brainstem substructures — and replaces the legacy
MATLAB-based `segmentHA_T1.sh`, `segmentThalamicNuclei.sh`, and
`segmentBS.sh` scripts. Three additional, structurally independent tools
extend the family: [[mri_segment_hypothalamic_subunits]] (TensorFlow/Keras
hypothalamic subunits), `segmentAAN.sh` (MATLAB-compiled brainstem
arousal/ascending nuclei), and the NextBrain / ERC Bayesian Segmentation
pipeline ([[mri_histo_atlas_segment_fireants]] and `mri_histo_atlas_segment_fast`),
which uses an ultra-high-resolution histological atlas. Expect a long
page — these tools share idiosyncrasies (MCR/Python toolchains, atlas
download requirements, label-grouping conventions) that recur in many
threads.

> For the standard pipeline that produces the prerequisite recon-all
> outputs, see [[recon-all]]. For the contrast-agnostic clinical
> alternative, see [[recon-all-clinical]]. For longitudinal use see
> [[longitudinal-processing]].

---

## Hippocampal and amygdala subfields

### Do I have to re-run cross-sectional `segmentHA` before `segmentHA_long` (or `segment_subregions --long-base`)?

**Short answer:** No — the longitudinal subfield script only requires
that the main FreeSurfer longitudinal pipeline has been completed.

**Detail:** Iglesias confirmed that `segmentHA_long` (and the modern
`segment_subregions hippo-amygdala --long-base <base>`) takes the
unbiased base from [[longitudinal-processing]] as its input and does
not depend on a prior cross-sectional `segmentHA` run. Cross-sectional
and longitudinal subfield outputs use distinct filenames
(`lh.hippoAmygLabels-T1.v22.mgz` vs `lh.hippoAmygLabels-T1.v22.long.<base>.mgz`)
and coexist without conflict, so users with mixed cross-sectional
output across a cohort can move directly to the longitudinal step. The
prerequisite is the standard cross → base → long sequence of [[recon-all]].

**Provenance:** Mailing list, 2023-07-03 (Iglesias). See
`raw/mailing-list/2023-07-segmentha-long-does-not-require-cross-segmentation-first.md`.

**Related:** [[recon-all]], [[longitudinal-processing]]

---

### Why does my hippocampal subfield run fail with a `.mexa64` "Permission denied" error on an HPC cluster?

**Short answer:** SELinux is blocking the MATLAB Runtime from loading
shared libraries it cached under `/tmp`; the simplest fix is to use the
Python-based `segment_subregions` instead of the legacy MATLAB script.

**Detail:** When `segmentHA_T1.sh` runs, MCR extracts compiled MEX files
into `/tmp/MCR_XXXXXXXX/...` and then `dlopen`s them. On HPC clusters
with SELinux enforcing or with a `noexec` mount on `/tmp`, the linker
refuses to map the segment and reports a misleading "Permission denied"
even though the file is readable. Three workarounds confirmed by
fsbuild and Iglesias:

1. Switch to the Python wrapper, which does not use MCR:
   ```bash
   segment_subregions hippo-amygdala --cross SUBJECT --sd $SUBJECTS_DIR
   ```
2. Set `MCR_CACHE_ROOT` to a directory whose SELinux context allows
   execute access:
   ```bash
   export MCR_CACHE_ROOT=/path/to/writable/exec-allowed/dir
   ```
3. Have the cluster admin relabel the MCR cache directory or grant the
   appropriate `execmod` SELinux exception.

> [!gotcha] The error message says "Permission denied" but the file
> permissions are usually fine — the failure is a MAC (mandatory access
> control) policy denial from SELinux, not a discretionary file
> permission. `ls -lZ` on the cached MEX file reveals the SELinux
> context.

**Provenance:** Mailing list, 2023-06-13 to 2023-06-27 (Iglesias,
fsbuild). See
`raw/mailing-list/2023-06-hipposubfields-mexa64-selinux-hpc-error.md`.

**Related:** [[recon-all]]

---

### Why does `segmentHA_T1.sh` complain about overwriting `imageDump.mgz` on a shared cluster install?

**Short answer:** The legacy MATLAB script writes a working copy back
into `$FREESURFER_HOME/average/`, so a read-only shared install breaks
it; copy FreeSurfer to a writable location or upgrade to the Python
`segment_subregions`.

**Detail:** A user reported `mv: replace 'imageDump.mgz', overriding
mode 0444 ...` while running `segmentHA_T1.sh` against a Slurm-shared
read-only `$FREESURFER_HOME`. Iglesias was initially surprised — the
intended design is for the subfield temporary directory to live under
`SUBJECTS_DIR`, not `FREESURFER_HOME` — but the user's observation
confirmed that the FS 7.x MATLAB pipeline does in fact touch a template
file inside `$FREESURFER_HOME/average/`. Recommended workarounds:

1. Make a per-user writable copy of `$FREESURFER_HOME` and point
   `FREESURFER_HOME` at it before running.
2. Have the cluster admin make `imageDump.mgz` group-writable.
3. Use the FS 7.3+ Python wrapper:
   ```bash
   segment_subregions hippo-amygdala --cross SUBJECT --sd $SUBJECTS_DIR
   ```
   The Python pipeline writes only into `$SUBJECTS_DIR` and is
   compatible with read-only shared installations.

**Provenance:** Mailing list, 2023-12-22 (Iglesias). See
`raw/mailing-list/2023-12-hippo-subfields-subjects-dir-permissions-imagedump.md`.

**Related:** [[recon-all]]

---

### My subjects' `mri/` folder has many `lh.hippoAmygLabels-T1.v22*.mgz` files — what do the `FSvoxelSpace`, `CA`, `FS60`, and `HBT` suffixes mean?

**Short answer:** `FSvoxelSpace` is a 1 mm-isotropic resampled copy of
the segmentation aligned with the rest of the recon-all `mri/` outputs;
`CA`, `FS60`, and `HBT` are convenience relabellings (cornu ammonis
groups, FreeSurfer 6.0-compatible coarse scheme, head/body/tail) of the
same underlying segmentation.

**Detail:** Iglesias clarified that the segmentation runs at the
atlas's native ~0.333 mm isotropic resolution. The default file
(`lh.hippoAmygLabels-T1.v22.mgz`) is at that native resolution and is
the most precise. The `FSvoxelSpace` variant is resampled to 1 mm to
match `brainmask.mgz`, [[norm.mgz]], and friends — convenient for
overlay and ROI work but lower-resolution. The `CA`, `FS60`, and `HBT`
variants are not separate segmentation runs; they merge the fine v22
labels into broader anatomical groupings provided "for convenience".
Numeric label IDs are defined in `$FREESURFER_HOME/FreeSurferColorLUT.txt`
(see [[color-lut]]). For the most detailed labelling, use the file
*without* `CA`, `FS60`, or `HBT` in its name.

**Provenance:** Mailing list, 2025-02-21 (Iglesias). See
`raw/mailing-list/2025-02-hipposubfields-fsvoxelspace-suffix-label-groupings.md`.

**Related:** [[color-lut]], [[parcellation-schemes]]

---

### Where are the `.stats` files for the HBT, FS60, and CA hippocampal grouping schemes?

**Short answer:** They are not generated automatically — only the default
v21/v22 scheme has a stats file. Use [[mri_segstats]] on the
corresponding `.mgz` to produce one.

**Detail:** `segmentHA_T1.sh` and `segment_subregions hippo-amygdala`
emit `.stats` only for the default scheme. To get volumes for the
HBT/FS60/CA grouping `.mgz` files, run [[mri_segstats]]:

```bash
mri_segstats \
  --seg lh.hippoAmygLabels-T1.v22.HBT.mgz \
  --ctab $FREESURFER_HOME/average/HippocampalSubfields.ctab \
  --sum lh.hippo.HBT.stats.txt
```

If the `.mgz` has an embedded color table the `--ctab` flag is
unnecessary. A pure-MATLAB equivalent (Iglesias's pattern) is
`volume = sum(mri.vol(:)==label) * abs(det(mri.vox2ras0))` after
`MRIread`.

**Provenance:** Mailing list, 2023-10-18 (Iglesias, Greve). See
`raw/mailing-list/2023-10-hippo-ca-hbt-fs60-volumes-via-mri-segstats.md`.

**Related:** [[mri_segstats]], [[asegstats2table]], [[color-lut]]

---

### How do I get a "total CA" or other hierarchy-level hippocampal volume?

**Short answer:** Sum the per-component subfield volumes manually from
the stats file — there is no built-in combined output. For the v22
atlas the head and body components must be added together
(CA1 = CA1-head + CA1-body, similarly for CA3, CA4, GC-ML-DG,
subiculum).

**Detail:** Iglesias confirmed in two separate threads that the v22
atlas reports head and body components separately and that
`segment_subregions` does not produce a roll-up label. Read
`Volume_mm3` directly from `lh.hippoSfVolumes-T1.v22.stats` and add the
relevant rows. If you are working from raw voxel counts at 0.333 mm
isotropic, the per-voxel volume is `(1/3)^3 = 1/27 mm^3`, so
`volume_mm3 = nvoxels / 27.0`. A typical aggregation:

```python
import pandas as pd
df = pd.read_csv('lh.hippoSfVolumes-T1.v22.stats', comment='#',
                 sep=r'\s+', header=None,
                 names=['Index','SegId','NVoxels','Volume_mm3',
                        'StructName','normMean','normStdDev',
                        'normMin','normMax','normRange'])
vol = dict(zip(df['StructName'], df['Volume_mm3']))
CA1 = vol.get('CA1-head', 0) + vol.get('CA1-body', 0)
CA3 = vol.get('CA3-head', 0) + vol.get('CA3-body', 0)
CA4 = vol.get('CA4-head', 0) + vol.get('CA4-body', 0)
GC  = vol.get('GC-ML-DG-head', 0) + vol.get('GC-ML-DG-body', 0)
total_CA = CA1 + CA3 + CA4 + GC
```

Exact `StructName` strings vary slightly between atlas versions —
inspect the column rather than hard-coding names.

**Provenance:** Mailing list, 2025-03-14 (Iglesias) and 2025-03-17
(Iglesias). See
`raw/mailing-list/2025-03-hippocampal-ca-hierarchy-head-body-aggregation.md`
and `raw/mailing-list/2025-03-hippocampal-subfield-hierarchy-volumes-voxel-count.md`.

**Related:** [[mri_segstats]], [[asegstats2table]]

---

### How do I aggregate hippocampal subfield stats from many subjects into one table?

**Short answer:** Use `ConcatenateSubregionsResults.sh`. A long-standing
bug that searched `mri/` instead of `stats/` for the per-subject
`.stats` files was fixed in the FS 8.x dev branch in June 2024 and
ships in FS 8.2.0.

**Detail:** Pre-fix versions emitted nothing or "files not found" even
when the per-subject `.stats` was present. Jackson Nolan confirmed the
patch and FS 8.2.0's `subregions/ConcatenateSubregionsResults.sh:119`
constructs the path correctly as `"$subjectName/stats/$stat_file"`.
Typical usage:

```bash
ConcatenateSubregionsResults.sh \
  -f lh.hippoSfVolumes-T1.v21.stats \
  -f rh.hippoSfVolumes-T1.v21.stats \
  -o group_stats/ \
  -s "$SUBJECTS_DIR"
```

If you must stay on an FS 7.x release that still has the bug, change
`mri/$stat_file` to `stats/$stat_file` in the script.

**Provenance:** Mailing list, 2024-06-10 (Nolan). See
`raw/mailing-list/2024-06-hipposubfields-concatenate-subregions-results-stats-folder.md`.

**Related:** [[asegstats2table]], [[aparcstats2table]]

---

### My input is a 6 mm thick-slice clinical T1 — can I run `segmentHA` directly on it?

**Short answer:** No, the model is trained for ~1 mm isotropic data and
breaks down at thick slices; super-resolve with [[mri_synthsr]] first
and run subfield segmentation on the synthesised 1 mm volume.

**Detail:** Iglesias's recommended pipeline for thick-slice or
anisotropic clinical data:

```bash
mri_synthsr --i clinical_T1.mgz --o synthsr_T1.mgz
recon-all -s SUBJECT -i synthsr_T1.mgz -all
segment_subregions hippo-amygdala --cross SUBJECT --sd "$SUBJECTS_DIR"
```

[[mri_synthsr]] is contrast-agnostic, so if both T1 and T2 are
available you can synthesise from each independently and visually
choose the better super-resolution. Hippocampal subfields span only a
handful of voxels at 6 mm slice thickness; the 0.333 mm-resolution
GEMS model has no priors at that scale and produces unreliable
boundaries. The pure-clinical alternative is [[recon-all-clinical]],
but that pipeline does not currently run subfield segmentation
internally.

**Provenance:** Mailing list, 2025-03-18 (Iglesias). See
`raw/mailing-list/2025-03-synthsr-preprocess-thick-slice-before-segmentha.md`.

**Related:** [[mri_synthsr]], [[mri_synthseg]], [[recon-all-clinical]]

---

## Thalamic nuclei

### Some small thalamic nuclei (Pt, Pc, Vm) are missing from `ThalamicNuclei.v13.T1.mgz` — is the segmentation broken?

**Short answer:** No — the volume estimates are still valid. Hard
segmentation is winner-takes-all per voxel, so very small nuclei whose
posteriors never "win" anywhere are absent from the discrete labelmap
even though they have non-zero fractional volume. Set
`WRITE_POSTERIORS=1` to get per-nucleus probability maps.

**Detail:** Tregidgo explained the design: each voxel in the hard
segmentation is labelled with its argmax posterior, so the smallest
nuclei (Pt = pulvinar anterior, Pc = pulvinar central, Vm = ventral
medial) often lose every voxel competition to neighbouring larger
nuclei. The volume table is computed by summing fractional posteriors
voxel-by-voxel, which is why a nucleus can have a perfectly meaningful
volume in the stats file while being invisible in the volume.

To export per-nucleus probability maps for ROI analysis (e.g. SPM,
FSL):

```bash
export WRITE_POSTERIORS=1
segmentThalamicNuclei.sh SUBJECT
# or, for the FS 7.3+ Python wrapper:
WRITE_POSTERIORS=1 segment_subregions thalamus --cross SUBJECT
```

This emits 25 separate `.mgz` files (one per nucleus) of continuous
posterior probabilities in `mri/`. Threshold at e.g. 0.5 for a binary
ROI.

> [!gotcha] A nucleus that is present in the stats file but absent from
> the volume is *not* a bug — it is the expected behaviour of
> winner-takes-all decoding of a Bayesian segmentation.

**Provenance:** Mailing list, 2023-07-17 to 2023-07-18 (Iglesias,
Tregidgo). See
`raw/mailing-list/2023-07-thalamic-nuclei-small-missing-hard-seg-write-posteriors.md`.

**Related:** [[mri_segment_thalamic_nuclei_dti_cnn]], [[color-lut]]

---

### What is the correct command-line syntax for `segmentThalamicNuclei.sh` with a FGATIR image?

**Short answer:**
`segmentThalamicNuclei.sh SUBJECT SUBJECT_DIR FGATIR_PATH` — the
subject directory must be the *second* positional argument when
passing FGATIR.

**Detail:** Iglesias clarified that the FGATIR variant of the script
requires three positional arguments, not two. The common mistake is
running `segmentThalamicNuclei.sh SUBJECT /path/to/FGATIR.mgz`, which
makes the script interpret the FGATIR path as the subject directory.
Use either an explicit `$SUBJECTS_DIR` or `.` if you are running from
inside it:

```bash
# T1-only (no FGATIR)
segmentThalamicNuclei.sh SUBJECT

# With FGATIR
segmentThalamicNuclei.sh SUBJECT "$SUBJECTS_DIR" /path/to/FGATIR.mgz
# or, from inside SUBJECTS_DIR:
segmentThalamicNuclei.sh SUBJECT . /path/to/FGATIR.mgz
```

In FS 8.x the FS-Python `segment_subregions thalamus` is the
recommended replacement; check `segment_subregions --help` for FGATIR
flag handling.

**Provenance:** Mailing list, 2023-11-22 (Iglesias). See
`raw/mailing-list/2023-11-segmentthalamicnuclei-fgatir-syntax-subject-dir.md`.

**Related:** [[recon-all]]

---

### How do I get thalamic nuclei labels in MNI152 space?

**Short answer:** Either run `segment_subregions thalamus` directly on
the MNI152 template after a recon-all on that template, or segment your
subjects natively and warp each segmentation to MNI152 with SynthMorph.

**Detail:** Greve recommends running the segmentation on the MNI152
template itself when a single canonical MNI-space atlas is needed
(easiest), and warping individual subject segmentations only when a
population-average mask is required. As of March 2025 Iglesias
announced that probabilistic atlases for hippocampal subfields,
amygdala nuclei, brainstem substructures, *and* thalamic nuclei are
included in the FS distribution in MNI/ICBM152 space, so a separate
template-segmentation run may no longer be necessary in FS 8.x.

```bash
# Option A — segment the MNI152 template directly:
recon-all -s mni152_subject \
          -i $FREESURFER_HOME/subjects/cvs_avg35_inMNI152/mri/T1.mgz -all
segment_subregions thalamus --cross mni152_subject

# Option B — segment each subject and warp to MNI152:
segment_subregions thalamus --cross "$subj"
mri_synthmorph -m deformable -t "${subj}_to_mni.lta" \
    "$SUBJECTS_DIR/$subj/mri/brain.mgz" \
    $FREESURFER_HOME/subjects/cvs_avg35_inMNI152/mri/brain.mgz
mri_vol2vol --mov "$subj/mri/ThalamicNuclei.v13.T1.mgz" \
            --targ $FREESURFER_HOME/subjects/cvs_avg35_inMNI152/mri/T1.mgz \
            --lta  "${subj}_to_mni.lta" \
            --interp nearest \
            --o    "${subj}_thal_mni.mgz"
```

> [!gap] As of FS 8.2.0 the exact filenames and locations of the
> bundled MNI-space subregion atlases were not specified in the
> announcement thread — check `$FREESURFER_HOME/average/` and the
> `segment_subregions` help text for current paths.

**Provenance:** Mailing list, 2025-01-09 (Greve), 2023-09-06
(Iglesias), 2025-03-03 (Iglesias). See
`raw/mailing-list/2025-01-thalamic-nuclei-mni-space-run-on-template-or-synthmorph-reg.md`,
`raw/mailing-list/2023-09-segment-subregions-no-hippo-mni-space-template.md`,
`raw/mailing-list/2025-03-subregion-atlases-mni-icbm152-space-hippo-amygdala-brainstem-thalamus.md`.

**Related:** [[mri_synthmorph]], [[coordinate-systems]]

---

### My recon-all `aseg.mgz` thalamus looks under-segmented on 1.5 T data — is there a better tool?

**Short answer:** Yes — Greve recommends running
`segment_subregions thalamus` and merging all nuclei into a single
whole-thalamus mask; the dedicated thalamic model is more robust to
the high white-matter content of the thalamus than the GCA-based aseg.

**Detail:** The whole-brain GCA segmentation that produces
[[aseg.mgz]] is well known to under-label the thalamus, especially on
older 1.5 T acquisitions, because thalamic nuclei contain substantial
intermixed white matter (thalamic radiations, internal capsule). Greve
suggested:

```bash
segment_subregions thalamus --cross SUBJECT
# then merge all nuclei (excluding background) into a whole-thalamus mask
mri_binarize --i ThalamicNuclei.v13.T1.mgz --min 1 --o thalamus_whole.mgz
```

Pre-processing tweaks (intensity normalisation, ANTs denoising/bias,
trying multiple FS versions, FastSurfer) had not helped in the
reporter's hands; the issue is the contrast/atlas combination, not a
preprocessing failure. Caudate under-segmentation on 1.5 T is harder —
manual editing or alternative tooling may be needed.

**Provenance:** Mailing list, 2025-01-30 to 2025-02-03 (Greve). See
`raw/mailing-list/2025-02-subcortical-undersegmentation-1-5T-thalamus-segment-subregions.md`.

**Related:** [[aseg.mgz]], [[recon-all]]

---

### Why are my `segment_subregions` thalamus volumes different from `asegstats2table` thalamus volumes?

**Short answer:** They use different atlases and different segmentation
methods — they are not expected to agree numerically. Compare
correlations, not absolute values, and never mix the two in a single
analysis.

**Detail:** Iglesias confirmed this is intentional. Standard recon-all
populates [[aseg.mgz]] using `mri_ca_label` with the GCA atlas
(`RB_all_2020-01-02.gca`); `segment_subregions` uses GEMS-based
probabilistic atlases at higher resolution with different parcellation
boundaries. The same logic applies to hippocampus, amygdala, and
brainstem volumes from the two tools. Recommendations:

- For whole-brain morphometry: use `aseg`/[[asegstats2table]]
  consistently.
- For subregion studies: use `segment_subregions` consistently.
- Across-method comparisons: report rank correlation or effect size,
  not absolute volume agreement.
- Longitudinal: pick one method per cohort and stay with it.

**Provenance:** Mailing list, 2024-08-06 (Iglesias). See
`raw/mailing-list/2024-08-segment-subregions-vs-asegstats2table-different-atlases.md`.

**Related:** [[aseg.mgz]], [[asegstats2table]], [[parcellation-schemes]]

---

### `segmentThalamicNuclei.sh` cannot find `MCRv97` on macOS even though I created a symlink — what now?

**Short answer:** A symlink to a `.dylib` is not enough — re-install
the runtime with `fs_install_mcr R2019b` and add the printed
`DYLD_LIBRARY_PATH` lines to your shell profile.

**Detail:** fsbuild walked through the canonical macOS recipe:

```bash
export FREESURFER_HOME=/Applications/freesurfer/7.3.2
sudo rm -rf "$FREESURFER_HOME/MCRv97"
cd "$FREESURFER_HOME/bin"
sudo FREESURFER_HOME="$FREESURFER_HOME" ./fs_install_mcr R2019b
# Read the DYLD_LIBRARY_PATH lines printed at the end of the install
export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:/.../v97/runtime/maci64:/...
```

Pointing `MCRv97` at a single `.dylib` (a file, not a directory) is the
common mistake — FreeSurfer needs the entire MCR tree. On Linux the
equivalent variable is `LD_LIBRARY_PATH` and the subdirectory is
`glnxa64` instead of `maci64`. This issue applies to every legacy
MATLAB-compiled segmentation script (`segmentThalamicNuclei.sh`,
`segmentHA_T1.sh`, `segmentBS.sh`, `segmentAAN.sh`); FS 8.x's
Python-based `segment_subregions` avoids the requirement entirely.

**Provenance:** Mailing list, 2023-10-03 to 2023-10-04 (Iglesias,
fsbuild). See
`raw/mailing-list/2023-10-segmentthalamicnuclei-mcr-symlink-insufficient-reinstall-dyld.md`.

**Related:** [[recon-all]]

---

## Brainstem subfields

### Can I run `segmentBS.sh` directly on a NIfTI without first running `recon-all`?

**Short answer:** No — at minimum `recon-all -autorecon1` is required
to produce `nu.mgz` and `brain.mgz`. As of December 2023 a
SynthSeg-based standalone brainstem tool was on the roadmap but not yet
released.

**Detail:** Iglesias confirmed the prerequisite explicitly: "you need
to run recon-all. The good news is that you get a ton of additional
useful information on the brains!" The minimum-cost path if you do not
need full surfaces is `recon-all -autorecon1`, which gives you
[[nu.mgz]] (bias-corrected volume) and [[brainmask.mgz]] (skull-stripped
volume); `segmentBS.sh` consumes these. If MCR is missing the script
errors with `ERROR: cannot find Matlab 2014b runtime in location:
$FREESURFER_HOME/MCRv84`; install with
`sudo FREESURFER_HOME=$FREESURFER_HOME ./fs_install_mcr R2014b`
(legacy) or `R2019b` (FS 7.4+).

> [!gap] A SynthSeg-based standalone brainstem segmenter — analogous
> to how [[recon-all-clinical]] uses SynthSeg for whole-brain — was
> announced as a roadmap item in Dec 2023 but its FS 8.2.0 status is
> not confirmed in the archives. Verify before assuming it is missing.

**Provenance:** Mailing list, 2023-12-27 to 2023-12-28 (Iglesias). See
`raw/mailing-list/2023-12-brainstem-segmentation-requires-recon-all-no-standalone-synthseg.md`.

**Related:** [[recon-all]], [[mri_synthseg]], [[recon-all-clinical]]

---

## Hypothalamic subunits

### `mri_segment_hypothalamic_subunits` is killed before it finishes — what are the requirements?

**Short answer:** Roughly 16–24 GB RAM and at least 2 CPU cores. A
plain `Killed` exit means the OS OOM killer struck;
`std::bad_alloc` from a multi-threaded run is the C++-side equivalent.

**Detail:** [[mri_segment_hypothalamic_subunits]] loads a TensorFlow/Keras
model (similar to [[mri_synthseg]] and [[mri_WMHsynthseg]]) and
allocates large activation tensors at inference time. fsbuild stated
the hard floor — "If a Linux machine has less than 16–24 GB total
memory and fewer than 2 CPU cores, then FreeSurfer commands utilizing
TensorFlow and Keras may fail to execute." Diagnose with
`dmesg | grep -i 'killed process'` (looks for `signal 9 oom_kill`).
Workarounds:

- Free RAM by closing other applications.
- Add a generous swap file (slower but avoids hard kill).
- For NextBrain specifically, prefer the `_fast` variant
  (`mri_histo_atlas_segment_fast`) over `_fireants` to reduce memory.
- For [[mri_WMHsynthseg]], the `--crop` flag reduces input size.

The same memory floor applies to NextBrain, [[mri_synthseg]], and
[[mri_WMHsynthseg]].

**Provenance:** Mailing list, 2025-03-11 to 2025-03-12 (fsbuild). See
`raw/mailing-list/2025-03-mri-segment-hypothalamic-subunits-memory-requirements.md`.

**Related:** [[mri_segment_hypothalamic_subunits]], [[mri_synthseg]],
[[mri_WMHsynthseg]]

---

## AAN (brainstem arousal nuclei)

### `segmentAAN.sh` fails on Ubuntu 20.04 with GLIBCXX errors against MCRv84/MCRv97 — how do I fix it?

**Short answer:** The `segmentNuclei` binary shipped with FS 8.0.0 was
built against the older MCRv84 toolchain whose bundled libstdc++ is
too old for the Ubuntu 20.04+ system libraries. Replace the binary
with the MCRv97-compiled version from the FreeSurfer GitHub dev branch.

**Detail:** Huang's fix:

```bash
# Download the MCRv97-compiled segmentNuclei from the FreeSurfer
# GitHub dev branch, then:
cp segmentNuclei_MCRv97 "$FREESURFER_HOME/bin/segmentNuclei"
chmod +x "$FREESURFER_HOME/bin/segmentNuclei"
```

The diagnostic symptom is a runtime error such as
`/usr/local/freesurfer/8.0.0/MCRv84/.../libstdc++.so.6: version 'GLIBCXX_3.4.20'
not found (required by .../bin/mri_robust_register)` during the
registration step that `segmentAAN.sh` invokes. The cascading
consequence is that `imageDump_coregistered.mgz` is never produced and
the MATLAB segmentation aborts. MCRv84 = MATLAB R2018a, MCRv97 = MATLAB
R2019b — the two have incompatible bundled `libstdc++` versions.
Probe other MATLAB-compiled FS binaries for the same problem with:

```bash
"$FREESURFER_HOME/bin/<matlab_binary>" 2>&1 | grep GLIBCXX
```

This issue should not occur on FS 8.2.0 if the binary was rebuilt
against MCRv97 in the release.

**Provenance:** Mailing list, 2025-03-12 to 2025-03-13 (Huang). See
`raw/mailing-list/2025-03-segmentaan-requires-mcrv97-binary-update.md`.

**Related:** [[recon-all]]

---

## NextBrain and ERC Bayesian Segmentation

### Why does `mri_histo_atlas_segment_fireants` print "command not found" on FS 7.4.1 or 8.0.0-beta?

**Short answer:** It was not shipped in those releases — the script
only exists in dev builds and was scheduled for the FS 8.0 stable
release.

**Detail:** Two separate threads (Huang and Iglesias on 2025-01-13;
fsbuild and Iglesias on 2025-01-20) confirmed that
`mri_histo_atlas_segment_fireants` and the supporting Python scripts
(`segment_fast.py`, `segment_fireants.py`) were absent from FS 7.4.1
(June 2023) and from the FS 8.0.0-beta (November 2024). The fix is to
download a development build:

```
https://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/dev/
```

The scripts live under
`mri_histo_util/ERC_bayesian_segmentation/scripts/` in the GitHub
`dev` branch. fsbuild added the standard caveat that subjects in a
study must all be processed with the same FreeSurfer version, OS, and
vendor. As of FS 8.2.0 (the version this wiki targets) the tool is
available — confirm by checking `which mri_histo_atlas_segment_fireants`
in your install. See [[mri_histo_atlas_segment_fireants]] for the tool
reference.

**Provenance:** Mailing list, 2025-01-13 (Huang, Iglesias) and
2025-01-20 to 2025-01-21 (Iglesias, fsbuild). See
`raw/mailing-list/2025-01-mri-histo-atlas-segment-fireants-not-in-8-beta-coming-in-stable.md`
and `raw/mailing-list/2025-01-nextbrain-segment-fireants-not-in-7-4-1-use-dev-build.md`.

**Related:** [[mri_histo_atlas_segment_fireants]]

---

### Even with a dev build, NextBrain complains the atlas is missing — where do I get `atlas_full` / `atlas_simplified`?

**Short answer:** The ERC Bayesian Segmentation atlas tarball is too
large to bundle in *any* installer — stable, dev, Linux, or macOS. You
must download and extract it manually under
`$FREESURFER_HOME/python/packages/ERC_bayesian_segmentation/`.

**Detail:** Two threads (fsbuild, Feb 2025; fsbuild, Mar 2025)
confirmed: "The ERC_bayesian_segmentation files are not included
because of package/size limitations of the installers." The procedure:

```bash
cd "$FREESURFER_HOME/python/packages/ERC_bayesian_segmentation"
# Linux
sudo wget https://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/ERC_bayesian_segmentation/atlas_subdirs_20250217.tgz
# macOS
sudo curl -O https://surfer.nmr.mgh.harvard.edu/pub/dist/freesurfer/ERC_bayesian_segmentation/atlas_subdirs_20250217.tgz
sudo rm -rf atlas_full atlas_simplified
sudo tar zxpf atlas_subdirs_20250217.tgz
sudo rm atlas_subdirs_20250217.tgz
```

The dated tarball name (`atlas_subdirs_20250217.tgz`) changes as the
atlas is revised — check the FreeSurfer pub-dist directory for the
current name, or the wiki's NextBrain page. An older mirror lives at
`https://ftp.nmr.mgh.harvard.edu/.../Histo_Atlas_Iglesias_2023/atlas_simplified.zip`.

> [!gotcha] On Apple Silicon (M1/M2/M3) the FireAnts binary bundled
> with FS 8.0.0 is older than what was used to validate the atlas;
> users hitting FireAnts errors on Mac should download the current
> binary from upstream rather than relying on the bundled version
> (fsbuild, March 2025).

**Provenance:** Mailing list, 2025-02-17 (fsbuild) and 2025-03-09 to
2025-03-11 (fsbuild). See
`raw/mailing-list/2025-02-erc-bayesian-segmentation-atlas-not-in-dev-build-wget-manually.md`
and `raw/mailing-list/2025-03-erc-nextbrain-atlas-not-bundled-manual-download-required.md`.

**Related:** [[mri_histo_atlas_segment_fireants]]

---

### NextBrain crashes ~10% of the time with `CUDA out of memory` on a 32 GB GPU — what do I do?

**Short answer:** Either run the affected subjects on CPU with
`--cpu`, or drop the internal segmentation resolution from
`0.3333333333333333` to `0.4` in the source — and apply whichever
choice you make uniformly to every subject in the study.

**Detail:** Iglesias gave three remediation options:

1. `--cpu` — slower but reliable on memory-constrained subjects.
2. Edit the FreeSurfer source to set the segmentation resolution
   parameter from `0.3333333333333333` to `0.4` and reprocess every
   subject (including those that succeeded at 0.333) so the cohort is
   internally consistent.
3. Use the fast CPU-targeted NextBrain variant
   (`mri_histo_atlas_segment_fast`), which was being merged into the
   dev branch at the time of the message and avoids the OOM issue.

The OOM is subject-specific (head size and image properties dominate
peak memory), so it appears non-deterministically across a cohort —
methodological consistency therefore matters more than always
maximising resolution.

**Provenance:** Mailing list, 2024-11-08 (Iglesias). See
`raw/mailing-list/2024-11-nextbrain-cuda-oom-cpu-flag-or-resolution-adjustment.md`.

**Related:** [[mri_histo_atlas_segment_fireants]]

---

### Does NextBrain produce its own intracranial volume, or do I need to compute one separately?

**Short answer:** NextBrain reports ICV automatically via its SynthSeg
component — and the value is the same as the `sTIV` produced by
standard FS 8 recon-all.

**Detail:** Iglesias confirmed that the intracranial volume from
NextBrain is computed by [[mri_synthseg]] under the hood; Greve added
that this is "the same thing that v8 generates (we just call it
sTIV)". Practical implication: do not run a separate ICV computation
when using NextBrain, and you can safely combine NextBrain ICV with
FS 8 sTIV from non-NextBrain subjects in a mixed cohort. In FS 8 the
SynthSeg-based sTIV replaces the older Talairach-scaling-based eTIV
as the preferred intracranial-volume metric.

**Provenance:** Mailing list, 2025-02-12 to 2025-02-24 (Iglesias,
Greve). See
`raw/mailing-list/2025-02-nextbrain-stiv-icv-via-synthseg-same-as-fs8.md`.

**Related:** [[mri_synthseg]], [[recon-all]]

---
