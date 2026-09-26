import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/analytics/',
  plugins: [workoutDataPlugin() as PluginOption, svelte()],
})
