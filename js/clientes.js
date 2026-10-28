// Pantallas de clientes: lista, ficha, formulario y selector rápido.
import { clientes, cliente, guardarCliente, borrarCliente, presupuestosDe, ESTADOS, fecha } from './datos.js';
import { esc, euros, aviso, confirmar, $ } from './ui.js';
import { empezarPresupuestoPara } from './calculadora.js';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function coincide(c, texto) {
  const t = normalizar(texto);
  return !t || [c.nombre, c.telefono, c.direccion, c.catastro].some((v) => normalizar(v).includes(t));
}

// Enlaces para llamar, WhatsApp y mapa
export const enlaceTel = (tel) => 'tel:' + String(tel).replace(/[^\d+]/g, '');
export function enlaceWhatsApp(tel, texto = '') {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.startsWith('00')) n = n.slice(2);
  if (n.length === 9) n = '34' + n; // número español sin prefijo
  return `https://wa.me/${n}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}
export function enlaceMapa(c) {
  if (c.maps) return c.maps;
  if (c.direccion) return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(c.direccion);
  return '';
}

export const htmlEstado = (estado) => {
  const e = ESTADOS.find((x) => x.id === estado) || ESTADOS[0];
  return `<span class="estado estado-${e.id}">${e.icono} ${e.nombre}</span>`;
};

// --- Lista ---
export function vistaClientes(cont) {
  let busqueda = '';
  cont.innerHTML = `
    <h2 class="titulo-vista">Clientes</h2>
    <a class="btn btn-primario btn-ancho" href="#cliente-editar/nuevo">＋ Nuevo cliente</a>
    <input type="search" class="buscador" placeholder="🔍 Buscar por nombre, teléfono o dirección" aria-label="Buscar cliente">
    <div id="lista"></div>`;

  const pintar = () => {
    const lista = clientes().filter((c) => coincide(c, busqueda));
    $('#lista', cont).innerHTML = lista.length
      ? lista.map((c) => `<a class="tarjeta fila-lista" href="#cliente/${c.id}">
          <span class="fila-lista-texto"><b>${esc(c.nombre)}</b>
            <small>${esc(c.telefono || 'Sin teléfono')}${c.direccion ? ' · ' + esc(c.direccion) : ''}</small></span>
          <span class="flecha">›</span></a>`).join('')
      : `<p class="nota vacio">${clientes().length ? 'No hay clientes con esa búsqueda.' : 'Todavía no hay clientes. Pulsa «Nuevo cliente» para añadir el primero.'}</p>`;
  };
  $('.buscador', cont).addEventListener('input', (e) => { busqueda = e.target.value; pintar(); });
  pintar();
}

// --- Ficha ---
export function vistaCliente(cont, id) {
  const c = cliente(id);
  if (!c) { location.hash = '#clientes'; return; }
  const pres = presupuestosDe(id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const mapa = enlaceMapa(c);

  cont.innerHTML = `
    <a class="volver" href="#clientes">‹ Clientes</a>
    <h2 class="titulo-vista">${esc(c.nombre)}</h2>

    <div class="botones-accion">
      ${c.telefono ? `<a class="btn btn-primario" href="${enlaceTel(c.telefono)}">📞 Llamar</a>
        <a class="btn btn-whatsapp" href="${enlaceWhatsApp(c.telefono)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
      ${mapa ? `<a class="btn btn-secundario" href="${esc(mapa)}" target="_blank" rel="noopener">🗺️ Ver en el mapa</a>` : ''}
    </div>

    <section class="tarjeta datos">
      ${dato('Teléfono', c.telefono)}
      ${dato('Dirección', c.direccion)}
      ${dato('Referencia catastral', c.catastro)}
      ${dato('Notas', c.notas)}
      <a class="btn btn-secundario btn-ancho" href="#cliente-editar/${c.id}">✏️ Editar datos</a>
    </section>

    <button class="btn btn-anadir btn-ancho" data-accion="presupuesto">＋ Nuevo presupuesto para ${esc(c.nombre)}</button>

    <h3 class="titulo-bloque">Presupuestos (${pres.length})</h3>
    ${pres.length ? pres.map(htmlFilaPresupuesto).join('') : '<p class="nota">Este cliente aún no tiene presupuestos.</p>'}

    <button class="btn btn-peligro btn-ancho separado" data-accion="borrar">🗑️ Borrar cliente</button>`;

  cont.addEventListener('click', async (e) => {
    const acc = e.target.closest('[data-accion]')?.dataset.accion;
    if (acc === 'presupuesto') {
      if (await empezarPresupuestoPara(c.id)) location.hash = '#calcular';
    } else if (acc === 'borrar') {
      const aviso2 = pres.length ? ` Tiene ${pres.length} presupuesto(s): se conservarán con su nombre.` : '';
      if (!(await confirmar(`¿Borrar a ${c.nombre}?${aviso2}`, { si: 'Borrar', peligro: true }))) return;
      borrarCliente(c.id);
      aviso('Cliente borrado');
      location.hash = '#clientes';
    }
  });
}

