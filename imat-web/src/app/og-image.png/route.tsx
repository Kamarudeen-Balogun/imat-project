import { ImageResponse } from "next/og";
import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

export const runtime = "nodejs";

/**
 * Dynamic OG card image, served at /og-image.png (1200x630 — the size every
 * social platform prefers for link previews).
 *
 * Binary PNG files cannot be pushed through the available GitHub tooling
 * (text-only), so the card is generated server-side from text + the repo's
 * own logo file instead of a committed binary. The URL, dimensions and
 * content are exactly what a static public/og-image.png would provide.
 *
 * Design: IMAT green (site primary #0f766e) with the IMAT logo roundel,
 * "IMAT", the full team name, FUTA, and the site tagline. No invented
 * facts, figures or statistics.
 *
 * Note: no custom font is loaded — the repo's Geist font is a variable font
 * and Satori/fontkit fails on it ("Cannot read properties of undefined
 * (reading '256')"). @vercel/og's default font renders the card correctly.
 */

const WIDTH = 1200;
const HEIGHT = 630;

async function loadLogoDataUri(): Promise<string | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
    const buf = await fs.readFile(logoPath);
    const small = await sharp(buf).resize(440, 440, { fit: "contain" }).png().toBuffer();
    return `data:image/png;base64,${small.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET() {
  const logo = await loadLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 72px",
          background: "linear-gradient(120deg, #0f766e 0%, #0b5e57 55%, #084c46 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            maxWidth: 760,
          }}
        >
          <div
            style={{
              fontSize: 21,
              letterSpacing: 4,
              color: "#ccfbf1",
              border: "1.5px solid rgba(255,255,255,0.45)",
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            FUTA · CIVIL ENGINEERING
          </div>

          <div
            style={{
              fontSize: 148,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: -2,
              marginTop: 26,
            }}
          >
            IMAT
          </div>

          <div
            style={{
              width: 96,
              height: 8,
              background: "#f97316",
              borderRadius: 4,
              margin: "26px 0",
            }}
          />

          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Infrastructure Maintenance Awareness Team
          </div>

          <div
            style={{
              fontSize: 28,
              color: "#ccfbf1",
              marginTop: 14,
            }}
          >
            Federal University of Technology Akure
          </div>

          <div
            style={{
              fontSize: 26,
              color: "#99f6e4",
              marginTop: 18,
              lineHeight: 1.4,
            }}
          >
            Track, report, and advocate for better campus infrastructure.
          </div>

          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              marginTop: 26,
              letterSpacing: 1,
            }}
          >
            imat-futa.vercel.app
          </div>
        </div>

        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            width={300}
            height={300}
            alt="IMAT logo"
            style={{
              borderRadius: "50%",
              border: "6px solid rgba(255,255,255,0.35)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "6px solid rgba(255,255,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 62,
              fontWeight: 800,
              color: "#ffffff",
              flexShrink: 0,
            }}
          >
            IMAT
          </div>
        )}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
