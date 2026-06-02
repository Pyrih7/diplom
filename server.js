/* ═══════════════════════════════════════════════════════════
   PYRIH'S GARAGE — backend/server.js
   Node.js + Express + SQLite + JWT + bcrypt
   Дипломна робота · ФеІ-45 · ЛНУ ім. Івана Франка
═══════════════════════════════════════════════════════════ */
const express  = require('express');
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');

const app    = express();
const PORT   = 5500;
const SECRET = 'pyrihs_garage_jwt_secret_2026_lviv';
const FRONTEND = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND));

// ─── DATABASE ────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'garage.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, sname TEXT DEFAULT '',
    email TEXT UNIQUE NOT NULL, phone TEXT DEFAULT '',
    pass_hash TEXT NOT NULL, role TEXT DEFAULT 'client',
    created_at TEXT DEFAULT (date('now'))
  );
  CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, make TEXT NOT NULL,
    model TEXT NOT NULL, plate TEXT NOT NULL,
    year TEXT DEFAULT '', vin TEXT DEFAULT '',
    mileage TEXT DEFAULT '', color TEXT DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, svc_id INTEGER NOT NULL,
    svc_name TEXT NOT NULL, price INTEGER NOT NULL,
    master TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
    car TEXT NOT NULL, plate TEXT NOT NULL, comment TEXT DEFAULT '',
    client_id INTEGER, client_email TEXT DEFAULT '',
    status TEXT DEFAULT 'Заплановано',
    created_at TEXT DEFAULT (date('now')),
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, booking_id INTEGER NOT NULL,
    message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed admin
if (!db.prepare('SELECT id FROM users WHERE email=?').get('admin@pyrihs.garage')) {
  db.prepare(`INSERT INTO users(name,sname,email,phone,pass_hash,role) VALUES(?,?,?,?,?,?)`)
    .run('Адмін','Пиріг','admin@pyrihs.garage','+380501234567',bcrypt.hashSync('admin123',10),'master');
  console.log('✅ Admin: admin@pyrihs.garage / admin123');
}

// ─── MIDDLEWARE ──────────────────────────────────────────
const auth = (req,res,next) => {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({error:'Токен відсутній'});
  try { req.user = jwt.verify(h.replace('Bearer ',''), SECRET); next(); }
  catch { res.status(401).json({error:'Недійсний токен'}); }
};
const admin = (req,res,next) => auth(req,res,()=>{
  if (req.user.role!=='master') return res.status(403).json({error:'Доступ заборонено'});
  next();
});
const pub = u => ({id:u.id,name:u.name,sname:u.sname,email:u.email,phone:u.phone,role:u.role,createdAt:u.created_at});
const mkCode = () => 'PG-'+Math.random().toString(36).substr(2,6).toUpperCase();

// ─── AUTH ────────────────────────────────────────────────
app.post('/api/auth/register', (req,res) => {
  const {name,sname='',email,phone='',pass} = req.body;
  if (!name||!email||!pass) return res.status(400).json({error:"Заповніть ім'я, email та пароль"});
  if (pass.length<6) return res.status(400).json({error:'Пароль мінімум 6 символів'});
  const em = email.toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email=?').get(em)) return res.status(409).json({error:'Email вже використовується'});
  const roleToSet = req.body.role === 'master' ? 'master' : 'client';
  const info = db.prepare(`INSERT INTO users(name,sname,email,phone,pass_hash,role) VALUES(?,?,?,?,?,?)`)
    .run(name,sname,em,phone,bcrypt.hashSync(pass,10),roleToSet);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  const token = jwt.sign({id:user.id,email:user.email,role:user.role},SECRET,{expiresIn:'7d'});
  res.json({token,user:pub(user)});
});

app.post('/api/auth/login', (req,res) => {
  const {email,pass} = req.body;
  if (!email||!pass) return res.status(400).json({error:'Введіть email і пароль'});
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!user||!bcrypt.compareSync(pass,user.pass_hash)) return res.status(401).json({error:'Невірний email або пароль'});
  const token = jwt.sign({id:user.id,email:user.email,role:user.role},SECRET,{expiresIn:'7d'});
  res.json({token,user:pub(user)});
});

