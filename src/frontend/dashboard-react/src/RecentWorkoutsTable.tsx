import { applicationRoutes } from '@workout-lab/frontend-common/navigation'
import { formatDisplayDate } from '@workout-lab/workout-core'

export type RecentWorkoutRow = {
  sessionId: string
  date: string
  gym: string
  machineCount: number
  totalSets: number
  totalVolume: number
}

export function RecentWorkoutsTable({ rows }: { rows: RecentWorkoutRow[] }) {
  return (
    <div className="recent-table dashboard-recent-table">
      <div className="recent-row header">
        <span className="date-cell">Date</span>
        <span className="gym-cell">Gym</span>
        <span className="machines-cell">Machines</span>
        <span className="sets-cell">Sets</span>
        <span className="volume-cell">Volume</span>
      </div>
      {rows.map((row) => (
        <a key={row.sessionId} className="recent-row" href={`${applicationRoutes.workouts}${row.date}/`}>
          <span className="date-cell">{formatDisplayDate(row.date)}</span>
          <span className="gym-cell">{row.gym}</span>
          <span className="machines-cell">{row.machineCount}</span>
          <span className="sets-cell">{row.totalSets}</span>
          <span className="volume-cell">{row.totalVolume.toLocaleString()} kg</span>
        </a>
      ))}
    </div>
  )
}
