import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'

export default defineConfig({
  base: '/maintenance/',
  plugins: [workoutDataPlugin() as PluginOption, vue()],
})
