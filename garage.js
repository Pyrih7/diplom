const Garage = {
  _telInterval: null,

  async render() {
    if (!Auth.currentUser) { Router.go('auth'); return; }
    const u = Auth.currentUser;

    // User bar
    document.getElementById('user-bar').innerHTML = `
      <div>
        <div class="user-bar-name">${u.name} ${u.sname || ''}</div>
        <div class="user-bar-meta">${u.email} · ${u.role === 'master' ? 'Майстер/Адмін' : 'Клієнт'} · з ${u.createdAt}</div>
      </div>
      <button class="btn-logout" onclick="Auth.logout()">Вийти</button>`;

    document.getElementById('garage-title').textContent = 'Гараж — ' + u.name;


    await this._fetchCars();
    await this._fetchBookings();
  },

  async _fetchCars() {
    try {
      const cars = await API.request('/cars');
      const grid = document.getElementById('car-grid');
      grid.innerHTML = cars.map(c => `
        <div class="car-card">
          <div class="car-card-top">
            <div class="car-plate">${c.plate || '—'}</div>
            <div class="car-model">${c.make} ${c.model}</div>
            <div class="car-meta">${[c.year ? c.year + ' р.' : '', c.color, c.mileage ? parseInt(c.mileage).toLocaleString() + ' км' : ''].filter(Boolean).join(' · ')}</div>
            ${c.vin ? `<div class="car-meta" style="margin-top:4px">VIN: ${c.vin}</div>` : ''}
          </div>
          <div class="car-card-body">
            <div class="car-hist-title">Сервісна історія</div>
            ${(c.history && c.history.length)
          ? c.history.map(h => `
                <div class="hist-row">
                  <div class="hist-dot"></div>
                  <div style="flex:1"><div class="hist-svc">${h.svc}</div><div class="hist-date">${h.date} · ${h.master || ''}</div></div>
                  <div class="hist-price">${h.price}</div>
                </div>`).join('')
          : '<div style="font-size:13px;color:#9BA3AF;padding:8px 0">Записів ще немає</div>'}
          </div>
          <button class="btn-sm-del" onclick="Garage.deleteCar('${c.id}')" style="margin-top:10px; width:100%">Видалити авто</button>
        </div>`).join('')
        + `<button class="add-car-btn" onclick="Garage.openAddCar()">
          <svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
          <br>Додати автомобіль
        </button>`;
    } catch (err) { }
  },

  async _fetchBookings() {
    try {
      const bookings = await API.request('/bookings');
      const el = document.getElementById('my-bookings');
      if (!bookings.length) { el.innerHTML = '<div style="font-size:14px;color:#9BA3AF;padding:1rem 0">Записів ще немає</div>'; return; }
      el.innerHTML = bookings.map(b => `
        <div class="booking-row">
          <div>
            <div class="br-svc">${b.svcName}</div>
            <div class="br-meta">${b.car} · ${b.plate} · ${b.date} ${b.time} · Майстер: ${b.master}</div>
          </div>
          <div class="br-right">
            <span class="br-price">${b.price} грн</span>
            <span class="tag-status tag-planned">${b.status}</span>
            <span class="br-code">${b.code}</span>
            ${b.status === 'Заплановано' ? `<button class="btn-sm-del" onclick="Garage.cancelBooking('${b.id}')" style="margin-left: 10px;">Скасувати</button>` : ''}
          </div>
        </div>`).join('');
    } catch (err) { }
  },

  async cancelBooking(id) {
    if (!confirm('Ви впевнені, що хочете скасувати цей запис?')) return;
    try {
      await API.request('/bookings/' + id, 'DELETE');
      toast('Запис скасовано');
      this._fetchBookings(); // Refresh list
    } catch (err) { }
  },

  async deleteCar(id) {
    if (!confirm('Ви впевнені, що хочете видалити авто? Вся історія залишиться, але авто зникне з гаража.')) return;
    try {
      await API.request('/cars/' + id, 'DELETE');
      toast('Авто видалено');
      this._fetchCars(); // Refresh list
    } catch (err) { }
  },



  openAddCar() {
    if (!Auth.currentUser) { toast('Спочатку увійдіть у кабінет', true); return; }
    document.getElementById('modal-car').classList.add('open');
  },
  closeModal() {
    document.getElementById('modal-car').classList.remove('open');
    ['c-make', 'c-model', 'c-year', 'c-plate', 'c-vin', 'c-mileage', 'c-color'].forEach(id => {
      document.getElementById(id).value = '';
    });
  },
  closeModalBg(e) { if (e.target === document.getElementById('modal-car')) this.closeModal(); },

  async saveCar() {
    const make = document.getElementById('c-make').value.trim();
    const model = document.getElementById('c-model').value.trim();
    const plate = document.getElementById('c-plate').value.trim().toUpperCase();
    if (!make || !model || !plate) return toast("Марка, модель та номер — обов'язкові", true);
    
    try {
      await API.request('/cars', 'POST', {
        make, model, plate,
        year: document.getElementById('c-year').value,
        vin: document.getElementById('c-vin').value,
        mileage: document.getElementById('c-mileage').value,
        color: document.getElementById('c-color').value
      });
      toast(make + ' ' + model + ' додано до гаражу!');
      this.closeModal();
      this.render();
    } catch (err) { }
  }
};
