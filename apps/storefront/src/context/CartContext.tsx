'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string; // unique item key (variantId)
  productId: string;
  variantId: string;
  title: string;
  slug: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  pricePaise: number;
  quantity: number;
  imageUrl: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotalPaise: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  targetCouponCode: string | null;
  setTargetCouponCode: (code: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [targetCouponCode, setTargetCouponCode] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('atelier_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('atelier_cart', JSON.stringify(items));
      } catch {
        // ignore
      }
    }
  }, [items, isLoaded]);

  const addToCart = (newItem: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.variantId === newItem.variantId);
      if (existing) {
        return prev.map((it) =>
          it.variantId === newItem.variantId
            ? { ...it, quantity: it.quantity + newItem.quantity }
            : it
        );
      }
      return [...prev, { ...newItem, id: newItem.variantId }];
    });
    setIsCartDrawerOpen(true);
  };

  const removeFromCart = (variantId: string) => {
    setItems((prev) => prev.filter((it) => it.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.variantId === variantId ? { ...it, quantity } : it))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotalPaise = items.reduce((sum, it) => sum + it.pricePaise * it.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        subtotalPaise,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        targetCouponCode,
        setTargetCouponCode,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
