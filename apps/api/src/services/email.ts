import { env } from '../config/env.js';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailPayload {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export function isBrevoConfigured(): boolean {
  return Boolean(env.BREVO_API_KEY && env.BREVO_API_KEY.length > 5);
}

/**
 * Send an email via Brevo's v3 Transactional REST API
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const configured = isBrevoConfigured();

  if (!configured) {
    if (env.NODE_ENV !== 'production') {
      console.log(
        `[BREVO EMAIL SIMULATION] To: ${payload.to.map((r) => r.email).join(', ')} | Subject: "${payload.subject}"`
      );
    }
    return {
      success: true,
      messageId: `simulated_${Date.now()}`,
    };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: env.BREVO_SENDER_NAME,
          email: env.BREVO_SENDER_EMAIL,
        },
        to: payload.to.map((recipient) => ({
          email: recipient.email,
          name: recipient.name || recipient.email,
        })),
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent || undefined,
      }),
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const errorMsg = data?.message || `Brevo API error HTTP ${res.status}`;
      if (errorMsg === 'Key not found' && env.BREVO_API_KEY.startsWith('xsmtpsib-')) {
        console.error(
          `[BREVO CONFIGURATION NOTICE]: The BREVO_API_KEY in .env starts with "xsmtpsib-", which is an SMTP password. Brevo REST API requires an API Key starting with "xkeysib-" generated from: Brevo Dashboard -> SMTP & API -> "API Keys" tab.`
        );
      } else {
        console.error(`[BREVO API ERROR]:`, errorMsg);
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err: any) {
    console.error(`[BREVO NETWORK ERROR]:`, err.message);
    return {
      success: false,
      error: err.message || 'Failed to dispatch email via Brevo',
    };
  }
}

/**
 * Luxury Brutalist HTML wrapper for Atelier transactional emails
 */
export function wrapAtelierEmailTemplate(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FAF9F6;
      color: #1B1C1A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #FFFFFF;
      border: 1px solid #E5E3DC;
      padding: 40px 32px;
    }
    .header {
      border-bottom: 2px solid #1B1C1A;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .brand {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #1B1C1A;
    }
    .subtitle {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #767872;
      margin-top: 4px;
    }
    .headline {
      font-size: 20px;
      font-weight: 600;
      color: #1B1C1A;
      margin-bottom: 16px;
    }
    .body-text {
      font-size: 14px;
      color: #464742;
      margin-bottom: 24px;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      font-size: 13px;
    }
    .item-table th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #767872;
      border-bottom: 1px solid #E5E3DC;
      padding: 8px 4px;
    }
    .item-table td {
      border-bottom: 1px solid #E5E3DC;
      padding: 12px 4px;
      color: #1B1C1A;
    }
    .total-box {
      border-top: 2px solid #1B1C1A;
      padding-top: 16px;
      margin-top: 16px;
      font-size: 15px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
    }
    .footer {
      border-top: 1px solid #E5E3DC;
      padding-top: 24px;
      margin-top: 40px;
      font-size: 11px;
      color: #767872;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background-color: #FAF9F6;
      border: 1px solid #D6D3CA;
      font-family: monospace;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">ATELIER</div>
      <div class="subtitle">Permanent Haute Couture Architecture</div>
    </div>
    ${bodyContent}
    <div class="footer">
      <p>ATELIER COMMERCE IN &bull; GST COMPLIANT TAX INVOICE</p>
      <p>For assistance, reach our concierge team at support@atelier.in</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Format paise into Indian Rupee string
 */
function formatRupees(paise: number): string {
  const inr = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(inr);
}

/**
 * Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    title: string;
    size: string;
    color: string;
    quantity: number;
    pricePaise: number;
  }>;
  totalPaise: number;
  shippingAddress: string;
}): Promise<SendEmailResult> {
  const rows = params.items
    .map(
      (item) => `
      <tr>
        <td><strong>${item.title}</strong><br><span style="font-size: 11px; color: #767872;">Size: ${item.size} | Color: ${item.color}</span></td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right; font-family: monospace;">${formatRupees(item.pricePaise * item.quantity)}</td>
      </tr>`
    )
    .join('');

  const body = `
    <div class="headline">Order Confirmed: #${params.orderNumber}</div>
    <p class="body-text">
      Salutations ${params.customerName},<br>
      Your commission has been accepted into our production and fulfillment registry.
    </p>

    <div style="margin-bottom: 24px;">
      <span class="badge">ORDER ID: ${params.orderNumber}</span>
    </div>

    <table class="item-table">
      <thead>
        <tr>
          <th>Garment</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="total-box">
      <span>Total Paid:</span>
      <span style="font-family: monospace;">${formatRupees(params.totalPaise)}</span>
    </div>

    <div style="margin-top: 28px; padding: 16px; background-color: #FAF9F6; border: 1px solid #E5E3DC; font-size: 12px;">
      <strong>Delivery Destination:</strong><br>
      ${params.shippingAddress}
    </div>
  `;

  return sendEmail({
    to: [{ email: params.customerEmail, name: params.customerName }],
    subject: `Order Confirmed: #${params.orderNumber} | ATELIER`,
    htmlContent: wrapAtelierEmailTemplate(`Order Confirmed #${params.orderNumber}`, body),
    textContent: `Your order #${params.orderNumber} has been received. Total: ${formatRupees(params.totalPaise)}.`,
  });
}

/**
 * Dispatch / Shipment Notification Email
 */
export async function sendShipmentNotificationEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
}): Promise<SendEmailResult> {
  const body = `
    <div class="headline">Dispatch Notice: #${params.orderNumber}</div>
    <p class="body-text">
      Salutations ${params.customerName},<br>
      Your garments have passed precision inspection and are now in transit.
    </p>

    <div style="padding: 20px; background-color: #FAF9F6; border: 1px solid #E5E3DC; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>Logistics Carrier:</strong> ${params.carrier}</p>
      <p style="margin: 0; font-size: 13px;"><strong>Airway Bill (AWB):</strong> <span class="badge">${params.trackingNumber}</span></p>
      ${
        params.trackingUrl
          ? `<p style="margin: 12px 0 0 0;"><a href="${params.trackingUrl}" style="color: #1B1C1A; font-weight: 600; text-decoration: underline; font-size: 12px;">Track Dispatch Registry &rarr;</a></p>`
          : ''
      }
    </div>
  `;

  return sendEmail({
    to: [{ email: params.customerEmail, name: params.customerName }],
    subject: `Dispatched: Order #${params.orderNumber} | ATELIER`,
    htmlContent: wrapAtelierEmailTemplate(`Shipment Notice #${params.orderNumber}`, body),
    textContent: `Your order #${params.orderNumber} has been dispatched with carrier ${params.carrier}. Tracking: ${params.trackingNumber}`,
  });
}

