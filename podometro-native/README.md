# StepFlow - Podómetro con Datos Nativos de Salud

## Descripción

StepFlow es un podómetro premium que accede a los datos nativos de salud de iOS (HealthKit) y Android (Health Connect) para obtener información precisa de pasos, distancia y calorías quemadas, sin necesidad de mantener la aplicación abierta.

## Características

- ✅ **Datos Nativos**: Acceso a HealthKit (iOS) y Health Connect (Android)
- ✅ **Precisión**: Datos más precisos que el acelerómetro del dispositivo
- ✅ **Funcionamiento en Background**: No necesitas mantener la app abierta
- ✅ **Fallback al Acelerómetro**: Si los datos nativos no están disponibles
- ✅ **PWA Compatible**: Funciona como Progressive Web App
- ✅ **Diseño Premium**: Interfaz moderna y atractiva

## Tecnologías Utilizadas

- **Cordova/PhoneGap**: Framework híbrido para acceso a APIs nativas
- **cordova-plugin-health**: Plugin para HealthKit y Health Connect
- **TailwindCSS**: Framework CSS para diseño responsive
- **Service Worker**: Para funcionalidad offline y PWA

## Configuración del Proyecto

### Prerrequisitos

```bash
npm install -g cordova
```

### Instalación

1. **Clonar el repositorio** (si aplica)
2. **Instalar dependencias**:
   ```bash
   cordova platform add ios android
   cordova plugin add cordova-plugin-health
   ```

### Desarrollo

```bash
# Preparar el proyecto
cordova prepare

# Ejecutar en iOS (requiere macOS y Xcode)
cordova run ios

# Ejecutar en Android (requiere Android SDK)
cordova run android

# Construir para producción
cordova build --release
```

## Funcionalidad

### Datos de Salud Nativos

La aplicación prioriza el uso de datos nativos:

**iOS (HealthKit)**:
- Requiere permisos de lectura para pasos, distancia y calorías
- Se configura automáticamente con las descripciones de privacidad necesarias
- Compatible con iOS 12.0+

**Android (Health Connect)**:
- Utiliza la nueva API de Health Connect (reemplaza Google Fit)
- Requiere Android API nivel 26+ (Android 8.0)
- Permisos configurados automáticamente en AndroidManifest.xml

### Fallback al Acelerómetro

Si los datos nativos no están disponibles, la aplicación ofrece:
- Detección de pasos basada en acelerómetro
- Algoritmo de filtrado para reducir falsos positivos
- Configuración de sensibilidad ajustable

## Estructura del Proyecto

```
podometro-native/
├── config.xml              # Configuración de Cordova
├── www/                     # Código de la aplicación web
│   ├── index.html          # Aplicación principal
│   ├── js/
│   │   └── health-manager.js # Gestor de datos de salud
│   ├── manifest.json       # Manifiesto PWA
│   ├── sw.js              # Service Worker
│   └── *.png              # Iconos de la aplicación
├── platforms/              # Código nativo generado
│   ├── ios/               # Proyecto iOS
│   └── android/           # Proyecto Android
└── plugins/               # Plugins de Cordova instalados
```

## APIs y Permisos

### iOS (HealthKit)

```xml
<config-file target="*-Info.plist" parent="NSHealthShareUsageDescription">
    <string>Esta aplicación necesita acceso a HealthKit para leer tu número de pasos...</string>
</config-file>
```

### Android (Health Connect)

```xml
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
```

## Consideraciones de Desarrollo

### Actualización de Datos

- Los datos se actualizan automáticamente cada 30 segundos
- Manejo inteligente de cambios para evitar actualizaciones innecesarias
- Persistencia local con LocalStorage como backup

### Gestión de Estados

- `healthEnabled`: Indica si los datos nativos están disponibles
- `sensorEnabled`: Indica si el acelerómetro está activo
- Sistema de fallback automático entre ambos modos

### Optimizaciones

- Animaciones suaves para cambios en el contador de pasos
- Notificaciones al usuario sobre el estado de la conexión
- Limpieza automática de intervalos al cerrar la aplicación

## Distribución

### iOS App Store

1. Configurar firma de código en Xcode
2. Asegurar que los permisos de HealthKit estén correctamente configurados
3. Incluir descripciones detalladas de uso de datos de salud

### Google Play Store

1. Configurar firma de aplicación
2. Verificar permisos de Health Connect
3. Preparar para el proceso de revisión de permisos sensibles

## Troubleshooting

### Problemas Comunes

1. **Datos de salud no disponibles**:
   - Verificar que el dispositivo soporte HealthKit/Health Connect
   - Confirmar permisos otorgados por el usuario
   - Revisar logs en la consola del desarrollador

2. **Acelerómetro no funciona**:
   - Verificar permisos de DeviceMotion (iOS)
   - Asegurar que el dispositivo tenga sensores de movimiento

3. **Build errors**:
   - Verificar versiones de SDK (Android API 35, iOS 12.0+)
   - Confirmar que Cordova CLI esté actualizado

## Próximas Mejoras

- [ ] Integración con Apple Watch y Wear OS
- [ ] Gráficos históricos de actividad
- [ ] Sincronización en la nube
- [ ] Metas personalizadas y logros
- [ ] Compartir en redes sociales

## Licencia

Este proyecto está bajo la licencia MIT. Ver archivo LICENSE para más detalles.