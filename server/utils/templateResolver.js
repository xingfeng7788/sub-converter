import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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

const CACHE_DIR = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'rulesets');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const templateCache = new Map();

const supportedTypes = new Set([
    'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-REGEX',
    'GEOSITE', 'IP-CIDR', 'IP-CIDR6', 'IP-SUFFIX', 'IP-ASN', 'GEOIP',
    'SRC-IP-CIDR', 'SRC-PORT', 'DST-PORT', 'PROCESS-NAME', 'PROCESS-PATH',
    'MATCH', 'IN-PORT', 'IN-TYPE', 'IN-USER', 'IN-NAME', 'NETWORK', 'DSCP'
]);

async function fetchRulesetText(url) {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    const diskFile = path.join(CACHE_DIR, `ruleset_${hash}.txt`);
    
    try {
        console.log(`[TemplateResolver] Downloading ruleset: ${url}`);
        const start = Date.now();
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch HTTP ' + res.status);
        const text = await res.text();
        fs.writeFileSync(diskFile, text, 'utf8');
        console.log(`[TemplateResolver] Downloaded ${url} in ${Date.now() - start}ms (${(text.length / 1024).toFixed(1)} KB)`);
        return text;
    } catch (e) {
        console.warn(`[TemplateResolver] Fetch failed for ${url}, trying disk cache...`, e.message);
        if (fs.existsSync(diskFile)) {
            console.log(`[TemplateResolver] Recovered ${url} from disk cache`);
            return fs.readFileSync(diskFile, 'utf8');
        }
        throw e;
    }
}

function parseRuleset(text, groupName, rulesArray) {
    let start = 0;
    while (start < text.length) {
        let end = text.indexOf('\n', start);
        if (end === -1) end = text.length;
        
        let line = text.substring(start, end).trim();
        start = end + 1;
        
        if (!line || line[0] === '#' || (line[0] === '/' && line[1] === '/')) continue;
        
        let firstComma = line.indexOf(',');
        let ruleType, remainder;
        if (firstComma === -1) {
            ruleType = line.toUpperCase();
            remainder = '';
        } else {
            ruleType = line.substring(0, firstComma).toUpperCase();
            remainder = line.substring(firstComma + 1).trim();
        }
        
        switch (ruleType) {
            case 'IP6-CIDR': ruleType = 'IP-CIDR6'; break;
            case 'HOST': ruleType = 'DOMAIN'; break;
            case 'HOST-SUFFIX': ruleType = 'DOMAIN-SUFFIX'; break;
            case 'HOST-KEYWORD': ruleType = 'DOMAIN-KEYWORD'; break;
        }
        
        if (!supportedTypes.has(ruleType)) continue;
        
        if (ruleType === 'MATCH' || ruleType === 'FINAL') {
            rulesArray.push(`MATCH,${groupName}`);
            continue;
        }
        
        if (!remainder) continue;
        
        let noResolve = '';
        if (remainder.length > 10 && remainder.substring(remainder.length - 10).toLowerCase() === 'no-resolve') {
            const beforeNoResolve = remainder.substring(remainder.length - 11, remainder.length - 10);
            if (beforeNoResolve === ',') {
                noResolve = ',no-resolve';
                remainder = remainder.substring(0, remainder.length - 11).trim();
            }
        }
        
        let secondComma = remainder.indexOf(',');
        let payload = secondComma === -1 ? remainder : remainder.substring(0, secondComma).trim();
        
        rulesArray.push(`${ruleType},${payload},${groupName}${noResolve}`);
    }
}

