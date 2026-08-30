import { App, PluginSettingTab, Setting } from "obsidian";
import type AuthorToolkitPlugin from "./main";
import type { CollisionStrategy } from "./creators/NoteCreator";
import type { LinkFormat } from "./creators/LinkGenerator";

export type NoteCreationMode = "blank" | "named" | "templated";
export type FolderCreationMode = "blank" | "named";

export interface AuthorToolkitSettings {
	templatesFolderPath: string;
	defaultNoteCreationMode: NoteCreationMode;
	defaultFolderCreationMode: FolderCreationMode;
	defaultNoteCollisionStrategy: CollisionStrategy;
	defaultFolderCollisionStrategy: CollisionStrategy;
	defaultLinkFormat: LinkFormat;
}

export const DEFAULT_SETTINGS: AuthorToolkitSettings = {
	templatesFolderPath: "",
	defaultNoteCreationMode: "templated",
	defaultFolderCreationMode: "named",
	defaultNoteCollisionStrategy: "rename",
	defaultFolderCollisionStrategy: "rename",
	defaultLinkFormat: "bullet",
};

export class AuthorToolkitSettingTab extends PluginSettingTab {
	plugin: AuthorToolkitPlugin;

	constructor(app: App, plugin: AuthorToolkitPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
	.setName("General")
	.setHeading();

		new Setting(containerEl)
			.setName("Templates Folder Path")
			.setDesc(
				"The default folder where your templates are stored. (e.g., Templates/Characters)"
			)
			.addText((text) =>
				text
					.setPlaceholder("Templates")
					.setValue(this.plugin.settings.templatesFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.templatesFolderPath = value.trim();
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Creation Defaults")
			.setHeading();

		new Setting(containerEl)
			.setName("Default Note Creation Mode")
			.setDesc("The mode selected when Create Notes opens.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("templated", "Templated Notes")
					.addOption("named", "Named Notes")
					.addOption("blank", "Blank Notes")
					.setValue(this.plugin.settings.defaultNoteCreationMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultNoteCreationMode =
							value as AuthorToolkitSettings["defaultNoteCreationMode"];

						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Folder Creation Mode")
			.setDesc("The mode selected when Create Folders opens.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("named", "Named Folders")
					.addOption("blank", "Blank Folders")
					.setValue(this.plugin.settings.defaultFolderCreationMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolderCreationMode =
							value as AuthorToolkitSettings["defaultFolderCreationMode"];

						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Note Collision Strategy")
			.setDesc(
				"What Create Notes should do when a note with the same name already exists."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("rename", "Rename (Add number)")
					.addOption("skip", "Skip it")
					.addOption("replace", "Replace it (Overwrite)")
					.addOption("cancel", "Do not make it (Cancel)")
					.setValue(this.plugin.settings.defaultNoteCollisionStrategy)
					.onChange(async (value) => {
						this.plugin.settings.defaultNoteCollisionStrategy =
							value as CollisionStrategy;

						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Folder Collision Strategy")
			.setDesc(
				"What Create Folders should do when a folder with the same name already exists."
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("rename", "Rename (Add number)")
					.addOption("skip", "Skip it")
					.addOption("replace", "Use existing folder")
					.addOption("cancel", "Do not make it (Cancel)")
					.setValue(this.plugin.settings.defaultFolderCollisionStrategy)
					.onChange(async (value) => {
						this.plugin.settings.defaultFolderCollisionStrategy =
							value as CollisionStrategy;

						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Default Link Format")
			.setDesc("The list format selected when Add Notes Links opens.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("bullet", "Bullet List (- [[Note]])")
					.addOption("number", "Numbered List (1. [[Note]])")
					.setValue(this.plugin.settings.defaultLinkFormat)
					.onChange(async (value) => {
						this.plugin.settings.defaultLinkFormat = value as LinkFormat;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Version")
			.setHeading();

		new Setting(containerEl)
			.setName("Current Development Version")
			.setDesc(`Version ${this.plugin.manifest.version}`);
	}
}