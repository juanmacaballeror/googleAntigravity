/**
 * servicio financiero.js  — Cálculos de comisiones y P&L
 */

const calcularComisionBruta = (precioVenta, pctComision = 3) => {
  if (!precioVenta || precioVenta <= 0) return 0;
  return +(precioVenta * pctComision / 100).toFixed(2);
};

const calcularComisionAgente = (comisionNetaAgencia, pctAgente = 5) => {
  if (!comisionNetaAgencia || comisionNetaAgencia <= 0) return 0;
  return +(comisionNetaAgencia * pctAgente / 100).toFixed(2);
};

const calcularBeneficioNeto = (
  precioVenta,
  pctComision   = 3,
  comisionAgente = null,
  gastosPeritaje = 0,
  otrosGastos    = 0
) => {
  const comisionBruta = calcularComisionBruta(precioVenta, pctComision);

  const agente = comisionAgente !== null
    ? +comisionAgente.toFixed(2)
    : calcularComisionAgente(comisionBruta, 5);

  const peritaje = +(parseFloat(gastosPeritaje) || 0).toFixed(2);
  const otros    = +(parseFloat(otrosGastos)    || 0).toFixed(2);
  const totalGastos  = +(agente + peritaje + otros).toFixed(2);
  const beneficioNeto = +(comisionBruta - totalGastos).toFixed(2);
  const margenPct = comisionBruta > 0
    ? +((beneficioNeto / comisionBruta) * 100).toFixed(2)
    : 0;

  return {
    precioVenta:    +precioVenta.toFixed(2),
    comisionBruta,
    comisionAgente: agente,
    gastosPeritaje: peritaje,
    otrosGastos:    otros,
    totalGastos,
    beneficioNeto,
    margenPct
  };
};

const generarResumenMensual = (ventas = []) => {
  const desglose = ventas.map(v =>
    calcularBeneficioNeto(v.precioVenta, v.pctComision, v.comisionAgente, v.gastosPeritaje, v.otrosGastos)
  );

  const numVentas         = desglose.length;
  const volumenTotal      = +desglose.reduce((s, d) => s + d.precioVenta,    0).toFixed(2);
  const comisionesTotales = +desglose.reduce((s, d) => s + d.comisionBruta,  0).toFixed(2);
  const comisionesAgentes = +desglose.reduce((s, d) => s + d.comisionAgente, 0).toFixed(2);
  const gastosTotales     = +desglose.reduce((s, d) => s + d.totalGastos,    0).toFixed(2);
  const beneficioNeto     = +desglose.reduce((s, d) => s + d.beneficioNeto,  0).toFixed(2);
  const margenMedioPct    = numVentas > 0
    ? +(desglose.reduce((s, d) => s + d.margenPct, 0) / numVentas).toFixed(2)
    : 0;

  return {
    numVentas,
    volumenTotal,
    comisionesTotales,
    comisionesAgentes,
    gastosTotales,
    beneficioNeto,
    margenMedioPct,
    desglose
  };
};

const formatearEuros = (valor) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);

module.exports = {
  calcularComisionBruta,
  calcularComisionAgente,
  calcularBeneficioNeto,
  generarResumenMensual,
  formatearEuros
};
