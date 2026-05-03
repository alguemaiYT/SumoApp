# SumoApp - Sistema de Controle para Robô Sumô

Este repositório contém o ecossistema completo para o controle de um Robô Sumô autônomo, integrando firmware, interface web e aplicativo móvel.

## 🤖 Visão Geral do Projeto
O sistema permite monitorar sensores, bateria e ajustar estratégias de combate em tempo real via Bluetooth.

### Componentes:
1.  **/firmware**: Código C++/Arduino para ESP32.
    - Utiliza `BluetoothSerial` (Classic Bluetooth) para comunicação.
    - Implementa 7 estratégias de combate e sensores IMU (MPU6050).
    - Nome do dispositivo: `Madinboo_BT`.
2.  **/web**: Interface de controle baseada em HTML5/JS/CSS.
    - Design premium com tema escuro e elementos de glassmorphism.
    - Sistema de "Modo Batalha" que bloqueia a interface durante a luta.
    - Dashboards para Sensores, Bateria, IMU e PWM.
3.  **/app**: Projeto **Tauri v2** para conversão da interface web em aplicativo nativo Android (.apk).

## 🛠 Contexto Tecnológico para IA
Se você estiver continuando este projeto, aqui estão os detalhes críticos:

### Interface Mobile (Tauri + Android)
- A interface web foi otimizada para dispositivos móveis usando `100dvh` e `env(safe-area-inset-bottom)`.
- O identificador do app é `com.kali.sumoapp`.
- **Bluetooth**: O app utiliza a Web Bluetooth API no frontend com um loop de **Auto-Reconexão Contínua**. Ele monitora o evento `gattserverdisconnected` e tenta reconectar ao dispositivo a cada 2 segundos.
- **Permissões**: O `AndroidManifest.xml` (em `app/src-tauri/gen/android/...`) foi modificado para incluir permissões de Bluetooth e Localização (necessário para o Android).

### Lógica de Combate
- **Save EEPROM**: Ao clicar em salvar, o app entra no estado `isInBattle`, ativando um overlay global vermelho "EM BATALHA!".
- **Debug**: As informações de sensores e bateria estão sempre visíveis para facilitar a calibração antes da luta.

## 📁 Estrutura de Pastas
- `/firmware/Sumo_Auto_ESP32_V2.ino/`: Arquivos `.ino` e `.h` do robô.
- `/web/robo-control.html`: Fonte original da interface.
- `/app/src/index.html`: Cópia de produção usada pelo Tauri.
- `/apk/SumoApp.apk`: Binário compilado final.

## 🛰 Protocolo de Comunicação (Serial SPP)

A comunicação entre o app e o robô segue o formato de texto via Serial Bluetooth:

### App → Robô (Comandos)
Enviados no formato `COMANDO,VALOR*`
- `EST,ID*`: Define a estratégia (1-7).
- `VR,PWM*`: Define Velocidade Recruta (0-255).
- `VG,PWM*`: Define Velocidade Giro (0-255).
- `DEBUG,1*`: Ativa o envio de dados de telemetria.
- `PARADA,1*`: Comando de emergência para parar motores.

### Robô → App (Telemetria)
Enviados via comando `dados*`, o robô responde com uma string separada por pipes (`|`):
`velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE`

## 🧠 Mapeamento de Estratégias
1. **RADAR**: Varredura frontal.
2. **CAÇADOR**: Perseguição agressiva.
3. **FIRULA**: Show de LEDs.
4. **SUICIDA**: Ataque total com LEDs.
5. **SÓ VAI**: Avanço direto.
6. **CONTORNO**: Movimentação lateral.
7. **SEG. LINHA**: Seguidor de linha.

---
*Este arquivo serve como base de conhecimento para que futuras instâncias de IA compreendam a arquitetura e os protocolos deste repositório sem a necessidade de re-análise completa.*
