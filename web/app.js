(function(){
  const recordBtn = document.getElementById('recordBtn');
  const transcribeBtn = document.getElementById('transcribeBtn');
  const fileInput = document.getElementById('fileInput');
  const statusEl = document.getElementById('status');
  const transcriptEl = document.getElementById('transcript');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const modelSelect = document.getElementById('modelSelect');
  const modeSelect = document.getElementById('modeSelect');
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
    const mode = modeSelect.value || 'en_en';
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
