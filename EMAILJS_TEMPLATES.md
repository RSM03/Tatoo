# 📧 Plantillas Oficiales de EmailJS para Tatoo AI

Copia y pega estas plantillas directamente en tu panel de **EmailJS** (`https://dashboard.emailjs.com/admin/templates`).

---

## 🔔 Plantilla 1: Recordatorio de Cita (48 Horas Antes)
* **Nombre sugerido en EmailJS:** `Recordatorio Cita 48h`
* **Template ID recomendado:** `template_reminder_48h` (configurar en `.env.local` como `NEXT_PUBLIC_EMAILJS_TEMPLATE_REMINDER`)
* **Asunto (Subject):**
  `🔔 Recordatorio de tu cita en {{studio_name}} - {{appointment_date}} a las {{appointment_time}}`
* **Variables requeridas en EmailJS:**
  * `{{to_email}}`
  * `{{client_name}}`
  * `{{artist_name}}`
  * `{{studio_name}}`
  * `{{appointment_type}}`
  * `{{appointment_date}}`
  * `{{appointment_time}}`
  * `{{studio_address}}`
  * `{{consent_status}}`
  * `{{consent_url}}`

### Contenido HTML para EmailJS:
```html
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px; font-weight: bold;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px; margin-top: 5px;">Recordatorio de tu próxima sesión</p>
  </div>

  <div style="background-color: #131519; padding: 25px; border-radius: 12px; border: 1px solid #262930; margin-bottom: 20px;">
    <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Te recordamos que tienes una cita programada de <strong>{{appointment_type}}</strong> con <strong>{{artist_name}}</strong> en <strong>{{studio_name}}</strong>.
    </p>

    <div style="background-color: #0b0c0e; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e63946;">
      <p style="margin: 4px 0; color: #f8f9fa; font-size: 14px;">📅 <strong>Fecha:</strong> {{appointment_date}}</p>
      <p style="margin: 4px 0; color: #f8f9fa; font-size: 14px;">⏰ <strong>Hora:</strong> {{appointment_time}}</p>
      <p style="margin: 4px 0; color: #f8f9fa; font-size: 14px;">📍 <strong>Ubicación:</strong> {{studio_address}}</p>
    </div>

    <h3 style="color: #fbbf24; font-size: 14px; margin-bottom: 8px;">Recomendaciones previas importantes:</h3>
    <ul style="color: #ced4da; font-size: 13px; line-height: 1.6; padding-left: 20px; margin-top: 0;">
      <li>Descansa bien la noche anterior y ven bien hidratado/a.</li>
      <li>Come algo nutritivo 1 hora antes de la cita.</li>
      <li>No consumas alcohol ni medicamentos anticoagulantes 24h antes.</li>
      <li>Viste ropa cómoda que permita acceso cómodo a la zona a tatuar.</li>
    </ul>

    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #262930; text-align: center;">
      <p style="color: #fbbf24; font-size: 13px; font-weight: bold; margin-bottom: 12px;">{{consent_status}}</p>
      <a href="{{consent_url}}" style="display: inline-block; background-color: #e63946; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
        Firmar Consentimiento Informado Online
      </a>
    </div>
  </div>

  <p style="text-align: center; color: #6c757d; font-size: 12px; margin: 0;">
    Si necesitas modificar o reprogramar tu cita, por favor ponte en contacto con el estudio lo antes posible.
  </p>
</div>
```

---

## 🎨 Plantilla 2: Newsletter Mensual de Share (Nuevos Flashes)
* **Nombre sugerido en EmailJS:** `Newsletter Mensual Share`
* **Template ID recomendado:** `template_newsletter_monthly` (configurar en `.env.local` como `NEXT_PUBLIC_EMAILJS_TEMPLATE_NEWSLETTER`)
* **Asunto (Subject):**
  `🔥 Nuevos flashes y trabajos del mes en {{studio_name}} por {{artist_name}}`
* **Variables requeridas en EmailJS:**
  * `{{to_email}}`
  * `{{client_name}}`
  * `{{artist_name}}`
  * `{{studio_name}}`
  * `{{works_count}}`
  * `{{works_summary}}`
  * `{{gallery_link}}`

