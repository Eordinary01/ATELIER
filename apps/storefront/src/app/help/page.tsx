export default function HelpPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-12 py-10">
      <div className="border-b border-[#E5E3DC] pb-6 mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-[#767872]">
          Concierge Services
        </span>
        <h1 className="font-headline-lg text-3xl font-semibold text-[#1B1C1A] tracking-tight mt-1">
          Client Concierge & Architecture Guide
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-3">
          <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
            Complimentary Alterations
          </h3>
          <p className="text-xs text-[#767872] leading-relaxed">
            All Atelier garments qualify for lifetime alteration consultations at our flagship studio in New Delhi. Trousers can be hemmed or let out by our master patternmakers.
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-3">
          <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
            Nationwide Logistics Policy
          </h3>
          <p className="text-xs text-[#767872] leading-relaxed">
            We provide complimentary express shipping on all commissions exceeding ₹1,999. Deliveries within metro NCR conclude within 24 to 48 hours.
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-3">
          <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
            15-Day Exchange Guarantee
          </h3>
          <p className="text-xs text-[#767872] leading-relaxed">
            Unwashed, unworn garments with original security tags attached can be exchanged for alternate sizing within 15 days of registered delivery.
          </p>
        </div>

        <div className="p-6 bg-white border border-[#E5E3DC] rounded-[4px] space-y-3">
          <h3 className="font-serif-headline text-base font-semibold text-[#1B1C1A]">
            Taxation & Invoicing
          </h3>
          <p className="text-xs text-[#767872] leading-relaxed">
            All listed prices include integrated GST (12% for apparel under standard tariff). Corporate clients may input their GSTIN during checkout for Input Tax Credit.
          </p>
        </div>
      </div>
    </div>
  );
}
