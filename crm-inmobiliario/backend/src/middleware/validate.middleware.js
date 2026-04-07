const { validationResult } = require('express-validator');

/**
 * Middleware: Evalúa los errores de express-validator y los devuelve formateados
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Datos de entrada inválidos',
      detalles: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

module.exports = { validate };
