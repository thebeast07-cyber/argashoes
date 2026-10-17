import type { Config } from "tailwindcss";

// Token dari DESIGN.md (sementara, sampai warna identitas toko masuk).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kertas: "#F4F1EA",
        tinta: "#1D1B18",
        redup: "#5E5A53",
        bata: "#B3361C",
        "sedikit-teks": "#7A4B00",
        "sedikit-latar": "#FBEFD5",
        habis: "#6B6760",
        // Halaman publik (mockup): alas foto placeholder dan latar footer; teks sekunder di atas tinta (8.61:1).
        "kertas-gelap": "#E9E3D6",
        "redup-gelap": "#BDB7AB",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        label: "2px",
        kontrol: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
