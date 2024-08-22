/* eslint-disable prefer-const */
interface bracket {
    left: string,
    right: string
}
export class Split {
    /** 把指定层级的括号内的某些字符视为分割符，然后进行分割
     * @param brackets 元素为一对括号，用对象表示，left属性和right属性分别用来存放左右括号
     * @param startL 包含在内，0表示括号外，1表示第一层括号，以此类推
     * @param endL 包含在内
     */
    static splitWithBracket(str: string, split: RegExp, startL = 0, endL = startL, brackets: bracket[] = undefined) {
        let bracketRange = this.getBracketRange(str, brackets)
        return this.selectiveSplit(str, split, match => {
            return this.isInBracket(match.index as number, bracketRange, startL, endL)
        })
    }
    /** 正则匹配到的字符，选择性的把其视为分割符
     * @param selector 返回真值表示改匹配项将会被作为分割符 */
    private static selectiveSplit(str: string, splitRgx: RegExp, selector: (match: RegExpMatchArray) => any): string[] {
        // if (splitRgx.toString() != '/-/g') debugger
        let rst: string[] = []
        let preSplitEnd = -1
        for (const match of str.matchAll(splitRgx)) {
            if (selector(match)) {
                rst.push(str.slice(preSplitEnd + 1, match.index));
                preSplitEnd = match.index as number + match[0].length - 1
            }
        }
        rst.push(str.slice(preSplitEnd + 1))
        return rst
    }

    /** 
     * 获取所有层级的括号的位置
     * @return 三维数据，一维元素为括号层级,按深度排序;二维元素为层级索引区间;三维元素分别为开始索引和结束索引,包含在内;
     *  @param brackets 元素为一对括号，用对象表示，left属性和right属性分别用来存放左右括号
    */
    static getBracketRange(str: string, brackets: bracket[] = undefined) {
        if (!brackets) {
            brackets = [
                { left: '(', right: ')' },
                { left: '[', right: ']' },
                { left: '{', right: '}' },
                { left: '（', right: '）' }
            ]
        }
        const stack: Array<string> = [];
        let i = 0;
        let bracketRange: number[][][] = []
        for (const ch of str) {
            let bracketFlag = undefined
            for (const b of brackets) {
                if (ch == b.left) { bracketFlag = 'left'; break }
                else if (ch == b.right) { bracketFlag = 'right'; break }
            }
            if (bracketFlag == 'left') {
                stack.push(ch);
                if (stack.length > bracketRange.length) bracketRange.push([])
                bracketRange[stack.length - 1].push([i + 1])
            }
            else if (bracketFlag == 'right') {
                if (stack.length == 0) throw new Error("右括号多余");
                if (!this.match(stack.pop() as string, ch, brackets))  // 判断两个括号是否不匹配
                    throw new Error("左右括号种类不相同")
                bracketRange[stack.length].slice(-1)[0].push(i - 1);
            }
            ++i;
        }
        if (stack.length) throw new Error("左括号多余")
        return bracketRange
    }
    private static match(left: string, right: string, brackets: bracket[]) {
        for (const b of brackets) {
            if (left == b.left) {
                if (right == b.right) return 1
                break
            }
        }
        return 0;
    }
    /** 判断目标索引是否在目标层级的括号内
     * @param startLevel 包含在内
     *  @param endLevel 包含在内
    */
    static isInBracket(index: number, bracketRange: number[][][], startLevel = 0, endLevel = startLevel) {
        /** 目标索引要存在于startLevel,但不存在于endLevel+1 */
        let startFlag, endPlusOneFlag: boolean
        startFlag = false
        if (startLevel == 0) startFlag = true
        else if (startLevel - 1 < bracketRange.length) {
            for (const range of bracketRange[startLevel - 1]) {
                if (index >= range[0] && index <= range[1]) {
                    startFlag = true; break;
                }
            }
        }
        endPlusOneFlag = false
        if (endLevel < bracketRange.length) {
            for (const range of bracketRange[endLevel]) {
                if (index >= range[0] && index <= range[1]) {
                    endPlusOneFlag = true; break
                }
            }
        }
        return startFlag && !endPlusOneFlag
    }
}