import { bootstrapApplication } from '@angular/platform-browser';
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme';
import { appConfig } from './app/app.config';
import { App } from './app/app';

initializeStoredTheme();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
