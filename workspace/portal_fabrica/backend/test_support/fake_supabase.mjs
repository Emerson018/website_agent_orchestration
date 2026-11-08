// Cliente Supabase em memória para testes: nunca toca no banco real.
// Cobre só o subconjunto da API usado pelo server.js.
export function createFakeSupabase(seed = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(seed)) {
    tables[name] = rows.map((r) => structuredClone(r));
  }
  let nextId = 1;

  function query(table) {
    const rows = (tables[table] ||= []);
    const filters = [];
    let op = 'select';
    let payload = null;
    let limitN = null;

    const matches = (row) => filters.every(([col, val]) => String(row[col]) === String(val));

    function run() {
      if (op === 'insert') {
        const inserted = payload.map((r) => ({ id: r.id ?? `fake-${nextId++}`, ...structuredClone(r) }));
        rows.push(...inserted);
        return inserted;
      }
      const found = rows.filter(matches);
      if (op === 'update') {
        for (const row of found) Object.assign(row, structuredClone(payload));
      }
      return limitN == null ? found : found.slice(0, limitN);
    }

    const builder = {
      select() { return builder; },
      insert(r) { op = 'insert'; payload = Array.isArray(r) ? r : [r]; return builder; },
      update(patch) { op = 'update'; payload = patch; return builder; },
      eq(col, val) { filters.push([col, val]); return builder; },
      order() { return builder; },
      limit(n) { limitN = n; return builder; },
      async maybeSingle() { const out = run(); return { data: out[0] ?? null, error: null }; },
      async single() {
        const out = run();
        return out.length ? { data: out[0], error: null } : { data: null, error: { message: 'not found' } };
      },
      then(resolve, reject) {
        return Promise.resolve({ data: run(), error: null }).then(resolve, reject);
      },
    };
    return builder;
  }

  return { tables, from: query };
}
