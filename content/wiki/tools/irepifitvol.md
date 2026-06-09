---
title: "irepifitvol"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # csh launcher wrapping a MATLAB MCR binary
source_files:
  - "scripts/irepifitvol"
families: []                     # standalone relaxometry tool (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[irepifitvol.glnx64]]"
  - "[[wiki/tools/mri_convert|mri_convert]]"
  - "[[mri_info]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "The hard-coded MCR root /usr/pubsw/common/matlab/8.3 is site-specific (MGH/Martinos); the wrapper will fail elsewhere unless FS_MCRROOT is overridden."
tags:
  - relaxometry
  - t1-mapping
  - inversion-recovery
  - epi
  - matlab
---

# irepifitvol

## Summary

`irepifitvol` is a tiny csh launcher that runs the MATLAB-compiled binary
[[irepifitvol.glnx64]], which voxel-wise fits an **inversion-recovery EPI (IR-EPI)**
volume series to estimate the longitudinal relaxation time **T1** (plus an
amplitude map M0 and a residual-error map). The wrapper's only job is to point
the MATLAB Compiler Runtime (MCR) shared libraries at the right location via
`LD_LIBRARY_PATH`, announce that it is starting, pass every command-line argument
straight through to the binary, and propagate the binary's exit status. All of
the actual model fitting lives in the compiled binary (see
[[irepifitvol.glnx64]] for the algorithm, flags, inputs, and outputs).

## Source Information

- **Language:** tcsh/csh shell script (a thin MCR launcher)
- **Source file:** [`scripts/irepifitvol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol)
- **Binary it launches:** [[irepifitvol.glnx64]] — the MATLAB-compiled fitter, installed alongside it in `$FREESURFER_HOME/bin`.
- **Pre-compilation MATLAB source (behavioural truth):** [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m) and its helpers `irepistructure.m`, `irepitiming.m`, `irepisynth.m`, `irepifit.m`.
- **Binary/script location:** `$FREESURFER_HOME/bin/irepifitvol`

The wrapper is 12 lines long; the entire script is:

```csh
if(! $?FS_MCRROOT) setenv FS_MCRROOT /usr/pubsw/common/matlab/8.3
if($?LD_LIBRARY_PATH == 0) setenv LD_LIBRARY_PATH
setenv LD_LIBRARY_PATH "$FS_MCRROOT/runtime/glnxa64":"$FS_MCRROOT/bin/glnxa64":"$FS_MCRROOT/sys/os/glnxa64":"$LD_LIBRARY_PATH"
echo "Starting irepifitvol.glnx64 ... be patient"
irepifitvol.glnx64 $argv
exit $status
```

## Purpose and Context

FreeSurfer ships several MATLAB tools in two forms: an editable `.m` source under
[`matlab/`](https://github.com/freesurfer/freesurfer/tree/v8.2.0/matlab) and a
standalone executable compiled with the MATLAB Compiler so that end users do not
need a MATLAB license to run it. The compiled executable cannot find the MCR
libraries on its own, so each such tool is paired with a small launcher script of
the **same base name** that prepends the MCR library directories to
`LD_LIBRARY_PATH` before exec'ing the binary. `irepifitvol` is that launcher for
the IR-EPI T1 fitter; `fs_spmreg`/`fs_spmreg.glnxa64` is another tool packaged the
same way.

This is a **specialised quantitative-MRI / relaxometry** tool, not part of the
anatomical stream. It is **not** called by [[wiki/pipelines/recon-all|recon-all]]
or [[trac-all]]; it is run by hand on an IR-EPI acquisition to produce a T1 map.

> [!gotcha] The wrapper hard-codes a Martinos-Center MCR path
> If `FS_MCRROOT` is unset, the wrapper defaults it to
> `/usr/pubsw/common/matlab/8.3`
> ([`scripts/irepifitvol:3`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L3)) — the MGH/Martinos `pubsw` MATLAB 8.3
> (R2014a) tree. On a machine without that path, the binary will fail to load its
> MCR libraries. Set `FS_MCRROOT` to your own MATLAB 8.3 / MCR R2014a
> installation before running.

## Inputs

The wrapper itself reads no files and validates no arguments — it forwards `$argv`
verbatim to [[irepifitvol.glnx64]]. The required and optional inputs are therefore
exactly those of the binary:

### Required Inputs

- **IR-EPI volume series** (`--i`): a 4-D NIfTI/MGZ volume whose frames are the
  successive inversion-recovery readouts (e.g. `dce.nii.gz`), read with `MRIread`.
- **Output directory** (`--o`): created if absent.

### Input Assumptions

> [!assumption] A regularly-timed IR-EPI series with known sequence timing
> The fit reconstructs the inversion/readout timing **analytically** from
> command-line pulse-sequence parameters (time between inversions, readout flip
> angle, slice-permutation skip, number of dummies, etc.), not from the file
> header. The frames must therefore correspond to that assumed acquisition
> schedule. See [[irepifitvol.glnx64]] for the full parameter list and defaults.

A binary brain/sample **mask** (`--m`) is optional and only speeds processing
(voxels below 0.5 are skipped).

## Outputs

The wrapper creates nothing of its own; the binary writes `t1.nii.gz`,
`M0.nii.gz`, `rstd.nii.gz`, `info.mat`, and (with `--save-yhat`) `yhat.nii.gz` into
`--o`. See [[irepifitvol.glnx64]] § Outputs for the specifications.

## Mathematical Foundations

None in the wrapper — it is pure environment setup and process launch. The IR-EPI
signal model, the slice-permutation timing reconstruction, and the linear M0 fit
all live in the compiled binary.

> [!internal] The fitting math is documented on the binary's page
> See [[irepifitvol.glnx64]] § Mathematical Foundations, which is reconstructed
> from the authoritative MATLAB sources `irepisynth.m` (Bloch recovery model) and
> `irepifit.m` (least-squares amplitude fit + T1 grid search).

## Configuration Options

### Complete Flag Reference

The launcher defines **no flags of its own**; every token in `$argv` is passed
to the binary
([`scripts/irepifitvol:9`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L9)).
The complete, authoritative flag table — parsed from
[`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m) —
is on the [[irepifitvol.glnx64]] page. The one environment variable the wrapper
honours is:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FS_MCRROOT` | env (path) | `/usr/pubsw/common/matlab/8.3` | Root of the MATLAB Compiler Runtime (MATLAB 8.3 / R2014a). The wrapper prepends `$FS_MCRROOT/{runtime,bin,sys/os}/glnxa64` to `LD_LIBRARY_PATH` ([`scripts/irepifitvol:6`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L6)). |

### Configuration Interactions

The only interaction is between `FS_MCRROOT` and a possibly pre-existing
`LD_LIBRARY_PATH`: the script guards against an unset `LD_LIBRARY_PATH` (sets it
empty first, [`scripts/irepifitvol:5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L5)) and then **prepends** the three MCR
directories, so the MCR's libraries take precedence over any system libraries of
the same name for the duration of the run.

