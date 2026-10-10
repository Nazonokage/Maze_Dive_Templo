# Held-map artwork

`held-map-v2.webp` is an original AI-generated 2D hand/parchment sprite, created with the built-in image-generation tool on 2026-10-08 for this project. No third-party reference images were used. It replaces the CSS capsule hand. It is decorative and has no collision or skeleton.

Generation direction: first-person adult left hand with medium-brown skin gripping the lower-left edge of blank aged parchment; natural thumb and curled fingers, warm torchlight, subtle leather wrap and jade beads, transparent background, no text or baked map.

Immutable source: `C:/Users/Someone/.codex/generated_images/01a11beb-8176-7c42-bf04-eb48b900ad78/exec-08639040-b37a-4bcf-b5fd-dd18760e141c.png`. Runtime copy is resized to 840 pixels wide and encoded as WebP (quality 88, alpha quality 100). The runtime does not depend on that source path.

The sprite is displayed at 220-420 CSS pixels. Its map content is a separate canvas, preserving seeded layouts, snapshots, charge accounting and fading. CSS places the canvas within the blank paper while keeping it away from the thumb. The whole prop ignores pointer events. No extra WebGL draw calls, triangles or textures are introduced; the browser composites one image and the existing map canvas.

## Procedural night sky

Authored in `static/js/game.js`, using deterministic seed `templo-night-sky-v1`. One reusable Points geometry/shader draws a hemisphere of 480 mobile or 800 desktop stars. Positions, colors, sizes and shimmer phases are generated once. There are no imported images, extra dynamic lights, collision bodies, or per-frame CPU particle updates. The sky follows camera translation while retaining world orientation. Reduced motion disables shimmer. Removing the visual ceiling exposes the sky; wall collision remains unchanged.
