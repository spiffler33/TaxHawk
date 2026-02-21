const BASE = '/api';

export async function fetchDemo() {
  const res = await fetch(`${BASE}/demo`);
  if (!res.ok) throw new Error(`Demo failed: ${res.status}`);
  return res.json();
}

export async function optimize(salary, holdings = null, parentsSenior = false) {
  const res = await fetch(`${BASE}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      salary,
      holdings,
      parents_senior: parentsSenior,
    }),
  });
  if (!res.ok) throw new Error(`Optimize failed: ${res.status}`);
  return res.json();
}

export async function parseForm16(file, city = 'other', monthlyRent = 0, epf = null) {
  const form = new FormData();
  form.append('file', file);
  form.append('city', city);
  form.append('monthly_rent', String(monthlyRent));
  if (epf !== null) form.append('epf_employee_contribution', String(epf));

  const res = await fetch(`${BASE}/parse-form16`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Parse failed: ${res.status}`);
  }
  return res.json();
}
