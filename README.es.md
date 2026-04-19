# bailey-wiki

**Generador automático de wikis de código con LLM — compatible con Obsidian**

Analiza automáticamente el código fuente y genera archivos Markdown wiki con navegación por grafos `[[wikilink]]` compatible con Obsidian.

**[English](README.md)** | **[한국어](README.ko.md)** | **[日本語](README.ja.md)** | **[中文](README.zh.md)**

> Inspirado en el [patrón LLM Wiki de Andrej Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — adaptado para bases de código: en lugar de bases de conocimiento personales, bailey-wiki construye y mantiene automáticamente una wiki persistente y acumulativa a partir de tu código fuente. El conocimiento crece con cada commit.

---

## Características

- **Espejo 1:1 de fuentes** — los archivos wiki siguen exactamente la misma estructura de directorios que el código fuente
- **Grafo Obsidian** — las referencias cruzadas `[[wikilink]]` construyen automáticamente grafos de dependencias
- **Análisis real de dependencias** — detecta importaciones reales, no solo nombres de archivos
- **Diagramas Mermaid** — máquinas de estado, flujos de secuencia, relaciones de clases (generados automáticamente)
- **Actualizaciones incrementales** — el comando `update` usa `git diff` para procesar solo los archivos modificados
- **Índice de backlinks** — `update` regenera automáticamente las wikis que referencian archivos modificados via `[[wikilink]]`
- **Síntesis de wiki** — `synthesize` compila toda la wiki en `_index.md`, `_architecture.md`, `_contradictions.md`
- **Caché de archivos wiki** — los archivos sin cambios se omiten automáticamente
- **Backend AWS Bedrock** — Nova Micro/Lite/Pro, Claude Haiku/Sonnet mediante perfiles de inferencia Bedrock
- **Salida multiidioma** — contenido wiki en coreano, inglés, japonés, chino o español (`--lang`)
- **Wiki lint** — el comando `lint` detecta wikis huérfanas, wikis faltantes, enlaces muertos y rutas obsoletas
- **Skill Claude Code** — usa el skill `generate-wiki` para generar wikis mediante subagentes Claude Code (sin LLM externo)
- **TypeScript** — código TypeScript en modo estricto, arquitectura modular, 43 tests unitarios

---

## Instalación

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install
npm run build   # compilar TypeScript → dist/

# Opcional: instalar globalmente
npm link
```

**Requisitos:** Node.js 18+, TypeScript (instalado automáticamente con `npm install`)

### Desarrollo

```bash
npm run dev     # ejecutar directamente con tsx (sin compilar)
npm test        # ejecutar 43 tests unitarios
npm run build   # compilar a dist/
```

---

## Cómo usar

### Primera vez

**Paso 1: Instalar bailey-wiki**

```bash
git clone https://github.com/ianstream/bailey-wiki
cd bailey-wiki
npm install && npm run build
npm link   # hace que el comando `bailey-wiki` esté disponible globalmente
```

**Paso 2: Configurar AWS Bedrock**

```bash
aws configure --profile my-profile
# introducir credenciales de AWS
```

**Paso 3: Inicializar el primer repositorio**

```bash
# Ir al repositorio que queremos documentar
cd ~/git/my-project

# Generar wiki para todos los archivos fuente (primera vez)
bailey-wiki init --project . --profile my-profile

# Verificar lo generado
bailey-wiki status --project .
```

Se crea un directorio `wiki/` que refleja la estructura de fuentes:
```
src/main/kotlin/com/example/OrderService.kt
→ wiki/src/main/kotlin/com/example/OrderService.md
```

**Paso 4: Instalar el git hook (actualización automática al hacer commit)**

```bash
bash /path/to/bailey-wiki/install-hook.sh ~/git/my-project
```

A partir de ahora, cada commit que modifique archivos fuente ejecutará automáticamente `bailey-wiki update`.

---

### Flujo de trabajo diario

Patrón típico después del `init` inicial:

```bash
# 1. Hacer cambios y commit como siempre
git commit -m "feat: agregar lógica de reintento de pago"
# → el hook post-commit ejecuta bailey-wiki update automáticamente

# 2. Revisar el estado del wiki periódicamente (cada 10-15 commits)
bailey-wiki lint --project ~/git/my-project

# 3. Sintetizar cuando necesites una visión global
bailey-wiki synthesize --project ~/git/my-project
```

El propósito de cada comando:

| Comando | Cuándo ejecutar | Qué hace |
|---------|----------------|----------|
| `update` | Cada commit (automático via hook) | Regenera wikis de archivos cambiados y los que los referencian |
| `lint` | Cada 10-15 commits | Detecta wikis huérfanas, enlaces muertos, wikis faltantes |
| `synthesize` | Semanal o tras cambios grandes | Genera `_index.md`, `_architecture.md`, `_contradictions.md`, `hot.md` |

---

### Gestión de múltiples repositorios

bailey-wiki está diseñado con **wikis independientes por repositorio**. Cada repositorio tiene su propio directorio `wiki/` independiente.

```
~/git/
├── my-server/
│   └── wiki/              ← wiki del servidor
│       ├── hot.md
│       ├── _index.md
│       ├── _architecture.md
│       └── src/...
├── my-frontend/
│   └── wiki/              ← wiki del frontend (independiente)
│       ├── hot.md
│       └── src/...
```

**Inicializar múltiples repos a la vez:**

```bash
bailey-wiki init \
  --project ~/git/my-server \
  --project ~/git/my-frontend \
  --profile my-profile \
  --concurrency 8
```

**Instalar hooks en cada repo:**

```bash
for repo in ~/git/my-server ~/git/my-frontend ~/git/my-api; do
  bash /path/to/bailey-wiki/install-hook.sh $repo
done
```

---

### Integración con Claude Code

Conecta tu wiki a Claude Code para responder preguntas sobre el código sin leer archivos fuente directamente.

**Paso 1: Agregar al `CLAUDE.md` del proyecto**

```markdown
## Base de conocimiento Wiki

Al comenzar a trabajar en este repositorio:
1. Leer `wiki/hot.md` primero — cambios recientes + resumen de arquitectura (~30 segundos)
2. Si necesitas más contexto, leer `wiki/_index.md` — lista completa con resúmenes
3. Para visión arquitectónica, leer `wiki/_architecture.md`
4. Solo entonces leer páginas wiki individuales o archivos fuente

No leer archivos fuente para obtener contexto que ya está en el wiki.
```

**Paso 2: Mantener el wiki actualizado**

```bash
# Después de hacer pull
git pull
bailey-wiki update --project .
```

**Paso 3: Hacer preguntas en Claude Code**

```
"¿Qué archivos manejan el procesamiento de pagos?"
"¿De qué depende OrderService?"
"Muéstrame el flujo de checkout"
"¿Qué cambió recientemente?" (hot.md)
"¿Hay contradicciones en el wiki?" (_contradictions.md)
```

**Paso 4: Ejecutar synthesize para contexto profundo**

```bash
# Tras cambios significativos o semanalmente
bailey-wiki synthesize --project ~/git/my-project
```

`hot.md`, `_index.md`, `_architecture.md` y `_contradictions.md` se actualizan al estado más reciente, dando a Claude Code una imagen completa y actualizada del código.

---

## Inicio rápido

```bash
# Analizar todo el proyecto (Nova Lite por defecto)
bailey-wiki init --project ~/git/my-project --profile my-aws-profile

# Mayor calidad
bailey-wiki init --project ~/git/my-project \
  --profile my-aws-profile \
  --model global.anthropic.claude-haiku-4-5-20251001-v1:0

# Actualizar solo los archivos modificados desde la última ejecución
bailey-wiki update --project ~/git/my-project

# Ver estado
bailey-wiki status --project ~/git/my-project
```

---

## Configuración

La configuración se almacena en `wiki/.setting/config.json`. En la primera ejecución se guarda automáticamente. También puedes crearlo manualmente:

```json
{
  "language": "es",
  "llm": {
    "model": "apac.amazon.nova-lite-v1:0",
    "bedrock": {
      "profile": "my-aws-profile",
      "region": "ap-northeast-2"
    }
  },
  "sources": {
    "include": ["src/main"],
    "exclude": ["**/test/**", "**/build/**"],
    "extensions": [".kt", ".java", ".ts", ".tsx"]
  },
  "wiki": {
    "dir": "wiki",
    "obsidian": true
  },
  "concurrency": 5
}
```

### Variables de entorno

```env
BAILEY_WIKI_LANG=es          # ko | en | ja | zh | es (por defecto: ko)
BAILEY_WIKI_MODEL=apac.amazon.nova-lite-v1:0
BAILEY_WIKI_AWS_PROFILE=my-profile
BAILEY_WIKI_AWS_REGION=ap-northeast-2
BAILEY_WIKI_PROJECT=/path/to/project
BAILEY_WIKI_CONCURRENCY=3
```

### Idiomas soportados

| Código | Idioma |
|--------|--------|
| `ko` | Coreano (한국어) — por defecto |
| `en` | Inglés (English) |
| `ja` | Japonés (日本語) |
| `zh` | Chino simplificado (简体中文) |
| `es` | Español |

---

## Referencia CLI

```
bailey-wiki <command> [options]

Commands:
  init        Generar wiki para todos los archivos fuente (omite si ya existe)
  update      Actualizar wiki para archivos modificados desde el último commit
  regen       Regenerar wiki para un archivo específico (siempre sobreescribe)
  status      Mostrar estado del proyecto
  config      Imprimir configuración actual
  synthesize  Sintetizar toda la wiki en _index.md, _architecture.md, _contradictions.md
  lint        Verificar salud de la wiki: huérfanas, faltantes, enlaces muertos, rutas obsoletas

Options:
  --project <path>     Directorio del proyecto (repetible para múltiples proyectos)
  --model <id>         ID de perfil de inferencia Bedrock (por defecto: apac.amazon.nova-lite-v1:0)
  --concurrency <n>    Slots LLM paralelos totales (por defecto: número de núcleos CPU)
  --profile <name>     Nombre de perfil AWS (por defecto: default)
  --region <name>      Región AWS (por defecto: ap-northeast-2)
  --lang <code>        Idioma wiki: ko | en | ja | zh | es (por defecto: ko)
  --from <commit>      (solo update) Sobreescribir commit base en lugar de usar última ejecución
  --file <path>        (solo regen) Archivo fuente a regenerar
```

### Ejemplos

```bash
# Proyecto único en español
bailey-wiki init --project ~/git/my-project --profile my-profile --lang es

# Múltiples proyectos en paralelo
bailey-wiki init \
  --project ~/git/server \
  --project ~/git/frontend \
  --concurrency 6

# Actualización incremental
bailey-wiki update --project ~/git/my-project

# Regenerar un archivo
bailey-wiki regen --project ~/git/my-project --file ~/git/my-project/src/Service.kt

# Sintetizar toda la wiki
bailey-wiki synthesize --project ~/git/my-project

# Verificar salud de la wiki
bailey-wiki lint --project ~/git/my-project

# Flujo de trabajo recomendado
bailey-wiki update --project ~/git/my-project
bailey-wiki lint --project ~/git/my-project
bailey-wiki synthesize --project ~/git/my-project
```

---

## Configuración AWS Bedrock

### Perfiles de inferencia soportados

| ID de perfil | Modelo | Coste (por 1M tokens entrada/salida) |
|---|---|---|
| `apac.amazon.nova-micro-v1:0` | Nova Micro | $0.035 / $0.14 |
| `apac.amazon.nova-lite-v1:0` | Nova Lite | $0.06 / $0.24 |
| `apac.amazon.nova-pro-v1:0` | Nova Pro | $0.80 / $3.20 |
| `global.anthropic.claude-haiku-4-5-20251001-v1:0` | Claude Haiku 4.5 | $0.08 / $0.40 |
| `global.anthropic.claude-sonnet-4-6` | Claude Sonnet 4.6 | $3.00 / $15.00 |

### Credenciales AWS

```bash
aws configure --profile my-profile
```

### Permisos IAM requeridos

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
  "Resource": "arn:aws:bedrock:*::foundation-model/*"
}
```

---

## Salida Wiki

### Estructura de directorios

```
src/main/kotlin/com/example/PurchaseService.kt
→ wiki/src/main/kotlin/com/example/PurchaseService.md
```

### Documentos de síntesis (generados por `synthesize`)

| Archivo | Contenido |
|---------|-----------|
| `wiki/hot.md` | Caché caliente — cambios recientes + resumen de arquitectura (leer primero en nuevas sesiones) |
| `wiki/_index.md` | Lista completa de archivos con resúmenes y índice de etiquetas |
| `wiki/_architecture.md` | Desglose por capas/dominios, flujo de dependencias, grafo Mermaid |
| `wiki/_contradictions.md` | Contradicciones detectadas entre páginas wiki |

---

## Integración Obsidian

1. Obsidian → **Abrir carpeta como vault** → seleccionar `wiki/`
2. Activar **Vista de grafo** → visualizar dependencias
3. `[[wikilinks]]` conectan automáticamente archivos relacionados

---

## Licencia

MIT
