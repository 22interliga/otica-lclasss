// Backend de IA da Ótica Lclass — executar somente em ambiente servidor/serverless.
// A chave deve existir apenas em process.env.ANTHROPIC_API_KEY.
export async function handleVision(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Método não permitido'});
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({error:'IA não configurada no servidor'});
  const {task, image} = req.body || {};
  if (!['pupilometria','estoque'].includes(task) || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return res.status(400).json({error:'Requisição inválida'});
  }
  // Limite simples para evitar payloads excessivos.
  if (image.length > 8_000_000) return res.status(413).json({error:'Imagem muito grande'});
  const m=image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if(!m) return res.status(400).json({error:'Imagem inválida'});
  const prompts={
    estoque:'Analise a foto de estoque de uma ótica. Conte as armações visíveis e agrupe somente as visualmente semelhantes. Não invente marca, código ou modelo. Retorne somente JSON válido: {"itens":[{"descricao":"retangular preta","cor":"preta","quantidade":2,"confianca":"alta"}],"totalVisivel":2,"observacao":"..."}',
    pupilometria:'Analise a imagem para auxiliar a conferência de medidas ópticas. Retorne somente JSON válido com as medidas e observações que conseguir inferir. Os resultados são auxiliares e devem ser conferidos por profissional e instrumentos adequados.'
  };
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:900,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:m[1],data:m[2]}},{type:'text',text:prompts[task]}]}]})});
  const data=await r.json();
  if(!r.ok) return res.status(r.status).json({error:'Falha no provedor de IA'});
  const txt=data.content?.[0]?.text||'';
  const mm=txt.match(/\{[\s\S]*\}/);
  try{return res.status(200).json(JSON.parse(mm?mm[0]:txt));}
  catch{return res.status(502).json({error:'Resposta inválida da IA'});}
}