const dato = (etq, valor) => valor ? `<div class="dato"><span>${etq}</span><p>${esc(valor)}</p></div>` : '';

export function htmlFilaPresupuesto(p) {
  return `<a class="tarjeta fila-lista" href="#presupuesto/${p.id}">
    <span class="fila-lista-texto"><b>${esc(p.numero)} · ${esc(p.clienteDatos?.nombre || 'Sin cliente')}</b>
      <small>${fecha(p.fecha)} · ${htmlEstado(p.estado)}</small></span>
    <span class="fila-lista-importe">${euros(p.totales?.total)}</span></a>`;
}

// --- Formulario ---
export function vistaEditarCliente(cont, id) {
  const nuevo = id === 'nuevo';
  const c = nuevo ? { nombre: '', telefono: '', direccion: '', catastro: '', maps: '', notas: '' } : cliente(id);
  if (!c) { location.hash = '#clientes'; return; }

  cont.innerHTML = `
    <a class="volver" href="${nuevo ? '#clientes' : '#cliente/' + c.id}">‹ Volver</a>
    <h2 class="titulo-vista">${nuevo ? 'Nuevo cliente' : 'Editar cliente'}</h2>
    <form class="tarjeta" id="form-cliente" novalidate>
      ${camposCliente(c)}
      <button class="btn btn-primario btn-ancho" type="submit">💾 Guardar cliente</button>
    </form>`;

  activarUbicacion(cont);
  $('#form-cliente', cont).addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = leerCampos(cont);
    if (!datos.nombre) return aviso('Escribe el nombre del cliente', 'error');
    const guardado = guardarCliente({ ...c, ...datos });
    aviso('Cliente guardado ✓');
    location.hash = '#cliente/' + guardado.id;
  });
}

function camposCliente(c, completo = true) {
  const campo = (id, etq, valor, tipo = 'text', extra = '') => `<label class="campo">
      <span class="campo-etiqueta">${etq}</span>
      <input type="${tipo}" name="${id}" value="${esc(valor)}" ${extra}></label>`;
  return `
    ${campo('nombre', 'Nombre *', c.nombre, 'text', 'autocomplete="off" required')}
    ${campo('telefono', 'Teléfono', c.telefono, 'tel', 'autocomplete="off"')}
    ${campo('direccion', 'Dirección de la finca', c.direccion, 'text', 'autocomplete="off"')}
    ${completo ? `
    ${campo('catastro', 'Referencia catastral', c.catastro, 'text', 'autocomplete="off" autocapitalize="characters"')}
    <label class="campo"><span class="campo-etiqueta">Enlace de Google Maps</span>
      <input type="url" name="maps" value="${esc(c.maps)}" placeholder="Pega aquí el enlace" autocomplete="off"></label>
    <button type="button" class="btn btn-secundario btn-ancho" data-ubicacion>📍 Estoy en la finca: usar mi ubicación</button>
    <label class="campo"><span class="campo-etiqueta">Notas</span>
      <textarea name="notas" rows="3">${esc(c.notas)}</textarea></label>` : ''}`;
}

