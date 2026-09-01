# Puantaj Web Uygulaması Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `izin.xlsx` dosyasından personel listesini okuyarak seçilen ay/yıl için puantaj çizelgesi oluşturan ve Excel olarak indirilebilen bir web uygulaması.

**Architecture:** FastAPI backend (port 8000) personel yönetimi ve puantaj hesaplama işlemlerini üstlenir; React+Vite frontend (port 5173) büyük tablo görünümü ve indirme butonunu sunar. Backend dosya tabanlı depolama kullanır (izin.xlsx + liste_template.xlsx), veritabanı yoktur.

**Tech Stack:** Python 3.11+, FastAPI, openpyxl, uvicorn; React 18, Vite, Tailwind CSS, axios, @tanstack/react-table

---

## File Map

```
puantaj-app/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── logic.py             # izin_gunlerini_parse_et(), hesapla_puantaj()
│   ├── excel_handler.py     # read_izin_xlsx(), write_back_izin(), puantaj_excel_olustur()
│   ├── models.py            # Pydantic: Personel, PuantajResponse, GuncelleRequest
│   ├── requirements.txt
│   └── data/                # izin.xlsx burada saklanır (upload sonrası)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                        # Root bileşen, state yönetimi
│   │   ├── api/client.js                  # axios instance + API fonksiyonları
│   │   ├── components/
│   │   │   ├── MonthSelector.jsx          # Yıl input + ay dropdown
│   │   │   ├── PuantajTable.jsx           # @tanstack/react-table tablosu
│   │   │   ├── PersonelEditor.jsx         # İzin günü inline dropdown
│   │   │   └── DownloadButton.jsx         # Excel indirme
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js                     # proxy: /api → localhost:8000
│   └── tailwind.config.js
└── CLAUDE.md
```

---

### Task 1: Backend — Bağımlılıklar ve Temel Kurulum

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/data/.gitkeep`

- [ ] **Step 1: requirements.txt dosyasını oluştur**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
openpyxl==3.1.5
python-multipart==0.0.9
```

Dosya: `backend/requirements.txt`

- [ ] **Step 2: Sanal ortam oluştur ve bağımlılıkları kur**

```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
```

Beklenen: `Successfully installed fastapi uvicorn openpyxl python-multipart ...`

- [ ] **Step 3: data dizinini oluştur**

```bash
mkdir -p backend/data
touch backend/data/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt backend/data/.gitkeep
git commit -m "chore: backend dependencies and data directory"
```

---

### Task 2: Backend — Pydantic Modeller

**Files:**
- Create: `backend/models.py`

- [ ] **Step 1: models.py dosyasını oluştur**

```python
# backend/models.py
from pydantic import BaseModel
from typing import Optional


class Personel(BaseModel):
    id: int
    ad_soyad: str
    izin_gunu: str


class GuncelleRequest(BaseModel):
    izin_gunu: str


class PersonelPuantaj(BaseModel):
    ad_soyad: str
    izin_gunu: str
    gunler: dict[str, str]  # {"1": "X", "2": "HT", ...}


class PuantajResponse(BaseModel):
    yil: int
    ay: int
    ay_gun_sayisi: int
    personeller: list[PersonelPuantaj]
```

- [ ] **Step 2: Import edilebilir olduğunu doğrula**

```bash
cd backend && python -c "from models import Personel, PuantajResponse; print('OK')"
```

Beklenen: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/models.py
git commit -m "feat: pydantic models for personel and puantaj"
```

---

### Task 3: Backend — İş Mantığı (logic.py)

**Files:**
- Create: `backend/logic.py`

- [ ] **Step 1: logic.py dosyasını oluştur**

```python
# backend/logic.py
import calendar
from datetime import date

GUN_MAP = {
    "PAZARTESI": 0,
    "SALI": 1,
    "ÇARŞAMBA": 2,
    "PERŞEMBE": 3,
    "CUMA": 4,
    "CUMARTESI": 5,
    "PAZAR": 6,
}


