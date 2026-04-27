---
title: "Installation and Platform Support — Frequently Asked Questions"
type: faq
fs_version: "8.2.0"
entry_count: 14
last_agent_update: 2026-04-27
tags:
  - faq
  - installation
  - platform
  - macos
  - apple-silicon
  - linux
  - rhel
  - ubuntu
  - wsl
  - matlab-compiler-runtime
  - fs-allow-deep
---

# Installation and Platform Support — Frequently Asked Questions

This FAQ collects recurring installation and platform-support questions
answered by the FreeSurfer build/release team and developers on the
mailing list. It covers the supported Linux distributions (RHEL/Rocky 8
and 9, Ubuntu 22.04/24.04, CentOS), macOS Intel and Apple Silicon, the
hardware floor (AVX-capable CPU, RAM, optional GPU), the
`FS_ALLOW_DEEP=1` and `FS_V8_XOPTS=0` environment variables that gate
the FS 8.x deep-learning pipeline, MATLAB Compiler Runtime (MCR)
installation for the legacy MATLAB-based segmentation scripts, and a
handful of version-specific installation defects that block fresh FS
8.0.0 or 8.2.0 installs out of the box.

> For tool reference on the deep-learning components themselves, see
> [[mri_synthseg]], [[mri_synthstrip]], [[mri_synthmorph]], and
> [[mri_synthsr]]. For the standard pipeline, see [[recon-all]]; for
> clinical-quality MRI, see [[recon-all-clinical]].

---

## Linux distributions

### Is FreeSurfer supported on CentOS 9 Stream or RHEL 9?

**Short answer:** FreeSurfer 7.4.1 is **not** supported on CentOS 9
Stream / RHEL 9 / Rocky 9; from FS 8.0.0 onwards the Rocky 8 RPM
installs and runs on Rocky/RHEL 9 as well.

**Detail:** In June 2023 fsbuild stated that FreeSurfer "has not been
tested running on CentOS 9 Stream or the current RHEL 9 release" and
that native builds on RHEL 9 were not expected to work; users were
advised to try the CentOS 8 RPM at their own risk. By April 2025 the
situation had crystallised: FS 7.4.1 fails on Rocky/RHEL 9 because the
bundled MNI Perl toolbox cannot locate `Sys/Hostname.pm` (Perl 5.38+
on RHEL 9 deprecated/removed it), which breaks `nu_correct` (and
therefore `autorecon1`). The supported path on RHEL 9 / Rocky 9 is to
install FS 8.0.0+ from the **Rocky 8 RPM**, which fsbuild has
confirmed installs and runs on Rocky 9:

```bash
sudo rpm -i freesurfer-linux-rocky8_x86_64-8.0.0.rpm
```

| FS version | RHEL/Rocky 7 | RHEL/Rocky 8 | RHEL/Rocky 9 |
|------------|--------------|--------------|--------------|
| 7.4.1      | partial      | yes          | **no** (Perl `Sys::Hostname`) |
| 8.0.0+     | unknown      | yes (native) | yes (via Rocky 8 RPM) |

> [!gotcha] `tar.gz` extraction is no longer a supported install
> method. fsbuild has stated explicitly that the `.rpm`/`.deb`
> installer packages are the only supported way to install
> FreeSurfer; if you do not have root, ask IT to run the installer.

**Provenance:** Mailing list, 2023-06-21 (fsbuild) and 2025-04-08
(fsbuild). See
`raw/mailing-list/2023-06-centos9-rhel9-not-officially-supported.md`,
`raw/mailing-list/2025-04-freesurfer-rhel9-rocky9-perl-broken-installer-required.md`.

**Related:** [[mri_nu_correct.mni]], [[recon-all]]

---

### Does FreeSurfer 8 install cleanly on Ubuntu 24.04?

**Short answer:** No — Ubuntu 24.04 is not officially supported as of
April 2025; use Docker or a VirtualBox VM running Ubuntu 22.04, and
on FS 8.2.0 apply the 2026-03-25 `gemsbindings` patch before running
[[mri_gtmseg]].

**Detail:** fsbuild confirmed in April 2025 that no native Ubuntu 24
(Noble Numbat) installer was yet available and that a development
build was expected "in the coming months." Ubuntu 24 ships Python 3.12
and a newer libstdc++/Tcl/Tk than Ubuntu 22, which breaks several
pre-compiled components. The two recommended workarounds are:

