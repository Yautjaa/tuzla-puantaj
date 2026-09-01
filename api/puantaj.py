"""
GET /api/puantaj?yil=2026&ay=4&file_url=<uploadthing_url>
Vercel Serverless Python Function
"""
import calendar
import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_lib"))

from excel_handler import read_izin_from_url
from logic import hesapla_puantaj


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parametreler
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        try:
            yil = int(params.get("yil", [0])[0])
            ay = int(params.get("ay", [0])[0])
        except (ValueError, IndexError):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "yil ve ay parametreleri gerekli (int)"}).encode())
            return

        file_url = params.get("file_url", [None])[0]

        if not file_url or not (1 <= ay <= 12):
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "Geçersiz parametreler"}).encode())
            return

        try:
            personeller = read_izin_from_url(file_url)
            _, ay_gun_sayisi = calendar.monthrange(yil, ay)

            puantaj_list = []
            for p in personeller:
                gunler = hesapla_puantaj(yil, ay, p["izin_gunu"])
                puantaj_list.append({
                    "ad_soyad": p["ad_soyad"],
                    "izin_gunu": p["izin_gunu"],
                    "gunler": gunler,
                })

            result = {
                "yil": yil,
                "ay": ay,
                "ay_gun_sayisi": ay_gun_sayisi,
                "personeller": puantaj_list,
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": str(e)}).encode())
