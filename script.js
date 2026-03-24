// корзина - инициализация при загрузке
let cart = [];

// ИНИЦИАЛИЗАЦИЯ EMAILJS - ВСТАВЬТЕ СВОИ КЛЮЧИ
(function() {
  emailjs.init("JekTAlhqt_yO20mqu"); // Замените на ваш Public Key
})();

// Функция загрузки корзины из localStorage
function loadCart() {
  const savedCart = localStorage.getItem("stalker_cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  } else {
    cart = [];
  }
  updateCartCount();
  return cart;
}

// Сохранение корзины
function saveCart() {
  localStorage.setItem("stalker_cart", JSON.stringify(cart));
  updateCartCount();
}

// Инициализация при загрузке страницы
loadCart();

function addToCartWithSize(name, price, img, size) {
  const productImg = img || "img/placeholder.jpg";
  cart.push({ 
    name: name,
    price, 
    size: size,
    img: productImg,
    id: Date.now() + Math.random() 
  });
  saveCart();
  showNotification(`✨ ${name} (${size}) добавлен в корзину`);
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCartPage();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCartPage();
  showNotification("🗑️ Корзина очищена");
}

function updateCartCount() {
  const cartLinks = document.querySelectorAll(".menu a[href='cart.html']");
  cartLinks.forEach(link => {
    if (link) {
      link.textContent = "CART (" + cart.length + ")";
    }
  });
  
  const cartSpan = document.getElementById("cart-count");
  if (cartSpan) {
    cartSpan.textContent = cart.length;
  }
}

function showNotification(msg, isError = false) {
  let notif = document.createElement("div");
  notif.innerText = msg;
  notif.style.position = "fixed";
  notif.style.bottom = "20px";
  notif.style.right = "20px";
  notif.style.backgroundColor = isError ? "#8b3a2a" : "#ff6600";
  notif.style.color = "#0a0a0a";
  notif.style.padding = "12px 24px";
  notif.style.borderRadius = "2px";
  notif.style.fontWeight = "bold";
  notif.style.zIndex = "9999";
  notif.style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)";
  notif.style.fontFamily = "'Press Start 2P', monospace";
  notif.style.fontSize = "9px";
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.opacity = "0";
    notif.style.transition = "0.3s";
    setTimeout(() => notif.remove(), 300);
  }, 3000);
}

// ========== РАСЧЕТ СТОИМОСТИ ДОСТАВКИ (ОТ ЧЕЛЯБИНСКА) ==========
function calculateDelivery(city, method) {
  if (!city || !method) return 0;
  
  const cityLower = city.toLowerCase();
  
  let basePrice = 0;
  switch(method) {
    case 'cdek':
      basePrice = 350;
      break;
    case 'yandex':
      basePrice = 300;
      break;
    default:
      return 0;
  }
  
  const nearbyCities = ['екатеринбург', 'ekaterinburg', 'курган', 'kurgan', 'тюмень', 'tyumen', 'уфа', 'ufa', 'магнитогорск', 'magnitogorsk'];
  const farCities = ['москва', 'moscow', 'спб', 'peter', 'санкт-петербург', 'новосибирск', 'novosibirsk', 'казань', 'kazan', 'нижний', 'nizhny', 'самара', 'samara', 'ростов', 'rostov', 'краснодар', 'krasnodar'];
  const veryFarCities = ['владивосток', 'vladivostok', 'хабаровск', 'khabarovsk', 'иркутск', 'irkutsk', 'якутск', 'yakutsk'];
  
  if (cityLower.includes('челябинск') || cityLower.includes('chelyabinsk')) {
    return 0;
  } else if (nearbyCities.some(c => cityLower.includes(c))) {
    return basePrice + 100;
  } else if (farCities.some(c => cityLower.includes(c))) {
    return basePrice + 300;
  } else if (veryFarCities.some(c => cityLower.includes(c))) {
    return basePrice + 600;
  } else {
    return basePrice + 400;
  }
}

