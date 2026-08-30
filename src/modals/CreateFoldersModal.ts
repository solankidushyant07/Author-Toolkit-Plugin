import {
	App,
	Modal,
	Setting,
	Notice,
	TextComponent,
	TextAreaComponent,
	TFolder,
	ButtonComponent,
} from "obsidian";
import {
	FolderCreator,
	FolderCreationResult,
} from "../creators/FolderCreator";
import { CollisionStrategy } from "../creators/NoteCreator";
import { FileIO } from "../utils/FileIO";
import { BrowserModal } from "./BrowserModal";
import type AuthorToolkitPlugin from "../main";

type FolderMode = "blank" | "named";

export class CreateFoldersModal extends Modal {

	private mode: FolderMode;
	private targetFolder: string = "";

	// Reactive State
	private folderCount: number = 1;
	private tempCountInput: string = "1";
	private folderNamesList: string = "";
	private folderFallbackPrefix: string = "Folder";
	private collisionStrategy: CollisionStrategy;

	// Advanced Note Generation State
	private generateNotes: boolean = false;
	private notesPerFolder: number = 0;
	private noteFallbackPrefix: string = "Untitled";

	// Cached UI Components
	private countInputComp: TextComponent | null = null;
	private textAreaComp: TextAreaComponent | null = null;
	private validationContainer: HTMLElement | null = null;
	private plusBtnComp: ButtonComponent | null = null;

	constructor(
		app: App,
		private plugin: AuthorToolkitPlugin
	) {
		super(app);

		this.mode = plugin.settings.defaultFolderCreationMode;
		this.collisionStrategy =
			plugin.settings.defaultFolderCollisionStrategy;

		this.targetFolder = FileIO.getActiveFolder(app);
	}

	onOpen() {
		this.display();
	}

	display() {
		const { contentEl } = this;

		contentEl.classList.add(
			"at-create-folders-content"
		);

		contentEl.empty();

		contentEl.createEl("h2", {
			text: "📁 Create Folders",
		});

		// 1. Mode Selector
		new Setting(contentEl)
			.setName("Creation Mode")
			.setDesc(
				"Choose what kind of folders to generate."
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(
						"named",
						"Named Folders"
					)
					.addOption(
						"blank",
						"Blank Folders"
					)
					.setValue(this.mode)
					.onChange((value: string) => {
						this.mode =
							value as FolderMode;

						if (this.mode === "blank") {
							this.folderFallbackPrefix =
								"Blank Folder";
						} else {
							this.folderFallbackPrefix =
								"Folder";
						}

						this.folderCount = 1;
						this.tempCountInput = "1";
						this.folderNamesList = "";

						this.display();
					});
			});

		// 2. Destination Folder
		let folderInputComponent: TextComponent;

		new Setting(contentEl)
			.setName("Destination Folder")
			.setDesc(
				"Where to create these new folders."
			)
			.addText((text) => {
				folderInputComponent = text;

				text
					.setPlaceholder("Root (/)")
					.setValue(this.targetFolder)
					.onChange((value) => {
						this.targetFolder =
							value.trim();
					});
			})
			.addButton((btn) =>
				btn
					.setButtonText("Browse")
					.onClick(() => {
						new BrowserModal(
							this.app,
							"folder",
							this.targetFolder,
							(selectedItem) => {
								const selectedFolder =
									selectedItem as TFolder;

								this.targetFolder =
									selectedFolder.path ===
									"/"
										? ""
										: selectedFolder.path;

								folderInputComponent.setValue(
									this.targetFolder
								);
							}
						).open();
					})
			);

		// 3. Custom Direct-Edit Stepper
		const countSetting = new Setting(contentEl)
			.setName("Folder Count")
			.setDesc("How many folders to create.");

		countSetting.controlEl.classList.add(
			"at-folder-count-setting-control"
		);

		new ButtonComponent(countSetting.controlEl)
			.setButtonText("−")
			.onClick(() =>
				this.adjustCount(-1)
			);

		this.countInputComp =
			new TextComponent(
				countSetting.controlEl
			)
				.setValue(this.tempCountInput)
				.onChange((val) => {
					this.tempCountInput = val;
				});

