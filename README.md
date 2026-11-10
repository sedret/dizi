# Dijital Davetiye

Misafir isim, durum (geliyor/gelemiyor) ve kişi sayısını girer; kayıt otomatik `data/katilim.xlsx` dosyasına eklenir.

## Çalıştırma
    npm install
    ADMIN_KEY=gizli-sifre npm start

- Davetiye: `http://localhost:3000`
- Excel indir (sizin kopyanız): `http://localhost:3000/admin?key=gizli-sifre`
- Davetiye metni (isim, tarih, mekan, en fazla kişi): `config.json`

Not: Linki misafirlere göndermek için uygulamanın internetten erişilebilir bir sunucuda çalışması gerekir.
