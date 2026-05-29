/**
 * UPX 7 — Totem NFC (Arduino Uno + RC522)
 *
 * RC522: RST=9, SDA(SS)=10, MOSI=11, MISO=12, SCK=13, 3.3V, GND
 * LED pino 8 — ligado quando a tag e liberada
 *
 * Ao liberar, envia LOG:UID (pc-bridge -> Supabase -> app)
 * Monitor Serial: 9600 baud
 */

#include <SPI.h>
#include <MFRC522.h>

const int RST_PIN = 9;
const int SS_PIN = 10;
const int LED_PIN = 8;

MFRC522 mfrc522(SS_PIN, RST_PIN);

unsigned long ultimaLeituraOk = 0;
const unsigned long DEBOUNCE_LEITURA_MS = 1500;
const byte LEITURAS_AUSENTE_PARA_REMOVER = 3;

bool tagLiberada = false;
byte contadorTagAusente = 0;

void ledLigar() {
  digitalWrite(LED_PIN, HIGH);
}

void ledDesligar() {
  digitalWrite(LED_PIN, LOW);
}

bool tagAindaNoSensor() {
  byte atqa[2];
  byte atqaLen = sizeof(atqa);

  MFRC522::StatusCode status = mfrc522.PICC_WakeupA(atqa, &atqaLen);
  if (status == MFRC522::STATUS_OK) {
    mfrc522.PICC_HaltA();
    return true;
  }

  atqaLen = sizeof(atqa);
  status = mfrc522.PICC_RequestA(atqa, &atqaLen);
  if (status == MFRC522::STATUS_OK) {
    mfrc522.PICC_HaltA();
    return true;
  }

  return false;
}

void enviarUidParaSite() {
  Serial.print(F("LOG:"));
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) Serial.print(F("0"));
    Serial.print(mfrc522.uid.uidByte[i], HEX);
  }
  Serial.println();
  Serial.flush();
}

void avisarTagLiberada() {
  enviarUidParaSite();
  Serial.println(F("[OK] Tag liberada"));
  Serial.flush();
}

void avisarTagRemovida() {
  Serial.println(F("[OK] Tag removida"));
  Serial.flush();
}

bool tentarLerTag() {
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return false;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    mfrc522.PICC_HaltA();
    return false;
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  return true;
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  ledDesligar();

  Serial.begin(9600);
  delay(300);

  SPI.begin();
  mfrc522.PCD_Init();
  mfrc522.PCD_AntennaOn();

  byte versao = mfrc522.PCD_ReadRegister(MFRC522::VersionReg);
  if (versao == 0x00 || versao == 0xFF) {
    Serial.println(F("[ERRO] RC522 nao encontrado"));
    while (true) {
      delay(1000);
    }
  }
}

void loop() {
  unsigned long agora = millis();

  if (tagLiberada) {
    if (tagAindaNoSensor()) {
      contadorTagAusente = 0;
      return;
    }

    contadorTagAusente++;
    if (contadorTagAusente < LEITURAS_AUSENTE_PARA_REMOVER) {
      return;
    }

    contadorTagAusente = 0;
    tagLiberada = false;
    ledDesligar();
    avisarTagRemovida();
    return;
  }

  if (agora - ultimaLeituraOk < DEBOUNCE_LEITURA_MS) {
    return;
  }

  if (tentarLerTag()) {
    ultimaLeituraOk = agora;
    tagLiberada = true;
    contadorTagAusente = 0;
    ledLigar();
    avisarTagLiberada();
  }
}
