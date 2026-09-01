from pydantic import BaseModel


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
