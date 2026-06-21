import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getCustomTemplates } from './templateResolver.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const GROUPS = {
    select: '🚀 节点选择',
    auto: '♻️ 自动选择',
    direct: '🎯 全球直连',
    reject: '🛑 广告拦截',
    final: '🐟 漏网之鱼',
    telegram: '📲 电报消息',
    media: '🎥 流媒体',
    ai: '🤖 AI 服务',
    dev: '💻 开发工具',
    game: '🎮 游戏平台',
    netflix: 'Netflix',
    disney: 'Disney+',
    youtube: 'YouTube',
    spotify: 'Spotify'
}

export const rulePresets = {
    basic: {
        name: 'Basic',
        description: 'Small, compatible rule set for general use.',
        groups: [
            { name: GROUPS.select, type: 'select', proxies: [GROUPS.auto, 'DIRECT'] },
            { name: GROUPS.auto, type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 300 }
        ],
        rules: [
            `GEOIP,LAN,DIRECT`,
            `GEOIP,CN,DIRECT`,
            `MATCH,${GROUPS.select}`
        ]
    },
    standard: {
        name: 'Standard',
        description: 'Balanced rules for daily browsing, media, AI, ads and direct China traffic.',
        groups: [
            { name: GROUPS.select, type: 'select', proxies: [GROUPS.auto, GROUPS.direct] },
            { name: GROUPS.auto, type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 300 },
            { name: GROUPS.telegram, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.media, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.ai, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.direct, type: 'select', proxies: ['DIRECT'] },
            { name: GROUPS.reject, type: 'select', proxies: ['REJECT'] },
            { name: GROUPS.final, type: 'select', proxies: [GROUPS.select, GROUPS.direct] }
        ],
        rules: [
            `DOMAIN-KEYWORD,adservice,${GROUPS.reject}`,
            `DOMAIN-KEYWORD,tracking,${GROUPS.reject}`,
            `DOMAIN-SUFFIX,openai.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,chatgpt.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,anthropic.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,claude.ai,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,gemini.google.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,t.me,${GROUPS.telegram}`,
            `DOMAIN-SUFFIX,telegram.org,${GROUPS.telegram}`,
            `IP-CIDR,91.108.4.0/22,${GROUPS.telegram},no-resolve`,
            `IP-CIDR,149.154.160.0/20,${GROUPS.telegram},no-resolve`,
            `DOMAIN-SUFFIX,netflix.com,${GROUPS.media}`,
            `DOMAIN-SUFFIX,nflxvideo.net,${GROUPS.media}`,
            `DOMAIN-SUFFIX,youtube.com,${GROUPS.media}`,
            `DOMAIN-SUFFIX,googlevideo.com,${GROUPS.media}`,
            `DOMAIN-SUFFIX,spotify.com,${GROUPS.media}`,
            `DOMAIN-SUFFIX,cn,${GROUPS.direct}`,
            `DOMAIN-SUFFIX,baidu.com,${GROUPS.direct}`,
            `DOMAIN-SUFFIX,bilibili.com,${GROUPS.direct}`,
            `DOMAIN-SUFFIX,qq.com,${GROUPS.direct}`,
            `DOMAIN-SUFFIX,taobao.com,${GROUPS.direct}`,
            `GEOIP,LAN,${GROUPS.direct}`,
            `GEOIP,CN,${GROUPS.direct}`,
            `MATCH,${GROUPS.final}`
        ]
    },
    developer: {
        name: 'Developer',
        description: 'Rules for GitHub, package registries, cloud platforms and AI tools.',
        groups: [
            { name: GROUPS.select, type: 'select', proxies: [GROUPS.auto, GROUPS.direct] },
            { name: GROUPS.auto, type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 300 },
            { name: GROUPS.dev, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.ai, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.direct, type: 'select', proxies: ['DIRECT'] },
            { name: GROUPS.final, type: 'select', proxies: [GROUPS.select, GROUPS.direct] }
        ],
        rules: [
            `DOMAIN-SUFFIX,github.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,githubusercontent.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,githubassets.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,npmjs.org,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,npmjs.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,docker.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,stackoverflow.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,vercel.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,cloudflare.com,${GROUPS.dev}`,
            `DOMAIN-SUFFIX,openai.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,chatgpt.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,anthropic.com,${GROUPS.ai}`,
            `DOMAIN-SUFFIX,claude.ai,${GROUPS.ai}`,
            `GEOIP,LAN,${GROUPS.direct}`,
            `GEOIP,CN,${GROUPS.direct}`,
            `MATCH,${GROUPS.final}`
        ]
    },
    gaming: {
        name: 'Gaming',
        description: 'Low-latency groups for Steam, Epic, PlayStation, Xbox, Nintendo and Discord.',
        groups: [
            { name: GROUPS.select, type: 'select', proxies: [GROUPS.auto, GROUPS.direct] },
            { name: GROUPS.auto, type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 150, tolerance: 50 },
            { name: GROUPS.game, type: 'select', proxies: [GROUPS.auto, GROUPS.select] },
            { name: GROUPS.direct, type: 'select', proxies: ['DIRECT'] },
            { name: GROUPS.final, type: 'select', proxies: [GROUPS.select, GROUPS.direct] }
        ],
        rules: [
            `DOMAIN-SUFFIX,steamcommunity.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,steampowered.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,epicgames.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,playstation.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,xbox.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,nintendo.com,${GROUPS.game}`,
            `DOMAIN-SUFFIX,discord.com,${GROUPS.game}`,
            `GEOIP,LAN,${GROUPS.direct}`,
            `GEOIP,CN,${GROUPS.direct}`,
            `MATCH,${GROUPS.final}`
        ]
    },
    streaming: {
        name: 'Streaming',
        description: 'Dedicated groups for Netflix, Disney+, YouTube and Spotify.',
        groups: [
            { name: GROUPS.select, type: 'select', proxies: [GROUPS.auto, GROUPS.direct] },
            { name: GROUPS.auto, type: 'url-test', proxies: [], url: 'http://www.gstatic.com/generate_204', interval: 300 },
            { name: GROUPS.netflix, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.disney, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.youtube, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.spotify, type: 'select', proxies: [GROUPS.select, GROUPS.auto] },
            { name: GROUPS.direct, type: 'select', proxies: ['DIRECT'] },
            { name: GROUPS.final, type: 'select', proxies: [GROUPS.select, GROUPS.direct] }
        ],
        rules: [
            `DOMAIN-SUFFIX,netflix.com,${GROUPS.netflix}`,
            `DOMAIN-SUFFIX,nflxvideo.net,${GROUPS.netflix}`,
            `DOMAIN-SUFFIX,disneyplus.com,${GROUPS.disney}`,
            `DOMAIN-SUFFIX,dssott.com,${GROUPS.disney}`,
            `DOMAIN-SUFFIX,youtube.com,${GROUPS.youtube}`,
            `DOMAIN-SUFFIX,googlevideo.com,${GROUPS.youtube}`,
            `DOMAIN-SUFFIX,spotify.com,${GROUPS.spotify}`,
            `DOMAIN-SUFFIX,spotifycdn.com,${GROUPS.spotify}`,
            `GEOIP,LAN,${GROUPS.direct}`,
            `GEOIP,CN,${GROUPS.direct}`,
            `MATCH,${GROUPS.final}`
        ]
    }
}

