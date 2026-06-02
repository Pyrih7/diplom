const Admin = {
  _tab: 'orders',
  _bookings: [],
  _users: [],
  _cars: [],
  _chartStatus: null,
  _chartSvc: null,

  async render() {
    if (!Auth.currentUser || Auth.currentUser.role !== 'master') {
      toast('Доступ заборонено', true);
      Router.go('home');
      return;
    }

    try {
      const stats = await API.request('/stats');
      const users = await API.request('/users');
      const cars = await API.request('/cars?all=1');
      const bookings = await API.request('/bookings?all=1');

      this._users = users;
      this._cars = cars;
      this._bookings = bookings;

      document.getElementById('st-count').textContent = stats.totalBookings;
      document.getElementById('st-sum').textContent   = stats.totalRevenue.toLocaleString() + ' грн';
      document.getElementById('st-users').textContent = stats.totalUsers;
      document.getElementById('st-cars').textContent  = stats.totalCars;

      this.filter(); // Initial render handles by filter function
      this._renderUsers(users);
      this._renderCars(cars);
      this._renderCharts(bookings);
      this.tab(this._tab);
      
      document.getElementById('adm-filter').style.display = 'flex';
    } catch(err) { }
  },

  tab(name, btn) {
    this._tab = name;
    document.querySelectorAll('.adm-tab').forEach(b => b.classList.remove('act'));
    document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('act'));
    document.getElementById('adm-' + name).classList.add('act');
    if (btn) btn.classList.add('act');
    else {
      const tabs = document.querySelectorAll('.adm-tab');
      const idx  = ['orders','users','cars'].indexOf(name);
      if (tabs[idx]) tabs[idx].classList.add('act');
    }
  },

  filter() {
    const search = document.getElementById('adm-search').value.toLowerCase();
    const status = document.getElementById('adm-status-filter').value;

    const filtered = this._bookings.filter(b => {
      const matchesSearch = b.clientEmail.toLowerCase().includes(search) || b.plate.toLowerCase().includes(search) || b.car.toLowerCase().includes(search);
      const matchesStatus = status ? b.status === status : true;
      return matchesSearch && matchesStatus;
    });

    this._renderOrders(filtered);
  },

  _renderOrders(bookings) {
    const el = document.getElementById('adm-orders');
    if (!bookings.length) { el.innerHTML = '<p style="color:#9BA3AF;padding:1rem 0">Замовлень ще немає</p>'; return; }
    el.innerHTML = `<table>
      <tr><th>Код</th><th>Послуга</th><th>Клієнт</th><th>Авто / Номер</th><th>Дата</th><th>Майстер</th><th>Ціна</th><th>Статус</th><th>Дія</th></tr>
      ${bookings.slice().map(b => `
        <tr>
          <td><code style="color:#F5820A;font-size:11px">${b.code}</code></td>
          <td>${b.svcName}</td>
          <td style="font-size:12px">${b.clientEmail}</td>
          <td style="font-size:12px">${b.car} · ${b.plate}</td>
          <td style="font-size:12px">${b.date} ${b.time}</td>
          <td style="font-size:12px">${b.master}</td>
          <td class="td-or">${(b.price||0).toLocaleString()} грн</td>
          <td>
            <select onchange="Admin.changeStatus('${b.id}',this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #E2E8F0;background:var(--bg)">
              <option ${b.status==='Заплановано'?'selected':''}>Заплановано</option>
              <option ${b.status==='В роботі'?'selected':''}>В роботі</option>
              <option ${b.status==='Виконано'?'selected':''}>Виконано</option>
              <option ${b.status==='Скасовано'?'selected':''}>Скасовано</option>
            </select>
          </td>
          <td>
            <button class="btn-sm-ghost" onclick="window.printBooking('${b.code}')">Друк</button>
          </td>
        </tr>`).join('')}
    </table>`;
  },

  async changeStatus(id, status) {
    try {
      await API.request('/bookings/' + id + '/status', 'PATCH', { status });
      toast('Статус оновлено: ' + status);
      // Optional: re-fetch to update stats, or just optimistically update
    } catch(err) {
      this.render(); // reset on error
    }
  },

  _renderUsers(users) {
    const el = document.getElementById('adm-users');
    if (!users.length) { el.innerHTML = '<p style="color:#9BA3AF;padding:1rem 0">Клієнтів ще немає</p>'; return; }
    el.innerHTML = `<table>
      <tr><th>Ім'я</th><th>Email</th><th>Телефон</th><th>Роль</th><th>Зареєстрований</th></tr>
      ${users.map(u => `
        <tr>
          <td><b>${u.name} ${u.sname||''}</b></td>
          <td style="font-size:12px">${u.email}</td>
          <td style="font-size:12px">${u.phone||'—'}</td>
          <td>
            <select onchange="Admin.changeRole('${u.id}', this.value)" style="font-size:11px;padding:3px;font-weight:700;color:${u.role==='master'?'#F5820A':'#2E7D32'};background:var(--bg)">
              <option value="client" ${u.role === 'client' ? 'selected' : ''}>client</option>
              <option value="master" ${u.role === 'master' ? 'selected' : ''}>master</option>
            </select>
          </td>
          <td style="font-size:12px">${u.createdAt||'—'}</td>
        </tr>`).join('')}
    </table>`;
  },

  async changeRole(id, role) {
    try {
      await API.request('/users/' + id + '/role', 'PATCH', { role });
      toast('Роль оновлено на ' + role);
    } catch(err) {
      this.render();
    }
  },

  _renderCars(cars) {
    const el = document.getElementById('adm-cars');
    if (!cars.length) { el.innerHTML = '<p style="color:#9BA3AF;padding:1rem 0">Автомобілів ще немає</p>'; return; }
    el.innerHTML = `<table>
      <tr><th>Номер</th><th>Авто</th><th>Рік</th><th>VIN</th><th>Пробіг</th><th>Власник</th><th>Записів</th></tr>
      ${cars.map(c => {
        const owner = this._users.find(u => u.id === c.userId);
        return `<tr>
          <td class="td-or">${c.plate}</td>
          <td><b>${c.make} ${c.model}</b></td>
          <td>${c.year||'—'}</td>
          <td style="font-size:11px;font-family:monospace">${c.vin||'—'}</td>
          <td>${c.mileage ? parseInt(c.mileage).toLocaleString()+' км' : '—'}</td>
          <td style="font-size:12px">${owner ? owner.name+' '+owner.email : '—'}</td>
          <td style="font-weight:700;color:#F5820A">${(c.history||[]).length}</td>
        </tr>`;
      }).join('')}
    </table>`;
  },

  _renderCharts(bookings) {
    if (this._chartStatus) this._chartStatus.destroy();
    if (this._chartSvc) this._chartSvc.destroy();

    const ctxStatus = document.getElementById('chart-status');
    const ctxSvc = document.getElementById('chart-svc');
    if (!ctxStatus || !ctxSvc) return;

    const statuses = {};
    const svcs = {};
    bookings.forEach(b => {
      statuses[b.status] = (statuses[b.status] || 0) + 1;
      svcs[b.svcName] = (svcs[b.svcName] || 0) + 1;
    });

    if (Object.keys(statuses).length === 0) return; // No data

    const isDark = document.body.classList.contains('dark-theme');
    const textColor = isDark ? '#E2E8F0' : '#4A5568';
    
    if (window.Chart) {
      Chart.defaults.color = textColor;
      Chart.defaults.font.family = "'Open Sans', sans-serif";

      this._chartStatus = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statuses),
          datasets: [{
            data: Object.values(statuses),
            backgroundColor: ['#F5820A', '#2E7D32', '#1565C0', '#E53935'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Статуси замовлень' } } }
      });

      this._chartSvc = new Chart(ctxSvc, {
        type: 'bar',
        data: {
          labels: Object.keys(svcs),
          datasets: [{
            label: 'Кількість',
            data: Object.values(svcs),
            backgroundColor: '#F5820A',
            borderRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Популярні послуги' }, legend: {display: false} } }
      });
    }
  }
};
