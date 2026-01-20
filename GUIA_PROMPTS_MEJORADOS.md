# 🎯 Guía para Escribir Prompts Efectivos

## 📋 Análisis del Prompt Original vs Mejorado

### ❌ Prompt Original (Tu versión)
```
traeme esa funcionalidad acá, respetando estetica y ux. Separado, a modo de osdata perfeccioname este prompt y enseñame a hacerlos mejor
```

**Problemas identificados:**
1. ❌ Falta contexto específico ("esa funcionalidad" - ¿cuál?)
2. ❌ "a modo de osdata" - referencia ambigua
3. ❌ No especifica dónde integrar
4. ❌ No menciona requisitos técnicos
5. ❌ No define criterios de éxito

### ✅ Prompt Mejorado (Versión optimizada)

```
Necesito integrar la funcionalidad de lectura/escritura de tarjetas RFID que desarrollamos 
en recibos-gremio/components/RFIDReader.tsx en la página de gestión de personas de accounts.

CONTEXTO:
- La página actual está en accounts/src/app/page.tsx
- Ya existe un panel RFID básico (líneas 1101-1181) que solo permite asociar tarjetas manualmente
- La estética usa: bg-white, rounded-lg, border border-gray-200, p-6
- Los botones usan: bg-gray-900, text-white, rounded-lg

REQUISITOS:
1. Crear un componente separado RfidManager.tsx en accounts/src/components/
2. Integrar funcionalidad de WebHID para conectar el dispositivo NSCCN Smart Reader
3. Agregar selector de modo: Leer / Escribir (tabs o botones)
4. Modo Leer: capturar UID automáticamente y asociar a la persona seleccionada
5. Modo Escribir: campo de ID de 12 dígitos (autonumérico como placeholder), botón para escribir
6. Mantener la lista de tarjetas existente con toggle activo/inactivo
7. Respetar exactamente la estética actual (colores, espaciados, bordes)
8. Notificaciones: avisar cuando está escribiendo, cuando termina, cuando lee tarjeta vacía

CRITERIOS DE ÉXITO:
- El componente debe ser reutilizable y estar separado
- Debe mantener la UX consistente con el resto de la aplicación
- Debe funcionar igual que en recibos-gremio pero adaptado a accounts
- No debe romper funcionalidad existente

¿Puedes crear el componente y mostrarme cómo mejoraste el prompt?
```

## 🎓 Principios para Escribir Prompts Efectivos

### 1. **Contexto Claro (Context)**
✅ **Hacer:**
- Especificar exactamente qué archivos/componentes están involucrados
- Mencionar el estado actual del código
- Referenciar ubicaciones específicas (rutas, líneas de código)

❌ **Evitar:**
- Referencias vagas ("esa funcionalidad", "allí")
- Asumir que el AI conoce el contexto completo

### 2. **Requisitos Específicos (Requirements)**
✅ **Hacer:**
- Listar funcionalidades concretas
- Especificar comportamientos esperados
- Mencionar casos edge (tarjeta vacía, errores, etc.)

❌ **Evitar:**
- Requisitos genéricos ("que funcione bien")
- Múltiples interpretaciones posibles

### 3. **Criterios de Éxito (Success Criteria)**
✅ **Hacer:**
- Definir qué significa "completado"
- Especificar cómo validar el resultado
- Mencionar restricciones (no romper X, mantener Y)

❌ **Evitar:**
- Dejar abierto a interpretación
- No definir qué es "mejor"

### 4. **Estética y UX (Design Constraints)**
✅ **Hacer:**
- Especificar clases CSS exactas o sistema de diseño
- Mencionar patrones de UI existentes
- Referenciar componentes similares

❌ **Evitar:**
- "Que se vea bien" (subjetivo)
- No dar ejemplos visuales

### 5. **Estructura del Prompt (Structure)**

```
[CONTEXTO]
- Situación actual
- Archivos involucrados
- Estado del código

[REQUISITOS]
1. Funcionalidad específica 1
2. Funcionalidad específica 2
3. ...

[CRITERIOS DE ÉXITO]
- Validación 1
- Validación 2
- ...

[RESTRICCIONES]
- No debe romper X
- Debe mantener Y
- ...
```

## 📝 Plantilla de Prompt Mejorado

