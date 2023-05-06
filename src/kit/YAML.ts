/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { Document, Pair, ParsedNode, Scalar, YAMLMap, YAMLSeq, parseDocument, visit } from "yaml";

import { TFile } from "obsidian";

export class YAML {
    protected _file: TFile;
    constructor() {
    }
    set file(file: TFile) {
        if (file.constructor != TFile) throw new Error("this is not a TFile")
        this._file = file
    }
    static setTagsInYAML(yaml: string, inTags: string[], comment?: string): string {
        let name = 'tags'
        let doc = parseDocument(yaml)
        let existingTags = doc.get(name) as null | YAMLSeq<Scalar>
        let newTagsScalar = new Scalar(inTags.join(' '))
        newTagsScalar.comment = comment
        if (existingTags) {
            existingTags.flow = false
            let oldTagsScalarIndex: number | null = null
            if (comment) { oldTagsScalarIndex = this.indexOfScalarWithComment(existingTags, comment) }
            if (oldTagsScalarIndex == null) existingTags.add(newTagsScalar)
            else {
                existingTags.items[oldTagsScalarIndex] = newTagsScalar
            }
            if (comment) {
                let doneStr = this.removeFaultTagScalar(doc, yaml, comment)
                doc = parseDocument(doneStr)
                doneStr = this.removeFaultTagScalar(doc, yaml, comment + ' *: *')
                doc = parseDocument(doneStr)
            }
        }
        else {
            let tagsSeq = new YAMLSeq()
            tagsSeq.add(newTagsScalar)
            let tagsPair = new Pair(name, tagsSeq)
            if (!doc.contents) {
                let yamlMap = new YAMLMap() as ParsedNode
                doc.contents = yamlMap
            }
            doc.add(tagsPair)
        }
        return doc.toString({ lineWidth: 0 })
    }
    protected static removeFaultTagScalar(doc: Document.Parsed<ParsedNode>, yaml: string, comment: string): string {
        let origStr = doc.toString({ lineWidth: 0 })
        let rgx = new RegExp(`( *# *${comment} *)\n((?<=\n) *- {1,}(([^ \n]*?) {1,})*([^ \n]*?) *\n)`)
        let doneStr = origStr.replace(rgx, '')
        return doneStr
    }
    static indexOfScalarWithComment(yamlSeq: YAMLSeq<Scalar<unknown>>, comment: string) {
        for (let index = 0; index < yamlSeq.items.length; index++) {
            let scalar = yamlSeq.items[index]
            if (scalar.comment == comment || scalar.commentBefore == comment) return index
        }
        return null
    }
    static getPair(doc: Document.Parsed<ParsedNode>, keyName: string) {
        let wholeMap = doc.contents as YAMLMap
        let targetPair: Pair | null = null
        visit(wholeMap, {
            Pair(_, pair: Pair) {
                let key = pair.key as any
                if (key.constructor === Scalar) {
                    if (key.value === keyName) {
                        targetPair = pair
                    }
                }
            }
        })
        return targetPair
    }
    static hasScalarWithCommentInYAMLSeq(yaml: string, yamlSeqKey: string, comment: string) {
        let doc = parseDocument(yaml)
        let yamlSeq = doc.get(yamlSeqKey) as any
        if (yamlSeq?.constructor !== YAMLSeq) return false
        for (let i = 0; i < yamlSeq.items.length; i++) {
            let scalar = yamlSeq.items[i]
            if (scalar.constructor !== Scalar) continue;
            if (scalar.comment === comment || scalar.commentBefore === comment) return true
        }
        return false
    }



