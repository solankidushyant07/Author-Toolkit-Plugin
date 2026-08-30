import {
	App,
	Modal,
	Setting,
	Notice,
	TextComponent,
	TextAreaComponent,
	TFile,
	TFolder,
	ButtonComponent,
} from "obsidian";
import {
	NoteCreator,
	CollisionStrategy,
	NoteCreationResult,
} from "../creators/NoteCreator";
import { FileIO } from "../utils/FileIO";
import { BrowserModal } from "./BrowserModal";
import type AuthorToolkitPlugin from "../main";

type NoteMode = "blank" | "named" | "templated";

export class CreateNotesModal extends Modal {

	private plugin: AuthorToolkitPlugin;
	private mode: NoteMode;
	private folderPath: string = "";
	private templateFile: TFile | null = null;

	// Reactive State
	private noteCount: number = 1;
	private tempCountInput: string = "1";
	private namesList: string = "";
	private fallbackPrefix: string = "Untitled";
	private collisionStrategy: CollisionStrategy;

	// Cached UI Components for live updating
	private countInputComp: TextComponent | null = null;
	private textAreaComp: TextAreaComponent | null = null;
	private validationContainer: HTMLElement | null = null;
	private plusBtnComp: ButtonComponent | null = null;

	constructor(app: App, plugin: AuthorToolkitPlugin) {
		super(app);

		this.plugin = plugin;
		this.mode = plugin.settings.defaultNoteCreationMode as NoteMode;
		this.collisionStrategy = plugin.settings.defaultNoteCollisionStrategy;
		this.folderPath = FileIO.getActiveFolder(app);
	}

	onOpen() {
		this.display();
	}

	display() {
		const { contentEl } = this;

		contentEl.classList.add("at-create-notes-content");
		contentEl.empty();

		contentEl.createEl("h2", { text: "📝 Create Notes" });

		// 1. Mode Selector
		new Setting(contentEl)
			.setName("Creation Mode")
			.setDesc("Choose what kind of notes to generate.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("templated", "Templated Notes")
					.addOption("named", "Named Notes")
					.addOption("blank", "Blank Notes")
					.setValue(this.mode)
					.onChange((value: string) => {
						this.mode = value as NoteMode;

						if (this.mode === "blank") {
							this.fallbackPrefix = "Blank Note";
						} else if (this.mode === "named") {
							this.fallbackPrefix = "Note";
						} else if (this.mode === "templated" && this.templateFile) {
							this.fallbackPrefix =
								this.templateFile.basename.replace(/template/i, "").trim() ||
								"Untitled";
						}

						this.noteCount = 1;
						this.tempCountInput = "1";
						this.namesList = "";
						this.display();
					});
			});

		// 2. Template File
		if (this.mode === "templated") {
			let fileInputComponent: TextComponent;

			new Setting(contentEl)
				.setName("Template File")
				.setDesc("The note to use as a template.")
				.addText((text) => {
					fileInputComponent = text;

					text
						.setPlaceholder("Select a template...")
						.setValue(this.templateFile ? this.templateFile.path : "")
						.setDisabled(true);
				})
				.addButton((btn) =>
					btn
						.setButtonText("Browse")
						.onClick(() => {
							const startPath =
								this.plugin.settings.templatesFolderPath ||
								this.folderPath;

							if (!this.plugin.settings.templatesFolderPath) {
								new Notice(
									"Tip: You can set a default Templates folder in Settings!"
								);
							}

							new BrowserModal(
								this.app,
								"file",
								startPath,
								(selectedFile) => {
									this.templateFile = selectedFile as TFile;
									fileInputComponent.setValue(
										this.templateFile.path
									);

									const cleanBase =
										this.templateFile.basename
											.replace(/template/i, "")
											.trim();

									this.fallbackPrefix =
										cleanBase || "Untitled";

									this.display();
								}
							).open();
						})
				);
		}

		// 3. Destination Folder
		let folderInputComponent: TextComponent;

		new Setting(contentEl)
			.setName("Destination Folder")
			.setDesc("Where to create the notes.")
			.addText((text) => {
				folderInputComponent = text;

				text
					.setPlaceholder("Root (/)")
					.setValue(this.folderPath)
					.onChange((value) => {
						this.folderPath = value.trim();
					});
			})
			.addButton((btn) =>
				btn
					.setButtonText("Browse")
					.onClick(() => {
						new BrowserModal(
							this.app,
							"folder",
							this.folderPath,
							(selectedItem) => {
								const selectedFolder =
									selectedItem as TFolder;

								this.folderPath =
									selectedFolder.path === "/"
										? ""
										: selectedFolder.path;

								folderInputComponent.setValue(
									this.folderPath
								);
							}
						).open();
					})
			);

		// 4. Custom Direct-Edit Stepper
		const countSetting = new Setting(contentEl)
			.setName("Count")
			.setDesc("How many notes to create.");

		countSetting.controlEl.classList.add(
			"at-count-setting-control"
		);

		new ButtonComponent(countSetting.controlEl)
			.setButtonText("−")
			.onClick(() => this.adjustCount(-1));