1. **Docker** — pull the official image and run with X11 forwarding if
   GUIs are needed:
   ```bash
   docker pull freesurfer/freesurfer:8.0.0
   docker run -v $SUBJECTS_DIR:/subjects \
              -v /tmp/.X11-unix:/tmp/.X11-unix \
              -e DISPLAY=$DISPLAY \
              freesurfer/freesurfer:8.0.0 \
              recon-all -s SUBJECT -i T1.mgz -all
   ```
2. **VirtualBox VM with Ubuntu 22.04** (preferred for [[freeview]] use
   because the VM provides a built-in X server, avoiding the
   complexities of X11 forwarding from Docker):
   ```bash
   sudo dpkg -i freesurfer_ubuntu22-amd64_8.0.0.deb
   ```

> [!gotcha] On FS 8.2.0 even users who get the base package working on
> Ubuntu 24 hit `ModuleNotFoundError: No module named
> 'samseg.gems.gemsbindings'` from `gtmseg` (and other samseg-based
> tools) because the shipped `gemsbindings.so` was built against
> Python 3.8, while Ubuntu 24 uses Python 3.12. The 2026-03-25 8.2.0
> patch rebuilds `gemsbindings` for Ubuntu 24's Python — apply it
> before running [[mri_gtmseg]] on Ubuntu 24. Do **not** "fix" this by
> passing `--no-samseg`: Huang explicitly retracted that workaround
> because it changes PVC results substantively.

**Provenance:** Mailing list, 2025-04-08 (fsbuild) and 2026-03-23 to
2026-03-26 (Demeusy / Huang / fsbuild). See
`raw/mailing-list/2025-04-ubuntu-2404-not-supported-docker-vm-workaround.md`,
`raw/mailing-list/2026-03-gtmseg-gemsbindings-ubuntu24.md`.

**Related:** [[mri_gtmseg]], [[samseg]], [[freeview]], [[petsurfer]]

---

## macOS

### Does FreeSurfer 8 work on Apple Silicon (M1/M2/M3/M4)?

**Short answer:** Yes, with a native ARM64 build, provided you set
`FS_ALLOW_DEEP=1` and use the bundled `fspython` (which ships
TensorFlow 2.13.0 with the Metal backend).

**Detail:** fsbuild confirmed in January 2025 that FS 8.0.0-beta runs
on Apple Silicon (validated on an M2 with 32 GB RAM, macOS Sonoma
14.7.2) and that the procedure is the same on M4. The standard
sequence on macOS is:

```bash
export FREESURFER_HOME=/Applications/freesurfer/8.0.0-beta
source $FREESURFER_HOME/SetUpFreeSurfer.sh
export FS_ALLOW_DEEP=1
recon-all -s <subject> -all
```

The frequent "TensorFlow library was compiled to use AVX instructions,
but these aren't available on your machine" error on M-series chips is
**not** a real AVX problem — it means TensorFlow is being imported
from system Python (or another conda environment) rather than from
`fspython`. Verify:

```bash
which python3                  # /usr/bin/python3 — expect no tensorflow
python3 -c "import tensorflow"  # ModuleNotFoundError is correct here

which fspython                 # $FREESURFER_HOME/bin/fspython
fspython -c "import tensorflow as tf; print(tf.__version__)"
# 2.13.0
```

A correctly-running test on Apple Silicon prints `Metal device set to:
Apple M? Pro` and uses the integrated GPU. Apple Silicon support
covers macOS 12 (Monterey) and later; macOS 11 (Big Sur) on Apple
Silicon is no longer supported.

> [!gotcha] Apple Silicon CPUs do not implement x86 AVX, so x86
> FreeSurfer binaries run under Rosetta 2 will produce "Illegal
> instruction" for any tool requiring AVX. Always use the native
> `darwin_arm64` installer on M-series Macs.

**Provenance:** Mailing list, 2025-01-07 (fsbuild). See
`raw/mailing-list/2025-01-apple-silicon-m4-fs-allow-deep-tensorflow-setup.md`.

**Related:** [[mri_synthseg]], [[recon-all]],
[[synthseg-and-synthsr]]

---

