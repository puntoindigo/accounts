import { debugError } from './debug';
import { getSupabaseAdmin, supabaseServiceKey, supabaseUrl } from './supabase-admin';

export interface Person {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  faceDescriptor: number[] | null;
  faceImageUrl: string | null;
  active: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ActivityStatus = 'success' | 'failed';

export interface ActivityEvent {
  id: string;
  personId: string | null;
  email: string | null;
  provider: string;
  status: ActivityStatus;
  reason: string | null;
  ip: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface RfidCard {
  id: string;
  personId: string;
  uid: string;
  active: boolean;
  createdAt: string;
}

const ensureSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }
};

const mapPerson = (row: any): Person => ({
  id: row.id,
  email: row.email,
  nombre: row.nombre,
  empresa: row.empresa,
  faceDescriptor: row.face_descriptor ?? null,
  faceImageUrl: row.face_image_url ?? null,
  active: row.active,
  isAdmin: row.is_admin,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapActivity = (row: any): ActivityEvent => ({
  id: row.id,
  personId: row.person_id,
  email: row.email,
  provider: row.provider,
  status: row.status,
  reason: row.reason,
  ip: row.ip,
  city: row.city,
  country: row.country,
  userAgent: row.user_agent,
  createdAt: row.created_at
});

const mapRfidCard = (row: any): RfidCard => ({
  id: row.id,
  personId: row.person_id,
  uid: row.uid,
  active: row.active,
  createdAt: row.created_at
});

export async function listPersons(): Promise<Person[]> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return mapPerson(data);
}

export async function getPersonByEmail(email: string): Promise<Person | null> {
  ensureSupabase();
  const normalized = email.trim().toLowerCase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .select('*')
    .eq('email', normalized)
    .single();
  if (error) return null;
  return mapPerson(data);
}

export async function createPerson(input: {
  email: string;
  nombre: string;
  empresa: string;
  active?: boolean;
  isAdmin?: boolean;
}): Promise<Person> {
  ensureSupabase();
  const payload = {
    email: input.email.trim().toLowerCase(),
    nombre: input.nombre.trim(),
    empresa: input.empresa.trim(),
    active: input.active ?? true,
    is_admin: input.isAdmin ?? false
  };

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapPerson(data);
}

export async function updatePerson(
  id: string,
  updates: Partial<Pick<Person, 'email' | 'nombre' | 'empresa' | 'active' | 'isAdmin'>>
): Promise<Person | null> {
  ensureSupabase();
  const payload: Record<string, any> = {};
  if (updates.email !== undefined) payload.email = updates.email.trim().toLowerCase();
  if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim();
  if (updates.empresa !== undefined) payload.empresa = updates.empresa.trim();
  if (typeof updates.active === 'boolean') payload.active = updates.active;
  if (typeof updates.isAdmin === 'boolean') payload.is_admin = updates.isAdmin;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) return null;
  return mapPerson(data);
}

export async function deletePerson(id: string): Promise<boolean> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('accounts_persons')
    .delete()
    .eq('id', id);
  return !error;
}

export async function saveFaceDescriptor(
  id: string,
  descriptor: number[],
  imageUrl?: string | null
): Promise<Person | null> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const existing = await getPerson(id);
  if (!existing) {
    return null;
  }
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .update({ face_descriptor: descriptor, face_image_url: imageUrl ?? null })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapPerson(data) : existing;
}

export async function clearFaceDescriptor(id: string): Promise<Person | null> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_persons')
    .update({ face_descriptor: null, face_image_url: null })
    .eq('id', id)
    .select('*')
    .single();
  if (error) return null;
  return mapPerson(data);
}

export async function listActivity(status?: ActivityStatus): Promise<ActivityEvent[]> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  let query = supabaseAdmin.from('accounts_activity').select('*').order('created_at', { ascending: false });
  if (status) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapActivity);
}

export async function recordActivityEvent(event: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<void> {
  try {
    ensureSupabase();
    const supabaseAdmin = getSupabaseAdmin();
    const payload = {
      person_id: event.personId,
      email: event.email,
      provider: event.provider,
      status: event.status,
      reason: event.reason,
      ip: event.ip,
      city: event.city,
      country: event.country,
      user_agent: event.userAgent
    };
    const { error } = await supabaseAdmin.from('accounts_activity').insert(payload);
    if (error) throw error;
  } catch (error) {
    debugError('Error guardando actividad:', error);
  }
}

export async function listRfidCards(personId: string): Promise<RfidCard[]> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_rfid_cards')
    .select('*')
    .eq('person_id', personId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRfidCard);
}

export async function getRfidCardByUid(uid: string): Promise<RfidCard | null> {
  ensureSupabase();
  const normalizedUid = uid.trim().replace(/\s+/g, '');
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_rfid_cards')
    .select('*')
    .eq('uid', normalizedUid)
    .eq('active', true)
    .single();
  if (error) return null;
  return mapRfidCard(data);
}

export async function createRfidCard(input: { personId: string; uid: string }): Promise<RfidCard> {
  ensureSupabase();
  const payload = {
    person_id: input.personId,
    uid: input.uid.trim().replace(/\s+/g, '')
  };
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_rfid_cards')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return mapRfidCard(data);
}

export async function deactivateRfidCard(cardId: string): Promise<RfidCard | null> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('accounts_rfid_cards')
    .update({ active: false })
    .eq('id', cardId)
    .select('*')
    .single();
  if (error) return null;
  return mapRfidCard(data);
}

export async function deleteRfidCard(cardId: string): Promise<boolean> {
  ensureSupabase();
  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('accounts_rfid_cards')
    .delete()
    .eq('id', cardId);
  return !error;
}
