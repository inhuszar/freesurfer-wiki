---
title: "polyorder"
type: tool
fs_version: "8.2.0"
source_language: "shell"        # tcsh
source_files:
  - "scripts/polyorder"
families: []                     # FSFAST helper (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[mkanalysis-sess]]"
  - "[[selxavg3-sess]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Provenance of the two empirical constants 0.3654 and 0.3405 (and the underlying calibration of polynomial-detrending order against the equivalent high-pass cutoff) is not documented in the source; cited only as fitted coefficients."
tags:
  - fmri
  - fsfast
  - detrending
  - nuisance-regressors
---

# polyorder

## Summary

`polyorder` is a tiny FSFAST calculator that converts a desired high-pass filter
**cutoff frequency** (in Hz) into the **order of a polynomial detrending basis**
that achieves roughly the same filtering. You give it the number of time points,
the TR, and the cutoff frequency; it prints a single integer — the polynomial
order — which you then pass to `mkanalysis-sess --polyfit`. Because polynomial
detrending in FSFAST removes low-frequency drift, the right order depends on the
run length and TR, so the same cutoff maps to different orders for different
acquisitions.

## Source Information

- **Language:** tcsh shell script
- **Source file:** [`scripts/polyorder`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder)
- **Binary/script location:** `$FREESURFER_HOME/bin/polyorder`
- **External commands:** `bc -l` (the `bext` constants, [`scripts/polyorder:33-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L33-L34)) and `perl` (the rounded order, [`scripts/polyorder:36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L36)). No FreeSurfer binaries are called.

## Purpose and Context

In FSFAST first-level analysis, slow scanner drift is modelled with a set of
Legendre/polynomial nuisance regressors whose number is the **polynomial order**
(`--polyfit` in [[mkanalysis-sess]]). Investigators often think in terms of a
high-pass **cutoff frequency** instead (e.g. "remove everything below 0.01 Hz").
`polyorder` bridges the two: it returns the polynomial order whose effective
high-pass corner matches the requested cutoff, given the run's duration
($\text{ntp} \times \text{TR}$).

It is a pure helper — it reads no images and writes no files; it just prints a
number. It is not part of [[wiki/pipelines/recon-all|recon-all]] or `trac-all`;
it is used while **configuring** an FSFAST analysis.

## Inputs

### Required Inputs

`polyorder` takes no data files — only three numeric flags:

- `--ntp` — number of time points (TRs) in a run.
- `--TR` — repetition time in **seconds**.
- `--cutoff` — desired high-pass cutoff frequency in **Hz**.

All three are required ([`scripts/polyorder:90-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L90-L103)).

### Input Assumptions

> [!assumption] Per-run quantities
> The order is computed from a single run's length and TR. If different runs in a
> study have different numbers of time points or different TRs, the order
> differs per run — the help text states this explicitly ([`scripts/polyorder:135-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L135-L140)). The
> cutoff is interpreted as a temporal frequency in Hz, consistent with TR given
> in seconds.

## Outputs

### Files Created

None. The single integer order is printed to **stdout** ([`scripts/polyorder:37`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L37)).

### Output Specifications

