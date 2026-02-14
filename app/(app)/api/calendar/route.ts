import { getTrainings } from '@/services/trainings'

export async function GET() {
  try {
    const trainings = await getTrainings()

    return Response.json({ trainings })
  } catch (error: any) {
    return Response.json(
      { message: 'Failed to fetch cabin data' },
      { status: 500 },
    )
  }
}
