/* eslint-disable no-useless-escape */
/* eslint-disable prefer-const */

import { Editor, EditorPosition } from 'obsidian';

import Synonym from 'main';

export class EnhancEditor {
    static EOL = "(\r?\n|\r)"
    constructor(plugin: Synonym, editor?: Editor) {
        if (editor) {
            plugin.cache.editor = editor; plugin.saveSettings();
        }
        this.plugin = plugin;
    }
    protected plugin: Synonym;

    static updateEditorAndMDV(plugin: Synonym) {
        // @ts-ignore
        plugin.app.commands.executeCommandById("qql1-Plugin:插件初始化");
    }
    static hasEditor(plugin: Synonym) {
        if (plugin.cache.editor) return true;
        EnhancEditor.updateEditorAndMDV(plugin);
        return false;
    }
    static GetMutiLineInSlection(plugin: Synonym) {
        /*获得多行输入*/
        const editor = plugin.cache.editor;
        let Line1 = editor.getCursor('from');
        let Line2 = editor.getCursor('to');
        if (Line2.line < Line1.line) { const temp = Line2; Line2 = Line1; Line1 = temp; }
        Line1.ch = 0; Line2.ch = Infinity;
        editor.setSelection(Line2, Line1);
        return { txt: editor.getSelection(), startPos: Line1, endPos: Line2 }
    }
    static GetPasteTxt(plugin: Synonym, BeforPos: EditorPosition) {
        const editor = plugin.cache.editor;
        //Testlog("BeforPos:"+BeforPos.ch+"\t"+BeforPos.line);
        const AfterPos = editor.getCursor();
        //Testlog("AfterPos:"+AfterPos.ch+"\t"+AfterPos.line);
        editor.setSelection(BeforPos, AfterPos);
        return { txt: editor.getSelection(), startPos: BeforPos, endPos: AfterPos }
    }
    static getSelectedTag(plugin: Synonym) {
        const editor = plugin.cache.editor;
        if (!editor) return;
        const raw = editor.getSelection();
        const txt = raw.replace(/#/, '');
        return txt;
    }
}