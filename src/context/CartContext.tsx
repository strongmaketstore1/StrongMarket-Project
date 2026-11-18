import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { Product } from "../types/product";
import { auth } from "../firebase";

interface CartItem { product: Product; quantity: number; }
interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
function getCartKey(userId?: string | null) {
  return userId ? `strongmarketstore-cart-${userId}` : "strongmarketstore-cart-guest";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const cartKey = getCartKey(userId);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserId(u ? u.uid : null);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!authReady) return;
    try {
      const savedCart = localStorage.getItem(cartKey);
      setItems(savedCart ? (JSON.parse(savedCart) as CartItem[]) : []);
    } catch { setItems([]); }
    setIsLoaded(true);
  }, [cartKey, authReady]);

  useEffect(() => {
    if (!authReady || !isLoaded) return;
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, cartKey, authReady, isLoaded]);

  const addToCart = (product: Product) => {
    setItems((cur) => {
      const ex = cur.find((i) => i.product.id === product.id);
      if (ex) return cur.map((i) => i.product.id === product.id ? { ...i, product, quantity: i.quantity + 1 } : i);
      return [...cur, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((cur) => cur.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setItems((cur) => cur.map((i) => i.product.id === productId ? { ...i, quantity } : i));
  };

  const clearCart = () => setItems([]);
  const itemCount = items.reduce((t, i) => t + i.quantity, 0);
  const subtotal = items.reduce((t, i) => t + i.product.price * i.quantity, 0);
  const value = useMemo(() => ({ items, itemCount, subtotal, addToCart, removeFromCart, updateQuantity, clearCart }), [items, itemCount, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
