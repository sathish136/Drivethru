import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Lock, AlertCircle, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import drivethruLogo from "@/assets/drivethru-brand.svg";
import liveuLogo from "@/assets/liveu-logo.png";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const FEATURES = [
  "Shift & overtime management",
  "EPF / ETF automated payroll",
  "Leave & approval workflows",
  "Cloud-based, anywhere access",
];

const STATS = [
  { value: "99.9%", label: "Uptime" },
  { value: "Real-time", label: "Sync" },
  { value: "AES-256", label: "Secured" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [mounted, setMounted]           = useState(false);
  const [userFocused, setUserFocused]   = useState(false);
  const [passFocused, setPassFocused]   = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Invalid username or password.");
        return;
      }
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));
      setLocation("/");
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes slideLeft { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideRight{ from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
        @keyframes floatY    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes rotateSlow{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulseDot  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes shimmerBtn{
          0%  {background-position:-200% center}
          100%{background-position: 200% center}
        }

        .sl { animation: slideLeft  .7s cubic-bezier(.22,1,.36,1) both; }
        .sr { animation: slideRight .7s .08s cubic-bezier(.22,1,.36,1) both; }
        .fu { animation: fadeUp  .55s cubic-bezier(.22,1,.36,1) both; }
        .fi { animation: fadeIn  .5s ease both; }
        .d1 { animation-delay:.08s }  .d2 { animation-delay:.18s }
        .d3 { animation-delay:.28s }  .d4 { animation-delay:.38s }
        .d5 { animation-delay:.50s }  .d6 { animation-delay:.65s }
        .d7 { animation-delay:.80s }

        .float-shape { animation: floatY 6s ease-in-out infinite; }
        .float-shape2{ animation: floatY 8s ease-in-out infinite; animation-delay:-3s; }
        .rotate-ring { animation: rotateSlow 28s linear infinite; }
        .rotate-ring2{ animation: rotateSlow 20s linear infinite reverse; }
        .pulse-dot   { animation: pulseDot 2s ease-in-out infinite; }

        /* Inputs */
        .lf-input {
          width: 100%;
          padding: .78rem 1rem .78rem 2.75rem;
          border-radius: 12px;
          font-size: .9rem;
          font-family: inherit;
          outline: none;
          transition: border-color .18s, box-shadow .18s, background .18s;
          background: #F0F6FB;
          border: 1.5px solid #D6E6F2;
          color: #0c2d45;
        }
        .lf-input::placeholder { color: #9BB5C8; }
        .lf-input.focused {
          background: #fff;
          border-color: #2980B9;
          box-shadow: 0 0 0 4px rgba(41,128,185,.12);
        }
        .lf-icon {
          position: absolute;
          left: .85rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          transition: color .18s;
          color: #9BB5C8;
        }
        .lf-icon.active { color: #2980B9; }

        /* Button */
        .lf-btn {
          width: 100%;
          padding: .85rem;
          border-radius: 12px;
          font-size: .9375rem;
          font-weight: 700;
          letter-spacing: .015em;
          color: #fff;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .45rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1a7bbf 0%, #1565a8 60%, #0e4f8a 100%);
          box-shadow: 0 8px 28px rgba(21,101,168,.35), 0 1px 0 rgba(255,255,255,.18) inset;
          transition: transform .15s, box-shadow .15s, opacity .15s;
        }
        .lf-btn::before {
          content:'';
          position:absolute; inset:0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.14), transparent);
          background-size: 200% 100%;
          animation: shimmerBtn 2.6s ease-in-out infinite;
        }
        .lf-btn:hover:not(:disabled){ transform:translateY(-1.5px); box-shadow:0 12px 36px rgba(21,101,168,.42); }
        .lf-btn:active:not(:disabled){ transform:translateY(0); }
        .lf-btn:disabled{ opacity:.65; cursor:not-allowed; }
      `}</style>

      <div className="min-h-screen flex overflow-hidden" style={{ background: "#EBF3FA" }}>

        {/* ══ LEFT — Branding ══ */}
        <div
          className={`hidden lg:flex lg:w-[48%] flex-col relative overflow-hidden ${mounted ? "sl" : "opacity-0"}`}
          style={{
            background: "linear-gradient(148deg, #1565a8 0%, #1a7bbf 45%, #1090d4 100%)",
          }}
        >
          {/* Geometric decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[.07]"
              style={{ backgroundImage:"radial-gradient(rgba(255,255,255,.9) 1.2px, transparent 1.2px)", backgroundSize:"30px 30px" }} />

            {/* Rings */}
            <div className="rotate-ring absolute rounded-full"
              style={{ width:380, height:380, top:"42%", left:"50%", transform:"translate(-50%,-50%)",
                border:"1.5px dashed rgba(255,255,255,.14)" }} />
            <div className="rotate-ring2 absolute rounded-full"
              style={{ width:560, height:560, top:"42%", left:"50%", transform:"translate(-50%,-50%)",
                border:"1px solid rgba(255,255,255,.07)" }} />

            {/* Floating logo card */}
            <div className="float-shape absolute right-[10%] top-[16%] rounded-3xl flex items-center justify-center"
              style={{ width:100, height:100,
                background:"rgba(255,255,255,.18)", backdropFilter:"blur(12px)",
                border:"1.5px solid rgba(255,255,255,.35)", transform:"rotate(10deg)",
                boxShadow:"0 12px 40px rgba(0,0,0,.12)" }}>
              <img src={drivethruLogo} alt="Drivethru" style={{ width:56, height:56, objectFit:"contain", transform:"rotate(-10deg)" }} />
            </div>
            <div className="float-shape2 absolute left-[10%] bottom-[22%] rounded-2xl"
              style={{ width:56, height:56,
                background:"rgba(255,255,255,.08)",
                border:"1px solid rgba(255,255,255,.15)", transform:"rotate(-8deg)" }} />
            <div className="float-shape absolute right-[8%] bottom-[30%] rounded-full"
              style={{ width:36, height:36, background:"rgba(255,255,255,.12)" }} />

            {/* Large soft circle */}
            <div className="absolute rounded-full"
              style={{ width:500, height:500, bottom:-180, right:-120,
                background:"radial-gradient(circle, rgba(255,255,255,.08), transparent 70%)" }} />
            <div className="absolute rounded-full"
              style={{ width:300, height:300, top:-80, left:-80,
                background:"radial-gradient(circle, rgba(255,255,255,.10), transparent 70%)" }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full px-12 py-10">

            {/* Brand */}
            <div className={`flex items-center gap-3 ${mounted ? "fu" : "opacity-0"}`}>
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm"
                style={{ border:"1px solid rgba(255,255,255,.3)" }}>
                <img src={drivethruLogo} alt="Drivethru" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <p className="text-white font-bold text-[15px] tracking-tight leading-none">Drivethru</p>
                <p className="text-white/55 text-[10px] mt-0.5 tracking-widest uppercase">Attendance Management</p>
              </div>
            </div>

            {/* Hero */}
            <div className="mt-auto mb-16">

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 ${mounted ? "fu d1" : "opacity-0"}`}
                style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.25)" }}>
                <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block bg-green-300" />
                <span className="text-white/85 text-[11px] font-semibold tracking-wide">All Systems Operational</span>
              </div>

              {/* Headline */}
              <h1 className={`text-[44px] font-black text-white leading-[1.08] tracking-tight mb-5 ${mounted ? "fu d2" : "opacity-0"}`}>
                Smart<br />
                <span style={{ color:"rgba(255,255,255,.75)" }}>Workforce</span><br />
                Management
              </h1>

              <p className={`text-white/60 text-[14px] leading-relaxed max-w-[290px] mb-10 ${mounted ? "fu d3" : "opacity-0"}`}>
                Attendance, payroll, and HR — unified in one platform built for the Drivethru team.
              </p>

              {/* Features */}
              <div className={`space-y-3.5 mb-12 ${mounted ? "fu d4" : "opacity-0"}`}>
                {FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/75 text-[13px]">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className={`flex gap-3 ${mounted ? "fu d5" : "opacity-0"}`}>
                {STATS.map((s, i) => (
                  <div key={i} className="flex-1 rounded-2xl px-4 py-3 text-center"
                    style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.22)" }}>
                    <p className="text-white font-extrabold text-[15px] leading-none">{s.value}</p>
                    <p className="text-white/55 text-[10px] mt-1.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Powered by */}
            <div className={`flex items-center gap-2 ${mounted ? "fi d6" : "opacity-0"}`}>
              <img src={liveuLogo} alt="Live U" className="w-5 h-5 rounded-full object-cover opacity-70" />
              <p className="text-white/45 text-[11px]">Powered by <span className="text-white/65 font-semibold">Live U Pvt Ltd</span></p>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Form ══ */}
        <div
          className={`flex-1 flex items-center justify-center p-8 ${mounted ? "sr" : "opacity-0"}`}
          style={{ background: "#EBF3FA" }}
        >
          <div className="w-full max-w-[400px]">

            {/* Logo — always visible */}
            <div className={`flex items-center gap-3 mb-8 ${mounted ? "fu d1" : "opacity-0"}`}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #1a7bbf, #1565a8)",
                  boxShadow: "0 6px 20px rgba(21,101,168,.30)",
                }}>
                <img src={drivethruLogo} alt="Drivethru" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <p className="font-extrabold text-[17px] leading-tight" style={{ color:"#0c2d45" }}>Drivethru</p>
                <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color:"#7aafc8" }}>Attendance System</p>
              </div>
            </div>

            {/* Greeting */}
            <div className={`mb-8 ${mounted ? "fu d2" : "opacity-0"}`}>
              <h2 className="text-[28px] font-extrabold tracking-tight leading-tight" style={{ color:"#0c2d45" }}>
                Welcome back 👋
              </h2>
              <p className="text-[14px] mt-1.5" style={{ color:"#5a87a8" }}>
                Sign in to your Drivethru dashboard
              </p>
            </div>

            {/* Card */}
            <div
              className={`rounded-2xl p-8 ${mounted ? "fu d3" : "opacity-0"}`}
              style={{
                background: "#fff",
                boxShadow: "0 20px 60px rgba(21,101,168,.13), 0 2px 8px rgba(21,101,168,.07)",
                border: "1px solid rgba(41,128,185,.10)",
              }}
            >
              {/* Error */}
              {error && (
                <div className="mb-5 flex items-start gap-2.5 text-[13px] px-4 py-3 rounded-xl"
                  style={{ background:"#fef2f2", border:"1.5px solid #fecaca", color:"#b91c1c" }}>
                  <AlertCircle className="w-4 h-4 mt-px shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-widest" style={{ color:"#5a87a8" }}>
                    Username
                  </label>
                  <div className="relative">
                    <svg className={`lf-icon w-[16px] h-[16px] ${userFocused ? "active" : ""}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input
                      required
                      className={`lf-input${userFocused ? " focused" : ""}`}
                      placeholder="Enter your username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onFocus={() => setUserFocused(true)}
                      onBlur={() => setUserFocused(false)}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold uppercase tracking-widest" style={{ color:"#5a87a8" }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`lf-icon w-[15px] h-[15px] ${passFocused ? "active" : ""}`} />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      className={`lf-input${passFocused ? " focused" : ""}`}
                      style={{ paddingRight:"2.8rem" }}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color:"#9BB5C8" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#2980B9")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#9BB5C8")}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <button type="submit" className="lf-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                        </svg>
                        Authenticating…
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Powered by — inside card */}
              <div className="mt-6 pt-5 flex items-center justify-center gap-2"
                style={{ borderTop:"1px solid #EBF3FA" }}>
                <img src={liveuLogo} alt="Live U" className="w-4 h-4 rounded-full object-cover opacity-60" />
                <p className="text-[11px]" style={{ color:"#9BB5C8" }}>
                  Powered by <span className="font-semibold" style={{ color:"#6fa3c0" }}>Live U Pvt Ltd</span>
                </p>
              </div>
            </div>

            {/* Bottom */}
            <p className={`text-center text-[11px] mt-5 ${mounted ? "fi d7" : "opacity-0"}`} style={{ color:"#8BAFC6" }}>
              Drivethru © {new Date().getFullYear()} · Attendance Management v2.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
