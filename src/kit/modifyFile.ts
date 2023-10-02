/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { Plugin, TFile } from 'obsidian';

import { Kit } from "./kit";

export class ModifyFile {
    constructor() { }
    /**
     * Replaces a range of text in a file with new data and saves the changes.
     * @param file - The file to modify.
     * @param plugin - The plugin instance.
     * @param start - The starting index of the range to replace. 闭区间
     * @param end - The ending index of the range to replace. 开区间
     * @param data - The new data to replace the range with.
     * @param saveTimeout - The timeout (in milliseconds) to wait before saving the changes.
     * 推荐不低于obsidian自动保存间隔
     * @returns A Promise that resolves to `true` if the changes were saved successfully.
     * @throws An error if `end` is less than `start`.
     */
    static async replaceRange(file: TFile, plugin: Plugin, start: number, end: number, data: string, saveTimeout = 500): Promise<boolean> {
        if (start > 0 && end > 0 && end < start) throw new Error('end must be greater than start')
        let vault = plugin.app.vault
        if (plugin.app.workspace.getActiveFile() === file) {
            let save
            save = new Promise((resolve, reject) => {
                function clear() {
                    plugin.app.vault.off('modify', modifyHandle)
                    clearTimeout(timeId)
                }
                let timeId = setTimeout(() => {
                    clear()
                    resolve(true)
                }, saveTimeout)
                let modifyHandle = (modifiedFile: TFile) => {
                    if (modifiedFile !== file) return
                    console.log("modified!")
                    clear()
                    resolve(true)
                }
                plugin.app.vault.on('modify', modifyHandle)
            })
            await save
        }
        let doneFileStr = Kit.replaceRange(await vault.read(file), start, end, data)
        await vault.modify(file, doneFileStr)
        return true
    }
}