function leerCampos(raiz) {
  const datos = {};
  raiz.querySelectorAll('input[name], textarea[name]').forEach((el) => (datos[el.name] = el.value.trim()));
  return datos;
}

function activarUbicacion(raiz) {
  raiz.querySelector('[data-ubicacion]')?.addEventListener('click', (e) => {
    if (!navigator.geolocation) return aviso('Este móvil no permite usar la ubicación', 'error');
    const b = e.currentTarget;
    b.textContent = '⏳ Buscando ubicación…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: la, longitude: lo } = pos.coords;
        raiz.querySelector('[name="maps"]').value = `https://www.google.com/maps?q=${la.toFixed(6)},${lo.toFixed(6)}`;
        b.textContent = '✅ Ubicación puesta';
      },
      () => {
        b.textContent = '📍 Estoy en la finca: usar mi ubicación';
        aviso('No se pudo obtener la ubicación. Revisa que esté activada.', 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });
}

// --- Selector rápido (ventana) para elegir cliente desde la calculadora ---
export function elegirCliente() {
  return new Promise((resolver) => {
    const fondo = document.createElement('div');
    fondo.className = 'modal-fondo';
    fondo.innerHTML = `<div class="modal modal-alto" role="dialog" aria-modal="true">
        <div class="modal-cabecera"><h3>Elegir cliente</h3><button class="btn-icono" data-cerrar aria-label="Cerrar">✕</button></div>
        <div data-paso="lista">
          <button class="btn btn-anadir btn-ancho" data-nuevo>＋ Cliente nuevo</button>
          <input type="search" class="buscador" placeholder="🔍 Buscar" aria-label="Buscar cliente">
          <div class="modal-lista"></div>
        </div>
        <form data-paso="nuevo" hidden novalidate>
          ${camposCliente({ nombre: '', telefono: '', direccion: '' }, false)}
          <p class="nota">El resto de datos (catastro, mapa, notas) los puedes añadir luego en Clientes.</p>
          <button class="btn btn-primario btn-ancho" type="submit">💾 Guardar y elegir</button>
        </form>
      </div>`;
    document.body.appendChild(fondo);
    const cerrar = (id) => { fondo.remove(); resolver(id); };
    const lista = $('.modal-lista', fondo);
    const pintar = (txt = '') => {
      const l = clientes().filter((c) => coincide(c, txt));
      lista.innerHTML = l.length
        ? l.map((c) => `<button class="fila-lista fila-boton" data-id="${c.id}"><span class="fila-lista-texto"><b>${esc(c.nombre)}</b><small>${esc(c.telefono || '')} ${esc(c.direccion || '')}</small></span></button>`).join('')
        : '<p class="nota">No hay clientes. Crea uno nuevo.</p>';
    };
    pintar();
    $('.buscador', fondo).addEventListener('input', (e) => pintar(e.target.value));
    fondo.addEventListener('click', (e) => {
      if (e.target === fondo || e.target.closest('[data-cerrar]')) return cerrar(null);
      const id = e.target.closest('[data-id]')?.dataset.id;
      if (id) return cerrar(id);
      if (e.target.closest('[data-nuevo]')) {
        $('[data-paso="lista"]', fondo).hidden = true;
        $('[data-paso="nuevo"]', fondo).hidden = false;
        $('[name="nombre"]', fondo).focus();
      }
    });
    $('form', fondo).addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = leerCampos(fondo);
      if (!datos.nombre) return aviso('Escribe el nombre del cliente', 'error');
      const c = guardarCliente({ ...datos, catastro: '', maps: '', notas: '' });
      aviso('Cliente guardado ✓');
      cerrar(c.id);
    });
  });
}
