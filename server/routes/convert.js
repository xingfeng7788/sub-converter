import express from 'express'
import { parseSubscription } from '../utils/parsers.js'
import { convertToTarget } from '../utils/converters.js'
import { applyNodeOptions } from '../utils/nodes.js'
import { resolveTemplate } from '../utils/templateResolver.js'
import { contentTypeForTarget, extensionForTarget, isSupportedTarget, normalizeTarget, supportedTargets } from '../utils/targets.js'
import { fetchSubscriptionContent } from '../utils/subscription.js'

const router = express.Router()

router.get('/', async (req, res) => {
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

        const rawContent = await fetchSubscriptionContent(url)
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

        let resolvedPreset = rulePreset;
        if (rulePreset && rulePreset !== 'basic' && rulePreset !== 'standard' && rulePreset !== 'developer' && rulePreset !== 'gaming' && rulePreset !== 'streaming') {
            const dynamicTemplate = await resolveTemplate(rulePreset);
            if (dynamicTemplate) {
                resolvedPreset = dynamicTemplate;
            }
        }

        const output = convertToTarget(nodes, target, {
            udp: udp === '1',
            skipCert: scert === '1',
            rulePreset: resolvedPreset
        })
        if (!output || !output.trim()) {
            return res.status(422).json({ error: 'No nodes can be converted to the selected target client' })
        }

        res.setHeader('Content-Type', contentTypeForTarget(target))
        res.setHeader('Content-Disposition', `attachment; filename="config.${extensionForTarget(target)}"`)
        res.send(output)
    } catch (error) {
        console.error('Conversion error:', error)
        res.status(error.status || 500).json({ error: 'Conversion failed', message: error.message })
    }
})

export default router
