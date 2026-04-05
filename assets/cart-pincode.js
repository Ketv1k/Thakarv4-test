/* ═══════════════════════════════════════════════
   THAKAR KITCHEN — AJAX CART + PINCODE FIX
   Intercepts all add-to-cart forms
   Shows slide-in toast instead of redirecting
═══════════════════════════════════════════════ */

// ── COUPON CODES ──
var TK_COUPONS = {
  'THAKAR10':  { type: 'percent', value: 10,   label: '10% off' },
  'WELCOME15': { type: 'percent', value: 15,   label: '15% off' },
  'FLAT50':    { type: 'fixed',   value: 5000, label: '₹50 off' }
};

function tkGetDiscountAmount(subtotalPaise) {
  var code = (localStorage.getItem('tk_coupon_code') || '').toUpperCase();
  var coupon = TK_COUPONS[code];
  if (!coupon) return 0;
  if (coupon.type === 'percent') return Math.round(subtotalPaise * coupon.value / 100);
  return Math.min(coupon.value, subtotalPaise);
}

function tkApplyCoupon() {
  var input = document.getElementById('cart-coupon-input');
  var msg = document.getElementById('cart-coupon-msg');
  var appliedRow = document.getElementById('cart-coupon-applied');
  var label = document.getElementById('cart-coupon-label');
  var inputRow = document.getElementById('cart-coupon-input-row');
  if (!input) return;
  var code = input.value.trim().toUpperCase();
  var coupon = TK_COUPONS[code];
  if (msg) msg.style.display = 'block';
  if (!code) {
    if (msg) { msg.className = 'cart-coupon-msg err'; msg.textContent = 'Please enter a coupon code.'; }
    return;
  }
  if (!coupon) {
    if (msg) { msg.className = 'cart-coupon-msg err'; msg.textContent = 'Invalid coupon code. Please try again.'; }
    return;
  }
  localStorage.setItem('tk_coupon_code', code);
  if (msg) msg.style.display = 'none';
  if (label) label.textContent = code + ' \u2014 ' + coupon.label + ' applied!';
  if (appliedRow) appliedRow.style.display = 'flex';
  if (inputRow) inputRow.style.display = 'none';
  tkUpdateCheckoutUrl(code);
  fetchAndRenderCart();
}

function tkRemoveCoupon() {
  localStorage.removeItem('tk_coupon_code');
  var msg = document.getElementById('cart-coupon-msg');
  var appliedRow = document.getElementById('cart-coupon-applied');
  var inputRow = document.getElementById('cart-coupon-input-row');
  var input = document.getElementById('cart-coupon-input');
  if (msg) msg.style.display = 'none';
  if (appliedRow) appliedRow.style.display = 'none';
  if (inputRow) inputRow.style.display = 'flex';
  if (input) input.value = '';
  tkUpdateCheckoutUrl('');
  fetchAndRenderCart();
}

function tkUpdateCheckoutUrl(code) {
  var btn = document.getElementById('cart-checkout-btn');
  if (!btn) return;
  btn.href = code ? '/checkout?discount=' + encodeURIComponent(code) : '/checkout';
}

function tkRestoreCouponUI() {
  var code = (localStorage.getItem('tk_coupon_code') || '').toUpperCase();
  if (!code || !TK_COUPONS[code]) { localStorage.removeItem('tk_coupon_code'); return; }
  var appliedRow = document.getElementById('cart-coupon-applied');
  var label = document.getElementById('cart-coupon-label');
  var inputRow = document.getElementById('cart-coupon-input-row');
  if (label) label.textContent = code + ' \u2014 ' + TK_COUPONS[code].label + ' applied!';
  if (appliedRow) appliedRow.style.display = 'flex';
  if (inputRow) inputRow.style.display = 'none';
  tkUpdateCheckoutUrl(code);
}

