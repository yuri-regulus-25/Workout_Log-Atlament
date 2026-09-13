import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/dashboard/',
  plugins: [workoutDataPlugin() as PluginOption, react()],
})