### `cvs_register` fails on macOS arm64 with `surf2vol: command not found` — is this fixable?

**Short answer:** No — the `surf2vol` binary (part of the
`fem_elastic` toolset) was not compiled for the macOS arm64 build of
FS 8.0.0; run CVS registration on Linux instead.

**Detail:** Zöllei confirmed in March 2025 that this is a known build
gap: `surf2vol` is shipped in FS 8.0.0 Linux builds but is **absent
from the macOS arm64 build**, so [[mri_cvs_register]] fails on Apple
Silicon. Other FreeSurfer tools (recon-all, [[mri_synthseg]], etc.)
are unaffected. The supported workarounds are:

1. Run [[mri_cvs_register]] on a Linux machine or HPC node.
2. Run a FreeSurfer Linux container on the Mac:
   ```bash
   docker run -v $SUBJECTS_DIR:/subjects freesurfer/freesurfer:8.0.0 \
     cvs_register -mov SUBJECT -template MNI152 -sd /subjects
   ```

> [!gap] As of FS 8.2.0 (April 2026) it has not been re-verified
> whether `surf2vol` is now shipped for `darwin_arm64`. Check the
> release notes before assuming `cvs_register` works on Apple Silicon.

**Provenance:** Mailing list, 2025-03-19 (Zöllei). See
`raw/mailing-list/2025-03-cvs-register-surf2vol-absent-macos-arm64.md`.

**Related:** [[mri_cvs_register]], [[registration-overview]]

---

### My Mac only has 16 GB RAM and the FS 8 beta keeps OOMing — what can I do?

**Short answer:** Set `FS_V8_XOPTS=0` to disable the new
high-memory deep-learning steps, or upgrade to 24 GB+ of RAM.

**Detail:** The FS 8.0 beta integrates [[mri_synthstrip]] and
[[mri_synthseg]] into `recon-all`, and `mri_synthstrip` alone has been
observed peaking near 48 GB of RAM. On a 16 GB Mac the official advice
from fsbuild is to revert to the pre-8.0 (FS 7.x-style) processing
behaviour for the affected steps:

```bash
export FS_V8_XOPTS=0
recon-all -s SUBJECT -all
```

This is a runtime safety valve only — with `FS_V8_XOPTS=0` you do not
get the deep-learning surface refinements that the FS 8 beta was
designed around. The recommended minimum for full FS 8 functionality
is **24 GB** of physical RAM; the 48 GB peak appears to be an edge
case but the central tendency is well above 16 GB. Swap is not a
workable substitute (see the WSL/RAM entry below). Alternatively, you
can pin a stable pre-8.0 development build that has neither the new
RAM floor nor the new functionality.

**Provenance:** Mailing list, 2024-11-12 (fsbuild). See
`raw/mailing-list/2024-11-freesurfer-8-beta-mac-low-ram-fs-v8-xopts-workaround.md`.

**Related:** [[mri_synthstrip]], [[mri_synthseg]], [[recon-all]]

---

## Hardware

### What CPU instruction set does FreeSurfer require? Why do I get "Illegal instruction"?

**Short answer:** FreeSurfer 7.x+ binaries are compiled with **AVX**;
on a CPU that does not implement AVX you will see `Illegal
instruction (core dumped)` from any FreeSurfer binary.

**Detail:** fsbuild confirmed in September 2023 that the only known
cause of `Illegal instruction` from a FreeSurfer Linux binary is a CPU
that lacks AVX. The boundary in practice is:

- Intel: Sandy Bridge (~2011) and later — earlier CPUs lack AVX.
- AMD: Bulldozer (2011) and later — earlier CPUs lack AVX.
- ARM: x86 builds run under emulation (Rosetta 2 etc.) cannot use AVX
  even on otherwise-modern silicon — use a native ARM64 build.

Check on Linux:

```bash
grep -m1 avx /proc/cpuinfo   # empty output ⇒ no AVX
lscpu | grep avx
```

The error is not specific to a subset of tools — it is raised by the
loader when any AVX-using instruction is executed, so all of
[[recon-all]], [[mri_synthseg]], `mri_sclimbic_seg`, [[mri_gtmseg]]
etc. are affected on a non-AVX CPU.

