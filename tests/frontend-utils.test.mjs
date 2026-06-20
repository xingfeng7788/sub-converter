import assert from 'node:assert/strict'
import { apiErrorMessage } from '../src/utils/apiError.js'
import { copyText } from '../src/utils/clipboard.js'

assert.equal(apiErrorMessage('Invalid subscription URL'), '订阅地址格式无效')
assert.equal(
    apiErrorMessage({ error: 'Conversion failed', message: 'Invalid subscription URL' }),
    '订阅地址格式无效'
)
assert.equal(
    apiErrorMessage('{"error":"Custom code already exists"}'),
    '这个自定义短码已存在'
)
assert.equal(
    apiErrorMessage({ error: 'Failed to fetch subscription: HTTP 403' }),
    '拉取订阅失败：HTTP 403'
)
assert.equal(apiErrorMessage(new Error('Invalid target client')), '不支持所选目标客户端')
assert.equal(apiErrorMessage('', '自定义失败提示'), '自定义失败提示')
assert.equal(apiErrorMessage('Unmapped upstream detail'), 'Unmapped upstream detail')

let clipboardValue = ''
Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
        clipboard: {
            writeText: async value => {
                clipboardValue = value
            }
        }
    }
})
await copyText('secure-copy')
assert.equal(clipboardValue, 'secure-copy')

let fallbackValue = ''
const fallbackElement = {
    value: '',
    style: {},
    setAttribute() {},
    select() {
        fallbackValue = this.value
    },
    remove() {}
}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} })
Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
        body: { appendChild() {} },
        createElement: () => fallbackElement,
        execCommand: command => command === 'copy'
    }
})
await copyText('http-copy')
assert.equal(fallbackValue, 'http-copy')

console.log('frontend utility tests passed')
