import assert from 'node:assert/strict'
import yaml from 'js-yaml'
import { TARGET_DEFINITIONS } from '../shared/targets.js'
import { parseSubscription, base64 } from '../server/utils/parsers.js'
import { convertToTarget } from '../server/utils/converters.js'
import { dedupeNodes } from '../server/utils/nodes.js'

const b64 = value => Buffer.from(value).toString('base64')
const publicKey = Buffer.from('0123456789abcdef0123456789abcdef').toString('base64url')
const uuid = 'a3c194e2-30de-4112-a6eb-5933bef7ef67'

const fixtures = [
    'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:8388/?plugin=obfs-local%3Bobfs%3Dhttp%3Bobfs-host%3Dexample.com#Duplicate',
    'ssr://ZXhhbXBsZS5jb206ODM4ODpvcmlnaW46YWVzLTI1Ni1jZmI6cGxhaW46Y0dGemMzZHZjbVE9Lz9yZW1hcmtzPVUxTlM=',
    `vmess://${b64(JSON.stringify({
        v: '2',
        ps: 'Duplicate',
        add: 'example.com',
        port: '443',
        id: uuid,
        aid: '0',
        net: 'ws',
        host: 'ws.example.com',
        path: '/ws',
        tls: 'tls'
    }))}`,
    `vless://${uuid}@example.com:443?encryption=none&type=tcp&security=reality&sni=www.microsoft.com&fp=chrome&pbk=${publicKey}&sid=abcd1234&flow=xtls-rprx-vision#VLESS-Reality`,
    'trojan://pass%3Aword@example.com:443?sni=example.com#Trojan',
    'hysteria://example.com:443?auth=password&upmbps=100&downmbps=100&alpn=h3&peer=example.com#Hysteria',
    'hysteria2://pass%3Aword@example.com:443?sni=example.com&obfs=salamander&obfs-password=obfspass#Hysteria2',
    `tuic://${uuid}:password@example.com:443?congestion_control=bbr&alpn=h3&sni=example.com&udp_relay_mode=native#TUIC`,
    'snell://psk@example.com:443?version=3&obfs=http&obfs-host=example.com#Snell',
    'http://user:pass@example.com:8080#HTTP',
    'socks5://user:pass@example.com:1080#SOCKS5',
    'anytls://pass%3Aword@example.com:443?sni=example.com&alpn=h2,http/1.1&fp=chrome&insecure=1#AnyTLS',
    'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:70000#Invalid-Port'
]

const nodes = parseSubscription(fixtures.join('\n'))
assert.deepEqual(nodes.map(node => node.type), [
    'ss',
    'ssr',
    'vmess',
    'vless',
    'trojan',
    'hysteria',
    'hysteria2',
    'tuic',
    'snell',
    'http',
    'socks5',
    'anytls'
])

const ss = nodes.find(node => node.type === 'ss')
assert.equal(ss.plugin, 'obfs-local')
assert.deepEqual(ss.pluginOpts, { mode: 'http', host: 'example.com' })
assert.equal(nodes.find(node => node.type === 'trojan').password, 'pass:word')
assert.equal(nodes.find(node => node.type === 'hysteria2').password, 'pass:word')
assert.equal(nodes.find(node => node.type === 'anytls').password, 'pass:word')

