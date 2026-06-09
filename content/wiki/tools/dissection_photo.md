---
title: "dissection_photo"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "dissection_photo/dissection_photo/main.cpp"
  - "dissection_photo/dissection_photo/MainWindow.cpp"
  - "dissection_photo/dissection_photo/dissection_photo_gui.sh"
families: []
recon_all_stage: null
related:
  - "[[histo_register_block]]"
  - "[[histo_synthesize]]"
  - "[[oct_register_mosaic]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[wiki/tools/samseg|samseg]]"
status: draft
confidence: medium
last_agent_update: 2026-06-09
gaps:
  - "GUI tool with no command-line interface: the binary takes only standard Qt arguments and shows a window. The actual image processing is delegated to bundled fspython scripts and nnU-Net; this page documents the orchestration, not Qt internals."
  - "The companion Python scripts (func_retrospective_correction.py, func_fiducials_*.py, func_mask_to_cc.py) and the nnU-Net segmentation are themselves substantial and are summarised here only at the level needed to understand the pipeline; they are not separately documented yet."
  - "nnU-Net model files are an external download (FTP); the page records the documented setup but the model itself was not exercised."
tags:
  - dissection
  - photography
  - gui
  - calibration
  - segmentation
  - nnunet
  - ex-vivo
---

# dissection_photo

## Summary

`dissection_photo` is an interactive **Qt GUI application** for turning
photographs of dissected brain slabs into pixel-calibrated, segmented inputs for
*ex vivo* reconstruction. It walks the user through four stages — **pixel-size
correction** (retrospective ruler-based or fiducial-calibrated), **tissue
segmentation** (via a bundled nnU-Net model), **manual mask editing**, and
**connected-component splitting** of touching slices — by driving a set of
bundled `fspython` scripts and an nnU-Net inference script behind a guided
wizard. It has **no command-line interface** of its own: the executable simply
opens a window. It belongs to the FreeSurfer *ex vivo* / photo-reconstruction
family alongside [[histo_register_block]], [[histo_synthesize]], and
[[oct_register_mosaic]], and is not part of
[[wiki/pipelines/recon-all|recon-all]].

## Source Information

