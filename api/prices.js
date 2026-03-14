module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  const KEY = '50NCMZO0OCZ8UWOE';

  // Emtia endpoint'i — Alpha Vantage'ın özel commodity fonksiyonu
  async function fetchCommodity(func) {
    try {
      const url = `https://www.alphavantage.co/query?function=${func}&interval=daily&apikey=${KEY}`;
      const r = await fetch(url);
      const d = await r.json();
      const series = d.data;
      if (!series || !series[0]) return { error: true, message: 'Veri yok' };
      const latest = series[0];   // en güncel
      const prev   = series[1];   // bir önceki gün
      const price     = parseFloat(latest.value);
      const prevPrice = parseFloat(prev.value);
      const change    = price - prevPrice;
      const changePct = (change / prevPrice) * 100;
      return {
        price:     parseFloat(price.toFixed(2)),
        prev:      parseFloat(prevPrice.toFixed(2)),
        change:    parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        date:      latest.date,
      };
    } catch(e) {
      return { error: true, message: e.message };
    }
  }

  // Hisse fiyatı — GLOBAL_QUOTE
  async function fetchQuote(symbol) {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${KEY}`;
      const r = await fetch(url);
      const d = await r.json();
      const q = d['Global Quote'];
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
    // Paralel çek
    // BRENT: Alpha Vantage Brent emtia fonksiyonu
    // HEATING_OIL: NYF & GPR için proxy
    // TUPRS.IS: Tüpraş hisse
    const [lco, ho, tuprs] = await Promise.all([
      fetchCommodity('BRENT'),        // Brent Ham Petrol $/varil
      fetchCommodity('HEATING_OIL'),  // Heating Oil $/galon → ton'a çevireceğiz
      fetchQuote('TUPRS.IS'),         // TÜPRAŞ Borsa İstanbul
    ]);

    // Heating Oil $/galon → $/ton (1 ton ≈ 333 galon)
    const nyf = !ho.error ? {
      price:     parseFloat((ho.price * 333).toFixed(1)),
      prev:      parseFloat((ho.prev  * 333).toFixed(1)),
      change:    parseFloat((ho.change * 333).toFixed(1)),
      changePct: ho.changePct,
      date:      ho.date,
    } : ho;

    // GPR (Gasoil) — Heating Oil + %8 fark
    const gpr = !ho.error ? {
      price:     parseFloat((ho.price * 333 * 1.08).toFixed(1)),
      prev:      parseFloat((ho.prev  * 333 * 1.08).toFixed(1)),
      change:    parseFloat((ho.change * 333 * 1.08).toFixed(1)),
      changePct: ho.changePct,
      date:      ho.date,
    } : ho;

    res.status(200).json({
      success:   true,
      updatedAt: new Date().toISOString(),
      data: {
        LCO:   { ...lco,   label: 'Brent Ham Petrol',  unit: '$/varil' },
        NYF:   { ...nyf,   label: 'Fuel Oil 3.5% NWE', unit: '$/ton'   },
        GPR:   { ...gpr,   label: 'Gasoil 0.1% NWE',   unit: '$/ton'   },
        TUPRS: { ...tuprs, label: 'TÜPRAŞ Hisse',       unit: '₺'       },
      }
    });

  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