**Resolution:**
1. Run on a CPU that supports AVX (Intel ≥ Sandy Bridge / AMD ≥
   Bulldozer).
2. On Apple Silicon, use the native `darwin_arm64` FreeSurfer build —
   not the x86 build under Rosetta.

> [!gotcha] Some deep-learning paths additionally rely on AVX2
> (Haswell, ~2013) via TensorFlow's SIMD code. If a binary runs but
> [[mri_synthseg]] crashes inside Python with an AVX-related
> TensorFlow error, the issue is usually the *wrong* Python being
> picked up rather than missing AVX hardware (see the Apple Silicon
> entry).

**Provenance:** Mailing list, 2023-09-12 (fsbuild / Glass). See
`raw/mailing-list/2023-09-freesurfer-binaries-avx-instructions-pre-2011-cpu-illegal-instruction.md`.

**Related:** [[recon-all]], [[mri_synthseg]]

---

### How much RAM does FreeSurfer 8 need? Is swap a substitute?

**Short answer:** ~24 GB of physical RAM is the practical floor for
the full FS 8 pipeline; swap does not reliably substitute for RAM.

**Detail:** Greve's FS 8.0.0 beta announcement specifies "approximately
24 GB RAM" as the requirement. The high water mark comes from the
deep-learning steps integrated into `recon-all`: [[mri_synthstrip]]
peaks near 48 GB in pathological cases, and [[mri_synthseg]]
allocates a 5-D float32 tensor of shape `[1, 256, 256, 160, 72]` (~7.2
GB) plus overhead. Mailing-list reports show:

- 16 GB RAM + 16 GB swap on native Linux peaked ~21 GB combined and
  still crashed running [[recon-all-clinical]] (which invokes
  [[mri_synthseg]]).
- 16 GB RAM under WSL with a 32 GB `.wslconfig` swap allowance
  completed ~27/30 scans but with unpredictable failures.
- 32 GB physical RAM resolved the issue in every reported case.

When memory is the bottleneck the runtime stretches dramatically too —
Greve replied to a "4.5–5 hour `recon-all` instead of 2 hours" report
on a 24-core/96 GB/24 GB-GPU machine by asking whether the system
"has access to as much memory as it wants."

> [!gap] The 48 GB peak for `mri_synthstrip` may be an outlier; 24 GB
> is the official documented target. If your data triggers >24 GB
> usage, file a bug with the input header so the team can investigate.

**Provenance:** Mailing list, 2023-07/08 (fsbuild / Fischl / Lynch),
2024-11-07 (Greve), 2024-11-12 (fsbuild). See
`raw/mailing-list/2024-11-freesurfer-8-beta-fs-allow-deep-env-var-required.md`,
`raw/mailing-list/2024-11-freesurfer-8-beta-mac-low-ram-fs-v8-xopts-workaround.md`.

**Related:** [[recon-all]], [[recon-all-clinical]], [[mri_synthstrip]],
[[mri_synthseg]]

---

### Does SynthMorph need a GPU, and how much GPU memory?

**Short answer:** A GPU is optional but strongly recommended for the
deformable model; affine needs ≥ 16 GB GPU memory, deformable needs
24 GB.

**Detail:** Hoffmann clarified GPU usage on the FS 8 beta announcement
thread:

- Docker `--gpus=all` (or `--gpus=0`) is necessary but **not
  sufficient** — the `-g` flag must also be passed to
  [[mri_synthmorph]] itself to enable GPU acceleration.
- Device selection follows `CUDA_VISIBLE_DEVICES` (default device 0).
- Affine registration: ≥ 16 GB GPU memory.
- Deformable registration: ≥ 24 GB GPU memory.
- Several resampling steps are delegated to `surfa` and run on CPU
  regardless of `-g`.

**Provenance:** Mailing list, 2024-11-08 (Hoffmann). See
`raw/mailing-list/2024-11-freesurfer-8-beta-fs-allow-deep-env-var-required.md`.

**Related:** [[mri_synthmorph]], [[synthmorph]],
[[registration-overview]]

---

## Deep-learning enablement

### Why does `recon-all` exit with `ERROR: cannot use ML routines` on FS 8?

**Short answer:** You forgot to set `FS_ALLOW_DEEP=1`.

