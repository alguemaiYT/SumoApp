# 🎯 INSTRUÇÕES PARA COPILOT CLI — Implementar App ESP32

## Passo 1: Ler a Especificação

**Arquivo**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/APP_SPECIFICATION.md`

Leia seções:
1. Seção 1: **Prototipo de UI** (4 abas)
2. Seção 2: **Funções por Aba** (componentes e ações)
3. Seção 3: **Protocolo Bluetooth** (formato COMANDO,VALOR*)
4. Seção 4: **Arquitetura da App** (3 arquivos, responsabilidades)

---

## Passo 2: Ler a Tarefa de Delegação

**Arquivo**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/TASK_DELEGATION.md`

Foca em:
- **Entregas Esperadas**: 3 arquivos com tamanho e funcionalidades
- **Restrições Técnicas**: Compatibilidade, performance, segurança
- **Critérios de Aceitação**: Checklist de testes obrigatórios

---

## Passo 3: Implementar os 3 Arquivos

### Arquivo 1: `web/index.html`

**Localização**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/web/index.html`

**Objetivo**: Layout + estrutura HTML + CSS inline

**Deve conter**:
1. Meta tags (mobile, viewport, theme-color)
2. Design system (variáveis CSS copiadas do projbulmajr)
3. Layout fixo:
   - `.header` (56px altura): logo + status Bluetooth + botão conectar
   - `.main` (scrollável): 4 páginas (uma por aba)
   - `.nav` (bottom, 64px): 4 botões de abas
4. HTML para componentes:
   - Sliders (VR, VG, LIP, LIE)
   - Radio buttons (estratégias 1-7)
   - Botão PARADA (vermelho, destacado)
   - Status indicators (LED circles)
   - Gauge de bateria
   - Buttons (teste motor, sensor, etc.)
5. CSS:
   - Dark theme projbulmajr (copiar variáveis `--accent: #00c8f0`, etc.)
   - Transições de aba (slide left/right)
   - Responsivo: 375px-1024px
   - Sem dependências externas

**Linha de código típica**:
```html
<input type="range" id="slider-vr" min="0" max="255" value="0" class="slider">
<span class="slider-label">VR: <strong>0</strong></span>
```

---

### Arquivo 2: `app.js`