```
Necesito [ACCIÓN PRINCIPAL] en [UBICACIÓN ESPECÍFICA].

CONTEXTO:
- [Situación actual del código]
- [Archivos/componentes involucrados]
- [Estado actual vs estado deseado]

REQUISITOS TÉCNICOS:
1. [Requisito específico 1 con detalles]
2. [Requisito específico 2 con detalles]
3. [Casos edge o especiales]

REQUISITOS DE DISEÑO:
- [Estética: clases CSS, colores, espaciados]
- [UX: flujos, interacciones, feedback]
- [Patrones existentes a seguir]

CRITERIOS DE ÉXITO:
- [Cómo validar que funciona]
- [Qué debe mantener intacto]
- [Qué debe mejorar]

RESTRICCIONES:
- [Lo que NO debe hacer]
- [Compatibilidad requerida]
- [Límites técnicos]
```

## 🔍 Ejemplos Comparativos

### Ejemplo 1: Integración de Componente

❌ **Mal:**
```
agrega ese componente acá
```

✅ **Bien:**
```
Integra el componente UserCard de components/UserCard.tsx en la página 
accounts/src/app/dashboard/page.tsx.

CONTEXTO:
- La página dashboard actualmente muestra usuarios en una tabla (líneas 45-120)
- El componente UserCard ya existe y muestra: avatar, nombre, email, estado

REQUISITOS:
1. Reemplazar la tabla por una grid de UserCard (3 columnas en desktop, 1 en mobile)
2. Mantener la funcionalidad de filtrado existente
3. Agregar hover effect: scale(1.02) transition
4. Usar gap-4 entre cards

CRITERIOS DE ÉXITO:
- La grid se adapta responsivamente
- El filtrado sigue funcionando
- Performance: renderizado < 100ms para 50 usuarios
```

### Ejemplo 2: Nueva Funcionalidad

❌ **Mal:**
```
haz que se pueda exportar
```

✅ **Bien:**
```
Agrega funcionalidad de exportación de datos en accounts/src/app/reports/page.tsx.

CONTEXTO:
- La página muestra una tabla de reportes (componente ReportsTable)
- Los datos vienen de /api/reports (formato JSON)
- Ya existe un botón "Exportar" deshabilitado (línea 234)

REQUISITOS:
1. Habilitar el botón cuando hay datos cargados
2. Exportar a CSV con formato: fecha, usuario, acción, resultado
3. Nombre de archivo: reportes_YYYY-MM-DD.csv
4. Agregar loading state durante exportación
5. Mostrar toast de éxito/error

CRITERIOS DE ÉXITO:
- El CSV se descarga correctamente
- Todos los datos visibles se exportan
- El formato es compatible con Excel
- Manejo de errores si falla la exportación
```

## 🎯 Checklist Antes de Enviar un Prompt

- [ ] ¿Especifico qué archivos/componentes están involucrados?
- [ ] ¿Menciono el estado actual del código?
- [ ] ¿Listo los requisitos de forma específica y medible?
- [ ] ¿Defino criterios de éxito claros?
- [ ] ¿Menciono restricciones o límites?
- [ ] ¿Especifico estética/UX si es relevante?
- [ ] ¿Incluyo casos edge o especiales?
- [ ] ¿El prompt puede tener solo una interpretación?

## 💡 Tips Adicionales

1. **Usa ejemplos de código existente:** "Similar a como funciona en X componente"
2. **Referencia líneas específicas:** "En la línea 234, cambiar..."
3. **Menciona dependencias:** "Usar la API /api/rfid/associate que ya existe"
4. **Sé explícito sobre el alcance:** "Solo modificar X, no tocar Y"
5. **Pide explicación:** "Muéstrame cómo mejoraste el prompt" (como hiciste)

## 🚀 Resultado

Con este prompt mejorado, el AI puede:
- ✅ Entender exactamente qué necesitas
- ✅ Saber dónde hacer los cambios
- ✅ Mantener consistencia con el código existente
- ✅ Validar que cumplió los requisitos
- ✅ Aprender de tu estilo para futuros prompts

---

**Nota:** El mejor prompt es el que no requiere preguntas de seguimiento. Si el AI necesita aclarar algo, el prompt puede mejorarse.
