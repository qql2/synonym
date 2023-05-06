/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable prefer-const */

import * as Yaml from 'yaml'

import { Editor, MarkdownView, Notice, Setting, TFile, debounce } from 'obsidian';

import { EnhancEditor } from './kit/enhancEditor';
import { FrontMatterYAML } from './kit/frontMatter';
import { KeyWord } from './kit/keyWord';
import { MdNote } from './kit/mdNote';
import { Request } from './kit/request';
import { SettingTab } from './settingTab';
import { SimplifySynonyms } from './kit/simplifySynonyms';
import { Switch } from 'constant/consisit';
import Synonym from '../main';
import { SynonymCore } from './kit/synonym';
import { YAML } from './kit/YAML';

interface REQ_INFO {
    'ID': number,
    'stat': 'unRespon' | 'error' | 'success',
    'respon': any,
    'requestor': Function,
    'errCount': number
}
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
    autoSimplifySynonyms: Switch
    xunfeiAPI: {
        appid: string;
        appkey: string;
    }
    autoInsertSynonym: Switch;
}
export type { SETTINGS as INSERT_SYNONYMS_SETTINGS }

const defaultSettings: SETTINGS = {
    autoSimplifySynonyms: 1,
    xunfeiAPI: {
        appid: null,
        appkey: null,
    },
    autoInsertSynonym: 1,
}
export { defaultSettings as InsertSynonymsDefaultSettings }

export class InsertSynonym {
    protected plugin;
    protected declare: string
    protected Vtags: string[];
    protected explicitKeys: any;
    protected file: TFile;
    constructor(plugin: Synonym, declareWord = '导入的同义词') {
        this.plugin = plugin;
        this.declare = declareWord;
    }
    /** 获取多分关键字提取材料,每份材料最多提取出10个关键字 */
    getMaterials() {
        /* 讯飞api要求材料不能有以下特殊字符:
        换行符
        */
        EnhancEditor.updateEditorAndMDV(this.plugin);
        let materials = []
        let wholeText = this.plugin.cache.editor.getValue()
        /* 第一份关键字材料由文章重要词句拼接而成 */
        const bolds = MdNote.getBoldtxt(wholeText);
        // console.log('bolds:', bolds);
        let headings = MdNote.getHeadings(this.plugin);
        headings = headings.map((v) => { return MdNote.delMdFormat(v) });
        const hilight = MdNote.getHilighttxt(wholeText);
        const links = MdNote.getlinkTxt(this.plugin);
        materials.push([...bolds, ...headings, ...hilight, ...links].join('。'));
        /* 第二位关键字材料即文章正文 */
        let fileTxt = this.plugin.cache.editor.getValue()
        let mainText = MdNote.delTag(fileTxt)
        mainText = MdNote.delMdFormat(mainText)
        mainText = mainText.replace(new RegExp(`${EnhancEditor.EOL}`, 'g'), '。')
        materials.push(mainText)
        /* 第三份关键字材料即非常重要的相关信息 */
        const path = MdNote.getPath(this.plugin, false);
        const backLinkTxt = MdNote.getBackLinkTxt(this.plugin)
        const backLinkFileNames = MdNote.getBackLinkFileNames(this.plugin)
        materials.push([path, ...backLinkTxt, ...backLinkFileNames].join('。'))
        return materials;
    }
    /** 核心api */
    insertSynonym(data: xunfeiData[], keyWordMaterials: string[]) {
        console.log(data);
        let keys = KeyWord.collectKeyWords(data, keyWordMaterials.join('。'));
        if (typeof this.explicitKeys === 'string') {
            keys.push(this.explicitKeys)
        }
        else if (this.explicitKeys?.constructor === Array) {
            keys.push(...this.explicitKeys)
        }
        console.log(keys);
        let synTags: string[] = new SynonymCore(this.plugin).getRelativeSynonym(keys, true)
        if (this.plugin.settings.autoSimplifySynonyms) synTags = SimplifySynonyms.simplifySynonyms(synTags)
        FrontMatterYAML.putTagsToFrontMatter(synTags, this.file, this.plugin, undefined, this.declare)
        new Notice('success import Synonym: \n\n' + (synTags.join('\n\n') || 'null'));
    }
}

