import { forwardRef } from 'react';

/* ================================================================
 * Palet warna sertifikat (hex — aman untuk html2canvas & print)
 * ================================================================ */
const C = {
  ivory: '#FFFFFF',
  ink: '#0A3D27',
  deep: '#0B5D3B',
  forest: '#0E7245',
  slate: '#5B7268',
  slateSoft: '#8AA096',
  gold: '#C9A227',
  goldSoft: '#D9BC6B',
  footer1: '#04281A',
  footer2: '#075233',
} as const;

const SANS = "'Inter', 'Segoe UI', Arial, sans-serif";
const SCRIPT = "'Great Vibes', 'Segoe Script', cursive";
const ARABIC = "'Amiri Quran', 'Scheherazade New', serif";

export interface CertificateTemplateData {
  certificateNumber: string;
  studentName: string;
  studentCode?: string | null;
  className?: string | null;
  juzLabel: string;
  institutionName?: string | null;
  institutionCity?: string | null;
  issuedDateFormatted: string;
  pembinaName?: string | null;
  pembinaLabel?: string | null;
  pengajarName?: string | null;
  pengajarLabel?: string | null;
  sealUrl?: string | null;
  verifyUrl: string;
  qrDataUrl?: string | null;
  logoUrl?: string | null;
}

export interface CertificateTemplateProps {
  data: CertificateTemplateData;
}

/* ================================================================
 * Ornamen dekoratif
 *
 * Catatan teknis: ornamen sengaja dibangun dari <div> dengan CSS
 * background-image: linear-gradient + border-radius (bukan SVG
 * gradient), karena html2canvas mendukung penuh CSS gradient namun
 * sering gagal merender fill SVG gradient saat ekspor PDF.
 * ================================================================ */

/** Aliran hijau zamrud kecil dari sudut kanan-atas + garis emas (samar). */
function TopRightFlow() {
  const ellipse = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
    ...extra,
  });

  return (
    <>
      {/* halo sage transparan */}
      <div style={ellipse({ top: -290, right: -180, width: 470, height: 370, background: 'rgba(16,114,69,0.08)' })} />
      {/* bentuk utama emerald */}
      <div
        style={ellipse({
          top: -248,
          right: -150,
          width: 420,
          height: 320,
          background: 'linear-gradient(135deg, #0E7245 0%, #0A5C3C 45%, #084A2E 100%)',
        })}
      />
      {/* garis aksen emas tipis mengikuti alur lengkung */}
      <div
        style={ellipse({
          top: -262,
          right: -164,
          width: 452,
          height: 356,
          border: `1.5px solid ${C.goldSoft}`,
          opacity: 0.85,
        })}
      />
      {/* titik emas kecil */}
      <div style={ellipse({ top: 96, right: 238, width: 5, height: 5, background: C.goldSoft })} />
      <div style={ellipse({ top: 86, right: 226, width: 3, height: 3, background: C.goldSoft })} />
    </>
  );
}

/** Aliran hijau kecil dari sudut kiri-bawah + garis emas (samar). */
function BottomLeftFlow() {
  const ellipse = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    borderRadius: '50%',
    pointerEvents: 'none',
    ...extra,
  });

  return (
    <>
      {/* halo sage transparan */}
      <div style={ellipse({ bottom: -215, left: -175, width: 360, height: 285, background: 'rgba(16,114,69,0.08)' })} />
      {/* bentuk utama emerald */}
      <div
        style={ellipse({
          bottom: -185,
          left: -148,
          width: 310,
          height: 235,
          background: 'linear-gradient(315deg, #0E7245 0%, #0A5C3C 45%, #084A2E 100%)',
        })}
      />
      {/* garis aksen emas tipis */}
      <div
        style={ellipse({
          bottom: -196,
          left: -158,
          width: 334,
          height: 262,
          border: `1.4px solid ${C.goldSoft}`,
          opacity: 0.85,
        })}
      />
      <div style={ellipse({ bottom: 62, left: 178, width: 4.5, height: 4.5, background: C.goldSoft })} />
    </>
  );
}

/** Bingkai ganda emas — aksen stationery premium yang tegas & minimalis. */
function FrameBorder() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          bottom: 16,
          left: 16,
          border: `2px solid rgba(201,162,39,0.85)`,
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          bottom: 24,
          left: 24,
          border: '1px solid rgba(201,162,39,0.5)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    </>
  );
}

