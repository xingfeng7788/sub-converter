import { Buffer } from 'buffer'
import yaml from 'js-yaml'

function decodeBase64(input) {
    const normalized = String(input || '')
        .trim()
        .replace(/-/g, '+')
        .replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    return Buffer.from(padded, 'base64').toString('utf8')
}

function encodeBase64Url(input) {
    return Buffer.from(String(input)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function safeDecode(value = '') {
    try {
        return decodeURIComponent(value)
    } catch {
        return value
    }
}

function parsePort(value, fallback) {
    const port = Number.parseInt(value, 10)
    return Number.isInteger(port) && port > 0 ? port : fallback
}

function splitLines(content) {
    return String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
}

export function parseSubscription(content) {
    let body = String(content || '').trim()

    try {
        const decoded = decodeBase64(body)
        if (decoded.includes('://')) body = decoded
    } catch {
        // Plain subscriptions are expected too.
    }

    const structuredNodes = parseStructuredSubscription(body)
    if (structuredNodes.length) return structuredNodes

    const nodes = []
    for (const line of splitLines(body)) {
        const parser = line.startsWith('ss://') ? parseSS
            : line.startsWith('ssr://') ? parseSSR
                : line.startsWith('vmess://') ? parseVmess
                    : line.startsWith('vless://') ? parseVless
                        : line.startsWith('trojan://') ? parseTrojan
                            : line.startsWith('hysteria://') ? parseHysteria
                                : (line.startsWith('hysteria2://') || line.startsWith('hy2://')) ? parseHysteria2
                                    : line.startsWith('tuic://') ? parseTuic
                                        : line.startsWith('snell://') ? parseSnell
                                            : (line.startsWith('socks://') || line.startsWith('socks5://')) ? parseSocks
                                                : line.startsWith('anytls://') ? parseAnyTLS
                                                    : (line.startsWith('http://') || line.startsWith('https://')) ? parseHttpProxy
                                        : null

        if (!parser) continue
        const node = parser(line)
        if (node && node.server && node.port) nodes.push(node)
    }

    return nodes
}

function parseStructuredSubscription(body) {
    const trimmed = String(body || '').trim()
    if (!trimmed) return []

    if (trimmed.startsWith('{')) {
        try {
            const config = JSON.parse(trimmed)
            if (Array.isArray(config.outbounds)) {
                return config.outbounds.map(fromSingBoxOutbound).filter(Boolean)
            }
        } catch {
            return []
        }
    }

    if (!trimmed.includes('proxies:')) return []

    try {
        const config = yaml.load(trimmed)
        if (!config || !Array.isArray(config.proxies)) return []
        return config.proxies.map(fromClashProxy).filter(Boolean)
    } catch {
        return []
    }
}

function fromClashProxy(proxy) {
    if (!proxy || typeof proxy !== 'object') return null
    const base = {
        type: proxy.type,
        name: proxy.name || `${proxy.type || 'Proxy'} Node`,
        server: proxy.server,
        port: parsePort(proxy.port)
    }
    if (!base.server || !base.port) return null

    switch (proxy.type) {
        case 'ss':
            return { ...base, method: proxy.cipher, password: proxy.password, plugin: proxy.plugin, pluginOpts: proxy['plugin-opts'] }
        case 'ssr':
            return {
                ...base,
                method: proxy.cipher,
                password: proxy.password,
                protocol: proxy.protocol,
                protocolParam: proxy['protocol-param'] || '',
                obfs: proxy.obfs,
                obfsParam: proxy['obfs-param'] || ''
            }
        case 'vmess':
            return withClashTransport({
                ...base,
                uuid: proxy.uuid,
                alterId: proxy.alterId || proxy['alter-id'] || 0,
                cipher: proxy.cipher || 'auto',
                network: proxy.network || 'tcp',
                tls: proxy.tls === true,
                sni: proxy.servername || proxy.sni || proxy.server
            }, proxy)
        case 'vless':
            return withClashTransport({
                ...base,
                uuid: proxy.uuid,
                flow: proxy.flow || '',
                network: proxy.network || 'tcp',
                tls: proxy.tls === true || Boolean(proxy['reality-opts']),
                security: proxy['reality-opts'] ? 'reality' : (proxy.tls ? 'tls' : ''),
                sni: proxy.servername || proxy.sni || proxy.server,
                reality: proxy['reality-opts'] ? {
                    publicKey: proxy['reality-opts']['public-key'] || '',
                    shortId: proxy['reality-opts']['short-id'] || '',
                    fingerprint: proxy['client-fingerprint'] || 'chrome',
                    sni: proxy.servername || proxy.sni || proxy.server
                } : null
            }, proxy)
        case 'trojan':
            return withClashTransport({
                ...base,
                password: proxy.password,
                network: proxy.network || 'tcp',
                sni: proxy.sni || proxy.servername || proxy.server,
                alpn: proxy.alpn || []
            }, proxy)
        case 'hysteria':
            return {
                ...base,
                auth: proxy.auth_str || proxy.auth || '',
                up: parsePort(proxy.up, 100),
                down: parsePort(proxy.down, 100),
                alpn: Array.isArray(proxy.alpn) ? proxy.alpn[0] : (proxy.alpn || 'h3'),
                obfs: proxy.obfs || '',
                sni: proxy.sni || proxy.server,
                insecure: proxy['skip-cert-verify'] === true
            }
        case 'hysteria2':
            return {
                ...base,
                password: proxy.password || '',
                obfs: proxy.obfs || '',
                obfsPassword: proxy['obfs-password'] || '',
                sni: proxy.sni || proxy.server,
                insecure: proxy['skip-cert-verify'] === true
            }
        case 'tuic':
            return {
                ...base,
                uuid: proxy.uuid,
                password: proxy.password,
                token: proxy.token || '',
                congestion: proxy['congestion-controller'] || proxy.congestion_control || 'bbr',
                alpn: proxy.alpn || ['h3'],
                sni: proxy.sni || proxy.server,
                insecure: proxy['skip-cert-verify'] === true,
                udpRelayMode: proxy['udp-relay-mode'] || 'native'
            }
        case 'anytls':
            return {
                ...base,
                password: proxy.password || '',
                sni: proxy.sni || proxy.servername || proxy.server,
                alpn: Array.isArray(proxy.alpn) ? proxy.alpn : (proxy.alpn ? [proxy.alpn] : []),
                insecure: proxy['skip-cert-verify'] === true,
                fingerprint: proxy['client-fingerprint'] || proxy.fingerprint || 'chrome',
                idleSessionCheckInterval: proxy['idle-session-check-interval'] || proxy.idleSessionCheckInterval || '',
                idleSessionTimeout: proxy['idle-session-timeout'] || proxy.idleSessionTimeout || '',
                minIdleSession: proxy['min-idle-session'] ?? proxy.minIdleSession
            }
        case 'snell':
            return {
                ...base,
                psk: proxy.psk || proxy.password || '',
                version: parsePort(proxy.version, 3),
                obfs: proxy.obfs || proxy['obfs-opts']?.mode || '',
                obfsHost: proxy['obfs-opts']?.host || ''
            }
        case 'http':
            return {
                ...base,
                username: proxy.username || '',
                password: proxy.password || '',
                tls: proxy.tls === true,
                sni: proxy.sni || proxy.servername || proxy.server
            }
        case 'socks5':
        case 'socks':
            return {
                ...base,
                type: 'socks5',
                username: proxy.username || '',
                password: proxy.password || '',
                tls: proxy.tls === true
            }
        default:
            return null
    }
}

function withClashTransport(node, proxy) {
    if (node.network === 'ws' && proxy['ws-opts']) {
        node.ws = {
            path: proxy['ws-opts'].path || '/',
            headers: proxy['ws-opts'].headers || {}
        }
    }
    if (node.network === 'grpc' && proxy['grpc-opts']) {
        node.grpc = {
            serviceName: proxy['grpc-opts']['grpc-service-name'] || ''
        }
    }
    return node
}

function fromSingBoxOutbound(outbound) {
    if (!outbound || typeof outbound !== 'object' || !outbound.server || !outbound.server_port) return null
    const typeMap = {
        shadowsocks: 'ss',
        shadowsocksr: 'ssr',
        socks: 'socks5'
    }
    const type = typeMap[outbound.type] || outbound.type
    const base = {
        type,
        name: outbound.tag || `${type} Node`,
        server: outbound.server,
        port: parsePort(outbound.server_port)
    }

    switch (type) {
        case 'ss':
            return { ...base, method: outbound.method, password: outbound.password }
        case 'ssr':
            return {
                ...base,
                method: outbound.method,
                password: outbound.password,
                protocol: outbound.protocol,
                protocolParam: outbound.protocol_param || '',
                obfs: outbound.obfs,
                obfsParam: outbound.obfs_param || ''
            }
        case 'vmess':
            return withSingBoxTransport({
                ...base,
                uuid: outbound.uuid,
                alterId: outbound.alter_id || 0,
                cipher: outbound.security || 'auto',
                network: outbound.transport?.type || 'tcp',
                tls: outbound.tls?.enabled === true,
                sni: outbound.tls?.server_name || outbound.server
            }, outbound)
        case 'vless':
            return withSingBoxTransport({
                ...base,
                uuid: outbound.uuid,
                flow: outbound.flow || '',
                network: outbound.transport?.type || 'tcp',
                tls: outbound.tls?.enabled === true,
                security: outbound.tls?.reality?.enabled ? 'reality' : (outbound.tls?.enabled ? 'tls' : ''),
                sni: outbound.tls?.server_name || outbound.server,
                reality: outbound.tls?.reality?.enabled ? {
                    publicKey: outbound.tls.reality.public_key || '',
                    shortId: outbound.tls.reality.short_id || '',
                    fingerprint: 'chrome',
                    sni: outbound.tls.server_name || outbound.server
                } : null
            }, outbound)
        case 'trojan':
            return withSingBoxTransport({
                ...base,
                password: outbound.password,
                network: outbound.transport?.type || 'tcp',
                sni: outbound.tls?.server_name || outbound.server,
                alpn: outbound.tls?.alpn || []
            }, outbound)
        case 'hysteria':
            return {
                ...base,
                auth: outbound.auth_str || outbound.auth || '',
                up: parsePort(outbound.up_mbps, 100),
                down: parsePort(outbound.down_mbps, 100),
                alpn: outbound.tls?.alpn?.[0] || 'h3',
                obfs: outbound.obfs || '',
                sni: outbound.tls?.server_name || outbound.server,
                insecure: outbound.tls?.insecure === true
            }
        case 'hysteria2':
            return {
                ...base,
                password: outbound.password || '',
                obfs: outbound.obfs?.type || '',
                obfsPassword: outbound.obfs?.password || '',
                sni: outbound.tls?.server_name || outbound.server,
                insecure: outbound.tls?.insecure === true
            }
        case 'tuic':
            return {
                ...base,
                uuid: outbound.uuid,
                password: outbound.password,
                token: outbound.token || '',
                congestion: outbound.congestion_control || 'bbr',
                alpn: outbound.tls?.alpn || ['h3'],
                sni: outbound.tls?.server_name || outbound.server,
                insecure: outbound.tls?.insecure === true,
                udpRelayMode: outbound.udp_relay_mode || 'native'
            }
        case 'anytls':
            return {
                ...base,
                password: outbound.password || '',
                sni: outbound.tls?.server_name || outbound.server,
                alpn: outbound.tls?.alpn || [],
                insecure: outbound.tls?.insecure === true,
                fingerprint: outbound.tls?.utls?.fingerprint || 'chrome',
                idleSessionCheckInterval: outbound.idle_session_check_interval || '',
                idleSessionTimeout: outbound.idle_session_timeout || '',
                minIdleSession: outbound.min_idle_session
            }
        case 'http':
            return {
                ...base,
                username: outbound.username || '',
                password: outbound.password || '',
                tls: outbound.tls?.enabled === true,
                sni: outbound.tls?.server_name || outbound.server
            }
        case 'socks5':
            return {
                ...base,
                username: outbound.username || '',
                password: outbound.password || ''
            }
        default:
            return null
    }
}

function withSingBoxTransport(node, outbound) {
    if (node.network === 'ws') {
        node.ws = {
            path: outbound.transport?.path || '/',
            headers: outbound.transport?.headers || {}
        }
    }
    if (node.network === 'grpc') {
        node.grpc = {
            serviceName: outbound.transport?.service_name || ''
        }
    }
    return node
}

function parseSS(uri) {
    try {
        const hashIndex = uri.indexOf('#')
        const name = hashIndex >= 0 ? safeDecode(uri.slice(hashIndex + 1)) : 'SS Node'
        const raw = hashIndex >= 0 ? uri.slice(5, hashIndex) : uri.slice(5)

        if (raw.includes('@')) {
            const atIndex = raw.lastIndexOf('@')
            const authPart = raw.slice(0, atIndex)
            const serverPart = raw.slice(atIndex + 1)
            const auth = authPart.includes(':') ? safeDecode(authPart) : decodeBase64(safeDecode(authPart))
            const split = auth.indexOf(':')
            const [server, port] = splitHostPort(serverPart)

            if (split > 0 && server && port) {
                return {
                    type: 'ss',
                    name,
                    server,
                    port,
                    method: auth.slice(0, split),
                    password: auth.slice(split + 1)
                }
            }
        }

        const decoded = decodeBase64(raw)
        const atIndex = decoded.lastIndexOf('@')
        if (atIndex < 0) return null

        const auth = decoded.slice(0, atIndex)
        const target = decoded.slice(atIndex + 1)
        const split = auth.indexOf(':')
        const [server, port] = splitHostPort(target)
        if (split < 1 || !server || !port) return null

        return {
            type: 'ss',
            name,
            server,
            port,
            method: auth.slice(0, split),
            password: auth.slice(split + 1)
        }
    } catch {
        return null
    }
}

function splitHostPort(value) {
    const raw = safeDecode(value)
    if (raw.startsWith('[')) {
        const end = raw.indexOf(']')
        return [raw.slice(1, end), parsePort(raw.slice(end + 2))]
    }
    const index = raw.lastIndexOf(':')
    return index > 0 ? [raw.slice(0, index), parsePort(raw.slice(index + 1))] : [raw, undefined]
}

function parseVmess(uri) {
    try {
        const data = JSON.parse(decodeBase64(uri.slice(8)))
        return {
            type: 'vmess',
            name: data.ps || 'VMess Node',
            server: data.add,
            port: parsePort(data.port, 443),
            uuid: data.id,
            alterId: Number.parseInt(data.aid, 10) || 0,
            cipher: data.scy || 'auto',
            network: data.net || 'tcp',
            tls: data.tls === 'tls',
            sni: data.sni || data.host || data.add,
            ws: data.net === 'ws' ? {
                path: data.path || '/',
                headers: data.host ? { Host: data.host } : {}
            } : null,
            grpc: data.net === 'grpc' ? {
                serviceName: data.path || data.serviceName || ''
            } : null
        }
    } catch {
        return null
    }
}

function parseVless(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        const security = params.get('security') || (params.get('tls') === '1' ? 'tls' : '')
        const network = params.get('type') || 'tcp'

        return {
            type: 'vless',
            name: safeDecode(url.hash.slice(1)) || 'VLESS Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            uuid: url.username,
            flow: params.get('flow') || '',
            network,
            tls: security === 'tls' || security === 'reality',
            security,
            sni: params.get('sni') || params.get('host') || url.hostname,
            ws: network === 'ws' ? {
                path: params.get('path') || '/',
                headers: params.get('host') ? { Host: params.get('host') } : {}
            } : null,
            grpc: network === 'grpc' ? {
                serviceName: params.get('serviceName') || ''
            } : null,
            reality: security === 'reality' ? {
                publicKey: params.get('pbk') || '',
                shortId: params.get('sid') || '',
                fingerprint: params.get('fp') || 'chrome',
                sni: params.get('sni') || url.hostname
            } : null
        }
    } catch {
        return null
    }
}

function parseTrojan(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        return {
            type: 'trojan',
            name: safeDecode(url.hash.slice(1)) || 'Trojan Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            password: safeDecode(url.username),
            sni: params.get('sni') || params.get('peer') || params.get('host') || url.hostname,
            alpn: params.get('alpn') ? params.get('alpn').split(',').filter(Boolean) : [],
            network: params.get('type') || 'tcp',
            ws: params.get('type') === 'ws' ? {
                path: params.get('path') || '/',
                headers: params.get('host') ? { Host: params.get('host') } : {}
            } : null
        }
    } catch {
        return null
    }
}

