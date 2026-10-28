// Pantallas de presupuestos: lista con filtros y ficha de cada presupuesto.
import { presupuestos, presupuesto, cliente, cambiarEstado, borrarPresupuesto, venceEl, fecha, ESTADOS } from './datos.js';
import { calcular } from './calc.js';
import { htmlDesglose } from './desglose.js';
import { htmlFilaPresupuesto, htmlEstado, enlaceTel, enlaceMapa } from './clientes.js';
import { abrirEnCalculadora } from './calculadora.js';
import { esc, euros, aviso, confirmar, $, $$ } from './ui.js';

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let filtroGuardado = 'todos';

export function vistaPresupuestos(cont) {
  let filtro = filtroGuardado;
  let busqueda = '';
  const todos = presupuestos().sort((a, b) => b.fecha.localeCompare(a.fecha));
  const cuenta = (id) => todos.filter((p) => id === 'todos' || p.estado === id).length;

  cont.innerHTML = `
    <h2 class="titulo-vista">Presupuestos</h2>
    <a class="btn btn-primario btn-ancho" href="#calcular">＋ Nuevo presupuesto</a>
    <div class="filtros">
      <button data-filtro="todos">Todos <b>${cuenta('todos')}</b></button>
      ${ESTADOS.map((e) => `<button data-filtro="${e.id}">${e.icono} ${e.nombre} <b>${cuenta(e.id)}</b></button>`).join('')}
    </div>
    <input type="search" class="buscador" placeholder="🔍 Buscar por cliente o número" aria-label="Buscar presupuesto">
    <div id="lista"></div>`;

  const pintar = () => {
    $$('[data-filtro]', cont).forEach((b) => b.classList.toggle('activo', b.dataset.filtro === filtro));
    const q = normalizar(busqueda);
    const lista = todos.filter((p) =>
      (filtro === 'todos' || p.estado === filtro) &&
      (!q || normalizar(p.numero).includes(q) || normalizar(p.clienteDatos?.nombre).includes(q)));
    const suma = lista.reduce((s, p) => s + (p.totales?.total || 0), 0);
    $('#lista', cont).innerHTML = lista.length
      ? `<p class="nota">${lista.length} presupuesto(s) · ${euros(suma)}</p>${lista.map(htmlFilaPresupuesto).join('')}`
      : `<p class="nota vacio">${todos.length ? 'No hay presupuestos aquí.' : 'Todavía no hay presupuestos. Haz uno en «Calcular» y pulsa «Guardar presupuesto».'}</p>`;
  };

  cont.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filtro]')?.dataset.filtro;
    if (f) { filtro = filtroGuardado = f; pintar(); }
  });
  $('.buscador', cont).addEventListener('input', (e) => { busqueda = e.target.value; pintar(); });
  pintar();
}

export function vistaPresupuesto(cont, id) {
  const p = presupuesto(id);
  if (!p) { location.hash = '#presupuestos'; return; }
  const c = cliente(p.clienteId);
  const datosCliente = c || p.clienteDatos || {};
  const r = calcular(p.trabajo, p.precios);
  const vence = venceEl(p);
  const caducado = p.estado === 'pendiente' && vence < new Date();

  cont.innerHTML = `
    <a class="volver" href="#presupuestos">‹ Presupuestos</a>
    <div class="cabecera-presupuesto">
      <h2 class="titulo-vista">${esc(p.numero)}</h2>
      ${htmlEstado(p.estado)}
    </div>
    <p class="nota">Hecho el ${fecha(p.fecha)} · válido hasta el ${fecha(vence.toISOString())}</p>
    ${caducado ? '<div class="aviso-fijo alerta">⚠️ Este presupuesto ya ha caducado. Puedes modificarlo para darle una fecha nueva o copiarlo.</div>' : ''}

    <section class="tarjeta">
      <h3>👤 Cliente</h3>
      ${c ? `<a class="fila-lista fila-simple" href="#cliente/${c.id}"><span class="fila-lista-texto"><b>${esc(c.nombre)}</b>
          <small>${esc(c.telefono || '')} ${esc(c.direccion || '')}</small></span><span class="flecha">›</span></a>`
        : `<p><b>${esc(datosCliente.nombre || 'Cliente borrado')}</b></p>`}
      <div class="botones-accion">
        ${datosCliente.telefono ? `<a class="btn btn-secundario" href="${enlaceTel(datosCliente.telefono)}">📞 Llamar</a>` : ''}
        ${c && enlaceMapa(c) ? `<a class="btn btn-secundario" href="${esc(enlaceMapa(c))}" target="_blank" rel="noopener">🗺️ Mapa</a>` : ''}
      </div>
    </section>

    <section class="tarjeta">
      <h3>Estado</h3>
      <div class="opciones opciones-3 estados">
        ${ESTADOS.map((e) => `<button class="opcion-boton ${p.estado === e.id ? 'activo estado-' + e.id : ''}" data-estado="${e.id}">${e.icono}<br>${e.nombre}</button>`).join('')}
      </div>
      ${p.fechaEstado && p.estado !== 'pendiente' ? `<p class="nota">Marcado como ${p.estado} el ${fecha(p.fechaEstado)}</p>` : ''}
    </section>

    <section class="tarjeta desglose">
      <h3>🧾 Desglose</h3>
      ${htmlDesglose(p.trabajo, r)}
    </section>

    <section class="tarjeta datos">
      <h3>📋 Condiciones</h3>
      <div class="dato"><span>Validez</span><p>${p.validezDias} días</p></div>
      ${p.formaPago ? `<div class="dato"><span>Forma de pago</span><p>${esc(p.formaPago)}</p></div>` : ''}
      ${p.notas ? `<div class="dato"><span>Observaciones</span><p>${esc(p.notas)}</p></div>` : ''}
    </section>

    <div class="fila-botones">
      <button class="btn btn-secundario" data-accion="editar">✏️ Modificar</button>
      <button class="btn btn-secundario" data-accion="copiar">📄 Copiar</button>
    </div>
    <p class="nota">El PDF, la firma del cliente y el envío por WhatsApp llegan en la fase 3.</p>
    <button class="btn btn-peligro btn-ancho separado" data-accion="borrar">🗑️ Borrar presupuesto</button>`;

  cont.addEventListener('click', async (e) => {
    const estado = e.target.closest('[data-estado]')?.dataset.estado;
    if (estado) {
      if (estado === p.estado) return;
      cambiarEstado(p.id, estado);
      aviso('Estado: ' + ESTADOS.find((x) => x.id === estado).nombre);
      return vistaPresupuesto(limpiar(cont), id);
    }
    const acc = e.target.closest('[data-accion]')?.dataset.accion;
    if (acc === 'editar') {
      if (await abrirEnCalculadora(p)) location.hash = '#calcular';
    } else if (acc === 'copiar') {
      if (await abrirEnCalculadora(p, true)) {
        aviso('Copia lista para modificar y guardar');
        location.hash = '#calcular';
      }
    } else if (acc === 'borrar') {
      if (!(await confirmar(`¿Borrar el presupuesto ${p.numero}? No se puede deshacer.`, { si: 'Borrar', peligro: true }))) return;
      borrarPresupuesto(p.id);
      aviso('Presupuesto borrado');
      location.hash = '#presupuestos';
    }
  });
}

// Sustituye el contenedor por uno nuevo (para volver a pintar sin duplicar eventos)
function limpiar(cont) {
  const nuevo = cont.cloneNode(false);
  cont.replaceWith(nuevo);
  return nuevo;
}
