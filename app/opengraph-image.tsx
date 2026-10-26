import { ImageResponse } from 'next/og';

export const alt = 'FastHand Status — live uptime and incident history';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: '72px 80px',
          color: '#15191F',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 76,
              height: 76,
              borderRadius: 20,
              backgroundColor: '#5200FE',
              color: '#FFFFFF',
              fontSize: 46,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 24,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 6,
              color: '#5A6470',
            }}
          >
            FASTHAND STATUS
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 94, fontWeight: 700, letterSpacing: -3 }}>
            FastHand Status
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 20,
              fontSize: 36,
              lineHeight: 1.35,
              color: '#5A6470',
            }}
          >
            Live health, measured uptime, and incident history.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', width: 88, height: 8, borderRadius: 4, backgroundColor: '#5200FE' }} />
          <div style={{ display: 'flex', marginLeft: 24, fontSize: 26, color: '#5A6470' }}>
            Real automated checks · No estimates
          </div>
        </div>
      </div>
    ),
    size,
  );
}
