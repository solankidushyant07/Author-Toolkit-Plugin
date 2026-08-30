import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

/**
 * A CodeMirror extension that visually hides the <AT|H1> and </AT> tags 
 * in Live Preview, making it look like native Obsidian markdown.
 */
export const tagHiderLivePreview = ViewPlugin.fromClass(class {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		// Re-calculate when text changes or cursor moves
		if (update.docChanged || update.viewportChanged || update.selectionSet) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	buildDecorations(view: EditorView) {
		const builder = new RangeSetBuilder<Decoration>();
		const doc = view.state.doc;
		const selection = view.state.selection.main;

		for (const { from, to } of view.visibleRanges) {
			const text = doc.sliceString(from, to);
			
			// Match either the opening tag <AT|H1> or the closing tag </AT>
			const regex = /<AT\|(?:Heading|H[1-6])>|<\/AT>/g;
			let match;

			while ((match = regex.exec(text)) !== null) {
				const start = from + match.index;
				const end = start + match[0].length;

				// Find the start and end of the line the cursor is currently on
				const lineStart = doc.lineAt(start).from;
				const lineEnd = doc.lineAt(start).to;
				const isCursorOnLine = selection.from >= lineStart && selection.to <= lineEnd;

				// If the cursor is NOT on this line, hide the tags completely
				if (!isCursorOnLine) {
					builder.add(
						start,
						end,
						Decoration.replace({}) // Replacing with nothing makes it invisible
					);
				}
			}
		}
		
		return builder.finish();
	}
}, {
	decorations: v => v.decorations
});
