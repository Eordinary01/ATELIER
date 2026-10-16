import type { Metadata } from 'next';
import { getProductBySlug } from '../../../lib/api';
import { ProductDetailClient } from '../../../components/ProductDetailClient';


interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Garment Not Found | ATELIER',
    };
  }

  return {
    title: `${product.title} | ATELIER`,
    description: `${product.fabricSpecification} - ${product.description.slice(0, 150)}...`,
    openGraph: {
      title: `${product.title} | ATELIER`,
      description: product.fabricSpecification,
      images: product.primaryImage?.url ? [product.primaryImage.url] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return <ProductDetailClient product={product} slug={slug} />;
}