// ── AJAX ADD TO CART ──
function tkAddToCart(form) {
  var btn = form.querySelector('[name="add"]');
  var origText = btn ? btn.textContent : 'Add to Cart';

  // ── OPTIMISTIC FEEDBACK (instant) ──
  var productName = (form.dataset.productTitle || '').replace('Ready To Eat ', '') || 'Item';
  if (btn) {
    btn.disabled = true;
    btn.classList.add('tk-added');
    btn.textContent = '\u2713 Added';
  }
  tkShowToast('\u2713 ' + productName + ' added to cart!', 'success');

  // Revert button after 1.2 s (optimistic)
  var revertTimer = setTimeout(function() {
    if (btn) { btn.classList.remove('tk-added'); btn.textContent = origText; btn.disabled = false; }
  }, 1200);

  var formData = new FormData(form);
  formData.append('sections', 'cart-icon-bubble');

  fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.status && data.status !== 200) {
      // Unexpected error — undo optimistic state
      clearTimeout(revertTimer);
      var errMsg = (data.description || data.message || 'Could not add item. Please try again.');
      tkShowToast(errMsg, 'error');
      if (btn) { btn.classList.remove('tk-added'); btn.textContent = origText; btn.disabled = false; }
    } else {
      // Silently update cart count + refresh card qty UIs
      tkUpdateCartCount();
      tkRefreshCardUIs();
    }
  })
  .catch(function() {
    clearTimeout(revertTimer);
    tkShowToast('Something went wrong. Please try again.', 'error');
    if (btn) { btn.classList.remove('tk-added'); btn.textContent = origText; btn.disabled = false; }
  });
}

// ── UPDATE CART COUNT ──
function tkUpdateCartCount() {
  fetch('/cart.js')
  .then(function(r) { return r.json(); })
  .then(function(cart) {
    var count = cart.item_count || 0;
    var badge = document.getElementById('nav-cart-count');
    if (badge) badge.textContent = count;
    var mobileBadge = document.getElementById('mobile-cart-count');
    if (mobileBadge) mobileBadge.textContent = '(' + count + ')';
  })
  .catch(function(err) { console.error('Cart count fetch failed', err); });
}

// ── PRODUCT CARD CART STATE ──
var _tkCart = {}; // { variantId: { key, qty } }

function tkRefreshCardUIs() {
  fetch('/cart.js').then(function(r) { return r.json(); }).then(function(cart) {
    _tkCart = {};
    cart.items.forEach(function(item) {
      _tkCart[item.variant_id] = { key: item.key, qty: item.quantity };
    });
    document.querySelectorAll('.pc-atc-wrap').forEach(function(wrap) {
      var pid = wrap.dataset.productId;
      var vid = parseInt(wrap.dataset.variantId);
      var form = wrap.querySelector('form');
      var ctrl = document.getElementById('pc-qty-' + pid);
      var numEl = document.getElementById('pc-qty-num-' + pid);
      if (_tkCart[vid] && _tkCart[vid].qty > 0) {
        if (form) form.style.display = 'none';
        if (numEl) numEl.textContent = _tkCart[vid].qty;
        if (ctrl) ctrl.style.display = 'flex';
      } else {
        if (form) form.style.display = '';
        if (ctrl) ctrl.style.display = 'none';
      }
    });
  }).catch(function(err) { console.error('Card UI refresh failed', err); });
}

