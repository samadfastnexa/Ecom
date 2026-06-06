"use client";

/** Decorative animated wave + bubble layer rendered behind page content. */
export function WaveBackground() {
  const bubbles = [
    { size: 22, left: "8%", delay: "0s", dur: "9s" },
    { size: 14, left: "20%", delay: "2s", dur: "7s" },
    { size: 30, left: "35%", delay: "1s", dur: "11s" },
    { size: 10, left: "52%", delay: "3s", dur: "6s" },
    { size: 26, left: "68%", delay: "0.5s", dur: "10s" },
    { size: 16, left: "82%", delay: "2.5s", dur: "8s" },
    { size: 20, left: "92%", delay: "1.5s", dur: "9.5s" },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            animationDelay: b.delay,
            animationDuration: b.dur,
          }}
        />
      ))}

      <div className="absolute bottom-0 left-0 w-[200%] opacity-40 animate-wave-slow">
        <svg viewBox="0 0 1440 200" className="h-40 w-full" preserveAspectRatio="none">
          <path
            fill="#05bfdb"
            fillOpacity="0.3"
            d="M0,96L60,106.7C120,117,240,139,360,138.7C480,139,600,117,720,101.3C840,85,960,75,1080,80C1200,85,1320,107,1380,117.3L1440,128L1440,200L0,200Z"
          />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 w-[200%] opacity-50 animate-wave">
        <svg viewBox="0 0 1440 200" className="h-32 w-full" preserveAspectRatio="none">
          <path
            fill="#088395"
            fillOpacity="0.4"
            d="M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,117.3C672,107,768,117,864,138.7C960,160,1056,192,1152,186.7C1248,181,1344,139,1392,117.3L1440,96L1440,200L0,200Z"
          />
        </svg>
      </div>
    </div>
  );
}
