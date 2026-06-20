import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let customTemplates = {};
try {
    const p = path.join(__dirname, '../../custom_templates.json');
    if (fs.existsSync(p)) {
        customTemplates = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
} catch (e) {
    console.warn('Failed to load custom_templates.json:', e.message);
}

const templateCache = new Map();

async function fetchRules(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    const text = await res.text();
    return text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
}

export async function resolveTemplate(templateId) {
    if (!customTemplates[templateId]) {
        return null;
    }

    // Return from cache if recently fetched to speed up concurrent requests
    if (templateCache.has(templateId)) {
        return templateCache.get(templateId);
    }

    const url = customTemplates[templateId];
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch template INI');
        const rawConfig = await res.text();
        
        const lines = rawConfig.split('\n');
        const proxyGroups = [];
        const rules = [];
        const rulesetsToFetch = [];

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith(';')) continue;
            
            if (line.startsWith('custom_proxy_group=')) {
                const parts = line.substring('custom_proxy_group='.length).split('\`');
                const name = parts[0];
                const type = parts[1];
                
                const group = {
                    name,
                    type,
                    proxies: []
                };
                
                for (let i = 2; i < parts.length; i++) {
                    const part = parts[i].trim();
                    if (!part) continue;
                    if (part.startsWith('http://') || part.startsWith('https://')) {
                        group.url = part;
                    } else if (/^\d+$/.test(part)) {
                        if (!group.interval) group.interval = parseInt(part);
                    } else if (part.includes(',,')) {
                        const sub = part.split(',,');
                        group.interval = parseInt(sub[0]);
                        if (sub[1]) group.tolerance = parseInt(sub[1]);
                    } else {
                        if (part.startsWith('[]')) {
                            group.proxies.push(part.substring(2));
                        } else if (part === 'DIRECT' || part === 'REJECT') {
                            group.proxies.push(part);
                        } else {
                            if (!group.filter) group.filter = [];
                            group.filter.push(part);
                        }
                    }
                }
                proxyGroups.push(group);
            } else if (line.startsWith('ruleset=')) {
                const parts = line.substring('ruleset='.length).split(',');
                const groupName = parts[0].trim();
                const target = parts[1].trim();
                
                if (target.startsWith('[]')) {
                    const ruleType = target.substring(2);
                    if (ruleType === 'FINAL' || ruleType === 'MATCH') {
                        rules.push(`MATCH,${groupName}`);
                    } else {
                        const payload = parts[2];
                        const extra = parts.slice(3).join(',');
                        let ruleStr = `${ruleType},${payload},${groupName}`;
                        if (extra) ruleStr += `,${extra}`;
                        rules.push(ruleStr);
                    }
                } else if (target.startsWith('http')) {
                    rulesetsToFetch.push({ target, groupName });
                }
            }
        }
        
        // Fetch all list rules concurrently
        await Promise.all(rulesetsToFetch.map(async ({ target, groupName }) => {
            try {
                const fetchedRules = await fetchRules(target);
                const supportedTypes = new Set([
                    'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-REGEX',
                    'GEOSITE', 'IP-CIDR', 'IP-CIDR6', 'IP-SUFFIX', 'IP-ASN', 'GEOIP',
                    'SRC-IP-CIDR', 'SRC-PORT', 'DST-PORT', 'PROCESS-NAME', 'PROCESS-PATH',
                    'MATCH', 'IN-PORT', 'IN-TYPE', 'IN-USER', 'IN-NAME', 'NETWORK', 'DSCP'
                ]);
                
                for (const fr of fetchedRules) {
                    let ruleString = fr.trim();
                    if (ruleString.startsWith('IP6-CIDR,')) {
                        ruleString = ruleString.replace('IP6-CIDR,', 'IP-CIDR6,');
                    } else if (ruleString.startsWith('HOST,')) {
                        ruleString = ruleString.replace('HOST,', 'DOMAIN,');
                    } else if (ruleString.startsWith('HOST-SUFFIX,')) {
                        ruleString = ruleString.replace('HOST-SUFFIX,', 'DOMAIN-SUFFIX,');
                    } else if (ruleString.startsWith('HOST-KEYWORD,')) {
                        ruleString = ruleString.replace('HOST-KEYWORD,', 'DOMAIN-KEYWORD,');
                    }
                    
                    const frParts = ruleString.split(',');
                    const ruleType = frParts[0].trim();
                    
                    if (!supportedTypes.has(ruleType)) {
                        continue;
                    }
                    
                    let hasNoResolve = false;
                    if (frParts.length >= 3 && frParts[frParts.length - 1].trim().toLowerCase() === 'no-resolve') {
                        hasNoResolve = true;
                    }
                    
                    if (ruleType === 'MATCH' || ruleType === 'FINAL') {
                        rules.push(`MATCH,${groupName}`);
                    } else if (frParts.length >= 2) {
                        const payload = frParts[1].trim();
                        if (hasNoResolve) {
                            rules.push(`${ruleType},${payload},${groupName},no-resolve`);
                        } else {
                            rules.push(`${ruleType},${payload},${groupName}`);
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching ruleset list:', target, e.message);
            }
        }));
        
        const presetObj = {
            name: templateId,
            description: 'Custom dynamic template',
            groups: proxyGroups,
            rules: rules
        };
        
        templateCache.set(templateId, presetObj);
        // Expire cache after 10 minutes to allow updates but keep it fast
        setTimeout(() => templateCache.delete(templateId), 10 * 60 * 1000);
        
        return presetObj;
    } catch (error) {
        console.error('Template resolving error:', error);
        return null;
    }
}

export function getCustomTemplates() {
    return Object.keys(customTemplates).map(key => ({
        id: key,
        name: key + ' (动态解析)',
        description: '从 ' + customTemplates[key] + ' 动态加载'
    }));
}