app.get('/api/auth/me', auth, (req,res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({error:'Не знайдено'});
  res.json(pub(user));
});

// ─── BOOKINGS ────────────────────────────────────────────
app.get('/api/bookings', auth, (req,res) => {
  const rows = (req.query.all === '1' && req.user.role === 'master')
    ? db.prepare('SELECT * FROM bookings ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM bookings WHERE client_id=? OR client_email=? ORDER BY id DESC').all(req.user.id,req.user.email);
  res.json(rows.map(b=>({id:b.id,code:b.code,svcId:b.svc_id,svcName:b.svc_name,price:b.price,master:b.master,date:b.date,time:b.time,car:b.car,plate:b.plate,comment:b.comment,clientId:b.client_id,clientEmail:b.client_email,status:b.status,createdAt:b.created_at})));
});

app.post('/api/bookings', (req,res) => {
  const {svcId,svcName,price,master,date,time,car,plate,comment='',clientEmail=''} = req.body;
  if (!svcId||!date||!time||!car||!plate) return res.status(400).json({error:"Заповніть всі поля"});
  let clientId=null;
  const h=req.headers['authorization'];
  if(h){try{clientId=jwt.verify(h.replace('Bearer ',''),SECRET).id;}catch{}}
  let code=mkCode();
  while(db.prepare('SELECT id FROM bookings WHERE code=?').get(code)) code=mkCode();
  db.prepare(`INSERT INTO bookings(code,svc_id,svc_name,price,master,date,time,car,plate,comment,client_id,client_email) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(code,svcId,svcName,price||0,master||'—',date,time,car,plate.toUpperCase(),comment,clientId,clientEmail);
  if(clientId){
    const up=plate.toUpperCase();
    if(!db.prepare('SELECT id FROM cars WHERE plate=? AND user_id=?').get(up,clientId)){
      const p=car.trim().split(' ');
      db.prepare(`INSERT INTO cars(user_id,make,model,plate) VALUES(?,?,?,?)`).run(clientId,p[0]||car,p.slice(1).join(' ')||'',up);
    }
  }
  const b=db.prepare('SELECT * FROM bookings WHERE code=?').get(code);
  res.json({id:b.id,code:b.code,svcName:b.svc_name,price:b.price,date:b.date,time:b.time,status:b.status});
});

app.patch('/api/bookings/:id/status', admin, (req,res) => {
  const {status} = req.body;
  if (!['Заплановано','В роботі','Виконано','Скасовано'].includes(status)) return res.status(400).json({error:'Невірний статус'});
  const b=db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  if(!b) return res.status(404).json({error:'Не знайдено'});
  db.prepare('UPDATE bookings SET status=? WHERE id=?').run(status,req.params.id);
  if(b.client_id) db.prepare('INSERT INTO notifications(user_id,booking_id,message) VALUES(?,?,?)').run(b.client_id,b.id,`Статус запису ${b.code}: ${status}`);
  res.json({ok:true,status});
});

app.delete('/api/bookings/:id', auth, (req,res) => {
  const b=db.prepare('SELECT * FROM bookings WHERE id=?').get(req.params.id);
  if(!b) return res.status(404).json({error:'Не знайдено'});
  if(req.user.role!=='master'&&b.client_id!==req.user.id) return res.status(403).json({error:'Немає прав'});
  if(b.status!=='Заплановано'&&req.user.role!=='master') return res.status(400).json({error:'Можна скасувати тільки заплановані'});
  db.prepare("UPDATE bookings SET status='Скасовано' WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

// ─── CARS ────────────────────────────────────────────────
app.get('/api/cars', auth, (req,res) => {
  const cars = (req.query.all === '1' && req.user.role === 'master')
    ? db.prepare('SELECT * FROM cars ORDER BY id DESC').all()
    : db.prepare('SELECT * FROM cars WHERE user_id=? ORDER BY id DESC').all(req.user.id);
  res.json(cars.map(c=>({
    id:c.id,userId:c.user_id,make:c.make,model:c.model,plate:c.plate,year:c.year,vin:c.vin,mileage:c.mileage,color:c.color,
    history:db.prepare(`SELECT svc_name,date,price,code,master FROM bookings WHERE plate=? ORDER BY date DESC LIMIT 20`)
      .all(c.plate).map(b=>({svc:b.svc_name,date:b.date,price:b.price+' грн',code:b.code,master:b.master}))
  })));
});

app.post('/api/cars', auth, (req,res) => {
  const {make,model,plate,year='',vin='',mileage='',color=''} = req.body;
  if(!make||!model||!plate) return res.status(400).json({error:"Марка, модель та номер — обов'язкові"});
  const up=plate.toUpperCase();
  if(db.prepare('SELECT id FROM cars WHERE plate=? AND user_id=?').get(up,req.user.id)) return res.status(409).json({error:'Авто вже додано'});
  const info=db.prepare(`INSERT INTO cars(user_id,make,model,plate,year,vin,mileage,color) VALUES(?,?,?,?,?,?,?,?)`).run(req.user.id,make,model,up,year,vin,mileage,color);
  const c=db.prepare('SELECT * FROM cars WHERE id=?').get(info.lastInsertRowid);
  res.json({id:c.id,userId:c.user_id,make:c.make,model:c.model,plate:c.plate,year:c.year,vin:c.vin,mileage:c.mileage,color:c.color,history:[]});
});

app.delete('/api/cars/:id', auth, (req,res) => {
  const c=db.prepare('SELECT * FROM cars WHERE id=?').get(req.params.id);
  if(!c) return res.status(404).json({error:'Не знайдено'});
  if(req.user.role!=='master'&&c.user_id!==req.user.id) return res.status(403).json({error:'Немає прав'});
  db.prepare('DELETE FROM cars WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// ─── USERS ───────────────────────────────────────────────
app.get('/api/users', admin, (req,res) => {
  res.json(db.prepare('SELECT * FROM users ORDER BY id DESC').all().map(pub));
});
app.patch('/api/users/:id/role', admin, (req,res) => {
  const {role}=req.body;
  if(!['client','master'].includes(role)) return res.status(400).json({error:'Невірна роль'});
  db.prepare('UPDATE users SET role=? WHERE id=?').run(role,req.params.id);
  res.json({ok:true});
});
app.delete('/api/users/:id', admin, (req,res) => {
  if(req.user.id==req.params.id) return res.status(400).json({error:'Не можна видалити себе'});
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ok:true});
});

// ─── NOTIFICATIONS ───────────────────────────────────────
app.get('/api/notifications', auth, (req,res) => {
  res.json(db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20').all(req.user.id));
});
app.patch('/api/notifications/read-all', auth, (req,res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
  res.json({ok:true});
});

// ─── STATS ───────────────────────────────────────────────
app.get('/api/stats', admin, (req,res) => {
  res.json({
    totalBookings: db.prepare('SELECT COUNT(*) as c FROM bookings').get().c,
    totalRevenue:  db.prepare("SELECT COALESCE(SUM(price),0) as s FROM bookings WHERE status='Виконано'").get().s,
    totalUsers:    db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalCars:     db.prepare('SELECT COUNT(*) as c FROM cars').get().c,
    byStatus:      db.prepare("SELECT status, COUNT(*) as c FROM bookings GROUP BY status").all(),
    bySvc:         db.prepare("SELECT svc_name, COUNT(*) as cnt, SUM(price) as rev FROM bookings GROUP BY svc_name ORDER BY rev DESC").all()
  });
});

// ─── FALLBACK ────────────────────────────────────────────
app.get('*', (_,res) => res.sendFile(path.join(FRONTEND,'index.html')));

app.listen(PORT, () => console.log(`
╔══════════════════════════════════════════╗
║   🔧  Pyrih's Garage — Server ONLINE    ║
║   http://localhost:${PORT}                 ║
╚══════════════════════════════════════════╝`));
