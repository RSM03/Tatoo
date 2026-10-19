import os
import threading
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import ngrok
import requests

load_dotenv()

app = Flask(__name__)

VERIFY_TOKEN = os.getenv(
    "VERIFY_TOKEN", "tu_token_de_verificacion_personalizado"
)
PAGE_ACCESS_TOKEN = os.getenv(
    "PAGE_ACCESS_TOKEN", "tu_page_access_token_de_meta"
)


@app.route("/webhook", methods=["GET"])
def verify_webhook():
  mode = request.args.get("hub.mode")
  token = request.args.get("hub.verify_token")
  challenge = request.args.get("hub.challenge")

  if mode and token:
    if mode == "subscribe" and token == VERIFY_TOKEN:
      print("¡Webhook verificado correctamente por Meta!")
      return challenge, 200
    else:
      return "Verificación fallida: Token incorrecto", 403
  return "Parámetros faltantes", 400


@app.route("/webhook", methods=["POST"])
def handle_webhook():
  data = request.get_json()

  if data.get("object") == "instagram":
    for entry in data.get("entry", []):
      for messaging_event in entry.get("messaging", []):
        if "message" in messaging_event and "text" in messaging_event[
            "message"
        ]:
          sender_id = messaging_event["sender"]["id"]
          message_text = messaging_event["message"]["text"]
          print(f"Mensaje recibido de {sender_id}: {message_text}")
          send_instagram_message(sender_id, "Hola mundo")

  return jsonify({"status": "success"}), 200


def send_instagram_message(recipient_id, text):
  url = "https://graph.facebook.com/v21.0/me/messages"
  headers = {"Content-Type": "application/json"}
  payload = {
      "recipient": {"id": recipient_id},
      "message": {"text": text},
      "access_token": PAGE_ACCESS_TOKEN,
  }
  response = requests.post(url, json=payload, headers=headers)
  return response.json()


def start_ngrok():
  """Inicia el túnel ngrok de forma automática en segundo plano."""
  try:
    authtoken = os.environ.get("NGROK_AUTHTOKEN")
    if authtoken:
      ngrok.set_auth_token(authtoken)

    listener = ngrok.forward(5000)
    print(f"\n * ngrok tunnel available at: {listener.url()}\n")
  except Exception as e:
    print(f"Error al iniciar ngrok: {e}")


if __name__ == "__main__":
  # Lanzamos ngrok en un hilo separado para que no bloquee a Flask
  threading.Thread(target=start_ngrok, daemon=True).start()

  # Ejecutamos Flask (desactivamos debug para evitar duplicar túneles de ngrok)
  app.run(port=5000, debug=False)