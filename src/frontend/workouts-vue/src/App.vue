<template>
  <div class="app-shell">
    <header class="page-hero">
      <div className="hero-top">
        <p class="eyebrow">Atlament / {{ pageTitle }}</p>
        <nav className="global-nav" aria-label="Workout navigation">
          <a href="/dashboard/">Dashboard</a>
          <RouterLink to="/" :className="isWorkoutTop ? 'active' : null">Workouts</RouterLink>
          <a href="/analytics/">Analytics</a>
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
export default {
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
