import { getCartDetailed } from "@/lib/cart";
import { getCustomer } from "@/lib/auth";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const customer = await getCustomer();
  const cart = await getCartDetailed(customer?.id ?? null);

  return (
    <CartProvider initialCart={cart}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader customerName={customer?.name ?? null} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
      <CartDrawer />
    </CartProvider>
  );
}
