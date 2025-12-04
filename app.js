// --- GLOBALS & UTILS ---
window.PLACEHOLDER_IMG = 'https://placehold.co/600x400/e9ecef/94a3b8?text=Sem+Foto';
window.PLACEHOLDER_AVATAR = 'https://placehold.co/100/e9ecef/94a3b8?text=User';
window.getImg = (url) => (url && url.length > 10) ? url : window.PLACEHOLDER_IMG;
window.getAvatar = (url) => (url && url.length > 10) ? url : window.PLACEHOLDER_AVATAR;
window.handleImgError = (img) => { img.onerror = null; img.src = window.PLACEHOLDER_IMG; };
window.handleAvatarError = (img) => { img.onerror = null; img.src = window.PLACEHOLDER_AVATAR; };

// --- REGISTER SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado!', reg))
      .catch(err => console.log('Erro no Service Worker:', err));
  });
}

// --- DATABASE MOCK ---
const defaultDB = {
  currentUser: null,
  users:[
    {id:1, name:'João Silva', email:'joao@teste.com', password:'123', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'},
    {id:2, name:'Maria Oliveira', email:'maria@teste.com', password:'123', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'},
    {id:3, name:'Carlos Souza', email:'carlos@teste.com', password:'123', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'}
  ],
  items:[
    {id:1, title:'Paletes de Madeira', category:'Madeira', desc:'Cerca de 10 paletes. Retirada no centro.', volume:'10 unidades', address:'Centro, SP', ownerId:1, status:'Ativo', expiresInDays:5, image:'https://images.unsplash.com/photo-1583843608280-058616650552?auto=format&fit=crop&w=600&q=80'},
    {id:2, title:'Monitor Antigo 17"', category:'Eletrônicos', desc:'Monitor funcionando, entrada VGA.', volume:'1 unidade', address:'Vila Madalena, SP', ownerId:3, status:'Ativo', expiresInDays:12, image:'https://images.unsplash.com/photo-1551645120-d70bfe84c826?auto=format&fit=crop&w=600&q=80'},
    {id:3, title:'Retalhos de Tecido', category:'Outros', desc:'Saco com retalhos de algodão.', volume:'5kg', address:'Brás, SP', ownerId:2, status:'Negociado', expiresInDays:0, image:'https://images.unsplash.com/photo-1615655406736-b37c4d8984a7?auto=format&fit=crop&w=600&q=80'}
  ],
  proposals:[
    {id:1, itemId:1, userId:2, userName:'Maria Oliveira', type:'pay', value:20, msg:'Pago 20 reais por todos.', date:'2023-10-25', status:'pendente'}
  ],
  notifications:[
    {id:1, userId: 1, text:'Bem-vindo ao EcoLoop!', date:'Hoje'}
  ]
};

let DB = JSON.parse(localStorage.getItem('reciLocalDB')) || defaultDB;
function saveDB(){ localStorage.setItem('reciLocalDB', JSON.stringify(DB)); }

// --- DOM ELEMENTS ---
const el = id => document.getElementById(id);
let modals = {}; // Inicializado no DOMContentLoaded
let currentFilter = 'all';
let itemToDeleteId = null;
let currentItem = null;
let currentImageBase64 = null;

// --- NAVIGATION ---
window.showScreen = function(screenId){
  document.querySelectorAll('main > section').forEach(s => s.classList.add('d-none'));
  el(screenId).classList.remove('d-none');
  window.scrollTo(0,0);
  document.querySelectorAll('.nav-fixed-bottom .btn').forEach(b => {
     b.classList.remove('active'); b.classList.add('text-secondary');
  });
  const activeBtn = (id) => { const btn = el(id); if(btn) { btn.classList.add('active'); btn.classList.remove('text-secondary'); }};
  if(screenId === 'screen-list') activeBtn('navHome');
  if(screenId === 'screen-create') activeBtn('navCreate');
  if(screenId === 'screen-notifs') activeBtn('navNotifs');
  if(screenId === 'screen-myitems') activeBtn('navProfile');
}

window.switchProfileTab = function(tab){
    el('pills-selling-tab').classList.remove('active');
    el('pills-buying-tab').classList.remove('active');
    el('profile-selling-view').classList.add('d-none');
    el('profile-buying-view').classList.add('d-none');
    if(tab === 'selling'){
        el('pills-selling-tab').classList.add('active');
        el('profile-selling-view').classList.remove('d-none');
        window.renderMyItemsList();
    } else {
        el('pills-buying-tab').classList.add('active');
        el('profile-buying-view').classList.remove('d-none');
        window.renderMyOffersList();
    }
}

// --- LIST LOGIC ---
window.filterList = function(type){
   currentFilter = type;
   document.querySelectorAll('.active-filter').forEach(b => {
       b.classList.remove('btn-dark', 'active-filter'); b.classList.add('btn-outline-secondary');
   });
   if(event && event.target) { event.target.classList.remove('btn-outline-secondary'); event.target.classList.add('btn-dark', 'active-filter'); }
   renderList(el('q').value);
}

function renderList(query = ''){
  const container = el('list-results');
  container.innerHTML = '';
  const term = query.toLowerCase();
  let filtered = DB.items.filter(i => i.title.toLowerCase().includes(term) || i.category.toLowerCase().includes(term));
  if(currentFilter === 'active') filtered = filtered.filter(i => i.status === 'Ativo');
  else if(currentFilter === 'wood') filtered = filtered.filter(i => i.category === 'Madeira');
  else if(currentFilter === 'furniture') filtered = filtered.filter(i => i.category === 'Móveis');

  if(filtered.length === 0){ container.innerHTML = `<div class="col-12 text-center py-5"><div class="text-muted mb-3"><i class="fa-solid fa-basket-shopping fa-3x"></i></div><h5>Nada encontrado</h5></div>`; return; }

  filtered.forEach(item => {
      const isSold = item.status === 'Negociado';
      const owner = DB.users.find(u => u.id === item.ownerId) || {name:'User', avatar:''};
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4 fade-in';
      card.innerHTML = `
          <div class="card h-100 item-card ${isSold ? 'sold' : ''}" onclick="window.openDetail(${item.id})">
              <div class="d-flex p-3 gap-3">
                  <div class="card-thumb position-relative">
                      <img src="${window.getImg(item.image)}" onerror="window.handleImgError(this)">
                      ${isSold ? '<span class="position-absolute top-50 start-50 translate-middle badge bg-secondary">VENDIDO</span>' : ''}
                  </div>
                  <div class="d-flex flex-column justify-content-center flex-grow-1">
                      <div class="d-flex justify-content-between align-items-center mb-1">
                          <div class="d-flex align-items-center gap-2">
                              <img src="${window.getAvatar(owner.avatar)}" class="card-user-avatar" onerror="window.handleAvatarError(this)">
                              <small class="text-muted fw-semibold" style="font-size:0.75rem">${owner.name.split(' ')[0]}</small>
                          </div>
                          <span class="badge bg-light text-secondary border">${item.category}</span>
                      </div>
                      <h6 class="fw-bold mb-1 text-truncate text-dark" style="max-width: 200px;">${item.title}</h6>
                      <div class="small text-muted mb-2"><i class="fa-solid fa-location-dot me-1"></i> ${item.address}</div>
                      <div class="mt-auto pt-2 border-top"><span class="badge bg-light text-dark fw-normal border">Detalhes</span></div>
                  </div>
              </div>
          </div>
      `;
      container.appendChild(card);
  });
}

// --- DETAIL & PROPOSALS ---
window.openDetail = function(id){
  currentItem = DB.items.find(i => i.id === id);
  if(!currentItem) return;
  el('d_title').innerText = currentItem.title;
  el('d_img').src = window.getImg(currentItem.image);
  el('d_desc').innerText = currentItem.desc;
  el('d_expires').innerText = currentItem.expiresInDays;
  el('d_meta').innerHTML = `<span class="badge bg-secondary me-2">${currentItem.category}</span> <i class="fa-solid fa-cube me-1"></i> ${currentItem.volume} • <i class="fa-solid fa-map-pin me-1"></i> ${currentItem.address}`;
  
  const badge = el('d_status_badge');
  badge.innerText = currentItem.status.toUpperCase();
  badge.className = `position-absolute top-0 end-0 m-3 badge shadow-sm ${currentItem.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}`;

  const owner = DB.users.find(u => u.id === currentItem.ownerId);
  el('d_owner').innerText = owner ? owner.name : 'Desconhecido';
  el('d_owner_avatar').src = window.getAvatar(owner ? owner.avatar : '');

  const isOwner = DB.currentUser && DB.currentUser.id === currentItem.ownerId;
  const btnPropose = el('btn-propose');
  
  if(isOwner){
      btnPropose.classList.add('d-none');
      el('btn-owner-view').classList.remove('d-none');
      el('btn-owner-view').onclick = () => window.showOwnerScreen(currentItem.id);
  } else {
      btnPropose.classList.remove('d-none');
      el('btn-owner-view').classList.add('d-none');
      if(currentItem.status !== 'Ativo'){
          btnPropose.disabled = true; btnPropose.innerHTML = '<i class="fa-solid fa-ban me-2"></i> Indisponível'; btnPropose.classList.remove('btn-primary'); btnPropose.classList.add('btn-secondary');
      } else {
          btnPropose.disabled = false; btnPropose.innerHTML = '<i class="fa-solid fa-handshake me-2"></i> Tenho Interesse'; btnPropose.classList.add('btn-primary'); btnPropose.classList.remove('btn-secondary');
      }
  }
  renderPublicProposals(currentItem.id);
  window.showScreen('screen-detail');
}

function renderPublicProposals(itemId){
  const list = el('proposals-list'); list.innerHTML = '';
  const props = DB.proposals.filter(p => p.itemId === itemId);
  if(props.length === 0){ list.innerHTML = '<div class="text-center text-muted py-3 small bg-light rounded">Ninguém fez oferta ainda.</div>'; return; }
  props.forEach(p => {
      let label = p.type === 'pay' ? `Oferta R$ ${p.value}` : (p.type === 'free' ? 'Pediu Doação' : `Cobra R$ ${p.value}`);
      let statusBadge = p.status === 'aceita' ? '<span class="badge bg-success ms-2">Aceita</span>' : (p.status === 'rejeitada' ? '<span class="badge bg-danger ms-2">Recusada</span>' : '');
      const propUser = DB.users.find(u => u.id === p.userId) || {avatar:''};
      const div = document.createElement('div');
      div.className = 'd-flex align-items-center gap-3 border-bottom pb-2';
      div.innerHTML = `
          <div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width:40px;height:40px; flex-shrink:0; overflow:hidden;"><img src="${window.getAvatar(propUser.avatar)}" style="width:100%;height:100%;object-fit:cover;" onerror="window.handleAvatarError(this)"></div>
          <div class="flex-grow-1">
              <div class="d-flex justify-content-between"><span class="fw-bold small">${p.userName} ${statusBadge}</span><small class="text-muted" style="font-size:0.7rem">${p.date}</small></div>
              <div class="small text-muted text-success fw-bold">${label}</div>
          </div>`;
      list.appendChild(div);
  });
}

// --- AUTH ---
function checkAuth(){ if(!DB.currentUser){ modals.login.show(); return false; } return true; }
function updateUIAuth(){
  const authDiv = el('auth-buttons'); const menuDiv = el('user-menu-container');
  if(DB.currentUser){
      authDiv.classList.add('d-none'); menuDiv.classList.remove('d-none');
      menuDiv.innerHTML = `
          <div class="dropdown">
              <img src="${window.getAvatar(DB.currentUser.avatar)}" class="avatar dropdown-toggle" role="button" data-bs-toggle="dropdown" onerror="window.handleAvatarError(this)">
              <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                  <li class="px-3 py-1"><small class="text-muted">Olá, ${DB.currentUser.name.split(' ')[0]}</small></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="#" onclick="window.showScreen('screen-myitems')">Perfil</a></li>
                  <li><a class="dropdown-item" href="#" onclick="window.showScreen('screen-notifs')">Notificações</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger" href="#" onclick="window.logout()">Sair</a></li>
              </ul>
          </div>`;
  } else { authDiv.classList.remove('d-none'); menuDiv.classList.add('d-none'); }
}
window.logout = function(){ DB.currentUser = null; saveDB(); updateUIAuth(); renderList(); window.showScreen('screen-list'); }

// --- OWNER ACTIONS ---
window.showOwnerScreen = function(itemId){
   const item = DB.items.find(i => i.id === itemId); el('owner-item-title').innerText = item.title;
   const container = el('owner-proposals-list'); container.innerHTML = '';
   const props = DB.proposals.filter(p => p.itemId === itemId);
   if(props.length === 0){ container.innerHTML = '<div class="alert alert-info border-0 shadow-sm">Nenhuma proposta recebida ainda.</div>'; }
   else {
       props.forEach(p => {
           let actions = p.status === 'pendente' ? 
           `<div class="d-flex gap-2 justify-content-end mt-2 mt-sm-0"><button class="btn btn-sm btn-outline-danger fw-bold" onclick="window.rejectProp(${p.id})">Recusar</button><button class="btn btn-sm btn-success fw-bold" onclick="window.acceptProp(${p.id})">Aceitar</button></div>` :
           `<div class="mt-2 mt-sm-0"><span class="badge ${p.status === 'aceita' ? 'bg-success' : 'bg-danger'}">${p.status.toUpperCase()}</span></div>`;
           const div = document.createElement('div'); div.className = 'card mb-3 p-3 border-0 shadow-sm';
           div.innerHTML = `<div class="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center"><div><h6 class="fw-bold mb-0">${p.userName}</h6><div class="small text-muted mb-2">${p.date}</div><div class="mb-1 p-2 bg-light rounded text-dark">${p.msg}</div><span class="badge bg-secondary">${p.type === 'free' ? 'Retira Grátis' : 'R$ '+p.value}</span></div>${actions}</div>`;
           container.appendChild(div);
       });
   }
   el('btn-owner-back').onclick = () => window.openDetail(itemId);
   el('btn-owner-delete').onclick = () => { itemToDeleteId = itemId; modals.confirmDelete.show(); };
   window.showScreen('screen-owner');
}

window.acceptProp = function(propId){
    if(confirm('Confirmar aceite?')){
        const prop = DB.proposals.find(p => p.id === propId); const item = DB.items.find(i => i.id === prop.itemId);
        prop.status = 'aceita'; item.status = 'Negociado'; item.expiresInDays = 0;
        DB.notifications.unshift({ id: Date.now(), userId: prop.userId, text: `Sua proposta para "${item.title}" foi ACEITA!`, date: 'Agora' });
        saveDB(); window.showOwnerScreen(item.id);
    }
}
window.rejectProp = function(propId){
    if(confirm('Rejeitar proposta?')){
        const prop = DB.proposals.find(p => p.id === propId); const item = DB.items.find(i => i.id === prop.itemId);
        prop.status = 'rejeitada';
        DB.notifications.unshift({ id: Date.now(), userId: prop.userId, text: `Sua proposta para "${item.title}" foi recusada.`, date: 'Agora' });
        saveDB(); window.showOwnerScreen(item.id);
    }
}

// --- MY LISTS ---
window.renderMyItemsList = function(){
    if(!checkAuth()) return; const container = el('my-items-list'); container.innerHTML = '';
    const myItems = DB.items.filter(i => i.ownerId === DB.currentUser.id);
    if(myItems.length === 0){ container.innerHTML = '<div class="text-center p-5 text-muted">Sem anúncios.</div>'; return; }
    myItems.forEach(i => {
        const a = document.createElement('button'); a.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 border-bottom';
        a.onclick = () => window.openDetail(i.id);
        a.innerHTML = `<div class="d-flex align-items-center gap-3"><img src="${window.getImg(i.image)}" class="rounded-3" width="60" height="60" style="object-fit:cover" onerror="window.handleImgError(this)"><div class="text-start"><div class="fw-bold text-dark">${i.title}</div><small class="text-${i.status === 'Ativo' ? 'success' : 'secondary'} fw-semibold">${i.status}</small></div></div>`;
        container.appendChild(a);
    });
}
window.renderMyOffersList = function(){
    if(!checkAuth()) return; const container = el('my-offers-list'); container.innerHTML = '';
    const myProps = DB.proposals.filter(p => p.userId === DB.currentUser.id);
    if(myProps.length === 0){ container.innerHTML = '<div class="text-center p-5 text-muted">Sem ofertas.</div>'; return; }
    myProps.forEach(p => {
        const item = DB.items.find(i => i.id === p.itemId);
        const div = document.createElement('div'); div.className = 'list-group-item p-3 border-bottom';
        div.innerHTML = `<div class="d-flex justify-content-between align-items-center"><div><div class="fw-bold text-dark">${item ? item.title : 'Item Removido'}</div><small class="text-muted">Minha oferta: ${p.type === 'free' ? 'Doação' : 'R$ ' + p.value}</small></div><span class="badge bg-${p.status === 'aceita' ? 'success' : 'secondary'} p-2">${p.status.toUpperCase()}</span></div>`;
        container.appendChild(div);
    });
}

function renderNotificationsList(){
    const container = el('notifications-list'); container.innerHTML = '';
    const myNotifs = DB.currentUser ? DB.notifications.filter(n => n.userId === DB.currentUser.id) : DB.notifications.filter(n => !n.userId);
    if(myNotifs.length === 0){ container.innerHTML = '<div class="p-5 text-muted text-center">Nenhuma notificação.</div>'; }
    myNotifs.forEach(n => {
        const div = document.createElement('div'); div.className = 'list-group-item p-3 border-bottom';
        div.innerHTML = `<div class="d-flex w-100 justify-content-between align-items-center mb-1"><h6 class="mb-0 fw-bold text-primary">Aviso</h6><small class="text-muted" style="font-size:0.75rem">${n.date}</small></div><p class="mb-0 small text-dark ps-4">${n.text}</p>`;
        container.appendChild(div);
    });
    if(myNotifs.length > 0){ el('notifCountTop').innerText = myNotifs.length; el('notifCountTop').style.display = 'block'; } else { el('notifCountTop').style.display = 'none'; }
}

// --- EVENT LISTENERS (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Modais
    modals = {
      login: new bootstrap.Modal(el('modalLogin')),
      register: new bootstrap.Modal(el('modalRegister')),
      propose: new bootstrap.Modal(el('modalPropose')),
      confirmDelete: new bootstrap.Modal(el('modalConfirmDelete'))
    };

    // Upload Handler
    if(el('c_img_input')){
        el('c_img_input').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = function() {
                    currentImageBase64 = reader.result;
                    el('c_img_preview').src = currentImageBase64;
                    el('c_img_preview_container').classList.remove('d-none');
                }
                reader.readAsDataURL(file);
            }
        });
    }

    el('btn-cancel-create').onclick = () => {
        currentImageBase64 = null;
        el('c_img_preview_container').classList.add('d-none');
        window.showScreen('screen-list');
    };

    el('formCreate').addEventListener('submit', (e) => {
      e.preventDefault();
      if(!checkAuth()) return;
      const newItem = {
          id: Date.now(),
          title: el('c_title').value,
          category: el('c_category').value,
          desc: el('c_desc').value,
          volume: el('c_volume').value,
          address: el('c_address').value,
          expiresInDays: parseInt(el('c_duration').value),
          ownerId: DB.currentUser.id,
          status: 'Ativo',
          image: currentImageBase64 || 'https://images.unsplash.com/photo-1595846519845-68e298c2edd8?auto=format&fit=crop&w=600&q=80'
      };
      DB.items.unshift(newItem); saveDB();
      e.target.reset(); currentImageBase64 = null; el('c_img_preview_container').classList.add('d-none');
      alert('Item publicado!'); renderList(); window.showScreen('screen-list');
    });

    el('formLogin').addEventListener('submit', (e) => {
       e.preventDefault(); const email = el('login_email').value; const user = DB.users.find(u => u.email === email);
       if(user){ DB.currentUser = user; saveDB(); modals.login.hide(); updateUIAuth(); renderList(); alert(`Bem-vindo, ${user.name}!`); }
       else { alert('Usuário não encontrado'); }
    });

    el('formRegister').addEventListener('submit', (e) => {
       e.preventDefault();
       const newUser = { id: Date.now(), name: el('r_name').value, email: el('r_email').value, password: el('r_password').value, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${el('r_name').value}` };
       DB.users.push(newUser); DB.currentUser = newUser; saveDB(); modals.register.hide(); updateUIAuth(); alert('Conta criada!');
    });

    el('btn-propose').onclick = () => { if(checkAuth()) modals.propose.show(); };
    window.toggleValueInput = function(type){ if(type === 'free') el('div-p-value').classList.add('d-none'); else el('div-p-value').classList.remove('d-none'); }
    el('formPropose').addEventListener('submit', (e) => {
       e.preventDefault();
       const type = el('p_type').value;
       const newProp = { id: Date.now(), itemId: currentItem.id, userId: DB.currentUser.id, userName: DB.currentUser.name, type: type, value: (type==='free'?0:el('p_value').value), msg: el('p_msg').value, date: new Date().toLocaleDateString('pt-BR'), status: 'pendente' };
       DB.proposals.push(newProp);
       DB.notifications.unshift({ id: Date.now(), userId: currentItem.ownerId, text: `Nova proposta de ${DB.currentUser.name} para: ${currentItem.title}`, date: 'Agora' });
       saveDB(); modals.propose.hide(); e.target.reset(); alert('Proposta enviada!'); window.openDetail(currentItem.id);
    });
    
    el('btnConfirmDeleteAction').onclick = function() {
        if(!itemToDeleteId) return;
        DB.items = DB.items.filter(i => String(i.id) !== String(itemToDeleteId));
        DB.proposals = DB.proposals.filter(p => String(p.itemId) !== String(itemToDeleteId));
        saveDB(); modals.confirmDelete.hide(); window.renderMyItemsList(); window.showScreen('screen-myitems');
    };

    // Nav Listeners
    el('headerLogo').onclick = () => window.showScreen('screen-list');
    el('navHome').onclick = () => window.showScreen('screen-list');
    el('navCreate').onclick = () => { if(checkAuth()) window.showScreen('screen-create'); };
    el('navNotifs').onclick = () => { window.showScreen('screen-notifs'); renderNotificationsList(); };
    el('navProfile').onclick = () => { if(checkAuth()){ window.switchProfileTab('selling'); window.showScreen('screen-myitems'); }};
    el('btnPublishHeader').onclick = () => { if(checkAuth()) window.showScreen('screen-create'); };
    el('btnLogin').onclick = () => modals.login.show();
    el('btnMyItems').onclick = () => { if(checkAuth()){ window.switchProfileTab('selling'); window.showScreen('screen-myitems'); }};
    el('btnNotifications').onclick = () => { window.showScreen('screen-notifs'); renderNotificationsList(); };
    el('btn-search').onclick = () => renderList(el('q').value);
    el('q').addEventListener('keyup', (e) => { if(e.key === 'Enter') renderList(e.target.value); });

    // Init Logic
    updateUIAuth();
    renderList();
    renderNotificationsList();
});