// ===== ОТПРАВКА ЗАКАЗА НА EMAIL =====
async function sendOrderEmail(orderData) {
  // Формируем список товаров для письма
  let itemsHtml = '';
  orderData.items.forEach((item, idx) => {
    itemsHtml += `${idx + 1}. ${item.name} - ${item.price}₽ (Размер: ${item.size})\n`;
  });
  
  // Параметры для EmailJS
  const templateParams = {
    order_id: orderData.orderId,
    items_list: itemsHtml,
    subtotal: orderData.subtotal,
    delivery_price: orderData.deliveryPrice,
    total: orderData.total,
    fullname: orderData.fullname,
    phone: orderData.phone,
    email: orderData.email,
    telegram: orderData.telegram || 'Не указан',
    delivery_method: orderData.deliveryMethod,
    address: orderData.address,
    comment: orderData.comment || 'Нет комментария',
    order_date: new Date().toLocaleString('ru-RU')
  };
  
  try {
    // Отправляем письмо продавцу
    const result = await emailjs.send(
      'service_5q8dwu9',      // Замените на ваш Service ID
      'template_75m0rpc',     // Замените на ваш Template ID
      templateParams
    );
    
    console.log('Email отправлен успешно:', result);
    return true;
  } catch (error) {
    console.error('Ошибка отправки email:', error);
    return false;
  }
}

// ===== СОХРАНЕНИЕ ЗАКАЗА В LOCALSTORAGE =====
function saveOrder(orderData) {
  const orders = JSON.parse(localStorage.getItem('stalker_orders') || '[]');
  orders.push({
    ...orderData,
    orderDate: new Date().toLocaleString('ru-RU')
  });
  localStorage.setItem('stalker_orders', JSON.stringify(orders));
  return true;
}

