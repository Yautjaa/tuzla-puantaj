import { ChevronDown } from 'lucide-react'

const AYLAR = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık',
]

export default function MonthSelector({ yil, ay, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-white pl-4 pr-2 py-1.5 rounded-xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-sm">
      <input
        type="number"
        value={yil}
        onChange={e => onChange(parseInt(e.target.value), ay)}
        className="w-12 bg-transparent outline-none text-center font-semibold text-slate-700 p-0"
        min="2020" max="2099"
      />
      <span className="text-slate-300 mx-0.5">/</span>
      <div className="relative">
        <select
          value={ay}
          onChange={e => onChange(yil, parseInt(e.target.value))}
          className="bg-transparent outline-none cursor-pointer font-semibold text-slate-700 pr-6 pl-1 py-1 appearance-none"
        >
          {AYLAR.map((ad, i) => (
            <option key={i + 1} value={i + 1}>{ad}</option>
          ))}
        </select>
        <ChevronDown size={13} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  )
}
