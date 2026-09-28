'use strict';

const express = require('express');
const { Firestore } = require('@google-cloud/firestore');

const app = express();
const PORT = process.env.PORT || 8080;

const db = new Firestore({
  projectId: 'otica-lclass',
  databaseId: '(default)'
});

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
  try {
    await db.listCollections();
    res.status(200).json({
      ok: true,
      service: 'otica-lclass-backend-operacional',
      firestore: 'connected'
    });
  } catch (error) {
    console.error('Firestore health check:', error);
    res.status(503).json({
      ok: false,
      service: 'otica-lclass-backend-operacional',
      firestore: 'unavailable'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend operacional ativo na porta ${PORT}`);
});
