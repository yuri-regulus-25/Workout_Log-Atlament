<template>
  <div :class="['app-shell', pageTransitionClassName]">
    <header class="page-hero">
      <div className="hero-top">
        <div class="atl-brand-row" aria-label="Atlament Workouts">
          <button ref="logoTrigger" class="atl-logo-trigger" type="button" aria-label="Toggle Atlament logo variant">
            <img ref="logoImage" class="atl-logo" :src="logoSourcePath" alt="" />
          </button>
          <p ref="characterTrigger" class="eyebrow atl-character-trigger">Atlament / {{ pageTitle }}</p>
        </div>
        <nav className="global-nav" aria-label="Workout navigation">
          <a :href="applicationRoutes.dashboard">Dashboard</a>
          <RouterLink to="/" :className="isWorkoutTop ? 'active' : null">Workouts</RouterLink>
          <a :href="applicationRoutes.exercises">Performance</a>
          <a :href="applicationRoutes.analytics">Analytics</a>
          <a :href="applicationRoutes.settings">Settings</a>
        </nav>
      </div>
      <h1>{{ pageTitle }}</h1>
      <p className="lead">
        これまでの記録を辿る<br />
        記録を見ることで、進歩になる
      </p>
    </header>

    <RouterView />
  </div>
</template>

<script>
import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import { initializeBrandingLogo } from '@workout-lab/frontend-common/branding'
import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg'

export default {
  data() {
    return { applicationRoutes, pageTransitionClassName, logoSourcePath: '/frontend-common/branding/assets/logo_svg_primary.svg', brandingLogo: null, characterEasterEgg: null }
  },
  mounted() {
    this.brandingLogo = initializeBrandingLogo({
      image: this.$refs.logoImage,
      trigger: this.$refs.logoTrigger,
      basePath: '/frontend-common/branding/assets/',
    })
    this.characterEasterEgg = initializeCharacterEasterEgg({
      trigger: this.$refs.characterTrigger,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    })
  },
  beforeUnmount() {
    this.brandingLogo?.dispose()
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
