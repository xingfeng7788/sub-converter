import assert from 'node:assert/strict'
import http from 'node:http'
import net from 'node:net'
import { spawn } from 'node:child_process'

const b64 = value => Buffer.from(value).toString('base64')

async function listen(server, host = '127.0.0.1') {
    await new Promise(resolve => server.listen(0, host, resolve))
    return server.address().port
}

async function createTcpNode() {
    const server = net.createServer(socket => {
        socket.on('data', data => socket.write(data))
        socket.on('error', () => {})
    })
    const port = await listen(server)
    return { server, port }
}

async function freePort() {
    const server = net.createServer()
    const port = await listen(server)
    await new Promise(resolve => server.close(resolve))
    return port
}

function request(port, method, path, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port,
            method,
            path,
            headers: body ? { 'Content-Type': 'application/json' } : {}
        }, res => {
            let data = ''
            res.on('data', chunk => { data += chunk })
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }))
        })
        req.on('error', reject)
        if (body) req.write(JSON.stringify(body))
        req.end()
    })
}

async function waitForBackend(port, timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs
    let lastError
    while (Date.now() < deadline) {
        try {
            const res = await request(port, 'GET', '/healthz')
            if (res.status === 200) return
            lastError = new Error(`status ${res.status}`)
        } catch (error) {
            lastError = error
        }
        await new Promise(resolve => setTimeout(resolve, 250))
    }
    throw new Error(`backend did not become ready: ${lastError?.message || 'timeout'}`)
}

async function main() {
    const onlineA = await createTcpNode()
    const onlineB = await createTcpNode()
    const offlinePort = await freePort()

    const nodes = {
        ss: `ss://${b64('aes-256-gcm:password')}@127.0.0.1:${onlineA.port}#Mock-SS`,
        vmess: `vmess://${b64(JSON.stringify({
            v: '2',
            ps: 'Mock-VMess',
            add: '127.0.0.1',
            port: String(onlineB.port),
            id: 'a3482e88-686a-4a58-8126-99c9df95f12e',
            aid: '0',
            net: 'ws',
            path: '/',
            tls: ''
        }))}`,
        vless: 'vless://a3482e88-686a-4a58-8126-99c9df95f12e@127.0.0.1:443?security=reality&sni=example.com&fp=chrome&pbk=abcdefghijklmnopqrstuvwxyz123456&sid=abcd1234&flow=xtls-rprx-vision&type=tcp#Mock-VLESS',
        anytls: `anytls://password@127.0.0.1:${onlineA.port}?sni=example.com#Mock-AnyTLS`,
        offline: `ss://${b64('aes-256-gcm:password')}@127.0.0.1:${offlinePort}#Mock-Offline`
    }

    const subContent1 = b64([nodes.ss, nodes.vmess, nodes.anytls].join('\n'))
    const subContent2 = b64([nodes.vmess, nodes.offline].join('\n'))

    const subServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        if (req.url === '/sub1') res.end(subContent1)
        else if (req.url === '/sub2') res.end(subContent2)
        else if (req.url === '/health') res.end(b64([nodes.ss, nodes.offline].join('\n')))
        else if (req.url === '/vless-only') res.end(b64(nodes.vless))
        else res.end('')
    })
    const subPort = await listen(subServer)
    const appPort = await new Promise(resolve => {
        const server = net.createServer()
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port
            server.close(() => resolve(port))
        })
    })

    const appProcess = spawn(process.execPath, ['server/index.js'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: String(appPort),
            NODE_ENV: 'test',
            ALLOW_PRIVATE_SUBSCRIPTION_URLS: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe']
    })

    let stderr = ''
    appProcess.stderr.on('data', data => { stderr += data.toString() })

    try {
        await waitForBackend(appPort)
        const sub1 = `http://127.0.0.1:${subPort}/sub1`
        const sub2 = `http://127.0.0.1:${subPort}/sub2`
        const health = `http://127.0.0.1:${subPort}/health`

        const clash = await request(appPort, 'GET', `/api/convert?target=clashmeta&url=${encodeURIComponent(sub1)}&rulePreset=standard`)
        assert.equal(clash.status, 200, clash.body)
        assert.match(clash.body, /proxies:/)
        assert.match(clash.body, /Mock-SS/)
        assert.match(clash.body, /Mock-AnyTLS/)

        const surgeVlessOnly = await request(appPort, 'GET', `/api/convert?target=surge&url=${encodeURIComponent(`http://127.0.0.1:${subPort}/vless-only`)}`)
        assert.equal(surgeVlessOnly.status, 422)

        const targets = await request(appPort, 'GET', '/api/targets')
        assert.equal(targets.status, 200)
        assert.ok(JSON.parse(targets.body).some(target => target.id === 'singbox' && target.extension === 'json'))

        const mergePreview = await request(appPort, 'POST', '/api/merge/preview', { urls: [sub1, sub2], dedupe: false })
        assert.equal(mergePreview.status, 200, mergePreview.body)
        assert.equal(JSON.parse(mergePreview.body).total, 5)

        const merge = await request(appPort, 'POST', '/api/merge', {
            urls: [sub1, sub2],
            target: 'singbox',
            dedupe: true,
            emoji: false
        })
        assert.equal(merge.status, 200, merge.body)
        const mergeJson = JSON.parse(merge.body)
        assert.ok(mergeJson.outbounds.some(outbound => outbound.type === 'anytls'))

        const healthCheck = await request(appPort, 'POST', '/api/health/check', {
            url: health,
            exportTarget: 'clashmeta',
            timeout: 800,
            concurrent: 2
        })
        assert.equal(healthCheck.status, 200, healthCheck.body)
        const healthJson = JSON.parse(healthCheck.body)
        assert.equal(healthJson.summary.online, 1)
        assert.equal(healthJson.summary.offline, 1)
        assert.match(healthJson.exportConfig, /Mock-SS/)
        assert.doesNotMatch(healthJson.exportConfig, /Mock-Offline/)

        console.log('api tests passed')
    } finally {
        appProcess.kill()
        subServer.close()
        onlineA.server.close()
        onlineB.server.close()
        if (stderr) process.stderr.write(stderr)
    }
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
