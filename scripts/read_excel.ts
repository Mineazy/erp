import * as XLSX from 'xlsx';

const path = 'C:\\Users\\Administrator\\Downloads\\stock-by-location-matrix.xlsx';
const workbook = XLSX.readFile(path);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Headers:', data[0]);
console.log('Row 1:', data[1]);
