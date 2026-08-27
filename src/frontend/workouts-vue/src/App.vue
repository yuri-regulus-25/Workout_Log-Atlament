<template>
  <div ref="shell" :class="['app-shell', pageTransitionClassName]">
    <header class="page-hero">
      <div class="hero-top">
        <div class="atl-brand-row" aria-label="Atlament Workouts">
          <p ref="characterTrigger" class="eyebrow atl-character-trigger">Atlament / {{ pageTitle }}</p>
        </div>
      </div>
      <h1>{{ pageTitle }}</h1>
      <p class="lead">
        これまでの記録を辿る<br />
        記録を見ることで、進歩になる
      </p>
    </header>

    <RouterView />
  </div>
</template>

<script>
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg'

export default {
  data() {
    return { pageTransitionClassName, navigation: null, characterEasterEgg: null }
  },
  mounted() {
    this.navigation = initializeAppNavigation({
      currentRouteId: 'workouts',
      shell: this.$refs.shell,
    })
    this.characterEasterEgg = initializeCharacterEasterEgg({
      trigger: this.$refs.characterTrigger,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    })
  },
  beforeUnmount() {
    this.navigation?.dispose()
    this.characterEasterEgg?.dispose()
  },
  computed: {
    isWorkoutTop() {
      return this.$route.name === "workouts";
    },
    pageTitle() {
      return this.$route.name === "workouts" ? "Workout Domain" : "Workout Domain - Details";
    },
  },
};
</script>