/** Siluet masjid sangat samar di latar bagian bawah (hijau muda keabu-abuan). */
function MosqueSilhouette() {
  return (
    <svg
      width={780}
      height={132}
      viewBox="0 0 780 132"
      style={{ position: 'absolute', bottom: 56, left: '50%', transform: 'translateX(-50%)' }}
      aria-hidden="true"
    >
      <g fill="rgba(16,94,60,0.035)">
        {/* menara kiri */}
        <rect x={128} y={38} width={13} height={94} rx={2} />
        <path d="M134.5 14 L144 38 H125 Z" />
        <rect x={124} y={52} width={21} height={4} rx={2} />
        {/* bangunan samping kiri */}
        <rect x={168} y={86} width={110} height={46} rx={3} />
        <path d="M198 86 A24 24 0 0 1 246 86 Z" />
        {/* menara tengah-kiri */}
        <rect x={296} y={30} width={11} height={102} rx={2} />
        <path d="M301.5 10 L310 30 H293 Z" />
        {/* kubah utama (bawang) */}
        <path d="M340 96 C340 62 362 46 374 30 C378 22 382 16 390 12 C398 16 402 22 406 30 C418 46 440 62 440 96 Z" />
        <line x1={390} y1={12} x2={390} y2={0} stroke="rgba(16,94,60,0.035)" strokeWidth={3} />
        <circle cx={390} cy={2} r={3} />
        {/* bangunan utama */}
        <rect x={318} y={96} width={144} height={36} rx={3} />
        {/* menara tengah-kanan */}
        <rect x={473} y={30} width={11} height={102} rx={2} />
        <path d="M478.5 10 L487 30 H470 Z" />
        {/* bangunan samping kanan */}
        <rect x={502} y={86} width={110} height={46} rx={3} />
        <path d="M532 86 A24 24 0 0 1 580 86 Z" />
        {/* menara kanan */}
        <rect x={639} y={38} width={13} height={94} rx={2} />
        <path d="M645.5 14 L655 38 H636 Z" />
        <rect x={635} y={52} width={21} height={4} rx={2} />
      </g>
    </svg>
  );
}

/** Emblem resmi: cincin emas ganda + kitab & bulan sabit (atau logo lembaga). */
function Emblem({ logoUrl }: { logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          border: `2px solid ${C.gold}`,
          padding: 4,
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(10,61,39,0.15)',
        }}
      >
        <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" aria-label="Emblem">
      <circle cx={32} cy={32} r={30} fill="#0D6B45" stroke={C.gold} strokeWidth={2.4} />
      {/* kilau atas berlapis (pengganti gradient — aman untuk ekspor PDF) */}
      <circle cx={32} cy={24} r={20} fill="rgba(255,255,255,0.10)" />
      <circle cx={32} cy={32} r={25} fill="none" stroke={C.goldSoft} strokeWidth={0.9} strokeDasharray="2 3" />
      {/* bulan sabit */}
      <path
        d="M40.5 17.5 a10.5 10.5 0 1 0 0 15 a8 8 0 1 1 0 -15 Z"
        transform="rotate(-28 32 25)"
        fill={C.goldSoft}
      />
      {/* kitab terbuka */}
      <path
        d="M14 42 C19 38.6 25 38.6 31 41.4 V53 C25 50.2 19 50.2 14 53.6 Z"
        fill="#FFFFFF"
      />
      <path
        d="M50 42 C45 38.6 39 38.6 33 41.4 V53 C39 50.2 45 50.2 50 53.6 Z"
        fill="#FFFFFF"
      />
      <line x1={32} y1={41.4} x2={32} y2={53} stroke={C.goldSoft} strokeWidth={1.4} />
      <circle cx={49} cy={15} r={1.7} fill={C.goldSoft} />
    </svg>
  );
}

/** Pembatas ornamental elegan: garis — wajik — garis. */
function OrnamentDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
      <span style={{ display: 'block', width: 88, height: 1, background: `linear-gradient(to left, ${C.gold}, transparent)` }} />
      <span style={{ display: 'block', width: 7, height: 7, background: C.gold, transform: 'rotate(45deg)' }} />
      <span style={{ display: 'block', width: 12, height: 1, background: C.gold }} />
      <span style={{ display: 'block', width: 9, height: 9, border: `1.4px solid ${C.gold}`, transform: 'rotate(45deg)' }} />
      <span style={{ display: 'block', width: 12, height: 1, background: C.gold }} />
      <span style={{ display: 'block', width: 7, height: 7, background: C.gold, transform: 'rotate(45deg)' }} />
      <span style={{ display: 'block', width: 88, height: 1, background: `linear-gradient(to right, ${C.gold}, transparent)` }} />
    </div>
  );
}

