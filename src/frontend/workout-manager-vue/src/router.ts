import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

export const router = createRouter({
  history: createWebHistory('/workout-manager/'),
  routes: [{ path: '/', component: App }],
})
