const Booking = {
  tmp: {},
  _currentStep: 1,

  init() {
    // Render service grid
    document.getElementById('booking-svc-grid').innerHTML = SERVICES.map(s => `
      <div class="svc-opt" id="sopt-${s.id}" onclick="Booking.selectSvc(${s.id})">
        <div class="svc-opt-icon"><svg viewBox="0 0 24 24">${s.svg}</svg></div>
        <div class="svc-opt-name">${s.name}</div>
        <div class="svc-opt-price">${s.price} грн</div>
        <div class="svc-opt-dur">${s.dur}</div>
      </div>`).join('');
  },

  selectSvc(id) {
    const s = SERVICES.find(x => x.id === id);
    this.tmp.svc = s;
    document.querySelectorAll('.svc-opt').forEach(el => el.classList.remove('sel'));
    document.getElementById('sopt-' + id).classList.add('sel');
    setTimeout(() => this.toStep(2), 300);
  },

  _renderMasters() {
    document.getElementById('master-selection').innerHTML = MASTERS.map(m => `
      <div class="master-card" id="mc-${m.id}" onclick="Booking.selectMaster(${m.id})">
        <div class="master-ava">${m.init}</div>
        <div class="master-name">${m.name}</div>
        <div class="master-spec">${m.spec}</div>
        <div class="master-stars">${'★'.repeat(Math.floor(m.rating))} ${m.rating}</div>
      </div>`).join('');
  },

  selectMaster(id) {
    const m = MASTERS.find(x => x.id === id);
    this.tmp.master = m.name;
    document.querySelectorAll('.master-card').forEach(el => el.classList.remove('sel'));
    document.getElementById('mc-' + id).classList.add('sel');
    setTimeout(() => this.toStep(3), 300);
  },

  toStep(n) {
    // Check guest fields
    const u = Auth.currentUser;
    document.getElementById('guest-fields').style.display = u ? 'none' : 'block';

    [1,2,3,4].forEach(i => {
      const el = document.getElementById('bstep-' + i);
      if (el) el.style.display = 'none';
    });
    const ok = document.getElementById('bstep-' + n);
    if (ok) ok.style.display = '';

    // Update step bar
    for (let i = 1; i <= 4; i++) {
      const sn = document.getElementById('sn' + i);
      const sd = document.getElementById('sd' + i);
      if (!sn) continue;
      sn.className = 'step-node ' + (i < n ? 'done' : i === n ? 'act' : 'off');
      const circ = sn.querySelector('.step-circ');
      if (i < n) circ.textContent = '✓'; else circ.textContent = i;
      if (sd) sd.className = 'step-dash' + (i < n ? ' done' : '');
    }

    if (n === 2) this._renderMasters();
    if (n === 4) this._buildSummary();
    this._currentStep = n;
  },

  _buildSummary() {
    const t = this.tmp;
    const u = Auth.currentUser;
    const name = u ? u.name + ' ' + (u.sname||'') : (document.getElementById('book-gname')?.value || 'Гість');
    const box = document.getElementById('booking-summary');
    box.innerHTML = [
      ['Послуга',    t.svc?.name || '—'],
      ['Майстер',    t.master || '—'],
      ['Дата',       document.getElementById('book-date')?.value || '—'],
      ['Час',        document.getElementById('book-time')?.value || '—'],
      ['Авто',       document.getElementById('book-car')?.value  || '—'],
      ['Номер',      (document.getElementById('book-plate')?.value || '—').toUpperCase()],
      ['Клієнт',     name],
    ].map(([l,v]) => `<div class="sum-row"><span class="sum-lbl">${l}</span><span class="sum-val">${v}</span></div>`).join('')
    + `<div class="sum-row sum-total"><span class="sum-lbl">Орієнтовна вартість</span><span class="sum-val">${t.svc?.price || 0} грн</span></div>`;
  },

  async confirm() {
    const date  = document.getElementById('book-date').value;
    const time  = document.getElementById('book-time').value;
    const car   = document.getElementById('book-car').value.trim();
    const plate = document.getElementById('book-plate').value.trim().toUpperCase();
    if (!date || !time || !car || !plate) return toast('Заповніть дату, час та авто', true);

    const clientEmail = Auth.currentUser ? Auth.currentUser.email : document.getElementById('book-gname')?.value || 'Гість';
    const comment = document.getElementById('book-comment').value;

    try {
      const b = await API.request('/bookings', 'POST', {
        svcId: this.tmp.svc.id,
        svcName: this.tmp.svc.name,
        price: this.tmp.svc.price,
        master: this.tmp.master,
        date, time, car, plate, comment, clientEmail
      });

      // Show success
      [1,2,3,4].forEach(i => { const el = document.getElementById('bstep-' + i); if(el) el.style.display = 'none'; });
      document.getElementById('bstep-ok').style.display = '';
      document.getElementById('success-code').textContent = b.code;
      document.getElementById('success-text').textContent = `${b.svcName} · ${b.date} о ${b.time}. Збережіть ваш код.`;
      toast('Запис підтверджено! Код: ' + b.code);
    } catch(err) {}
  },

  reset() {
    this.tmp = {};
    document.getElementById('bstep-ok').style.display = 'none';
    ['book-date','book-time','book-car','book-plate','book-comment','book-gname','book-gphone'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    this.init();
    this.toStep(1);
  }
};
