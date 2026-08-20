// src/lib/userStore.mjs
import fs from 'fs';
import path from 'path';

// On Vercel / AWS Lambda, use writable /tmp; on local dev, use ./data
const DATA_DIR = (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
  ? path.join('/tmp', 'data')
  : path.join(process.cwd(), 'data');

const DB_FILE = path.join(DATA_DIR, 'users.json');

function ensureDB() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([]), 'utf-8');
    }
  } catch (err) {
    console.error('[UserStore Error] ensureDB failed:', err);
  }
}

export function getUsers() {
  ensureDB();
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error('[UserStore Error] getUsers failed:', err);
    return [];
  }
}

export function saveUsers(users) {
  ensureDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[UserStore Error] saveUsers failed:', err);
  }
}

export function findUserByEmail(email) {
  if (!email) return null;
  const users = getUsers();
  return users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserById(id) {
  if (!id) return null;
  const users = getUsers();
  return users.find((u) => u.id === id) || null;
}

export function createUser(userData) {
  const users = getUsers();
  users.push(userData);
  saveUsers(users);
  return userData;
}

export function updateUser(id, updates) {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    saveUsers(users);
    return users[index];
  }
  return null;
}
