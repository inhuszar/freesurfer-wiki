# FreeSurfer Documentation Project (FDP) — Reader Mode

## What This Is

This is the FreeSurfer Documentation Project wiki — a comprehensive,
interlinked knowledge base documenting the FreeSurfer neuroimaging
software suite. You are using it in **reader mode**: the agent can
query the wiki to answer your questions and archive substantive Q&A,
but will not modify the wiki pages themselves.

## Your Role

You are a **reader and questioner**. Ask anything about FreeSurfer:
tools, workflows, file formats, coordinate systems, configuration
options, gotchas. The agent will search the wiki, synthesise an answer,
and cite the relevant pages.

## What the Agent Can Do

- **Read** any file in `wiki/`, `index.md`, `schema/`, `templates/`
- **Answer questions** by synthesising information across wiki pages
- **Investigate source code** at `$FREESURFER_SOURCE` if the wiki
  doesn't have the answer (if this variable is set)
- **Archive Q&A** to `raw/dialogue/` when the conversation produces
  substantive new knowledge (see `schema/faq-and-learning.md`)

## What the Agent Must NOT Do

- **Do NOT modify** any file in `wiki/`, including creating new pages
- **Do NOT modify** `index.md`, `log.md`, or any file in `schema/`
- **Do NOT modify** any file in `templates/`
- **Do NOT modify** any file in `raw/mailing-list/` or `raw/wiki-snapshots/`
- The only directory the agent may write to is `raw/dialogue/`

## Environment

```bash
$FREESURFER_SOURCE    # optional: path to FreeSurfer source tree
$FREESURFER_VERSION   # target version (e.g., 8.2.0)
```

## How to Answer Questions

1. Read `index.md` to locate relevant wiki pages
2. Read those pages to find the answer
3. If multiple pages are needed, synthesise the information
4. If the wiki doesn't have the answer but `$FREESURFER_SOURCE` is set,
   investigate the source code
5. If you still can't find the answer, say so clearly — do not guess
6. Cite wiki pages using `[[wikilinks]]` in your answer
7. If the Q&A is substantive (see below), archive it

## When to Archive a Q&A

Archive to `raw/dialogue/` when ALL of these are true:
- The user asked a genuine question (not a command)
- Answering required consulting multiple pages or source code
- The answer would be useful to other FreeSurfer users

See `schema/faq-and-learning.md` for the archive file format and
naming convention (`{unix_timestamp}-{username}-{question-slug}.md`).

**Do NOT archive:** simple lookups answered by one page, clarification
questions, or user-specific issues.

## Source Priority

```
Wiki pages  →  FAQ pages  →  Source code  →  Agent training data
```

## Contributing Your Q&A Archives

If you've accumulated useful dialogue archives and want to share them:

```bash
git checkout -b dialogue/$USER-$(date +%Y-%m)
git add raw/dialogue/
git commit -m "Added new dialogue archives"
git push origin dialogue/$USER-$(date +%Y-%m)
# Then open a pull request on GitHub
```

A maintainer will review your archives and may incorporate the knowledge
into the wiki's FAQ pages.
