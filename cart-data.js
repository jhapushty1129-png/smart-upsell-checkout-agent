/**
 * Cart Data Module
 * Manages the current shopping cart state, initial products, and candidate upsell products.
 */

// Initial state constants
const INITIAL_CART_ITEMS = [
  { id: 'prod_1', name: 'Wireless Mechanical Keyboard', price: 2500, category: 'Electronics' },
  { id: 'prod_2', name: 'Ergonomic Optical Mouse', price: 1000, category: 'Electronics' },
];

const CANDIDATE_UPSELL_PRODUCT = {
  id: 'upsell_1',
  name: 'Memory Foam Wrist Rest Pad',
  price: 450, // ₹450 (12.8% of ₹3500 cart total -> under 20% bounds)
  category: 'Accessories',
  description: 'Ergonomic wrist rest designed to complement mechanical keyboards and optical mice for maximum comfort.',
};

// Alternative upsell for testing higher price threshold (> 20%)
const HIGH_VALUE_UPSELL_PRODUCT = {
  id: 'upsell_2',
  name: 'Ergonomic Dual-Monitor Arm Stand',
  price: 1200, // ₹1200 (34.2% of ₹3500 cart total -> exceeds 20% bounds, requires approval)
  category: 'Furniture & Accessories',
  description: 'Heavy duty gas-spring monitor arm for dual screen setup.',
};

// Current state
let cartItems = [...INITIAL_CART_ITEMS];

/**
 * Calculates the total cost of items in the cart.
 * @param {Array} items 
 * @returns {number}
 */
function calculateCartTotal(items = cartItems) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

/**
 * Returns the current cart items, calculated total, and potential upsell.
 */
function getCartState() {
  return {
    items: [...cartItems],
    subtotal: calculateCartTotal(cartItems),
    candidateUpsell: CANDIDATE_UPSELL_PRODUCT,
    alternativeUpsell: HIGH_VALUE_UPSELL_PRODUCT,
  };
}

/**
 * Adds an accepted item to the cart.
 * @param {object} item 
 */
function addItemToCart(item) {
  cartItems.push(item);
  return getCartState();
}

/**
 * Resets the cart to initial 2 items.
 */
function resetCart() {
  cartItems = INITIAL_CART_ITEMS.map(item => ({ ...item }));
  return getCartState();
}

module.exports = {
  INITIAL_CART_ITEMS,
  CANDIDATE_UPSELL_PRODUCT,
  HIGH_VALUE_UPSELL_PRODUCT,
  calculateCartTotal,
  getCartState,
  addItemToCart,
  resetCart,
};
