import { App, Modal } from "obsidian";

export class CheatsheetModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.createEl("h2", { text: "📖 Author Toolkit Cheatsheet" });

		contentEl.createEl("p", {
			text: "Click any code below to copy it. Paste it into your note, and it will magically update when you switch files!",
			cls: "at-cheatsheet-description"
		});

		const addCodeCard = (code: string, simpleDescription: string) => {
			const card = contentEl.createDiv({
				cls: "at-cheatsheet-card"
			});

			const codeText = card.createEl("code", {
				text: code,
				cls: "at-cheatsheet-code"
			});

			card.createEl("div", {
				text: simpleDescription,
				cls: "at-cheatsheet-item-description"
			});

			// Click-to-copy magic
			codeText.addEventListener("click", () => {
				navigator.clipboard.writeText(code);

				const originalText = codeText.innerText;
				codeText.innerText = "✅ Copied!";
				codeText.addClass("at-cheatsheet-code-copied");

				setTimeout(() => {
					codeText.innerText = originalText;
					codeText.removeClass("at-cheatsheet-code-copied");
				}, 1200);
			});
		};

		addCodeCard(
			"<AT|Heading>",
			"Gets the name of the nearest heading above it, regardless of its size."
		);

		addCodeCard(
			"<AT|H1>",
			"Gets the name of the nearest # (Header 1) above it."
		);

		addCodeCard(
			"<AT|H2>",
			"Gets the name of the nearest ## (Header 2) above it."
		);

		addCodeCard(
			"<AT|H3>",
			"Gets the name of the nearest ### (Header 3) above it."
		);

		addCodeCard(
			"<AT|H4>",
			"Gets the name of the nearest #### (Header 4) above it."
		);

		addCodeCard(
			"<AT|H5>",
			"Gets the name of the nearest ##### (Header 5) above it."
		);

		addCodeCard(
			"<AT|H6>",
			"Gets the name of the nearest ###### (Header 6) above it."
		);
	}

	onClose() {
		this.contentEl.empty();
	}
}