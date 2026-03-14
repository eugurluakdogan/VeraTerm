module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const SHEET_ID = '1qWbx3ce5f6mKG7KaXpPSXQq8pJxBk61TUs1IO2ut3vI';

  try {
    // Google Sheets CSV export URL
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sayfa1`;
    const response = await fetch(url);
    const csv = await response.text();

    // CSV parse
    const rows = csv.trim().split('\n').map(row =>
      row.split(',').map(cell => cell.replace(/"/g, '').trim())
    );

    // Başlık satırını atla, veriyi oku
    const headers = rows[0]; // Tarih, LCO, NYF, GPR
    const data = rows.slice(1).filter(r => r[0] && r[1]);

    // En güncel satır (ilk satır = en yeni tarih)
    const latest = data[0];
    const prev   = data[1];

    // Tarih: DD.MM.YYYY → düzelt
    function parseDate(str) {
      if (!str) return null;
      const [d, m, y] = str.split('.');
      return `${y}-${m}-${d}`;
    }

    // Sayı parse — Türkçe format (virgül ondalık ayraç)
    function parseNum(str) {
      if (!str) return null;
      return parseFloat(str.replace(',', '.'));
    }

    // Değerleri al
    const lcoPrice  = parseNum(latest[1]);
    const lcoPrev   = parseNum(prev[1]);
    const nyfRaw    = parseNum(latest[2]); // $/galon
    const nyfPrev   = parseNum(prev[2]);
    const gprRaw    = parseNum(latest[3]); // $/galon
    const gprPrev   = parseNum(prev[3]);

    // NYF & GPR: $/galon → $/ton (1 ton ≈ 333 galon)
    const TON = 333;
    const nyfPrice = parseFloat((nyfRaw * TON).toFixed(1));
    const nyfPrevP = parseFloat((nyfPrev * TON).toFixed(1));
    const gprPrice = parseFloat((gprRaw * TON).toFixed(1));
    const gprPrevP = parseFloat((gprPrev * TON).toFixed(1));

    // Değişim hesapla
    function calcChange(price, prev) {
      const change    = price - prev;
      const changePct = (change / prev) * 100;
      return {
        change:    parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
      };
    }

    // Son 60 günlük veriyi grafik için hazırla
    const chartData = data.slice(0, 60).reverse().map(row => ({
      date:  parseDate(row[0]),
      lco:   parseNum(row[1]),
      nyf:   parseFloat((parseNum(row[2]) * TON).toFixed(1)),
      gpr:   parseFloat((parseNum(row[3]) * TON).toFixed(1)),
    })).filter(r => r.date && r.lco);

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      latest: {
        date: parseDate(latest[0]),
        LCO: {
          price: lcoPrice,
          ...calcChange(lcoPrice, lcoPrev),
          unit:  '$/varil',
          label: 'Brent Ham Petrol',
        },
        NYF: {
          price: nyfPrice,
          ...calcChange(nyfPrice, nyfPrevP),
          unit:  '$/ton',
          label: 'Fuel Oil 3.5% NWE',
        },
        GPR: {
          price: gprPrice,
          ...calcChange(gprPrice, gprPrevP),
          unit:  '$/ton',
          label: 'Gasoil 0.1% NWE',
        },
      },
      chart: chartData, // grafik için tarihsel dizi
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
