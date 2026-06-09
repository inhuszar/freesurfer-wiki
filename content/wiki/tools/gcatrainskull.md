---
title: "gcatrainskull"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/gcatrainskull"
families: []                     # GCA-training helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[gcatrain]]"
  - "[[mri_ca_train]]"
  - "[[mri_em_register]]"
  - "[[gca-format]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The exact provenance/accuracy of the reused linear transform talairach.i02.lta for the with-skull atlas is flagged as uncertain in a source comment; the with-skull .gca is consumed by mri_em_register (skull LTA stage) but that hookup is not traced from this script."
tags:
  - atlas
  - training
  - segmentation
  - gca
  - skull
---

# gcatrainskull

## Summary

`gcatrainskull` trains the **with-skull** Gaussian Classifier Atlas
(`gca/gca.skull.i02.gca`) from an atlas-training directory previously prepared by
[[gcatrain]]. It is a thin wrapper around a single [[mri_ca_train]] call: it reuses
each subject's manual segmentation, the iteration-2 linear Talairach transform
(`talairach.i02.lta`), and the **un-skull-stripped** `nu.mgz` to build an atlas
that still contains skull/extra-cranial tissue. That with-skull atlas is what
[[mri_em_register]] uses as its registration target when aligning a new subject's
whole (non-stripped) head to atlas space.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/gcatrainskull`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull)
- **Binary/script location:** `$FREESURFER_HOME/bin/gcatrainskull`
- **Tool it calls:** [`mri_ca_train`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L78-L79) (single invocation).

## Purpose and Context

The standard whole-brain GCA ([[gcatrain]]) is trained on the brain-extracted,
intensity-normalised `norm.iNN.mgz`. But the very first registration step of
[[wiki/pipelines/recon-all|recon-all]] — [[mri_em_register]] — has to align a
*whole head* (skull included, before stripping) to an atlas. That requires an
atlas that itself models skull and extra-cranial tissue. `gcatrainskull` builds
that companion **with-skull atlas** from the same set of manually labelled
subjects, by training [[mri_ca_train]] on `nu.mgz` (which is **not**
skull-stripped) instead of `norm.mgz`.

It is run **after** [[gcatrain]] on the same directory and is **not** part of the
ordinary [[wiki/pipelines/recon-all|recon-all]] stream. This is a focused
single-command script with no atlas parameters of its own beyond what is fixed in
the source.

## Inputs

### Required Inputs

- **`--g gcatraindir`** — a directory previously built by [[gcatrain]] (becomes
  `SUBJECTS_DIR`); it must exist ([`scripts/gcatrainskull:125-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L125-L128)).
  It must contain `scripts/subjectlist.txt` and `scripts/manseg.txt`
  (read at [`scripts/gcatrainskull:72-73`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L72-L73)) and, for each
  subject: the manual segmentation, the non-stripped `nu.mgz`, and the linear
  transform `transforms/talairach.i02.lta`.

### Input Assumptions

> [!assumption] gcatrain has already produced iteration-2 LTAs and nu.mgz
> Each subject is assumed to have an un-skull-stripped `nu.mgz`, the manual
> segmentation named in `manseg.txt`, and the iteration-2 **linear** transform
> `talairach.i02.lta` that [[gcatrain]] produced. `gcatrainskull` consumes these
> directly and registers nothing itself.

## Outputs

### Files Created

| File | Where | Contents |
|------|-------|----------|
| `gca/gca.skull.i02.gca` | `gcadir/gca/` | the **with-skull** Gaussian Classifier Atlas |
| `log/gcatrainskull.Y…log` | `gcadir/log/` | this script's log |