/**
 * Welcome Registration Email
 */
export async function sendWelcomeEmail(params: {
  customerName: string;
  customerEmail: string;
}): Promise<SendEmailResult> {
  const body = `
    <div class="headline">Welcome to the Atelier Registry</div>
    <p class="body-text">
      Salutations ${params.customerName},<br>
      Your client profile has been established with Atelier. You now possess access to our permanent collection, priority releases, and customized tailoring records.
    </p>
    <div style="margin-top: 24px; padding: 16px; background-color: #FAF9F6; border: 1px solid #E5E3DC; font-size: 12px;">
      Registered Account: <strong>${params.customerEmail}</strong>
    </div>
  `;

  return sendEmail({
    to: [{ email: params.customerEmail, name: params.customerName }],
    subject: `Welcome to ATELIER`,
    htmlContent: wrapAtelierEmailTemplate(`Welcome to ATELIER`, body),
    textContent: `Welcome to ATELIER, ${params.customerName}. Your account (${params.customerEmail}) is now active.`,
  });
}

/**
 * Refund Notification Email
 */
export async function sendRefundNotificationEmail(params: {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  refundAmountPaise: number;
  reason?: string;
}): Promise<SendEmailResult> {
  const body = `
    <div class="headline">Refund Settlement: #${params.orderNumber}</div>
    <p class="body-text">
      Salutations ${params.customerName},<br>
      A refund of <strong>${formatRupees(params.refundAmountPaise)}</strong> has been processed to your original payment method.
    </p>
    ${params.reason ? `<p style="font-size: 12px; color: #767872;">Reason: ${params.reason}</p>` : ''}
    <p style="font-size: 12px; color: #767872;">Bank processing timelines typically conclude within 3 to 5 business days.</p>
  `;

  return sendEmail({
    to: [{ email: params.customerEmail, name: params.customerName }],
    subject: `Refund Processed: Order #${params.orderNumber} | ATELIER`,
    htmlContent: wrapAtelierEmailTemplate(`Refund Processed #${params.orderNumber}`, body),
    textContent: `Refund of ${formatRupees(params.refundAmountPaise)} for order #${params.orderNumber} has been settled.`,
  });
}

/**
 * Newsletter Welcome Email
 */
export async function sendNewsletterWelcomeEmail(params: {
  subscriberEmail: string;
}): Promise<SendEmailResult> {
  const body = `
    <div class="headline">Confirmed: Atelier Registry Subscription</div>
    <p class="body-text">
      Salutations,<br>
      You have joined the private Atelier Registry. You will now receive private dispatches regarding limited milling runs, archival releases, and bespoke tailoring appointments.
    </p>
    <div style="margin: 24px 0; padding: 18px; background-color: #FAF9F6; border: 1px solid #E5E3DC; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #767872;">Permanent Studio Coordinates</p>
      <p style="margin: 0; font-weight: 500;">New Delhi Atelier &bull; Series 04</p>
      <p style="margin: 4px 0 0 0; color: #767872;">Single-origin raw natural fibres engineered with architectural discipline.</p>
    </div>
    <p style="margin-top: 24px;">
      <a href="${env.STOREFRONT_URL}/catalog" style="display: inline-block; padding: 12px 24px; background-color: #1B1C1A; color: #FAF9F6; text-decoration: none; font-size: 11px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 0.15em;">Explore Permanent Archive &rarr;</a>
    </p>
  `;

  return sendEmail({
    to: [{ email: params.subscriberEmail }],
    subject: `Welcome to the Atelier Registry | Series 04`,
    htmlContent: wrapAtelierEmailTemplate(`Registry Confirmation`, body),
    textContent: `Welcome to the Atelier Registry. You will receive private dispatches regarding seasonal releases and tailoring commissions.`,
  });
}