## Typical Use Cases

### Fit a T1 map from an IR-EPI series

```bash
# Forwards everything to irepifitvol.glnx64
irepifitvol --i dce.nii.gz --o t1fit --m brainmask.nii.gz \
  --tbi 2092 --roflip 65 --skip 7 --ndummies 10
# → t1fit/t1.nii.gz, t1fit/M0.nii.gz, t1fit/rstd.nii.gz
```

### Run on a host without the default MATLAB tree

```bash
# Point the launcher at a local MCR R2014a install first
setenv FS_MCRROOT /opt/mcr/v83        # (csh)
irepifitvol --i dce.nii.gz --o t1fit
```

## Pipeline Context

`irepifitvol` is a stand-alone quantitative-MRI tool. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or [[trac-all]] (confirmed: no reference in
either script). It sits one step downstream of DICOM import.

**Predecessor:** raw IR-EPI DICOM → [[wiki/tools/mri_convert|mri_convert]] (to a
4-D `dce.nii.gz`) → **irepifitvol** (launches [[irepifitvol.glnx64]]) →
**Successor:** the resulting `t1.nii.gz` map is used as a quantitative T1 image
(e.g. inspected in [[wiki/tools/freeview|freeview]] or fed to downstream analysis).

## Gotchas and Caveats

> [!gotcha] "be patient" is literal
> The wrapper prints `Starting irepifitvol.glnx64 ... be patient`
> ([`scripts/irepifitvol:8`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L8)). MCR start-up plus the per-voxel two-pass
> T1 grid search make this slow; the binary prints per-slice progress and
> rewrites `t1.nii.gz` after every slice so partial results survive an interrupt.

> [!gotcha] Exit status is forwarded, but MATLAB errors may still exit 0
> The wrapper does `exit $status`
> ([`scripts/irepifitvol:11`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L11)), so a clean non-zero from the binary
> propagates. However, the MATLAB code raises bare `error` on bad arguments, which
> the MCR may report on stderr while still returning 0; check stderr, not only the
> exit code.

## Error Compensation and Guard Rails

- **Unset `LD_LIBRARY_PATH` is handled** so the `setenv` concatenation does not
  fail ([`scripts/irepifitvol:5`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol#L5)).
- No input validation happens in the wrapper; all checks (missing `--i`/`--o`,
  unrecognised flags) are performed inside the binary.

## Related Tools

- [[irepifitvol.glnx64]] — the MATLAB-compiled binary this script launches; all algorithm, flag, input, and output detail lives there.
- [[wiki/tools/mri_convert|mri_convert]] — typically used upstream to assemble the IR-EPI DICOMs into the 4-D `dce.nii.gz` input.
- [[mri_info]] — to confirm the input has the expected number of frames (one per inversion readout).
- `fs_spmreg` *(no wiki page yet)* — another FreeSurfer tool packaged as a `name` + `name.glnxa64` MCR-launcher pair, installed the same way.

## Confidence and Gaps

**High confidence:** the wrapper is short and fully read; its only behaviours are
the `FS_MCRROOT` default, the `LD_LIBRARY_PATH` prepend, the launch, and
`exit $status`.

> [!gap] Site-specific MCR root
> The default `FS_MCRROOT` (`/usr/pubsw/common/matlab/8.3`) is an MGH/Martinos
> path. On other sites the wrapper only works if `FS_MCRROOT` already points at a
> compatible MATLAB 8.3 / MCR R2014a installation; this is not documented in any
> `--help` text.

## References

- FreeSurfer source: [`scripts/irepifitvol`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/irepifitvol) (v8.2.0).
- Behavioural source for the binary: [`matlab/irepifitvol.m`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/matlab/irepifitvol.m).
- MATLAB Compiler Runtime: MathWorks MCR R2014a (MATLAB 8.3), the version the binary was compiled against.
