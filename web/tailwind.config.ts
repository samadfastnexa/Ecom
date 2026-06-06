import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Water palette
        abyss: "#062c43",
        deep: "#0a4d68",
        ocean: "#088395",
        wave: "#05bfdb",
        aqua: "#00d4e6",
        foam: "#a5f3fc",
        mist: "#e0f7ff",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(8, 131, 149, 0.25)",
        glow: "0 0 24px rgba(5, 191, 219, 0.45)",
      },
      backgroundImage: {
        "ocean-gradient":
          "linear-gradient(160deg, #062c43 0%, #0a4d68 45%, #088395 100%)",
        "wave-gradient": "linear-gradient(135deg, #05bfdb 0%, #088395 100%)",
      },
      keyframes: {
        wave: {
          "0%": { transform: "translateX(0) translateZ(0) scaleY(1)" },
          "50%": { transform: "translateX(-25%) translateZ(0) scaleY(0.95)" },
          "100%": { transform: "translateX(-50%) translateZ(0) scaleY(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.6" },
          "50%": { transform: "translateY(-40px) scale(1.1)", opacity: "0.9" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
        rise: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        wave: "wave 12s linear infinite",
        "wave-slow": "wave 20s linear infinite",
        float: "float 8s ease-in-out infinite",
        ripple: "ripple 0.7s linear",
        shimmer: "shimmer 1.6s linear infinite",
        rise: "rise 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
