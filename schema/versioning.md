# Versioning

The wiki documents one FreeSurfer version at a time (currently
`$FREESURFER_VERSION` = 8.2.0). When FreeSurfer releases a new version, we do
**not** throw away the old documentation — we freeze it and serve every
released version side by side, NumPy-docs style, with a version switcher.

This file defines the mechanism and the **version-bump operation** the agent
runs when the target version changes.

```
Model:  the live vault on disk  = the CURRENT version only
        each released version    = an immutable git tag
        the published website    = all versions, newest at the root,
                                    older ones under /<version>/ subpaths
```

There is no `versions/` directory in the vault — keeping every version as
folders would bloat the repo and shatter the Obsidian graph. History lives in
git; the site is rebuilt from tags.

---

## Lifecycle: nightly edits vs. version freezes (read this first)

A common confusion: **you do not tag every change.** Tagging is a once-per-
FreeSurfer-release event, not a per-commit event. There are only two kinds of
change, and they are handled completely differently:

| | Nightly editing (the common case) | Version freeze (rare) |
|--|--|--|
| **What** | fixing a page, adding a tool, mining a thread — any change to the **current** version's docs | a new FreeSurfer release makes the old version no longer current |
| **How often** | continuously, many times a day | once per FreeSurfer release (e.g. once every 6–18 months) |
| **Action** | ordinary `git commit` + push to `main` | `git tag v<old>-wiki`, then retarget `main` to the new version |
| **What the site does** | the GitHub Action rebuilds **"latest"** (the site root) from `main` | a new immutable `/<old>/` subtree appears; the root moves to the new version |

So for the entire time **8.2.0 is the current version**, the wiki for 8.2.0 is
just `main`. Every nightly improvement is a normal commit; the published
"latest" site at the root is rebuilt on each push, exactly like the
single-version flow in `DISTRIBUTION.md`. **No tags are created during this
period**, and there is no separate `/8.2.0/` subtree yet — while a version is
current, *latest IS that version*, served at the root. Git already preserves
the full nightly history (every commit), so nothing is lost.

The **only** time you tag is when 8.2.0 stops being current — i.e. when you
bump to 9.0.0. At that single moment you run `git tag v8.2.0-wiki` to freeze
the final 8.2.0 state, and from then on `/8.2.0/` is served as an immutable
snapshot while the root tracks 9.0.0. In NumPy terms: the root is "stable +
dev" rolled into one (it is always the best current docs), and the `/<version>/`
subtrees are the archived past releases.

> [!gotcha] You never need `build_versioned_site.sh` until the first freeze
> While only one version has ever been current (no `v*-wiki` tags exist yet),
> the plain single-version Quartz deploy (build `main` → root) is all you need;
> `build_versioned_site.sh` detects the no-tags case and simply builds `main`
> as "latest". The multi-version machinery only does extra work once at least
> one version has been frozen.

---

## URL layout

| URL | Serves |
|-----|--------|
| `https://<org>.github.io/freesurfer-wiki/` | the **latest** version (current `main`) |
| `https://<org>.github.io/freesurfer-wiki/8.2.0/` | the 8.2.0 snapshot (tag `v8.2.0-wiki`) |
| `https://<org>.github.io/freesurfer-wiki/7.4.1/` | the 7.4.1 snapshot (tag `v7.4.1-wiki`) |

A **version switcher** (top of every page) lets the reader jump between them;
it stays on the same logical page where one exists in the target version.

---

## Tagging convention

Each released version of the wiki is a git tag:

```
v<FS_VERSION>-wiki          e.g.  v8.2.0-wiki,  v7.4.1-wiki
```

- The `-wiki` suffix distinguishes a *wiki release* tag from any upstream
  FreeSurfer source tag (`v8.2.0`) that a maintainer might also fetch into the
  same clone.
- The tag points at the commit where the wiki for that version was considered
  final (or "good enough to freeze"). It is immutable; later fixes to an old
  version go on a maintenance branch and get a new tag (below).

### Branches

| Branch | Purpose |
|--------|---------|
| `main` (or `master`) | the current version under active maintenance |
| `wiki/<version>` | optional: back-port branch for fixing an already-frozen version. Cut from its `v<version>-wiki` tag; re-tag as `v<version>-wiki.1`, `.2`, … after fixes |

Most fixes only ever touch `main`. Back-port branches exist only when an
error in, say, the 7.4.1 docs is worth correcting after 8.2.0 became current.

---

## The version pivot: `fs_version` frontmatter

Every page carries `fs_version: "<x.y.z>"`. This is the hook that makes
migration tractable:

