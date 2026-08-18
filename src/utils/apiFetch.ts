const SHEET_MAPPING: Record<string, string> = {
  '/api/sheets': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=140773285',
  '/api/transfer_toko': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=2019501247',
  '/api/bundling': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=943305088',
  '/api/diskon': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1280142997',
  '/api/forecast': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=745261167',
  '/api/bi_liquid': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=555632840',
  '/api/analisa-sku': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1925692475',
  '/api/pembelian': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1331215353',
  '/api/penjualan': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=1914323905',
  '/api/parameter': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=101084867',
  '/api/dead_stock': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=507917823',
  '/api/scorecard_bulanan': 'https://docs.google.com/spreadsheets/d/1sNabMe9VwPV1y3avOg15RzFwvmZ5mFmLntEtuWsXMI4/export?format=csv&gid=949856094',
};

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);

  // Check if it matches any known route
  let mappedUrl: string | undefined;
  for (const [route, target] of Object.entries(SHEET_MAPPING)) {
    if (urlStr.endsWith(route) || urlStr.includes(route + '?') || urlStr.includes(route + '&')) {
      mappedUrl = target;
      break;
    }
  }

  if (mappedUrl) {
    try {
      // Try to fetch normally (using browser native fetch)
      const response = await fetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      
      // If we got a valid non-HTML response, return it
      if (response.ok && !contentType.includes('text/html')) {
        return response;
      }
      
      console.warn(`Local proxy fetch for ${urlStr} returned non-CSV or failed. Falling back to direct Google Sheets fetch.`);
    } catch (err) {
      console.warn(`Local proxy fetch for ${urlStr} failed with error. Falling back to direct Google Sheets fetch:`, err);
    }

    // Direct Sheets fetch with cache busting
    const directUrl = `${mappedUrl}&_=${Date.now()}`;
    return fetch(directUrl);
  }

  // Not a sheets proxy route, or we couldn't match (e.g. /api/chat)
  return fetch(input, init);
}
