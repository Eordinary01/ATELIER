import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../schema/index';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_SEED !== 'true') {
    throw new Error('PRODUCTION ENVIRONMENT DETECTED: Set FORCE_SEED=true to seed a new production database.');
  }

  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://atelier_admin:atelier_dev_password@localhost:5433/atelier_commerce';

  console.log('Connecting to PostgreSQL for development seeding...');
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log('Seeding reference categories...');
  const categoryDefs = [
    { name: 'Shirts', slug: 'shirts', description: 'Precision tailored and relaxed shirting', displayOrder: 1 },
    { name: 'Trousers', slug: 'trousers', description: 'Architectural cuts in linen and cotton twill', displayOrder: 2 },
    { name: 'Overshirts', slug: 'overshirts', description: 'Heavyweight layering utility overshirts', displayOrder: 3 },
    { name: 'Knitwear', slug: 'knitwear', description: 'Fine merino and gauge knit staples', displayOrder: 4 },
    { name: 'Bags', slug: 'bags', description: 'Waxed duck canvas and bridle leather carryalls', displayOrder: 5 },
    { name: 'Belts', slug: 'belts', description: 'Full grain vegetable tanned leather belts', displayOrder: 6 },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoryDefs) {
    const [inserted] = await db
      .insert(schema.categories)
      .values(cat)
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: cat.name, description: cat.description },
      })
      .returning({ id: schema.categories.id });
    if (inserted) {
      categoryMap.set(cat.slug, inserted.id);
    }
  }

  console.log('Seeding reference products from DESIGN/code.html...');

  const productData = [
    {
      title: 'ATELIER 01 - Heavyweight Relaxed Tee',
      slug: 'atelier-01-heavyweight-relaxed-tee',
      categorySlug: 'shirts',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Constructed from high-density 260 GSM combed cotton jersey. Cut with dropped shoulders and a disciplined ribbed crewneck engineered to hold structure through rigorous laundering.',
      fabricSpecification: '100% Combed Cotton, 260 GSM',
      collectionName: 'Permanent Core',
      basePricePaise: 149000, // ₹1,490
      hsnCode: '61091000',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC_kNwE4v8ILVOL2_VoYR5BiIrcsE99gsih5E_LVnKP3A4WJP3_mLgNPlbdSHLF0ZpVX0z1tNz7CSS2NhKDZdMmtUgl0ii6GbWeXmVDGklr-Ype0zGlDKPnXE7LI6co259t4oDppmEbnFMX_r8pVfniFobwnNKOydY33k67JphpzDXJoSMiBDEja0s6Bw8-HHtgMa1xGDFVTnUw1-_rcSzCkEOTP5QRjtimi0VV9TH23TrEJBqpQGQCJA',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colorName: 'Off-White',
      colorHex: '#F6F5F0',
    },
    {
      title: 'ATELIER 02 - Pleated Relaxed Trouser',
      slug: 'atelier-02-pleated-relaxed-trouser',
      categorySlug: 'trousers',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Tailored single pleat trouser crafted from a heavyweight blend of Belgian linen and combed cotton twill. Features horn button closure, deep slant side pockets, and an unhemmed clean cuff line.',
      fabricSpecification: '100% Belgian Linen & Cotton Twill, 310 GSM',
      collectionName: 'Seasonal Drop',
      basePricePaise: 385000, // ₹3,850
      hsnCode: '62034200',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAmKad7T3-Oy6zkd_vyaE1sLTpMfgTrE9Lhx8y52maRE5PHcLhxFIHot-2BH9XYZEa8PmXPspkcspYMo-YgKQtSfmNkn5bJlzyJPNY728cK07btJa9yPA6AbN2UyA1JvKDOYbY_0tVRNw6nlTMGrFIR7woq9sSCesn6Jqpoh6L7VzRqs24vFwaphhR_BtrVeAXDxpyu27gkVKJEw8l4wHOVlQCD3gJVAEnr2B1qS5d08lhNJF4TEqHpVQ',
      sizes: ['S', 'M', 'L', 'XL'],
      colorName: 'Deep Navy',
      colorHex: '#17253B',
    },
    {
      title: 'ATELIER 03 - Utility Canvas Overshirt',
      slug: 'atelier-03-utility-canvas-overshirt',
      categorySlug: 'overshirts',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Structured overshirt cut from 340 GSM organic bull denim. Double chest bellows pockets with reinforced box stitch details and custom matte black metal hardware.',
      fabricSpecification: '100% Organic Bull Denim, 340 GSM',
      collectionName: 'Permanent Core',
      basePricePaise: 420000, // ₹4,200
      hsnCode: '62052000',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCLeo2sc3fzBzJcROc1CLpNu-YnqAIT_q_W6fn7DJac6mP4hTpgYF3KmPyDvl0UDeVn_v84QmyYiYFzHrT2HaAsbmZH_fN9DwNzXONloURlyjfBKsPc9GMx2vN_z6gafkJ5uuUpJ4NzqxPDe8Q-4xJZKVJ8Vh4gHdR69ytntSJQhT5iPAaKMdSW_Qbg66avX-Mn5MyK3eSeiecPLZw1akdakQRpEoTW6rNMXezG6HhsAXMEs9N13CsjtQ',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colorName: 'Olive',
      colorHex: '#4F583D',
    },
    {
      title: 'ATELIER 04 - Fine Ribbed Merino Knit',
      slug: 'atelier-04-fine-ribbed-merino-knit',
      categorySlug: 'knitwear',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Chunky 7-gauge crewneck knit spun from 100% extrafine Australian merino wool. Distinct raglan shoulder construction provides fluid range of movement while maintaining crisp silhouettes.',
      fabricSpecification: '100% Extrafine Australian Wool, 7 Gauge',
      collectionName: 'Seasonal Drop',
      basePricePaise: 549000, // ₹5,490
      hsnCode: '61101100',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAT_Y_YJGbAkwM08XqMdSNGZ0AyvXr8Sfvq3vKTd0hUxlSdmR_f2DbgEpYaOic4sfMIHxYKAJzZ8vPdUXAX8CVLFO1pysQtjpYzLwSHCUzNUAle3qipqflajLkC3Z1J-Bf9nArsDLT72VnKqHAx6HmHIXYVyKctrZXzURuzGqe-YrAoCbxVYOtdR-izwbwD7rYNnQ0-5OCHy_4c306dQR8HJNoNpq8r0ZShaCR3nDNpWhXdInC1nvbQog',
      sizes: ['S', 'M', 'L'],
      colorName: 'Raw Umber',
      colorHex: '#694D3B',
    },
    {
      title: 'ATELIER 05 - Field Canvas Carryall Bag',
      slug: 'atelier-05-field-canvas-carryall-bag',
      categorySlug: 'bags',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Minimalist tote bag cut from water resistant 18oz waxed duck canvas. Reinforced with hand-stitched English bridle leather handles and solid copper saddle rivets.',
      fabricSpecification: '18oz Waxed Duck Canvas & Bridle Leather',
      collectionName: 'Archive Release',
      basePricePaise: 329000, // ₹3,290
      hsnCode: '42029200',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDJB1X3qfwd80L31p9O-IkgIKUCxSNouDJ2DU_asv0FOyReCzi2TNqYZ8wwbKHnqEnKwYMigzmMqTR9YK-iFkpHyQSOx6Y4qOHI0JiRMae34wfAcaU5kCkCIcgY3f7qmouf7C5FK5LeayQ0gmzNWjdLxI2P5A8tdjTa8qGmz-ObSOfP4DmhsWyolwVqxXBDiDCd5u8BCoxReTTh_YbPP0nLBcNGmeVgTgAhzMwF64_G3VkbAzh31QD2qA',
      sizes: ['ONE_SIZE'],
      colorName: 'Oxblood',
      colorHex: '#5A1827',
    },
    {
      title: 'ATELIER 06 - Saddle Leather Work Belt',
      slug: 'atelier-06-saddle-leather-work-belt',
      categorySlug: 'belts',
      shortDescription: 'Garment flat lay on raw linen, 4:5 aspect ratio',
      description:
        'Hand-cut from 4mm full-grain steerhide vegetable tanned in Tamil Nadu. Fitted with a custom squared buckle cast in solid brushed brass.',
      fabricSpecification: 'Full-Grain Vegetable Tanned Steerhide, 4mm',
      collectionName: 'Permanent Core',
      basePricePaise: 219000, // ₹2,190
      hsnCode: '42033000',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCwyb9YekmBchNg0tE84IdCsmEpQEcPhKHJURT5Pn0FURDTE82rGVHWm7YI06wt8ggC0KIdsHPb67r0fnqEGhzN7DG0dRFddtGlKJks3a3w5qAWzr7p1pHwa0Po46Vd-JnL19Tuq1B_J9qh2YRII236Pv6wCCtSBBKyVCIQVOAh6T6Va9nAPHT1pbRWUTFUgDOQbTQYXrEHyJG7bFGryigovFjeQkdm4e37llO5oiSpN0ZNQH3ALsrDhw',
      sizes: ['30', '32', '34', '36'],
      colorName: 'Black',
      colorHex: '#141413',
    },
  ];

  for (const p of productData) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) continue;

    const [insertedProduct] = await db
      .insert(schema.products)
      .values({
        categoryId,
        title: p.title,
        slug: p.slug,
        shortDescription: p.shortDescription,
        description: p.description,
        fabricSpecification: p.fabricSpecification,
        collectionName: p.collectionName,
        status: 'published',
        basePricePaise: p.basePricePaise,
        hsnCode: p.hsnCode,
        gstRatePercent: 12,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          title: p.title,
          description: p.description,
          fabricSpecification: p.fabricSpecification,
          basePricePaise: p.basePricePaise,
        },
      })
      .returning({ id: schema.products.id });

    if (!insertedProduct) continue;

    // Seed primary 4:5 image
    await db.insert(schema.productImages).values({
      productId: insertedProduct.id,
      url: p.imageUrl,
      altText: p.shortDescription,
      isPrimary: true,
      sortOrder: 0,
    });

    // Seed variants and inventory
    for (const size of p.sizes) {
      const sku = `${p.slug.toUpperCase().slice(0, 8)}-${size}-${p.colorName.toUpperCase().replace(/\s+/g, '')}`;
      const [insertedVariant] = await db
        .insert(schema.productVariants)
        .values({
          productId: insertedProduct.id,
          sku,
          size,
          colorName: p.colorName,
          colorHex: p.colorHex,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: schema.productVariants.sku,
          set: { size, colorName: p.colorName },
        })
        .returning({ id: schema.productVariants.id });

      if (insertedVariant) {
        await db
          .insert(schema.inventory)
          .values({
            variantId: insertedVariant.id,
            quantityAvailable: 25,
            quantityReserved: 0,
            lowStockThreshold: 5,
          })
          .onConflictDoUpdate({
            target: schema.inventory.variantId,
            set: { quantityAvailable: 25 },
          });
      }
    }
  }

  console.log('Seeding development admin user...');
  const ADMIN_PASSWORD_HASH =
    '$argon2id$v=19$m=65536,t=3,p=4$5QMb+2/X7dHwjTFkevLtvA$HjP7jxYVe4CENW8LiDSjtZgv0St9vo+vpYKYzHxYcpk'; // AtelierAdmin2026!

  await db
    .insert(schema.users)
    .values({
      email: 'admin@atelier.in',
      passwordHash: ADMIN_PASSWORD_HASH,
      firstName: 'Atelier',
      lastName: 'Superadmin',
      role: 'admin_super',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        passwordHash: ADMIN_PASSWORD_HASH,
        role: 'admin_super',
        isActive: true,
      },
    });

  console.log('Seeding promotional courtesy coupons...');
  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const initialCoupons = [
    {
      code: 'ATELIER10',
      discountType: 'percentage' as const,
      discountValue: 10,
      minOrderValuePaise: 199900, // ₹1,999
      maxDiscountPaise: 500000,   // ₹5,000 max
      usageLimitTotal: 1000,
      usageLimitPerUser: 5,
      validFrom: now,
      validUntil: nextYear,
      isActive: true,
    },
    {
      code: 'FIRSTCOMMISSION',
      discountType: 'flat_paise' as const,
      discountValue: 50000,       // ₹500
      minOrderValuePaise: 250000, // ₹2,500
      maxDiscountPaise: null,
      usageLimitTotal: 500,
      usageLimitPerUser: 1,
      validFrom: now,
      validUntil: nextYear,
      isActive: true,
    },
    {
      code: 'SERIES04',
      discountType: 'percentage' as const,
      discountValue: 15,
      minOrderValuePaise: 399900, // ₹3,999
      maxDiscountPaise: 750000,   // ₹7,500 max
      usageLimitTotal: 250,
      usageLimitPerUser: 2,
      validFrom: now,
      validUntil: nextYear,
      isActive: true,
    },
  ];

  for (const cp of initialCoupons) {
    await db
      .insert(schema.coupons)
      .values(cp)
      .onConflictDoUpdate({
        target: schema.coupons.code,
        set: {
          discountType: cp.discountType,
          discountValue: cp.discountValue,
          minOrderValuePaise: cp.minOrderValuePaise,
          isActive: true,
        },
      });
  }

  console.log('Seeding initial newsletter subscribers...');
  const sampleSubscribers = [
    'patron.atelier@example.com',
    'archive.curator@example.com',
  ];

  for (const email of sampleSubscribers) {
    await db
      .insert(schema.newsletterSubscribers)
      .values({ email, isActive: true })
      .onConflictDoNothing();
  }

  console.log('Development seeding completed successfully.');
  await sql.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
