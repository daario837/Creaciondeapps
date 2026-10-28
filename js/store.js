// Datos de la app guardados en el propio dispositivo (localStorage).
// Todas las claves empiezan por "dlz_" para poder exportarlas juntas.

export const MAQUINAS = [
  { id: 'mano', nombre: 'Desbrozadora de mano', icono: '🧑‍🌾' },
  { id: 'autoportante', nombre: 'Desbrozadora autoportante', icono: '🚜' },
  { id: 'tractor', nombre: 'Tractor con desbrozadora', icono: '🚛' },
  { id: 'robot', nombre: 'Robot desbrozador', icono: '🤖' },
];

export const MALEZAS = [
  { id: 'hierba', nombre: 'Hierba' },
  { id: 'zarza', nombre: 'Zarza' },
  { id: 'cana', nombre: 'Caña' },
  { id: 'tojo', nombre: 'Tojo' },
  { id: 'retama', nombre: 'Retama' },
  { id: 'rebrotes', nombre: 'Rebrotes' },
];

export const FACTORES = [
  { id: 'densidad', nombre: 'Densidad', niveles: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']] },
  { id: 'altura', nombre: 'Altura', niveles: [['baja', 'Baja'], ['media', 'Media'], ['alta', 'Alta']] },
  { id: 'pendiente', nombre: 'Pendiente', niveles: [['llano', 'Llano'], ['media', 'Media'], ['fuerte', 'Fuerte']] },
];

export const TAMANOS_ARBOL = [
  { id: 'pequeno', nombre: 'Pequeño' },
  { id: 'mediano', nombre: 'Mediano' },
  { id: 'grande', nombre: 'Grande' },
];

export function ajustesPorDefecto() {
  return {
    empresa: {
      nombre: 'Desbroce Los Zagales',
      nif: '',
      direccion: '',
      telefono: '',
      email: '',
      web: '',
      iban: '',
      logo: '',
    },
    pin: '1234',
    maquinas: {
      mano: { precioHora: 30 },
      autoportante: { precioHora: 60 },
      tractor: { precioHora: 75 },
      robot: { precioHora: 85 },
    },
    // m² que se desbrozan en una hora con cada máquina y maleza (densidad, altura y pendiente "normales")
    rendimientos: {
      mano: { hierba: 300, zarza: 80, cana: 100, tojo: 120, retama: 130, rebrotes: 200 },
      autoportante: { hierba: 1500, zarza: 400, cana: 450, tojo: 588, retama: 600, rebrotes: 1000 },
      tractor: { hierba: 4000, zarza: 1200, cana: 1300, tojo: 1500, retama: 1600, rebrotes: 2500 },
      robot: { hierba: 2000, zarza: 700, cana: 750, tojo: 900, retama: 950, rebrotes: 1400 },
    },
    // Multiplican las horas: 1 = normal, más de 1 = cuesta más
    factores: {
      densidad: { baja: 0.8, media: 1, alta: 1.3 },
      altura: { baja: 0.9, media: 1, alta: 1.3 },
      pendiente: { llano: 1, media: 1.25, fuerte: 1.6 },
    },
    desplazamiento: { modo: 'km', fijo: 20, precioKm: 0.4, idaVuelta: true },
    tarifaMinima: 80,
    iva: 21,
    irpf: 15,
    irpfPorDefecto: false,
    poda: { pequeno: 15, mediano: 35, grande: 70, plataforma: 25 },
    fumigacion: { m2: 0.08, arbol: 3 },
    restos: { fijo: 40, m3: 25 },
    presupuestos: {
      serie: '', // letra o prefijo opcional para distinguir dispositivos (p. ej. "A")
      validezDias: 30,
      formaPago: 'Transferencia bancaria o efectivo al terminar el trabajo',
    },
  };
}

// --- Lectura y escritura básicas ---

export function leer(clave, porDefecto = null) {
  try {
    const txt = localStorage.getItem('dlz_' + clave);
    return txt == null ? porDefecto : JSON.parse(txt);
  } catch {
    return porDefecto;
  }
}

export function escribir(clave, valor) {
  localStorage.setItem('dlz_' + clave, JSON.stringify(valor));
}

// Rellena lo que falte en "guardado" con los valores de "base" (útil al añadir ajustes nuevos en versiones futuras)
function completar(base, guardado) {
  if (guardado == null || typeof base !== 'object' || base === null || Array.isArray(base)) {
    return guardado == null ? base : guardado;
  }
  const res = { ...base };
  for (const k of Object.keys(guardado)) {
    res[k] = k in base ? completar(base[k], guardado[k]) : guardado[k];
  }
  return res;
}

let cacheAjustes = null;

export function ajustes() {
  if (!cacheAjustes) cacheAjustes = completar(ajustesPorDefecto(), leer('ajustes'));
  return cacheAjustes;
}

export function guardarAjustes(a = cacheAjustes) {
  cacheAjustes = a;
  escribir('ajustes', a);
}

// --- Copia de seguridad ---

export function exportarTodo() {
  const datos = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('dlz_')) datos[k] = JSON.parse(localStorage.getItem(k));
  }
  return { app: 'desbroce-los-zagales', version: 1, fecha: new Date().toISOString(), datos };
}

export function importarTodo(copia) {
  if (!copia || copia.app !== 'desbroce-los-zagales' || typeof copia.datos !== 'object') {
    throw new Error('El archivo no es una copia de Desbroce Los Zagales');
  }
  const borrar = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith('dlz_')) borrar.push(k);
  }
  borrar.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(copia.datos)) {
    if (k.startsWith('dlz_')) localStorage.setItem(k, JSON.stringify(v));
  }
  cacheAjustes = null;
}
