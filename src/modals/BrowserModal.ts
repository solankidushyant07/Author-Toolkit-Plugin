import { App, Modal, Setting, TFolder, TFile, Notice } from "obsidian";
import { FileIO } from "../utils/FileIO";

export type BrowserMode = "folder" | "file";

export class BrowserModal extends Modal {
	private currentPath: string;
	private manualPath: string;
	private mode: BrowserMode;
	private onSelect: (item: TFolder | TFile) => void;

	constructor(app: App, mode: BrowserMode, startPath: string, onSelect: (item: TFolder | TFile) => void) {
		super(app);
		this.mode = mode;
		
		// FIX: Safety net to ensure invalid starting paths fall back to root
		let checkPath = startPath.trim() === "" ? "/" : startPath.trim();
		if (!FileIO.getFile(app, checkPath)) {
			checkPath = "/";
		}
		
		this.currentPath = checkPath;
		this.manualPath = this.currentPath;
		this.onSelect = onSelect;
	}

	onOpen() {
		this.display();
	}

	display() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("at-browser-content");

		contentEl.createEl("h3", {
			text: this.mode === "folder" ? "📁 Select Destination Folder" : "📄 Select Template"
		});

		const breadcrumbContainer = contentEl.createDiv();
		breadcrumbContainer.addClass("at-browser-breadcrumbs");

		const createCrumb = (name: string, path: string) => {
			const crumb = breadcrumbContainer.createEl("span", {
				text: name
			});
			crumb.addClass("at-browser-breadcrumb");

			crumb.addEventListener("click", () => {
				this.currentPath = path;
				this.manualPath = path;
				this.display();
			});
		};

		createCrumb("Vault", "/");
		let accumulatedPath = "";
		const pathParts = this.currentPath.split("/").filter(p => p.length > 0);
		
		for (const part of pathParts) {
			breadcrumbContainer.createEl("span", {
				text: "/"
			}).addClass("at-browser-breadcrumb-separator");

			accumulatedPath += (accumulatedPath === "" ? "" : "/") + part;
			createCrumb(part, accumulatedPath);
		}

		new Setting(contentEl)
			.setName("Path:")
			.addText(text => {
				text.inputEl.addClass("at-browser-path-input");
				text
					.setValue(this.currentPath === "/" ? "" : this.currentPath)
					.onChange(val => this.manualPath = val);
			})
			.addButton(btn => btn
				.setButtonText("Go")
				.onClick(() => {
					const target = FileIO.getFile(this.app, this.manualPath === "" ? "/" : this.manualPath);
					if (target instanceof TFolder) {
						this.currentPath = target.path;
						this.display();
					} else {
						new Notice("Invalid folder path.");
					}
				})
			);

		const listContainer = contentEl.createDiv();
		listContainer.addClass("at-browser-list");

		const { folders, files } = FileIO.getImmediateChildren(this.app, this.currentPath);

		if (folders.length === 0 && (this.mode === "folder" || files.length === 0)) {
			listContainer.createDiv({
				text: "Folder is empty."
			}).addClass("at-browser-empty");
		}

		for (const folder of folders) {
			const itemEl = listContainer.createDiv();
			itemEl.addClass("at-browser-item");

			itemEl.createSpan({
				text: "📁"
			}).addClass("at-browser-item-icon");

			itemEl.createSpan({
				text: folder.name
			}).addClass("at-browser-folder-name");

			itemEl.addEventListener("click", () => {
				this.currentPath = folder.path;
				this.manualPath = folder.path;
				this.display();
			});
		}

		if (this.mode === "file") {
			for (const file of files) {
				const itemEl = listContainer.createDiv();
				itemEl.addClass("at-browser-item");

				itemEl.createSpan({
					text: "📄"
				}).addClass("at-browser-item-icon");

				itemEl.createSpan({
					text: file.basename
				}).addClass("at-browser-file-name");

				itemEl.addEventListener("click", () => {
					this.onSelect(file);
					this.close();
				});
			}
		}

		if (this.mode === "folder") {
			contentEl.createEl("br");
			new Setting(contentEl)
				.addButton(btn => btn
					.setButtonText(`Select "${this.currentPath === "/" ? "Vault Root" : this.currentPath.split('/').pop()}"`)
					.setCta()
					.onClick(() => {
						const targetFolder = FileIO.getFile(this.app, this.currentPath === "" ? "/" : this.currentPath);
						if (targetFolder instanceof TFolder) {
							this.onSelect(targetFolder);
							this.close();
						}
					})
				);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}