import { Editor, MarkdownView } from "obsidian";

declare enum Switch { false, true }
declare interface BlockPos {
    YAMLPos: number[],
    codePos: number[]
}
declare interface SETTINGS {
    autoDelNulLineSwitch: Switch;
    autoSearchPath: Switch;
    autoRemovePath: Switch,
    autoInsertSynonym: Switch;
    autoFoldYAML: Switch;
    autoFoldLeftLeaf: Switch;
    autoSimplifySynonyms: Switch;
    srollStoreNum: number;
    ButtonOpacity: number;
    ButtonHideTime: number;
    ShowBoxHideTime: number;
    ButtonCollapseTime: number;
    ButtonhideRPos: string;
    ButtonRPos: string;
    pathWeight: number;
    ignoreCase: boolean;
    xunfeiAPI: {
        appid: string;
        appkey: string;
    }
}
declare interface MATCH_RST {
    specialMeaning: string[];
    generalized: string[]
}
declare interface Timer {
    DebounceOfDel: Function,
    DebounceOfFileHandle: Function,
    DebounceOfFoldYAML: Function
}
declare interface record<K> {
    key: K;
}
declare interface CodePos {
    offset: number
}
declare interface BinSearchRst {
    low: number,
    mid: number,
    high: number
}
declare interface POST_OPTIONS {
    host: string,
    path?: string,
    method: 'POST' | 'GET',
    headers: HEADERS
}
declare interface HEADERS {
    "Content-Type": "application/x-www-form-urlencoded",
    'charset': 'utf-8',
    [propname: string]: string,
}

declare interface xunfeiRespon {
    desc: string
    data: xunfeiData
}
declare interface REQUEST_MES {
    status: 'unrespon' | 'timeout' | 'success' | string
    data: xunfeiData
    error: Error | null
}