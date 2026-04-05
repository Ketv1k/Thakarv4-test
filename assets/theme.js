
// ══ ALL 20 PRODUCTS ══
// Products provided by Shopify
let cart = JSON.parse(localStorage.getItem('tk_cart')||'[]');
let wishlist = JSON.parse(localStorage.getItem('tk_wishlist')||'[]');
let orders = JSON.parse(localStorage.getItem('tk_orders')||'[]');
let activeFilter = 'All';
let couponApplied = false;
let currentProductId = null;
let detailQty = 1;

// ── NAVIGATION ──

function filterAndShop(cat) { activeFilter = cat; showPage('shop'); }

// ── MOBILE ──
function toggleMobile() {
  var nav = document.querySelector('nav');
  var menu = document.getElementById('mobile-menu');
  var hamburger = document.getElementById('hamburger');
  if (!menu) return;
  // Set top to exact nav bottom
  if (nav) {
    var navBottom = nav.getBoundingClientRect().bottom + window.scrollY;
    menu.style.top = nav.getBoundingClientRect().bottom + 'px';
    menu.style.position = 'fixed';
  }
  menu.classList.toggle('open');
  if (hamburger) hamburger.classList.toggle('open');
}
function closeMobile() {
  var menu = document.getElementById('mobile-menu');
  var hamburger = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');
}


// ── NAV SCROLL SHRINK ──
window.addEventListener('scroll', function(){
  var nav = document.querySelector('nav');
  if (nav) nav.classList.toggle('nav-scrolled', window.scrollY > 30);
}, { passive: true });

// ── VARIANT SELECTOR ──
function selectVariant(btn, productId) {
  var container = btn.closest('.variant-btns');
  if (!container) return;
  container.querySelectorAll('.variant-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  var vidInput = document.getElementById('vid-' + productId);
  if (vidInput) vidInput.value = btn.dataset.vid;
}

// ── CONFETTI ──
var _confettiPrevFree = false;
function fireConfetti() {
  var canvas = document.getElementById('cart-confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'cart-confetti-canvas';
    document.body.appendChild(canvas);
  }
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext('2d');
  var colors = ['#C9960C','#E8B84B','#1B2A6B','#FFF8ED','#ffffff','#111C4E'];
  var pieces = [];
  for (var i = 0; i < 140; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 200,
      w: 7 + Math.random() * 7,
      h: 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      vr: (Math.random() - 0.5) * 0.15,
      opacity: 1
    });
  }
  var start = null;
  var dur = 3200;
  function draw(ts) {
    if (!start) start = ts;
    var elapsed = ts - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(function(p) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.07;
      p.opacity = Math.max(0, 1 - (elapsed - dur * 0.6) / (dur * 0.4));
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (elapsed < dur) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(draw);
}

// ── SHOPIFY CART DRAWER ──
function openCartDrawer() {
  fetchAndRenderCart();
  if (typeof tkRestoreCouponUI === 'function') tkRestoreCouponUI();
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCartDrawer() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}
function fetchAndRenderCart() {
  fetch('/cart.js').then(function(r){ return r.json(); }).then(renderDrawerCart).catch(function(err) { console.error('Cart fetch failed', err); });
}
function formatMoney(paise) {
  return '\u20b9' + Math.round(paise / 100);
}
function updateNavCount(n) {
  var el = document.getElementById('nav-cart-count');
  if (el) el.textContent = n;
}
function renderDrawerProgress(sub) {
  var wrap = document.getElementById('drawer-progress-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'drawer-progress-wrap';
    wrap.className = 'cart-progress-wrap';
    var list = document.getElementById('cart-items-list');
    if (list) list.parentNode.insertBefore(wrap, list);
  }
  var threshold = 50000; // ₹500 in paise
  var pct = Math.min(100, Math.round((sub / threshold) * 100));
  var remaining = Math.max(0, threshold - sub);
  var nowFree = remaining === 0;
  if (remaining > 0) {
    wrap.innerHTML = '<div class="cart-progress-label"><span>Add ' + formatMoney(remaining) + ' more</span><span>for FREE delivery</span></div><div class="cart-progress-bar"><div class="cart-progress-fill" style="width:' + pct + '%"></div></div>';
  } else {
    wrap.innerHTML = '<div class="cart-progress-label" style="color:var(--gold)"><span>\u2756 You have unlocked free delivery!</span></div><div class="cart-progress-bar"><div class="cart-progress-fill" style="width:100%"></div></div>';
    if (!_confettiPrevFree) fireConfetti();
  }
  _confettiPrevFree = nowFree;
}

function renderDrawerCart(cartData) {
  var list = document.getElementById('cart-items-list');
  var footer = document.getElementById('cart-footer');
  if (!list) return;
  if (cartData.item_count === 0) {
    list.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">\uD83D\uDED2</div><div style="font-weight:600;color:var(--royal-dark)">Your cart is empty</div><div style="font-size:.8rem;color:var(--muted);margin-top:6px">Add something delicious!</div></div>';
    var pw = document.getElementById('drawer-progress-wrap');
    if (pw) pw.style.display = 'none';
    if (footer) footer.style.display = 'none';
    updateNavCount(0);
    return;
  }
  var pw = document.getElementById('drawer-progress-wrap');
  if (pw) pw.style.display = '';
  list.innerHTML = cartData.items.map(function(item) {
    return '<div class="cart-item"><img class="cart-item-img" src="' + item.image + '" alt="' + item.title + '"><div class="cart-item-info"><div class="cart-item-name">' + item.title.replace('Ready To Eat ','') + '</div><div class="cart-item-price">' + formatMoney(item.final_price) + '</div><div class="cart-qty"><button class="qty-btn" onclick="drawerChangeQty(\'' + item.key + '\',' + (item.quantity - 1) + ')">&#8722;</button><span class="qty-num">' + item.quantity + '</span><button class="qty-btn" onclick="drawerChangeQty(\'' + item.key + '\',' + (item.quantity + 1) + ')">+</button></div></div><button class="cart-item-remove" onclick="drawerChangeQty(\'' + item.key + '\',0)">&#215;</button></div>';
  }).join('');
  var sub = cartData.total_price;
  renderDrawerProgress(sub);
  var del = sub >= 50000 ? 0 : 6000;
  var rem = Math.max(0, 50000 - sub);
  var discountAmt = tkGetDiscountAmount(sub);
  var discountRow = document.getElementById('cart-discount-row');
  var discountAmtEl = document.getElementById('cart-discount-amount');
  var discountLabelEl = document.getElementById('cart-discount-label');
  if (discountAmt > 0 && discountRow && discountAmtEl) {
    var appliedCode = localStorage.getItem('tk_coupon_code') || '';
    if (discountLabelEl) discountLabelEl.textContent = 'Discount (' + appliedCode + ')';
    discountAmtEl.textContent = '−' + formatMoney(discountAmt);
    discountRow.style.display = 'flex';
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }
  document.getElementById('cart-subtotal').textContent = formatMoney(sub);
  document.getElementById('cart-delivery').textContent = del === 0 ? 'FREE' : formatMoney(del);
  document.getElementById('cart-total-price').textContent = formatMoney(sub - discountAmt + del);
  document.getElementById('free-del-note').textContent = rem > 0 ? 'Add ' + formatMoney(rem) + ' more for free delivery!' : '\u2756 You qualify for free delivery!';
  if (footer) footer.style.display = 'block';
  updateNavCount(cartData.item_count);
}
function drawerChangeQty(key, qty) {
  fetch('/cart/change.js', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({id: key, quantity: qty})
  }).then(function(r){ return r.json(); }).then(renderDrawerCart);
}

