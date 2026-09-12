# Ink Studio

Static p5.js generative art studio for Xteink X3 sleep screens.

Serve `dist` with any static HTTP server (for example `python3 -m http.server 5173 --directory dist`). No build step or external runtime requests are needed; p5.js 1.11.11 is bundled.

Nine generators support seeded generation, live sliders, number inputs, toggles, randomization, and per-generator reset. The preview can simulate e-ink or display binary output. BMP downloads always use clean 528×792 monochrome pixels, uncompressed Windows BMP, two palette entries and bottom-up padded rows.

Run `node tests/algorithms.cjs` to check seed reproducibility, simulation stability, circle separation, and contour interpolation. Run `node tests/bmp.cjs` to validate the BMP encoder, including a full pixel round trip and header/padding assertions.

The e-ink preview is an approximation, not a calibration of a physical panel. Hardware compatibility has not been tested on a physical X3.

Additional generators: Gray–Scott reaction–diffusion (background worker), topographic contours (interpolated contour geometry), and non-overlapping circle packing. Reaction–diffusion parameters can produce uniform equilibria; Reset restores a patterned preset.
