<template>
  <div :class="['app-shell', pageTransitionClassName]">
    <header class="page-hero">
      <div className="hero-top">
        <p class="eyebrow">Atlament / {{ pageTitle }}</p>
        <nav className="global-nav" aria-label="Workout navigation">
          <a :href="applicationRoutes.dashboard">Dashboard</a>
          <RouterLink to="/" :className="isWorkoutTop ? 'active' : null">Workouts</RouterLink>
          <a :href="applicationRoutes.analytics">Analytics</a>
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

export default {
  data() {
    return { applicationRoutes, pageTransitionClassName }
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