**Localização**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/app.js`

**Objetivo**: Lógica Bluetooth + gerenciamento de UI + estado

**Deve implementar**:

#### 1. **BluetoothManager** (classe)
```javascript
class BluetoothManager {
  async connect(deviceName) { 
    // detecta e conecta a SPP do ESP32
    // retorna true/false
  }
  async disconnect() { /* fecha conexão */ }
  async send(command, value) { 
    // envia "COMANDO,VALOR*" 
    // retorna Promise<response>
  }
  onTelemetry(callback) { 
    // listener para dados recebidos
  }
  isConnected() { return boolean; }
}
```

#### 2. **UIController** (classe)
```javascript
class UIController {
  switchTab(tabIndex) {
    // anima slide entre abas
    // atualiza classes .active
  }
  updateSlider(elementId, value) {
    // atualiza input + label
  }
  setStatus(status) {
    // "conectado" / "desconectado" / "reconectando"
    // muda cor do indicador
  }
  showAlert(message, level) {
    // "error", "warning", "success"
    // exibe notificação
  }
}
```

#### 3. **StateManager** (objeto singleton)
```javascript
const StateManager = {
  save(key, value) { // localStorage.setItem(key, value) }
  load(key) { // localStorage.getItem(key) }
  savePerfil(name, config) { 
    // salva objeto {vr, vg, lip, lie, hbe}
  }
  loadPerfil(name) { 
    // carrega e retorna config
  }
  history() { return [...]; } // últimos 5 comandos
}
```

#### 4. **Event Listeners**

App deve registrar listeners para:
- Click em botão PARADA → `send("PARADA", "")`
- Click em radio estratégia → `send("EST", value)`
- Input em slider → `send("VR/VG/LIP/LIE", value)` + atualizar localStorage
- Click "Conectar" → `bluetoothManager.connect()`
- Click "Carregar Perfil" → `StateManager.loadPerfil()` + enviar todos os comandos

#### 5. **Telemetria Loop**
```javascript
setInterval(async () => {
  if (!bluetoothManager.isConnected()) return;
  const response = await bluetoothManager.send("dados", "");
  // parse: velocreta|velocgiro|HBE|limiarParado|limiarEmpurrado|Vbat|...
  updateTelemetryUI(response);
}, 100); // 10Hz
```

#### 6. **Inicialização**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // conectar event listeners
  // restaurar última config do localStorage
  // carregar UI state
});
```

**Regra de ouro**: Nenhuma dependência externa (sem jQuery, React, Vue, etc.). Vanilla JS puro.

---

### Arquivo 3: `manifest.json`

**Localização**: `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/web/manifest.json`

**Conteúdo mínimo**:
```json
{
  "name": "RoboCtrl Sumô ESP32",
  "short_name": "RoboCtrl",
  "description": "Painel de controle para robô sumô ESP32V2",
  "start_url": "/web/",
  "scope": "/web/",
  "display": "standalone",
  "theme_color": "#080c14",
  "background_color": "#080c14",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

---

## Passo 4: Testar com Firmware

1. **Grave o firmware no ESP32**:
   - Abra `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/Sumo_Auto_ESP32_V2.ino.ino` na Arduino IDE
   - Compile e grave (board: ESP32 Dev Kit, baud 115200)

2. **Abra o app**:
   - Em Chrome no Android: `file:///home/kali/Repos/Sumo_Auto_ESP32_V2.ino/web/index.html`
   - Ou host em servidor local: `python3 -m http.server 8000` no diretório `/home/kali/Repos/Sumo_Auto_ESP32_V2.ino/`

3. **Testes Básicos**:
   - ✅ Clique "Conectar" e verifique se detecta "Madinboo_BT"
   - ✅ Selecione estratégia 1 (Radar), clique OK → verifique Serial Monitor recebi "EST,1,*"
   - ✅ Clique Parada → robô deve parar imediatamente
   - ✅ Ajuste slider VR para 100 → envio "VR,100*"
   - ✅ Telemetria deve atualizar cada 100ms (bateria, sensores)
   - ✅ Desconecte Bluetooth → app exibe "Desconectado"

---

## Passo 5: Validar Critérios

Antes de finalizar, verifique **obrigatoriamente**:

- [ ] HTML valida (W3C)
- [ ] Zero erros JavaScript no console
- [ ] Sem vazamento de memória (Chrome DevTools → Memory)
- [ ] Responsivo em: 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] Transições de aba suave (<300ms)
- [ ] Bluetooth: conecta/desconecta sem crashes
- [ ] Comandos: Parada funciona imediatamente
- [ ] Telemetria: 10Hz (100ms entre updates) sem lag
- [ ] UI sempre responsiva (não trava)

---

## Passo 6: Documentar

Crie um arquivo `IMPLEMENTATION_NOTES.md` com:
- Decisões de design (ex: por que usou localStorage vs indexedDB?)
- Limitações conhecidas
- Como entrar em debug mode
- Instruções de deploy

---

## Referências Rápidas

| Arquivo | Propósito |
|---------|-----------|
| APP_SPECIFICATION.md | Especificação completa (abas, componentes, protocolo) |
| TASK_DELEGATION.md | Tarefa com critérios de aceitação |
| README_APP.md | Sumário executivo rápido |
| projbulmajr/index.html | Inspiração de design (cores, fonts, layout) |
| Bluetooth.ino | Protocolo que o firmware espera |
| config.h | Hardware mapping (pinos, constantes) |

---

## Dúvidas Frequentes

**P: E se o Bluetooth Web API não funcionar no iOS?**  
R: Use fallback com URL scheme `web.bluetooth://` ou instrua user a abrir em Android.

**P: Como fazer reconexão automática?**  
R: Caso desconecte, `setTimeout(() => bluetoothManager.connect(), 3000)` a cada 3 segundos.

**P: Como exibir gráficos de telemetria?**  
R: MVP usa barras/gauges simples. Para gráficos, adicione Chart.js em fase 2.

**P: Preciso de backend/servidor?**  
R: Não! Tudo é client-side. Comunicação direta com ESP32 via Bluetooth.

**P: Como debugar Bluetooth no Android?**  
R: Abra `chrome://inspect` no Chrome do PC e inspecione tab do Android.

---

**Pronto? Comece implementando `web/index.html` primeiro!** 🚀
