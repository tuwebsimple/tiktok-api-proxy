/**
 * TikTok Stats Extractor para Google Sheets - Versión API Proxy
 * Extrae estadísticas (views, likes, comments, shares) de videos de TikTok
 * usando una API intermediaria desplegada en Vercel
 * 
 * IMPORTANTE: Reemplaza la URL de la API con tu URL de Vercel
 */

/**
 * Configuración global
 * ⚠️ IMPORTANTE: Cambia esta URL por la URL de tu API desplegada en Vercel
 */
const CONFIG = {
  API_URL: 'https://tu-proyecto.vercel.app/api/stats', // ⚠️ CAMBIAR ESTA URL
  COLUMN_URLS: 'D', // Columna donde están las URLs de TikTok
  COLUMN_VIEWS: 'G', // Columna para views
  COLUMN_LIKES: 'H', // Columna para likes
  COLUMN_COMMENTS: 'I', // Columna para comments
  COLUMN_SHARES: 'J', // Columna para shares
  START_ROW: 3, // Fila inicial para procesar datos
  TIMESTAMP_CELL: 'I1' // Celda para mostrar última actualización
};

/**
 * Crea el menú personalizado al abrir la hoja
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('TikTok Stats')
    .addItem('⚙️ Configurar URL de API', 'configurarAPI')
    .addSeparator()
    .addItem('🔄 Actualizar Estadísticas', 'actualizarEstadisticasTikTok')
    .addItem('🧪 Probar Conexión con API', 'probarConexionAPI')
    .addSeparator()
    .addItem('🎨 Configurar Botón', 'crearBotonActualizar')
    .addToUi();
}

/**
 * Función para configurar la URL de la API
 */
