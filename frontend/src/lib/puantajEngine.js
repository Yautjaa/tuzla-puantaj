/**
 * PuantajPro — Client-Side Hesaplama Motoru
 * Tarayıcıda çalışır, sunucuya ihtiyaç duymaz.
 */

/**
 * İzin günü string'ini weekday numaralarına çevirir.
 * Örn: "PAZARTESI-SALI" → Set{0, 1}
 */
const GUN_MAP = {
  PAZARTESI: 0,
  SALI: 1,
  CARSAMBA: 2,
  ÇARSAMBA: 2,
  ÇARŞAMBA: 2,
  PERSEMBE: 3,
  PERŞEMBE: 3,
  CUMA: 4,
  CUMARTESI: 5,
  PAZAR: 6,
}

function normalizeGun(s) {
  return s
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/ş/gi, 'S')
    .replace(/ç/gi, 'C')
    .replace(/ğ/gi, 'G')
    .replace(/ö/gi, 'O')
    .replace(/ü/gi, 'U')
    .toUpperCase()
    .trim()
}

function parseIzinGunleri(izinGunuStr) {
  const gunler = new Set()
  if (!izinGunuStr) return gunler

  const parcalar = izinGunuStr.split('-')
  for (const parca of parcalar) {
    const normalized = parca.toUpperCase().trim()
    // Tüm varyasyonları dene
    for (const [key, value] of Object.entries(GUN_MAP)) {
      if (normalized === key || normalizeGun(parca) === normalizeGun(key)) {
        gunler.add(value)
        break
      }
    }
  }
  return gunler
}

/**
 * Belirli bir yıl ve ay için puantaj hesaplar.
 * @param {number} yil
 * @param {number} ay (1-12)
 * @param {Array} personeller - [{id, ad_soyad, izin_gunu}, ...]
 * @returns {Object} puantajData
 */
export function hesaplaPuantaj(yil, ay, personeller) {
  const ayGunSayisi = new Date(yil, ay, 0).getDate() // ay'ın son günü

  const puantajList = personeller.map(p => {
    const izinGunleri = parseIzinGunleri(p.izin_gunu)
    const gunler = {}

    for (let gun = 1; gun <= ayGunSayisi; gun++) {
      const tarih = new Date(yil, ay - 1, gun)
      const haftaninGunu = tarih.getDay() // 0=Pazar, 1=Pazartesi...
      // JS: 0=Pazar, Python: 0=Pazartesi. Dönüştür:
      const pyWeekday = haftaninGunu === 0 ? 6 : haftaninGunu - 1
      gunler[String(gun)] = izinGunleri.has(pyWeekday) ? 'HT' : 'X'
    }

    return {
      ad_soyad: p.ad_soyad,
      izin_gunu: p.izin_gunu,
      gunler,
    }
  })

  return {
    yil,
    ay,
    ay_gun_sayisi: ayGunSayisi,
    personeller: puantajList,
  }
}
