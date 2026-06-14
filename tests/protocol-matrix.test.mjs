import assert from 'node:assert/strict'
import yaml from 'js-yaml'
import { parseSubscription } from '../server/utils/parsers.js'
import { convertToTarget } from '../server/utils/converters.js'
import { base64 } from '../server/utils/parsers.js'

const b64 = value => Buffer.from(value).toString('base64')

const fixtures = [
    'ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@example.com:8388#SS',
    'ssr://ZXhhbXBsZS5jb206ODM4ODpvcmlnaW46YWVzLTI1Ni1jZmI6cGxhaW46Y0dGemMzZHZjbVE9Lz9yZW1hcmtzPVUxTlM=',
    `vmess://${b64(JSON.stringify({
        v: '2',
        ps: 'VMess-WS',
        add: 'example.com',
        port: '443',
        id: 'a3c194e2-30de-4112-a6eb-5933bef7ef67',
        aid: '0',
        net: 'ws',
        host: 'ws.example.com',
        path: '/ws',
        tls: 'tls'
    }))}`,
    'vless://a3c194e2-30de-4112-a6eb-5933bef7ef67@example.com:443?encryption=none&type=tcp&security=reality&sni=www.microsoft.com&fp=chrome&pbk=abcdefghijklmnopqrstuvwxyz123456&sid=abcd1234&flow=xtls-rprx-vision#VLESS-Reality',
    'trojan://password@example.com:443?sni=example.com#Trojan',
    'hysteria://example.com:443?auth=password&upmbps=100&downmbps=100&alpn=h3&peer=example.com#Hysteria',
    'hysteria2://password@example.com:443?sni=example.com&obfs=salamander&obfs-password=obfspass#Hysteria2',
    'tuic://a3c194e2-30de-4112-a6eb-5933bef7ef67:password@example.com:443?congestion_control=bbr&alpn=h3&sni=example.com&udp_relay_mode=native#TUIC',
    'snell://psk@example.com:443?version=3&obfs=http&obfs-host=example.com#Snell',
    'http://user:pass@example.com:8080#HTTP',
    'socks5://user:pass@example.com:1080#SOCKS5',
    'anytls://password@example.com:443?sni=example.com&alpn=h2,http/1.1&fp=chrome&insecure=1#AnyTLS'
]

const nodes = parseSubscription(fixtures.join('\n'))
const types = nodes.map(node => node.type)
assert.deepEqual(types, [
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

const clash = yaml.load(convertToTarget(nodes, 'clash', { udp: true, skipCert: false, rulePreset: 'basic' }).replace(/^#.*\n/gm, ''))
assert.ok(Array.isArray(clash.proxies))
assert.ok(clash.proxies.some(proxy => proxy.type === 'ss'))
assert.ok(!clash.proxies.some(proxy => proxy.type === 'vless'), 'classic Clash should not receive VLESS')

const mihomoText = convertToTarget(nodes, 'mihomo', { udp: true, skipCert: false, rulePreset: 'basic' })
const mihomo = yaml.load(mihomoText.replace(/^#.*\n/gm, ''))
assert.ok(mihomo.proxies.some(proxy => proxy.type === 'vless' && proxy['reality-opts']))
assert.ok(mihomo.proxies.some(proxy => proxy.type === 'anytls'))

const surge = convertToTarget(nodes, 'surge', { udp: true, skipCert: false })
assert.ok(surge.includes('tuic, example.com, 443'))
assert.ok(surge.includes('anytls, example.com, 443'))
assert.ok(!surge.includes(' = vless,'), 'Surge should not receive unsupported VLESS lines')

const qx = convertToTarget(nodes, 'quantumultx', { udp: true, skipCert: false })
assert.ok(qx.includes('vless=example.com:443'))
assert.ok(qx.includes('reality-base64-pubkey=abcdefghijklmnopqrstuvwxyz123456'))
assert.ok(qx.includes('vless-flow=xtls-rprx-vision'))
assert.ok(qx.includes('anytls=example.com:443'))

const loon = convertToTarget(nodes, 'loon', { udp: true, skipCert: false })
assert.ok(loon.includes('ShadowsocksR'))
assert.ok(loon.includes('VLESS,example.com,443'))
assert.ok(loon.includes('AnyTLS,example.com,443'))

const singbox = JSON.parse(convertToTarget(nodes, 'singbox', { udp: true, skipCert: false }))
assert.ok(singbox.outbounds.some(outbound => outbound.type === 'vless' && outbound.tls?.reality?.enabled))
assert.ok(singbox.outbounds.some(outbound => outbound.type === 'anytls' && outbound.tls?.enabled))

const decodedLinks = base64.decode(convertToTarget(nodes, 'v2rayn')).split('\n')
assert.ok(decodedLinks.some(line => line.startsWith('anytls://')))

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

console.log('protocol matrix passed')