/** 不允许被继承 */
export class Controller extends InsertSynonym {
    protected reqController: {
        reqList: REQ_INFO[],
        reqAbort: boolean
    } = {
            reqList: [],
            reqAbort: false,
        }
    materials: string[];
    protected timer: Timer
    constructor(plugin: Synonym) {
        super(plugin);
        this.Init()
    }
    Init() {
        this.timer = {
            DebounceOfFileHandle: debounce(this.FileHandle.bind(this), 10 * 1000, true)
        }
        this.addCommand()
        this.registFileEvent();
        this.registSettings()
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
        if (this.plugin.settings.autoInsertSynonym == 0) return;
        let file = this.plugin.app.workspace.getActiveFile()
        let yaml = await FrontMatterYAML.GetYAMLtxt(file, this.plugin)
        if (YAML.hasScalarWithCommentInYAMLSeq(yaml, 'tags', this.declare)) return
        this.main(file);
    }
    protected registFileEvent() {
        if (this.plugin.settings.autoInsertSynonym == 0) return;
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
                this.main();
            }
        });
        this.plugin.addCommand({
            id: "切换自动导入同义词",
            name: "切换/关闭/开启自动同义词",
            callback: () => {
                this.plugin.settings.autoInsertSynonym = (this.plugin.settings.autoInsertSynonym + 1) % 2
                this.plugin.saveSettings();
                new Notice('自动自动导入同义词:' + Switch[this.plugin.settings.autoInsertSynonym]);
            }
        });
        this.plugin.addCommand({
            id: "Switch auto simplifySynonyms",
            name: "切换/Switch/关闭/开启自动简化导入的同义词标签",
            callback: () => {
                this.plugin.settings.autoSimplifySynonyms = (this.plugin.settings.autoSimplifySynonyms + 1) % 2
                this.plugin.saveSettings();
                new Notice('自动简化导入的同义词标签:' + Switch[this.plugin.settings.autoSimplifySynonyms]);
            }
        });
    }
    async main(file?: TFile) {
        if (file) this.file = file
        else {
            this.file = this.plugin.app.workspace.getActiveFile()
        }
        this.reqController.reqList = []
        this.reqController.reqAbort = false
        const request = new Request();
        const appid = this.plugin.settings.xunfeiAPI.appid
        const appkey = this.plugin.settings.xunfeiAPI.appkey
        if (!appid || !appkey) {
            new Notice('please configure APIkey!')
            return
        }
        this.materials = this.getMaterials();
        console.log('materials:\n', this.materials)
        this.explicitKeys = Yaml.parse(await FrontMatterYAML.GetYAMLtxt(this.file, this.plugin))?.keys as undefined | null | string[]
        let id = 0
        for (const material of this.materials) {
            let reqInfo: REQ_INFO = {
                'ID': id,
                'stat': 'unRespon',
                'respon': null,
                'requestor': () => {
                    // console.log('material: ' + material)
                    request.xunFeiAPI(appkey, appid, material)
                        .then((data: xunfeiData[]) => {
                            this.responHandle(data, reqInfo)
                        }).catch((err: Error) => {
                            this.errorHandle(err, reqInfo)
                        });
                },
                'errCount': 0
            }
            this.reqController.reqList.push(reqInfo)
            id++;
        }
        /* 间隔并发,更稳定 */
        for (const reqInfo of this.reqController.reqList) {
            await sleep(600)
            reqInfo.requestor()
        }
    }
    errorHandle(err: Error, reqInfo: REQ_INFO) {
        reqInfo.errCount++;
        reqInfo.stat = 'error'
        if (err.message?.search(/timeout/i) != -1)
            if (reqInfo.errCount < 3 && !this.reqController.reqAbort) {
                reqInfo.requestor()
                return
            }
        this.reqController.reqAbort = true
        console.log(err.message);
        new Notice('error:' + err.message, 10000);
        this.plugin.fundebug?.notifyError(err)
    }
    responHandle(data: xunfeiData[], reqInfo: REQ_INFO) {
        /* 更新请求状态 */
        reqInfo.stat = 'success'
        reqInfo.respon = data

        let allRespon = true;
        for (const req of this.reqController.reqList) {
            if (req['stat'] != 'success') { allRespon = false; break; }
        }
        if (allRespon) {
            let allData: xunfeiData[] = []
            for (const req of this.reqController.reqList) {
                allData.push(...(req['respon'] as xunfeiData[]))
            }
            this.insertSynonym(allData, this.materials)
        }
    }
}