module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const SHEET_ID = '1qWbx3ce5f6mKG7KaXpPSXQq8pJxBk61TUs1IO2ut3vI';

  // Sayı parse — Türkçe/İngilizce karışık
  function parseNum(str) {
    if (!str || str === '') return null;
    str = str.trim();
    if (str.includes('.') && str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    if (str.includes(',')) {
      const p = str.split(',');
      return p[1] && p[1].length <= 2 ? parseFloat(str.replace(',', '.')) : parseFloat(str.replace(/,/g, ''));
    }
    if (str.includes('.')) {
      const p = str.split('.');
      return p[1] && p[1].length === 3 ? parseFloat(str.replace(/\./g, '')) : parseFloat(str);
    }
    return parseFloat(str);
  }

  // Yahoo Finance fiyat çek
  async function fetchYahoo(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://finance.yahoo.com',
        }
      });
      const d = await r.json();
      const meta = d.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev  = meta.chartPreviousClose;
      const change    = price - prev;
      const changePct = (change / prev) * 100;
      return {
        price:     parseFloat(price.toFixed(2)),
        change:    parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        currency:  meta.currency,
      };
    } catch(e) {
      return { error: true, message: e.message };
    }
  }

  // Google Sheet CSV çek
  async function fetchSheet(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const r = await fetch(url);
    const text = await r.text();
    return text.trim().split('\n').map(row => {
      const cells = []; let cur = '', inQ = false;
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
        cur += c;
      }
      cells.push(cur.trim());
      return cells;
    });
  }

  try {
    // Brent ve TÜPRAŞ fiyatlarını paralel çek
    const [brent, tuprs] = await Promise.all([
      fetchYahoo('BZ=F'),       // Brent Ham Petrol
      fetchYahoo('TUPRS.IS'),   // TÜPRAŞ Borsa İstanbul
    ]);

    // TUPRS Sheet'inden marj verisi çek
    const rowsTuprs = await fetchSheet('TUPRS');
    const months = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

    const marjData = rowsTuprs.filter(r => {
      const ay = (r[1] || '').trim().toUpperCase();
      return months.includes(ay);
    }).map(row => ({
      ay:         row[1].trim(),
      tuprs2025:  parseNum(row[2]),
      avrupa2025: parseNum(row[3]),
      tuprs2026:  parseNum(row[4]),
      avrupa2026: parseNum(row[5]),
    }));

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      brent,
      tuprs,
      marjChart: {
        labels:     marjData.map(r => r.ay),
        tuprs2025:  marjData.map(r => r.tuprs2025),
        avrupa2025: marjData.map(r => r.avrupa2025),
        tuprs2026:  marjData.map(r => r.tuprs2026),
        avrupa2026: marjData.map(r => r.avrupa2026),
      },
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
