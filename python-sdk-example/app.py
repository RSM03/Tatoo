import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import requests

# Carga las variables de entorno desde un archivo .env
load_dotenv()

app = Flask(__name__)

# Configuración de tokens (puedes ponerlos fijos para probar o usar os.environ)
VERIFY_TOKEN = os.getenv(
    "VERIFY_TOKEN", "tu_token_de_verificacion_personalizado"
)
PAGE_ACCESS_TOKEN = os.getenv(
    "PAGE_ACCESS_TOKEN", "tu_page_access_token_de_meta"
)


@app.route("/webhook", methods=["GET"])
def verify_webhook():
  """Este es el endpoint que Meta llama para verificar tu token."""
  mode = request.args.get("hub.mode")
  token = request.args.get("hub.verify_token")
  challenge = request.args.get("hub.challenge")

  if mode and token:
    if mode == "subscribe" and token == VERIFY_TOKEN:
      print("¡Webhook verificado correctamente por Meta!")
      return challenge, 200
    else:
      print("Fallo de verificación: El token no coincide.")
      return "Verificación fallida: Token incorrecto", 403
  return "Parámetros faltantes", 400


@app.route("/webhook", methods=["POST"])
def handle_webhook():
  """Este endpoint recibe los mensajes que los usuarios mandan a Instagram."""
  data = request.get_json()

  if data.get("object") == "instagram":
    for entry in data.get("entry", []):
      for messaging_event in entry.get("messaging", []):

        # Si hay un mensaje de texto del usuario
        if "message" in messaging_event and "text" in messaging_event[
            "message"
        ]:
          sender_id = messaging_event["sender"]["id"]
          message_text = messaging_event["message"]["text"]

          print(f"Mensaje recibido de {sender_id}: {message_text}")

          # Aquí respondemos con "Hola mundo" (lugar donde luego irá tu IA)
          send_instagram_message(sender_id, "Hola mundo")

  return jsonify({"status": "success"}), 200


def send_instagram_message(recipient_id, text):
  """Función para enviar la respuesta de vuelta a Instagram."""
  url = "https://graph.facebook.com/v21.0/me/messages"
  headers = {"Content-Type": "application/json"}
  payload = {
      "recipient": {"id": recipient_id},
      "message": {"text": text},
      "access_token": PAGE_ACCESS_TOKEN,
  }

  response = requests.post(url, json=payload, headers=headers)

  if response.status_code == 200:
    print(f"Mensaje enviado con éxito a {recipient_id}")
  else:
    print(f"Error al enviar mensaje: {response.text}")

  return response.json()


if __name__ == "__main__":
  app.run(port=5000, debug=True)