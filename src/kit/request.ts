/* eslint-disable prefer-const */

/**
 * 使用讯飞星火Spark LLM API进行关键词提取
 * 替代已欠费的讯飞自然语言处理API(ltpapi.xfyun.cn/v1/ke)
 * 
 * 免费模型: spark-lite
 * API地址: https://spark-api-open.xf-yun.com/v1/chat/completions
 * 认证方式: Bearer {apiKey}:{apiSecret}
 */

/** LLM返回的关键词格式 */
export interface SparkKeywordResult {
    /** 兼容旧接口的字段名 */
    ke: Array<{
        word: string;
        score: number;
    }>;
}

export class SparkLLM {
    /**
     * 使用星火LLM提取关键词
     * @param text 原始文本
     * @param apiPassword APIPassword (格式: apiKey:apiSecret)
     * @returns 关键词数组
     */
    static async extractKeywords(text: string, apiPassword: string): Promise<string[]> {
        if (!apiPassword || apiPassword.indexOf(':') === -1) {
            throw new Error('API密钥格式错误，应为 apiKey:apiSecret');
        }

        const url = 'https://spark-api-open.xf-yun.com/v1/chat/completions';

        const requestBody = {
            model: 'lite',
            messages: [
                {
                    role: 'system',
                    content: '你是一个关键词提取器。只提取关键词，用逗号分隔返回。不要解释，不要额外文字。'
                },
                { role: 'user', content: text }
            ],
            temperature: 0.1,
            max_tokens: 512,
            stream: false
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiPassword}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`星火API请求失败 (${response.status}): ${errorBody}`);
        }

        const result = await response.json();

        if (result.code !== 0 && result.code !== undefined) {
            throw new Error(`星火API返回错误: ${result.message || JSON.stringify(result)}`);
        }

        const content = result.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('星火API返回为空');
        }

        return SparkLLM.parseKeywords(content);
    }

    /**
     * 解析LLM返回的关键词（逗号分隔格式）
     */
    private static parseKeywords(content: string): string[] {
        if (!content) return [];

        // 去掉可能的 "关键词：" 前缀
        const cleaned = content.trim()
            .replace(/^(关键词|keywords)[：:]\s*/i, '')
            .replace(/^```[\s\S]*?```$/, '');

        // 尝试 JSON 解析（兼容旧格式）
        try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
                return parsed.filter(k => typeof k === 'string' && k.trim().length > 0);
            }
            if (typeof parsed === 'object') {
                for (const key of Object.keys(parsed)) {
                    const val = parsed[key];
                    if (Array.isArray(val)) {
                        const rst = val.filter(k => typeof k === 'string' && k.trim().length > 0);
                        if (rst.length > 0) return rst;
                    }
                }
            }
        } catch {
            // 不是 JSON，继续逗号分割
        }

        // 逗号/换行分割（主要格式）
        const parts = cleaned
            .split(/[,，、\n]+/)
            .map(p => p.trim())
            .filter(p => p.length > 0 && p.length < 100);

        if (parts.length > 0) return parts;

        // 最坏 fallback：提取双字以上中文词
        const words = content.match(/[\u4e00-\u9fa5]{2,}/g);
        return words ? [...new Set(words)].slice(0, 10) : [];
    }

    /**
     * 兼容旧接口：返回xunfeiData格式
     * @deprecated 建议直接使用 extractKeywords
     */
    static async extractKeysWordsFallback(text: string, apiPassword: string): Promise<SparkKeywordResult[]> {
        const keywords = await SparkLLM.extractKeywords(text, apiPassword);
        return [{
            ke: keywords.map((word, index) => ({
                word,
                score: Math.max(0, 1 - index * 0.1)
            }))
        }];
    }
}
