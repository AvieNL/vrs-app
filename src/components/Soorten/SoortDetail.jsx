import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpeciesRef } from '../../hooks/useSpeciesRef';
import { useRole } from '../../hooks/useRole';
import { db } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import RuitypeInfo from './RuitypeInfo';
import { VangstKaart } from '../Stats/Charts';
import './SoortDetail.css';

// Eenvoudige markdown-renderer: **bold**, *italic*, _underline_
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/gs, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gs, '<em>$1</em>')
    .replace(/_(.*?)_/gs, '<u>$1</u>');
}

// Textarea met B/I/U-opmaakbalk die automatisch meegroeit
function FormattedTextarea({ value, onChange, placeholder }) {
  const ref = useRef(null);

  // Pas hoogte aan aan inhoud
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);

  const insert = (marker) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const selected = value.slice(s, e);
    const newVal = value.slice(0, s) + marker + selected + marker + value.slice(e);
    onChange({ target: { value: newVal } });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(s + marker.length, e + marker.length);
    });
  };
  return (
    <div className="sd-fmt-wrapper">
      <div className="sd-fmt-toolbar">
        <button type="button" className="sd-fmt-btn sd-fmt-bold" onMouseDown={e => { e.preventDefault(); insert('**'); }}>B</button>
        <button type="button" className="sd-fmt-btn sd-fmt-italic" onMouseDown={e => { e.preventDefault(); insert('*'); }}>I</button>
        <button type="button" className="sd-fmt-btn sd-fmt-under" onMouseDown={e => { e.preventDefault(); insert('_'); }}>U</button>
      </div>
      <textarea ref={ref} className="sd-edit-textarea sd-edit-textarea--auto" value={value} onChange={onChange} placeholder={placeholder} rows={1} />
    </div>
  );
}

const LEEFTIJD_LABEL = {
  '0': '?', '1': 'pullus', '2': 'onb.', '3': '1kj', '4': '+1kj',
  '5': '2kj', '6': '+2kj', '7': '3kj', '8': '+3kj', '9': '4kj+', 'A': '+4kj',
};
function leeftijdLabel(code) { return LEEFTIJD_LABEL[code] || code; }


