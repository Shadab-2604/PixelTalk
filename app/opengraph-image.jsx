/**
 * File: opengraph-image.jsx
 *
 * Responsibility:
 * Dynamic, high-resolution (1200x630) OpenGraph preview image generated on-the-fly
 * for social platforms (Twitter, LinkedIn, Discord, Slack, iMessage).
 *
 * Layer:
 * Frontend / SEO & Social Cards
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PixelTalk — Real-Time Pixel-Infused Messaging';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundColor: '#F8F4EC',
          backgroundImage:
            'radial-gradient(#6E3511 1.5px, transparent 1.5px), radial-gradient(#6E3511 1.5px, #F8F4EC 1.5px)',
          backgroundSize: '36px 36px',
          backgroundPosition: '0 0, 18px 18px',
          fontFamily: 'sans-serif',
          border: '14px solid #6E3511',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                backgroundColor: '#597928',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '4px solid #6E3511',
                boxShadow: '4px 4px 0px #6E3511',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: '#FCECD8',
                  borderRadius: '6px',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: '34px',
                  fontWeight: 900,
                  color: '#6E3511',
                  letterSpacing: '2px',
                }}
              >
                PIXELTALK
              </div>
              <div style={{ display: 'flex', fontSize: '16px', color: '#597928', fontWeight: 700 }}>
                EST. 2025 • RETRO MESSENGER
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 22px',
              backgroundColor: '#597928',
              color: '#F8F4EC',
              fontWeight: 800,
              fontSize: '17px',
              borderRadius: '10px',
              border: '3px solid #6E3511',
              boxShadow: '3px 3px 0px #6E3511',
              letterSpacing: '1px',
            }}
          >
            REAL-TIME • LOW-NOISE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '960px' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '62px',
              fontWeight: 900,
              color: '#2A170B',
              lineHeight: 1.15,
              letterSpacing: '-1.5px',
            }}
          >
            <div style={{ display: 'flex' }}>A little pixel.</div>
            <div style={{ display: 'flex' }}>A lot of talk.</div>
          </div>
          <div style={{ display: 'flex', fontSize: '26px', color: '#6E3511', fontWeight: 600 }}>
            Low-noise community lounges, frictionless text, and tactile 8-bit visuals.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '3px solid rgba(110, 53, 17, 0.25)',
            paddingTop: '20px',
          }}
        >
          <div style={{ display: 'flex', fontSize: '20px', fontWeight: 800, color: '#6E3511' }}>
            pixel-talk-qofh.vercel.app
          </div>
          <div style={{ display: 'flex', fontSize: '18px', color: '#597928', fontWeight: 700 }}>
            Encrypted Direct Messaging • Themed Lounges • Open Community
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
