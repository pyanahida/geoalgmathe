# GeoAlgMathe

A lightweight math expression engine and real-time function plotter built with vanilla JavaScript.

## Features

- **Expression Parser** — implicit multiplication (`7x`, `2(x+1)`, `x(x+1)`), infix `=` equations (`y - 3x = 5` → auto isolate y)
- **Exact Arithmetic** — all numeric evaluation goes through a `Frac` class (decimal → fraction), zero floating-point drift
- **Real-time Plotting** — Canvas 2D rendering, updates on every keystroke
- **Interactive Viewport** — drag to pan, scroll/pinch to zoom, axes auto-highlight
- **Dark / Light Theme** — toggle button, persisted to `localStorage`
- **ES Modules** — clean file separation, no build step required

## Supported Syntax

| Category | Examples |
|----------|----------|
| Operators | `+ - × ÷ * / ^` |
| Variables | `x`, `y` |
| Implicit multiplication | `7x`, `2(x+1)`, `x(x+1)`, `3y` |
| Equations | `y = 3x - 5`, `y - 3x - 5 + 10x = 3.5` |
| Decimals | `0.9` → internally `Frac(9, 10)` |

## Project Structure

```
├── index.html
├── style.css
└── src/
    ├── main.js          # entry, events, viewport, theme
    ├── parser.js        # tokenizer, implicit multiplication, y-isolation
    ├── evaluator.js     # AST walker, fraction coercion
    ├── fraction.js      # Frac class, decimalToFrac
    └── plotter.js       # Canvas drawing, axes, grid
```

## Getting Started

No build tools needed. Serve over HTTP (ES Modules require it):

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

Then open `http://localhost:8000` in your browser.

## Browser Support

- Chrome / Edge / Firefox / Safari (desktop & mobile)
- Pointer events + touch events for drag and pinch-zoom
- `localStorage` for theme preference

## License

[MIT](LICENSE)
