/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */

import * as Yaml from "yaml";

import {
	Editor,
	MarkdownView,
	Notice,
	Setting,
	TFile,
	debounce,
} from "obsidian";

import { EOL } from "os";
import { EnhancEditor } from "./kit/enhancEditor";
import { FrontMatterYAML } from "qql1-front-matter";

import { MdNote } from "./kit/mdNote";
import { SettingTab } from "./settingTab";
import { SimplifySynonyms } from "./kit/simplifySynonyms";
import Synonym from "../main";
import { SynonymCore } from "./kit/synonym";
import { SparkLLM } from "./kit/request";
import { YAML } from "qql1-yaml";

export interface xunfeiData {
	ke: Array<{
		word: string;
		score: number;
	}>;
}

declare interface Timer {
	DebounceOfFileHandle: Function;
}

interface SETTINGS {
	autoSimplifySynonyms: boolean;
	xunfeiAPI: {
		appid: string;
		appkey: string;
	};
	/** 星火LLM API密钥，格式为 apiKey:apiSecret */
	sparkAPIPassword: string;
	autoInsertSynonym: boolean;
	excludeFilesRegStr: string[];
	autoExtendSynonyms?: boolean;
}
export type { SETTINGS as INSERT_SYNONYMS_SETTINGS };

const defaultSettings: SETTINGS = {
	autoSimplifySynonyms: true,
	xunfeiAPI: {
		appid: null,
		appkey: null,
	},
	sparkAPIPassword: '',
	autoInsertSynonym: true,
	excludeFilesRegStr: [],
	autoExtendSynonyms: false,
};
export { defaultSettings as InsertSynonymsDefaultSettings };

