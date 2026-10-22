import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default function() {
  return defineConfig({
    plugins: [react()],
  })
}
