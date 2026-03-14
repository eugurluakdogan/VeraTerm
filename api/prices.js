module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const SHEET_ID = '1qWbx3ce5f6mKG7KaXpPSXQq8pJxBk61TUs1IO2ut3vI';

  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sayfa1`;
    const response = await fetch(url);
    const csv = await response.text();

    const rows = csv.trim().split('\n').map(row =>
      row.split(',').map(cell => cell.replace(/"/g, '').trim())
    );

    const data = rows.slice(1).filter(r => r[0] && r[1]);

    const latest = data[0];
    const prev   = data[1];

    // Tarih: DD.MM.YYYY → YYYY-MM-DD
    function parseDate(str) {
      if (!str) return null;
      const parts = str.split('.');
      if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
      return str;
    }

    // Sayı parse — Türkçe ondalık (virgül)
    function parseNum(str) {
      if (!str || str === '') return null;
      return parseFloat(str.replace(',', '.'));
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

    const lcoPrice = parseNum(latest[1]);
    const lcoPrev  = parseNum(prev[1]);

    // NYF: Sheet'te $/galon → $/ton dönüşümü
    // Heating Oil: 1 galon = 3.785 litre, 1 ton ≈ 1100 litre → 1 ton ≈ 290 galon
    const NYF_CONV = 290;
    const nyfRaw   = parseNum(latest[2]);
    const nyfPrev  = parseNum(prev[2]);
    const nyfPrice = nyfRaw  ? parseFloat((nyfRaw  * NYF_CONV).toFixed(1)) : null;
    const nyfPrevP = nyfPrev ? parseFloat((nyfPrev * NYF_CONV).toFixed(1)) : null;

    // GPR: Sheet'te $/galon → $/ton
    const GPR_CONV = 290;
    const gprRaw   = parseNum(latest[3]);
    const gprPrev  = parseNum(prev[3]);
    const gprPrice = gprRaw  ? parseFloat((gprRaw  * GPR_CONV).toFixed(1)) : null;
    const gprPrevP = gprPrev ? parseFloat((gprPrev * GPR_CONV).toFixed(1)) : null;

    // Son 60 günlük grafik verisi
    const chartData = data.slice(0, 60).reverse().map(row => ({
      date: parseDate(row[0]),
      lco:  parseNum(row[1]),
      nyf:  row[2] ? parseFloat((parseNum(row[2]) * NYF_CONV).toFixed(1)) : null,
      gpr:  row[3] ? parseFloat((parseNum(row[3]) * GPR_CONV).toFixed(1)) : null,
    })).filter(r => r.date && r.lco);

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      latest: {
        date: parseDate(latest[0]),
        LCO: { price: lcoPrice,  ...calcChange(lcoPrice,  lcoPrev),  unit: '$/varil', label: 'Brent Ham Petrol'  },
        NYF: { price: nyfPrice,  ...calcChange(nyfPrice,  nyfPrevP), unit: '$/ton',   label: 'Fuel Oil 3.5% NWE' },
        GPR: { price: gprPrice,  ...calcChange(gprPrice,  gprPrevP), unit: '$/ton',   label: 'Gasoil 0.1% NWE'   },
      },
      chart: chartData,
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
