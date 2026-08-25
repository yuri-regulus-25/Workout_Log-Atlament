import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'
import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import WorkoutsView from './views/WorkoutsView.vue'
import WorkoutDetailView from './views/WorkoutDetailView.vue'

const history =
  window.location.protocol === 'file:' ? createWebHashHistory() : createWebHistory(applicationRoutes.workouts)

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
