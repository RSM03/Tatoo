# 🎨 Tatoo AI — Plataforma Inteligente para Estudios y Tatuadores

Plataforma SaaS integral construida con **Next.js 14**, **Supabase (PostgreSQL + RLS + Storage)**, **Eden AI (`openai/gpt-4o-mini`)** y **EmailJS**.

---

## 🌟 Características Principales

### 1. Tres Roles de Usuario en el Login
* **Estudio de Tatuaje**: Gestiona uno o varios artistas, horarios de apertura del local, vacaciones, métricas y personalización de plantillas de correo y descuentos.
* **Tatuador Profesional**: Asistente con IA para su chat con clientes, reglas de presupuesto paramétricas, plantillas de curación, portafolio "Share" y control de agenda (citas, descansos, walk-ins).
* **Cliente**: Reserva de citas (diseño o tatuaje), firma digital del consentimiento informado con validez legal y seguimiento fotográfico de curación.

### 2. Chat con IA y "Human Takeover" (Eden AI)
* Modelo base: **`openai/gpt-4o-mini`** a través de Eden AI (`https://api.edenai.run/v3/chat/completions`).
* **Presupuestos Automáticos**: La IA aplica las tarifas definidas por el tatuador (precio base, tramos por cm, multiplicadores por color y zonas complejas) y recalca que el presupuesto es orientativo.
* **Visión Artificial para Curación**: El cliente puede enviar una foto de su tatuaje; la IA analiza la imagen e inyecta la pauta clínica personalizada configurada por el tatuador (`normal`, `enrojecimiento leve`, `alerta por pus/infección`).
* **Intervención Humana (Takeover)**: Si el tatuador escribe un mensaje o pulsa "Pausar IA", el bot se silencia y el cliente ve que habla con el artista en directo.
* **Bandeja de Entrada con Resumen de 1 Línea**: Cada chat muestra el nombre del cliente y una descripción concisa generada por IA sobre lo que busca.

### 3. Consentimiento Informado Digital Legal
* Cuestionario de salud previo (alergias, anticoagulantes).
* Canvas táctil de firma digital (`signature_pad`).
* Registro de auditoría con IP, User-Agent, DNI/NIE y timestamp para plena validez legal y sanitaria.

### 4. Automatizaciones de Email con EmailJS
* **Recordatorio 48 Horas**: Recordatorio automático 2 días antes de la cita con instrucciones y aviso de firma de consentimiento.
* **Newsletter Mensual de Share**: Cada mes se envían los nuevos flashes y diseños a los clientes que hayan tenido citas con el artista.
* **Reactivación a los 4 Meses**: Detecta clientes que llevan 120 días sin citas y les envía un correo con plantilla y código de descuento personalizable por el estudio.

---

## ⚙️ Variables de Entorno (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Eden AI
EDENAI_API_KEY=tu-edenai-api-key
EDENAI_API_URL=https://api.edenai.run/v3/chat/completions
EDENAI_MODEL=openai/gpt-4o-mini

# EmailJS
NEXT_PUBLIC_EMAILJS_SERVICE_ID=tu-service-id
NEXT_PUBLIC_EMAILJS_TEMPLATE_REMINDER=tu-template-reminder
NEXT_PUBLIC_EMAILJS_TEMPLATE_NEWSLETTER=tu-template-newsletter
NEXT_PUBLIC_EMAILJS_TEMPLATE_REENGAGEMENT=tu-template-reengagement
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=tu-public-key
```

---

## 🗄️ Base de Datos en Supabase
El esquema completo listo para ejecutar en el SQL Editor de Supabase se encuentra en:
[`supabase/schema.sql`](file:///C:/Users/50053232/Downloads/Tatoo/supabase/schema.sql)
