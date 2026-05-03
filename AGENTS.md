# AGENTS.md

## What this repo contains
- The active frontend lives in [web/majinboo.html](web/majinboo.html).
- The ESP32 firmware lives in [firmware/Sumo_Auto_ESP32_V2.ino/](firmware/Sumo_Auto_ESP32_V2.ino/).
- The Android/Tauri scaffold lives in [app/](app/) and its notes are in [app/README.md](app/README.md).
- The compiled APK artifact is in [apk/](apk/).
- The root [README.md](README.md) is a high-level overview; confirm implementation details in code before changing protocol behavior.

## Work rules
- Treat the frontend and firmware as one protocol pair. If you change a command, packet format, sensor mapping, or arm/boot flow, update both sides together.
- Keep the web UI changes centered on [web/majinboo.html](web/majinboo.html). Make DOM updates tolerant of missing elements.
- Use [firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino](firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino) for command parsing, [firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino](firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino) for strategy list emission, and [firmware/Sumo_Auto_ESP32_V2.ino/config.h](firmware/Sumo_Auto_ESP32_V2.ino/config.h) for pins and shared flags.
- The protocol currently relies on `LISTA` -> `STR:` packets, `DEBUG` telemetry, `EST` for boot/arm flow, and `PARADA` as a motor stop only.
- Do not rely on [web/README.md](web/README.md) for implementation details; it is empty.

## Validation
- For frontend edits, open [web/majinboo.html](web/majinboo.html) in the browser and run `get_errors` on the file.
- For firmware edits, keep the serial protocol stable and inspect the related `.ino` file before changing behavior.
- Prefer small, focused edits over broad refactors unless the task explicitly needs one.

## Handy references
- [README.md](README.md)
- [firmware/Sumo_Auto_ESP32_V2.ino/config.h](firmware/Sumo_Auto_ESP32_V2.ino/config.h)
- [firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino](firmware/Sumo_Auto_ESP32_V2.ino/Bluetooth.ino)
- [firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino](firmware/Sumo_Auto_ESP32_V2.ino/Estrategias.ino)