// Add-to-cart form interception is handled by cart-pincode.js
// Cart drawer only opens when clicking the cart icon

// ── PRODUCT CARD ──
function productCardHTML(p) {
  const inWish = wishlist.includes(p.id);
  return `<div class="product-card" onclick="openProduct(${p.id})">
    <div class="product-img-wrap">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      ${p.badge ? '<div class="product-badge">'+p.badge+'</div>' : ''}
      <div class="product-actions">
        <button class="action-btn ${inWish?'wishlisted':''}" onclick="event.stopPropagation();toggleWishlist(${p.id})">${inWish?'<svg width="14" height="14" style="display:inline-block;vertical-align:middle"><use href="#ico-heart-fill"/></svg>':'<svg width="14" height="14" style="display:inline-block;vertical-align:middle"><use href="#ico-heart"/></svg>'}</button>
      </div>
    </div>
    <div class="product-body">
      <div class="product-cat-tag">${p.cat}</div>
      <div class="product-name">${p.name.replace('Ready To Eat ','')}</div>
      <div class="product-desc">${p.desc}</div>
      <div class="product-footer">
        <div><div class="price-old">₹${p.oldPrice}</div><div class="price-new">₹${p.price}</div></div>
        <button class="add-cart-btn" onclick="event.stopPropagation();addToCart(${p.id})">+ Add</button>
      </div>
    </div>
  </div>`;
}

// ── HOME ──


// ── SHOP ──

function renderFilterChips() {
  const el = document.getElementById('filter-chips');
  if(!el) return;
  ['All','Gujarati','North Indian','Popular','Top Rated','New Arrivals'].forEach(f => {
    const d = document.createElement('button');
    d.className = 'filter-chip' + (activeFilter===f?' active':'');
    d.textContent = f;
    d.onclick = () => { activeFilter=f; renderShop(); };
    el.appendChild(d);
  });
}

// ── CART ──
function saveCart() { localStorage.setItem('tk_cart',JSON.stringify(cart)); updateCartBadge(); }
function addToCart(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  const ex = cart.find(x=>x.id===id);
  if(ex) ex.qty++; else cart.push({...p,qty:1});
  saveCart(); showToast('Added to cart','success'); renderCartDrawer();
}
function removeFromCart(id) { cart=cart.filter(x=>x.id!==id); saveCart(); renderCartDrawer(); }
function changeQty(id,delta) {
  const item = cart.find(x=>x.id===id);
  if(!item) return;
  item.qty+=delta;
  if(item.qty<=0){removeFromCart(id);return;}
  saveCart(); renderCartDrawer();
}
function updateCartBadge() { document.getElementById('cart-count').textContent=cart.reduce((s,x)=>s+x.qty,0); }
function openCart() { renderCartDrawer(); document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); }
function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); }
function renderCartDrawer() {
  const list=document.getElementById('cart-items-list'), footer=document.getElementById('cart-footer');
  if(cart.length===0){list.innerHTML='<div class="cart-empty"><div class="cart-empty-icon"><svg width="40" height="40" style="display:inline-block;vertical-align:middle;color:var(--muted,#7A7A99);margin-bottom:8px"><use href="#ico-cart"/></svg></div><div style="font-weight:600;margin-bottom:6px;color:var(--royal-dark)">Your cart is empty</div><div style="font-size:.8rem;color:var(--muted)">Add some delicious items to get started!</div></div>';footer.style.display='none';return;}
  list.innerHTML=cart.map(item=>`<div class="cart-item"><img class="cart-item-img" src="${item.img}" alt="${item.name}"/><div class="cart-item-info"><div class="cart-item-name">${item.name.replace('Ready To Eat ','')}</div><div class="cart-item-price">₹${item.price}</div><div class="cart-qty"><button class="qty-btn" onclick="changeQty(${item.id},-1)">−</button><span class="qty-num">${item.qty}</span><button class="qty-btn" onclick="changeQty(${item.id},1)">+</button></div></div><button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button></div>`).join('');
  footer.style.display='block';
  renderCartProgress();
  const sub=cart.reduce((s,x)=>s+x.price*x.qty,0), delivery=sub>=500?0:60;
  document.getElementById('cart-subtotal').textContent='₹'+sub;
  document.getElementById('cart-delivery').textContent=delivery===0?'FREE':'₹'+delivery;
  document.getElementById('cart-total-price').textContent='₹'+(sub+delivery);
  document.getElementById('free-del-note').textContent=sub<500?'Add ₹'+(500-sub)+' more for free delivery!':'✦ You qualify for free delivery!';
}
function goCheckout() { if(!cart.length){showToast('Your cart is empty!');return;} closeCart(); showPage('checkout'); }

// ── WISHLIST ──
function saveWishlist() { localStorage.setItem('tk_wishlist',JSON.stringify(wishlist)); document.getElementById('wishlist-count').textContent=wishlist.length; }
function toggleWishlist(id) {
  if(wishlist.includes(id)){wishlist=wishlist.filter(x=>x!==id);showToast('Removed from wishlist');}
  else{wishlist.push(id);showToast('Added to wishlist','success');}
  saveWishlist(); renderShop(); renderWishlist();
}


// ── CHECKOUT ──

