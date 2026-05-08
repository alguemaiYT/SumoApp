# Ambiente Docker para SumoApp

Este repositório inclui um ambiente Docker completo para desenvolvimento e build de todos os componentes do projeto (Web, Android e Firmware).

## Requisitos

- Docker
- Docker Compose
- (Opcional) VS Code + Dev Containers extension

## Como usar

### 1. Usando VS Code (Recomendado)

1. Abra a pasta do projeto no VS Code.
2. Quando solicitado, clique em **"Reopen in Container"**.
3. O VS Code irá construir a imagem e configurar o ambiente automaticamente.

### 2. Usando Docker Compose manualmente

```bash
docker-compose up -d
docker-compose exec workspace bash
```

## Scripts de Build

Dentro do container (ou via `docker-compose exec`), você pode usar os seguintes scripts:

- **Build Web:** `./scripts/build-web.sh`
- **Build Android (Gera APK):** `./scripts/build-android.sh`
- **Build Firmware (ESP32):** `./scripts/build-firmware.sh`

O APK gerado será automaticamente copiado para a pasta `/apk` na raiz do projeto.

## Gerenciamento de Dispositivos (ADB)

O **ADB deve ser executado no host**, não dentro do container. Isso evita problemas de permissão USB e torna o ambiente mais compatível entre sistemas operacionais.

### Para instalar o APK gerado:

1. Conecte seu dispositivo Android ao computador.
2. No seu **terminal do host**, execute:
   ```bash
   adb install -r apk/SumoApp-v4.apk
   ```

### Para ver os logs:

```bash
adb logcat
```

## Firmware ESP32

Para fazer o upload do firmware, o `arduino-cli` está disponível no container para compilação. O core e as bibliotecas do ESP32 podem ser instalados sob demanda quando você for compilar o firmware. O upload (gravação) é recomendado ser feito pelo host se houver dificuldades com o mapeamento da porta serial no Docker, mas você pode tentar mapear o dispositivo no `docker-compose.yml` se necessário:

```yaml
# docker-compose.yml (exemplo para Linux)
devices:
  - "/dev/ttyUSB0:/dev/ttyUSB0"
```
