import { App, normalizePath, TFolder, TFile } from "obsidian";
import { FileIO } from "../utils/FileIO";
import { CollisionStrategy } from "./NoteCreator";
import { HistoryManager } from "../managers/HistoryManager";

export interface FolderCreationResult {
	success: number;
	failed: number;
	failedDetails: { name: string, reason: string }[];
}

export class FolderCreator {
	
	static async createAdvancedFolders(
		app: App, 
		parentPath: string, 
		folderCount: number, 
		folderNames: string[], 
		folderFallbackPrefix: string,
		strategy: CollisionStrategy,
		notesPerFolder: number,
		noteFallbackPrefix: string
	): Promise<FolderCreationResult> {
		
		let successCount = 0;
		let failedCount = 0;
		const failedDetails: { name: string, reason: string }[] = [];
		
		const createdFolders: string[] = [];
		const createdNotes: string[] = [];
		
		const invalidCharRegex = /[\\/:"*?<>|]/;

		if (parentPath) {
			try { await FileIO.createFolderIfNotExists(app, parentPath); } 
			catch (error) { console.error("Author Toolkit:", error); }
		}

		const safeFolderPrefix = folderFallbackPrefix.trim() || "Folder";
		const safeNotePrefix = noteFallbackPrefix.trim() || "Untitled";

		for (let i = 0; i < folderCount; i++) {
			try {
				let folderName = "";
				const currentName = folderNames[i];
				
				if (currentName !== undefined && currentName.trim() !== "") {
					folderName = currentName.trim();
				} else {
					folderName = `${safeFolderPrefix} ${i + 1}`;
				}

				if (invalidCharRegex.test(folderName)) {
					failedCount++;
					failedDetails.push({ name: folderName, reason: "Contains invalid characters (\\, /, :, *, ?, \", <, >, |)" });
					continue;
				}

				const defaultPath = parentPath 
					? normalizePath(`${parentPath}/${folderName}`) 
					: normalizePath(`${folderName}`);
				
				let finalFolderPath = defaultPath;
				let folderSucceeded = false;
				
				const existingFile = FileIO.getFile(app, defaultPath);

				if (existingFile) {
					if (strategy === "cancel") {
						break; 
					}
					else if (strategy === "skip") { 
						failedCount++; 
						failedDetails.push({ name: folderName, reason: "Folder already exists (Skipped)" });
						continue; 
					} 
					else if (strategy === "replace") {
						if (existingFile instanceof TFolder) {
							folderSucceeded = true;
						} else {
							await FileIO.trashFile(app, existingFile);
							await app.vault.createFolder(defaultPath);
							createdFolders.push(defaultPath);
							folderSucceeded = true;
						}
					} 
					else if (strategy === "rename") {
						const uniquePath = FileIO.getUniquePath(app, parentPath, folderName, "");
						await app.vault.createFolder(uniquePath);
						finalFolderPath = uniquePath;
						createdFolders.push(uniquePath);
						folderSucceeded = true;
					}
				} else {
					await app.vault.createFolder(defaultPath);
					createdFolders.push(defaultPath);
					folderSucceeded = true;
				}

				if (folderSucceeded) {
					successCount++;

					if (notesPerFolder > 0) {
						const actualNoteCount = Math.min(notesPerFolder, 25);
						for (let j = 1; j <= actualNoteCount; j++) {
							const noteName = `${safeNotePrefix} ${j}`;
							const notePath = normalizePath(`${finalFolderPath}/${noteName}.md`);
							
							if (!FileIO.getFile(app, notePath)) {
								await FileIO.createNote(app, notePath, "");
								createdNotes.push(notePath);
							}
						}
					}
				}

			} catch (error) {
				console.error(`Author Toolkit: Failed to create folder #${i + 1}`, error);
				failedCount++;
				failedDetails.push({ name: folderNames[i] || `Folder ${i + 1}`, reason: "Unknown system error" });
			}
		}

		if (createdFolders.length > 0 || createdNotes.length > 0) {
			HistoryManager.getInstance().push({
				description: `Create ${successCount} folders with notes`,
				undo: async () => {
					for (const notePath of createdNotes) {
						const f = FileIO.getFile(app, notePath);
						if (f instanceof TFile) await FileIO.trashFile(app, f);
					}
					for (const folderPath of createdFolders) {
						const f = FileIO.getFile(app, folderPath);
						if (f instanceof TFolder) await FileIO.trashFile(app, f);
					}
				},
				redo: async () => {
					for (const folderPath of createdFolders) {
						if (!FileIO.getFile(app, folderPath)) {
							await app.vault.createFolder(folderPath);
						}
					}
					for (const notePath of createdNotes) {
						if (!FileIO.getFile(app, notePath)) {
							await FileIO.createNote(app, notePath, "");
						}
					}
				}
			});
		}

		return { success: successCount, failed: failedCount, failedDetails };
	}
}