function updateSummary() {
  const sub=cart.reduce((s,x)=>s+x.price*x.qty,0), delivery=sub>=500?0:60;
  const discount=couponApplied?Math.round(sub*.1):0, total=sub+delivery-discount;
  document.getElementById('summary-subtotal').textContent='₹'+sub;
  document.getElementById('summary-delivery').textContent=delivery===0?'FREE':'₹'+delivery;
  document.getElementById('summary-total').textContent='₹'+total;
  const dr=document.getElementById('discount-row');
  if(couponApplied){dr.style.display='flex';document.getElementById('summary-discount').textContent='-₹'+discount;}
  else dr.style.display='none';
}
function applyCoupon() {
  const code=document.getElementById('coupon-input').value.trim().toUpperCase(), msg=document.getElementById('coupon-msg');
  if(code==='THAKAR10'){couponApplied=true;msg.className='coupon-msg success';msg.textContent='Coupon applied — 10% discount added.';updateSummary();}
  else{couponApplied=false;msg.className='coupon-msg error';msg.textContent='Invalid code. Please try THAKAR10';updateSummary();}
}
function placeOrder() {
  const fname=document.getElementById('c-fname').value.trim(), lname=document.getElementById('c-lname').value.trim();
  const email=document.getElementById('c-email').value.trim(), phone=document.getElementById('c-phone').value.trim();
  const addr1=document.getElementById('c-addr1').value.trim(), city=document.getElementById('c-city').value.trim();
  const state=document.getElementById('c-state').value, pin=document.getElementById('c-pin').value.trim();
  const payment=document.getElementById('c-payment').value;
  if(!fname||!lname||!email||!phone||!addr1||!city||!state||!pin||!payment){showToast('Please fill in all required fields!');return;}
  if(!email.includes('@')){showToast('Please enter a valid email!');return;}
  if(!cart.length){showToast('Your cart is empty!');return;}
  const orderId='TK-'+Math.floor(100000+Math.random()*900000);
  const sub=cart.reduce((s,x)=>s+x.price*x.qty,0), delivery=sub>=500?0:60;
  const discount=couponApplied?Math.round(sub*.1):0, total=sub+delivery-discount;
  const orderData={id:orderId,customer:{fname,lname,email,phone,addr1,city,state,pin,payment},items:[...cart],sub,delivery,discount,total,date:new Date().toISOString(),status:'Processing'};
  orders.push(orderData); localStorage.setItem('tk_orders',JSON.stringify(orders));
  const itemList=cart.map(i=>`${i.name} x${i.qty} = Rs.${i.price*i.qty}`).join('%0A');
  const mailBody=`New Order: ${orderId}%0ACustomer: ${fname} ${lname}%0AEmail: ${email}%0APhone: ${phone}%0AAddress: ${addr1}, ${city}, ${state} - ${pin}%0APayment: ${payment}%0A%0AItems:%0A${itemList}%0A%0ATotal: Rs.${total}`;
  window.open(`mailto:orders@thakarkitchen.com?subject=New Order ${orderId}&body=${mailBody}`,'_blank');
  cart=[]; saveCart(); couponApplied=false;
  document.getElementById('confirm-order-id').textContent=orderId;
  document.getElementById('track-input').value=orderId;
  showPage('confirm');
}

// ── TRACKING ──
function trackOrder() {
  const id=document.getElementById('track-input').value.trim().toUpperCase();
  const result=document.getElementById('tracking-result');
  result.style.display='block';
  const order=orders.find(o=>o.id===id);
  if(!order){result.innerHTML='<div class="tracking-result-wrap"><div style="text-align:center;padding:40px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px"><svg width="40" height="40" style="display:inline-block;vertical-align:middle;color:var(--muted)"><use href="#ico-search"/></svg></div><div style="font-weight:600;font-size:1rem;margin-bottom:8px">Order not found</div><div style="font-size:.85rem">Please check your Order ID and try again.</div></div></div>';return;}
  const statusLevel={Processing:0,Confirmed:1,Shipped:2,Delivered:3}[order.status]||0;
  const steps=[{title:'Order Placed',date:new Date(order.date).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})},{title:'Order Confirmed',date:'Pending'},{title:'Out for Delivery',date:'Pending'},{title:'Delivered',date:'Pending'}];
  const badge=order.status==='Delivered'?'delivered':order.status==='Shipped'?'shipped':'processing';
  result.innerHTML=`<div class="tracking-result-wrap"><div class="track-header"><div><div class="track-order-id">${order.id}</div><div style="font-size:.8rem;color:var(--muted);margin-top:4px">${order.items.length} item(s) · ₹${order.total}</div></div><div class="track-status-badge ${badge}">${order.status}</div></div><div class="track-steps">${steps.map((s,i)=>`<div class="track-step ${i<statusLevel?'done':i===statusLevel?'active':'pending'}"><div class="track-step-title">${s.title}</div><div class="track-step-date">${i===0?s.date:s.date}</div></div>`).join('')}</div></div>`;
}

