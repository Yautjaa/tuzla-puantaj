import { useState } from 'react'
import { updatePersonel } from '../api/client'
import { Check, X, Loader2 } from 'lucide-react'

const GUN_SECENEKLERI = [
  'PAZARTESI','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESI','PAZAR',
]

const GUN_KISA = {
  'PAZARTESI': 'Pzt',
  'SALI': 'Sal',
  'ÇARŞAMBA': 'Çar',
  'PERŞEMBE': 'Per',
  'CUMA': 'Cum',
  'CUMARTESI': 'Cts',
  'PAZAR': 'Paz',
}

export default function PersonelEditor({ personel, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [secilen, setSecilen] = useState(personel.izin_gunu)
  const [yukleniyor, setYukleniyor] = useState(false)

  const kaydet = async () => {
    setYukleniyor(true)
    try {
      const guncellendi = await updatePersonel(personel.id, secilen)
      onUpdate(guncellendi)
      setEditing(false)
    } catch (err) {
      alert('Güncelleme başarısız: ' + err.message)
    } finally {
      setYukleniyor(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer min-w-[32px]"
      >
        {GUN_KISA[personel.izin_gunu] || personel.izin_gunu}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-200 absolute z-50 shadow-lg -ml-2">
      <select
        value={secilen}
        onChange={e => setSecilen(e.target.value)}
        className="text-[11px] font-medium text-slate-700 outline-none bg-slate-50 rounded px-1.5 py-0.5 appearance-none border-0"
        autoFocus
      >
        {GUN_SECENEKLERI.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <button onClick={kaydet} disabled={yukleniyor} className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50">
        {yukleniyor ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} strokeWidth={2.5} />}
      </button>
      <button onClick={() => { setEditing(false); setSecilen(personel.izin_gunu) }} className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
        <X size={12} strokeWidth={2.5} />
      </button>
    </div>
  )
}
