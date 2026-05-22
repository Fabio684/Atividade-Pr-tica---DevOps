import { initializeApp, getApps } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile, type Auth } from "firebase/auth";
import type { LocalUser } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyDs7ChLl5aNbZBxHuF0z5YTEAWJ_Tn-cvw",
  authDomain: "devops-57d46.firebaseapp.com",
  databaseURL: "https://devops-57d46-default-rtdb.firebaseio.com",
  projectId: "devops-57d46",
  storageBucket: "devops-57d46.firebasestorage.app",
  messagingSenderId: "658371538608",
  appId: "1:658371538608:web:c6a25eb6d5ae678923d575",
};

const usersKey = "favorites_ui_users";

export function initFirebaseAuth(): Auth | null {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    return getAuth(app);
  } catch {
    return null;
  }
}

export function watchAuthState(auth: Auth | null, callback: (email: string | null) => void): (() => void) | undefined {
  if (!auth) {
    return undefined;
  }

  return onAuthStateChanged(auth, (user) => callback(user?.email || null));
}

export async function firebaseLogin(auth: Auth, email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseRegister(auth: Auth, email: string, password: string, name: string): Promise<void> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (credential.user) {
    await updateProfile(credential.user, { displayName: name });
  }
}

export async function firebaseLogout(auth: Auth): Promise<void> {
  await signOut(auth);
}

export function getLocalUsers(): LocalUser[] {
  try {
    const raw = localStorage.getItem(usersKey);
    return raw ? (JSON.parse(raw) as LocalUser[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalUsers(users: LocalUser[]): void {
  localStorage.setItem(usersKey, JSON.stringify(users));
}

export function findLocalUserByEmail(email: string): LocalUser | undefined {
  return getLocalUsers().find((user) => user.email.toLowerCase() === email.toLowerCase());
}

export function isAdminCredential(email: string, password: string): boolean {
  return email.toLowerCase() === "leonfabio161@gmail.com" && password === "leon123";
}