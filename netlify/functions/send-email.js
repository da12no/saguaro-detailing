exports.handler = async (event) => {
  console.log('send-email called, method:', event.httpMethod)

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    console.log('ERROR: Invalid JSON body')
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { email, name, subject, htmlContent, notifyBusiness } = payload
  console.log('Parsed payload - email:', email, 'name:', name, 'hasHtml:', !!htmlContent)

  if (!email || !name || !htmlContent) {
    console.log('ERROR: Missing required fields')
    return { statusCode: 400, body: 'Missing required fields' }
  }

  const apiKey = process.env.BREVO_API_KEY
  console.log('API key present:', !!apiKey, 'length:', apiKey ? apiKey.length : 0)

  if (!apiKey) {
    console.log('ERROR: No BREVO_API_KEY env var')
    return { statusCode: 500, body: 'Email service not configured' }
  }

  const headers = {
    'api-key': apiKey,
    'Content-Type': 'application/json',
  }

  console.log('Calling Brevo API...')
  const customerRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sender: { name: 'Saguaro Mobile Car Detailing', email: 'arizonamobilecardetailing@gmail.com' },
      to: [{ email, name }],
      subject: subject || 'Your Booking is Confirmed - Saguaro Mobile Car Detailing',
      htmlContent,
    }),
  })

  console.log('Brevo customer response status:', customerRes.status)

  if (!customerRes.ok) {
    const err = await customerRes.text()
    console.log('ERROR from Brevo:', err)
    return { statusCode: 502, body: `Brevo error (customer): ${err}` }
  }

  if (notifyBusiness) {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: 'Saguaro Booking System', email: 'arizonamobilecardetailing@gmail.com' },
        to: [{ email: 'arizonamobilecardetailing@gmail.com', name: 'Saguaro Mobile Car Detailing' }],
        subject: `New Booking: ${name} — ${notifyBusiness.service}`,
        htmlContent: notifyBusiness.html,
      }),
    }).catch((e) => console.log('Business notify error:', e.message))
  }

  console.log('Done - returning 200')
  return { statusCode: 200, body: 'OK' }
}
