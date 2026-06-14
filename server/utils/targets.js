export const YAML_TARGETS = new Set([
    'clash',
    'clashmeta',
    'mihomo',
    'stash',
    'clashverge',
    'clash-verge',
    'clashnyanpasu',
    'clash-nyanpasu',
    'flclash'
])

export const BASE64_TARGETS = new Set([
    'shadowrocket',
    'v2rayn',
    'v2rayng',
    'v2rayu'
])

export const SING_BOX_TARGETS = new Set([
    'singbox',
    'sing-box',
    'nekobox',
    'hiddify',
    'sfa',
    'sfi',
    'sfm'
])

export const TEXT_TARGETS = new Set([
    'surge',
    'surfboard',
    'quantumultx',
    'loon'
])

export const SUPPORTED_TARGETS = new Set([
    ...YAML_TARGETS,
    ...BASE64_TARGETS,
    ...SING_BOX_TARGETS,
    ...TEXT_TARGETS
])

export function normalizeTarget(target) {
    return String(target || '').trim().toLowerCase()
}

export function isSupportedTarget(target) {
    return SUPPORTED_TARGETS.has(normalizeTarget(target))
}

export function supportedTargets() {
    return [...SUPPORTED_TARGETS]
}

export function contentTypeForTarget(target) {
    const normalized = normalizeTarget(target)
    if (SING_BOX_TARGETS.has(normalized)) return 'application/json; charset=utf-8'
    if (YAML_TARGETS.has(normalized)) return 'text/yaml; charset=utf-8'
    return 'text/plain; charset=utf-8'
}

export function extensionForTarget(target) {
    const normalized = normalizeTarget(target)
    if (SING_BOX_TARGETS.has(normalized)) return 'json'
    if (YAML_TARGETS.has(normalized)) return 'yaml'
    if (normalized === 'surge' || normalized === 'loon' || normalized === 'surfboard') return 'conf'
    return 'txt'
}
