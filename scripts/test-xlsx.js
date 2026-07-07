const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../../doc/calendario_teste.xlsx')
const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' })

const sheet = workbook.Sheets['Calendário'] || workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

let headerIndex = -1
for (let i = 0; i < rows.length; i++) {
  if (Array.isArray(rows[i]) && rows[i].includes('Nº')) {
    headerIndex = i
    break
  }
}

console.log('Header index:', headerIndex)
console.log('Headers:', rows[headerIndex])
console.log('Primeiras 3 linhas de dados:')
console.log(rows.slice(headerIndex + 1, headerIndex + 4))
