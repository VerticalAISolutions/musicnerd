# WebGL Dithering Wave Animation - Dokumentation

## WICHTIG: NICHT ÄNDERN!
Die Animation funktioniert. Diese Dokumentation dient als Backup.

---

## Übersicht
- **Typ:** WebGL2 mit WebGL1-Fallback
- **Shape:** Wave (Sinuswelle mit Dithering)
- **Farben:** 
  - Background: `#0f1a2e` (dark blue)
  - Foreground: `#AF125A` (cherry rose) mit 60% Opacity
- **Dithering:** 8x8 Bayer Matrix

---

## HTML-Struktur
```html
<div id="wavyWrapper">
    <canvas id="wavyBackground"></canvas>
</div>
```

---

## CSS für Mobile (unteres Drittel)
```css
#wavyWrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
}
#wavyBackground {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: block;
}

/* Mobile: Animation nur im unteren Drittel */
@media (max-width: 768px), (hover: none) {
    #wavyWrapper {
        top: auto;
        bottom: 0;
        height: 33.333vh;
        overflow: hidden;
        transition: opacity 0.5s ease;
    }
    #wavyWrapper.wavy-hidden {
        opacity: 0;
        pointer-events: none;
    }
    #wavyBackground {
        top: auto;
        bottom: 0;
        height: 100vh;
        min-height: 100%;
    }
}
```

---

## JavaScript: Animation Ein-/Ausblenden
```javascript
// Animation verstecken (für Setup-Screens)
document.getElementById('wavyWrapper').classList.add('wavy-hidden');

// Animation zeigen (für Game-Screen)
document.getElementById('wavyWrapper').classList.remove('wavy-hidden');
```

---

## JavaScript: WebGL Shader (NICHT ÄNDERN!)

### Initialisierung
```javascript
(function initDitheringShader() {
    const canvas = document.getElementById('wavyBackground');
    const opts = { alpha: false, failIfMajorPerformanceCaveat: false };
    let gl = canvas.getContext('webgl2', opts);
    const isWebGL1 = !gl;
    if (!gl) gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) {
        console.warn('WebGL not supported');
        return;
    }
    // ... Rest der Initialisierung
})();
```

### Render-Funktion
```javascript
function render() {
    const isMobile = window.innerWidth <= 768;
    const pxSize = isMobile ? 4 : 3;
    const waveOffset = isMobile ? -1.5 : 0; // Mobile: unteres Drittel
    const speed = 0.5;
    const currentTime = (Date.now() - startTime) * 0.001 * speed;
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    gl.uniform1f(uniforms.u_time, currentTime);
    gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
    gl.uniform4fv(uniforms.u_colorBack, colorBack);
    gl.uniform4fv(uniforms.u_colorFront, colorFront);
    gl.uniform1f(uniforms.u_pxSize, pxSize);
    gl.uniform1f(uniforms.u_waveOffset, waveOffset);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    animationId = requestAnimationFrame(render);
}
```

### Resize-Handling
```javascript
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', function() { setTimeout(resize, 100); });
requestAnimationFrame(function() { requestAnimationFrame(resize); });
render();
```

---

## Screens und Animation-Status

| Screen | Animation sichtbar | Klasse auf #wavyWrapper |
|--------|-------------------|------------------------|
| Startscreen | JA | (keine) |
| Wer spielt mit? | NEIN | wavy-hidden |
| Spieloptionen | NEIN | wavy-hidden |
| Spiel (Laden/Spielen) | JA | (keine) |

---

## Shader-Code (Backup)

### WebGL2 Fragment Shader
```glsl
#version 300 es
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_pxSize;
uniform float u_waveOffset;
out vec4 fragColor;

const int bayer8x8[64] = int[64](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv) {
  ivec2 pos = ivec2(mod(uv, 8.0));
  int index = pos.y * 8 + pos.x;
  return float(bayer8x8[index]) / 64.0;
}

void main() {
  float t = 0.5 * u_time;
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv -= 0.5;
  float pxSize = u_pxSize;
  vec2 pxSizeUv = gl_FragCoord.xy;
  pxSizeUv -= 0.5 * u_resolution;
  pxSizeUv /= pxSize;
  vec2 pixelizedUv = floor(pxSizeUv) * pxSize / u_resolution.xy;
  pixelizedUv += 0.5;
  pixelizedUv -= 0.5;
  vec2 shape_uv = pixelizedUv * 4.0;
  shape_uv.y += u_waveOffset;
  float wave = cos(0.5 * shape_uv.x - 2.0 * t) * sin(1.5 * shape_uv.x + t) * (0.75 + 0.25 * cos(3.0 * t));
  float shape = 1.0 - smoothstep(-1.0, 1.0, shape_uv.y + wave);
  float dithering = getBayerValue(pxSizeUv) - 0.5;
  float res = step(0.5, shape + dithering);
  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;
  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;
  color += bgColor * (1.0 - opacity);
  opacity += bgOpacity * (1.0 - opacity);
  fragColor = vec4(color, opacity);
}
```