**Detail:** From FS 8.0.0 onwards the deep-learning components
([[mri_synthseg]], [[mri_synthstrip]], [[mri_synthmorph]]) are gated
behind the `FS_ALLOW_DEEP` environment variable. Without it,
`recon-all` exits early with `ERROR: cannot use ML routines`. The
canonical setup sequence is:

```bash
export FREESURFER_HOME=/usr/local/freesurfer/8.x.x
source $FREESURFER_HOME/SetUpFreeSurfer.sh
export FS_ALLOW_DEEP=1
recon-all -s SUBJECT -all
```

The variable must be set in the same shell that runs `recon-all`,
*after* sourcing `SetUpFreeSurfer.sh`. The same gate applies on macOS
(both Intel and Apple Silicon) and on Linux. The FS 8 beta integrates
deep-learning into `recon-all` proper (mri_synthseg for major sinuses
/ MCA / dura, deep-learning entorhinal-cortex WM segmentation, sTIV
alongside eTIV), so the gate effectively makes the FS 8 pipeline
opt-in until you set the variable.

> [!gotcha] `FS_ALLOW_DEEP=1` enables deep learning; `FS_V8_XOPTS=0`
> *disables* the new FS 8 high-memory paths (see the low-RAM Mac
> entry above). They are independent variables — do not confuse them.

**Provenance:** Mailing list, 2024-11-07 to 2024-12-01 (Greve) and
2025-01-07 (fsbuild). See
`raw/mailing-list/2024-11-freesurfer-8-beta-fs-allow-deep-env-var-required.md`,
`raw/mailing-list/2025-01-apple-silicon-m4-fs-allow-deep-tensorflow-setup.md`.

**Related:** [[recon-all]], [[mri_synthseg]], [[mri_synthstrip]],
[[mri_synthmorph]]

---

### `mri_synthseg` on Apple Silicon prints "TensorFlow library was compiled to use AVX instructions" — is my CPU broken?

**Short answer:** No — your shell is picking up a non-`fspython`
TensorFlow that was built for x86. Run inside `fspython` instead.

**Detail:** Apple Silicon CPUs do not implement x86 AVX, so an x86
TensorFlow wheel imported from system Python (or a conda environment
that happens to be on `PATH`) will refuse to run. FreeSurfer ships its
own Python interpreter — `fspython` — with TensorFlow 2.13.0 built for
the platform (Metal backend on Apple Silicon). When you launch
[[mri_synthseg]] through FreeSurfer wrappers it invokes `fspython`
under the hood; problems arise when users invoke the underlying
script via `python3 …` directly. Verify the installation:

```bash
which fspython
# /Applications/freesurfer/8.x.x/bin/fspython
fspython -c "import tensorflow as tf; print(tf.__version__)"
# 2.13.0
```

A successful run on M-series silicon prints something like `Metal
device set to: Apple M2 Pro` and uses the integrated GPU.

**Provenance:** Mailing list, 2025-01-07 (fsbuild / Bohlke). See
`raw/mailing-list/2025-01-apple-silicon-m4-fs-allow-deep-tensorflow-setup.md`.

**Related:** [[mri_synthseg]], [[synthseg-and-synthsr]]

---

## MATLAB Compiler Runtime (MCR)

### My segmentation script fails with "cannot find Matlab 2019b runtime in location: …/MCRv97" — how do I install MCR correctly on macOS?

**Short answer:** Symlinks to an existing MATLAB install do **not**
work; remove the broken `MCRv97` and re-run `fs_install_mcr R2019b`,
then export the `DYLD_LIBRARY_PATH` printed by the installer.

**Detail:** The legacy MATLAB-based segmentation scripts in FS 7.x
(`segmentThalamicNuclei.sh`, `segmentHA_T1.sh`, `segmentBS.sh`)
require a directory tree at `$FREESURFER_HOME/MCRv97/` containing the
full MATLAB R2019b Compiler Runtime, *plus* the appropriate MCR
subdirectories on `DYLD_LIBRARY_PATH` (macOS) or `LD_LIBRARY_PATH`
(Linux). Trying to short-circuit this with a symlink — particularly a
symlink to a single `.dylib` rather than a directory — fails because
FreeSurfer needs the full tree. The supported procedure is:

