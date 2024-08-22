/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { Notice } from 'obsidian';
import { Split } from './split';
import Synonym from '../../main';
import { Tag } from './tag';

export interface MATCH_RST {
    specialMeaning: string[];
    generalized: string[]
}

export class SynonymCore {
    plugin: Synonym;
    constructor(plugin: Synonym) {
        this.plugin = plugin;
    }
    static addCommand(plugin: Synonym) {
        plugin.addCommand({
            id: "切换同义词忽略大小写",
            name: "切换同义词忽略大小写",
            editorCallback: async () => {
                plugin.settings.ignoreCase = plugin.settings.ignoreCase ? false : true;
                await plugin.saveSettings();
                new Notice(`同义词忽略大小写:${plugin.settings.ignoreCase}`);
            }
        });
    }
    // static getSynonymSplitRgx(): { [Symbol.split](string: string, limit?: number): string[]; } {
    //     return /(?<!（[^（）]*?)-(?![^（）]*?）)/g;
    // }
    static assemRelatedSynonymRgxWithKeys(keys: string[], ignoreCase = true) {
        if (!keys) throw new Error("No keys!");
        const rgxs = []
        for (const k of keys) {
            const temp = this.assemRelatedSynonymRgxStrWithOneKey(k);
            //console.log('temp:\n', temp)
            rgxs.push(temp);
        }
        return new RegExp(rgxs.join('|'), `${ignoreCase ? 'i' : ''}`);
    }
    static assemRelatedSynonymRgxStrWithOneKey(k: string) {
        return `(?<!（[^（）]*?)(?<=（|\/|#|^|-)${k}(?=-)(?![^（）]*?）)|(?<!（[^（）]*?)(?<=-)${k}(?=）|$|-|\/)(?![^（）]*?）)`
    }
    collectMatchedSynonym(matchMap: Map<string, MATCH_RST>): string[] {
        const synonym = [];
        for (const matchRst of matchMap.values()) {
            if (matchRst.specialMeaning.length) synonym.push(...matchRst.specialMeaning);
            else if (matchRst.generalized.length) synonym.push(...matchRst.generalized);
        }
        return [...new Set(synonym)];
    }
    // /** @return 一个正则表达式, 能够同时匹配广义和特殊意义的关键字 */
    // assemRgxWithSpecialKey(k: string, sceneK: Array<string>): RegExp {
    //     const sceneRgxstr: string = this.assemSceneRgxStr(sceneK);
    //     return new RegExp(`(?<!（[^（）]*?)(?<=（|\/|#|^|-)(?<annotation1>（.*?(${sceneRgxstr}).*?）)?${k}(?=-)(?![^（）]*?）)|(?<!（[^（）]*?)(?<=-)(?<annotation2>（.*?(${sceneRgxstr}).*?）)?${k}(?=）|$|-|\/)(?![^（）]*?）)`, 'g')
    // }
    // assemSceneRgxStr(sceneK: string[]): string {
    //     const rgxs = [];
    //     for (const k of sceneK) {
    //         rgxs.push(`(?<=（|\/|#|^|-)${k}(?=-)|(?<=-)${k}(?=）|$|-|\/)`)
    //     }
    //     return rgxs.join('|');
    // }
    // /**
    //  * @returns false表示没有匹配成功, 成功则返回注释内容,无则返回null
    //  */
    // matchWideKeyInSynonym(targetK: string, synonym: string) {
    //     const rgx = new RegExp(`(?<annotation>（.*?）)? (?<=）|^) ${targetK}$`)
    //     for (const key of Split.splitWithBracket(synonym, /-/g).filter(i => i) as string[]) {
    //         for (const match of key.matchAll(rgx)) {
    //             return match.groups['annotation'] ? match.groups['annotation'] : null
    //         }
    //         return false
    //     }
    // }




    /** 根据一组关键字,从库中获取有关的同义词标签,优先获取这组关键字所构成特殊意义下的同义词标签
     *  @param autoExpand 是否用匹配到的同义词标签来拓展原有的关键字,进而匹配到更多的同义词标签 
     *  @param keys 彼此之间具有解释作用;可以带有注释内容
    */
    getRelativeSynonym(keys: string[], autoExpand = false) {
        let synonyms: string[]
        if (keys.length == 0) { return [] }
        /* 初始化 */
        /* 每个关键字对应一组同义词组 */
        const matchMap = new Map<string, MATCH_RST>();
        for (const k of keys) {
            matchMap.set(k, { specialMeaning: [], generalized: [] });
        }
        for (const t of Tag.getVaultTags(this.plugin)) {
            let match = this.matchSynonymBySceneKeys(t, keys, this.plugin.settings.ignoreCase)
            for (const k of match.generalized) {
                matchMap.get(k).generalized.push(t)
            }
            for (const k of match.specialMeaning) {
                matchMap.get(k).specialMeaning.push(t)
            }
        }

        synonyms = this.collectMatchedSynonym(matchMap)
        if (autoExpand) {
            let preKeys: string[]
            let expendKeys: string[]
            for (let i = 0; i < 20; ++i) {
                expendKeys = SynonymCore.getExpendKeys(synonyms)
                preKeys = keys
                keys = keys.concat(...expendKeys)
                keys = [...new Set(keys)]
                if (keys.length <= preKeys.length) break
                synonyms = this.getRelativeSynonym(keys, false)
            }
        }
        // debugger
        return synonyms
    }
    /** 根据一组同义词标签, 将这些同义词标签的整条父级链和子级都拆分为多个关键字
     *  @return 未去重
    */
    static getExpendKeys(synonyms: string[]) {
        let expendKeys: string[] = []
        for (const synonym of synonyms) {
            let synonymSnippets = synonym.split('/').filter(v => v)
            for (const synonymSnippet of synonymSnippets) {
                if (SynonymCore.isSynonym(synonymSnippet))
                    expendKeys.push(...SynonymCore.splitSynonymSet(synonymSnippet))
            }
        }
        return expendKeys
    }

