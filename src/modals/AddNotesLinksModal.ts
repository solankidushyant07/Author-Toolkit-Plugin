import {
	App,
	Modal,
	Setting,
	Notice,
	TextComponent,
	TFolder,
	TFile,
} from "obsidian";
import {
	LinkGenerator,
	LinkFormat,
} from "../creators/LinkGenerator";
import { FileIO } from "../utils/FileIO";
import { BrowserModal } from "./BrowserModal";
import type AuthorToolkitPlugin from "../main";

export class AddNotesLinksModal extends Modal {

	private sourceFolder: string = "";
	private targetFile: TFile | null = null;
	private linkFormat: LinkFormat;

	constructor(
		app: App,
		private plugin: AuthorToolkitPlugin
	) {
		super(app);

		this.linkFormat =
			plugin.settings.defaultLinkFormat;

		this.sourceFolder =
			FileIO.getActiveFolder(app);
	}

	onOpen() {
		this.display();
	}

	display() {
		const { contentEl } = this;

		contentEl.addClass(
			"at-add-links-content"
		);

		contentEl.empty();

		contentEl.createEl("h2", {
			text: "🔗 Add Notes Links",
		});

		// 1. Source Folder
		let folderInputComponent: TextComponent;

		new Setting(contentEl)
			.setName("Source Folder")
			.setDesc(
				"The folder containing the notes you want to link."
			)
			.addText((text) => {
				folderInputComponent =
					text;

				text
					.setPlaceholder("Root (/)")
					.setValue(
						this.sourceFolder
					)
					.onChange((value) => {
						this.sourceFolder =
							value.trim();
					});
			})
			.addButton((btn) =>
				btn
					.setButtonText(
						"Browse"
					)
					.onClick(() => {
						new BrowserModal(
							this.app,
							"folder",
							this.sourceFolder,
							(selectedItem) => {
								const selectedFolder =
									selectedItem as TFolder;

								this.sourceFolder =
									selectedFolder.path ===
									"/"
										? ""
										: selectedFolder.path;

								folderInputComponent.setValue(
									this.sourceFolder
								);
							}
						).open();
					})
			);

		// 2. Target File
		let fileInputComponent: TextComponent;

		new Setting(contentEl)
			.setName("Target Note")
			.setDesc(
				"The note where the links will be generated."
			)
			.addText((text) => {
				fileInputComponent =
					text;

				text
					.setPlaceholder(
						"Select a note..."
					)
					.setValue(
						this.targetFile
							? this.targetFile.path
							: ""
					)
					.setDisabled(true);
			})
			.addButton((btn) =>
				btn
					.setButtonText(
						"Browse"
					)
					.onClick(() => {
						const startPath =
							this.targetFile &&
							this.targetFile.parent
								? this.targetFile
										.parent
										.path
								: "/";

						new BrowserModal(
							this.app,
							"file",
							startPath,
							(selectedItem) => {
								this.targetFile =
									selectedItem as TFile;

								if (
									this.targetFile
								) {
									fileInputComponent.setValue(
										this.targetFile.path
									);
								}
							}
						).open();
					})
			);

		// 3. Link Format
		new Setting(contentEl)
			.setName("List Format")
			.setDesc(
				"How should the links be formatted?"
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(
						"bullet",
						"Bullet List (- [[Note]])"
					)
					.addOption(
						"number",
						"Numbered List (1. [[Note]])"
					)
					.setValue(
						this.linkFormat
					)
					.onChange(
						(value: string) => {
							this.linkFormat =
								value as LinkFormat;
						}
					);
			});

		// 4. Submit Button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(
						"Generate Links"
					)
					.setCta()
					.onClick(async () => {
						if (
							!this.targetFile
						) {
							new Notice(
								"Please select a target note first."
							);
							return;
						}

						this.close();

						const count =
							await LinkGenerator.addNotesLinks(
								this.app,
								this.sourceFolder,
								this.targetFile,
								this.linkFormat
							);

						if (count > 0) {
							new Notice(
								`✅ Added ${count} links to ${this.targetFile.basename}.`
							);
						} else {
							new Notice(
								"No new links added. (Maybe they are already there?)"
							);
						}
					})
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}