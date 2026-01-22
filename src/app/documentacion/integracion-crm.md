# Integración con CRM

Esta guía explica cómo integrar Accounts con un sistema CRM externo usando el Widget Embed, similar a "Login with Google".

## Cómo Funciona

1. Incluís el widget JavaScript en tu página
2. El usuario hace clic en "Acceder con Accounts"
3. Se abre un popup con opciones de login (Google, Facial)
4. Después de autenticarse, tu aplicación recibe un token JWT
5. Validás el token en tu backend

## Implementación

### Paso 1: Incluir el Widget

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

### Paso 2: Manejar el Token

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
      // Redirigir o actualizar UI
      window.location.href = '/dashboard';
    });
  },
  onError: (error) => {
    // Manejar error
    console.error('Error de autenticación:', error.reason);
    alert('No se pudo autenticar. Por favor, intentá nuevamente.');
  }
};
```

### Paso 3: Validar el Token en tu Backend

El token es un JWT firmado con `ACCOUNTS_EMBED_SECRET`. Necesitás validarlo:

#### Node.js (Express)

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
  if (!body || !signature) {
    return null;
  }
  
  const expected = toBase64Url(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  
  if (expected !== signature) {
    return null;
  }
  
  try {
    const payload = JSON.parse(fromBase64Url(body));
    
    // Verificar expiración
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
  
  // Usuario autenticado
  // payload contiene: { email, name, isAdmin, iat, exp }
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

#### Python (Flask)

```python
import hmac
import hashlib
import base64
import json
import time

def to_base64_url(input_str):
    encoded = base64.b64encode(input_str.encode('utf-8') if isinstance(input_str, str) else input_str)
    return encoded.decode('utf-8').replace('+', '-').replace('/', '_').rstrip('=')

def from_base64_url(input_str):
    padded = input_str.replace('-', '+').replace('_', '/')
    pad_length = 4 - (len(padded) % 4) if len(padded) % 4 else 0
    padded += '=' * pad_length
    return base64.b64decode(padded).decode('utf-8')

def verify_accounts_token(token, secret):
    try:
        body, signature = token.split('.')
        
        expected = to_base64_url(
            hmac.new(secret.encode('utf-8'), body.encode('utf-8'), hashlib.sha256).digest()
        )
        
        if expected != signature:
            return None
        
        payload = json.loads(from_base64_url(body))
        
        # Verificar expiración
        if not payload.get('email') or not payload.get('exp'):
            return None
        
        if payload['exp'] < int(time.time()):
            return None
        
        return payload
    except:
        return None

# En tu endpoint
@app.route('/api/auth/accounts', methods=['POST'])
def auth_accounts():
    token = request.json.get('token')
    secret = os.environ.get('ACCOUNTS_EMBED_SECRET')
    
    payload = verify_accounts_token(token, secret)
    
    if not payload:
        return jsonify({'error': 'Token inválido o expirado'}), 401
    
    return jsonify({
        'authenticated': True,
        'user': {
            'email': payload['email'],
            'name': payload['name'],
            'isAdmin': payload['isAdmin']
        }
    })
```

## Configuración

### Variable de Entorno

**En Accounts (Vercel):**
```env
ACCOUNTS_EMBED_SECRET=tu-secret-compartido
```

**En tu aplicación:**
```env
ACCOUNTS_EMBED_SECRET=tu-secret-compartido  # Mismo valor que en Accounts
```

⚠️ **Importante:** El secret debe ser el mismo en ambas aplicaciones para que la validación funcione.

## Flujo Completo

```
1. Usuario en tu CRM hace clic en "Acceder con Accounts"
   ↓
2. Se abre popup: https://accounts.puntoindigo.com/embed/start?origin=...
   ↓
3. Usuario elige método (Google o Facial)
   ↓
4. Usuario se autentica en Accounts
   ↓
5. Popup redirige a /embed/callback?origin=...
   ↓
6. Callback genera token JWT y envía postMessage al popup padre
   ↓
7. Tu widget recibe el mensaje y llama onSuccess(token)
   ↓
8. Tu frontend envía token a tu backend
   ↓
9. Tu backend valida el token con ACCOUNTS_EMBED_SECRET
   ↓
10. Usuario autenticado en tu CRM ✅
```

## Estructura del Token

El token es un JWT-like con formato `body.signature`:

```typescript
{
  email: string;        // Email del usuario
  name: string | null;  // Nombre del usuario
  isAdmin: boolean;     // Si es administrador
  iat: number;          // Timestamp de emisión
  exp: number;          // Timestamp de expiración (5 minutos)
}
```

## Ejemplo Completo

### HTML

```html
<!DOCTYPE html>
<html>
<head>
  <title>Mi CRM</title>
</head>
<body>
  <h1>Bienvenido</h1>
  
  <div id="accounts-login-beta-01"></div>
  
  <script
    src="https://accounts.puntoindigo.com/embed/accounts-login.beta.01.js"
    data-accounts-base="https://accounts.puntoindigo.com"
    data-target="accounts-login-beta-01"
    data-accounts-embed
  ></script>
  
  <script>
    window.AccountsLoginBeta01 = {
      onSuccess: async (data) => {
        try {
          const response = await fetch('/api/auth/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: data.token })
          });
          
          if (!response.ok) {
            throw new Error('Error validando token');
          }
          
          const result = await response.json();
          console.log('Usuario autenticado:', result.user);
          
          // Guardar sesión y redirigir
          localStorage.setItem('user', JSON.stringify(result.user));
          window.location.href = '/dashboard';
        } catch (error) {
          console.error('Error:', error);
          alert('Error al autenticar. Por favor, intentá nuevamente.');
        }
      },
      onError: (error) => {
        console.error('Error de autenticación:', error.reason);
        alert('No se pudo autenticar. Por favor, intentá nuevamente.');
      }
    };
  </script>
</body>
</html>
```

## Ventajas del Widget Embed

- ✅ Experiencia de usuario familiar (popup como Google)
- ✅ No necesitás manejar formularios de login
- ✅ Soporta múltiples métodos (Google, Facial)
- ✅ El token expira automáticamente (5 minutos)
- ✅ Fácil de implementar
- ✅ Seguro (validación con HMAC-SHA256)

## Seguridad

1. **Token JWT**: El token está firmado con HMAC-SHA256 y expira en 5 minutos
2. **HTTPS**: Todas las comunicaciones deben ser sobre HTTPS
3. **Secret compartido**: El `ACCOUNTS_EMBED_SECRET` debe mantenerse secreto
4. **Validación**: Siempre validá el token en tu backend, nunca confíes solo en el frontend

## Troubleshooting

### El popup no se abre
- Verificá que el bloqueador de popups no esté activo
- Asegurate de que `data-accounts-base` apunte a la URL correcta

### El token no se valida
- Verificá que `ACCOUNTS_EMBED_SECRET` sea el mismo en ambas aplicaciones
- Verificá que el token no haya expirado (5 minutos)
- Revisá los logs del backend para ver el error específico

### El callback no funciona
- Verificá que el `origin` en la URL sea correcto
- Asegurate de que tu aplicación esté escuchando mensajes `postMessage`

## Soporte

Para más información, consulta la documentación completa en `/documentacion` o contacta al equipo de desarrollo.
