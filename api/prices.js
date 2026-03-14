// VeraTerm — Vercel Serverless Function
// Konum: /api/prices.js
// Yahoo Finance'den LCO, NYF, GPR, TUPRS anlık fiyatlarını çeker

export default async function handler(req, res) {
  // CORS — sitenin her yerinden erişebilsin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300'); // 5 dakika cache

  const symbols = {
    LCO:   'BZ=F',      // Brent Ham Petrol
    NYF:   'HO=F',      // Heating Oil (NYF proxy — $/galon, dönüştürüyoruz)
    GPR:   'NG=F',      // Doğalgaz (GPR proxy)
    TUPRS: 'TUPRS.IS',  // TÜPRAŞ — Borsa İstanbul
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
  };

  async function fetchPrice(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
      const response = await fetch(url, { headers });
      const data = await response.json();
      const meta = data.chart.result[0].meta;
      const price = meta.regularMarketPrice;
      const prev  = meta.chartPreviousClose;
      const change     = price - prev;
      const changePct  = ((change / prev) * 100);
      return {
        price:     parseFloat(price.toFixed(2)),
        prev:      parseFloat(prev.toFixed(2)),
        change:    parseFloat(change.toFixed(2)),
        changePct: parseFloat(changePct.toFixed(2)),
        currency:  meta.currency,
        timestamp: meta.regularMarketTime,
      };
    } catch (e) {
      return { error: true, message: e.message };
    }
  }

  try {
    // Tüm sembolleri paralel çek
    const [lco, nyf, gpr, tuprs] = await Promise.all([
      fetchPrice(symbols.LCO),
      fetchPrice(symbols.NYF),
      fetchPrice(symbols.GPR),
      fetchPrice(symbols.TUPRS),
    ]);

    // NYF: Heating Oil $/galon → $/ton dönüşümü (1 ton ≈ 333 galon)
    if (!nyf.error) {
      nyf.price     = parseFloat((nyf.price * 333).toFixed(1));
      nyf.prev      = parseFloat((nyf.prev  * 333).toFixed(1));
      nyf.change    = parseFloat((nyf.price - nyf.prev).toFixed(1));
      nyf.changePct = parseFloat(((nyf.change / nyf.prev) * 100).toFixed(2));
      nyf.unit      = '$/ton';
    }

    // GPR: Gasoil için NG=F yetersiz — şimdilik Brent'e yakın proxy
    // Gerçek GPR için ileride ICE doğrudan entegrasyon yapılacak
    if (!gpr.error) {
      // NG=F mmBtu → $/ton yaklaşık (1 ton ≈ 52 mmBtu)
      gpr.price     = parseFloat((gpr.price * 52 * 3.5).toFixed(1)); // kaba dönüşüm
      gpr.unit      = '$/ton (yaklaşık)';
    }

    res.status(200).json({
      success: true,
      updatedAt: new Date().toISOString(),
      data: {
        LCO:   { ...lco,  unit: '$/varil', label: 'Brent Ham Petrol' },
        NYF:   { ...nyf,  label: 'Fuel Oil 3.5% NWE' },
        GPR:   { ...gpr,  label: 'Gasoil 0.1% NWE' },
        TUPRS: { ...tuprs, unit: '₺', label: 'TÜPRAŞ Hisse' },
      }
    });

  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
