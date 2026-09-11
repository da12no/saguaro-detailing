exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { email, name, subject, htmlContent, notifyBusiness } = payload
  if (!email || !name || !htmlContent) {
    return { statusCode: 400, body: 'Missing required fields' }
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return { statusCode: 500, body: 'Email service not configured' }
  }

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  }

  // Send customer confirmation
  const customerRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender: { name: 'Saguaro Mobile Car Detailing', email: 'hello@saguaromobilecardetailing.com' },
      to: [{ email, name }],
      subject: subject || 'Your Booking is Confirmed - Saguaro Mobile Car Detailing',
      htmlContent,
    }),
  })

  if (!customerRes.ok) {
    const err = await customerRes.text()
    return { statusCode: 502, body: `Brevo error (customer): ${err}` }
  }

  // Send business notification email
  if (notifyBusiness) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: 'Saguaro Booking System', email: 'hello@saguaromobilecardetailing.com' },
        to: [{ email: 'arizonamobilecardetailing@gmail.com', name: 'Saguaro Mobile Car Detailing' }],
        subject: `New Booking: ${name} — ${notifyBusiness.service}`,
        htmlContent: notifyBusiness.html,
      }),
    }).catch(() => {})
  }

  return { statusCode: 200, body: 'OK' }
}
