# Prompt Completo para Desarrollo de Sistema de Validación de Identidad Biométrica

## 🎯 CONTEXTO Y OBJETIVO

Necesito que desarrolles un sistema completo de validación de identidad biométrica llamado **Accounts** que funcione como reemplazo de sistemas OAuth tradicionales. Este sistema debe ser embebible, distribuible vía CDN, y permitir integración en múltiples aplicaciones.

### Objetivo Principal
Crear un servicio centralizado de identidad que:
- Valide usuarios mediante Google Account, Reconocimiento Facial (Face Recognition) y RFID
- Se integre fácilmente en cualquier aplicación web mediante widget CDN
- Proporcione un token JWT seguro para autenticación en apps cliente
- Registre toda la actividad de autenticación con metadata completa
- Sea escalable y multi-tenant

---

## 🏗️ STACK TECNOLÓGICO REQUERIDO

### Frontend
- **Next.js 16+** (App Router)
- **React 19+**
- **TypeScript**
- **Tailwind CSS 4**
- **NextAuth.js 4.24+**

### Backend
- **Next.js API Routes**
- **Supabase (PostgreSQL)** para base de datos
- **face-api.js** para reconocimiento facial
- **crypto** (Node.js) para tokens JWT

### Infraestructura
- **Vercel** para deploy
- **CDN** para distribución del widget

---

## 📊 ARQUITECTURA DE BASE DE DATOS

### Tabla: `accounts_persons`
```sql
CREATE TABLE accounts_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  nombre text NOT NULL,
  empresa text NOT NULL,
  face_descriptor jsonb, -- Array de 128 números (descriptor facial)
  face_image_url text,
  active boolean NOT NULL DEFAULT true,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Tabla: `accounts_activity`
```sql
CREATE TABLE accounts_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid REFERENCES accounts_persons(id) ON DELETE SET NULL,
  email text,
  provider text NOT NULL, -- 'google', 'face', 'rfid'
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  reason text,
  ip text,
  city text,
  country text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Tabla: `accounts_rfid_cards`
```sql
CREATE TABLE accounts_rfid_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES accounts_persons(id) ON DELETE CASCADE,
  uid text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Índices
```sql
CREATE INDEX accounts_persons_email_idx ON accounts_persons (email);
CREATE INDEX accounts_activity_status_idx ON accounts_activity (status);
CREATE INDEX accounts_activity_created_at_idx ON accounts_activity (created_at DESC);
CREATE INDEX accounts_rfid_person_idx ON accounts_rfid_cards (person_id);
```

---

## ⚙️ FUNCIONALIDADES CORE REQUERIDAS

### 1. Gestión de Personas

#### Crear Persona (Modal Multi-Paso)
- **Paso 1**: Formulario con email (Gmail), nombre, empresa
- **Paso 2**: Registro facial opcional (captura webcam + descriptor)
- **Paso 3**: Asociación RFID opcional
- Botones: "Siguiente", "Omitir", "Cancelar" (con confirmación)

#### Editar Persona
- Mismo modal que creación, pre-llenado
- Botón cambia a "Guardar" / "Guardando..."
- Actualiza datos, descriptor facial y tarjetas RFID

#### Eliminar Persona
- Modal de confirmación
- Cascade delete de todos los datos asociados

#### Activar/Desactivar Acceso
- Toggle rápido con switch estilo x.com
- Tag visual con tooltip

### 2. Reconocimiento Facial

#### Registro
- Captura mediante webcam
- Extracción de descriptor facial (128 números usando face-api.js)
- Almacenamiento de descriptor e imagen URL
- Validación de calidad de imagen

#### Verificación
- Captura en tiempo real
- Comparación con todos los descriptores usando distancia euclidiana
- Threshold: 0.45 (configurable)
- Prevención de re-intentos con mismo rostro fallido
- Muestra resultado con confianza y distancia

#### Lógica Anti-Spam
```typescript
// Almacenar último descriptor fallido
let lastFailedFaceDescriptor: number[] | null = null;

