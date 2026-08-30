import { App, TFile } from "obsidian";
import { FileIO } from "../utils/FileIO";
import { HistoryManager } from "../managers/HistoryManager";

export type LinkFormat = "bullet" | "number";

export class LinkGenerator {
	
	static async addNotesLinks(app: App, sourceFolder: string, targetFile: TFile, format: LinkFormat): Promise<number> {
		const files = FileIO.getMarkdownFilesInFolder(app, sourceFolder);
		
		if (files.length === 0) {
			return 0; 
		}

		// Snapshot the original content for the Undo stack
		const originalContent = await FileIO.readFile(app, targetFile);

		let linksText = "";
		let addedCount = 0;
		
		files.forEach((file) => {
			if (file.path !== targetFile.path) {
				
				const exactLink = `[[${file.basename}]]`;
				const aliasedLink = `[[${file.basename}|`;

				if (!originalContent.includes(exactLink) && !originalContent.includes(aliasedLink)) {
					addedCount++;
					if (format === "number") {
						linksText += `${addedCount}. [[${file.basename}]]\n`;
					} else {
						linksText += `- [[${file.basename}]]\n`;
					}
				}
			}
		});

		if (linksText.length > 0) {
			await FileIO.appendToFile(app, targetFile, linksText);
			
			// Snapshot the new content for the Redo stack
			const newContent = await FileIO.readFile(app, targetFile);

			// Register with History Manager
			HistoryManager.getInstance().push({
				description: `Add ${addedCount} links to ${targetFile.basename}`,
				undo: async () => { 
					await FileIO.overwriteNote(app, targetFile, originalContent); 
				},
				redo: async () => { 
					await FileIO.overwriteNote(app, targetFile, newContent); 
				}
			});
		}

		return addedCount;
	}
}
