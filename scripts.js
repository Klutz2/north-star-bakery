'use strict';
// Favorites contain product IDs only. Personal details and allergy notes are not stored.
const products = [
  { id: 'bread', name: 'Artisan bread', category: 'Breads', price: '$5–$12' },
  { id: 'signature', name: 'Signature Loaf', category: 'Breads', price: 'Ask the bakery' },
  { id: 'pastries', name: 'Fresh pastries', category: 'Pastries', price: '$3–$8' },
  { id: 'cakes', name: 'Celebration cake', category: 'Cakes', price: '$25–$75' }
];
const storageKey = 'northStarBakeryFavorites';
let favoriteIds = [];
let storageAvailable = true;

function normalizeFavorites(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => products.some(product => product.id === id)))];
}
function loadFavorites() {
  try { favoriteIds = normalizeFavorites(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
  catch (error) {
    favoriteIds = [];
    // Malformed saved data is recoverable; unavailable storage still allows this visit's selections.
    storageAvailable = !(error instanceof DOMException);
  }
}
function saveFavorites() {
  try { localStorage.setItem(storageKey, JSON.stringify(favoriteIds)); storageAvailable = true; }
  catch (error) { storageAvailable = false; }
}
function selectedProducts() { return products.filter(product => favoriteIds.includes(product.id)); }
function updateFavorites(message) {
  const list = document.querySelector('#saved-favorites');
  if (!list) return;
  list.replaceChildren();
  const chosen = selectedProducts();
  for (const product of chosen) {
    const li = document.createElement('li'); li.textContent = product.name; list.append(li);
  }
  document.querySelector('#favorites-empty').hidden = chosen.length > 0;
  document.querySelector('#favorite-count').textContent = `${chosen.length} saved ${chosen.length === 1 ? 'favorite' : 'favorites'}`;
  for (const button of document.querySelectorAll('[data-favorite]')) {
    const selected = favoriteIds.includes(button.dataset.favorite);
    button.setAttribute('aria-pressed', String(selected));
    button.textContent = selected ? 'Remove favorite' : 'Save favorite';
  }
  document.querySelector('#clear-favorites').disabled = chosen.length === 0;
  document.querySelector('#storage-note').textContent = storageAvailable
    ? 'Favorites are remembered in this browser. Your name, email, and allergy notes are not saved.'
    : 'Browser storage is unavailable. Favorites will work for this visit but may not be remembered.';
  document.querySelector('#favorites-status').textContent = message || (chosen.length ? 'Your saved favorites have been restored.' : '');
}
function toggleFavorite(id) {
  favoriteIds = favoriteIds.includes(id) ? favoriteIds.filter(saved => saved !== id) : [...favoriteIds, id];
  saveFavorites();
  const product = products.find(item => item.id === id);
  updateFavorites(`${product.name} ${favoriteIds.includes(id) ? 'saved to' : 'removed from'} your favorites.`);
}
function buildProductChoices() {
  const container = document.querySelector('#product-choices');
  if (!container) return;
  for (const product of products) {
    const article = document.createElement('article'); article.className = 'favorite-card';
    const heading = document.createElement('h3'); heading.textContent = product.name;
    const detail = document.createElement('p'); detail.textContent = `${product.category} · ${product.price}`;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.favorite = product.id;
    button.setAttribute('aria-label', `Toggle favorite for ${product.name}`);
    button.addEventListener('click', () => toggleFavorite(product.id));
    article.append(heading, detail, button); container.append(article);
  }
}
function prefillItemDetails() {
  const input = document.querySelector('#item-details'); const chosen = selectedProducts();
  if (input && !input.value.trim() && chosen.length) {
    input.value = `I am interested in: ${chosen.map(product => product.name).join(', ')}.\nQuantity and other details: `;
    document.querySelector('#favorites-prefill-note').textContent = 'Your saved favorites were added to Item Details. Please add quantities and any other request details.';
  }
}
function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validateValues(values, today) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = 'Enter your name using at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Enter a valid email address, such as name@example.com.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.pickupDate) || values.pickupDate < today) errors['pickup-date'] = 'Choose a pickup date today or later.';
  if (!['preorder', 'question'].includes(values.requestType)) errors['request-type'] = 'Choose Pre-Order or General Question.';
  if (values.itemDetails.trim().length < 10) errors['item-details'] = 'Enter at least 10 characters describing your items or question.';
  return errors;
}
function formValues(form) {
  return { name: form.elements.name.value, email: form.elements.email.value,
    pickupDate: form.elements['pickup-date'].value, requestType: form.elements['request-type'].value,
    itemDetails: form.elements['item-details'].value };
}
function showErrors(errors) {
  for (const id of ['name', 'email', 'pickup-date', 'request-type', 'item-details']) {
    const message = document.querySelector(`#${id}-error`); message.textContent = errors[id] || '';
    const controls = id === 'request-type' ? document.querySelectorAll('[name="request-type"]') : [document.getElementById(id)];
    for (const control of controls) {
      if (errors[id]) control.setAttribute('aria-invalid', 'true'); else control.removeAttribute('aria-invalid');
    }
  }
}
function setupValidation() {
  const form = document.querySelector('form'); if (!form) return;
  // Native attributes remain in HTML; custom JavaScript feedback takes over only when JS loads.
  form.noValidate = true;
  document.querySelector('#pickup-date').min = todayDate();
  let attempted = false;
  form.addEventListener('submit', event => {
    event.preventDefault(); attempted = true;
    const errors = validateValues(formValues(form), todayDate()); showErrors(errors);
    const status = document.querySelector('#form-status');
    if (Object.keys(errors).length) {
      status.textContent = 'Please correct the fields below. Your entries have been kept.';
      document.querySelector('[aria-invalid="true"]').focus();
    } else {
      status.textContent = 'Your request passes validation. This classroom website does not send orders; contact the bakery to complete your request.';
    }
  });
  form.addEventListener('input', () => {
    document.querySelector('#form-status').textContent = '';
    if (attempted) showErrors(validateValues(formValues(form), todayDate()));
  });
  form.addEventListener('change', () => {
    if (attempted) showErrors(validateValues(formValues(form), todayDate()));
  });
}
function initializeBakery() {
  loadFavorites(); buildProductChoices(); updateFavorites(); prefillItemDetails(); setupValidation();
  document.querySelector('#clear-favorites')?.addEventListener('click', () => {
    favoriteIds = []; saveFavorites(); updateFavorites('Your favorites have been cleared.');
  });
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) { loadFavorites(); updateFavorites(); }
  });
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', initializeBakery);
if (typeof module !== 'undefined') module.exports = { normalizeFavorites, validateValues };
