// Pantalla "Calcular": zonas de desbroce, poda, fumigación, restos y total.
import { ajustes, leer, escribir, MAQUINAS, MALEZAS, FACTORES, TAMANOS_ARBOL } from './store.js';
import { calcular, trabajoVacio, zonaVacia } from './calc.js';
import { esc, euros, numero, horas, $, confirmar, escribirRuta, leerRuta, aviso } from './ui.js';

const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const x = (n) => '×' + numero(n, 2);

export function vistaCalculadora(cont) {
  const a = ajustes();
  let t = leer('borrador') || trabajoVacio(a);

  const guardar = () => escribir('borrador', t);

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

  function render() {
    cont.innerHTML = `
      <h2 class="titulo-vista">Calcular presupuesto</h2>
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

      <button class="btn btn-secundario btn-ancho" data-accion="reiniciar">🔄 Empezar de nuevo</button>
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

    const filas = [];
    const fila = (txt, imp, cls = '') => filas.push(`<tr class="${cls}"><td>${txt}</td><td>${imp}</td></tr>`);
    t.zonas.forEach((z, i) => {
      const rz = r.zonas[i];
      if (rz.horas > 0) {
        const maq = MAQUINAS.find((m) => m.id === z.maquina).nombre;
        const mal = MALEZAS.find((m) => m.id === z.maleza).nombre;
        fila(`${esc(z.nombre)}<small>${numero(rz.superficie)} m² · ${mal} · ${maq}<br>${numero(rz.rendimiento, 0)} m²/h${rz.factor !== 1 ? ' · factores ' + x(rz.factor) : ''} → ${horas(rz.horas)}</small>`, euros(rz.importe));
      }
    });
    if (r.podaTotal) fila(`Poda<small>${r.poda.reduce((s, p) => s + p.arboles, 0)} árboles</small>`, euros(r.podaTotal));
    if (r.fumigacionTotal) fila('Fumigación<small>incluye producto</small>', euros(r.fumigacionTotal));
    if (r.restos) fila('Retirada de restos', euros(r.restos));
    if (r.desplazamiento) fila(`Desplazamiento${r.kmCobrados ? `<small>${numero(r.kmCobrados)} km</small>` : ''}`, euros(r.desplazamiento));
    if (r.ajusteMinimo) fila(`Ajuste a tarifa mínima<small>el trabajo mínimo es ${euros(r.minima)}</small>`, euros(r.ajusteMinimo), 'destacada');
    fila('<b>Base imponible</b>', `<b>${euros(r.base)}</b>`, 'separada');
    fila(`IVA (${numero(r.ivaPct)} %)`, euros(r.iva));
    if (r.irpfPct) fila(`Retención IRPF (−${numero(r.irpfPct)} %)`, '−' + euros(r.irpf));
    fila('<b>TOTAL</b>', `<b>${euros(r.total)}</b>`, 'total');

    $('#tabla-desglose', cont).innerHTML = r.base > 0
      ? `${r.horas > 0 ? `<p class="horas-grande">Horas de máquina estimadas: <b>${horas(r.horas)}</b></p>` : ''}<table>${filas.join('')}</table>`
      : '<p class="nota">Rellena al menos una superficie o trabajo para ver el precio.</p>';
    $('#total-horas', cont).textContent = r.horas > 0 ? '⏱ ' + horas(r.horas) : '';
    $('#total-importe', cont).textContent = euros(r.total);
  }

  // --- Eventos ---
  function alCambiar(e) {
    const el = e.target;
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
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const acc = b.dataset.accion;
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
      const lista = leerRuta(t, b.dataset.lista);
      if (!(await confirmar('¿Quitar este trabajo del cálculo?', { si: 'Quitar', peligro: true }))) return;
      lista.splice(+b.dataset.i, 1);
    } else if (acc === 'reiniciar') {
      if (!(await confirmar('¿Borrar todo y empezar un cálculo nuevo?', { si: 'Empezar de nuevo', peligro: true }))) return;
      t = trabajoVacio(a);
      aviso('Cálculo nuevo');
    } else if (acc === 'ver-desglose') {
      $('#desglose', cont).scrollIntoView({ behavior: 'smooth' });
      return;
    } else return;
    guardar();
    render();
    if (nuevo) document.getElementById('res-' + nuevo)?.closest('.tarjeta').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  render();
}
