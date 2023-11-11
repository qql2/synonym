/* eslint-disable no-useless-escape */
/* eslint-disable prefer-const */

import { TFile, getAllTags } from "obsidian";

import { CodeBlockJudge } from "code-block-judge";
import { Kit } from "./kit";
import Synonym from "main";

export class MdNote {
    static EOL = "(\r?\n|\r)"
    constructor() { }
    static isMdFile(mdFile: TFile) {
        if (mdFile.extension !== 'md'
            && mdFile.extension !== '.md'
            && mdFile.extension !== 'markdown'
            && mdFile.extension !== '.markdown') return false
        return true
    }
    static getBackLinkTxt(plugin: Synonym, file = plugin.app.workspace.getActiveFile()) {
        const rst = [];
        // @ts-ignore
        for (const linksOfNote of Object.values(plugin.app.metadataCache.getBacklinksForFile(file).data)) {
            // @ts-ignore
            for (const link of linksOfNote) {
                rst.push(link.displayText);
            }
        }
        return rst;
    }
    static getBackLinkFiles(plugin: Synonym, file = plugin.app.workspace.getActiveFile()) {
        // @ts-ignore
        let backLinks = plugin.app.metadataCache.getBacklinksForFile(file)
        let filePaths = Object.keys(backLinks.data)
        let rst = []
        for (const path of filePaths) {
            rst.push(plugin.app.metadataCache.getFirstLinkpathDest(path, path))
        }
        return rst
    }
    static getBackLinkFileNames(plugin: Synonym, file = plugin.app.workspace.getActiveFile()) {
        let rst = []
        for (const backFile of this.getBackLinkFiles(plugin, file)) {
            rst.push(backFile.basename)
        }
        return rst
    }
    static delMdFormat(str: string) {
        let txt = str;
        txt = MdNote.delYamlFormat(txt);
        txt = MdNote.delLinkFormat(MdNote.delCodeFormat(txt));
        txt = MdNote.delBoldFormat(MdNote.delHighlighFormat(txt));
        txt = MdNote.delAnnotaFormat(txt)
        return txt;
    }
    static delTag(txt: string) {
        let rgx = new RegExp(`(#.*)( |${MdNote.EOL})`, 'g')
        return txt.replace(rgx, '')
    }
    static delYamlFormat(txt: string): string {
        let EOL = this.EOL
        let rgx = new RegExp(`(^---${EOL})(.)*?(${EOL}?---(${EOL}|$))`, 'gs')
        return txt.replace(rgx, '')
    }
    static delExtension(str: string) {
        const rgx = /\.[^\.]*$/;
        return str.replace(rgx, '');
    }
    static delAnnotaFormat(str: string) {
        const rgx = /(?<!\\)%{2,}/g
        return str.replace(rgx, '');
    }
    static delCodeFormat(str: string) {
        const rgx = /(?<!\\)`+/g
        return str.replace(rgx, '');
    }
    static delHighlighFormat(str: string) {
        const rgx = /(?<!\\)=+/g
        return str.replace(rgx, '')
    }
    static delBoldFormat(str: string) {
        const rgx = /(?<!\\)\*+/g
        return str.replace(rgx, '');
    }
    static delLinkFormat(str: string) {
        let txt;
        const rgx = /\!?(?<!\\)\[(?<!\\)\[?|(?<!\\)\](?<!\\)\]?/g
        txt = str.replace(rgx, '')
        return txt;
    }
    static getPath(plugin: Synonym, withExtension: boolean, file: TFile) {
        const rawpath = file.path;
        if (withExtension) return rawpath;
        return MdNote.delExtension(rawpath);
    }
    static getBoldtxt(markdown: string) {
        const rgx = /(\*\*)(.+?)(\*\*)/g;
        const txt: string[] = [];
        markdown.replace(rgx, (word, ...args) => {
            if (!word) return word;
            if (new CodeBlockJudge(markdown).IsInAnyCodeBlock(args.slice(-2)[0])) return word;
            txt.push(args[1]);
        })
        return txt;
    }
    static getHilighttxt(markdown: string) {
        const rgx = /(==)(\*{0,3})(?<str>.+?)(\*{0,3})(==)/g;
        const txt: string[] = [];
        markdown.replace(rgx, (word, ...args) => {
            if (!word) return word;
            if (new CodeBlockJudge(markdown).IsInAnyCodeBlock(args.slice(-3)[0])) return word;
            txt.push(args.slice(-1)[0]['str']);
        })
        return txt;
    }
    static async getHeadings(plugin: Synonym, file?: TFile) {
        const app = plugin.app;
        if (!file) file = app.workspace.getActiveFile();
        let timeout = 3000
        let delay = 500
        let cache
        for (let i = 0; i * delay <= timeout; i++) {
            await Kit.sleep(delay)
            cache = app.metadataCache.getFileCache(file)
            if (cache) break
        }
        if (!cache) throw new Error('cache not found')
        const txt: string[] = [];
        cache.headings?.forEach((v, i) => {
            txt.push(v['heading']);
        })
        return txt;
    }
    static getlinkTxt(plugin: Synonym, file?: TFile) {
        const app = plugin.app;
        if (!file) file = app.workspace.getActiveFile();
        const cache = app.metadataCache.getFileCache(file);
        const txt: string[] = [];
        cache.links?.forEach((v, i) => {
            txt.push(v['link']);
        })
        return txt;
    }
    static getActiveTags(plugin: Synonym, file: TFile) {
        file = plugin.app.workspace.getActiveFile();
        const cache = plugin.app.metadataCache.getFileCache(file);
        return getAllTags(cache).map(v => v.replace('#', ''));
    }
}