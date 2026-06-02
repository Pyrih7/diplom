// ─── TOAST ──────────────────────────────────────────
function toast(msg, isErr = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.className = 'toast'; }, 3400);
}

// ─── SMOOTH SCROLL ──────────────────────────────────
function smoothTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── THEME ──────────────────────────────────────────
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  localStorage.setItem('pg_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
}

function initTheme() {
  if (localStorage.getItem('pg_theme') === 'dark') {
    document.body.classList.add('dark-theme');
    document.getElementById('theme-toggle').textContent = '☀️';
  }
}

// ─── NOTIFICATIONS ──────────────────────────────────
const Notif = {
  _interval: null,
  async poll() {
    if (!Auth.currentUser) return;
    try {
      const list = await API.request('/notifications');
      const unread = list.filter(n => !n.is_read);
      const countEl = document.getElementById('notif-count');
      
      if (unread.length > 0) {
        countEl.style.display = 'flex';
        countEl.textContent = unread.length;
      } else {
        countEl.style.display = 'none';
      }

      const drop = document.getElementById('notif-dropdown');
      if (!list.length) {
        drop.innerHTML = '<div style="padding: 10px; color: #999; font-size: 13px;">Немає сповіщень</div>';
      } else {
        drop.innerHTML = list.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}">
            <div style="font-size:11px;color:#999;margin-bottom:4px">${n.created_at}</div>
            ${n.message}
          </div>
        `).join('');
      }
    } catch(err) {}
  },
  
  async toggle() {
    const drop = document.getElementById('notif-dropdown');
    const isShowing = drop.classList.contains('show');
    
    if (isShowing) {
      drop.classList.remove('show');
    } else {
      drop.classList.add('show');
      if (document.getElementById('notif-count').style.display !== 'none') {
        try {
          await API.request('/notifications/read-all', 'PATCH');
          this.poll();
        } catch(err) {}
      }
    }
  },

  startPolling() {
    if (this._interval) clearInterval(this._interval);
    this.poll();
    this._interval = setInterval(() => this.poll(), 10000); // Poll every 10s
  }
};

// ─── SERVICES DATA ──────────────────────────────────
const SERVICES = [
  { id: 1, name: 'Діагностика OBD-II', price: 450,  dur: '45 хв',   bg: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=500&q=70',   svg: '<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>' },
  { id: 2, name: 'Заміна масла',       price: 550,  dur: '30 хв',   bg: 'https://images.unsplash.com/photo-1635784063388-1ff6d4f1e8f6?w=500&q=70',   svg: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>' },
  { id: 3, name: 'Ремонт гальм',       price: 1400, dur: '1.5 год', bg: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=70',   svg: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="white" stroke-width="2" fill="none"/>' },
  { id: 4, name: 'Шиномонтаж',         price: 600,  dur: '40 хв',   bg: 'https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?w=500&q=70', svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5z"/>' },
  { id: 5, name: 'Кондиціонер',        price: 800,  dur: '1 год',   bg: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=500&q=70',  svg: '<path d="M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 13H22v-2z"/>' },
  { id: 6, name: 'Розвал-сходження',   price: 700,  dur: '50 хв',   bg: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=500&q=70',  svg: '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>' },
  { id: 7, name: 'Кузовні роботи',     price: 2000, dur: '2+ год',  bg: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&q=70',  svg: '<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/>' },
  { id: 8, name: 'Електрика авто',     price: 650,  dur: '1 год',   bg: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=500&q=70',  svg: '<path d="M7 2v11h3v9l7-12h-4l4-8z"/>' },
];

const MASTERS = [
  { id: 1, name: 'Ігор Ткаченко', spec: 'OBD-II / Діагностика',  rating: 5.0, init: 'ІТ' },
  { id: 2, name: 'Олег Мартиненко', spec: 'Ходова / Гальма',      rating: 4.8, init: 'ОМ' },
  { id: 3, name: 'Василь Крупʼяк',  spec: 'Електрика / Кузов',    rating: 4.9, init: 'ВК' },
];

// ─── ROUTER ─────────────────────────────────────────
const Router = {
  go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nl').forEach(l => l.classList.remove('act'));
    const pg = document.getElementById('page-' + page);
    if (pg) pg.classList.add('active');
    const lnk = document.getElementById('link-' + page);
    if (lnk) lnk.classList.add('act');
    if (page === 'garage') Garage.render();
    if (page === 'admin')  Admin.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.printBooking = function(code) {
  // Wait a tick to ensure print styles can apply safely if doing something dynamic, 
  // but here we rely on CSS @media print handling the .adm-panel.
  // Actually, for a service card, we can isolate it or just print the page.
  // We'll rely on CSS.
  window.print();
};

// ─── INIT ────────────────────────────────────────────
window.onload = async function() {
  initTheme();

  // Restore session
  await Auth.checkSession();

  if (Auth.currentUser) {
    Notif.startPolling();
  }

  // Home service grid
  document.getElementById('home-svc-grid').innerHTML = SERVICES.map(s => `
    <div class="svc-card" style="background-image:url('${s.bg}')" onclick="Router.go('booking')">
      <div class="svc-card-body">
        <div class="svc-card-icon"><svg viewBox="0 0 24 24" fill="currentColor">${s.svg}</svg></div>
        <h3>${s.name}</h3>
        <p>${s.price} грн · ${s.dur}</p>
        <div class="svc-link">Записатись →</div>
      </div>
    </div>`).join('');

  // Init booking
  Booking.init();
  Booking.toStep(1);
};
