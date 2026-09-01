/**
 * Utilidad de sanitización para prevenir ataques de CSV/Formula Injection.
 * Bloquea la ejecución de fórmulas en hojas de cálculo (Excel, LibreOffice, Google Sheets)
 * cuando se exportan datos introducidos por usuarios (nicks, notas, nombres).
 */
export function sanitizeCSVField(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  
  // Si la celda comienza con caracteres de fórmula de Excel, anteponemos un apóstrofe seguro (')
  if (/^[=+\-@\t\r%]/.test(str)) {
    str = "'" + str;
  }
  
  // Escapamos comillas dobles internas duplicándolas
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Convierte un arreglo de objetos en una cadena CSV sanitizada.
 * @param {Array<string>} headers - Nombres de las columnas
 * @param {Array<Array<any>>} rows - Filas con sus respectivos valores
 */
export function buildSanitizedCSV(headers, rows) {
  const headerLine = headers.map(h => `"${h}"`).join(',');
  const rowLines = rows.map(row => row.map(sanitizeCSVField).join(','));
  return [headerLine, ...rowLines].join('\n');
}
