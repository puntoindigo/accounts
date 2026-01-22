# Integración con CRM

Guía para integrar Accounts con sistemas CRM externos usando el Widget Embed, similar a "Login with Google".

## Cómo Funciona

1. Incluís el widget JavaScript en tu página
2. El usuario hace clic en "Acceder con Accounts"
3. Se abre un popup con opciones de login (Google, Facial)
4. Después de autenticarse, tu aplicación recibe un token JWT
5. Validás el token en tu backend

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
app.post('/api/auth/accounts', (req, res) => {
  const { token } = req.body;
  const secret = process.env.ACCOUNTS_EMBED_SECRET;
  const payload = verifyAccountsToken(token, secret);
  
  if (!payload) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  
  res.json({ 
    authenticated: true,
    user: {
      email: payload.email,
      name: payload.name,
      isAdmin: payload.isAdmin
    }
  });
});
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

## Flujo

```
Usuario hace clic → Popup se abre → Usuario se autentica → 
Token JWT se genera → Tu frontend recibe token → 
Envías token a tu backend → Backend valida token → 
Usuario autenticado ✅
```

## Seguridad

- Token firmado con HMAC-SHA256
- Expira en 5 minutos
- Siempre validá el token en tu backend
- Usá HTTPS para todas las comunicaciones