function pcQtyChange(productId, delta) {
  var wrap = document.querySelector('.pc-atc-wrap[data-product-id="' + productId + '"]');
  if (!wrap) return;
  var vid = parseInt(wrap.dataset.variantId);
  var current = (_tkCart[vid] && _tkCart[vid].qty) || 0;
  var newQty = current + delta;

  // Get product name from the card's title element (product-card or hbs-card)
  var card = wrap.closest('.product-card') || wrap.closest('.hbs-card');
  var nameEl = card ? (card.querySelector('.product-name') || card.querySelector('.hbs-name')) : null;
  var productName = nameEl ? nameEl.textContent.trim() : 'Item';

  if (newQty <= 0) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: _tkCart[vid].key, quantity: 0 })
    }).then(function() {
      tkShowToast(productName + ' removed from cart', 'success');
      tkRefreshCardUIs(); tkUpdateCartCount();
    }).catch(function(err) { console.error('Cart remove failed', err); });
  } else if (delta > 0) {
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: vid, quantity: 1 })
    }).then(function() {
      tkShowToast('\u2713 ' + productName + ' added to cart!', 'success');
      tkRefreshCardUIs(); tkUpdateCartCount();
    }).catch(function(err) { console.error('Cart add failed', err); });
  } else {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: _tkCart[vid].key, quantity: newQty })
    }).then(function() {
      tkShowToast('\u2713 ' + productName + ' quantity updated', 'success');
      tkRefreshCardUIs(); tkUpdateCartCount();
    }).catch(function(err) { console.error('Cart qty update failed', err); });
  }
}

// ── TOP NOTIFICATION BAR (below navbar) ──
function tkShowToast(msg, type) {
  var existing = document.getElementById('tk-toast');
  if (existing) existing.remove();

  var isSuccess = (type || 'success') === 'success';
  var toast = document.createElement('div');
  toast.id = 'tk-toast';
  toast.className = 'tk-toast tk-toast-' + (type || 'success');

  var iconSpan = document.createElement('span');
  iconSpan.className = 'tk-toast-icon';
  iconSpan.textContent = isSuccess ? '\u2713' : '!';
  toast.appendChild(iconSpan);

  var msgSpan = document.createElement('span');
  msgSpan.className = 'tk-toast-msg';
  msgSpan.textContent = msg;
  toast.appendChild(msgSpan);

  if (isSuccess) {
    var viewCart = document.createElement('a');
    viewCart.href = '/cart';
    viewCart.className = 'tk-toast-view-cart';
    viewCart.textContent = 'View Cart';
    viewCart.addEventListener('click', function(e) {
      e.preventDefault();
      toast.remove();
      if (typeof openCartDrawer === 'function') openCartDrawer();
    });
    toast.appendChild(viewCart);
  }

  var closeBtn = document.createElement('button');
  closeBtn.className = 'tk-toast-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', function() { toast.remove(); });
  toast.appendChild(closeBtn);

  // Append to body — position:fixed so DOM placement doesn't matter
  document.body.appendChild(toast);

  // Auto dismiss after 4s
  setTimeout(function() {
    if (toast.parentNode) toast.remove();
  }, 4000);
}

// ── INTERCEPT ALL ADD TO CART — registered immediately (no DOMContentLoaded delay) ──
// Capture phase fires BEFORE inline onclick="event.stopPropagation()" on product card buttons
document.addEventListener('click', function(e) {
  var btn = e.target.closest('button[name="add"], input[name="add"]');
  if (!btn) return;
  var form = btn.closest('form');
  if (!form) return;
  var idInput = form.querySelector('input[name="id"]');
  if (!idInput) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  tkAddToCart(form);
}, true);

