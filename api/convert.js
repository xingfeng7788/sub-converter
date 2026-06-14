import { parseSubscription } from '../server/utils/parsers.js'
import { convertToTarget } from '../server/utils/converters.js'
import { applyNodeOptions } from '../server/utils/nodes.js'
import { contentTypeForTarget, extensionForTarget, isSupportedTarget, normalizeTarget, supportedTargets } from '../server/utils/targets.js'
import { fetchSubscriptionContent } from '../server/utils/subscription.js'

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

    try {
        const {
            target: rawTarget,
            url,
            emoji = '1',
            udp = '1',
            scert = '0',
            sort = '0',
            include = '',
            exclude = '',
            rename = '',
            rulePreset = ''
        } = req.query

        const target = normalizeTarget(rawTarget)
        if (!target || !isSupportedTarget(target)) {
            return res.status(400).json({
                error: 'Invalid target client',
                supported: supportedTargets()
            })
        }

        if (!url) {
            return res.status(400).json({ error: 'Subscription URL is required' })
        }

        const rawContent = await fetchSubscriptionContent(decodeURIComponent(url))
        const nodes = applyNodeOptions(parseSubscription(rawContent), {
            include,
            exclude,
            sort: sort === '1',
            emoji: emoji === '1',
            rename
        })

        if (!nodes.length) {
            return res.status(422).json({ error: 'No supported nodes found in subscription' })
        }

        const output = convertToTarget(nodes, target, {
            udp: udp === '1',
            skipCert: scert === '1',
            rulePreset
        })
        if (!output || !output.trim()) {
            return res.status(422).json({ error: 'No nodes can be converted to the selected target client' })
        }

        res.setHeader('Content-Type', contentTypeForTarget(target))
        res.setHeader('Content-Disposition', `attachment; filename="config.${extensionForTarget(target)}"`)
        return res.send(output)
    } catch (error) {
        console.error('Conversion error:', error)
        return res.status(error.status || 500).json({ error: 'Conversion failed', message: error.message })
    }
}
