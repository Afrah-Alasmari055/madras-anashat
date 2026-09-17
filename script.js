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

  // (اختياري) لاستقبال أفكار الطالبات والتعليقات فعلياً داخل Google Form
  // أنشئي Google Form بحقلين، ثم من "..." اختاري "Get pre-filled link" لمعرفة أسماء الحقول (entry.xxxxx)
  const IDEAS_FORM    = { action: "", name: "", value: "" }; // مثال: action: "https://docs.google.com/forms/d/e/FORM_ID/formResponse"
  const COMMENTS_FORM = {
    action: "https://docs.google.com/forms/d/e/1FAIpQLSdw2-1B0FRbXtm-qJuIEQNrdTLDYBpdBHdrBJRY7M0Scmnt8w/formResponse",
    name: "entry.801019466",
    value: "entry.1702743233"
  };

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

  function addCommentToList(name, text){
    const list = document.getElementById('commentsList');
    if(!list) return;
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `<div class="name">${esc(name)}</div><div class="txt">${esc(text)}</div>`;
    list.insertBefore(div, list.firstChild);
    div.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  handleForm('ideaForm','ideaMsg', IDEAS_FORM);
  handleForm('commentForm','commentMsg', COMMENTS_FORM, addCommentToList);

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
      return;
    }
    grid.innerHTML = dailyVideos.slice().reverse().map(v => {
      const media = isVideoFile(v.url)
        ? `<video src="${esc(v.url)}" controls preload="metadata"></video>`
        : `<iframe src="${esc(toEmbed(v.url))}" allowfullscreen loading="lazy"></iframe>`;
      return `
      <div class="daily-card">
        <div class="video-embed">${media}</div>
        <div class="meta">
          <span class="d">${esc(v.date)}</span>
          <div class="t">${esc(v.title)}</div>
        </div>
      </div>`;
    }).join('');
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

  // ===== فيديو النشاط (مقطع واحد ثابت) — ارفعي ملفاً باسم intro.mp4 داخل مجلد videos =====
  async function loadIntroVideo(){
    if(!GH_OWNER || !GH_REPO) return;
    try{
      const res = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_VIDEOS_PATH}/intro.mp4`);
      if(!res.ok) return;
      const file = await res.json();
      const url = file.download_url || `${GH_VIDEOS_PATH}/intro.mp4`;
      document.getElementById('introVideoBox').innerHTML =
        `<video src="${url}" controls preload="metadata" style="width:100%;height:100%;object-fit:contain;background:#000;border-radius:10px;"></video>`;
    }catch(e){ /* لم يُرفع فيديو intro.mp4 بعد */ }
  }

  async function loadDaily(){
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

  // ===== إعلانات الأنشطة — تبويب "الإعلانات": العنوان | التاريخ =====
  async function renderAnnouncements(){
    try{
      const rows = await fetchSheetRows('الإعلانات');
      if(!rows.length) return;
      document.getElementById('announceList').innerHTML = rows.slice().reverse().map(r => `
        <div class="announce">
          <span class="date">${esc(r['التاريخ'])}</span>
          <p>${esc(r['العنوان'])}</p>
        </div>`).join('');
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
  async function renderStudents(){
    try{
      const rows = await fetchSheetRows('الطالبات');
      if(!rows.length) return;
      document.getElementById('studentsGrid').innerHTML = rows.map(r => `
        <div class="empty-card" style="border-style:solid;">
          <div class="ic">★</div>
          <div style="font-weight:700; color:var(--green-deep); margin-bottom:4px;">${esc(r['الاسم'])}</div>
          <div style="font-size:.85rem;">${esc(r['الصف'])}</div>
          <div style="font-size:.82rem; margin-top:6px;">${esc(r['الإنجاز'])}</div>
        </div>`).join('');
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
    try{
      if(await loadGalleryFromGithub()) return;
    }catch(e){ /* تعذر الوصول لمجلد gallery على GitHub */ }
    try{
      const rows = await fetchSheetRows('الصور');
      if(!rows.length) return;
      document.getElementById('galleryGrid').innerHTML = rows.map(r =>
        `<div class="g-item g-photo" style="background-image:url('${esc(r['الرابط'])}')" title="${esc(r['الوصف'])}"></div>`
      ).join('');
    }catch(e){ /* تبويب الصور غير موجود بعد */ }
  }

  // ===== التعليقات والآراء — تبويب "التعليقات": الاسم | التعليق (تُضاف من قِبلك بعد المراجعة) =====
  async function renderComments(){
    try{
      const rows = await fetchSheetRows('التعليقات');
      if(!rows.length) return;
      document.getElementById('commentsList').innerHTML = rows.slice().reverse().map(r => `
        <div class="comment">
          <div class="name">${esc(r['الاسم'])}</div>
          <div class="txt">${esc(r['التعليق'])}</div>
        </div>`).join('');
    }catch(e){ /* تبويب التعليقات غير موجود بعد */ }
  }

  function submitToGoogleForm(cfg, name, value){
    if(!cfg.action) return;
    const fd = new FormData();
    if(cfg.name) fd.append(cfg.name, name);
    if(cfg.value) fd.append(cfg.value, value);
    fetch(cfg.action, { method:'POST', mode:'no-cors', body: fd }).catch(()=>{});
  }

  loadDaily();
  loadIntroVideo();
  renderQuickLinks();
  renderFiles();
  renderAnnouncements();
  renderCalendar();
  renderStudents();
  renderGallery();
  renderComments();
