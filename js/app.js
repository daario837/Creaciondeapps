// Arranque de la app: PIN, menú inferior y cambio entre pantallas.
import { estaDesbloqueado, pedirPin, vigilarInactividad } from './pin.js';
import { vistaCalculadora } from './calculadora.js';
import { vistaAjustes } from './ajustes.js';
import { $, $$ } from './ui.js';

const VISTAS = {
  calcular: vistaCalculadora,
  ajustes: vistaAjustes,
};

function mostrar() {
  const nombre = location.hash.slice(1) || 'calcular';
  const vista = VISTAS[nombre] || VISTAS.calcular;
  const principal = $('#principal');
  // Un contenedor nuevo en cada cambio de pantalla, así no se mezclan los eventos
  const cont = document.createElement('div');
  cont.className = 'vista';
  principal.replaceChildren(cont);
  vista(cont);
  window.scrollTo(0, 0);
  $$('.menu a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + nombre));
}

function iniciar() {
  window.addEventListener('hashchange', mostrar);
  mostrar();
}

if (estaDesbloqueado()) iniciar();
else pedirPin(iniciar);
vigilarInactividad(() => pedirPin(() => {}));

// --- Funcionamiento sin cobertura (service worker) ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
          const barra = $('#actualizar');
          barra.hidden = false;
          barra.onclick = () => nuevo.postMessage('actualizar');
        }
      });
    });
  });
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  });
}
