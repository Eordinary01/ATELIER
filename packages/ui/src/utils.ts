import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats integer paise into standard Indian Rupee notation (₹)
 * Example: 149000 -> ₹1,490
 * Example: 12450000 -> ₹1,24,500
 */
export function formatINR(amountPaise: number): string {
  const rupees = amountPaise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
  }).format(rupees);
}
