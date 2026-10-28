// Clientes y presupuestos guardados en el dispositivo.
import { leer, escribir, ajustes } from './store.js';
import { calcular } from './calc.js';

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

export const ESTADOS = [
  { id: 'pendiente', nombre: 'Pendiente', icono: '⏳' },
  { id: 'aceptado', nombre: 'Aceptado', icono: '✅' },
  { id: 'rechazado', nombre: 'Rechazado', icono: '❌' },
];

// --- Clientes ---

export const clientes = () => leer('clientes', []);
export const cliente = (id) => clientes().find((c) => c.id === id) || null;

export function guardarCliente(c) {
  const lista = clientes();
  const i = lista.findIndex((x) => x.id === c.id);
  if (i >= 0) lista[i] = c;
  else {
    c.id = nuevoId();
    c.creado = new Date().toISOString();
    lista.push(c);
  }
  escribir('clientes', ordenar(lista, 'nombre'));
  return c;
}

export function borrarCliente(id) {
  escribir('clientes', clientes().filter((c) => c.id !== id));
}

const ordenar = (lista, campo) => lista.sort((a, b) => String(a[campo]).localeCompare(String(b[campo]), 'es', { sensitivity: 'base' }));

// --- Presupuestos ---

export const presupuestos = () => leer('presupuestos', []);
export const presupuesto = (id) => presupuestos().find((p) => p.id === id) || null;
export const presupuestosDe = (clienteId) => presupuestos().filter((p) => p.clienteId === clienteId);

// Número de referencia: [serie-]AÑO-001. El contador nunca repite números, aunque se borre alguno.
function siguienteNumero() {
  const anio = new Date().getFullYear();
  const cont = leer('contadores', {});
  const n = (cont[anio] || 0) + 1;
  cont[anio] = n;
  escribir('contadores', cont);
  const serie = (ajustes().presupuestos.serie || '').trim();
  return `${serie ? serie + '-' : ''}${anio}-${String(n).padStart(3, '0')}`;
}

// Los precios se copian dentro del presupuesto: si mañana cambias los ajustes, los presupuestos ya hechos no cambian.
export function copiaPrecios() {
  const { empresa, pin, ...precios } = ajustes();
  return JSON.parse(JSON.stringify(precios));
}

export function resumen(p) {
  const r = calcular(p.trabajo, p.precios);
  return { total: r.total, base: r.base, horas: r.horas };
}

export function guardarPresupuesto(p) {
  const lista = presupuestos();
  const c = cliente(p.clienteId);
  if (c) p.clienteDatos = { nombre: c.nombre, telefono: c.telefono, direccion: c.direccion, catastro: c.catastro };
  p.totales = resumen(p);
  p.modificado = new Date().toISOString();
  const i = lista.findIndex((x) => x.id === p.id);
  if (i >= 0) lista[i] = p;
  else {
    p.id = nuevoId();
    p.numero = siguienteNumero();
    p.fecha = new Date().toISOString();
    p.estado = 'pendiente';
    lista.push(p);
  }
  escribir('presupuestos', lista);
  return p;
}

export function cambiarEstado(id, estado) {
  const lista = presupuestos();
  const p = lista.find((x) => x.id === id);
  if (!p) return;
  p.estado = estado;
  p.fechaEstado = new Date().toISOString();
  escribir('presupuestos', lista);
}

export function borrarPresupuesto(id) {
  escribir('presupuestos', presupuestos().filter((p) => p.id !== id));
}

export function venceEl(p) {
  const d = new Date(p.fecha);
  d.setDate(d.getDate() + (Number(p.validezDias) || 0));
  return d;
}

export const fecha = (iso) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