The single declared output is `gca/gca.skull.i02.gca`
([`scripts/gcatrainskull:75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L75)).

### Output Specifications

`gca.skull.i02.gca` is a Gaussian Classifier Atlas in [[gca-format]] built at
**prior spacing 2 mm and node spacing 4 mm** ([`scripts/gcatrainskull:78`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L78)).
Unlike the brain-only atlas, it is trained from `nu.mgz`, so it retains
skull/extra-cranial intensity statistics.

## Mathematical Foundations

None of its own — it is a single [[mri_ca_train]] invocation.

> [!internal] Atlas estimation lives in mri_ca_train
> The GCA model (per-node Gaussian intensity distributions + label priors) and its
> estimation are implemented in [[mri_ca_train]]; see that page and [[gca-format]].
> The only thing `gcatrainskull` changes relative to [[gcatrain]] is the training
> intensity volume (`nu.mgz` rather than `norm.mgz`) and the node spacing.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/gcatrainskull:113-180`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L113-L180)). The script exposes no
atlas-training parameters — the spacings, inputs, and transform are fixed in the
source.

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--g`<br>`--o` | string | *(required)* | The [[gcatrain]] output directory; becomes `SUBJECTS_DIR`. Must already exist. The subject list and manual-seg name are read from its `scripts/` files. |
| `--norun`<br>`--dontrun` | bool | run on | Echo the [[mri_ca_train]] command to the log but do not execute it (dry run). |
| `--done` | file | — | Remove this file at parse time (a done sentinel). Note: unlike the sibling scripts, the body does not write a status code to it (see gotcha). |
| `--log` | string | `gcadir/log/gcatrainskull.Y…log` | Explicit log file. (Note: the `--log` value is overwritten; see gotcha.) |
| `--nolog`<br>`--no-log` | bool | off | Set the log to `/dev/null` (also overwritten; see gotcha). |
| `--tmp`<br>`--tmpdir` | string | auto | Temp directory (also disables cleanup). |
| `--nocleanup` / `--cleanup` | bool | cleanup on | Keep / remove temp files. |
| `--debug` | bool | off | `set echo`/`verbose` tracing. |
| `--help` | bool | — | Print help and exit. |
| `--version` | bool | — | Print version and exit. |

### Configuration Interactions

> [!gotcha] `--log`/`--nolog` are silently overridden
> Whatever you pass to `--log` (or `--nolog`) is discarded: after argument parsing
> the script unconditionally resets the log file to
> `gcadir/log/gcatrainskull.Y$year…log` ([`scripts/gcatrainskull:50`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L50)).
> So the log always lands in `gcadir/log/` with a timestamped name.

> [!gotcha] `--done` is cleared but never written
> `--done` removes the named file during parsing
> ([`scripts/gcatrainskull:131-134`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L131-L134)), but the success and
> `error_exit` paths do **not** write a status code back to it (unlike
> [[gcatrain]]/[[gcainit]]). Do not rely on a done-file to detect completion;
> check for `gca/gca.skull.i02.gca` instead.

## Typical Use Cases

### 1. Build the with-skull atlas (normal use)

```bash
# After gcatrain has finished on all39:
gcatrainskull --g all39
# Produces all39/gca/gca.skull.i02.gca
```

### 2. Dry run to inspect the command

```bash
gcatrainskull --g all39 --norun
# Logs the mri_ca_train command line without running it.
```

## Pipeline Context

`gcatrainskull` is a **post-training** stage that produces the companion with-skull
atlas. It runs after [[gcatrain]] on the same directory and is **not** part of the
per-subject [[wiki/pipelines/recon-all|recon-all]] stream.

**Predecessor:** [[gcatrain]] (produces per-subject `nu.mgz` and
`talairach.i02.lta`) → **gcatrainskull** (`gca.skull.i02.gca`) → **Consumer:**
[[mri_em_register]], which uses a with-skull atlas to align an un-stripped head to
atlas space at the start of [[wiki/pipelines/recon-all|recon-all]].

## Gotchas and Caveats

> [!gotcha] Reuses the iteration-2 linear transform, with a caveat
> Training uses `-xform talairach.i02.lta` for every subject
> ([`scripts/gcatrainskull:78-79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L78-L79)). A source comment warns this
> LTA "might not be best" and suggests checking that it is accurate for all
> subjects ([`scripts/gcatrainskull:68-69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L68-L69)). The skull atlas's
> alignment is therefore inherited from the brain-only training iteration 2.

> [!gotcha] Trains on `nu.mgz`, not `norm.mgz` — by design
> The whole point of this script is to train on the **non-skull-stripped**
> `nu.mgz` so the atlas models skull/extra-cranial tissue
> ([`scripts/gcatrainskull:79`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L79)), in contrast to the brain-only
> atlas trained on `norm.mgz`.

> [!gotcha] A stray log header reads "thalseg"
> The log-initialisation line writes "Log file for thalseg"
> ([`scripts/gcatrainskull:52`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L52)) — a copy-paste leftover; it has no
> functional effect.

## Error Compensation and Guard Rails

- **Directory existence check.** `--g` aborts if the directory does not exist
  ([`scripts/gcatrainskull:125-128`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L125-L128)).
- **Overwrite by re-removal.** The target atlas is `rm -f`'d immediately before
  training ([`scripts/gcatrainskull:82`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L82)), so a re-run rebuilds it.
- **Minimal error handling.** `error_exit` simply prints `ERROR:` and exits 1
  ([`scripts/gcatrainskull:106-109`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L106-L109)); there is no per-subject
  recovery (it is a single command).

## Related Tools

- [[gcatrain]] — produces the directory, the per-subject `nu.mgz`, and the `talairach.i02.lta` that `gcatrainskull` consumes; run it first.
- [[mri_ca_train]] — the atlas-estimation binary this script wraps.
- [[mri_em_register]] — the consumer of the with-skull atlas (whole-head linear registration in recon-all).
- [[gca-format]] — the `.gca` atlas file format produced.

## Confidence and Gaps

**High confidence:** the complete flag set, the single fixed `mri_ca_train`
invocation (training on `nu.mgz` at node spacing 4 with `talairach.i02.lta`), the
`--log`/`--done` quirks, and the output name `gca.skull.i02.gca` — all read
directly from [`scripts/gcatrainskull`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull).

> [!gap] Provenance of the reused LTA and the EM-register hookup
> The source itself flags `talairach.i02.lta` as possibly not optimal for the
> skull atlas. Exactly how/where the resulting `gca.skull.i02.gca` is then loaded
> by [[mri_em_register]] (the skull-LTA stage of recon-all) is not traced from
> this script.

## References

- FreeSurfer source: [`scripts/gcatrainskull`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull) (v8.2.0).
- Built-in help: `gcatrainskull --help` (usage block,
  [`scripts/gcatrainskull:208-216`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/gcatrainskull#L208-L216)).