function parseHysteria(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        return {
            type: 'hysteria',
            name: safeDecode(url.hash.slice(1)) || 'Hysteria Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            auth: params.get('auth') || safeDecode(url.username) || '',
            up: parsePort(params.get('upmbps') || params.get('up'), 100),
            down: parsePort(params.get('downmbps') || params.get('down'), 100),
            alpn: params.get('alpn') || 'h3',
            obfs: params.get('obfs') || '',
            sni: params.get('peer') || params.get('sni') || url.hostname,
            insecure: params.get('insecure') === '1' || params.get('insecure') === 'true'
        }
    } catch {
        return null
    }
}

function parseHysteria2(uri) {
    try {
        const url = new URL(uri.replace('hy2://', 'hysteria2://'))
        const params = url.searchParams
        return {
            type: 'hysteria2',
            name: safeDecode(url.hash.slice(1)) || 'Hysteria2 Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            password: safeDecode(url.username) || params.get('auth') || '',
            obfs: params.get('obfs') || '',
            obfsPassword: params.get('obfs-password') || params.get('obfs_password') || '',
            sni: params.get('sni') || url.hostname,
            insecure: params.get('insecure') === '1' || params.get('insecure') === 'true'
        }
    } catch {
        return null
    }
}

function parseTuic(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        return {
            type: 'tuic',
            name: safeDecode(url.hash.slice(1)) || 'TUIC Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            uuid: url.username,
            password: safeDecode(url.password),
            congestion: params.get('congestion_control') || 'bbr',
            alpn: params.get('alpn') ? params.get('alpn').split(',').filter(Boolean) : ['h3'],
            sni: params.get('sni') || url.hostname,
            insecure: params.get('allow_insecure') === '1' || params.get('insecure') === '1',
            udpRelayMode: params.get('udp_relay_mode') || 'native'
        }
    } catch {
        return null
    }
}