document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure all DOM is ready
  setTimeout(function() { attachQtyHandlers(); attachPincodeHandlers(); tkRefreshCardUIs(); }, 100);

  // ── PINCODE CHECKER via event listener ──
  var pinBtn = document.querySelector('.pincode-check-btn');
  var pinInput = document.getElementById('pincode-input');

  function runPincheck() {
    var input = document.getElementById('pincode-input');
    var res = document.getElementById('pincode-result');
    if (!input || !res) { console.log('Pincode elements not found'); return; }
    var val = input.value.replace(/\D/g, '').trim();
    if (val.length !== 6) {
      res.style.cssText = 'display:block!important;margin-top:8px;padding:8px 12px;border-radius:3px;font-size:.8rem;font-family:Jost,sans-serif;';
      res.className = 'pincode-result err';
      res.textContent = 'Please enter a valid 6-digit pincode.';
      return;
    }
    // Local pincodes list — no dependency on theme.js
    const SERVICEABLE_PINCODES = ['360001','360002','360003','360004','360005','363641','363642','363643','380001','380002','380006','380007','380009','382350','395001','395002','395003','400001','400002','400050','400051','400060','411001','411002','411014','411028','560001','560002','110001','110002','110011','110020','122001','201301','302001','302002','380001','390001','390002','390007'];
    var serviceable = SERVICEABLE_PINCODES.includes(val);
    res.style.cssText = 'display:block!important;margin-top:8px;padding:8px 12px;border-radius:3px;font-size:.8rem;font-family:Jost,sans-serif;';
    if (serviceable) {
      res.className = 'pincode-result ok';
      res.textContent = '\u2713 We deliver to ' + val + ' in 3\u20134 business days. Free delivery above \u20b9500!';
    } else {
      res.className = 'pincode-result ok';
      res.textContent = '\u2713 We deliver Pan-India. Delivery in 4\u20136 business days.';
    }
  }

  if (pinBtn && !pinBtn._tkBound) {
    pinBtn.addEventListener('click', runPincheck);
    pinBtn._tkBound = true;
  }
  if (pinInput) {
    pinInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); runPincheck(); }
    });
  }

  // ── PRODUCT PAGE QTY ──
  function attachQtyHandlers() {
    var minus = document.getElementById('qty-minus');
    var plus  = document.getElementById('qty-plus');
    var input = document.getElementById('product-qty');
    if (minus && !minus._tkBound) {
      minus.addEventListener('click', function(e) {
        e.preventDefault();
        var v = parseInt(input.value) || 1;
        if (v > 1) input.value = v - 1;
      });
      minus._tkBound = true;
    }
    if (plus && !plus._tkBound) {
      plus.addEventListener('click', function(e) {
        e.preventDefault();
        var v = parseInt(input.value) || 1;
        input.value = v + 1;
      });
      plus._tkBound = true;
    }
  }
  attachQtyHandlers();

  // ── PINCODE RE-ATTACH ──
  function attachPincodeHandlers() {
    var btn = document.querySelector('.pincode-check-btn');
    var inp = document.getElementById('pincode-input');
    if (btn && !btn._tkBound) {
      btn.addEventListener('click', runPincheck);
      btn._tkBound = true;
    }
    if (inp && !inp._tkBound) {
      inp.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); runPincheck(); }
      });
      inp._tkBound = true;
    }
  }
  attachPincodeHandlers();

  // Re-attach on page changes (for SPA-like navigation)
  var observer = new MutationObserver(function() {
    attachQtyHandlers();
    attachPincodeHandlers();
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

});

/* ── AJAX CART QTY UPDATE (catches ALL /cart/change forms) ── */
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure all DOM is ready
  setTimeout(function() { attachQtyHandlers(); attachPincodeHandlers(); }, 100);
  document.addEventListener('submit', function(e) {
    var form = e.target;
    // Catch any form posting to /cart/change (qty stepper + remove buttons)
    if (!form.action || !form.action.includes('/cart/change')) return;
    e.preventDefault();
    var idInput = form.querySelector('[name="id"]');
    var qtyInput = form.querySelector('[name="quantity"]');
    // quantity can be on the button itself (name="quantity" value="X")
    var qtyBtn = form.querySelector('button[name="quantity"]');
    var id = idInput ? idInput.value : '';
    var qty = 0;
    if (qtyInput && qtyInput.type === 'hidden') {
      qty = parseInt(qtyInput.value);
    } else if (qtyBtn) {
      qty = parseInt(qtyBtn.value);
    }
    if (!id) return;
    // Disable button to prevent double-tap
    var btn = form.querySelector('button');
    if (btn) btn.disabled = true;
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ id: id, quantity: qty })
    })
    .then(function(r) { return r.json(); })
    .then(function() { window.location.reload(); })
    .catch(function() { window.location.reload(); });
  });
});
