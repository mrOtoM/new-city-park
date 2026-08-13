import Link from 'next/link'
import { CalendarDays, Users, UserMinus, Percent, UserRound } from 'lucide-react'

import { TRAINING_TYPES } from '@/lib/constants'
import { formatDate, formatMonthKey } from '@/lib/utils'
import {
  countUniqueParticipants,
  getStatisticsData,
  listMonths,
  monthKey,
  summarize,
  summarizeByType,
} from '@/services/queries/statistics'

export const revalidate = 0

export const metadata = {
  title: 'Štatistiky',
}

function trainingType(type: string) {
  return TRAINING_TYPES.find((t) => t.value === type)
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-primary-900/50 rounded-lg p-3">
      <div className="text-primary-400 flex items-center gap-2 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-primary-50 mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="text-primary-500 text-xs">{hint}</p>}
    </div>
  )
}

function Bar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0

  return (
    <div className="bg-primary-800/60 h-2 w-full overflow-hidden rounded-full">
      <div className="bg-accent-purple h-full rounded-full" style={{ width: `${width}%` }} />
    </div>
  )
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const [{ month }, { trainings: allTrainings, registrations }] = await Promise.all([searchParams, getStatisticsData()])

  const months = listMonths(allTrainings)

  if (months.length === 0) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <h1 className="text-primary-50 text-2xl font-semibold">Štatistiky</h1>
        <p className="text-primary-400 text-sm">Zatiaľ nie sú k dispozícii žiadne údaje.</p>
      </div>
    )
  }

  const selectedMonth = month && months.includes(month) ? month : months[0]
  const trainings = allTrainings
    .filter((training) => monthKey(training.datetime) === selectedMonth)
    .sort((a, b) => a.datetime.localeCompare(b.datetime))

  // Zrušený tréning admin maže z DB, takže do štatistík stačí započítať tréningy, ktoré sa už odohrali.
  const now = Date.now()
  const finishedTrainings = trainings.filter((training) => new Date(training.datetime).getTime() <= now)
  const upcomingCount = trainings.length - finishedTrainings.length

  const summary = summarize(finishedTrainings)
  const uniqueParticipants = countUniqueParticipants(registrations, new Set(finishedTrainings.map((t) => t.id)))
  const types = summarizeByType(finishedTrainings)
  const maxParticipants = Math.max(1, ...finishedTrainings.map((training) => training.participants))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4">
      <h1 className="text-primary-50 text-2xl font-semibold">Štatistiky</h1>

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {months.map((key) => (
          <Link
            key={key}
            href={`/statistics?month=${key}`}
            scroll={false}
            className={`shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              key === selectedMonth
                ? 'bg-primary-600 text-primary-50'
                : 'bg-primary-900/50 text-primary-300 hover:bg-primary-800/60'
            }`}
          >
            {formatMonthKey(key)}
          </Link>
        ))}
      </nav>

      {upcomingCount > 0 && (
        <p className="text-primary-500 text-xs">
          Súčty zahŕňajú len tréningy, ktoré sa už odohrali. {upcomingCount} plánovaných sa neráta.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <SummaryCard
          label="Tréningy"
          value={summary.trainings}
          hint="odohraných"
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <SummaryCard
          label="Prihlásení"
          value={summary.participants}
          hint="spolu na všetkých tréningoch"
          icon={<Users className="h-4 w-4" />}
        />
        <SummaryCard
          label="Unikátnych ľudí"
          value={uniqueParticipants}
          hint="rôznych osôb v mesiaci"
          icon={<UserRound className="h-4 w-4" />}
        />
        <SummaryCard label="Odhlásení" value={summary.cancellations} icon={<UserMinus className="h-4 w-4" />} />
        <SummaryCard
          label="Miera odhlásení"
          value={`${summary.cancellationRate} %`}
          hint="zo všetkých prihlášok"
          icon={<Percent className="h-4 w-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-primary-50 text-lg font-semibold">Podľa typu tréningu</h2>
        <ul className="space-y-2">
          {types.map((type) => {
            const Icon = trainingType(type.type)?.icon ?? TRAINING_TYPES[0].icon
            return (
              <li key={type.type} className="bg-primary-900/50 flex items-center gap-3 rounded-lg p-3">
                <div className="bg-primary-600 flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-primary-50 text-sm">{trainingType(type.type)?.label ?? 'Tréning'}</p>
                  <p className="text-primary-400 text-xs">
                    {type.trainings} tréningov &middot; {type.participants} prihlásených &middot; {type.cancellations}{' '}
                    odhlásených
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-primary-50 text-lg font-semibold">Tréningy v mesiaci</h2>
        <ul className="space-y-2">
          {finishedTrainings.map((training) => (
            <li key={training.id} className="bg-primary-900/50 space-y-2 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-primary-50 text-sm">{trainingType(training.type)?.label ?? 'Tréning'}</p>
                  <p className="text-primary-400 text-xs">
                    {formatDate(training.datetime)} &middot; {formatDate(training.datetime, 'HH:mm')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary-50 text-sm">
                    {training.participants}
                    {training.maxParticipants ? (
                      <span className="text-primary-500"> / {training.maxParticipants}</span>
                    ) : null}
                  </p>
                  <p className="text-primary-400 text-xs">{training.cancellations} odhlásených</p>
                </div>
              </div>
              <Bar value={training.participants} max={maxParticipants} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
