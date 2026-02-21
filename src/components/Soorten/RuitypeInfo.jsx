/**
 * Gedeelde component: toont ruikalender + seizoensomschrijving voor ruitype A/B/C/D.
 * Wordt gebruikt in SoortDetail (soortkaart) én in NieuwPage (invoerformulier).
 */
import './RuitypeInfo.css';

const MAANDEN = ['Mei','Jun','Jul','Aug','Sep','Okt','Nov','Dec','Jan','Feb','Mrt','Apr'];

function Kalender({ juv, ad }) {
  return (
    <div className="rui-kalender">
      <KalRij label="Juv." segmenten={juv} />
      <div className="rui-kal-maanden">
        {MAANDEN.map((m, i) => (
          <span
            key={m}
            className={`rui-kal-maand${m === 'Dec' ? ' rui-kal-maand--dec' : ''}${m === 'Jan' ? ' rui-kal-maand--jan' : ''}`}
          >{m}</span>
        ))}
      </div>
      <KalRij label="Ad." segmenten={ad} />
    </div>
  );
}

function KalRij({ label, segmenten }) {
  return (
    <div className="rui-kal-rij">
      <span className="rui-kal-zijlabel">{label}</span>
      <div className="rui-kal-balk">
        {segmenten.map(({ type, span, tekst }, i) => (
          <div key={i} className={`rui-kal-seg rui-kal-seg--${type}`} style={{ gridColumn: `span ${span}` }}>
            {tekst}
          </div>
        ))}
      </div>
    </div>
  );
}

