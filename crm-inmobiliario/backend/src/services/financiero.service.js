/**
 * ============================================================
 * servicio financiero.js  — Cálculos de comisiones y P&L
 * ============================================================
 * ENTREGABLE 4: Función de cálculo financiero
 * ============================================================
 */

/**
 * Calcula la comisión bruta que cobra la agencia al comprador/vendedor.
 * @param {number} precioVenta   - Precio final de la venta en €
 * @param {number} pctComision   - Porcentaje que carga la agencia (ej: 3)
 * @returns {number} Comisión bruta en €
 */
const calcularComisionBruta = (precioVenta, pctComision = 3) => {
  if (!precioVenta || precioVenta <= 0) return 0;
  return +(precioVenta * pctComision / 100).toFixed(2);
};

/**
 * Calcula la comisión que recibe el agente vendedor.
 * El agente percibe un 5% de la comisión neta ingresada por la agencia.
 * @param {number} comisionNetaAgencia - Comisión neta recibida por la inmobiliaria en €
 * @param {number} pctAgente           - Porcentaje del agente (default 5%)
 * @returns {number} Importe a pagar al agente en €
 */
const calcularComisionAgente = (comisionNetaAgencia, pctAgente = 5) => {
  if (!comisionNetaAgencia || comisionNetaAgencia <= 0) return 0;
  return +(comisionNetaAgencia * pctAgente / 100).toFixed(2);
};

/**
 * Calcula el beneficio neto de la empresa para una venta concreta.
 * Beneficio = Comisión Bruta − Comisión Agente − Gastos de Peritaje − Otros Gastos
 *
 * @param {number} precioVenta       - Precio de venta del inmueble en €
 * @param {number} pctComision       - % de comisión que carga la agencia (ej: 3)
 * @param {number|null} comisionAgente - Importe ya calculado para el agente; si null, se calcula con 5%
 * @param {number} gastosPeritaje    - Coste del peritaje/tasación en €
 * @param {number} otrosGastos       - Suma de otros gastos operativos en €
 * @returns {{
 *   precioVenta: number,
 *   comisionBruta: number,
 *   comisionAgente: number,
 *   gastosPeritaje: number,
 *   otrosGastos: number,
 *   totalGastos: number,
 *   beneficioNeto: number,
 *   margenPct: number
 * }}
 */
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

/**
 * Genera el resumen financiero mensual a partir de un array de ventas.
 * @param {Array<{
 *   precioVenta: number,
 *   pctComision: number,
 *   comisionAgente: number,
 *   gastosPeritaje: number,
 *   otrosGastos: number
 * }>} ventas
 * @returns {{
 *   numVentas: number,
 *   volumenTotal: number,
 *   comisionesTotales: number,
 *   comisionesAgentes: number,
 *   gastosTotales: number,
 *   beneficioNeto: number,
 *   margenMedioPct: number,
 *   desglose: Array
 * }}
 */
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

/**
 * Formatea un número como moneda EUR.
 * @param {number} valor
 * @returns {string} Ej: "12.500,00 €"
 */
const formatearEuros = (valor) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor);

module.exports = {
  calcularComisionBruta,
  calcularComisionAgente,
  calcularBeneficioNeto,
  generarResumenMensual,
  formatearEuros
};
