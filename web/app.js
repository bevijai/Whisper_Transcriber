(function(){
  const recordBtn = document.getElementById('recordBtn');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const fileInput = document.getElementById('fileInput');
  const statusEl = document.getElementById('status');
  const transcriptEl = document.getElementById('transcript');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const modelSelect = document.getElementById('modelSelect');
  // mode cards
  const modeCards = document.querySelectorAll('.mode-card');
  let selectedMode = 'en_en';

  function setSelectedMode(mode){
    selectedMode = mode;
    modeCards.forEach(c=>{
      if(c.dataset.mode === mode) c.classList.add('selected'); else c.classList.remove('selected');
    });
  }

  // wire card clicks and keyboard activation
  modeCards.forEach(card=>{
    card.addEventListener('click', ()=> openModePage(card.dataset.mode));
    card.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') { e.preventDefault(); openModePage(card.dataset.mode); } });
  });

  // default select first card if present
  if(modeCards.length>0) setSelectedMode(modeCards[0].dataset.mode);

  // Full-page mode UI
  const modePage = document.getElementById('modePage');

  function openModePage(mode){
    setSelectedMode(mode);
    // build page content depending on mode
    const titles = {
      en_en: 'English → English',
      lang_lang: 'Same Language',
      en_to_lang: 'English → Other',
      lang_to_en: 'Other → English',
    };
    const descs = {
      en_en: 'Transcribe speech in English to English text.',
      lang_lang: 'Transcribe speech in any language to the same language.',
      en_to_lang: 'Translate English speech into a selected language.',
      lang_to_en: 'Translate speech in another language to English.',
    };

    modePage.hidden = false;
    document.querySelector('main.container').style.display = 'none';

    modePage.innerHTML = `
      <div class="panel">
        <div class="back" id="modeBack">← Back</div>
        <div class="hero">
          <div class="left">
            <div class="big-title">${titles[mode]}</div>
            <div class="big-desc">${descs[mode]}</div>
            <div class="mode-controls">
              <label>Model</label>
              <div style="margin-bottom:0.5rem">${modelSelect.outerHTML}</div>
              <div id="mode-lang-controls"></div>
              <div style="margin-top:0.75rem">
                <label>Audio</label>
                <input id="modeFileInput" type="file" accept="audio/*" />
              </div>
              <div style="margin-top:0.75rem">
                <button id="modeRecordBtn" class="btn secondary">Start Recording</button>
                <button id="modeTranscribeBtn" class="btn primary">Transcribe</button>
                <div id="modeStatus" class="status">Idle</div>
              </div>
            </div>
          </div>
          <div class="right">
            <h3>Result</h3>
            <textarea id="modeTranscript" readonly style="width:100%;min-height:320px;border-radius:10px;padding:1rem;background:#021024;border:1px solid rgba(255,255,255,0.03);color:#e6eef6"></textarea>
            <div style="margin-top:.5rem"><button id="modeCopyBtn" class="btn small">Copy</button> <button id="modeDownloadBtn" class="btn small">Download</button></div>
          </div>
        </div>
      </div>
    `;

    // populate language controls according to rules (do not display fixed-language text)
    const langControls = document.getElementById('mode-lang-controls');
    if(mode === 'en_en'){
      // no language selects shown for fixed English->English
      langControls.innerHTML = '';
    } else if(mode === 'lang_lang'){
      // only source select; target will be same as source implicitly
      langControls.innerHTML = '<div><label>Source</label><select id="modeSrc"></select></div>';
    } else if(mode === 'en_to_lang'){
      // only target select; source is English implicitly
      langControls.innerHTML = '<div><label>Target</label><select id="modeTgt"></select></div>';
    } else if(mode === 'lang_to_en'){
      // only source select; target is English implicitly
      langControls.innerHTML = '<div><label>Source</label><select id="modeSrc"></select></div>';
    }

    // rehydrate model select inside mode page
    const modeModelSelect = modePage.querySelector('#modelSelect') || modelSelect;
    // load languages into selects
    async function loadInto(selectId){
      try{
        const resp = await fetch('/languages');
        if(!resp.ok) return;
        const langs = await resp.json();
        const sel = document.getElementById(selectId);
        if(!sel) return;
        for(const [code,name] of Object.entries(langs)){
          const o = document.createElement('option'); o.value = code; o.textContent = `${name} (${code})`; sel.appendChild(o);
        }
      }catch(e){console.warn('lang load failed', e)}
    }
    if(document.getElementById('modeSrc')) loadInto('modeSrc');
    if(document.getElementById('modeTgt')) loadInto('modeTgt');

    // wire back
    document.getElementById('modeBack').addEventListener('click', ()=>{ modePage.hidden=true; document.querySelector('main.container').style.display='block'; });

    // recording and transcribe handlers
    let mMediaRecorder=null, mRecorded=[];
    const mRecordBtn = document.getElementById('modeRecordBtn');
    const mTranscribeBtn = document.getElementById('modeTranscribeBtn');
    const mFileInput = document.getElementById('modeFileInput');
    const mStatus = document.getElementById('modeStatus');
    const mTranscript = document.getElementById('modeTranscript');
    const mCopyBtn = document.getElementById('modeCopyBtn');
    const mDownloadBtn = document.getElementById('modeDownloadBtn');

    function setMStatus(t){ mStatus.textContent = t; }

    mRecordBtn.addEventListener('click', async ()=>{
      if(!mMediaRecorder){
        try{ const stream = await navigator.mediaDevices.getUserMedia({audio:true}); mMediaRecorder=new MediaRecorder(stream); mRecorded=[]; mMediaRecorder.ondataavailable=e=>{ if(e.data && e.data.size>0) mRecorded.push(e.data); }; mMediaRecorder.start(); mRecordBtn.textContent='Stop Recording'; setMStatus('Recording...'); }
        catch(e){ setMStatus('Microphone access denied'); }
      } else if(mMediaRecorder && mMediaRecorder.state !== 'inactive'){
        mMediaRecorder.stop(); mMediaRecorder=null; mRecordBtn.textContent='Start Recording'; setMStatus('Recording stopped');
      }
    });

    mTranscribeBtn.addEventListener('click', async ()=>{
      setMStatus('Preparing audio...');
      let file=null;
      if(mRecorded && mRecorded.length>0) file=new Blob(mRecorded,{type:'audio/webm'});
      else if(mFileInput.files && mFileInput.files[0]) file=mFileInput.files[0];
      if(!file){ setMStatus('No audio'); return; }

      const fd=new FormData(); fd.append('file', file, 'upload.webm');
      const params = new URLSearchParams(); params.set('model', modeModelSelect.value || 'tiny'); params.set('mode', mode);
      if(mode==='en_en'){ params.set('src','en'); params.set('tgt','en'); }
      if(mode==='lang_lang'){ const src=document.getElementById('modeSrc').value||'auto'; params.set('src',src); params.set('tgt',src); }
      if(mode==='en_to_lang'){ params.set('src','en'); params.set('tgt', document.getElementById('modeTgt').value||'en'); }
      if(mode==='lang_to_en'){ params.set('src', document.getElementById('modeSrc').value||'auto'); params.set('tgt','en'); }

      setMStatus('Uploading and transcribing...'); mTranscript.value='';
      try{
        const resp = await fetch(`/transcribe?${params.toString()}`, {method:'POST', body:fd});
        if(!resp.ok){ const txt=await resp.text(); throw new Error(txt||resp.status); }
        const j=await resp.json(); mTranscript.value = j.text||''; setMStatus(`Done — ${Math.round((j.seconds||0)*1000)/1000}s`);
      }catch(err){ setMStatus('Error: '+err.message); }
    });

    mCopyBtn.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(mTranscript.value); setMStatus('Copied'); }catch(e){ setMStatus('Copy failed'); } });
    mDownloadBtn.addEventListener('click', ()=>{ const blob=new Blob([mTranscript.value||''],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='transcript.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); setMStatus('Downloaded'); });
  }
  const srcLangSelect = document.getElementById('srcLangSelect');
  const tgtLangSelect = document.getElementById('tgtLangSelect');

  let mediaRecorder = null;
  let recordedBlobs = [];
  let recording = false;

  function setStatus(t){ statusEl.textContent = t; }

  async function startRecording(){
    recordedBlobs = [];
    try{
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if(e.data && e.data.size>0) recordedBlobs.push(e.data); };
      mediaRecorder.start();
      recording = true;
      recordBtn.textContent = 'Stop Recording';
      setStatus('Recording...');
    }catch(err){
      setStatus('Microphone access denied');
    }
  }

  function stopRecording(){
    if(!mediaRecorder) return;
    mediaRecorder.stop();
    recording = false;
    recordBtn.textContent = 'Start Recording';
    setStatus('Recording stopped');
  }

  recordBtn.addEventListener('click', ()=>{
    if(!recording) startRecording(); else stopRecording();
  });

  // populate language lists from server
  async function loadLanguages(){
    try{
      const resp = await fetch('/languages');
      if(!resp.ok) return;
      const langs = await resp.json();
      // clear selects (keep 'auto' in src and 'en' in tgt)
      srcLangSelect.querySelectorAll('option:not([value="auto"])').forEach(n=>n.remove());
      tgtLangSelect.querySelectorAll('option:not([value="en"])').forEach(n=>n.remove());
      Object.entries(langs).forEach(([code,name])=>{
        const o1 = document.createElement('option'); o1.value = code; o1.textContent = `${name} (${code})`;
        const o2 = document.createElement('option'); o2.value = code; o2.textContent = `${name} (${code})`;
        srcLangSelect.appendChild(o1);
        tgtLangSelect.appendChild(o2);
      });
    }catch(e){ console.warn('Failed to load languages', e); }
  }

  loadLanguages();

  async function doTranscribe(){
    setStatus('Preparing audio...');
    let file = null;
    if(recordedBlobs && recordedBlobs.length>0){
      file = new Blob(recordedBlobs, {type:'audio/webm'});
    } else if(fileInput.files && fileInput.files[0]){
      file = fileInput.files[0];
    }
    if(!file){ setStatus('No audio to transcribe'); return; }

    const model = modelSelect.value || 'tiny';
    const mode = (typeof selectedMode !== 'undefined' && selectedMode) ? selectedMode : 'en_en';
    const src = srcLangSelect.value || 'auto';
    const tgt = tgtLangSelect.value || 'en';

    const fd = new FormData();
    fd.append('file', file, 'upload.webm');

    // build query params
    const params = new URLSearchParams();
    params.set('model', model);
    params.set('mode', mode);
    params.set('src', src);
    params.set('tgt', tgt);

    setStatus('Uploading and transcribing...');
    transcriptEl.value = '';
    try{
      const resp = await fetch(`/transcribe?${params.toString()}`, { method:'POST', body: fd });
      if(!resp.ok){ const txt = await resp.text(); throw new Error(txt || resp.status); }
      const j = await resp.json();
      transcriptEl.value = j.text || '';
      setStatus(`Done — ${Math.round((j.seconds||0)*1000)/1000}s`);
    }catch(err){
      setStatus('Error: '+err.message);
    }
  }

  transcribeBtn.addEventListener('click', doTranscribe);

  copyBtn.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(transcriptEl.value); setStatus('Copied to clipboard'); }
    catch(e){ setStatus('Copy failed'); }
  });

  downloadBtn.addEventListener('click', ()=>{
    const text = transcriptEl.value || '';
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'transcript.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    setStatus('Downloaded transcript');
  });

  // expose stop on page unload
  window.addEventListener('beforeunload', ()=>{ if(recording) stopRecording(); });
})();
