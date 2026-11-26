(function(){
 'use strict';const C=window.LclassCore;let voiceEnabled=true,lastInstruction='',cvPromise=null,facePromise=null,redo=[];
 const el=(tag,text,parent)=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;if(parent)parent.append(n);return n;};
 let voiceActive=null,voiceSequence=0,voicePending=null,voiceTimer=null;
 const voiceState={version:'CMD004',state:'idle',activation:false,heard:false,error:null,started:0,ended:0,voice:null};
 const voiceMessages={idle:'Voz aguardando início do atendimento.',loading:'Carregando voz em português…',missing:'Sem voz pt-BR. Instale ou ative Português (Brasil) no mecanismo de voz do aparelho.',ready:'Voz pt-BR disponível; reprodução ainda não confirmada.',queued:'Instrução enviada ao mecanismo de voz.',started:'O navegador iniciou a fala. Audição ainda não confirmada.',ended:'O navegador concluiu a fala. Audição ainda não confirmada.',blocked:'Voz bloqueada. Toque em Testar áudio e confira o som do site.',timeout:'O mecanismo não iniciou a fala. Confira o som e o mecanismo de voz do aparelho.',error:'Falha na voz. Abra Opções de voz para conferir o diagnóstico.',silent:'Voz desativada.',hidden:'Fala interrompida: a página ficou em segundo plano.'};
 function voiceStatus(state,error=null){voiceState.state=state;voiceState.error=error;const text=voiceMessages[state]||state;document.querySelectorAll('.pup-voice-status').forEach(n=>{n.textContent='CMD004 · '+text+(voiceState.heard?' · Audição confirmada pela operadora.':'');});document.querySelectorAll('.pup-heard').forEach(n=>{n.disabled=voiceState.started===0;n.checked=voiceState.heard;});document.dispatchEvent(new CustomEvent('pup-voice-state',{detail:{...voiceState}}));}
 function stopVoice(){voiceSequence++;clearTimeout(voiceTimer);voiceActive=null;window.speechSynthesis?.cancel();}
 function availableVoice(){const voices=window.speechSynthesis?.getVoices()||[];return voices.find(v=>/^pt[-_]BR$/i.test(v.lang)&&v.localService)||voices.find(v=>/^pt[-_]BR$/i.test(v.lang));}
 function deliverVoice(){
  if(!voicePending||!voiceEnabled)return;if(!('speechSynthesis'in window)){voiceStatus('error','unsupported');return;}
  const selected=availableVoice();if(!selected){voiceStatus('loading');clearTimeout(voiceTimer);voiceTimer=setTimeout(()=>{if(voicePending)voiceStatus('missing','language-unavailable');},3500);return;}
  if(!voiceState.activation&&!navigator.userActivation?.hasBeenActive){voiceStatus('blocked','gesture-required');return;}
  const instruction=voicePending;voicePending=null;stopVoice();const sequence=voiceSequence;
  const u=new SpeechSynthesisUtterance(instruction.text);voiceActive=u;u.lang='pt-BR';u.voice=selected;u.rate=.95;u.volume=1;voiceState.voice=selected.name;voiceStatus('queued');
  u.onstart=()=>{if(sequence!==voiceSequence)return;clearTimeout(voiceTimer);voiceState.started++;voiceStatus('started');document.dispatchEvent(new CustomEvent('pup-voice-start',{detail:{text:instruction.text,key:instruction.key}}));};
  u.onend=()=>{if(sequence!==voiceSequence)return;clearTimeout(voiceTimer);voiceState.ended++;voiceActive=null;voiceStatus('ended');};
  u.onerror=e=>{if(sequence!==voiceSequence)return;clearTimeout(voiceTimer);voiceActive=null;voiceStatus(e.error==='not-allowed'?'blocked':'error',e.error);};
  window.speechSynthesis.resume();window.speechSynthesis.speak(u);voiceTimer=setTimeout(()=>{if(sequence===voiceSequence&&voiceActive===u){stopVoice();voiceStatus('timeout','start-timeout');}},5000);
 }
 function speak(text,key='instruction'){lastInstruction=text;if(!voiceEnabled)return;voicePending={text,key};deliverVoice();}
 function unlockVoice(){voiceState.activation=true;if(voicePending)deliverVoice();else if(availableVoice()&&!voiceActive&&['idle','loading','missing'].includes(voiceState.state))voiceStatus('ready');}
 window.speechSynthesis?.addEventListener?.('voiceschanged',()=>{if(voicePending)deliverVoice();else if(availableVoice())voiceStatus('ready');});
 document.addEventListener('click',e=>{if(e.target.closest?.('#pup-guided,#manual-pup-overlay')||e.target.textContent?.includes('Iniciar medição guiada'))unlockVoice();},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){voicePending=null;stopVoice();voiceStatus('hidden');}});

 function btn(text,parent,fn){const b=el('button',text,parent);b.type='button';b.className='btn btn-secondary';b.onclick=fn;return b;}
 function check(parent,id,text){const l=el('label',null,parent);l.className='ops-check';const input=el('input',null,l);input.type='checkbox';input.id=id;el('span',text,l);return input;}
 function redraw(){const s=window._manualPup,cv=document.getElementById('manual_pup_canvas');if(!s||!cv)return;const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);s.p.forEach((p,i)=>{const x=p.x*cv.width,y=p.y*cv.height;ctx.strokeStyle='#bd1221';ctx.lineWidth=Math.max(2,cv.width*.002);ctx.beginPath();ctx.arc(x,y,Math.max(6,cv.width*.007),0,2*Math.PI);ctx.moveTo(x-12,y);ctx.lineTo(x+12,y);ctx.moveTo(x,y-12);ctx.lineTo(x,y+12);ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold '+Math.max(13,cv.width*.014)+'px Arial';ctx.fillText(String(i+1),x+10,y-10);});const n=s.p.length,ins=document.getElementById('manual_pup_instr');if(ins)ins.textContent=n<10?'PASSO '+(n+1)+' DE 10: '+s.nomes[n]:'10 pontos marcados. Confira todos os pontos antes de calcular.';s.atualizarSeta?.(n);const ok=document.getElementById('manual_pup_ok');if(ok)ok.disabled=n!==10;const undo=document.getElementById('manual_pup_desfazer');if(undo)undo.disabled=n===0;}
 function decorate(){const overlay=document.getElementById('manual-pup-overlay'),stage=document.getElementById('manual_pup_stage');if(!overlay||!stage||document.getElementById('pup-local-controls'))return;const instr=document.getElementById('manual_pup_instr'),controls=el('div',null,null);controls.id='pup-local-controls';controls.className='pup-controls';instr.after(controls);
  const note=el('p','EXPERIMENTAL · não substitui instrumento convencional. Meça a referência física no mesmo plano da armação, capture frontalmente e confira profissionalmente. Não use dimensão média de íris como escala.',controls);note.className='ops-experimental';
  btn('Repetir instrução',controls,()=>speak(lastInstruction||instr.textContent));const toggle=btn('Desativar voz',controls,()=>{const enabled=window.LclassPup.voice.toggle();toggle.textContent=enabled?'Desativar voz':'Ativar voz';});
  btn('Voltar um ponto',controls,()=>{const s=window._manualPup;if(s?.p.length){redo.push(s.p.pop());redraw();}});btn('Avançar ponto revisado',controls,()=>{const s=window._manualPup;if(s&&redo.length&&s.p.length<10){s.p.push(redo.pop());redraw();}else showToast('Marque o próximo ponto na foto; o sistema não inventa coordenadas.','info');});
  const select=el('select',null,controls);select.setAttribute('aria-label','Ponto a corrigir');for(let i=0;i<10;i++){const o=el('option','Ponto '+(i+1),select);o.value=String(i);}btn('Corrigir marcação',controls,()=>{const s=window._manualPup,index=Number(select.value);if(s&&index<s.p.length){redo=[];s.p.splice(index);redraw();}});
  const label=el('label','Ampliação ',controls),zoom=el('input',null,label);zoom.type='range';zoom.min='100';zoom.max='300';zoom.step='25';zoom.value='100';zoom.setAttribute('aria-label','Ampliação da foto');const scroll=el('div',null,null);scroll.className='ops-scroll';stage.before(scroll);scroll.appendChild(stage);zoom.oninput=()=>stage.style.width=zoom.value+'%';
  check(overlay.querySelector('.modal'), 'pup-escala-conferida','Conferi a referência física em milímetros, a qualidade da captura e o posicionamento frontal, sem distorção relevante.');
  const status=el('p','Pontos são editáveis. O reconhecimento local sugere apenas as pupilas; contornos da armação exigem marcação manual.',controls);status.className='pup-status';status.id='pup-local-status';
  const observer=new MutationObserver(()=>{if(!window.LclassAtendimento&&instr.textContent!==lastInstruction)speak(instr.textContent);});observer.observe(instr,{subtree:true,childList:true,characterData:true});overlay._pupObserver=observer;if(!window.LclassAtendimento)speak(instr.textContent);
  document.getElementById('manual_pup_canvas')?.addEventListener('pointerdown',()=>{redo=[];});
 }
 const oldStart=iniciarMedicaoManualSemIA;iniciarMedicaoManualSemIA=function(){redo=[];window._manualPup=null;oldStart();decorate();};
 const oldClose=closeManualPupModal;closeManualPupModal=function(){document.getElementById('manual-pup-overlay')?._pupObserver?.disconnect();document.getElementById('manual-pup-overlay')?._pupCleanup?.();window.LclassPup?.voice?.stop();oldClose();};
 const oldFinish=concluirMedicaoManualSemIA;concluirMedicaoManualSemIA=function(){if(!document.getElementById('pup-escala-conferida')?.checked){showToast('Confirme qualidade, posição frontal e referência física antes de calcular.','error');return;}const cfg=window._manualPupConfig;if(!(Number(cfg?.ref)>0)){showToast('Sem escala física confiável: resultado bloqueado.','error');return;}oldFinish();const button=document.getElementById('manual_pup_concluir');if(button){const parent=button.parentElement,confirmation=check(parent,'pup-conferencia-profissional','Sou profissional responsável e conferi estas medidas com instrumento convencional. O recurso permanece experimental.');const apply=button.onclick;button.disabled=true;confirmation.onchange=()=>button.disabled=!confirmation.checked;const guarded=e=>{e?.preventDefault();if(confirmation.checked)apply?.();};button.onclick=guarded;button.ontouchend=guarded;const heading=parent.parentElement.querySelector('div');if(heading)heading.textContent='Resultado geométrico experimental';}};
 function ensureCV(){if(cvPromise)return cvPromise;cvPromise=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('OpenCV local não inicializou. A marcação manual continua disponível.')),45000);const finish=cv=>{if(!cv?.Mat)return;clearTimeout(timeout);/* OpenCV 4.10 expõe um thenable que retorna a si próprio: não usar await/assimilação recursiva. */if(typeof cv.then==='function')Object.defineProperty(cv,'then',{value:undefined,configurable:true});resolve(cv);};const script=document.createElement('script');script.src='vendor/opencv/opencv.js';script.onerror=()=>{clearTimeout(timeout);reject(new Error('OpenCV local indisponível.'));};script.onload=()=>{try{const cv=window.cv;if(cv?.Mat)finish(cv);else if(cv){const previous=cv.onRuntimeInitialized;cv.onRuntimeInitialized=()=>{previous?.();finish(cv);};}else throw new Error('OpenCV indisponível.');}catch(e){clearTimeout(timeout);reject(e);}};document.head.appendChild(script);}).catch(e=>{cvPromise=null;throw e;});return cvPromise;}
 async function ensureFace(){if(!facePromise)facePromise=(async()=>{const {FilesetResolver,FaceLandmarker}=await import('./vendor/mediapipe/vision_bundle.mjs');const files=await FilesetResolver.forVisionTasks('vendor/mediapipe/wasm');return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'vendor/models/face_landmarker.task',delegate:'CPU'},runningMode:'IMAGE',numFaces:2,minFaceDetectionConfidence:.8,minFacePresenceConfidence:.8,minTrackingConfidence:.8});})().catch(e=>{facePromise=null;throw e;});return facePromise;}
 async function localAnalyze(){
  const src=document.getElementById('rf_foto_hidden')?.value;if(!src)return showToast('Escolha uma foto primeiro.','error');
  try{const report=await inspect(src);window._pupAnalysis=report;speak(report.reason);if(report.status==='reject')return showToast(report.reason,'error');iniciarMedicaoManualSemIA(report);}catch{showToast('Não foi possível abrir a imagem. Escolha outra foto.','error');}
 }
 // Mantém os cálculos geométricos existentes; somente a análise da foto muda para o dispositivo.
 analisarFotoIA=localAnalyze;
 const observer=new MutationObserver(()=>{const b=document.getElementById('btn_analisar_ia');if(b&&!b.dataset.local){b.dataset.local='1';b.textContent='Analisar localmente · experimental';}decorate();});document.addEventListener('DOMContentLoaded',()=>observer.observe(document.getElementById('modal-root'),{childList:true,subtree:true}));
 async function inspect(src){
  const img=new Image();img.src=src;await img.decode();const w=img.naturalWidth,h=img.naturalHeight;
  const reject=reason=>({src,status:'reject',reason,points:null,region:null});
  if(Math.min(w,h)<640||Math.max(w,h)<800)return reject('Tire outra foto, com mais resolução.');
  let faces=[],points=null,region=null,detectorError=false;
  try{const detector=await ensureFace();faces=detector.detect(img).faceLandmarks||[];
   // A small face can be missed in the whole image. Search overlapping native-resolution
   // tiles to detect it, map back to original pixels, then reject insufficient detail.
   if(!faces.length){const tile=document.createElement('canvas');tile.width=Math.round(w/2);tile.height=Math.round(h/2);const g=tile.getContext('2d');outer:for(const oy of [0,.25,.5])for(const ox of [0,.25,.5]){g.clearRect(0,0,tile.width,tile.height);g.drawImage(img,ox*w,oy*h,w/2,h/2,0,0,tile.width,tile.height);const found=detector.detect(tile).faceLandmarks||[];if(found.length){faces=found.map(f=>f.map(p=>({...p,x:ox+p.x*.5,y:oy+p.y*.5})));break outer;}}}
  }catch{detectorError=true;}
  if(faces.length>1)return reject('Fotografe apenas uma pessoa.');
  if(faces.length===1){
   try{points=C.landmarkSuggestions(faces);}catch{return reject('Olhe de frente para a câmera e tire outra foto.');}
   const f=faces[0],xs=f.map(p=>p.x),ys=f.map(p=>p.y),x=Math.min(...xs),right=Math.max(...xs),y=Math.min(...ys),bottom=Math.max(...ys),fw=right-x,fh=bottom-y;
   if(fw*w<240||(points[1].x-points[0].x)*w<80||fw<.2)return reject('Aproxime a câmera. Mostre o rosto e toda a armação.');
   if(x<.025||right>.975||y<.015||bottom>.985)return reject('Afaste um pouco a câmera. Não corte o rosto nem a armação.');
   region={x:Math.max(0,x-fw*.18),y:Math.max(0,y-fh*.1),w:Math.min(1,right+fw*.18)-Math.max(0,x-fw*.18),h:Math.min(1,bottom+fh*.1)-Math.max(0,y-fh*.1)};
  }
  // Quality is evaluated on the actual detected face, rather than on background texture.
  const roi=region||{x:0,y:0,w:1,h:1},c=document.createElement('canvas');c.width=Math.min(512,Math.round(w*roi.w));c.height=Math.max(1,Math.round(h*roi.h*c.width/(w*roi.w)));c.getContext('2d').drawImage(img,roi.x*w,roi.y*h,roi.w*w,roi.h*h,0,0,c.width,c.height);
  let quality;try{const cv=await ensureCV();let source,gray,lap,mean,std;try{source=cv.imread(c);gray=new cv.Mat();lap=new cv.Mat();mean=new cv.Mat();std=new cv.Mat();cv.cvtColor(source,gray,cv.COLOR_RGBA2GRAY);cv.Laplacian(gray,lap,cv.CV_64F);cv.meanStdDev(lap,mean,std);quality={light:cv.mean(gray)[0],focus:std.doubleAt(0,0)**2};}finally{for(const m of [source,gray,lap,mean,std])m?.delete();}}catch{const q=C.qualityFromPixels(c.getContext('2d').getImageData(0,0,c.width,c.height).data,c.width,c.height);quality={light:q.luminancia,focus:q.varianciaLaplaciano};}
  if(quality.light<40||quality.light>215)return reject('Melhore a iluminação e tire outra foto.');
  if(quality.focus<15)return reject('A foto está sem nitidez. Limpe a câmera e tire outra foto.');
  const validRegion=region&&[region.x,region.y,region.w,region.h].every(Number.isFinite)&&region.w>0&&region.h>0&&points?.every(p=>p.x>=region.x&&p.x<=region.x+region.w&&p.y>=region.y&&p.y<=region.y+region.h);
  if(points&&!validRegion)return reject('Não foi possível preparar o enquadramento. Selecione outra foto.');
  return {src,width:w,height:h,coordinateSpace:'normalized-original',reportVersion:2,status:points?'ready':'manual',reason:points?'Rosto e olhos encontrados. Enquadramento automático pronto para conferência.':detectorError?'Detecção indisponível. Enquadre manualmente.':'Não localizei os olhos com segurança. Enquadre manualmente.',points,region,quality};
 }
 window.LclassPup={analyze:localAnalyze,inspect,ensureCV,ensureFace,speak,redraw};
 window.LclassPup.voice={repeat:()=>{unlockVoice();speak(lastInstruction,'repeat');},unlock:unlockVoice,test:()=>{unlockVoice();voiceState.heard=false;speak('Teste de voz. Você está ouvindo a orientação em português.','test');},heard:value=>{voiceState.heard=!!value;voiceStatus(voiceState.state);},refresh:()=>voiceStatus(voiceState.state),stop:()=>{voicePending=null;stopVoice();},diagnostics:()=>({...voiceState,voices:(window.speechSynthesis?.getVoices()||[]).map(v=>({name:v.name,lang:v.lang,local:v.localService})),userAgent:navigator.userAgent,secure:window.isSecureContext}),toggle:()=>{voiceEnabled=!voiceEnabled;if(!voiceEnabled){voicePending=null;stopVoice();voiceStatus('silent');}else{unlockVoice();speak(lastInstruction);}return voiceEnabled;}};
})();

