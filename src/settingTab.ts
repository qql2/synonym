/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */

import { App, Plugin, PluginSettingTab } from "obsidian";

export class SettingTab extends PluginSettingTab {
    static settingAdders: ((containerEl: HTMLElement) => HTMLElement)[] = [];
    constructor(public plugin: Plugin) {
        super(plugin.app, plugin);
    }
    /** 入口 */
    display() {
        let { containerEl } = this;
        containerEl.empty()
        for (const func of SettingTab.settingAdders) {
            containerEl = func(containerEl)
        }
    }
    static addSettingAdder(settingAdder: typeof this.settingAdders[0]): void {
        this.settingAdders.push(settingAdder)
    }
}