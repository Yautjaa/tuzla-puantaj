# Puantaj Web Uygulaması — CLAUDE.md

## Proje Özeti

Aylık puantaj çizelgesi oluşturan bir web uygulaması. Personel listesi ve haftalık izin günlerini içeren `izin.xlsx` dosyasından okuyarak, seçilen ay/yıl için her personelin çalışma/izin durumunu otomatik hesaplar ve Excel formatında indirilmeye hazır puantaj üretir.

---

## İş Mantığı (Business Logic)

### Temel Kural
Her personelin haftanın belirli bir günü sabit izin günü vardır (`izin.xlsx` C sütunu).

Aylık puantaj doldurmada **tek kural şudur:**
- O ayda **personelin izin gününe denk gelen tarihler** → `HT`
- **Diğer tüm günler** → `X`

> ⚠️ Cumartesi ve Pazar otomatik olarak HT **YAPILMAZ.** Eğer bir personelin izin günü CUMARTESI veya PAZAR ise, o günler zaten `izin.xlsx`'te o şekilde yazıyor. Sadece yazılı olan güne göre işlem yapılır.

**Örnek:** ABDULBAKİ DEMİRTAŞ → ÇARŞAMBA
- Mart 2026'da Çarşamba'ya denk gelen günler: 4, 11, 18, 25 → `HT`
- 1, 2, 3, 5, 6, 7, 8, 9, 10, 12, ... → `X`

### Türkçe Gün Adı → Python weekday() Eşleşmesi
```python
GUN_MAP = {
    "PAZARTESI": 0,
    "SALI": 1,
    "ÇARŞAMBA": 2,
    "PERŞEMBE": 3,
    "CUMA": 4,
    "CUMARTESI": 5,
    "PAZAR": 6,
}
```

### ⚠️ Önemli: Birden Fazla İzin Günü
`izin.xlsx` C sütununda bazı personelin **iki izin günü** tire ile ayrılmış yazabilir:
- Tek gün: `ÇARŞAMBA`
- İki gün: `CUMARTESİ-PAZAR`

Bu yüzden C sütunu **her zaman `-` karakterine göre split edilmeli**, birden fazla gün varsa hepsi HT sayılmalı.

### Hesaplama Algoritması
```python
import calendar
from datetime import date

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
    Returns: {gun_no: "X" veya "HT"}
    Kural: Sadece izin.xlsx'te yazılı gün(ler) HT, diğerleri X.
    """
    izin_gunleri = izin_gunlerini_parse_et(izin_gunu_str)
    _, aydaki_gun_sayisi = calendar.monthrange(yil, ay)
    sonuc = {}

    for gun in range(1, aydaki_gun_sayisi + 1):
        haftanin_gunu = date(yil, ay, gun).weekday()
        sonuc[gun] = "HT" if haftanin_gunu in izin_gunleri else "X"

    return sonuc

# Örnek 1: ABDULBAKİ DEMİRTAŞ → ÇARŞAMBA, Mart 2026
# HT günler: 4, 11, 18, 25
# Diğerleri: X

# Örnek 2: ERSOY AY → CUMARTESİ-PAZAR, Mart 2026
# HT günler: 1, 7, 8, 14, 15, 21, 22, 28, 29
# Diğerleri: X
```

---

## Veri Yapısı

### izin.xlsx Formatı
| Sütun | İçerik | Örnek |
|-------|--------|-------|
| A | Sıra No | 1, 2, 3 |
| B | Ad Soyad (tek sütun, tam isim) | `AYŞE ARSLAN` |
| C | Haftalık izin günü (Türkçe gün adı) | `PERŞEMBE` |

**Önemli:** İzin günü nadiren değişebilir, bu yüzden uygulama içinden düzenlenebilir olmalı.

### Liste Template Formatı (2026-03-liste.xlsx)
- **Sheet 1:** `Puantaj Bilgileri`
  - A sütunu: Ad (sadece isim)
  - B sütunu: Soyad
  - C sütunu: TC Kimlik No
  - D sütunundan itibaren: Her sütun = o ayın bir günü (1.03.2026, 2.03.2026, ...)
  - Sütun başlıkları: `{gun}.{ay}.{yil}` formatında (örn. `1.03.2026`)
  - Tüm veriler başlangıçta `X` ile dolu

- **Sheet 2:** `Gün Tipleri` — DEĞİŞTİRME, olduğu gibi kalsın