// CMD-OTICA-002: apresentação guiada; geometria e persistência continuam nas funções originais.
(function(){
 'use strict';
 const names=['Preparação','Fotografia','Referência física','Marcação','Conferência','Resultado'];
 const phrases=['Posicione a pessoa de frente, usando a armação.','Escolha uma foto nítida, de frente.','Informe a medida real da referência, em milímetros.','Marque o ponto indicado na foto.','Confira os dez pontos e a referência.','Confira as medidas com um instrumento convencional.'];
 const points=['Toque no centro da pupila à esquerda da foto.','Toque no centro da pupila à direita da foto.','Toque na borda esquerda da lente à esquerda da foto.','Toque na borda direita dessa lente.','Toque na borda esquerda da lente à direita da foto.','Toque na borda direita dessa lente.','Toque no topo da lente à esquerda da foto.','Toque na base dessa lente.','Toque no topo da lente à direita da foto.','Toque na base dessa lente.'];
 const $=id=>document.getElementById(id);let ctx=null,confirmed=null;
 const originalCloseModal=closeModal;closeModal=function(){if(document.querySelector('#pup-guided:not([hidden])'))LclassPup.voice.stop();return originalCloseModal();};
 const originalToast=showToast;showToast=function(message,type){if(message==='Medidas calculadas sem IA')message='Resultado pronto para conferência profissional.';if(message==='Foto pronta. Use Medir sem IA. A análise com IA estará disponível quando o serviço for ativado.'&&ctx?.shell?.isConnected)message='Foto pronta. Iniciando análise local.';return originalToast(message,type);};
 function node(tag,text,parent){const n=document.createElement(tag);if(text)n.textContent=text;parent?.append(n);return n;}
 function button(text,parent,fn){
  const b=node('button',text,parent);b.type='button';b.className='btn btn-secondary';let touch=null,lastTouch=-Infinity;
  const run=e=>{LclassPup.voice.unlock();return fn(e);};
  b.onclick=e=>{if(e.detail>0&&performance.now()-lastTouch<800){e.preventDefault();return;}return run(e);};
  b.addEventListener('touchstart',e=>{const t=e.changedTouches[0];if(t)touch={id:t.identifier,x:t.clientX,y:t.clientY};},{passive:true});
  b.addEventListener('touchcancel',()=>{touch=null;},{passive:true});
  b.addEventListener('touchend',e=>{const t=touch&&[...e.changedTouches].find(t=>t.identifier===touch.id),r=b.getBoundingClientRect();if(!t||Math.hypot(t.clientX-touch.x,t.clientY-touch.y)>12||t.clientX<r.left||t.clientX>r.right||t.clientY<r.top||t.clientY>r.bottom){touch=null;return;}touch=null;if(b.disabled)return;e.preventDefault();lastTouch=performance.now();run(e);},{passive:false});
  return b;
 }
 function voicePanel(parent){const info=node('p','',parent);info.className='pup-voice-status';info.setAttribute('aria-live','polite');button('Testar áudio',parent,()=>LclassPup.voice.test());const label=node('label','',parent);label.className='ops-check';const heard=node('input','',label);heard.type='checkbox';heard.className='pup-heard';heard.disabled=true;heard.onchange=()=>LclassPup.voice.heard(heard.checked);node('span','Ouvi a voz em português neste aparelho.',label);node('p','Sem áudio? Confira volume e som do site no Chrome. No Android, confira o mecanismo de síntese de voz e o idioma Português (Brasil). Não é necessária permissão de microfone.',parent);LclassPup.voice.refresh();}
 function actions(parent){const bar=node('div','',parent);bar.className='atendimento-actions';button('Nova Receita',bar,()=>abrirFormReceita());button('Pupilômetro Digital',bar,()=>openPupil());button('Buscar Armação',bar,()=>abrirBuscaArmacaoReceita());button('Consultar Lentes',bar,()=>navigate('consultor'));return bar;}
 const oldRecipe=abrirFormReceita;
 abrirFormReceita=function(id){oldRecipe(id);organize(false);};
 function organize(standalone){
  const body=document.querySelector('#modal-root .modal-body');if(!body||body.dataset.guided)return;body.dataset.guided='1';
  const children=[...body.children],first=children[0],foot=children.at(-1),section=[...body.querySelectorAll(':scope > .section-div')];
  const pupilStart=section.find(n=>n.textContent.includes('Análise de DP')),priceStart=section.find(n=>n.textContent.includes('Consulta de Preços')),measureStart=section.find(n=>n.textContent.includes('Medidas Pupilares')),suggestStart=section.find(n=>n.textContent.includes('Lentes Sugeridas'));
  const panels={};for(const [key,label]of [['receita','Receita'],['medidas','Medidas'],['lentes','Lentes'],['foto','Foto e medição']]){const d=node('section','',body);d.className='atendimento-panel';d.dataset.panel=key;panels[key]=d;}
  let key='receita';for(const child of children){if(child===first){child.remove();continue;}if(child===foot)continue;if(child===suggestStart||child===priceStart)key='lentes';if(child===measureStart)key='medidas';if(child===pupilStart)key='foto';if(child.contains($('rf_ativa')))key='receita';panels[key].append(child);}
  // Preserve every original input exactly once; overlapping DNP fields are mirrored, not shown twice.
  for(const [a,b]of [['rf_odDnp','rf_dpD'],['rf_oeDnp','rf_dpE']]){const x=$(a),y=$(b);if(!x||!y)continue;x.parentElement.hidden=true;if(!y.value)y.value=x.value;const sync=()=>{x.value=y.value;};y.addEventListener('input',sync);}
  const tabs=node('div','',null);tabs.className='atendimento-actions';body.prepend(tabs);
  const show=which=>{for(const [id,p]of Object.entries(panels))p.hidden=id!==which;for(const b of tabs.children)b.classList.toggle('btn-primary',b.dataset.tab===which);};
  for(const [id,label]of [['receita','Receita'],['medidas','Medidas'],['lentes','Consultar Lentes']]){const b=button(label,tabs,()=>show(id));b.dataset.tab=id;}
  button('Pupilômetro Digital',tabs,()=>begin());
  body.append(foot);show('receita');
  function begin(){
   for(const p of Object.values(panels))p.hidden=true;tabs.hidden=true;foot.hidden=true;
   let shell=$('pup-guided');if(shell){shell.hidden=false;ctx.stepTo(0);return;}shell=node('section','',body);shell.id='pup-guided';
   const title=node('h2','Pupilômetro Digital',shell),progress=node('div','',shell);progress.className='pup-steps';
   names.forEach((s,i)=>node('span',(i+1)+'. '+s,progress));
   const instruction=node('p','',shell);instruction.className='pup-guided-instruction';instruction.setAttribute('aria-live','polite');
   const voice=node('div','',shell);voice.className='pup-controls';button('Repetir',voice,()=>LclassPup.voice.repeat());const mute=button('Silenciar',voice,()=>{mute.textContent=LclassPup.voice.toggle()?'Silenciar':'Ativar voz';});
   const prep=node('p','Foto frontal, boa iluminação, armação ajustada e referência física no mesmo plano. Experimental: exige conferência profissional.',shell);
   const photo=node('div','',shell),ref=node('div','',shell),nav=node('div','',shell);photo.className='pup-entry-photo';ref.className='pup-entry-reference';nav.className='pup-controls pup-entry-actions';
   const original=panels.foto,refBox=$('rf_pupilometria_rapida');ref.append(refBox);
   photo.append(original);original.hidden=false;
   // Hide obsolete headings and action row; guided controls invoke the same functions.
   for(const s of original.querySelectorAll(':scope > .section-div'))s.hidden=true;
   const manual=original.querySelector('button[onclick="iniciarMedicaoManualSemIA()"]');if(manual)manual.parentElement.hidden=true;
   progress.hidden=true;prep.hidden=true;voice.classList.add('pup-entry-voice');
   const status=node('p','Escolha uma foto frontal com a armação. A análise é automática e local.',nav);status.id='pup-analysis-status';status.setAttribute('aria-live','polite');
   let report=null,pendingSource='',request=0;
   const next=button('Conferir enquadramento',nav,()=>{
    if(!report||report.src!==$('rf_foto_hidden').value||report.status==='reject')return showToast('Selecione uma fotografia adequada.','error');
    if(!(Number($('rf_ref_largura').value)>0))return showToast('Informe a referência física em milímetros.','error');
    iniciarMedicaoManualSemIA(report);
   });next.disabled=true;
   if(!standalone)button('Voltar à receita',nav,()=>{shell.hidden=true;tabs.hidden=false;foot.hidden=false;show('receita');});
   const capture=original.querySelector('button[onclick="abrirCameraGuia()"]')?.parentElement?.parentElement;if(capture){for(const child of [...capture.children].slice(0,2))child.hidden=true;}
   shell.classList.add('pup-entry');instruction.hidden=true;const voiceOptions=node('details','',shell);voiceOptions.className='pup-entry-options';node('summary','Opções de voz',voiceOptions);voiceOptions.append(voice);voicePanel(voiceOptions);shell.append(voiceOptions);for(const child of [...refBox.children])if(!child.classList.contains('grid2'))child.hidden=true;
   const grade=$('rf_usar_grade')?.parentElement;if(grade)grade.hidden=true;
   async function selected(){const src=$('rf_foto_hidden')?.value||'';if(src===pendingSource)return;pendingSource=src;const token=++request;report=null;next.disabled=true;window._pupAnalysis=null;if(!src){status.textContent='Escolha uma foto frontal com a armação.';return;}status.textContent='Analisando rosto, olhos e nitidez neste dispositivo…';
    try{const result=await LclassPup.inspect(src);if(token!==request||!shell.isConnected||src!==$('rf_foto_hidden')?.value)return;report=result;status.textContent=result.reason;status.dataset.state=result.status;next.disabled=result.status==='reject';LclassPup.speak(result.reason);}catch{if(token===request){status.textContent='Não foi possível abrir a imagem. Escolha outra foto.';LclassPup.speak(status.textContent);}}
   }
   const photoObserver=new MutationObserver(selected);photoObserver.observe($('rf_foto_preview'),{childList:true,subtree:true});selected();
   ctx={shell,step:0,standalone,panels,show,tabs,foot};
   function step(n,silent=false){ctx.step=n;title.textContent='Foto e referência física';instruction.textContent='Escolha uma foto. Informe a medida real da armação.';photo.hidden=false;ref.hidden=false;if(!silent)LclassPup.speak('Escolha uma foto de frente, usando a armação.');}
   ctx.stepTo=step;step(0);
  }
  if(standalone)begin();else ctx=null;
 }
 function openPupil(){oldRecipe();organize(true);document.querySelector('#modal-root .modal-header h2').textContent='Pupilômetro Digital';}
 const oldReceituario=renderReceituario;renderReceituario=function(){oldReceituario();const root=$('content');root.querySelector('.page-header button[onclick="abrirFormReceita()"]')?.remove();const bar=actions(null);root.prepend(bar);};
 if(!MENU.some(m=>m.id==='pupilometro'))MENU.splice(5,0,{id:'pupilometro',label:'Pupilômetro Digital',icon:'<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 12h2"/>'});
 const oldRender=renderPage;renderPage=function(){if(state.pagina==='pupilometro'){const root=$('content');root.replaceChildren();node('h1','Pupilômetro Digital',root);node('p','Medição experimental independente de receita ou cadastro. Nenhum registro é salvo automaticamente.',root);button('Iniciar medição guiada',root,openPupil);if(confirmed)button('Transferir medidas confirmadas para nova receita',root,transfer);}else oldRender();};
 function transfer(){const r=confirmed;if(!r)return;abrirFormReceita();for(const [id,k]of [['rf_dpD','dpOD'],['rf_dpE','dpOE'],['rf_odDnp','dpOD'],['rf_oeDnp','dpOE'],['rf_coD','coOD'],['rf_coE','coOE'],['rf_dpL','dpTotal']])if($(id))$(id).value=r[k];showToast('Medidas transferidas. Confira e salve a receita quando desejar.','success');}
 // One brief instruction per changed point. Zoom follows the existing indicative arrow;
 // its approximate position guides the view, never supplies measurement coordinates.
 let lastPoint=-1,manualObserver=null;
 // Adapt the legacy asynchronous canvas initializer to a single, canvas-bound ready event.
 const configureLegacy=configurarMedicaoManualSemIA;
 configurarMedicaoManualSemIA=function(){
  const canvas=$('manual_pup_canvas'),image=$('manual_pup_img');if(!canvas||!image||canvas._pupConfigured)return;canvas._pupConfigured=true;
  configureLegacy();
  const ready=()=>{if(!canvas.isConnected||!window._manualPup?.p)return;canvas._pupState=window._manualPup;image.onload=null;document.dispatchEvent(new CustomEvent('pup-manual-ready',{detail:{canvas,state:canvas._pupState}}));};
  if(image.complete&&image.naturalWidth)ready();else image.addEventListener('load',ready,{once:true});
 };
 const start=iniciarMedicaoManualSemIA;iniciarMedicaoManualSemIA=function(receivedReport){
  const rawSource=$('rf_foto_hidden')?.value||'',receipt=receivedReport||(window._pupAnalysis?.src===rawSource?window._pupAnalysis:null);
  if(receipt&&(receipt.src!==rawSource||receipt.status==='reject'))return showToast('A análise não corresponde à fotografia atual ou a foto foi rejeitada. Selecione a foto novamente.','error');
  if(receipt?.status==='ready'&&(!Array.isArray(receipt.points)||receipt.points.length!==2||!receipt.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>0&&p.x<1&&p.y>0&&p.y<1)||!receipt.region||![receipt.region.x,receipt.region.y,receipt.region.w,receipt.region.h].every(Number.isFinite)||receipt.region.w<=0||receipt.region.h<=0))return showToast('A detecção não forneceu um enquadramento válido. Reanalise a fotografia.','error');
  const analysis=receipt?Object.freeze({...receipt,points:receipt.points?.map(p=>Object.freeze({x:p.x,y:p.y})),region:receipt.region?Object.freeze({...receipt.region}):null}):null;
  lastPoint=-1;window._pupSuggestions=null;start();const overlay=$('manual-pup-overlay');if(!overlay)return;
  overlay.dataset.controller='CMD004-FLOW2';
  overlay.classList.add('pup-minimal');const instr=$('manual_pup_instr');overlay._pupObserver?.disconnect();manualObserver?.disconnect();
  const controls=$('pup-local-controls'),details=node('details','',null);details.className='pup-advanced';node('summary','Opções avançadas',details);
  const modal=overlay.querySelector('.modal'),layout=modal.firstElementChild;layout.classList.add('pup-minimal-layout');
  const photoScroll=$('manual_pup_stage').parentElement;const header=layout.firstElementChild;header.textContent='Marcação guiada';header.className='pup-minimal-title';
  for(const n of [...layout.children])if(n!==header&&n!==instr&&n!==photoScroll&&n!==controls)n.hidden=true;
  details.append(controls);layout.append(details);
  const scale=$('pup-escala-conferida');if(scale)details.append(scale.closest('label'));
  const progress=node('div','',null);progress.className='pup-real-progress';instr.before(progress);
  const voiceInfo=node('div','',null);voiceInfo.className='pup-voice-status';instr.after(voiceInfo);voicePanel(details);
  const bar=node('div','',layout);bar.className='pup-essential';
  let candidate=null,origin='',s=null,orientation='normal',orientationConfirmed=false,busy=false,zoom=1,framing=true,viewRegion=null,draftRegion=null,draftSource=null,dragStart=null,framingDrag=false,manualZoom=null;
  const undoPoint=[...controls.querySelectorAll('button')].find(b=>b.textContent==='Voltar um ponto');
  for(const b of controls.querySelectorAll('button'))if(['Voltar um ponto','Repetir instrução'].includes(b.textContent))b.hidden=true;
  const back=button('Voltar',bar,()=>{if(!s)return;if(candidate){candidate=null;origin='';paint();frame(null);return;}if(s.p.length){if(undoPoint)undoPoint.onclick();else s.p.pop();window._pupSuggestions=null;update();}else if(!framing){framing=true;viewRegion=null;update();}else closeManualPupModal();});
  button('Repetir instrução',bar,()=>LclassPup.voice.repeat());
  const confirm=button('Confirmar',bar,()=>{if(!s||!orientation||busy)return;if(s.p.length===10){concluirMedicaoManualSemIA();return;}if(framing){if(!draftRegion||draftRegion.w*image.naturalWidth<240||draftRegion.h*image.naturalHeight<80)return showToast('Enquadre os dois olhos e toda a armação, com nitidez suficiente.','error');const detected=suggestions();if(detected?.some(p=>p.x<draftRegion.x||p.x>draftRegion.x+draftRegion.w||p.y<draftRegion.y||p.y>draftRegion.y+draftRegion.h))return showToast('Inclua as duas pupilas detectadas e toda a armação no enquadramento.','error');viewRegion={...draftRegion};orientationConfirmed=true;framing=false;update();return;}if(!candidate)return;if(s.p.length===1){if(candidate.x<=s.p[0].x)return showToast('Confira OD e OE na foto frontal sem espelho.','error');if((candidate.x-s.p[0].x)*image.naturalWidth<80){LclassPup.speak('Aproxime a câmera e tire outra foto.');return showToast('Olhos pequenos demais nesta foto. Tire outra mais próxima.','error');}}s.p.push({...candidate});candidate=null;origin='';update();});confirm.classList.add('btn-primary');
  const conference=node('section','',null);conference.className='pup-final-check';conference.hidden=true;bar.before(conference);if(scale)conference.append(scale.closest('label'));
  const arrow=$('manual_pup_seta'),stage=$('manual_pup_stage'),canvas=$('manual_pup_canvas');
  const image=$('manual_pup_img'),source=image.src;
  const detectedPoints=analysis?.status==='ready'&&Array.isArray(analysis.points)?analysis.points.map(p=>({x:p.x,y:p.y})):null;overlay.dataset.detection=analysis?.status||'manual';
  const frameBox=node('div','',stage);frameBox.className='pup-frame-box';
  button('Refazer enquadramento',details,()=>{s.p=[];framing=true;orientationConfirmed=false;viewRegion=null;candidate=null;update();});
  const orientationBox=node('label','Orientação da fotografia ',null);orientationBox.className='pup-orientation';progress.after(orientationBox);
  const orientationSelect=node('select','',orientationBox);orientationSelect.id='pup-photo-orientation';orientationSelect.className='inp';orientationSelect.disabled=true;
  for(const [value,text]of [['normal','Confira: OD à esquerda · OE à direita'],['mirrored','Os lados estão invertidos: corrigir espelho']]){const o=node('option',text,orientationSelect);o.value=value;}
  const guide=node('div','',null);guide.className='pup-separate-guide';instr.after(guide);
  const side=node('aside','',layout);side.className='pup-side';photoScroll.classList.add('pup-photo-portrait');
  for(const part of [header,progress,orientationBox,instr,guide,voiceInfo,conference,bar,details])side.append(part);
  const advancedHost=node('div','',side);advancedHost.className='pup-advanced-host';advancedHost.append(details);
  details.append(voiceInfo);overlay.dataset.layout='CMD004-vertical';header.textContent='Pupilômetro · vertical 3:4';
  orientationSelect.onchange=async()=>{
   if(busy||!s)return;busy=true;orientationSelect.disabled=true;const choice=orientationSelect.value;
   try{image.onload=null;const original=new Image();original.src=source;await original.decode();if(choice==='mirrored'){const c=document.createElement('canvas');c.width=original.naturalWidth;c.height=original.naturalHeight;const g=c.getContext('2d');g.translate(c.width,0);g.scale(-1,1);g.drawImage(original,0,0);image.src=c.toDataURL('image/png');}else image.src=source;
    await image.decode();orientation=choice;orientationConfirmed=false;s.p=[];candidate=null;framing=true;viewRegion=null;draftSource=analysis?.region?'detected':null;draftRegion=analysis?.region?{...analysis.region,x:choice==='mirrored'?1-analysis.region.x-analysis.region.w:analysis.region.x}:null;window._manualPupConfig.foto=image.src;lastPoint=-1;zoom=1;update(false);
   }catch{orientation='';showToast('Não foi possível orientar a foto. Selecione outra imagem.','error');}finally{busy=false;orientationSelect.disabled=false;paint();}
  };
  const hint=node('div','',stage);hint.className='pup-region-hint';
  const mandatory=confirm;mandatory.id='pup-calcular-confirmados';mandatory.disabled=true;
  const originalOK=$('manual_pup_ok');originalOK.hidden=true;
  // The original geometric calculation still receives only the ten confirmed points.
  const finishGuard=()=>orientationConfirmed&&!!orientation&&!busy&&!framing&&!!viewRegion&&s?.p.length===10&&!candidate;
  overlay._pupCanCalculate=finishGuard;
  overlay._pupSnapshot=()=>({controller:'CMD004-FLOW2',reportVersion:analysis?.reportVersion||null,analysis:analysis?.status||'manual',sourceMatches:analysis?.src===rawSource,initialized:!!s,phase:framing?'frame':s?.p.length===10?'review':'point',pointsConfirmed:s?.p.length||0,detectedPoints:detectedPoints?.map(p=>({...p}))||[],automaticRegion:analysis?.region?{...analysis.region}:null,frameSource:draftSource,frame:draftRegion?{...draftRegion}:null,image:{width:image.naturalWidth,height:image.naturalHeight}});
  function suggestions(){const p=detectedPoints;if(!Array.isArray(p)||p.length!==2||!p.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&q.x>0&&q.x<1&&q.y>0&&q.y<1))return null;return p.map(q=>({x:orientation==='mirrored'?1-q.x:q.x,y:q.y})).sort((a,b)=>a.x-b.x);}
  function update(allowZoom=true){
   if(!s)return;const n=s.p.length;candidate=orientation&&!framing?suggestions()?.[n]||null:null;origin=candidate?'detecção local':'';
   const text=framing?'Confira os lados e enquadre toda a armação.':n===0?'Marque o centro da parte preta do olho.':n===1?'Agora marque o outro olho.':n<10?'Marque a borda indicada no desenho.':'Confira e confirme.';
   instr.textContent=text;progress.textContent=n+' de 10 pontos confirmados'+(n<10?' · '+(n<2?(n===0?'Olho direito do cliente (OD)':'Olho esquerdo do cliente (OE)'):points[n].replace('Toque na ','').replace('Toque no ','')):' · Marcação concluída');
   if(ctx)ctx.stepTo(n<10?3:4,true);const voiceStep=(framing?'frame:':'point:')+n;
   originalOK.disabled=n!==10;conference.hidden=n!==10;if(n===10)details.open=false;confirm.hidden=false;
   if(!framing&&orientation)details.append(orientationBox);else side.insertBefore(orientationBox,instr);
   guide.textContent=!orientation?'Confirme a orientação da foto antes de marcar.':n<2?'Desenho de orientação (fora da fotografia): OD ◉ ── ◉ OE · cliente de frente. '+(n===0?'Marque o olho à esquerda da foto.':'Marque o olho à direita da foto.'):n<10?'Desenho de orientação (fora da fotografia): '+points[n].replace('Toque na ','').replace('Toque no ',''):'OD e OE conferidos na fotografia frontal, sem espelho.';

   paint();frame(candidate);if(voiceStep!==lastPoint){lastPoint=voiceStep;LclassPup.speak(instr.textContent,voiceStep);}
  }
  function targetGuide(n){
   if(framing||n>=10)return;
   const targets=[[55,62],[185,62],[20,62],[90,62],[150,62],[220,62],[55,35],[55,90],[185,35],[185,90]];
   const from=[[55,7],[185,7],[2,62],[125,62],[115,62],[238,62],[55,5],[55,115],[185,5],[185,115]];
   const target=targets[n],start=from[n];
   guide.replaceChildren();node('div',candidate?(origin==='detecção local'?'Pupila detectada: confira a seta na fotografia.':'Ponto escolhido: confira a seta na fotografia.'):(n<2?'Sem pupila detectada: siga a seta do desenho e marque na foto.':'Borda manual: siga a seta do desenho e marque na foto.'),guide);
   const illustration=node('div','',guide);illustration.className='pup-schematic';illustration.dataset.point=String(n);
   illustration.innerHTML='<svg viewBox="0 0 240 122" role="img" aria-label="Ilustração auxiliar do ponto '+(n+1)+', sem coordenadas da fotografia"><defs><marker id="pup-aux-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="13" markerHeight="13" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#bd1221"/></marker></defs><rect x="20" y="35" width="70" height="55" rx="8" fill="white" stroke="#333" stroke-width="2"/><rect x="150" y="35" width="70" height="55" rx="8" fill="white" stroke="#333" stroke-width="2"/><path d="M90 60Q120 40 150 60" stroke="#333" fill="none" stroke-width="2"/><circle cx="55" cy="62" r="6"/><circle cx="185" cy="62" r="6"/><line class="pup-aux-arrow" x1="'+start[0]+'" y1="'+start[1]+'" x2="'+target[0]+'" y2="'+target[1]+'" stroke="#bd1221" stroke-width="6" marker-end="url(#pup-aux-head)"/><text x="55" y="108" text-anchor="middle" font-size="11">OD do cliente</text><text x="185" y="108" text-anchor="middle" font-size="11">OE do cliente</text></svg>';
   const caption=node('span','ILUSTRAÇÃO · ponto '+(n+1)+' de 10',illustration);caption.className='pup-aux-caption';
  }
  function paint(focus=false){
   if(!s)return;LclassPup.redraw();const n=s.p.length;const complete=n===10;confirm.disabled=(!complete&&!candidate&&!framing)||(framing&&!draftRegion)||!orientation||busy;
   frameBox.hidden=!framing||!draftRegion;if(draftRegion){frameBox.style.left=draftRegion.x*100+'%';frameBox.style.top=draftRegion.y*100+'%';frameBox.style.width=draftRegion.w*100+'%';frameBox.style.height=draftRegion.h*100+'%';}
   arrow.style.display=!candidate||complete?'none':'block';arrow.textContent='';arrow.innerHTML='<svg viewBox="0 0 40 60" width="40" height="60" aria-hidden="true"><path d="M15 1H25V38H38L20 60L2 38H15Z" fill="#e30613" stroke="white" stroke-width="2"/></svg>';
   arrow.dataset.precision=candidate?'candidate':'none';hint.hidden=!candidate||complete;hint.textContent=origin==='detecção local'?'Sugestão detectada · confira':'Confira e confirme';
   if(candidate){arrow.style.left=(candidate.x*100)+'%';arrow.style.top=(candidate.y*100)+'%';hint.style.left=(candidate.x*100)+'%';hint.style.top=(candidate.y*100)+'%';}
   if(candidate){const c=canvas.getContext('2d');c.strokeStyle='#00e5ff';c.lineWidth=Math.max(3,canvas.width*.003);c.beginPath();c.arc(candidate.x*canvas.width,candidate.y*canvas.height,canvas.width*.012,0,Math.PI*2);c.stroke();}
   // redraw updates legacy text/arrows; restore the concise instruction after it.
   const instructions=['Marque o centro da parte preta do olho direito.','Agora marque o centro do olho esquerdo.','Marque a borda de fora da lente do olho direito.','Marque a borda perto do nariz do olho direito.','Marque a borda perto do nariz do olho esquerdo.','Marque a borda de fora da lente do olho esquerdo.','Marque a parte de cima da lente do olho direito.','Marque a parte de baixo da lente do olho direito.','Marque a parte de cima da lente do olho esquerdo.','Marque a parte de baixo da lente do olho esquerdo.'];
   instr.textContent=candidate&&origin==='manual'?'Confira e confirme.':instructions[n]||'Confira e confirme.';overlay.dataset.point=String(n);overlay.dataset.phase=framing?'frame':complete?'review':'point';
   targetGuide(n);
   if(framing){instr.textContent=draftRegion?'Confira os lados e toda a armação. Confirme para iniciar as marcações.':'Arraste um retângulo com toda a armação e os dois olhos.';progress.textContent='Enquadramento · nenhum ponto confirmado';guide.textContent=draftSource==='detected'?'FLOW2 · Enquadramento automático recebido: 2 pupilas. Ajuste somente se necessário.':draftRegion?'FLOW2 · Região manual selecionada. Confira e confirme.':'FLOW2 · Sem detecção confiável: arraste a região com toda a armação e os olhos.';arrow.style.display='none';hint.hidden=true;}
  }
  function frame(target){if(!image.naturalWidth||framingDrag)return;const fit=Math.min(photoScroll.clientWidth/image.naturalWidth,photoScroll.clientHeight/image.naturalHeight),roi=framing?(draftSource==='detected'?draftRegion:null):viewRegion,limit=roi?Math.min(photoScroll.clientWidth/(image.naturalWidth*roi.w),photoScroll.clientHeight/(image.naturalHeight*roi.h))*.94:fit,scale=manualZoom&&roi?Math.min(limit,fit*manualZoom):limit,w=image.naturalWidth*scale,h=image.naturalHeight*scale;
   stage.style.width=w+'px';stage.style.height=h+'px';stage.style.marginLeft=Math.max(0,(photoScroll.clientWidth-w)/2)+'px';stage.style.marginTop=Math.max(0,(photoScroll.clientHeight-h)/2)+'px';
   target=roi?{x:roi.x+roi.w/2,y:roi.y+roi.h/2}:null;
   photoScroll.scrollLeft=target?Math.max(0,stage.offsetLeft+target.x*w-photoScroll.clientWidth/2):0;photoScroll.scrollTop=target?Math.max(0,stage.offsetTop+target.y*h-photoScroll.clientHeight/2):0;
   const range=controls.querySelector('input[type=range]');if(range){range.step='10';range.max='1000';range.value=String(Math.round(scale/fit*100));}
  }
  let resize=null,listener=null;
  const initialize=event=>{if(event.detail.canvas!==canvas||!overlay.isConnected||s)return;s=event.detail.state;image.onload=null;
   const down=canvas.onpointerdown,move=canvas.onpointermove;let active=false,dragMoved=false,previousRegion=null,previousSource=null;
   function keepLoupeVisible(){const loupe=$('manual_pup_lupa');if(!loupe||loupe.style.display==='none')return;const r=loupe.getBoundingClientRect(),v=photoScroll.getBoundingClientRect(),left=Math.max(v.left+4,Math.min(v.right-r.width-4,r.left)),top=Math.max(v.top+4,Math.min(v.bottom-r.height-4,r.top));loupe.style.left=(parseFloat(loupe.style.left)||0)+left-r.left+'px';loupe.style.top=(parseFloat(loupe.style.top)||0)+top-r.top+'px';}
   const xy=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
   const drag=e=>{if(!dragMoved&&Math.hypot(e.clientX-dragStart.clientX,e.clientY-dragStart.clientY)<12)return;dragMoved=true;draftSource='manual';const q=xy(e);draftRegion={x:Math.min(q.x,dragStart.x),y:Math.min(q.y,dragStart.y),w:Math.abs(q.x-dragStart.x),h:Math.abs(q.y-dragStart.y)};paint();};
   canvas.onpointerdown=e=>{if(!orientation||busy){showToast('Confira a orientação dos olhos antes de marcar.','info');return;}if(s.p.length>=10)return;active=true;if(framing){dragStart={...xy(e),clientX:e.clientX,clientY:e.clientY};dragMoved=false;framingDrag=true;previousRegion=draftRegion?{...draftRegion}:null;previousSource=draftSource;canvas.setPointerCapture?.(e.pointerId);}else{down?.(e);keepLoupeVisible();}};canvas.onpointermove=e=>{if(active){if(framing)drag(e);else{move?.(e);keepLoupeVisible();}}};
   canvas.onpointerup=e=>{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!active)return;active=false;$('manual_pup_lupa').style.display='none';if(framing){drag(e);framingDrag=false;if(dragMoved&&previousRegion&&(draftRegion.w*image.naturalWidth<240||draftRegion.h*image.naturalHeight<80)){draftRegion=previousRegion;draftSource=previousSource;showToast('Seleção pequena ignorada. Enquadramento anterior preservado.','info');}paint();frame(null);LclassPup.speak(instr.textContent,'frame-review');return;}const q=xy(e);if(viewRegion&&(q.x<viewRegion.x||q.x>viewRegion.x+viewRegion.w||q.y<viewRegion.y||q.y>viewRegion.y+viewRegion.h))return showToast('Selecione dentro da região conferida ou refaça o enquadramento.','error');candidate=q;origin='manual';paint();frame(candidate);LclassPup.speak(instr.textContent,'selection:'+s.p.length);};
   canvas.onpointercancel=e=>{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);active=false;if(framingDrag){framingDrag=false;draftRegion=previousRegion;draftSource=previousSource;paint();frame(null);}$('manual_pup_lupa').style.display='none';};
   listener=()=>{if(overlay.isConnected)update();};document.addEventListener('pup-suggestions',listener);resize=new ResizeObserver(()=>frame(candidate));resize.observe(photoScroll);
   const range=controls.querySelector('input[type=range]');if(range)range.oninput=()=>{manualZoom=Number(range.value)/100;frame(candidate);};
   // Advanced legacy edits are allowed, but immediately refresh progress and calculation gating.
   controls.addEventListener('click',()=>{const n=s.p.length;setTimeout(()=>{if(s.p.length!==n)update();},0);});
   window._pupSuggestions=detectedPoints;draftRegion=analysis?.region?{...analysis.region}:null;draftSource=draftRegion?'detected':null;update();orientationSelect.disabled=false;
  };
  document.addEventListener('pup-manual-ready',initialize);
  overlay._pupCleanup=()=>{document.removeEventListener('pup-manual-ready',initialize);if(listener)document.removeEventListener('pup-suggestions',listener);resize?.disconnect();image.onload=null;};
  if(canvas._pupState)initialize({detail:{canvas,state:canvas._pupState}});
 };
 const finish=concluirMedicaoManualSemIA;concluirMedicaoManualSemIA=function(){const guard=$('manual-pup-overlay')?._pupCanCalculate;if(guard&&!guard())return showToast('Confirme os dez pontos antes de calcular.','error');finish();const b=$('manual_pup_concluir');if(!b)return;if(ctx)ctx.stepTo(5);const prior=b.onclick;b.textContent=ctx?.standalone?'Confirmar resultado':'Transferir para esta receita';const apply=e=>{if(!$('pup-conferencia-profissional')?.checked)return;confirmed={...window._manualPupResultado};if(ctx?.standalone){closeManualPupModal();closeModal();navigate('pupilometro');}else{prior?.(e);for(const [a,k]of [['rf_odDnp','dpOD'],['rf_oeDnp','dpOE']])if($(a))$(a).value=confirmed[k];if(ctx){ctx.shell.hidden=true;ctx.tabs.hidden=false;ctx.foot.hidden=false;ctx.show('medidas');}}};b.onclick=apply;b.ontouchend=e=>{e.preventDefault();apply(e);};};
 window.LclassAtendimento={openPupil,transfer,get confirmed(){return confirmed;}};
 window.LclassPup.flowDiagnostic=()=>$('manual-pup-overlay')?._pupSnapshot?.()||null;
})();
