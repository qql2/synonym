/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Plugin, TFile, Vault } from 'obsidian';

import { Kit } from "./kit";
import { ModifyFile } from './modifyFile';
import { YAML } from "./YAML";

/** 左闭右闭区间
 * 如果end-start=-1, 表示处于end到start之间的空字符串
 */
declare interface YAML_POS {
    start: number
    end: number
}
type YAML_POS_NULL<T extends boolean> = T extends true ? YAML_POS : (YAML_POS | null)

export class FrontMatterYAML {
    constructor() {

    }
    static async putTagsToFrontMatter(tags: string[], file: TFile, plugin: Plugin, yamlPos?: YAML_POS, comment?: string): Promise<boolean> {
        if (tags.length == 0) return false
        tags.map((v) => v.replace('#', ''))
        if (!yamlPos) yamlPos = await this.getYAMLPos(file, plugin)
        let yamlStr = await this.GetYAMLtxt(file, plugin, yamlPos)
        let doneYamlStr = YAML.setTagsInYAML(yamlStr, tags, comment)
        if (yamlPos.end - yamlPos.start == -1) {
            await ModifyFile.replaceRange(file, plugin, yamlPos.start, yamlPos.start, doneYamlStr)
        }
        else {
            await ModifyFile.replaceRange(file, plugin, yamlPos.start, yamlPos.end + 1, doneYamlStr)
        }
        return true
    }
    /**  */
    static async getYAMLPos<T extends boolean>(file: TFile, plugin: Plugin, autoCreYAML: T = <T>true): Promise<YAML_POS_NULL<T>> {
        const doc = await plugin.app.vault.read(file);
        const hasYAMLRgx = /(^---\n)(.)*?(\n?---(\n|$))/gs
        let hasYAML = false;
        let str = '';
        let index = 4;
        doc.replace(hasYAMLRgx, (word, ...arg) => {
            hasYAML = true;
            if (word) str = word;
            index = arg.slice(-2)[0];
            return word;
        })
        if (!hasYAML) {
            console.log('no YAML!')
            if (!autoCreYAML) return null;
            const YAML = '---\n---\n';
            await ModifyFile.replaceRange(file, plugin, 0, 0, YAML)
            return { start: YAML.length - 4, end: 3 };
        }
        const FinalLineOffset = str.length - 1 + index;
        return { start: 4, end: FinalLineOffset - 4 };
    }
    static async GetYAMLtxt(file: TFile, plugin: Plugin, yamlPos?: YAML_POS, autoCreYaml = true) {
        if (!yamlPos) yamlPos = await this.getYAMLPos(file, plugin, autoCreYaml);
        if (!yamlPos || yamlPos.end - yamlPos.start == -1) return ''
        const txt = (await plugin.app.vault.read(file)).slice(yamlPos.start, yamlPos.end + 1)
        return txt;
    }
}