async function doResolveTemplate(templateId) {
    console.log(`[TemplateResolver] Resolving template [${templateId}]...`);
    const startOverall = Date.now();
    const url = customTemplates[templateId];
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
            const group = { name: parts[0], type: parts[1], proxies: [] };
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
                    if (part.startsWith('[]')) group.proxies.push(part.substring(2));
                    else if (part === 'DIRECT' || part === 'REJECT') group.proxies.push(part);
                    else {
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
    
    // Fetch external rulesets concurrently
    console.log(`[TemplateResolver] [${templateId}] Found ${rulesetsToFetch.length} external rulesets to fetch.`);
    await Promise.all(rulesetsToFetch.map(async ({ target, groupName }) => {
        try {
            const text = await fetchRulesetText(target);
            const startParse = Date.now();
            const rulesBefore = rules.length;
            parseRuleset(text, groupName, rules);
            console.log(`[TemplateResolver] [${templateId}] Parsed ${rules.length - rulesBefore} rules for group '${groupName}' in ${Date.now() - startParse}ms`);
        } catch (e) {
            console.error(`[TemplateResolver] [${templateId}] Error fetching ruleset list:`, target, e.message);
        }
    }));
    
    // 确保所有的 MATCH / FINAL 规则都在最后面，防止规则被提前拦截
    const normalRules = rules.filter(r => !r.startsWith('MATCH,'));
    const finalRules = rules.filter(r => r.startsWith('MATCH,'));
    const sortedRules = [...normalRules, ...finalRules];

    console.log(`[TemplateResolver] [${templateId}] Resolved in ${Date.now() - startOverall}ms. Groups: ${proxyGroups.length}, Total Rules: ${sortedRules.length}`);
    return {
        name: templateId,
        description: 'Custom dynamic template',
        groups: proxyGroups,
        rules: sortedRules
    };
}

export async function resolveTemplate(templateId) {
    if (!customTemplates[templateId]) return null;

    // 1. Fast path: Memory Cache
    if (templateCache.has(templateId)) {
        console.log(`[TemplateResolver] [${templateId}] Served from MEMORY cache`);
        return templateCache.get(templateId);
    }

    // 2. Medium path: Disk Cache (survives restarts)
    const diskCacheFile = path.join(CACHE_DIR, `template_${templateId}.json`);
    if (fs.existsSync(diskCacheFile)) {
        try {
            const cached = JSON.parse(fs.readFileSync(diskCacheFile, 'utf8'));
            templateCache.set(templateId, cached);
            console.log(`[TemplateResolver] [${templateId}] Served from DISK cache, triggering background update`);
            // Kick off background revalidation to ensure it's fresh
            updateTemplateInBackground(templateId);
            return cached;
        } catch (e) {
            console.warn(`[TemplateResolver] Failed to read disk cache for ${templateId}`, e.message);
        }
    }

    console.log(`[TemplateResolver] [${templateId}] Cache miss, running full sync resolution...`);
    // 3. Slow path: Fetch & Parse synchronously (only happens once if no cache exists)
    return await updateTemplateInBackground(templateId);
}

// Perform the fetch, parse, and save to both caches
async function updateTemplateInBackground(templateId) {
    try {
        const presetObj = await doResolveTemplate(templateId);
        if (presetObj) {
            templateCache.set(templateId, presetObj);
            const diskCacheFile = path.join(CACHE_DIR, `template_${templateId}.json`);
            fs.writeFileSync(diskCacheFile, JSON.stringify(presetObj), 'utf8');
            console.log(`[TemplateResolver] [${templateId}] Successfully updated cache`);
        }
        return presetObj;
    } catch (e) {
        console.error(`[TemplateResolver] [${templateId}] Background update failed:`, e.message);
        return templateCache.get(templateId) || null;
    }
}

// Background Cron Job: Update all templates every 2 hours
async function updateAllTemplates() {
    console.log('[TemplateResolver] Starting periodic update of custom templates...');
    const templateIds = Object.keys(customTemplates);
    for (const id of templateIds) {
        await updateTemplateInBackground(id);
    }
    console.log('[TemplateResolver] Periodic update finished.');
}

// Run the job every 2 hours
// setInterval(updateAllTemplates, 2 * 60 * 60 * 1000);

// Run 5 seconds after startup to prime the cache
// setTimeout(updateAllTemplates, 5000);

export function getCustomTemplates() {
    return Object.keys(customTemplates).map(key => ({
        id: key,
        name: key + ' (动态解析)',
        description: '从 ' + customTemplates[key] + ' 动态加载'
    }));
}
