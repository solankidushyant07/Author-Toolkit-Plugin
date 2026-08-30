import { App, TFile } from "obsidian";

export class FileOpenProcessor {
	
	static async process(app: App, file: TFile) {
		if (file.extension !== "md") return;

		let content = await app.vault.read(file);
		
		if (!content.includes("<AT|")) return;

		const fileCache = app.metadataCache.getFileCache(file);
		const headings = fileCache?.headings || [];

		const lines = content.split('\n');
		let contentChanged = false;
		
		// Matches an empty tag <AT|H1> OR an already filled tag <AT|H1>Text</AT>
		const tagRegex = /<AT\|(Heading|H[1-6])>(?:.*?<\/AT>)?/g;

		for (let i = 0; i < lines.length; i++) {
			const currentLine = lines[i];
			if (currentLine === undefined) continue;

			const newLine = currentLine.replace(tagRegex, (match, tagType) => {
				
				let targetLevel = 0; 
				if (tagType !== "Heading") {
					targetLevel = parseInt(tagType.replace("H", ""));
				}

				let nearestHeading = "";
				for (let h = headings.length - 1; h >= 0; h--) {
					const heading = headings[h];
					
					if (heading && heading.position && heading.position.start.line < i) {
						if (targetLevel === 0 || heading.level === targetLevel) {
							nearestHeading = heading.heading;
							break;
						}
					}
				}

				if (!nearestHeading) {
					nearestHeading = file.basename;
				}

				// Rebuild the wrapper with the visible text safely inside
				return `<AT|${tagType}>${nearestHeading}</AT>`;
			});
			
			if (currentLine !== newLine) {
				lines[i] = newLine;
				contentChanged = true;
			}
		}

		if (contentChanged) {
			await app.vault.modify(file, lines.join('\n'));
		}
	}
}
