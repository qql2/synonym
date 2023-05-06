/* eslint-disable prefer-const */
export class ConsoleErrorListener {
    listeners: Array<(...args: any[]) => any>;
    oldError: { (...data: any[]): void; (...args: any[]): void; };
    constructor() {
        this.newError = this.newError.bind(this)
        this.init()
    }
    init() {
        this.listeners = []
        if (console.error === this.newError) {
            return;
        }
        this.oldError = console.error;
        console.error = this.newError;
    }
    stopProxy() {
        console.error = this.oldError
    }
    protected newError(...args: any[]): void {
        for (const listener of this.listeners) {
            listener(...args);
        }
        return this.oldError.call(console, ...args);
    }
    /** 
     * 调用栈前两行固定是:
     * 
     * at Tag.renameErrorListener
     * 
     * at ConsoleErrorListener.newError  */
    addListener(listener: (...args: any[]) => any) {

        this.listeners.push(listener);
    }
    removeListener(listener: (...args: any[]) => any) {
        let index = this.listeners.indexOf(listener);
        if (index !== -1) {
            this.listeners.splice(index, 1)
            return true
        }
        return false
    }
}