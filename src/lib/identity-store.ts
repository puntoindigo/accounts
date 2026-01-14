import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { debugError } from './debug';

export interface Employee {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  createdAt: string;
  updatedAt: string;
}

interface IdentityData {
  employees: Employee[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'identities.json');

async function ensureDataFile(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_FILE);
  } catch {
    const initialData: IdentityData = { employees: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

async function readData(): Promise<IdentityData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as IdentityData;
}

async function writeData(data: IdentityData): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function listEmployees(): Promise<Employee[]> {
  const data = await readData();
  return data.employees;
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const data = await readData();
  return data.employees.find(emp => emp.id === id) ?? null;
}

export async function createEmployee(input: {
  legajo: string;
  nombre: string;
  empresa: string;
}): Promise<Employee> {
  const data = await readData();
  const now = new Date().toISOString();
  const employee: Employee = {
    id: randomUUID(),
    legajo: input.legajo.trim(),
    nombre: input.nombre.trim(),
    empresa: input.empresa.trim(),
    faceDescriptor: null,
    createdAt: now,
    updatedAt: now
  };

  data.employees.push(employee);
  await writeData(data);
  return employee;
}

export async function updateEmployee(
  id: string,
  updates: Partial<Pick<Employee, 'legajo' | 'nombre' | 'empresa'>>
): Promise<Employee | null> {
  const data = await readData();
  const index = data.employees.findIndex(emp => emp.id === id);
  if (index === -1) {
    return null;
  }

  const existing = data.employees[index];
  const updated: Employee = {
    ...existing,
    legajo: updates.legajo?.trim() ?? existing.legajo,
    nombre: updates.nombre?.trim() ?? existing.nombre,
    empresa: updates.empresa?.trim() ?? existing.empresa,
    updatedAt: new Date().toISOString()
  };

  data.employees[index] = updated;
  await writeData(data);
  return updated;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const data = await readData();
  const nextEmployees = data.employees.filter(emp => emp.id !== id);
  if (nextEmployees.length === data.employees.length) {
    return false;
  }
  data.employees = nextEmployees;
  await writeData(data);
  return true;
}

export async function saveFaceDescriptor(
  id: string,
  descriptor: number[]
): Promise<Employee | null> {
  const data = await readData();
  const index = data.employees.findIndex(emp => emp.id === id);
  if (index === -1) {
    return null;
  }

  const updated: Employee = {
    ...data.employees[index],
    faceDescriptor: descriptor,
    updatedAt: new Date().toISOString()
  };

  data.employees[index] = updated;
  await writeData(data);
  return updated;
}

export async function clearFaceDescriptor(id: string): Promise<Employee | null> {
  const data = await readData();
  const index = data.employees.findIndex(emp => emp.id === id);
  if (index === -1) {
    return null;
  }

  const updated: Employee = {
    ...data.employees[index],
    faceDescriptor: null,
    updatedAt: new Date().toISOString()
  };

  data.employees[index] = updated;
  await writeData(data);
  return updated;
}

export async function safeReadEmployees(): Promise<Employee[]> {
  try {
    return await listEmployees();
  } catch (error) {
    debugError('Error leyendo identidades:', error);
    return [];
  }
}
