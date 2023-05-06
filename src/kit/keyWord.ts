import { xunfeiData } from "src/insertSynonym";

/* eslint-disable prefer-const */
export class KeyWord {
    /** @return 已去重处理 */
    static collectKeyWords(data: xunfeiData[], context: string) {
        let rst: string[]
        if (data.length == 0) {
            return []
        }
        const allkeys = [];
        for (const iterator of data) {
            if (!iterator.ke?.length) {
                continue
            }
            for (const j of iterator.ke) {
                allkeys.push(j.word)
            }
        }
        rst = [...new Set(allkeys)];
        rst.push(...this.joinKeys(rst, context))
        return rst;
    }
    static joinKeys(keys: string[], context: string) {
        let delimiters = ['┣', '┫']
        let KeysRegex = new RegExp(`${delimiters[0] + '([^' + delimiters[0] + delimiters[1] + ']+)' + delimiters[1]}`, 'g')
        context = this.divideKeys(context, keys, delimiters)
        let rgx = this.getRgx(keys, delimiters)
        let rst: string[] = []
        let compoundKeys = this.getAllMatched(rgx, context)
        compoundKeys = this.descendCompoundKeys(compoundKeys, KeysRegex)
        for (const compoundKey of compoundKeys) {
            if (rst.includes(compoundKey)) continue;
            if (this.countKeys(compoundKey, KeysRegex) == 2) rst.push(compoundKey)
            else {
                rst.push(...this.getAllKeysSubCombination(compoundKey, KeysRegex))
            }
        }
        /* 去重去符号 */
        rst = [...new Set(rst)]
        rst = this.removeDelimiters(rst, delimiters)
        return rst;
    }
    static getRgx(keys: string[], delimiters: string[]) {
        keys = keys.map(v => delimiters[0] + v + delimiters[1])
        let rgxStr = `(${keys.join('|')}){2,}`
        let mod = 'g'
        return new RegExp(rgxStr, mod)
    }
    static getAllMatched(regex: RegExp, text: string) {
        let rst = []
        for (const match of text.matchAll(regex)) {
            rst.push(match[0])
        }
        return rst
    }
    static divideKeys(text: string, keys: string[], delimiters: string[]): string {
        let rst
        let regex = new RegExp(`${keys.join('|')}}`, 'g')
        rst = text.replace(regex, `${delimiters[0]}$&${delimiters[1]}`)
        return rst
    }
    static countKeys(match: string, keysRegex: RegExp): number {
        return Array.from(match.matchAll(keysRegex)).length
    }
    static getAllKeysSubCombination(compoundKeys: string, keysRegex: RegExp): string[] {
        let keys = []
        for (const match of compoundKeys.matchAll(keysRegex)) {
            keys.push(match[0])
        }
        let rst = []
        for (let index = 0; index < keys.length - 1; index++) {
            let keyCombination = keys[index]
            for (let j = index + 1; j < keys.length; j++) {
                keyCombination += keys[j]
                rst.push(keyCombination)
            }
        }
        return rst;
    }
    static removeDelimiters(keysCombinations: string[], delimiters: string[]): string[] {
        let regex = new RegExp(delimiters[0] + '|' + delimiters[1], 'g')
        let rst = []
        for (const keysCombination of keysCombinations) {
            rst.push(keysCombination.replace(regex, ''))
        }
        return rst
    }
    static descendCompoundKeys(compoundKeys: string[], KeysRegex: RegExp): string[] {
        let rst = compoundKeys.sort((a, b) => { return this.countKeys(b, KeysRegex) - this.countKeys(a, KeysRegex) })
        return rst
    }
}