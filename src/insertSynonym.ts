/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */

import * as Yaml from 'yaml'

import { Editor, MarkdownView, Notice, Setting, TFile, debounce } from 'obsidian';

import { EnhancEditor } from './kit/enhancEditor';
import { FrontMatterYAML } from 'qql1-front-matter';
import { KeyWord } from './kit/keyWord';
import { MdNote } from './kit/mdNote';
import { SettingTab } from './settingTab';
import { SimplifySynonyms } from './kit/simplifySynonyms';
import Synonym from '../main';
import { SynonymCore } from './kit/synonym';
import { XunFei } from './kit/request';
import { YAML } from 'qql1-yaml';

export interface xunfeiData {
    ke: Array<{
        word: string;
        score: number;
    }>
}
declare interface Timer {
    DebounceOfFileHandle: Function,
}

interface SETTINGS {
    autoSimplifySynonyms: boolean
    xunfeiAPI: {
        appid: string;
        appkey: string;
    }
    autoInsertSynonym: boolean;
}
export type { SETTINGS as INSERT_SYNONYMS_SETTINGS }

const defaultSettings: SETTINGS = {
    autoSimplifySynonyms: true,
    xunfeiAPI: {
        appid: null,
        appkey: null,
    },
    autoInsertSynonym: true,
}
export { defaultSettings as InsertSynonymsDefaultSettings }


