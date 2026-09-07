import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const androidRoot = resolve(repoRoot, "src/application/android");
const npmCli = resolve(process.execPath, "../node_modules/npm/bin/npm-cli.js");
const androidWrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const androidWrapperPath = resolve(androidRoot, androidWrapper);
const androidCommand = existsSync(androidWrapperPath) ? androidWrapperPath : "gradle";
const windowsProject = resolve(repoRoot, "src/application/windows/Atlament.csproj");
const env = resolveBuildEnvironment();

runNpm(["run", "build"]);
run("dotnet", ["build", windowsProject, "--configuration", "Debug"], repoRoot);
runNodeScript(resolve(repoRoot, "tools/build/copy-android-frontend.mjs"));
runAndroidGradle([":app:assembleDebug"]);

function runNpm(args) {
  if (existsSync(npmCli)) {
    run(process.execPath, [npmCli, ...args], repoRoot);
    return;
  }

  run(process.platform === "win32" ? "npm.cmd" : "npm", args, repoRoot, { shell: process.platform === "win32" });
}

function runAndroidGradle(args) {
  if (process.platform === "win32" && androidCommand.endsWith(".bat")) {
    run(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", androidCommand, ...args], androidRoot);
    return;
  }

  run(androidCommand, args, androidRoot);
}

function runNodeScript(scriptPath) {
  run(process.execPath, [scriptPath], repoRoot);
}

function run(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: options.shell ?? false,
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function resolveBuildEnvironment() {
  const next = { ...process.env };
  if (process.platform !== "win32") return next;

  const javaHome = next.JAVA_HOME ?? "";
  const javaExe = javaHome ? resolve(javaHome, "bin/java.exe") : "";
  const androidStudioJbr = "C:/Program Files/Android/Android Studio/jbr";
  if ((!javaHome || javaHome.includes("%JAVA_HOME%") || !existsSync(javaExe)) && existsSync(resolve(androidStudioJbr, "bin/java.exe"))) {
    next.JAVA_HOME = androidStudioJbr;
  }
  return next;
}