def izin_gunlerini_parse_et(izin_gunu_str: str) -> set:
    """
    "ÇARŞAMBA"        → {2}
    "CUMARTESİ-PAZAR" → {5, 6}
    """
    gunler = set()
    for parca in izin_gunu_str.upper().strip().split("-"):
        parca = parca.strip()
        if parca in GUN_MAP:
            gunler.add(GUN_MAP[parca])
    return gunler


def hesapla_puantaj(yil: int, ay: int, izin_gunu_str: str) -> dict:
    """
    Returns: {"1": "X", "2": "HT", ...}
    Kural: Sadece izin.xlsx'te yazılı gün(ler) HT, diğerleri X.
    """
    izin_gunleri = izin_gunlerini_parse_et(izin_gunu_str)
    _, aydaki_gun_sayisi = calendar.monthrange(yil, ay)
    sonuc = {}

    for gun in range(1, aydaki_gun_sayisi + 1):
        haftanin_gunu = date(yil, ay, gun).weekday()
        sonuc[str(gun)] = "HT" if haftanin_gunu in izin_gunleri else "X"

    return sonuc
```

- [ ] **Step 2: Manuel test — ÇARŞAMBA Mart 2026**

```bash
cd backend && python -c "
from logic import hesapla_puantaj
r = hesapla_puantaj(2026, 3, 'ÇARŞAMBA')
ht = [k for k,v in r.items() if v=='HT']
print('HT gunler:', ht)
assert ht == ['4','11','18','25'], f'Beklenmedik: {ht}'
print('PASS')
"
```

Beklenen: `HT gunler: ['4', '11', '18', '25']` → `PASS`

- [ ] **Step 3: Manuel test — CUMARTESİ-PAZAR Mart 2026**

```bash
cd backend && python -c "
from logic import hesapla_puantaj
r = hesapla_puantaj(2026, 3, 'CUMARTESİ-PAZAR')
ht = [k for k,v in r.items() if v=='HT']
print('HT gunler:', ht)
assert ht == ['1','7','8','14','15','21','22','28','29'], f'Beklenmedik: {ht}'
print('PASS')
"
```

Beklenen: `HT gunler: ['1', '7', '8', '14', '15', '21', '22', '28', '29']` → `PASS`

- [ ] **Step 4: Commit**

```bash
git add backend/logic.py
git commit -m "feat: puantaj hesaplama iş mantığı (logic.py)"
```

---

### Task 4: Backend — Excel Handler

**Files:**
- Create: `backend/excel_handler.py`

- [ ] **Step 1: excel_handler.py dosyasını oluştur**

```python
# backend/excel_handler.py
import os
import unicodedata
from io import BytesIO
from typing import Optional

import openpyxl

IZIN_PATH = os.path.join(os.path.dirname(__file__), "data", "izin.xlsx")
TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "liste_template.xlsx")


def normalize(s: str) -> str:
    """Türkçe karakter sorunlarına karşı normalize et."""
    return unicodedata.normalize("NFC", s).upper().strip()


def read_izin_xlsx() -> list[dict]:
    """
    Returns:
        [{"id": 1, "ad_soyad": "AYŞE ARSLAN", "izin_gunu": "PERŞEMBE"}, ...]
    """
    if not os.path.exists(IZIN_PATH):
        return []

    wb = openpyxl.load_workbook(IZIN_PATH)
    ws = wb.active
    personeller = []

    for idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=1):
        # A=sıra no (veya idx), B=ad soyad, C=izin günü
        if len(row) < 3:
            continue
        # Sıra no'yu A sütunundan al, yoksa idx kullan
        sira = row[0] if row[0] is not None else idx
        ad_soyad = row[1]
        izin_gunu = row[2]

        if not ad_soyad or not izin_gunu:
            continue

        personeller.append({
            "id": int(sira),
            "ad_soyad": normalize(str(ad_soyad)),
            "izin_gunu": normalize(str(izin_gunu)),
        })

    return personeller