export function getRulePresets() {
    const builtins = Object.entries(rulePresets).map(([id, preset]) => ({
        id,
        name: preset.name,
        description: preset.description,
        groupCount: preset.groups.length,
        ruleCount: preset.rules.length
    }))
    const customs = getCustomTemplates()
    return builtins.concat(customs)
}

export function getRulePreset(presetId) {
    return rulePresets[presetId] || rulePresets.basic
}

export function applyRulePreset(nodeNames, presetId = 'basic') {
    const names = Array.isArray(nodeNames)
        ? nodeNames
            .map(item => typeof item === 'string' ? item : item?.name)
            .filter(Boolean)
        : []
    const preset = typeof presetId === 'object' && presetId !== null ? presetId : getRulePreset(presetId)
    const presetIdStr = typeof presetId === 'string' ? presetId : 'custom'
    const groups = preset.groups.map(group => {
        let proxies = [];
        
        if (group.filter && group.filter.length > 0) {
            for (const name of names) {
                for (const pattern of group.filter) {
                    try {
                        // JavaScript RegExp does not support inline (?i) modifier
                        // Since we pass 'i' flag anyway, we can just strip it
                        let jsPattern = pattern.replace(/\(\?i\)/g, '');
                        if (new RegExp(jsPattern, 'i').test(name)) {
                            proxies.push(name);
                            break;
                        }
                    } catch (e) {
                        console.warn('Invalid regex in filter:', pattern, e.message);
                    }
                }
            }
        }
        
        if (group.proxies && group.proxies.length > 0) {
             proxies.push(...group.proxies);
        }

        if (!group.filter || group.filter.length === 0) {
            if (group.type === 'url-test' || group.type === 'fallback' || group.type === 'load-balance') {
                if (!group.proxies || group.proxies.length === 0) {
                    proxies.push(...names);
                }
            } else if (group.name === GROUPS.select && (!group.proxies || group.proxies.length === 0)) {
                proxies.push(...names);
            }
        }

        const { filter, ...groupWithoutFilter } = group;
        let finalProxies = [...new Set(proxies)].filter(Boolean);
        
        if (finalProxies.length === 0) {
            finalProxies = ['DIRECT'];
        }

        return {
            ...groupWithoutFilter,
            proxies: finalProxies
        }
    })

    const existingGroupNames = new Set(groups.map(g => g.name));
    
    existingGroupNames.add('DIRECT');
    existingGroupNames.add('REJECT');
    existingGroupNames.add('no-resolve');

    for (const rule of preset.rules) {
        const parts = rule.split(',');
        if (parts.length >= 2) {
            let targetGroup = '';
            if (parts[0] === 'MATCH' || parts[0] === 'FINAL') {
                targetGroup = parts[1];
            } else if (parts.length >= 3) {
                targetGroup = parts[2];
            }
            
            if (targetGroup && !existingGroupNames.has(targetGroup)) {
                groups.push({
                    name: targetGroup,
                    type: 'select',
                    proxies: ['DIRECT']
                });
                existingGroupNames.add(targetGroup);
            }
        }
    }

    return {
        proxyGroups: groups,
        rules: preset.rules
    }
}
