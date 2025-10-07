# 🚀 pruebaWeb: Framework de Automatización E2E/API con Playwright

Este repositorio contiene el framework de pruebas End-to-End (E2E) y API para el sistema de Trello, utilizando **Playwright** y **Node.js**.

Las pruebas están diseñadas para ejecutarse tanto localmente como en el flujo de Integración Continua (CI) de GitHub Actions.

---

##  Requisitos e Instalación

### Requisitos Previos

Asegúrate de tener instalado:
* **Node.js** (versión 20.x o superior)
* **npm** (incluido con Node.js)
* **Git**

### Instalación del Proyecto

1.  **Clonar el Repositorio:**
    ```bash
    git clone [https://github.com/redflagsweb2025/pruebaweb.git]
    cd pruebaweb
    ```

2.  **Instalar Dependencias:**
    Las dependencias de Node se instalan usando `npm`. 
    ```bash
    npm install
    ```

3.  **Instalar Navegadores de Playwright:**
    ```bash
    npx playwright install --with-deps
    ```

---

##  Configuración de Credenciales (CRÍTICO)

Para que las pruebas de API y E2E se ejecuten correctamente, necesitas configurar tus credenciales de Trello y la API base. **Estas credenciales son secretas y NUNCA deben subirse a Git.**

### 1. Variables de Entorno Local

Crea un archivo llamado **`.env`** en la raíz del proyecto. Este archivo es ignorado por Git (vía `.gitignore`).

```bash
# Archivo: .env (NO SUBIR A GIT)
API_BASE=https://api.trello.com/1
UI_BASE =https://api.trello.com
TRELLO_KEY=TU_API_KEY_PERSONAL
TRELLO_TOKEN=TU_TOKEN_SECRETO_PERSONAL
TRELLO_PASSWORD=TU_PASSWORD_AQUI
TRELLO_EMAIL=TU_EMAIL_AQUI