// ===== ОФОРМЛЕНИЕ ЗАКАЗА =====
async function checkoutOrder() {
  const fullname = document.getElementById('fullname')?.value.trim();
  const phone = document.getElementById('phone')?.value.trim();
  const email = document.getElementById('email')?.value.trim();
  const telegram = document.getElementById('telegram')?.value.trim();
  const deliveryMethodSelect = document.getElementById('delivery-method');
  const deliveryMethod = deliveryMethodSelect?.value;
  const pvzAddress = document.getElementById('pvz-address')?.value.trim();
  const comment = document.getElementById('comment')?.value.trim();
  const consent = document.getElementById('consent')?.checked;
  
  // Валидация
  if (!fullname) {
    showNotification('❌ Укажите ФИО', true);
    return false;
  }
  if (!phone) {
    showNotification('❌ Укажите телефон', true);
    return false;
  }
  if (!email) {
    showNotification('❌ Укажите email', true);
    return false;
  }
  if (!deliveryMethod) {
    showNotification('❌ Выберите способ доставки', true);
    return false;
  }
  if (!pvzAddress) {
    showNotification('❌ Укажите адрес пункта выдачи', true);
    return false;
  }
  if (!consent) {
    showNotification('❌ Подтвердите согласие на обработку данных', true);
    return false;
  }
  
  // Рассчитываем стоимость доставки
  const deliveryPrice = calculateDelivery(pvzAddress, deliveryMethod);
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + deliveryPrice;
  
  // Формируем данные заказа
  const orderData = {
    items: [...cart],
    fullname: fullname,
    phone: phone,
    email: email,
    telegram: telegram,
    deliveryMethod: deliveryMethodSelect.options[deliveryMethodSelect.selectedIndex]?.text,
    address: pvzAddress,
    comment: comment,
    subtotal: subtotal,
    deliveryPrice: deliveryPrice,
    total: total,
    orderId: 'STALKER-' + Date.now()
  };
  
  const submitBtn = document.getElementById('submit-order');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ ОТПРАВКА...';
  submitBtn.disabled = true;
  
  try {
    // Сначала отправляем email продавцу
    const emailSent = await sendOrderEmail(orderData);
    
    if (emailSent) {
      // Сохраняем заказ в localStorage
      saveOrder(orderData);
      
      // Очищаем корзину
      cart = [];
      saveCart();
      
      // Показываем сообщение об успехе
      showNotification(`✅ Заказ №${orderData.orderId} оформлен! Уведомление отправлено продавцу.`);
      
      // Перерисовываем корзину
      renderCartPage();
      
      // Скрываем форму и показываем корзину
      document.getElementById('checkout-form').style.display = 'none';
      const cartDiv = document.getElementById('cart');
      if (cartDiv) cartDiv.style.display = 'flex';
      
      // Сбрасываем форму
      document.getElementById('fullname').value = '';
      document.getElementById('phone').value = '';
      document.getElementById('email').value = '';
      document.getElementById('telegram').value = '';
      document.getElementById('pvz-address').value = '';
      document.getElementById('comment').value = '';
      document.getElementById('consent').checked = false;
      if (deliveryMethodSelect) deliveryMethodSelect.value = '';
      
      // Выводим в консоль для отладки
      console.log('Заказ успешно отправлен на email!');
      console.log('Данные заказа:', orderData);
    } else {
      showNotification('❌ Ошибка при отправке email. Заказ сохранен локально.', true);
      // Даже если email не отправился, сохраняем заказ локально
      saveOrder(orderData);
      cart = [];
      saveCart();
      renderCartPage();
      document.getElementById('checkout-form').style.display = 'none';
      const cartDiv = document.getElementById('cart');
      if (cartDiv) cartDiv.style.display = 'flex';
    }
    
  } catch (error) {
    console.error('Ошибка при оформлении заказа:', error);
    showNotification('❌ Ошибка при оформлении заказа. Попробуйте еще раз.', true);
  } finally {
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
  
  return false;
}

// ===== ОТРИСОВКА КОРЗИНЫ =====
function renderCartPage() {
  let cartDiv = document.getElementById("cart");
  if (!cartDiv) return;

  if (cart.length === 0) {
    cartDiv.innerHTML = '<div class="cart-empty">🧾 корзина пуста...<br>добавь что-нибудь странное</div>';
    cartDiv.style.display = 'flex';
    const form = document.getElementById('checkout-form');
    if (form) form.style.display = 'none';
    return;
  }

  let itemsHtml = "";
  let total = 0;
  
  cart.forEach((item, idx) => {
    total += item.price;
    itemsHtml += `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.img}" alt="${item.name}" onerror="this.src='https://placehold.co/70x70?text=?'">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <div class="cart-item-price">${item.price}₽</div>
          <div class="cart-item-size">📏 Размер: ${item.size || 'Не выбран'}</div>
        </div>
        <button class="cart-item-remove" onclick="removeFromCart(${idx})">✖ удалить</button>
      </div>
    `;
  });

  cartDiv.innerHTML = `
    <div style="width:100%">
      ${itemsHtml}
    </div>
    <div class="cart-total">ИТОГО: ${total}₽</div>
    <div class="cart-actions">
      <button class="checkout-btn" onclick="showCheckoutForm()">✅ ОФОРМИТЬ ЗАКАЗ</button>
      <button class="clear-cart" onclick="clearCart()">🗑️ ОЧИСТИТЬ КОРЗИНУ</button>
    </div>
  `;
  
  cartDiv.style.display = 'flex';
  const form = document.getElementById('checkout-form');
  if (form) form.style.display = 'none';
}

// ===== ПОКАЗАТЬ ФОРМУ ОФОРМЛЕНИЯ =====
function showCheckoutForm() {
  if (cart.length === 0) {
    showNotification('Корзина пуста!', true);
    return;
  }
  
  const cartDiv = document.getElementById('cart');
  const form = document.getElementById('checkout-form');
  
  if (cartDiv) cartDiv.style.display = 'none';
  if (form) form.style.display = 'block';
  
  updateTotalDisplay();
}

// ===== ОБНОВЛЕНИЕ СТОИМОСТИ ДОСТАВКИ =====
function updateTotalDisplay() {
  const city = document.getElementById('pvz-address')?.value || '';
  const method = document.getElementById('delivery-method')?.value;
  
  const deliveryPrice = calculateDelivery(city, method);
  const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
  const total = subtotal + deliveryPrice;
  
  const deliverySpan = document.getElementById('delivery-price');
  const totalSpan = document.getElementById('total-final');
  
  if (deliverySpan) deliverySpan.textContent = deliveryPrice + ' ₽';
  if (totalSpan) totalSpan.textContent = total + ' ₽';
}

// ===== ОБРАБОТЧИКИ ФОРМЫ =====
function setupFormHandlers() {
  const deliveryMethod = document.getElementById('delivery-method');
  const pvzAddress = document.getElementById('pvz-address');
  const pvzGroup = document.getElementById('pvz-group');
  
  if (deliveryMethod) {
    deliveryMethod.addEventListener('change', () => {
      updateTotalDisplay();
    });
  }
  
  if (pvzAddress) {
    pvzAddress.addEventListener('input', updateTotalDisplay);
  }
  
  const submitBtn = document.getElementById('submit-order');
  if (submitBtn) {
    submitBtn.onclick = (e) => {
      e.preventDefault();
      checkoutOrder();
    };
  }
  
  const backBtn = document.getElementById('back-to-cart');
  if (backBtn) {
    backBtn.onclick = (e) => {
      e.preventDefault();
      const cartDiv = document.getElementById('cart');
      const form = document.getElementById('checkout-form');
      if (cartDiv) cartDiv.style.display = 'flex';
      if (form) form.style.display = 'none';
    };
  }
  
  const privacyLink = document.getElementById('privacy-link');
  if (privacyLink) {
    privacyLink.onclick = (e) => {
      e.preventDefault();
      document.getElementById('privacy-modal').style.display = 'flex';
    };
  }
}

function closePrivacyModal() {
  document.getElementById('privacy-modal').style.display = 'none';
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function openSizeModal(name, price, img) {
  const sizeModal = document.getElementById("size-modal");
  if (!sizeModal) return;
  
  let currentSize = null;
  
  document.getElementById("size-modal-title").textContent = name;
  document.getElementById("size-modal-price").innerHTML = price + "₽";
  document.getElementById("size-modal-img").src = img || "img/placeholder.jpg";
  
  const sizeBtns = sizeModal.querySelectorAll(".size-option");
  
  sizeBtns.forEach(btn => {
    btn.classList.remove("selected");
    btn.onclick = (e) => {
      e.stopPropagation();
      sizeBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentSize = btn.getAttribute("data-size");
    };
  });
  
  const confirmBtn = document.getElementById("confirm-size-btn");
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.id = "confirm-size-btn";
  newConfirmBtn.onclick = () => {
    if (!currentSize) {
      showNotification("❌ Пожалуйста, выберите размер");
      return;
    }
    addToCartWithSize(name, price, img, currentSize);
    closeSizeModal();
  };
  
  sizeModal.style.display = "flex";
  
  sizeModal.onclick = function(e) {
    if (e.target === sizeModal) {
      closeSizeModal();
    }
  };
}

function closeSizeModal() {
  const sizeModal = document.getElementById("size-modal");
  if (sizeModal) {
    sizeModal.style.display = "none";
  }
}

function openModal(name, price, img) {
  let modal = document.getElementById("modal");
  if (!modal) return;
  
  let currentSize = null;

  document.getElementById("modal-title").textContent = name;
  document.getElementById("modal-price").innerHTML = price + "₽";
  document.getElementById("modal-img").src = img || "img/placeholder.jpg";
  
  const sizeBtns = modal.querySelectorAll(".size-option");
  
  sizeBtns.forEach(btn => {
    btn.classList.remove("selected");
    btn.onclick = (e) => {
      e.stopPropagation();
      sizeBtns.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentSize = btn.getAttribute("data-size");
    };
  });

  let buyBtn = document.getElementById("buy-btn");
  let newBtn = buyBtn.cloneNode(true);
  buyBtn.parentNode.replaceChild(newBtn, buyBtn);
  newBtn.id = "buy-btn";
  newBtn.onclick = function (e) {
    e.stopPropagation();
    if (!currentSize) {
      showNotification("❌ Пожалуйста, выберите размер");
      return;
    }
    addToCartWithSize(name, price, img, currentSize);
    closeModal();
  };

  modal.style.display = "flex";
  
  modal.onclick = function(e) {
    if (e.target === modal) {
      closeModal();
    }
  };
}

function closeModal() {
  let modal = document.getElementById("modal");
  if (modal) {
    modal.style.display = "none";
  }
}

// ========== ЧАСТИЦЫ ==========
function createParticles() {
  for (let i = 0; i < 40; i++) {
    let particle = document.createElement("div");
    particle.classList.add("particle");
    particle.style.left = Math.random() * 100 + "%";
    particle.style.animationDelay = Math.random() * 15 + "s";
    particle.style.animationDuration = 8 + Math.random() * 12 + "s";
    particle.style.width = 2 + Math.random() * 5 + "px";
    particle.style.height = particle.style.width;
    document.body.appendChild(particle);
  }
}

// ========== ПЕРЕХОД В SHOP ПО КЛИКУ ==========
function setupHeroCardClick() {
  const heroCard = document.querySelector('.hero-3d-card');
  if (heroCard) {
    heroCard.style.cursor = 'pointer';
    heroCard.onclick = function() {
      window.location.href = 'index.html';
    };
  }
}

// ===== СЛАЙДЕР =====
let currentSlide = 0;
let slideInterval;

function initSlider() {
  const images = document.querySelectorAll('.hero-image');
  const dots = document.querySelectorAll('.counter-dot');
  
  if (images.length === 0) return;
  
  function showSlide(index) {
    images.forEach((img, i) => {
      img.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }
  
  function nextSlide() {
    let next = (currentSlide + 1) % images.length;
    showSlide(next);
  }
  
  slideInterval = setInterval(nextSlide, 4000);
  
  dots.forEach((dot, index) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      clearInterval(slideInterval);
      showSlide(index);
      slideInterval = setInterval(nextSlide, 4000);
    });
  });
  
  const card = document.querySelector('.hero-3d-card');
  if (card) {
    card.addEventListener('mouseenter', () => {
      clearInterval(slideInterval);
    });
    card.addEventListener('mouseleave', () => {
      slideInterval = setInterval(nextSlide, 4000);
    });
  }
}

function createFallingParticles() {
  const container = document.getElementById('fallingParticles');
  if (!container) return;
  
  const particleCount = 80;
  const symbols = ['●', '○', '◆', '◇', '▲', '△', '■', '□', '⭐', '🌑', '⚡', '🔮', '🌙', '✧', '✦', '·', '•'];
  const colors = ['#ffffff', '#aaaaaa', '#888888', '#666666', '#ff9999', '#99ff99', '#9999ff'];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'falling-particle';
    
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    particle.textContent = symbol;
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.color = color;
    
    const size = 8 + Math.random() * 16;
    particle.style.fontSize = size + 'px';
    
    particle.style.left = Math.random() * 100 + '%';
    
    const duration = 5 + Math.random() * 10;
    particle.style.animationDuration = duration + 's';
    
    particle.style.animationDelay = Math.random() * 15 + 's';
    
    particle.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    particle.style.opacity = 0.3 + Math.random() * 0.5;
    
    container.appendChild(particle);
  }
}

