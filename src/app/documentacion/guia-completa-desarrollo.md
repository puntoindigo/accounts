# Guía Completa de Desarrollo - Accounts: Sistema de Validación de Identidad Biométrica

## 📋 Tabla de Contenidos

1. [Objetivo y Visión del Producto](#objetivo-y-visión-del-producto)
2. [Contexto y Casos de Uso](#contexto-y-casos-de-uso)
3. [Arquitectura Técnica](#arquitectura-técnica)
4. [Funcionalidades Implementadas](#funcionalidades-implementadas)
5. [Documentación de APIs](#documentación-de-apis)
6. [Integración con Sistemas Externos](#integración-con-sistemas-externos)
7. [Caso de Uso: Caja de Proveeduría del Camping](#caso-de-uso-caja-de-proveeduría-del-camping)
8. [Guía de Producción](#guía-de-producción)
9. [Roadmap y Mejoras Pendientes](#roadmap-y-mejoras-pendientes)

---

## 🎯 Objetivo y Visión del Producto

### Objetivo Principal

**Accounts** es un sistema de validación de identidad biométrica diseñado para reemplazar sistemas de autenticación tradicionales (como OAuth) y proporcionar un servicio centralizado de identidad que puede integrarse en cualquier aplicación web o móvil mediante plugins, widgets embebibles o APIs.

### Propuesta de Valor

- **Validación Multi-Método**: Soporta autenticación mediante Google Account, Reconocimiento Facial (Face Recognition) y RFID
- **Embebible y Distribuible**: Puede integrarse en cualquier aplicación mediante CDN, plugin de WordPress, o API REST
- **Centralizado**: Un solo punto de verdad para la identidad de usuarios, compartible entre múltiples aplicaciones
- **Auditable**: Registro completo de eventos de autenticación con metadata (IP, geolocalización, user-agent)
- **Escalable**: Arquitectura multi-tenant preparada para múltiples aplicaciones cliente

### Modelo de Negocio

El sistema está diseñado para ser comercializado como:
- **Plugin de WordPress**: Instalación simple en sitios WordPress para control de acceso
- **Widget CDN**: Integración mediante script embebible (similar a Google Tag Manager)
- **API REST**: Para integraciones personalizadas en aplicaciones propias
- **SaaS Multi-tenant**: Múltiples clientes pueden usar el mismo servicio con sus propias configuraciones

---

## 🌍 Contexto y Casos de Uso

### Casos de Uso Principales

#### 1. Control de Acceso a Recursos Digitales
- **Acceso a cámaras de seguridad**: Validar identidad antes de permitir visualización de feeds
- **Acceso a carpetas/documentos**: Control granular sobre quién puede acceder a qué información
- **Acceso a datos sensibles**: Protección de información confidencial con validación biométrica

#### 2. Integración con Sistemas de Gestión
- **Remitero**: Vinculación de identidad de Accounts con clientes/empresas en el sistema de remitos
- **Recibos**: Validación de identidad para autorizar descuentos en recibos de sueldo
- **Sistemas de punto de venta**: Validación en cajas registradoras y terminales

#### 3. Caso Específico: Caja de Proveeduría del Camping

**Flujo Completo de Integración:**

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Empleado en   │────▶│   Accounts   │────▶│  Remitero   │────▶│   Recibos    │
│  Proveeduría    │     │  (Validación)│     │  (Venta)    │     │ (Descuento)  │
└─────────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
```

**Escenario Detallado:**

1. **Empleado llega a la caja de proveeduría**
   - Presenta su tarjeta RFID o se valida mediante Face Recognition
   - Accounts valida la identidad y devuelve el `accountsPersonId`

2. **Registro de venta en Remitero**
   - El sistema de caja consulta Remitero con el `accountsPersonId`
   - Remitero identifica al cliente/empleado vinculado
   - Se registra la venta: productos, importe, fecha, hora
   - Remitero actualiza stock y genera registro de transacción

3. **Monitoreo de ganancias y stock**
   - Remitero genera reportes en tiempo real de ventas
   - Control de stock automático por producto
   - Análisis de ganancias por período, empleado, producto

4. **Descuento en recibo de sueldo**
   - Al finalizar el período, Recibos consulta las ventas del empleado
   - Calcula el total adeudado (suma de todas las compras)
   - Genera descuento automático en el recibo de sueldo
   - El empleado ve el desglose: "Descuento por compras en proveeduría: $X.XXX"

**Beneficios del Flujo Integrado:**
- ✅ Control de acceso físico y digital unificado
- ✅ Trazabilidad completa: quién compró qué, cuándo y cuánto
- ✅ Automatización del descuento (sin intervención manual)
- ✅ Prevención de fraudes mediante validación biométrica
- ✅ Auditoría completa de transacciones

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

- **Frontend**: Next.js 16.1.1 (App Router), React 19.2.3, TypeScript
- **Estilos**: Tailwind CSS 4
- **Backend**: Next.js API Routes, NextAuth.js 4.24.13
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: NextAuth con múltiples providers
- **Biometría**: face-api.js para reconocimiento facial
- **Deploy**: Vercel

### Estructura de Base de Datos

#### Tabla: `accounts_persons`
```sql
- id: uuid (PK)
- email: text (unique, not null)
- nombre: text (not null)
- empresa: text (not null)
- face_descriptor: jsonb (array de números, descriptor facial)
- face_image_url: text (URL de la imagen del rostro)
- active: boolean (default true)
- is_admin: boolean (default false)
- created_at: timestamptz
- updated_at: timestamptz
```

#### Tabla: `accounts_activity`
```sql
- id: uuid (PK)
- person_id: uuid (FK a accounts_persons, nullable)
- email: text
- provider: text (google, face, rfid)
- status: text (success, failed)
- reason: text (motivo del fallo si aplica)
- ip: text
- city: text
- country: text
- user_agent: text
- created_at: timestamptz
```

#### Tabla: `accounts_rfid_cards`
```sql
- id: uuid (PK)
- person_id: uuid (FK a accounts_persons, cascade delete)
- uid: text (unique, not null) - UID de la tarjeta RFID
- active: boolean (default true)
- created_at: timestamptz
```

### Arquitectura de Autenticación

#### Providers de NextAuth

1. **Google Provider**
   - OAuth 2.0 estándar
   - Valida que el email esté registrado en `accounts_persons`
   - Verifica que la persona esté activa (`active = true`)

2. **Face Recognition Provider** (Credentials)
   - Recibe descriptor facial (array de números)
   - Compara con descriptores almacenados usando distancia euclidiana
   - Threshold de similitud: 0.45 (configurable)
   - Previene re-intentos con el mismo rostro fallido

3. **RFID Provider** (Credentials)
   - Recibe UID de tarjeta
   - Busca tarjeta activa en `accounts_rfid_cards`
   - Valida que la persona asociada esté activa

### Sistema de Tokens Embebibles

#### Generación de Token
- **Algoritmo**: HMAC-SHA256
- **Formato**: JWT-like (body.signature en Base64URL)
- **Payload**:
  ```typescript
  {
    email: string;
    name: string | null;
    isAdmin: boolean;
    iat: number; // timestamp de emisión
    exp: number; // timestamp de expiración (15 minutos)
  }
  ```
- **Secret**: `ACCOUNTS_EMBED_SECRET` (compartido entre Accounts y app cliente)

#### Validación en App Cliente
```typescript
// En recibos-gremio/lib/auth.ts
const payload = verifyAccountsToken(token, secret);
if (payload) {
  // Usuario autenticado, crear sesión
}
```

### Comunicación PostMessage (Widget Embebible)

#### Flujo de Handshake

1. **App cliente carga widget** (`accounts-login.beta.01.js`)
2. **Usuario selecciona método** (Google, FR, RFID)
3. **Widget abre popup** a `/embed/start?method=...&origin=...`
4. **Usuario autentica** en popup
5. **Popup redirige** a `/embed/callback?origin=...`
6. **Callback genera token** y envía `postMessage`:
   ```javascript
   window.opener.postMessage({
     type: 'accounts-login',
     token: '...',
     user: { email, name, isAdmin }
   }, origin);
   ```
7. **Widget recibe mensaje** y llama `onSuccess(token)`
8. **Widget envía ACK** (`accounts-ack`) al popup
9. **Popup cierra** después de recibir ACK

#### Mensajes PostMessage

- `accounts-login`: Autenticación exitosa (incluye token)
- `accounts-error`: Error en autenticación (incluye reason)
- `accounts-ack`: Confirmación de recepción del mensaje

---

## ⚙️ Funcionalidades Implementadas

### 1. Gestión de Personas

#### Crear Persona (Modal con Pasos)
- **Paso 1 - Datos básicos**:
  - Email Gmail (validación automática de formato)
  - Nombre
  - Empresa
  - Botón "Siguiente"

- **Paso 2 - Identidad Facial (Opcional)**:
  - Instrucción: "Active la cámara para registrar su rostro"
  - Componente `FaceRegistrationPicker` para captura
  - Botones: "Omitir", "Cancelar" (con confirmación), "Siguiente"

- **Paso 3 - RFID (Opcional)**:
  - Input para UID de tarjeta
  - Botón "Asociar" (responsive: se apila en móvil)
  - Botones: "Cancelar" (con confirmación), "Finalizar"

#### Editar Persona
- Reutiliza el mismo modal de creación
- Pre-llena formulario con datos existentes
- Botón cambia a "Guardar" / "Guardando..."
- Al guardar, actualiza y cierra modal

#### Eliminar Persona
- Botón en columna "Opciones"
- Modal de confirmación con advertencia
- Elimina persona y todos los datos asociados (cascade delete)

#### Activar/Desactivar Acceso
- Toggle rápido en columna "Opciones"
- Tag visual con tooltip ("Desactivar" / "Reactivar")
- Cursor pointer en tag

### 2. Identidad Facial

#### Registro
- Captura de imagen mediante webcam
- Extracción de descriptor facial (128 números)
- Almacenamiento de descriptor e imagen URL
- Validación de calidad de imagen

#### Verificación
- Captura en tiempo real
- Comparación con todos los descriptores registrados
- Prevención de re-intentos con mismo rostro fallido
- Muestra resultado con confianza y distancia

#### Modo Toggle
- Switch entre "Verificar" y "Registrar"
- UI adaptativa según modo seleccionado

### 3. RFID

#### Asociar Tarjeta
- Input para UID (autofocus automático)
- Validación de formato
- Verificación de duplicados
- Asociación con persona seleccionada

#### Gestión de Tarjetas
- Lista de tarjetas asociadas a persona
- Toggle activar/desactivar (switch estilo x.com)
- Eliminar tarjetas inactivas (con confirmación)
- Contador de tarjetas activas

#### Autenticación
- Input con autofocus en login
- Submit con Enter
- Validación de tarjeta activa y persona activa

### 4. Histórico de Actividad

#### Filtros
- Todos / Exitosos / Fallidos
- Botones con estados visuales

#### Información Mostrada
- Estado (éxito/fallido) con badge de color
- Provider (GOOGLE, FACE, RFID)
- Nombre y empresa de la persona (decode URI)
- IP y geolocalización (decode URI)
- Fecha y hora formateada

#### Paginación
- Carga incremental (10 eventos por vez)
- Botón "Cargar más"

### 5. Widget Embebible (CDN)

#### Características
- **Archivo**: `public/embed/accounts-login.beta.01.js`
- **Instalación**: Script tag con atributos de configuración
- **UI**: Tabs para seleccionar método (Google, FR, RFID)
- **Comunicación**: PostMessage con handshake ACK
- **Estilo**: Similar a x.com (colores, tipografía, espaciado)

#### API del Widget
```javascript
window.AccountsLoginBeta01 = {
  onSuccess: (data) => {
    // data.token, data.user
  },
  onError: (error) => {
    // error.reason
  }
};
```

### 6. Layout y Navegación

#### Sidebar
- Logo/Brand colapsable
- Navegación: Personas, Actividad, Documentación (admin)
- Perfil de usuario con dropdown
- Botón colapsar/expandir
- Imagen de perfil mantiene relación de aspecto al colapsar

#### Header
- Título dinámico según vista
- Descripción contextual
- Acciones rápidas (ej: "Nueva persona")

#### Responsive
- Grid adaptativo (1 columna móvil, 3 columnas desktop)
- Inputs y botones se apilan en pantallas pequeñas
- Breakpoints: `sm:` (640px), `lg:` (1024px)

---

## 📡 Documentación de APIs

### Base URL
```
Producción: https://accounts.puntoindigo.com
Desarrollo: http://localhost:3000
```

### Autenticación

La mayoría de las APIs requieren autenticación mediante sesión de NextAuth. Las excepciones se indican en cada endpoint.

**Headers requeridos:**
```http
Cookie: next-auth.session-token=...
```

### Endpoints de Personas (Employees)

#### `GET /api/employees`
Lista todas las personas registradas.

**Autenticación:** Requerida

**Respuesta exitosa (200):**
```json
{
  "persons": [
    {
      "id": "uuid",
      "email": "usuario@example.com",
      "nombre": "Juan Pérez",
      "empresa": "Empresa S.A.",
      "faceDescriptor": [0.123, -0.456, ...],
      "faceImageUrl": "https://...",
      "active": true,
      "isAdmin": false,
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Errores:**
- `500`: Error cargando personas

---

#### `POST /api/employees`
Crea una nueva persona.

**Autenticación:** Requerida

**Body:**
```json
{
  "email": "usuario@example.com",
  "nombre": "Juan Pérez",
  "empresa": "Empresa S.A."
}
```

**Validaciones:**
- `email`: Requerido, debe contener "@"
- `nombre`: Requerido
- `empresa`: Requerido

**Respuesta exitosa (201):**
```json
{
  "person": {
    "id": "uuid",
    "email": "usuario@example.com",
    "nombre": "Juan Pérez",
    "empresa": "Empresa S.A.",
    "active": true,
    "isAdmin": false,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Errores:**
- `400`: Campos requeridos faltantes o email inválido
- `409`: Email duplicado
- `500`: Error creando persona

---

#### `GET /api/employees/[id]`
Obtiene una persona por ID.

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la persona

**Respuesta exitosa (200):**
```json
{
  "person": {
    "id": "uuid",
    "email": "usuario@example.com",
    "nombre": "Juan Pérez",
    "empresa": "Empresa S.A.",
    "faceDescriptor": [0.123, -0.456, ...],
    "faceImageUrl": "https://...",
    "active": true,
    "isAdmin": false,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**Errores:**
- `404`: Persona no encontrada
- `500`: Error obteniendo persona

---

#### `PATCH /api/employees/[id]`
Actualiza una persona.

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la persona

**Body (todos los campos opcionales):**
```json
{
  "email": "nuevo@example.com",
  "nombre": "Juan Carlos Pérez",
  "empresa": "Nueva Empresa S.A.",
  "active": false,
  "isAdmin": true
}
```

**Respuesta exitosa (200):**
```json
{
  "person": {
    "id": "uuid",
    "email": "nuevo@example.com",
    "nombre": "Juan Carlos Pérez",
    "empresa": "Nueva Empresa S.A.",
    "active": false,
    "isAdmin": true,
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

**Errores:**
- `404`: Persona no encontrada
- `500`: Error actualizando persona

---

#### `DELETE /api/employees/[id]`
Elimina una persona y todos sus datos asociados (cascade delete).

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la persona

**Respuesta exitosa (200):**
```json
{
  "ok": true
}
```

**Errores:**
- `404`: Persona no encontrada
- `500`: Error eliminando persona

---

### Endpoints de Reconocimiento Facial (Face)

#### `POST /api/face/register`
Registra un descriptor facial para una persona.

**Autenticación:** Requerida

**Body:**
```json
{
  "personId": "uuid",
  "descriptor": [0.123, -0.456, 0.789, ...], // Array de 128 números
  "imageUrl": "https://..." // Opcional
}
```

**Nota:** También acepta `employeeId` como alias de `personId`.

**Validaciones:**
- `personId`: Requerido
- `descriptor`: Requerido, debe ser array no vacío

**Respuesta exitosa (200):**
```json
{
  "person": {
    "id": "uuid",
    "faceDescriptor": [0.123, -0.456, ...],
    "faceImageUrl": "https://...",
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

**Errores:**
- `400`: Campos requeridos faltantes o solicitud inválida
- `404`: Persona no encontrada
- `500`: Error registrando rostro

---

#### `POST /api/face/verify`
Verifica un descriptor facial contra todas las personas registradas.

**Autenticación:** No requerida (puede usarse para login)

**Body:**
```json
{
  "descriptor": [0.123, -0.456, 0.789, ...] // Array de 128 números
}
```

**Respuesta exitosa (200):**
```json
{
  "found": true,
  "match": {
    "person": {
      "id": "uuid",
      "email": "usuario@example.com",
      "nombre": "Juan Pérez",
      "empresa": "Empresa S.A.",
      "active": true
    },
    "distance": 0.35,
    "confidence": 0.65
  }
}
```

**Si no se encuentra (200):**
```json
{
  "found": false
}
```

**Errores:**
- `400`: Descriptor requerido
- `500`: Error verificando rostro

---

#### `POST /api/face/remove`
Elimina el descriptor facial de una persona.

**Autenticación:** Requerida

**Body:**
```json
{
  "personId": "uuid"
}
```

**Nota:** También acepta `employeeId` como alias de `personId`.

**Respuesta exitosa (200):**
```json
{
  "person": {
    "id": "uuid",
    "faceDescriptor": null,
    "faceImageUrl": null,
    "updatedAt": "2025-01-15T11:00:00Z"
  }
}
```

**Errores:**
- `400`: personId requerido
- `404`: Persona no encontrada
- `500`: Error removiendo rostro

---

### Endpoints de RFID

#### `POST /api/rfid/verify`
Verifica si un UID de tarjeta RFID está asociado a una persona activa.

**Autenticación:** No requerida (puede usarse para login)

**Body:**
```json
{
  "uid": "A1B2C3D4"
}
```

**Respuesta exitosa (200) - Tarjeta encontrada:**
```json
{
  "found": true,
  "uid": "A1B2C3D4",
  "card": {
    "id": "uuid",
    "personId": "uuid",
    "uid": "A1B2C3D4",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  },
  "person": {
    "id": "uuid",
    "email": "usuario@example.com",
    "nombre": "Juan Pérez",
    "empresa": "Empresa S.A.",
    "active": true
  }
}
```

**Respuesta (200) - Tarjeta no encontrada:**
```json
{
  "found": false,
  "uid": "A1B2C3D4"
}
```

**Respuesta (200) - Persona inactiva:**
```json
{
  "found": false,
  "uid": "A1B2C3D4",
  "reason": "inactive"
}
```

**Errores:**
- `400`: UID requerido
- `500`: Error verificando tarjeta

---

#### `POST /api/rfid/associate`
Asocia una tarjeta RFID a una persona.

**Autenticación:** Requerida

**Body:**
```json
{
  "personId": "uuid",
  "uid": "A1B2C3D4"
}
```

**Validaciones:**
- `personId`: Requerido
- `uid`: Requerido, debe ser único

**Respuesta exitosa (200):**
```json
{
  "card": {
    "id": "uuid",
    "personId": "uuid",
    "uid": "A1B2C3D4",
    "active": true,
    "createdAt": "2025-01-15T11:00:00Z"
  }
}
```

**Errores:**
- `400`: personId y uid requeridos
- `404`: Persona no encontrada
- `409`: UID ya asociado a otra persona
- `500`: Error asociando tarjeta

---

#### `GET /api/rfid/person/[id]`
Lista todas las tarjetas RFID asociadas a una persona.

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la persona

**Respuesta exitosa (200):**
```json
{
  "cards": [
    {
      "id": "uuid",
      "personId": "uuid",
      "uid": "A1B2C3D4",
      "active": true,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Errores:**
- `400`: personId requerido
- `500`: Error listando tarjetas

---

#### `PATCH /api/rfid/[id]`
Activa o desactiva una tarjeta RFID.

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la tarjeta

**Body:**
```json
{
  "active": true
}
```

**Respuesta exitosa (200):**
```json
{
  "card": {
    "id": "uuid",
    "personId": "uuid",
    "uid": "A1B2C3D4",
    "active": true,
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

**Errores:**
- `400`: cardId requerido o no se pudo actualizar
- `500`: Error actualizando tarjeta

---

#### `DELETE /api/rfid/[id]`
Elimina una tarjeta RFID.

**Autenticación:** Requerida

**Parámetros:**
- `id` (path): UUID de la tarjeta

**Respuesta exitosa (200):**
```json
{
  "deleted": true
}
```

**Errores:**
- `400`: cardId requerido
- `500`: Error eliminando tarjeta

---

#### `GET /api/rfid/status`
Verifica si hay tarjetas RFID registradas en el sistema.

**Autenticación:** Requerida

**Respuesta exitosa (200):**
```json
{
  "available": true
}
```

**Errores:**
- `500`: Error consultando RFID

---

### Endpoints de Actividad (Logins)

#### `GET /api/logins`
Lista eventos de autenticación (histórico de actividad).

**Autenticación:** Requerida

**Query Parameters:**
- `status` (opcional): `"success"` | `"failed"` - Filtra por estado

**Ejemplo:**
```
GET /api/logins?status=success
```

**Respuesta exitosa (200):**
```json
{
  "events": [
    {
      "id": "uuid",
      "personId": "uuid",
      "email": "usuario@example.com",
      "provider": "google",
      "status": "success",
      "reason": null,
      "ip": "192.168.1.1",
      "city": "Buenos Aires",
      "country": "AR",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Errores:**
- `500`: Error cargando actividad

---

### Endpoints de Embed (Widget)

#### `GET /api/embed/token`
Genera un token JWT para autenticación embebible.

**Autenticación:** Requerida (sesión de NextAuth)

**Descripción:** Este endpoint genera un token firmado que puede ser usado por aplicaciones cliente para autenticar al usuario sin exponer credenciales.

**Respuesta exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "usuario@example.com",
    "name": "Juan Pérez",
    "isAdmin": false,
    "iat": 1705312200,
    "exp": 1705312500
  }
}
```

**Estructura del Token:**
El token es un JWT-like con formato `body.signature`:
- **Body**: Base64URL del payload JSON
- **Signature**: HMAC-SHA256 del body usando `ACCOUNTS_EMBED_SECRET`
- **Expiración**: 5 minutos desde la emisión

**Payload del Token:**
```json
{
  "email": "usuario@example.com",
  "name": "Juan Pérez",
  "isAdmin": false,
  "iat": 1705312200,
  "exp": 1705312500
}
```

**Errores:**
- `401`: No autenticado
- `500`: `missing_secret` - Variable `ACCOUNTS_EMBED_SECRET` no configurada

---

### NextAuth Endpoints

#### `GET /api/auth/signin`
Página de inicio de sesión de NextAuth.

#### `GET /api/auth/callback/[provider]`
Callback de OAuth para providers (Google, etc.).

#### `POST /api/auth/callback/credentials`
Callback para autenticación por credenciales (Face, RFID).

**Body:**
```json
{
  "provider": "face" | "rfid",
  "descriptor": "[...]" // Solo para face
  "uid": "A1B2C3D4" // Solo para rfid
}
```

---

### Códigos de Estado HTTP

- `200`: Éxito
- `201`: Creado exitosamente
- `400`: Solicitud inválida (campos faltantes, formato incorrecto)
- `401`: No autenticado
- `404`: Recurso no encontrado
- `409`: Conflicto (recurso duplicado)
- `500`: Error interno del servidor

---

### Ejemplos de Uso

#### Ejemplo 1: Crear persona y registrar rostro
```typescript
// 1. Crear persona
const createResponse = await fetch('/api/employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'juan@example.com',
    nombre: 'Juan Pérez',
    empresa: 'Empresa S.A.'
  })
});
const { person } = await createResponse.json();

// 2. Registrar descriptor facial
const faceResponse = await fetch('/api/face/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    personId: person.id,
    descriptor: [0.123, -0.456, ...], // 128 números
    imageUrl: 'https://...'
  })
});
```

#### Ejemplo 2: Verificar identidad con RFID
```typescript
const response = await fetch('/api/rfid/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uid: 'A1B2C3D4' })
});

const data = await response.json();
if (data.found && data.person.active) {
  console.log('Usuario autorizado:', data.person);
} else {
  console.log('Acceso denegado');
}
```

#### Ejemplo 3: Obtener histórico de actividad
```typescript
// Todos los eventos
const allEvents = await fetch('/api/logins').then(r => r.json());

// Solo exitosos
const successEvents = await fetch('/api/logins?status=success').then(r => r.json());

// Solo fallidos
const failedEvents = await fetch('/api/logins?status=failed').then(r => r.json());
```

---

## 🔗 Integración con Sistemas Externos

### Integración con Remitero

#### Objetivo
Vincular la identidad de Accounts con clientes/empresas en Remitero para:
- Registrar ventas asociadas a una identidad
- Control de stock por venta
- Reportes de ventas por persona

#### Implementación Propuesta

**1. Tabla de Vinculación en Remitero**
```sql
CREATE TABLE accounts_remitero_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts_person_id uuid NOT NULL, -- FK a accounts.accounts_persons
  remitero_cliente_id uuid, -- FK a clientes en remitero
  remitero_empresa_id uuid, -- FK a empresas en remitero
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

**2. API de Vinculación**
```typescript
// POST /api/accounts/link
{
  accountsPersonId: string;
  remiteroClienteId?: string;
  remiteroEmpresaId?: string;
}

// GET /api/accounts/link?accountsPersonId=...
// Retorna: { clienteId, empresaId, ... }
```

**3. Flujo de Venta en Caja**
```typescript
// 1. Empleado valida identidad con Accounts (RFID/FR)
const accountsPersonId = await validateIdentity(method, credential);

// 2. Consultar vinculación en Remitero
const link = await getRemiteroLink(accountsPersonId);

// 3. Registrar venta asociada a cliente/empresa
const venta = await createVenta({
  clienteId: link.clienteId,
  productos: [...],
  importe: total,
  fecha: new Date()
});

// 4. Actualizar stock
await updateStock(productos);

// 5. Registrar en histórico de Accounts
await recordActivityEvent({
  personId: accountsPersonId,
  action: 'venta_proveeduria',
  metadata: { ventaId, importe }
});
```

### Integración con Recibos

#### Objetivo
Descontar automáticamente las compras de proveeduría del recibo de sueldo del empleado.

#### Implementación Propuesta

**1. Tabla de Descuentos en Recibos**
```sql
CREATE TABLE recibos_descuentos_proveeduria (
  id uuid PRIMARY KEY,
  empleado_id uuid NOT NULL,
  periodo text NOT NULL, -- YYYY-MM
  ventas jsonb NOT NULL, -- Array de ventas desde Remitero
  total_descontar decimal NOT NULL,
  aplicado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**2. Proceso de Cálculo de Descuentos**
```typescript
// Al generar recibos del período
async function calcularDescuentosProveeduria(periodo: string) {
  // 1. Obtener todos los empleados
  const empleados = await getEmpleados();
  
  for (const empleado of empleados) {
    // 2. Obtener accountsPersonId vinculado
    const link = await getAccountsLink(empleado.id);
    if (!link) continue;
    
    // 3. Consultar ventas del período en Remitero
    const ventas = await getVentasPorPersona(
      link.accountsPersonId,
      periodo
    );
    
    // 4. Calcular total
    const total = ventas.reduce((sum, v) => sum + v.importe, 0);
    
    // 5. Crear descuento en Recibos
    await createDescuento({
      empleadoId: empleado.id,
      tipo: 'proveeduria',
      monto: total,
      detalle: `Compras en proveeduría: ${ventas.length} transacciones`,
      periodo
    });
  }
}
```

**3. Flujo Completo Integrado**
```
┌─────────────────────────────────────────────────────────────┐
│ 1. Empleado en Caja (Proveeduría)                          │
│    - Valida con Accounts (RFID/FR)                          │
│    - Obtiene accountsPersonId                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Remitero (Registro de Venta)                             │
│    - Consulta vinculación: accountsPersonId → clienteId     │
│    - Registra venta con productos e importe                 │
│    - Actualiza stock                                        │
│    - Guarda: { ventaId, clienteId, importe, fecha }         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Fin de Período (Generación de Recibos)                   │
│    - Recibos consulta ventas del período por clienteId      │
│    - Suma total de compras                                  │
│    - Crea descuento automático en recibo                    │
│    - Empleado ve: "Descuento proveeduría: $X.XXX"          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏪 Caso de Uso: Caja de Proveeduría del Camping

### Requerimientos del Negocio

1. **Control de Acceso**
   - Solo empleados autorizados pueden operar la caja
   - Validación rápida y segura (RFID o Face Recognition)
   - Registro de quién realizó cada venta

2. **Registro de Ventas**
   - Cada venta debe quedar registrada con:
     - Empleado que la realizó (vinculado a Accounts)
     - Cliente que compró (si aplica)
     - Productos vendidos
     - Importe total
     - Fecha y hora

3. **Control de Stock**
   - Actualización automática de inventario
   - Alertas de stock bajo
   - Reportes de productos más vendidos

4. **Descuento Automático**
   - Las compras de empleados se descuentan de su recibo
   - Sin intervención manual
   - Trazabilidad completa

### Arquitectura de la Solución

#### Componentes Necesarios

1. **Terminal de Caja (Punto de Venta)**
   - Lector RFID integrado
   - Cámara para Face Recognition (opcional)
   - Pantalla táctil
   - Impresora de tickets

2. **Backend de Caja**
   - API REST para registrar ventas
   - Integración con Accounts para validación
   - Integración con Remitero para productos/stock
   - Integración con Recibos para descuentos

3. **Dashboard de Monitoreo**
   - Ventas en tiempo real
   - Stock actualizado
   - Ganancias por período
   - Reportes de empleados

### Flujo Técnico Detallado

#### Escenario: Empleado compra productos

```typescript
// 1. VALIDACIÓN DE IDENTIDAD
async function procesarVentaEnCaja(productos: Producto[], metodoValidacion: 'rfid' | 'face') {
  // 1.1. Validar identidad con Accounts
  const accountsResponse = await fetch('https://accounts.puntoindigo.com/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: metodoValidacion,
      credential: metodoValidacion === 'rfid' ? uidTarjeta : descriptorFacial,
      appId: 'proveeduria-camping'
    })
  });
  
  const { accountsPersonId, email, nombre } = await accountsResponse.json();
  
  // 1.2. Obtener vinculación con Remitero
  const linkResponse = await fetch('https://remitero.puntoindigo.com/api/accounts/link', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
    params: { accountsPersonId }
  });
  
  const { clienteId, empresaId } = await linkResponse.json();
  
  // 2. REGISTRO DE VENTA EN REMITERO
  const ventaResponse = await fetch('https://remitero.puntoindigo.com/api/ventas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clienteId,
      empresaId,
      productos: productos.map(p => ({
        productoId: p.id,
        cantidad: p.cantidad,
        precioUnitario: p.precio
      })),
      importeTotal: calcularTotal(productos),
      fecha: new Date().toISOString(),
      metodoPago: 'descuento_recibo', // Indica que se descontará del recibo
      metadata: {
        accountsPersonId,
        terminalCaja: 'proveeduria-001',
        operador: nombre
      }
    })
  });
  
  const venta = await ventaResponse.json();
  
  // 3. ACTUALIZACIÓN DE STOCK
  await Promise.all(
    productos.map(p =>
      fetch(`https://remitero.puntoindigo.com/api/stock/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ cantidad: -p.cantidad })
      })
    )
  );
  
  // 4. REGISTRO EN ACTIVIDAD DE ACCOUNTS
  await fetch('https://accounts.puntoindigo.com/api/activity', {
    method: 'POST',
    body: JSON.stringify({
      personId: accountsPersonId,
      action: 'venta_proveeduria',
      metadata: {
        ventaId: venta.id,
        importe: venta.importeTotal,
        productos: productos.length
      }
    })
  });
  
  // 5. GENERAR TICKET
  imprimirTicket({
    ventaId: venta.id,
    empleado: nombre,
    productos,
    total: venta.importeTotal,
    mensaje: 'Se descontará de su recibo de sueldo'
  });
  
  return venta;
}
```

#### Escenario: Fin de período - Cálculo de descuentos

```typescript
// Ejecutar al finalizar cada período (ej: mensual)
async function calcularDescuentosPeriodo(periodo: string) {
  // 1. Obtener todas las ventas del período con métodoPago = 'descuento_recibo'
  const ventas = await fetch(
    `https://remitero.puntoindigo.com/api/ventas?periodo=${periodo}&metodoPago=descuento_recibo`
  ).then(r => r.json());
  
  // 2. Agrupar por accountsPersonId
  const ventasPorPersona = ventas.reduce((acc, venta) => {
    const personId = venta.metadata.accountsPersonId;
    if (!acc[personId]) {
      acc[personId] = [];
    }
    acc[personId].push(venta);
    return acc;
  }, {});
  
  // 3. Para cada persona, crear descuento en Recibos
  for (const [accountsPersonId, ventasPersona] of Object.entries(ventasPorPersona)) {
    // 3.1. Obtener empleadoId desde vinculación
    const empleado = await fetch(
      `https://recibos.puntoindigo.com/api/empleados/by-accounts?accountsPersonId=${accountsPersonId}`
    ).then(r => r.json());
    
    if (!empleado) continue; // Si no está vinculado a empleado, saltar
    
    // 3.2. Calcular total
    const total = ventasPersona.reduce((sum, v) => sum + v.importeTotal, 0);
    
    // 3.3. Crear descuento en Recibos
    await fetch('https://recibos.puntoindigo.com/api/descuentos', {
      method: 'POST',
      body: JSON.stringify({
        empleadoId: empleado.id,
        tipo: 'proveeduria',
        concepto: `Compras en proveeduría - ${periodo}`,
        monto: total,
        periodo,
        detalle: {
          cantidadTransacciones: ventasPersona.length,
          ventas: ventasPersona.map(v => ({
            fecha: v.fecha,
            importe: v.importeTotal,
            productos: v.productos.length
          }))
        }
      })
    });
  }
}
```

### Beneficios del Sistema Integrado

1. **Trazabilidad Completa**
   - Cada venta está vinculada a una identidad verificada
   - Historial completo de compras por empleado
   - Auditoría de todas las transacciones

2. **Automatización**
   - Sin intervención manual para descuentos
   - Cálculo automático al finalizar período
   - Actualización de stock en tiempo real

3. **Seguridad**
   - Validación biométrica previene fraudes
   - No se puede registrar venta sin identidad válida
   - Registro de actividad para auditoría

4. **Monitoreo en Tiempo Real**
   - Dashboard con ventas del día
   - Stock actualizado
   - Alertas de productos agotados

---

## 🚀 Guía de Producción

### Variables de Entorno Requeridas

#### Accounts
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# NextAuth
NEXTAUTH_URL=https://accounts.puntoindigo.com
NEXTAUTH_SECRET=xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Embed Token Secret (compartido con apps cliente)
ACCOUNTS_EMBED_SECRET=xxx

# Emails siempre permitidos (separados por coma)
ALWAYS_ALLOWED_EMAILS=admin@example.com,owner@example.com
```

#### App Cliente (ej: recibos-gremio)
```env
# Accounts Integration
ACCOUNTS_EMBED_SECRET=xxx # Mismo valor que en Accounts
ACCOUNTS_BASE_URL=https://accounts.puntoindigo.com
```

### Configuración de Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear proyecto o seleccionar existente
3. Habilitar "Google+ API"
4. Crear credenciales OAuth 2.0
5. Agregar URI de autorización: `https://accounts.puntoindigo.com/api/auth/callback/google`
6. Agregar orígenes autorizados: `https://accounts.puntoindigo.com`

### Configuración de Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar script SQL: `sql/create_accounts_tables.sql`
3. Configurar Row Level Security (RLS) si es necesario
4. Obtener Service Role Key para operaciones administrativas

### Deploy en Vercel

#### Accounts
```bash
# 1. Conectar repositorio a Vercel
# 2. Configurar variables de entorno
# 3. Deploy automático desde main branch

# Build Command: npm run build
# Output Directory: .next
# Install Command: npm install
```

#### CDN del Widget
- El archivo `public/embed/accounts-login.beta.01.js` se sirve automáticamente
- URL: `https://accounts.puntoindigo.com/embed/accounts-login.beta.01.js`

### Instalación del Widget en App Cliente

```html
<!-- En el <head> -->
<script
  src="https://accounts.puntoindigo.com/embed/accounts-login.beta.01.js"
  data-accounts-base="https://accounts.puntoindigo.com"
  data-target="accounts-login-beta-01"
  data-accounts-embed
></script>

<!-- En el <body>, donde quieras el widget -->
<div id="accounts-login-beta-01"></div>

<script>
  window.AccountsLoginBeta01 = {
    onSuccess: async (data) => {
      // data.token contiene el JWT
      // data.user contiene { email, name, isAdmin }
      
      // Llamar a NextAuth signIn
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          provider: 'accounts'
        })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    },
    onError: (error) => {
      console.error('Error en autenticación:', error.reason);
      // Mostrar mensaje de error al usuario
    }
  };
</script>
```

### Seguridad en Producción

1. **HTTPS Obligatorio**
   - Todas las comunicaciones deben ser HTTPS
   - PostMessage solo funciona entre orígenes HTTPS

2. **Secrets Management**
   - Nunca commitear secrets en código
   - Usar variables de entorno en Vercel
   - Rotar secrets periódicamente

3. **Rate Limiting**
   - Implementar rate limiting en APIs de autenticación
   - Prevenir brute force attacks

4. **Validación de Origen**
   - Verificar `origin` en PostMessage
   - Whitelist de dominios permitidos

5. **CORS**
   - Configurar CORS apropiadamente
   - Solo permitir orígenes conocidos

### Monitoreo y Logging

1. **Errores**
   - Integrar con servicio de logging (Sentry, LogRocket)
   - Monitorear errores de autenticación

2. **Métricas**
   - Tasa de éxito de autenticaciones
   - Tiempo de respuesta
   - Uso por método (Google, FR, RFID)

3. **Alertas**
   - Alertar sobre tasa de fallos alta
   - Alertar sobre intentos sospechosos

---

## 📈 Roadmap y Mejoras Pendientes

### Fase 1: Estabilización (Actual)
- ✅ Sistema básico de autenticación multi-método
- ✅ Widget embebible funcional
- ✅ Gestión de personas y RFID
- ✅ Histórico de actividad
- ⚠️ Pendiente: Testing exhaustivo
- ⚠️ Pendiente: Documentación de API

### Fase 2: Multi-Tenant y Configuración
- [ ] Sistema de apps/clientes
- [ ] Configuración por app (métodos permitidos, callbacks)
- [ ] Panel de administración de apps
- [ ] Whitelist de dominios por app

### Fase 3: Callback de Permisos
- [ ] API de callback para verificar permisos
- [ ] Sistema de roles y scopes
- [ ] Cacheo de permisos con TTL
- [ ] Versionado de permisos

### Fase 4: SDK y Distribución
- [ ] SDK JavaScript mejorado
- [ ] Plugin de WordPress
- [ ] Documentación de integración
- [ ] Ejemplos de código

### Fase 5: Integración Completa
- [ ] API de vinculación con Remitero
- [ ] API de vinculación con Recibos
- [ ] Dashboard de monitoreo integrado
- [ ] Reportes consolidados

### Fase 6: Escalabilidad
- [ ] Optimización de base de datos
- [ ] Caché de descriptores faciales
- [ ] CDN para assets estáticos
- [ ] Load balancing

---

## 📚 Información para Continuación del Desarrollo

### Estructura de Archivos Clave

```
accounts/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Página principal (gestión de personas)
│   │   ├── documentacion/
│   │   │   └── page.tsx               # Documentación (solo admin)
│   │   ├── embed/
│   │   │   ├── start/page.tsx         # Popup de login embebible
│   │   │   └── callback/page.tsx      # Callback después de auth
│   │   └── api/
│   │       ├── employees/             # CRUD de personas
│   │       ├── face/                  # Registro/verificación facial
│   │       ├── rfid/                  # Gestión de tarjetas RFID
│   │       ├── logins/                # Histórico de actividad
│   │       └── embed/token/           # Generación de tokens
│   ├── lib/
│   │   ├── auth.ts                    # Configuración NextAuth
│   │   ├── identity-store.ts          # Funciones de BD (Supabase)
│   │   ├── embed-token.ts             # Generación/validación de tokens
│   │   └── biometric/
│   │       └── face-matcher.ts        # Lógica de comparación facial
│   ├── components/
│   │   ├── Layout.tsx                 # Layout compartido con sidebar
│   │   └── biometric/
│   │       ├── FaceRecognitionCapture.tsx
│   │       ├── FaceRecognitionAutoCapture.tsx
│   │       └── FaceRegistrationPicker.tsx
│   └── globals.css                    # Estilos globales
├── public/
│   └── embed/
│       └── accounts-login.beta.01.js  # Widget CDN
└── sql/
    └── create_accounts_tables.sql     # Schema de BD
```

### Decisiones de Diseño Importantes

1. **NextAuth JWT Strategy**
   - Se usa JWT en lugar de sesiones de BD para mejor performance
   - Token incluye información de persona y permisos

2. **Face Recognition**
   - Se usa `face-api.js` (no TensorFlow.js directo)
   - Descriptores se almacenan como JSONB en PostgreSQL
   - Threshold de 0.45 para matching (ajustable)

3. **RFID**
   - UID se almacena como texto (no hash) para debugging
   - Tarjetas inactivas pueden eliminarse
   - Una persona puede tener múltiples tarjetas

4. **Widget Embebible**
   - Comunicación mediante PostMessage (no iframe)
   - Handshake ACK para asegurar recepción
   - Popup se cierra automáticamente después de ACK

5. **UI/UX**
   - Estilo inspirado en x.com (colores neutros, tipografía clara)
   - Sidebar colapsable
   - Responsive design con breakpoints estándar

### Puntos de Atención

1. **Performance**
   - Comparación facial puede ser lenta con muchos usuarios
   - Considerar indexación de descriptores o vector search

2. **Seguridad**
   - Descriptores faciales son datos sensibles (GDPR)
   - Considerar encriptación en reposo
   - Implementar políticas de retención

3. **Escalabilidad**
   - Base de datos puede necesitar particionamiento
   - Considerar Redis para caché de sesiones
   - CDN para assets estáticos

4. **Testing**
   - Falta testing automatizado
   - Considerar E2E tests con Playwright
   - Unit tests para lógica de negocio

### Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Linting
npm run lint

# Deploy a Vercel (automático desde main)
git push origin main
```

### Contacto y Soporte

- **Repositorio**: https://github.com/puntoindigo/accounts
- **Producción**: https://accounts.puntoindigo.com
- **Documentación**: https://accounts.puntoindigo.com/documentacion

---

## 🎓 Conclusión

Este documento proporciona una visión completa del sistema Accounts, desde su objetivo comercial hasta los detalles técnicos de implementación. El sistema está diseñado para ser un validador de identidad centralizado que puede integrarse en múltiples aplicaciones, proporcionando autenticación biométrica segura y trazabilidad completa.

El caso de uso de la caja de proveeduría del camping demuestra cómo Accounts se integra con otros sistemas (Remitero y Recibos) para crear un flujo automatizado completo, desde la validación de identidad hasta el descuento en recibos de sueldo.

Para continuar el desarrollo, se recomienda:
1. Completar la Fase 2 (Multi-tenant) para permitir múltiples clientes
2. Implementar el sistema de callbacks de permisos
3. Desarrollar las APIs de integración con Remitero y Recibos
4. Mejorar la documentación de API para desarrolladores
5. Implementar testing automatizado

---

**Última actualización**: 2025-01-XX
**Versión del sistema**: beta.01
**Estado**: En desarrollo activo
