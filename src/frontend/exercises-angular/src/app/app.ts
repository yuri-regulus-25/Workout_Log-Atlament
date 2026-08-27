import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { applicationRoutes, initializeAppNavigation } from '@workout-lab/frontend-common/navigation';
import { pageTransitionClassName } from '@workout-lab/frontend-common/page-transition';
import { initializeCharacterEasterEgg } from '@workout-lab/frontend-common/easter-egg';
import { getChartTheme, observeThemeChanges } from '@workout-lab/design-tokens';
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data';
import type { WorkoutSession } from '@workout-lab/workout-types';
import {
  formatBodyPart,
  formatDisplayDate,
  formatMachineTitleFromId,
  formatWeightKg,
  getAverageSetWeight,
  getEstimated1RM,
  getExerciseHistory,
  getExerciseOptions,
  getMaxReps,
  getMaxWeight,
  getRecentSessions,
} from '@workout-lab/workout-core';

@Component({
  selector: 'app-root',
  imports: [NgApexchartsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('shell') private readonly shellRef?: ElementRef<HTMLElement>;
  @ViewChild('characterTrigger') private readonly characterTriggerRef?: ElementRef<HTMLParagraphElement>;

  protected readonly applicationRoutes = applicationRoutes;
  protected readonly pageTransitionClassName = pageTransitionClassName;
  private navigation: { dispose(): void } | null = null;
  private characterEasterEgg: { dispose(): void } | null = null;
  private disposeThemeObserver: (() => void) | null = null;
  protected readonly sessions = signal<WorkoutSession[]>([]);
  protected readonly loadError = signal<string | null>(null);
  private readonly themeRevision = signal(0);
  protected readonly exerciseOptions = computed(() => getExerciseOptions(this.sessions()));
  private readonly pathExerciseId = this.getPathExerciseId();

  protected readonly hasInvalidExerciseIdParameter = signal(false);
  protected readonly invalidExerciseId = signal(this.pathExerciseId ?? '');
  protected readonly selectedExerciseId = signal<string>('abdominal');

  ngAfterViewInit(): void {
    this.navigation = initializeAppNavigation({
      currentRouteId: 'exercises',
      shell: this.shellRef?.nativeElement,
    });
    this.characterEasterEgg = initializeCharacterEasterEgg({
      trigger: this.characterTriggerRef?.nativeElement,
      host: document.body,
      assetBasePath: '/frontend-common/easter-egg/assets/',
    });
    this.disposeThemeObserver = observeThemeChanges(() => {
      this.themeRevision.update((revision) => revision + 1);
    });
  }

  ngOnDestroy(): void {
    this.navigation?.dispose();
    this.characterEasterEgg?.dispose();
    this.disposeThemeObserver?.();
  }

  constructor() {
    void loadRuntimeWorkoutSessions()
      .then((result) => {
        this.sessions.set(result.sessions);
        this.loadError.set(result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null);
        this.selectExerciseIdFromPath();
      })
      .catch((error: unknown) => {
        this.loadError.set(error instanceof Error ? error.message : 'Workout data could not be loaded.');
      });

    window.addEventListener('popstate', () => {
      this.selectExerciseIdFromPath();
    });
  }

  protected readonly selectedExercise = computed(() =>
    this.exerciseOptions().find((exercise) => exercise.exercise_id === this.selectedExerciseId()),
  );
  protected readonly selectedMachineName = computed(() =>
    formatMachineTitleFromId(this.selectedExerciseId()),
  );
  protected readonly selectedMachineTitle = computed(() =>
    formatMachineTitleFromId(this.selectedExerciseId()),
  );
  protected readonly selectedMachineJapaneseName = computed(
    () => this.selectedExercise()?.name ?? this.selectedMachineTitle(),
  );
  protected readonly selectedBodyPart = computed(() => {
    const exercise = this.selectedExercise();
    return exercise ? formatBodyPart(exercise.body_part) : '—';
  });

  protected readonly history = computed(() =>
    getExerciseHistory(this.sessions(), this.selectedExerciseId()),
  );

  protected readonly latest = computed(() => this.history().at(-1));
  protected readonly latestDate = computed(() => {
    const row = this.latest();
    return row ? formatDisplayDate(row.date) : '—';
  });
  protected readonly totalSets = computed(() =>
    this.history().reduce((total, row) => total + row.sets, 0),
  );
  protected readonly bestWeight = computed(() => getMaxWeight(this.sessions(), this.selectedExerciseId()));
  protected readonly bestReps = computed(() => getMaxReps(this.sessions(), this.selectedExerciseId()));
  protected readonly estimatedOneRepMax = computed(() =>
    getEstimated1RM(this.bestWeight(), this.bestReps()),
  );
  protected readonly recent28Sessions = computed(() => getRecentSessions(this.sessions(), 28));
  protected readonly averageSetWeight28d = computed(() =>
    getAverageSetWeight(this.recent28Sessions(), this.selectedExerciseId()),
  );
  protected readonly averageSetWeight28dLabel = computed(() => {
    const value = this.averageSetWeight28d();
    return value === null ? '—' : formatWeightKg(Math.round(value * 10) / 10);
  });

  protected readonly chart = computed<{
    series: ApexAxisChartSeries;
    chart: ApexChart;
    stroke: ApexStroke;
    xaxis: ApexXAxis;
    colors: string[];
    dataLabels: ApexDataLabels;
    grid: ApexGrid;
    legend: ApexLegend;
    theme: ApexTheme;
    tooltip: ApexTooltip;
    yaxis: ApexYAxis;
  }>(() => {
    this.themeRevision();
    const chartTheme = getChartTheme();

    return {
      series: [
        {
          name: 'Best Weight',
          data: this.history().map((row) => row.bestWeight),
        },
      ],
      chart: {
        background: 'transparent',
        foreColor: chartTheme.textMuted,
        height: 320,
        type: 'line',
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: [chartTheme.secondary],
      dataLabels: { enabled: false },
      grid: { borderColor: chartTheme.grid },
      legend: { show: false },
      stroke: { curve: 'smooth', width: 3 },
      theme: { mode: chartTheme.mode },
      tooltip: { theme: chartTheme.mode },
      xaxis: {
        axisBorder: { color: chartTheme.border },
        axisTicks: { color: chartTheme.border },
        categories: this.history().map((row) => formatDisplayDate(row.date)),
        labels: { show: false, style: { colors: chartTheme.textMuted } },
      },
      yaxis: {
        labels: { style: { colors: chartTheme.textMuted } },
      },
    };
  });

  protected formatDate(date: string): string {
    return formatDisplayDate(date);
  }

  protected selectExercise(exerciseId: string) {
    this.selectedExerciseId.set(exerciseId);
    this.hasInvalidExerciseIdParameter.set(false);
    window.history.pushState(null, '', `${applicationRoutes.exercises}${exerciseId}/`);
  }

  private getPathExerciseId(): string | undefined {
    return window.location.pathname.split(applicationRoutes.exercises)[1]?.split('/')[0] || undefined;
  }

  private selectExerciseIdFromPath() {
    const pathExerciseId = this.getPathExerciseId();
    const fallbackExerciseId = this.exerciseOptions()[0]?.exercise_id ?? 'abdominal';
    const hasValidPathExerciseId =
      pathExerciseId !== undefined &&
      this.exerciseOptions().some((exercise) => exercise.exercise_id === pathExerciseId);
    const nextExerciseId = hasValidPathExerciseId && pathExerciseId ? pathExerciseId : fallbackExerciseId;

    this.hasInvalidExerciseIdParameter.set(pathExerciseId !== undefined && !hasValidPathExerciseId);
    this.invalidExerciseId.set(pathExerciseId ?? '');
    this.selectedExerciseId.set(nextExerciseId);

    if (window.location.pathname !== `${applicationRoutes.exercises}${nextExerciseId}/`) {
      window.history.replaceState(null, '', `${applicationRoutes.exercises}${nextExerciseId}/`);
    }
  }
}


