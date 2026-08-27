import { bootstrapApplication } from '@angular/platform-browser';
import { initializeStoredBrandVariant } from '@workout-lab/frontend-common/branding';
import { initializeStoredTheme } from '@workout-lab/frontend-common/theme';
import { appConfig } from './app/app.config';
import { App } from './app/app';

initializeStoredBrandVariant();
initializeStoredTheme();

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
