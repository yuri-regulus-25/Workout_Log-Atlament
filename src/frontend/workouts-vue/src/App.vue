<template>
  <div ref="shell" :class="['app-shell', pageTransitionClassName]">
    <div data-application-shell-content>
      <WorkoutsView />
    </div>
  </div>
</template>

<script>
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import WorkoutsView from './views/WorkoutsView.vue'

/**
 * Workout Domain の Composition Root。
 *
 * 共通 Application Shell の lifecycle と最上位 view composition だけを担当する。
 * Workout 一覧/詳細の状態と表示責務は `WorkoutsView` 以下に委譲する。
 */
export default {
  components: { WorkoutsView },
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
  computed: {
    screenHeader() {
      return {
        eyebrow: 'Atlament / Workout Domain',
        title: 'Workout Domain',
        description: '過去のワークアウト記録を確認します',
        ariaLabel: 'Atlament Workouts',
      };
    },
  },
};
</script>