```bash
# 1. Remove any broken MCRv97 symlink/directory
export FREESURFER_HOME=/Applications/freesurfer/7.3.2
sudo rm -rf $FREESURFER_HOME/MCRv97

# 2. Run the official installer
cd $FREESURFER_HOME/bin
sudo FREESURFER_HOME=$FREESURFER_HOME ./fs_install_mcr R2019b

# 3. Read the DYLD_LIBRARY_PATH paths printed at the end of the installer
#    output (they are machine-specific paths under /var/folders/...)
#    and add them to your shell profile, e.g.:
export DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH:/var/folders/.../v97/runtime/maci64:/var/folders/.../v97/sys/os/maci64:/var/folders/.../v97/bin/maci64:/var/folders/.../v97/extern/bin/maci64
```

On Linux the equivalents are `LD_LIBRARY_PATH` and the `glnxa64`
subdirectories.

> [!gotcha] In FS 8.x most subregion segmentation has migrated to the
> Python-based `mri_segment_subregions` and no longer requires MCR.
> The `MCRv97` issue is specific to FS 7.x users running the legacy
> MATLAB scripts.

**Provenance:** Mailing list, 2023-10-03 to 2023-10-04 (Iglesias /
fsbuild). See
`raw/mailing-list/2023-10-segmentthalamicnuclei-mcr-symlink-insufficient-reinstall-dyld.md`.

**Related:** [[recon-all-clinical]],
[[synthseg-and-synthsr]]

---

### `segmentAAN.sh` on Ubuntu 20.04 / FS 8.0.0 fails with `GLIBCXX_3.4.20 not found` — how do I fix it?

**Short answer:** Replace the shipped `segmentNuclei` binary with the
MCRv97-compiled version from the FreeSurfer GitHub dev branch.

**Detail:** The `segmentNuclei` binary that drives `segmentAAN.sh` in
FS 8.0.0 was built with the older MCRv84 (MATLAB R2018a), which
bundles a libstdc++ providing only up to `GLIBCXX_3.4.18`. On Ubuntu
20+ the system libstdc++ is much newer, and `mri_robust_register`
(linked against the system) needs ≥ `GLIBCXX_3.4.20` — so the
runtime linker fails:

```
/usr/local/freesurfer/8.0.0/MCRv84//sys/os/glnxa64/libstdc++.so.6:
  version `GLIBCXX_3.4.20' not found (required by
  /usr/local/freesurfer/8.0.0/bin/mri_robust_register)
```

Huang's confirmed fix is to drop in the MCRv97-compiled `segmentNuclei`
from the FreeSurfer GitHub dev branch:

```bash
cp segmentNuclei_MCRv97 $FREESURFER_HOME/bin/segmentNuclei
chmod +x $FREESURFER_HOME/bin/segmentNuclei
```

MCR version reference:

| MCR version | MATLAB release |
|-------------|----------------|
| MCRv84      | R2018a         |
| MCRv97      | R2019b         |

> [!gotcha] The same GLIBCXX mismatch can affect any other
> MATLAB-compiled FreeSurfer binary on Ubuntu 20+. Pattern to check:
> `$FREESURFER_HOME/bin/<matlab_binary> 2>&1 | grep GLIBCXX`. FS 8.2.0
> ships these binaries rebuilt against MCRv97.

**Provenance:** Mailing list, 2025-03-12 to 2025-03-13 (Sadeghi
Shabestari / Huang). See
`raw/mailing-list/2025-03-segmentaan-requires-mcrv97-binary-update.md`.

**Related:** [[recon-all]]

---

### `segmentHA_T1.sh` on an HPC cluster fails with `error while loading shared libraries: …/SegSubField.mexa64: Permission denied` — what's wrong?

**Short answer:** SELinux is blocking the MCR from mapping shared
libraries out of `/tmp`; either redirect MCR's cache or switch to the
Python-based `mri_segment_subregions` (FS 7.3+).

**Detail:** The MATLAB Compiler Runtime extracts compiled MEX files to
`/tmp/MCR_NNNNNNNN/` at startup. On HPC clusters with SELinux
enforcing (or any system where `/tmp` is mounted `noexec`), the
dynamic linker is denied permission to map those `.mexa64` files —
even though `ls` shows them and the file permissions look fine. The
error message is misleading:

```
error while loading shared libraries: /tmp/MCR_65032579/.mcrCache8.4/.../SegSubField.mexa64:
  failed to map segment from shared object: Permission denied
