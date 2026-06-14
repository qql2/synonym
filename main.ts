/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */

import "./constant/consisit";

import { Editor, MarkdownView, Notice, Platform, Plugin } from "obsidian";
import {
	INSERT_SYNONYMS_SETTINGS,
	InsertSynonymsDefaultSettings,
	_InsertSynonymController,
} from "./src/insertSynonym";
import {
	MERGE_SYNONYM_SETTINGS,
	MergeSynonym,
	MergeSynonymDefaultSettings,
} from "src/mergeSynonym";

import { ConsoleErrorListener } from "./src/kit/listenner";
import { EnhancedEditor } from "enhanced-editor";
import { SettingTab } from "src/settingTab";
import { SynonymCore } from "src/kit/synonym";
import { Tag } from "src/kit/tag";
import { devAssistant } from "./src/devAssistant";

export interface PLUGIN_SETTINGS
	extends INSERT_SYNONYMS_SETTINGS,
		MERGE_SYNONYM_SETTINGS {
	devMode: boolean;
	/** 调试用：下次启动时自动对当前笔记执行导入同义词 */
	_autoTestOnLaunch?: boolean;
}

const defaultSettings: PLUGIN_SETTINGS = Object.assign(
	{
		devMode: false,
		_autoTestOnLaunch: false,
	},
	InsertSynonymsDefaultSettings,
	MergeSynonymDefaultSettings
);

declare interface CACHE {
	editor?: Editor;
	markdownview?: MarkdownView;
}
export default class Synonym extends Plugin {
	cache: CACHE;
	settings: PLUGIN_SETTINGS;
	fundebug: any | null;
	fundebugRevideo: any;
	ErrorListener: ConsoleErrorListener;
	devAssistant: any;
	synonymController: _InsertSynonymController;
	mergeSynonym: MergeSynonym;

	async Init() {
		this.cache = {};
		window.setTimeout(async () => {
			await this.loadSettings();
			this.synonymController = new _InsertSynonymController(this);
			this.mergeSynonym = new MergeSynonym(this);
			SynonymCore.addCommand(this);
			this.ErrorListener = new ConsoleErrorListener();
			this.devAssistant = new devAssistant(this);
			this.addSettingTab(new SettingTab(this));

			// 调试：启动后自动对当前笔记执行导入同义词
			if (this.settings._autoTestOnLaunch) {
				this.settings._autoTestOnLaunch = false;
				await this.saveSettings();
				const file = this.app.workspace.getActiveFile();
				if (file) {
					console.log("_autoTestOnLaunch: 正在对", file.path, "执行导入同义词");
					this.synonymController.main(file);
				}
			}
		}, 1 * 1000);
	}

	async onload() {
		await this.loadSettings();
		this.Init();
		this.addCommand({
			id: "一键重命名选中标签",
			name: "一键重命名/rename选中标签tag",
			editorCheckCallback: (
				checking: boolean,
				editor: Editor,
				view: MarkdownView
			) => {
				if (checking) {
					if (!editor.somethingSelected) return false;
					return true;
				}
				let enhancedEditor = new EnhancedEditor(editor);
				let name = enhancedEditor.getSelectedTag();
				new Tag(this).renameTagAndAnnota(name);
			},
		});
	}

	async onunload() {
		await this.saveSettings();
		this.ErrorListener.stopProxy();
		this.synonymController.die();
		this.devAssistant.die();
	}
	async loadSettings() {
		this.settings = Object.assign(
			{},
			defaultSettings,
			await this.loadData()
		);
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}
	testLog(...arg: any[]): void {
		if (!this.settings.devMode) return;
		console.log("synonym testing:\n", ...arg);
	}
}