export class _InsertSynonym {
	protected plugin;
	protected declare: string;
	constructor(plugin: Synonym, declareWord = "导入的同义词") {
		this.plugin = plugin;
		this.declare = declareWord;
	}
	/** 获取多分关键字提取材料,每份材料最多提取出10个关键字 */
	protected async getMaterials(file: TFile) {
		EnhancEditor.updateEditorAndMDV(this.plugin);
		let materials = [];
		let wholeText = await this.plugin.app.vault.read(file);
		/* 第一份关键字材料由文章重要词句拼接而成 */
		const bolds = MdNote.getBoldtxt(wholeText);
		// console.log('bolds:', bolds);
		let headings = await MdNote.getHeadings(this.plugin, file);
		headings = headings.map((v) => {
			return MdNote.delMdFormat(v);
		});
		const highlight = MdNote.getHilighttxt(wholeText);
		const links = MdNote.getlinkTxt(this.plugin, file);
		materials.push(
			[...bolds, ...headings, ...highlight, ...links].join("。")
		);
		/* 第二位关键字材料即文章正文 */
		let fileTxt = await this.plugin.app.vault.read(file);
		let mainText = MdNote.delTag(fileTxt);
		mainText = MdNote.delMdFormat(mainText);
		mainText = mainText.replace(
			new RegExp(`${EnhancEditor.EOL}`, "g"),
			"。"
		);
		materials.push(mainText);
		/* 第三份关键字材料即非常重要的相关信息 */
		const path = MdNote.getPath(this.plugin, false, file);
		const backLinkTxt = MdNote.getBackLinkTxt(this.plugin, file);
		const backLinkFileNames = MdNote.getBackLinkFileNames(
			this.plugin,
			file
		);
		materials.push([path, ...backLinkTxt, ...backLinkFileNames].join("。"));
		return materials;
	}
	/** 核心api */
	insertSynonym(file: TFile, keyWords: string[]) {
		console.log(keyWords);
		console.log(
			"autoExtendSynonyms:",
			this.plugin.settings.autoExtendSynonyms
		);
		// TODO: 修复自动扩展同义词的性能问题
		let synTags: string[] = new SynonymCore(this.plugin).getRelativeSynonym(
			keyWords,
			this.plugin.settings.autoExtendSynonyms
		);
		if (this.plugin.settings.autoSimplifySynonyms)
			synTags = SimplifySynonyms.simplifySynonyms(synTags);
		FrontMatterYAML.putTagsToFrontMatter(
			synTags,
			file,
			this.plugin,
			undefined,
			this.declare
		);
		new Notice(
			"success import Synonym: \n\n" + (synTags.join("\n\n") || "null")
		);
	}
}
/** 不允许被继承 */
export class _InsertSynonymController extends _InsertSynonym {
	protected timer: Timer;
	constructor(plugin: Synonym) {
		super(plugin);
		this.Init();
	}
	Init() {
		this.timer = {
			DebounceOfFileHandle: debounce(
				this.FileHandle.bind(this),
				2 * 1000,
				true
			),
		};
		this.addCommand();
		this.registFileEvent();
		this.registSettings();
	}
	private addInsertSynonymSettings(containerEl: HTMLElement): HTMLElement {
		let contextLevel = 1;
		let heading = document.createElement(`h${contextLevel}`);
		heading.innerText = "导入同义词功能";
		containerEl.appendChild(heading);
		containerEl = this.autoInsertSynonymSetting(containerEl);
		containerEl = this.autoSimplifySynonymSetting(containerEl);
		containerEl = this.excludeFilesConfig(containerEl, contextLevel + 1);
		return containerEl;
	}
	private autoSimplifySynonymSetting(containerEl: HTMLElement): HTMLElement {
		new Setting(containerEl)
			.setName("自动简化导入的同义词组")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoSimplifySynonyms)
					.onChange((v) => {
						this.plugin.settings.autoSimplifySynonyms = v;
						this.plugin.saveSettings();
					});
			});
		return containerEl;
	}
	private autoInsertSynonymSetting(containerEl: HTMLElement): HTMLElement {
		new Setting(containerEl)
			.setName("自动导入同义词")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.autoInsertSynonym)
					.onChange((v) => {
						this.plugin.settings.autoInsertSynonym = v;
						this.plugin.saveSettings();
					});
			});
		return containerEl;
	}
	die() {
		this.removeListener();
	}
	private registSettings() {
		SettingTab.addSettingAdder((containerEl) =>
			this.extractKeysConfig(containerEl, 1)
		);
		SettingTab.addSettingAdder((containerEl) =>
			this.addInsertSynonymSettings(containerEl)
		);
	}
	private excludeFilesConfig(
		containerEl: HTMLElement,
		contextLevel: number
	): HTMLElement {
		let heading = document.createElement(`h${contextLevel}`);
		heading.innerText = "不需要导入同义词的文件";
		containerEl.appendChild(heading);
		const setting = new Setting(containerEl)
			.setName("文件路径名正则表达式")
			.addTextArea((text) => {
				const rawBorderColor = text.inputEl.style.borderColor;
				text.setValue(
					this.plugin.settings.excludeFilesRegStr.join(EOL)
				).onChange(async (value) => {
					const rst: SETTINGS["excludeFilesRegStr"] = [];
					const regexpStrings = value.split("\n");
					for (const regexpString of regexpStrings) {
						try {
							if (regexpString === "") continue;
							new RegExp(
								regexpString.slice(
									1,
									regexpString.lastIndexOf("/")
								),
								regexpString.slice(
									regexpString.lastIndexOf("/") + 1
								)
							);
						} catch (error) {
							text.inputEl.style.borderColor = "red";
							return;
						}
						text.inputEl.style.borderColor = rawBorderColor;
						rst.push(regexpString);
					}
					this.plugin.settings.excludeFilesRegStr = rst;
					await this.plugin.saveSettings();
				});
			});
		const desc = document.createElement("p");
		desc.innerHTML = `
        每行一个完整的正则表达式, 如<strong> /hello/ig</strong><br>
        文件路径名基于库根目录,不包含后缀名,如: /path/to/file;
        `;
		setting.descEl.appendChild(desc);
		return containerEl;
	}
	private extractKeysConfig(
		containerEl: HTMLElement,
		contextLevel: number
	): HTMLElement {
		let heading = document.createElement(`h${contextLevel}`);
		heading.innerText = "提取关键字";
		containerEl.appendChild(heading);
		containerEl = this.sparkAPIConfig(containerEl, contextLevel + 1);
		return containerEl;
	}
	private sparkAPIConfig(
		containerEl: HTMLElement,
		contextLevel: number
	): HTMLElement {
		let heading = document.createElement(`h${contextLevel}`);
		heading.innerText = "讯飞星火大模型 (免费)";
		containerEl.appendChild(heading);

		const desc = document.createElement("p");
		desc.innerHTML = `
		使用讯飞星火免费LLM模型(spark-lite)提取关键词。
		请前往 <a href="https://console.xfyun.cn/services/cbm">讯飞星火控制台</a> 
		创建应用，获取 <strong>APIKey:APISecret</strong> (冒号拼接)。<br>
		<small>spark-lite 模型永久免费，不限量。</small>
		`;
		containerEl.appendChild(desc);

		new Setting(containerEl)
			.setName("星火API密钥 (apiKey:apiSecret)")
			.setDesc("例如: abc123def:xyz789ghi")
			.addText((text) => {
				text
					.setValue(this.plugin.settings.sparkAPIPassword)
					.setPlaceholder("apiKey:apiSecret")
					.onChange(async (value) => {
						this.plugin.settings.sparkAPIPassword = value;
						await this.plugin.saveSettings();
					});
			});

		return containerEl;
	}
	protected async FileHandle() {
		if (!this.plugin.settings.autoInsertSynonym) return;
		let file = this.plugin.app.workspace.getActiveFile();
		if (!file) return;
		if (!MdNote.isMdFile(file)) return;
		if (
			this.plugin.settings.excludeFilesRegStr.some((regexpString) => {
				const rgx = new RegExp(
					regexpString.slice(1, regexpString.lastIndexOf("/")),
					regexpString.slice(regexpString.lastIndexOf("/") + 1)
				);
				return rgx.test(file.path);
			})
		)
			return;
		let yaml = await FrontMatterYAML.GetYAMLtxt(file, this.plugin);
		if (YAML.hasScalarWithCommentInYAMLSeq(yaml, "tags", this.declare))
			return;
		this.main(file);
	}
	protected registFileEvent() {
		if (!this.plugin.settings.autoInsertSynonym) return;
		const app = this.plugin.app;
		this.removeListener();
		//@ts-ignore
		app.workspace.on("file-open", this.timer.DebounceOfFileHandle);
	}
	removeListener() {
		//@ts-ignore
		app.workspace.off("file-open", this.timer.DebounceOfFileHandle);
	}
	addCommand() {
		this.plugin.addCommand({
			id: "导入同义词",
			name: "导入同义词Synonym",
			hotkeys: [{ modifiers: ["Ctrl", "Alt"], key: "L" }],
			callback: () => {
				this.plugin.cache.editor =
					this.plugin.app.workspace.getActiveViewOfType(
						MarkdownView
					)?.editor;
				this.plugin.saveSettings();
				let file = this.plugin.app.workspace.getActiveFile();
				this.main(file);
			},
		});
	}
	async main(mdFile: TFile) {
		if (!MdNote.isMdFile(mdFile)) return false;
		const apiPassword = this.plugin.settings.sparkAPIPassword;
		if (!apiPassword) {
			new Notice("请先在设置中配置星火API密钥 (apiKey:apiSecret)！");
			return;
		}
		let materials = await this.getMaterials(mdFile);
		console.log("materials:\n", materials);
		let explicitKeys = Yaml.parse(
			await FrontMatterYAML.GetYAMLtxt(mdFile, this.plugin)
		)?.keys as undefined | null | string[] | string;

		/* 使用星火LLM提取关键词 */
		let keyWords: string[] = [];
		let allLLMKeywords: string[] = [];

		for (const material of materials) {
			if (!material.length) continue;
			// 跳过无汉字文本
			if (material.search(/[\u4e00-\u9fa5]/) == -1) continue;
			try {
				const result = await SparkLLM.extractKeywords(material, apiPassword);
				allLLMKeywords.push(...result);
			} catch (error) {
				console.error("星火LLM提取关键词失败:", error);
				new Notice(`关键词提取失败: ${error.message}`);
				// 继续尝试其他材料，不中断整个流程
			}
		}

		// 去重
		keyWords = [...new Set(allLLMKeywords)];

		if (typeof explicitKeys === "string") {
			keyWords.push(explicitKeys);
		} else if (explicitKeys?.constructor === Array) {
			keyWords.push(...explicitKeys);
		}

		if (keyWords.length === 0) {
			new Notice("未能提取到关键词，请检查文本内容");
			return;
		}

		this.insertSynonym(mdFile, keyWords);
		return true;
	}
}
