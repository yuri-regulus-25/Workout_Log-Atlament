import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(repositoryRoot, "dist");
const androidFrontendRoot = path.join(repositoryRoot, "src/application/android/app/src/main/assets/frontend");

if (!existsSync(path.join(distRoot, "index.html"))) {
  throw new Error("dist/index.html was not found. Run npm run build before copying Android frontend assets.");
}

rmSync(androidFrontendRoot, { recursive: true, force: true });
mkdirSync(androidFrontendRoot, { recursive: true });
cpSync(distRoot, androidFrontendRoot, { recursive: true });

console.log(`Android frontend assets copied: ${path.relative(repositoryRoot, androidFrontendRoot)}`);