function parseSnell(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        return {
            type: 'snell',
            name: safeDecode(url.hash.slice(1)) || 'Snell Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            psk: safeDecode(url.username) || params.get('psk') || '',
            version: parsePort(params.get('version') || params.get('v'), 3),
            obfs: params.get('obfs') || '',
            obfsHost: params.get('obfs-host') || params.get('obfs_host') || ''
        }
    } catch {
        return null
    }
}

function parseAnyTLS(uri) {
    try {
        const url = new URL(uri)
        const params = url.searchParams
        return {
            type: 'anytls',
            name: safeDecode(url.hash.slice(1)) || 'AnyTLS Node',
            server: url.hostname,
            port: parsePort(url.port, 443),
            password: safeDecode(url.username) || params.get('password') || '',
            sni: params.get('sni') || params.get('peer') || params.get('host') || url.hostname,
            alpn: params.get('alpn') ? params.get('alpn').split(',').filter(Boolean) : [],
            insecure: ['1', 'true'].includes(String(params.get('insecure') || params.get('allow_insecure') || '').toLowerCase()),
            fingerprint: params.get('fp') || params.get('fingerprint') || params.get('client-fingerprint') || 'chrome',
            idleSessionCheckInterval: params.get('idle-session-check-interval') || params.get('idle_session_check_interval') || '',
            idleSessionTimeout: params.get('idle-session-timeout') || params.get('idle_session_timeout') || '',
            minIdleSession: params.has('min-idle-session')
                ? parsePort(params.get('min-idle-session'), 0)
                : (params.has('min_idle_session') ? parsePort(params.get('min_idle_session'), 0) : undefined)
        }
    } catch {
        return null
    }
}

