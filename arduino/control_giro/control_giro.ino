// EAI441 - Control de giro con sensor
// Arduino UNO R4 WiFi: envía la distancia a la API REST y ejecuta el comando de motor que recibe.
// Librería requerida (Gestor de librerías): ArduinoHttpClient
#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include "arduino_secrets.h"

const int IN1 = 8;
const int IN2 = 7;
const int PWM_M1 = 11;

const int TRIG = 4;
const int ECHO = 3;

const unsigned long INTERVALO_MS = 300;
const unsigned long TIMEOUT_RESPUESTA_MS = 5000;
// Si la API no responde durante este tiempo, el motor se detiene por seguridad.
const unsigned long TIMEOUT_SIN_API_MS = 3000;

WiFiSSLClient ssl;
HttpClient http(ssl, SECRET_HOST, 443);

long duracion;
int distancia;
String motor = "detener";
unsigned long ultimoEnvio = 0;
unsigned long ultimaRespuesta = 0;

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(PWM_M1, OUTPUT);

  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  digitalWrite(TRIG, LOW);
  aplicarMotor("detener");

  Serial.begin(9600);

  http.connectionKeepAlive();
  http.setHttpResponseTimeout(TIMEOUT_RESPUESTA_MS);
  conectarWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    aplicarMotor("detener");
    conectarWiFi();
  }

  if (millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  distancia = medirDistancia();
  Serial.print("Distancia: ");
  Serial.print(distancia);
  Serial.print(" cm");

  if (enviarLectura(distancia)) {
    ultimaRespuesta = millis();
    Serial.print(" | Motor: ");
    Serial.println(motor);
  } else {
    Serial.println(" | Sin respuesta de la API");
    if (millis() - ultimaRespuesta > TIMEOUT_SIN_API_MS) {
      motor = "detener";
    }
  }

  aplicarMotor(motor);
}

void conectarWiFi() {
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print("Conectando a ");
    Serial.println(SECRET_SSID);
    WiFi.begin(SECRET_SSID, SECRET_PASS);
    delay(5000);
  }
  Serial.print("WiFi conectado. IP: ");
  Serial.println(WiFi.localIP());
}

int medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  duracion = pulseIn(ECHO, HIGH, 30000);

  if (duracion == 0) {
    return -1;
  }
  return duracion * 0.0343 / 2;
}

// POST /api/sensor {"distancia": d} -> {"modo": "...", "motor": "..."}
bool enviarLectura(int d) {
  String cuerpo = "{\"distancia\":" + String(d) + "}";

  http.beginRequest();
  http.post("/api/sensor");
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", cuerpo.length());
  if (strlen(SECRET_API_KEY) > 0) {
    http.sendHeader("X-API-Key", SECRET_API_KEY);
  }
  http.beginBody();
  http.print(cuerpo);
  http.endRequest();

  int codigo = http.responseStatusCode();
  if (codigo != 200) {
    http.stop();
    return false;
  }

  String respuesta = http.responseBody();
  String nuevo = leerCampo(respuesta, "motor");
  if (nuevo != "izquierda" && nuevo != "derecha" && nuevo != "detener") {
    return false;
  }
  motor = nuevo;
  return true;
}

// Extrae el valor de texto de un campo de un JSON plano: "campo":"valor"
String leerCampo(const String& json, const char* campo) {
  String clave = "\"" + String(campo) + "\":\"";
  int inicio = json.indexOf(clave);
  if (inicio < 0) return "";
  inicio += clave.length();
  int fin = json.indexOf('"', inicio);
  if (fin < 0) return "";
  return json.substring(inicio, fin);
}

void aplicarMotor(const String& accion) {
  if (accion == "derecha") {
    // Girar a la derecha
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    analogWrite(PWM_M1, 255);
  }
  else if (accion == "izquierda") {
    // Girar a la izquierda
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    analogWrite(PWM_M1, 255);
  }
  else {
    // Detener el motor
    analogWrite(PWM_M1, 0);
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
  }
}