One non-negative integer on stdout (e.g. `28`). If the computed order is greater
than or equal to `ntp`, the script instead prints an error and exits 1
([`scripts/polyorder:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L38-L42)).

## Mathematical Foundations

> [!math] Cutoff → polynomial order
> With two empirically fitted constants $b_{1a} = 0.3654$ and $b_{1b} = 0.3405$
> ([`scripts/polyorder:31-32`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L31-L32)), define the per-run scaled coefficients
> $$ b'_{a} = \frac{b_{1a}}{\text{TR}\cdot\text{ntp}}, \qquad b'_{b} = \frac{b_{1b}}{\text{TR}\cdot\text{ntp}}, $$
> where $\text{TR}\cdot\text{ntp}$ is the total run duration in seconds
> ([`scripts/polyorder:33-34`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L33-L34)). The polynomial order is then the cutoff,
> de-offset by $b'_a$ and scaled by $b'_b$, rounded to the nearest integer
> ([`scripts/polyorder:36`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L36)):
> $$ \text{order} = \left\lfloor \frac{f_{\text{cutoff}} - b'_a}{b'_b} + 0.5 \right\rfloor. $$
> The rounding is done by `perl -e "print int(... + 0.5)"`. Worked example from
> the help: `--ntp 100 --TR 2 --cutoff 0.05` → `28` ([`scripts/polyorder:142-145`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L142-L145)).

The two constants encode a linear relationship between the effective high-pass
corner of a polynomial-detrend basis and the number of basis terms, normalised by
run duration. This is the entirety of the computation — there is no iteration or
image processing.

> [!gap] Origin of the constants 0.3654 / 0.3405
> The source gives the coefficients as bare literals with no derivation or
> citation. They appear to come from a calibration of polynomial-detrend cutoff
> vs. order, but the fit is not documented in the script.

## Configuration Options

### Complete Flag Reference

All flags were enumerated from the argument parser
([`scripts/polyorder:49-84`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L49-L84)).

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ntp` | integer | *(required)* | Number of time points (TRs) in the run ([`scripts/polyorder:57-60`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L57-L60)). |
| `--TR` | float (seconds) | *(required)* | Repetition time in seconds ([`scripts/polyorder:62-65`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L62-L65)). |
| `--cutoff` | float (Hz) | *(required)* | Desired high-pass cutoff frequency in Hz ([`scripts/polyorder:67-70`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L67-L70)). |
| `--debug` | bool | off | Enable tcsh `set echo`/`verbose` tracing ([`scripts/polyorder:72-75`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L72-L75)). |
| `--help` | bool | — | Print usage plus the explanatory help body and exit ([`scripts/polyorder:13-17`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L13-L17)). |
| `--version` | bool | — | Print the version string and exit ([`scripts/polyorder:18-22`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L18-L22)). |

### Configuration Interactions

All three numeric flags are required and independent; there are no
mutually-exclusive options. The only coupled behaviour is the sanity check below.

> [!gotcha] Order must be below the number of time points
> If the computed order is $\ge$ `ntp`, the script errors with "order = … exceeds
> number of time points" and tells you to raise the cutoff
> ([`scripts/polyorder:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L38-L42)). A cutoff that is too high for a short run is
> therefore rejected rather than silently producing an over-parameterised model.

## Typical Use Cases

### 1. Pick a polynomial order for an FSFAST analysis

```bash
# 100 TRs at TR=2 s, high-pass at 0.05 Hz → order 28
polyorder --ntp 100 --TR 2 --cutoff 0.05
# 28
```

### 2. Feed the result into mkanalysis-sess

```bash
set order = `polyorder --ntp 150 --TR 2.5 --cutoff 0.008`
mkanalysis-sess -analysis myana -TR 2.5 -polyfit $order ...
```

## Pipeline Context

`polyorder` is an FSFAST **configuration** helper. It is **not** invoked by
[[wiki/pipelines/recon-all|recon-all]] or `trac-all`, and it does not appear
inside any other FreeSurfer script — it is run by the user when setting up an
analysis.

**Predecessor:** acquisition parameters (run length, TR) and a chosen cutoff →
**polyorder** → **Successor:** [[mkanalysis-sess]] `--polyfit <order>`, after
which [[selxavg3-sess]] fits the first-level model with that many polynomial
nuisance regressors.

## Gotchas and Caveats

> [!gotcha] Order depends on the run, not just the cutoff
> Because the constants are divided by $\text{TR}\cdot\text{ntp}$, the same cutoff
> maps to a different order for runs of different length or TR. Re-run
> `polyorder` for each distinct acquisition; do not reuse one order across
> heterogeneous runs ([`scripts/polyorder:135-140`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L135-L140)).

> [!gotcha] Output is a bare number on stdout
> There is no labelling; capture it directly (e.g. in a backtick assignment).
> An out-of-range request prints an error to stdout/stderr and exits non-zero.

## Error Compensation and Guard Rails

- **All three inputs required.** Missing `--ntp`, `--TR`, or `--cutoff` aborts with
  a specific error ([`scripts/polyorder:90-103`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L90-L103)).
- **Over-order guard.** An order $\ge$ `ntp` is rejected rather than returned
  ([`scripts/polyorder:38-42`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L38-L42)).
- No input validation beyond presence and the over-order check; negative or
  zero values are not specifically caught (they would flow through `bc`/`perl`).

## Related Tools

- [[mkanalysis-sess]] — FSFAST analysis configurator; consumes the order via `--polyfit`.
- [[selxavg3-sess]] — FSFAST first-level GLM that fits the polynomial nuisance regressors.

## Confidence and Gaps

**High confidence:** the formula, the two constants, the rounding, the
required-flag set, and the over-order guard are all read directly from
[`scripts/polyorder`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder), and the worked example reproduces the help text.

> [!gap] Calibration of the constants
> The empirical coefficients 0.3654 and 0.3405 (and thus the precise mapping
> between polynomial order and equivalent high-pass cutoff) are undocumented in
> the source; they would need developer or literature confirmation.

## References

- FreeSurfer source: [`scripts/polyorder`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder) (v8.2.0).
- Built-in help: `polyorder --help` (the `BEGINHELP` block, [`scripts/polyorder:133-146`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/polyorder#L133-L146)).
- FSFAST analysis configuration: [[mkanalysis-sess]] (`--polyfit`).
