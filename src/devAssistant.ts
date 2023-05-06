/* eslint-disable prefer-const */

import { Editor, Notice, Setting } from "obsidian";

import { SettingTab } from "./settingTab";
import Synonym from "main";
import { startTest } from "test/testController";

export class devAssistant {
    constructor(public plugin: Synonym) {
        this.init()
    }
    private init() {
        this.loadLogger()
        this.addCommand()
        SettingTab.addSettingAdder(containerEl => this.devModeConfig(containerEl))
    }
    die() {
        this.plugin.fundebug?.silent()
        this.plugin.fundebug = null
    }
    protected addCommand() {
        this.plugin.addCommand({
            id: "Test",
            name: "Test",
            checkCallback: (checking) => {
                if (checking) {
                    return this.plugin.settings.devMode
                }
                devAssistant.Test(this.plugin);
            },
        });
    }
    private devModeConfig(containerEl: HTMLElement): HTMLElement {
        let contextLevel = 1
        let heading = document.createElement(`h${contextLevel}`)
        heading.innerText = "开发者设计"
        containerEl.appendChild(heading)
        new Setting(containerEl)
            .setName('开发者模式')
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.devMode)
                    .onChange(v => {
                        this.plugin.settings.devMode = v
                        this.plugin.saveSettings()
                    })
            })
        return containerEl
    }
    static Test(plugin: Synonym, editor?: Editor) {
        if (editor) {
            plugin.cache.editor = editor;
            plugin.saveSettings();
        }
        new Notice('Test now!');
        startTest(plugin)
    }
    protected async loadLogger() {
        try {
            //@ts-ignore
            let fundebug = await import('test/fundebug')
            this.plugin.fundebug = fundebug.loadLogger()
        } catch (error) {
            this.plugin.fundebug = null
        }
    }

}