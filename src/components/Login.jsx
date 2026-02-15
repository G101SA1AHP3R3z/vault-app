import React, { useMemo, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { Loader2, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);

  const bodyFont =
    '"SF Pro Text","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  // Brand/headline only (not body)
  const headerFont =
    '"Avenir Next Rounded","Avenir Next","Avenir","SF Pro Rounded","SF Pro Display","SF Pro Text",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

  const palette = useMemo(
    () => ({
      ink: "#0B0B0C",

      // daylight neutrals
      paper: "#FFFEFA",
      cloud: "#FFFFFF",
      mist: "#EEF6FF",
      line: "#E3ECF7",

      // park-day accents
      sky: "#3AA8FF",
      sun: "#FFEA3A",
      breeze: "#54E6C1",
      meadow: "#35D07F",

      footer: "#F2F7FF",
    }),
    []
  );

  // Bright, real people photos (Pexels)
  const photos = useMemo(
    () => [
      // Actual sunny day in the park
      "https://images.pexels.com/photos/34281660/pexels-photo-34281660.jpeg?auto=compress&cs=tinysrgb&w=1600",
      // Bright outdoor people
      "https://images.pexels.com/photos/853168/pexels-photo-853168.jpeg?auto=compress&cs=tinysrgb&w=1600",
      // People + project energy
      "https://images.pexels.com/photos/3775534/pexels-photo-3775534.jpeg?auto=compress&cs=tinysrgb&w=1600",
    ],
    []
  );

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Auth listener/routes handle next step
    } catch (e) {
      console.error(e);
      alert("Sign-in failed. Check console.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-900" style={{ fontFamily: bodyFont, background: palette.paper }}>
      {/* Abstract background (cream + subtle shapes) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Sun shard */}
        <div
          className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-[48px] rotate-[18deg]"
          style={{ background: palette.sun, opacity: 0.18 }}
        />
        {/* Sky ribbon */}
        <div
          className="absolute top-6 -right-56 w-[760px] h-[280px] rounded-[60px] rotate-[-12deg]"
          style={{ background: palette.sky, opacity: 0.12 }}
        />
        {/* Breeze block */}
        <div
          className="absolute -bottom-36 left-10 w-[720px] h-[420px] rounded-[70px] rotate-[10deg]"
          style={{ background: palette.breeze, opacity: 0.10 }}
        />
        {/* Cloud glaze (keeps it airy, not distracting) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.45) 38%, rgba(255,255,255,0.78) 100%)",
            opacity: 0.7,
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          {/* [Index] */}
          <div className="flex items-center gap-3">
            <div
              className="text-[20px] font-bold tracking-[-0.01em] leading-none"
              style={{ fontFamily: headerFont }}
            >
              <span style={{ color: palette.sky }}>[</span>
              <span style={{ letterSpacing: "0.08em" }}>Index</span>
              <span style={{ color: palette.sun }}>]</span>
            </div>

            <div className="hidden sm:block h-[18px] w-[1px]" style={{ background: palette.line }} />

            <div className="hidden sm:block text-xs text-black/55">
              Project media for weeks to months.
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="px-4 py-2 rounded-[8px] text-sm font-semibold hover:bg-white/60 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(0,0,0,0.08)",
                backdropFilter: "blur(16px)",
              }}
            >
              Log in
            </button>

            <button
              onClick={handleGoogle}
              disabled={loading}
              className="px-4 py-2 rounded-[8px] text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              style={{
                background: palette.sun,
                color: palette.ink,
                border: "1px solid rgba(0,0,0,0.10)",
                boxShadow: "0 14px 30px -22px rgba(0,0,0,0.35)",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign up"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Copy card */}
          <div
            className="rounded-[14px] p-8 sm:p-10"
            style={{
              background: "rgba(255,255,255,0.62)",
              border: "1px solid rgba(0,0,0,0.08)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 22px 60px -52px rgba(0,0,0,0.35)",
            }}
          >
            <h1
              className="text-4xl sm:text-5xl font-semibold tracking-[-0.02em] leading-[1.05]"
              style={{ fontFamily: headerFont }}
            >
              Keep ongoing projects
              <br />
              <span className="text-black/45">clean and simple.</span>
            </h1>

            <p className="mt-4 text-lg text-black/60 max-w-xl">
              Photos, videos, voice notes, and pins—organized by project for weeks or months.
              Not meant to be forever storage.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="h-12 px-5 rounded-[8px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{
                  background: palette.sun,
                  color: palette.ink,
                  border: "1px solid rgba(0,0,0,0.10)",
                  boxShadow: "0 14px 30px -22px rgba(0,0,0,0.35)",
                }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continue with Google"}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="h-12 px-5 rounded-[8px] font-semibold text-gray-900 hover:bg-white/60"
                style={{
                  background: "rgba(255,255,255,0.50)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  backdropFilter: "blur(16px)",
                }}
              >
                See how it works
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm text-black/55">
              <ShieldCheck className="w-4 h-4" />
              Google sign-in. No passwords. You control access.
            </div>

            <div className="mt-6 flex items-center gap-2">
              <Dot c={palette.sky} />
              <Dot c={palette.sun} />
              <Dot c={palette.breeze} />
              <Dot c={palette.meadow} />
              <span className="text-xs text-black/45 ml-1">Sky • Sun • Breeze • Meadow</span>
            </div>
          </div>

          {/* Photo collage */}
          <div className="relative">
            <div className="grid grid-cols-12 gap-3">
              <PhotoTile src={photos[0]} className="col-span-7 h-[240px] sm:h-[320px]" overlay="skySun" />
              <PhotoTile src={photos[1]} className="col-span-5 h-[240px] sm:h-[320px]" overlay="sunBreeze" />
              <PhotoTile src={photos[2]} className="col-span-12 h-[180px] sm:h-[220px]" overlay="breezeSky" />
            </div>

            <div className="mt-3 text-xs text-black/55">Real photos from Pexels (free to use).</div>
          </div>
        </div>

        {/* How it works */}
        <div id="how-it-works" className="mt-14 pt-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Feature
              headerFont={headerFont}
              title="Project folders"
              desc="Keep each job, trip, client, or event in one place."
            />
            <Feature
              headerFont={headerFont}
              title="Pins + voice notes"
              desc="Mark details on photos/videos and talk through decisions."
            />
            <Feature
              headerFont={headerFont}
              title="Temporary by design"
              desc="Great for months-long work—archive later if needed."
            />
          </div>

          <div className="mt-10 flex items-center justify-between text-xs text-black/55">
            <span>Built for ongoing projects (weeks → months → up to ~1 year)</span>
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="px-4 py-2 rounded-[8px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: palette.sky,
                color: "#fff",
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 14px 30px -22px rgba(0,0,0,0.28)",
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ title, desc, headerFont }) {
  return (
    <div
      className="p-5 rounded-[12px]"
      style={{
        background: "rgba(255,255,255,0.58)",
        border: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 22px 60px -52px rgba(0,0,0,0.28)",
      }}
    >
      <div className="text-sm font-semibold" style={{ fontFamily: headerFont }}>
        {title}
      </div>
      <div className="mt-2 text-sm text-black/60 leading-relaxed">{desc}</div>
    </div>
  );
}

function PhotoTile({ src, className, overlay }) {
  const overlayStyle =
    overlay === "skySun"
      ? "linear-gradient(135deg, rgba(58,168,255,0.16) 0%, rgba(255,234,58,0.10) 55%, rgba(255,255,255,0.10) 100%)"
      : overlay === "sunBreeze"
      ? "linear-gradient(135deg, rgba(255,234,58,0.12) 0%, rgba(84,230,193,0.10) 55%, rgba(255,255,255,0.12) 100%)"
      : "linear-gradient(135deg, rgba(84,230,193,0.12) 0%, rgba(58,168,255,0.10) 55%, rgba(255,255,255,0.12) 100%)";

  return (
    <div
      className={`${className} rounded-[12px] overflow-hidden relative`}
      style={{
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 22px 60px -45px rgba(0,0,0,0.30)",
      }}
    >
      <img src={src} alt="" className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: overlayStyle, mixBlendMode: "screen" }} />
      <div className="absolute inset-0 bg-white/5" />
    </div>
  );
}

function Dot({ c }) {
  return <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />;
}
