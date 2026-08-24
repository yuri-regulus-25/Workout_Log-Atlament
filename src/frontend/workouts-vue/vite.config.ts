import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { workoutDataPlugin } from '../../../tools/dev-runtime/vite-workout-data-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/workouts/',
  plugins: [workoutDataPlugin(), vue()],
})