- It records which FreeSurfer version a page was last verified against.
- After a bump, a page still showing the **old** version has not yet been
  re-checked — it is migration debt, and `lint.py` (check L3) flags any page
  that still contains the literal `$FREESURFER_VERSION` placeholder.
- The site build reads it to stamp "Documented for FreeSurfer X.Y.Z" on the
  page and to detect drift.

> [!important] Never commit the literal `$FREESURFER_VERSION` to a wiki page.
> Templates carry the placeholder; the agent substitutes the concrete version
> at page-creation time. `tools/audit/lint.py` fails CI (L3) if an unexpanded
> placeholder reaches `wiki/`.

---

## The version-bump operation

Run this when a new FreeSurfer version becomes the documentation target (the
human maintainer initiates it; the agent executes and reports).

### 1. Freeze the outgoing version

```bash
# main currently documents the OLD version (e.g. 8.2.0). Tag it.
git tag -a v8.2.0-wiki -m "FreeSurfer wiki, frozen at 8.2.0"
git push origin v8.2.0-wiki
```

### 2. Point the environment at the new source

```bash
# edit configure.sh
export FREESURFER_SOURCE=/path/to/freesurfer-v9.0.0
export FREESURFER_VERSION=9.0.0
source ./configure.sh
```

`add_github_links.py` and `lint.py` read these from the environment, so their
GitHub permalinks and checks retarget automatically (no code edits).

### 3. Diff the source and build a re-ingestion worklist

This is the heart of migration — do **not** re-read every page from scratch.
Let the tooling tell you what actually changed:

```bash
# a) flag tool pages whose documented flags drifted against the new source
FREESURFER_SOURCE=$NEW_SRC python3 tools/audit/cli_audit.py > queries/cli-audit-9.0.0.txt

# b) compare the two source trees for added/removed/renamed tools
diff <(ls $OLD_SRC/<tool-dirs>) <(ls $NEW_SRC/<tool-dirs>)
```

The worklist is: (a) every page flagged by `cli_audit` for new/removed flags,
(b) tools that appeared or disappeared, (c) pages whose `source_files` no
longer exist in the new tree.

### 4. Re-verify and re-stamp

For each page on the worklist:

1. Re-read the relevant new source; update flags, line numbers, behaviour.
2. Update GitHub permalinks (run `add_github_links.py` — version is now 9.0.0).
3. Bump the page's `fs_version` to the new version.
4. Add a `[!contradiction]` callout where 9.0.0 behaviour differs from 8.2.0,
   if the difference is worth calling out to a reader migrating workflows.

Pages **not** on the worklist keep documenting unchanged behaviour; bump their
`fs_version` in bulk only after a spot-check, or leave the old value as an
honest "last verified against" marker.

### 5. Update the inventory and regenerate the manifest

```bash
# index.md target line, and the versions manifest the switcher reads
python3 tools/version/gen_versions_manifest.py --latest 9.0.0 > content/versions.json
```

### 6. Log it

```markdown
## [YYYY-MM-DD] version-bump | 8.2.0 -> 9.0.0
- Tagged v8.2.0-wiki at <sha>
- cli_audit flagged N pages with flag drift; re-ingested M
- K tools added, J removed in 9.0.0
- Regenerated versions.json (latest=9.0.0)
```

---

## How the site builds all versions

`tools/version/build_versioned_site.sh` orchestrates a multi-version Quartz
build (run in, or by, the published Quartz repo). For each tag `v*-wiki` it:

1. checks out the dev vault at that tag into a temp worktree,
2. runs `publish.sh` to stage that version's `content/`,
3. builds Quartz with `baseUrl …/<version>/` into `public/<version>/`,
4. builds the newest version a second time into `public/` (the root = latest),
5. writes `public/versions.json` from `gen_versions_manifest.py`.

The **VersionSelector** Quartz component (`tools/version/VersionSelector.tsx`,
to be copied into the Quartz repo's `quartz/components/`) fetches
`versions.json` and renders the dropdown. See that file's header for install
steps.

A GitHub Action (`tools/version/deploy-versioned.yml`, template) runs the build
on every push to `main` **and** on every new `v*-wiki` tag, then deploys
`public/` to GitHub Pages. Because old versions come from immutable tags, a
push to `main` only rebuilds the latest subtree plus the root; tagged subtrees
are reproduced identically each run.

---

## What the switcher does on a missing page

A page may exist in 8.2.0 but not in 9.0.0 (a removed tool), or vice-versa.
The switcher resolves the target URL as: *same slug under the target version's
path*; the build also writes a `pages.json` per version (the list of slugs) so
the component can detect a miss and fall back to that version's landing page
rather than emitting a 404. See `VersionSelector.tsx`.
