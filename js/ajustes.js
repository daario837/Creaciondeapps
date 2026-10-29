// Pantalla "Ajustes": todos los precios y datos editables.
import {
  ajustes, guardarAjustes, ajustesPorDefecto, exportarTodo, importarTodo,
  MAQUINAS, MALEZAS, FACTORES, TAMANOS_ARBOL,
} from './store.js';
import { num } from './calc.js';
import { esc, aviso, confirmar, leerRuta, escribirRuta, paraEditar, numero, $ } from './ui.js';

// "588 m²/h" también se puede leer como "1,70 h por cada 1.000 m²"
const equivalencia = (m2h) => (num(m2h) > 0 ? `= ${(1000 / num(m2h)).toFixed(2).replace(".", ",")} h por cada 1.000 m²` : 'Esta máquina no se usa con esta maleza');

export function vistaAjustes(cont) {
  const a = ajustes();

  const numeroAj = (ruta, etiqueta, unidad) => `<label class="campo campo-fila">
      <span class="campo-etiqueta">${etiqueta}</span>
      <span class="con-unidad"><input type="text" inputmode="decimal" autocomplete="off" data-ajuste="${ruta}" data-num value="${esc(paraEditar(leerRuta(a, ruta)))}"><span class="unidad">${unidad}</span></span>
    </label>`;

  const textoAj = (ruta, etiqueta, tipo = 'text', extra = '') => `<label class="campo">
      <span class="campo-etiqueta">${etiqueta}</span>
      <input type="${tipo}" data-ajuste="${ruta}" value="${esc(leerRuta(a, ruta))}" ${extra}>
    </label>`;

  const grupo = (titulo, contenido, abierto = false) =>
    `<details class="tarjeta grupo" ${abierto ? 'open' : ''}><summary>${titulo}</summary><div class="grupo-cuerpo">${contenido}</div></details>`;

  function render() {
    const e = a.empresa;
    cont.innerHTML = `
      <h2 class="titulo-vista">Ajustes</h2>
      <p class="nota">Los cambios se guardan solos al escribir. Toca cada apartado para abrirlo.</p>

      ${grupo('🏢 Datos de la empresa', `
        <div class="logo-zona">
          ${e.logo ? `<img src="${e.logo}" alt="Logo" class="logo-vista">` : '<div class="logo-vacio">Sin logo</div>'}
          <div class="logo-botones">
            <label class="btn btn-secundario">📷 ${e.logo ? 'Cambiar logo' : 'Poner logo'}<input type="file" accept="image/*" id="logo-archivo" hidden></label>
            ${e.logo ? '<button class="btn btn-secundario" data-accion="quitar-logo">Quitar logo</button>' : ''}
          </div>
        </div>
        ${textoAj('empresa.nombre', 'Nombre de la empresa')}
        ${textoAj('empresa.nif', 'NIF / CIF')}
        ${textoAj('empresa.direccion', 'Dirección')}
        ${textoAj('empresa.telefono', 'Teléfono', 'tel')}
        ${textoAj('empresa.email', 'Email', 'email')}
        ${textoAj('empresa.web', 'Web')}
        ${textoAj('empresa.iban', 'Cuenta bancaria (IBAN)')}
      `)}

      ${grupo('🔒 PIN de acceso', `
        <label class="campo"><span class="campo-etiqueta">PIN actual</span><input type="password" inputmode="numeric" maxlength="4" id="pin-actual" autocomplete="off"></label>
        <label class="campo"><span class="campo-etiqueta">PIN nuevo (4 cifras)</span><input type="password" inputmode="numeric" maxlength="4" id="pin-nuevo" autocomplete="off"></label>
        <label class="campo"><span class="campo-etiqueta">Repite el PIN nuevo</span><input type="password" inputmode="numeric" maxlength="4" id="pin-repetir" autocomplete="off"></label>
        <button class="btn btn-primario btn-ancho" data-accion="cambiar-pin">Cambiar PIN</button>
      `)}

      ${grupo('🚜 Precio por hora de cada máquina',
        MAQUINAS.map((m) => numeroAj(`maquinas.${m.id}.precioHora`, `${m.icono} ${m.nombre}`, '€/h')).join(''))}

      ${grupo('📐 Rendimientos (m² por hora)', `
        <p class="nota">Cuántos m² desbrozáis en una hora con cada máquina y cada maleza, en condiciones normales
        (densidad media, altura media, terreno llano). Pon 0 si esa máquina no sirve para esa maleza.
        Debajo verás lo mismo en horas por cada 1.000 m².</p>
        <p class="nota">Para sacar los vuestros: apuntad en varios trabajos los m² y las horas reales, y dividid m² ÷ horas.</p>
        ${MAQUINAS.map((m) => `<h4 class="subtitulo">${m.icono} ${m.nombre}</h4>
          ${MALEZAS.map((mal) => {
            const ruta = `rendimientos.${m.id}.${mal.id}`;
            return numeroAj(ruta, mal.nombre, 'm²/h') + `<span class="equivalencia" data-equiv="${ruta}">${equivalencia(leerRuta(a, ruta))}</span>`;
          }).join('')}`).join('')}
      `)}

      ${grupo('⚖️ Factores de dificultad', `
        <p class="nota">Multiplican las horas. 1 = normal. Por ejemplo, 1,3 = un 30 % más de tiempo; 0,8 = un 20 % menos.</p>
        ${FACTORES.map((f) => `<h4 class="subtitulo">${f.nombre}</h4>
          ${f.niveles.map(([id, txt, pista]) => numeroAj(`factores.${f.id}.${id}`, `${txt} <small>(${pista.toLowerCase()})</small>`, '×')).join('')}`).join('')}
      `)}

      ${grupo('🚗 Desplazamiento', `
        <div class="opciones opciones-2">
          <label class="opcion"><input type="radio" name="desp-modo" value="km" data-ajuste="desplazamiento.modo" ${a.desplazamiento.modo === 'km' ? 'checked' : ''}><span>Por kilómetro</span></label>
          <label class="opcion"><input type="radio" name="desp-modo" value="fijo" data-ajuste="desplazamiento.modo" ${a.desplazamiento.modo === 'fijo' ? 'checked' : ''}><span>Precio fijo</span></label>
        </div>
        ${numeroAj('desplazamiento.precioKm', 'Precio por km', '€/km')}
        <label class="interruptor"><input type="checkbox" data-ajuste="desplazamiento.idaVuelta" ${a.desplazamiento.idaVuelta ? 'checked' : ''}>
          <span>Cobrar ida y vuelta <small>los km se multiplican por 2</small></span></label>
        ${numeroAj('desplazamiento.fijo', 'Precio fijo', '€')}
      `)}

      ${grupo('💶 Tarifa mínima e impuestos', `
        ${numeroAj('tarifaMinima', 'Tarifa mínima (sin IVA)', '€')}
        <p class="nota">Si un presupuesto sale por menos, se cobra esta cantidad.</p>
        <label class="interruptor"><input type="checkbox" data-ajuste="aplicarImpuestos" ${a.aplicarImpuestos ? 'checked' : ''}>
          <span>Incluir IVA e IRPF en los presupuestos <small>Apagado: los precios salen sin impuestos («IVA no incluido»)</small></span></label>
        ${numeroAj('iva', 'IVA', '%')}
        ${numeroAj('irpf', 'Retención IRPF', '%')}
        <label class="interruptor"><input type="checkbox" data-ajuste="irpfPorDefecto" ${a.irpfPorDefecto ? 'checked' : ''}>
          <span>Aplicar IRPF por defecto en cálculos nuevos</span></label>
      `)}

      ${grupo('🌳 Precios de poda (por árbol)', `
        ${TAMANOS_ARBOL.map((s) => numeroAj(`poda.${s.id}`, 'Árbol ' + s.nombre.toLowerCase(), '€')).join('')}
        ${numeroAj('poda.plataforma', 'Suplemento plataforma', '€/árbol')}
      `)}

      ${grupo('💧 Precios de fumigación', `
        ${numeroAj('fumigacion.m2', 'Por m²', '€/m²')}
        ${numeroAj('fumigacion.arbol', 'Por árbol', '€/árbol')}
        <p class="nota">El coste del producto se añade aparte en cada presupuesto.</p>
      `)}

      ${grupo('🗑️ Retirada de restos', `
        ${numeroAj('restos.fijo', 'Precio fijo', '€')}
        ${numeroAj('restos.m3', 'Precio por m³', '€/m³')}
      `)}

      ${grupo('📄 Presupuestos', `
        ${numeroAj('presupuestos.validezDias', 'Validez por defecto', 'días')}
        <label class="campo"><span class="campo-etiqueta">Forma de pago por defecto</span>
          <textarea data-ajuste="presupuestos.formaPago" rows="2">${esc(a.presupuestos.formaPago)}</textarea></label>
        <label class="campo"><span class="campo-etiqueta">Plazo por defecto</span>
          <input type="text" data-ajuste="presupuestos.plazo" value="${esc(a.presupuestos.plazo)}"></label>
        <label class="campo"><span class="campo-etiqueta">Condiciones por defecto</span>
          <textarea data-ajuste="presupuestos.condiciones" rows="5">${esc(a.presupuestos.condiciones)}</textarea></label>
        <label class="campo"><span class="campo-etiqueta">Serie (opcional)</span>
          <input type="text" data-ajuste="presupuestos.serie" value="${esc(a.presupuestos.serie)}" maxlength="5" autocapitalize="characters" placeholder="Ej.: A"></label>
        <p class="nota">Si varias personas hacéis presupuestos en móviles distintos, poned una letra diferente en cada uno
        (A, B, C…) para que no se repitan los números. Quedarán así: A-${new Date().getFullYear()}-001.</p>
      `)}

      ${grupo('💾 Copia de seguridad', `
        <p class="nota">Guarda todos los datos en un archivo. Sirve para no perder nada o para pasarlo a otro móvil o tablet.</p>
        <button class="btn btn-primario btn-ancho" data-accion="exportar">⬇️ Guardar copia</button>
        <label class="btn btn-secundario btn-ancho">⬆️ Cargar copia<input type="file" accept=".json,application/json" id="importar-archivo" hidden></label>
      `)}

      ${grupo('↩️ Restablecer precios', `
        <p class="nota">Vuelve a poner los precios, rendimientos y factores de fábrica. No borra los datos de la empresa ni el PIN.</p>
        <button class="btn btn-peligro btn-ancho" data-accion="restablecer">Restablecer precios</button>
      `)}

      <p class="nota version">Desbroce Los Zagales · versión 3</p>`;
  }

  function alCambiar(ev) {
    const el = ev.target;
    const ruta = el.dataset.ajuste;
    if (!ruta) return;
    let valor;
    if (el.type === 'checkbox') valor = el.checked;
    else if (el.type === 'radio') { if (!el.checked) return; valor = el.value; }
    else if ('num' in el.dataset) {
      if (el.value.trim() === '') return; // no guardar un campo vacío mientras se escribe
      valor = num(el.value);
    } else valor = el.value.trim();
    escribirRuta(a, ruta, valor);
    guardarAjustes(a);
    const eq = cont.querySelector(`[data-equiv="${ruta}"]`);
    if (eq) eq.textContent = equivalencia(valor);
    if (ev.type === 'change') aviso('Guardado ✓');
  }
  cont.addEventListener('input', alCambiar);
  cont.addEventListener('change', (ev) => {
    if (ev.target.id === 'logo-archivo') return cargarLogo(ev.target.files[0]);
    if (ev.target.id === 'importar-archivo') return importar(ev.target.files[0]);
    alCambiar(ev);
  });

  cont.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-accion]');
    if (!b) return;
    const acc = b.dataset.accion;
    if (acc === 'cambiar-pin') cambiarPin();
    else if (acc === 'quitar-logo') {
      a.empresa.logo = '';
      guardarAjustes(a);
      render();
      abrir('Datos de la empresa');
    } else if (acc === 'exportar') exportar();
    else if (acc === 'restablecer') {
      if (!(await confirmar('¿Volver a los precios de fábrica? Perderás los precios que hayas cambiado.', { si: 'Restablecer', peligro: true }))) return;
      const d = ajustesPorDefecto();
      for (const k of Object.keys(d)) if (k !== 'empresa' && k !== 'pin') a[k] = d[k];
      guardarAjustes(a);
      render();
      aviso('Precios restablecidos');
    }
  });

  const abrir = (texto) => [...cont.querySelectorAll('details')].find((d) => d.textContent.includes(texto))?.setAttribute('open', '');

  function cambiarPin() {
    const actual = $('#pin-actual', cont).value;
    const nuevo = $('#pin-nuevo', cont).value;
    const rep = $('#pin-repetir', cont).value;
    if (actual !== a.pin) return aviso('El PIN actual no es correcto', 'error');
    if (!/^\d{4}$/.test(nuevo)) return aviso('El PIN nuevo debe tener 4 cifras', 'error');
    if (nuevo !== rep) return aviso('Los dos PIN nuevos no coinciden', 'error');
    a.pin = nuevo;
    guardarAjustes(a);
    ['#pin-actual', '#pin-nuevo', '#pin-repetir'].forEach((s) => ($(s, cont).value = ''));
    aviso('PIN cambiado ✓');
  }

  // Reduce el logo para que ocupe poco espacio
  function cargarLogo(archivo) {
    if (!archivo) return;
    const img = new Image();
    img.onload = () => {
      const max = 500;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      a.empresa.logo = c.toDataURL('image/png');
      URL.revokeObjectURL(img.src);
      try {
        guardarAjustes(a);
        aviso('Logo guardado ✓');
      } catch {
        a.empresa.logo = '';
        aviso('La imagen es demasiado grande', 'error');
      }
      render();
      abrir('Datos de la empresa');
    };
    img.onerror = () => aviso('No se pudo leer la imagen', 'error');
    img.src = URL.createObjectURL(archivo);
  }

  async function exportar() {
    const copia = exportarTodo();
    const nombre = `desbroce-los-zagales-copia-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(copia)], { type: 'application/json' });
    const archivo = new File([blob], nombre, { type: 'application/json' });
    // En móvil, ofrece compartir el archivo (WhatsApp, Drive, email...). Si no se puede, se descarga.
    if (navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Copia Desbroce Los Zagales' });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = nombre;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 5000);
    aviso('Copia descargada ✓');
  }

  async function importar(archivo) {
    if (!archivo) return;
    try {
      const copia = JSON.parse(await archivo.text());
      if (!(await confirmar('Se van a sustituir TODOS los datos de este dispositivo por los de la copia. ¿Seguir?', { si: 'Cargar copia', peligro: true }))) return;
      importarTodo(copia);
      aviso('Copia cargada ✓');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      aviso(err.message.includes('Desbroce') ? err.message : 'El archivo no es válido', 'error');
    }
  }

  render();
}
