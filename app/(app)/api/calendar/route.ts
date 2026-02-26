import { getTrainings } from '@/services/queries/trainings'

export async function GET() {
  try {
    const trainings = await getTrainings()

    return Response.json({ trainings })
  } catch {
    return Response.json(
      { message: 'Failed to fetch trainings' },
      { status: 500 },
    )
  }
}
