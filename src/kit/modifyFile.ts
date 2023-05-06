/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { Plugin, TFile } from 'obsidian';

import { Kit } from "./kit";

export class ModifyFile {
    constructor() { }
    /** @param start 闭区间
     * @param end 开区间
     */
    static async replaceRange(file: TFile, plugin: Plugin, start: number, end: number, data: string): Promise<boolean> {
        if (start > 0 && end > 0 && end < start) throw new Error('end must be greater than start')
        let vault = plugin.app.vault
        let doneFileStr = Kit.replaceRange(await vault.read(file), start, end, data)
        await vault.modify(file, doneFileStr)
        return true
    }
}