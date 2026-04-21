---
title: "mri_diff"
type: tool
fs_version: "8.2.0"
source_language: "C++"
source_files:
  - "mri_diff/mri_diff.cpp"
families:
  - "mri_*"
recon_all_stage: null
related:
  - "[[mri_compute_overlap]]"
  - "[[mri_info]]"
  - "[[mgz]]"
status: draft
confidence: high
last_agent_update: 2026-04-15
gaps: []
tags:
  - comparison
  - quality-assurance
  - testing
  - diff
---

# mri_diff

## Summary

`mri_diff` determines whether two MRI volumes differ and in what way. It checks up to eight categories of difference — dimensions, resolution, acquisition parameters, geometry, precision, pixel data, 3D morphs, and color tables — and returns a distinct exit code for each category. Results are printed to stdout, and differences can optionally be saved to a log file or as a difference volume.

## Source Information

- **Language:** C++
- **Source file:** `mri_diff/mri_diff.cpp`
- **Original author:** Doug Greve

## Purpose and Context

`mri_diff` is the MRI equivalent of the Unix `diff` command. It is used for:
- Regression testing (checking that processing outputs haven't changed)
- Quality assurance (ensuring two versions of a pipeline produce identical results)
- Debugging (diagnosing where two volumes differ and by how much)
- Cross-scanner QA (`--qa` mode checks acquisition consistency without pixel comparison)

A key feature is the distinct exit status per difference type, allowing scripts to detect specifically what kind of difference was found.

## Inputs

- **`vol1`**: first volume (any `MRIread`-compatible format)
- **`vol2`**: second volume
- Optionally: `--surf vol1 vol2` for surface-based comparison

## Outputs

- **stdout**: description of differences found (or "volumes do not differ")
- **Exit status**: 0 = no difference; 1 = error; 101–107 = specific differences; 201–202 = morph/color table differences
- **`--log logfile`**: if provided and a difference is found, writes details to `logfile` (file is deleted if no difference)
- **`--diff diffvol`**: outputs the voxel-by-voxel difference image $|V_1 - V_2|$
- **`--diffabs`** / **`--pct`**: absolute or percentage difference volume

## Mathematical Foundations

**Pixel difference check:**

$$\text{differs} = \exists (x,y,z,f) : |V_1(x,y,z,f) - V_2(x,y,z,f)| > \text{thresh}$$

where `thresh` defaults to 0 (exact comparison) and can be raised with `--thresh`.

**Geometry check:** compares the vox2ras matrices element-by-element with tolerance `geothresh` (default 0).

**Resolution check:** compares voxel sizes with tolerance `resthresh` (default 0).

**Acquisition parameter check:** compares flip angle, TR, TE, TI.

**m3z morph comparison:** uses `diff_mgh_morph()` with the GCAM difference function.

## Configuration Options

| Flag | Argument | Default | Description |
|------|----------|---------|-------------|
| `--thresh t` | float | 0 | Minimum pixel difference to be considered a difference |
| `--res-thresh t` | float | 0 | Resolution mismatch threshold (mm) |
| `--geo-thresh t` | float | 0 | Geometry matrix element mismatch threshold |
| `--rgb-thresh t` | float | 0 | RGB color difference threshold |
| `--count-thresh N` | int | 0 | Min number of differing voxels to trigger difference |
| `--notallow-res` | — | off | Turn off resolution checking |
| `--notallow-acq` | — | off | Turn off acquisition parameter checking |
| `--notallow-geo` | — | off | Turn off geometry checking |
| `--notallow-prec` | — | off | Turn off precision checking |
| `--notallow-pix` | — | off | Turn off pixel data checking |
| `--qa` | — | off | QA mode: check res, acq, prec, orientation; skip pixel and exact geometry |
| `--diff diffvol` | file | none | Save difference volume |
| `--diffabs` | — | off | Use absolute difference |
| `--pct` | — | off | Use percentage difference |
| `--avg-diff avgfile` | file | none | Save average difference per frame |
| `--log logfile` | file | none | Log file for differences |
| `--color-table` | — | off | Check embedded color tables |
| `--verbose` | — | off | Verbose output |
| `--debug` | — | off | Debug output |

## Configuration Options (surface mode)

| Flag | Argument | Description |
|------|----------|-------------|
| `--surf vol1 vol2` | files | Compare two surfaces (not volumes) |

## Configuration Interactions

- `--qa` enables `--notallow-res=off`, `--notallow-acq=off`, `--notallow-prec=off` and disables geometry/pixel checks. It adds orientation checking instead.
- `--notallow-*` flags turn **off** specific checks; all checks are on by default.
- `--thresh` sets the pixel comparison tolerance; `--count-thresh` sets the minimum number of differing voxels to trigger a reported difference (useful for ignoring floating-point noise).
- `--diff` and `--avg-diff` can be used simultaneously.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No differences |
| 1 | Errors (file read error, etc.) |
| 101 | Dimension mismatch |
| 102 | Resolution mismatch |
| 103 | Acquisition parameter mismatch |
| 104 | Geometry mismatch |
| 105 | Precision mismatch |
| 106 | Pixel data differ |
| 107 | Orientation mismatch |
| 201 | m3z 3D morph differ |
| 202 | Color table differs |

## Typical Use Cases

Basic comparison:
```bash
mri_diff vol1.mgz vol2.mgz
echo "Exit code: $?"
```

Check with pixel tolerance (ignore differences < 0.0001):
```bash
mri_diff --thresh 0.0001 vol1.mgz vol2.mgz
```

Save difference volume:
```bash
mri_diff vol1.mgz vol2.mgz --diff diff.mgz
```

QA mode (check acquisition parameters only):
```bash
mri_diff --qa scan1.mgz scan2.mgz
```

Log differences for scripted checking:
```bash
if ! mri_diff vol1.mgz vol2.mgz --log diff.log; then
  echo "Volumes differ!"
  cat diff.log
fi
```

## Pipeline Context

Used heavily in FreeSurfer's regression test suite (`test.sh` files in each tool directory). Also useful for:
- Verifying reprocessing produced the same outputs
- Comparing FreeSurfer versions
- Cross-site scanner equivalence studies

## Gotchas and Caveats

> [!gotcha] Prints output even when volumes match
> The man-page note says "stuff might get printed to the terminal regardless of whether the volumes are different." Do not use presence/absence of output to determine differences; use the exit code or log file.

> [!gotcha] Log file is deleted if no difference
> If `--log logfile` is specified and the volumes do **not** differ, the log file is immediately deleted at startup if it existed. If they do differ, the log file is created. This is the opposite of what some users expect.

> [!gotcha] Default threshold is exact (0)
> Floating-point processing often introduces sub-epsilon differences. Without `--thresh`, any floating-point difference triggers exit code 106. Use `--thresh 1e-6` for near-exact comparisons.

## Related Tools

- [[mri_compute_overlap]] — overlap statistics for label volumes
- [[mri_info]] — inspect volume metadata

## Confidence and Gaps

Confidence is **high**. The source contains extensive embedded documentation (BEGINHELP/ENDHELP) and the logic is transparent.
