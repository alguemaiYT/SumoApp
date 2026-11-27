# SumoApp — DragonBotz Robotics (React Native + Expo 54 + BLE NUS + 3D Offline)

Aplicativo móvel oficial para configuração pré-partida, telemetria em tempo real, visualização 3D offline de atitude, controle manual 360° e diagnóstico de bancada do robô **`Sumo_Auto_ESP32`** (Mini-Sumô 500g · ESP32-WROOM-32).

- **Release estável atual (`v10.2.0`):** https://github.com/alguemaiYT/SumoApp/releases/tag/v10.2.0
- **Download direto do APK Android (`latest-apk`):** https://github.com/alguemaiYT/SumoApp/releases/download/latest-apk/SumoApp-android.apk
- **Firmware compatível (`v2.1.2`):** [`alguemaiYT/Sumo_Auto_ESP32`](https://github.com/alguemaiYT/Sumo_Auto_ESP32) (`debug` / `exper`)

## Conexão Automática Android & iOS (BLE NUS)
O firmware `Sumo_Auto_ESP32` utiliza **Bluetooth Low Energy (BLE)** nativo do ESP32-WROOM-32 com `NimBLE-Arduino@2.5.2` expondo o **Nordic UART Service (NUS)**:
- **Nome anunciado:** `Madinboo_BT`
- **Service UUID:** `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- **RX (App → ESP32):** `6E400002-B5A3-F393-E0A9-E50E24DCCA9E`
- **TX (ESP32 → App, Notify):** `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`

## Funcionalidades (`v10.2.0`)
1. **Identidade DragonBotz & Navegação Fluida:**
   - **Splash Screen animada** e ícones adaptativos com a logo oficial **DragonBotz Robotics** (fundo carbono `#09090B`) + assinatura minimalista no Painel e no menu BLE.
   - **Swipe lateral entre abas** (`Painel` ↔ `Estratégias` ↔ `Ajustes` ↔ `Bancada`, `animation: 'shift'`) com trava inteligente automática (`gesture-lock.ts`) ao arrastar sliders, usar o joystick ou girar o modelo 3D.
   - **Arquitetura de alta performance (zero travamentos):** WebView 3D com `source` singleton imutável + ponte imperativa sem re-renders React, batching Zustand ~7 Hz (flush imediato em bordas discretas), fila TX BLE serializada (`PARADA*` urgente), `freezeOnBlur: true` nas abas inativas e pausa automática de `STREAM` + WebGL em segundo plano (`AppState`).
2. **Painel (Estética Industrial Carbono + Modo Alto Contraste para Ginásio):**
   - **Toggle `[2D | 3D]` + Tela Cheia:**
     - **2D:** radar esquemático top-down com arcos `SE / SCE / SCD / SD`, agulha de `Yaw` ao vivo no chassi e badges dinâmicos `PISTA` / `BORDA` para `LE` e `LD`.
     - **3D Offline (`Mini-Sumo 500g`):** modelo 3D procedural em Three.js r160 100% embutido sem CDN (`react-native-webview`), cones dos 4 sensores IR acesos ao vivo, anel do dohyō reagindo à borda branca, **gráfico osciloscópio X/Y/Z no fundo** (`XYZ°` ou `m/s²`), estilos (`Téc`, `HUD`, `Cel`), câmeras (`3/4`, `Frente`, `Lat`, `Topo`), streaming intercalado (`STREAM,1*`) e retorno suave para **pose neutra (`OFFLINE · POSE NEUTRA`)** ao desligar o robô.
   - **Telemetria IMU em Graus:** seletor **`GRAUS | m/s²`**, botão **`0° Yaw` / `Frente` (Tare / `ZERO_YAW*`)** e toggle **`Vibrar IR`**.
   - **Barra Global Fixa:** pílula BLE minimalista, saúde da bateria **LiPo 2S** (`V`, `V/cél`, `%` e alertas `< 7.4V` / `< 7.1V`) e botão global **`STOP`** (`PARADA*`).
3. **Estratégias:** grade tática 2×3 (`01` a `06`), `07 Segue Linha`, card de detalhe tático e seletor **Início IR** (`0s · Juiz` vs `+5s · Interno`, `IRD`) com confirmação + badge `EEPROM OK`.
4. **Ajustes & Perfis:** 4 perfis rápidos de competição, **sliders dinâmicos arrastáveis (`DynamicSlider`)** com feedback háptico (`VR`, `VG`, `LIP`, `LIE`), barra fixa `Salvar na EEPROM` com estado *dirty* e `Resetar` (`RESET_CFG*`).
5. **Bancada (Controle, Calibração & Ficha Técnica):**
   - **Controle Manual Avançado (`ManualDrivePad`):**
     - **Joystick Dinâmico 360°** (8 setores usando apenas comandos existentes do firmware — cardeais `FRENTE*`/`RE*`/`ESQ*`/`DIR*` + diagonais de arco suave `MOT_E`/`MOT_D`, anel interno em modo precisão por pulso sem desgaste de EEPROM e anel externo contínuo, `PARADA*` imediato ao soltar) com alternância **`[Joystick | D-Pad]`**.
     - **Seletor de Velocidade Manual** (`60–255 PWM` arrastável + chips `100 / 160 / 210 / 255`) com botão **`Restaurar VR/VG`** de combate.
     - Console BLE NUS cronológico, chips rápidos (`INFO*`, `dados*`, `ZERO_YAW*`, `CAL*`, `PARADA*`) e faixa **`PULSO 1S`** isolada por motor (`Esq +/-`, `Dir +/-`).
   - **Calibração:** `CAL*`, `IMU_CAL*`, **Diagnóstico de Pinos IR (Latch)** com pinout atual (`SE·35`, `SCE·32`, `SCD·33`, `SD·25`), linhas (`LE·39`, `LD·26`), saúde `LiPo 2S` e inclinação em graus.
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
