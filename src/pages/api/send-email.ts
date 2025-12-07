import type { APIContext } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export async function POST(context: APIContext): Promise<Response> {
  try {
    // Check if request has body
    const contentType = context.request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let formData;
    try {
      formData = await context.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const { name, place, message, email, files } = formData;

    // Validate email
    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content
    let emailBody = `
      <h2 style="font-family: sans-serif; color: #1d1d1b;">New message from About You form</h2>
      
      <div style="font-family: sans-serif; color: #1d1d1b; line-height: 1.6;">
        ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
        ${place ? `<p><strong>Place:</strong> ${place}</p>` : ''}
        <p><strong>Email:</strong> ${email}</p>
        ${message ? `<p><strong>Message:</strong></p><p style="white-space: pre-wrap;">${message}</p>` : ''}
      </div>
    `;

    // Prepare attachments if files are present
    const attachments = files?.map((file: { name: string; type: string; data: string }) => {
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = file.data.split(',')[1] || file.data;

      return {
        filename: file.name,
        content: base64Data,
      };
    }) || [];

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'Design for the Continuum <onboarding@resend.dev>', // Update with your verified domain
      to: [import.meta.env.CONTACT_EMAIL || 'your-email@example.com'], // Set this in your .env
      replyTo: email,
      subject: `New message from ${name || 'Anonymous'}${place ? ` (${place})` : ''}`,
      html: emailBody,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