		this.countInputComp = new TextComponent(
			countSetting.controlEl
		)
			.setValue(this.tempCountInput)
			.onChange((val) => {
				this.tempCountInput = val;
			});

		this.countInputComp.inputEl.classList.add(
			"at-count-input"
		);

		this.countInputComp.inputEl.addEventListener(
			"blur",
			() => this.commitCount()
		);

		this.countInputComp.inputEl.addEventListener(
			"keydown",
			(e) => {
				if (e.key === "Enter") {
					this.commitCount();
				}
			}
		);

		this.plusBtnComp = new ButtonComponent(
			countSetting.controlEl
		)
			.setButtonText("+")
			.onClick(() => this.adjustCount(1));

		this.updatePlusButtonState();

		// 5. Fallback Prefix
		new Setting(contentEl)
			.setName("Fallback Prefix")
			.setDesc(
				"The default naming pattern for unnamed entries."
			)
			.addText((text) => {
				text
					.setPlaceholder("Untitled")
					.setValue(this.fallbackPrefix)
					.onChange((value) => {
						this.fallbackPrefix = value;
					});
			});

		// 6. Name List Text Area
		if (this.mode !== "blank") {
			const textAreaSetting = new Setting(contentEl)
				.setName("Names")
				.setDesc(
					"Each line creates one item. Empty lines use the fallback name."
				);

			textAreaSetting.settingEl.classList.add(
				"at-names-setting"
			);

			this.textAreaComp = new TextAreaComponent(
				textAreaSetting.controlEl
			);

			this.textAreaComp.inputEl.classList.add(
				"at-names-textarea"
			);

			this.textAreaComp.setValue(this.namesList);

			this.textAreaComp.onChange((value) => {
				const lines = value.split("\n");

				if (lines.length > 100) {
					this.namesList = lines
						.slice(0, 100)
						.join("\n");

					this.textAreaComp!.setValue(
						this.namesList
					);

					this.noteCount = 100;
				} else {
					this.namesList = value;
					this.noteCount = lines.length;
				}

				this.tempCountInput =
					this.noteCount.toString();

				this.countInputComp?.setValue(
					this.tempCountInput
				);

				this.updatePlusButtonState();
				this.updateValidationUI();
			});

			this.textAreaComp.inputEl.addEventListener(
				"paste",
				(e) => {
					e.preventDefault();

					const pastedText =
						e.clipboardData?.getData("text") || "";

					const el = this.textAreaComp!.inputEl;

					const textBefore = el.value.substring(
						0,
						el.selectionStart
					);

					const textAfter = el.value.substring(
						el.selectionEnd
					);

					const simulatedResult =
						textBefore +
						pastedText +
						textAfter;

					const totalLines =
						simulatedResult.split(/\r?\n/);

					if (totalLines.length > 100) {
						new PasteWarningModal(
							this.app,
							totalLines.length,
							100,
							() => {
								this.applyTextToNamesList(
									totalLines
										.slice(0, 100)
										.join("\n")
								);
							}
						).open();
					} else {
						this.applyTextToNamesList(
							simulatedResult
						);
					}
				}
			);
		}

		// 7. Collision Strategy
		new Setting(contentEl)
			.setName("If note already exists:")
			.addDropdown((dropdown) => {
				dropdown
					.addOption(
						"rename",
						"Rename (Add number)"
					)
					.addOption("skip", "Skip it")
					.addOption(
						"replace",
						"Replace it (Overwrite)"
					)
					.addOption(
						"cancel",
						"Do not make it (Cancel)"
					)
					.setValue(this.collisionStrategy)
					.onChange((value: string) => {
						this.collisionStrategy =
							value as CollisionStrategy;
					});
			});

		// 8. Live Validation UI
		this.validationContainer = contentEl.createDiv();
		this.updateValidationUI();