// ── CONTACT ──
function sendContactForm() {
  const name=document.getElementById('ct-name').value.trim(), email=document.getElementById('ct-email').value.trim();
  const subject=document.getElementById('ct-subject').value, msg=document.getElementById('ct-message').value.trim();
  if(!name||!email||!subject||!msg){showToast('Please fill in all fields!');return;}
  if(!email.includes('@')){showToast('Please enter a valid email!');return;}
  const bodyLines=msg.split(String.fromCharCode(10)).join('%0A');const mailBody=`From: ${name} (${email})%0ASubject: ${subject}%0A%0AMessage:%0A${bodyLines}`;
  window.open(`mailto:support@thakarkitchen.com?subject=[${subject}] from ${name}&body=${mailBody}`,'_blank');
  document.getElementById('contact-success').classList.add('show');
  ['ct-name','ct-email','ct-message'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ct-subject').value='';
}

// ── PRODUCT DETAIL ──
function openProduct(id) {
  const p=PRODUCTS.find(x=>x.id===id);
  if(!p) return;
  currentProductId=id; detailQty=1;
  document.getElementById('product-breadcrumb-name').textContent=p.name;
  document.getElementById('product-detail-cat').textContent=p.cat;
  document.getElementById('product-detail-name').textContent=p.name;
  const weight=p.weight||'300g', flavour=p.flavour||'Authentic Indian';
  document.getElementById('pd-pills').innerHTML=`<span class="pd-pill pd-pill-weight"><svg width="14" height="14" style="display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:4px;vertical-align:middle"><use href="#ico-scale"/></svg> ${weight}</span><span class="pd-pill pd-pill-flavour"><svg width="14" height="14" style="display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:4px;vertical-align:middle"><use href="#ico-chili"/></svg> ${flavour}</span><span class="pd-pill pd-pill-veg"><svg width="14" height="14" style="display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:4px;vertical-align:middle;color:green"><use href="#ico-veg"/></svg> 100% Veg</span>`;
  document.getElementById('product-detail-old').textContent='₹'+p.oldPrice;
  document.getElementById('product-detail-new').textContent='₹'+p.price;
  const savings=Math.round((1-p.price/p.oldPrice)*100);
  document.getElementById('product-detail-savings').textContent='Save '+savings+'%';
  document.getElementById('gallery-badge').textContent=p.badge||('-'+savings+'%');
  document.getElementById('product-detail-sku').textContent=p.sku||'TK-'+p.id;
  const imgs=p.imgs||[p.img];
  document.getElementById('gallery-main-img').src=imgs[0];
  document.getElementById('gallery-main-img').alt=p.name;
  document.getElementById('gallery-thumbs').innerHTML=imgs.map((src,i)=>`<img class="gallery-thumb ${i===0?'active':''}" src="${src}" alt="${p.name}" onclick="switchGalleryImg('${src}',this)"/>`).join('');
  document.getElementById('detail-qty-num').textContent=detailQty;
  document.getElementById('detail-add-cart-btn').onclick=()=>{for(let i=0;i<detailQty;i++) addToCart(id);};
  updateDetailWishlistBtn();
  const descExtra=p.descExtra||`Each pack contains <strong>${weight}</strong> of freshly prepared, hygienically sealed ${p.name.replace('Ready To Eat ','')}. The flavour is <strong>${flavour}</strong> — wholesome, authentic, and made without any preservatives.`;
  const highlights=p.highlights||[{icon:"<svg width='20' height='20' style='color:var(--gold)'><use href='#ico-scale'/></svg>",title:"Pack Size",desc:weight+" — enough for 1–2 servings"},{icon:"<svg width='20' height='20' style='color:var(--gold)'><use href='#ico-chili'/></svg>",title:"Flavour Profile",desc:flavour},{icon:"<svg width='20' height='20' style='color:green'><use href='#ico-leaf'/></svg>",title:"No Preservatives",desc:"Made fresh, sealed hygienically"},{icon:"<svg width=\"28\" height=\"28\" style=\"color:var(--gold)\"><use href=\"#ico-bowl\"/></svg>",title:"Serves",desc:"1–2 people"}];
  document.getElementById('pd-desc-grid').innerHTML=`<div class="pd-desc-text"><h2>${p.name}</h2><p>${p.desc}</p><p>${descExtra}</p></div><div class="pd-desc-highlights">${highlights.map(h=>`<div class="pd-highlight-card"><div class="pd-highlight-icon">${h.icon}</div><div><div class="pd-highlight-title">${h.title}</div><div class="pd-highlight-desc">${h.desc}</div></div></div>`).join('')}</div>`;
  const mSteps=p.microwaveSteps||[{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--royal)\"><use href=\"#ico-box\"/></svg>",title:"Open the Pack",desc:"Transfer contents into a microwave-safe bowl."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--royal)\"><use href=\"#ico-microwave\"/></svg>",title:"Microwave on High",desc:"Heat for 2–3 minutes until piping hot."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--gold)\"><use href=\"#ico-spoon\"/></svg>",title:"Stir & Check",desc:"Give it a stir. Heat 30 more sec if needed."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--gold)\"><use href=\"#ico-bowl\"/></svg>",title:"Serve Hot",desc:"Enjoy with roti, naan, or steamed rice."}];
  const sSteps=p.stovetopSteps||[{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--royal)\"><use href=\"#ico-jar\"/></svg>",title:"Keep Pouch Sealed",desc:"Do not open the pouch before heating."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--gold)\"><use href=\"#ico-flame\"/></svg>",title:"Boil Water",desc:"Place sealed pouch in a saucepan of boiling water."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--royal)\"><use href=\"#ico-timer\"/></svg>",title:"Heat for 3–5 Min",desc:"Let it sit in hot water for 3–5 minutes."},{visual:"<svg width=\"28\" height=\"28\" style=\"color:var(--royal)\"><use href=\"#ico-scissors\"/></svg>",title:"Open & Serve",desc:"Carefully cut open and serve directly."}];
  const tip=p.servingTip||`Best served hot with <strong>roti or rice</strong>. Garnish with fresh coriander for extra flavour.`;
  document.getElementById('pd-howto-methods').innerHTML=`<div class="pd-method-card"><div class="pd-method-title"><div class="pd-method-icon-wrap microwave"><svg width="24" height="24" style="display:inline-block;vertical-align:middle;flex-shrink:0;color:var(--royal,#1B2A6B)"><use href="#ico-microwave"/></svg></div><div><div class="pd-method-name">Microwave Method</div><div class="pd-method-time">⏱ Ready in 2–3 minutes</div></div></div><div class="pd-steps">${mSteps.map((s,i)=>`<div class="pd-step"><div class="pd-step-num">${i+1}</div><div class="pd-step-content"><span class="pd-step-visual">${s.visual}</span><div class="pd-step-title">${s.title}</div><div class="pd-step-desc">${s.desc}</div></div></div>`).join('')}</div></div><div class="pd-method-card"><div class="pd-method-title"><div class="pd-method-icon-wrap stovetop"><svg width="24" height="24" style="display:inline-block;vertical-align:middle;flex-shrink:0;color:var(--gold)"><use href="#ico-flame"/></svg></div><div><div class="pd-method-name">Stovetop / Hot Water</div><div class="pd-method-time">⏱ Ready in 3–5 minutes</div></div></div><div class="pd-steps">${sSteps.map((s,i)=>`<div class="pd-step"><div class="pd-step-num">${i+1}</div><div class="pd-step-content"><span class="pd-step-visual">${s.visual}</span><div class="pd-step-title">${s.title}</div><div class="pd-step-desc">${s.desc}</div></div></div>`).join('')}</div><div class="pd-serve-tip"><span class="pd-serve-tip-icon"><svg width="20" height="20" style="display:inline-block;vertical-align:middle;flex-shrink:0;color:var(--gold,#C9960C)"><use href="#ico-bulb"/></svg></span><div class="pd-serve-tip-text"><strong>Serving Tip:</strong> ${tip}</div></div></div>`;
  document.getElementById('related-products-grid').innerHTML=PRODUCTS.filter(x=>x.cat===p.cat&&x.id!==id).slice(0,4).map(productCardHTML).join('');

  // stock badge
  const sb = getStockBadge(id);
  const sbEl = document.getElementById('pd-stock-badge');
  if(sbEl) { sbEl.className='stock-badge '+sb.cls; document.getElementById('pd-stock-text').textContent=sb.text; }

  // clear pincode
  const pr = document.getElementById('pincode-result');
  if(pr) { pr.className='pincode-result'; pr.textContent=''; }
  const pi = document.getElementById('pincode-input');
  if(pi) pi.value='';

  // reviews, ingredients, FBT, recently viewed, sticky ATC
  renderReviews(id);
  setTimeout(()=>loadSavedReviews(id), 50);
  renderIngredients(id);
  renderFBT(id);
  addToRecentlyViewed(id);
  renderRecentlyViewed(id);
  setupStickyATC(p);

  // reset tabs
  document.querySelectorAll('.pd-tab-btn').forEach((b,i)=>{b.classList.toggle('active',i===0);});
  document.querySelectorAll('.pd-tab-panel').forEach((p,i)=>{p.classList.toggle('active',i===0);});

  showPage('product');
}
function switchGalleryImg(src,el){document.getElementById('gallery-main-img').src=src;document.querySelectorAll('.gallery-thumb').forEach(t=>t.classList.remove('active'));el.classList.add('active');}
function detailQtyChange(delta){detailQty=Math.max(1,detailQty+delta);document.getElementById('detail-qty-num').textContent=detailQty;}
function detailToggleWishlist(){if(!currentProductId)return;toggleWishlist(currentProductId);updateDetailWishlistBtn();}
function updateDetailWishlistBtn(){const btn=document.getElementById('detail-wishlist-btn');if(!btn)return;const inWish=wishlist.includes(currentProductId);btn.textContent=inWish?'♥':'♡';btn.className='detail-wishlist-btn'+(inWish?' wishlisted':'');}


