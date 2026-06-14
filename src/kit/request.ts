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
        
        const systemPrompt = `你是一个中文关键词提取助手。请从用户提供的文本中提取最重要的关键词（名词、专业术语、核心概念）。
要求：
1. 每个关键词应是一个独立的词或短语
2. 关键词应当具有辨识度，能代表文本的核心内容
3. 忽略停用词、虚词等无意义词汇
4. 如果文本很短（少于20字），可以提取1-3个关键词
5. 如果文本较长，最多提取10个关键词
6. 关键词应当是中文（如果是英文术语可以保留英文）
7. 请只返回JSON数组格式，不要包含其他说明文字

示例返回格式：["关键词1","关键词2","关键词3"]`;

        const requestBody = {
            model: 'lite',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `请提取以下文本的关键词：\n\n${text}` }
            ],
            temperature: 0.3,
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
     * 解析LLM返回的关键词JSON字符串
     */
    private static parseKeywords(content: string): string[] {
        try {
            // 尝试直接解析JSON
            const trimmed = content.trim();
            // 查找JSON数组部分
            const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed)) {
                    return parsed.filter(k => typeof k === 'string' && k.trim().length > 0);
                }
            }
            // 如果没找到JSON，尝试按行分割
            const lines = trimmed.split(/[\n,，、]/).map(l => l.trim()).filter(l => l.length > 0);
            return lines.filter(l => !l.startsWith('{') && !l.startsWith('}') && !l.startsWith('[') && !l.startsWith(']'));
        } catch {
            // 解析失败时，尝试提取中文字符
            const chineseWords = content.match(/[\u4e00-\u9fa5]+/g);
            return chineseWords ? [...new Set(chineseWords)] : [];
        }
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
