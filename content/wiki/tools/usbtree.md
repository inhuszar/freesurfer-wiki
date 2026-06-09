---
title: "usbtree"
type: tool
fs_version: "8.2.0"
source_language: "Perl"
source_files:
  - "scripts/usbtree"
families: []                     # bundled USB-listing utility (no mri_*/mris_* family)
recon_all_stage: null
related:
  - "[[bugr]]"
status: draft
confidence: high
last_agent_update: 2026-06-09
gaps:
  - "Why this generic kernel utility ships with FreeSurfer is not stated in code; the most plausible reason (diagnosing a FLEXlm USB licence dongle) is inferred, not documented in the source."
tags:
  - usb
  - hardware
  - diagnostics
  - licensing
  - utility
---

# usbtree

## Summary

`usbtree` is a small Perl utility that reads the legacy Linux USB device table at
`/proc/bus/usb/devices` and prints a human-readable, indented tree of the USB
topology — root hubs, ports, devices, their interface classes, and bound drivers.
With `-l` it additionally prints each device's vendor ID, product ID, and
revision. It is a verbatim copy of the kernel community's `usbtree` script
(originally by Randy Dunlap) bundled with FreeSurfer; it is **not** FreeSurfer-
specific and reads nothing from the FreeSurfer installation.

## Source Information

- **Language:** Perl (shebang `#!/usr/bin/env perl`)
- **Source file:** [`scripts/usbtree`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree)
- **Binary/script location:** `$FREESURFER_HOME/bin/usbtree`
- **Original author:** Randy Dunlap (Linux kernel documentation utility,
  vendored into FreeSurfer unchanged).

## Purpose and Context

The script answers "what USB devices does this machine see, and where are they
attached?". It is a diagnostic/inventory tool, included in the FreeSurfer `bin`
directory most plausibly to help diagnose hardware-licensing setups — historically
some commercial neuroimaging software (and FLEXlm-style licence managers) used a
**USB hardware dongle**, and confirming the dongle's vendor/product ID is visible
on the bus is a natural support step. The FreeSurfer source does not state the
reason; the tool itself has no FreeSurfer dependency. It is unrelated to the
recon-all processing stream and is never invoked by
[[wiki/pipelines/recon-all|recon-all]].

> [!gotcha] Relies on the deprecated `usbfs` text interface
> `usbtree` reads `/proc/bus/usb/devices` ([`scripts/usbtree:13`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L13)), the old
> `usbfs` debugging interface that modern Linux kernels no longer mount by default
> (it was superseded by `sysfs` under `/sys/bus/usb` and the `usbutils` program
> `lsusb -t`). On a current system the file usually does not exist, and `usbtree`
> exits with "cannot open '/proc/bus/usb/devices'". Point it at a saved copy of
> that file (see below) or use `lsusb -t` instead.

## Inputs

### Required Inputs

None are mandatory. Behaviour is controlled by an optional first argument
([`scripts/usbtree:17-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L17-L27)):

- **`-l`** — list vendor/product IDs and revision in addition to the tree.
- **`<filename>`** — read the USB device table from this file instead of the
  default `/proc/bus/usb/devices` (useful for analysing a snapshot captured on
  another machine).

### Input Assumptions

> [!assumption] usbfs-format `devices` text
> The input (the default `/proc/bus/usb/devices` or a supplied file) must be in
> the classic `usbfs` line format — records beginning with `T:`, `D:`, `P:`,
> `S:`, `C:`, and `I:` ([`scripts/usbtree:38-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L38-L47)). Any other content is
> skipped line by line; a sysfs path or `lsusb` output will simply produce empty
> results.

## Outputs

### Files Created

None. The tree is printed to stdout.

### Output Specifications

An indented topology listing. Root hubs are printed as
`/: Bus N.Port P: Dev D, Class=root_hub, Drv=…, …M`
([`scripts/usbtree:186-187`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L186-L187)); attached devices as nested
`|_ Port P: Dev D…, If I, Prod=…, Class=…, Drv=…, …M` lines indented by bus level
([`scripts/usbtree:204-206`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L204-L206)). With `-l`, each line gains a trailing
`Vendor=…, ProdID=…, Rev=…` from the `P:` record ([`scripts/usbtree:208-211`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L208-L211)).
The trailing `…M` is the device speed in Mbit/s.

