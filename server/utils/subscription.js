const USER_AGENT = 'LaoWang-Sub-Converter/1.0'

export function normalizeSubscriptionUrl(value) {
    let url
    try {
        url = new URL(String(value || '').trim())
    } catch {
        throw badRequest('Invalid subscription URL')
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw badRequest('Subscription URL must use http or https')
    }

    if (!allowPrivateSubscriptionUrls() && isPrivateHost(url.hostname)) {
        throw badRequest('Private or local subscription URLs are disabled')
    }

    return url.toString()
}

export async function fetchSubscriptionContent(url, options = {}) {
    const subscriptionUrl = normalizeSubscriptionUrl(url)
    const timeoutMs = Number(options.timeoutMs) || 15000
    const signal = AbortSignal.timeout(timeoutMs)

    const response = await fetch(subscriptionUrl, {
        headers: {
            'User-Agent': USER_AGENT,
            ...(options.headers || {})
        },
        signal
    })

    if (!response.ok) {
        const error = new Error(`Failed to fetch subscription: HTTP ${response.status}`)
        error.status = 502
        throw error
    }

    return response.text()
}

function allowPrivateSubscriptionUrls() {
    return ['1', 'true', 'yes'].includes(String(process.env.ALLOW_PRIVATE_SUBSCRIPTION_URLS || '').toLowerCase())
}

function isPrivateHost(hostname) {
    const host = String(hostname || '').toLowerCase()
    if (!host) return true
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true

    const ipv4 = parseIPv4(host)
    if (ipv4) {
        const [a, b] = ipv4
        return a === 0 ||
            a === 10 ||
            a === 127 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168)
    }

    const ipv6 = host.replace(/^\[/, '').replace(/\]$/, '')
    return ipv6 === '::1' ||
        ipv6.startsWith('fc') ||
        ipv6.startsWith('fd') ||
        ipv6.startsWith('fe80:')
}

function parseIPv4(host) {
    const parts = host.split('.')
    if (parts.length !== 4) return null
    const numbers = parts.map(part => Number.parseInt(part, 10))
    if (numbers.some((part, index) => String(part) !== parts[index] || part < 0 || part > 255)) return null
    return numbers
}

function badRequest(message) {
    const error = new Error(message)
    error.status = 400
    return error
}
