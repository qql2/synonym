/* eslint-disable prefer-const */

import { Kit } from "./kit";
import https from 'https';
import { hash as md5hash } from "spark-md5";
import { xunfeiData } from "src/insertSynonym";

//import SparkMD5 from 'spark-md5';

export interface REQUEST_MES {
    status: 'unrespon' | 'timeout' | 'success' | string
    data: xunfeiData
    error: Error | null
}

export interface xunfeiRespon {
    desc: string
    data: xunfeiData
}

export interface POST_OPTIONS {
    host: string,
    path?: string,
    method: 'POST' | 'GET',
    headers: HEADERS
}

export interface HEADERS {
    "Content-Type": "application/x-www-form-urlencoded",
    'charset': 'utf-8',
    [propname: string]: string,
}

export class Request {
    protected request: REQUEST_MES[];
    protected success: (data: xunfeiData[]) => any;
    protected error: (errors: Error[]) => any;
    slicedata: (string | any[])[];
    constructor() {
        this.request = [];
    }
    sucRespon(res: xunfeiRespon, index: number) {
        /* 响应失败 */
        if (res.desc != 'success') {
            this.request[index].status = res.desc;
            this.request[index].error = { name: res.desc, message: null };
        }
        /* 响应成功 */
        this.request[index].status = 'success';
        this.request[index].data = res.data;
        this.waitAllRespon();
    }
    errRespon(err: Error, index: number) {
        console.log('err:\n', err)
        this.request[index].status = err.name;
        this.request[index].error = err;
        this.waitAllRespon();
    }
    waitAllRespon() {
        if (this.request.some((v) => v.status == 'unrespon')) return;
        if (this.request.every((v) => { return v.status == 'success' })) {
            let data = this.request.map(v => v.data);
            this.success(data);
        }
        let errorReq = this.request.filter(v => v.status != 'success');
        let errors = errorReq.map(v => v.error);
        this.error(errors);
    }
    /* 讯飞api大约支持30000字节以下的字符串 */
    xunFeiAPI(appkey: string, appid: string, txt: string) {
        return new Promise((resolve, reject) => {
            let limit = 30000 >> 1;
            const post_options = this.xunfeiIdenti(appkey, appid);
            this.httpsRequest(post_options, txt, limit, 'text=', resolve, reject);
        })
    }
    xunfeiIdenti(appkey: string, appid: string) {
        // 基础数据准备
        let t = this.getSec().toString();
        let p = this.getTypeParam();
        let str = appkey + t + p;
        //Testlog('str:' + str);
        let c = this.MD5(str);
        // X-Appid	string	讯飞开放平台注册申请应用的应用ID(appid)	
        // X-CurTime	string	当前UTC时间戳 从1970年1月1日0点0 分0 秒开始到现在的秒数	
        // X-Param	string	相关参数JSON串经Base64编码后的字符串，详见业务参数	
        // X-CheckSum	string	令牌，计算方法：MD5(APIKey + X-CurTime + X-Param)，三个值拼接的字符串，进行MD5哈希计算（32位小写）
        const post_options: POST_OPTIONS = {
            host: "ltpapi.xfyun.cn",
            path: "/v1/ke",
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                'charset': 'utf-8',
                'X-Appid': appid,
                'X-CurTime': t,
                'X-Param': p,
                'X-CheckSum': c
            },
        };
        return post_options;
    }
    // 接受返回的数据
    requestOnResponse(incomingMessage: any, index: number) {
        let data: any[] = []
        incomingMessage.on('data', (chunk: any) => {
            data.push(...chunk)
        })
        incomingMessage.on('end', () => {
            let _date = JSON.parse(new TextDecoder().decode(new Uint8Array(data)))
            this.sucRespon(_date, index);
        })
    }
    // 超时 事件处理器
    requestOnTimeout(timeout: number, REQUEST: { destroy: () => void; }, index: number) {
        REQUEST.destroy()
        let err: Error = {
            name: 'timeout',
            message: 'timeout after ' + timeout + 'ms'
        }
        this.errRespon(err, index);
    }
    sliceRequest(post_options: POST_OPTIONS, POST_DATA: string, index: number, timeout = 1000) {
        // 创建 http 连接
        if (!https) {
            throw new Error("No https!");
        }
        let REQUEST = https.request(post_options, (mess) => {
            this.requestOnResponse(mess, index)
        })
        // 添加事件监听
        REQUEST.on('error', (err) => {
            this.errRespon(err, index)
        })
        REQUEST.on('timeout', this.requestOnTimeout.bind(this, timeout, REQUEST, index))
        // 设置超时
        REQUEST.setTimeout(timeout);

        // 通过连接发送数据
        REQUEST.write(POST_DATA, 'utf8')
        REQUEST.end()
        // console.log("request:\n", REQUEST);
    }
    delayRequest(postOption: POST_OPTIONS, prefix: string, index: number, delay: number) {
        if (index > this.slicedata.length - 1) return;
        let postData = prefix + this.slicedata[index];
        this.sliceRequest(postOption, postData, index);
        window.setTimeout(() => {
            this.delayRequest(postOption, prefix, index + 1, delay);
        }, delay);
    }
    /** 把请求切分, 然后并方, 等待所有都响应,然后汇总
     *  @param prefix 每个分段请求体中的前缀
     *  @param delay 分段并发时的相邻时间间隔, 单位为ms, 默认为500ms
    */
    httpsRequest(post_options: POST_OPTIONS, data: string, limit: number, prefix: string, success: (data: any) => any, error: (errors: Error[]) => any, delay = 500) {
        this.success = success;
        this.error = error;
        this.request = [];
        this.slicedata = Kit.split(data, limit);
        /* 记录每个分段的请求状态 */
        for (let i = 1; i <= this.slicedata.length; ++i) {
            this.request.push({
                status: 'unrespon',
                data: null,
                error: null
            })
        }
        // console.dir(this.slicedata);
        /* 并发相邻请求的时候稍微间距一会,缓解网络压力 */
        this.delayRequest(post_options, prefix, 0, delay);
    }
    MD5(str: string) {
        // const hash = createHash('md5');
        // hash.update(str);
        // let md5 = hash.digest('hex');
        // // Testlog('md5:' + md5);
        // return md5
        const hash = md5hash(str);
        return hash;
    }
    getSec() {
        return Math.trunc(new Date().getTime() / 1000);
    }
    Base64(str: string) {
        return window.btoa(str);
    }
    getTypeParam(type = 'dependent') {
        let param = "{\"type\":\"" + type + "\"}";
        return this.Base64(param);
    }
}