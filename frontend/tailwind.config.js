/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#09111f",
        accent: "#7dd3fc",
        ink: "#dbeafe",
        success: "#22c55e",
        warning: "#facc15",
      },
      boxShadow: {
        neon: "0 0 40px rgba(125, 211, 252, 0.18)",
      },
      animation: {
        "soft-pulse": "softPulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        softPulse: {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" },
        },
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

