/* eslint-disable no-useless-escape */
/* eslint-disable prefer-const */
export class SimplifySynonyms {
    /** 针对字符搜索进行优化
    */
    static simplifySynonyms(synonyms: string[]): string[] {
        let rst: string[] = [...synonyms]
        for (let i = 0; i < rst.length; ++i) {
            if (this.isRepeatedSynonym(rst[i], rst)) {
                rst.splice(i--, 1)
            }
        }
        return rst
    }
    /** 判断一个同义词标签中的所有字段(字符)是否都是其他同义词标签的字串，即所有字符都能在其他同义词组中找到
     */
    static isRepeatedSynonym(synonym: string, synonyms: string[]): boolean {
        let fields = this.splitSynonymIntoFields(synonym)
        let synonymRepeatFlag = true
        for (const field of fields) {
            /* 该字段是否被其他标签所包含 */
            let fieldRepeatFlag = false
            for (const otherSynonym of synonyms) {
                if (otherSynonym.search(field) != -1) {
                    if (otherSynonym != synonym) {
                        fieldRepeatFlag = true;
                        break;
                    }
                }
            }
            if (!fieldRepeatFlag) synonymRepeatFlag = false
        }
        return synonymRepeatFlag
    }
    static splitSynonymIntoFields(synonym: string): string[] {
        let rgx = /[\/\-（）【】，；！]/g
        let fields = synonym.split(rgx).filter(v => v);
        return fields;
    }
}