def write_back_izin(personeller: list[dict]) -> None:
    """
    İzin günü değişikliklerini izin.xlsx'e geri yaz.
    personeller: [{"id": 1, "ad_soyad": "...", "izin_gunu": "..."}, ...]
    """
    if not os.path.exists(IZIN_PATH):
        return

    wb = openpyxl.load_workbook(IZIN_PATH)
    ws = wb.active

    # id → izin_gunu map oluştur
    guncelleme_map = {p["id"]: p["izin_gunu"] for p in personeller}

    for idx, row in enumerate(ws.iter_rows(min_row=2), start=1):
        if len(row) < 3:
            continue
        sira_cell = row[0]
        izin_cell = row[2]
        sira = sira_cell.value if sira_cell.value is not None else idx
        if int(sira) in guncelleme_map:
            izin_cell.value = guncelleme_map[int(sira)]

    wb.save(IZIN_PATH)


def puantaj_excel_olustur(yil: int, ay: int, puantaj_data: list[dict]) -> bytes:
    """
    Template'i kopyala, puantaj verisiyle doldur, bytes olarak döndür.
    puantaj_data: [{"ad_soyad": "...", "gunler": {"1": "X", ...}}, ...]
    """
    wb = openpyxl.load_workbook(TEMPLATE_PATH)
    ws = wb["Puantaj Bilgileri"]

    # Başlık satırındaki tarih sütunlarını bul (D'den başlar)
    # Format: "1.03.2026" → gun=1
    tarih_sutunlari = {}  # {gun_no: sutun_indisi}
    for col_idx, cell in enumerate(ws[1], start=1):
        if cell.value and "." in str(cell.value):
            parca = str(cell.value).split(".")
            if len(parca) == 3:
                try:
                    gun_no = int(parca[0])
                    tarih_sutunlari[gun_no] = col_idx
                except ValueError:
                    pass

    # Her satırdaki personeli bul ve güncelle
    for row_idx in range(2, ws.max_row + 1):
        ad = ws.cell(row=row_idx, column=1).value
        soyad = ws.cell(row=row_idx, column=2).value
        if not ad:
            break

        tam_isim = normalize(f"{ad} {soyad}")

        # Bu personelin puantaj verisini bul
        personel_data = next(
            (p for p in puantaj_data if normalize(p["ad_soyad"]) == tam_isim),
            None,
        )

        if personel_data:
            for gun_no_str, deger in personel_data["gunler"].items():
                col = tarih_sutunlari.get(int(gun_no_str))
                if col:
                    ws.cell(row=row_idx, column=col).value = deger

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
```

- [ ] **Step 2: Commit**

```bash
git add backend/excel_handler.py
git commit -m "feat: excel okuma/yazma işlemleri (excel_handler.py)"
```

---

### Task 5: Backend — FastAPI Ana Uygulama

**Files:**
- Create: `backend/main.py`

- [ ] **Step 1: main.py dosyasını oluştur**

```python
# backend/main.py
import os
import shutil
from typing import Annotated

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from excel_handler import (
    IZIN_PATH,
    read_izin_xlsx,
    write_back_izin,
    puantaj_excel_olustur,
)
from logic import hesapla_puantaj
from models import (
    GuncelleRequest,
    Personel,
    PersonelPuantaj,
    PuantajResponse,
)

