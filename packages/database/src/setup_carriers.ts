import { getDbClient } from './client';
import { sql } from 'drizzle-orm';

async function main() {
  const db = getDbClient();

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS carriers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      tracking_url_template VARCHAR(1024) NOT NULL,
      contact_phone VARCHAR(50),
      is_active BOOLEAN NOT NULL DEFAULT true,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.execute(sql`
    ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier_id UUID REFERENCES carriers(id) ON DELETE SET NULL;
  `);

  const initialCarriers = [
    {
      name: 'Blue Dart Express',
      code: 'bluedart',
      trackingUrlTemplate: 'https://www.bluedart.com/tracking/{trackingNumber}',
      contactPhone: '1860 233 1234',
    },
    {
      name: 'Delhivery Surface',
      code: 'delhivery',
      trackingUrlTemplate: 'https://www.delhivery.com/track/package/{trackingNumber}',
      contactPhone: '0124 671 9500',
    },
    {
      name: 'DTDC Prime',
      code: 'dtdc',
      trackingUrlTemplate: 'https://www.dtdc.in/tracking/{trackingNumber}',
      contactPhone: '080 2536 5032',
    },
    {
      name: 'DHL Express India',
      code: 'dhl',
      trackingUrlTemplate: 'https://www.dhl.com/in-en/home/tracking/tracking-express.html?submit=1&tracking-id={trackingNumber}',
      contactPhone: '1800 111 345',
    },
    {
      name: 'India Post Speed Post',
      code: 'speedpost',
      trackingUrlTemplate: 'https://www.indiapost.gov.in/_layouts/15/dpt.cpt.tracking/trackconsignment.aspx?track={trackingNumber}',
      contactPhone: '1800 266 6868',
    },
    {
      name: 'Atelier White Glove (In-House)',
      code: 'inhouse_concierge',
      trackingUrlTemplate: '',
      contactPhone: '+91 98111 00000',
    },
  ];

  for (const c of initialCarriers) {
    await db.execute(sql`
      INSERT INTO carriers (name, code, tracking_url_template, contact_phone, is_active)
      VALUES (${c.name}, ${c.code}, ${c.trackingUrlTemplate}, ${c.contactPhone}, true)
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  const result = await db.execute(sql`SELECT id, name, code, tracking_url_template FROM carriers`);
  console.log('Carriers registered in PostgreSQL:', result.length);
  console.table(result);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
