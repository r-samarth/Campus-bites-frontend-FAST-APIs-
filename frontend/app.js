const state = {
  restaurants: [],
  cuisines: [],
  selectedRestaurant: null,
  menu: [],
  cart: {},
  orders: [],
  openOrderId: null,
};

const API_BASE_URL = (window.CAMPUS_BITES_API_URL || '').replace(/\/$/, '');
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value).replace(/[&<>\'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'Something went wrong. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

function showNotice(message, isError = false) {
  const notice = $('#notice');
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.classList.remove('hidden');
  window.clearTimeout(showNotice.timer);
  showNotice.timer = window.setTimeout(() => notice.classList.add('hidden'), 4000);
}

async function loadRestaurants() {
  const search = $('#restaurantSearch').value.trim();
  const cuisine = $('#cuisineFilter').value;
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (cuisine) params.set('cuisine', cuisine);
  try {
    if (!state.cuisines.length) {
      const allRestaurants = await api('/restaurants');
      state.cuisines = [...new Set(allRestaurants.map((restaurant) => restaurant.cuisine))].sort();
    }
    state.restaurants = await api(`/restaurants?${params}`);
    renderRestaurants();
  } catch (error) {
    $('#restaurantList').innerHTML = `<div class="empty-box">${escapeHtml(error.message)}</div>`;
  }
}

function renderCuisineOptions() {
  const current = $('#cuisineFilter').value;
  const cuisines = state.cuisines;
  $('#cuisineFilter').innerHTML = '<option value="">All cuisines</option>' + cuisines.map((cuisine) => `<option value="${escapeHtml(cuisine)}">${escapeHtml(cuisine)}</option>`).join('');
  $('#cuisineFilter').value = cuisines.includes(current) ? current : '';
}

function renderRestaurants() {
  renderCuisineOptions();
  const list = $('#restaurantList');
  if (!state.restaurants.length) {
    list.innerHTML = '<div class="empty-box">No restaurants found. Try a different search.</div>';
    return;
  }
  list.innerHTML = state.restaurants.map((restaurant) => `
    <article class="restaurant-card">
      <img class="restaurant-photo" src="${escapeHtml(restaurant.image_url)}" alt="Food from ${escapeHtml(restaurant.name)}" loading="lazy" />
      <div class="restaurant-card-body">
        <div class="restaurant-card-top"><h3>${escapeHtml(restaurant.name)}</h3><span class="rating">★ ${restaurant.rating.toFixed(1)}</span></div>
        <p class="cuisine">${escapeHtml(restaurant.cuisine)} · ${escapeHtml(restaurant.area)}</p>
        <div class="restaurant-meta"><span>${restaurant.delivery_minutes} min</span><span>${restaurant.delivery_fee ? `${currency.format(restaurant.delivery_fee)} delivery` : 'Free delivery'}</span></div>
        <button class="view-menu" type="button" data-restaurant-id="${restaurant.id}">See menu →</button>
      </div>
    </article>`).join('');
}

async function openRestaurant(restaurantId) {
  try {
    const [restaurant, menu] = await Promise.all([
      api(`/restaurants/${restaurantId}`),
      api(`/restaurants/${restaurantId}/menu`),
    ]);
    if (state.selectedRestaurant && state.selectedRestaurant.id !== restaurant.id && Object.keys(state.cart).length) {
      showNotice('Your cart is from another restaurant. Empty it before choosing this one.', true);
      return;
    }
    state.selectedRestaurant = restaurant;
    state.menu = menu;
    renderMenu();
  } catch (error) {
    showNotice(error.message, true);
  }
}

function renderMenu() {
  const restaurant = state.selectedRestaurant;
  $('#browseTitle').textContent = restaurant.name;
  $('#restaurantName').textContent = restaurant.name;
  $('#restaurantCuisine').textContent = `${restaurant.cuisine} · ${restaurant.area}`;
  $('#restaurantDescription').textContent = restaurant.description;
  $('#restaurantDelivery').textContent = `${restaurant.delivery_minutes} min · ${restaurant.delivery_fee ? currency.format(restaurant.delivery_fee) + ' delivery' : 'Free delivery'}`;
  $('#restaurantList').classList.add('hidden');
  $('#restaurantTools').classList.add('hidden');
  $('#menuSection').classList.remove('hidden');
  $('#backToRestaurants').classList.remove('hidden');
  $('#menuList').innerHTML = state.menu.map((item) => `
    <article class="menu-item">
      <div><span class="menu-category">${escapeHtml(item.category)}</span><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(item.description)}</p></div>
      <div class="menu-item-actions"><span class="menu-price">${currency.format(item.price)}</span><button class="add-button" type="button" data-add-item="${item.id}">Add +</button></div>
    </article>`).join('') || '<div class="empty-box">This menu is empty right now.</div>';
  $('#menuSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showRestaurants() {
  state.menu = [];
  $('#browseTitle').textContent = 'Restaurants';
  $('#restaurantList').classList.remove('hidden');
  $('#restaurantTools').classList.remove('hidden');
  $('#menuSection').classList.add('hidden');
  $('#backToRestaurants').classList.add('hidden');
}

function renderCart() {
  const entries = Object.values(state.cart);
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = entries.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0);
  const deliveryFee = entries.length ? state.selectedRestaurant?.delivery_fee || 0 : 0;
  $('#cartCount').textContent = count;
  $('#cartSubtotal').textContent = currency.format(subtotal);
  $('#cartDeliveryFee').textContent = deliveryFee ? currency.format(deliveryFee) : 'Free';
  $('#cartTotal').textContent = currency.format(subtotal + deliveryFee);
  $('#placeOrderButton').disabled = count === 0;
  if (!entries.length) {
    $('#cartItems').innerHTML = '<p class="muted-note">Your cart is empty. Pick something tasty.</p>';
    return;
  }
  $('#cartItems').innerHTML = entries.map(({ item, quantity }) => `
    <div class="cart-line">
      <div><div class="cart-line-name">${escapeHtml(item.name)}</div><div class="cart-line-price">${currency.format(item.price * quantity)}</div></div>
      <div class="quantity-controls"><button type="button" data-cart-action="minus" data-item-id="${item.id}" aria-label="Remove one ${escapeHtml(item.name)}">−</button><span>${quantity}</span><button type="button" data-cart-action="plus" data-item-id="${item.id}" aria-label="Add one ${escapeHtml(item.name)}">+</button></div>
    </div>`).join('');
}

function addToCart(itemId, delta = 1) {
  const item = state.menu.find((menuItem) => menuItem.id === itemId);
  if (!item) return;
  const current = state.cart[itemId]?.quantity || 0;
  const quantity = current + delta;
  if (quantity <= 0) delete state.cart[itemId];
  else state.cart[itemId] = { item, quantity };
  renderCart();
}

function switchView(viewName) {
  const isOrders = viewName === 'orders';
  $('#browseView').classList.toggle('hidden', isOrders);
  $('#intro').classList.toggle('hidden', isOrders);
  $('#ordersView').classList.toggle('hidden', !isOrders);
  document.querySelectorAll('.nav-button').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
  if (isOrders) loadOrders();
}

async function loadOrders() {
  try {
    state.orders = await api('/orders');
    $('#orderCount').textContent = state.orders.length;
    renderOrders();
  } catch (error) {
    $('#ordersList').innerHTML = `<div class="empty-box">${escapeHtml(error.message)}</div>`;
  }
}

function renderOrders() {
  if (!state.orders.length) {
    $('#ordersList').innerHTML = '<div class="empty-box">No orders yet. Find something good to eat first.</div>';
    return;
  }
  $('#ordersList').innerHTML = state.orders.map((order) => `
    <article class="order-card">
      <div class="order-card-heading">
        <div><div class="order-number">${escapeHtml(order.order_number)}</div><div class="order-restaurant">${escapeHtml(order.restaurant.name)} · ${new Date(order.created_at).toLocaleString()}</div></div>
        <span class="order-status ${order.status === 'Cancelled' ? 'cancelled' : ''}">${escapeHtml(order.status)}</span>
      </div>
      <div class="order-summary"><small>${order.items.reduce((sum, item) => sum + item.quantity, 0)} items · ${currency.format(order.total)}</small>
        <div class="order-actions">
          <button class="text-button" type="button" data-order-action="details" data-order-id="${order.id}">${state.openOrderId === order.id ? 'Hide details' : 'View details'}</button>
          ${order.status === 'Pending' ? `<button class="text-button cancel" type="button" data-order-action="cancel" data-order-id="${order.id}">Cancel</button>` : ''}
          ${order.status === 'Pending' ? `<button class="text-button" type="button" data-order-action="advance" data-order-id="${order.id}">Mark preparing</button>` : ''}
          ${order.status === 'Preparing' ? `<button class="text-button" type="button" data-order-action="advance" data-order-id="${order.id}">Send out</button>` : ''}
          ${order.status === 'Out for delivery' ? `<button class="text-button" type="button" data-order-action="advance" data-order-id="${order.id}">Mark received</button>` : ''}
        </div>
      </div>
      ${state.openOrderId === order.id ? `<div class="order-details">${order.items.map((item) => `<div class="order-detail-line"><span>${item.quantity} × ${escapeHtml(item.item_name)}</span><span>${currency.format(item.subtotal)}</span></div>`).join('')}<div class="order-detail-line"><span>Deliver to ${escapeHtml(order.customer_name)}</span><span>${escapeHtml(order.delivery_address)}</span></div></div>` : ''}
    </article>`).join('');
}

async function performOrderAction(action, orderId) {
  try {
    if (action === 'details') {
      state.openOrderId = state.openOrderId === orderId ? null : orderId;
      if (state.openOrderId) {
        const order = await api(`/orders/${orderId}`);
        state.orders = state.orders.map((item) => item.id === orderId ? order : item);
      }
    } else if (action === 'cancel') {
      if (!window.confirm('Cancel this order?')) return;
      await api(`/orders/${orderId}`, { method: 'DELETE' });
      showNotice('Order cancelled.');
    } else if (action === 'advance') {
      const order = state.orders.find((item) => item.id === orderId);
      const nextStatus = { Pending: 'Preparing', Preparing: 'Out for delivery', 'Out for delivery': 'Delivered' }[order.status];
      await api(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      showNotice(nextStatus === 'Delivered' ? 'Enjoy your meal! Order marked as received.' : `Order updated: ${nextStatus}.`);
    }
    if (action !== 'details') await loadOrders();
    else renderOrders();
  } catch (error) {
    showNotice(error.message, true);
  }
}

$('#restaurantList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-restaurant-id]');
  if (button) openRestaurant(Number(button.dataset.restaurantId));
});

$('#menuList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-item]');
  if (button) addToCart(Number(button.dataset.addItem));
});

