// Config do projeto Firebase "englishprep-lcp". A apiKey web do Firebase é pública por desenho;
// a segurança vem das regras da base de dados (database.rules.json) e dos domínios autorizados.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAht2bMNvkPoVCvvcvtssWjYq-_bJTtT_I',
  authDomain: 'englishprep-lcp.firebaseapp.com',
  databaseURL: 'https://englishprep-lcp-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'englishprep-lcp',
  storageBucket: 'englishprep-lcp.firebasestorage.app',
  messagingSenderId: '921881014914',
  appId: '1:921881014914:web:4792054795c4d67a18ba9b',
};

// Proxy de IA (Cloudflare Worker). Guarda a chave Gemini; o browser nunca a vê.
export const AI_PROXY_URL = 'https://englishprep-ai.lcpiteira.workers.dev/';

export const configured = !FIREBASE_CONFIG.apiKey.startsWith('YOUR');
