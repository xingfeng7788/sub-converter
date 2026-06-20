import express from 'express'
import { parseSubscription } from '../utils/parsers.js'
import { convertToTarget } from '../utils/converters.js'
import { resolveTemplate } from '../utils/templateResolver.js'
import { applyNodeOptions, boolOption, dedupeNodes } from '../utils/nodes.js'
import { contentTypeForTarget, extensionForTarget, isSupportedTarget, normalizeTarget, supportedTargets } from '../utils/targets.js'
import { fetchSubscriptionContent } from '../utils/subscription.js'

const router = express.Router()

// 合并多个订阅
router.post('/', async (req, res) => {
    try {
        const {
            urls,           // 订阅 URL 数组
            target: rawTarget, // 目标客户端
            dedupe = true,  // 是否去重
            emoji = true,   // 是否添加 emoji
            sort = false,   // 是否排序
            udp = true,
            skipCert = false,
            include = '',   // 包含关键词
            exclude = '',   // 排除关键词
            rename = '',    // 重命名规则
            rulePreset = ''
        } = req.body

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'urls array is required' })
        }
        if (urls.length > 20 || urls.some(url => typeof url !== 'string')) {
            return res.status(400).json({ error: 'A maximum of 20 subscription URLs is allowed' })
        }
        const normalizedUrls = urls.map(url => url.trim()).filter(Boolean)
        if (!normalizedUrls.length) {
            return res.status(400).json({ error: 'At least one subscription URL is required' })
        }

        const target = normalizeTarget(rawTarget)
        if (!target || !isSupportedTarget(target)) {
            return res.status(400).json({
                error: 'Invalid target client',
                supported: supportedTargets()
            })
        }

        // 并发获取所有订阅
        const fetchPromises = normalizedUrls.map(async (url, index) => {
            try {
                const content = await fetchSubscriptionContent(url, { timeoutMs: 10000 })
                const nodes = parseSubscription(content)
                return { success: true, url, nodes, count: nodes.length }
            } catch (e) {
                console.warn(`Error fetching subscription ${index + 1}:`, e.message)
                return { success: false, url, error: e.message }
            }
        })

        const results = await Promise.all(fetchPromises)

        // 合并所有节点
        let allNodes = []
        const fetchSummary = results.map((r, i) => ({
            index: i + 1,
            url: r.url.substring(0, 50) + (r.url.length > 50 ? '...' : ''),
            success: r.success,
            count: r.count || 0,
            error: r.error || null
        }))

        for (const result of results) {
            if (result.success && result.nodes) {
                allNodes.push(...result.nodes)
            }
        }

        // Only remove exact duplicate connection definitions.
        if (boolOption(dedupe, true)) allNodes = dedupeNodes(allNodes)

        allNodes = applyNodeOptions(allNodes, { include, exclude, sort, emoji, rename })

        // 转换为目标格式
        if (allNodes.length === 0) {
            return res.status(422).json({ error: 'No supported nodes found in subscriptions' })
        }

        let resolvedPreset = rulePreset;
        if (rulePreset && rulePreset !== 'basic' && rulePreset !== 'standard' && rulePreset !== 'developer' && rulePreset !== 'gaming' && rulePreset !== 'streaming') {
            const dynamicTemplate = await resolveTemplate(rulePreset);
            if (dynamicTemplate) {
                resolvedPreset = dynamicTemplate;
            }
        }

        const output = convertToTarget(allNodes, target, {
            udp: boolOption(udp, true),
            skipCert: boolOption(skipCert, false),
            rulePreset: resolvedPreset
        })
        if (!output || !output.trim()) {
            return res.status(422).json({ error: 'No nodes can be converted to the selected target client' })
        }

        res.setHeader('Content-Type', contentTypeForTarget(target))
        res.setHeader('Content-Disposition', `attachment; filename="merged-${target}.${extensionForTarget(target)}"`)

        // 如果请求 JSON 格式的响应
        if (req.query.format === 'json') {
            return res.json({
                success: true,
                summary: {
                    totalSubscriptions: normalizedUrls.length,
                    successfulFetches: results.filter(r => r.success).length,
                    failedFetches: results.filter(r => !r.success).length,
                    totalNodes: allNodes.length,
                    deduped: boolOption(dedupe, true)
                },
                subscriptions: fetchSummary,
                output
            })
        }

        res.send(output)

    } catch (error) {
        console.error('Merge error:', error)
        res.status(500).json({ error: 'Merge failed: ' + error.message })
    }
})

// 获取合并预览 (只返回节点列表，不转换)
router.post('/preview', async (req, res) => {
    try {
        const { urls, dedupe = true } = req.body

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return res.status(400).json({ error: 'urls array is required' })
        }
        if (urls.length > 20 || urls.some(url => typeof url !== 'string')) {
            return res.status(400).json({ error: 'A maximum of 20 subscription URLs is allowed' })
        }
        const normalizedUrls = urls.map(url => url.trim()).filter(Boolean)
        if (!normalizedUrls.length) {
            return res.status(400).json({ error: 'At least one subscription URL is required' })
        }

        // 并发获取所有订阅
        const fetchPromises = normalizedUrls.map(async (url) => {
            try {
                const content = await fetchSubscriptionContent(url, { timeoutMs: 10000 })
                return { success: true, nodes: parseSubscription(content) }
            } catch (e) {
                return { success: false, nodes: [] }
            }
        })

        const results = await Promise.all(fetchPromises)

        // 合并节点
        let allNodes = results.flatMap(r => r.nodes)

        // 去重
        if (boolOption(dedupe, true)) allNodes = dedupeNodes(allNodes)

        // 按类型分组统计
        const byType = {}
        for (const node of allNodes) {
            byType[node.type] = (byType[node.type] || 0) + 1
        }

        res.json({
            total: allNodes.length,
            byType,
            nodes: allNodes.map(n => ({
                name: n.name,
                type: n.type,
                server: n.server,
                port: n.port
            }))
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

export default router
