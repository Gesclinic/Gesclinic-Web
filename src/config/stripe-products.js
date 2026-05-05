/**
 * Stripe Products & Prices Configuration
 * Generated: January 12, 2026
 * All prices in BRL (Brazilian Real)
 */

export const STRIPE_PRODUCTS = {
  basic: {
    name: 'Plano Básico',
    productId: 'prod_TmWgbE3Y7gn42C',
    description: 'Agenda Essencial — Para clínicas que estão começando',
    prices: {
      monthly: {
        id: 'price_1SoxdGLH381hB5ddad7o2vYa',
        amount: 9900, // R$ 99.00
        currency: 'brl',
        interval: 'month',
      },
      annual: {
        id: 'price_1Soxe1LH381hB5ddjFcjfm9H',
        amount: 99000, // R$ 990.00
        currency: 'brl',
        interval: 'year',
      },
    },
    features: {
      maxUsers: 2,
      maxDoctors: 2,
      hasFinancial: false,
      hasStock: false,
      hasReports: false,
      hasMultiUnit: false,
    },
  },

  professional: {
    name: 'Plano Profissional',
    productId: 'prod_TmWiy9Zc89RXN9',
    description: 'Gestão Completa — Para clínicas que querem controle e lucro',
    prices: {
      monthly: {
        id: 'price_1SoxgCLH381hB5ddvwskr7Mx',
        amount: 24900, // R$ 249.00
        currency: 'brl',
        interval: 'month',
      },
      annual: {
        id: 'price_1SoxgkLH381hB5ddWPfsR6ry',
        amount: 249000, // R$ 2.490.00
        currency: 'brl',
        interval: 'year',
      },
    },
    features: {
      maxUsers: 10,
      maxDoctors: 5,
      hasFinancial: true,
      hasStock: true,
      hasReports: true,
      hasMultiUnit: false,
    },
  },

  enterprise: {
    name: 'Plano Enterprise',
    productId: 'prod_TmWl9t75hHosdr',
    description: 'Escalas & Performance — para redes, grupos e operações complexas',
    prices: {
      monthly: {
        id: 'price_1Soxi2LH381hB5ddZUDZ2yXR',
        amount: 48900, // R$ 489.00
        currency: 'brl',
        interval: 'month',
      },
      annual: {
        id: 'price_1SoxiLLH381hB5ddLPG3yIt6',
        amount: 489000, // R$ 4.890.00
        currency: 'brl',
        interval: 'year',
      },
    },
    features: {
      maxUsers: 999,
      maxDoctors: 999,
      hasFinancial: true,
      hasStock: true,
      hasReports: true,
      hasMultiUnit: true,
    },
  },
};

/**
 * Helper function to get price for a plan and billing cycle
 * @param {string} planSlug - 'basic', 'professional', or 'enterprise'
 * @param {string} billingCycle - 'monthly' or 'annual'
 * @returns {object} Price object with id and amount
 */
export const getPriceId = (planSlug, billingCycle = 'monthly') => {
  const plan = STRIPE_PRODUCTS[planSlug];
  if (!plan) {
    throw new Error(`Plan not found: ${planSlug}`);
  }

  const price = plan.prices[billingCycle];
  if (!price) {
    throw new Error(`Billing cycle not found: ${billingCycle}`);
  }

  return price.id;
};

/**
 * Get all prices for a specific plan
 * @param {string} planSlug - 'basic', 'professional', or 'enterprise'
 * @returns {object} Prices object { monthly, annual }
 */
export const getPrices = (planSlug) => {
  const plan = STRIPE_PRODUCTS[planSlug];
  if (!plan) {
    throw new Error(`Plan not found: ${planSlug}`);
  }
  return plan.prices;
};

/**
 * Get product ID for a plan
 * @param {string} planSlug - 'basic', 'professional', or 'enterprise'
 * @returns {string} Stripe product ID
 */
export const getProductId = (planSlug) => {
  const plan = STRIPE_PRODUCTS[planSlug];
  if (!plan) {
    throw new Error(`Plan not found: ${planSlug}`);
  }
  return plan.productId;
};
