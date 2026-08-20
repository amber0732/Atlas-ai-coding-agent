// src/lib/userStore.mjs
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'users.json');

function ensureDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

export function getUsers() {
  ensureDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveUsers(users) {
  ensureDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(users, null, 2));
}

export function findUserByEmail(email) {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id) {
  const users = getUsers();
  return users.find((u) => u.id === id);
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
