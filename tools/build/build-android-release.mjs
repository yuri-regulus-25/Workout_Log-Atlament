import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const androidRoot = resolve(repoRoot, "src/application/android");
const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const wrapperPath = resolve(androidRoot, wrapper);
const hasWrapper = existsSync(wrapperPath);
const command = hasWrapper ? wrapperPath : "gradle";
const env = { ...process.env };

if (process.platform === "win32") {
  const javaHome = env.JAVA_HOME ?? "";
  const javaExe = javaHome ? resolve(javaHome, "bin/java.exe") : "";
  const androidStudioJbr = "C:/Program Files/Android/Android Studio/jbr";
  if (!javaHome || javaHome.includes("%JAVA_HOME%") || !existsSync(javaExe)) {
    if (existsSync(resolve(androidStudioJbr, "bin/java.exe"))) {
      env.JAVA_HOME = androidStudioJbr;
    }
  }
}

runNodeScript(resolve(repoRoot, "tools/build/copy-android-frontend.mjs"));

const result = spawnSync(command, [":app:assembleRelease"], {
  cwd: androidRoot,
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error?.code === "ENOENT" || (!hasWrapper && result.status !== 0)) {
  console.error("\nAndroid Gradle was not found or could not run from this shell.");
  console.error("Open src/application/android in Android Studio, run Gradle Sync, and build the app from Android Studio.");
  console.error("After generating a Gradle wrapper in src/application/android, this command will use .\\gradlew.bat automatically.");
}

process.exit(result.status ?? 1);
