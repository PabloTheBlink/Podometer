#!/bin/bash

# StepFlow Build Script
# Automatiza el proceso de construcción para iOS y Android

echo "🏃‍♂️ StepFlow - Build Script"
echo "=========================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

show_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

show_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

show_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "config.xml" ]; then
    show_error "No se encontró config.xml. Asegúrate de estar en el directorio del proyecto Cordova."
    exit 1
fi

# Verificar instalación de Cordova
if ! command -v cordova &> /dev/null; then
    show_error "Cordova CLI no está instalado. Ejecuta: npm install -g cordova"
    exit 1
fi

# Función para preparar el proyecto
prepare_project() {
    show_message "Preparando el proyecto..."
    cordova prepare
    if [ $? -eq 0 ]; then
        show_success "Proyecto preparado exitosamente"
    else
        show_error "Error preparando el proyecto"
        exit 1
    fi
}

# Función para construir iOS
build_ios() {
    show_message "Construyendo para iOS..."
    
    # Verificar si estamos en macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        show_warning "iOS build solo está disponible en macOS"
        return 1
    fi
    
    # Verificar si Xcode está instalado
    if ! command -v xcodebuild &> /dev/null; then
        show_warning "Xcode no está instalado. iOS build no disponible."
        return 1
    fi
    
    cordova build ios
    if [ $? -eq 0 ]; then
        show_success "Build de iOS completado"
        show_message "Para ejecutar: cordova run ios"
    else
        show_error "Error en build de iOS"
        return 1
    fi
}

# Función para construir Android
build_android() {
    show_message "Construyendo para Android..."
    
    # Verificar Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        show_warning "ANDROID_HOME no está configurado"
        show_message "Configura las variables de entorno para Android SDK"
    fi
    
    cordova build android
    if [ $? -eq 0 ]; then
        show_success "Build de Android completado"
        show_message "Para ejecutar: cordova run android"
    else
        show_error "Error en build de Android"
        return 1
    fi
}

# Función para limpiar builds anteriores
clean_builds() {
    show_message "Limpiando builds anteriores..."
    cordova clean
    show_success "Builds limpiados"
}

# Función para mostrar información del proyecto
show_info() {
    echo ""
    echo "📱 Información del Proyecto"
    echo "=========================="
    echo "Nombre: StepFlow - Premium Pedometer"
    echo "ID: com.pablomsj.stepflow"
    echo "Versión: 1.0.0"
    echo ""
    echo "🔌 Plugins Instalados:"
    cordova plugin ls
    echo ""
    echo "📱 Plataformas:"
    cordova platform ls
    echo ""
}

# Función para ejecutar en dispositivo
run_device() {
    local platform=$1
    
    if [ "$platform" = "ios" ]; then
        show_message "Ejecutando en dispositivo iOS..."
        cordova run ios --device
    elif [ "$platform" = "android" ]; then
        show_message "Ejecutando en dispositivo Android..."
        cordova run android --device
    else
        show_error "Plataforma no válida. Usa: ios o android"
        exit 1
    fi
}

# Función para ejecutar en emulador
run_emulator() {
    local platform=$1
    
    if [ "$platform" = "ios" ]; then
        show_message "Ejecutando en simulador iOS..."
        cordova run ios --emulator
    elif [ "$platform" = "android" ]; then
        show_message "Ejecutando en emulador Android..."
        cordova run android --emulator
    else
        show_error "Plataforma no válida. Usa: ios o android"
        exit 1
    fi
}

# Parsear argumentos de línea de comandos
case "$1" in
    "prepare")
        prepare_project
        ;;
    "ios")
        prepare_project
        build_ios
        ;;
    "android")
        prepare_project
        build_android
        ;;
    "both")
        prepare_project
        build_ios
        build_android
        ;;
    "clean")
        clean_builds
        ;;
    "info")
        show_info
        ;;
    "run")
        if [ -z "$2" ]; then
            show_error "Especifica la plataforma: ./build.sh run ios|android"
            exit 1
        fi
        prepare_project
        run_device "$2"
        ;;
    "emulator")
        if [ -z "$2" ]; then
            show_error "Especifica la plataforma: ./build.sh emulator ios|android"
            exit 1
        fi
        prepare_project
        run_emulator "$2"
        ;;
    "help"|"--help"|"-h"|"")
        echo ""
        echo "🏃‍♂️ StepFlow Build Script - Uso:"
        echo "================================"
        echo ""
        echo "  ./build.sh prepare     - Preparar el proyecto"
        echo "  ./build.sh ios         - Construir para iOS"
        echo "  ./build.sh android     - Construir para Android"
        echo "  ./build.sh both        - Construir para ambas plataformas"
        echo "  ./build.sh clean       - Limpiar builds anteriores"
        echo "  ./build.sh info        - Mostrar información del proyecto"
        echo "  ./build.sh run ios     - Ejecutar en dispositivo iOS"
        echo "  ./build.sh run android - Ejecutar en dispositivo Android"
        echo "  ./build.sh emulator ios     - Ejecutar en simulador iOS"
        echo "  ./build.sh emulator android - Ejecutar en emulador Android"
        echo "  ./build.sh help        - Mostrar esta ayuda"
        echo ""
        echo "Ejemplos:"
        echo "  ./build.sh both                    # Construir para iOS y Android"
        echo "  ./build.sh run ios                 # Ejecutar en iPhone conectado"
        echo "  ./build.sh emulator android        # Ejecutar en emulador Android"
        echo ""
        ;;
    *)
        show_error "Comando no reconocido: $1"
        show_message "Usa './build.sh help' para ver los comandos disponibles"
        exit 1
        ;;
esac

echo ""
show_success "✅ Script completado"