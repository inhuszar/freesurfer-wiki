# GUI Application Documentation

## Why GUI Applications Need Different Templates

GUI tools like FreeView are fundamentally different from command-line
tools: their interface is a visual window with menus, toolbars, panels,
and interaction modes rather than flags and stdin/stdout. The existing
`tool-page.md` template does not accommodate this.

## GUI Application Hub Pages

Template: `templates/gui-application-page.md`

Required sections:

1. **Summary** — one paragraph describing the application
2. **Source info** — language, GUI toolkit, source directory
3. **Application overview** — high-level interface walkthrough
4. **Data types (layers)** — table linking to sub-pages
5. **Window layout** — menu bar, toolbar, side panel, viewing area, status bar
6. **Interaction modes** — table of all modes with links to detail pages
7. **Command-line interface** — link to dedicated CLI page
8. **Keyboard and mouse reference** — essentials here, full ref on sub-page
9. **Scripting and automation** — batch capabilities, command files
10. **Coordinate display conventions** — which coordinate systems appear where
11. **Gotchas and caveats**
12. **Confidence and gaps**

## GUI Panel Sub-Pages

Template: `templates/gui-panel-page.md`

One page per data type / panel / mode. Required sections:

1. **Overview**
2. **Loading data** — GUI path, CLI syntax, supported formats
3. **Panel controls** — every control: name, type, default, description
4. **Rendering options** — 2D and 3D
5. **Inline property syntax** — complete CLI property table
6. **Interactions with other layers**
7. **Editing capabilities** — link to editing page
8. **Saving**
9. **Gotchas**
10. **Confidence and gaps**

## FreeView Documentation Structure

```
wiki/tools/
├── freeview.md                  ← hub
├── freeview-volumes.md          ← volume layers
├── freeview-surfaces.md         ← surface layers
├── freeview-editing.md          ← editing modes
├── freeview-command-line.md     ← CLI reference
├── freeview-keyboard-mouse.md   ← keyboard/mouse reference
├── freeview-3d-view.md          ← 3D rendering
├── freeview-dti.md              ← DTI visualisation
└── freeview-pointsets.md        ← waypoints / control points
```

## Agent Behaviour for GUI Documentation

1. **Source priority:** Source code (MainWindow.cpp, LayerMRI.cpp, etc.)
   > `freeview --help` > FreeSurfer wiki FreeviewGuide pages > tutorial
   pages > training knowledge. The FreeviewGuide wiki was last edited
   2013–2017 and is severely outdated.

2. **Document every panel control.** Enumerate every QWidget / control
   in each panel class, mapping C++ member names to user-visible labels.

3. **Document the inline property syntax exhaustively.** The
   colon-separated property syntax is the most machine-queryable part.

4. **Cross-reference with coordinate systems.** Every place where
   coordinates are shown must link to `[[coordinate-systems]]` and
   specify which system.
