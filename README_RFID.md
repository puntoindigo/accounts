# Lectura RFID - Instrucciones de Uso

## Resumen

El dispositivo **wCopy Smart Reader** no soporta lectura vía WebHID. Por lo tanto, usamos un enfoque híbrido:

- **Escritura**: Vía WebHID (funciona directamente desde el navegador)
- **Lectura**: Vía script Node.js con PC/SC (requiere ejecutar un script)

## Instalación

### 1. Instalar dependencias Node.js

```bash
npm install nfc-pcsc
```

### 2. Instalar PC/SC (solo necesario para lectura)

**macOS:**
```bash
brew install pcsc-lite
```

**Linux:**
```bash
sudo apt-get install pcscd libpcsclite1
```

**Windows:**
PC/SC viene preinstalado en Windows.

## Uso

### Lectura de Tarjetas

1. **Iniciar el script de lectura:**
   ```bash
   # Desarrollo (localhost)
   npm run rfid:read
   
   # Producción
   npm run rfid:read:prod
   ```

2. **Abrir la aplicación web** en el navegador

3. **Ir a la sección RFID** y seleccionar modo "Leer"

4. **Pasar la tarjeta** por el lector - el UID aparecerá automáticamente en la web app

El script:
- Detecta automáticamente cuando se conecta el lector
- Lee tarjetas cuando las pasas
- Envía los UIDs a la API automáticamente
- La web app hace polling cada 1 segundo para obtener los nuevos UIDs

### Escritura de Tarjetas

1. **Conectar el dispositivo** vía WebHID (toggle verde en la web app)

2. **Seleccionar modo "Escribir"**

3. **Ingresar o usar el ID automático** (12 dígitos)

4. **Hacer clic en "Escribir en Tarjeta"**

5. **Acercar la tarjeta** al lector inmediatamente

## Variables de Entorno

Para producción, configura:

```bash
SERVER_URL=https://accounts.puntoindigo.com
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

## Solución de Problemas

### El script no detecta el lector

1. Verifica que el lector esté conectado por USB
2. Verifica que PC/SC esté instalado: `brew install pcsc-lite` (macOS)
3. Verifica que el sistema reconozca el dispositivo (Información del Sistema > USB en macOS)

### La web app no muestra los UIDs

1. Verifica que el script esté ejecutándose
2. Verifica que el script esté conectado al servidor correcto (revisa los logs)
3. Verifica que la web app esté en modo "Leer"
4. Revisa la consola del navegador para ver si hay errores de polling

### El script se desconecta

- El script se mantiene ejecutándose hasta que lo detengas (Ctrl+C)
- Si se desconecta, simplemente vuelve a ejecutarlo

## Arquitectura

```
┌─────────────────┐
│  Script Node.js │  (Lee tarjetas vía PC/SC)
│  rfid-reader.js │
└────────┬────────┘
         │ POST /api/rfid/last-read
         ▼
┌─────────────────┐
│   API Next.js   │  (Guarda en Supabase)
│  /api/rfid/     │
│  last-read      │
└────────┬────────┘
         │ GET /api/rfid/last-read (polling cada 1s)
         ▼
┌─────────────────┐
│  Web App React  │  (Muestra y procesa UIDs)
│  RfidManager    │
└─────────────────┘
```

## Notas

- El script debe ejecutarse en la misma máquina donde está conectado el lector
- El script puede ejecutarse en segundo plano
- La web app hace polling automático cuando está en modo "Leer"
- Los UIDs se guardan en Supabase en la tabla `app_config` con key `rfid_last_read`
