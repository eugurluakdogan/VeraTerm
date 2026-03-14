module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const API_KEY = '50NCMZO0OCZ8UWOE';

  // Alpha Vantage'dan fiyat çek
  async function fetchQuote(symbol) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const q = data['Global Quote'];
      if (!q || !q['05. price']) return { error: true, message: 'Veri yok' };
      const price     = parseFloat(q['05. price']);
      const prev      = parseFloat(q['08. previous close']);
      const change    = parseFloat(q['09. change']);
      const changePct = parseFloat(q['10. change percent'].replace('%', ''));
      return { price, prev, change, changePct };
    } catch(e) {
      return { error: true, message: e.message };
    }
  }

  // Alpha Vantage emtia endpoint'i
  async function fetchCommodity(symbol) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const q = data['Global Quote'];
      if (!q || !q['05. price']) return { error: true, message: 'Veri yok' };
      const price     = parseFloat(q['05. price']);
      const prev      = parseFloat(q['08. previous close']);
      const change    = parseFloat(q['09. change']);
      const changePct = parseFloat(q['10. change percent'].replace('%', ''));
      return { price, prev, change, changePct };
    } catch(e) {
      return { error: true, message: e.message };
    }
  }

  try {
    // Paralel çek — Alpha Vantage sembolleri
    // BZ: Brent Crude, HO: Heating Oil (NYF/GPR proxy), TUPRS.IS: Tüpraş
    const [lcoRaw, hoRaw, tuprsRaw] = await Promise.all([
      fetchCommodity('BZ'),        // Brent Ham Petrol
      fetchCommodity('HO'),        // Heating Oil → NYF & GPR proxy
      fetchQuote('TUPRS.IS'),      // TÜPRAŞ — Borsa İstanbul
    ]);

    // Heating Oil $/galon → $/ton dönüşümü (1 ton ≈ 333 galon)
    const nyf = !hoRaw.error ? {
      price:     parseFloat((hoRaw.price * 333).toFixed(1)),
      prev:      parseFloat((hoRaw.prev  * 333).toFixed(1)),
      change:    parseFloat((hoRaw.change * 333).toFixed(1)),
      changePct: hoRaw.changePct,
    } : hoRaw;

    // GPR (Gasoil) — Heating Oil × 1.08 fark katsayısı
    const gpr = !hoRaw.error ? {
      price:     parseFloat((hoRaw.price * 333 * 1.08).toFixed(1)),
      prev:      parseFloat((hoRaw.prev  * 333 * 1.08).toFixed(1)),
      change:    parseFloat((hoRaw.change * 333 * 1.08).toFixed(1)),
      changePct: hoRaw.changePct,
    } : hoRaw;

    res.status(200).json({
      success: true,
      updatedAt: new Date().toISOString(),
      data: {
        LCO:   { ...lcoRaw,  label: 'Brent Ham Petrol',  unit: '$/varil' },
        NYF:   { ...nyf,     label: 'Fuel Oil 3.5% NWE', unit: '$/ton'   },
        GPR:   { ...gpr,     label: 'Gasoil 0.1% NWE',   unit: '$/ton'   },
        TUPRS: { ...tuprsRaw, label: 'TÜPRAŞ Hisse',      unit: '₺'       },
      }
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