```

Three workarounds:

1. **Switch to the Python pipeline (recommended):** the
   subregion-segmentation tooling has been Python-based since FS 7.3.
   No MCR is involved at all.
   ```bash
   mri_segment_subregions hippo-amygdala --subject SUBJECT --sd $SUBJECTS_DIR
   ```
2. **Redirect MCR's cache:** point `MCR_CACHE_ROOT` at a directory
   where SELinux allows execution.
   ```bash
   export MCR_CACHE_ROOT=/path/to/exec-allowed/scratch
   ```
3. **Have HPC admins** add an SELinux policy allowing execute access
   to MCR's `/tmp` cache directory.

**Provenance:** Mailing list, 2023-06-13 to 2023-06-27 (Huang /
Iglesias / fsbuild). See
`raw/mailing-list/2023-06-hipposubfields-mexa64-selinux-hpc-error.md`.

**Related:** [[recon-all-clinical]],
[[synthseg-and-synthsr]]

---

## Version-specific installation bugs

### My `aseg.stats` shows `SegmentedTotalIntraCranialVolume` as 0.00 on FS 8.0.0 — is this right?

**Short answer:** No — it is a `csvprint` Python-3 packaging bug in
FS 8.0.0 / 8.0.0-beta; apply the `fs8_updates.sh` patch (or upgrade
to FS 8.2.0) and re-run.

**Detail:** During `autorecon1 -motioncor`, [[mri_synthseg]] writes
volumes to `stats/synthseg.vol.csv`. The bundled `csvprint` script
extracts the TIV from that CSV and writes it to
`stats/synthseg.tiv.dat`, which `mri_segstats` later reads to
populate `SegmentedTotalIntraCranialVolume` in [[aseg.stats]]. In
8.0.0 / 8.0.0-beta, `csvprint` was a Python-2 script that silently
fails under Python 3 — leaving `synthseg.tiv.dat` empty and producing
sTIV = 0.00. The Python-3-compatible `csvprint` lives in commit
`9a59bec` and is bundled in the official patch:

```bash
sudo FREESURFER_HOME=/usr/local/freesurfer/8.0.0 bash fs8_updates.sh
```

The same patch ships a number of related FS 8.0.0 fixes
(`-autorecon1` and `-nonuintensitycor` correctness, the new
`-no-fix-ga` flag, default-samseg switches in `gtmseg`, `xcerebralseg`
and `post-recon-all`, `xhemireg` updates, and a `surfa.image.transform`
parameter fix in `SamsegLongitudinal.py`). The patch does not change
recon-all output otherwise. Diagnose:

```bash
cat $SUBJECTS_DIR/SUBJECT/stats/synthseg.tiv.dat
# empty file ⇒ csvprint failed
```

FS 8.2.0 ships the Python-3 `csvprint` from the start.

**Provenance:** Mailing list, 2025-03-18 (fsbuild). See
`raw/mailing-list/2025-03-fs800-etiv-zero-csvprint-python3-bug.md`.

**Related:** [[aseg.stats]], [[synthseg.tiv.dat]],
[[synthseg.vol.csv]], [[recon-all]], [[mri_synthseg]]

---

### What does the FS 7.4.1 release actually fix?

**Short answer:** A single bug: MiDeFace under-segmenting the head
(over-aggressive defacing), worse on non-T1w contrasts.

**Detail:** Greve's release announcement is explicit that 7.4.1 is a
single-bug-fix release with no other changes. In 7.4.0, MiDeFace's
head-mask thresholds were sometimes set too high, causing the head
mask to under-cover the actual head — so the defacing tool removed
*more* of the face than intended. The bug was worse for non-T1w data
(T2, FLAIR). Greve explicitly noted that this "likely does not
compromise privacy" — the face was still concealed; the boundary was
just more aggressive than designed. Users running 7.4.0 who care about
the anatomical boundary of the defaced region (e.g. when re-using
data for other analyses) should re-deface under 7.4.1.

**Provenance:** Mailing list, 2023-06-20 (Greve). See
`raw/mailing-list/2023-06-freesurfer-741-mideface-bug-fix-release.md`.

**Related:** [[recon-all]]
