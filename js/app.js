// Arranque de la app: PIN, menú inferior y cambio entre pantallas.
import { estaDesbloqueado, pedirPin, vigilarInactividad } from './pin.js';
import { vistaCalculadora } from './calculadora.js';
import { vistaAjustes } from './ajustes.js';
import { vistaClientes, vistaCliente, vistaEditarCliente } from './clientes.js';
import { vistaPresupuestos, vistaPresupuesto } from './presupuestos.js';
import { $, $$ } from './ui.js';

// Cada dirección (#nombre/parámetro) muestra una pantalla. "menu" indica qué botón de abajo se ilumina.
const VISTAS = {
  calcular: [vistaCalculadora, 'calcular'],
  presupuestos: [vistaPresupuestos, 'presupuestos'],
  presupuesto: [vistaPresupuesto, 'presupuestos'],
  clientes: [vistaClientes, 'clientes'],
  cliente: [vistaCliente, 'clientes'],
  'cliente-editar': [vistaEditarCliente, 'clientes'],
  ajustes: [vistaAjustes, 'ajustes'],
};

function mostrar() {
  const [nombre, param] = decodeURIComponent(location.hash.slice(1)).split('/');
  const [vista, menu] = VISTAS[nombre] || VISTAS.calcular;
  const principal = $('#principal');
  // Un contenedor nuevo en cada cambio de pantalla, así no se mezclan los eventos
  const cont = document.createElement('div');
  cont.className = 'vista';
  principal.replaceChildren(cont);
  vista(cont, param);
  window.scrollTo(0, 0);
  $$('.menu a').forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === '#' + menu));
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
