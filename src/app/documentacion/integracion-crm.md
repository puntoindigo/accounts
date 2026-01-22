# Integración con CRM

Guía para integrar Accounts con sistemas CRM externos usando el Widget Embed, similar a "Login with Google".

## Cómo Funciona

1. Incluís el widget JavaScript en tu página
2. El usuario hace clic en "Acceder con Accounts"
3. Se abre un popup con opciones de login (Google, Facial)
4. **Accounts valida la identidad** del usuario (existe y está activo)
5. Después de autenticarse, tu aplicación recibe un token JWT
6. **Validás el token en tu backend** (verificás que es válido)
7. **Verificás permisos en tu app** (verificás que ese usuario tiene acceso a tu aplicación)

## Implementación

### Paso 1: Incluir el Widget

```html
<div id="accounts-login-beta-01"></div>

<script
  src="https://accounts.puntoindigo.com/embed/accounts-login.beta.01.js"
  data-accounts-base="https://accounts.puntoindigo.com"
  data-target="accounts-login-beta-01"
  data-accounts-embed
></script>
```

### Paso 2: Manejar el Token

```javascript
window.AccountsLoginBeta01 = {
  onSuccess: (data) => {
    // data.token contiene el JWT
    // data.user contiene { email, name, isAdmin }
    
    fetch('/api/auth/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token })
    })
    .then(response => response.json())
    .then(result => {
      // Usuario autenticado
      window.location.href = '/dashboard';
    });
  },
  onError: (error) => {
    console.error('Error de autenticación:', error.reason);
  }
};
```

### Paso 3: Validar el Token en tu Backend

El token es un JWT firmado con `ACCOUNTS_EMBED_SECRET`. Validación en Node.js:

```javascript
const crypto = require('crypto');

function toBase64Url(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = padded.length % 4 ? 4 - (padded.length % 4) : 0;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
}

function verifyAccountsToken(token, secret) {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  
  const expected = toBase64Url(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  
  if (expected !== signature) return null;
  
  try {
    const payload = JSON.parse(fromBase64Url(body));
    if (!payload?.email || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// En tu endpoint
app.post('/api/auth/accounts', async (req, res) => {
  const { token } = req.body;
  const secret = process.env.ACCOUNTS_EMBED_SECRET;
  
  // Paso 1: Validar el token (verificar que viene de Accounts)
  const payload = verifyAccountsToken(token, secret);
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  // Paso 2: Verificar que el usuario tiene acceso a tu aplicación
  // Esto es CRÍTICO: Accounts solo valida la identidad, 
  // tu app debe verificar permisos/autorización
  const userHasAccess = await checkUserAccess(payload.email);
  if (!userHasAccess) {
    return res.status(403).json({ error: 'Usuario no tiene acceso a esta aplicación' });
  }
  
  // Paso 3: Crear sesión en tu aplicación
  const session = await createSession(payload.email);
  
  res.json({ 
    authenticated: true,
    user: {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin
    },
    session
  });
});

// Función de ejemplo: verificar acceso del usuario
async function checkUserAccess(email) {
  // Consultar tu base de datos para ver si el usuario tiene acceso
  // Ejemplo:
  // const user = await db.users.findOne({ email });
  // return user && user.active && user.hasAccessToApp;
  
  // O consultar una lista de emails permitidos:
  // const allowedEmails = process.env.ALLOWED_EMAILS?.split(',') || [];
  // return allowedEmails.includes(email);
  
  return true; // Implementar según tu lógica
}
```

## Configuración

**Variable de entorno (mismo valor en Accounts y tu aplicación):**
```env
ACCOUNTS_EMBED_SECRET=tu-secret-compartido
```

## Estructura del Token

```typescript
{
  email: string;        // Email del usuario
  name: string | null;  // Nombre del usuario
  isAdmin: boolean;     // Si es administrador
  iat: number;          // Timestamp de emisión
  exp: number;          // Timestamp de expiración (5 minutos)
}
```

## Flujo Completo

```
1. Usuario hace clic en "Acceder con Accounts"
   ↓
2. Popup se abre en Accounts
   ↓
3. Usuario se autentica (Google o Facial)
   ↓
4. Accounts valida IDENTIDAD (usuario existe y está activo)
   ↓
5. Accounts genera token JWT y lo envía a tu frontend
   ↓
6. Tu frontend envía token a tu backend
   ↓
7. Tu backend VALIDA el token (verifica firma y expiración)
   ↓
8. Tu backend VERIFICA PERMISOS (verifica que el usuario tiene acceso a tu app)
   ↓
9. Si todo está OK → Usuario autenticado en tu app ✅
```

⚠️ **Importante:** Accounts solo valida la **identidad** del usuario (que existe y está activo). Tu aplicación debe verificar la **autorización** (que tiene acceso a tu app).

## Seguridad

- Token firmado con HMAC-SHA256
- Expira en 5 minutos
- Siempre validá el token en tu backend
- **Siempre verificá permisos después de validar el token**
- Usá HTTPS para todas las comunicaciones

## Verificación de Permisos

Accounts valida la **identidad** del usuario, pero tu aplicación debe verificar la **autorización**. Algunas opciones:

### Opción 1: Lista de emails permitidos
```javascript
const allowedEmails = process.env.ALLOWED_EMAILS?.split(',') || [];
if (!allowedEmails.includes(payload.email)) {
  return res.status(403).json({ error: 'Acceso denegado' });
}
```

### Opción 2: Consultar tu base de datos
```javascript
const user = await db.users.findOne({ email: payload.email });
if (!user || !user.active || !user.hasAccessToApp) {
  return res.status(403).json({ error: 'Acceso denegado' });
}
```

### Opción 3: Consultar API externa
```javascript
const hasAccess = await fetch(`https://tu-api.com/check-access?email=${payload.email}`);
if (!hasAccess.ok) {
  return res.status(403).json({ error: 'Acceso denegado' });
}
```