		this.countInputComp.inputEl.classList.add(
			"at-folder-count-input"
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

		this.plusBtnComp =
			new ButtonComponent(
				countSetting.controlEl
			)
				.setButtonText("+")
				.onClick(() =>
					this.adjustCount(1)
				);

		this.updatePlusButtonState();

		// 4. Folder Fallback Prefix
		new Setting(contentEl)
			.setName("Folder Fallback Prefix")
			.setDesc(
				"Default naming pattern for unnamed folders."
			)
			.addText((text) => {
				text
					.setPlaceholder("Folder")
					.setValue(
						this.folderFallbackPrefix
					)
					.onChange((value) => {
						this.folderFallbackPrefix =
							value;
					});
			});

		// 5. Name List
		if (this.mode !== "blank") {
			const textAreaSetting =
				new Setting(contentEl)
					.setName("Folder Names")
					.setDesc(
						"Each line creates one folder. Empty lines use the fallback name."
					);

			textAreaSetting.settingEl.classList.add(
				"at-folder-names-setting"
			);

			this.textAreaComp =
				new TextAreaComponent(
					textAreaSetting.controlEl
				);

			this.textAreaComp.inputEl.classList.add(
				"at-folder-names-textarea"
			);

			this.textAreaComp.setValue(
				this.folderNamesList
			);

			this.textAreaComp.onChange((value) => {
				const lines =
					value.split("\n");

				if (lines.length > 100) {
					this.folderNamesList =
						lines
							.slice(0, 100)
							.join("\n");

					this.textAreaComp!.setValue(
						this.folderNamesList
					);

					this.folderCount = 100;
				} else {
					this.folderNamesList =
						value;

					this.folderCount =
						lines.length;
				}

				this.tempCountInput =
					this.folderCount.toString();

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
						e.clipboardData?.getData(
							"text"
						) || "";

					const el =
						this.textAreaComp!.inputEl;

					const textBefore =
						el.value.substring(
							0,
							el.selectionStart
						);

					const textAfter =
						el.value.substring(
							el.selectionEnd
						);

					const simulatedResult =
						textBefore +
						pastedText +
						textAfter;

					const totalLines =
						simulatedResult.split(
							/\r?\n/
						);

					if (
						totalLines.length >
						100
					) {
						new PasteFolderWarningModal(
							this.app,
							totalLines.length,
							100,
							() => {
								this.applyTextToNamesList(
									totalLines
										.slice(
											0,
											100
										)
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

		// 6. Collision Strategy
		new Setting(contentEl)
			.setName(
				"If folder already exists:"
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption(
						"rename",
						"Rename (Add number)"
					)
					.addOption(
						"skip",
						"Skip it"
					)
					.addOption(
						"replace",
						"Use existing / Overwrite contents"
					)
					.addOption(
						"cancel",
						"Do not make it (Cancel)"
					)
					.setValue(
						this.collisionStrategy
					)
					.onChange((value: string) => {
						this.collisionStrategy =
							value as CollisionStrategy;
					});
			});

		// 7. Live Validation
		this.validationContainer =
			contentEl.createDiv();

		this.updateValidationUI();

		contentEl.createEl("hr");

		// 8. Advanced: Generate Notes
		new Setting(contentEl)
			.setName(
				"Generate notes inside folders"
			)
			.setDesc(
				"Automatically populate these new folders with notes."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.generateNotes
					)
					.onChange((value) => {
						this.generateNotes =
							value;

						this.display();
					});
			});

		if (this.generateNotes) {
			const noteCountSetting =
				new Setting(contentEl)
					.setName(
						"Notes per folder"
					)
					.setDesc(
						`Create ${this.notesPerFolder} notes in each folder.`
					);

			noteCountSetting.addSlider(
				(slider) => {
					slider
						.setLimits(
							0,
							25,
							1
						)
						.setValue(
							this.notesPerFolder
						)
						.setDynamicTooltip()
						.onChange(
							(value) => {
								this.notesPerFolder =
									value;

								noteCountSetting.setDesc(
									`Create ${value} notes in each folder.`
								);
							}
						);
				}
			);

			new Setting(contentEl)
				.setName(
					"Note Fallback Prefix"
				)
				.addText((text) => {
					text
						.setPlaceholder(
							"Untitled"
						)
						.setValue(
							this.noteFallbackPrefix
						)
						.onChange(
							(value) => {
								this.noteFallbackPrefix =
									value;
							}
						);
				});
		}

		// 9. Submit
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText(
						"Create Folders"
					)
					.setCta()
					.onClick(async () => {
						this.commitCount();

						if (
							this.folderCount ===
							0
						) {
							new Notice(
								"Canceled: 0 folders requested."
							);
							return;
						}

						this.close();

						const namesArray =
							this.mode === "blank"
								? []
								: this.folderNamesList.split(
										"\n"
								  );

						const finalNoteCount =
							this.generateNotes
								? this.notesPerFolder
								: 0;

						const result =
							await FolderCreator.createAdvancedFolders(
								this.app,
								this.targetFolder,
								this.folderCount,
								namesArray,
								this.folderFallbackPrefix,
								this.collisionStrategy,
								finalNoteCount,
								this.noteFallbackPrefix
							);

						if (result.failed > 0) {
							new ResultFolderReportModal(
								this.app,
								result
							).open();
						} else {
							new Notice(
								`✅ Successfully created ${result.success} folders.`
							);
						}
					})
			);
	}

	private adjustCount(amount: number) {
		this.commitCount();

		let newVal =
			this.folderCount + amount;

		if (newVal < 1) newVal = 1;
		if (newVal > 100) newVal = 100;

		this.tempCountInput =
			newVal.toString();

		this.commitCount();
	}

	private commitCount() {
		let parsed =
			parseInt(this.tempCountInput);

		if (isNaN(parsed) || parsed < 1) {
			parsed = 1;
		}

		if (parsed > 100) {
			parsed = 100;
		}

		this.folderCount = parsed;

		this.tempCountInput =
			parsed.toString();

		this.countInputComp?.setValue(
			this.tempCountInput
		);

		this.updatePlusButtonState();

		if (this.mode !== "blank") {
			let lines =
				this.folderNamesList.split(
					"\n"
				);

			if (lines.length > this.folderCount) {
				lines = lines.slice(
					0,
					this.folderCount
				);
			} else if (
				lines.length <
				this.folderCount
			) {
				while (
					lines.length <
					this.folderCount
				) {
					lines.push("");
				}
			}

			this.folderNamesList =
				lines.join("\n");

			this.textAreaComp?.setValue(
				this.folderNamesList
			);
		}

		this.updateValidationUI();
	}

	private applyTextToNamesList(
		text: string
	) {
		this.folderNamesList = text;

		this.folderCount =
			text.split("\n").length;

		this.tempCountInput =
			this.folderCount.toString();

		this.countInputComp?.setValue(
			this.tempCountInput
		);

		this.textAreaComp?.setValue(
			this.folderNamesList
		);

		this.updatePlusButtonState();
		this.updateValidationUI();
	}

	private updatePlusButtonState() {
		if (this.plusBtnComp) {
			this.plusBtnComp.setDisabled(
				this.folderCount >= 100
			);
		}
	}

	private updateValidationUI() {
		if (!this.validationContainer) {
			return;
		}

		this.validationContainer.empty();

		if (this.folderCount === 0) {
			return;
		}

		const invalidRegex =
			/[\\/:"*?<>|]/;

		let namedCount = 0;
		let fallbackCount = 0;
		let invalidCount = 0;

		if (this.mode === "blank") {
			fallbackCount =
				this.folderCount;
		} else {
			const lines =
				this.folderNamesList.split(
					"\n"
				);

			for (
				let i = 0;
				i < this.folderCount;
				i++
			) {
				const line = lines[i];

				if (
					line === undefined ||
					line.trim() === ""
				) {
					fallbackCount++;
				} else {
					namedCount++;

					if (
						invalidRegex.test(
							line
						)
					) {
						invalidCount++;
					}
				}
			}
		}

		const summary =
			this.validationContainer.createDiv(
				{
					cls: "at-folder-validation-summary",
				}
			);

		summary.createEl("strong", {
			text: `Ready to create ${this.folderCount} folders.`,
		});

		const list = summary.createEl(
			"ul",
			{
				cls: "at-folder-validation-list",
			}
		);

		if (namedCount > 0) {
			const validNamed =
				namedCount -
				invalidCount;

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
				cls: "at-folder-validation-invalid",
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

class PasteFolderWarningModal extends Modal {
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
				cls: "at-folder-too-many-names-buttons",
			});

		const cancelBtn =
			btnContainer.createEl("button", {
				text: "Cancel",
			});

		cancelBtn.onclick = () =>
			this.close();

		const confirmBtn =
			btnContainer.createEl("button", {
				text: `Use first ${this.max}`,
			});

		confirmBtn.className =
			"mod-cta";

		confirmBtn.onclick = () => {
			this.onConfirm();
			this.close();
		};
	}
}

class ResultFolderReportModal extends Modal {
	constructor(
		app: App,
		private result: FolderCreationResult
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
				cls: "at-folder-creation-result-list",
			});

		listContainer.createEl(
			"strong",
			{
				text: "Failed Items:",
			}
		);

		const ul = listContainer.createEl(
			"ul",
			{
				cls: "at-folder-creation-result-list-items",
			}
		);

		for (
			const detail of
			this.result.failedDetails
		) {
			const li = ul.createEl(
				"li",
				{
					cls: "at-folder-creation-result-item",
				}
			);

			li.createEl(
				"strong",
				{
					text: `• ${detail.name}`,
				}
			);

			li.createEl(
				"div",
				{
					text: `Reason: ${detail.reason}`,
					cls: "at-folder-creation-result-reason",
				}
			);
		}
	}
}