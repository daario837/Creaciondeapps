# Desbroce Los Zagales

App para presupuestar trabajos de desbroce, poda y fumigación desde el móvil o la tablet.

- Funciona sin cobertura una vez abierta por primera vez.
- Los datos se guardan solo en el dispositivo (usa **Ajustes → Copia de seguridad** para no perderlos).
- PIN inicial: **1234** (cámbialo en Ajustes).

## Estructura

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página principal |
| `css/app.css` | Colores, tamaños y diseño |
| `js/calc.js` | Las fórmulas del cálculo (horas, precios, IVA, IRPF) |
| `js/store.js` | Los precios por defecto y el guardado de datos |
| `js/calculadora.js` | La pantalla «Calcular» |
| `js/ajustes.js` | La pantalla «Ajustes» |
| `js/pin.js` | La pantalla del PIN |
| `sw.js` | Hace que funcione sin cobertura. **Cambiar `VERSION` en cada actualización.** |
| `manifest.webmanifest` | Permite instalarla en la pantalla de inicio |
