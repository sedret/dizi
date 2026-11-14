"""Kullanım: python3 make_qr.py [menü_adresi]
Menü sayfasının (index.html) yayınlandığı adresi QR koda çevirir."""
import sys, segno
url = sys.argv[1] if len(sys.argv) > 1 else "https://sedret.github.io/dizi/"
q = segno.make(url, error="h")
q.save("menu-qr.png", scale=14, border=4)
q.save("menu-qr.svg", scale=14, border=4)
print("QR hazır ->", url)
