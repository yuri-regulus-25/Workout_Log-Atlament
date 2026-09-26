import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/workouts/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        detail: resolve(import.meta.dirname, 'detail.html'),
      },
    },
  },
  plugins: [workoutDataPlugin() as PluginOption, vue()],
})