// ── BUNDLES DATA ──
const BUNDLES = [
  {
    id:'b1', icon:'<svg width="32" height="32" style="color:var(--gold-light)"><use href="#ico-gift"/></svg>', name:'Party Pack', tagline:'Feed the crowd, save big',
    save:15,
    items:[
      PRODUCTS.find(p=>p.id===1),
      PRODUCTS.find(p=>p.id===5),
      PRODUCTS.find(p=>p.id===16),
      PRODUCTS.find(p=>p.id===13),
      PRODUCTS.find(p=>p.id===7),
    ]
  },
  {
    id:'b2', icon:'<svg width="32" height="32" style="color:var(--gold-light)"><use href="#ico-bowl"/></svg>', name:'North Indian Thali', tagline:'Rich, bold, restaurant-style at home',
    save:12,
    items:[
      PRODUCTS.find(p=>p.id===13),
      PRODUCTS.find(p=>p.id===17),
      PRODUCTS.find(p=>p.id===16),
    ]
  },
  {
    id:'b3', icon:'<svg width="32" height="32" style="color:var(--gold-light)"><use href="#ico-flame"/></svg>', name:'Gujarati Feast', tagline:'Authentic flavours of home',
    save:12,
    items:[
      PRODUCTS.find(p=>p.id===1),
      PRODUCTS.find(p=>p.id===5),
      PRODUCTS.find(p=>p.id===10),
    ]
  },
  {
    id:'b4', icon:'<svg width="32" height="32" style="color:var(--gold-light)"><use href="#ico-award"/></svg>', name:'Student Pack', tagline:'Budget-friendly, fills you up',
    save:10,
    items:[
      PRODUCTS.find(p=>p.id===5),
      PRODUCTS.find(p=>p.id===10),
      PRODUCTS.find(p=>p.id===7),
    ]
  },
];

function renderBundles() {
  const grid = document.getElementById('bundles-grid');
  if(!grid) return;
  grid.innerHTML = BUNDLES.map(b => {
    const items = b.items.filter(Boolean);
    const origTotal = items.reduce((s,p)=>s+p.price,0);
    const discount = Math.round(origTotal * b.save / 100);
    const finalPrice = origTotal - discount;
    return `<div class="bundle-card">
      <div class="bundle-card-header">
        <div class="bundle-save-tag">Save ${b.save}%</div>
        <div class="bundle-card-icon">${b.icon}</div>
        <div class="bundle-card-name">${b.name}</div>
        <div class="bundle-card-tagline">${b.tagline}</div>
      </div>
      <div class="bundle-items">
        ${items.map(p=>`<div class="bundle-item-row">
          <img class="bundle-item-img" src="${p.img}" alt="${p.name}"/>
          <div class="bundle-item-name">${p.name.replace('Ready To Eat ','')}</div>
          <div class="bundle-item-price">₹${p.price}</div>
        </div>`).join('')}
      </div>
      <div class="bundle-footer">
        <div class="bundle-price-col">
          <div class="bundle-orig-price">₹${origTotal}</div>
          <div class="bundle-final-price">₹${finalPrice}</div>
          <div class="bundle-saving">You save ₹${discount}</div>
        </div>
        <button class="bundle-add-btn" onclick="addBundleToCart('${b.id}')">Add Bundle to Cart</button>
      </div>
    </div>`;
  }).join('');
}

function addBundleToCart(bundleId) {
  const b = BUNDLES.find(x=>x.id===bundleId);
  if(!b) return;
  b.items.filter(Boolean).forEach(p => addToCartSilent(p.id));
  showToast(b.name + ' added to cart', 'success');
  renderCartDrawer();
}

function addToCartSilent(id) {
  const p = PRODUCTS.find(x=>x.id===id);
  const ex = cart.find(x=>x.id===id);
  if(ex) ex.qty++; else cart.push({...p, qty:1});
  saveCart();
}

// ── PINCODE CHECKER ──
const SERVICEABLE_PINCODES = ['360001','360002','360003','360004','360005','363641','363642','363643','380001','380002','380006','380007','380009','382350','395001','395002','395003','400001','400002','400050','400051','400060','411001','411002','411014','411028','560001','560002','110001','110002','110011','110020','122001','201301','302001','302002','380001','390001','390002','390007'];

function checkPincode() {
  var input = document.getElementById('pincode-input');
  var res = document.getElementById('pincode-result');
  if (!input || !res) return;
  var val = input.value.replace(/\D/g,'').trim();
  if (val.length !== 6) {
    res.className = 'pincode-result err';
    res.style.display = 'block';
    res.textContent = 'Please enter a valid 6-digit pincode.';
    return;
  }
  res.style.display = 'block';
  if (typeof SERVICEABLE_PINCODES !== 'undefined' && SERVICEABLE_PINCODES.includes(val)) {
    res.className = 'pincode-result ok';
    res.textContent = '\u2713 We deliver to ' + val + ' in 3\u20134 days. Free delivery above \u20b9500.';
  } else {
    res.className = 'pincode-result ok';
    res.textContent = '\u2713 We deliver Pan-India. Delivery in 4\u20136 business days.';
  }
}
document.addEventListener('DOMContentLoaded', function() {
  var pi = document.getElementById('pincode-input');
  if (pi) { pi.addEventListener('keydown', function(e){ if(e.key==='Enter') checkPincode(); }); }
});

// ── STOCK DATA (per product) ──
const STOCK = {1:8,2:24,3:15,4:6,5:32,6:18,7:3,8:22,9:11,10:28,11:14,12:9,13:20,14:7,15:16,16:25,17:12,18:5,19:19,20:10};

function getStockBadge(id) {
  const qty = STOCK[id] || 20;
  if(qty <= 5) return {cls:'lowstock', text:`Only ${qty} left — order soon!`};
  if(qty <= 10) return {cls:'lowstock', text:`Only ${qty} left in stock`};
  return {cls:'instock', text:'In Stock — Ready to Ship'};
}