function Seizoenen({ items }) {
  return (
    <div className="rui-tekst">
      {items.map(({ seizoen, opties, separator }, i) => (
        <div key={i} className={`rui-groep${separator ? ' rui-groep--separator' : ''}`}>
          <span className="rui-seizoen">{seizoen}</span>
          <div className="rui-opties">
            {opties.map(({ cond, val }, j) => (
              <div key={j} className="rui-optie">
                {cond && <span className="rui-cond">{cond}</span>}
                <span className="rui-val">{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Type A ────────────────────────────────────────────────────────────────
function RuitypeA() {
  return (
    <div className="rui-blok rui-blok--accent">
      <Kalender
        juv={[
          { type: 'pull', span: 1, tekst: 'pull.' },
          { type: 'juv',  span: 2, tekst: 'juv' },
          { type: 'rui',  span: 2, tekst: 'complete rui' },
          { type: 'vol',  span: 3, tekst: 'volgroeid' },
          { type: 'akj',  span: 4, tekst: 'na 1 kj' },
        ]}
        ad={[
          { type: 'vol', span: 3, tekst: 'volgroeid' },
          { type: 'rui', span: 2, tekst: 'complete rui' },
          { type: 'vol', span: 3, tekst: 'volgroeid' },
          { type: 'akj', span: 4, tekst: 'na 1 kj' },
        ]}
      />
      <Seizoenen items={[
        { seizoen: 'Voorjaar', opties: [{ val: 'na 1 kj — leeftijd niet mogelijk' }] },
        { seizoen: 'Najaar',   opties: [{ val: 'volgroeid — leeftijd niet mogelijk' }], separator: true },
      ]} />
    </div>
  );
}

// ─── Type B ────────────────────────────────────────────────────────────────
function RuitypeB() {
  return (
    <div className="rui-blok rui-blok--accent">
      <Kalender
        juv={[
          { type: 'pull', span: 1, tekst: 'pull.' },
          { type: 'juv',  span: 2, tekst: 'juv' },
          { type: 'rui',  span: 2, tekst: 'part. rui' },
          { type: 'vol',  span: 3, tekst: '1 kj' },
          { type: 'akj',  span: 4, tekst: '2 kj' },
        ]}
        ad={[
          { type: 'vol', span: 3, tekst: '2kj / na 2kj' },
          { type: 'rui', span: 2, tekst: 'complete rui' },
          { type: 'akj', span: 3, tekst: 'na 1 kj' },
          { type: 'akj', span: 4, tekst: 'na 2 kj' },
        ]}
      />
      <Seizoenen items={[
        { seizoen: 'Voorjaar', opties: [
          { cond: 'met ruigrens',    val: '1 kj' },
          { cond: 'zonder ruigrens', val: 'na 1 kj' },
        ]},
        { seizoen: 'Najaar', opties: [
          { cond: 'met ruigrens',    val: '2 kj' },
          { cond: 'zonder ruigrens', val: 'na 2 kj' },
        ], separator: true },
      ]} />
    </div>
  );
}

// ─── Type C ────────────────────────────────────────────────────────────────
function RuitypeC() {
  return (
    <div className="rui-blok rui-blok--accent">
      <Kalender
        juv={[
          { type: 'pull', span: 1, tekst: 'pull.' },
          { type: 'juv',  span: 2, tekst: 'juv' },
          { type: 'rui',  span: 2, tekst: 'part. rui' },
          { type: 'vol',  span: 3, tekst: '1 kj' },
          { type: 'rui',  span: 1, tekst: 'p.r.' },
          { type: 'vol',  span: 3, tekst: '2 kj' },
        ]}
        ad={[
          { type: 'vol', span: 3, tekst: '2kj / na 2kj' },
          { type: 'rui', span: 2, tekst: 'complete rui' },
          { type: 'akj', span: 3, tekst: 'na 1 kj' },
          { type: 'rui', span: 1, tekst: 'p.r.' },
          { type: 'akj', span: 3, tekst: 'na 2 kj' },
        ]}
      />
      <Seizoenen items={[
        { seizoen: 'Voorjaar', opties: [
          { cond: 'twee ruigrenzen', val: '2 kj' },
          { cond: 'één ruigrens',    val: 'na 2 kj' },
          { cond: 'twijfel',         val: 'na 1 kj' },
        ]},
        { seizoen: 'Najaar', opties: [
          { cond: 'ruigrens',     val: '1 kj' },
          { cond: 'geen ruigrens', val: 'na 1 kj' },
        ], separator: true },
      ]} />
    </div>
  );
}

// ─── Type D ────────────────────────────────────────────────────────────────
function RuitypeD() {
  return (
    <div className="rui-blok rui-blok--accent">
      <Kalender
        juv={[
          { type: 'pull', span: 1, tekst: 'pull.' },
          { type: 'juv',  span: 2, tekst: 'juv' },
          { type: 'rui',  span: 2, tekst: 'part. rui' },
          { type: 'vol',  span: 3, tekst: '1 kj' },
          { type: 'rui',  span: 1, tekst: 'c.r.' },
          { type: 'akj',  span: 3, tekst: 'na 1 kj' },
        ]}
        ad={[
          { type: 'vol', span: 3, tekst: 'volgroeid' },
          { type: 'rui', span: 2, tekst: 'complete rui' },
          { type: 'akj', span: 3, tekst: 'na 1 kj' },
          { type: 'rui', span: 1, tekst: 'c.r.' },
          { type: 'akj', span: 3, tekst: 'na 1 kj' },
        ]}
      />
      <Seizoenen items={[
        { seizoen: 'Voorjaar', opties: [
          { val: 'niet mogelijk op kleed — na 1 kj' },
        ]},
        { seizoen: 'Najaar', opties: [
          { cond: 'vers kleed',     val: '1 kj' },
          { cond: 'versleten kleed', val: 'na 1 kj' },
        ], separator: true },
      ]} />
    </div>
  );
}

// ─── Hoofd-export ──────────────────────────────────────────────────────────
const RUITYPE_COMPONENTS = { A: RuitypeA, B: RuitypeB, C: RuitypeC, D: RuitypeD };

export default function RuitypeInfo({ ruitype }) {
  const Component = RUITYPE_COMPONENTS[ruitype];
  if (!Component) return null;
  return <Component />;
}
