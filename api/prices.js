module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300');

  async function fetchPrice(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      });
      const data = await response.json();
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev  = meta.chartPreviousClose;
      const change    = price - prev;
      const changePct = (change / prev) * 100;
      return {
        price:     parseFloat(price.toFixed(2)),
        prev:      parseFloat(prev.toFixed(2)),
        change:    parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        currency:  meta.currency,
      };
    } catch(e) {
      return { error: true, message: e.message };
    }
  }

  try {
    const [lco, ho, tuprs] = await Promise.all([
      fetchPrice('BZ=F'),      // Brent Ham Petrol
      fetchPrice('HO=F'),      // Heating Oil (NYF/GPR proxy)
      fetchPrice('TUPRS.IS'),  // TÜPRAŞ Borsa İstanbul
    ]);

    // Heating Oil $/galon → NYF $/ton (1 ton ≈ 333 galon)
    const nyf = !ho.error ? {
      ...ho,
      price:     parseFloat((ho.price * 333).toFixed(1)),
      prev:      parseFloat((ho.prev  * 333).toFixed(1)),
      change:    parseFloat(((ho.price - ho.prev) * 333).toFixed(1)),
      changePct: ho.changePct,
    } : ho;

    // GPR proxy — biraz daha yüksek gasoil farkı
    const gpr = !ho.error ? {
      ...ho,
      price:     parseFloat((ho.price * 333 * 1.08).toFixed(1)),
      prev:      parseFloat((ho.prev  * 333 * 1.08).toFixed(1)),
      change:    parseFloat(((ho.price - ho.prev) * 333 * 1.08).toFixed(1)),
      changePct: ho.changePct,
    } : ho;

    res.status(200).json({
      success: true,
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