### Eşleştirme Mantığı (İzin ↔ Liste)
`izin.xlsx`'te isim tek sütunda (`AYŞE ARSLAN`), `liste.xlsx`'te ayrı sütunlarda (`Ad: AYŞE`, `Soyad: ARSLAN`).

Eşleştirme için:
```python
# izin.xlsx'ten
tam_isim = "AYŞE ARSLAN"

# liste.xlsx'te ara
for satir in liste_satırlari:
    liste_tam_isim = f"{satir['Ad']} {satir['Soyad']}".upper().strip()
    if liste_tam_isim == tam_isim.upper().strip():
        # eşleşti
```

---

## Teknik Stack

### Backend
- **Python 3.11+**
- **FastAPI** — REST API
- **openpyxl** — Excel okuma/yazma (xlrd değil, openpyxl kullan — `.xlsx` formatı için)
- **httpx** — UploadThing'den dosya indirmek için async HTTP client
- **uvicorn** — ASGI sunucu (lokal geliştirme)

### Frontend
- **React** (Vite ile)
- **Tailwind CSS** — stil
- **axios** — HTTP istekleri
- **@tanstack/react-table** — büyük veri tablosu (255+ satır)
- **@uploadthing/react** — dosya yükleme bileşeni

### Deployment & Depolama
- **Vercel** — hem frontend hem backend host (Python Serverless Functions)
- **UploadThing** — `izin.xlsx` dosyasını kalıcı olarak saklamak için

### ⚠️ Vercel Mimarisi Notu
Vercel'de **kalıcı dosya sistemi yoktur.** Her serverless function çağrısı sıfırdan başlar. Bu yüzden:
- `izin.xlsx` → UploadThing'de saklanır, her işlemde URL üzerinden indirilir
- `liste_template.xlsx` → **kodla birlikte deploy edilir** (`backend/templates/` klasörüne koyulur, değişmez)
- Personel listesi → her request'te `izin.xlsx` UploadThing URL'inden okunur; URL environment variable olarak saklanır (`IZIN_FILE_URL`)

### Proje Klasör Yapısı
```
puantaj-app/
├── api/
│   └── index.py             # Vercel entry point (FastAPI app'i import eder)
├── backend/
│   ├── main.py              # FastAPI uygulaması
│   ├── logic.py             # Puantaj hesaplama mantığı
│   ├── excel_handler.py     # Excel okuma/yazma + UploadThing entegrasyonu
│   ├── models.py            # Pydantic modeller
│   └── templates/
│       └── liste_template.xlsx   # Değişmez template, kodla birlikte deploy edilir
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── PuantajTable.jsx     # Ana tablo görünümü
│   │   │   ├── PersonelEditor.jsx   # İzin günü düzenleme
│   │   │   ├── MonthSelector.jsx    # Ay/yıl seçici
│   │   │   └── DownloadButton.jsx   # İndirme butonu
│   │   └── api/
│   │       └── client.js
│   ├── package.json
│   └── vite.config.js
├── requirements.txt
├── vercel.json
└── CLAUDE.md
```

---

## API Endpointleri

### Personel Yönetimi
```
GET    /api/personel              → Tüm personel listesi + izin günleri
PUT    /api/personel/{id}         → Personelin izin gününü güncelle
POST   /api/personel/upload-izin  → Yeni izin.xlsx yükle (listeyi yenile)
```

### Puantaj Oluşturma
```
GET    /api/puantaj/{yil}/{ay}    → O ay için hesaplanmış puantaj verisi (önizleme)
GET    /api/puantaj/{yil}/{ay}/download  → Doldurulmuş Excel dosyasını indir
```

### Response Örnekleri

**GET /api/personel**
```json
[
  {
    "id": 1,
    "ad_soyad": "AYŞE ARSLAN",
    "izin_gunu": "PERŞEMBE"
  }
]
```

**GET /api/puantaj/2026/3**
```json
{
  "yil": 2026,
  "ay": 3,
  "ay_gun_sayisi": 31,
  "personeller": [
    {
      "ad_soyad": "AYŞE ARSLAN",
      "izin_gunu": "PERŞEMBE",
      "gunler": {
        "1": "X",
        "2": "X",
        "3": "X",
        "4": "HT",
        "5": "X",
        "6": "X",
        "7": "X",
        "8": "X",
        "11": "HT",
        "18": "HT",
        "25": "HT"
      }
      // AYŞE ARSLAN → PERŞEMBE → Mart 2026'da 5,12,19,26 HT olurdu
      // ABDULBAKİ DEMİRTAŞ → ÇARŞAMBA → 4,11,18,25 HT
    }
  ]
}
```

