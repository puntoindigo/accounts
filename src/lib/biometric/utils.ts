/**
 * Calcula la distancia euclidiana entre dos descriptores faciales.
 */
export function euclideanDistance(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Los descriptores deben tener la misma longitud');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i += 1) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Umbral de distancia para considerar que dos rostros son la misma persona.
 */
export const FACE_MATCH_THRESHOLD = 0.6;

/**
 * Compara un descriptor con una lista de descriptores guardados.
 */
export function findMatchingFace(
  currentDescriptor: Float32Array | number[],
  savedDescriptors: Array<{ descriptor: Float32Array | number[]; id: string }>
): { id: string; distance: number } | null {
  let bestMatch: { id: string; distance: number } | null = null;
  let minDistance = Infinity;

  for (const saved of savedDescriptors) {
    const distance = euclideanDistance(currentDescriptor, saved.descriptor);

    if (distance < minDistance && distance < FACE_MATCH_THRESHOLD) {
      minDistance = distance;
      bestMatch = {
        id: saved.id,
        distance
      };
    }
  }

  return bestMatch;
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export function arrayToDescriptor(array: number[]): Float32Array {
  return new Float32Array(array);
}
