/**
 * Converteert een app-record naar een Supabase database-rij.
 */
export function toVangstRow(record, userId) {
  return {
    id: record.id,
    user_id: userId,
    vogelnaam: record.vogelnaam || null,
    ringnummer: record.ringnummer || null,
    vangstdatum: record.vangstdatum || null,
    project: record.project || null,
    bron: record.bron || 'app',
    uploaded: record.uploaded || false,
    deleted_at: record.deleted_at || null,
    data: record,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Converteert een Supabase database-rij naar een app-record.
 * De JSONB 'data' kolom bevat het volledige record; we overschrijven
 * enkele kolommen met de geïndexeerde waarden (bron, uploaded) voor consistentie.
 */
export function fromVangstRow(row) {
  return {
    ...row.data,
    id: row.id,
    bron: row.bron,
    uploaded: row.uploaded,
    deleted_at: row.deleted_at || null,
  };
}
