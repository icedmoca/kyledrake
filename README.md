# Multiplayer Globe App

[![Live GitHub card powered by kyledrake.me](https://kyledrake.me/github.svg)](https://kyledrake.me)

[![Live preview of kyledrake.me](https://kyledrake.me/site.svg)](https://kyledrake.me)

This repo powers the live globe at [kyledrake.me](https://kyledrake.me), including a dynamic SVG endpoint for GitHub profile README embeds.

## Live GitHub Profile README Integration

Use this in a GitHub profile README to render the live card directly from the Cloudflare Worker:

```md
[![Live GitHub card powered by kyledrake.me](https://kyledrake.me/github.svg)](https://kyledrake.me)

[![Live preview of kyledrake.me](https://kyledrake.me/site.svg)](https://kyledrake.me)
```

The SVGs are generated at request time by `kyledrake.me/github.svg` and `kyledrake.me/site.svg` with no-cache headers so GitHub receives fresh images whenever it refreshes them.

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run check
```
