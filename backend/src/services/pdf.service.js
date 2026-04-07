const PdfPrinter = require('pdfmake');
const path = require('path');

const fonts = {
  Roboto: {
    normal:      path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
    bold:        path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
    italics:     path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
    bolditalics: path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js')
  }
};

const COLORS = {
  primary:   '#1a3a5c',
  secondary: '#2d7dd2',
  accent:    '#f0a500',
  light:     '#f5f7fa',
  gray:      '#64748b',
  border:    '#e2e8f0'
};

const cabeceraCorporativa = (tipo) => [
  {
    columns: [
      {
        stack: [
          { text: 'INMOBILIARIA', style: 'brandName' },
          { text: 'CRM Inmobiliario', style: 'brandSub' }
        ],
        width: '*'
      },
      {
        stack: [
          { text: tipo.toUpperCase().replace(/_/g, ' '), style: 'docType' },
          { text: `Fecha: ${new Date().toLocaleDateString('es-ES')}`, style: 'docDate' }
        ],
        alignment: 'right',
        width: 'auto'
      }
    ]
  },
  { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 2, lineColor: COLORS.secondary }] },
  { text: '', margin: [0, 10] }
];

const seccionPartes = (contrato) => ({
  stack: [
    { text: 'PARTES INTERVINIENTES', style: 'sectionTitle' },
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          [{ text: 'Cliente', style: 'label' }, {
            text: `${contrato.cliente_nombre} ${contrato.cliente_apellidos}`,
            style: 'value'
          }],
          [{ text: 'DNI/NIE', style: 'label' }, { text: contrato.dni_nie || '—', style: 'value' }],
          [{ text: 'Teléfono', style: 'label' }, { text: contrato.cliente_tel || '—', style: 'value' }],
          [{ text: 'Email', style: 'label' }, { text: contrato.cliente_email || '—', style: 'value' }],
          [{ text: 'Agente', style: 'label' }, {
            text: `${contrato.agente_nombre} ${contrato.agente_apellidos}`,
            style: 'value'
          }],
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 15]
    }
  ]
});

const seccionInmueble = (contrato) => ({
  stack: [
    { text: 'DATOS DEL INMUEBLE', style: 'sectionTitle' },
    {
      table: {
        widths: ['30%', '70%'],
        body: [
          [{ text: 'Referencia', style: 'label' }, { text: contrato.referencia, style: 'value' }],
          [{ text: 'Descripción', style: 'label' }, { text: contrato.titulo, style: 'value' }],
          [{ text: 'Dirección', style: 'label' }, {
            text: `${contrato.direccion}, ${contrato.ciudad} ${contrato.codigo_postal || ''}`,
            style: 'value'
          }],
          [{ text: 'Precio', style: 'label' }, {
            text: contrato.precio_acordado
              ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(contrato.precio_acordado)
              : '—',
            style: 'valueHighlight'
          }]
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 15]
    }
  ]
});

const pieConFirmas = () => ({
  stack: [
    { text: '', margin: [0, 30] },
    {
      columns: [
        { stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: COLORS.gray }] },
          { text: 'Firma del Cliente', style: 'firmLabel', margin: [0, 5] }
        ]},
        { stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: COLORS.gray }] },
          { text: 'Firma del Agente', style: 'firmLabel', margin: [0, 5] }
        ]},
        { stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: COLORS.gray }] },
          { text: 'Sello de la Inmobiliaria', style: 'firmLabel', margin: [0, 5] }
        ]}
      ]
    },
    { text: `Documento generado el ${new Date().toLocaleString('es-ES')}`, style: 'footer', margin: [0, 20] }
  ]
});

