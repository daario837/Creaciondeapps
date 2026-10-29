// El "corazón" de la app: convierte lo que mide el equipo en horas y euros.
// No toca la pantalla: recibe datos y devuelve números, así es fácil de comprobar.

export function num(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).replace(/\s/g, '');
  // Formato español: "2.000" son dos mil y "1.500,5" es mil quinientos coma cinco
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

const redondear = (n) => Math.round(n * 100) / 100;

export function trabajoVacio(a) {
  return {
    zonas: [zonaVacia(1)],
    poda: [],
    fumigacion: [],
    restos: { destino: 'triturar', modo: 'fijo', m3: '' },
    desplazamiento: { activo: true, km: '' },
    irpf: !!a.irpfPorDefecto,
  };
}

export function zonaVacia(n) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    nombre: 'Zona ' + n,
    superficie: '',
    maquina: 'autoportante',
    maleza: 'hierba',
    densidad: 'media',
    altura: 'media',
    pendiente: 'llano',
  };
}

export function calcular(t, a) {
  // 1) Desbroce por zonas
  const zonas = t.zonas.map((z) => {
    const superficie = num(z.superficie);
    const rendimiento = num(a.rendimientos[z.maquina]?.[z.maleza]);
    const factor =
      (a.factores.densidad[z.densidad] ?? 1) *
      (a.factores.altura[z.altura] ?? 1) *
      (a.factores.pendiente[z.pendiente] ?? 1);
    const precioHora = num(a.maquinas[z.maquina]?.precioHora);
    const valida = superficie > 0 && rendimiento > 0;
    // Las horas se redondean a centésimas (3,40 h) y con ellas se calcula el precio
    const horas = valida ? redondear((superficie / rendimiento) * factor) : 0;
    return {
      id: z.id,
      superficie,
      rendimiento,
      factor,
      precioHora,
      horas,
      importe: redondear(horas * precioHora),
      sinRendimiento: superficie > 0 && rendimiento <= 0,
    };
  });
  const horas = zonas.reduce((s, z) => s + z.horas, 0);
  const superficie = zonas.reduce((s, z) => s + z.superficie, 0);
  const desbroce = redondear(zonas.reduce((s, z) => s + z.importe, 0));

  // 2) Poda: nº de árboles × precio por tamaño (+ plataforma)
  const poda = t.poda.map((p) => {
    const arboles = Math.max(0, Math.round(num(p.arboles)));
    const precio = num(a.poda[p.tamano]) + (p.plataforma ? num(a.poda.plataforma) : 0);
    return { id: p.id, arboles, precio, importe: redondear(arboles * precio) };
  });
  const podaTotal = redondear(poda.reduce((s, p) => s + p.importe, 0));

  // 3) Fumigación: por m² o por árbol + producto
  const fumigacion = t.fumigacion.map((f) => {
    const cantidad = num(f.cantidad);
    const precio = f.modo === 'arbol' ? num(a.fumigacion.arbol) : num(a.fumigacion.m2);
    const producto = num(f.producto);
    return { id: f.id, cantidad, precio, producto, importe: redondear(cantidad * precio + producto) };
  });
  const fumigacionTotal = redondear(fumigacion.reduce((s, f) => s + f.importe, 0));

  // 4) Restos: triturar o amontonar no se cobra aparte; la retirada sí
  const destinoRestos = t.restos?.destino ?? (t.restos?.activo ? 'retirar' : 'triturar');
  let restos = 0;
  if (destinoRestos === 'retirar') {
    restos = t.restos.modo === 'm3' ? redondear(num(t.restos.m3) * num(a.restos.m3)) : num(a.restos.fijo);
  }

  // 5) Desplazamiento
  let desplazamiento = 0;
  let kmCobrados = 0;
  if (t.desplazamiento?.activo) {
    if (a.desplazamiento.modo === 'km') {
      kmCobrados = num(t.desplazamiento.km) * (a.desplazamiento.idaVuelta ? 2 : 1);
      desplazamiento = redondear(kmCobrados * num(a.desplazamiento.precioKm));
    } else {
      desplazamiento = num(a.desplazamiento.fijo);
    }
  }

  // 6) Tarifa mínima: si el trabajo sale por menos, se cobra la mínima
  const subtotal = redondear(desbroce + podaTotal + fumigacionTotal + restos + desplazamiento);
  const minima = num(a.tarifaMinima);
  const ajusteMinimo = subtotal > 0 && subtotal < minima ? redondear(minima - subtotal) : 0;
  const base = redondear(subtotal + ajusteMinimo);

  // 7) Impuestos
  // Los presupuestos antiguos (sin este ajuste) llevaban impuestos
  const conImpuestos = a.aplicarImpuestos !== false;
  const ivaPct = conImpuestos ? num(a.iva) : 0;
  const irpfPct = conImpuestos && t.irpf ? num(a.irpf) : 0;
  const iva = redondear((base * ivaPct) / 100);
  const irpf = redondear((base * irpfPct) / 100);
  const total = redondear(base + iva - irpf);

  return {
    zonas, horas, superficie, desbroce,
    poda, podaTotal,
    fumigacion, fumigacionTotal,
    destinoRestos, restos, desplazamiento, kmCobrados, conImpuestos,
    subtotal, minima, ajusteMinimo, base,
    ivaPct, iva, irpfPct, irpf, total,
  };
}
