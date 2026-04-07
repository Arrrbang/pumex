// 3_api/api.js
(function() {
  'use strict';

  const BASE = 'https://notion-api-hub.vercel.app';

  window.CostAPI = {
    // 1. 업체 목록 가져오기
    fetchCompanies: async function(country, region) {
      const url = `${BASE}/api/companies/by-region?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&mode=options`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error('companies fetch failed: ' + r.status);
      const j = await r.json();
      return (j.companies || j.options || []).filter(Boolean);
    },
    
    // 2. POE 목록 가져오기
    fetchPOEs: async function(country, region, company) {
      let url = `${BASE}/api/poe/by-company?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&company=${encodeURIComponent(company)}&mode=options`;
      let res = await fetch(url, { cache: 'no-store' });
      let j = res.ok ? await res.json().catch(() => null) : null;
      let poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);
      
      if (!poes.length) {
        url = `${BASE}/api/poe/by-region?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}&mode=options`;
        res = await fetch(url, { cache: 'no-store' });
        j = await res.json().catch(() => null);
        poes = (j?.poes || j?.POE || j?.options || []).filter(Boolean);
      }
      return poes;
    },

    // 3. 화물타입 목록 가져오기
    fetchCargoTypes: async function(country, region, company, poe) {
      let url = `${BASE}/api/cargo-types/by-partner?country=${encodeURIComponent(country)}&company=${encodeURIComponent(company)}&poe=${encodeURIComponent(poe)}`;
      if (region) url += `&region=${encodeURIComponent(region)}`;
      url += `&mode=options`;

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('cargo-types fetch failed: ' + res.status);
      const j = await res.json().catch(() => null);
      return (j?.types || j?.options || []).filter(Boolean);
    },

    // 4. 비용(표 데이터) 가져오기 (순수하게 데이터만 넘겨줍니다!)
    fetchCosts: async function(country, region, company, cargo, type, cbm, poe) {
      const roles = cargo ? [String(cargo).toUpperCase()] : [];
      const params = new URLSearchParams();
      
      params.set('type', type);
      params.set('company', company);
      if (region) params.set('region', region);
      if (poe) params.set('poe', poe);
      if (roles.length) params.set('roles', roles.join(','));
      if (!isNaN(cbm)) params.set('cbm', String(cbm));

      const url = `${BASE}/api/costs/${encodeURIComponent(country)}?${params.toString()}`;
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) throw new Error('fetchCosts failed: ' + res.status);
      return await res.json();
    }
  };

})();