### Contenido HTML para EmailJS:
```html
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px; font-weight: bold;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px; margin-top: 5px;">Novedades exclusivas de {{artist_name}}</p>
  </div>

  <div style="background-color: #131519; padding: 25px; border-radius: 12px; border: 1px solid #262930; margin-bottom: 20px;">
    <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Esperamos que tu piel luzca genial. Este mes, <strong>{{artist_name}}</strong> ha preparado <strong>{{works_count}} nuevos diseños y flashes disponibles</strong> en el estudio.
    </p>

    <div style="background-color: #0b0c0e; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #262930;">
      <h3 style="color: #fbbf24; font-size: 14px; margin-top: 0; margin-bottom: 8px;">Diseños destacados de este mes:</h3>
      <p style="color: #f8f9fa; font-size: 13px; line-height: 1.7; white-space: pre-line; margin: 0;">{{works_summary}}</p>
    </div>

    <div style="text-align: center; margin-top: 25px;">
      <a href="{{gallery_link}}" style="display: inline-block; background-color: #7928ca; color: #ffffff; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: bold; font-size: 14px;">
        Ver Galería de Flashes y Reservar
      </a>
    </div>
  </div>

  <p style="text-align: center; color: #6c757d; font-size: 12px; margin: 0;">
    Recibes este correo porque te has tatuado con {{artist_name}} en {{studio_name}}.
  </p>
</div>
```

---

## 🖤 Plantilla 3: Reactivación tras 4 Meses sin Citas (con Descuento)
* **Nombre sugerido en EmailJS:** `Reactivacion 4 Meses`
* **Template ID recomendado:** `template_reengagement_4m` (configurar en `.env.local` como `NEXT_PUBLIC_EMAILJS_TEMPLATE_REENGAGEMENT`)
* **Asunto (Subject):**
  `🖤 ¿Ganas de nueva tinta, {{client_name}}? Te regalamos un {{discount_percent}} de descuento`
* **Variables requeridas en EmailJS:**
  * `{{to_email}}`
  * `{{client_name}}`
  * `{{artist_name}}`
  * `{{studio_name}}`
  * `{{discount_code}}`
  * `{{discount_percent}}`
  * `{{booking_link}}`
  * `{{custom_message}}`

### Contenido HTML para EmailJS:
```html
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px; font-weight: bold;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px; margin-top: 5px;">Te echamos de menos en el estudio</p>
  </div>

  <div style="background-color: #131519; padding: 25px; border-radius: 12px; border: 1px solid #262930; margin-bottom: 20px;">
    <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Ya han pasado <strong>4 meses</strong> desde tu última sesión de tatuaje con <strong>{{artist_name}}</strong> en <strong>{{studio_name}}</strong>.
    </p>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      {{custom_message}}
    </p>

    <!-- Caja de Descuento -->
    <div style="background: linear-gradient(135deg, rgba(230,57,70,0.15) 0%, rgba(251,191,36,0.15) 100%); border: 2px dashed #fbbf24; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
      <span style="display: block; font-size: 12px; text-transform: uppercase; color: #fbbf24; font-weight: bold; letter-spacing: 1px;">Tu código promocional de fidelidad</span>
      <span style="display: block; font-size: 28px; font-weight: 900; color: #ffffff; margin: 8px 0; letter-spacing: 3px; font-family: monospace;">{{discount_code}}</span>
      <span style="display: block; font-size: 14px; color: #f8f9fa;">¡Aprovecha un <strong>{{discount_percent}} de descuento</strong> en tu próxima sesión o flash!</span>
    </div>

    <div style="text-align: center; margin-top: 25px;">
      <a href="{{booking_link}}" style="display: inline-block; background-color: #e63946; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">
        Pedir Cita con {{discount_percent}} Descuento
      </a>
    </div>
  </div>

  <p style="text-align: center; color: #6c757d; font-size: 12px; margin: 0;">
    {{studio_name}} — Tu espacio de confianza para el arte corporal.
  </p>
</div>
```
