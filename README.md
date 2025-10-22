# TikTok Stats API Proxy

API serverless para extraer estadísticas de videos de TikTok, diseñada para ser desplegada en Vercel.

## Características

- **Serverless**: Se ejecuta en Vercel como función serverless
- **Gratuito**: Vercel ofrece un plan gratuito generoso
- **Rápido**: Respuestas en segundos
- **CORS habilitado**: Puede ser llamado desde cualquier origen
- **Múltiples métodos**: Soporta GET y POST

## Endpoints

### GET /api/stats

Extrae estadísticas de un video de TikTok.

**Parámetros de consulta:**
- `url` (requerido): URL del video de TikTok

**Ejemplo:**
```
GET /api/stats?url=https://www.tiktok.com/@username/video/1234567890
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "url": "https://www.tiktok.com/@username/video/1234567890",
  "title": "Descripción del video",
  "author_name": "username",
  "stats": {
    "views": 1234567,
    "likes": 98765,
    "comments": 4321,
    "shares": 1234
  }
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "url": "https://www.tiktok.com/@username/video/1234567890",
  "stats": {
    "views": null,
    "likes": null,
    "comments": null,
    "shares": null
  },
  "error": "Descripción del error"
}
```

### POST /api/stats

Extrae estadísticas de un video de TikTok usando POST.

**Body (JSON):**
```json
{
  "url": "https://www.tiktok.com/@username/video/1234567890"
}
```

**Respuesta:** Igual que el método GET

## Despliegue en Vercel

### Requisitos previos

1. Cuenta en [Vercel](https://vercel.com) (gratuita)
2. [Vercel CLI](https://vercel.com/cli) instalado (opcional, pero recomendado)

### Opción 1: Despliegue desde GitHub (Recomendado)

1. Sube este proyecto a un repositorio de GitHub
2. Ve a [Vercel](https://vercel.com) e inicia sesión
3. Haz clic en "Add New Project"
4. Importa tu repositorio de GitHub
5. Vercel detectará automáticamente la configuración
6. Haz clic en "Deploy"

### Opción 2: Despliegue con Vercel CLI

1. Instala Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Desde el directorio del proyecto, ejecuta:
   ```bash
   vercel
   ```

3. Sigue las instrucciones en pantalla
4. Una vez desplegado, obtendrás una URL como: `https://tu-proyecto.vercel.app`

### Opción 3: Despliegue arrastrando carpeta

1. Ve a [Vercel](https://vercel.com) e inicia sesión
2. Arrastra la carpeta del proyecto a la interfaz web
3. Vercel subirá y desplegará automáticamente

## Uso desde Google Sheets

Una vez desplegada la API, puedes usarla desde Google Apps Script:

```javascript
function extraerEstadisticasTikTok(url) {
  const API_URL = 'https://tu-proyecto.vercel.app/api/stats';
  
  try {
    const response = UrlFetchApp.fetch(`${API_URL}?url=${encodeURIComponent(url)}`);
    const data = JSON.parse(response.getContentText());
    
    if (data.success) {
      return data.stats;
    } else {
      return {
        views: null,
        likes: null,
        comments: null,
        shares: null,
        error: data.error
      };
    }
  } catch (error) {
    return {
      views: null,
      likes: null,
      comments: null,
      shares: null,
      error: error.toString()
    };
  }
}
```

## Limitaciones

- **Vercel Free Tier**: 100GB de ancho de banda por mes, 100 horas de ejecución
- **Timeout**: 10 segundos máximo por request en el plan gratuito
- **Rate limiting**: TikTok puede bloquear IPs que hagan demasiadas peticiones

## Solución de problemas

### Error: "No se pudieron extraer las métricas"

TikTok cambió su estructura HTML. El código necesita ser actualizado.

### Error: "Tiempo de espera agotado"

El video tarda mucho en cargar o TikTok está bloqueando la petición. Intenta de nuevo.

### Error: HTTP 403

TikTok está bloqueando la IP de Vercel. Esto puede suceder si se hacen demasiadas peticiones.

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