function configurarAPI() {
  const ui = SpreadsheetApp.getUi();
  const properties = PropertiesService.getScriptProperties();
  
  const currentUrl = properties.getProperty('API_URL') || CONFIG.API_URL;
  
  const response = ui.prompt(
    'Configurar URL de la API',
    `Ingresa la URL de tu API desplegada en Vercel:\n\nURL actual: ${currentUrl}`,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (response.getSelectedButton() === ui.Button.OK) {
    const newUrl = response.getResponseText().trim();
    
    if (newUrl && newUrl.startsWith('http')) {
      properties.setProperty('API_URL', newUrl);
      ui.alert('✅ URL configurada correctamente', `Nueva URL: ${newUrl}`, ui.ButtonSet.OK);
    } else {
      ui.alert('❌ Error', 'La URL debe comenzar con http:// o https://', ui.ButtonSet.OK);
    }
  }
}

/**
 * Función para probar la conexión con la API
 */
function probarConexionAPI() {
  const ui = SpreadsheetApp.getUi();
  const apiUrl = obtenerURLAPI();
  
  ui.alert(
    'Probando conexión...',
    `Se probará la conexión con: ${apiUrl}\n\nEsto puede tardar unos segundos.`,
    ui.ButtonSet.OK
  );
  
  try {
    const testUrl = 'https://www.tiktok.com/@tiktok/video/7016451463165365509';
    const response = UrlFetchApp.fetch(`${apiUrl}?url=${encodeURIComponent(testUrl)}`, {
      'muteHttpExceptions': true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      const data = JSON.parse(response.getContentText());
      
      if (data.success) {
        ui.alert(
          '✅ Conexión exitosa',
          `La API está funcionando correctamente.\n\nViews: ${data.stats.views}\nLikes: ${data.stats.likes}`,
          ui.ButtonSet.OK
        );
      } else {
        ui.alert(
          '⚠️ API responde pero con error',
          `La API respondió pero no pudo extraer datos:\n\n${data.error}`,
          ui.ButtonSet.OK
        );
      }
    } else {
      ui.alert(
        '❌ Error de conexión',
        `La API respondió con código HTTP ${statusCode}`,
        ui.ButtonSet.OK
      );
    }
  } catch (error) {
    ui.alert(
      '❌ Error',
      `No se pudo conectar con la API:\n\n${error.toString()}\n\nVerifica que la URL sea correcta.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Obtiene la URL de la API desde las propiedades o la configuración
 */
function obtenerURLAPI() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty('API_URL') || CONFIG.API_URL;
}

/**
 * Función principal que actualiza las estadísticas de TikTok
 */
function actualizarEstadisticasTikTok() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const ui = SpreadsheetApp.getUi();
  const apiUrl = obtenerURLAPI();
  
  // Verificar que la API esté configurada
  if (apiUrl.includes('tu-proyecto.vercel.app')) {
    ui.alert(
      '⚠️ Configuración requerida',
      'Primero debes configurar la URL de tu API.\n\nVe a: TikTok Stats > Configurar URL de API',
      ui.ButtonSet.OK
    );
    return;
  }
  
  // Confirmar inicio
  const respuesta = ui.alert(
    'Actualizar Estadísticas de TikTok',
    '¿Deseas iniciar la extracción de datos?\n\nEste proceso puede tardar varios segundos.',
    ui.ButtonSet.YES_NO
  );
  
  if (respuesta !== ui.Button.YES) {
    return;
  }
  
  try {
    // Obtener URLs
    const lastRow = sheet.getLastRow();
    
    if (lastRow < CONFIG.START_ROW) {
      ui.alert('No hay datos para procesar. Asegúrate de tener URLs en la columna D desde la fila 3.');
      return;
    }
    
    const urlRange = sheet.getRange(CONFIG.COLUMN_URLS + CONFIG.START_ROW + ':' + CONFIG.COLUMN_URLS + lastRow);
    const urls = urlRange.getValues();
    
    // Preparar arrays para resultados
    const views = [];
    const likes = [];
    const comments = [];
    const shares = [];
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Procesar cada URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i][0];
      
      if (!url || url.toString().trim() === '') {
        views.push(['']);
        likes.push(['']);
        comments.push(['']);
        shares.push(['']);
        continue;
      }
      
      // Extraer estadísticas usando la API
      const stats = extraerEstadisticasTikTok(url.toString().trim(), apiUrl);
      
      if (stats.error) {
        views.push(['Error']);
        likes.push(['Error']);
        comments.push(['Error']);
        shares.push(['Error']);
        errorCount++;
        Logger.log(`Error en fila ${i + CONFIG.START_ROW}: ${stats.error}`);
      } else {
        views.push([stats.views || 0]);
        likes.push([stats.likes || 0]);
        comments.push([stats.comments || 0]);
        shares.push([stats.shares || 0]);
        processedCount++;
      }
      
      // Pausa para evitar sobrecarga
      if (i > 0 && i % 5 === 0) {
        Utilities.sleep(1000);
      }
    }
    
    // Escribir resultados
    if (views.length > 0) {
      const startRow = CONFIG.START_ROW;
      const endRow = startRow + views.length - 1;
      
      sheet.getRange(CONFIG.COLUMN_VIEWS + startRow + ':' + CONFIG.COLUMN_VIEWS + endRow).setValues(views);
      sheet.getRange(CONFIG.COLUMN_LIKES + startRow + ':' + CONFIG.COLUMN_LIKES + endRow).setValues(likes);
      sheet.getRange(CONFIG.COLUMN_COMMENTS + startRow + ':' + CONFIG.COLUMN_COMMENTS + endRow).setValues(comments);
      sheet.getRange(CONFIG.COLUMN_SHARES + startRow + ':' + CONFIG.COLUMN_SHARES + endRow).setValues(shares);
    }
    
    // Actualizar timestamp
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
    sheet.getRange(CONFIG.TIMESTAMP_CELL).setValue('Última actualización: ' + timestamp);
    
    // Mensaje final
    ui.alert(
      '✅ Extracción completada',
      `Procesados exitosamente: ${processedCount}\nErrores: ${errorCount}\nTotal: ${urls.length}`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert('❌ Error', 'Ocurrió un error: ' + error.toString(), ui.ButtonSet.OK);
    Logger.log('Error en actualizarEstadisticasTikTok: ' + error.toString());
  }
}

/**
 * Extrae estadísticas de un video de TikTok usando la API
 */
function extraerEstadisticasTikTok(url, apiUrl) {
  try {
    const endpoint = `${apiUrl}?url=${encodeURIComponent(url)}`;
    
    const options = {
      'method': 'get',
      'muteHttpExceptions': true,
      'followRedirects': true
    };
    
    const response = UrlFetchApp.fetch(endpoint, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode !== 200) {
      return {
        error: `API respondió con HTTP ${statusCode}`,
        views: null,
        likes: null,
        comments: null,
        shares: null
      };
    }
    
    const data = JSON.parse(response.getContentText());
    
    if (data.success) {
      return {
        views: data.stats.views,
        likes: data.stats.likes,
        comments: data.stats.comments,
        shares: data.stats.shares
      };
    } else {
      return {
        error: data.error || 'Error desconocido',
        views: null,
        likes: null,
        comments: null,
        shares: null
      };
    }
    
  } catch (error) {
    Logger.log('Error en extraerEstadisticasTikTok: ' + error.toString());
    return {
      error: error.toString(),
      views: null,
      likes: null,
      comments: null,
      shares: null
    };
  }
}

/**
 * Instrucciones para crear botón
 */
function crearBotonActualizar() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'Instrucciones para crear un botón',
    'Para crear un botón de actualización:\n\n' +
    '1. Ve a Insertar > Dibujo\n' +
    '2. Crea un botón con texto "🔄 Actualizar TikTok"\n' +
    '3. Guarda y cierra el dibujo\n' +
    '4. Haz clic en los 3 puntos del dibujo\n' +
    '5. Selecciona "Asignar secuencia de comandos"\n' +
    '6. Escribe: actualizarEstadisticasTikTok\n' +
    '7. Haz clic en Aceptar\n\n' +
    'También puedes usar el menú "TikTok Stats".',
    ui.ButtonSet.OK
  );
}

