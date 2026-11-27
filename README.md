# SumoApp (React Native + Expo 54 + BLE NUS + 3D Offline)

Aplicativo móvel oficial para configuração pré-partida, telemetria em tempo real, visualização 3D offline de atitude e diagnóstico de bancada do robô **`Sumo_Auto_ESP32`** (ESP32-WROOM-32).

- **Download direto do APK Android (`latest-apk` / `v10.0.0`):** https://github.com/alguemaiYT/SumoApp/releases/download/latest-apk/SumoApp-android.apk
- **Firmware compatível (`v2.1.0`):** [`alguemaiYT/Sumo_Auto_ESP32`](https://github.com/alguemaiYT/Sumo_Auto_ESP32) (`debug` / `exper`)

## Conexão Automática Android & iOS (BLE NUS)
O firmware `Sumo_Auto_ESP32` utiliza **Bluetooth Low Energy (BLE)** nativo do ESP32-WROOM-32 com `NimBLE-Arduino@2.5.2` expondo o **Nordic UART Service (NUS)**:
- **Nome anunciado:** `Madinboo_BT`
- **Service UUID:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **RX (App → ESP32):** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX (ESP32 → App, Notify):** `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

## Funcionalidades (`v10.0.0`)
1. **Painel (Estética Industrial Carbono + Modo Alto Contraste para Ginásio):**
   - **Toggle `[2D | 3D]` + Tela Cheia:**
     - **2D:** radar esquemático top-down com arcos `SE / SCE / SCD / SD`, agulha de `Yaw` ao vivo no chassi e badges dinâmicos `PISTA` / `BORDA` para `LE` e `LD`.
     - **3D Offline (`Mini-Sumo 500g`):** modelo 3D procedural em Three.js r160 100% embutido sem CDN (`react-native-webview`), com a lâmina voltada para a tela, cones dos 4 sensores IR acesos ao vivo, anel do dohyō reagindo à borda branca, **gráfico osciloscópio X/Y/Z no fundo** (`XYZ°` ou `m/s²`), estilos (`Téc`, `HUD`, `Cel`), câmeras (`3/4`, `Frente`, `Lat`, `Topo`), streaming automático ~16 Hz (`STREAM,1*`) e retorno suave para **pose neutra (`OFFLINE · POSE NEUTRA`)** ao desligar o robô.
   - **Telemetria IMU em Graus:** seletor **`GRAUS | m/s²`** (`PITCH°`, `ROLL°`, `YAW°`, `GIRO °/s` ou `AX`, `AY`, `GZ`, `YAW`), botão **`0° Yaw` / `Frente` (Tare / `ZERO_YAW*`)** e toggle **`Vibrar IR`** (feedback háptico na detecção).
   - **Barra Global Fixa:** pílula BLE minimalista, saúde da bateria **LiPo 2S** (`V`, `V/cél`, `%` e alertas `< 7.4V` / `< 7.1V`) e botão global **`STOP`** (`PARADA*`).
2. **Estratégias:** grade tática 2×3 (`01` a `06`), separador `TESTE / CALIBRAÇÃO` para `07 Segue Linha`, card de detalhe tático e seletor **Início IR** (`0s · Juiz` vs `+5s · Interno`, `IRD`) com diálogo de confirmação + badge `EEPROM OK`.
3. **Ajustes & Perfis:** 4 perfis rápidos de competição, sliders com pegador geométrico (`LIE` negativo preenchido da direita para o zero), barra fixa `Salvar na EEPROM` com estado *dirty* e `Resetar` (`RESET_CFG*`).
4. **Bancada (Controle, Calibração & Ficha Técnica):**
   - **Controle:** console BLE NUS cronológico (`TX` ciano, `RX` verde), chips rápidos (`INFO*`, `dados*`, `ZERO_YAW*`, `CAL*`, `PARADA*`), D-Pad de bancada (soltou = `PARADA*`) e faixa **`PULSO 1S`** isolada por motor (`Esq +`/`-`, `Dir +`/`-` via `MOT_E`/`MOT_D`).
   - **Calibração:** `CAL*`, `IMU_CAL*` (salva biases na NVS da ESP32), **Diagnóstico de Pinos IR (Latch)** com GPIO (`SE·35`, `SCE·32`, `SCD·33`, `SD·25`) + contadores, linhas (`LE·39`, `LD·26`), saúde `LiPo 2S` e inclinação em graus.
   - **Ficha Técnica:** preenchimento 1-toque via BLE (`+ Vbat`, `+ Preto`, `+ Branco`), persistência local (MMKV) e exportação em Markdown.

## Conformidade com Regras de Competição (IR)
- **Início exclusivamente via IR Sony SIRC (`0x00` Ready → `0x01` Start → `0x02` Stop) ou botão físico:** não existe comando wireless de início de luta.
- **BLE desligado em combate (`exper`):** o robô chama `NimBLEDevice::deinit(true)` na largada e religa automaticamente no `STOP (0x02)` para reconexão imediata do app.

## Build Automática na Nuvem (GitHub Actions)
- **Android APK:** `.github/workflows/build-android.yml` executa `type-check`, `jest`, `expo prebuild`, `assembleRelease` e publica `SumoApp-android.apk` em **`latest-apk`**.
- **iOS:** `.github/workflows/build-ios.yml` (`workflow_dispatch` em `macos-15`).

## Desenvolvimento Local
```bash
pnpm install
pnpm run type-check
pnpm run test
```
