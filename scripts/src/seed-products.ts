import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();

    console.log("Checking for existing Finals Mode product...");
    const existing = await stripe.products.search({
      query: "name:'Finals Mode' AND active:'true'",
    });

    if (existing.data.length > 0) {
      console.log("Finals Mode already exists — skipping creation.");
      const prod = existing.data[0];
      const prices = await stripe.prices.list({ product: prod.id, active: true });
      console.log(`Product ID: ${prod.id}`);
      prices.data.forEach((p) => {
        console.log(`  Price ID: ${p.id}  amount: $${(p.unit_amount ?? 0) / 100}`);
      });
      return;
    }

    console.log("Creating Finals Mode product...");
    const product = await stripe.products.create({
      name: "Finals Mode",
      description:
        "7-day premium access: unlimited AI explains, quizzes, study guides, multi-page scan, tone controls, and more.",
      metadata: { type: "one_time", duration_days: "7" },
    });
    console.log(`Created product: ${product.name} (${product.id})`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 499,
      currency: "usd",
    });
    console.log(`Created price: $4.99 one-time (${price.id})`);

    console.log("\nDone! Paste these IDs into your app config:");
    console.log(`  PRODUCT_ID=${product.id}`);
    console.log(`  PRICE_ID=${price.id}`);
  } catch (err: any) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

createProducts();
