# ⚔️ Sumô App **Controle, Telemetria e Calibração em Tempo Real para Robô de Sumô Autônomo**

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor_8-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-E7352C?style=flat-square&logo=espressif&logoColor=white)
![Bluetooth](https://img.shields.io/badge/Bluetooth_Serial-0082FC?style=flat-square&logo=bluetooth&logoColor=white)

---

Aplicativo mobile Android que se conecta via Bluetooth Serial (SPP) a um robô de sumô autônomo baseado em ESP32, oferecendo **visualização de sensores em tempo real**, **seleção de estratégias de combate**, **calibração dinâmica de parâmetros** e **console serial integrado** — tudo em uma interface *dark industrial* otimizada para uso durante competições e testes em arena.

---

## 📋 Índice

- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Protocolo de Comunicação](#-protocolo-de-comunicação)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
- [Design System](#-design-system)
- [Créditos e Licença](#-créditos-e-licença)

---

## ✨ Funcionalidades Principais

### 📡 Telemetria (Aba 1)

| Recurso | Descrição |
| :--- | :--- |
| **Radar de Oponente** | Silhueta SVG do robô com 4 feixes IR animados (2 frontais + 2 laterais) que acendem em tempo real ao detectar oponente |
| **Sensores de Linha** | 2 pontos SVG nas pontas da lâmina que pulsam em vermelho ao detectar borda branca (limiar ≤ 400 ADC) + barras de progresso com valor analógico |
| **Horizonte Artificial (IMU)** | Widget 2D Gyro com bolha de inclinação dinâmica simulando pitch/roll do MPU6050 |
| **Indicadores Inerciais** | Barras de sensibilidade de parada e empurrão com valores em m/s² |
| **Parada de Emergência** | FAB flutuante vermelho que envia `PARADA*` ao ESP32 imediatamente |

### ⚔️ Estratégias de Combate (Aba 2)

| Recurso | Descrição |
| :--- | :--- |
| **7 Estratégias Pré-configuradas** | Radar, Caçador, Firula, Suicida, Só Vai, Contorno, Segue Linha |
| **Seleção por Card** | Card inteiro é clicável — sem botões redundantes. Estratégia ativa recebe borda indigo brilhante e badge `SELECIONADA` |
| **Classificação de Risco** | Cada estratégia exibe um nível de perigo: Seguro, Balanceado, Agressivo ou Extremo |
| **Transmissão Imediata** | Ao tocar no card, o comando `EST,*` é enviado instantaneamente ao ESP32 |

### 🎛️ Calibração Dinâmica (Aba 3)

| Recurso | Descrição |
| :--- | :--- |
| **Velocidade de Reta** | Slider + input numérico (0–255 PWM) com envio via `VR,*` |
| **Velocidade de Giro** | Slider + input numérico (0–255 PWM) com envio via `VG,*` |
| **Toggle de Evasão** | Switch on/off para habilitar manobra de evasão inercial (`HBE,<0\|1>*`) |
| **Limiares IMU** | Inputs numéricos para sensibilidade de parada e empurrão em m/s² |
| **Teste de Motores** | D-Pad direcional (Frente/Ré/Esquerda/Direita/Parar) com indicadores de PWM % em barras verticais para cada motor |
| **Salvar Parâmetros** | Botão fixo no rodapé que transmite todos os valores calibrados ao robô de uma vez |

### 💻 Console Serial (Aba 4)

| Recurso | Descrição |
| :--- | :--- |
| **Terminal Full-height** | Log ocupa 100% da altura vertical disponível entre header e input |
| **Histórico Bidirecional** | Mensagens TX (indigo ↗) e RX (verde ↙) com timestamp |
| **Envio Manual** | Campo de texto + botão para enviar comandos arbitrários ao ESP32 |
| **Auto-scroll** | Scroll automático ao receber novas mensagens |

### 🔄 Navegação por Gestos
- **Swipe Left/Right** entre abas com transição animada (Framer Motion).
- **Prevenção de conflito**: gestos ignorados sobre sliders, D-Pad e área de scroll do console via `data-prevent-swipe`.
- **Limiar de sensibilidade**: deslocamento mínimo de 70px horizontal com dominância sobre eixo Y.

---

## 🏗️ Arquitetura do Sistema

```mermaid
graph LR
    subgraph Android
        A["📱 Sumô App<br>(React + Capacitor)"]
    end

    subgraph ESP32
        B["🤖 Firmware C++<br>(Arduino)"]
        C["Sensores IR (4x)"]
        D["Sensores Linha (2x)"]
        E["IMU MPU6050"]
        F["Motores DC (2x)"]
        G["LEDs de Sinalização"]
    end

    A <-->|"Bluetooth Serial (SPP)<br>Comandos TX / Telemetria RX"| B
    B --- C
    B --- D
    B --- E
    B --> F
    B --> G