// ── REVIEWS DATA ──
const REVIEWS_DATA = {
  1:[
    {name:'Priya Shah', loc:'Ahmedabad', stars:5, text:'Tastes exactly like my maa ki undhiyu! Absolutely authentic, no compromise on flavour. Will order again!', date:'Feb 2025', verified:true},
    {name:'Kiran Mehta', loc:'Surat', stars:5, text:'Ordered for Uttarayan celebration. Everyone loved it. Fast delivery, fresh taste.', date:'Jan 2025', verified:true},
    {name:'Dhruv Patel', loc:'Pune', stars:4, text:'Very good taste, reminds me of home. Slightly less spicy than I prefer but perfect for family.', date:'Dec 2024', verified:true},
  ],
  default:[
    {name:'Rahul Sharma', loc:'Mumbai', stars:5, text:'Amazing quality, delivered on time. The taste is just like homemade. Highly recommend!', date:'Mar 2025', verified:true},
    {name:'Anjali Verma', loc:'Delhi', stars:5, text:'Ordered for my parents — they absolutely loved it. Will definitely order again!', date:'Feb 2025', verified:true},
    {name:'Suresh Nair', loc:'Bangalore', stars:4, text:'Good product, authentic taste. Packaging is excellent, no leaks. Happy with the purchase.', date:'Jan 2025', verified:true},
  ]
};

const REVIEW_BARS = [[5,82],[4,12],[3,4],[2,1],[1,1]];

function renderReviews(productId) {
  const reviews = REVIEWS_DATA[productId] || REVIEWS_DATA.default;
  const list = document.getElementById('review-list');
  if(!list) return;
  list.innerHTML = reviews.map(r => `
    <div class="review-item">
      <div class="review-top">
        <div class="review-avatar">${r.name.charAt(0)}</div>
        <div>
          <div class="review-name">${r.name} · <span style="font-weight:400;color:var(--muted)">${r.loc}</span></div>
          <div class="review-date">${r.date}</div>
        </div>
        <div class="review-stars" style="margin-left:auto">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      </div>
      <div class="review-text">"${r.text}"</div>
      ${r.verified ? '<div class="review-verified">✓ Verified Purchase</div>' : ''}
    </div>
  `).join('');
  const barsEl = document.getElementById('rv-bars');
  if(barsEl) {
    barsEl.innerHTML = REVIEW_BARS.map(([star, pct]) => `
      <div class="rbar-row">
        <span style="min-width:10px">${star}</span>
        <span style="color:var(--gold);font-size:.7rem">★</span>
        <div class="rbar-track"><div class="rbar-fill" style="width:${pct}%"></div></div>
        <span style="min-width:28px;text-align:right">${pct}%</span>
      </div>
    `).join('');
  }
}

// ── INGREDIENTS DATA ──
const INGREDIENTS_DATA = {
  1:{
    ingredients:['Surti Papdi','Raw Banana','Purple Yam (Kand)','Yam (Suran)','Sweet Potato','Groundnuts','Coconut','Fenugreek Seeds','Mustard Seeds','Asafoetida','Turmeric','Cumin','Coriander Powder','Salt','Refined Oil'],
    allergens:['Groundnuts','Sesame (may contain traces)'],
    weight:'300g', serves:'1–2', shelf:'6 months from manufacture', storage:'Store in cool, dry place. Refrigerate after opening. Use within 24 hours of opening.', certifications:['FSSAI Certified','100% Vegetarian','No Artificial Preservatives']
  },
  default:{
    ingredients:['Fresh Vegetables','Refined Oil','Onion','Tomato','Ginger-Garlic Paste','Cumin Seeds','Mustard Seeds','Turmeric','Coriander Powder','Red Chilli Powder','Garam Masala','Salt','Water'],
    allergens:['May contain traces of nuts and sesame'],
    weight:'300g', serves:'1–2', shelf:'6 months from manufacture', storage:'Store in cool, dry place. Refrigerate after opening. Use within 24 hours of opening.', certifications:['FSSAI Certified','100% Vegetarian','No Artificial Preservatives']
  }
};

function renderIngredients(productId) {
  const data = INGREDIENTS_DATA[productId] || INGREDIENTS_DATA.default;
  const grid = document.getElementById('pd-ingredients-grid');
  if(!grid) return;
  grid.innerHTML = `
    <div class="ing-block">
      <h4>Ingredients</h4>
      <div class="ing-tags">${data.ingredients.map(i=>`<span class="ing-tag">${i}</span>`).join('')}</div>
      ${data.allergens.length ? `<h4 style="margin-top:16px">Allergen Info</h4><div class="ing-tags">${data.allergens.map(a=>`<span class="ing-tag allergen-tag">⚠ ${a}</span>`).join('')}</div>` : ''}
    </div>
    <div class="ing-block">
      <h4>Pack Details</h4>
      <div class="ing-tags">
        <span class="ing-tag">⚖️ Net Weight: ${data.weight}</span>
        <span class="ing-tag"><svg width=\"14\" height=\"14\" style=\"vertical-align:middle;margin-right:3px;color:var(--gold)\"><use href=\"#ico-bowl\"/></svg> Serves: ${data.serves}</span>
      </div>
      <h4 style="margin-top:16px">Certifications</h4>
      <div class="ing-tags">${data.certifications.map(c=>`<span class="ing-tag" style="background:rgba(34,139,34,.07);border-color:rgba(34,139,34,.25);color:green">✓ ${c}</span>`).join('')}</div>
    </div>
  `;
  const shelfEl = document.getElementById('pd-shelf-info');
  if(shelfEl) {
    shelfEl.innerHTML = `
      <div class="shelf-row"><span class="shelf-icon"><svg width="20" height="20" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><use href="#ico-calendar"/></svg></span><div><div class="shelf-label">Best Before</div><div class="shelf-val">${data.shelf}</div></div></div>
      <div class="shelf-row"><span class="shelf-icon"><svg width="20" height="20" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><use href="#ico-thermo"/></svg></span><div><div class="shelf-label">Storage Instructions</div><div class="shelf-val">${data.storage}</div></div></div>
      <div class="shelf-row"><span class="shelf-icon"><svg width="20" height="20" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><use href="#ico-box"/></svg></span><div><div class="shelf-label">Packaging</div><div class="shelf-val">Hygienic sealed pouch — no preservatives added</div></div></div>
      <div class="shelf-row"><span class="shelf-icon"><svg width="20" height="20" style="display:inline-block;vertical-align:middle;flex-shrink:0;"><use href="#ico-shield"/></svg></span><div><div class="shelf-label">Quality</div><div class="shelf-val">FSSAI certified. Tested for food safety standards.</div></div></div>
    `;
  }
}

// ── FBT (Frequently Bought Together) ──
const FBT_PAIRS = {
  1:[5,10],2:[1,5],3:[1,7],4:[3,1],5:[1,10],6:[5,1],7:[5,6],8:[7,5],9:[5,10],10:[5,1],
  11:[17,16],12:[13,17],13:[17,11],14:[12,13],15:[13,17],16:[17,13],17:[16,13],18:[16,17],19:[13,17],20:[17,13]
};

