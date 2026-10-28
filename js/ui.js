// Pequeñas utilidades de pantalla compartidas por todas las secciones.

const fmtEuro = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: true });
const fmtNum = (dec) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: dec, useGrouping: true });

export const euros = (n) => fmtEuro.format(n || 0);
export const numero = (n, dec = 2) => fmtNum(dec).format(n || 0);
export const horas = (h) => numero(h, 1) + ' h';

// Evita que un texto escrito por el usuario rompa la página
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

let temporizadorAviso;
export function aviso(texto, tipo = 'ok') {
  const el = $('#aviso');
  el.textContent = texto;
  el.className = 'aviso visible ' + tipo;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (el.className = 'aviso'), 2200);
}

// Ventana de confirmación grande (más fácil de pulsar que la del navegador)
export function confirmar(texto, { si = 'Sí', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <p class="modal-texto">${esc(texto)}</p>
        <div class="modal-botones">
          <button class="btn btn-secundario" data-r="no">${esc(no)}</button>
          <button class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-r="si">${esc(si)}</button>
        </div>
      </div>`;
    fondo.addEventListener('click', (e) => {
      const r = e.target.closest('[data-r]')?.dataset.r;
      if (r || e.target === fondo) {
        fondo.remove();
        resolver(r === 'si');
      }
    });
    document.body.appendChild(fondo);
  });
}

// Lee y escribe valores dentro de un objeto usando rutas tipo "maquinas.mano.precioHora"
export function leerRuta(obj, ruta) {
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function escribirRuta(obj, ruta, valor) {
  const partes = ruta.split('.');
  const ultima = partes.pop();
  const destino = partes.reduce((o, k) => (o[k] ??= {}), obj);
  destino[ultima] = valor;
}

// Muestra un número con coma decimal para editarlo
export const paraEditar = (n) => (n === '' || n == null ? '' : String(n).replace('.', ','));