---

## Excel İndirme Mantığı

İndirme sırasında `2026-03-liste.xlsx` template'i baz alınacak:

```python
import openpyxl
from copy import deepcopy
from io import BytesIO

def puantaj_excel_olustur(yil: int, ay: int, puantaj_data: list) -> bytes:
    """
    Template'i kopyala, puantaj verisiyle doldur, bytes olarak döndür.
    """
    # Template dosyasını yükle
    wb = openpyxl.load_workbook("templates/liste_template.xlsx")
    ws = wb["Puantaj Bilgileri"]

    # Başlık satırındaki tarih sütunlarını bul (D'den başlar)
    # Format: "1.03.2026" → gun=1
    tarih_sutunlari = {}  # {gun_no: sutun_indisi}
    for col_idx, cell in enumerate(ws[1], start=1):
        if cell.value and "." in str(cell.value):
            parca = str(cell.value).split(".")
            if len(parca) == 3:
                gun_no = int(parca[0])
                tarih_sutunlari[gun_no] = col_idx

    # Her satırdaki personeli bul ve güncelle
    for row_idx in range(2, ws.max_row + 1):
        ad = ws.cell(row=row_idx, column=1).value
        soyad = ws.cell(row=row_idx, column=2).value
        if not ad:
            break

        tam_isim = f"{ad} {soyad}".upper().strip()

        # Bu personelin puantaj verisini bul
        personel_data = next(
            (p for p in puantaj_data if p["ad_soyad"] == tam_isim),
            None
        )

        if personel_data:
            for gun_no, deger in personel_data["gunler"].items():
                col = tarih_sutunlari.get(int(gun_no))
                if col:
                    ws.cell(row=row_idx, column=col).value = deger

    # Dosya adı: "{yil}-{ay:02d}-liste.xlsx"
    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
```

---

## Frontend Bileşenleri

### Ana Sayfa Düzeni
```
┌────────────────────────────────────────────────────────┐
│  🗓 PUANTAJ YÖNETİMİ                    [izin.xlsx Yükle] │
├────────────┬───────────────────────────────────────────┤
│ Yıl: [2026]│ Ay: [Mart ▼]     [Puantaj Oluştur] [⬇ İndir] │
├────────────┴───────────────────────────────────────────┤
│ Ad Soyad      │ İzin Günü │ 1 │ 2 │ 3 │...│ 31 │      │
├───────────────┼───────────┼───┼───┼───┼───┼────┤      │
│ AYŞE ARSLAN   │ PERŞEMBE  │ X │ X │HT │...│ X  │      │
│ ALİ YILMAZ    │ CUMA      │ X │ X │HT │...│HT  │      │
│ ...           │           │   │   │   │   │    │      │
└───────────────────────────────────────────────────────┘
```

### Renk Kodlaması (Tablo)
- `HT` hücreleri: Açık kırmızı arka plan (`bg-red-100`)
- `X` hücreleri: Beyaz/normal
- İzin günü sütunları: Hafif sarı vurgu

### PersonelEditor Komponenti
- Tablo içinde "İzin Günü" sütununa tıklanınca dropdown açılır
- 7 seçenek: PAZARTESI, SALI, ÇARŞAMBA, PERŞEMBE, CUMA, CUMARTESI, PAZAR
- Kaydet butonuna basınca `PUT /api/personel/{id}` çağrılır
- Tablo anında güncellenir

---

## Kurulum Adımları (Claude Code'un yapması gerekenler)

### 1. Backend Kurulumu
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install fastapi uvicorn openpyxl python-multipart httpx
```

`requirements.txt` içeriği:
```
fastapi
uvicorn
openpyxl
python-multipart
httpx
```

### 2. Frontend Kurulumu
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install axios @tanstack/react-table uploadthing @uploadthing/react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Lokal Çalıştırma
```bash
# Backend (port 8000)
uvicorn backend.main:app --reload

# Frontend (port 5173)
cd frontend && npm run dev
```

### 4. Vercel Yapılandırması

`vercel.json` (proje kökünde):
```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    },
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

`api/index.py` (Vercel entry point):
```python
from backend.main import app  # FastAPI app'i buradan import et
```

### 5. Environment Variables (Vercel Dashboard'a ekle)

