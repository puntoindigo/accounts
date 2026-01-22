# Integración con CRM

Esta guía explica cómo integrar Accounts con un sistema CRM externo para autenticación y verificación de usuarios.

## Configuración

### Variables de Entorno

Agrega la siguiente variable de entorno en Vercel:

```env
CRM_API_TOKEN=tu-token-secreto-aqui
```

Este token se usará para autenticar todas las peticiones del CRM a la API de Accounts.

## Endpoints Disponibles

### 1. Autenticar Usuario por Email

**POST** `/api/crm/auth`

Autentica un usuario por su email (equivalente a login con Google).

**Headers:**
```
Authorization: Bearer {CRM_API_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@gmail.com"
}
```

**Respuesta exitosa (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "usuario@gmail.com",
    "nombre": "Nombre Completo",
    "empresa": "Empresa",
    "isAdmin": false,
    "hasFaceRecognition": true,
    "faceImageUrl": "https://..."
  }
}
```

**Respuesta usuario no encontrado (404):**
```json
{
  "authenticated": false,
  "reason": "not_found"
}
```

**Respuesta usuario inactivo (403):**
```json
{
  "authenticated": false,
  "reason": "inactive"
}
```

---

### 2. Autenticar Usuario por Reconocimiento Facial

**PUT** `/api/crm/auth`

Autentica un usuario mediante reconocimiento facial.

**Headers:**
```
Authorization: Bearer {CRM_API_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "descriptor": [0.123, -0.456, 0.789, ...] // Array de 128 números
}
```

**Respuesta exitosa (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "usuario@gmail.com",
    "nombre": "Nombre Completo",
    "empresa": "Empresa",
    "isAdmin": false,
    "hasFaceRecognition": true,
    "faceImageUrl": "https://...",
    "confidence": 95.5,
    "distance": 0.32
  }
}
```

**Respuesta sin coincidencia (404):**
```json
{
  "authenticated": false,
  "reason": "no_match"
}
```

---

### 3. Obtener Información de Usuario

**GET** `/api/crm/user/{email}`

Obtiene información completa de un usuario por su email.

**Headers:**
```
Authorization: Bearer {CRM_API_TOKEN}
```

**Ejemplo:**
```
GET /api/crm/user/usuario%40gmail.com
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@gmail.com",
    "nombre": "Nombre Completo",
    "empresa": "Empresa",
    "isAdmin": false,
    "active": true,
    "hasFaceRecognition": true,
    "faceImageUrl": "https://...",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Respuesta usuario no encontrado (404):**
```json
{
  "error": "Usuario no encontrado"
}
```

---

### 4. Verificar Usuario

**POST** `/api/crm/verify`

Verifica si un usuario existe y está activo (sin autenticar, solo verificación).

**Headers:**
```
Authorization: Bearer {CRM_API_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@gmail.com"
}
```

**Respuesta usuario existe y activo (200):**
```json
{
  "exists": true,
  "active": true,
  "user": {
    "id": "uuid",
    "email": "usuario@gmail.com",
    "nombre": "Nombre Completo",
    "empresa": "Empresa",
    "isAdmin": false
  }
}
```

**Respuesta usuario existe pero inactivo (200):**
```json
{
  "exists": true,
  "active": false,
  "user": {
    "id": "uuid",
    "email": "usuario@gmail.com",
    "nombre": "Nombre Completo",
    "empresa": "Empresa",
    "isAdmin": false
  }
}
```

**Respuesta usuario no existe (200):**
```json
{
  "exists": false,
  "active": false
}
```

---

## Ejemplos de Uso

### JavaScript/TypeScript

```typescript
const CRM_API_TOKEN = 'tu-token-secreto';
const ACCOUNTS_API_URL = 'https://accounts.puntoindigo.com';

// Autenticar por email
async function authenticateByEmail(email: string) {
  const response = await fetch(`${ACCOUNTS_API_URL}/api/crm/auth`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRM_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    throw new Error('Error autenticando usuario');
  }
  
  return await response.json();
}

// Autenticar por reconocimiento facial
async function authenticateByFace(descriptor: number[]) {
  const response = await fetch(`${ACCOUNTS_API_URL}/api/crm/auth`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CRM_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ descriptor })
  });
  
  if (!response.ok) {
    throw new Error('Error autenticando por reconocimiento facial');
  }
  
  return await response.json();
}

// Obtener información de usuario
async function getUserInfo(email: string) {
  const encodedEmail = encodeURIComponent(email);
  const response = await fetch(`${ACCOUNTS_API_URL}/api/crm/user/${encodedEmail}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CRM_API_TOKEN}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Error obteniendo usuario');
  }
  
  return await response.json();
}

// Verificar usuario
async function verifyUser(email: string) {
  const response = await fetch(`${ACCOUNTS_API_URL}/api/crm/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CRM_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    throw new Error('Error verificando usuario');
  }
  
  return await response.json();
}
```

### cURL

```bash
# Autenticar por email
curl -X POST https://accounts.puntoindigo.com/api/crm/auth \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@gmail.com"}'

# Autenticar por reconocimiento facial
curl -X PUT https://accounts.puntoindigo.com/api/crm/auth \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json" \
  -d '{"descriptor":[0.123,-0.456,0.789,...]}'

# Obtener información de usuario
curl -X GET "https://accounts.puntoindigo.com/api/crm/user/usuario%40gmail.com" \
  -H "Authorization: Bearer tu-token-secreto"

# Verificar usuario
curl -X POST https://accounts.puntoindigo.com/api/crm/verify \
  -H "Authorization: Bearer tu-token-secreto" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@gmail.com"}'
```

---

## Seguridad

1. **Token API**: El token `CRM_API_TOKEN` debe ser secreto y no exponerse en el frontend.
2. **HTTPS**: Todas las peticiones deben hacerse sobre HTTPS.
3. **Rate Limiting**: Considera implementar rate limiting en tu CRM para evitar abuso.
4. **Logs**: Todas las autenticaciones se registran en la tabla de actividad de Accounts.

---

## Notas

- Todos los endpoints requieren el header `Authorization: Bearer {CRM_API_TOKEN}`
- Los emails se normalizan a minúsculas automáticamente
- Las autenticaciones exitosas y fallidas se registran en la actividad de Accounts
- El reconocimiento facial requiere un descriptor de 128 números (generado por face-api.js)

---

## Soporte

Para más información, consulta la documentación completa en `/documentacion` o contacta al equipo de desarrollo.
