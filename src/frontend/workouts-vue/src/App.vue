<template>
  <div ref="shell" :class="['app-shell', pageTransitionClassName]">
    <div data-application-shell-content>
      <RouterView />
    </div>
  </div>
</template>

<script>
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'

export default {
  data() {
    return { pageTransitionClassName, navigation: null }
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
  watch: {
    "$route.fullPath"() {
      this.$nextTick(() => {
        this.navigation?.updateScreen(this.screenHeader)
        this.navigation?.focusTitle()
      })
    },
  },
  computed: {
    isWorkoutTop() {
      return this.$route.name === "workouts";
    },
    pageTitle() {
      return this.$route.name === "workouts" ? "Workout Domain" : "Workout Domain - Details";
    },
    screenHeader() {
      return {
        eyebrow: `Atlament / ${this.pageTitle}`,
        title: this.pageTitle,
        description: ['これまでの記録を辿る', '過去のワークアウト記録を確認します'],
        ariaLabel: 'Atlament Workouts',
      };
    },
  },
};
</script>
