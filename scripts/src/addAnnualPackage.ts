import { getUncachableRevenueCatClient } from "./revenueCatClient.js";

import {
  listProjects,
  listApps,
  listProducts,
  createProduct,
  listEntitlements,
  attachProductsToEntitlement,
  listOfferings,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Kurspal";

const ANNUAL_PRODUCT_IDENTIFIER = "kurspal_premium_annual";
const ANNUAL_PLAY_STORE_IDENTIFIER = "kurspal_premium_annual:annual";
const ANNUAL_PRODUCT_DISPLAY_NAME = "Kurspal Premium Annual";
const ANNUAL_PRODUCT_USER_FACING_TITLE = "Kurspal Premium Annual";
const ANNUAL_PRODUCT_DURATION = "P1Y";

const ANNUAL_PACKAGE_IDENTIFIER = "$rc_annual";
const ANNUAL_PACKAGE_DISPLAY_NAME = "Annual";

const ANNUAL_PRICES = [
  { amount_micros: 39990000, currency: "USD" }, // $39.99/year
  { amount_micros: 35990000, currency: "EUR" }, // €35.99/year
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function addAnnualPackage() {
  const client = await getUncachableRevenueCatClient();

  // --- Find project ---
  const { data: projects, error: listProjectsError } = await listProjects({ client, query: { limit: 20 } });
  if (listProjectsError) throw new Error("Failed to list projects");

  const project = projects.items?.find((p) => p.name === PROJECT_NAME);
  if (!project) throw new Error(`Project "${PROJECT_NAME}" not found — run seedRevenueCat first`);
  console.log("Found project:", project.id);

  // --- Find apps ---
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps?.items?.length) throw new Error("Failed to list apps");

  const testStoreApp = apps.items.find((a) => a.type === "test_store");
  const appStoreApp = apps.items.find((a) => a.type === "app_store");
  const playStoreApp = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  if (!appStoreApp) throw new Error("No App Store app found");
  if (!playStoreApp) throw new Error("No Play Store app found");
  console.log("Found apps:", { testStoreApp: testStoreApp.id, appStoreApp: appStoreApp.id, playStoreApp: playStoreApp.id });

  // --- Fetch existing products ---
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    storeIdentifier: string,
    isTestStore: boolean
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === storeIdentifier && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} annual product already exists:`, existing.id);
      return existing;
    }

    const body: CreateProductData["body"] = {
      store_identifier: storeIdentifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: ANNUAL_PRODUCT_DISPLAY_NAME,
    };
    if (isTestStore) {
      body.subscription = { duration: ANNUAL_PRODUCT_DURATION };
      body.title = ANNUAL_PRODUCT_USER_FACING_TITLE;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} annual product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} annual product:`, created.id);
    return created;
  };

  const testAnnual = await ensureProduct(testStoreApp, "Test Store", ANNUAL_PRODUCT_IDENTIFIER, true);
  const appStoreAnnual = await ensureProduct(appStoreApp, "App Store", ANNUAL_PRODUCT_IDENTIFIER, false);
  const playStoreAnnual = await ensureProduct(playStoreApp, "Play Store", ANNUAL_PLAY_STORE_IDENTIFIER, false);

  // --- Add test store prices ---
  console.log("Adding test store prices for annual product...");
  const { error: priceError } = await client.post<TestStorePricesResponse>({
    url: "/projects/{project_id}/products/{product_id}/test_store_prices",
    path: { project_id: project.id, product_id: testAnnual.id },
    body: { prices: ANNUAL_PRICES },
  });
  if (priceError) {
    if (typeof priceError === "object" && "type" in priceError && priceError["type"] === "resource_already_exists") {
      console.log("Annual test store prices already exist");
    } else {
      throw new Error("Failed to add annual test store prices: " + JSON.stringify(priceError));
    }
  } else {
    console.log("Added annual test store prices");
  }

  // --- Attach to entitlement ---
  const { data: entitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const premiumEntitlement = entitlements.items?.find((e) => e.lookup_key === "premium");
  if (!premiumEntitlement) throw new Error("Premium entitlement not found");

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: premiumEntitlement.id },
    body: { product_ids: [testAnnual.id, appStoreAnnual.id, playStoreAnnual.id] },
  });
  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Annual products already attached to entitlement");
    } else {
      throw new Error("Failed to attach annual products to entitlement: " + JSON.stringify(attachEntitlementError));
    }
  } else {
    console.log("Attached annual products to premium entitlement");
  }

  // --- Find default offering ---
  const { data: offerings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const defaultOffering = offerings.items?.find((o) => o.lookup_key === "default");
  if (!defaultOffering) throw new Error("Default offering not found");
  console.log("Found offering:", defaultOffering.id);

  // --- Ensure annual package ---
  const { data: pkgs, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: defaultOffering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  let annualPkg = pkgs.items?.find((p) => p.lookup_key === ANNUAL_PACKAGE_IDENTIFIER);
  if (annualPkg) {
    console.log("Annual package already exists:", annualPkg.id);
  } else {
    const { data: newPkg, error } = await createPackages({
      client,
      path: { project_id: project.id, offering_id: defaultOffering.id },
      body: { lookup_key: ANNUAL_PACKAGE_IDENTIFIER, display_name: ANNUAL_PACKAGE_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create annual package: " + JSON.stringify(error));
    annualPkg = newPkg;
    console.log("Created annual package:", annualPkg.id);
  }

  // --- Attach products to annual package ---
  const { error: attachPkgError } = await attachProductsToPackage({
    client,
    path: { project_id: project.id, package_id: annualPkg.id },
    body: {
      products: [
        { product_id: testAnnual.id, eligibility_criteria: "all" },
        { product_id: appStoreAnnual.id, eligibility_criteria: "all" },
        { product_id: playStoreAnnual.id, eligibility_criteria: "all" },
      ],
    },
  });
  if (attachPkgError) {
    if (
      attachPkgError.type === "unprocessable_entity_error" &&
      attachPkgError.message?.includes("Cannot attach product")
    ) {
      console.log("Annual package already has products attached");
    } else {
      throw new Error("Failed to attach products to annual package: " + JSON.stringify(attachPkgError));
    }
  } else {
    console.log("Attached products to annual package");
  }

  console.log("\n====================");
  console.log("Annual package setup complete!");
  console.log("Offering:", defaultOffering.id);
  console.log("Annual package:", annualPkg.id, "(" + ANNUAL_PACKAGE_IDENTIFIER + ")");
  console.log("Test Store annual product:", testAnnual.id);
  console.log("App Store annual product:", appStoreAnnual.id);
  console.log("Play Store annual product:", playStoreAnnual.id);
  console.log("====================");
}

addAnnualPackage().catch(console.error);
