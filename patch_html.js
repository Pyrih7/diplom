const fs = require('fs');
const path = require('path');

let html = fs.readFileSync(path.join(__dirname,'..','frontend','index.html'),'utf8');

// 1. Add libraries in head
html = html.replace(
  '<link rel="stylesheet" href="style.css">',
  `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/uk.js"></script>`
);

// 2. Add theme toggle + notification bell before nav-cta
html = html.replace(
  '<button class="nav-cta"',
  `<button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()">🌙</button>
      <div class="notif-wrap" id="notif-wrap" style="display:none">
        <button class="notif-btn" onclick="Notif.toggle()" id="notif-bell">
          🔔<span class="notif-badge" id="notif-count" style="display:none">0</span>
        </button>
        <div class="notif-dropdown" id="notif-dropdown"></div>
      </div>
      <button class="nav-cta"`
);

// 3. Add Charts canvas in admin stats section
html = html.replace(
  '<div id="adm-orders" class="adm-panel act">',
  `<div class="charts-row">
      <div class="chart-box"><canvas id="chart-status"></canvas></div>
      <div class="chart-box"><canvas id="chart-svc"></canvas></div>
    </div>
    <div id="adm-orders" class="adm-panel act">`
);

// 4. Add print button in garage section
html = html.replace(
  '<div class="g-section-hdr">\n      Мої автомобілі',
  `<div class="g-section-hdr">
      Мої автомобілі`
);

// 5. Add admin filter bar
html = html.replace(
  '<div id="adm-orders" class="adm-panel act"></div>',
  `<div id="adm-filter" class="adm-filter-bar" style="display:none">
      <input type="text" id="adm-search" class="finput" placeholder="Пошук по клієнту або авто..." oninput="Admin.filter()" style="max-width:280px">
      <select id="adm-status-filter" class="finput" onchange="Admin.filter()" style="max-width:180px">
        <option value="">Всі статуси</option>
        <option>Заплановано</option>
        <option>В роботі</option>
        <option>Виконано</option>
        <option>Скасовано</option>
      </select>
    </div>
    <div id="adm-orders" class="adm-panel act"></div>`
);

// Show filter bar on orders tab (handled in JS)
// 6. Add contact section before footer in home page
html = html.replace(
  '<div class="cta-strip">',
  `<div id="contact-anchor" class="container section-block">
    <div class="section-label">
      <div class="eyebrow">Як нас знайти</div>
      <h2>Контакти</h2>
      <p>Ми знаходимось у Львові — зручне розташування та великий паркінг</p>
    </div>
    <div class="contact-grid">
      <div class="contact-info">
        <div class="contact-item"><span class="contact-icon">📍</span><div><b>Адреса</b><br>Львів, вул. Авто, 1</div></div>
        <div class="contact-item"><span class="contact-icon">📞</span><div><b>Телефон</b><br>+380 50 123 45 67</div></div>
        <div class="contact-item"><span class="contact-icon">✉️</span><div><b>Email</b><br>info@pyrihs.garage</div></div>
        <div class="contact-item"><span class="contact-icon">🕐</span><div><b>Режим роботи</b><br>Пн–Пт: 8:00–18:00<br>Сб: 9:00–15:00</div></div>
      </div>
      <div class="map-wrap">
        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2573.0!2d24.031!3d49.842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDnCsDUwJzMxLjIiTiAyNMKwMDEnNTEuNiJF!5e0!3m2!1suk!2sua!4v1700000000000" width="100%" height="300" style="border:0;border-radius:4px" allowfullscreen loading="lazy"></iframe>
      </div>
    </div>
  </div>
  <div class="cta-strip">`
);

fs.writeFileSync(path.join(__dirname,'..','frontend','index.html'), html);
console.log('HTML patched successfully!');
