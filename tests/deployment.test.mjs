import assert from 'node:assert/strict'
import fs from 'node:fs'

const dockerfile = fs.readFileSync('Dockerfile', 'utf8')
const deployScript = fs.readFileSync('scripts/deploy.sh', 'utf8')
const compose = fs.readFileSync('docker-compose.yml', 'utf8')

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

assert.match(compose, /laowang-data:\/app\/data/)
assert.match(compose, /^volumes:\s*$/m)

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
