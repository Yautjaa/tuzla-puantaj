import { ArrowDownToLine, Loader2 } from 'lucide-react'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { useState } from 'react'

const AY_ISIMLERI = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

const normalize = (s) => {
  if (!s) return ''
  return s
    .toString()
    .normalize('NFC')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .toUpperCase()
    .replace(/Ş/g, 'S')
    .replace(/Ç/g, 'C')
    .replace(/Ğ/g, 'G')
    .replace(/Ö/g, 'O')
    .replace(/Ü/g, 'U')
    .replace(/[^A-Z0-9]/g, '')
}

// templateBuffer: kullanıcının yüklediği isim listesi (ArrayBuffer) — verilmezse
// eskisi gibi /liste_template.xlsx statik dosyasına düşer (geriye dönük uyumluluk).
export default function DownloadButton({ yil, ay, disabled, puantajData, templateBuffer, templateName }) {
  const [loading, setLoading] = useState(false)

  const indir = async () => {
    if (!puantajData || !puantajData.personeller?.length) {
      toast.error('Önce puantaj üretmelisiniz')
      return
    }

    try {
      setLoading(true)
      const gunSayisi = puantajData.ay_gun_sayisi

      let arrayBuffer
      if (templateBuffer) {
        // Kullanıcının bu oturumda yüklediği güncel isim listesi
        arrayBuffer = templateBuffer
      } else {
        const response = await fetch('/liste_template.xlsx')
        if (!response.ok) throw new Error('Template dosyası bulunamadı')
        arrayBuffer = await response.arrayBuffer()
      }

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(arrayBuffer)

      const ws = workbook.getWorksheet('Puantaj Bilgileri')
      if (!ws) throw new Error('Şablon içinde "Puantaj Bilgileri" sayfası bulunamadı')

      const tarih_sutunlari = {}

      // 1. satır tarih başlıklarını dinamik olarak ayarla (D sütunundan itibaren - Col 4)
      for (let gun = 1; gun <= 31; gun++) {
        const colIdx = gun + 3 // 1 -> Col 4 (D)
        const cell = ws.getCell(1, colIdx)

        if (gun <= gunSayisi) {
          cell.value = new Date(Date.UTC(yil, ay - 1, gun))
          tarih_sutunlari[gun] = colIdx
        } else {
          cell.value = '' // fazla günleri temizle
        }
      }

      // Her satırdaki personeli bul ve güncelle (Satır 2'den itibaren)
      const maxRow = ws.rowCount || 500
      let eslesmeyen = 0
      for (let rowIdx = 2; rowIdx <= maxRow; rowIdx++) {
        const adCell = ws.getCell(rowIdx, 1) // A
        const soyadCell = ws.getCell(rowIdx, 2) // B

        const ad = adCell.value?.richText ? adCell.value.richText.map(t => t.text).join('') : adCell.value
        const soyad = soyadCell.value?.richText ? soyadCell.value.richText.map(t => t.text).join('') : soyadCell.value

        if (!ad) break // isim alanı boşsa bitir

        const tamIsim = normalize(`${ad} ${soyad || ''}`)

        const personel = puantajData.personeller.find(
          p => normalize(p.ad_soyad) === tamIsim
        )

        if (personel) {
          for (let gun = 1; gun <= 31; gun++) {
            const colIdx = gun + 3
            ws.getCell(rowIdx, colIdx).value = ''
          }

          Object.entries(personel.gunler).forEach(([gunNoStr, deger]) => {
            const col = tarih_sutunlari[parseInt(gunNoStr)]
            if (col) {
              ws.getCell(rowIdx, col).value = deger
            }
          })
        } else {
          eslesmeyen++
        }
      }

      if (eslesmeyen > 0) {
        toast.warning(`${eslesmeyen} kişi izin listesiyle eşleşmedi`, {
          description: 'İsim listesi ile izin dosyasındaki adlar birebir aynı olmalı.',
        })
      }

      const outBuffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([outBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const filename = `puantaj_${yil}_${String(ay).padStart(2, '0')}_${AY_ISIMLERI[ay]}.xlsx`

      saveAs(blob, filename)

      toast.success('Excel indirildi', {
        description: templateBuffer ? `Şablon: ${templateName || 'yüklenen dosya'}` : filename,
      })
    } catch (err) {
      toast.error('İndirme hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={indir}
      disabled={disabled || loading}
      className="group flex items-center gap-2 px-5 py-2 bg-white text-slate-600 text-[13px] font-semibold rounded-xl border border-black/[0.06] hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin text-indigo-500" />
      ) : (
        <ArrowDownToLine size={14} className="group-hover:-translate-y-0.5 transition-transform" />
      )}
      <span>{loading ? 'Hazırlanıyor...' : 'Excel İndir'}</span>
    </button>
  )
}
