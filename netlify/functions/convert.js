const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' }
    }

    try {
        const { parseSubscription } = await import('../../server/utils/parsers.js')
        const { convertToTarget } = await import('../../server/utils/converters.js')
        const { applyNodeOptions } = await import('../../server/utils/nodes.js')
        const { contentTypeForTarget, extensionForTarget, isSupportedTarget, normalizeTarget, supportedTargets } = await import('../../server/utils/targets.js')
        const { fetchSubscriptionContent } = await import('../../server/utils/subscription.js')

        const params = event.queryStringParameters || {}
        const target = normalizeTarget(params.target)

        if (!target || !isSupportedTarget(target)) {
            return json(400, {
                error: 'Invalid target client',
                supported: supportedTargets()
            })
        }
        if (!params.url) return json(400, { error: 'Subscription URL is required' })

        const rawContent = await fetchSubscriptionContent(decodeURIComponent(params.url))
        const nodes = applyNodeOptions(parseSubscription(rawContent), {
            include: params.include || '',
            exclude: params.exclude || '',
            sort: params.sort === '1',
            emoji: params.emoji !== '0',
            rename: params.rename || ''
        })
        if (!nodes.length) return json(422, { error: 'No supported nodes found in subscription' })

        const body = convertToTarget(nodes, target, {
            udp: params.udp !== '0',
            skipCert: params.scert === '1',
            rulePreset: params.rulePreset || ''
        })
        if (!body || !body.trim()) {
            return json(422, { error: 'No nodes can be converted to the selected target client' })
        }

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': contentTypeForTarget(target),
                'Content-Disposition': `attachment; filename="config.${extensionForTarget(target)}"`
            },
            body
        }
    } catch (error) {
        return json(error.status || 500, { error: 'Conversion failed', message: error.message })
    }
}

function json(statusCode, data) {
    return {
        statusCode,
        headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(data)
    }
}
