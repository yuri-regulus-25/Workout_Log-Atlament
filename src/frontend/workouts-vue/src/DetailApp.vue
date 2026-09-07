<template>
  <div ref="shell" :class="['app-shell', pageTransitionClassName]">
    <div data-application-shell-content>
      <WorkoutDetailView :date="workoutDate" />
    </div>
  </div>
</template>

<script>
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import WorkoutDetailView from './views/WorkoutDetailView.vue'

function readWorkoutDate() {
  const match = window.location.pathname.match(/\/workouts\/(\d{4}-\d{2}-\d{2})\/?$/)
  return match?.[1] ?? ''
}

export default {
  components: { WorkoutDetailView },
  data() {
    return {
      pageTransitionClassName,
      navigation: null,
      workoutDate: readWorkoutDate(),
    }
  },
  mounted() {
    this.navigation = initializeAppNavigation({
      currentRouteId: 'workouts',
      shell: this.$refs.shell,
      screen: this.screenHeader,
    })
  },
  beforeUnmount() {
    this.navigation?.dispose()
  },
  computed: {
    screenHeader() {
      return {
        eyebrow: 'Atlament / Workout Domain / Details',
        title: 'Workout Domain / Details',
        description: '特定のワークアウト記録を確認します',
        ariaLabel: 'Atlament Workout Detail',
      }
    },
  },
}
</script>
