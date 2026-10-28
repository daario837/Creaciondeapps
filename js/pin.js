// Pantalla de bloqueo con PIN de 4 cifras.
import { ajustes } from './store.js';
import { $ } from './ui.js';

const CLAVE_SESION = 'dlz_desbloqueado';
const MINUTOS_BLOQUEO = 5; // si la app pasa este tiempo en segundo plano, vuelve a pedir el PIN

export function estaDesbloqueado() {
  return sessionStorage.getItem(CLAVE_SESION) === '1';
}

export function pedirPin(alDesbloquear) {
  const pantalla = $('#pantalla-pin');
  pantalla.hidden = false;
  document.body.classList.add('bloqueado');
  let tecleado = '';

  const esInicial = ajustes().pin === '1234';
  pantalla.innerHTML = `
    <div class="pin-caja">
      <img src="icons/icon-192.png" alt="" class="pin-logo">
      <h1>Desbroce<br>Los Zagales</h1>
      <p class="pin-texto">Escribe el PIN</p>
      <div class="pin-puntos">${'<span></span>'.repeat(4)}</div>
      <div class="pin-teclado">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}
        <span></span><button data-n="0">0</button><button data-borrar aria-label="Borrar">⌫</button>
      </div>
      ${esInicial ? '<p class="pin-ayuda">PIN inicial: <b>1234</b>. Cámbialo en Ajustes.</p>' : ''}
    </div>`;

  const puntos = [...pantalla.querySelectorAll('.pin-puntos span')];
  const pintar = () => puntos.forEach((p, i) => p.classList.toggle('lleno', i < tecleado.length));

  const teclear = (n) => {
    if (tecleado.length >= 4) return;
    tecleado += n;
    pintar();
    if (tecleado.length === 4) {
      setTimeout(() => {
        if (tecleado === ajustes().pin) {
          sessionStorage.setItem(CLAVE_SESION, '1');
          pantalla.hidden = true;
          pantalla.innerHTML = '';
          document.body.classList.remove('bloqueado');
          document.removeEventListener('keydown', teclado);
          alDesbloquear();
        } else {
          const caja = pantalla.querySelector('.pin-caja');
          caja.classList.add('error');
          pantalla.querySelector('.pin-texto').textContent = 'PIN incorrecto. Prueba otra vez';
          if (navigator.vibrate) navigator.vibrate(200);
          setTimeout(() => caja.classList.remove('error'), 500);
          tecleado = '';
          pintar();
        }
      }, 150);
    }
  };

  pantalla.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.borrar !== undefined) {
      tecleado = tecleado.slice(0, -1);
      pintar();
    } else teclear(b.dataset.n);
  };
  const teclado = (e) => {
    if (/^\d$/.test(e.key)) teclear(e.key);
    if (e.key === 'Backspace') { tecleado = tecleado.slice(0, -1); pintar(); }
  };
  document.addEventListener('keydown', teclado);
}

// Vuelve a bloquear si la app ha estado un rato en segundo plano
export function vigilarInactividad(alBloquear) {
  let oculto = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) oculto = Date.now();
    else if (oculto && Date.now() - oculto > MINUTOS_BLOQUEO * 60000 && estaDesbloqueado()) {
      sessionStorage.removeItem(CLAVE_SESION);
      alBloquear();
    }
  });
}
