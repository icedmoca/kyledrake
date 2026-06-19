# Nyan Cat Run

[![Live GitHub card powered by kyledrake.me](https://kyledrake.me/github.svg)](https://kyledrake.me)

A Nyan Cat jumping game in the style of the Chrome dino runner, served from a
Cloudflare Worker at [kyledrake.me](https://kyledrake.me). Jump the obstacles,
ride the rainbow, and chase your best score.

## Play

- **Space** / **↑** / tap or click to jump
- Speed ramps up the longer you survive; your best score is saved locally
- The original Nyan Cat sprite + music — toggle the music with the 🔊 button

The whole game is a self-contained canvas in [`public/index.html`](public/index.html) — no build step required to play.

Assets:

- Sprite: the original 6-frame Nyan Cat animation packed into a sprite sheet at `public/nyan-sprite.png`
- Music: the original [Nyan Cat track from the Internet Archive](https://archive.org/details/NyanCatoriginal), bundled as `public/nyan.mp3` / `public/nyan.ogg`

## Live GitHub Profile README Integration

The Worker still exposes a dynamic SVG card for GitHub profile README embeds:

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
