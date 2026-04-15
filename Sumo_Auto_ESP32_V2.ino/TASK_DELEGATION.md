# TAREFA: Implementar App de Controle para Robô Sumô ESP32 V2

## Objetivo
Criar um app web responsivo (PWA) para controle remoto e telemetria em tempo real do robô sumô ESP32 V2, com interface baseada no design do projeto `projbulmajr`.

## Status
📋 **Especificação Completa** - Pronto para Implementação

## Entrada (Input)

### Documentos de Referência
1. **Especificação Funcional Completa**:
   - Arquivo: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/APP_SPECIFICATION.md`
   - Contém: 4 abas (Controle, Config, Telemetria, Diagnóstico), protocolo Bluetooth, UI layout

2. **Design de Referência** (projbulmajr):
   - Arquivo: `/home/kali/Repos/projbulmajr/index.html`
   - Tipos: Dark theme, Variables CSS (cores, fontes), grid layout
   - Componentes: Header com logo/status Bluetooth, nav com 4 abas, main scroll area

3. **Hardware/Firmware Alvo**:
   - ESP32 Dev Board (pin mapping em `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/config.h`)
   - Firmware: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino` (protocolo atual)
   - Comandos: EST, VR, VG, HBE, LIP, LIE, PARADA, dados, CALIBRAR

## Entregas Esperadas

### Arquivo 1: `web/index.html`
- **Tamanho esperado**: ~1000-1200 linhas (inline CSS + estrutura HTML)
- **Deve incluir**:
  - Layout fixo: header (56px) + main scroll + nav bottom (64px)
  - 4 página/seções (uma por aba)
  - Design system projbulmajr (cores, fonts, spacing, transições)
  - Componentes: sliders, buttons, radio buttons, status indicators
  - **SEM dependências externas** (vanilla HTML/CSS)

### Arquivo 2: `app.js`
- **Tamanho esperado**: ~800-1000 linhas
- **Funcionalidades principais**:
  1. **BluetoothManager** (classe):
     - `.connect(deviceName)`
     - `.disconnect()`
     - `.send(command, value)` → retorna Promise
     - `.onTelemetry(callback)` → listener para dados
     - `.isConnected()` → boolean
  
  2. **UIController** (classe):
     - Gerencia transições entre abas (slide animation)
     - Atualiza atributos de componentes (data-value, disabled, etc.)
     - Captura eventos de click/input
  
  3. **StateManager** (object):
     - Persiste em localStorage: velocidades, evasão, limiares
     - Histórico de 5 últimos comandos
     - Predefinições (perfis)
  
  4. **EventHandlers**:
     - click em botões (parada, estratégia, testes)
     - input em sliders (atualiza label com valor)
     - conexão/desconexão Bluetooth
     - telemetria em tempo real (10Hz polling)

### Arquivo 3: `manifest.json` (PWA)
- **Objetivo**: Permitir instalar como app no mobile
- **Deve conter**: nome, ícone, cor de tema, scope

## Restrições Técnicas

1. **Plataformas Suportadas**:
   - ✅ Chrome/Edge (Android, Desktop)
   - ✅ Safari (iOS 14+)
   - ✅ Firefox (Desktop)

2. **Compatibilidade**:
   - Bluetooth Web API (Serial over Bluetooth SPP é fallback em Android)
   - localStorage para persistência (não há indexedDB requerido)
   - Responsive design: 375px (mobile) - 1024px (tablet)

3. **Performance**:
   - Telemetria: máx 10Hz (100ms entre updates)
   - Latência comando-resposta: <200ms aceitável
   - Tamanho total (index.html + app.js): <200KB

4. **Segurança**:
   - Nenhuma comunicação com servidor externo
   - Dados de sensores apenas em memória (não salvos)
   - Validação de input: valores de 0-255 para velocidade, etc.

## Critérios de Aceitação

Código implementado DEVE passar nestes testes:

- [ ] **Bluetooth**:
  - Conecta a dispositivo SPP do ESP32 por nome detectado
  - Desconexão graceful sem erros no console
  - Reconexão automática em caso de perda

- [ ] **Controle**:
  - Envio de "EST,<1-7>*" com rádio button ativa estratégia → ESP32 retorna OK
  - Botão PARADA envia "PARADA*" e para imediatamente
  - Modo teste: 4 botões enviam "FRENTE,150*", etc.

- [ ] **Config**:
  - 5 sliders (VR, VG, LIP, LIE, HBE) enviam comandos → persistem em EEPROM
  - Perfis: salvar/carregar predefinições funciona
  - Calibrar IMU: envia "CALIBRAR*" e aguarda "OK"

- [ ] **Telemetria**:
  - Solicita "dados*" a cada 100ms (10Hz)
  - Parse correto do resposta com pipe separator
  - Bateria: cor muda verde >11V, âmbar 8-11V, vermelho <8V
  - Alerta crítico <7V

- [ ] **UI**:
  - 4 abas navegáveis com transição slide suave
  - Header sempre visível (status Bluetooth, logo)
  - Nav sempre acessível (4 botões)
  - Design responsivo: mobile (375px) e tablet (1024px) sem scroll horizontal

- [ ] **Performance**:
  - Nenhum lag ao clicar botões ou mexer sliders
  - Transições de aba <300ms
  - Memória < 10MB em uso
  - Sem vazamento de listeners

## Timeline Esperada

- **Fase 1** (Implementação): 4-6 horas
  - Structure HTML + CSS (2h)
  - Bluetooth Manager + UI Controller (2h)
  - Abas e componentes (1h)
  - Testes e polimento (1h)

- **Fase 2** (Validação): 2-3 horas
  - Testes em Android/iOS real
  - Ajustes de latência Bluetooth
  - Polimento de UX

## Notas para o Implementador

1. **Design**: Copiar paleta de cores e variáveis CSS do projbulmajr (`--accent: #00c8f0`, `--danger: #ff3b3b`, etc)

2. **Bluetooth Web API**: Usar apenas para Web Bluetooth (Chrome) + fallback via SerialPort API para desktop. Mobile Android usa WebBluetooth SPP.

3. **Script Modularização**: Colocar cada aba em função separada (ex: `renderAbaControle()`, `renderAbaConfig()`) para maintainability.

4. **Offline**: App funciona sem Bluetooth? Sim, parcialmente:
   - Controle fica desabilitado
   - Config permite ajustar sliders mas não envia
   - Telemetria mostra últimos valores

5. **PWA**: Adicionar service worker básico para cache de assets (`index.html`, `app.js`, `manifest.json`).

## Próximas Tarefas (Após MVP)

- [ ] Adicionar integração com Capacitor para build Android native
- [ ] Implementar gráficos de série com Chart.js
- [ ] Suporte a BLE além de Bluetooth clássico
- [ ] Controle por tilt (acelerômetro do phone)

---

## Como Execução Esta Tarefa

1. **Clone / Setup**:
   ```bash
   cd /home/kali/Repos/Sumo_Auto_ESP32_V2.ino
   mkdir -p web
   ```

2. **Crie os 3 arquivos**:
   - `web/index.html` (especificação: ~1000 linhas)
   - `app.js` (especificação: ~800 linhas)
   - `manifest.json` (PWA, pequeno)

3. **Valide com Firmware**:
   - Abra Bluetooth.ino
   - Compile e grave no ESP32
   - Acesse `file:///...web/index.html` no navegador do Android
   - Conecte, selecione estratégia, verifique envio no Serial Monitor do ESP32

4. **Testes**:
   - Teste cada aba
   - Teste parada de emergência
   - Teste telemetria em tempo real
   - Teste persistência de config

---

**Pronto para delegar!** 🚀
