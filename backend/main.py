import calendar
import os
import shutil

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from excel_handler import (
    IZIN_PATH,
    puantaj_excel_olustur,
    read_izin_xlsx,
    write_back_izin,
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


def reload_personeller() -> None:
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

    puantaj_data = [
        {"ad_soyad": p["ad_soyad"], "gunler": hesapla_puantaj(yil, ay, p["izin_gunu"])}
        for p in _personeller
    ]

    excel_bytes = puantaj_excel_olustur(yil, ay, puantaj_data)
    filename = f"{yil}-{ay:02d}-liste.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
