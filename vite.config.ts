import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Supabase entegrasyonu herkese açık değerleri NEXT_PUBLIC_ önekiyle ekliyor; Vite'a onları da okut.
export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
