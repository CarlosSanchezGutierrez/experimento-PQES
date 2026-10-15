
# Autenticación de usuarios de VERA con Supabase

El backend consulta la tabla `public.users` mediante PostgREST.
La clave privada de Supabase debe existir exclusivamente en el
entorno del backend.

## Variables requeridas

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SECRET_KEY=TU_CLAVE_PRIVADA
JWT_SECRET=UNA_CLAVE_ALEATORIA_LARGA
```

No expongas las claves privadas ni las claves de servicio al frontend.

## Tabla de usuarios

La tabla `users` contiene:

- id
- username
- name
- email
- password
- role
- status
- requested_at
- two_factor_enabled
- two_factor_secret
- pending_secret
- created_at

El usuario puede iniciar sesión con `username` o `email`.
Las cuentas pendientes o deshabilitadas no deben recibir una sesión.

## Contraseñas

Las cuentas heredadas pueden tener contraseñas en texto plano.
Después de validar una contraseña correctamente, el backend puede
migrarla a bcrypt.

Las nuevas cuentas deben almacenar hashes bcrypt.

## Nombres visibles

Las respuestas públicas deben incluir `name`, sin exponer
`password`, `two_factor_secret` ni `pending_secret`.