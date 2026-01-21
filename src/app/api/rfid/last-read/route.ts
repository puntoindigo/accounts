// app/api/rfid/last-read/route.ts
// Endpoint API para recibir y obtener el último UID leído desde el script Node.js

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Clave fija para almacenar el último UID
const RFID_LAST_READ_KEY = 'rfid_last_read';

// POST: Recibir UID desde el script Node.js
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    const body = await request.json();
    const { uid, timestamp } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'UID requerido' },
        { status: 400 }
      );
    }

    const cardData = {
      uid: String(uid),
      timestamp: timestamp || new Date().toISOString()
    };

    console.log('📱 Tarjeta RFID recibida:', cardData);

    // Guardar en Supabase usando app_config
    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert({
        id: RFID_LAST_READ_KEY,
        key: RFID_LAST_READ_KEY,
        value: cardData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (upsertError) {
      console.error('Error guardando tarjeta en Supabase:', upsertError);
      // Si falla, intentar crear la tabla o usar método alternativo
      // Por ahora, continuar aunque falle para no bloquear
    }

    return NextResponse.json({
      success: true,
      uid: cardData.uid,
      timestamp: cardData.timestamp
    });
  } catch (error) {
    console.error('Error procesando tarjeta RFID:', error);
    return NextResponse.json(
      { error: 'Error procesando tarjeta' },
      { status: 500 }
    );
  }
}

// GET: Obtener el último UID leído
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('app_config')
      .select('value, updated_at')
      .eq('key', RFID_LAST_READ_KEY)
      .single();

    if (error || !data) {
      // Si no existe, retornar null (primera vez)
      return NextResponse.json({
        success: true,
        card: null,
        timestamp: new Date().toISOString()
      });
    }

    // value es JSONB, así que viene como objeto directamente
    const cardData = data.value;
    if (cardData && typeof cardData === 'object') {
      return NextResponse.json({
        success: true,
        card: cardData,
        timestamp: data.updated_at || new Date().toISOString()
      });
    } else {
      // Si por alguna razón viene como string, intentar parsear
      try {
        const parsed = typeof cardData === 'string' ? JSON.parse(cardData) : cardData;
        return NextResponse.json({
          success: true,
          card: parsed,
          timestamp: data.updated_at || new Date().toISOString()
        });
      } catch (parseError) {
        console.error('Error parseando datos de tarjeta:', parseError);
        return NextResponse.json({
          success: true,
          card: null,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error obteniendo tarjeta RFID:', error);
    return NextResponse.json({
      success: true,
      card: null,
      timestamp: new Date().toISOString()
    });
  }
}
