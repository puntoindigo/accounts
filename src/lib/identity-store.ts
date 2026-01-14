import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { debugError } from './debug';

export interface Person {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  active: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LegacyEmployee {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginEvent {
  id: string;
  provider: string;
  userId: string;
  name: string;
  email?: string | null;
  timestamp: string;
}

export interface AuthConfig {
  allowedGoogleEmails: string[];
  allowedFaceLegajos: string[];
  allowedFaceEmployeeIds: string[];
}

interface IdentityData {
  persons?: Person[];
  employees?: LegacyEmployee[];
  loginEvents?: LoginEvent[];
  authConfig?: AuthConfig;
}

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'accounts-data')
  : path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'identities.json');

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    const initialData: IdentityData = { persons: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

async function readData(): Promise<IdentityData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as IdentityData;
  const legacyEmployees = parsed.employees ?? [];
  const migratedPersons: Person[] = legacyEmployees.map(emp => ({
    id: emp.id,
    email: emp.legajo,
    nombre: emp.nombre,
    empresa: emp.empresa,
    faceDescriptor: emp.faceDescriptor ?? null,
    active: true,
    isAdmin: false,
    createdAt: emp.createdAt,
    updatedAt: emp.updatedAt
  }));
  return {
    persons: parsed.persons ?? migratedPersons,
    loginEvents: parsed.loginEvents ?? [],
    authConfig: parsed.authConfig ?? {
      allowedGoogleEmails: [],
      allowedFaceLegajos: [],
      allowedFaceEmployeeIds: []
    }
  };
}

async function writeData(data: IdentityData): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function listPersons(): Promise<Person[]> {
  const data = await readData();
  return data.persons ?? [];
}

export async function getPerson(id: string): Promise<Person | null> {
  const data = await readData();
  return (data.persons ?? []).find(person => person.id === id) ?? null;
}

export async function getPersonByEmail(email: string): Promise<Person | null> {
  const data = await readData();
  const normalized = email.trim().toLowerCase();
  return (data.persons ?? []).find(person => person.email.toLowerCase() === normalized) ?? null;
}

export async function createPerson(input: {
  email: string;
  nombre: string;
  empresa: string;
  active?: boolean;
  isAdmin?: boolean;
}): Promise<Person> {
  const data = await readData();
  const now = new Date().toISOString();
  const person: Person = {
    id: randomUUID(),
    email: input.email.trim().toLowerCase(),
    nombre: input.nombre.trim(),
    empresa: input.empresa.trim(),
    faceDescriptor: null,
    active: input.active ?? true,
    isAdmin: input.isAdmin ?? false,
    createdAt: now,
    updatedAt: now
  };

  data.persons = data.persons ?? [];
  data.persons.push(person);
  await writeData(data);
  return person;
}

export async function updatePerson(
  id: string,
  updates: Partial<Pick<Person, 'email' | 'nombre' | 'empresa' | 'active' | 'isAdmin'>>
): Promise<Person | null> {
  const data = await readData();
  const persons = data.persons ?? [];
  const index = persons.findIndex(person => person.id === id);
  if (index === -1) {
    return null;
  }

  const existing = persons[index];
  const updated: Person = {
    ...existing,
    email: updates.email?.trim().toLowerCase() ?? existing.email,
    nombre: updates.nombre?.trim() ?? existing.nombre,
    empresa: updates.empresa?.trim() ?? existing.empresa,
    active: typeof updates.active === 'boolean' ? updates.active : existing.active,
    isAdmin: typeof updates.isAdmin === 'boolean' ? updates.isAdmin : existing.isAdmin,
    updatedAt: new Date().toISOString()
  };

  persons[index] = updated;
  data.persons = persons;
  await writeData(data);
  return updated;
}

export async function deletePerson(id: string): Promise<boolean> {
  const data = await readData();
  const persons = data.persons ?? [];
  const nextPersons = persons.filter(person => person.id !== id);
  if (nextPersons.length === persons.length) {
    return false;
  }
  data.persons = nextPersons;
  await writeData(data);
  return true;
}

export async function saveFaceDescriptor(
  id: string,
  descriptor: number[]
): Promise<Person | null> {
  const data = await readData();
  const persons = data.persons ?? [];
  const index = persons.findIndex(person => person.id === id);
  if (index === -1) {
    return null;
  }

  const updated: Person = {
    ...persons[index],
    faceDescriptor: descriptor,
    updatedAt: new Date().toISOString()
  };

  persons[index] = updated;
  data.persons = persons;
  await writeData(data);
  return updated;
}

export async function clearFaceDescriptor(id: string): Promise<Person | null> {
  const data = await readData();
  const persons = data.persons ?? [];
  const index = persons.findIndex(person => person.id === id);
  if (index === -1) {
    return null;
  }

  const updated: Person = {
    ...persons[index],
    faceDescriptor: null,
    updatedAt: new Date().toISOString()
  };

  persons[index] = updated;
  data.persons = persons;
  await writeData(data);
  return updated;
}

export async function safeReadPersons(): Promise<Person[]> {
  try {
    return await listPersons();
  } catch (error) {
    debugError('Error leyendo identidades:', error);
    return [];
  }
}

export async function listLoginEvents(): Promise<LoginEvent[]> {
  const data = await readData();
  return data.loginEvents ?? [];
}

export async function recordLoginEvent(event: Omit<LoginEvent, 'id' | 'timestamp'>): Promise<LoginEvent> {
  const data = await readData();
  const loginEvents = data.loginEvents ?? [];
  const entry: LoginEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...event
  };

  loginEvents.unshift(entry);
  data.loginEvents = loginEvents.slice(0, 100);
  await writeData(data);
  return entry;
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const data = await readData();
  return data.authConfig ?? {
    allowedGoogleEmails: [],
    allowedFaceLegajos: [],
    allowedFaceEmployeeIds: []
  };
}

export async function updateAuthConfig(config: AuthConfig): Promise<AuthConfig> {
  const data = await readData();
  const normalized: AuthConfig = {
    allowedGoogleEmails: config.allowedGoogleEmails.map(value => value.trim().toLowerCase()).filter(Boolean),
    allowedFaceLegajos: config.allowedFaceLegajos.map(value => value.trim()).filter(Boolean),
    allowedFaceEmployeeIds: config.allowedFaceEmployeeIds.map(value => value.trim()).filter(Boolean)
  };

  data.authConfig = normalized;
  await writeData(data);
  return normalized;
}
