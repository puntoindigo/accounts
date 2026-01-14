import { arrayToDescriptor, findMatchingFace, FACE_MATCH_THRESHOLD } from './utils';
import type { Person } from '../identity-store';
import { debugError } from '../debug';

export interface FaceMatchResult {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  distance: number;
  confidence: number;
}

export function findEmployeeByFace(
  capturedDescriptor: Float32Array | number[],
  persons: Person[]
): FaceMatchResult | null {
  try {
    const personsWithFace = persons
      .filter(emp => Array.isArray(emp.faceDescriptor) && emp.faceDescriptor.length > 0)
      .map(emp => ({
        id: emp.id,
        email: emp.email,
        nombre: emp.nombre,
        empresa: emp.empresa,
        descriptor: arrayToDescriptor(emp.faceDescriptor as number[])
      }));

    if (personsWithFace.length === 0) {
      return null;
    }

    const match = findMatchingFace(
      capturedDescriptor,
      personsWithFace.map(emp => ({
        descriptor: emp.descriptor,
        id: emp.id
      }))
    );

    if (!match) {
      return null;
    }

    const personData = personsWithFace.find(emp => emp.id === match.id);
    if (!personData) {
      return null;
    }

    const confidence = Math.max(
      0,
      Math.min(100, (1 - match.distance / FACE_MATCH_THRESHOLD) * 100)
    );

    return {
      id: personData.id,
      email: personData.email,
      nombre: personData.nombre,
      empresa: personData.empresa,
      distance: match.distance,
      confidence: Math.round(confidence)
    };
  } catch (error) {
    debugError('Error buscando empleado por rostro:', error);
    return null;
  }
}
