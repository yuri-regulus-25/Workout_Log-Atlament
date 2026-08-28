import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { WorkoutMasterData } from '@workout-lab/workout-types'
import {
  loadWorkoutSessionsFromFiles,
  parseMachineMaster,
  parseGymMaster,
  sampleMasterData,
} from './index.ts'

export async function loadWorkoutSessionsFromDirectory(
  rootDirectory: string,
  masterData = sampleMasterData,
) {
  const files = await collectWorkoutFiles(rootDirectory)
  return loadWorkoutSessionsFromFiles(
    await Promise.all(
      files.map(async (path) => ({
        path,
        content: await readFile(path, 'utf8'),
      })),
    ),
    masterData,
  )
}

export async function loadMasterDataFromDirectory(masterDirectory: string): Promise<{
  masterData?: WorkoutMasterData
  issues: { filePath: string; message: string; line?: number }[]
}> {
  const machineMasterPath = join(masterDirectory, 'machines.json')
  const gymMasterPath = join(masterDirectory, 'gyms.json')
  const machineResult = parseMachineMaster(
    machineMasterPath,
    await readFile(machineMasterPath, 'utf8'),
  )
  const gymResult = parseGymMaster(gymMasterPath, await readFile(gymMasterPath, 'utf8'))
  const issues = [...machineResult.issues, ...gymResult.issues]

  if (!machineResult.master || !gymResult.master || issues.length > 0) {
    return { issues }
  }

  return {
    masterData: {
      machines: machineResult.master,
      gyms: gymResult.master,
    },
    issues,
  }
}

async function collectWorkoutFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectWorkoutFiles(path)
      }

      return ['.json', '.jsonl'].includes(extname(entry.name)) ? [path] : []
    }),
  )

  return files.flat().sort()
}
