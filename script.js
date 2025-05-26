// Ожидаем полной загрузки DOM перед выполнением скрипта
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. Initializing script...");

    // --- Глобальные переменные и константы ---
    const WHATSAPP_NUMBER = '+79374897407';
    let cart = {};
    let activeCategory = 'all';
    let allMenuItems = [];
    let currentOrderDetailsForWhatsapp = '';

    // --- Получение ссылок на элементы DOM ---
    const productGrid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const cartButton = document.getElementById('cartButton');
    const cartCounter = document.getElementById('cartCounter');
    const cartPopup = document.getElementById('cartPopup');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartTotalElement = document.getElementById('cartTotal');
    const sticksInput = document.getElementById('sticks');
    const checkoutButton = document.getElementById('checkoutButton');
    const clearCartButton = document.getElementById('clearCartButton');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const scrollableNavContainer = document.querySelector('.nav-container');
    const allNavContainers = document.querySelectorAll('.desktop-nav, .mobile-nav');
    const scrollLeftBtn = document.getElementById('scrollLeftBtn');
    const scrollRightBtn = document.getElementById('scrollRightBtn');
    const sliderTrack = document.getElementById('sliderTrack');
    const shapesContainer = document.querySelector('.shapes');
    const confirmationPopup = document.getElementById('confirmationPopup');
    const confirmationOverlay = document.getElementById('confirmationOverlay');
    const addressSection = document.getElementById('addressSection');
    const addressInput = document.getElementById('address');
    const commentInput = document.getElementById('comment');
    const confirmOrderButton = document.getElementById('confirmOrderButton');
    const cancelOrderButton = document.getElementById('cancelOrderButton');
    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    const toastContainer = document.getElementById('toast-container');
    const loadingMessage = productGrid ? productGrid.querySelector('.loading-message') : null;
    const preWhatsappConfirmationPopup = document.getElementById('preWhatsappConfirmationPopup');
    const proceedToWhatsAppButton = document.getElementById('proceedToWhatsAppButton');
    const cancelPreWhatsAppButton = document.getElementById('cancelPreWhatsAppButton');

    console.log("Initial element check:", {scrollableNavContainer, scrollLeftBtn, scrollRightBtn});


    function createProductCard(item) {
        try {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.category = item.category;
            cardElement.dataset.id = item.id;
            let basePrice;
            let displayPrice;
            let hasSizes = item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0;
            if (hasSizes) {
                basePrice = parseFloat(item.sizes[0].price);
                if (isNaN(basePrice)) { basePrice = 0; }
                displayPrice = basePrice;
            } else {
                basePrice = parseFloat(item.price);
                if (isNaN(basePrice)) { basePrice = 0; }
                displayPrice = basePrice;
            }
            cardElement.dataset.price = basePrice;
            let sizeOptionsHTML = '';
            if (hasSizes) {
                sizeOptionsHTML = '<div class="size-options">';
                item.sizes.forEach((sizeInfo, index) => {
                    const sizePrice = parseFloat(sizeInfo.price);
                    const priceForButton = isNaN(sizePrice) ? 0 : sizePrice;
                    const isSelected = index === 0 ? 'selected' : '';
                    sizeOptionsHTML += `<button type="button" data-size="${sizeInfo.size}" data-price="${priceForButton}" class="${isSelected}">${sizeInfo.size}</button>`;
                });
                sizeOptionsHTML += '</div>';
            }
            const addToCartPrice = displayPrice;
            cardElement.innerHTML = `
                <img src="${item.imageUrl || 'https://via.placeholder.com/300x200/cccccc/ffffff?text=No+Image'}" alt="${item.name}" loading="lazy">
                <div class="card-body">
                    <h3 class="product-name">${item.name || 'Название товара'}</h3>
                    ${sizeOptionsHTML}
                    <div class="card-footer">
                        <span class="price">${displayPrice} ₽</span>
                        <button type="button" class="add-to-cart-btn" data-price="${addToCartPrice}">В корзину</button>
                    </div>
                </div>`;
            return cardElement;
        } catch (error) {
            console.error(`Error creating card for item ${item?.id || 'unknown'}:`, error);
            return null;
        }
    }

    async function loadAndDisplayMenu() {
        if (!productGrid) { return; }
        productGrid.classList.add('loading');
        if (loadingMessage) loadingMessage.style.display = 'block';
        try {
            const response = await fetch('menu.json?t=' + Date.now());
            if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
            allMenuItems = await response.json();
            productGrid.innerHTML = '';
            if (!Array.isArray(allMenuItems) || allMenuItems.length === 0) {
                 productGrid.innerHTML = '<p style="color: #555; text-align: center;">Меню пока пустое.</p>';
                 return;
            }
            allMenuItems.forEach(item => {
                const card = createProductCard(item);
                if (card) { productGrid.appendChild(card); }
                else { console.warn(`Skipped item due to card creation error:`, item); }
            });
            updatePriceFilterValue();
            checkNavScroll(); // Вызываем здесь, так как ширина контейнера может измениться после загрузки продуктов (хотя категории статичны)
        } catch (error) {
            console.error("Не удалось загрузить меню:", error);
            if (productGrid) {
                productGrid.innerHTML = '';
                const errorElement = document.createElement('p');
                errorElement.style.color = 'var(--red-color, #d9534f)'; errorElement.style.textAlign = 'center';
                errorElement.style.padding = '40px'; errorElement.style.gridColumn = '1 / -1';
                errorElement.textContent = 'Ошибка загрузки меню. Пожалуйста, попробуйте обновить страницу или зайдите позже.';
                productGrid.appendChild(errorElement);
            }
        } finally {
             if (productGrid) productGrid.classList.remove('loading');
             if (loadingMessage) loadingMessage.style.display = 'none';
        }
    }

    function showToast(message, type = 'info') {
        if (!toastContainer) { alert(`${type.toUpperCase()}: ${message}`); return; }
        try {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`; toast.textContent = message;
            toastContainer.appendChild(toast);
            toast.offsetHeight; 
            setTimeout(() => {
                toast.classList.add('hide');
                toast.addEventListener('transitionend', () => { if (toast.parentNode === toastContainer) { toastContainer.removeChild(toast); } }, { once: true });
                setTimeout(() => { if (toast.parentNode === toastContainer) { toastContainer.removeChild(toast); } }, 3600);
            }, 3000);
        } catch (error) { console.error("Error showing toast:", error); }
    }

    function filterProducts() {
        if (!productGrid) return;
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const maxPrice = priceRange ? parseInt(priceRange.value, 10) : Infinity;
        const cards = productGrid.querySelectorAll('.card');
        const itemsToShow = []; const itemsToHide = [];
        cards.forEach(card => {
            const category = card.dataset.category; const basePrice = parseInt(card.dataset.price || 0, 10);
            const name = card.querySelector('.product-name')?.textContent.toLowerCase() || '';
            const matchesCategory = activeCategory === 'all' || category === activeCategory;
            const matchesPrice = basePrice <= maxPrice; const matchesSearch = name.includes(searchTerm);
            const shouldBeVisible = matchesCategory && matchesPrice && matchesSearch;
            const isCurrentlyVisible = card.style.display !== 'none' && !card.classList.contains('card-hiding');
            if (isCurrentlyVisible && !shouldBeVisible) { itemsToHide.push(card); }
            else if (!isCurrentlyVisible && shouldBeVisible) { card.style.opacity = '0'; card.style.transform = 'scale(0.95)'; card.style.display = ''; card.classList.remove('card-hiding'); itemsToShow.push(card); }
            else if (isCurrentlyVisible && shouldBeVisible) { card.classList.remove('card-hiding'); card.style.opacity = ''; card.style.transform = ''; }
            else if (!isCurrentlyVisible && !shouldBeVisible) { card.style.display = 'none'; card.classList.add('card-hiding'); }
        });
        itemsToHide.forEach(card => {
            card.classList.add('card-hiding');
             card.addEventListener('transitionend', function handler() { if (card.classList.contains('card-hiding')) card.style.display = 'none'; card.removeEventListener('transitionend', handler); }, { once: true });
             setTimeout(() => { if (card.classList.contains('card-hiding')) card.style.display = 'none'; }, 350);
        });
        requestAnimationFrame(() => { itemsToShow.forEach(card => { card.style.opacity = '1'; card.style.transform = 'scale(1)'; }); });
    }

    function updatePriceFilterValue() {
        if (priceValue && priceRange) priceValue.textContent = `до ${priceRange.value} ₽`;
        if (productGrid) filterProducts();
    }

    function filterCategory(category) {
        activeCategory = category;
        allNavContainers.forEach(container => {
            const navButtons = container.querySelectorAll('.category-button');
            navButtons.forEach(btn => { btn.classList.toggle('active', btn.dataset.category === category); });
        });
        if (productGrid) filterProducts();
        if (mobileNav?.classList.contains('active')) toggleMobileMenu();
    }

    function handleSizeSelection(selectedButton) {
        const card = selectedButton.closest('.card'); if (!card) return;
        const priceElement = card.querySelector('.price'); const addToCartButton = card.querySelector('.add-to-cart-btn');
        card.querySelectorAll('.size-options button').forEach(btn => btn.classList.remove('selected'));
        selectedButton.classList.add('selected');
        const newPrice = selectedButton.dataset.price;
        if (priceElement) priceElement.textContent = `${newPrice} ₽`;
        if (addToCartButton) addToCartButton.dataset.price = newPrice;
    }

    function addToCart(name, price, imgElement, event, size = null) {
         if (event) event.stopPropagation();
         const cartKey = size ? `${name} (${size})` : name; const numericPrice = parseFloat(price);
         if (isNaN(numericPrice)) { showToast(`Ошибка цены для товара "${name}"`, "error"); return; }
         if (cart[cartKey]) cart[cartKey].quantity++;
         else cart[cartKey] = { quantity: 1, price: numericPrice, size: size, name: name };
         showToast(`${name} ${size ? '('+size+')' : ''} добавлен в корзину!`, 'success');
         updateCartPopup();
    }

    function incrementCart(itemNameKey) { if (cart[itemNameKey]) { cart[itemNameKey].quantity++; updateCartPopup(); } }
    function decrementCart(itemNameKey) {
        if (!cart[itemNameKey]) return; cart[itemNameKey].quantity--;
        if (cart[itemNameKey].quantity <= 0) {
            const itemElement = cartItemsContainer?.querySelector(`.cart-item[data-key="${CSS.escape(itemNameKey)}"]`);
            if (itemElement) {
                 itemElement.classList.add('removing');
                 const handleTransitionEnd = () => { if (itemElement.parentNode === cartItemsContainer) { itemElement.removeEventListener('transitionend', handleTransitionEnd); delete cart[itemNameKey]; updateCartPopup(); } };
                 itemElement.addEventListener('transitionend', handleTransitionEnd, { once: true });
                 setTimeout(() => { if (cart[itemNameKey]?.quantity <= 0) { delete cart[itemNameKey]; updateCartPopup(); if(itemElement.parentNode === cartItemsContainer) itemElement.remove(); } }, 350);
                 return;
            } else delete cart[itemNameKey];
        }
        updateCartPopup();
    }

    function updateCartPopup() {
        if (!cartItemsContainer || !cartTotalElement || !cartCounter || !checkoutButton) {
            if (cartCounter) { let itemCount = 0; Object.values(cart).forEach(item => itemCount += item.quantity); cartCounter.textContent = itemCount; cartCounter.style.display = itemCount > 0 ? 'inline-block' : 'none'; }
            return;
        }
        const scrollTop = cartItemsContainer.scrollTop; cartItemsContainer.innerHTML = '';
        let total = 0, itemCount = 0; const sortedCartKeys = Object.keys(cart).sort();
        if (sortedCartKeys.length === 0) { cartPopup?.classList.add('empty'); }
        else {
            cartPopup?.classList.remove('empty');
            sortedCartKeys.forEach(key => {
                if (!cart[key] || cart[key].quantity <= 0) { if(cart[key]) delete cart[key]; return; }
                const item = cart[key]; const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item'); itemElement.dataset.key = key;
                const displayName = item.size ? `${item.name} (${item.size})` : item.name;
                itemElement.innerHTML = `<span>${displayName}</span> <div class="quantity-controls"> <button type="button" class="quantity-btn decrement-btn" data-item="${key}" aria-label="Уменьшить количество ${displayName}">-</button> <span class="quantity">${item.quantity}</span> <button type="button" class="quantity-btn increment-btn" data-item="${key}" aria-label="Увеличить количество ${displayName}">+</button> </div> <span class="item-price">${item.price * item.quantity} ₽</span>`;
                cartItemsContainer.appendChild(itemElement);
                total += item.price * item.quantity; itemCount += item.quantity;
                itemElement.querySelector('.decrement-btn')?.addEventListener('click', (e) => { e.stopPropagation(); decrementCart(key); });
                itemElement.querySelector('.increment-btn')?.addEventListener('click', (e) => { e.stopPropagation(); incrementCart(key); });
            });
        }
        cartTotalElement.textContent = `${total} ₽`; cartCounter.textContent = itemCount;
        cartCounter.style.display = itemCount > 0 ? 'inline-block' : 'none';
        checkoutButton.disabled = itemCount === 0; checkoutButton.style.opacity = itemCount === 0 ? '0.5' : '1';
        checkoutButton.style.cursor = itemCount === 0 ? 'not-allowed' : 'pointer';
        cartItemsContainer.scrollTop = scrollTop;
    }

    function toggleCartPopup() {
        if (!cartPopup) return;
        const isOpen = cartPopup.classList.toggle('active'); document.body.style.overflow = isOpen ? 'hidden' : '';
        cartPopup.setAttribute('aria-hidden', String(!isOpen));
        if(isOpen) cartPopup.focus(); else if (cartButton) cartButton.focus();
    }

    function clearCart() {
        if (!cartItemsContainer) { cart = {}; updateCartPopup(); showToast('Корзина очищена', 'warning'); return; }
        const items = cartItemsContainer.querySelectorAll('.cart-item') || []; let delay = 0;
        items.forEach(item => { setTimeout(() => item.classList.add('removing'), delay); delay += 50; });
        setTimeout(() => { cart = {}; updateCartPopup(); showToast('Корзина очищена', 'warning'); }, delay + 300);
    }

    function toggleMobileMenu() {
        if (!mobileNav || !mobileMenuToggle) return;
        const isActive = mobileNav.classList.toggle('active'); document.body.style.overflow = isActive ? 'hidden' : '';
        mobileMenuToggle.textContent = isActive ? '✕' : '☰'; mobileMenuToggle.setAttribute('aria-expanded', String(isActive));
        mobileNav.setAttribute('aria-hidden', String(!isActive));
    }

    function scrollNav(direction) {
       const scrollAmount = 200;
       if (scrollableNavContainer) {
            scrollableNavContainer.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
       }
    }

    function checkNavScroll() {
         if (!scrollableNavContainer || !scrollLeftBtn || !scrollRightBtn) {
             console.log("checkNavScroll: Aborting, missing elements", {scrollableNavContainer, scrollLeftBtn, scrollRightBtn});
             return;
         }
         console.log("checkNavScroll: Running for", scrollableNavContainer);
         
         // Даем браузеру время на отрисовку, особенно после динамических изменений
         setTimeout(() => {
            if (!scrollableNavContainer || !scrollLeftBtn || !scrollRightBtn) { // Проверка снова внутри setTimeout
                console.log("checkNavScroll (in timeout): Aborting, missing elements");
                return;
            }
             const { scrollLeft, scrollWidth, clientWidth } = scrollableNavContainer;
             console.log("checkNavScroll (in timeout) values:", { scrollLeft, scrollWidth, clientWidth });
             
             const showLeft = scrollLeft > 1; // Небольшой порог для scrollLeft
             const showRight = scrollWidth > clientWidth + scrollLeft + 1; // +1 для учета возможных субпиксельных расхождений

             console.log("checkNavScroll (in timeout) decisions:", { showLeft, showRight });

             scrollLeftBtn.style.display = showLeft ? 'flex' : 'none';
             scrollRightBtn.style.display = showRight ? 'flex' : 'none';
         }, 150); // Немного увеличил задержку на всякий случай
    }


    function checkoutOrder() {
        if (Object.keys(cart).length === 0) { showToast("Ваша корзина пуста!", "error"); return; }
        if (!confirmationPopup || !confirmationOverlay) return;
        confirmationOverlay.classList.add('active'); confirmationPopup.classList.add('visible');
        confirmationPopup.setAttribute('aria-hidden', 'false');
        if (cartPopup?.classList.contains('active')) toggleCartPopup();
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
        if(addressSection && addressInput) {
             addressSection.style.display = deliveryMethod === 'delivery' ? 'block' : 'none';
             addressInput.required = (deliveryMethod === 'delivery');
             if (deliveryMethod !== 'delivery') addressInput.classList.remove('error');
        }
        document.body.style.overflow = 'hidden'; confirmationPopup.focus();
    }

    function confirmOrder() {
        const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
        const address = addressInput ? addressInput.value.trim() : '';
        const comment = commentInput ? commentInput.value.trim() : '';
        const sticksCount = sticksInput ? (parseInt(sticksInput.value, 10) || 0) : 0;
        if (deliveryMethod === 'delivery' && address === '') { showToast('Пожалуйста, укажите адрес доставки.', 'error'); if(addressInput) { addressInput.focus(); addressInput.classList.add('error'); } return; }
        else if (addressInput) addressInput.classList.remove('error');
        let orderDetails = "Здравствуйте! Хочу сделать заказ:\n\n"; let total = 0;
        Object.keys(cart).forEach(key => { const item = cart[key]; const displayName = item.size ? `${item.name} (${item.size})` : item.name; orderDetails += `- ${displayName}: ${item.quantity} шт. x ${item.price} ₽ = ${item.quantity * item.price} ₽\n`; total += item.quantity * item.price; });
        orderDetails += `\nОбщая сумма: ${total} ₽\n`; orderDetails += `Палочки/Приборы: ${sticksCount} чел.\n`;
        orderDetails += `Способ получения: ${deliveryMethod === 'delivery' ? 'Доставка' : 'Самовывоз'}\n`;
        if (deliveryMethod === 'delivery') orderDetails += `Адрес: ${address}\n`;
        orderDetails += `Способ оплаты: `;
        switch (paymentMethod) { case 'cash': orderDetails += 'Наличные'; break; case 'card': orderDetails += 'Карта курьеру'; break; case 'online': orderDetails += 'Онлайн (Перевод)'; break; default: orderDetails += 'Не указан'; break; }
        orderDetails += '\n'; if (comment) orderDetails += `Комментарий: ${comment}\n`;
        currentOrderDetailsForWhatsapp = orderDetails;
        if(confirmationPopup) confirmationPopup.classList.remove('visible'); 
        if(preWhatsappConfirmationPopup) { preWhatsappConfirmationPopup.classList.add('visible'); preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'false'); preWhatsappConfirmationPopup.focus(); }
    }

    function proceedWithWhatsApp() {
        if (!currentOrderDetailsForWhatsapp) { showToast("Ошибка формирования заказа. Попробуйте снова.", "error"); return; }
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(currentOrderDetailsForWhatsapp)}`;
        window.open(whatsappUrl, '_blank');
        if(preWhatsappConfirmationPopup) { preWhatsappConfirmationPopup.classList.remove('visible'); preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true'); }
        if(confirmationPopup) { confirmationPopup.classList.remove('visible'); confirmationPopup.setAttribute('aria-hidden', 'true'); }
        if(confirmationOverlay) confirmationOverlay.classList.remove('active'); document.body.style.overflow = '';
        clearCart(); showToast('Заказ сформирован и перенаправлен в WhatsApp!', 'success');
        if(addressInput) addressInput.value = ''; if(commentInput) commentInput.value = '';
        const pickupRadio = document.querySelector('input[name="delivery"][value="pickup"]'); if (pickupRadio) pickupRadio.checked = true;
        const cashRadio = document.querySelector('input[name="payment"][value="cash"]'); if (cashRadio) cashRadio.checked = true;
        if(addressSection) addressSection.style.display = 'none'; if(addressInput) addressInput.classList.remove('error');
        currentOrderDetailsForWhatsapp = '';
    }

    function cancelPreWhatsappRedirect() {
        if(preWhatsappConfirmationPopup) { preWhatsappConfirmationPopup.classList.remove('visible'); preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true'); }
        if(confirmationPopup) { confirmationPopup.classList.add('visible'); confirmationPopup.focus(); }
    }

    function cancelOrder() { 
        if(confirmationPopup) { confirmationPopup.classList.remove('visible'); confirmationPopup.setAttribute('aria-hidden', 'true'); }
        if(preWhatsappConfirmationPopup) { preWhatsappConfirmationPopup.classList.remove('visible'); preWhatsappConfirmationPopup.setAttribute('aria-hidden', 'true'); }
        if(confirmationOverlay) confirmationOverlay.classList.remove('active'); document.body.style.overflow = '';
        if(addressInput) addressInput.classList.remove('error');
        if(cartButton && cartButton.style.display !== 'none') cartButton.focus();
    }

    function initSlider() {
        if (!sliderTrack) return; const sliderItems = sliderTrack.querySelectorAll('.slider-item');
        if (sliderItems.length <= 1) return; let currentSlide = 0;
        let intervalId = setInterval(() => { currentSlide = (currentSlide + 1) % sliderItems.length; sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`; }, 3000);
        sliderTrack.addEventListener('mouseenter', () => clearInterval(intervalId));
        sliderTrack.addEventListener('mouseleave', () => { intervalId = setInterval(() => { currentSlide = (currentSlide + 1) % sliderItems.length; sliderTrack.style.transform = `translateX(-${currentSlide * 100}%)`; }, 3000); });
    }

    function initShapes() {
        if (!shapesContainer) return; const shapes = shapesContainer.querySelectorAll('.shape');
        if (shapes.length === 0) return; let shapeData = [];
        shapes.forEach(shape => {
            const rect = shape.getBoundingClientRect(); const shapeWidth = rect.width || 50; const shapeHeight = rect.height || 50;
            const x = Math.random() * (window.innerWidth - shapeWidth); const y = Math.random() * (window.innerHeight - shapeHeight);
            const dx = (Math.random() * 2 - 1) * 0.5;  const dy = (Math.random() * 2 - 1) * 0.5;
            shape.style.left = `${x}px`; shape.style.top = `${y}px`; shape.style.transform = `translate(0px, 0px)`;
            shapeData.push({ element: shape, x, y, dx, dy, width: shapeWidth, height: shapeHeight, initialX: x, initialY: y });
        });
        let animationFrameId = null;
        function updateShapes() {
            shapeData.forEach(data => {
                data.x += data.dx; data.y += data.dy;
                if (data.x < 0 || data.x + data.width > window.innerWidth) { data.dx = -data.dx; data.x = Math.max(0, Math.min(data.x, window.innerWidth - data.width)); }
                if (data.y < 0 || data.y + data.height > window.innerHeight) { data.dy = -data.dy; data.y = Math.max(0, Math.min(data.y, window.innerHeight - data.height)); }
                const translateX = data.x - data.initialX; const translateY = data.y - data.initialY;
                data.element.style.transform = `translate(${translateX}px, ${translateY}px)`;
            });
            animationFrameId = requestAnimationFrame(updateShapes);
        }
        if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = requestAnimationFrame(updateShapes);
        document.addEventListener('visibilitychange', () => { if (document.hidden) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; } else if (!animationFrameId) animationFrameId = requestAnimationFrame(updateShapes); });
    }

    // --- Attaching Event Listeners ---
    if (searchInput) { let searchTimeout; searchInput.addEventListener('input', () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(filterProducts, 300); }); }
    if (searchButton) searchButton.addEventListener('click', filterProducts);
    if (priceRange) { let priceTimeout; priceRange.addEventListener('input', () => { if (priceValue) priceValue.textContent = `до ${priceRange.value} ₽`; clearTimeout(priceTimeout); priceTimeout = setTimeout(updatePriceFilterValue, 150); }); }
    allNavContainers.forEach(container => { container.addEventListener('click', (event) => { const button = event.target.closest('.category-button'); if (button?.dataset.category) filterCategory(button.dataset.category); }); });
    if (productGrid) { productGrid.addEventListener('click', (event) => { const card = event.target.closest('.card'); if (!card) return; const addButton = event.target.closest('.add-to-cart-btn'); const sizeButton = event.target.closest('.size-options button'); if (sizeButton) { handleSizeSelection(sizeButton); return; } if (addButton) { const nameElement = card.querySelector('.product-name'); const name = nameElement ? nameElement.textContent : 'Неизвестный товар'; const price = parseFloat(addButton.dataset.price); const img = card.querySelector('img'); const selectedSizeElement = card.querySelector('.size-options .selected'); const size = selectedSizeElement ? selectedSizeElement.dataset.size : null; addToCart(name, price, img, event, size); return; } }); }
    if (cartButton && cartButton.style.display !== 'none') { cartButton.addEventListener('click', toggleCartPopup); }
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCartPopup);
    if (clearCartButton) clearCartButton.addEventListener('click', clearCart);
    if (checkoutButton) checkoutButton.addEventListener('click', checkoutOrder);
    if (confirmOrderButton) confirmOrderButton.addEventListener('click', confirmOrder);
    if (cancelOrderButton) cancelOrderButton.addEventListener('click', cancelOrder);
    if (proceedToWhatsAppButton) proceedToWhatsAppButton.addEventListener('click', proceedWithWhatsApp);
    if (cancelPreWhatsAppButton) cancelPreWhatsAppButton.addEventListener('click', cancelPreWhatsappRedirect);
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    if (scrollLeftBtn) scrollLeftBtn.addEventListener('click', () => scrollNav(-1));
    if (scrollRightBtn) scrollRightBtn.addEventListener('click', () => scrollNav(1));
    if (scrollableNavContainer) { scrollableNavContainer.addEventListener('scroll', checkNavScroll, { passive: true }); window.addEventListener('resize', checkNavScroll); }
    if(deliveryRadios && deliveryRadios.length > 0) { deliveryRadios.forEach(radio => { radio.addEventListener('change', (event) => { if (!addressSection || !addressInput) return; const isDelivery = event.target.value === 'delivery'; addressSection.style.display = isDelivery ? 'block' : 'none'; addressInput.required = isDelivery; if (!isDelivery) addressInput.classList.remove('error'); }); }); }
    if (addressInput) { addressInput.addEventListener('input', () => { if (addressInput.value.trim() !== '') addressInput.classList.remove('error'); }); }

    // --- Initializations ---
    console.log("Initializing components..."); 
    if (productGrid) { loadAndDisplayMenu(); }
    if (sliderTrack) { initSlider(); }
    if (shapesContainer) { initShapes(); }
    
    // Вызываем checkNavScroll для scrollableNavContainer если он существует,
    // так как категории в HTML статичны и их ширина известна после загрузки DOM.
    if (scrollableNavContainer) {
        console.log("Calling checkNavScroll on DOMContentLoaded for static categories.");
        checkNavScroll();
    }
    
    if (window.location.pathname.includes('about.html')) { if (cartButton) { cartButton.style.display = 'none'; } }
    updateCartPopup(); 
    console.log("Script initialization complete.");
});