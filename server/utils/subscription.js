import dns from 'node:dns/promises'
import net from 'node:net'

const USER_AGENT = 'Sub-Converter/1.0'
const DEFAULT_TIMEOUT_MS = 15000
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 5

export function normalizeSubscriptionUrl(value) {
    let url
    try {
        url = new URL(String(value || '').trim())
    } catch {
        throw httpError(400, 'Invalid subscription URL')
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw httpError(400, 'Subscription URL must use http or https')
    }
    if (url.username || url.password) {
        throw httpError(400, 'Subscription URL credentials are not supported')
    }
    return url
}

export async function fetchSubscriptionContent(value, options = {}) {
    const timeoutMs = clampNumber(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1000, 60000)
    const maxBytes = clampNumber(options.maxBytes, DEFAULT_MAX_BYTES, 1024, 20 * 1024 * 1024)
    let currentUrl = normalizeSubscriptionUrl(value)

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        await assertHostAllowed(currentUrl.hostname)

        const response = await fetch(currentUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/plain, application/yaml, application/json, */*',
                ...(options.headers || {})
            },
            signal: AbortSignal.timeout(timeoutMs),
            redirect: 'manual'
        })

        if (isRedirect(response.status)) {
            const location = response.headers.get('location')
            if (!location) throw httpError(502, 'Subscription redirect is missing a location')
            if (redirectCount === MAX_REDIRECTS) throw httpError(502, 'Too many subscription redirects')
            currentUrl = normalizeSubscriptionUrl(new URL(location, currentUrl).toString())
            continue
        }

        if (!response.ok) {
            throw httpError(502, `Failed to fetch subscription: HTTP ${response.status}`)
        }

        const contentLength = Number(response.headers.get('content-length'))
        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
            throw httpError(413, `Subscription is larger than ${maxBytes} bytes`)
        }

        return readLimitedText(response, maxBytes)
    }

    throw httpError(502, 'Failed to fetch subscription')
}

export async function assertHostAllowed(hostname) {
    if (allowPrivateSubscriptionUrls()) return

    const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
    if (isPrivateHostname(host)) {
        throw httpError(400, 'Private or local addresses are disabled')
    }

    if (!net.isIP(host)) {
        let addresses
        try {
            addresses = await dns.lookup(host, { all: true, verbatim: true })
        } catch {
            throw httpError(502, 'Subscription hostname could not be resolved')
        }
        if (!addresses.length || addresses.some(item => isPrivateHostname(item.address))) {
            throw httpError(400, 'Subscription hostname resolves to a private or local address')
        }
    }
}

export function isPrivateHostname(hostname) {
    const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
    if (!host) return true
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true

    if (net.isIP(host) === 4) {
        const [a, b, c] = host.split('.').map(Number)
        return a === 0 ||
            a === 10 ||
            (a === 100 && b >= 64 && b <= 127) ||
            a === 127 ||
            (a === 169 && b === 254) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 192 && b === 0 && [0, 2].includes(c)) ||
            (a === 198 && [18, 19].includes(b)) ||
            (a === 198 && b === 51 && c === 100) ||
            (a === 203 && b === 0 && c === 113) ||
            a >= 224
    }

    if (net.isIP(host) === 6) {
        const words = expandIpv6(host)
        if (!words) return true

        if (words.every(word => word === 0) ||
            (words.slice(0, 7).every(word => word === 0) && words[7] === 1)) {
            return true
        }

        const first = words[0]
        if ((first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00) {
            return true
        }

        if (words.slice(0, 5).every(word => word === 0) && words[5] === 0xffff) {
            const mapped = `${words[6] >> 8}.${words[6] & 0xff}.${words[7] >> 8}.${words[7] & 0xff}`
            return isPrivateHostname(mapped)
        }
    }

    return false
}

function expandIpv6(value) {
    let host = String(value || '').toLowerCase()
    const ipv4Match = host.match(/(\d+\.\d+\.\d+\.\d+)$/)
    if (ipv4Match) {
        const octets = ipv4Match[1].split('.').map(Number)
        if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null
        host = host.slice(0, -ipv4Match[1].length) +
            `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`
    }

    const halves = host.split('::')
    if (halves.length > 2) return null

    const left = halves[0] ? halves[0].split(':') : []
    const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
    const missing = 8 - left.length - right.length
    if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null

    const words = [
        ...left,
        ...Array(halves.length === 2 ? missing : 0).fill('0'),
        ...right
    ].map(part => Number.parseInt(part, 16))

    if (words.length !== 8 || words.some(word => !Number.isInteger(word) || word < 0 || word > 0xffff)) {
        return null
    }
    return words
}

async function readLimitedText(response, maxBytes) {
    if (!response.body) return ''
    const reader = response.body.getReader()
    const chunks = []
    let total = 0

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > maxBytes) {
            await reader.cancel()
            throw httpError(413, `Subscription is larger than ${maxBytes} bytes`)
        }
        chunks.push(value)
    }

    const output = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        output.set(chunk, offset)
        offset += chunk.byteLength
    }
    return new TextDecoder().decode(output)
}

function allowPrivateSubscriptionUrls() {
    return ['1', 'true', 'yes'].includes(
        String(process.env.ALLOW_PRIVATE_SUBSCRIPTION_URLS || '').toLowerCase()
    )
}

function isRedirect(status) {
    return [301, 302, 303, 307, 308].includes(status)
}

function clampNumber(value, fallback, min, max) {
    const number = Number(value)
    if (!Number.isFinite(number)) return fallback
    return Math.min(Math.max(Math.round(number), min), max)
}

function httpError(status, message) {
    const error = new Error(message)
    error.status = status
    return error
}