/** Segel medali resmi emas-hijau di bagian bawah tengah — atau logo kustom lembaga. */
function Seal({ sealUrl }: { sealUrl?: string | null }) {
  if (sealUrl) {
    return (
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: '50%',
          border: `3px solid ${C.gold}`,
          padding: 5,
          background: '#FFFFFF',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img src={sealUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }

  return (
    <svg width={112} height={112} viewBox="0 0 112 112" aria-label="Segel resmi">
      <circle cx={56} cy={56} r={53} fill="#FFFFFF" stroke={C.gold} strokeWidth={3} />
      <circle cx={56} cy={56} r={45} fill="none" stroke={C.goldSoft} strokeWidth={1} strokeDasharray="2.5 3.5" />
      {/* piringan berlapis (pengganti gradient — aman untuk ekspor PDF) */}
      <circle cx={56} cy={56} r={39} fill="#0F7A4E" />
      <circle cx={56} cy={50} r={36} fill="rgba(255,255,255,0.08)" />
      <circle cx={56} cy={56} r={30} fill="#08462C" />
      {/* bintang segi delapan tipis */}
      <g stroke="rgba(217,188,107,0.5)" strokeWidth={0.8} fill="none">
        <rect x={40} y={40} width={32} height={32} />
        <rect x={40} y={40} width={32} height={32} transform="rotate(45 56 56)" />
      </g>
      {/* bulan sabit + bintang */}
      <path
        d="M63.5 38 a15.5 15.5 0 1 0 0 36 a11.5 11.5 0 1 1 0 -36 Z"
        transform="rotate(-24 56 56)"
        fill={C.goldSoft}
      />
      <path d="M67 44 l1.9 3.9 4.3 .5 -3.2 3 .85 4.25 -3.85 -2.1 -3.85 2.1 .85 -4.25 -3.2 -3 4.3 -.5 Z" fill={C.goldSoft} />
      {/* titik dekorasi pada cincin */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        return <circle key={deg} cx={56 + Math.cos(rad) * 49} cy={56 + Math.sin(rad) * 49} r={1.8} fill={C.gold} />;
      })}
    </svg>
  );
}

/** Blok tanda tangan. */
function SignatureBlock({ role, name }: { role: string; name?: string | null }) {
  return (
    <div style={{ width: 218, textAlign: 'center' }}>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.slate,
        }}
      >
        {role}
      </p>
      <div style={{ height: 44 }} />
      {name ? (
        <p
          style={{
            margin: 0,
            fontFamily: SCRIPT,
            fontSize: 21,
            lineHeight: 1.2,
            color: C.ink,
            borderBottom: `1.4px solid ${C.deep}`,
            display: 'inline-block',
            paddingBottom: 2,
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: C.slateSoft, letterSpacing: '0.06em' }}>
          (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)
        </p>
      )}
    </div>
  );
}

/* ================================================================
 * Template sertifikat — ukuran tetap A4 landscape @96dpi (1123×794).
 * Semua gaya bersifat inline (warna hex) agar hasil ekspor PDF dan
 * cetak identik dengan pratinjau.
 * ================================================================ */

export const CERTIFICATE_WIDTH = 1123;
export const CERTIFICATE_HEIGHT = 794;

