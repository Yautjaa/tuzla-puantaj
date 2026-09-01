"""
GET /api/personel?file_url=<uploadthing_url>
Vercel Serverless Python Function
"""
import json
import sys
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# _lib modüllerini import edebilmek için path ayarla
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "_lib"))

from excel_handler import read_izin_from_url


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Query params
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        file_url = params.get("file_url", [None])[0]

        if not file_url:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": "file_url parametresi gerekli"}).encode())
            return

        try:
            personeller = read_izin_from_url(file_url)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(personeller).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"detail": f"Dosya okunamadı: {str(e)}"}).encode())
