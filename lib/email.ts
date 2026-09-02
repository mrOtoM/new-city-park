import { Resend } from 'resend'

// Built on first send. `new Resend(undefined)` throws, and at module level that
// would break the build and every import in an environment without the key.
let client: Resend | null = null

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) return null

  client ??= new Resend(apiKey)

  return client
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'New City Park <noreply@newcitypark.sk>'

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function emailLayout(heading: string, body: string) {
  return `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #333;">${heading}</h2>
            ${body}
            <br />
            <p style="color: #888; font-size: 12px;">New City Park</p>
          </div>
        `
}

export async function sendTrainingRegistrationEmail(
  participant: { name: string; email: string },
  trainingLabel: string,
  trainingDatetime: string,
  unregisterDeadline?: string | null,
) {
  const resend = resendClient()

  if (!resend || !participant.email) return

  const safeName = escapeHtml(participant.name)
  const safeLabel = escapeHtml(trainingLabel)
  const safeDatetime = escapeHtml(trainingDatetime)
  const deadlineParagraph = unregisterDeadline
    ? `<p>Odhlásiť sa môžeš najneskôr do <strong>${escapeHtml(unregisterDeadline)}</strong>.</p>`
    : ''

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: participant.email,
    subject: `Prihlásenie na tréning – ${trainingLabel}`,
    html: emailLayout(
      'Si prihlásený na tréning',
      `
            <p>Ahoj ${safeName},</p>
            <p>
              Úspešne sme ťa prihlásili na tréning <strong>${safeLabel}</strong>,
              ktorý sa koná <strong>${safeDatetime}</strong>.
            </p>
            ${deadlineParagraph}
            <p>Tešíme sa na teba!</p>
      `,
    ),
  })

  if (error) {
    console.error('Failed to send registration email', error)
  }
}

/**
 * Sent when a registration ends: either the participant unregistered, or an
 * admin removed them. The two cases read differently, because only one of them
 * is news to the recipient.
 */
export async function sendTrainingUnregistrationEmail(
  participant: { name: string; email: string },
  trainingLabel: string,
  trainingDatetime: string,
  options: { byAdmin?: boolean } = {},
) {
  const resend = resendClient()

  if (!resend || !participant.email) return

  const safeName = escapeHtml(participant.name)
  const safeLabel = escapeHtml(trainingLabel)
  const safeDatetime = escapeHtml(trainingDatetime)

  const heading = options.byAdmin ? 'Boli ste odhlásený z tréningu' : 'Odhlásenie z tréningu potvrdené'
  const explanation = options.byAdmin
    ? `<p>
         Z tréningu <strong>${safeLabel}</strong>, ktorý sa koná
         <strong>${safeDatetime}</strong>, ťa odhlásil organizátor.
       </p>
       <p>Ak si myslíš, že ide o omyl, ozvi sa nám.</p>`
    : `<p>
         Odhlásili sme ťa z tréningu <strong>${safeLabel}</strong>, ktorý sa koná
         <strong>${safeDatetime}</strong>.
       </p>
       <p>Ak si to rozmyslíš, môžeš sa prihlásiť znova, kým je voľné miesto.</p>`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: participant.email,
    subject: `Odhlásenie z tréningu – ${trainingLabel}`,
    html: emailLayout(
      heading,
      `
            <p>Ahoj ${safeName},</p>
            ${explanation}
      `,
    ),
  })

  if (error) {
    console.error('Failed to send unregistration email', error)
  }
}

export async function sendTrainingCancelledEmails(
  participants: { name: string; email: string }[],
  trainingLabel: string,
  trainingDatetime: string,
) {
  const resend = resendClient()

  if (!resend || participants.length === 0) return

  const results = await Promise.allSettled(
    participants.map(async (p) => {
      const safeName = escapeHtml(p.name)
      const safeLabel = escapeHtml(trainingLabel)
      const safeDatetime = escapeHtml(trainingDatetime)

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: p.email,
        subject: `Tréning zrušený – ${trainingLabel}`,
        html: emailLayout(
          'Tréning bol zrušený',
          `
            <p>Ahoj ${safeName},</p>
            <p>
              tréning <strong>${safeLabel}</strong> plánovaný na
              <strong>${safeDatetime}</strong> bol zrušený.
            </p>
            <p>Ospravedlňujeme sa za komplikácie.</p>
          `,
        ),
      })
      if (error) throw error
      return data
    }),
  )

  const failed = results.filter((r) => r.status === 'rejected')
  if (failed.length > 0) {
    console.error(`Failed to send ${failed.length}/${participants.length} cancellation emails`)
  }
}
