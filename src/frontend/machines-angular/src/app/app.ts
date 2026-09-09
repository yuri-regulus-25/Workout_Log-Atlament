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
import { getChartTheme, observeThemeChanges } from '@workout-lab/design-tokens';
import { loadRuntimeWorkoutSessions } from '@workout-lab/workout-data';
import type { BodyPart, WorkoutMachine, WorkoutSession } from '@workout-lab/workout-types';
import {
  formatBodyPart,
  formatDisplayDate,
  formatMachineTitleFromId,
  formatWeightKg,
  getEstimated1RM,
  getMachineBodyPartDisplay,
  getMachineDisplayName,
  getMachineHistory,
  getMachineOptions,
  getMainGymAverageSetWeightMetric,
  getMainGymMaxWeightMetric,
  getMainGymSessionsMetric,
  getMaxReps,
  getRecentSessions,
  resolveMainGymContext,
} from '@workout-lab/workout-core';

@Component({
  selector: 'app-root',
  imports: [NgApexchartsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
/**
 * Performance Detail の Angular Composition Root。
 *
 * Runtime Data loading、URL上の machine selection、filter state、Main Gym scoped metric、
 * chart theme refresh を所有する。共通 Shell は `initializeAppNavigation` に委譲し、
 * chart option は Angular computed state と Design Token の現在値から組み立てる。
 */
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('shell') private readonly shellRef?: ElementRef<HTMLElement>;

  protected readonly applicationRoutes = applicationRoutes;
  protected readonly pageTransitionClassName = pageTransitionClassName;
  private navigation: { dispose(): void } | null = null;
  private disposeThemeObserver: (() => void) | null = null;
  protected readonly sessions = signal<WorkoutSession[]>([]);
  protected readonly mainGymContext = signal<ReturnType<typeof resolveMainGymContext>>({ state: 'unconfigured' });
  protected readonly loadError = signal<string | null>(null);
  private readonly themeRevision = signal(0);
  protected readonly machineOptions = computed(() => getMachineOptions(this.sessions()));
  protected readonly machineSearchQuery = signal('');
  protected readonly bodyPartFilter = signal('');
  private readonly pathMachineId = this.getPathMachineId();

  protected readonly hasInvalidMachineIdParameter = signal(false);
  protected readonly invalidMachineId = signal(this.pathMachineId ?? '');
  protected readonly selectedMachineId = signal<string>('');
  protected readonly bodyPartOptions = computed(() =>
    Array.from(new Set(
      this.machineOptions()
        .map((machine) => machine.body_part)
        .filter((bodyPart): bodyPart is BodyPart => bodyPart !== undefined),
    )).sort(),
  );
  protected readonly filteredMachineOptions = computed(() => {
    const query = this.machineSearchQuery().trim().toLocaleLowerCase();
    const bodyPart = this.bodyPartFilter();

    return this.machineOptions().filter((machine) => {
      const matchesQuery =
        query.length === 0 ||
        getMachineDisplayName(machine).toLocaleLowerCase().includes(query) ||
        machine.machine_id.toLocaleLowerCase().includes(query);
      const matchesBodyPart = bodyPart.length === 0 || machine.body_part === bodyPart;

      return matchesQuery && matchesBodyPart;
    });
  });

  ngAfterViewInit(): void {
    this.navigation = initializeAppNavigation({
      currentRouteId: 'machines',
      shell: this.shellRef?.nativeElement,
      screen: {
        eyebrow: 'Atlament / Performance Detail',
        title: 'Performance Detail',
        description: ['種目ごとの変化を追う', '種目ごとの記録と推移を確認します'],
        ariaLabel: 'Atlament Machines',
      },
    });
    this.disposeThemeObserver = observeThemeChanges(() => {
      this.themeRevision.update((revision) => revision + 1);
    });
  }

  ngOnDestroy(): void {
    this.navigation?.dispose();
    this.disposeThemeObserver?.();
  }

  constructor() {
    void loadRuntimeWorkoutSessions()
      .then((result) => {
        this.sessions.set(result.sessions);
        this.mainGymContext.set(result.masterData ? resolveMainGymContext(result.masterData.gyms) : { state: 'unconfigured' });
        this.loadError.set(result.issues.length > 0 ? result.issues.map((issue) => issue.message).join(' / ') : null);
        this.selectMachineIdFromPath();
      })
      .catch((error: unknown) => {
        this.loadError.set(error instanceof Error ? error.message : 'Workout data could not be loaded.');
      });

    window.addEventListener('popstate', () => {
      this.selectMachineIdFromPath();
    });
  }

  protected readonly selectedMachine = computed(() =>
    this.machineOptions().find((machine) => machine.machine_id === this.selectedMachineId()),
  );
  protected readonly hasActiveMachineSelection = computed(() =>
    this.filteredMachineOptions().some((machine) => machine.machine_id === this.selectedMachineId()),
  );
  protected readonly selectedMachineName = computed(() =>
    formatMachineTitleFromId(this.selectedMachineId()),
  );
  protected readonly selectedMachineTitle = computed(() =>
    formatMachineTitleFromId(this.selectedMachineId()),
  );
  protected readonly selectedMachineJapaneseName = computed(
    () => {
      const machine = this.selectedMachine();
      return this.hasActiveMachineSelection() && machine ? getMachineDisplayName(machine) : '—';
    },
  );
  protected readonly selectedBodyPart = computed(() => {
    const machine = this.selectedMachine();
    return this.hasActiveMachineSelection() && machine ? getMachineBodyPartDisplay(machine) : '—';
  });

  protected readonly mainGymSessions = computed(() =>
    getMainGymSessionsMetric(this.mainGymContext(), this.sessions()),
  );
  protected readonly comparableSessions = computed(() => {
    const metric = this.mainGymSessions();
    return metric.state === 'available' ? metric.value : [];
  });
  protected readonly history = computed(() =>
    getMachineHistory(this.comparableSessions(), this.selectedMachineId()),
  );

  protected readonly latest = computed(() => this.history().at(-1));
  protected readonly latestDate = computed(() => {
    const row = this.latest();
    return row ? formatDisplayDate(row.date) : '—';
  });
  protected readonly totalSets = computed(() =>
    this.history().reduce((total, row) => total + row.sets, 0),
  );
  protected readonly bestWeightMetric = computed(() =>
    getMainGymMaxWeightMetric(this.mainGymContext(), this.sessions(), this.selectedMachineId()),
  );
  protected readonly bestWeight = computed(() => {
    const metric = this.bestWeightMetric();
    return metric.state === 'available' ? metric.value : 0;
  });
  protected readonly bestWeightLabel = computed(() => {
    const metric = this.bestWeightMetric();
    return metric.state === 'available' ? formatWeightKg(metric.value) : this.formatMainGymMetricState(metric);
  });
  protected readonly bestReps = computed(() => getMaxReps(this.comparableSessions(), this.selectedMachineId()));
  protected readonly estimatedOneRepMaxLabel = computed(() => {
    const metric = this.bestWeightMetric();
    return metric.state === 'available'
      ? formatWeightKg(getEstimated1RM(metric.value, this.bestReps()))
      : this.formatMainGymMetricState(metric);
  });
  protected readonly recent28Sessions = computed(() => getRecentSessions(this.comparableSessions(), 28));
  protected readonly averageSetWeight28d = computed(() => {
    const metric = getMainGymAverageSetWeightMetric(
      this.mainGymContext(),
      this.recent28Sessions(),
      this.selectedMachineId(),
    );
    return metric.state === 'available' ? metric.value : null;
  });
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
      colors: [chartTheme.accent],
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

  protected formatMainGymMetricState(metric: { state: string }): string {
    if (metric.state === 'unconfigured') {
      return 'Not Set';
    }

    if (metric.state === 'invalid') {
      return 'Unavailable';
    }

    return 'No Data';
  }

  protected selectMachine(machineId: string) {
    if (!this.machineOptions().some((machine) => machine.machine_id === machineId)) {
      return;
    }

    this.selectedMachineId.set(machineId);
    this.hasInvalidMachineIdParameter.set(false);
    window.history.pushState(null, '', `${applicationRoutes.machines}${machineId}/`);
  }

  protected updateMachineSearch(query: string) {
    this.machineSearchQuery.set(query);
    this.reconcileSelectedMachineWithFilters();
  }

  protected updateBodyPartFilter(bodyPart: string) {
    this.bodyPartFilter.set(bodyPart);
    this.reconcileSelectedMachineWithFilters();
  }

  protected clearMachineFilters() {
    this.machineSearchQuery.set('');
    this.bodyPartFilter.set('');
    this.reconcileSelectedMachineWithFilters();
  }

  protected formatBodyPartLabel(bodyPart: BodyPart): string {
    return formatBodyPart(bodyPart);
  }

  protected displayMachineName(machine: WorkoutMachine): string {
    return getMachineDisplayName(machine);
  }

  private getPathMachineId(): string | undefined {
    return window.location.pathname.split(applicationRoutes.machines)[1]?.split('/')[0] || undefined;
  }

  private selectMachineIdFromPath() {
    const pathMachineId = this.getPathMachineId();
    const hasValidPathMachineId =
      pathMachineId !== undefined &&
      this.machineOptions().some((machine) => machine.machine_id === pathMachineId);

    this.hasInvalidMachineIdParameter.set(pathMachineId !== undefined && !hasValidPathMachineId);
    this.invalidMachineId.set(pathMachineId ?? '');
    this.selectedMachineId.set(hasValidPathMachineId && pathMachineId ? pathMachineId : '');
  }

  private reconcileSelectedMachineWithFilters() {
    const filtered = this.filteredMachineOptions();
    if (
      this.selectedMachineId().length === 0 ||
      filtered.length === 0 ||
      filtered.some((machine) => machine.machine_id === this.selectedMachineId())
    ) {
      return;
    }

    this.selectedMachineId.set('');
  }
}


