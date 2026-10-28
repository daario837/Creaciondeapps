// Pantalla "Calcular": zonas de desbroce, poda, fumigación, restos y total.
import { ajustes, leer, escribir, MAQUINAS, MALEZAS, FACTORES, TAMANOS_ARBOL } from './store.js';
import { calcular, trabajoVacio, zonaVacia, num } from './calc.js';
import { esc, euros, numero, horas, $, confirmar, escribirRuta, leerRuta, aviso, paraEditar } from './ui.js';
import { htmlDesglose } from './desglose.js';
import { cliente, presupuesto, guardarPresupuesto, copiaPrecios, nuevoId } from './datos.js';
import { elegirCliente } from './clientes.js';

const x = (n) => '×' + numero(n, 2);

const FORMAS_PAGO = [
  'Transferencia bancaria al terminar el trabajo',
  'Efectivo al terminar el trabajo',
  'Bizum al terminar el trabajo',
  '50 % al aceptar y 50 % al terminar',
];

// El "borrador" es el presupuesto que se está preparando ahora mismo en la calculadora.
// Se guarda solo, así no se pierde si se cierra la app.
function borradorNuevo(clienteId = null) {
  const a = ajustes();
  return {
    trabajo: trabajoVacio(a),
    clienteId,
    validezDias: a.presupuestos.validezDias,
    formaPago: a.presupuestos.formaPago,
    notas: '',
    editando: null, // id del presupuesto si se está modificando uno ya guardado
    precios: null, // precios propios del presupuesto que se edita
  };
}

function cargarBorrador() {
  const b = leer('borrador');
  if (!b) return borradorNuevo();
  if (b.zonas) return { ...borradorNuevo(), trabajo: b }; // formato de la versión 1
  return b;
}

function tieneDatos(b) {
  const t = b.trabajo;
  return !!(b.editando || t.zonas.some((z) => num(z.superficie) > 0) || t.poda.length || t.fumigacion.length);
}

// Desde la ficha de un cliente: prepara un presupuesto para él
export async function empezarPresupuestoPara(clienteId) {
  const b = cargarBorrador();
  if (b.editando) {
    const p = presupuesto(b.editando);
    if (!(await confirmar(`Estás modificando el presupuesto ${p?.numero ?? ''} sin guardar. ¿Descartar esos cambios?`, { si: 'Descartar', peligro: true }))) return false;
    escribir('borrador', borradorNuevo(clienteId));
  } else {
    b.clienteId = clienteId;
    escribir('borrador', b);
  }
  return true;
}

// Abre un presupuesto guardado en la calculadora para modificarlo o copiarlo
export async function abrirEnCalculadora(p, copia = false) {
  const b = cargarBorrador();
  if (tieneDatos(b) && b.editando !== p.id) {
    if (!(await confirmar('En la calculadora hay un cálculo sin guardar. ¿Sustituirlo?', { si: 'Sustituir', peligro: true }))) return false;
  }
  const trabajo = JSON.parse(JSON.stringify(p.trabajo));
  if (copia) [...trabajo.zonas, ...trabajo.poda, ...trabajo.fumigacion].forEach((z) => (z.id = nuevoId()));
  escribir('borrador', {
    trabajo,
    clienteId: p.clienteId,
    validezDias: p.validezDias,
    formaPago: p.formaPago,
    notas: p.notas || '',
    editando: copia ? null : p.id,
    precios: copia ? null : p.precios,
  });
  return true;
}