$('#cartItems').addEventListener('click', (event) => {
  const button = event.target.closest('[data-cart-action]');
  if (!button) return;
  const delta = button.dataset.cartAction === 'plus' ? 1 : -1;
  addToCart(Number(button.dataset.itemId), delta);
});

$('#ordersList').addEventListener('click', (event) => {
  const button = event.target.closest('[data-order-action]');
  if (button) performOrderAction(button.dataset.orderAction, Number(button.dataset.orderId));
});

$('#checkoutForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!Object.keys(state.cart).length) return;
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const payload = {
    customer_name: form.get('customer_name').trim(),
    phone: form.get('phone').trim(),
    delivery_address: form.get('delivery_address').trim(),
    items: Object.values(state.cart).map(({ item, quantity }) => ({ menu_item_id: item.id, quantity })),
  };
  const submitButton = $('#placeOrderButton');
  submitButton.disabled = true;
  try {
    const order = await api('/orders', { method: 'POST', body: JSON.stringify(payload) });
    state.cart = {};
    formElement.reset();
    renderCart();
    showNotice(`Order ${order.order_number} placed. Thanks, ${order.customer_name}!`);
    switchView('orders');
  } catch (error) {
    showNotice(error.message, true);
    submitButton.disabled = false;
  }
});

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
$('#backToRestaurants').addEventListener('click', showRestaurants);
$('#cartJump').addEventListener('click', () => $('#cartPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }));
$('#restaurantSearch').addEventListener('input', () => {
  window.clearTimeout(loadRestaurants.timer);
  loadRestaurants.timer = window.setTimeout(loadRestaurants, 180);
});
$('#cuisineFilter').addEventListener('change', loadRestaurants);

async function startApp() {
  renderCart();
  await loadRestaurants();
  try {
    const orders = await api('/orders');
    $('#orderCount').textContent = orders.length;
  } catch (error) {
    showNotice(error.message, true);
  }
}

startApp();
