// CSV Export
export function exportCSV(records) {
  if (!records.length) return '';
  const headers = Object.keys(records[0]);
  const rows = records.map(r =>
    headers.map(h => {
      const val = r[h] ?? '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// JSON Export
export function exportJSON(records) {
  return JSON.stringify(records, null, 2);
}

// Griel XML Export
export function exportGrielXML(records) {
  const xmlRecords = records.map(r => {
    const fields = [
      field('centrale', r.centrale || 'NLA'),
      field('ringnummer', r.ringnummer || ''),
      field('metalenringinfo', r.metalenringinfo ?? 1),
      field('identificatie_methode', r.identificatie_methode || 'A0'),
      field('verificatie', r.verificatie ?? 0),
      field('andere_merktekens', r.andere_merktekens || ''),
      field('euring_code', r.euring_code || ''),
      field('vogelnaam', r.vogelnaam || ''),
      field('gemanipuleerd', r.gemanipuleerd || ''),
      field('verplaatst', r.verplaatst ?? 0),
      field('vangstmethode', r.vangstmethode || ''),
      field('lokmiddelen', r.lokmiddelen || 'N'),
      field('geslacht', r.geslacht || ''),
      field('leeftijd', r.leeftijd || ''),
      field('status', r.status || ''),
      field('broedselgrootte', r.broedselgrootte || '--'),
      field('pul_leeftijd', r.pul_leeftijd || '--'),
      field('nauwk_pul_leeftijd', r.nauwk_pul_leeftijd || '-'),
      field('vangstdatum', formatDate(r.vangstdatum)),
      field('nauwk_vangstdatum', r.nauwk_vangstdatum ?? 0),
      field('tijd', r.tijd || ''),
      field('plaatscode', r.plaatscode || ''),
      field('google_plaats', r.google_plaats || ''),
      field('lat', r.lat || ''),
      field('lon', r.lon || ''),
      field('nauwk_coord', r.nauwk_coord ?? 0),
      field('conditie', r.conditie || ''),
      field('omstandigheden', r.omstandigheden || ''),
      field('zeker_omstandigheden', r.zeker_omstandigheden ?? 0),
      field('opmerkingen', r.opmerkingen || ''),
      field('vleugel', formatDecimal(r.vleugel)),
      field('gewicht', formatDecimal(r.gewicht)),
      field('kop_snavel', formatDecimal(r.kop_snavel)),
      field('tarsus_lengte', formatDecimal(r.tarsus_lengte)),
      field('handpenlengte', formatDecimal(r.handpenlengte)),
      field('staartlengte', formatDecimal(r.staartlengte)),
      field('snavel_schedel', formatDecimal(r.snavel_schedel)),
      field('tarsus_teen', formatDecimal(r.tarsus_teen)),
      field('tarsus_dikte', formatDecimal(r.tarsus_dikte)),
      field('vet', r.vet || ''),
      field('handpen_score', r.handpen_score || ''),
      field('cloaca', r.cloaca || ''),
      field('broedvlek', r.broedvlek || ''),
      field('borstspier', r.borstspier || ''),
      field('rui_lichaam', r.rui_lichaam || ''),
      field('geslachtsbepaling', r.geslachtsbepaling || ''),
      field('handicap', r.handicap || ''),
      field('netnummer', r.netnummer || ''),
      field('barcode', r.barcode || ''),
      field('opmerkingen1', r.opmerkingen1 || ''),
      field('opmerkingen2', r.opmerkingen2 || ''),
      field('oude_dekveren', r.oude_dekveren || ''),
      field('achternagel', formatDecimal(r.achternagel)),
      field('weegtijd', r.weegtijd || ''),
    ];
    return `  <vangst>\n${fields.join('\n')}\n  </vangst>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<ringgegevens>\n${xmlRecords.join('\n')}\n</ringgegevens>`;
}

function field(name, value) {
  const escaped = String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `    <${name}>${escaped}</${name}>`;
}

function formatDate(date) {
  if (!date) return '';
  // Convert yyyy-mm-dd to dd-mm-yyyy
  const parts = String(date).split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return date;
}

function formatDecimal(val) {
  if (val === undefined || val === null || val === '') return '';
  // Dutch notation: comma instead of dot
  return String(val).replace('.', ',');
}

export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
