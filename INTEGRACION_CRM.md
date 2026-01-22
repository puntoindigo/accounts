# Integración con CRM

Esta guía explica cómo integrar Accounts con un sistema CRM externo para autenticación y verificación de usuarios.

## Dos Formas de Integración

Accounts ofrece **dos formas** de integrar el login:

1. **Widget Embed (Frontend)** - Similar a "Login with Google", se abre un popup para autenticación
2. **API REST (Backend)** - Autenticación server-to-server mediante endpoints API

---

## 1. Widget Embed (Recomendado para Frontend)

Esta es la forma más simple y similar a cómo funciona "Login with Google". El usuario hace clic en un botón, se abre un popup, se autentica, y tu aplicación recibe un token.

### Cómo Funciona

1. Incluís el widget JavaScript en tu página
2. El usuario hace clic en "Acceder con Accounts"
3. Se abre un popup con opciones de login (Google, Facial)
4. Después de autenticarse, tu aplicación recibe un token JWT
5. Validás el token en tu backend

### Implementación

#### Paso 1: Incluir el Widget

```html
<!-- En tu HTML -->
<div id="accounts-login-beta-01"></div>

<script
  src="https://accounts.puntoindigo.com/embed/accounts-login.beta.01.js"
  data-accounts-base="https://accounts.puntoindigo.com"
  data-target="accounts-login-beta-01"
  data-accounts-embed
></script>
```

#### Paso 2: Manejar el Token

```javascript
// Configurar callbacks
window.AccountsLoginBeta01 = {
  onSuccess: (data) => {
    // data.token contiene el JWT
    // data.user contiene { email, name, isAdmin }
    
    // Enviar token a tu backend
    fetch('/api/auth/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token })
    })
    .then(response => response.json())
    .then(result => {
      // Usuario autenticado en tu sistema
      console.log('Usuario autenticado:', result);
    });
  },
  onError: (error) => {
    // Manejar error
    console.error('Error de autenticación:', error.reason);
  }
};
```

#### Paso 3: Validar el Token en tu Backend

El token es un JWT firmado con `ACCOUNTS_EMBED_SECRET`. Necesitás validarlo:

```javascript
// Node.js ejemplo
const jwt = require('jsonwebtoken');

function validateAccountsToken(token) {
  const secret = process.env.ACCOUNTS_EMBED_SECRET; // Mismo secret que en Accounts
  try {
    const payload = jwt.verify(token, secret);
    // payload contiene: { email, name, isAdmin, iat, exp }
    return payload;
  } catch (error) {
    return null; // Token inválido o expirado
  }
}

// En tu endpoint
app.post('/api/auth/accounts', (req, res) => {
  const { token } = req.body;
  const payload = validateAccountsToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  
  // Usuario autenticado
  res.json({ user: payload });
});
```

### Configuración

**Variable de entorno en Accounts (Vercel):**
```env
ACCOUNTS_EMBED_SECRET=tu-secret-compartido
```

**Variable de entorno en tu aplicación:**
```env
ACCOUNTS_EMBED_SECRET=tu-secret-compartido  # Mismo valor que en Accounts
```

### Ventajas del Widget Embed

- ✅ Experiencia de usuario familiar (popup como Google)
- ✅ No necesitás manejar formularios de login
- ✅ Soporta múltiples métodos (Google, Facial)
- ✅ El token expira automáticamente (5 minutos)
- ✅ Fácil de implementar

---

## 2. API REST (Para Backend/Server-to-Server)

Si necesitás autenticar usuarios desde tu backend sin interacción del usuario, usá estos endpoints.

### Cuándo Usar API REST

- Autenticación programática (sin usuario presente)
- Sincronización de usuarios
- Verificación de estado de usuarios
- Integración backend-to-backend

### Configuración

**Variable de entorno en Accounts (Vercel):**
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

## Comparación: Widget vs API

| Característica | Widget Embed | API REST |
|----------------|--------------|----------|
| **Interacción usuario** | ✅ Requiere popup | ❌ Sin interacción |
| **Métodos soportados** | Google, Facial | Email, Facial (descriptor) |
| **Experiencia UX** | Familiar (como Google) | N/A (backend) |
| **Token JWT** | ✅ Automático | ❌ No genera token |
| **Uso típico** | Frontend web | Backend/scripts |
| **Complejidad** | Baja | Media |

---

## Ejemplos de Uso

### Widget Embed (Frontend)

Ver sección "1. Widget Embed" arriba.

### API REST (Backend)

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
