import { getProducts } from '../lib/api';
import { ProductGridClient } from '../components/ProductGridClient';
import { FilterSidebar } from '../components/FilterSidebar';
import { EditorialHeroHeader } from '../components/EditorialHeroHeader';
import { ArchivalTicker } from '../components/ArchivalTicker';

interface HomePageProps {
  searchParams: Promise<{
    category?: string;
    collection?: string;
    size?: string;
    color?: string;
    sort?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const requestedPage = params.page ? parseInt(params.page, 10) : 1;
  // If a legacy URL with page > 1 is requested, fetch cumulative products starting from page 1
  // so items from previous pages are never missing from the user's feed.
  const fetchLimit = requestedPage > 1 ? Math.min(60, requestedPage * 12) : 12;

  const catalog = await getProducts({
    category: params.category,
    collection: params.collection,
    size: params.size,
    color: params.color,
    sort: params.sort,
    search: params.search,
    page: 1,
    limit: fetchLimit,
  });

  const { products, facets, pagination } = catalog;
  const activeFiltersCount = [params.category, params.collection, params.size, params.color].filter(Boolean).length;

  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: params.collection || params.category || 'Atelier Permanent Collection',
    numberOfItems: pagination.total,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.title,
        description: product.fabricSpecification,
        image: product.primaryImage?.url,
        url: `https://atelier.com/products/${product.slug}`,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: (product.basePricePaise / 100).toFixed(2),
          availability: product.isSoldOut
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
        },
      },
    })),
  };

  return (
    <div className="w-full flex flex-col">
      {/* High-Performance JSON-LD SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdItemList) }}
      />

      {/* GSAP Animated Editorial Breadcrumb, Volume Strip & Title Controls */}
      <EditorialHeroHeader
        params={params}
        totalCount={pagination.total}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Infinite Ambient Archival Provenance Ticker */}
      <ArchivalTicker />


      {/* Main Catalog Body: Responsive Sidebar + Grid */}
      <section className="w-full bg-[#FAF9F6] px-4 sm:px-6 md:px-12 py-6 sm:py-10">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Filter Sidebar (Desktop sidebar + Mobile drawer trigger) */}
          <div className="lg:col-span-3">
            <FilterSidebar facets={facets} totalCount={pagination.total} />
          </div>

          {/* Product Grid with Lazy / Infinite Scroll */}
          <div className="lg:col-span-9">
            <ProductGridClient
              initialProducts={products}
              totalCount={pagination.total}
              initialPage={requestedPage}
              limit={12}
              filterParams={{
                category: params.category,
                collection: params.collection,
                size: params.size,
                color: params.color,
                sort: params.sort,
                search: params.search,
              }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