// Al verificar, comparar con último fallido
if (lastFailedFaceDescriptor && isSameFace(newDescriptor, lastFailedFaceDescriptor)) {
  // Bloquear re-intento
  return;
}
// Si es diferente, permitir intento
```

### 3. RFID

#### Asociar Tarjeta
- Input con autofocus automático
- Validación de formato UID
- Verificación de duplicados
- Asociación con persona seleccionada

#### Gestión de Tarjetas
- Lista de tarjetas por persona
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
- Archivo JavaScript distribuible: `public/embed/accounts-login.beta.01.js`
- Instalación mediante script tag
- UI con tabs para seleccionar método (Google, FR, RFID)
- Comunicación mediante PostMessage con handshake ACK

#### API del Widget
```javascript
window.AccountsLoginBeta01 = {
  onSuccess: (data) => {
    // data.token contiene JWT
    // data.user contiene { email, name, isAdmin }
  },
  onError: (error) => {
    // error.reason
  }
};
```

#### Flujo de Handshake
1. Widget abre popup a `/embed/start?method=...&origin=...`
2. Usuario autentica en popup
3. Popup redirige a `/embed/callback?origin=...`
4. Callback genera token y envía `postMessage` con tipo `accounts-login`
5. Widget recibe mensaje y llama `onSuccess(token)`
6. Widget envía ACK (`accounts-ack`) al popup
7. Popup cierra después de recibir ACK

#### Estilo
- Similar a x.com (colores neutros, tipografía clara)
- Tabs pequeños alineados a la derecha
- Iconos grandes y centrados (Google logo, cámara)
- Animación suave al seleccionar método

### 6. Sistema de Tokens

#### Generación de Token
- Algoritmo: HMAC-SHA256
- Formato: JWT-like (`body.signature` en Base64URL)
- Payload:
  ```typescript
  {
    email: string;
    name: string | null;
    isAdmin: boolean;
    iat: number; // timestamp emisión
    exp: number; // timestamp expiración (15 minutos)
  }
  ```
- Secret: Variable `ACCOUNTS_EMBED_SECRET` (compartido con apps cliente)

#### Validación en App Cliente
```typescript
const payload = verifyAccountsToken(token, secret);
if (payload) {
  // Usuario autenticado
}
```

---

## 🔐 AUTENTICACIÓN (NextAuth)

### Providers Requeridos

#### 1. Google Provider
- OAuth 2.0 estándar
- Valida que email esté registrado en `accounts_persons`
- Verifica que persona esté activa (`active = true`)

#### 2. Face Recognition Provider (Credentials)
- Recibe descriptor facial (array de números)
- Compara con descriptores almacenados
- Threshold: 0.45
- Previene re-intentos con mismo rostro fallido

#### 3. RFID Provider (Credentials)
- Recibe UID de tarjeta
- Busca tarjeta activa en `accounts_rfid_cards`
- Valida que persona asociada esté activa

### Registro de Actividad
Cada autenticación debe registrar:
- `person_id`, `email`, `provider`, `status`, `reason`
- `ip`, `city`, `country`, `user_agent`
- `created_at`

---

## 📡 APIs REQUERIDAS

### Personas
- `GET /api/employees` - Listar todas
- `POST /api/employees` - Crear
- `GET /api/employees/[id]` - Obtener una
- `PATCH /api/employees/[id]` - Actualizar
- `DELETE /api/employees/[id]` - Eliminar

### Reconocimiento Facial
- `POST /api/face/register` - Registrar descriptor
- `POST /api/face/verify` - Verificar rostro
- `POST /api/face/remove` - Eliminar descriptor

### RFID
- `POST /api/rfid/verify` - Verificar tarjeta
- `POST /api/rfid/associate` - Asociar tarjeta
- `GET /api/rfid/person/[id]` - Listar tarjetas de persona
- `PATCH /api/rfid/[id]` - Activar/desactivar
- `DELETE /api/rfid/[id]` - Eliminar tarjeta
- `GET /api/rfid/status` - Estado del sistema

### Actividad
- `GET /api/logins?status=...` - Histórico

### Embed
- `GET /api/embed/token` - Generar token JWT

**Todas las APIs deben:**
- Requerir autenticación (excepto `/api/face/verify` y `/api/rfid/verify` para login)
- Validar inputs
- Retornar códigos HTTP apropiados
- Incluir manejo de errores

---

## 🎨 UI/UX REQUERIDOS

### Estilo General
- Inspirado en x.com (colores neutros, tipografía clara)
- Sidebar colapsable con navegación
- Header dinámico según vista
- Responsive (breakpoints: `sm:` 640px, `lg:` 1024px)

### Componentes Específicos

#### Sidebar
- Logo/Brand colapsable
- Navegación: Personas, Actividad, Documentación (admin)
- Perfil de usuario con dropdown
- Imagen de perfil mantiene relación de aspecto al colapsar

#### Modal de Creación/Edición
- Multi-paso con navegación clara
- Botones contextuales ("Siguiente", "Guardar", "Omitir")
- Confirmación en "Cancelar"
- Responsive (inputs se apilan en móvil)

#### Lista de Personas
- Grid adaptativo (1 columna móvil, 3 columnas desktop)
- Click en línea selecciona/deselecciona
- Columna "Opciones" con: Editar, Eliminar, Activar/Desactivar
- Tag de estado con cursor pointer y tooltip

#### Inputs RFID
- Autofocus automático
- Submit con Enter
- Responsive (botón se apila en móvil)

---

## 🔗 INTEGRACIÓN CON SISTEMAS EXTERNOS

### Caso de Uso: Caja de Proveeduría del Camping

#### Flujo Completo
1. **Empleado valida identidad** (RFID/FR) → Obtiene `accountsPersonId`
2. **Sistema de caja consulta Remitero** con `accountsPersonId` → Obtiene `clienteId`
3. **Registra venta** en Remitero con productos e importe
4. **Actualiza stock** automáticamente
5. **Al finalizar período**, Recibos consulta ventas → Calcula total → Crea descuento en recibo

#### APIs de Integración Propuestas

**Remitero:**
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

**Recibos:**
```typescript
// Al generar recibos del período
async function calcularDescuentosProveeduria(periodo: string) {
  // 1. Obtener ventas del período con métodoPago = 'descuento_recibo'
  // 2. Agrupar por accountsPersonId
  // 3. Para cada persona, crear descuento en Recibos
}
```

---

## 🚀 MEJORAS Y OPTIMIZACIONES REQUERIDAS

### Performance
- [ ] Caché de descriptores faciales en memoria (Redis opcional)
- [ ] Indexación optimizada para búsquedas faciales
- [ ] Paginación eficiente en histórico de actividad
- [ ] Lazy loading de componentes pesados

### Seguridad
- [ ] Rate limiting en APIs de autenticación
- [ ] Validación de origen en PostMessage
- [ ] Cifrado de descriptores faciales en reposo
- [ ] Rotación de secrets periódica
- [ ] Whitelist de dominios para embed

### Escalabilidad
- [ ] Sistema multi-tenant (apps/clientes)
- [ ] Configuración por app (métodos permitidos, callbacks)
- [ ] Callback de permisos (consultar app cliente antes de autorizar)
- [ ] Versionado de APIs

### UX/UI
- [ ] Loading states en todas las operaciones
- [ ] Mensajes de error claros y accionables
- [ ] Confirmaciones para acciones destructivas
- [ ] Feedback visual inmediato
- [ ] Accesibilidad (ARIA labels, keyboard navigation)

### Testing
- [ ] Unit tests para lógica de negocio
- [ ] Integration tests para APIs
- [ ] E2E tests con Playwright
- [ ] Tests de reconocimiento facial con datos mock

---

## 📋 VARIABLES DE ENTORNO REQUERIDAS

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

---

## 🎯 CASOS DE USO ESPECÍFICOS

### 1. Control de Acceso a Recursos Digitales
- Validar identidad antes de permitir acceso a cámaras de seguridad
- Control granular sobre acceso a carpetas/documentos
- Protección de datos sensibles con validación biométrica

### 2. Integración con Sistemas de Gestión
- Vinculación con sistemas de remitos (Remitero)
- Validación para autorizar descuentos en recibos de sueldo
- Validación en cajas registradoras y terminales

### 3. Caja de Proveeduría del Camping
- Empleado valida con RFID/FR
- Sistema registra venta vinculada a identidad
- Stock se actualiza automáticamente
- Descuento se aplica automáticamente en recibo de sueldo

---

## 📝 INSTRUCCIONES DE IMPLEMENTACIÓN

### Fase 1: Setup Base
1. Crear proyecto Next.js 16+ con TypeScript
2. Configurar Supabase y crear tablas
3. Configurar NextAuth con Google Provider
4. Implementar layout básico con sidebar

### Fase 2: Gestión de Personas
1. CRUD completo de personas
2. Modal multi-paso para creación
3. Edición y eliminación con confirmaciones
4. Toggle de activación/desactivación

### Fase 3: Reconocimiento Facial
1. Integrar face-api.js
2. Implementar captura y registro de descriptores
3. Implementar verificación con comparación
4. Lógica anti-spam (prevenir re-intentos con mismo rostro)

### Fase 4: RFID
1. CRUD de tarjetas RFID
2. Asociación con personas
3. Autenticación mediante RFID
4. Gestión de tarjetas (activar/desactivar/eliminar)

### Fase 5: Widget Embebible
1. Crear widget JavaScript para CDN
2. Implementar comunicación PostMessage
3. Handshake ACK para asegurar recepción
4. UI con tabs y selección de método

### Fase 6: Histórico y APIs
1. Registro de actividad en cada autenticación
2. API de histórico con filtros
3. API de generación de tokens
4. Documentación completa de APIs

### Fase 7: Mejoras y Optimizaciones
1. Performance (caché, indexación)
2. Seguridad (rate limiting, validaciones)
3. UX/UI refinamientos
4. Testing

---

## ✅ CRITERIOS DE ÉXITO

El sistema debe cumplir con:

1. **Funcionalidad Completa**
   - ✅ Autenticación multi-método (Google, FR, RFID)
   - ✅ Gestión completa de personas
   - ✅ Widget embebible funcional
   - ✅ Histórico de actividad completo

2. **Seguridad**
   - ✅ Tokens JWT seguros
   - ✅ Validación de origen en PostMessage
   - ✅ Rate limiting en APIs críticas
   - ✅ Protección de datos biométricos

3. **Performance**
   - ✅ Respuesta < 2s en autenticaciones
   - ✅ Comparación facial < 1s con 100+ usuarios
   - ✅ Carga incremental de histórico

4. **UX/UI**
   - ✅ Interfaz intuitiva y moderna
   - ✅ Responsive en todos los dispositivos
   - ✅ Feedback claro en todas las acciones
   - ✅ Confirmaciones para acciones destructivas

5. **Documentación**
   - ✅ APIs documentadas completamente
   - ✅ Guía de integración para desarrolladores
   - ✅ Ejemplos de código

---

## 🚨 PUNTOS CRÍTICOS A CONSIDERAR

1. **Prevención de Re-intentos Facial**
   - Almacenar último descriptor fallido
   - Comparar nuevo descriptor con último fallido
   - Solo permitir re-intento si es diferente rostro

2. **Handshake PostMessage**
   - Widget debe enviar ACK después de recibir mensaje
   - Popup debe esperar ACK antes de cerrar
   - Timeout de 4 segundos para ACK

3. **Cierre de Sesión en Embed**
   - Después de entregar token, cerrar sesión de Accounts
   - Prevenir que sesión quede abierta
   - Forzar re-validación en cada login

4. **Responsive Design**
   - Inputs y botones se apilan en móvil
   - Grid adaptativo según tamaño de pantalla
   - Sidebar colapsable en móvil

5. **Protección de Documentación**
   - Solo accesible para admins
   - Meta tags noindex, nofollow
   - robots.txt bloqueando /documentacion

---

## 📚 RECURSOS Y REFERENCIAS

- **face-api.js**: https://github.com/justadudewhohacks/face-api.js
- **NextAuth.js**: https://next-auth.js.org/
- **Next.js App Router**: https://nextjs.org/docs/app
- **Supabase**: https://supabase.com/docs
- **Vercel Deploy**: https://vercel.com/docs

---

## 🎓 NOTAS FINALES

Este sistema debe ser:
- **Profesional**: Código limpio, bien estructurado, documentado
- **Escalable**: Preparado para múltiples clientes y apps
- **Seguro**: Protección de datos biométricos y tokens
- **Mantenible**: Fácil de extender y mejorar
- **User-friendly**: Interfaz intuitiva y clara

**Importante**: Implementa todas las funcionalidades descritas, pero también considera mejoras y optimizaciones. El sistema debe estar listo para producción desde el inicio.

---

**Última actualización**: 2025-01-XX
**Versión objetivo**: 1.0.0
**Estado**: Desarrollo completo desde cero
