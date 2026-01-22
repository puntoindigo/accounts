// RFID deshabilitado temporalmente - todo el componente comentado
/*
'use client';

import { useEffect, useRef, useState } from 'react';

type RfidStatus = 'waiting' | 'reading' | 'found' | 'not_found' | 'error';

interface RfidPerson {
  id: string;
  email: string;
  nombre: string;
  empresa: string;
  active: boolean;
}

export default function RfidPage() {
  const [status, setStatus] = useState<RfidStatus>('waiting');
  const [uid, setUid] = useState('');
  const [person, setPerson] = useState<RfidPerson | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (status === 'found' || status === 'not_found') {
      const timer = setTimeout(() => {
        setStatus('waiting');
        setUid('');
        setPerson(null);
        if (inputRef.current) {
          inputRef.current.value = '';
          inputRef.current.focus();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status]);

  const handleVerify = async (value: string) => {
    const normalized = value.trim().replace(/\s+/g, '');
    if (!normalized) {
      return;
    }
    setUid(normalized);
    setStatus('reading');
    try {
      const response = await fetch('/api/rfid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: normalized })
      });
      const data = await response.json();
      if (data?.found && data?.person) {
        setPerson(data.person);
        setStatus('found');
      } else {
        setPerson(null);
        setStatus('not_found');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Verificar RFID</h1>
          <p className="text-sm text-slate-600">
            Acercá una tarjeta o pegá el UID para verificar a qué persona pertenece.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <label className="text-sm font-medium">UID de tarjeta</label>
          <input
            ref={inputRef}
            type="text"
            placeholder="UID..."
            className="w-full rounded border border-slate-200 px-3 py-2 text-sm font-mono"
            onChange={(event) => {
              const value = event.target.value;
              if (value.includes('\n') || value.length >= 10) {
                const uidValue = value.replace(/\n/g, '').trim();
                handleVerify(uidValue);
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && inputRef.current?.value) {
                event.preventDefault();
                handleVerify(inputRef.current.value);
                inputRef.current.value = '';
              }
            }}
          />
          <p className="text-xs text-slate-500">
            Presioná Enter o esperá a que el lector escriba automáticamente.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="text-lg font-semibold">Estado</h2>
          <p className="text-sm text-slate-600">
            {status === 'waiting' && 'Esperando tarjeta...'}
            {status === 'reading' && 'Leyendo tarjeta...'}
            {status === 'found' && 'Tarjeta encontrada'}
            {status === 'not_found' && 'Tarjeta no registrada'}
            {status === 'error' && 'Error verificando tarjeta'}
          </p>
          {uid && (
            <p className="text-xs text-slate-500">UID leído: {uid}</p>
          )}
        </section>

        {status === 'found' && person && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-2">
            <h3 className="text-lg font-semibold text-emerald-800">Persona asociada</h3>
            <p className="text-sm text-emerald-800">{person.nombre}</p>
            <p className="text-xs text-emerald-700">{person.email}</p>
            <p className="text-xs text-emerald-700">{person.empresa}</p>
          </section>
        )}
      </div>
    </div>
  );
}
