# Especificação: App de Controle Robô Sumô ESP32 V2

## Resumo Executivo

App web responsivo (PWA) para controle remoto e telemetria em tempo real do robô sumô ESP32 V2. Interface baseada no design do projbulmajr (tema dark, ciano accent, navegação por abas).

**Público-alvo**: Piloto durante competição + engenheiro em bancada.  
**Plataforma**: Web (responsivo mobile/tablet).  
**Comunicação**: Bluetooth Serial (protocolo existente do ESP32).  
**Status**: Especificação MVP pronto para implementação.

---

## 1. Prototipo de UI (Estrutura de Abas)

**Design de referência**: `/home/kali/Repos/projbulmajr/index.html` (dark theme + ciano).

### Abas Principais (Bottom Nav, 64px height):
1. **CONTROLE** – Modo manual e automático
2. **CONFIG** – Ajuste de parâmetros
3. **TELEMETRIA** – Dashboard de sensores e bateria
4. **DIAGNÓSTICO** – Testes de componentes

---

## 2. Funções por Aba

### ABA 1: CONTROLE
**Objetivo**: Pilotar o robô ou selecioná-lo para modo automático durante a competição.

**Componentes**:
- **Status de Conexão Bluetooth** (topo ao lado de logo)
  - Indicador: conectado (verde pulsante), desconectado (vermelho), reconectando (âmbar)
  - Botão: "Conectar" / "Desconectar"
  