| Değişken | Açıklama |
|----------|----------|
| `UPLOADTHING_SECRET` | UploadThing dashboard'dan alınır |
| `UPLOADTHING_APP_ID` | UploadThing dashboard'dan alınır |
| `IZIN_FILE_URL` | En son yüklenen izin.xlsx'in UploadThing URL'i |

### 6. UploadThing Entegrasyonu

**Dosya yükleme akışı:**
1. Kullanıcı frontend'de `izin.xlsx` seçer
2. `@uploadthing/react` bileşeni dosyayı doğrudan UploadThing'e yükler
3. UploadThing bir URL döndürür (örn. `https://utfs.io/f/abc123`)
4. Frontend bu URL'i `POST /api/personel/set-izin-url` ile backend'e bildirir
5. Backend URL'i environment variable olarak saklar (ya da Vercel KV/basit bir config dosyasıyla)

**Backend'de dosyayı okuma:**
```python
import httpx
import openpyxl
from io import BytesIO
import os

async def izin_dosyasini_oku() -> list:
    """UploadThing'den izin.xlsx'i indir ve personel listesini döndür."""
    url = os.environ.get("IZIN_FILE_URL")
    if not url:
        raise ValueError("IZIN_FILE_URL environment variable ayarlanmamış")

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()

    wb = openpyxl.load_workbook(BytesIO(response.content))
    ws = wb.active

    personeller = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row[1]:  # B sütunu: Ad Soyad
            personeller.append({
                "id": row[0],
                "ad_soyad": str(row[1]).upper().strip(),
                "izin_gunu": str(row[2]).upper().strip() if row[2] else ""
            })
    return personeller
```

---

## Önemli Detaylar & Edge Case'ler

1. **Template Korunması:** İndirilecek Excel, orijinal `liste_template.xlsx` dosyasını bozmadan her seferinde kopyasını kullanmalı.

2. **Sayfa 2 Korunması:** `Gün Tipleri` sayfasına hiç dokunulmamalı.

3. **İzin Günü Güncelleme:** Kullanıcı bir personelin izin gününü değiştirince hem frontend tablosu hem de backend'deki veri anında güncellenmiş hesabı yansıtmalı. Bu değişiklik `izin.xlsx`'e de geri yazılmalı ki kalıcı olsun.

4. **Eşleşmeyen Personel:** `izin.xlsx`'te olup `liste.xlsx`'te olmayan personel (ya da tam tersi) sessizce geçilmeli, hata fırlatmamalı. Uyarı olarak frontend'de gösterilebilir.

5. **Ay Geçişi:** Şubat ayı için 28/29 gün, diğer aylarda 30/31 gün hesaplanmalı. `calendar.monthrange()` kullanılmalı.

6. **Büyük/Küçük Harf:** Tüm isim eşleştirmeleri `.upper().strip()` ile yapılmalı.

7. **Gün Adı Normalizasyonu:** `izin.xlsx`'ten okunan gün adında bazen boşluk veya Ç/Ş/İ gibi Türkçe karakter sorunları olabilir. `unicodedata.normalize` veya `.strip()` kullanılmalı.

8. **Template Ayı Değiştirme:** İndirilen Excel'in başlık sütunları doğru ay/yıla göre üretilmeli (Mart için `1.03.2026`, Nisan için `1.04.2026`, vb.).

---

## Deployment Akışı (Vercel)

1. GitHub'a push yap
2. Vercel projeye bağlı → otomatik deploy
3. Vercel Dashboard → Settings → Environment Variables → `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID` ekle
4. Uygulamayı aç → `izin.xlsx` yükle → URL otomatik kaydedilir

---

## Gelecek Özellikler (Şimdilik Kapsam Dışı)

- Diğer `Gün Tipleri` kodlarını (Rapor, Ücretsiz İzin vb.) destekleme
- Birden fazla ay için toplu indirme
- Kullanıcı girişi / yetkilendirme
- Veritabanı entegrasyonu (şimdilik dosya tabanlı yeterli)

---

## Dosya Adlandırma Kuralı (İndirme)

İndirilen dosya şu formatta adlandırılmalı:
```
{yil}-{ay:02d}-liste.xlsx
```
Örnekler:
- Mart 2026 → `2026-03-liste.xlsx`
- Nisan 2026 → `2026-04-liste.xlsx`
- Ocak 2027 → `2027-01-liste.xlsx`