const generarContratoArras = (contrato) => ({
  content: [
    ...cabeceraCorporativa('Contrato de Arras'),
    { text: 'CONTRATO DE ARRAS PENITENCIALES', style: 'titulo' },
    { text: 'Al amparo del artículo 1454 del Código Civil', style: 'subtitulo' },
    seccionPartes(contrato),
    seccionInmueble(contrato),
    { text: 'CONDICIONES PACTADAS', style: 'sectionTitle' },
    {
      table: {
        widths: ['40%', '60%'],
        body: [
          [{ text: 'Importe de arras', style: 'label' }, {
            text: contrato.importe_arras
              ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(contrato.importe_arras)
              : '—',
            style: 'valueHighlight'
          }],
          [{ text: 'Fecha prevista de notaría', style: 'label' }, {
            text: contrato.fecha_notaria
              ? new Date(contrato.fecha_notaria).toLocaleDateString('es-ES')
              : '—',
            style: 'value'
          }]
        ]
      },
      layout: 'lightHorizontalLines',
      margin: [0, 5, 0, 15]
    },
    {
      text: 'En caso de desistimiento del comprador, éste perderá la cantidad entregada en concepto de arras. En caso de desistimiento del vendedor, éste deberá devolver el doble de la cantidad recibida.',
      style: 'clausulaText',
      margin: [0, 10, 0, 20]
    },
    pieConFirmas()
  ]
});

const generarHojaVisita = (contrato) => ({
  content: [
    ...cabeceraCorporativa('Hoja de Visita'),
    { text: 'HOJA DE VISITA', style: 'titulo' },
    seccionPartes(contrato),
    seccionInmueble(contrato),
    { text: 'El cliente declara haber visitado el inmueble arriba descrito en compañía del agente indicado, en la fecha que figura en este documento.', style: 'clausulaText', margin: [0, 10, 0, 20] },
    pieConFirmas()
  ]
});

const generarMandatoVenta = (contrato) => ({
  content: [
    ...cabeceraCorporativa('Mandato de Venta'),
    { text: 'MANDATO DE VENTA EN EXCLUSIVA', style: 'titulo' },
    seccionPartes(contrato),
    seccionInmueble(contrato),
    { text: 'CONDICIONES DEL MANDATO', style: 'sectionTitle' },
    {
      ul: [
        'El mandante autoriza a la inmobiliaria para comercializar el inmueble en exclusiva.',
        'La duración del mandato es de 6 meses prorrogables.',
        'La comisión pactada es la indicada en el expediente de la propiedad.',
        'La inmobiliaria podrá publicar el inmueble en portales y medios propios.'
      ],
      style: 'clausulaText',
      margin: [0, 5, 0, 20]
    },
    pieConFirmas()
  ]
});

const STYLES = {
  brandName:      { fontSize: 20, bold: true, color: COLORS.primary },
  brandSub:       { fontSize: 10, color: COLORS.gray },
  docType:        { fontSize: 12, bold: true, color: COLORS.secondary },
  docDate:        { fontSize: 10, color: COLORS.gray },
  titulo:         { fontSize: 16, bold: true, color: COLORS.primary, alignment: 'center', margin: [0, 10, 0, 5] },
  subtitulo:      { fontSize: 10, color: COLORS.gray, alignment: 'center', italics: true, margin: [0, 0, 0, 15] },
  sectionTitle:   { fontSize: 11, bold: true, color: COLORS.secondary, margin: [0, 10, 0, 5], decoration: 'underline' },
  label:          { fontSize: 9,  bold: true, color: COLORS.gray, fillColor: COLORS.light },
  value:          { fontSize: 10, color: '#1e293b' },
  valueHighlight: { fontSize: 11, bold: true, color: COLORS.accent },
  clausulaText:   { fontSize: 9,  color: COLORS.gray, lineHeight: 1.5 },
  firmLabel:      { fontSize: 8,  color: COLORS.gray, alignment: 'center' },
  footer:         { fontSize: 7,  color: COLORS.gray, italics: true, alignment: 'center' }
};

const generarPDF = (contrato) => {
  return new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(fonts);

      let docDefinition;
      switch (contrato.tipo) {
        case 'contrato_arras':  docDefinition = generarContratoArras(contrato); break;
        case 'hoja_visita':     docDefinition = generarHojaVisita(contrato);    break;
        case 'mandato_venta':   docDefinition = generarMandatoVenta(contrato);  break;
        default: throw new Error(`Tipo de documento no soportado: ${contrato.tipo}`);
      }

      docDefinition.styles      = STYLES;
      docDefinition.defaultStyle = { font: 'Roboto', fontSize: 10, lineHeight: 1.3 };
      docDefinition.pageMargins  = [40, 40, 40, 40];

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks = [];
      pdfDoc.on('data',  chunk => chunks.push(chunk));
      pdfDoc.on('end',   ()    => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', err   => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generarPDF };
