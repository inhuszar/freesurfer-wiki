---
title: "train-gcs-atlas"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/train-gcs-atlas"
families: []                     # standalone GCS-atlas training wrapper
recon_all_stage: null
related:
  - "[[mris_ca_train]]"
  - "[[mris_ca_label]]"
  - "[[mri_compute_seg_overlap]]"
  - "[[wiki/tools/build_desikan_killiany_gcs.csh|build_desikan_killiany_gcs.csh]]"
  - "[[parcellation-schemes]]"
  - "[[annotation-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The --sd handler runs `setenv SUBJECTS_DIR = $argv[1]`, which in tcsh sets SUBJECTS_DIR to the literal token '=' rather than the path; --sd appears non-functional."
tags:
  - atlas
  - parcellation
  - cortical
  - surface
  - gcs
---

# train-gcs-atlas

## Summary

`train-gcs-atlas` is a tcsh driver that trains a **surface** cortical
parcellation atlas — a `.gcs` (Gaussian Classifier Surface array) file — by
calling [[mris_ca_train]] on a set of subjects that already carry a *manual*
cortical parcellation. The resulting `.gcs` is the atlas consumed by
[[mris_ca_label]] to automatically parcellate the cortex of new subjects (this
is how `recon-all` produces `?h.aparc.annot`). The script wraps the otherwise
fiddly [[mris_ca_train]] command line, fills in the standard Desikan–Killiany
colour table and icosahedral resolutions, and — uniquely — supports a built-in
**leave-one-out / jack-knife** mode (`--x`, `--jackknife`) that trains an atlas
with one subject excluded, then labels that subject and scores the result with
[[mri_compute_seg_overlap]], so you can measure how well an atlas generalises.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/train-gcs-atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas)
- **Binary/script location:** `$FREESURFER_HOME/bin/train-gcs-atlas`
- **FreeSurfer tools invoked:** [`mris_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L125) (builds the atlas), and — in jack-knife/exclude mode — [`mris_ca_label`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L147-L150) (labels the held-out subject) and [`mri_compute_seg_overlap`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L155) (Dice). Uses `pbsubmit`, `getfullpath`, and `fname2stem`.

## Purpose and Context

FreeSurfer's automatic cortical parcellation ([[mris_ca_label]], yielding
`?h.aparc.annot`) is driven by a trained surface atlas. That atlas encodes, for
every node of a high-resolution icosahedral sphere, a spatial **prior** over
parcellation labels plus per-label Gaussian models of the surface geometry
(curvature/sulc), learned from subjects whose cortex was labelled by hand.
`train-gcs-atlas` is the convenience front-end for building such an atlas: you
point it at a folder of subjects that each have a manual parcellation
(`?h.aparc_edited.annot` by default) and a spherical registration
(`?h.sphere.reg`), and it runs [[mris_ca_train]] to emit the `.gcs`.

It is a **developer / atlas-builder** tool — run by hand when creating or
updating a parcellation atlas for a FreeSurfer release or for a custom labelling
scheme. It is *not* invoked by `recon-all`; rather, the `.gcs` it produces is
later read by `recon-all`'s [[mris_ca_label]] step. The training subjects must
have been processed through `recon-all` at least far enough to have produced
`?h.sphere.reg` ([`scripts/train-gcs-atlas#L482-L494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L482-L494)). It is closely related to
[[wiki/tools/build_desikan_killiany_gcs.csh|build_desikan_killiany_gcs.csh]],
which builds the canonical Desikan–Killiany atlas with a fixed (non-jack-knife)
command line.

> [!gotcha] Two distinct atlas families — do not confuse GCS with GCA
> `train-gcs-atlas` builds a **surface** `.gcs` for cortical *parcellation*
> ([[mris_ca_train]]/[[mris_ca_label]]). It has nothing to do with the
> **volumetric** `.gca` subcortical *segmentation* atlas built by
> [[mri_ca_train]] and applied by [[gca-apply]]. Surface ⇒ `mris_ca_*` ⇒ `.gcs`;
> volume ⇒ `mri_ca_*` ⇒ `.gca`.

## Inputs

### Required Inputs

- **Output `.gcs` path** — `--o` (alias `--gcs`); the directory is created and
  becomes the atlas's output location ([`scripts/train-gcs-atlas#L378-L381`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L378-L381)).
- **A subject list** — one or more `--s <subject>`, and/or `--f <file>` reading
  subjects one per line ([`scripts/train-gcs-atlas#L206-L216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L206-L216)).
- **Hemisphere** — `--lh`, `--rh`, or `--hemi <hemi>`
  ([`scripts/train-gcs-atlas#L386-L389`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L386-L389)).

For **every** subject the script verifies the existence of
`surf/<hemi>.<surfreg>` (default `<hemi>.sphere.reg`) and a manual parcellation
`label/<hemi>.<manparc>.annot` **or** `.mgz` (default `manparc = aparc_edited`),
exiting if any is missing ([`scripts/train-gcs-atlas#L407-L428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L407-L428)).

### Input Assumptions

> [!assumption] Manual parcellation + up-to-date spherical registration
> Each training subject is assumed to have (a) a hand-edited cortical
> parcellation in the `label/` folder, and (b) a spherical registration
> (`?h.sphere.reg`) computed against the **production folding atlas**. The help
> stresses that before building a release atlas you should regenerate
> `sphere`/`sphere.reg` (`recon-all -s subject -sphere -surfreg`) so the
> registration is current, while noting the underlying `white.preaparc` surfaces
> need not be regenerated if they are still accurate
> ([`scripts/train-gcs-atlas#L482-L494`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L482-L494)). If a non-standard registration was used,
> pass it with `--reg`.

- The colour table (`--ctab`, default
  `$FREESURFER_HOME/average/colortable_desikan_killiany.txt`) must enumerate the
  labels present in the manual parcellation.
- Training is fast: the help notes ~5 min for 40 subjects
  ([`scripts/train-gcs-atlas#L497-L498`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L497-L498)).

## Outputs

### Files Created

The output directory is `dirname <gcsfile>` (or the jack-knife directory in
`--jackknife` mode).

| File | Where | Produced by | Contents |
|------|-------|-------------|----------|
| `<gcsfile>` (the `.gcs`) | output dir | [[mris_ca_train]] | the trained surface parcellation atlas ([[parcellation-schemes]]) |
| `log/train-gcs-atlas.log` | output dir | the script | full command + training log |

**In exclude mode (`--x <subject>`)** additional per-subject files are written:

| File | Where | Produced by | Contents |
|------|-------|-------------|----------|
| `<xannotfile>` (default `label/<hemi>.<annotbase>.mgz`) | excluded subject | [[mris_ca_label]] | auto-parcellation of the held-out subject ([[annotation-format]]) |
| `<stem>.dice.dat`, `<stem>.dice.table` | beside `<xannotfile>` | [[mri_compute_seg_overlap]] | Dice overlap of auto vs manual parcellation |
| `scripts/train-gcs-atlas.<hemi>.<annotbase>.log` | excluded subject | the script | labelling/Dice log |

**In `--jackknife <dir>` mode** the script does not train directly; instead it
re-submits itself once per subject (via `pbsubmit`) with that subject excluded,
writing `<dir>/<hemi>.<annotbase>.x-<subj>.gcs`, `…x-<subj>.mgz`, and matching
logs ([`scripts/train-gcs-atlas#L82-L95`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L82-L95)).

### Output Specifications

The `.gcs` is a binary surface-classifier array indexed by the icosahedral nodes
selected with `--ico-prior` / `--ico-likelihood`. The labelled outputs are
surface annotations (one label per vertex) in the colour table's label space.

## Mathematical Foundations

`train-gcs-atlas` performs **no computation itself** — it assembles and runs a
single [[mris_ca_train]] command ([`scripts/train-gcs-atlas#L125`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L125)):

```
mris_ca_train -ic <icoprior> <icolikelihood> [-debug-vertex V] \
  [-nfill N | -no-fill] -t <ctab> <hemi> <surfreg> <manparc> <subjects> <gcsfile>
```

> [!internal] The classifier maths live in `mris_ca_train`
> [[mris_ca_train]] estimates, per icosahedral node, a categorical **prior**
> $p(\ell\mid x)$ over labels and per-label **Gaussian likelihoods** of the
> surface geometry (curvature and sulcal depth). [[mris_ca_label]] then assigns
> each vertex the MAP label
> $\hat\ell(x)=\arg\max_\ell p(\text{geom}(x)\mid\ell)\,p(\ell\mid x)$, optionally
> regularised by a Markov neighbourhood term. The mathematics, and the meaning of
> the prior/likelihood icosahedral resolutions, are documented on
> [[mris_ca_train]] and [[mris_ca_label]].

The only numerical knobs the wrapper exposes map directly onto
[[mris_ca_train]] options: `--ico-prior`→`icno_priors` (default ico order **7**,
the high-resolution prior grid) and `--ico-likelihood`→`icno_classifiers`
(default ico order **4**, the coarser likelihood grid), confirmed against the
`mris_ca_train` `-IC <priors> <classifiers>` handler in
[`mris_ca_train/mris_ca_train.cpp:327-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_train/mris_ca_train.cpp#L327-L335). `--nfill N` controls the number of
label-dilation iterations onto neighbouring vertices (`--nfill 0` becomes
`-no-fill`, [`scripts/train-gcs-atlas#L314-L319`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L314-L319)).

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/train-gcs-atlas#L192-L370`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L192-L370)). Boolean flags take no argument.

#### Core inputs / outputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--o`<br>`--gcs` | string | *(required)* | Output `.gcs` atlas path; its parent directory is created and used as the output dir. |
| `--s` | string (repeatable) | — | Add one training subject. |
| `--f` | string | — | Read additional subjects from a file (one per line). |
| `--lh` / `--rh` | bool | *(required)* | Set hemisphere to `lh` / `rh`. |
| `--hemi` | string | — | Set hemisphere explicitly. |
| `--man`<br>`--src` | string | `aparc_edited` | Base name of the manual parcellation (`label/<hemi>.<man>.annot`/`.mgz`, no hemi/extension). |
| `--ctab` | string | `…/average/colortable_desikan_killiany.txt` | Colour table passed to `mris_ca_train -t`. |
| `--reg` | string | `sphere.reg` | Spherical registration surface (`surf/<hemi>.<reg>`). |
| `--base` | string | derived from `<gcsfile>` | Stem used to name the auto-annotation / log in exclude mode. |

#### Classifier resolution / dilation

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ico-prior` | int | `7` | Icosahedron order for the label **prior** grid (`mris_ca_train -ic` first value). |
| `--ico-likelihood` | int | `4` | Icosahedron order for the geometry **likelihood** grid (`mris_ca_train -ic` second value). |
| `--nfill` | int | — | Dilate the atlas labels onto `N` rings of neighbouring vertices; `--nfill 0` ⇒ `-no-fill`. |
| `--debug-vertex`<br>`-debug-vertex` | int | — | Pass `-debug-vertex V` to [[mris_ca_train]] for diagnostics at one vertex. |

#### Validation (exclude / jack-knife)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--x` | string | — | Exclude this subject from training, then label it and compute Dice vs its manual parc. Must be in the subject list. |
| `--jackknife` | string (dir) | off | Leave-one-out: submit one `--x` job per subject into this directory via `pbsubmit`, then exit. |
| `--no-jackknife` | bool | — | Turn jack-knife off (used internally when re-submitting). |
| `--xannot` | string | `label/<hemi>.<annotbase>.mgz` | Output path for the held-out subject's auto-annotation (exclude mode). |
| `--aseg` | string | `aseg.auto.mgz` | aseg passed to [[mris_ca_label]] when labelling the held-out subject. |
| `--no-aseg` | bool | — | Do not pass an aseg to [[mris_ca_label]]. |
| `--mask` | string | `cortex` | Cortex mask label (`label/<hemi>.<mask>.label`) for [[mris_ca_label]] in exclude mode. |
| `--no-mask` | bool | — | Do not pass a mask label. |

#### Housekeeping

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--sd` | string | `$SUBJECTS_DIR` | **Intended** to set the subjects dir — but broken (see gotcha). |
| `--log` | string | `<outdir>/log/train-gcs-atlas.log` | Explicit log path. |
| `--nolog`<br>`--no-log` | bool | off | Send log to `/dev/null`. |
| `--tmp`<br>`--tmpdir` | string | — | Set a temp dir; disables cleanup (cleanup is a no-op). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Toggle temp cleanup (commented out). |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--sd` is broken in v8.2.0
> The handler is `setenv SUBJECTS_DIR = $argv[1]`
> ([`scripts/train-gcs-atlas#L294-L297`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L294-L297)). In tcsh, `setenv` takes
> `NAME value` with **no** `=`, so this sets `SUBJECTS_DIR` to the literal string
> `=` and discards the path. Set `SUBJECTS_DIR` in your environment **before**
> calling the script instead of relying on `--sd`.

> [!gotcha] `--jackknife` and `--x` are mutually exclusive
> Specifying both is a hard error ("cannot have --jackknife and --x",
> [`scripts/train-gcs-atlas#L400-L403`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L400-L403)). `--jackknife` is the *batch* form that
> internally launches one `--x` job per subject.

> [!gotcha] `--jackknife` requires a cluster (`pbsubmit`)
> Jack-knife mode submits jobs with `pbsubmit`
> ([`scripts/train-gcs-atlas#L91`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L91)) and then exits without waiting. On a machine
> without a PBS/`pbsubmit` queue it will not run the training directly. For a
> single-machine run, loop over `--x` yourself.

> [!gotcha] `--aseg` / `--mask` only matter in exclude/jack-knife mode
> These options feed the [[mris_ca_label]] command that labels a *held-out*
> subject; they have no effect on a plain training-only run (which never calls
> `mris_ca_label`). The help labels them "for jackknife only"
> ([`scripts/train-gcs-atlas#L461-L465`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L461-L465)).

- The excluded subject (`--x`) is removed from the training list passed to
  [[mris_ca_train]] but must still be present in the supplied subject list, or the
  script errors ([`scripts/train-gcs-atlas#L396-L433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L396-L433)).
- `--threads` is **not** available (the case is commented out,
  [`scripts/train-gcs-atlas#L357-L361`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L357-L361)); the run is fixed to `OMP_NUM_THREADS=1`
  ([`scripts/train-gcs-atlas#L124`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L124)), which the comment notes is fine because the
  job is fast.

## Typical Use Cases

### 1. Train a left-hemisphere parcellation atlas from 40 subjects

```bash
train-gcs-atlas --f subjects.txt --lh \
  --man aparc_edited \
  --o /atlases/lh.DKaparc.acfb40.2026.gcs
```

### 2. Train, then leave-one-out test a single subject

```bash
train-gcs-atlas --f subjects.txt --lh \
  --x vc700 \
  --o /atlases/lh.DKaparc.test.gcs
# → also labels vc700 and writes lh.<base>.dice.dat / .dice.table
```

### 3. Full jack-knife sweep on a cluster

```bash
train-gcs-atlas --f subjects.txt --lh \
  --jackknife /atlases/jackknife.lh \
  --o /atlases/lh.DKaparc.gcs
# submits one held-out job per subject via pbsubmit, then exits
```

### 4. A custom non-aparc scheme (from the help)

```bash
foreach ic (5 6)
  train-gcs-atlas --ico-likelihood $ic --jackknife jackknife.ll$ic \
    --reg entoavg.sym.i03.sphere.reg --nfill 0 --no-mask --no-aseg \
    --ctab ../entosf.lh.ctab --man entosf.dng --f train.subjects.txt --lh \
    --o auto.entosf.dng
end
```

## Pipeline Context

`train-gcs-atlas` is a stand-alone **atlas-builder** tool. It is **not** part of
[[wiki/pipelines/recon-all|recon-all]]; instead it produces the `.gcs` that
`recon-all`'s [[mris_ca_label]] step later reads to create `?h.aparc.annot`.

**Predecessors:** [[wiki/pipelines/recon-all|recon-all]] on the training subjects
(through `?h.sphere.reg`) + a manual `?h.aparc_edited.annot` → **train-gcs-atlas**
(→ [[mris_ca_train]]) → **Successor:** [[mris_ca_label]] on new subjects (inside
or outside `recon-all`), using the new `.gcs`.

The help spells out the apply command
([`scripts/train-gcs-atlas#L501-L509`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L501-L509)):

```bash
mris_ca_label -l label/$hemi.cortex.label -aseg mri/aseg.presurf.mgz -seed 1234 \
  $subject $hemi surf/$hemi.sphere.reg $CPAtlas $hemi.your.annot
```

It overlaps in purpose with
[[wiki/tools/build_desikan_killiany_gcs.csh|build_desikan_killiany_gcs.csh]],
which builds the canonical Desikan–Killiany `.gcs` with a fixed
[[mris_ca_train]] line and no jack-knife support.

## Gotchas and Caveats

> [!gotcha] Exclude mode applies the *just-trained* atlas to the *excluded*
> subject
> In `--x` mode the script trains on N−1 subjects and then runs [[mris_ca_label]]
> with `-seed 1234` on the held-out subject, comparing the result to that
> subject's manual parc via Dice. The fixed RNG seed is deliberate ("seed
> matters", [`scripts/train-gcs-atlas#L146-L147`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L146-L147)) so results are reproducible.

> [!gotcha] Duplicate `--no-aseg` cases
> `--no-aseg` is implemented three times in the switch
> ([`scripts/train-gcs-atlas#L229-L239`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L229-L239)); they are identical and harmless, but
> only the first is reachable.

## Error Compensation and Guard Rails

- **Per-subject input validation.** Before training, every subject is checked for
  `surf/<hemi>.<surfreg>` and a manual parc (`.annot` or `.mgz`); a missing file
  aborts the run ([`scripts/train-gcs-atlas#L407-L428`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L407-L428)).
- **Exclude-subject sanity check.** If `--x` names a subject not in the list, the
  script exits with "cannot find exclude subject … in subject list"
  ([`scripts/train-gcs-atlas#L430-L433`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L430-L433)).
- **Fail-fast.** After [[mris_ca_train]], [[mris_ca_label]], and
  [[mri_compute_seg_overlap]] the script checks `$status` and jumps to
  `error_exit` on failure ([`scripts/train-gcs-atlas#L128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L128), [`scripts/train-gcs-atlas#L153`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L153), [`scripts/train-gcs-atlas#L159`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L159)).

## Known Bugs

- [[00151]] — `setenv SUBJECTS_DIR = $argv[1]` in the `--sd` handler is invalid tcsh (`setenv` takes no `=`): aborts with "Too many arguments" and drops the subjects directory.

## Related Tools

- [[mris_ca_train]] — the binary that actually builds the `.gcs`; this script is its wrapper.
- [[mris_ca_label]] — applies the `.gcs` to parcellate a new subject's cortex (and is called here in exclude mode).
- [[mri_compute_seg_overlap]] — computes the Dice score between auto and manual parcellations in exclude mode.
- [[wiki/tools/build_desikan_killiany_gcs.csh|build_desikan_killiany_gcs.csh]] — fixed-recipe builder for the canonical Desikan–Killiany `.gcs`.
- [[parcellation-schemes]] — the label schemes (aparc / Desikan–Killiany, etc.) these atlases encode.
- [[wiki/pipelines/recon-all|recon-all]] — consumes the resulting `.gcs` via its `mris_ca_label` step.

## Confidence and Gaps

**High confidence:** the full flag set and defaults, the single
[[mris_ca_train]] command and its argument mapping (including the `-ic
prior likelihood` order verified against the binary), the exclude/jack-knife
control flow, the per-subject input checks, and the fixed `-seed 1234` apply step
— all read directly from
[`scripts/train-gcs-atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas).

> [!gap] `--sd` non-functional
> The `setenv SUBJECTS_DIR = …` bug means `--sd` does not set the subjects
> directory. Verified by inspection of the source; set `SUBJECTS_DIR` in the
> environment instead.

## References

- FreeSurfer source: [`scripts/train-gcs-atlas`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas) (v8.2.0).
- Built-in help: `train-gcs-atlas --help` (the `BEGINHELP` block, [`scripts/train-gcs-atlas#L480-L527`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/train-gcs-atlas#L480-L527)).
- `mris_ca_train -IC` handler: [`mris_ca_train/mris_ca_train.cpp:327-335`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/mris_ca_train/mris_ca_train.cpp#L327-L335).
- Fischl B. et al., *Automatically parcellating the human cerebral cortex*, Cerebral Cortex 14(1):11–22, 2004 — the surface GCS parcellation method.
