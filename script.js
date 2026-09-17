// ================================================================
  // إعدادات لوحة التحكم — عدّلي هنا فقط، ولا تحتاجين تلمسين شيء غيره
  // ================================================================
  // 1) أنشئي جدول Google Sheets واحد، وشاركيه بخيار "Anyone with the link"
  // 2) داخل نفس الجدول أنشئي "تبويبات" (أسفل الشاشة، زر +) بهذي الأسماء بالضبط:
  //    الفيديوهات | الإعلانات | الملفات | الروابط | التقويم | الطالبات | الصور | التعليقات
  // 3) بكل تبويب، اكتبي أسماء الأعمدة بالصف الأول كما هو موضح فوق كل دالة أدناه
  // 4) خذي الـ ID من رابط الجدول: docs.google.com/spreadsheets/d/هنا_الـID/edit
  const SHEET_ID = ""; // مثال: "1AbCDeFGhIJKLmnOPQRstuVWXyz1234567890abcd"

  // (الأسهل لرفع الفيديوهات) عبّي بياناتك بمستودع GitHub هنا، وبعدها رفع فيديو = مجرد سحب الملف لمجلد videos، بدون أي خطوة ثانية
  const GH_OWNER = "Afrah-Alasmari055"; // اسم المستخدم بجيت هب
  const GH_REPO  = "madras-anashat";    // اسم المستودع
  const GH_VIDEOS_PATH = "videos";

  // رفع الفيديوهات مباشرة من الموقع (بدون GitHub) — حساب Cloudinary المجاني
  const CLOUDINARY_CLOUD = "rvfo1tc9";
  const CLOUDINARY_PRESET = "zf7g1wm5";

  async function uploadToCloudinary(file){
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`, {
      method: 'POST',
      body: fd
    });
    const data = await res.json();
    if(!data.secure_url) throw new Error('upload failed');
    return data.secure_url;
  }

  // (اختياري) لاستقبال أفكار الطالبات والتعليقات فعلياً داخل Google Form
  // أنشئي Google Form بحقلين، ثم من "..." اختاري "Get pre-filled link" لمعرفة أسماء الحقول (entry.xxxxx)
  const IDEAS_FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSdpDbdpouUfrecax1w2HiZmI6tn27H6ZJ9t5Xej0Wy1v_uXsA/formResponse",
    name: "entry.1521534158",
    value: "entry.530305733"
  };
  const COMMENTS_FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSdw2-1B0FRbXtm-qJuIEQNrdTLDYBpdBHdrBJRY7M0Scmnt8w/formResponse",
    name: "entry.801019466",
    value: "entry.1702743233"
  };

  // ===== التعليقات الحية (تظهر للجميع فوراً) + حذف خاص بك فقط =====
  const FIREBASE_DB = "https://nashat-4479d-default-rtdb.asia-southeast1.firebasedatabase.app";
  const ADMIN_PASSWORD = "Afrah055155@1"; // كلمة سرك — غيّريها هنا إذا حبيتي
  const ADMIN_HASH = "#adminlogin"; // رابطك الخاص: أضيفيه آخر رابط الموقع لتفعيل وضع الإدارة

  let isAdmin = false;

  function checkAdminMode(){
    if(localStorage.getItem('nashat_admin') === '1'){ isAdmin = true; return; }
    if(location.hash === ADMIN_HASH){
      const pass = prompt('كلمة سر الإدارة:');
      if(pass === ADMIN_PASSWORD){
        localStorage.setItem('nashat_admin', '1');
        isAdmin = true;
        alert('تم تفعيل وضع الإدارة على هذا المتصفح.');
      }
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  async function loadComments(){
    const list = document.getElementById('commentsList');
    if(!list) return;
    try{
      const res = await fetch(`${FIREBASE_DB}/comments.json`);
      const data = await res.json();
      if(!data){
        list.innerHTML = '<div class="daily-empty">لا توجد تعليقات بعد</div>';
        return;
      }
      const entries = Object.entries(data).reverse();
      list.innerHTML = entries.map(([id, c]) => `
        <div class="comment">
          <div class="name">${esc(c.name)}</div>
          <div class="txt">${esc(c.text)}</div>
          ${isAdmin ? `<button class="comment-delete" data-id="${id}">🗑 حذف</button>` : ''}
        </div>`).join('');
      if(isAdmin){
        list.querySelectorAll('.comment-delete').forEach(btn => {
          btn.addEventListener('click', async () => {
            if(!confirm('تأكيد حذف هذا التعليق؟ لا يمكن التراجع.')) return;
            await fetch(`${FIREBASE_DB}/comments/${btn.dataset.id}.json`, { method: 'DELETE' });
            btn.closest('.comment').remove();
          });
        });
      }
    }catch(e){ /* تعذر الاتصال بقاعدة البيانات */ }
  }

  async function addCommentLive(name, text){
    try{
      await fetch(`${FIREBASE_DB}/comments.json`, {
        method: 'POST',
        body: JSON.stringify({ name, text, time: Date.now() })
      });
      loadComments();
    }catch(e){ /* تعذر إرسال التعليق */ }
  }

  // visitor counter — visual count-up only, no persistence
  (function(){
    const el = document.getElementById('visitCount');
    const target = 128;
    let cur = 0;
    const step = Math.max(1, Math.round(target/40));
    const t = setInterval(()=>{
      cur += step;
      if(cur >= target){ cur = target; clearInterval(t); }
      el.textContent = cur;
    }, 30);
  })();

  function handleForm(formId, msgId, cfg, onSubmit){
    const form = document.getElementById(formId);
    const msg = document.getElementById(msgId);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const inputs = form.querySelectorAll('input, textarea');
      const name = inputs[0].value.trim();
      const value = inputs[1].value.trim();
      if(cfg) submitToGoogleForm(cfg, name, value);
      if(onSubmit) onSubmit(name, value);
      msg.style.display = 'block';
      form.reset();
    });
  }

  handleForm('ideaForm','ideaMsg', IDEAS_FORM);
  handleForm('commentForm','commentMsg', COMMENTS_FORM, addCommentLive);

  // ================================================================
  // محرك القراءة العام — يقرأ أي تبويب من الجدول حسب اسمه
  // ================================================================
  async function fetchSheetRows(tabName){
    if(!SHEET_ID) return [];
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(tabName)}`;
    const res = await fetch(url, { cache:'no-store' });
    const text = await res.text();
    const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const cols = (json.table.cols || []).map(c => (c.label || '').trim());
    return (json.table.rows || []).map(r => {
      const obj = {};
      (r.c || []).forEach((cell, i) => {
        obj[cols[i]] = (cell && cell.v !== null && cell.v !== undefined) ? String(cell.v).trim() : '';
      });
      return obj;
    }).filter(o => Object.values(o).some(v => v));
  }

  function esc(s){
    return String(s || '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // ===== فيديوهات الإذاعة اليومية — تبويب "الفيديوهات": العنوان | التاريخ | الرابط =====
  let dailyVideos = [];

  function renderDaily(){
    const grid = document.getElementById('dailyGrid');
    if(!dailyVideos.length){
      grid.innerHTML = '<div class="daily-empty">لم تُضف أي مقاطع بعد</div>';
    }else{
      grid.innerHTML = dailyVideos.slice().reverse().map(v => {
        const media = isVideoFile(v.url)
          ? `<video src="${esc(v.url)}" controls preload="metadata"></video>`
          : `<iframe src="${esc(toEmbed(v.url))}" allowfullscreen loading="lazy"></iframe>`;
        const delBtn = (isAdmin && v.id) ? `<button class="v-delete" data-id="${esc(v.id)}">🗑 حذف</button>` : '';
        return `
        <div class="daily-card">
          <div class="video-embed">${media}</div>
          <div class="meta">
            <span class="d">${esc(v.date)}</span>
            <div class="t">${esc(v.title)}</div>
            ${delBtn}
          </div>
        </div>`;
      }).join('');
    }
    if(isAdmin){
      grid.querySelectorAll('.v-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if(!confirm('حذف هذا المقطع؟ لا يمكن التراجع.')) return;
          await fetch(`${FIREBASE_DB}/dailyVideosLive/${btn.dataset.id}.json`, { method: 'DELETE' });
          loadDaily();
        });
      });
      renderDailyUploadBox(grid);
    }
  }

  function renderDailyUploadBox(grid){
    const box = document.createElement('div');
    box.className = 'daily-card daily-upload';
    box.innerHTML = `<label>
      <span class="upload-label">+ إضافة فيديو</span>
      <input type="file" accept="video/*" style="display:none">
    </label>`;
    box.querySelector('input').addEventListener('change', handleDailyVideoUpload);
    grid.prepend(box);
  }

  async function handleDailyVideoUpload(e){
    const file = e.target.files[0];
    if(!file) return;
    const title = prompt('عنوان المقطع:', '') || '';
    const date = prompt('التاريخ:', '') || '';
    const labelText = e.target.closest('label').querySelector('.upload-label');
    labelText.textContent = 'جاري الرفع...';
    try{
      const url = await uploadToCloudinary(file);
      await fetch(`${FIREBASE_DB}/dailyVideosLive.json`, {
        method: 'POST',
        body: JSON.stringify({ title, date, url, time: Date.now() })
      });
      loadDaily();
    }catch(err){
      alert('تعذر رفع الفيديو، حاولي مرة أخرى.');
      labelText.textContent = '+ إضافة فيديو';
    }
  }

  function isVideoFile(url){
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url || '');
  }

  function toEmbed(url){
    const m = (url||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return m ? 'https://www.youtube.com/embed/' + m[1] : url;
  }

  async function loadFromGithubFolder(){
    if(!GH_OWNER || !GH_REPO) return false;
    const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_VIDEOS_PATH}`);
    if(!res.ok) return false;
    const files = await res.json();
    if(!Array.isArray(files)) return false;
    const vids = files.filter(f => f.type === 'file' && isVideoFile(f.name));
    if(!vids.length) return false;
    dailyVideos = vids.map(f => {
      const base = f.name.replace(/\.[^.]+$/, '');
      const parts = base.split(' - ');
      const hasDate = parts.length > 1;
      return {
        title: hasDate ? parts.slice(1).join(' - ') : base,
        date: hasDate ? parts[0] : '',
        url: f.download_url || `${GH_VIDEOS_PATH}/${encodeURIComponent(f.name)}`
      };
    }).sort((a,b) => (a.date || a.title).localeCompare(b.date || b.title));
    return true;
  }

  // ===== فيديو النشاط (مقطع واحد) — يديره الأدمن من الموقع مباشرة =====
  async function loadIntroVideo(){
    const box = document.getElementById('introVideoBox');
    if(!box) return;
    let shown = false;
    try{
      const res = await fetch(`${FIREBASE_DB}/introVideo.json`);
      const data = await res.json();
      if(data && data.url){
        box.innerHTML = `<video src="${data.url}" controls preload="metadata" style="width:100%;height:100%;object-fit:contain;background:#000;border-radius:10px;"></video>`;
        shown = true;
      }
    }catch(e){ /* تعذر الاتصال بقاعدة البيانات */ }
    if(!shown && GH_OWNER && GH_REPO){
      try{
        const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_VIDEOS_PATH}/intro.mp4`);
        if(res.ok){
          const file = await res.json();
          const url = file.download_url || `${GH_VIDEOS_PATH}/intro.mp4`;
          box.innerHTML = `<video src="${url}" controls preload="metadata" style="width:100%;height:100%;object-fit:contain;background:#000;border-radius:10px;"></video>`;
          shown = true;
        }
      }catch(e){ /* لم يُرفع فيديو intro.mp4 بعد */ }
    }
    if(isAdmin) renderIntroAdminControls(box);
  }

  function renderIntroAdminControls(box){
    const old = document.getElementById('introAdminControls');
    if(old) old.remove();
    const controls = document.createElement('div');
    controls.id = 'introAdminControls';
    controls.style.cssText = 'text-align:center; margin-top:10px;';
    controls.innerHTML = `<label style="cursor:pointer; color:var(--gold); font-size:.85rem;">
      <span class="upload-label">📤 رفع / استبدال الفيديو</span>
      <input type="file" accept="video/*" style="display:none">
    </label>`;
    controls.querySelector('input').addEventListener('change', handleIntroUpload);
    box.after(controls);
  }

  async function handleIntroUpload(e){
    const file = e.target.files[0];
    if(!file) return;
    const labelText = e.target.closest('label').querySelector('.upload-label');
    labelText.textContent = 'جاري الرفع...';
    try{
      const url = await uploadToCloudinary(file);
      await fetch(`${FIREBASE_DB}/introVideo.json`, {
        method: 'PUT',
        body: JSON.stringify({ url, time: Date.now() })
      });
      loadIntroVideo();
    }catch(err){
      alert('تعذر رفع الفيديو، حاولي مرة أخرى.');
      labelText.textContent = '📤 رفع / استبدال الفيديو';
    }
  }

  async function loadDaily(){
    try{
      const res = await fetch(`${FIREBASE_DB}/dailyVideosLive.json`);
      const data = await res.json();
      if(data){
        dailyVideos = Object.entries(data).map(([id, v]) => ({ id, title: v.title||'', date: v.date||'', url: v.url||'' }));
        renderDaily();
        return;
      }
    }catch(e){ /* تعذر الاتصال بقاعدة البيانات */ }
    try{
      if(await loadFromGithubFolder()){ renderDaily(); return; }
    }catch(e){ /* تعذر الوصول لمجلد videos على GitHub */ }
    try{
      const rows = await fetchSheetRows('الفيديوهات');
      if(rows.length){
        dailyVideos = rows.map(r => ({ title:r['العنوان']||'', date:r['التاريخ']||'', url:r['الرابط']||'' })).filter(v=>v.title && v.url);
        renderDaily();
        return;
      }
    }catch(e){ /* تعذر الوصول لتبويب الفيديوهات */ }
    try{
      const res = await fetch('videos.json', { cache: 'no-store' });
      if(res.ok){ dailyVideos = await res.json(); }
    }catch(e){ /* الملف videos.json غير موجود بجانب هذا الملف بعد */ }
    renderDaily();
  }

  // ===== الروابط السريعة — تبويب "الروابط": التسمية | الرابط =====
  async function renderQuickLinks(){
    try{
      const rows = await fetchSheetRows('الروابط');
      if(!rows.length) return;
      const map = { 'link-quarterly':['فصلية'], 'link-weekly':['أسبوعية'], 'link-records':['سجلات'], 'link-radio':['إذاعة'] };
      rows.forEach(r=>{
        const label = r['التسمية'] || '', url = r['الرابط'] || '';
        if(!url) return;
        Object.keys(map).forEach(id=>{
          if(map[id].some(k => label.includes(k))){
            const el = document.getElementById(id);
            if(el) el.href = url;
          }
        });
      });
    }catch(e){ /* تبويب الروابط غير موجود بعد */ }
  }

  // ===== ملفات مهمة — تبويب "الملفات": الاسم | الرابط =====
  async function renderFiles(){
    try{
      const rows = await fetchSheetRows('الملفات');
      if(!rows.length) return;
      document.getElementById('filesList').innerHTML = rows.map(r =>
        `<li>${esc(r['الاسم'])} <a href="${esc(r['الرابط'])}" target="_blank" rel="noopener">تحميل</a></li>`
      ).join('');
    }catch(e){ /* تبويب الملفات غير موجود بعد */ }
  }

  async function listGithubImages(path){
    if(!GH_OWNER || !GH_REPO) return [];
    try{
      const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`);
      if(!res.ok) return [];
      const files = await res.json();
      if(!Array.isArray(files)) return [];
      return files.filter(f => f.type === 'file' && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name));
    }catch(e){ return []; }
  }

  // ===== صور برامج النشاط الثلاث — مجلد gallery/programs، بأسماء ملفات ثابتة =====
  // ارفعي بالضبط: hospitality.jpg (قطة الضيافة) | smart-hour.jpg (الساعة الذكية) | 3d.jpg (الطباعة ثلاثية الأبعاد)
  async function loadProgramPhotos(){
    const files = await listGithubImages('gallery/programs');
    if(!files.length) return;
    const map = { hospitality: 'prog-hospitality', 'smart-hour': 'prog-smart-hour', '3d': 'prog-3d' };
    files.forEach(f => {
      const base = f.name.replace(/\.[^.]+$/, '').toLowerCase();
      const cardId = map[base];
      if(!cardId) return;
      const photo = document.querySelector(`#${cardId} .prog-photo`);
      if(photo){
        photo.style.backgroundImage = `url('${f.download_url}')`;
        photo.classList.add('on');
      }
    });
  }

  // ===== إعلانات الأنشطة — تبويب "الإعلانات": العنوان | التاريخ | الصورة (رابط، اختياري) =====
  async function renderAnnouncements(){
    try{
      const rows = await fetchSheetRows('الإعلانات');
      if(!rows.length) return;
      document.getElementById('announceList').innerHTML = rows.slice().reverse().map(r => {
        const photoUrl = r['الصورة'] || '';
        const photo = photoUrl ? `<div class="a-photo" style="background-image:url('${esc(photoUrl)}')"></div>` : '';
        return `
        <div class="announce">
          ${photo}
          <div style="flex:1;">
            <span class="date">${esc(r['التاريخ'])}</span>
            <p>${esc(r['العنوان'])}</p>
          </div>
        </div>`;
      }).join('');
    }catch(e){ /* تبويب الإعلانات غير موجود بعد */ }
  }

  // ===== تقويم النشاط — تبويب "التقويم": التاريخ | المناسبة =====
  async function renderCalendar(){
    try{
      const rows = await fetchSheetRows('التقويم');
      if(!rows.length) return;
      document.getElementById('calList').innerHTML = rows.map(r =>
        `<div class="cal-item"><div class="d">${esc(r['التاريخ'])}</div><div class="t">${esc(r['المناسبة'])}</div></div>`
      ).join('');
    }catch(e){ /* تبويب التقويم غير موجود بعد */ }
  }

  // ===== الطالبات المتميزات — تبويب "الطالبات": الاسم | الصف | الإنجاز =====
  // صورة اختيارية: ارفعيها بمجلد gallery/students باسم الطالبة بالضبط (مثال: نورة العتيبي.jpg)
  async function renderStudents(){
    try{
      const rows = await fetchSheetRows('الطالبات');
      if(!rows.length) return;
      const photoFiles = await listGithubImages('gallery/students');
      const photoMap = {};
      photoFiles.forEach(f => { photoMap[f.name.replace(/\.[^.]+$/, '').trim()] = f.download_url; });
      document.getElementById('studentsGrid').innerHTML = rows.map(r => {
        const name = r['الاسم'] || '';
        const photoUrl = photoMap[name.trim()];
        const photo = photoUrl ? `<div class="student-photo" style="background-image:url('${photoUrl}')"></div>` : `<div class="ic">★</div>`;
        return `
        <div class="empty-card" style="border-style:solid;">
          ${photo}
          <div style="font-weight:700; color:var(--green-deep); margin-bottom:4px;">${esc(name)}</div>
          <div style="font-size:.85rem;">${esc(r['الصف'])}</div>
          <div style="font-size:.82rem; margin-top:6px;">${esc(r['الإنجاز'])}</div>
        </div>`;
      }).join('');
    }catch(e){ /* تبويب الطالبات غير موجود بعد */ }
  }

  // ===== صور أبرز الأنشطة — الأسهل: مجلد "gallery" على GitHub، أو تبويب "الصور": الرابط | الوصف =====
  const GH_GALLERY_PATH = "gallery";

  async function loadGalleryFromGithub(){
    if(!GH_OWNER || !GH_REPO) return false;
    const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_GALLERY_PATH}`);
    if(!res.ok) return false;
    const files = await res.json();
    if(!Array.isArray(files)) return false;
    const imgs = files.filter(f => f.type === 'file' && /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name));
    if(!imgs.length) return false;
    document.getElementById('galleryGrid').innerHTML = imgs.map(f => {
      const desc = f.name.replace(/\.[^.]+$/, '');
      return `<div class="g-item g-photo" style="background-image:url('${f.download_url || GH_GALLERY_PATH + '/' + encodeURIComponent(f.name)}')" title="${esc(desc)}"></div>`;
    }).join('');
    return true;
  }

  async function renderGallery(){
    const gotLive = await loadGalleryLive();
    if(!gotLive){
      try{
        const gotGithub = await loadGalleryFromGithub();
        if(!gotGithub){
          const rows = await fetchSheetRows('الصور');
          if(rows.length){
            document.getElementById('galleryGrid').innerHTML = rows.map(r =>
              `<div class="g-item g-photo" style="background-image:url('${esc(r['الرابط'])}')" title="${esc(r['الوصف'])}"></div>`
            ).join('');
          }
        }
      }catch(e){ /* تبويب الصور غير موجود بعد */ }
    }
    renderGalleryUploadBox();
  }

  // ===== إدارة صور المعرض مباشرة من الموقع (مثل التعليقات تماماً) — تظهر لك فقط بوضع الإدارة =====
  async function loadGalleryLive(){
    const grid = document.getElementById('galleryGrid');
    if(!grid) return false;
    try{
      const res = await fetch(`${FIREBASE_DB}/galleryPhotos.json`);
      const data = await res.json();
      if(!data) return false;
      const entries = Object.entries(data).reverse();
      grid.innerHTML = entries.map(([id, p]) => `
        <div class="g-item g-photo" style="background-image:url('${p.url}')">
          ${isAdmin ? `<button class="g-delete" data-id="${id}" title="حذف">×</button>` : ''}
        </div>`).join('');
      if(isAdmin){
        grid.querySelectorAll('.g-delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if(!confirm('حذف هذه الصورة؟ لا يمكن التراجع.')) return;
            await fetch(`${FIREBASE_DB}/galleryPhotos/${btn.dataset.id}.json`, { method: 'DELETE' });
            btn.closest('.g-item').remove();
          });
        });
      }
      return true;
    }catch(e){ return false; }
  }

  function renderGalleryUploadBox(){
    if(!isAdmin) return;
    const grid = document.getElementById('galleryGrid');
    if(!grid) return;
    const box = document.createElement('label');
    box.className = 'g-item g-upload';
    box.innerHTML = `+ إضافة صورة<input type="file" accept="image/*" style="display:none">`;
    box.querySelector('input').addEventListener('change', handleGalleryUpload);
    grid.prepend(box);
  }

  function handleGalleryUpload(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      const img = new Image();
      img.onload = function(){
        const canvas = document.createElement('canvas');
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        fetch(`${FIREBASE_DB}/galleryPhotos.json`, {
          method: 'POST',
          body: JSON.stringify({ url: dataUrl, time: Date.now() })
        }).then(() => renderGallery());
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ===== التعليقات والآراء — تبويب "التعليقات": الاسم | التعليق (تُضاف من قِبلك بعد المراجعة) =====
  function submitToGoogleForm(cfg, name, value){
    if(!cfg.action) return;
    const fd = new FormData();
    if(cfg.name) fd.append(cfg.name, name);
    if(cfg.value) fd.append(cfg.value, value);
    fetch(cfg.action, { method:'POST', mode:'no-cors', body: fd }).catch(()=>{});
  }

  checkAdminMode();
  loadDaily();
  loadIntroVideo();
  loadProgramPhotos();
  renderQuickLinks();
  renderFiles();
  renderAnnouncements();
  renderCalendar();
  renderStudents();
  renderGallery();
  loadComments();
