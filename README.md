# Author Toolkit

Author Toolkit is a personal Obsidian plugin built for **novel writing, worldbuilding, and note organization**.

It focuses on repetitive file-management tasks that are useful when
building a large writing project: creating notes and folders in batches,
generating links between notes, navigating folders through a simple file
browser, and using invisible heading-based tags.

The plugin works directly with the files in your Obsidian vault. It does
not require a cloud service.

---
## What Author Toolkit does

### 1. Create Notes

**Command:** `Create Notes`

Creates multiple Markdown notes at once.

Available creation modes:

-   **Templated Notes** --- create notes using an existing Markdown
    template.
-   **Named Notes** --- provide names for the notes.
-   **Blank Notes** --- create empty notes.

Other options include:

-   Destination folder
-   Number of notes
-   Fallback naming
-   Collision handling
-   Template selection
-   Multiple names entered line-by-line

The active note's folder is used as the initial destination when the
modal opens.

### Naming behavior

When names are supplied, each non-empty line becomes a note name.

Empty entries use the fallback prefix.

For example:

``` text
Alice
Bob

David
```

with the fallback prefix `Character` produces:

``` text
Alice.md
Bob.md
Character 3.md
David.md
```

Invalid file characters are rejected:

``` text
\ / : * ? " < > |
```

------------------------------------------------------------------------

## 2. Create Folders

**Command:** `Create Folders`

Creates multiple folders at once.

Available modes:

-   **Named Folders**
-   **Blank Folders**

You can also:

-   Choose a destination folder
-   Create multiple folders
-   Provide names line-by-line
-   Use fallback folder names
-   Choose what happens when a folder already exists
-   Optionally generate notes inside the newly created folders

### Notes inside folders

The folder creator can populate each created folder with a selected
number of blank notes.

The current implementation limits this automatic note generation to **25
notes per folder**.

------------------------------------------------------------------------

## 3. Add Notes Links

**Command:** `Add Notes Links`

Generates Markdown links to notes contained in a selected source folder
and adds them to a target note.

Supported formats:

### Bullet list

``` markdown
- [[Character A]]
- [[Character B]]
- [[Character C]]
```

### Numbered list

``` markdown
1. [[Character A]]
2. [[Character B]]
3. [[Character C]]
```

The generator:

-   Reads Markdown files from the selected folder.
-   Also recognizes a folder's same-name note in the current
    implementation.
-   Does not add the target note itself.
-   Checks for existing normal or aliased links before adding a link.
-   Appends new links to the target note.
-   Sorts discovered notes alphabetically.

This makes it useful for creating or maintaining folder/index notes.

------------------------------------------------------------------------

## 4. Folder / File Browser

Several tools use Author Toolkit's built-in browser instead of requiring
a raw path every time.

The browser can:

-   Navigate from the vault root.
-   Move through folders.
-   Show breadcrumbs.
-   Enter a folder path manually.
-   Select folders as destinations.
-   Select Markdown files as templates or targets.

This is intended to make file selection easier, particularly when
working on mobile.

------------------------------------------------------------------------

## 5. Cheatsheet

**Command:** `View Cheatsheet`

The cheatsheet provides copyable Author Toolkit tags.

Clicking a tag copies it to the clipboard.

Available tags:

``` text
<AT|Heading>5. Cheatsheet</AT>
<AT|H1>Author Toolkit</AT>
<AT|H2>5. Cheatsheet</AT>
<AT|H3>Numbered list</AT>
<AT|H4>ReadME</AT>
<AT|H5>ReadME</AT>
<AT|H6>ReadME</AT>
```

------------------------------------------------------------------------

# Native Invisible Tags

Author Toolkit includes a small tag system designed for structured
writing.

The tags are stored directly inside Markdown files, but the
closing/opening tag syntax is visually hidden in Obsidian Live Preview
when the cursor is not on the tagged line.

For example:

``` text
<AT|H1>Native Invisible Tags</AT>
```

can be automatically populated from the nearest matching heading.

## `<AT|Heading>Native Invisible Tags</AT>`

Uses the **nearest heading above the tag**, regardless of heading level.

Example:

``` markdown
# Characters

<AT|Heading>`<AT|Heading>Native Invisible Tags</AT>`</AT>
```

The stored tag becomes:

``` markdown
<AT|Heading>`<AT|Heading>Native Invisible Tags</AT>`</AT>
```

## `<AT|H1>Native Invisible Tags</AT>` through `<AT|H6>ReadME</AT>`

These target a specific heading level.

For example:

``` markdown
# Characters

## Main Character

<AT|H2>`<AT|H1>Native Invisible Tags</AT>` through `<AT|H6>ReadME</AT>`</AT>
```

becomes:

``` markdown
<AT|H2>`<AT|H1>Native Invisible Tags</AT>` through `<AT|H6>ReadME</AT>`</AT>
```

If no matching heading exists above the tag, the current note's filename
is used as the fallback.

### Important behavior

The tag processor runs when a Markdown file is opened.

The processor reads the file's heading metadata and updates
empty/already-populated Author Toolkit tags.

The underlying tags remain in the Markdown file. The CodeMirror
extension only changes how they are displayed in Live Preview.

This means the tags are **not merely visual formatting**. They are
actual Markdown text stored in the vault.

------------------------------------------------------------------------

# Undo and Redo

Author Toolkit has its own action history for supported operations.

Commands:

-   `Undo Last Toolkit Action`
-   `Redo Last Toolkit Action`

The history system currently keeps up to **50 actions** in memory.

Supported operations include actions such as:

-   Creating notes
-   Creating folders
-   Adding generated links

A new action clears the redo history.

> Undo/redo is Author Toolkit's own history system. It is separate from
> Obsidian's normal editor undo history.

------------------------------------------------------------------------

# Settings

Author Toolkit stores its settings using Obsidian's plugin data system.

The settings are intended to control **defaults**, rather than remove
the choices from individual modals.

## Templates Folder Path

Sets the default folder used when browsing for templates.

Example:

``` text
05 Templates
```

or:

``` text
Templates/Characters
```

When a template is selected, the browser can start from this location.

## Default Note Creation Mode

Controls which mode is selected when **Create Notes** opens.

Options:

-   Templated Notes
-   Named Notes
-   Blank Notes

## Default Folder Creation Mode

Controls which mode is selected when **Create Folders** opens.

Options:

-   Named Folders
-   Blank Folders

## Default Note Collision Strategy

Controls what happens when a note with the requested path already
exists.

Options:

-   **Rename** --- create a unique name such as `Note (2).md`.
-   **Skip** --- leave the existing file untouched and skip the new
    note.
-   **Replace** --- overwrite the existing note.
-   **Cancel** --- stop the operation.

## Default Folder Collision Strategy

Controls what happens when a folder with the requested path already
exists.

Options:

-   **Rename** --- create a unique folder name.
-   **Skip** --- leave the existing folder untouched.
-   **Use existing** --- continue using the existing folder.
-   **Cancel** --- stop the operation.

## Default Link Format

Controls the initial format selected by **Add Notes Links**.

Options:

-   Bullet List
-   Numbered List

---

# Feedback & Contact

Found a bug, have an idea, or want to see a feature added to Author Toolkit?

Feel free to reach out on Discord:

**Discord:** `coconutshell0610`

If you find a bug, please include as much information as possible, such as:

- What you were trying to do
- What happened
- What you expected to happen
- Any error message you received
- Steps to reproduce the problem, if possible

If there's a feature you'd like to see in Author Toolkit, let me know as well. User feedback helps determine which features are worth adding and improving.

**Discord:** `coconutshell0610`