import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import WorkoutsView from './views/WorkoutsView.vue'
import WorkoutDetailView from './views/WorkoutDetailView.vue'

const history =
  window.location.protocol === 'file:' ? createWebHashHistory() : createWebHistory('/workouts/')

export const router = createRouter({
  history,
  routes: [
    {
      path: '/',
      name: 'workouts',
      component: WorkoutsView,
    },
    {
      path: '/:date',
      name: 'workout-detail',
      component: WorkoutDetailView,
      props: true,
    },
  ],
})
