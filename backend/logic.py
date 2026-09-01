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


def _normalize_gun(s: str) -> str:
    """Türkçe İ/ı karakterlerini ASCII I/i'ye çevir, sonra büyüt."""
    return s.replace("İ", "I").replace("ı", "i").upper().strip()


def izin_gunlerini_parse_et(izin_gunu_str: str) -> set:
    """
    "ÇARŞAMBA"        → {2}
    "CUMARTESİ-PAZAR" → {5, 6}
    """
    gunler = set()
    for parca in izin_gunu_str.split("-"):
        parca = _normalize_gun(parca)
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