function parseSocks(uri) {
    try {
        const normalized = uri.replace('socks://', 'socks5://')
        const url = new URL(normalized)
        return {
            type: 'socks5',
            name: safeDecode(url.hash.slice(1)) || 'SOCKS5 Node',
            server: url.hostname,
            port: parsePort(url.port, 1080),
            username: safeDecode(url.username) || '',
            password: safeDecode(url.password) || '',
            tls: false
        }
    } catch {
        return null
    }
}

function parseHttpProxy(uri) {
    try {
        const url = new URL(uri)
        if (!url.port && !url.username && !url.password && url.pathname && url.pathname !== '/') return null
        return {
            type: 'http',
            name: safeDecode(url.hash.slice(1)) || 'HTTP Node',
            server: url.hostname,
            port: parsePort(url.port, url.protocol === 'https:' ? 443 : 80),
            username: safeDecode(url.username) || '',
            password: safeDecode(url.password) || '',
            tls: url.protocol === 'https:',
            sni: url.hostname
        }
    } catch {
        return null
    }
}

function parseSSR(uri) {
    try {
        const decoded = decodeBase64(uri.slice(6))
        const [mainPart, paramsPart = ''] = decoded.split('/?')
        const parts = mainPart.split(':')
        if (parts.length < 6) return null

        const params = new URLSearchParams(paramsPart)
        const remarks = params.get('remarks')
        const protocolParam = params.get('protoparam')
        const obfsParam = params.get('obfsparam')

        return {
            type: 'ssr',
            name: remarks ? decodeBase64(remarks) : 'SSR Node',
            server: parts[0],
            port: parsePort(parts[1]),
            protocol: parts[2],
            method: parts[3],
            obfs: parts[4],
            password: decodeBase64(parts[5]),
            protocolParam: protocolParam ? decodeBase64(protocolParam) : '',
            obfsParam: obfsParam ? decodeBase64(obfsParam) : ''
        }
    } catch {
        return null
    }
}