function resizeImage(file, maxWidth = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const BIO_FIELDS = [
  { key: 'vleugel', label: 'Vleugel', unit: 'mm' },
  { key: 'gewicht', label: 'Gewicht', unit: 'g' },
  { key: 'handpenlengte', label: 'P8 / Handpen', unit: 'mm' },
  { key: 'staartlengte', label: 'Staart', unit: 'mm' },
  { key: 'kop_snavel', label: 'Kop+snavel', unit: 'mm' },
  { key: 'tarsus_lengte', label: 'Tarsus', unit: 'mm' },
  { key: 'tarsus_dikte', label: 'Tarsus dikte', unit: 'mm' },
  { key: 'snavel_schedel', label: 'Snavel-schedel', unit: 'mm' },
];

const ALL_BOEKEN = [
  { key: 'svensson_2023', label: 'Svensson (2023)' },
  { key: 'svensson_2016', label: 'Svensson (2016)' },
  { key: 'demongin_2020', label: 'Demongin (2020)' },
  { key: 'blasco_zumeta_2023', label: 'Blasco-Zumeta (2023)' },
  { key: 'jenni_winkler_2020', label: 'Jenni & Winkler (2020)' },
  { key: 'baker_2016', label: 'Baker (2016)' },
  { key: 'klaassen_voorjaar', label: 'Klaassen voorjaar (2023)' },
  { key: 'klaassen_najaar', label: 'Klaassen najaar (2023)' },
  { key: 'conings_1999', label: 'Conings (1999)' },
  { key: 'speek_1994', label: 'Speek (1994)' },
];

const EDITABLE_FIELDS = {
  namen: [
    { key: 'naam_lat', label: '🌐 Latijn' },
    { key: 'naam_nl', label: '🇳🇱 Nederlands' },
    { key: 'naam_en', label: '🇬🇧 Engels' },
    { key: 'naam_de', label: '🇩🇪 Duits' },
    { key: 'naam_fr', label: '🇫🇷 Frans' },
    { key: 'naam_es', label: '🇪🇸 Spaans' },
  ],
  taxonomie: [
    { key: 'familie', label: 'Familie' },
    { key: 'orde', label: 'Orde' },
  ],
  ring: [
    { key: 'ringmaat', label: 'Ringmaat' },
    { key: 'ruitype', label: 'Ruitype' },
  ],
  nest: [
    { key: 'nest_eileg', label: 'Eileg' },
    { key: 'nest_broedels', label: 'Broedels' },
    { key: 'nest_eieren', label: 'Eieren' },
    { key: 'nest_ei_dagen', label: 'Broedtijd (dagen)' },
    { key: 'nest_jong_dagen', label: 'Nestjong (dagen)' },
    { key: 'broed', label: 'Broed', gender: true },
    { key: 'zorg', label: 'Zorg', gender: true },
  ],
  boeken: ALL_BOEKEN,
};

const boekKeys = new Set(ALL_BOEKEN.map(b => b.key));

function isBoekKey(key) {
  return boekKeys.has(key);
}

export default function SoortDetail({ records, speciesOverrides }) {
  const { naam } = useParams();
  const navigate = useNavigate();
  const decodedNaam = decodeURIComponent(naam);
  const fileInputRef = useRef(null);
  const cropRef = useRef(null);
  const dragStartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isAdmin, isViewer } = useRole();
  const speciesRef = useSpeciesRef();
  const soorten = useMemo(
    () => speciesRef.filter(s => s.naam_nl && !s.naam_nl.includes('groene tekst')),
    [speciesRef]
  );

  const defaultSoort = soorten.find(s => s.naam_nl === decodedNaam);
  const soort = speciesOverrides
    ? speciesOverrides.getMerged(decodedNaam, defaultSoort || {})
    : defaultSoort;

  const isNieuweSoort = decodedNaam === '__nieuw__';
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [vangstenOpen, setVangstenOpen] = useState(false);

  // Auto-start edit voor een nieuwe soort
  useEffect(() => {
    if (isNieuweSoort && isAdmin) setEditMode(true);
  }, [isNieuweSoort, isAdmin]);

  const soortRecords = useMemo(() => {
    if (!decodedNaam) return [];
    const lower = decodedNaam.toLowerCase();
    return records.filter(r => r.vogelnaam && r.vogelnaam.toLowerCase() === lower);
  }, [records, decodedNaam]);

  // Biometriewaarde: uit samengevoegde soortdata (admin-base + gebruikersoverride)
  const getBioValue = (field, stat) => soort[`bio_${field}_${stat}`] ?? '';
  const fmtBio = val => {
    if (val === '' || val == null) return val;
    const n = parseFloat(String(val).replace(',', '.'));
    return !isNaN(n) && n % 1 === 0 ? String(Math.round(n)) : val;
  };

  const startEdit = () => {
    const data = {};
    Object.values(EDITABLE_FIELDS).flat().forEach(f => {
      if (isBoekKey(f.key)) {
        data[f.key] = soort.boeken?.[f.key] ?? '';
      } else {
        data[f.key] = soort[f.key] ?? '';
      }
    });
    // Bio fields: prefill met huidige waarden (admin-basis of eigen override)
    BIO_FIELDS.forEach(f => {
      ['min', 'max'].forEach(stat => {
        const key = `bio_${f.key}_${stat}`;
        data[key] = getBioValue(f.key, stat);
      });
      // Geslachtsspecifieke biometrie
      ['M', 'F'].forEach(gender => {
        ['min', 'avg', 'max'].forEach(stat => {
          const key = `bio_${f.key}_${gender}_${stat}`;
          data[key] = soort[key] ?? '';
        });
      });
    });
    // Geslachtsbepaling: apart voor man en vrouw
    // Migratie: oude geslachts_notities / ruitype_notities valt terug op ♂-veld
    data.geslachts_notities_m = soort.geslachts_notities_m ?? soort.geslachts_notities ?? soort.ruitype_notities ?? '';
    data.geslachts_notities_f = soort.geslachts_notities_f ?? '';
    // Leeftijdsbepaling: apart voor voorjaar en najaar
    // Migratie: oude leeftijds_notities valt terug op voorjaar-veld
    data.leeftijds_notities_vj = soort.leeftijds_notities_vj ?? soort.leeftijds_notities ?? '';
    data.leeftijds_notities_nj = soort.leeftijds_notities_nj ?? '';
    data.foto = soort.foto ?? '';
    data.foto_crop = soort.foto_crop ?? { x: 50, y: 50, zoom: 1 };
    setEditData(data);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditData({});
    if (isNieuweSoort) navigate('/soorten');
  };

  const deleteSoort = async () => {
    if (!window.confirm(`Weet je zeker dat je "${decodedNaam}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) return;
    await supabase.from('species').delete().eq('naam_nl', decodedNaam);
    await db.species.delete(decodedNaam);
    navigate('/soorten');
  };

  const saveEdit = async () => {
    if (isNieuweSoort && !editData.naam_nl?.trim()) {
      alert('Vul een Nederlandse naam in voor de nieuwe soort.');
      return;
    }
    if (isAdmin) {
      // Admin: sla volledige soortdata op in Supabase species tabel + Dexie
      const adminData = {
        ...defaultSoort,
        boeken: { ...(defaultSoort?.boeken || {}) },
      };

      Object.values(EDITABLE_FIELDS).flat().forEach(f => {
        if (isBoekKey(f.key)) {
          if (editData[f.key]) {
            adminData.boeken[f.key] = editData[f.key];
          } else {
            delete adminData.boeken[f.key];
          }
        } else {
          adminData[f.key] = editData[f.key] ?? '';
        }
      });

      BIO_FIELDS.forEach(f => {
        ['min', 'max'].forEach(stat => {
          const key = `bio_${f.key}_${stat}`;
          adminData[key] = editData[key] ?? '';
        });
        ['M', 'F'].forEach(gender => {
          ['min', 'max'].forEach(stat => {
            const key = `bio_${f.key}_${gender}_${stat}`;
            adminData[key] = editData[key] ?? '';
          });
        });
      });

      adminData.geslachts_notities_m = editData.geslachts_notities_m ?? '';
      adminData.geslachts_notities_f = editData.geslachts_notities_f ?? '';
      adminData.leeftijds_notities_vj = editData.leeftijds_notities_vj ?? '';
      adminData.leeftijds_notities_nj = editData.leeftijds_notities_nj ?? '';
      if (editData.foto !== undefined) adminData.foto = editData.foto;
      adminData.foto_crop = editData.foto_crop ?? null;

      const newNaamNl = adminData.naam_nl || decodedNaam;
      const naamGewijzigd = newNaamNl !== decodedNaam;

      if (naamGewijzigd) {
        await supabase.from('species').delete().eq('naam_nl', decodedNaam);
        await db.species.delete(decodedNaam);
      }

      const { error } = await supabase
        .from('species')
        .upsert({ naam_nl: newNaamNl, data: adminData });

      if (error) {
        alert('Opslaan mislukt: ' + error.message);
        return;
      }

      await db.species.put(adminData);

      if (naamGewijzigd) {
        setEditMode(false);
        setEditData({});
        navigate('/soorten' + encodeURIComponent(newNaamNl));
        return;
      }
    } else {
      // Ringer: sla delta op als override (alleen voor eigen view)
      if (!speciesOverrides) return;
      const changes = {};
      const boekenChanges = {};

      Object.values(EDITABLE_FIELDS).flat().forEach(f => {
        const defaultVal = isBoekKey(f.key) ? (defaultSoort?.boeken?.[f.key] ?? '') : (defaultSoort?.[f.key] ?? '');
        const newVal = editData[f.key] ?? '';
        if (String(newVal) !== String(defaultVal)) {
          if (isBoekKey(f.key)) {
            boekenChanges[f.key] = newVal;
          } else {
            changes[f.key] = newVal;
          }
        }
      });

      if (Object.keys(boekenChanges).length > 0) {
        changes.boeken = boekenChanges;
      }

      // Bio overrides: alleen opslaan als afwijkend van admin-basisdata
      BIO_FIELDS.forEach(f => {
        ['min', 'max'].forEach(stat => {
          const key = `bio_${f.key}_${stat}`;
          const editVal = editData[key] ?? '';
          const defaultVal = defaultSoort?.[key] ?? '';
          if (String(editVal) !== String(defaultVal)) {
            changes[key] = editVal;
          }
        });
        // Geslachtsspecifieke biometrie overrides
        ['M', 'F'].forEach(gender => {
          ['min', 'avg', 'max'].forEach(stat => {
            const key = `bio_${f.key}_${gender}_${stat}`;
            const editVal = editData[key] ?? '';
            const defaultVal = defaultSoort?.[key] ?? '';
            if (String(editVal) !== String(defaultVal)) {
              changes[key] = editVal;
            }
          });
        });
      });

      const defGeslM = defaultSoort?.geslachts_notities_m ?? defaultSoort?.geslachts_notities ?? defaultSoort?.ruitype_notities ?? '';
      if (editData.geslachts_notities_m !== defGeslM) changes.geslachts_notities_m = editData.geslachts_notities_m;
      const defGeslF = defaultSoort?.geslachts_notities_f ?? '';
      if (editData.geslachts_notities_f !== defGeslF) changes.geslachts_notities_f = editData.geslachts_notities_f;
      const defLeeftVj = defaultSoort?.leeftijds_notities_vj ?? defaultSoort?.leeftijds_notities ?? '';
      if (editData.leeftijds_notities_vj !== defLeeftVj) changes.leeftijds_notities_vj = editData.leeftijds_notities_vj;
      const defLeeftNj = defaultSoort?.leeftijds_notities_nj ?? '';
      if (editData.leeftijds_notities_nj !== defLeeftNj) changes.leeftijds_notities_nj = editData.leeftijds_notities_nj;
      if (editData.foto && editData.foto !== (defaultSoort?.foto ?? '')) {
        changes.foto = editData.foto;
      }
      if (editData.foto_crop) changes.foto_crop = editData.foto_crop;

      speciesOverrides.saveOverride(decodedNaam, changes);
    }

    setEditMode(false);
    setEditData({});
  };

  const handleField = (key, value) => {
    setEditData(prev => ({ ...prev, [key]: value }));
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    setEditData(prev => ({ ...prev, foto: dataUrl }));
  };

  const genderStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const g = r.geslacht || 'U';
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  const ageStats = useMemo(() => {
    const counts = {};
    soortRecords.forEach(r => {
      const a = r.leeftijd || '0';
      counts[a] = (counts[a] || 0) + 1;
    });
    return counts;
  }, [soortRecords]);

  const tvCount = soortRecords.filter(r => r.metalenringinfo === 4 || r.metalenringinfo === '4').length;

  if (speciesRef.length === 0) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>← Terug</button>
        <div className="empty-state">Laden...</div>
      </div>
    );
  }

  if (!defaultSoort) {
    return (
      <div className="page">
        <button className="btn-secondary" onClick={() => navigate('/soorten')}>← Terug</button>
        <div className="empty-state">Soort niet gevonden</div>
      </div>
    );
  }

  const foto = editMode ? editData.foto : soort.foto;
  // Geslachtsbepaling per geslacht (migratie: oud veld → ♂)
  const geslachtsM = editMode
    ? editData.geslachts_notities_m
    : (soort.geslachts_notities_m || soort.geslachts_notities || soort.ruitype_notities);
  const geslachtsF = editMode ? editData.geslachts_notities_f : soort.geslachts_notities_f;
  // Leeftijdsbepaling per seizoen (migratie: oud veld → voorjaar)
  const leeftijdsVj = editMode
    ? editData.leeftijds_notities_vj
    : (soort.leeftijds_notities_vj || soort.leeftijds_notities);
  const leeftijdsNj = editMode ? editData.leeftijds_notities_nj : soort.leeftijds_notities_nj;

  // Biometrie: databron per cel bepalen voor weergavekleur + legenda
  const bioUserOverride = speciesOverrides?.getOverride(decodedNaam) || {};
  const hasBioData = BIO_FIELDS.some(b =>
    getBioValue(b.key, 'min') || getBioValue(b.key, 'max') ||
    soort[`bio_${b.key}_M_min`] || soort[`bio_${b.key}_M_max`] ||
    soort[`bio_${b.key}_F_min`] || soort[`bio_${b.key}_F_max`]
  );
  const bioCellCls = (key) => {
    if (bioUserOverride[key] !== undefined && bioUserOverride[key] !== '') return 'sd-bio-num sd-bio-user-ov';
    if (defaultSoort?.[key] !== undefined && defaultSoort?.[key] !== '') return 'sd-bio-num sd-bio-lit';
    return 'sd-bio-num';
  };
  const hasAdminBio = BIO_FIELDS.some(b =>
    defaultSoort?.[`bio_${b.key}_min`] || defaultSoort?.[`bio_${b.key}_max`] ||
    defaultSoort?.[`bio_${b.key}_M_min`] || defaultSoort?.[`bio_${b.key}_F_min`]
  );
  const hasUserBio = BIO_FIELDS.some(b => {
    const keys = ['min', 'max'].flatMap(s =>
      [`bio_${b.key}_${s}`, `bio_${b.key}_M_${s}`, `bio_${b.key}_F_${s}`]
    );
    return keys.some(k => bioUserOverride[k] !== undefined && bioUserOverride[k] !== '');
  });

  const fotoCrop = editMode
    ? (editData.foto_crop ?? { x: 50, y: 50, zoom: 1 })
    : (soort.foto_crop ?? { x: 50, y: 50, zoom: 1 });

  const handleClearFoto = () => {
    handleField('foto', '');
    handleField('foto_crop', { x: 50, y: 50, zoom: 1 });
  };

  const handlePointerDown = (e) => {
    if (!cropRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const crop = editData.foto_crop ?? { x: 50, y: 50, zoom: 1 };
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!dragStartRef.current || !cropRef.current) return;
    const { clientX, clientY, cropX, cropY } = dragStartRef.current;
    const rect = cropRef.current.getBoundingClientRect();
    const zoom = editData.foto_crop?.zoom ?? 1;
    const dx = e.clientX - clientX;
    const dy = e.clientY - clientY;
    const newX = Math.max(0, Math.min(100, cropX - (dx / rect.width) * 100 * zoom));
    const newY = Math.max(0, Math.min(100, cropY - (dy / rect.height) * 100 * zoom));
    handleField('foto_crop', { zoom, x: newX, y: newY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const crop = editData.foto_crop ?? { x: 50, y: 50, zoom: 1 };
    const newZoom = Math.max(1, Math.min(3, crop.zoom - e.deltaY * 0.001));
    handleField('foto_crop', { ...crop, zoom: newZoom });
  };

  const renderGenderIcons = (val) => {
    if (!val) return <span>—</span>;
    const v = val.toUpperCase();
    const hasM = v.includes('M');
    const hasF = v.includes('V') || v.includes('F');
    return (
      <>
        {hasM && <span className="sd-gender-icon--m">♂</span>}
        {hasF && <span className="sd-gender-icon--f">♀</span>}
        {!hasM && !hasF && <span>{val}</span>}
      </>
    );
  };

  const renderField = (key, label, opts = {}) => {
    if (editMode) {
      const val = editData[key] ?? '';
      return (
        <div className="sd-edit-row" key={key}>
          <label className="sd-edit-label">{label}</label>
          <input
            type="text"
            value={val}
            onChange={e => handleField(key, opts.gender ? e.target.value.toUpperCase() : e.target.value)}
            className="sd-edit-input"
            placeholder={opts.gender ? 'M, V of F, of combinatie (bijv. MV)' : (opts.placeholder || '')}
          />
          {opts.gender && (
            <span className="sd-gender-edit-hint">M = ♂ &nbsp;·&nbsp; V of F = ♀</span>
          )}
        </div>
      );
    }
    const val = isBoekKey(key) ? soort.boeken?.[key] : soort[key];
    if (!val && !opts.showEmpty) return null;
    let display;
    if (opts.gender) {
      display = renderGenderIcons(val);
    } else if (isBoekKey(key) && val) {
      display = <span>p.&nbsp;{val}</span>;
    } else {
      display = val || '—';
    }
    return (
      <div className={`sd-row${opts.muted ? ' sd-row--muted' : ''}`} key={key}>
        <span className="sd-label">{label}</span>
        <span className={`sd-value ${opts.italic ? 'sd-italic' : ''}`}>{display}</span>
      </div>
    );
  };

  return (
    <div className={`page soort-detail${editMode ? ' sd-edit-mode' : ''}`}>
      {!editMode && (
        <button className="btn-secondary sd-back" onClick={() => navigate('/soorten')}>
          ← Terug
        </button>
      )}

      {editMode && (
        <div className="sd-edit-topbar">
          <span className="sd-edit-topbar-indicator">✏️</span>
          <span className="sd-edit-topbar-name">{soort.naam_nl}</span>
          <button className="btn-secondary sd-topbar-btn" onClick={cancelEdit}>Annuleren</button>
          <button className="btn-primary sd-topbar-btn" onClick={saveEdit}>Opslaan</button>
        </div>
      )}

      {/* Hero */}
      <div className="sd-hero">
        {editMode && foto ? (
          <div className="sd-foto-edit-wrapper">
            <div
              ref={cropRef}
              className={`sd-foto sd-foto-crop${isDragging ? ' sd-foto-dragging' : ''}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              <img
                src={foto}
                alt={soort.naam_nl}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${fotoCrop.x}% ${fotoCrop.y}%`,
                  transform: fotoCrop.zoom !== 1 ? `scale(${fotoCrop.zoom})` : undefined,
                  transformOrigin: `${fotoCrop.x}% ${fotoCrop.y}%`,
                  pointerEvents: 'none', userSelect: 'none', display: 'block',
                }}
              />
            </div>
            <div className="sd-foto-crop-controls">
              <div className="sd-foto-zoom-row">
                <span>🔍</span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={fotoCrop.zoom}
                  onChange={e => handleField('foto_crop', { ...fotoCrop, zoom: parseFloat(e.target.value) })}
                  className="sd-foto-zoom-slider"
                />
                <span>{fotoCrop.zoom.toFixed(1)}×</span>
              </div>
              <div className="sd-foto-crop-btns">
                <button className="btn-secondary sd-foto-btn" onClick={() => fileInputRef.current?.click()}>Vervangen</button>
                <button className="btn-secondary sd-foto-btn sd-foto-btn--del" onClick={handleClearFoto}>Wissen</button>
              </div>
              <span className="sd-foto-crop-hint">Sleep om te verschuiven</span>
            </div>
          </div>
        ) : (
          <div
            className={`sd-foto ${editMode ? 'sd-foto-edit' : ''}`}
            onClick={editMode ? () => fileInputRef.current?.click() : undefined}
          >
            {foto ? (
              <img
                src={foto}
                alt={soort.naam_nl}
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  objectPosition: `${fotoCrop.x}% ${fotoCrop.y}%`,
                  transform: fotoCrop.zoom !== 1 ? `scale(${fotoCrop.zoom})` : undefined,
                  transformOrigin: `${fotoCrop.x}% ${fotoCrop.y}%`,
                  pointerEvents: 'none', userSelect: 'none', display: 'block',
                }}
              />
            ) : (
              <div className="sd-foto-placeholder">
                <span>🐦</span>
                {editMode && <span className="sd-foto-hint">Foto toevoegen</span>}
              </div>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          style={{ display: 'none' }}
        />
        <div className="sd-hero-info">
          <h2 className="sd-title">{soort.naam_nl}</h2>
          {soort.naam_lat && <p className="sd-subtitle">{soort.naam_lat}</p>}
          <div className="sd-badges">
            {soort.ringmaat && (
              <span className="sd-badge sd-badge-accent">Ring {soort.ringmaat}</span>
            )}
            {soort.ruitype && (
              <span className="sd-badge sd-badge-muted">{soort.ruitype}</span>
            )}
          </div>
        </div>
        {!editMode && !isViewer && (
          <div className="sd-hero-actions">
            <button className="sd-edit-btn" onClick={startEdit} title="Bewerken">✏️</button>
            {isAdmin && (
              <button className="sd-delete-btn" onClick={deleteSoort} title="Soort verwijderen">🗑️</button>
            )}
            {!isAdmin && speciesOverrides && Object.keys(speciesOverrides.getOverride(decodedNaam)).length > 0 && (
              <button
                className="btn-secondary sd-reset-btn"
                onClick={() => speciesOverrides.resetOverride(decodedNaam)}
                title="Reset naar basisdata"
              >
                ↩ Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Geslachtsbepaling */}
      {(editMode || geslachtsM || geslachtsF) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Geslachtsbepaling</h3>
          {editMode ? (
            <div className="sd-det-fields">
              <div className="sd-det-block sd-det-block--m">
                <span className="sd-det-label sd-det-label--m">♂ Man</span>
                <FormattedTextarea
                  value={editData.geslachts_notities_m || ''}
                  onChange={e => handleField('geslachts_notities_m', e.target.value)}
                  placeholder="Kenmerken voor man..."
                  rows={3}
                />
              </div>
              <div className="sd-det-block sd-det-block--f">
                <span className="sd-det-label sd-det-label--f">♀ Vrouw</span>
                <FormattedTextarea
                  value={editData.geslachts_notities_f || ''}
                  onChange={e => handleField('geslachts_notities_f', e.target.value)}
                  placeholder="Kenmerken voor vrouw..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="sd-det-view">
              {geslachtsM && (
                <div className="sd-det-block">
                  <span className="sd-det-label sd-det-label--m">♂ Man</span>
                  <p className="sd-notities-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(geslachtsM) }} />
                </div>
              )}
              {geslachtsF && (
                <div className="sd-det-block">
                  <span className="sd-det-label sd-det-label--f">♀ Vrouw</span>
                  <p className="sd-notities-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(geslachtsF) }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Leeftijdsbepaling */}
      {(editMode || leeftijdsVj || leeftijdsNj) && (
        <div className="sd-card">
          <h3 className="sd-card-title">Leeftijdsbepaling</h3>
          {editMode ? (
            <div className="sd-det-fields">
              <div className="sd-det-block sd-det-block--vj">
                <span className="sd-det-label sd-det-label--vj">Voorjaar</span>
                <FormattedTextarea
                  value={editData.leeftijds_notities_vj || ''}
                  onChange={e => handleField('leeftijds_notities_vj', e.target.value)}
                  placeholder="Leeftijdsbepaling in voorjaar..."
                  rows={3}
                />
              </div>
              <div className="sd-det-block sd-det-block--nj">
                <span className="sd-det-label sd-det-label--nj">Najaar</span>
                <FormattedTextarea
                  value={editData.leeftijds_notities_nj || ''}
                  onChange={e => handleField('leeftijds_notities_nj', e.target.value)}
                  placeholder="Leeftijdsbepaling in najaar..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="sd-det-view">
              {leeftijdsVj && (
                <div className="sd-det-block">
                  <span className="sd-det-label sd-det-label--vj">Voorjaar</span>
                  <p className="sd-notities-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(leeftijdsVj) }} />
                </div>
              )}
              {leeftijdsNj && (
                <div className="sd-det-block">
                  <span className="sd-det-label sd-det-label--nj">Najaar</span>
                  <p className="sd-notities-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(leeftijdsNj) }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ring & Rui */}
      <div className="sd-card">
        <h3 className="sd-card-title">Ring & Rui</h3>
        {EDITABLE_FIELDS.ring.map(f =>
          renderField(f.key, f.label, { showEmpty: editMode })
        )}
        {!editMode && soort.ruitype && (
          <RuitypeInfo ruitype={soort.ruitype} />
        )}
      </div>

      {/* Namen + Biometrie naast elkaar */}
      <div className="sd-two-cards">
        <div className="sd-card">
          <h3 className="sd-card-title">Namen</h3>
          {EDITABLE_FIELDS.namen.map(f =>
            renderField(f.key, f.label, { italic: f.key === 'naam_lat', showEmpty: editMode })
          )}
          <div className="sd-section-divider" />
          <span className="sd-section-label">Taxonomie</span>
          {EDITABLE_FIELDS.taxonomie.map(f =>
            renderField(f.key, f.label, { showEmpty: editMode, muted: true })
          )}
        </div>
        {(editMode || hasBioData) && (
          <div className="sd-card">
            {editMode ? (
              <>
                <h3 className="sd-card-title">Biometrie</h3>
                {BIO_FIELDS.map(f => (
                  <div key={f.key} className="sd-bio-edit-group">
                    <div className="sd-bio-edit-field-label">{f.label} ({f.unit})</div>
                    {[
                      { prefix: null, label: 'Alg.', cls: '' },
                      { prefix: 'M',  label: '♂',    cls: ' sd-bio-edit-subrow--m' },
                      { prefix: 'F',  label: '♀',    cls: ' sd-bio-edit-subrow--f' },
                    ].map(({ prefix, label, cls }) => (
                      <div key={prefix ?? 'alg'} className={`sd-bio-edit-subrow${cls}`}>
                        <span className="sd-bio-gender-lbl">{label}</span>
                        <div className="sd-bio-edit-inputs">
                          {['min', 'max'].map(stat => {
                            const key = prefix
                              ? `bio_${f.key}_${prefix}_${stat}`
                              : `bio_${f.key}_${stat}`;
                            return (
                              <input
                                key={stat}
                                type="text"
                                inputMode="decimal"
                                value={editData[key] ?? ''}
                                onChange={e => handleField(key, e.target.value.replace(',', '.'))}
                                className="sd-edit-input"
                                placeholder={{ min: 'Min', max: 'Max' }[stat]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <>
                <h3 className="sd-card-title">Biometrie</h3>
                <table className="sd-bio-table">
                  <thead>
                    <tr>
                      <th>Meting</th>
                      <th>Min</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BIO_FIELDS.flatMap(b => {
                      const minKey = `bio_${b.key}_min`;
                      const maxKey = `bio_${b.key}_max`;
                      const minVal = getBioValue(b.key, 'min');
                      const maxVal = getBioValue(b.key, 'max');
                      const rows = [];
                      if (minVal || maxVal) {
                        rows.push(
                          <tr key={b.key}>
                            <td className="sd-bio-field">{b.label} <span className="sd-bio-unit">({b.unit})</span></td>
                            <td className={bioCellCls(minKey)}>{fmtBio(minVal) || '—'}</td>
                            <td className={bioCellCls(maxKey)}>{fmtBio(maxVal) || '—'}</td>
                          </tr>
                        );
                      }
                      [['M', '♂', 'sd-bio-row-m'], ['F', '♀', 'sd-bio-row-f']].forEach(([g, sym, cls]) => {
                        const gMinKey = `bio_${b.key}_${g}_min`;
                        const gMaxKey = `bio_${b.key}_${g}_max`;
                        const gMin = soort[gMinKey];
                        const gMax = soort[gMaxKey];
                        if (gMin || gMax) {
                          rows.push(
                            <tr key={`${b.key}-${g}`} className={cls}>
                              <td className="sd-bio-field sd-bio-field--gender">
                                <span className="sd-bio-gender-tag">{sym}</span> {b.label}
                              </td>
                              <td className={bioCellCls(gMinKey)}>{fmtBio(gMin) || '—'}</td>
                              <td className={bioCellCls(gMaxKey)}>{fmtBio(gMax) || '—'}</td>
                            </tr>
                          );
                        }
                      });
                      return rows;
                    })}
                  </tbody>
                </table>
                {(hasAdminBio || hasUserBio) && (
                  <div className="sd-bio-legend">
                    {hasAdminBio && (
                      <span className="sd-bio-legend-item">
                        <span className="sd-bio-legend-dot sd-bio-legend-dot--lit" />
                        Literatuurdata
                      </span>
                    )}
                    {hasUserBio && (
                      <span className="sd-bio-legend-item">
                        <span className="sd-bio-legend-dot sd-bio-legend-dot--user" />
                        Door jou ingevoerd
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Nestgegevens + Determinatieboeken naast elkaar */}
      <div className="sd-two-cards">
        {(editMode || (soort.nest_eileg && soort.nest_eileg !== 'maanden')) && (
          <div className="sd-card">
            <h3 className="sd-card-title">Nestgegevens</h3>
            {EDITABLE_FIELDS.nest.map(f =>
              renderField(f.key, f.label, { showEmpty: editMode, gender: f.gender })
            )}
          </div>
        )}
        {(editMode || (soort.boeken && Object.keys(soort.boeken).length > 0)) && (
          <div className="sd-card">
            <h3 className="sd-card-title">Determinatieboeken</h3>
            {EDITABLE_FIELDS.boeken.map(f =>
              renderField(f.key, f.label, { showEmpty: editMode })
            )}
          </div>
        )}
      </div>

      {/* Mijn vangsten — verborgen in edit mode */}
      {!editMode && <div className="sd-card">
        <div className="sd-vangsten-header" onClick={() => setVangstenOpen(o => !o)}>
          <h3 className="sd-card-title sd-card-title--toggle">
            Mijn vangsten
            {soortRecords.length > 0 && (
              <span className="sd-vangsten-count">{soortRecords.length}</span>
            )}
          </h3>
          <span className={`sd-vangsten-toggle${vangstenOpen ? ' sd-vangsten-toggle--open' : ''}`}>▼</span>
        </div>
        {vangstenOpen && (soortRecords.length === 0 ? (
          <p className="sd-empty" style={{ marginTop: 10 }}>Nog geen vangsten van deze soort</p>
        ) : (
          <div className="sd-vangsten-content">
            <div className="sd-stats-row">
              <div className="sd-stat">
                <div className="sd-stat-value">{soortRecords.length}</div>
                <div className="sd-stat-label">Totaal</div>
              </div>
              {tvCount > 0 && (
                <div className="sd-stat">
                  <div className="sd-stat-value sd-stat-value--tv">{tvCount}</div>
                  <div className="sd-stat-label">Terugv.</div>
                </div>
              )}
              {Object.entries(genderStats).map(([g, count]) => (
                <div key={g} className="sd-stat">
                  <div className="sd-stat-value">{count}</div>
                  <div className="sd-stat-label">
                    {g === 'M' ? <><span className="sd-gender-icon--m">♂</span> Man</> :
                     g === 'F' ? <><span className="sd-gender-icon--f">♀</span> Vrouw</> :
                     'Onbekend'}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(ageStats).length > 0 && (
              <div className="sd-age-section">
                <span className="sd-sub-title">Leeftijdsverdeling</span>
                {(() => {
                  const AGE_ORDER = ['1', '3', '4', '5', '6', '7', '8', '9', 'A', '2', '0'];
                  const sorted = AGE_ORDER.filter(c => ageStats[c]).map(c => [c, ageStats[c]]);
                  const maxCount = Math.max(...sorted.map(([, n]) => n));
                  return (
                    <div className="sd-age-chart">
                      {sorted.map(([code, count]) => (
                        <div key={code} className="sd-age-bar-row">
                          <span className="sd-age-bar-label">{leeftijdLabel(code)}</span>
                          <div className="sd-age-bar-track">
                            <div className="sd-age-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                          </div>
                          <span className="sd-age-bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            <VangstKaart targetRecords={soortRecords} allRecords={records} />

            <div className="sd-recent-section">
              <span className="sd-sub-title">Recente vangsten</span>
              {[...soortRecords]
                .sort((a, b) => {
                  const parseDate = d => {
                    if (!d) return 0;
                    const [dd, mm, yyyy] = d.split('-');
                    return new Date(yyyy, mm - 1, dd).getTime();
                  };
                  const dateA = parseDate(a.vangstdatum);
                  const dateB = parseDate(b.vangstdatum);
                  if (dateB !== dateA) return dateB - dateA;
                  // Zelfde datum: ringnummer als tiebreaker, maar alleen voor nieuwe vangsten
                  const isTvA = a.metalenringinfo === 4 || a.metalenringinfo === '4';
                  const isTvB = b.metalenringinfo === 4 || b.metalenringinfo === '4';
                  if (!isTvA && !isTvB) {
                    const ringNum = s => {
                      const m = s?.replace(/\./g, '').match(/^[A-Za-z]*(\d+)[A-Za-z]*$/);
                      return m ? parseInt(m[1], 10) : 0;
                    };
                    return ringNum(b.ringnummer) - ringNum(a.ringnummer);
                  }
                  return 0;
                })
                .slice(0, 10)
                .map(r => {
                  const isTerugvangst = r.metalenringinfo === 4 || r.metalenringinfo === '4';
                  return (
                    <div key={r.id} className={`sd-recent-item${isTerugvangst ? ' sd-recent-item--tv' : ''}`}>
                      <span className="sd-recent-type">{isTerugvangst ? 'TV' : 'NV'}</span>
                      <span
                        className="sd-recent-ring ring-link"
                        onClick={() => navigate('/records', { state: { openId: r.id } })}
                      >{r.ringnummer}</span>
                      <span className="sd-recent-date">{r.vangstdatum}</span>
                      <span className="sd-recent-meta">
                        {r.geslacht && r.geslacht !== 'U' && <>{r.geslacht}</>}
                        {r.leeftijd && <> · {leeftijdLabel(r.leeftijd)}</>}
                      </span>
                    </div>
                  );
                })}
              <button
                className="sd-all-records-link"
                onClick={() => navigate('/records', { state: { filterSoort: decodedNaam } })}
              >
                Alle {soortRecords.length} vangsten van {soort.naam_nl} →
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