function renderFBT(productId) {
  const pairs = FBT_PAIRS[productId] || [];
  const main = PRODUCTS.find(p=>p.id===productId);
  const buddies = pairs.map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  if(!main || !buddies.length) return;
  const allItems = [main, ...buddies];
  const origTotal = allItems.reduce((s,p)=>s+p.price,0);
  const bundlePrice = Math.round(origTotal * 0.9);
  const saving = origTotal - bundlePrice;
  const grid = document.getElementById('fbt-grid');
  if(!grid) return;
  grid.innerHTML = allItems.map((p,i) => `
    ${i>0 ? '<div class="fbt-plus">+</div>' : ''}
    <div class="fbt-product" onclick="openProduct(${p.id})">
      <img src="${p.img}" alt="${p.name}"/>
      <div>
        <div class="fbt-product-name">${p.name.replace('Ready To Eat ','')}</div>
        <div class="fbt-product-price">₹${p.price}</div>
      </div>
    </div>
  `).join('') + `
    <div class="fbt-total-box">
      <div class="fbt-saving-badge">Save ₹${saving}</div>
      <div class="fbt-total-label">Bundle Price</div>
      <div class="fbt-total-original">₹${origTotal}</div>
      <div class="fbt-total-price">₹${bundlePrice}</div>
      <button class="fbt-add-btn" onclick="addFBTToCart([${allItems.map(p=>p.id).join(',')}])">Add All to Cart</button>
    </div>
  `;
}

function addFBTToCart(ids) {
  ids.forEach(id => addToCartSilent(id));
  showToast('Bundle added to cart','success');
  renderCartDrawer();
}

// ── RECENTLY VIEWED ──
let recentlyViewed = JSON.parse(localStorage.getItem('tk_recent') || '[]');

function addToRecentlyViewed(id) {
  recentlyViewed = [id, ...recentlyViewed.filter(x=>x!==id)].slice(0,8);
  localStorage.setItem('tk_recent', JSON.stringify(recentlyViewed));
}

function renderRecentlyViewed(currentId) {
  const items = recentlyViewed.filter(id=>id!==currentId).map(id=>PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  const section = document.getElementById('recently-viewed-section');
  const scroll = document.getElementById('rv-scroll');
  if(!section || !scroll) return;
  if(!items.length) { section.style.display='none'; return; }
  section.style.display='block';
  scroll.innerHTML = items.map(p=>`
    <div class="rv-card" onclick="openProduct(${p.id})">
      <img src="${p.img}" alt="${p.name}" loading="lazy"/>
      <div class="rv-card-body">
        <div class="rv-card-name">${p.name.replace('Ready To Eat ','')}</div>
        <div class="rv-card-price">₹${p.price}</div>
      </div>
    </div>
  `).join('');
}

// ── STICKY ATC ──
function setupStickyATC(p) {
  const bar = document.getElementById('sticky-atc');
  const nameEl = document.getElementById('sticky-atc-name');
  const priceEl = document.getElementById('sticky-atc-price');
  const btn = document.getElementById('sticky-atc-btn');
  if(!bar || !nameEl || !priceEl || !btn) return;
  nameEl.textContent = p.name.replace('Ready To Eat ','');
  priceEl.textContent = '₹' + p.price;
  btn.onclick = () => { addToCart(p.id); };
  if(window.innerWidth <= 900) bar.style.display = 'block';
  window.addEventListener('resize', () => {
    bar.style.display = window.innerWidth <= 900 ? 'block' : 'none';
  }, {once:true});
}

// ── CART PROGRESS BAR ──
function renderCartProgress() {
  let wrap = document.getElementById('cart-progress-wrap');
  if(!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'cart-progress-wrap';
    wrap.className = 'cart-progress-wrap';
    const cartItemsList = document.getElementById('cart-items-list');
    if(cartItemsList) cartItemsList.parentNode.insertBefore(wrap, cartItemsList);
  }
  const sub = cart.reduce((s,x)=>s+x.price*x.qty, 0);
  const pct = Math.min(100, Math.round((sub/500)*100));
  const remaining = Math.max(0, 500-sub);
  wrap.innerHTML = remaining > 0
    ? `<div class="cart-progress-label"><span>Add ₹${remaining} more</span><span>for FREE delivery</span></div><div class="cart-progress-bar"><div class="cart-progress-fill" style="width:${pct}%"></div></div>`
    : `<div class="cart-progress-label" style="color:green"><span>✦ You have unlocked free delivery!</span></div><div class="cart-progress-bar"><div class="cart-progress-fill" style="width:100%"></div></div>`;
}

// ── TAB SWITCHER ──
function switchPdTab(tabId, btn) {
  document.querySelectorAll('.pd-tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.pd-tab-panel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('pdtab-'+tabId).classList.add('active');
}



// ── REVIEW MODAL ──
let selectedStars = 0;
let reviewProductId = null;

function openReviewModal() {
  reviewProductId = currentProductId;
  selectedStars = 0;
  document.getElementById('review-order-id').value = '';
  document.getElementById('review-name-input').value = '';
  document.getElementById('review-text-input').value = '';
  document.getElementById('review-verify-msg').style.display = 'none';
  document.getElementById('review-submit-msg').style.display = 'none';
  document.getElementById('review-step-1').style.display = 'block';
  document.getElementById('review-step-2').style.display = 'none';
  document.getElementById('review-step-3').style.display = 'none';
  updateStarPicker(0);
  const overlay = document.getElementById('review-modal-overlay');
  overlay.style.display = 'flex';
  // star picker events
  document.querySelectorAll('.star-pick').forEach(star => {
    star.onmouseover = () => updateStarPicker(parseInt(star.dataset.val));
    star.onmouseout = () => updateStarPicker(selectedStars);
    star.onclick = () => { selectedStars = parseInt(star.dataset.val); updateStarPicker(selectedStars); };
  });
}

function closeReviewModal() {
  document.getElementById('review-modal-overlay').style.display = 'none';
}

function updateStarPicker(val) {
  document.querySelectorAll('.star-pick').forEach(s => {
    s.style.color = parseInt(s.dataset.val) <= val ? '#C9960C' : 'rgba(0,0,0,.2)';
  });
}

function verifyReviewOrder() {
  const orderId = document.getElementById('review-order-id').value.trim().toUpperCase();
  const msg = document.getElementById('review-verify-msg');
  msg.style.display = 'block';
  if (!orderId) {
    msg.style.background = 'rgba(155,28,28,.07)';
    msg.style.color = '#9B1C1C';
    msg.style.border = '1px solid rgba(155,28,28,.2)';
    msg.textContent = 'Please enter your Order ID.';
    return;
  }
  // Check if order exists in local orders AND contains this product
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    msg.style.background = 'rgba(155,28,28,.07)';
    msg.style.color = '#9B1C1C';
    msg.style.border = '1px solid rgba(155,28,28,.2)';
    msg.textContent = 'Order not found. Please check your Order ID and try again.';
    return;
  }
  const hasProd = order.items && order.items.some(i => i.id === reviewProductId);
  if (!hasProd) {
    msg.style.background = 'rgba(155,28,28,.07)';
    msg.style.color = '#9B1C1C';
    msg.style.border = '1px solid rgba(155,28,28,.2)';
    msg.textContent = 'This product was not found in that order. Reviews are only for verified purchases.';
    return;
  }
  // Verified!
  document.getElementById('review-step-1').style.display = 'none';
  document.getElementById('review-step-2').style.display = 'block';
}

function submitReview() {
  const name = document.getElementById('review-name-input').value.trim();
  const text = document.getElementById('review-text-input').value.trim();
  const msg = document.getElementById('review-submit-msg');
  if (!selectedStars) {
    msg.style.display = 'block';
    msg.style.background = 'rgba(155,28,28,.07)';
    msg.style.color = '#9B1C1C';
    msg.style.border = '1px solid rgba(155,28,28,.2)';
    msg.textContent = 'Please select a star rating.';
    return;
  }
  if (!name || !text) {
    msg.style.display = 'block';
    msg.style.background = 'rgba(155,28,28,.07)';
    msg.style.color = '#9B1C1C';
    msg.style.border = '1px solid rgba(155,28,28,.2)';
    msg.textContent = 'Please fill in your name and review.';
    return;
  }
  // Save review to localStorage
  const allReviews = JSON.parse(localStorage.getItem('tk_reviews') || '{}');
  if (!allReviews[reviewProductId]) allReviews[reviewProductId] = [];
  allReviews[reviewProductId].unshift({
    name, stars: selectedStars, text,
    date: new Date().toLocaleDateString('en-IN', {month:'short', year:'numeric'}),
    verified: true, loc: 'India'
  });
  localStorage.setItem('tk_reviews', JSON.stringify(allReviews));
  // Show in current reviews list immediately
  const savedReview = allReviews[reviewProductId][0];
  const list = document.getElementById('review-list');
  if (list) {
    const newItem = document.createElement('div');
    newItem.className = 'review-item';
    newItem.innerHTML = `
      <div class="review-top">
        <div class="review-avatar">${savedReview.name.charAt(0)}</div>
        <div>
          <div class="review-name">${savedReview.name} · <span style="font-weight:400;color:var(--muted)">${savedReview.loc}</span></div>
          <div class="review-date">${savedReview.date}</div>
        </div>
        <div class="review-stars" style="margin-left:auto">${'★'.repeat(savedReview.stars)}${'☆'.repeat(5-savedReview.stars)}</div>
      </div>
      <div class="review-text">"${savedReview.text}"</div>
      <div class="review-verified">✓ Verified Purchase</div>
    `;
    list.insertBefore(newItem, list.firstChild);
  }
  document.getElementById('review-step-2').style.display = 'none';
  document.getElementById('review-step-3').style.display = 'block';
}

// Load saved reviews when opening a product
function loadSavedReviews(productId) {
  const allReviews = JSON.parse(localStorage.getItem('tk_reviews') || '{}');
  const saved = allReviews[productId] || [];
  if (!saved.length) return;
  const list = document.getElementById('review-list');
  if (!list) return;
  saved.forEach(r => {
    const item = document.createElement('div');
    item.className = 'review-item';
    item.innerHTML = `
      <div class="review-top">
        <div class="review-avatar">${r.name.charAt(0)}</div>
        <div>
          <div class="review-name">${r.name} · <span style="font-weight:400;color:var(--muted)">${r.loc || 'India'}</span></div>
          <div class="review-date">${r.date}</div>
        </div>
        <div class="review-stars" style="margin-left:auto">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      </div>
      <div class="review-text">"${r.text}"</div>
      <div class="review-verified">✓ Verified Purchase</div>
    `;
    list.insertBefore(item, list.firstChild);
  });
}


// ── TOAST ──
let toastTimer;
function showToast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(type==='success'?'success':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}

// ── INIT ──
document.addEventListener('DOMContentLoaded',()=>{
  updateCartBadge();
  document.getElementById('wishlist-count').textContent=wishlist.length;
  renderHome();
  const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.style.opacity='1';e.target.style.transform='translateY(0)';}});},{threshold:.08});
  document.querySelectorAll('.product-card,.why-card,.testi-card,.cat-card,.value-card,.team-card').forEach(el=>{el.style.opacity='0';el.style.transform='translateY(28px)';el.style.transition='opacity .5s ease, transform .5s ease';obs.observe(el);});
});


