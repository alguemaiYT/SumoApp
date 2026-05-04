# SumoApp - Diretrizes de Desenvolvimento (GEMINI.md)

Este arquivo define as regras para operações de IA e CLI neste repositório.

## Estrutura de Diretórios
- `/app/`: Código-fonte do aplicativo Capacitor (TypeScript, Web Assets, Android project).
- `/firmware/`: Código do firmware ESP32 (Arduino).
- `/web/`: Backup do código original (web-based) para referência.
- `/apk/`: Artefatos de build (APK) compilados e prontos para distribuição.

## Regras de Operação de IA
1. **Artefatos de Build**:
   - Sempre que um novo APK for gerado via `./gradlew assembleDebug`, o arquivo resultante deve ser copiado para `/apk/` com a nomenclatura `SumoApp-debug-vX.Y.apk`.
   - Não manter APKs nas pastas internas do `/app/android/app/build/`.

2. **Gerenciamento de Ativos (Assets)**:
   - Imagens (logo, robo) devem ser mantidas em `/app/src/public/` para serem corretamente processadas pelo Vite e Capacitor.
   - Qualquer alteração nos arquivos HTML/CSS de interface deve ser feita em `/app/src/index.html` (o ponto único de entrada).

3. **Bluetooth/Backend**:
   - Alterações no protocolo Bluetooth (SPP) devem ser refletidas tanto em `firmware/` quanto no plugin nativo em `/app/android/app/src/main/java/com/dragonbotz/sumoapp/`.

4. **Logs e Debug**:
   - Preferir o uso de `adb logcat` externo para análise. Não adicionar consoles de debug na UI a menos que solicitado expressamente.