- **Language:** C++ with Qt (Qt 5 or Qt 6 Widgets); orchestrated Python via `fspython`
- **Entry point:** [`dissection_photo/dissection_photo/main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/main.cpp) — a 11-line `QApplication`
  that constructs and shows `MainWindow`
- **Main logic:** [`dissection_photo/dissection_photo/MainWindow.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp)
- **Launcher script:** [`dissection_photo/dissection_photo/dissection_photo_gui.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/dissection_photo_gui.sh)
- **Bundled Python (resource-embedded):** `func_retrospective_correction.py`,
  `func_fiducials_detection.py`, `func_fiducials_calibration.py`,
  `func_fiducials_correction.py`, `func_mask_to_cc.py`, plus `registration.py`
  (under [`dissection_photo/py_scripts/`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/py_scripts))
- **Binary/script location:** `$FREESURFER_HOME/bin/dissection_photo` (the GUI) and
  `$FREESURFER_HOME/bin/dissection_photo_gui.sh` (the recommended launcher)
- **Build:** only built when CMake `BUILD_GUIS` is on
  ([`dissection_photo/dissection_photo/CMakeLists.txt`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/CMakeLists.txt)); links Qt Widgets and the
  in-tree `MaskProcessor`/`cnpy`/`exif` helpers. (The sibling subdirectories
  `retrospective_correction/`, `fiducials_calibration/`, `fiducials_correction/`,
  `mask_extraction/`, `connected_components/`, and `nnUNet/` build the helper
  binaries/scripts; this page documents the `dissection_photo` wizard that ties
  them together.)

> [!contradiction] No CLI despite the family of command-line siblings
> Unlike its `histo_*`/`oct_*` siblings, `dissection_photo` is a windowed
> application. `main()` only forwards `argc/argv` to `QApplication` and calls
> `w.show()` ([`main.cpp:5-11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/main.cpp#L5-L11)); there is no argument parser. Running it with
> `--help` is interpreted as a Qt argument and the program just opens its window
> (this is why a `--help` capture hangs). All configuration is via the GUI and
> environment variables, not flags.

## Purpose and Context

When brain tissue is sectioned by hand and photographed (e.g. on a copy stand
with a ruler in frame), the photographs are uncalibrated: pixel spacing is
unknown, perspective is uncorrected, and multiple slabs often appear in one
image. Before such photos can be reconstructed into a 3-D volume (or fed to
tools like [[wiki/tools/samseg|samseg]] / surface pipelines), they must be (1) rectified to a known
mm-per-pixel scale, (2) segmented into tissue vs. background, and (3) split into
one mask per physical slice. `dissection_photo` provides a guided, human-in-the-loop
workflow for exactly these steps, combining automatic methods (perspective
correction, deep-learning segmentation) with manual review and correction.

The application is the **front end** of a small pipeline: the heavy lifting is
done by `fspython` scripts and an nnU-Net model that the GUI launches as
subprocesses, watches, and stitches together. It is a sibling of the histology
tools in the same source area but addresses gross dissection photography rather
than microscopy. No `recon-all` stage or in-tree shell script calls it (verified
by `grep` over `scripts/`); it is launched directly by the user.

## Inputs

### Required Inputs (selected in the GUI)

- **Input folder** of dissection photographs (any `QImage`-readable format; JPEG
  with EXIF is handled via the bundled `exif` reader). Chosen on the start page
  and stored as `CurrentFolder/Input` ([`MainWindow.cpp:250-272`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L250-L272)).
- **Output folder** for the pixel-corrected images (`CurrentFolder/Output`).
- **Calibration file** *(optional)* — a `.npz` produced by a fiducial-board
  calibration. If supplied, the app runs in **Calibrated Mode** (fiducial
  detection + correction); if omitted, it runs in **Retrospective Mode** (the
  user clicks ruler/rectangle points on each image)
  ([`MainWindow.cpp:279-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L279-L281)).

### Environment Inputs

The launcher [`dissection_photo_gui.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/dissection_photo_gui.sh) checks and, if needed, sets:

| Variable | Purpose | Default set by launcher |
|----------|---------|--------------------------|
| `FREESURFER_HOME` | must exist or the launcher aborts | — (required) |
| `NNUNET_MODEL_DIR` | directory of the segmentation model (`nnUNetTrainer__nnUNetPlans__2d`, must contain `plans.json`) | `$FREESURFER_HOME_FSPYTHON/models/nnUNetTrainer__nnUNetPlans__2d` |
| `NNUNET_SCRIPT_DIR` | directory of the `nnUNet_v2` Python package | `$FREESURFER_HOME_FSPYTHON/python/packages/nnUNet_v2` |

`MainWindow` reads `NNUNET_MODEL_DIR`/`NNUNET_SCRIPT_DIR` from the environment at
startup ([`MainWindow.cpp:309-316`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L309-L316)) and warns (in debug output) if they are
unset. The Python interpreter is `fspython` (the `PY_COMMAND` macro,
[`CommonDef.h`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/CommonDef.h)).

> [!assumption] The nnU-Net 2-D model must be downloaded and configured
> Segmentation requires the model files referenced by `NNUNET_MODEL_DIR`. If
> `plans.json` is missing, the launcher prints download/unpack/configure
> instructions (FTP tarball `nnUNetTrainer__nnUNetPlans__2d.tar.gz`) and exits
> ([`dissection_photo_gui.sh:24-45`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/dissection_photo_gui.sh#L24-L45)). Without it you can still do the
> correction and manual-editing stages, but automatic mask generation will fail.

## Outputs

### Files Created

| File / location | Produced by | Contents |
|-----------------|-------------|----------|
| Pixel-corrected images in the **output folder** | `func_retrospective_correction.py` (Retrospective Mode) or `func_fiducials_correction.py` (Calibrated Mode) | perspective-rectified, mm-calibrated copies of each input photo ([`MainWindow.cpp:578-585`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L578-L585), [`:685-690`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L685-L690)) |
| `*.png` masks in the **mask folder** | nnU-Net inference (`process_directory_no_upsample.py`) converted from `*.npz` to PNG | binary tissue masks, one per corrected image ([`MainWindow.cpp:806-810`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L806-L810)) |
| `*_mask.npy` in the **final output folder** | `MaskProcessor::SaveToNpy` after CC editing | per-image labelled mask with each physical slice as a distinct component ([`MainWindow.cpp:778-780`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L778-L780)) |
| Temporary `*.npz`, `tmp_in_*/`, `tmp_out_*/` in a `QTemporaryDir` | nnU-Net / `func_mask_to_cc.py` | intermediate probability arrays and connected-component data (auto-cleaned) |

### Output Specifications

The corrected images are written at a known mm-per-pixel scale derived from the
ruler/rectangle dimensions the user enters (width/height in mm) or from the
calibration board. Masks are binary PNGs (tissue = white) thresholded at
probability ≥ 0.5 during the `.npz`→image conversion
([`MainWindow.cpp:862-866`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L862-L866)). The final `.npy` masks carry integer slice labels
suitable for downstream per-slice reconstruction.

## Mathematical Foundations

The GUI itself implements little maths; it sequences external steps. The
quantitatively meaningful operations live in the bundled scripts and the model:

- **Perspective / pixel-size correction.** The user marks 2 points (a ruler) or
  3–4 points (a rectangle of known mm width/height); the script computes a
  homography/affine that maps those points to a metric rectangle and resamples
  the photo to a fixed mm-per-pixel scale (`func_retrospective_correction.py`,
  invoked with `--points x0 y0 x1 y1 …`, `--width`, `--height`,
  [`MainWindow.cpp:575-585`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L575-L585)). In Calibrated Mode the same rectification is
  driven by detected fiducial corners and a stored calibration `.npz`.
- **Tissue segmentation.** A 2-D nnU-Net produces per-pixel tissue probabilities;
  the GUI thresholds the `"probabilities"` channel of the returned `.npz` at 0.5
  to form the binary mask ([`MainWindow.cpp:844-866`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L844-L866)).
- **Connected-component slice splitting.** `MaskProcessor` (from
  `connected_components/`) takes user rectangle selections and assigns each
  touching slice a distinct component label, which the user reviews and saves
  ([`MainWindow.cpp:757-783`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L757-L783)).

> [!internal] Helper modules do the pixel maths
> The homography fitting, segmentation, and connected-component logic are in the
> bundled `fspython` scripts and the compiled `MaskProcessor`/`cnpy`/`exif`
> helpers, not in `MainWindow`. `cnpy` reads the nnU-Net `.npz` arrays; `exif`
> recovers orientation/metadata from JPEGs.

## Configuration Options

### Complete "Flag" Reference

`dissection_photo` has **no application-specific command-line options.** The only
arguments it consumes are those Qt itself recognises (e.g. `-platform`,
`-style`), passed straight to `QApplication`
([`main.cpp:7`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/main.cpp#L7)). All user choices are made interactively. Configuration is
therefore through the environment and the GUI:

| "Option" | Where | Effect |
|----------|-------|--------|
| Input / Output / Calibration paths | start page text fields | choose the photo set, the corrected-output folder, and (optionally) the calibration file; presence of a calibration file selects Calibrated vs. Retrospective mode |
| 2 / 3 / 4-point mode | radio buttons on the correction page | number of clicked points: 2 = ruler (width only), 3–4 = rectangle (width + height) ([`MainWindow.cpp:297-307`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L297-L307)) |
| Ruler/rectangle width & height (mm) | line edits | metric scale used by the correction script |
| Mask opacity / toggle | slider + `actionToggleMask` | overlay display only |
| `NNUNET_MODEL_DIR`, `NNUNET_SCRIPT_DIR`, `FREESURFER_HOME` | environment (see launcher) | locate the segmentation model, the nnU-Net package, and the install |

### Configuration Interactions

> [!gotcha] Calibration file presence silently switches modes
> Supplying a calibration file puts the app in **Calibrated Mode** (automatic
> fiducial detection + correction); leaving it blank puts it in **Retrospective
> Mode** (manual point clicking). There is no explicit mode toggle — the title
> label just changes to reflect the chosen mode
> ([`MainWindow.cpp:279-281`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L279-L281)).

- **Existing outputs are detected and re-use is offered.** If the output folder
  already has as many files as the input, the app offers to skip straight to
  segmentation; if masks already exist, it offers to load them instead of re-running
  nnU-Net; if final CC outputs exist, it offers to overwrite
  ([`MainWindow.cpp:288-294`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L288-L294), [`:194-205`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L194-L205), [`:138-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L138-L149)).
- **Segmentation requires the model**; without a valid `NNUNET_MODEL_DIR` the
  launcher aborts before the GUI starts.
- **The pipeline is sequential and gated**: "Go to Segmentation" is enabled only
  once every input image has a corrected output; "Create Mask"/CC steps unlock
  only when masks exist for all images ([`UpdateIndex`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L390-L415)).

## Typical Use Cases

### Use Case 1: Launch the wizard (recommended)

```bash
# The launcher checks FREESURFER_HOME and sets nnU-Net paths if unset.
dissection_photo_gui.sh
```

### Use Case 2: Launch the binary directly

```bash
# Only if NNUNET_MODEL_DIR / NNUNET_SCRIPT_DIR are already exported.
dissection_photo
```

### Use Case 3: Retrospective (no calibration board) workflow

1. Start the app; set **Input** = folder of slab photos, **Output** = corrected
   folder, leave **Calibration** blank (→ Retrospective Mode).
2. On each photo, pick 2 points along a ruler (or a 3–4-point rectangle), enter
   the known mm width/height, and click **Process** to write a calibrated copy.
3. Click **Go to Segmentation**, point the app at a mask folder; nnU-Net
   generates masks (or load existing ones).
4. Edit masks by hand, then split touching slices into connected components and
   save the per-slice `.npy` masks.

### Use Case 4: Calibrated (fiducial board) workflow

Provide a calibration `.npz`; the app auto-detects fiducial corners per image
(`func_fiducials_detection.py`) and applies `func_fiducials_correction.py`,
otherwise proceeding as above.

## Pipeline Context

`dissection_photo` is a **standalone, user-launched GUI**; no `recon-all` stage
or in-tree script invokes it. It sits at the very front of an *ex vivo*
photo-reconstruction workflow: raw dissection photographs in, calibrated +
segmented + slice-labelled masks out, which then feed downstream 3-D
reconstruction / analysis (e.g. building a photo volume for surface or
[[wiki/tools/samseg|samseg]]-style processing).

**Predecessor:** dissection photography (copy stand, ruler or fiducial board) →
**dissection_photo** → **Successor:** 3-D photo reconstruction / segmentation
(external; the bundled `registration.py` and per-slice masks are the hand-off).

Internally it orchestrates: `func_fiducials_detection.py` →
`func_fiducials_calibration.py`/`func_retrospective_correction.py` →
`func_fiducials_correction.py` → nnU-Net (`process_directory_no_upsample.py`) →
`func_mask_to_cc.py` + `MaskProcessor`, each run as an `fspython` subprocess and
monitored via `QProcess`/`QFileSystemWatcher`.

## Gotchas and Caveats

> [!gotcha] It is a GUI — there are no flags and no batch mode
> Everything is interactive. There is no documented way to run the full pipeline
> headless from `dissection_photo` itself; for scripting you would call the
> underlying `fspython` scripts in `dissection_photo/py_scripts/` directly.

> [!gotcha] Requires a working `fspython` and (for segmentation) a GPU-capable model
> The GUI shells out to `fspython` for every processing step; `func_mask_extraction.py`
> (the SAM-based alternative under `py_scripts/`) defaults to `--device cuda`. The
> nnU-Net 2-D model must be downloaded separately and configured via
> `NNUNET_MODEL_DIR`.

> [!gotcha] State is remembered between sessions via QSettings
> Input/Output/Calibration folders and window geometry are persisted with
> `QSettings` ([`MainWindow.cpp:31-57`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L31-L57), [`:75-86`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L75-L86)). A new session
> pre-fills the last-used paths, which can be surprising if you intend a fresh run.

> [!gotcha] Subprocess failures surface only as dialogs / debug output
> If a Python step fails to start or crashes, the app shows a generic error and
> writes details to Qt debug output ([`OnProcessError`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L590-L616)); run from a terminal
> to see the underlying script messages.

## Error Compensation and Guard Rails

- **Existing-output detection** offers to reuse or overwrite rather than silently
  clobbering or duplicating work (correction, masks, and CC stages each check).
- **Launcher pre-flight.** `dissection_photo_gui.sh` verifies `FREESURFER_HOME`
  and the nnU-Net model before starting the GUI, with explicit remediation
  instructions if the model is missing.
- **Input validation.** The start page refuses to proceed if the input or output
  directory is unset or missing ([`MainWindow.cpp:256-271`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L256-L271)).
- **Stepwise gating.** Buttons for later stages stay disabled until the
  prerequisite outputs exist for every image, preventing out-of-order runs.
- **Incremental masking.** Masks are converted and shown as soon as each nnU-Net
  result lands (file watcher), so the user can start editing while the rest
  generate ([`OnFileChanged`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp#L793-L834)).

## Related Tools

- [[histo_register_block]] — registers histology sections to block-face images;
  same *ex vivo* source area, but a microscopy (not gross-photo) stage.
- [[histo_synthesize]] — MRI→histology appearance synthesis; sibling research tool.
- [[oct_register_mosaic]] — optical-microscopy tile mosaicking; sibling research tool.
- [[wiki/tools/mri_convert|mri_convert]] — to bring corrected photos / masks into
  FreeSurfer volume formats for downstream reconstruction.
- [[wiki/tools/samseg|samseg]] — a possible downstream segmenter once photos are reconstructed into
  a volume.

## Confidence and Gaps

**High confidence:** that `dissection_photo` is a Qt GUI with no CLI, the launcher's
environment checks and nnU-Net setup, the four-stage workflow
(correction → segmentation → mask editing → connected-component splitting), the
Retrospective/Calibrated mode switch, the set of orchestrated `fspython` scripts
and their `--in_*/--out_*/--points/--width/--height` arguments, and the
output files — all read from
[`main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/main.cpp), [`MainWindow.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp), [`dissection_photo_gui.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/dissection_photo_gui.sh),
and the `py_scripts/` argument parsers.

> [!gap] Internals of the Python steps and the nnU-Net model
> The rectification homography, the fiducial-detection algorithm, and the nnU-Net
> training/inference details live in the bundled scripts and the external model;
> they are summarised here only enough to follow the pipeline and are not yet
> documented on their own pages.

> [!gap] Headless / batch use
> Whether the full pipeline can be reproduced non-interactively (and the exact
> expected directory layout for doing so) is not specified by the GUI; it would
> require driving the `py_scripts/` directly, which has not been validated here.

## References

- FreeSurfer source: [`dissection_photo/dissection_photo/`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo)
  ([`main.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/main.cpp), [`MainWindow.cpp`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/MainWindow.cpp)) and
  [`dissection_photo/py_scripts/`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/py_scripts) (v8.2.0).
- Launcher: [`dissection_photo/dissection_photo/dissection_photo_gui.sh`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/dissection_photo/dissection_photo/dissection_photo_gui.sh).
- Segmentation backbone: nnU-Net v2 (model `nnUNetTrainer__nnUNetPlans__2d`,
  distributed via the LCN FTP server); SAM-based `func_mask_extraction.py` is an
  alternative segmenter in `py_scripts/`.
