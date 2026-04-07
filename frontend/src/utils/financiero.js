/**
 * ============================================================
 * financiero.js — Cálculos financieros (uso en frontend)
 * ============================================================
 * Entregable 4: Función JavaScript de cálculo de beneficio
 * ============================================================
 */

/**
 * Calcula la comisión bruta de la agencia sobre el precio de venta.
 * @param {number} precioVenta  - Precio final de venta en €
 * @param {number} pctComision  - % que carga la inmobiliaria (ej: 3)
 * @returns {number}
 */
export const calcularComisionBruta = (precioVenta, pctComision = 3) => {
  if (!precioVenta || precioVenta <= 0) return 0
  return +(precioVenta * pctComision / 100).toFixed(2)
}

/**
 * Calcula la comisión que percibe el agente.
 * El agente recibe el 5% de la comisión neta ingresada por la agencia.
 *
 * @param {number} comisionNetaAgencia - Comisión neta recibida por la inmobiliaria en €
 * @param {number} pctAgente           - Porcentaje del agente sobre esa comisión (default: 5%)
 * @returns {number} Importe a pagar al agente en €
 *
 * @example
 *   calcularComisionAgente(6000)      // → 300  (5% de 6.000€)
 *   calcularComisionAgente(6000, 8)   // → 480  (8% de 6.000€)
 */
export const calcularComisionAgente = (comisionNetaAgencia, pctAgente = 5) => {
  if (!comisionNetaAgencia || comisionNetaAgencia <= 0) return 0
  return +(comisionNetaAgencia * pctAgente / 100).toFixed(2)
}

/**
 * Calcula el beneficio neto de la empresa para una operación.
 *
 * Fórmula:
 *   Comisión Bruta = precioVenta × pctComision / 100
 *   Comisión Agente = comisionBruta × 5 / 100    (si no se pasa)
 *   Beneficio Neto = Comisión Bruta − Comisión Agente − gastosPeritaje − otrosGastos
 *
 * @param {number} precioVenta       - Precio de venta del inmueble en €
 * @param {number} pctComision       - % comisión de la agencia (ej: 3)
 * @param {number|null} comisionAgente - Si ya está calculado; null = calcular automáticamente
 * @param {number} gastosPeritaje    - Coste de peritaje/tasación en €
 * @param {number} otrosGastos       - Suma de otros gastos operativos en €
 *
 * @returns {{
 *   precioVenta:    number,
 *   comisionBruta:  number,
 *   comisionAgente: number,
 *   gastosPeritaje: number,
 *   otrosGastos:    number,
 *   totalGastos:    number,
 *   beneficioNeto:  number,
 *   margenPct:      number
 * }}
 *
 * @example
 *   calcularBeneficioNeto(200000, 3, null, 500, 200)
 *   // → { precioVenta: 200000, comisionBruta: 6000,
 *   //     comisionAgente: 300, gastosPeritaje: 500, otrosGastos: 200,
 *   //     totalGastos: 1000, beneficioNeto: 5000, margenPct: 83.33 }
 */
export const calcularBeneficioNeto = (
  precioVenta,
  pctComision    = 3,
  comisionAgente = null,
  gastosPeritaje = 0,
  otrosGastos    = 0
) => {
  const comisionBruta = calcularComisionBruta(precioVenta, pctComision)

  const agente  = comisionAgente !== null
    ? +Number(comisionAgente).toFixed(2)
    : calcularComisionAgente(comisionBruta, 5)

  const peritaje    = +Number(gastosPeritaje || 0).toFixed(2)
  const otros       = +Number(otrosGastos    || 0).toFixed(2)
  const totalGastos  = +(agente + peritaje + otros).toFixed(2)
  const beneficioNeto = +(comisionBruta - totalGastos).toFixed(2)
  const margenPct = comisionBruta > 0
    ? +((beneficioNeto / comisionBruta) * 100).toFixed(2)
    : 0

  return {
    precioVenta:    +Number(precioVenta).toFixed(2),
    comisionBruta,
    comisionAgente: agente,
    gastosPeritaje: peritaje,
    otrosGastos:    otros,
    totalGastos,
    beneficioNeto,
    margenPct
  }
}

/**
 * Genera el resumen financiero mensual a partir de un array de operaciones.
 * @param {Array} ventas
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
export const generarResumenMensual = (ventas = []) => {
  const desglose = ventas.map(v =>
    calcularBeneficioNeto(v.precioVenta, v.pctComision, v.comisionAgente, v.gastosPeritaje, v.otrosGastos)
  )

  const numVentas         = desglose.length
  const volumenTotal      = +desglose.reduce((s, d) => s + d.precioVenta,    0).toFixed(2)
  const comisionesTotales = +desglose.reduce((s, d) => s + d.comisionBruta,  0).toFixed(2)
  const comisionesAgentes = +desglose.reduce((s, d) => s + d.comisionAgente, 0).toFixed(2)
  const gastosTotales     = +desglose.reduce((s, d) => s + d.totalGastos,    0).toFixed(2)
  const beneficioNeto     = +desglose.reduce((s, d) => s + d.beneficioNeto,  0).toFixed(2)
  const margenMedioPct    = numVentas > 0
    ? +(desglose.reduce((s, d) => s + d.margenPct, 0) / numVentas).toFixed(2)
    : 0

  return { numVentas, volumenTotal, comisionesTotales, comisionesAgentes, gastosTotales, beneficioNeto, margenMedioPct, desglose }
}

/**
 * Formatea un número como moneda EUR (locale es-ES).
 * @param {number} valor
 * @returns {string}  "12.500,00 €"
 */
export const formatearEuros = (valor) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(valor || 0)
