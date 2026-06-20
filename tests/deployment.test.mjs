import assert from 'node:assert/strict'
import fs from 'node:fs'

const dockerfile = fs.readFileSync('Dockerfile', 'utf8')
const deployScript = fs.readFileSync('scripts/deploy.sh', 'utf8')
const compose = fs.readFileSync('docker-compose.yml', 'utf8')
const server = fs.readFileSync('server/index.js', 'utf8')
const router = fs.readFileSync('src/router/index.js', 'utf8')

assert.match(dockerfile, /APP_UID=10001/)
assert.match(dockerfile, /APP_GID=10001/)
assert.match(dockerfile, /USER app/)
assert.match(dockerfile, /\/healthz/)
assert.match(dockerfile, /COPY server \.\/server/)
assert.match(dockerfile, /COPY shared \.\/shared/)

assert.match(deployScript, /chown -R "\$\{APP_UID\}:\$\{APP_GID\}" "\$DATA_DIR"/)
assert.match(deployScript, /docker container inspect/)
assert.match(deployScript, /read_only: true/)
assert.match(deployScript, /no-new-privileges:true/)
assert.match(deployScript, /Reusing existing deployment configuration/)
assert.match(deployScript, /\$compose port "\$APP_NAME" 3000/)

assert.match(compose, /laowang-data:\/app\/data/)
assert.match(compose, /^volumes:\s*$/m)

assert.match(server, /Cache-Control', 'no-cache'/)
assert.match(server, /max-age=31536000, immutable/)
assert.doesNotMatch(router, /component:\s*\(\)\s*=>\s*import\(/)

for (const removed of [
    'Dockerfile.backend',
    'vercel.json',
    'netlify.toml',
    'wrangler.toml',
    'fly.toml',
    'zeabur.json'
]) {
    assert.equal(fs.existsSync(removed), false, `${removed} should not expose an incomplete deployment path`)
}

console.log('deployment checks passed')
