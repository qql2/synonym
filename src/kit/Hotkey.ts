// import Synonym from '../../main';

// export class Hotkey {
//     constructor(plugin: Synonym) {
//         if (plugin) this._plugin = plugin;
//     }
//     private _plugin: Synonym;
//     Prepareflag: boolean
//     registCombinAndSingleHotkey<K extends keyof WindowEventMap>(el: Window, type: K, firstKey: string, secondKey: string, SingleHotkey: string, Combinecallback: (this: HTMLElement, ev: KeyboardEvent) => any, Singlecallback?: (this: HTMLElement, ev: KeyboardEvent) => any, options?: boolean | AddEventListenerOptions): void {
//         let HandleSingle = function (this: HTMLElement, evt: KeyboardEvent) {
//         }
//         if (SingleHotkey && Singlecallback) {
//             HandleSingle = function (this: HTMLElement, evt: KeyboardEvent) {
//                 if (evt.key == SingleHotkey) { Singlecallback(this, evt) }
//             }
//         }
//         function HandCombin(el: HTMLElement, ev: KeyboardEvent) {
//             Combinecallback(el, ev);
//             el.removeEventListener('keyup', HandCombin)
//         }
//         this._plugin.registerDomEvent(el, 'keyup', (evt: KeyboardEvent) => {
//             if (evt.key == firstKey) {
//                 if (!this.Prepareflag) {
//                     this._plugin.registerDomEvent(el, 'keyup', HandCombin)
//                 }
//             }
//             HandleSingle(el, evt);
//         })
//     }
// }