/**
 * Product Release Announcement Email for Newsletter Subscribers
 */
export async function sendProductReleaseAnnouncementEmail(params: {
  subscribers: string[];
  product: {
    title: string;
    slug: string;
    description?: string;
    primaryImageUrl?: string;
    basePricePaise: number;
    categoryName?: string;
  };
}): Promise<SendEmailResult[]> {
  const storefrontUrl = env.STOREFRONT_URL;
  const productUrl = `${storefrontUrl}/products/${params.product.slug}`;

  const body = `
    <div style="font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #767872; margin-bottom: 8px;">
      Archival Release &bull; ${params.product.categoryName || 'Garment'}
    </div>
    <div class="headline" style="font-size: 24px; line-height: 1.25; margin-bottom: 16px;">
      ${params.product.title}
    </div>
    ${
      params.product.primaryImageUrl
        ? `<div style="margin-bottom: 24px; text-align: center; background-color: #F4F3F0; border: 1px solid #E5E3DC;">
             <img src="${params.product.primaryImageUrl}" alt="${params.product.title}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
           </div>`
        : ''
    }
    <p class="body-text" style="font-size: 13px; line-height: 1.6; color: #444; margin-bottom: 20px;">
      ${params.product.description || 'A new archival silhouette constructed from single-origin natural fibres.'}
    </p>
    <div style="padding: 16px; background-color: #FAF9F6; border: 1px solid #E5E3DC; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; color: #767872;">Commission Price:</span>
      <span style="font-size: 15px; font-weight: 600; color: #1B1C1A;">${formatRupees(params.product.basePricePaise)}</span>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${productUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1B1C1A; color: #FAF9F6; text-decoration: none; font-size: 11px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 0.15em;">
        Inspect Garment Specifications &rarr;
      </a>
    </div>
  `;

  const results: SendEmailResult[] = [];
  // Send in batches of 10 to avoid payload bloat
  const batchSize = 10;
  for (let i = 0; i < params.subscribers.length; i += batchSize) {
    const chunk = params.subscribers.slice(i, i + batchSize);
    const result = await sendEmail({
      to: chunk.map((email) => ({ email })),
      subject: `New Archival Release: ${params.product.title} | ATELIER`,
      htmlContent: wrapAtelierEmailTemplate(`New Release: ${params.product.title}`, body),
      textContent: `New release: ${params.product.title} (${formatRupees(params.product.basePricePaise)}). View at ${productUrl}`,
    });
    results.push(result);
  }

  return results;
}

/**
 * Collection Release Announcement Email for Newsletter Subscribers
 */
export async function sendCollectionReleaseAnnouncementEmail(params: {
  subscribers: string[];
  collection: {
    name: string;
    slug: string;
    description?: string;
  };
}): Promise<SendEmailResult[]> {
  const storefrontUrl = env.STOREFRONT_URL;
  const collectionUrl = `${storefrontUrl}/catalog?collection=${encodeURIComponent(params.collection.name)}`;

  const body = `
    <div style="font-family: 'Courier New', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #767872; margin-bottom: 8px;">
      Collection Unveiling &bull; Series 04
    </div>
    <div class="headline" style="font-size: 26px; line-height: 1.25; margin-bottom: 16px;">
      The ${params.collection.name} Collection
    </div>
    <p class="body-text" style="font-size: 13px; line-height: 1.6; color: #444; margin-bottom: 24px;">
      ${params.collection.description || 'A unified seasonal series exploring raw tactile fibre purity, structured tailoring, and enduring wardrobe silhouettes.'}
    </p>
    <div style="text-align: center; margin-top: 28px;">
      <a href="${collectionUrl}" style="display: inline-block; padding: 14px 28px; background-color: #1B1C1A; color: #FAF9F6; text-decoration: none; font-size: 11px; font-family: 'Courier New', monospace; text-transform: uppercase; letter-spacing: 0.15em;">
        Explore Curated Collection &rarr;
      </a>
    </div>
  `;

  const results: SendEmailResult[] = [];
  const batchSize = 10;
  for (let i = 0; i < params.subscribers.length; i += batchSize) {
    const chunk = params.subscribers.slice(i, i + batchSize);
    const result = await sendEmail({
      to: chunk.map((email) => ({ email })),
      subject: `New Collection: The ${params.collection.name} | ATELIER`,
      htmlContent: wrapAtelierEmailTemplate(`Collection: ${params.collection.name}`, body),
      textContent: `Announcing the ${params.collection.name} collection. Explore now at ${collectionUrl}`,
    });
    results.push(result);
  }

  return results;
}
