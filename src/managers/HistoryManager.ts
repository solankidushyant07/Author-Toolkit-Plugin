import { Notice } from "obsidian";

export interface ActionRecord {
	description: string;
	undo: () => Promise<void>;
	redo: () => Promise<void>;
}

export class HistoryManager {
	private static instance: HistoryManager;
	private undoStack: ActionRecord[] = [];
	private redoStack: ActionRecord[] = [];

	private constructor() {}

	public static getInstance(): HistoryManager {
		if (!HistoryManager.instance) {
			HistoryManager.instance = new HistoryManager();
		}
		return HistoryManager.instance;
	}

	public push(action: ActionRecord) {
		this.undoStack.push(action);
		// Clear the redo stack whenever a new action is performed
		this.redoStack = []; 
		// Keep memory clean by limiting history to the last 50 actions
		if (this.undoStack.length > 50) {
			this.undoStack.shift(); 
		}
	}

	public async undo() {
		const action = this.undoStack.pop();
		if (action) {
			try {
				await action.undo();
				this.redoStack.push(action);
				new Notice(`↩️ Undid: ${action.description}`);
			} catch (error) {
				console.error("Author Toolkit Undo Error:", error);
				new Notice(`❌ Failed to undo: ${action.description}`);
				this.undoStack.push(action); // Put it back if it failed
			}
		} else {
			new Notice("No Author Toolkit actions to undo.");
		}
	}

	public async redo() {
		const action = this.redoStack.pop();
		if (action) {
			try {
				await action.redo();
				this.undoStack.push(action);
				new Notice(`↪️ Redid: ${action.description}`);
			} catch (error) {
				console.error("Author Toolkit Redo Error:", error);
				new Notice(`❌ Failed to redo: ${action.description}`);
				this.redoStack.push(action); // Put it back if it failed
			}
		} else {
			new Notice("No Author Toolkit actions to redo.");
		}
	}
}
