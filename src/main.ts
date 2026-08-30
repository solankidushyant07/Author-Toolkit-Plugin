import { Plugin, TFile } from "obsidian";

import { CreateNotesModal } from "./modals/CreateNotesModal";
import { CreateFoldersModal } from "./modals/CreateFoldersModal";
import { AddNotesLinksModal } from "./modals/AddNotesLinksModal";
import { CheatsheetModal } from "./modals/CheatsheetModal";
import { HistoryManager } from "./managers/HistoryManager";
import { FileOpenProcessor } from "./processors/FileOpenProcessor";
import { tagHiderLivePreview } from "./extensions/TagHiderExtension";
import {
	AuthorToolkitSettingTab,
	AuthorToolkitSettings,
	DEFAULT_SETTINGS,
} from "./settings";

export default class AuthorToolkitPlugin extends Plugin {
	settings!: AuthorToolkitSettings;

	async onload() {
		console.log("Author Toolkit loaded.");

		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("file-open", (file: TFile | null) => {
				if (file) {
					FileOpenProcessor.process(this.app, file);
				}
			})
		);

		this.registerEditorExtension(tagHiderLivePreview);

		this.addRibbonIcon(
			"file-plus",
			"Author Toolkit",
			() => {
				new CreateNotesModal(this.app, this).open();
			}
		);

		this.addCommand({
			id: "author-toolkit-create-notes",
			name: "Create Notes",
			callback: () => new CreateNotesModal(this.app, this).open(),
		});

		this.addCommand({
			id: "author-toolkit-create-folders",
			name: "Create Folders",
			callback: () => new CreateFoldersModal(this.app, this).open(),
		});

		this.addCommand({
			id: "author-toolkit-add-notes-links",
			name: "Add Notes Links",
			callback: () => new AddNotesLinksModal(this.app, this).open(),
		});

		this.addCommand({
			id: "author-toolkit-cheatsheet",
			name: "View Cheatsheet",
			callback: () => new CheatsheetModal(this.app).open(),
		});

		this.addCommand({
			id: "author-toolkit-undo",
			name: "Undo Last Toolkit Action",
			callback: () => HistoryManager.getInstance().undo(),
		});

		this.addCommand({
			id: "author-toolkit-redo",
			name: "Redo Last Toolkit Action",
			callback: () => HistoryManager.getInstance().redo(),
		});

		this.addSettingTab(new AuthorToolkitSettingTab(this.app, this));
	}

	onunload() {
		console.log("Author Toolkit unloaded.");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}