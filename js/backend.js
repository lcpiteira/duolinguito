// Auth + base de dados. Firebase quando configurado; caso contrário localStorage (modo local).
import { FIREBASE_CONFIG, configured } from './config.js';

export const mode = configured ? 'firebase' : 'local';
let auth, db;
const localListeners = [];
const LOCAL_USER_KEY = 'eng.localUser';
const localDataKey = (uid) => `eng.data.${uid}`;

const toUser = (u) => (u ? { uid: u.uid, name: u.displayName || u.email, email: u.email, photo: u.photoURL } : null);

export function init() {
  if (!configured) return;
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.database();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
}

export function onAuth(cb) {
  if (configured) {
    auth.onAuthStateChanged((u) => cb(toUser(u)));
    return;
  }
  localListeners.push(cb);
  const raw = localStorage.getItem(LOCAL_USER_KEY);
  cb(raw ? JSON.parse(raw) : null);
}

export function startLocal() {
  const user = { uid: 'local', name: 'Modo local', email: '', photo: '' };
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  localListeners.forEach((cb) => cb(user));
}

export async function signInGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked') return auth.signInWithRedirect(provider);
    throw e;
  }
}
export const signInEmail = (email, pass) => auth.signInWithEmailAndPassword(email, pass);
export async function signUpEmail(name, email, pass) {
  const cred = await auth.createUserWithEmailAndPassword(email, pass);
  if (name) await cred.user.updateProfile({ displayName: name });
  return cred;
}
export const resetPassword = (email) => auth.sendPasswordResetEmail(email);

export async function signOut() {
  if (configured) return auth.signOut();
  localStorage.removeItem(LOCAL_USER_KEY);
  localListeners.forEach((cb) => cb(null));
}

export function authMessage(e) {
  const map = {
    'auth/invalid-email': 'Email inválido.',
    'auth/user-not-found': 'Não existe conta com este email.',
    'auth/wrong-password': 'Password errada.',
    'auth/invalid-credential': 'Email ou password incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com este email.',
    'auth/weak-password': 'A password tem de ter pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiadas tentativas. Tenta daqui a pouco.',
    'auth/popup-closed-by-user': 'Login cancelado.',
    'auth/unauthorized-domain': 'Domínio não autorizado no Firebase (Authentication → Authorized domains).',
    'auth/network-request-failed': 'Sem ligação à internet.',
  };
  return map[e.code] || e.message || 'Erro de autenticação.';
}

// ---- dados do utilizador (users/{uid}) ----
export async function loadUser(uid) {
  if (configured) return (await db.ref(`users/${uid}`).once('value')).val() || {};
  return JSON.parse(localStorage.getItem(localDataKey(uid)) || '{}');
}

// updates: { 'topics/future': {...}, 'mistakes/abc': null }  (caminhos relativos a users/{uid})
export async function writeUser(uid, updates) {
  if (configured) return db.ref(`users/${uid}`).update(updates);
  const data = JSON.parse(localStorage.getItem(localDataKey(uid)) || '{}');
  for (const [path, value] of Object.entries(updates)) {
    const keys = path.split('/');
    const last = keys.pop();
    let node = data;
    for (const k of keys) node = node[k] ??= {};
    if (value === null) delete node[last];
    else node[last] = value;
  }
  localStorage.setItem(localDataKey(uid), JSON.stringify(data));
}

// Chave Gemini partilhada opcional (config/geminiApiKey), como no BoraAli.
export async function sharedGeminiKey() {
  if (!configured) return null;
  try {
    return (await db.ref('config/geminiApiKey').once('value')).val() || null;
  } catch {
    return null;
  }
}