const CertificateTemplate = forwardRef<HTMLDivElement, CertificateTemplateProps>(
  function CertificateTemplate({ data }, ref) {
    return (
      <div
        ref={ref}
        data-certificate-root=""
        style={{
          width: CERTIFICATE_WIDTH,
          height: CERTIFICATE_HEIGHT,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: C.ivory,
          fontFamily: SANS,
          color: C.ink,
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <FrameBorder />
        <MosqueSilhouette />
        <TopRightFlow />
        <BottomLeftFlow />

        {/* Nomor sertifikat — kanan atas, teks putih di atas aliran hijau */}
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 30,
            textAlign: 'right',
            color: 'rgba(255,255,255,0.95)',
          }}
        >
          <p style={{ margin: 0, fontSize: 8.5, letterSpacing: '0.32em', opacity: 0.75 }}>NOMOR</p>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.12em' }}>
            {data.certificateNumber}
          </p>
        </div>

        {/* ===== Konten utama ===== */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '26px 90px 0',
          }}
        >
          <Emblem logoUrl={data.logoUrl} />

          <p
            style={{
              margin: '8px 0 0',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: C.slate,
            }}
          >
            {data.institutionName || "Lembaga Tahfidz Al-Qur'an"}
          </p>

          <h1
            style={{
              margin: '10px 0 0',
              fontSize: 47,
              lineHeight: 1.05,
              fontWeight: 800,
              letterSpacing: '0.22em',
              textIndent: '0.22em',
              color: C.ink,
            }}
          >
            SERTIFIKAT
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.52em',
              textIndent: '0.52em',
              color: C.forest,
            }}
          >
            TAHFIDZ AL-QUR&rsquo;AN
          </p>

          <OrnamentDivider />

          <p
            style={{
              margin: '18px 0 0',
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: '0.42em',
              textIndent: '0.42em',
              color: C.slateSoft,
            }}
          >
            DIBERIKAN KEPADA
          </p>

          <p
            style={{
              margin: '2px 0 0',
              fontFamily: SCRIPT,
              fontSize: 54,
              lineHeight: 1.12,
              color: C.deep,
              maxWidth: 760,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.studentName}
          </p>

          {/* goresan emas di bawah nama */}
          <svg width={420} height={12} viewBox="0 0 420 12" style={{ marginTop: 2 }} aria-hidden="true">
            <path
              d="M6 8 C90 1 150 1 210 6 C270 11 330 11 414 4"
              fill="none"
              stroke={C.gold}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <circle cx={210} cy={6.4} r={2.4} fill={C.gold} />
          </svg>

          <p style={{ margin: '12px 0 0', fontSize: 14, color: '#446153' }}>
            Atas keberhasilannya dalam menghafal Al-Qur&rsquo;an
          </p>

          {/* Capaian juz */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
            <span style={{ display: 'block', width: 46, height: 2, background: C.gold }} />
            <span
              style={{
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: C.forest,
                whiteSpace: 'nowrap',
              }}
            >
              {data.juzLabel.toUpperCase()}
            </span>
            <span style={{ display: 'block', width: 46, height: 2, background: C.gold }} />
          </div>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              fontStyle: 'italic',
              lineHeight: 1.65,
              color: C.slate,
              maxWidth: 620,
            }}
          >
            &ldquo;Semoga Allah menjadikan hafalan ini cahaya baginya, penyejuk hati, dan bukti
            kesungguhan dalam menuntut ilmu — dunia dan akhirat.&rdquo;
          </p>

          {/* Baris bawah: tanda tangan — segel — QR */}
          <div
            style={{
              marginTop: 'auto',
              marginBottom: 74,
              width: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <SignatureBlock role={data.pembinaLabel || 'Pembina Tahfidz'} name={data.pembinaName} />
            <Seal sealUrl={data.sealUrl} />
            <SignatureBlock role={data.pengajarLabel || 'Pengajar Tahfidz'} name={data.pengajarName} />

            {/* Verifikasi QR + tanggal — kanan bawah */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 128 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, color: C.slate, whiteSpace: 'nowrap' }}>
                {data.institutionCity ? `${data.institutionCity}, ` : ''}
                {data.issuedDateFormatted}
              </p>
              <div
                style={{
                  padding: 5,
                  background: '#fff',
                  border: `1.4px solid ${C.gold}`,
                  borderRadius: 6,
                  lineHeight: 0,
                }}
              >
                {data.qrDataUrl ? (
                  <img src={data.qrDataUrl} alt="QR verifikasi" width={76} height={76} />
                ) : (
                  <div style={{ width: 76, height: 76 }} />
                )}
              </div>
              <p style={{ margin: '5px 0 0', fontSize: 8.5, letterSpacing: '0.06em', color: C.slateSoft }}>
                Pindai untuk verifikasi keaslian
              </p>
            </div>
          </div>
        </div>

        {/* ===== Footer gelap: kutipan Al-Qur'an ===== */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 56,
            background: `linear-gradient(90deg, ${C.footer1}, ${C.footer2} 50%, ${C.footer1})`,
            borderTop: `1.6px solid ${C.gold}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            zIndex: 3,
          }}
        >
          <p
            dir="rtl"
            style={{
              margin: 0,
              fontFamily: ARABIC,
              fontSize: 17,
              lineHeight: 1.3,
              color: '#EFDFAD',
            }}
          >
            وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ
          </p>
          <p style={{ margin: 0, fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.72)' }}>
            &ldquo;Dan sungguh, telah Kami mudahkan Al-Qur&rsquo;an untuk pelajaran, maka adakah orang yang mau mengambil
            pelajaran?&rdquo; &mdash; QS. Al-Qamar: 17
          </p>
        </div>
      </div>
    );
  },
);

export default CertificateTemplate;