for (const target of TARGET_DEFINITIONS) {
    const output = convertToTarget(nodes, target.id, {
        udp: true,
        skipCert: false,
        rulePreset: 'basic'
    })
    assert.ok(output.trim(), `${target.id} should produce a non-empty result`)
    assert.doesNotMatch(output, /\bundefined\b/, `${target.id} should not serialize undefined values`)

    if (target.format === 'yaml') {
        const config = yaml.load(output.replace(/^#.*\n/gm, ''))
        assert.ok(Array.isArray(config.proxies) && config.proxies.length, `${target.id} proxies missing`)
        assertUnique(config.proxies.map(proxy => proxy.name), `${target.id} proxy names`)
        assert.ok(config.proxies.every(proxy => target.nodeTypes.includes(normalizeOutputType(proxy.type))))
    }

    if (target.format === 'json') {
        const config = JSON.parse(output)
        const nodeOutbounds = config.outbounds.filter(outbound => !['selector', 'direct'].includes(outbound.type))
        assert.ok(nodeOutbounds.length, `${target.id} outbounds missing`)
        assertUnique(config.outbounds.map(outbound => outbound.tag), `${target.id} outbound tags`)
        assert.equal(config.route.final, 'proxy')
    }

    if (target.format === 'base64') {
        const decoded = base64.decode(output)
        assert.ok(decoded.split('\n').every(line => line.includes('://')))
        const roundTrip = parseSubscription(decoded)
        assert.ok(roundTrip.length, `${target.id} share links should parse again`)
        assert.ok(roundTrip.every(node => target.nodeTypes.includes(node.type)))
    }

    if (['conf', 'text'].includes(target.format)) {
        assert.ok(output.split('\n').some(line => line.includes('=')))
    }
}

const clash = yaml.load(convertToTarget(nodes, 'clash', { rulePreset: 'basic' }).replace(/^#.*\n/gm, ''))
assert.ok(!clash.proxies.some(proxy => proxy.type === 'vless'))
assert.equal(convertToTarget(nodes.filter(node => node.type === 'vless'), 'clash'), '')

const mihomo = yaml.load(convertToTarget(nodes, 'mihomo', { rulePreset: 'basic' }).replace(/^#.*\n/gm, ''))
assert.ok(mihomo.proxies.some(proxy => proxy.type === 'vless' && proxy['reality-opts']))
assert.ok(mihomo.proxies.some(proxy => proxy.type === 'ss' && proxy.plugin === 'obfs'))
assertUnique(mihomo.proxies.map(proxy => proxy.name), 'Mihomo duplicate names')

const stash = yaml.load(convertToTarget(nodes, 'stash', { rulePreset: 'basic' }).replace(/^#.*\n/gm, ''))
assert.ok(stash.proxies.some(proxy => proxy.type === 'hysteria' && proxy['up-speed'] === 100))
assert.ok(stash.proxies.some(proxy => proxy.type === 'hysteria2' && proxy.auth === 'pass:word'))

const surge = convertToTarget(nodes, 'surge')
assert.match(surge, /HTTP = http, example\.com, 8080, user, pass/)
assert.match(surge, /SOCKS5 = socks5, example\.com, 1080, user, pass/)
assert.doesNotMatch(surge, /HTTP =[^\n]*username=/)
assert.doesNotMatch(surge, /SOCKS5 =[^\n]*username=/)
assert.match(surge, /salamander-password=obfspass/)
assert.doesNotMatch(surge, / = tuic,/, 'Surge must not emit TUIC v5 credentials as a v4 token')

const surfboard = convertToTarget(nodes, 'surfboard')
assert.doesNotMatch(surfboard, / = tuic,/)

const qx = convertToTarget(nodes, 'quantumultx')
assert.match(qx, new RegExp(`reality-base64-pubkey=${publicKey}`))
assert.match(qx, /anytls=example\.com:443/)
assert.match(qx, /obfs=http/)
assert.match(qx, /obfs-host=example\.com/)

const loon = convertToTarget(nodes, 'loon')
assert.match(loon, /obfs-name=http/)
assert.match(loon, /obfs-host=example\.com/)
assert.doesNotMatch(loon, /reality=true/)
assert.match(loon, /public-key=/)

const surgeTuicV4 = convertToTarget([{
    type: 'tuic',
    name: 'TUIC-v4',
    server: 'example.com',
    port: 443,
    token: 'v4-token',
    alpn: ['h3'],
    sni: 'example.com'
}], 'surge')
assert.match(surgeTuicV4, /token=v4-token/)

const singBox = JSON.parse(convertToTarget(nodes, 'sing-box'))
assert.ok(singBox.outbounds.some(outbound => outbound.type === 'vless' && outbound.tls?.reality?.enabled))
assert.ok(singBox.outbounds.some(outbound => outbound.type === 'shadowsocks' && outbound.plugin === 'obfs-local'))

const dedupeFixture = [
    { type: 'vmess', name: 'A', server: 'same.example.com', port: 443, uuid: 'uuid-a' },
    { type: 'vmess', name: 'B', server: 'same.example.com', port: 443, uuid: 'uuid-b' },
    { type: 'vmess', name: 'A copy', server: 'same.example.com', port: 443, uuid: 'uuid-a' }
]
assert.equal(dedupeNodes(dedupeFixture).length, 2, 'different credentials must not be deduplicated')

const clashNodes = parseSubscription(`
proxies:
  - name: AnyTLS-YAML
    type: anytls
    server: example.com
    port: 443
    password: password
    sni: example.com
    client-fingerprint: chrome
`)
assert.equal(clashNodes[0]?.type, 'anytls')

const singBoxNodes = parseSubscription(JSON.stringify({
    outbounds: [{
        tag: 'AnyTLS-JSON',
        type: 'anytls',
        server: 'example.com',
        server_port: 443,
        password: 'password',
        tls: { enabled: true, server_name: 'example.com', utls: { enabled: true, fingerprint: 'chrome' } }
    }]
}))
assert.equal(singBoxNodes[0]?.type, 'anytls')

console.log(`protocol matrix passed (${TARGET_DEFINITIONS.length} targets)`)

function assertUnique(values, label) {
    assert.equal(new Set(values).size, values.length, `${label} must be unique`)
}

function normalizeOutputType(type) {
    if (type === 'socks') return 'socks5'
    return type
}
