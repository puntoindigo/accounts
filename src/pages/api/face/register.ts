import type { NextApiRequest, NextApiResponse } from 'next';
import { saveFaceDescriptor } from '@/lib/identity-store';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const body = req.body || {};
  const personId = String(body?.personId || body?.employeeId || '').trim();
  const descriptor = Array.isArray(body?.descriptor) ? body.descriptor : null;
  const imageUrl = body?.imageUrl ? String(body.imageUrl) : null;

  if (!personId || !descriptor || descriptor.length === 0) {
    return res.status(400).json({ error: 'personId y descriptor son requeridos' });
  }

  try {
    const person = await saveFaceDescriptor(personId, descriptor, imageUrl);
    if (!person) {
      return res.status(404).json({ error: 'Persona no encontrada' });
    }

    return res.status(200).json({ person });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error registrando rostro' });
  }
}
