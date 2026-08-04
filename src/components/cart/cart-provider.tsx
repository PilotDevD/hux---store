"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import type { CartDetailed } from "@/lib/cart";
import {
  addItemAction,
  fetchCartAction,
  removeItemAction,
  updateItemAction,
} from "@/app/actions/cart";
import { useToast } from "@/components/ui/toast";

type CartCtx = {
  cart: CartDetailed | null;
  count: number;
  open: boolean;
  pending: boolean;
  setOpen: (v: boolean) => void;
  add: (variantId: string, qty?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  update: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  refresh: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

const EMPTY: CartDetailed = { id: "", token: "", lines: [], count: 0, subtotal: 0 };

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartDetailed;
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartDetailed>(initialCart ?? EMPTY);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    document.body.classList.toggle("no-scroll", open);
    return () => document.body.classList.remove("no-scroll");
  }, [open]);

  const refresh = useCallback(() => {
    startTransition(async () => {
      setCart(await fetchCartAction());
    });
  }, []);

  const add = useCallback<CartCtx["add"]>(
    async (variantId, qty = 1, opts) => {
      const res = await addItemAction(variantId, qty);
      if (res.ok && res.cart) {
        setCart(res.cart);
        if (opts?.openDrawer !== false) setOpen(true);
        return true;
      }
      toast(res.error ?? "Não foi possível adicionar ao carrinho.", "error");
      return false;
    },
    [toast],
  );

  const update = useCallback<CartCtx["update"]>((variantId, qty) => {
    startTransition(async () => {
      setCart(await updateItemAction(variantId, qty));
    });
  }, []);

  const remove = useCallback<CartCtx["remove"]>((variantId) => {
    startTransition(async () => {
      setCart(await removeItemAction(variantId));
    });
  }, []);

  return (
    <Ctx.Provider
      value={{
        cart,
        count: cart?.count ?? 0,
        open,
        pending,
        setOpen,
        add,
        update,
        remove,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
