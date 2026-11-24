# SumoApp (React Native + Expo 54 + BLE NUS)

Aplicativo móvel oficial para configuração pré-partida, telemetria em tempo real, calibração de bancada e registro de medições físicas do robô **`Sumo_Auto_ESP32`** (ESP32-WROOM-32), construído sobre a base arquitetural do [`obytes/react-native-template-obytes`](https://github.com/obytes/react-native-template-obytes).

## Conexão Automática Android & iOS (BLE NUS)
O firmware `Sumo_Auto_ESP32` utiliza **Bluetooth Low Energy (BLE)** nativo do ESP32-WROOM-32 com `NimBLE-Arduino` expondo o **Nordic UART Service (NUS)**:
- **Nome anunciado:** `Madinboo_BT`
- **Service UUID:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **RX (App → ESP32):** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX (ESP32 → App, Notify):** `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

Isso garante funcionamento nativo e **reconexão automática sem pareamento manual** em **Android (8 a 16+)** e **iOS (iPhone/iPad)**.

## Conformidade com Regras de Competição (IR)
- **A luta inicia exclusivamente pelo módulo IR (Sony SIRC):** `0x00` Ready → `0x01` Start → `0x02` Stop. O app não possui comando de início de combate via Bluetooth.
- **Delay IR configurável (`IRD`):** permite escolher no app entre `0 ms` (início imediato no módulo do juiz / RoboCore) ou `5000 ms` (contagem interna de 5 s após `0x01`), salvo em EEPROM.
- **Desligamento automático do BLE em combate (`exper`):** ao entrar em combate, o robô desliga o rádio (`NimBLEDevice::deinit(true)`). O app detecta o estado **"Em Combate"** e **reconecta automaticamente** assim que o `STOP (0x02)` reativa o BLE.

## Funcionalidades
1. **Painel:** conexão/reconexão automática, modo Simulador offline, `Vbat`, mapa ao vivo dos 4 sensores IR (`SE`, `SCE`, `SCD`, `SD`), sensores de borda (`LE`/`LD` + limiar) e IMU 6-DOF (`ax`, `ay`, `gz`, `headingDeg`).
2. **Estratégias:** seleção das 7 táticas (`EST,1..7*`) com recomendação por arquétipo de oponente + seletor de regra IR (`0 s` vs `5 s`).
3. **Ajustes & Perfis:** 4 perfis rápidos de competição + ajuste fino de `VR`, `VG`, `HBE`, `LIP` (float) e `LIE` (float negativo) gravados em EEPROM + `RESET_CFG*`.
4. **Bancada & Medições:** botão de `PARADA*`, calibração `CAL*`/`IMU_CAL*`, D-Pad de teste seguro (soltou = `PARADA*`), console BLE TX/RX e ficha do **Guia Unificado de Medições** salva localmente (MMKV) com exportação em Markdown.

## Build Automática na Nuvem (GitHub Actions)
- **Android APK pronto para instalar:** a cada `push` em `main` (ou disparo manual), o workflow `.github/workflows/build-android.yml` roda `tsc`, `jest`, `expo prebuild` e gera `SumoApp-android.apk` nos **Artifacts** e na Release **`latest-apk`**.
- **iOS:** workflow `.github/workflows/build-ios.yml` (`workflow_dispatch` em `macos-15`).

## Desenvolvimento Local
```bash
pnpm install
pnpm run type-check
pnpm run test
```