    // async PutTagsInYAML(declare = '', tags: string[], yamltagsPos?: any, yamltags?: string) {
    //     if (!EnhancEditor.hasEditor(this.plugin)) return;
    //     if (!yamltagsPos) yamltagsPos = await this.getYAMLMultilineTagsPos();
    //     if (!yamltags) yamltags = await this.getYAMLtags(yamltagsPos);
    //     // Testlog('yamltxt:\n' + yamltxt);
    //     let rgx = null
    //     const format = new RegExp("(#" + declare + ")\n((?<=\n)- {1,}(([^ \n]*?) {1,})*([^ \n]*?) *\n)", 'g');
    //     // Testlog('format:\n' + format);
    //     if (yamltags.search(format) == -1) {
    //         rgx = /$/;
    //     }
    //     else rgx = format;
    //     const newtxt = yamltags.replace(rgx, () => {
    //         const YAMLtag = tags.map(v => v.replace(/#/, ''));
    //         return "#" + declare + "\n- " + YAMLtag.join(' ') + "\n"
    //     })
    //     let vault = this.plugin.app.vault
    //     await vault.modify(this._file, Kit.replaceRange(await vault.read(this._file), yamltagsPos.start, yamltagsPos.end, newtxt))
    // }
    // async getYAMLPos(autoCreYAML = true) {
    //     const doc = await this.plugin.app.vault.read(this._file);
    //     const hasYAMLRgx = /(^---\n)(.)*?(\n?---(\n|$))/gs
    //     let hasYAML = false;
    //     let str = '';
    //     let index = 4;
    //     doc.replace(hasYAMLRgx, (word, ...arg) => {
    //         hasYAML = true;
    //         if (word) str = word;
    //         index = arg.slice(-2)[0];
    //         return word;
    //     })
    //     if (!hasYAML) {
    //         console.log('no YAML!')
    //         if (!autoCreYAML) return;
    //         const YAML = '---\n---\n';
    //         await new ModifyEditor(this.plugin).InsertTxt(this._file, 0, YAML);
    //         return { end: YAML.length - 1, start: 0 };
    //     }
    //     const FinalLineOffset = str.length - 1 + index;
    //     return { end: FinalLineOffset, start: 0 };
    // }
    // async GetYAMLtxt(yamlPos?: any) {
    //     if (!yamlPos) yamlPos = await this.getYAMLPos();

    //     const txt = (await this.plugin.app.vault.read(this._file)).slice(yamlPos.start, yamlPos.end + 1)
    //     return txt;
    // }
    // async getYAMLMultilineTagsPos(yamlPos?: any, yamltxt?: string, autoCre = true): Promise<any> {
    //     if (!yamlPos) yamlPos = await this.getYAMLPos()
    //     if (!yamltxt) yamltxt = await this.GetYAMLtxt(yamlPos);
    //     // console.log('yamltxt:', yamltxt)
    //     const rgx = /((?<=\n|^)tags: *\n)((((?<=\n)- {1,}((.*?) {1,})*((.*?) *)(\n|$))|((?<=\n)#(?<annota>.*?)\n))*)/g;
    //     let yamltagsIndex: number;
    //     let yamltagsLen: number;
    //     yamltxt.replace(rgx, (word, ...args) => {
    //         yamltagsIndex = args.slice(-3)[0];
    //         yamltagsLen = word.length;
    //         return word;
    //     })
    //     // console.log('index:', yamltagsIndex)
    //     // console.log('len:', yamltagsLen);
    //     if (yamltagsIndex) {
    //         const rst = { start: yamltagsIndex, end: yamltagsIndex + yamltagsLen - 1 };
    //         return rst;
    //     }
    //     if (!autoCre) return null;
    //     const newyamltag = 'tags:\n';
    //     const newYaml = yamltxt.replace(/(?<!^)(?=---)/, newyamltag);
    //     let vault = this.plugin.app.vault
    //     await vault.modify(this._file, Kit.replaceRange(await vault.read(this._file), yamlPos.start, yamlPos.end, newYaml))
    //     return this.getYAMLMultilineTagsPos();
    // }
    // getYAMLfield(field: string) {
    //     let file = this.plugin.app.workspace.getActiveFile()
    //     let cache = this.plugin.app.metadataCache.getFileCache(file)
    //     let rst = null
    //     if (cache.frontmatter) {
    //         rst = cache.frontmatter[field]
    //     }
    //     return rst
    // }
    // async getYAMLtags(yamltagsPos?: any): Promise<string> {
    //     if (yamltagsPos) yamltagsPos = await this.getYAMLMultilineTagsPos();
    //     let vault = this.plugin.app.vault
    //     return (await vault.read(this._file)).slice(yamltagsPos.start, yamltagsPos.end + 1)
    // }
    // async hasDeclareInYAML(declare: string, yamltagsPos?: any, yamltags?: string) {
    //     if (!yamltagsPos) yamltagsPos = await this.getYAMLMultilineTagsPos();
    //     if (!yamltags) yamltags = await this.getYAMLtags(yamltagsPos);
    //     const format = new RegExp("(#" + declare + ")\n((?<=\n)- {1,}(([^ \n]*?) {1,})*([^ \n]*?) *\n)", 'g');
    //     return yamltags.search(format) != -1;
    // }
}