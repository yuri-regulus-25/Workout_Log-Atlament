<template>
  <article class="issue-card">
    <strong>{{ title }}</strong>
    <p>{{ issue.message }}</p>
    <span>{{ context }}</span>
    <code>{{ issue.code }}</code>
  </article>
</template>

<script setup lang="ts">
import type { ResourceIssue } from '@workout-lab/frontend-common'

defineProps<{
  issue: ResourceIssue
  title: string
  context: string
}>()
</script>
