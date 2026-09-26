# Backend IA — Ótica Lclass

Estrutura preparada para retirar as chamadas de IA do navegador.

## Variável secreta
Configure no ambiente do servidor:

ANTHROPIC_API_KEY=...

Nunca grave a chave no index.html ou no repositório.

## Endpoint
POST /api/vision

Body JSON:
- task: "pupilometria" ou "estoque"
- image: data URL da imagem

O servidor escolhe o prompt; o navegador não envia nem recebe a chave.

> Esta pasta é a preparação de homologação. Para ativar em produção é necessário hospedar este endpoint em um backend/serverless e configurar a variável secreta no provedor.