export function addEmoji(name) {
    const rules = [
        [['香港', 'Hong Kong', 'HK'], '🇭🇰'],
        [['台湾', 'Taiwan', 'TW'], '🇹🇼'],
        [['日本', 'Japan', 'JP'], '🇯🇵'],
        [['新加坡', 'Singapore', 'SG'], '🇸🇬'],
        [['美国', 'United States', 'America', 'USA', 'US'], '🇺🇸'],
        [['韩国', 'Korea', 'KR'], '🇰🇷'],
        [['英国', 'United Kingdom', 'UK'], '🇬🇧'],
        [['德国', 'Germany', 'DE'], '🇩🇪'],
        [['法国', 'France', 'FR'], '🇫🇷'],
        [['俄罗斯', 'Russia', 'RU'], '🇷🇺'],
        [['加拿大', 'Canada', 'CA'], '🇨🇦'],
        [['澳大利亚', 'Australia', 'AU'], '🇦🇺'],
        [['荷兰', 'Netherlands', 'NL'], '🇳🇱'],
        [['印度', 'India', 'IN'], '🇮🇳'],
        [['越南', 'Vietnam', 'VN'], '🇻🇳'],
        [['泰国', 'Thailand', 'TH'], '🇹🇭']
    ]

    if (/^[\p{Regional_Indicator}\p{Emoji_Presentation}]/u.test(name)) return name
    for (const [keywords, emoji] of rules) {
        if (keywords.some(key => new RegExp(key.length <= 3 ? `\\b${key}\\b` : key, 'i').test(name))) {
            return `${emoji} ${name}`
        }
    }
    return `🌐 ${name}`
}

export const base64 = {
    encode: value => Buffer.from(String(value)).toString('base64'),
    decode: decodeBase64,
    encodeUrl: encodeBase64Url
}
