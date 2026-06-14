# 老王订阅转换器

一个面向中文用户的订阅转换与节点整理工具。项目提供 Web 控制台和后端 API，支持多协议解析、多客户端输出、订阅合并、节点健康检测、二维码导入、短链接，以及 Docker/NAS 私有化部署。

## 核心能力

- 多协议解析：SS、SSR、VMess、VLESS、VLESS Reality、Trojan、Hysteria、Hysteria2、TUIC、Snell、AnyTLS、HTTP、SOCKS5、Clash/Mihomo YAML、sing-box JSON。
- 多客户端输出：Clash、Clash Meta、Mihomo、Stash、Clash Verge、FlClash、Surge、Surfboard、Loon、Quantumult X、Shadowrocket、V2RayN、V2RayNG、V2RayU、NekoBox、Hiddify、sing-box、SFA、SFI、SFM。
- 节点整理：过滤、排除、排序、重命名、地区 emoji、合并多订阅、按协议/服务器/端口去重。
- 健康检测：从部署服务器侧检测 TCP 可达性和延迟，并导出在线节点。
- 私有化部署：支持 Node、Docker、Docker Compose、Vercel、Netlify、Render、Fly、Zeabur 等部署方式。

## 本地开发

需要 Node.js `>=20.19.0`。

```bash
npm install
npm run dev
```

前端开发服务由 Vite 启动。后端 API 可单独启动：

```bash
npm run server
```

生产构建：

```bash
npm run build
npm run server
```

## Docker / NAS

```bash
docker run -d \
  --name laowang-sub-converter \
  -p 3000:3000 \
  -v ./data:/app/data \
  --restart unless-stopped \
  ghcr.io/tony-wang1990/laowang-sub-converter:latest
```

访问：

```text
http://NAS_IP:3000
```

短链接数据保存在容器内 `/app/data`，建议挂载到宿主机目录。

## API

### 订阅转换

```http
GET /api/convert?target=clashmeta&url=https%3A%2F%2Fexample.com%2Fsub
```

常用参数：

| 参数 | 说明 |
| --- | --- |
| `target` | 目标客户端，例如 `mihomo`、`singbox`、`surge`、`v2rayn` |
| `url` | 订阅地址，需要 URL 编码 |
| `emoji` | 是否添加地区标识，`1` 或 `0` |
| `udp` | 是否启用 UDP，`1` 或 `0` |
| `scert` | 是否跳过证书校验，`1` 或 `0` |
| `sort` | 是否按名称排序，`1` 或 `0` |
| `include` | 仅保留包含关键词的节点，多个关键词用 `|` 分隔 |
| `exclude` | 排除包含关键词的节点，多个关键词用 `|` 分隔 |
| `rename` | 重命名规则，例如 `old->new`，多条规则换行 |
| `rulePreset` | 分流模板：`basic`、`standard`、`developer`、`gaming`、`streaming` |

### 支持目标列表

```http
GET /api/targets
```

返回目标客户端 ID、响应类型和默认文件扩展名。

### 订阅合并

```http
POST /api/merge
Content-Type: application/json

{
  "urls": ["https://example.com/sub1", "https://example.com/sub2"],
  "target": "clashmeta",
  "dedupe": true,
  "emoji": true,
  "sort": false,
  "rulePreset": "standard"
}
```

预览接口：

```http
POST /api/merge/preview
```

### 节点健康检测

```http
POST /api/health/check
Content-Type: application/json

{
  "url": "https://example.com/sub",
  "timeout": 5000,
  "concurrent": 10,
  "exportTarget": "clashmeta"
}
```

也可以传入原始节点内容：

```json
{
  "content": "ss://...\nvmess://...",
  "exportTarget": "v2rayn"
}
```

### 短链接

```http
POST /api/shortlink
Content-Type: application/json

{
  "url": "https://example.com/api/convert?target=clashmeta&url=...",
  "code": "my-profile"
}
```

列表和删除：

```http
GET /api/shortlink/list
DELETE /api/shortlink/:id
```

健康探针：

```http
GET /healthz
```

## 兼容性说明

| 输入协议 | 支持情况 |
| --- | --- |
| SS / SSR | 常见 URI、Clash YAML |
| VMess | TCP、WS、gRPC、TLS |
| VLESS | TLS、Reality、WS、gRPC |
| Trojan | TLS、WS |
| Hysteria / Hysteria2 | 常见分享链接和 Clash/sing-box 配置 |
| TUIC | 常见 v5 分享链接和 Mihomo/sing-box 配置 |
| Snell | 常见分享链接和 Mihomo/Surge/Loon 配置 |
| AnyTLS | URI、Mihomo YAML、sing-box JSON、Surge/Loon/Quantumult X 输出 |
| HTTP / SOCKS5 | 常见代理节点 |

部分客户端不支持所有协议。转换器会尽量只输出目标客户端可识别的节点；如果某个目标客户端没有任何可输出节点，接口返回 `422`，避免下载空配置或伪配置。

## 安全配置

默认禁止后端拉取 `localhost`、内网 IP、链路本地地址等私有订阅 URL，减少公开部署时的 SSRF 风险。自用内网部署如果确实需要拉取本机或内网订阅，可以设置：

```bash
ALLOW_PRIVATE_SUBSCRIPTION_URLS=1
```

## 测试

```bash
npm test
npm run build
npm run audit
```

当前测试覆盖协议解析、目标客户端关键字段、订阅转换、合并、去重、健康检测和在线节点导出。
`npm run audit` 用于依赖安全审计，当前依赖已升级到通过审计的 Vite / esbuild 版本。

## License

MIT License
