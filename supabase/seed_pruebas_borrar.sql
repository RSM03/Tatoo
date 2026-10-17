-- =============================================================================
-- BORRAR LOS DATOS DE PRUEBA DE TATTOO AI
-- Elimina las cuentas de prueba y, en cascada, todo lo que cuelga de ellas:
-- perfiles, estudios, tatuadores, citas, chats, consentimientos, galería y reseñas.
--
-- Pon los MISMOS emails que usaste en seed_pruebas.sql y ejecútalo en Supabase > SQL Editor.
-- ¡Cuidado!: no pongas aquí cuentas reales; se borran del todo.
-- =============================================================================
DELETE FROM auth.users
 WHERE email IN (
   'CAMBIA-ESTO+estudio1@gmail.com',   -- <-- CAMBIA
   'CAMBIA-ESTO+estudio2@gmail.com',   -- <-- CAMBIA
   'CAMBIA-ESTO+cliente@gmail.com'     -- <-- CAMBIA
 );