// ── SHOP PAGE: SEARCH ──
function runSearch() {
  var q = (document.getElementById('search-input') || {value:''}).value.toLowerCase().trim();
  var cards = document.querySelectorAll('.product-card');
  var any = false;
  cards.forEach(function(card) {
    var name = (card.dataset.name || '').toLowerCase();
    var tags = (card.dataset.tags || '').toLowerCase();
    var cat = (card.dataset.cat || '').toLowerCase();
    var show = !q || name.includes(q) || tags.includes(q) || cat.includes(q);
    card.style.display = show ? '' : 'none';
    if (show) any = true;
  });
  var noRes = document.getElementById('shop-no-results');
  if (noRes) noRes.style.display = any ? 'none' : 'block';
}

// ── SHOP PAGE: FILTER CHIPS ──
function setFilter(btn, tag) {
  // Update active chip
  document.querySelectorAll('.filter-chip').forEach(function(c) {
    c.classList.remove('active');
  });
  if (btn) btn.classList.add('active');

  var grid = document.getElementById('shop-products-grid');
  var cards = Array.from(document.querySelectorAll('#shop-products-grid .product-card'));
  var any = false;
  cards.forEach(function(card) {
    var tags = (card.dataset.tags || '').toLowerCase();
    var cat = (card.dataset.cat || '').toLowerCase();
    var name = (card.dataset.name || '').toLowerCase();
    var show = tag === 'all' || tag === 'popular' || tag === 'top rated'
      || tags.includes(tag) || cat.includes(tag) || name.includes(tag);
    card.style.display = show ? '' : 'none';
    if (show) any = true;
  });

  // Sort visible cards for Popular (by review count desc) and Top Rated (by rating desc)
  if (grid && (tag === 'popular' || tag === 'top rated')) {
    cards.filter(function(c) { return c.style.display !== 'none'; })
      .sort(function(a, b) {
        if (tag === 'popular')
          return parseInt(b.dataset.reviews || 0) - parseInt(a.dataset.reviews || 0);
        return parseFloat(b.dataset.rating || 0) - parseFloat(a.dataset.rating || 0);
      })
      .forEach(function(card) { grid.appendChild(card); });
  }

  var noRes = document.getElementById('shop-no-results');
  if (noRes) noRes.style.display = any ? 'none' : 'block';
}