- **Botão de Parada de Emergência (SEMPRE VISÍVEL E DESTACADO)**
  - Cor: vermelho (#ff3b3b)
  - Ação: Envia "PARADA*" imediatamente
  - Feedback: Vibra + desativa controles temporariamente
  
- **Seletor de Estratégia** (radio buttons ou selector)
  - Estratégias 1-7: Radar, Hunter, Firula, Suicida, Sovai, Contorno, Seg. Linha
  - Envio: "EST,<1-7>*"
  - Status atual: exibe estratégia ativa
  
- **Modo Teste Manual** (hidden by default, toggle "Modo Teste")
  - Dois joysticks virtuais OU 4 botões (Frente, Ré, Esquerda, Direita)
  - Envio: "FRENTE,<vel>*", "RE,<vel>*", "ESQUERDA,<vel>*", "DIREITA,<vel>*"
  - Range de velocidade: 0-255 (slider)
  - Retorno: status imediato
  
- **Ativação de Evasão por Impacto (Toggle)**
  - Envio: "HBE,<0|1>*"
  - Status: ativado/desativado com feedback visual

---

### ABA 2: CONFIG
**Objetivo**: Ajustar parâmetros de combate antes da luta sem entrar na Arduino IDE.

**Componentes**:
- **Velocidade de Reta** (Slider 0-255)
  - Envio: "VR,<val>*"
  - Label: "VR (Vel. Reta)" com display do valor atual
  
- **Velocidade de Giro** (Slider 0-255)
  - Envio: "VG,<val>*"
  - Label: "VG (Vel. Giro)"
  
- **Limiar de Parado** (Slider 0-100, unidade: m/s²)
  - Envio: "LIP,<val>*"
  - Label: "Sensibilidade Parado (quanto menor = mais sensível)"
  - Padrão: 10

- **Limiar de Empurrado** (Slider -100 a 0, unidade: m/s²)
  - Envio: "LIE,<val>*"
  - Label: "Sensibilidade Empurrão"
  - Padrão: -25

- **Seção de Perfis**
  - Botao: "Salvar Perfil" (salva VR, VG, LIP, LIE no localStorage com nome)
  - Botão: "Carregar Perfil" (seleciona preset, reaplica todos os valores)
  - Localstorage: array de 5 slots nomeados

- **Botão: Calibrar IMU**
  - Envio: "CALIBRAR*"
  - Feedback: "Calibrando..." → "OK" (após 2-3s)

- **Histórico de Valores** (opcional)
  - Mostra últimas 3 configurações aplicadas com timestamp

---

### ABA 3: TELEMETRIA
**Objetivo**: Monitorar saúde do robô em tempo real durante combate.

**Componentes**:
- **Bateria**
  - Valor: Vbat (em volts)
  - Gauge/Progress bar: cores verde (>11V), âmbar (8-11V), vermelho (<8V)
  - Alerta crítico se <7V: exibe "BATERIA BAIXA" e retorna à aba CONTROLE

- **Sensores de Linha** (Infravermelhos)
  - sensorLD e sensorLE (valores 0-4095 analógicos)
  - Visualização: dois gráficos mini ou barras

- **Sensores Digitais (Oponente)**
  - sen_dir, sen_centro_dir, sen_centro_esq, sen_esq (HIGH/LOW)
  - Visualização: 4 LEDs (ligado = verde, desligado = cinza)
  - Layout: esquematização (esq-centro-dir)

- **Gráfico de Series (Opcional)**
  - Timeline de últimos 30s de: Vbat, sensorLD, sensorLE, detecção de oponente
  - Atualiza 10 Hz

- **Taxa de Telemetria**
  - Selector: 5Hz, 10Hz, Parar
  - Envio: "TELEM,<freq>*"

- **Timestamp de Última Atualização**
  - Exibe "Atualizado em: 12:34:56"

---

### ABA 4: DIAGNÓSTICO (Advanced)
**Objetivo**: Validar componentes em bancada pré-competição.

**Componentes**:
- **Teste de Motores** (Seção expansível)
  - Botões: Test Motor Dir (frente/ré), Test Motor Esq (frente/ré)
  - Duração: 1s por teste
  - Feedback: sons de clique ou vibração no mobile

- **Teste de Sensores de Linha**
  - Button: "Ler Sensores"
  - Retorna valores atuais sensorLD/LE com escala visual

- **Teste de Sensores Digitais**
  - Button: "Ler Sensores Frontal"
  - Exibe estado de sen_dir, sen_esq, sen_centro_dir, sen_centro_esq
  
- **Teste de LEDs**
  - Buttons: LED1 On/Off, LED2 On/Off
  - Envio: "LED,<1|2>,<0|1>*"

- **Log de Eventos**
  - Coleta todas as linhas recebidas do ESP32
  - Botão: "Exportar Log" (download .txt)
  - Botão: "Limpar Log"

---

## 3. Protocolo Bluetooth (Mensagens)

### Formato: `COMANDO,VALOR*` (termina com `*`)

**Comandos Suportados (Firmware Atual)**:
| Comando | Valor | Descrição | Resposta |
|---------|-------|-----------|----------|
| EST | 1-7 | Seleciona estratégia | OK ou ERRO |
| VR | 0-255 | Velocidade reta | OK |
| VG | 0-255 | Velocidade giro | OK |
| HBE | 0/1 | Ativa evasão por impacto | OK |
| LIP | 0-100 | Limiar parado (m/s²) | OK |
| LIE | -100-0 | Limiar empurrão (m/s²) | OK |
| PARADA | — | Para todos os motores | OK |
| dados | — | Solicita telemetria | `vel_reta\|vel_giro\|HBE\|...` |
| CALIBRAR | — | Calibra IMU | "Calibrando..." → "OK" |

**Telemetria (Resposta a "dados")**:
```
velocreta|velocgiro|HBEvasao|limiarParado|limiarEmpurrado|Vbat|sen_dir|sen_centro_dir|sen_centro_esq|sen_esq|sensorLD|sensorLE
```

**Novos Comandos (A Implementar no Firmware)**:
| Comando | Valor | Descrição |
|---------|-------|-----------|
| FRENTE | 0-255 | Move frente em modo teste |
| RE | 0-255 | Move ré em modo teste |
| ESQUERDA | 0-255 | Gira esquerda em modo teste |
| DIREITA | 0-255 | Gira direita em modo teste |
| TELEM | 5/10/0 | Taxa de telemetria em Hz (0 = parar) |

---

## 4. Arquitetura da App

**Tecnologia**: HTML5 + CSS3 (design system projbulmajr) + JavaScript vanilla ou leve (sem frameworks pesados)

**Estrutura de Arquivos**:
```
app/
  index.html              (Entry point, layout, estilos)
  app.js                  (Lógica Bluetooth, state management)
  aba-controle.js         (Aba 1)
  aba-config.js           (Aba 2)
  aba-telemetria.js       (Aba 3)
  aba-diagnostico.js      (Aba 4)
  utils.js                (helpers bluetooth, localStorage, UI)
```

**Responsabilidades Principais**:
1. **Bluetooth Manager**: conectar/desconectar, enviar comandos, receber telemetria
2. **Visualization**: gráficos de bateria/sensores, indicadores em tempo real
3. **State**: persistir config em localStorage, histórico de comandos
4. **UI Controller**: transições entre abas, feedback visual

---

## 5. Critérios de Aceitação (MVP)

- ✅ Conexão/desconexão Bluetooth funciona em Android/iOS/Web
- ✅ Seleção de estratégia (1-7) enviada corretamente e confirmada no ESP32
- ✅ Parada de emergência funciona e para motor imediatamente
- ✅ Telemetria atualiza em tempo real (≥5Hz)
- ✅ Ajuste de 5 parâmetros (VR, VG, LIP, LIE, HBE) persiste em EEPROM
- ✅ Indicador de bateria alerta em <8V
- ✅ UI responsivo em mobile (375px-1024px)
- ✅ Design coerente com projbulmajr (cores, fontes, spacing)
- ✅ Sem lag ou travamento ao enviar comandos em sequência rápida

---

## 6. Dependências Externas

- **Nenhuma obrigatória** (vanilla JS)
- **Opcionais**: Chart.js (gráficos de série), pouchdb (sincronização offline)

---

## 7. Próximas Fases (Backlog)

- [ ] Integração com Capacitor para PWA em Android nativo
- [ ] Suporte a BLE (Bluetooth Low Energy)
- [ ] Visão de câmera ao vivo via RTSP (se câmera addicionada ao robot)
- [ ] Replay de combate (lê último log de sensores)
- [ ] Controle por acelerômetro do phone (tilt-to-steer)

---

## 8. Referências

- Design base: `/home/kali/Repos/projbulmajr/index.html`
- Firmware: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/`
- Instruções ESP32: `/home/kali/Repos/projbulmajr/.github/copilot-instructions.md`