// ===== ЗАПУСК =====
document.addEventListener("DOMContentLoaded", function () {
  loadCart();
  updateCartCount();
  createParticles();
  setupFormHandlers();
  
  const modal = document.getElementById("modal");
  if (modal) {
    modal.onclick = function(e) {
      if (e.target === modal) closeModal();
    };
  }
  
  const sizeModal = document.getElementById("size-modal");
  if (sizeModal) {
    sizeModal.onclick = function(e) {
      if (e.target === sizeModal) closeSizeModal();
    };
  }
  
  const privacyModal = document.getElementById("privacy-modal");
  if (privacyModal) {
    privacyModal.onclick = function(e) {
      if (e.target === privacyModal) closePrivacyModal();
    };
  }
  
  if (window.location.pathname.includes("cart.html")) {
    renderCartPage();
    const cartDiv = document.getElementById('cart');
    if (cartDiv) cartDiv.style.display = 'flex';
  }
  
  const isHomePage = window.location.pathname.includes("indexhome.html") || 
                     window.location.pathname.endsWith("/") || 
                     window.location.pathname.includes("home");
  
  if (isHomePage && document.querySelector('.hero-3d-card')) {
    initSlider();
    createFallingParticles();
    setupHeroCardClick();
  }
});

// Глобальные функции
window.addToCartWithSize = addToCartWithSize;
window.openSizeModal = openSizeModal;
window.closeSizeModal = closeSizeModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.renderCartPage = renderCartPage;
window.showCheckoutForm = showCheckoutForm;
window.checkoutOrder = checkoutOrder;
window.closePrivacyModal = closePrivacyModal;