import { App, normalizePath, TFile } from "obsidian";
import { FileIO } from "../utils/FileIO";

export type CollisionStrategy = "rename" | "skip" | "replace" | "cancel";

export interface NoteCreationResult {
	success: number;
	failed: number;
	failedDetails: { name: string, reason: string }[];
}

export class NoteCreator {
	
	static async createNotes(
		app: App, 
		parentPath: string, 
		count: number, 
		templateFile: TFile | null, 
		names: string[], 
		fallbackPrefix: string, 
		strategy: CollisionStrategy
	): Promise<NoteCreationResult> {
		
		let successCount = 0;
		let failedCount = 0;
		const failedDetails: { name: string, reason: string }[] = [];
		
		// Obsidian/OS illegal characters
		const invalidCharRegex = /[\\/:"*?<>|]/;

		if (parentPath) {
			try { await FileIO.createFolderIfNotExists(app, parentPath); } 
			catch (error) { console.error("Author Toolkit:", error); }
		}

		let templateContent = "";
		if (templateFile) {
			templateContent = await FileIO.readFile(app, templateFile);
		}

		const safePrefix = fallbackPrefix.trim() || "Untitled";

		for (let i = 0; i < count; i++) {
			try {
				let noteName = "";
				const currentName = names[i];
				
				if (currentName !== undefined && currentName.trim() !== "") {
					noteName = currentName.trim();
				} else {
					noteName = `${safePrefix} ${i + 1}`;
				}

				// Validation Catch
				if (invalidCharRegex.test(noteName)) {
					failedCount++;
					failedDetails.push({ name: noteName, reason: "Contains invalid characters (\\, /, :, *, ?, \", <, >, |)" });
					continue;
				}

				const defaultPath = parentPath 
					? normalizePath(`${parentPath}/${noteName}.md`) 
					: normalizePath(`${noteName}.md`);
				
				const existingFile = FileIO.getFile(app, defaultPath);

				if (existingFile) {
					if (strategy === "cancel") {
						break;
					} 
					else if (strategy === "skip") {
						failedCount++;
						failedDetails.push({ name: noteName, reason: "File already exists (Skipped based on settings)" });
						continue;
					} 
					else if (strategy === "replace") {
						if (existingFile instanceof TFile) {
							await FileIO.overwriteNote(app, existingFile, templateContent);
							successCount++;
						} else {
							failedCount++;
							failedDetails.push({ name: noteName, reason: "A folder with this name already exists" });
						}
					} 
					else if (strategy === "rename") {
						const uniquePath = FileIO.getUniquePath(app, parentPath, noteName, ".md");
						await FileIO.createNote(app, uniquePath, templateContent);
						successCount++;
					}
				} else {
					await FileIO.createNote(app, defaultPath, templateContent);
					successCount++;
				}

			} catch (error) {
				console.error(`Author Toolkit: Failed to create note #${i + 1}`, error);
				failedCount++;
				failedDetails.push({ name: names[i] || `Note ${i + 1}`, reason: "Unknown system error" });
			}
		}

		return { success: successCount, failed: failedCount, failedDetails };
	}
}
