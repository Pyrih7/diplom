const Auth = {
  currentUser: null,

  setTab(mode) {
    document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('act'));
    document.querySelectorAll('.auth-block').forEach(b => b.classList.remove('act'));
    document.getElementById('tab-' + mode).classList.add('act');
    document.getElementById('form-' + mode).classList.add('act');
  },

  async register() {
    const name  = document.getElementById('r-name').value.trim();
    const sname = document.getElementById('r-sname').value.trim();
    const email = document.getElementById('r-email').value.trim().toLowerCase();
    const phone = document.getElementById('r-phone').value.trim();
    const pass  = document.getElementById('r-pass').value;
    // role assignment on registration is usually handled by backend (default 'client')
    // but the UI had a role dropdown, let's just send what we have or let backend handle it
    
    if (!name || !email || !pass) return toast('Заповніть обов\'язкові поля', true);
    if (pass.length < 6) return toast('Пароль мінімум 6 символів', true);

    try {
      const data = await API.request('/auth/register', 'POST', { name, sname, email, phone, pass });
      API.setToken(data.token);
      this.currentUser = data.user;
      toast('Акаунт створено! Ласкаво просимо, ' + name + '!');
      this._applySession(this.currentUser);
      Router.go('garage');
    } catch(err) {
      // Handled by API wrapper
    }
  },

  async login() {
    const email = document.getElementById('l-email').value.trim().toLowerCase();
    const pass  = document.getElementById('l-pass').value;

    try {
      const data = await API.request('/auth/login', 'POST', { email, pass });
      API.setToken(data.token);
      this.currentUser = data.user;
      toast('Вітаємо, ' + this.currentUser.name + '!');
      this._applySession(this.currentUser);
      Router.go('garage');
    } catch(err) {
      // Handled by API wrapper
    }
  },

  logout() {
    API.setToken(null);
    this.currentUser = null;
    const btn = document.getElementById('link-auth');
    btn.textContent = 'Увійти';
    btn.onclick = () => Router.go('auth');
    document.getElementById('link-admin').style.display = 'none';
    document.getElementById('notif-wrap').style.display = 'none';
    toast('Ви вийшли з кабінету');
    Router.go('home');
  },

  async checkSession() {
    if (!API.getToken()) return;
    try {
      this.currentUser = await API.request('/auth/me');
      this._applySession(this.currentUser);
    } catch(err) {
      this.logout();
    }
  },

  _applySession(u) {
    const btn = document.getElementById('link-auth');
    btn.textContent = u.name.split(' ')[0];
    btn.onclick = () => Router.go('garage');
    if (u.role === 'master') document.getElementById('link-admin').style.display = '';
    document.getElementById('notif-wrap').style.display = 'flex';
  }
};
