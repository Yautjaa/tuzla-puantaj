/**
 * PuantajPro — Client-Side Excel Okuyucu
 * Tarayıcıda xlsx dosyasını parse eder.
 */
import * as XLSX from 'xlsx'

function normalize(s) {
  return String(s)
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .toUpperCase()
    .trim()
}

const HEADER_KEYWORDS = [
  'ad soyad', 'ad', 'soyad', 'isim', 'ad-soyad',
  'adi soyadi', 'adı soyadı', 'personel', 'personel adı',
]

/**
 * File nesnesinden personel listesini okur.
 * @param {File} file - xlsx dosyası
 * @returns {Promise<Array>} personeller [{id, ad_soyad, izin_gunu}, ...]
 */
export function readIzinFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        const personeller = []
        let idx = 0

        for (const row of rows) {
          if (!row || row.length < 2) continue

          const sira = row[0]
          const adSoyad = row[1]
          const izinGunu = row.length > 2 ? row[2] : ''

          if (!adSoyad) continue

          const adStr = String(adSoyad).trim()
          if (HEADER_KEYWORDS.includes(adStr.toLowerCase())) continue

          idx++
          let personelId
          try {
            personelId = parseInt(sira, 10)
            if (isNaN(personelId)) personelId = idx
          } catch {
            personelId = idx
          }

          personeller.push({
            id: personelId,
            ad_soyad: normalize(adStr),
            izin_gunu: normalize(String(izinGunu || '')),
          })
        }

        resolve(personeller)
      } catch (err) {
        reject(new Error('Excel dosyası okunamadı: ' + err.message))
      }
    }

    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsArrayBuffer(file)
  })
}