		// 9. Submit Button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText("Generate Notes")
					.setCta()
					.onClick(async () => {
						if (
							this.mode === "templated" &&
							!this.templateFile
						) {
							new Notice(
								"Please select a template file first."
							);
							return;
						}

						this.commitCount();

						if (this.noteCount === 0) {
							new Notice(
								"Canceled: 0 notes requested."
							);
							return;
						}

						this.close();

						const namesArray =
							this.mode === "blank"
								? []
								: this.namesList.split("\n");

						const finalTemplate =
							this.mode === "templated"
								? this.templateFile
								: null;

						const result =
							await NoteCreator.createNotes(
								this.app,
								this.folderPath,
								this.noteCount,
								finalTemplate,
								namesArray,
								this.fallbackPrefix,
								this.collisionStrategy
							);

						if (result.failed > 0) {
							new ResultReportModal(
								this.app,
								result
							).open();
						} else {
							new Notice(
								`✅ Successfully created ${result.success} notes.`
							);
						}
					})
			);
	}

	private adjustCount(amount: number) {
		this.commitCount();

		let newVal = this.noteCount + amount;

		if (newVal < 1) newVal = 1;
		if (newVal > 100) newVal = 100;

		this.tempCountInput = newVal.toString();
		this.commitCount();
	}

	private commitCount() {
		let parsed = parseInt(this.tempCountInput);

		if (isNaN(parsed) || parsed < 1) parsed = 1;
		if (parsed > 100) parsed = 100;

		this.noteCount = parsed;
		this.tempCountInput = parsed.toString();

		this.countInputComp?.setValue(
			this.tempCountInput
		);

		this.updatePlusButtonState();

		if (this.mode !== "blank") {
			let lines = this.namesList.split("\n");

			if (lines.length > this.noteCount) {
				lines = lines.slice(
					0,
					this.noteCount
				);
			} else if (lines.length < this.noteCount) {
				while (lines.length < this.noteCount) {
					lines.push("");
				}
			}

			this.namesList = lines.join("\n");

			this.textAreaComp?.setValue(
				this.namesList
			);
		}

		this.updateValidationUI();
	}

	private applyTextToNamesList(text: string) {
		this.namesList = text;
		this.noteCount = text.split("\n").length;
		this.tempCountInput =
			this.noteCount.toString();

		this.countInputComp?.setValue(
			this.tempCountInput
		);

		this.textAreaComp?.setValue(
			this.namesList
		);

		this.updatePlusButtonState();
		this.updateValidationUI();
	}

	private updatePlusButtonState() {
		if (this.plusBtnComp) {
			this.plusBtnComp.setDisabled(
				this.noteCount >= 100
			);
		}
	}

	private updateValidationUI() {
		if (!this.validationContainer) return;

		this.validationContainer.empty();

		if (this.noteCount === 0) return;

		const invalidRegex = /[\\/:"*?<>|]/;

		let namedCount = 0;
		let fallbackCount = 0;
		let invalidCount = 0;

		if (this.mode === "blank") {
			fallbackCount = this.noteCount;
		} else {
			const lines = this.namesList.split("\n");

			for (let i = 0; i < this.noteCount; i++) {
				const line = lines[i];

				if (
					line === undefined ||
					line.trim() === ""
				) {
					fallbackCount++;
				} else {
					namedCount++;

					if (invalidRegex.test(line)) {
						invalidCount++;
					}
				}
			}
		}

		const summary =
			this.validationContainer.createDiv({
				cls: "at-validation-summary",
			});

		summary.createEl("strong", {
			text: `Ready to create ${this.noteCount} notes.`,
		});

		const list = summary.createEl("ul", {
			cls: "at-validation-list",
		});

		if (namedCount > 0) {
			const validNamed =
				namedCount - invalidCount;

			if (validNamed > 0) {
				list.createEl("li", {
					text: `✓ ${validNamed} valid named items`,
				});
			}
		}

		if (fallbackCount > 0) {
			list.createEl("li", {
				text: `✓ ${fallbackCount} fallback names`,
			});
		}

		if (invalidCount > 0) {
			list.createEl("li", {
				text: `⚠ ${invalidCount} invalid names (Cannot contain \\ / : * ? " < > |)`,
				cls: "at-validation-invalid",
			});
		}

		list.createEl("li", {
			text: "✓ Destination path ready",
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

// --- SUB-MODALS ---

class PasteWarningModal extends Modal {
	constructor(
		app: App,
		private total: number,
		private max: number,
		private onConfirm: () => void
	) {
		super(app);
	}

	onOpen() {
		this.contentEl.empty();

		this.contentEl.createEl("h3", {
			text: "Too Many Names",
		});

		this.contentEl.createEl("p", {
			text: `You pasted ${this.total} names, but the maximum is ${this.max}.`,
		});

		const btnContainer =
			this.contentEl.createDiv({
				cls: "at-too-many-names-buttons",
			});

		const cancelBtn =
			btnContainer.createEl("button", {
				text: "Cancel",
			});

		cancelBtn.onclick = () => this.close();

		const confirmBtn =
			btnContainer.createEl("button", {
				text: `Use first ${this.max}`,
			});

		confirmBtn.className = "mod-cta";

		confirmBtn.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}
}

class ResultReportModal extends Modal {
	constructor(
		app: App,
		private result: NoteCreationResult
	) {
		super(app);
	}

	onOpen() {
		this.contentEl.empty();

		this.contentEl.createEl("h2", {
			text: "Creation Complete",
		});

		this.contentEl.createEl("p", {
			text: `Created: ${this.result.success} | Failed: ${this.result.failed}`,
		});

		const listContainer =
			this.contentEl.createDiv({
				cls: "at-creation-result-list",
			});

		listContainer.createEl("strong", {
			text: "Failed Items:",
		});

		const ul = listContainer.createEl("ul", {
			cls: "at-creation-result-list-items",
		});

		for (const detail of this.result.failedDetails) {
			const li = ul.createEl("li", {
				cls: "at-creation-result-item",
			});

			li.createEl("strong", {
				text: `• ${detail.name}`,
			});

			li.createEl("div", {
				text: `Reason: ${detail.reason}`,
				cls: "at-creation-result-reason",
			});
		}
	}
}