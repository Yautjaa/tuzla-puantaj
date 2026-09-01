import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Mevcut (lokal FastAPI) uyumlu fonksiyonlar ──
// Vercel'de file_url parametresi eklenecek; lokal dev'de mevcut endpoint'ler çalışmaya devam eder.

export const getPersonel = () => api.get('/personel').then(r => r.data)

export const updatePersonel = (id, izin_gunu) =>
  api.put(`/personel/${id}`, { izin_gunu }).then(r => r.data)

export const uploadIzin = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/personel/upload-izin', form).then(r => r.data)
}

export const getPuantaj = (yil, ay) =>
  api.get(`/puantaj/${yil}/${ay}`).then(r => r.data)

export const getDownloadUrl = (yil, ay) => `/api/puantaj/${yil}/${ay}/download`
