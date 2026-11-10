const http = require('http');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'degistir';
const DATA_DIR = path.join(__dirname, 'data');
const XLSX = path.join(DATA_DIR, 'katilim.xlsx');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

fs.mkdirSync(DATA_DIR, { recursive: true });

// Yazmaları sıraya koy: aynı anda gelen kayıtlar dosyayı bozmasın.
let queue = Promise.resolve();
function kaydet(satir) {
  const is = queue.then(async () => {
    const wb = new ExcelJS.Workbook();
    let ws;
    if (fs.existsSync(XLSX)) {
      await wb.xlsx.readFile(XLSX);
      ws = wb.getWorksheet('Katılım');
    } else {
      ws = wb.addWorksheet('Katılım');
      ws.columns = [
        { header: 'Tarih', key: 'tarih', width: 20 },
        { header: 'Ad Soyad', key: 'ad', width: 30 },
        { header: 'Durum', key: 'durum', width: 14 },
        { header: 'Kişi Sayısı', key: 'kisi', width: 12 },
        { header: 'Not', key: 'not', width: 40 },
      ];
      ws.getRow(1).font = { bold: true };
    }
    // Eski toplam satırını sil, yeni kaydı ekle, toplamı en alta yeniden yaz
    for (let n = ws.rowCount; n >= 2; n--) {
      if (ws.getRow(n).getCell(2).value === 'TOPLAM GELEN') ws.spliceRows(n, 1);
    }
    ws.addRow([satir.tarih, satir.ad, satir.durum, satir.kisi, satir.not]);
    const veriSon = ws.rowCount;
    const t = ws.addRow(['', 'TOPLAM GELEN', '', { formula: `SUMIF(C2:C${veriSon},"Geliyor",D2:D${veriSon})` }, '']);
    t.font = { bold: true };
    await wb.xlsx.writeFile(XLSX);
  });
  queue = is.catch(() => {});
  return is;
}

const temiz = (s, n) => String(s || '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
// Excel formül enjeksiyonunu önle
const guvenli = (s) => (/^[=+\-@]/.test(s) ? "'" + s : s);

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(config));
    }
    if (req.method === 'POST' && url.pathname === '/api/rsvp') {
      let body = '';
      for await (const c of req) { body += c; if (body.length > 10000) throw new Error('büyük'); }
      const d = JSON.parse(body);
      const ad = temiz(d.ad, 80);
      const geliyor = d.durum === 'Geliyor';
      const kisi = geliyor ? parseInt(d.kisi, 10) : 0;
      if (!ad) { res.writeHead(400); return res.end(JSON.stringify({ hata: 'İsim gerekli' })); }
      if (geliyor && !(kisi >= 1 && kisi <= config.maksKisi)) {
        res.writeHead(400); return res.end(JSON.stringify({ hata: 'Kişi sayısı geçersiz' }));
      }
      await kaydet({
        tarih: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
        ad: guvenli(ad),
        durum: geliyor ? 'Geliyor' : 'Gelemiyor',
        kisi,
        not: guvenli(temiz(d.not, 300)),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end('{"ok":true}');
    }
    if (req.method === 'GET' && url.pathname === '/admin') {
      if (url.searchParams.get('key') !== ADMIN_KEY || !fs.existsSync(XLSX)) {
        res.writeHead(404); return res.end('Bulunamadı');
      }
      await queue;
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="katilim.xlsx"',
      });
      return fs.createReadStream(XLSX).pipe(res);
    }
    if (req.method === 'GET') {
      const f = url.pathname === '/' ? 'index.html' : path.basename(url.pathname);
      const p = path.join(__dirname, 'public', f);
      if (fs.existsSync(p)) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
        return fs.createReadStream(p).pipe(res);
      }
    }
    res.writeHead(404); res.end('Bulunamadı');
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('{"hata":"Sunucu hatası"}');
  }
}).listen(PORT, () => console.log(`Davetiye: http://localhost:${PORT}  |  Excel: /admin?key=${ADMIN_KEY}`));
