# Multiplayer Globe App

[![Live GitHub card powered by kyledrake.me](https://kyledrake.me/github.svg)](https://kyledrake.me)

This repo powers the live globe at [kyledrake.me](https://kyledrake.me), including a dynamic SVG endpoint for GitHub profile README embeds.

## Live GitHub Profile README Integration

Use this in a GitHub profile README to render the live card directly from the Cloudflare Worker:

```md
[![Live GitHub card powered by kyledrake.me](https://kyledrake.me/github.svg)](https://kyledrake.me)
```

The SVG is generated at request time by `kyledrake.me/github.svg` with no-cache headers so GitHub receives fresh repo data whenever it refreshes the image.

## Development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run check
```
