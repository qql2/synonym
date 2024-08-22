/* eslint-disable prefer-const */
/* eslint-disable no-debugger */

import { Editor, MarkdownView, Notice } from 'obsidian';

import Synonym from '../main';
import { SynonymCore } from './kit/synonym';
import { Tag } from './kit/tag';

interface SETTINGS {
    ignoreCase: boolean
}
export type { SETTINGS as MERGE_SYNONYM_SETTINGS }

const defaultSettings: SETTINGS = {
    ignoreCase: true
}
export { defaultSettings as MergeSynonymDefaultSettings }

export class MergeSynonym {
    protected plugin: Synonym;
    protected Vtags: string[];
    protected tagflag: Map<any, any>;
    constructor(plugin: Synonym) {
        this.plugin = plugin;
        this.addCommand()
    }
    addCommand() {
        this.plugin.addCommand({
            id: "一键合并库中所有有交集的同义词标签",
            name: "一键合并merge库中所有有交集的同义词标签tag",
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.main2();
            }
        });
    }
    /** 合并同义词标签的顶层api
     * 
     * 
    */
    async main2() {
        this.tagflag = new Map();
        this.iterVaultSynonymsAndMerge()
    }
    /** 动态遍历所有的同义词标签,并根据该同义词组找到存在交集的同义词组, 然后合并它们*/
    async iterVaultSynonymsAndMerge() {
        this.Vtags = Tag.getVaultTags(this.plugin);
        for (const t of this.Vtags) {
            if (this.tagflag.get(t) == 'scanned') continue;
            if (!SynonymCore.isSynonym(t)) continue;
            const synons = this.getRelatedSynonym(t, this.plugin.settings.ignoreCase);
            const tagChange = this.getMergeChange(synons);
            if (!await this.updateSynonym(tagChange)) {
                // 该标签没有存在交集的同义词组, 无需合并
                this.tagflag.set(t, 'scanned');
                continue;
            }
            /* 产生了有效合并, 标签发生了变化, 需要获取新的标签数据来继续遍历 */
            this.iterVaultSynonymsAndMerge();
            return;
        }
        new Notice('Have merge all vault tags!');
    }
    // async main() {
    //     this.Vtags = Tag.getVaultTags(this.plugin);
    //     this.tagflag = new Map();
    //     for (const t of this.Vtags) {
    //         /* 跳过不存在的标签 */
    //         if (this.tagflag.get(t) == 'unexist') continue;
    //         const synons = this.getRelatedSynonym(t);
    //         const tagChange = this.getMergetag(synons);
    //         // console.log('rawin:\n', 'newtag:\n', newtag, '\n---\n', 'synons:\n', synons);
    //         if (await this.updateSynonym(tagChange)) this.copeMerge(tagChange)
    //     }
    //     new Notice('Have merge all vault tags!');
    //     //console.dir(this.Vtags);
    // }
    // copeMerge(tagChange: Map<string, string>) {
    //     for (const old of tagChange.keys()) {
    //         this.tagflag.set(old, 'unexist');
    //     }
    //     const newtags = [...new Set(tagChange.values())]
    //     this.Vtags.push(...newtags);
    // }
    /** 
     * @returns 是否发生了有效合并(有多个标签被合并为一个标签, 而不是只有一个标签需要被合并)
     * 
     */
    async updateSynonym(tagChange: Map<string, string>) {
        if (!tagChange) return false;
        const olds = [...tagChange.keys()]
        let allSame = true;
        for (const oldT of olds) {
            if (oldT != tagChange.get(oldT)) {
                allSame = false;
                break;
            }
        }
        /* 不需要合并 */
        if (allSame) return false;
        const newTags = [...new Set(tagChange.values())].join('\n · ')
        console.log('Now merge\n· ' + olds.join('\n· ') + '\nto\n · ' + newTags);
        new Notice('Now merge\n· ' + olds.join('\n· ') + '\nto\n · ' + newTags, 8 * 1000);
        let rst = false
        for (const old of olds) {
            /*  全部合并成功 true
                合并成功+合并失败 true
                全部合并失败 false
                只有有一个合并成功,就返回true*/
            if (old == tagChange.get(old)) continue;
            let ret = await new Tag(this.plugin).autoRenameTagAndAnnota(old, tagChange.get(old))
            if (ret === true) rst = true;
        }
        return rst;
    }
    /**
     * 合并结果: 
     * - 将多个有交集的同义词组去重合并为一个同义词组
     * - 把原来每个被合并的同义词组都替换为新的同义词组
     * @return 多个键值对, 键名为原标签, 键值为将要被替换的新标签 */
    getMergeChange(tags: string[]) {
        const tagChange = new Map();
        if (tags.length <= 1) {
            tagChange.set(tags[0], tags[0]);
            return tagChange;
        }
        let newlst: string;
        const lsts = tags.map(t => Tag.getLstOfTag(t))
        let keys = [];
        for (const l of lsts) {
            keys.push(...(SynonymCore.splitSynonymSet(l)));
        }
        keys = [...new Set(keys)];
        if (keys.length == 1) {
            newlst = keys[0] + '-';
        }
        else {
            newlst = keys.join('-');
        }
        tags.forEach((t, i) => {
            const newtag = t.replace(lsts[i], newlst);
            tagChange.set(t, newtag);
        })
        return tagChange;
    }
    /** 
     *  获取与目标同义词组有交集(都具有相同的同义词)的所有同义词组
     * @returns 一个数组
     */
    getRelatedSynonym(SynonymTag: string, ignoreCase = true) {
        /* 去掉可能的# */
        SynonymTag = SynonymTag.replace('#', '');
        /* 提取最后一层作为代表 */
        SynonymTag = Tag.getLstOfTag(SynonymTag)
        const keys = SynonymCore.splitSynonymSet(SynonymTag)
        const tags = Tag.getVaultTags(this.plugin);
        const rst = tags.filter(t => {
            if (!SynonymCore.isSynonym(t)) return false
            /* 排除掉算法中已经不存在的标签 */
            if (this.tagflag.get(t) == 'unexist') return false;
            /* 取最后一层的子标签作为判断依据 */
            const lst = Tag.getLstOfTag(t)
            return SynonymCore.matchSynonymByIndependentKeys(lst, keys, ignoreCase)
        });
        return rst.map(v => v.replace('#', ''));
    }
}