app = FastAPI(title="Puantaj API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory personel listesi (başlangıçta dosyadan yükle) ──────────────────
_personeller: list[dict] = []


def reload_personeller():
    global _personeller
    _personeller = read_izin_xlsx()


reload_personeller()


# ── Personel Yönetimi ────────────────────────────────────────────────────────

@app.get("/api/personel", response_model=list[Personel])
def get_personel():
    return _personeller


@app.put("/api/personel/{personel_id}", response_model=Personel)
def update_personel(personel_id: int, body: GuncelleRequest):
    for p in _personeller:
        if p["id"] == personel_id:
            p["izin_gunu"] = body.izin_gunu.upper().strip()
            write_back_izin(_personeller)
            return p
    raise HTTPException(status_code=404, detail="Personel bulunamadı")


@app.post("/api/personel/upload-izin")
async def upload_izin(file: UploadFile = File(...)):
    os.makedirs(os.path.dirname(IZIN_PATH), exist_ok=True)
    with open(IZIN_PATH, "wb") as f:
        shutil.copyfileobj(file.file, f)
    reload_personeller()
    return {"message": "izin.xlsx yüklendi", "personel_sayisi": len(_personeller)}


# ── Puantaj ──────────────────────────────────────────────────────────────────

@app.get("/api/puantaj/{yil}/{ay}", response_model=PuantajResponse)
def get_puantaj(yil: int, ay: int):
    import calendar

    if not (1 <= ay <= 12):
        raise HTTPException(status_code=400, detail="Geçersiz ay (1-12)")

    _, ay_gun_sayisi = calendar.monthrange(yil, ay)
    personeller_puantaj = []

    for p in _personeller:
        gunler = hesapla_puantaj(yil, ay, p["izin_gunu"])
        personeller_puantaj.append(
            PersonelPuantaj(
                ad_soyad=p["ad_soyad"],
                izin_gunu=p["izin_gunu"],
                gunler=gunler,
            )
        )

    return PuantajResponse(
        yil=yil,
        ay=ay,
        ay_gun_sayisi=ay_gun_sayisi,
        personeller=personeller_puantaj,
    )


@app.get("/api/puantaj/{yil}/{ay}/download")
def download_puantaj(yil: int, ay: int):
    if not (1 <= ay <= 12):
        raise HTTPException(status_code=400, detail="Geçersiz ay (1-12)")

    puantaj_data = []
    for p in _personeller:
        gunler = hesapla_puantaj(yil, ay, p["izin_gunu"])
        puantaj_data.append({"ad_soyad": p["ad_soyad"], "gunler": gunler})

    excel_bytes = puantaj_excel_olustur(yil, ay, puantaj_data)
    filename = f"{yil}-{ay:02d}-liste.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

- [ ] **Step 2: Backend'i başlat ve test et**

```bash
cd backend
source venv/Scripts/activate
uvicorn main:app --reload --port 8000
```

Beklenen: `INFO: Application startup complete.`

Yeni terminalde:
```bash
curl http://localhost:8000/api/personel
```
Beklenen: `[]` (izin.xlsx yüklenmediğinde boş liste)

- [ ] **Step 3: Commit**

```bash
git add backend/main.py
git commit -m "feat: fastapi endpoints — personel ve puantaj"
```

---

### Task 6: Frontend — Vite + React Kurulumu

**Files:**
- Create: `frontend/` (tüm Vite scaffold)
- Modify: `frontend/vite.config.js` — proxy ekle
- Create: `frontend/tailwind.config.js`

- [ ] **Step 1: Vite projesi oluştur**

```bash
cd x:/cc-workspace/puantaj
npm create vite@latest frontend -- --template react
```

- [ ] **Step 2: Bağımlılıkları kur**

```bash
cd frontend
npm install
npm install axios @tanstack/react-table
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: vite.config.js dosyasını güncelle — API proxy**

```js
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 4: tailwind.config.js dosyasını güncelle**

```js
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 5: src/index.css dosyasını Tailwind direktifleriyle değiştir**

Dosyanın tüm içeriğini şununla değiştir:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Frontend'i başlat**

```bash
cd frontend && npm run dev
```

Beklenen: `VITE v5.x.x ready in ... ms → Local: http://localhost:5173/`

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "chore: vite react frontend scaffold with tailwind and proxy"
```

---

### Task 7: Frontend — API Client

**Files:**
- Create: `frontend/src/api/client.js`

- [ ] **Step 1: client.js dosyasını oluştur**

```js
// frontend/src/api/client.js
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.js
git commit -m "feat: frontend api client"
```

---

### Task 8: Frontend — MonthSelector Bileşeni

**Files:**
- Create: `frontend/src/components/MonthSelector.jsx`

- [ ] **Step 1: MonthSelector.jsx dosyasını oluştur**

```jsx
// frontend/src/components/MonthSelector.jsx
const AYLAR = [
  'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'
]

export default function MonthSelector({ yil, ay, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="font-medium text-gray-700">Yıl:</label>
      <input
        type="number"
        value={yil}
        onChange={e => onChange(parseInt(e.target.value), ay)}
        className="w-24 border border-gray-300 rounded px-2 py-1 text-center"
        min="2020"
        max="2099"
      />
      <label className="font-medium text-gray-700">Ay:</label>
      <select
        value={ay}
        onChange={e => onChange(yil, parseInt(e.target.value))}
        className="border border-gray-300 rounded px-2 py-1"
      >
        {AYLAR.map((ad, i) => (
          <option key={i + 1} value={i + 1}>{ad}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/MonthSelector.jsx
git commit -m "feat: MonthSelector bileşeni"
```

---

### Task 9: Frontend — PersonelEditor (İzin Günü Dropdown)

**Files:**
- Create: `frontend/src/components/PersonelEditor.jsx`

- [ ] **Step 1: PersonelEditor.jsx dosyasını oluştur**

```jsx
// frontend/src/components/PersonelEditor.jsx
import { useState } from 'react'
import { updatePersonel } from '../api/client'

const GUN_SECENEKLERI = [
  'PAZARTESI','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESI','PAZAR'
]

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
      <span
        className="cursor-pointer text-blue-600 hover:underline"
        onClick={() => setEditing(true)}
        title="Düzenlemek için tıkla"
      >
        {personel.izin_gunu}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={secilen}
        onChange={e => setSecilen(e.target.value)}
        className="border border-gray-300 rounded px-1 py-0.5 text-sm"
        autoFocus
      >
        {GUN_SECENEKLERI.map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <button
        onClick={kaydet}
        disabled={yukleniyor}
        className="px-2 py-0.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
      >
        {yukleniyor ? '...' : '✓'}
      </button>
      <button
        onClick={() => { setEditing(false); setSecilen(personel.izin_gunu) }}
        className="px-2 py-0.5 bg-gray-300 rounded text-sm hover:bg-gray-400"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PersonelEditor.jsx
git commit -m "feat: PersonelEditor inline dropdown bileşeni"
```

---

### Task 10: Frontend — DownloadButton Bileşeni

**Files:**
- Create: `frontend/src/components/DownloadButton.jsx`

- [ ] **Step 1: DownloadButton.jsx dosyasını oluştur**

```jsx
// frontend/src/components/DownloadButton.jsx
import { getDownloadUrl } from '../api/client'

export default function DownloadButton({ yil, ay, disabled }) {
  const indir = () => {
    window.location.href = getDownloadUrl(yil, ay)
  }

  return (
    <button
      onClick={indir}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
    >
      ⬇ Excel İndir
    </button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/DownloadButton.jsx
git commit -m "feat: DownloadButton bileşeni"
```

---

### Task 11: Frontend — PuantajTable Bileşeni

**Files:**
- Create: `frontend/src/components/PuantajTable.jsx`

- [ ] **Step 1: PuantajTable.jsx dosyasını oluştur**

```jsx
// frontend/src/components/PuantajTable.jsx
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import PersonelEditor from './PersonelEditor'

export default function PuantajTable({ puantajData, onPersonelUpdate }) {
  const { ay_gun_sayisi, personeller } = puantajData

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'ad_soyad',
        header: 'Ad Soyad',
        accessorKey: 'ad_soyad',
        cell: info => (
          <span className="font-medium whitespace-nowrap">{info.getValue()}</span>
        ),
        size: 180,
      },
      {
        id: 'izin_gunu',
        header: 'İzin Günü',
        accessorKey: 'izin_gunu',
        cell: info => (
          <PersonelEditor
            personel={info.row.original._personel}
            onUpdate={onPersonelUpdate}
          />
        ),
        size: 140,
      },
    ]

    for (let gun = 1; gun <= ay_gun_sayisi; gun++) {
      const g = String(gun)
      cols.push({
        id: `gun_${g}`,
        header: String(gun),
        accessorFn: row => row.gunler[g],
        cell: info => {
          const val = info.getValue()
          return (
            <span className={val === 'HT' ? 'text-red-700 font-semibold' : ''}>
              {val}
            </span>
          )
        },
        size: 36,
      })
    }

    return cols
  }, [ay_gun_sayisi, onPersonelUpdate])

  const data = useMemo(
    () =>
      personeller.map(p => ({
        ...p,
        _personel: p,   // PersonelEditor için id + izin_gunu + ad_soyad
      })),
    [personeller]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-auto border border-gray-200 rounded-lg">
      <table className="text-sm border-collapse w-full">
        <thead className="bg-gray-100 sticky top-0 z-10">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th
                  key={header.id}
                  style={{ width: header.getSize(), minWidth: header.getSize() }}
                  className="border border-gray-200 px-2 py-1 text-center font-semibold text-gray-700 whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, ri) => (
            <tr
              key={row.id}
              className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              {row.getVisibleCells().map(cell => {
                const val = cell.getValue?.()
                const isHT = val === 'HT'
                return (
                  <td
                    key={cell.id}
                    className={`border border-gray-200 px-2 py-1 text-center ${
                      isHT ? 'bg-red-100' : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/PuantajTable.jsx
git commit -m "feat: PuantajTable bileşeni (@tanstack/react-table)"
```

---

### Task 12: Frontend — App.jsx (Root Bileşen)

**Files:**
- Modify: `frontend/src/App.jsx` — tüm içeriği yeniden yaz

- [ ] **Step 1: App.jsx dosyasını yaz**

```jsx
// frontend/src/App.jsx
import { useState, useEffect, useCallback } from 'react'
import MonthSelector from './components/MonthSelector'
import PuantajTable from './components/PuantajTable'
import DownloadButton from './components/DownloadButton'
import { getPuantaj, uploadIzin, getPersonel } from './api/client'

const bugun = new Date()

export default function App() {
  const [yil, setYil] = useState(bugun.getFullYear())
  const [ay, setAy] = useState(bugun.getMonth() + 1)
  const [puantajData, setPuantajData] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [personelSayisi, setPersonelSayisi] = useState(0)

  // Personel sayısını başlangıçta yükle
  useEffect(() => {
    getPersonel()
      .then(p => setPersonelSayisi(p.length))
      .catch(() => {})
  }, [])

  const puantajOlustur = useCallback(async (secilenYil, secilenAy) => {
    setYukleniyor(true)
    setHata(null)
    try {
      const data = await getPuantaj(secilenYil, secilenAy)
      setPuantajData(data)
    } catch (err) {
      setHata('Puantaj yüklenemedi: ' + (err.response?.data?.detail || err.message))
    } finally {
      setYukleniyor(false)
    }
  }, [])

  const handleAyChange = (yeniYil, yeniAy) => {
    setYil(yeniYil)
    setAy(yeniAy)
    setPuantajData(null)
  }

  const handleIzinUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const result = await uploadIzin(file)
      setPersonelSayisi(result.personel_sayisi)
      setPuantajData(null)
      alert(`izin.xlsx yüklendi — ${result.personel_sayisi} personel`)
    } catch (err) {
      alert('Yükleme başarısız: ' + err.message)
    }
    e.target.value = ''
  }

  const handlePersonelUpdate = useCallback((guncellendi) => {
    if (!puantajData) return
    // Personelin izin günü değişti — tabloyu yenile
    puantajOlustur(yil, ay)
  }, [puantajData, yil, ay, puantajOlustur])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-800">🗓 Puantaj Yönetimi</h1>
        <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium">
          📂 izin.xlsx Yükle
          <input type="file" accept=".xlsx" className="hidden" onChange={handleIzinUpload} />
        </label>
      </header>

      {/* Toolbar */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex flex-wrap items-center gap-4">
        <MonthSelector yil={yil} ay={ay} onChange={handleAyChange} />
        <button
          onClick={() => puantajOlustur(yil, ay)}
          disabled={yukleniyor}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {yukleniyor ? 'Yükleniyor...' : 'Puantaj Oluştur'}
        </button>
        <DownloadButton yil={yil} ay={ay} disabled={!puantajData} />
        {personelSayisi > 0 && (
          <span className="text-sm text-gray-500">{personelSayisi} personel</span>
        )}
      </div>

      {/* İçerik */}
      <main className="p-6">
        {hata && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {hata}
          </div>
        )}

        {!puantajData && !yukleniyor && (
          <div className="text-center py-20 text-gray-400">
            {personelSayisi === 0
              ? 'Önce izin.xlsx dosyasını yükleyin, ardından Puantaj Oluştur butonuna basın.'
              : 'Ay seçip "Puantaj Oluştur" butonuna basın.'}
          </div>
        )}

        {yukleniyor && (
          <div className="text-center py-20 text-gray-400">Hesaplanıyor...</div>
        )}

        {puantajData && !yukleniyor && (
          <PuantajTable
            puantajData={puantajData}
            onPersonelUpdate={handlePersonelUpdate}
          />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Eski App.css ve default icon importunu temizle**

`frontend/src/main.jsx` dosyasını kontrol et, `import './App.css'` satırı varsa `index.css` kalacak şekilde güncelle:

```jsx
// frontend/src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`frontend/src/App.css` dosyasını sil (varsa).

- [ ] **Step 3: Backend ve Frontend'i aynı anda başlat ve tam akışı test et**

Terminal 1:
```bash
cd backend && source venv/Scripts/activate && uvicorn main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend && npm run dev
```

Tarayıcıda `http://localhost:5173` aç.

Test adımları:
1. "izin.xlsx Yükle" butonuyla `backend/data/izin.xlsx` dosyasını yükle
2. Ay seçip "Puantaj Oluştur" butonuna bas — tablo görünmeli
3. HT hücrelerinin kırmızı arka planla geldiğini doğrula
4. İzin günü sütununa tıkla, değiştir, kaydet — tablo güncellemeli
5. "Excel İndir" ile dosyayı indir, içeriği kontrol et

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/main.jsx
git rm frontend/src/App.css 2>/dev/null || true
git commit -m "feat: App.jsx root bileşeni — tam entegrasyon"
```

---

## Spec Kapsamı Kontrolü

| Gereksinim | Karşılayan Task |
|---|---|
| izin.xlsx okuma (A/B/C sütun) | Task 4 — excel_handler.py `read_izin_xlsx()` |
| Tek/çift izin günü parse | Task 3 — logic.py `izin_gunlerini_parse_et()` |
| Puantaj hesaplama (X/HT) | Task 3 — logic.py `hesapla_puantaj()` |
| Cumartesi/Pazar otomatik HT yapılmaz | Task 3 — sadece izin.xlsx'teki gün HT |
| Personel listesi API | Task 5 — `GET /api/personel` |
| İzin günü güncelleme API + xlsx'e yazma | Task 5 — `PUT /api/personel/{id}` |
| izin.xlsx upload | Task 5 — `POST /api/personel/upload-izin` |
| Puantaj önizleme API | Task 5 — `GET /api/puantaj/{yil}/{ay}` |
| Excel indirme | Task 5 — `GET /api/puantaj/{yil}/{ay}/download` |
| Template kopyalama (Sheet 2 korunur) | Task 4 — `puantaj_excel_olustur()` |
| İsim eşleştirme (tek ↔ ayrı sütun) | Task 4 — normalize + ad+soyad concat |
| Ay geçişi (28/29/30/31 gün) | Task 3 — `calendar.monthrange()` |
| Türkçe karakter normalizasyonu | Task 4 — `unicodedata.normalize()` |
| MonthSelector bileşeni | Task 8 |
| PuantajTable (@tanstack) | Task 11 |
| PersonelEditor inline dropdown | Task 9 |
| DownloadButton | Task 10 |
| HT kırmızı arka plan | Task 11 — `bg-red-100` |
| izin.xlsx yükle butonu | Task 12 — App.jsx |
| CORS ayarı | Task 5 — main.py |
| Vite API proxy | Task 6 — vite.config.js |
| Dosya adı formatı ({yil}-{ay:02d}-liste.xlsx) | Task 5 — download endpoint |
