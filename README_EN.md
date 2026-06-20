# Sub Converter

> **🎉 Acknowledgement**: This project is deeply customized and UI-redesigned based on the excellent open-source project [tony-wang1990/laowang-sub-converter](https://github.com/tony-wang1990/laowang-sub-converter). Special thanks to the original author for their hard work and solid backend logic!

Production-ready private subscription converter with a highly modernized web console and backend APIs for conversion, merge, health check, short links, and client exports.

## Quick Deploy

```bash
curl -fsSL "https://raw.githubusercontent.com/xingfeng7788/sub-converter/main/scripts/deploy.sh?$(date +%s)" | sudo bash
```

Defaults:

```text
Image: qq510023514/sub-converter:latest
Install dir: /opt/sub-converter
Data dir: /opt/sub-converter/data
Port: 3000
URL: http://SERVER_IP:3000
```

Update:

```bash
curl -fsSL "https://raw.githubusercontent.com/xingfeng7788/sub-converter/main/scripts/deploy.sh?$(date +%s)" | sudo bash -s update
```

Logs:

```bash
curl -fsSL "https://raw.githubusercontent.com/xingfeng7788/sub-converter/main/scripts/deploy.sh?$(date +%s)" | sudo bash -s logs
```

## Features

- Convert subscriptions to Clash, Mihomo, Surge, Loon, Quantumult X, Shadowrocket, V2RayN, sing-box and more.
- Merge multiple subscriptions with dedupe, sorting, filtering, renaming, and rule presets.
- Check node TCP reachability from the server and export online nodes.
- Create persistent short links with click counts.
- Generate QR codes for subscription URLs and supported share links.
- Filter every target through a client-specific protocol compatibility matrix.
- Persist short links with a fixed non-root UID/GID and proxy-aware HTTPS URLs.

Full functionality is supported by the Node/Docker deployment. Incomplete static serverless adapters are intentionally not included.

## Development

Requires Node.js `>=20.19.0`.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run server
```

## Verification

```bash
npm test
npm run build
npm run audit
```

## API

```http
GET /api/convert
POST /api/merge
POST /api/merge/preview
POST /api/health/check
POST /api/shortlink
GET /api/shortlink/list
GET /api/targets
GET /healthz
```

## License

MIT
