import { App, normalizePath, TAbstractFile, TFile, TFolder } from "obsidian";

export class FileIO {
	
	static getFile(app: App, path: string): TAbstractFile | null {
		const normalizedPath = normalizePath(path);
		return app.vault.getAbstractFileByPath(normalizedPath);
	}

	static async createFolderIfNotExists(app: App, folderPath: string): Promise<void> {
		if (!folderPath || folderPath.trim() === "" || folderPath === "/") {
			return; 
		}
		
		const normalizedPath = normalizePath(folderPath);
		const folder = this.getFile(app, normalizedPath);
		
		if (!folder) {
			await app.vault.createFolder(normalizedPath);
		}
	}

	static async createNote(app: App, path: string, content: string = ""): Promise<TFile> {
		const normalizedPath = normalizePath(path);
		return await app.vault.create(normalizedPath, content);
	}

	static async overwriteNote(app: App, file: TFile, content: string = ""): Promise<void> {
		await app.vault.modify(file, content);
	}

	static async trashFile(app: App, file: TAbstractFile): Promise<void> {
		await app.vault.trash(file, true);
	}

	static getUniquePath(app: App, folder: string, baseName: string, extension: string = ""): string {
		let attempt = 1;
		let currentName = `${baseName}${extension}`;
		let currentPath = folder 
			? normalizePath(`${folder}/${currentName}`) 
			: normalizePath(currentName);

		while (this.getFile(app, currentPath)) {
			attempt++;
			currentName = `${baseName} (${attempt})${extension}`;
			currentPath = folder 
				? normalizePath(`${folder}/${currentName}`) 
				: normalizePath(currentName);
		}

		return currentPath;
	}

	/**
	 * FIXED: Now strictly grabs the folder of the currently active note without getting confused.
	 */
	static getActiveFolder(app: App): string {
		const activeFile = app.workspace.getActiveFile();
		if (activeFile && activeFile.parent) {
			return activeFile.parent.path === "/" ? "" : activeFile.parent.path;
		}
		return "";
	}

	static getAllFolders(app: App): TFolder[] {
		return app.vault.getAllLoadedFiles().filter((f): f is TFolder => f instanceof TFolder);
	}

	static getMarkdownFilesInFolder(app: App, folderPath: string): TFile[] {
		const folder = this.getFile(app, folderPath);
		const resultFiles: TFile[] = [];

		if (folder instanceof TFolder) {
			for (const child of folder.children) {
				if (child instanceof TFile && child.extension === "md") {
					resultFiles.push(child);
				} 
				else if (child instanceof TFolder) {
					const innerNotePath = normalizePath(`${child.path}/${child.name}.md`);
					const innerNote = this.getFile(app, innerNotePath);
					if (innerNote instanceof TFile) {
						resultFiles.push(innerNote);
					}
				}
			}
			return resultFiles.sort((a, b) => a.basename.localeCompare(b.basename));
		}
		return [];
	}

	static getAllMarkdownFiles(app: App): TFile[] {
		return app.vault.getMarkdownFiles();
	}

	static async readFile(app: App, file: TFile): Promise<string> {
		return await app.vault.read(file);
	}

	static async appendToFile(app: App, file: TFile, content: string): Promise<void> {
		await app.vault.process(file, (data) => {
			const separator = data.length > 0 && !data.endsWith('\n') ? '\n\n' : (data.length > 0 ? '\n' : '');
			return data + separator + content;
		});
	}

	static getImmediateChildren(app: App, folderPath: string): { folders: TFolder[], files: TFile[] } {
		const targetPath = folderPath.trim() === "" ? "/" : normalizePath(folderPath);
		const folder = this.getFile(app, targetPath);
		
		const folders: TFolder[] = [];
		const files: TFile[] = [];

		if (folder instanceof TFolder) {
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					folders.push(child);
				} else if (child instanceof TFile && child.extension === "md") {
					files.push(child);
				}
			}
		}

		folders.sort((a, b) => a.name.localeCompare(b.name));
		files.sort((a, b) => a.basename.localeCompare(b.basename));

		return { folders, files };
	}
}
