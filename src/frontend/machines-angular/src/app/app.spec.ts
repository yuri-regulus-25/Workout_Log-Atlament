import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Performance Detail');
  });

  it('filters machines by name and body part while preserving selection semantics', () => {
    window.history.replaceState(null, '', '/machines/');
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      sessions: { set(value: unknown[]): void };
      selectedMachineId: { (): string };
      updateMachineSearch(query: string): void;
      updateBodyPartFilter(bodyPart: string): void;
      filteredMachineOptions(): Array<{ machine_id: string; name: string; body_part: string }>;
    };

    app.sessions.set([
      {
        schema_version: 1,
        session_id: 'session-1',
        date: '2026-08-24',
        status: 'complete',
        gym: { id: 'gym', name: 'Gym', short_name: 'GY' },
        condition: null,
        machines: [
          { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 40, reps: 10 }], notes: [] },
          { machine_id: 'lat-pulldown', name: 'Lat Pulldown', body_part: 'back', sets: [{ set: 1, weight_kg: 50, reps: 8 }], notes: [] },
        ],
        notes: [],
      },
    ]);

    app.updateMachineSearch('lat');
    expect(app.filteredMachineOptions().map((machine) => machine.machine_id)).toEqual(['lat-pulldown']);
    expect(app.selectedMachineId()).toBe('lat-pulldown');

    app.updateBodyPartFilter('chest');
    expect(app.filteredMachineOptions()).toEqual([]);
    expect(app.selectedMachineId()).toBe('lat-pulldown');

    app.updateMachineSearch('');
    expect(app.filteredMachineOptions().map((machine) => machine.machine_id)).toEqual(['pec-deck']);
    expect(app.selectedMachineId()).toBe('pec-deck');
  });

  it('renders a zero-result state for unmatched filters', () => {
    window.history.replaceState(null, '', '/machines/');
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      sessions: { set(value: unknown[]): void };
      updateMachineSearch(query: string): void;
    };

    app.sessions.set([
      {
        schema_version: 1,
        session_id: 'session-1',
        date: '2026-08-24',
        status: 'complete',
        gym: { id: 'gym', name: 'Gym', short_name: 'GY' },
        condition: null,
        machines: [
          { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 40, reps: 10 }], notes: [] },
        ],
        notes: [],
      },
    ]);
    app.updateMachineSearch('no-match');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('条件に一致するマシンがありません。');
  });

  it('falls back from an invalid route parameter without breaking filter selection', () => {
    window.history.replaceState(null, '', '/machines/missing-machine/');
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      sessions: { set(value: unknown[]): void };
      selectedMachineId: { (): string };
      hasInvalidMachineIdParameter: { (): boolean };
      selectMachineIdFromPath(): void;
      updateMachineSearch(query: string): void;
    };

    app.sessions.set([
      {
        schema_version: 1,
        session_id: 'session-1',
        date: '2026-08-24',
        status: 'complete',
        gym: { id: 'gym', name: 'Gym', short_name: 'GY' },
        condition: null,
        machines: [
          { machine_id: 'pec-deck', name: 'Pec Deck', body_part: 'chest', sets: [{ set: 1, weight_kg: 40, reps: 10 }], notes: [] },
          { machine_id: 'lat-pulldown', name: 'Lat Pulldown', body_part: 'back', sets: [{ set: 1, weight_kg: 50, reps: 8 }], notes: [] },
        ],
        notes: [],
      },
    ]);

    app.selectMachineIdFromPath();
    expect(app.hasInvalidMachineIdParameter()).toBe(true);
    expect(app.selectedMachineId()).toBe('lat-pulldown');

    app.updateMachineSearch('pec');
    expect(app.selectedMachineId()).toBe('pec-deck');
  });
});
