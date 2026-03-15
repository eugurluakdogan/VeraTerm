module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60');

  const SHEET_ID = '1qWbx3ce5f6mKG7KaXpPSXQq8pJxBk61TUs1IO2ut3vI';

  function parseDate(str) {
    if (!str) return null;
    const parts = str.split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return str;
  }

  function parseNum(str) {
    if (!str || str === '') return null;
    str = str.trim();
    if (str.includes('.') && str.includes(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    }
    if (str.includes(',')) {
      const parts = str.split(',');
      if (parts[1] && parts[1].length <= 2) return parseFloat(str.replace(',', '.'));
      return parseFloat(str.replace(/,/g, ''));
    }
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts[1] && parts[1].length === 3) return parseFloat(str.replace(/\./g, ''));
      return parseFloat(str);
    }
    return parseFloat(str);
  }

  function calcChange(price, prevPrice) {
    if (!price || !prevPrice) return { change: 0, changePct: 0 };
    const change    = price - prevPrice;
    const changePct = (change / prevPrice) * 100;
    return {
      change:    parseFloat(change.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
    };
  }

  async function fetchCSV(sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const r = await fetch(url);
    const text = await r.text();
    return text.trim().split('\n').map(row => {
      // CSV parse — quoted fields içinde virgül olabilir
      const cells = [];
      let cur = '', inQ = false;
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
    // ── SAYFA 1: LCO / NYF / LGO ──
    const rows1 = await fetchCSV('Sayfa1');
    const data1 = rows1.slice(1).filter(r => r[0] && r[1] && r[1] !== '');
    const latest = data1[0];
    const prev   = data1[1];

    const lcoPrice = parseNum(latest[1]);
    const lcoPrev  = parseNum(prev[1]);

    const NYF_CONV = 264;
    const nyfRaw   = parseNum(latest[2]);
    const nyfPrev  = parseNum(prev[2]);
    const nyfPrice = nyfRaw  ? parseFloat((nyfRaw  * NYF_CONV).toFixed(1)) : null;
    const nyfPrevP = nyfPrev ? parseFloat((nyfPrev * NYF_CONV).toFixed(1)) : null;

    const lgoPrice = parseNum(latest[3]);
    const lgoPrev  = parseNum(prev[3]);

    const chartData = data1.slice(0, 60).reverse().map(row => ({
      date: parseDate(row[0]),
      lco:  parseNum(row[1]),
      nyf:  row[2] ? parseFloat((parseNum(row[2]) * NYF_CONV).toFixed(1)) : null,
      lgo:  parseNum(row[3]),
    })).filter(r => r.date && r.lco);

    // ── TUPRS SEKMESİ ──
    const rowsTuprs = await fetchCSV('TUPRS');

    // Debug: tüm satırları gör
    // Sheet yapısı: B=ay adı, C=2025 Tüpraş, D=2025 Avrupa, E=2026 Tüpraş, F=2026 Avrupa
    // İlk 2 satır başlık, 3. satırdan itibaren veri
    const months = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN','TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];

    // Ay adı içeren satırları bul (başlık satırlarını otomatik atla)
    const tuprsData = rowsTuprs.filter(r => {
      const ayStr = (r[1] || '').trim().toUpperCase();
      return months.includes(ayStr);
    }).map(row => ({
      ay:         row[1].trim(),
      tuprs2025:  parseNum(row[2]),
      avrupa2025: parseNum(row[3]),
      tuprs2026:  parseNum(row[4]),
      avrupa2026: parseNum(row[5]),
    }));

    const son2026 = tuprsData.filter(r => r.tuprs2026 != null).slice(-1)[0];
    const son2025 = tuprsData.filter(r => r.tuprs2025 != null).slice(-1)[0];

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      latest: {
        date: parseDate(latest[0]),
        LCO: { price: lcoPrice, ...calcChange(lcoPrice, lcoPrev),  unit: '$/varil', label: 'Brent Ham Petrol'     },
        NYF: { price: nyfPrice, ...calcChange(nyfPrice, nyfPrevP), unit: '$/ton',   label: 'Kalorifer Yakıtı NWE' },
        LGO: { price: lgoPrice, ...calcChange(lgoPrice, lgoPrev),  unit: '$/ton',   label: 'Gas Oil (LGO)'        },
        TUPRS_MARJ: {
          price2025: son2025?.tuprs2025 ?? null,
          price2026: son2026?.tuprs2026 ?? null,
          label: 'TÜPRAŞ Motorin Marjı',
          unit: '$/ton',
        },
      },
      chart: chartData,
      marjChart: {
        labels:     tuprsData.map(r => r.ay),
        tuprs2025:  tuprsData.map(r => r.tuprs2025),
        avrupa2025: tuprsData.map(r => r.avrupa2025),
        tuprs2026:  tuprsData.map(r => r.tuprs2026),
        avrupa2026: tuprsData.map(r => r.avrupa2026),
      },
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message, stack: e.stack });
  }
};
