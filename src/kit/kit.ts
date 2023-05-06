/* eslint-disable prefer-const */
export interface BinSearchRst {
    low: number,
    mid: number,
    high: number
}

export class Kit {
    constructor() {

    }
    binarySearch<K>(rcds: K[], key: K, left = 0, right = rcds.length - 1): BinSearchRst {
        let low = left - 1, high = right + 1, mid: number;
        for (; low + 1 != high;) {
            mid = (low + high) >> 1;
            if (rcds[mid] == key) {
                return { low: -1, mid: mid, high: -1 };
            }
            else if (rcds[mid] < key) {
                low = mid;
            }
            else {
                high = mid;
            }
        }
        /*运行至此,搜索不成功,则low与high分别指向最靠近目标的两个数*/
        /*当然查找目标处于边界时,low或high会越界*/
        return { low: low, mid: -1, high: high };
    }
    binarySearchInOrder<K>(rcds: K[], left = 0, right = rcds.length - 1) {
        let low = left;
        return (key: K): BinSearchRst => {
            const rst = this.binarySearch(rcds, key, low, right);
            if (rst.mid != -1 && rst.mid != 0) low = rst.mid - 1;//查找到了
            else {//没有查找到
                if (rst.low != -1) low = rst.low
            }
            // Testlog('low:\n' + low);
            return rst;
        }
    }
    /** 分割成若干个指定长度的子块
     *  @returns 空数组依然返回空数组,空字符串返回一个只有空字符的数组
    */
    static split<T extends any[] | string>(arr: T, len: number) {
        const max = arr.length
        let rst: T[] = [];
        if (arr.length == 0 && arr.constructor == String) {
            rst = <T[]>['']
        }
        for (let i = 0; i < max; i += len) {
            rst.push(<T>arr.slice(i, i + len));
        }
        return rst;
    }
    static sleep(duration: number) {
        return new Promise(resolve => { setTimeout(resolve, duration); })
    }
    static isSubset(paArr: Array<any>, chArr: Array<any>) {
        if (!chArr.length) return false;
        for (let i = 0; i < chArr.length; i++) {
            if (!paArr.includes(chArr[i])) {
                return false
            }
        }
        return true
    }
    /** @param start 闭区间
     * @param end 开区间
    */
    static replaceRange(str: string, start: number, end: number, data: string) {
        let former = str.slice(0, start)
        let latter = str.slice(end)
        return former + data + latter
    }
}