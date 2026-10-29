// Tabla con el desglose del precio. La usan la calculadora y la ficha del presupuesto.
import { MAQUINAS, MALEZAS, DESTINOS_RESTOS } from './store.js';
import { esc, euros, numero, horas } from './ui.js';

export function htmlDesglose(t, r) {
  if (!(r.base > 0)) return '<p class="nota">Rellena al menos una superficie o trabajo para ver el precio.</p>';
  const x = (n) => '×' + numero(n, 2);
  const filas = [];
  const fila = (txt, imp, cls = '') => filas.push(`<tr class="${cls}"><td>${txt}</td><td>${imp}</td></tr>`);
  t.zonas.forEach((z, i) => {
    const rz = r.zonas[i];
    if (rz.horas > 0) {
      const maq = MAQUINAS.find((m) => m.id === z.maquina)?.nombre ?? '';
      const mal = MALEZAS.find((m) => m.id === z.maleza)?.nombre ?? '';
      fila(`${esc(z.nombre)}<small>${numero(rz.superficie)} m² · ${mal} · ${maq}<br>${numero(rz.rendimiento, 0)} m²/h (${(1000 / rz.rendimiento).toFixed(2).replace(".", ",")} h/1.000 m²)${rz.factor !== 1 ? ' · factores ' + x(rz.factor) : ''} → ${horas(rz.horas)}</small>`, euros(rz.importe));
    }
  });
  if (r.podaTotal) fila(`Poda<small>${r.poda.reduce((s, p) => s + p.arboles, 0)} árboles</small>`, euros(r.podaTotal));
  if (r.fumigacionTotal) fila('Fumigación<small>incluye producto</small>', euros(r.fumigacionTotal));
  if (r.destinoRestos === 'retirar') fila('Retirada de restos', euros(r.restos));
  else if (r.horas > 0) fila(`Restos<small>${DESTINOS_RESTOS.find((d) => d.id === r.destinoRestos)?.texto ?? ''}</small>`, 'Incluido');
  if (r.desplazamiento) fila(`Desplazamiento${r.kmCobrados ? `<small>${numero(r.kmCobrados)} km</small>` : ''}`, euros(r.desplazamiento));
  if (r.ajusteMinimo) fila(`Ajuste a tarifa mínima<small>el trabajo mínimo es ${euros(r.minima)}</small>`, euros(r.ajusteMinimo), 'destacada');
  if (r.conImpuestos) {
    fila('<b>Base imponible</b>', `<b>${euros(r.base)}</b>`, 'separada');
    fila(`IVA (${numero(r.ivaPct)} %)`, euros(r.iva));
    if (r.irpfPct) fila(`Retención IRPF (−${numero(r.irpfPct)} %)`, '−' + euros(r.irpf));
    fila('<b>TOTAL</b>', `<b>${euros(r.total)}</b>`, 'total');
  } else {
    fila('<b>TOTAL</b><small>IVA no incluido</small>', `<b>${euros(r.total)}</b>`, 'total separada');
  }
  // Precio por m² que sale del cálculo (solo desbroce, sin desplazamiento ni extras)
  const porM2 = r.superficie > 0 ? r.desbroce / r.superficie : 0;
  return `${r.horas > 0 ? `<p class="horas-grande">Horas de máquina estimadas: <b>${horas(r.horas)}</b>
      <small>El desbroce sale a ${numero(porM2, 3)} €/m²</small></p>` : ''}<table>${filas.join('')}</table>`;
}
