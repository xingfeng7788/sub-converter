import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import convertRouter from './routes/convert.js'
import shortlinkRouter from './routes/shortlink.js'
import healthRouter from './routes/health.js'
import mergeRouter from './routes/merge.js'
import { getRulePresets } from './utils/rules.js'
import { contentTypeForTarget, extensionForTarget, supportedTargets } from './utils/targets.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/convert', convertRouter)
app.use('/api/shortlink', shortlinkRouter)
app.use('/api/health', healthRouter)
app.use('/api/merge', mergeRouter)
app.use('/s', shortlinkRouter)

app.get('/api/rules/presets', (req, res) => {
    res.json(getRulePresets())
})

app.get('/api/targets', (req, res) => {
    res.json(supportedTargets().map(id => ({
        id,
        contentType: contentTypeForTarget(id),
        extension: extensionForTarget(id)
    })))
})

const serverHealth = (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
}

app.get('/healthz', serverHealth)
app.get('/health', (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers.accept?.includes('text/html')) {
        return next()
    }
    return serverHealth(req, res)
})

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')))

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'))
    })
}

app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ error: 'Something went wrong!' })
})

if (path.resolve(process.argv[1] || '') === path.resolve(__filename)) {
    app.listen(PORT, () => {
        console.log(`LaoWang Sub-converter server running on port ${PORT}`)
        console.log(`API: http://localhost:${PORT}/api`)
        console.log(`Health: http://localhost:${PORT}/healthz`)
    })
}

export default app