export function vistaCalculadora(cont) {
  let b = cargarBorrador();
  let t = b.trabajo;
  let a = b.precios || ajustes();

  const guardar = () => { b.trabajo = t; escribir('borrador', b); };

  function opcion(nombre, campo, valor, actual, texto, extra = '', rerender = false) {
    return `<label class="opcion">
      <input type="radio" name="${nombre}" value="${valor}" data-campo="${campo}" ${valor === actual ? 'checked' : ''} ${rerender ? 'data-rerender' : ''}>
      <span>${texto}${extra ? `<small>${extra}</small>` : ''}</span></label>`;
  }

  function campoNumero(campo, valor, etiqueta, unidad, ayuda = '') {
    return `<label class="campo">
      <span class="campo-etiqueta">${etiqueta}</span>
      <span class="con-unidad">
        <input type="text" inputmode="decimal" autocomplete="off" data-campo="${campo}" value="${esc(valor)}" placeholder="0">
        <span class="unidad">${unidad}</span>
      </span>
      ${ayuda ? `<span class="campo-ayuda">${ayuda}</span>` : ''}
    </label>`;
  }

  function htmlZona(z, i) {
    const n = 'z' + z.id;
    return `<section class="tarjeta zona">
      <div class="tarjeta-cabecera">
        <input class="input-titulo" data-campo="zonas.${i}.nombre" value="${esc(z.nombre)}" aria-label="Nombre de la zona">
        ${t.zonas.length > 1 ? `<button class="btn-icono" data-accion="quitar" data-lista="zonas" data-i="${i}" aria-label="Quitar zona">🗑️</button>` : ''}
      </div>
      ${campoNumero(`zonas.${i}.superficie`, z.superficie, 'Superficie', 'm²')}
      <fieldset><legend>Máquina</legend>
        <div class="opciones opciones-2 maquinas">
          ${MAQUINAS.map((m) => opcion(n + 'm', `zonas.${i}.maquina`, m.id, z.maquina, `<b class="emoji">${m.icono}</b>${m.nombre}`, numero(a.maquinas[m.id].precioHora) + ' €/h')).join('')}
        </div></fieldset>
      <fieldset><legend>Tipo de maleza</legend>
        <div class="opciones opciones-3">
          ${MALEZAS.map((m) => opcion(n + 'b', `zonas.${i}.maleza`, m.id, z.maleza, m.nombre)).join('')}
        </div></fieldset>
      ${FACTORES.map((f) => `<fieldset><legend>${f.nombre}</legend>
        <div class="opciones opciones-3">
          ${f.niveles.map(([id, txt]) => opcion(n + f.id, `zonas.${i}.${f.id}`, id, z[f.id], txt, x(a.factores[f.id][id]))).join('')}
        </div></fieldset>`).join('')}
      <div class="resultado-linea" id="res-${z.id}"></div>
    </section>`;
  }

  function htmlPoda(p, i) {
    return `<section class="tarjeta">
      <div class="tarjeta-cabecera"><h3>🌳 Poda ${t.poda.length > 1 ? i + 1 : ''}</h3>
        <button class="btn-icono" data-accion="quitar" data-lista="poda" data-i="${i}" aria-label="Quitar poda">🗑️</button></div>
      ${campoNumero(`poda.${i}.arboles`, p.arboles, 'Número de árboles', 'árboles')}
      <fieldset><legend>Tamaño</legend><div class="opciones opciones-3">
        ${TAMANOS_ARBOL.map((s) => opcion('p' + p.id, `poda.${i}.tamano`, s.id, p.tamano, s.nombre, euros(a.poda[s.id]))).join('')}
      </div></fieldset>
      <label class="interruptor"><input type="checkbox" data-campo="poda.${i}.plataforma" ${p.plataforma ? 'checked' : ''}>
        <span>Necesita plataforma elevadora <small>+${euros(a.poda.plataforma)} por árbol</small></span></label>
      <div class="resultado-linea" id="res-${p.id}"></div>
    </section>`;
  }

  function htmlFumigacion(f, i) {
    const porArbol = f.modo === 'arbol';
    return `<section class="tarjeta">
      <div class="tarjeta-cabecera"><h3>💧 Fumigación ${t.fumigacion.length > 1 ? i + 1 : ''}</h3>
        <button class="btn-icono" data-accion="quitar" data-lista="fumigacion" data-i="${i}" aria-label="Quitar fumigación">🗑️</button></div>
      <fieldset><legend>Cobrar</legend><div class="opciones opciones-2">
        ${opcion('f' + f.id, `fumigacion.${i}.modo`, 'm2', f.modo, 'Por m²', euros(a.fumigacion.m2) + '/m²', true)}
        ${opcion('f' + f.id, `fumigacion.${i}.modo`, 'arbol', f.modo, 'Por árbol', euros(a.fumigacion.arbol) + '/árbol', true)}
      </div></fieldset>
      ${porArbol
        ? campoNumero(`fumigacion.${i}.cantidad`, f.cantidad, 'Número de árboles', 'árboles')
        : campoNumero(`fumigacion.${i}.cantidad`, f.cantidad, 'Superficie a fumigar', 'm²')}
      ${campoNumero(`fumigacion.${i}.producto`, f.producto, 'Coste del producto', '€', 'Lo que cuesta el producto que vas a usar')}
      <div class="resultado-linea" id="res-${f.id}"></div>
    </section>`;
  }

  function htmlExtras() {
    const d = a.desplazamiento;
    return `<section class="tarjeta">
      <h3>➕ Extras</h3>
      <label class="interruptor"><input type="checkbox" data-campo="restos.activo" data-rerender ${t.restos.activo ? 'checked' : ''}>
        <span>Retirada de restos</span></label>
      ${t.restos.activo ? `<div class="sub-bloque">
        <div class="opciones opciones-2">
          ${opcion('restos', 'restos.modo', 'fijo', t.restos.modo, 'Precio fijo', euros(a.restos.fijo), true)}
          ${opcion('restos', 'restos.modo', 'm3', t.restos.modo, 'Por m³', euros(a.restos.m3) + '/m³', true)}
        </div>
        ${t.restos.modo === 'm3' ? campoNumero('restos.m3', t.restos.m3, 'Volumen de restos', 'm³') : ''}
      </div>` : ''}
      <label class="interruptor"><input type="checkbox" data-campo="desplazamiento.activo" data-rerender ${t.desplazamiento.activo ? 'checked' : ''}>
        <span>Cobrar desplazamiento</span></label>
      ${t.desplazamiento.activo ? `<div class="sub-bloque">
        ${d.modo === 'km'
          ? campoNumero('desplazamiento.km', t.desplazamiento.km, 'Distancia hasta la finca (solo ida)', 'km',
              `${euros(d.precioKm)}/km${d.idaVuelta ? ', se cobra ida y vuelta' : ''}`)
          : `<p class="nota">Precio fijo de desplazamiento: <b>${euros(d.fijo)}</b></p>`}
      </div>` : ''}
      <label class="interruptor"><input type="checkbox" data-campo="irpf" ${t.irpf ? 'checked' : ''}>
        <span>Aplicar retención de IRPF <small>${numero(a.irpf)} % (si el cliente es empresa o autónomo)</small></span></label>
    </section>`;
  }

  function htmlCliente() {
    const c = b.clienteId ? cliente(b.clienteId) : null;
    return `<section class="tarjeta tarjeta-cliente" id="tarjeta-cliente">
      ${c
        ? `<div class="cliente-elegido"><span class="cliente-icono">👤</span>
            <span class="fila-lista-texto"><b>${esc(c.nombre)}</b><small>${esc(c.telefono || '')} ${esc(c.direccion || '')}</small></span>
            <button class="btn btn-secundario btn-pequeno" data-accion="elegir-cliente">Cambiar</button></div>`
        : `<button class="btn btn-secundario btn-ancho" data-accion="elegir-cliente">👤 Elegir cliente</button>
           <p class="nota">Puedes calcular sin cliente, pero hace falta para guardar el presupuesto.</p>`}
    </section>`;
  }

  function htmlCondiciones() {
    return `<section class="tarjeta">
      <h3>📋 Condiciones</h3>
      ${campoDoc('validezDias', 'Validez del presupuesto', 'días', 'numeric')}
      <label class="campo"><span class="campo-etiqueta">Forma de pago</span>
        <textarea data-doc="formaPago" rows="2">${esc(b.formaPago)}</textarea></label>
      <div class="chips">
        ${FORMAS_PAGO.map((f) => `<button class="chip" data-accion="forma-pago" data-texto="${esc(f)}">${esc(f)}</button>`).join('')}
      </div>
      <label class="campo"><span class="campo-etiqueta">Observaciones (salen en el presupuesto)</span>
        <textarea data-doc="notas" rows="3" placeholder="Ej.: el cliente retira la leña">${esc(b.notas)}</textarea></label>
    </section>`;
  }

  function campoDoc(campo, etiqueta, unidad, modo = 'decimal') {
    return `<label class="campo"><span class="campo-etiqueta">${etiqueta}</span>
      <span class="con-unidad"><input type="text" inputmode="${modo}" autocomplete="off" data-doc="${campo}" value="${esc(paraEditar(b[campo]))}"><span class="unidad">${unidad}</span></span></label>`;
  }

  function render() {
    const editado = b.editando ? presupuesto(b.editando) : null;
    cont.innerHTML = `
      <h2 class="titulo-vista">${editado ? 'Modificar presupuesto ' + esc(editado.numero) : 'Calcular presupuesto'}</h2>
      ${editado ? `<div class="aviso-fijo">✏️ Estás modificando un presupuesto guardado. Usa los precios que tenía cuando se hizo.
        <button class="btn btn-secundario btn-pequeno" data-accion="precios-actuales">Poner precios actuales</button></div>` : ''}
      ${htmlCliente()}
      <h3 class="titulo-bloque">🌿 Desbroce</h3>
      ${t.zonas.map(htmlZona).join('')}
      <button class="btn btn-anadir" data-accion="anadir-zona">＋ Añadir otra zona</button>

      <h3 class="titulo-bloque">Otros trabajos</h3>
      ${t.poda.map(htmlPoda).join('')}
      ${t.fumigacion.map(htmlFumigacion).join('')}
      <div class="fila-botones">
        <button class="btn btn-anadir" data-accion="anadir-poda">＋ Poda</button>
        <button class="btn btn-anadir" data-accion="anadir-fumigacion">＋ Fumigación</button>
      </div>

      ${htmlExtras()}

      <section class="tarjeta desglose" id="desglose">
        <h3>🧾 Desglose</h3>
        <div id="tabla-desglose"></div>
      </section>

      ${htmlCondiciones()}

      <button class="btn btn-primario btn-ancho btn-grande" data-accion="guardar">💾 ${editado ? 'Guardar cambios' : 'Guardar presupuesto'}</button>
      ${editado
        ? `<button class="btn btn-secundario btn-ancho" data-accion="cancelar-edicion">Cancelar cambios</button>`
        : `<button class="btn btn-secundario btn-ancho" data-accion="reiniciar">🔄 Empezar de nuevo</button>`}
      <div class="espacio-total"></div>

      <button class="barra-total" data-accion="ver-desglose">
        <span class="barra-total-info"><span id="total-horas"></span><small>Total con IVA</small></span>
        <span class="barra-total-importe" id="total-importe"></span>
      </button>`;
    actualizar();
  }

  function actualizar() {
    const r = calcular(t, a);

    r.zonas.forEach((z) => {
      const el = document.getElementById('res-' + z.id);
      if (!el) return;
      if (z.sinRendimiento) {
        el.innerHTML = '⚠️ Falta el rendimiento de esta máquina con esta maleza. Ponlo en Ajustes.';
        el.className = 'resultado-linea alerta';
      } else {
        el.innerHTML = z.horas > 0
          ? `<span>≈ <b>${horas(z.horas)}</b> × ${euros(z.precioHora)}/h</span><b>${euros(z.importe)}</b>`
          : '<span>Escribe la superficie</span>';
        el.className = 'resultado-linea';
      }
    });
    r.poda.forEach((p) => {
      const el = document.getElementById('res-' + p.id);
      if (el) el.innerHTML = `<span>${p.arboles} × ${euros(p.precio)}</span><b>${euros(p.importe)}</b>`;
    });
    r.fumigacion.forEach((f) => {
      const el = document.getElementById('res-' + f.id);
      if (el) el.innerHTML = `<span>${numero(f.cantidad)} × ${euros(f.precio)}${f.producto ? ' + producto' : ''}</span><b>${euros(f.importe)}</b>`;
    });

    $('#tabla-desglose', cont).innerHTML = htmlDesglose(t, r);
    $('#total-horas', cont).textContent = r.horas > 0 ? '⏱ ' + horas(r.horas) : '';
    $('#total-importe', cont).textContent = euros(r.total);
  }

  // --- Eventos ---
  function alCambiar(e) {
    const el = e.target;
    if (el.dataset.doc) {
      b[el.dataset.doc] = el.value;
      return guardar();
    }
    const campo = el.dataset.campo;
    if (!campo) return;
    let valor = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'radio' && !el.checked) return;
    escribirRuta(t, campo, valor);
    guardar();
    if ('rerender' in el.dataset && e.type === 'change') render();
    else actualizar();
  }
  cont.addEventListener('input', alCambiar);
  cont.addEventListener('change', alCambiar);

  cont.addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const acc = boton.dataset.accion;
    let nuevo = null;
    if (acc === 'anadir-zona') {
      const ult = t.zonas[t.zonas.length - 1];
      const z = zonaVacia(t.zonas.length + 1);
      if (ult) Object.assign(z, { maquina: ult.maquina, maleza: ult.maleza });
      t.zonas.push(z);
      nuevo = z.id;
    } else if (acc === 'anadir-poda') {
      nuevo = nuevoId();
      t.poda.push({ id: nuevo, arboles: '', tamano: 'mediano', plataforma: false });
    } else if (acc === 'anadir-fumigacion') {
      nuevo = nuevoId();
      t.fumigacion.push({ id: nuevo, modo: 'm2', cantidad: '', producto: '' });
    } else if (acc === 'quitar') {
      const lista = leerRuta(t, boton.dataset.lista);
      if (!(await confirmar('¿Quitar este trabajo del cálculo?', { si: 'Quitar', peligro: true }))) return;
      lista.splice(+boton.dataset.i, 1);
    } else if (acc === 'reiniciar') {
      if (!(await confirmar('¿Borrar todo y empezar un cálculo nuevo?', { si: 'Empezar de nuevo', peligro: true }))) return;
      nuevoBorrador();
      aviso('Cálculo nuevo');
    } else if (acc === 'cancelar-edicion') {
      if (!(await confirmar('¿Descartar los cambios? El presupuesto guardado queda como estaba.', { si: 'Descartar', peligro: true }))) return;
      const id = b.editando;
      nuevoBorrador();
      location.hash = '#presupuesto/' + id;
      return;
    } else if (acc === 'elegir-cliente') {
      const id = await elegirCliente();
      if (!id) return;
      b.clienteId = id;
    } else if (acc === 'forma-pago') {
      b.formaPago = boton.dataset.texto;
    } else if (acc === 'precios-actuales') {
      if (!(await confirmar('¿Recalcular este presupuesto con los precios actuales de Ajustes?', { si: 'Sí, recalcular' }))) return;
      b.precios = null;
      a = ajustes();
      aviso('Precios actualizados');
    } else if (acc === 'guardar') {
      return guardarComoPresupuesto();
    } else if (acc === 'ver-desglose') {
      $('#desglose', cont).scrollIntoView({ behavior: 'smooth' });
      return;
    } else return;
    guardar();
    const y = window.scrollY;
    render();
    if (!nuevo) window.scrollTo(0, y);
    if (nuevo) document.getElementById('res-' + nuevo)?.closest('.tarjeta').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function nuevoBorrador() {
    b = borradorNuevo();
    t = b.trabajo;
    a = ajustes();
  }

  function guardarComoPresupuesto() {
    const r = calcular(t, a);
    if (!b.clienteId || !cliente(b.clienteId)) {
      aviso('Elige primero el cliente', 'error');
      $('#tarjeta-cliente', cont).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!(r.base > 0)) return aviso('El presupuesto está vacío', 'error');
    const existente = b.editando ? presupuesto(b.editando) : null;
    const p = guardarPresupuesto({
      ...(existente || {}),
      clienteId: b.clienteId,
      trabajo: t,
      precios: b.precios || copiaPrecios(),
      validezDias: Math.round(num(b.validezDias)) || 30,
      formaPago: b.formaPago.trim(),
      notas: b.notas.trim(),
    });
    escribir('borrador', borradorNuevo());
    aviso(existente ? 'Cambios guardados ✓' : `Presupuesto ${p.numero} guardado ✓`);
    location.hash = '#presupuesto/' + p.id;
  }

  render();
}
