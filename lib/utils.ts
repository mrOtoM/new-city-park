const SK_MONTHS = [
  'januára',
  'februára',
  'marca',
  'apríla',
  'mája',
  'júna',
  'júla',
  'augusta',
  'septembra',
  'októbra',
  'novembra',
  'decembra',
]

export function formatDate(value: string | Date | null | undefined, format: string = 'd. MMMM yyyy') {
  if (!value) return ''
  if (format === 'HH:mm' && typeof value === 'string' && value.length <= 8) return value.substring(0, 5)

  const d = value instanceof Date ? value : new Date(String(value))

  if (isNaN(d.getTime())) return ''

  const day = d.getDate()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  return format
    .replace('MMMM', SK_MONTHS[d.getMonth()])
    .replace('MM', month)
    .replace('yyyy', String(year))
    .replace('dd', String(day).padStart(2, '0'))
    .replace('d', String(day))
    .replace('HH', hours)
    .replace('mm', minutes)
}

const SK_MONTHS_NOMINATIVE = [
  'Január',
  'Február',
  'Marec',
  'Apríl',
  'Máj',
  'Jún',
  'Júl',
  'August',
  'September',
  'Október',
  'November',
  'December',
]

// Vstup je kľúč "yyyy-MM", nie dátum – nepoužívame Date, aby nezasahovala časová zóna.
export function formatMonthKey(key: string) {
  const [year, month] = key.split('-')
  const label = SK_MONTHS_NOMINATIVE[Number(month) - 1]

  return label ? `${label} ${year}` : key
}

export function isDeadlinePassed(deadline?: string | Date | null) {
  if (!deadline) return false

  const d = deadline instanceof Date ? deadline : new Date(String(deadline))

  if (isNaN(d.getTime())) return false

  return new Date() > d
}

export function buildDeadlineISO(date: string, time: string) {
  return date && time ? `${date}T${time}` : null
}

export function computeDeadlineFromTraining(trainingDatetime: string, hoursBefore: number): string | null {
  if (!trainingDatetime || !hoursBefore) return null

  const trainingDate = new Date(trainingDatetime)

  if (isNaN(trainingDate.getTime())) return null

  const deadlineDate = new Date(trainingDate.getTime() - hoursBefore * 60 * 60 * 1000)

  const year = deadlineDate.getFullYear()
  const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
  const day = String(deadlineDate.getDate()).padStart(2, '0')
  const hours = String(deadlineDate.getHours()).padStart(2, '0')
  const minutes = String(deadlineDate.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}
