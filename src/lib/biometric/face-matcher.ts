import { arrayToDescriptor, findMatchingFace, FACE_MATCH_THRESHOLD } from './utils';
import type { Employee } from '../identity-store';
import { debugError } from '../debug';

export interface FaceMatchResult {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  distance: number;
  confidence: number;
}

export function findEmployeeByFace(
  capturedDescriptor: Float32Array | number[],
  employees: Employee[]
): FaceMatchResult | null {
  try {
    const employeesWithFace = employees
      .filter(emp => Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length > 0)
      .map(emp => ({
        id: emp.id,
        legajo: emp.legajo,
        nombre: emp.nombre,
        empresa: emp.empresa,
        descriptor: arrayToDescriptor(emp.faceDescriptor as number[])
      }));

    if (employeesWithFace.length === 0) {
      return null;
    }

    const match = findMatchingFace(
      capturedDescriptor,
      employeesWithFace.map(emp => ({
        descriptor: emp.descriptor,
        id: emp.id
      }))
    );

    if (!match) {
      return null;
    }

    const employeeData = employeesWithFace.find(emp => emp.id === match.id);
    if (!employeeData) {
      return null;
    }

    const confidence = Math.max(
      0,
      Math.min(100, (1 - match.distance / FACE_MATCH_THRESHOLD) * 100)
    );

    return {
      id: employeeData.id,
      legajo: employeeData.legajo,
      nombre: employeeData.nombre,
      empresa: employeeData.empresa,
      distance: match.distance,
      confidence: Math.round(confidence)
    };
  } catch (error) {
    debugError('Error buscando empleado por rostro:', error);
    return null;
  }
}
