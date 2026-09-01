import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Zap, TrendingUp, Users, CalendarCheck } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { readIzinFile } from '../lib/excelReader'
import { hesaplaPuantaj } from '../lib/puantajEngine'
import MonthSelector from '../components/MonthSelector'
import PuantajTable from '../components/PuantajTable'
import DownloadButton from '../components/DownloadButton'
import SearchBar from '../components/SearchBar'

const bugun = new Date()

export default function DashboardPage() {
  const [yil, setYil] = useState(bugun.getFullYear())
  const [ay, setAy] = useState(bugun.getMonth() + 1)
  const [puantajData, setPuantajData] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [personeller, setPersoneller] = useState([])
  const [templateBuffer, setTemplateBuffer] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('puantaj_welcome_shown'))

  // localStorage'dan kaydedilmiş personel varsa yükle
  useEffect(() => {
    try {
      const saved = localStorage.getItem('puantaj_personeller')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPersoneller(parsed)
          toast.success(`${parsed.length} personel geri yüklendi`)
        }
      }
    } catch {}
  }, [])

  // Puantaj üret (tamamen client-side)
  const puantajOlustur = useCallback(() => {
    if (personeller.length === 0) {
      toast.error('Önce izin verilerini (.xlsx) yükleyin')
      return
    }

    try {
      const data = hesaplaPuantaj(yil, ay, personeller)
      setPuantajData(data)
      toast.success(`${data.personeller.length} personel için puantaj üretildi`)
    } catch (err) {
      toast.error('Hesaplama hatası: ' + err.message)
    }
  }, [yil, ay, personeller])

  const handleAyChange = (yeniYil, yeniAy) => {
    setYil(yeniYil)
    setAy(yeniAy)
    setPuantajData(null)
  }

  // İzin dosyası yükle (tarayıcıda parse)
  const handleIzinUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Sadece .xlsx dosyaları desteklenir')
      e.target.value = ''
      return
    }

    const loadingToast = toast.loading('Dosya okunuyor...')

    try {
      const parsed = await readIzinFile(file)
      setPersoneller(parsed)
      setPuantajData(null)

      // localStorage'a kaydet (oturumlar arası)
      localStorage.setItem('puantaj_personeller', JSON.stringify(parsed))

      toast.dismiss(loadingToast)
      toast.success(`${parsed.length} personel başarıyla yüklendi`, {
        description: file.name,
      })
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Dosya okunamadı', {
        description: err.message,
      })
    }
    e.target.value = ''
  }

  // İsim listesi (o ayın Ad/Soyad/TC Kimlik No şablonu) yükle
  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      toast.error('Sadece .xlsx dosyaları desteklenir')
      e.target.value = ''
      return
    }

    try {
      const buffer = await file.arrayBuffer()
      setTemplateBuffer(buffer)
      setTemplateName(file.name)
      toast.success('İsim listesi yüklendi', { description: file.name })
    } catch (err) {
      toast.error('Dosya okunamadı', { description: err.message })
    }
    e.target.value = ''
  }

  // Personel izin günü güncelleme (tablo içi edit)
  const handlePersonelUpdate = useCallback((id, yeniIzinGunu) => {
    setPersoneller(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, izin_gunu: yeniIzinGunu.toUpperCase().trim() } : p
      )
      localStorage.setItem('puantaj_personeller', JSON.stringify(updated))
      return updated
    })

    // Puantajı güncelle
    if (puantajData) {
      setTimeout(() => {
        const data = hesaplaPuantaj(yil, ay, personeller)
        setPuantajData(data)
      }, 100)
    }

    toast.success('İzin günü güncellendi')
  }, [puantajData, yil, ay, personeller])

  // Filtrelenmiş veri
  const filteredData = useMemo(() => {
    if (!puantajData) return null
    if (!searchQuery.trim()) return puantajData

    const q = searchQuery.toUpperCase().trim()
    const filtered = puantajData.personeller.filter(p =>
      p.ad_soyad.toUpperCase().includes(q)
    )
    return { ...puantajData, personeller: filtered }
  }, [puantajData, searchQuery])

  // İstatistikler
  const stats = puantajData ? (() => {
    const toplam = puantajData.personeller.length
    const gunSayisi = puantajData.ay_gun_sayisi
    let htSayisi = 0
    puantajData.personeller.forEach(p => {
      Object.values(p.gunler).forEach(v => { if (v === 'HT') htSayisi++ })
    })
    const isSayisi = toplam * gunSayisi - htSayisi
    return { toplam, gunSayisi, htSayisi, isSayisi }
  })() : null

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-800 selection:bg-indigo-100">

      {/* Toast Container */}
      <Toaster
        position="top-right"
        duration={3500}
        closeButton={true}
        toastOptions={{
          style: {
            borderRadius: '14px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          },
        }}
        richColors
      />

      {/* ═══ Hoş Geldin Ekranı — YÜKSEK ENERJİ ═══ */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          >
            {/* Animated gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(-45deg, #6366f1, #8b5cf6, #ec4899, #f43f5e, #6366f1)',
                backgroundSize: '400% 400%',
                animation: 'welcomeGradient 6s ease infinite',
              }}
            />

            {/* Konfeti Yağmuru */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(50)].map((_, i) => {
                const colors = ['#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#a78bfa', '#fb923c', '#f87171', '#4ade80']
                const color = colors[i % colors.length]
                const size = 6 + Math.random() * 10
                const left = Math.random() * 100
                const delay = Math.random() * 3
                const duration = 2 + Math.random() * 3
                const rotate = Math.random() * 720 - 360
                return (
                  <motion.div
                    key={`confetti-${i}`}
                    className="absolute"
                    style={{
                      left: `${left}%`,
                      top: '-20px',
                      width: `${size}px`,
                      height: `${size * (0.4 + Math.random() * 0.6)}px`,
                      backgroundColor: color,
                      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    }}
                    animate={{
                      y: [0, window.innerHeight + 100],
                      x: [0, (Math.random() - 0.5) * 200],
                      rotate: [0, rotate],
                      opacity: [1, 1, 0],
                    }}
                    transition={{
                      duration,
                      delay,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )
              })}
            </div>

            {/* Pulsing glow rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute rounded-full border-2 border-white/20"
                  animate={{
                    scale: [1, 2.5, 4],
                    opacity: [0.6, 0.2, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 1,
                    ease: 'easeOut',
                  }}
                  style={{ width: 100, height: 100 }}
                />
              ))}
            </div>

            {/* Bouncing emojis */}
            <div className="absolute inset-0 pointer-events-none">
              {['🎉', '🔥', '💪', '⚡', '🚀', '🎊', '✨', '🏆'].map((emoji, i) => (
                <motion.span
                  key={`emoji-${i}`}
                  className="absolute text-3xl md:text-4xl select-none"
                  style={{
                    left: `${8 + i * 12}%`,
                    top: `${15 + (i % 3) * 30}%`,
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 1],
                    scale: [0, 1.2, 1],
                    y: [0, -20, 0, -15, 0],
                    rotate: [0, 15, -15, 10, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.3 + i * 0.15,
                    y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.2 },
                    rotate: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 + i * 0.3 },
                  }}
                />
              ))}
            </div>

            {/* Main content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.2 }}
              className="relative text-center px-8"
            >
              {/* Big drop-in emoji */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.5 }}
                className="text-8xl md:text-9xl mb-4 drop-shadow-2xl"
              >
                <motion.span
                  animate={{ rotate: [0, 14, -14, 14, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
                  className="inline-block"
                >
                  👋
                </motion.span>
              </motion.div>

              {/* Title with text shadow glow */}
              <motion.h1
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 120, delay: 0.7 }}
                className="text-5xl md:text-7xl font-black text-white mb-2 tracking-tight"
                style={{ textShadow: '0 0 40px rgba(255,255,255,0.3), 0 4px 20px rgba(0,0,0,0.2)' }}
              >
                ERSOY Abimmmmm
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 120, delay: 0.9 }}
                className="text-3xl md:text-4xl font-bold text-white/90 mb-12"
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.2)' }}
              >
                Hoş Geldin! 🎉🎉🎉
              </motion.p>

              {/* Epic button with pulse */}
              <motion.button
                initial={{ opacity: 0, y: 30, scale: 0.5 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, delay: 1.3 }}
                whileHover={{ scale: 1.08, boxShadow: '0 0 60px rgba(255,255,255,0.4)' }}
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  localStorage.setItem('puantaj_welcome_shown', 'true')
                  setShowWelcome(false)
                }}
                className="relative px-12 py-5 bg-white text-indigo-600 text-xl font-black rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.3)] cursor-pointer overflow-hidden"
              >
                {/* Shimmer effect on button */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100/60 to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 2, ease: 'easeInOut' }}
                />
                <span className="relative z-10">Hoşbuldum Damattt 😎🔥</span>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome gradient keyframes — injected inline */}
      <style>{`
        @keyframes welcomeGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      {/* Nav */}
      <nav className="h-14 px-6 flex items-center justify-between border-b border-black/[0.04] bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
            <CalendarCheck size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold text-slate-800 tracking-tight">PuantajPro</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all">
            <FileText size={14} />
            <span>İsim Listesi Yükle</span>
            <input type="file" accept=".xlsx" className="hidden" onChange={handleTemplateUpload} />
          </label>
          <div className="w-px h-5 bg-slate-200" />
          <label className="cursor-pointer flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all">
            <Upload size={14} />
            <span>İzin Verisi Yükle</span>
            <input type="file" accept=".xlsx" className="hidden" onChange={handleIzinUpload} />
          </label>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[12px] font-medium text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${templateBuffer ? 'bg-emerald-400' : 'bg-amber-400'} shadow-[0_0_4px_currentColor]`} />
            {templateBuffer ? templateName : 'Statik şablon'}
          </div>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[12px] font-medium text-slate-500">
            <div className={`w-1.5 h-1.5 rounded-full ${personeller.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'} shadow-[0_0_4px_currentColor]`} />
            {personeller.length > 0 ? `${personeller.length} kişi` : 'Boş'}
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="p-5 md:p-8 max-w-full">
        <div className="space-y-6">

          {/* Action Row */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-wrap items-center gap-3"
          >
            <MonthSelector yil={yil} ay={ay} onChange={handleAyChange} />

            <button
              onClick={puantajOlustur}
              className="group flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[13px] font-semibold rounded-xl hover:shadow-[0_4px_20px_rgba(99,102,241,0.35)] transition-all active:scale-[0.97]"
            >
              <Zap size={14} className="group-hover:rotate-12 transition-transform" />
              Üret
            </button>

            <DownloadButton
              yil={yil}
              ay={ay}
              disabled={!puantajData}
              puantajData={puantajData}
              templateBuffer={templateBuffer}
              templateName={templateName}
            />

            {puantajData && (
              <div className="ml-auto">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>
            )}
          </motion.div>

          {/* Stats Row */}
          <AnimatePresence>
            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
              >
                <StatCard icon={<Users size={16} />} label="Personel" value={stats.toplam} color="indigo" />
                <StatCard icon={<CalendarCheck size={16} />} label="Gün Sayısı" value={stats.gunSayisi} color="violet" />
                <StatCard icon={<TrendingUp size={16} />} label="İş Günü (Toplam)" value={stats.isSayisi.toLocaleString('tr-TR')} color="emerald" />
                <StatCard icon={<Zap size={16} />} label="HT Toplam" value={stats.htSayisi.toLocaleString('tr-TR')} color="rose" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <AnimatePresence mode="wait">
            {!puantajData && !yukleniyor && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="py-28 flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/60 flex items-center justify-center mb-5 shadow-sm">
                  <CalendarCheck size={28} className="text-indigo-400" strokeWidth={1.5} />
                </div>
                <p className="text-slate-800 font-semibold text-lg mb-1">Hazırız</p>
                <p className="text-slate-400 text-[13px] max-w-xs text-center leading-relaxed">
                  {personeller.length === 0
                    ? 'Üst menüden izin verilerini (.xlsx) yükleyin.'
                    : 'Tarihi seçip "Üret" butonuna tıklayın.'}
                </p>
              </motion.div>
            )}

            {yukleniyor && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="py-28 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-10 h-10 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-slate-400 text-[13px] font-medium">Hesaplanıyor...</p>
              </motion.div>
            )}

            {filteredData && !yukleniyor && (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <PuantajTable puantajData={filteredData} onPersonelUpdate={handlePersonelUpdate} />
                {searchQuery && (
                  <p className="text-center text-slate-400 text-xs mt-3">
                    {filteredData.personeller.length} / {puantajData.personeller.length} sonuç gösteriliyor
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

/* ───── Sub-Component ───── */
function StatCard({ icon, label, value, color }) {
  const colorMap = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-500/10',
    violet: 'from-violet-500/10 to-violet-500/5 text-violet-600 border-violet-500/10',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/10',
    rose: 'from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-500/10',
  }
  const bgClass = colorMap[color] || colorMap.indigo

  return (
    <div className="bg-white rounded-2xl p-4 border border-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
          {icon}
        </div>
        <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-800 tracking-tight">{value}</p>
    </div>
  )
}