    /** 用一组关键字尝试匹配一个同义词标签
     * @param keys 这些关键字有互相解释作用;关键字可以带有注释内容
    */
    matchSynonymBySceneKeys(targetSynonym: string, keys: string[], ignoreCase: boolean = undefined) {
        let rst: {
            specialMeaning: string[],
            generalized: string[]
        } = {
            specialMeaning: [],
            generalized: []
        }
        if (!SynonymCore.isSynonym(targetSynonym)) return rst
        /* 拿最后一层的子标签作为当前标签的代表 */
        let targetSynonymLst = Tag.getLstOfTag(targetSynonym);
        for (const key of keys) {
            const restK = keys.filter(v => v != key)
            let matches = this.matchKeyWithAnnotation(targetSynonymLst, key, ignoreCase)
            for (const match of matches) {
                if (!match.groups.annotation) {
                    rst.generalized.push(key)
                }
                else if (this.isSpecial(match.groups.annotation, restK, ignoreCase)) rst.specialMeaning.push(key)
                // if (key == 'bb') debugger
            }
        }
        // if (keys.includes('前端') && keys.includes('标签') && targetSynonym.search('标签') != -1 && targetSynonym.search('前端') != -1) debugger;
        return rst
    }
    /** 用一组彼此独立的关键词(这些关键词之间没有解释作用)尝试匹配一个同义词标签
     * @param keys 这些关键字没有互相解释作用
     * @returns 只要目标同义词组中包含任意一个关键字,就返回true
     */
    static matchSynonymByIndependentKeys(targetSynonym: string, keys: string[], ignoreCase = true) {
        let targetKeys = SynonymCore.splitSynonymSet(targetSynonym)
        if (ignoreCase) {
            targetKeys = targetKeys.map(i => i.toLowerCase())
            keys = keys.map(i => i.toLowerCase())
        }
        for (const k of keys) {
            if (targetKeys.includes(k)) return true
        }
        return false
    }
    static isSynonym(str: string): boolean {
        str = Tag.getLstOfTag(str)
        let bracketRange = Split.getBracketRange(str)
        let rst = false
        for (const match of str.matchAll(/-/g)) {
            if (Split.isInBracket(match.index as number, bracketRange, 0)) {
                rst = true
            }
        }
        return rst
    }
    /** 根据一组场景关键字, 判断是否符合注释要求 */
    private isSpecial(annotation: string, SceneKeys: string[], ignoreCase: boolean = undefined) {
        if (!annotation) return false
        let splitRgx = /[，；！【】]/g
        /* 以括号外的分割符进行分割，得到下一层用于注释的同义词组 */
        let synonymSets = Split.splitWithBracket(annotation, splitRgx, 0).filter(v => v);
        let synonymSetValue = new Map();
        for (const sySet of synonymSets) {
            let matchRst = this.matchSynonymBySceneKeys(sySet, SceneKeys, ignoreCase)
            if (matchRst.generalized.length || matchRst.specialMeaning.length) {
                synonymSetValue.set(sySet, true)
            }
            else {
                synonymSetValue.set(sySet, false)
            }
        }
        return this.calcAnnotation(annotation, synonymSetValue)
    }

    /** 将注释内容转换为逻辑表达式进行求值 */
    private calcAnnotation(annotation: string, synonymBoolean: Map<string, boolean>): boolean {
        let express = annotation
        /* 把同义词替换为布尔值 */
        for (const sy of synonymBoolean) {
            express = express.replace(new RegExp(sy[0], 'g'), `${sy[1]}`)
        }
        /* 把自定义括号替换为圆括号 */
        express = express.replace(/【/g, '(').replace(/】/g, ')')
        /* 把自定义逻辑运算符替换为js逻辑运算符 */
        express = express.replace(/！/g, '!').replace(/，/g, '&&').replace(/；/g, '||')
        let rst = false
        try {
            rst = new Function('return ' + express)()
        } catch (error) {
            new Notice(`!${error}
            express:${express}
            annotation:${annotation}`)
        }
        /* 动态创建函数以计算表达式 */
        // debugger
        return rst
    }

    /** 从目标标签中同时捕获目标关键字和其可能的注释内容
     * @returns 每个匹配项都有annotation捕获组，表示可能存在的注释内容，可能为undefined
     */
    private matchKeyWithAnnotation(targetSynonym: string, targetK: string, ignoreCase = true) {
        const rst: RegExpMatchArray[] = []
        const rgx = new RegExp(`(（(?<annotation>.*?)）)?(?<=）|^)${targetK}$`, `g${ignoreCase ? 'i' : ''}`)
        for (const key of SynonymCore.splitSynonymSet(targetSynonym)) {
            const matches = Array.from(key.matchAll(rgx))
            if (matches.length) rst.push(...matches)
        }
        return rst;
    }
    /** @return 返回若干个同义词，已去空处理 */
    static splitSynonymSet(synonym: string): string[] {
        if (!SynonymCore.isSynonym(synonym)) throw new Error(`接受的参数:"${synonym}"不是一个同义词标签`)
        return Split.splitWithBracket(synonym, /-/g, 0, 0, [{ left: '（', right: '）' }]).filter(v => v)
    }
}