export class _InsertSynonym {
    protected plugin;
    protected declare: string
    constructor(plugin: Synonym, declareWord = '导入的同义词') {
        this.plugin = plugin;
        this.declare = declareWord;
    }
    /** 获取多分关键字提取材料,每份材料最多提取出10个关键字 */
    protected async getMaterials(file: TFile) {
        /* 讯飞api材料要求:
        不能有以下特殊字符:
        换行符
        至少含一个汉字
        */
        EnhancEditor.updateEditorAndMDV(this.plugin);
        let materials = []
        let wholeText = await this.plugin.app.vault.read(file)
        /* 第一份关键字材料由文章重要词句拼接而成 */
        const bolds = MdNote.getBoldtxt(wholeText);
        // console.log('bolds:', bolds);
        let headings = await MdNote.getHeadings(this.plugin, file);
        headings = headings.map((v) => { return MdNote.delMdFormat(v) });
        const highlight = MdNote.getHilighttxt(wholeText);
        const links = MdNote.getlinkTxt(this.plugin, file);
        materials.push([...bolds, ...headings, ...highlight, ...links].join('。'));
        /* 第二位关键字材料即文章正文 */
        let fileTxt = await this.plugin.app.vault.read(file)
        let mainText = MdNote.delTag(fileTxt)
        mainText = MdNote.delMdFormat(mainText)
        mainText = mainText.replace(new RegExp(`${EnhancEditor.EOL}`, 'g'), '。')
        materials.push(mainText)
        /* 第三份关键字材料即非常重要的相关信息 */
        const path = MdNote.getPath(this.plugin, false, file);
        const backLinkTxt = MdNote.getBackLinkTxt(this.plugin, file)
        const backLinkFileNames = MdNote.getBackLinkFileNames(this.plugin, file)
        materials.push([path, ...backLinkTxt, ...backLinkFileNames].join('。'))
        return materials;
    }
    /** 核心api */
    insertSynonym(file: TFile, keyWords: string[]) {
        console.log(keyWords);
        let synTags: string[] = new SynonymCore(this.plugin).getRelativeSynonym(keyWords, true)
        if (this.plugin.settings.autoSimplifySynonyms) synTags = SimplifySynonyms.simplifySynonyms(synTags)
        FrontMatterYAML.putTagsToFrontMatter(synTags, file, this.plugin, undefined, this.declare)
        new Notice('success import Synonym: \n\n' + (synTags.join('\n\n') || 'null'));
    }
}
/** 不允许被继承 */
export class _InsertSynonymController extends _InsertSynonym {
    protected timer: Timer
    constructor(plugin: Synonym) {
        super(plugin);
        this.Init()
    }
    Init() {
        this.timer = {
            DebounceOfFileHandle: debounce(this.FileHandle.bind(this), 2 * 1000, true)
        }
        this.addCommand()
        this.registFileEvent();
        this.registSettings()
        SettingTab.addSettingAdder(containerEl => this.addInsertSynonymSettings(containerEl))
    }
    private addInsertSynonymSettings(containerEl: HTMLElement): HTMLElement {
        let contextLevel = 1
        let heading = document.createElement(`h${contextLevel}`)
        heading.innerText = "导入同义词功能"
        containerEl.appendChild(heading)
        containerEl = this.autoInsertSynonymSetting(containerEl)
        containerEl = this.autoSimplifySynonymSetting(containerEl)
        return containerEl
    }
    private autoSimplifySynonymSetting(containerEl: HTMLElement): HTMLElement {
        new Setting(containerEl)
            .setName("自动简化导入的同义词组")
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.autoSimplifySynonyms)
                    .onChange(v => {
                        this.plugin.settings.autoSimplifySynonyms = v
                        this.plugin.saveSettings()
                    })
            })
        return containerEl
    }
    private autoInsertSynonymSetting(containerEl: HTMLElement): HTMLElement {
        new Setting(containerEl)
            .setName("自动导入同义词")
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.autoInsertSynonym)
                    .onChange(v => {
                        this.plugin.settings.autoInsertSynonym = v
                        this.plugin.saveSettings()
                    })
            })
        return containerEl
    }
    die() {
        this.removeListener()
    }
    private registSettings() {
        SettingTab.addSettingAdder(containerEl => this.extractKeysConfig(containerEl, 1))
    }
    private extractKeysConfig(containerEl: HTMLElement, contextLevel: number): HTMLElement {
        let heading = document.createElement(`h${contextLevel}`)
        heading.innerText = "提取关键字"
        containerEl.appendChild(heading)
        containerEl = this.xunFeiAPIConfig(containerEl, contextLevel + 1)
        return containerEl
    }
    private xunFeiAPIConfig(containerEl: HTMLElement, contextLevel: number): HTMLElement {
        let heading = document.createElement(`h${contextLevel}`)
        heading.innerText = "讯飞API"
        containerEl.appendChild(heading)
        new Setting(containerEl)
            .setName("appid")
            .addText((text) =>
                text
                    .setValue(this.plugin.settings.xunfeiAPI.appid)
                    .onChange(async (value) => {
                        this.plugin.settings.xunfeiAPI.appid = value
                        await this.plugin.saveSettings()
                    })
            );
        new Setting(containerEl)
            .setName('appkey')
            .addText((text) =>
                text
                    .setValue(this.plugin.settings.xunfeiAPI.appkey)
                    .onChange(async (value) => {
                        this.plugin.settings.xunfeiAPI.appkey = value
                        await this.plugin.saveSettings()
                    }))
        return containerEl
    }
    protected async FileHandle() {
        if (!this.plugin.settings.autoInsertSynonym) return;
        let file = this.plugin.app.workspace.getActiveFile()
        if (!file) return
        if (!MdNote.isMdFile(file)) return
        let yaml = await FrontMatterYAML.GetYAMLtxt(file, this.plugin)
        if (YAML.hasScalarWithCommentInYAMLSeq(yaml, 'tags', this.declare)) return
        this.main(file);
    }
    protected registFileEvent() {
        if (!this.plugin.settings.autoInsertSynonym) return;
        const app = this.plugin.app;
        this.removeListener();
        //@ts-ignore
        app.workspace.on('file-open', this.timer.DebounceOfFileHandle);
    }
    removeListener() {
        //@ts-ignore
        app.workspace.off('file-open', this.timer.DebounceOfFileHandle);
    }
    addCommand() {
        this.plugin.addCommand({
            id: "导入同义词",
            name: "导入同义词Synonym",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.plugin.cache.editor = editor;
                this.plugin.saveSettings();
                let file = this.plugin.app.workspace.getActiveFile()
                this.main(file);
            }
        });
    }
    async main(mdFile: TFile) {
        if (!MdNote.isMdFile(mdFile)) return false
        const appid = this.plugin.settings.xunfeiAPI.appid
        const appkey = this.plugin.settings.xunfeiAPI.appkey
        if (!appid || !appkey) {
            new Notice('please configure APIkey!')
            return
        }
        let materials = await this.getMaterials(mdFile);
        console.log('materials:\n', materials)
        let explicitKeys = Yaml.parse(await FrontMatterYAML.GetYAMLtxt(mdFile, this.plugin))?.keys as undefined | null | string[] | string
        let xunfeiDataArr = []
        let promiseArr = []
        for (const material of materials) {
            if (!material.length) continue
            promiseArr.push(XunFei.extractKeysWords(material, appid, appkey))
        }
        for (const xunfeiData of await Promise.all(promiseArr)) {
            xunfeiDataArr.push(...xunfeiData)
        }
        let keyWords: string[] = []
        keyWords.push(...KeyWord.collectKeyWords(xunfeiDataArr, materials.join('。')))
        if (typeof explicitKeys === 'string') {
            keyWords.push(explicitKeys)
        }
        else if (explicitKeys?.constructor === Array) {
            keyWords.push(...explicitKeys)
        }
        this.insertSynonym(mdFile, keyWords)
        return true
    }
}