## Mathematical Foundations

None — `usbtree` is a text parser/pretty-printer. The only arithmetic is making
the port number 1-based (`$port = field + 1`, [`scripts/usbtree:69`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L69)) and
indenting by the topology level.

## Configuration Options

### Complete Flag Reference

Argument handling is a single positional check ([`scripts/usbtree:17-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L17-L27)):
the first argument is either the literal `-l` switch or a filename. There are no
other options, and only the **first** argument is examined.

| Flag / argument | Type | Default | Description |
|-----------------|------|---------|-------------|
| `-l` | bool (1st arg) | off | Also print Vendor ID, Product ID, and Revision for each device. |
| `<filename>` | string (1st arg) | `/proc/bus/usb/devices` | Read the USB device table from this file instead of the default location. |

> [!gotcha] `--help` is treated as a filename
> Because the only non-`-l` argument is interpreted as a filename, running
> `usbtree --help` tries to open a file called `--help` and fails with "cannot
> open '--help'". There is no built-in help text.

### Configuration Interactions

`-l` and `<filename>` are **mutually exclusive on the command line**: only the
first argument is read, so you can either change the output verbosity (`-l`) *or*
the input file, but not both in a single invocation
([`scripts/usbtree:17-27`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L17-L27)).

## Typical Use Cases

### Use Case 1: List the USB tree on a legacy system

```bash
usbtree
```

### Use Case 2: Include vendor/product IDs (e.g. to check a licence dongle)

```bash
usbtree -l
```

### Use Case 3: Analyse a captured device table from another machine

```bash
# On the machine with usbfs:  cat /proc/bus/usb/devices > usb-snapshot.txt
usbtree usb-snapshot.txt
```

## Pipeline Context

Standalone hardware-diagnostic utility, unrelated to image processing. Not part
of the recon-all stream and not called by [[wiki/pipelines/recon-all|recon-all]]
or `trac-all`.

**Predecessor:** *(none)* → **usbtree** → **Successor:** *(none)*

## Gotchas and Caveats

> [!gotcha] Obsolete data source on modern kernels
> See the source-information callout: `/proc/bus/usb/devices` is rarely present on
> current Linux. Prefer `lsusb -t` (from `usbutils`) for live inspection; reserve
> `usbtree` for parsing archived `usbfs` dumps.

> [!gotcha] Only the active configuration / first interface is shown
> By design the parser prints only the active USB configuration and the first
> altsetting of each interface ([`scripts/usbtree:142-149`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L142-L149)), so
> multi-configuration or multi-altsetting devices are reported in abbreviated form.

## Error Compensation and Guard Rails

If the device file cannot be opened, the script prints
`<prog>: cannot open '<file>'` and exits 1 ([`scripts/usbtree:29-33`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L29-L33)).
Unrecognised lines are skipped rather than causing errors
([`scripts/usbtree:37-47`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree#L37-L47)).

## Related Tools

- [[bugr]] — the FreeSurfer environment/hardware report helper; `usbtree` is the lower-level USB-inventory counterpart a support thread might ask you to run.
- `lsusb -t` *(external, `usbutils`)* — the modern, sysfs-based equivalent that replaces `usbtree` on current Linux.

## Confidence and Gaps

**High confidence:** the argument handling, the `usbfs` record parsing, the
two output formats, and the obsolete data source were all read directly from
[`scripts/usbtree`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree).

> [!gap] Why it ships with FreeSurfer
> The source carries no FreeSurfer-specific rationale (it is Randy Dunlap's kernel
> utility verbatim). The licence-dongle diagnostic use is the most plausible
> reason for inclusion but is inferred, not stated in code.

## References

- FreeSurfer source: [`scripts/usbtree`](https://github.com/freesurfer/freesurfer/blob/v8.2.0/scripts/usbtree) (v8.2.0).
- Linux `usbfs` `devices` format and the original `usbtree`: Linux kernel
  documentation (`Documentation/usb/proc_usb_info.txt`), Randy Dunlap.
