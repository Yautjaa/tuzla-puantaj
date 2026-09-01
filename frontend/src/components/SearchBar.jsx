import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={`flex items-center gap-2 bg-white pl-3 pr-2 py-1.5 rounded-xl border transition-all ${
      focused ? 'border-indigo-300 shadow-[0_0_0_3px_rgba(99,102,241,0.1)]' : 'border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
    }`}>
      <Search size={14} className="text-slate-400 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Personel ara..."
        className="bg-transparent outline-none text-[13px] text-slate-700 placeholder:text-slate-400 w-40 md:w-52"
      />
      {value ? (
        <button onClick={() => onChange('')} className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={13} />
        </button>
      ) : (
        <kbd className="hidden md:inline text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 ml-1 tracking-wide">⌘K</kbd>
      )}
    </div>
  )
}
