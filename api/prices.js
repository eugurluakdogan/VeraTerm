module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const SHEET_ID = '1qWbx3ce5f6mKG7KaXpPSXQq8pJxBk61TUs1IO2ut3vI';

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

  function parseDate(str) {
    if (!str) return null;
    const p = str.trim().split('.');
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return str;
  }

  function calcChange(price, prev) {
    if (!price || !prev) return { change: 0, changePct: 0 };
    const change = price - prev;
    return {
      change: parseFloat(change.toFixed(2)),
      changePct: parseFloat(((change / prev) * 100).toFixed(2)),
    };
  }

  async function fetchCSV(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const r = await fetch(url);
    const text = await r.text();
    return text.trim().split('\n').map(row => {
      const cells = []; let cur = '', inQ = false;
      for (const c of row) {
        if (c === '"') { inQ = !inQ; continue; }
        if (c === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
        cur += c;
      }
      cells.push(cur.trim());
      return cells;
    });
  }

  try {
    const rows = await fetchCSV('TUPRS');

    // ── FİYAT VERİSİ: "Tarih" başlığını bul, altından oku ──
    const headerIdx = rows.findIndex(r =>
      r[0] && r[0].trim().toLowerCase() === 'tarih'
    );

    // Fiyat satırları: headerIdx+1'den itibaren, A sütununda tarih olan satırlar
    const priceRows = rows.slice(headerIdx + 1).filter(r => {
      const v = (r[0] || '').trim();
      return v && v.match(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    // En güncel 2 satır
    const latest = priceRows[0];
    const prev   = priceRows[1];

    const lcoPrice  = parseNum(latest[1]);
    const lcoPrev   = parseNum(prev[1]);
    const tuprsPrice = parseNum(latest[2]);
    const tuprsPrev  = parseNum(prev[2]);

    // Grafik için tüm haftalık veri (eski→yeni sırasıyla)
    const chartData = priceRows.slice().reverse().map(r => ({
      date:  parseDate(r[0]),
      lco:   parseNum(r[1]),
      tuprs: parseNum(r[2]),
    })).filter(r => r.date && r.lco);

    // ── MARJ VERİSİ: ay isimlerini bul ──
    const months = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

    const marjRows = rows.filter(r => {
      const ay = (r[1] || '').trim().toUpperCase();
      return months.includes(ay);
    }).map(r => ({
      ay:         r[1].trim(),
      tuprs2025:  parseNum(r[2]),
      avrupa2025: parseNum(r[3]),
      tuprs2026:  parseNum(r[4]),
      avrupa2026: parseNum(r[5]),
    }));

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      lco: {
        price: lcoPrice,
        ...calcChange(lcoPrice, lcoPrev),
        unit: '$/varil',
        date: parseDate(latest[0]),
      },
      tuprs: {
        price: tuprsPrice,
        ...calcChange(tuprsPrice, tuprsPrev),
        unit: '₺',
        date: parseDate(latest[0]),
      },
      chart: chartData,
      marjChart: {
        labels:     marjRows.map(r => r.ay),
        tuprs2025:  marjRows.map(r => r.tuprs2025),
        avrupa2025: marjRows.map(r => r.avrupa2025),
        tuprs2026:  marjRows.map(r => r.tuprs2026),
        avrupa2026: marjRows.map(r => r.avrupa2026),
      },
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
