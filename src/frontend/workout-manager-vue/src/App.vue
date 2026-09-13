<template>
  <v-app>
    <main ref="shell" :class="['app-shell', 'workout-manager-shell', pageTransitionClassName]">
      <div data-application-shell-content>
        <section class="panel wide manager-panel">
          <div class="vertical-stepper">
            <section v-for="item in steps" :key="item.value" class="step-section" :class="{ active: step === item.value, complete: step > item.value }">
              <header class="step-header">
                <span class="step-number" aria-hidden="true">{{ item.value }}</span>
                <h2>{{ item.title }}</h2>
              </header>
              <div v-show="step === item.value" class="step-content">
                <StepOne
                  v-if="item.value === 1"
                  v-model="selectedDate"
                  :maximum="today"
                  :markers="boundary?.workoutDates ?? []"
                  :writable="boundary?.writable ?? false"
                  @next="openDate"
                />
                <StepTwo
                  v-else-if="item.value === 2 && snapshot"
                  :snapshot="snapshot"
                  :server-errors="serverErrors"
                  @back="returnToDate"
                  @changed="serverErrors = []"
                  @confirm="openConfirmation"
                />
                <StepThree
                  v-else-if="item.value === 3 && snapshot && pendingSession && pendingMode"
                  :mode="pendingMode"
                  :session="pendingSession"
                  :gyms="snapshot.gyms"
                  :machines="snapshot.machines"
                  :busy="loading"
                  @back="step = 2"
                  @submit="submitMutation"
                />
              </div>
            </section>
          </div>
        </section>
      </div>

      <Snackbar :message="message" @clear="message = null" />
      <LoadingOverlay :active="loading" :label="loadingLabel" />
    </main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createWorkoutSession,
  deleteWorkoutSession,
  getWorkoutWriteBoundary,
  getWorkoutWriteDate,
  updateWorkoutSession,
  type WorkoutDateSnapshot,
  type WorkoutFieldMessage,
  type WorkoutSessionInput,
  type WorkoutWriteBoundary,
} from '@workout-lab/frontend-common'
import { initializeAppNavigation } from '@workout-lab/frontend-common/navigation'
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition'
import LoadingOverlay from './common/LoadingOverlay.vue'
import Snackbar, { type SnackbarMessage } from './common/Snackbar.vue'
import type { Mode } from './model'
import StepOne from './step1/Step.vue'
import StepTwo from './step2/Step.vue'
import StepThree from './step3/Step.vue'

/**
 * Workout Manager の Composition Root。
 *
 * Step 遷移、AF API orchestration、共通 Loading/Snackbar state のみを所有し、
 * Session 編集と Validation は各 Step へ委譲する。
 */
const steps = [
  { value: 1, title: '操作するワークアウトの日付選択' },
  { value: 2, title: '操作内容' },
  { value: 3, title: '操作内容確認' },
] as const
const today = localIso(new Date())
const shell = ref<HTMLElement | null>(null)
const step = ref<1 | 2 | 3>(1)
const selectedDate = ref<string | null>(null)
const boundary = ref<WorkoutWriteBoundary | null>(null)
const snapshot = ref<WorkoutDateSnapshot | null>(null)
const pendingMode = ref<Mode | null>(null)
const pendingSessionId = ref<string | null>(null)
const pendingSession = ref<WorkoutSessionInput | null>(null)
const serverErrors = ref<WorkoutFieldMessage[]>([])
const loading = ref(false)
const loadingLabel = ref('読み込んでいます')
const message = ref<SnackbarMessage>(null)
let navigation: { dispose: () => void; focusTitle: () => void } | null = null

onMounted(() => {
  navigation = initializeAppNavigation({
    currentRouteId: 'workout-manager',
    shell: shell.value ?? document.body,
    screen: {
      eyebrow: 'Atlament / Workout Manager',
      title: 'Workout Manager',
      description: ['ワークアウト記録を管理する', 'ワークアウト記録を操作します'],
      ariaLabel: 'Atlament Workout Manager',
    },
  })
  navigation.focusTitle()
  void loadBoundary()
})

onBeforeUnmount(() => navigation?.dispose())

const actionLabel = computed(() => pendingMode.value === 'create' ? '登録' : pendingMode.value === 'update' ? '更新' : '削除')

async function loadBoundary() {
  loading.value = true
  loadingLabel.value = '読み込んでいます'
  try {
    const result = await getWorkoutWriteBoundary()
    if (!result.success || !result.data) throw result
    boundary.value = result.data
  } catch (error) {
    reportDiagnostic('Workout marker load failed.', error)
    message.value = { type: 'error', text: 'ワークアウト情報の取得に失敗しました' }
  } finally {
    loading.value = false
  }
}

async function openDate(date: string) {
  loading.value = true
  loadingLabel.value = '読み込んでいます'
  serverErrors.value = []
  try {
    const result = await getWorkoutWriteDate(date)
    if (!result.success || !result.data) throw result
    snapshot.value = result.data
    step.value = 2
  } catch (error) {
    reportDiagnostic('Workout session load failed.', error)
    message.value = { type: 'error', text: 'ワークアウトログの取得に失敗しました' }
  } finally {
    loading.value = false
  }
}

function returnToDate() {
  step.value = 1
  snapshot.value = null
  pendingMode.value = null
  pendingSessionId.value = null
  pendingSession.value = null
  serverErrors.value = []
}

function openConfirmation(mode: Mode, sessionId: string | null, session: WorkoutSessionInput) {
  pendingMode.value = mode
  pendingSessionId.value = sessionId
  pendingSession.value = session
  serverErrors.value = []
  step.value = 3
}

async function submitMutation() {
  if (loading.value || !snapshot.value || !pendingMode.value || !pendingSession.value) return
  loading.value = true
  loadingLabel.value = `${actionLabel.value}しています`
  try {
    const result = pendingMode.value === 'create'
      ? await createWorkoutSession(pendingSession.value, snapshot.value.expectedContext)
      : pendingMode.value === 'update' && pendingSessionId.value
        ? await updateWorkoutSession(pendingSessionId.value, pendingSession.value, snapshot.value.expectedContext)
        : pendingSessionId.value
          ? await deleteWorkoutSession(pendingSessionId.value, snapshot.value.expectedContext)
          : null
    if (!result || !result.success || !result.data?.result) {
      serverErrors.value = result?.data?.fieldErrors ?? []
      throw result
    }

    const completedMode = pendingMode.value
    const reflected = result.data.result.reflection.succeeded
    returnToDate()
    selectedDate.value = null
    await loadBoundary()
    message.value = reflected
      ? { type: 'success', text: successMessage(completedMode) }
      : { type: 'warning', text: `${successMessage(completedMode)} 最新表示への反映に失敗しました` }
  } catch (error) {
    reportDiagnostic('Workout mutation failed.', error)
    step.value = 2
    message.value = { type: 'error', text: `ワークアウトログの${actionLabel.value}に失敗しました` }
  } finally {
    loading.value = false
  }
}

function successMessage(mode: Mode) {
  if (mode === 'create') return 'ワークアウトログを登録しました'
  if (mode === 'update') return 'ワークアウトログを更新しました'
  return 'ワークアウトログを削除しました'
}

function localIso(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function reportDiagnostic(messageText: string, error: unknown) {
  console.error(messageText, error)
}
</script>
