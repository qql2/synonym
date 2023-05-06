import Synonym from '../main';
import { Test1 } from './prTest';
import { Testlog } from '../constant/consisit';

export class Test2 {
    private _plugin: Synonym;
    constructor(plugin: Synonym) {
        this._plugin = plugin;
    }
    test(): void {
    }
    private _leftMod: HTMLElement;
    setLeftMod(css: string = '.workspace-split.mod-horizontal.mod-left-split') {
        this._leftMod = document.querySelector(css);
    }
    registKey() {
        this._leftMod.removeEventListener('keyup', this.keyHandle.bind(this));
        this._leftMod.addEventListener('keyup', this.keyHandle.bind(this));
    }
    keyHandle(ev: KeyboardEvent) {
        Testlog(ev.key);
    }
}