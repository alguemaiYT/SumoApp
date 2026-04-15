# 📱 App de Controle Robô Sumô ESP32 V2 — RESUMO EXECUTIVO

## Visão Geral

App web PWA para piloto controlar robô sumô em competição + engenheiro ajustar parâmetros em bancada. Interface dark moderna (design projbulmajr) com 4 abas.

## 4 Funcionalidades Principais

### 1️⃣ CONTROLE
- Selecionar estratégia automática (1-7: Radar, Hunter, Firula, etc.)
- **Botão PARADA EMERGÊNCIA** (sempre visível, vermelho)
- Modo teste manual: 4 botões (Frente, Ré, Esq, Dir) com slider de velocidade (0-255)
- Ligar/desligar evasão por impacto automática

### 2️⃣ CONFIG
- 4 sliders ajustáveis: **Velocidade Reta**, **Velocidade Giro**, **Limiar Parado**, **Limiar Empurrão**
- Salvar/carregar 5 presets nomeados (ex: "Config Agressiva")
- Botão calibrar IMU (acelerômetro/giroscópio)
- Tudo persiste em EEPROM do ESP32

### 3️⃣ TELEMETRIA
- Dashboard em tempo real:
  - 🔋 Bateria (volts, gauge com cores)
  - 📍 4 sensores frontal (LED buttons: ligado=verde, desligado=cinza)
  - 📏 2 sensores de linha (barras)
- Alerta crítico: bateria <7V
- Telemetria atualiza a 10Hz

### 4️⃣ DIAGNÓSTICO (Para Bancada)
- Teste individual: Motor Dir, Motor Esq, Sensores, LEDs
- Leitura em tempo real de valores analógicos/digitais
- Log de eventos: exporta .txt de todas as mensagens Bluetooth

## Protocolo Bluetooth (Simples)

Formato: `COMANDO,VALOR*`

| Comando | Valor | Ação |
|---------|-------|------|
| EST | 1-7 | Seleciona estratégia |
| VR | 0-255 | Velocidade reta |
| VG | 0-255 | Vel. giro |
| LIP | 0-100 | Limiar parado |
| LIE | -100-0 | Limiar empurrão |
| HBE | 0/1 | Evasão ativada |
| **PARADA** | — | **Para emergência** |
| dados | — | Solicita telemetria |

---

## Arquivos Criados

| Arquivo | Localização | Tamanho | Descrição |
|---------|------------|---------|-----------|
| **APP_SPECIFICATION.md** | `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/` | 8kb | Especificação completa: 4 abas, layout, componentes, protocolo |
| **TASK_DELEGATION.md** | `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/` | 6kb | Tarefa pronta para Copilot CLI: entregas, critérios, timeline |

---

## O Que Implementador Deve Fazer

### Arquivo 1: `web/index.html` (~1000 linhas)
- Layout: Header (56px) + Main scroll + Nav bottom (64px)
- 4 abas navegáveis
- Design: copiar variáveis CSS do projbulmajr
- Componentes: radio buttons, sliders, status indicators, gráficos simples

### Arquivo 2: `app.js` (~800 linhas)
Classes:
- **BluetoothManager**: conectar, enviar, receber dados
- **UIController**: transições, atualizar componentes
- **StateManager**: persistência em localStorage

### Arquivo 3: `manifest.json`
Metadados PWA simples

---

## Critérios de Aceitação (Testes Mínimos)

✅ Conecta a ESP32 via Bluetooth  
✅ Envia EST,3* (exemplo: Firula) e ESP32 recebe  
✅ Botão PARADA para imediatamente  
✅ Sliders enviam valores e persistem  
✅ Telemetria atualiza 10x por segundo  
✅ UI responsiva (mobile 375px até tablet 1024px)  
✅ Nenhum lag ao clicar rápido  

---

## Timeline

- **Total (estimado)**: 6-8 horas
  - Implementação HTML/CSS/JS: 4-6h
  - Testes em Android real: 2h

---

## Próximas Fases (Futuro)

- Integração Capacitor → Android APK nativo
- Gráficos de série (últimos 30s de telemetria)
- Suporte BLE além de Bluetooth SPP
- Controle tilt (inclinar phone)

---

## Referências Técnicas

- **Design base**: `/home/kali/Repos/projbulmajr/index.html`
- **Firmware**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino`
- **Hardware config**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/config.h`
- **Instruções ESP32**: `/home/kali/Repos/projbulmajr/.github/copilot-instructions.md`

---

**Status**: ✅ Especificação completa e pronta para delegação 🚀
