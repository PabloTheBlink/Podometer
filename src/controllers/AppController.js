const AppController = ScopeJS.Component({
  controller: function () {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.fecha = now.toLocaleDateString('es-ES', options);
    this.fechaKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const hour = now.getHours();
    if (hour < 12) {
      this.saludo = "Buenos días";
    } else if (hour < 20) {
      this.saludo = "Buenas tardes";
    } else {
      this.saludo = "Buenas noches";
    }
    
    // Funciones de localStorage
    this.loadData = function() {
      const stored = localStorage.getItem('podometro') || '{}';
      const data = JSON.parse(stored);
      
      // Datos del día actual
      const today = data[this.fechaKey] || {
        pasos: 0,
        distancia: 0,
        tiempo: 0, // milisegundos
        isTracking: false,
        ruta: []
      };
      
      this.pasos = today.pasos;
      this.distancia = today.distancia;
      this.tiempoMs = today.tiempo;
      this.isTracking = today.isTracking;
      this.ruta = today.ruta || [];
      
      // Máximos históricos
      const maximos = data.maximos || {
        pasos: { valor: 0, fecha: null },
        distancia: { valor: 0, fecha: null },  
        tiempo: { valor: 0, fecha: null }
      };
      
      this.maxPasos = maximos.pasos.valor;
      this.maxPasosFecha = maximos.pasos.fecha;
      this.maxDistancia = maximos.distancia.valor;
      this.maxDistanciaFecha = maximos.distancia.fecha;
      this.maxTiempoMs = maximos.tiempo.valor;
      this.maxTiempoFecha = maximos.tiempo.fecha;
    };
    
    this.saveData = function() {
      const stored = localStorage.getItem('podometro') || '{}';
      const data = JSON.parse(stored);
      
      // Guardar datos del día actual
      data[this.fechaKey] = {
        pasos: this.pasos,
        distancia: this.distancia,
        tiempo: this.tiempoMs,
        isTracking: this.isTracking,
        ruta: this.ruta || []
      };
      
      // Actualizar máximos si es necesario
      if (!data.maximos) {
        data.maximos = {
          pasos: { valor: 0, fecha: null },
          distancia: { valor: 0, fecha: null },
          tiempo: { valor: 0, fecha: null }
        };
      }
      
      // Comprobar nuevos máximos
      if (this.pasos > data.maximos.pasos.valor) {
        data.maximos.pasos = { valor: this.pasos, fecha: this.fechaKey };
        this.maxPasos = this.pasos;
        this.maxPasosFecha = this.fechaKey;
      }
      
      if (this.distancia > data.maximos.distancia.valor) {
        data.maximos.distancia = { valor: this.distancia, fecha: this.fechaKey };
        this.maxDistancia = this.distancia;
        this.maxDistanciaFecha = this.fechaKey;
      }
      
      if (this.tiempoMs > data.maximos.tiempo.valor) {
        data.maximos.tiempo = { valor: this.tiempoMs, fecha: this.fechaKey };
        this.maxTiempoMs = this.tiempoMs;
        this.maxTiempoFecha = this.fechaKey;
      }
      
      localStorage.setItem('podometro', JSON.stringify(data));
    };
    
    // Función para formatear tiempo
    this.formatTime = function(ms) {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      
      const hh = hours.toString().padStart(2, '0');
      const mm = minutes.toString().padStart(2, '0');
      const ss = seconds.toString().padStart(2, '0');
      
      return `${hh}:${mm}:${ss}`;
    };
    
    // Cargar datos iniciales
    this.loadData();
    
    // Variables para tracking automático
    this.timer = null;
    this.locationWatcher = null;
    this.ruta = []; // Array de coordenadas GPS
    this.estado = 'Iniciando...';
    this.lastMovement = null;
    this.inactivityTimer = null;
    this.isMoving = false;
    this.wakeLock = null;
    
    // Parámetros de movimiento
    this.MIN_SPEED = 0.5; // km/h mínima para considerar movimiento
    this.INACTIVITY_TIMEOUT = 180000; // 3 minutos sin movimiento para pausar
    this.GPS_TOLERANCE = 30000; // 30 segundos de tolerancia para eventos GPS
    
    // Variables del mapa
    this.map = null;
    this.routeLine = null;
    this.startMarker = null;
    this.endMarker = null;
    this.markersAdded = false;
    
    // Iniciar sistema automático
    setTimeout(() => {
      this.startAutoTracking();
    }, 1000);
    
    // Inicializar mapa después de render
    setTimeout(() => {
      this.initMap();
      // Mostrar ruta histórica si existe
      if (this.ruta && this.ruta.length > 0) {
        this.updateMapRoute();
      }
    }, 2000);
    
    // Calcular progreso de los anillos
    this.calculateProgress = function() {
      // Evitar división por cero
      const maxPasos = this.maxPasos || 1;
      const maxDistancia = this.maxDistancia || 1;  
      const maxTiempoMs = this.maxTiempoMs || 1;
      
      // Calcular porcentajes (0-1)
      this.progresoPasos = Math.min(this.pasos / maxPasos, 1);
      this.progresoDistancia = Math.min(this.distancia / maxDistancia, 1);
      this.progresoTiempo = Math.min(this.tiempoMs / maxTiempoMs, 1);
      
      // Calcular dashoffset para cada anillo
      this.dashoffsetPasos = 628 - (628 * this.progresoPasos);
      this.dashoffsetDistancia = 440 - (440 * this.progresoDistancia);
      this.dashoffsetTiempo = 251 - (251 * this.progresoTiempo);
    };
    
    // Llamar al cálculo inicial
    this.calculateProgress();
    
    // Sistema de tracking automático
    this.startAutoTracking = function() {
      this.estado = 'Solicitando ubicación...';
      this.apply();
      
      if (navigator.geolocation) {
        this.locationWatcher = navigator.geolocation.watchPosition(
          (position) => {
            this.handleLocationUpdate(position);
          },
          (error) => {
            console.error('Error obteniendo ubicación:', error);
            this.estado = 'Error GPS - Solo tiempo manual';
            this.startTimer(); // Continuar solo con timer
            this.apply();
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
          }
        );
      } else {
        this.estado = 'GPS no disponible';
        this.apply();
      }
    };
    
    // Manejar actualización de ubicación
    this.handleLocationUpdate = function(position) {
      const newPoint = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: Date.now(),
        speed: position.coords.speed || 0 // velocidad en m/s
      };
      
      if (this.ruta.length === 0) {
        // Primera posición
        this.ruta.push(newPoint);
        this.estado = 'Esperando movimiento...';
        this.apply();
        return;
      }
      
      const lastPoint = this.ruta[this.ruta.length - 1];
      const distance = this.calculateDistance(lastPoint, newPoint);
      const timeElapsed = (newPoint.timestamp - lastPoint.timestamp) / 1000; // segundos
      const speed = distance / (timeElapsed / 3600); // km/h
      
      // Detectar movimiento
      const isMovingNow = speed > this.MIN_SPEED && distance > 0.003; // >3 metros
      
      if (isMovingNow && !this.isMoving) {
        // Empezar a moverse
        this.startMoving();
      } else if (!isMovingNow && this.isMoving) {
        // Parar movimiento
        this.stopMoving();
      }
      
      if (this.isMoving && distance > 0.003) {
        // Actualizar datos solo si se está moviendo
        this.distancia += distance;
        this.pasos += Math.round(distance * 1312);
        this.ruta.push(newPoint);
        this.lastMovement = Date.now();
        this.calculateProgress();
        
        // Actualizar ruta en el mapa
        this.updateMapRoute();
        
        this.apply();
        
        // Reset timer de inactividad
        this.resetInactivityTimer();
      }
    };
    
    // Empezar movimiento
    this.startMoving = function() {
      this.isMoving = true;
      this.isTracking = true;
      this.estado = 'Caminando';
      this.lastMovement = Date.now();
      
      if (!this.timer) {
        this.startTimer();
      }
      
      // Activar Wake Lock para mantener pantalla encendida
      this.requestWakeLock();
      
      this.resetInactivityTimer();
      this.apply();
    };
    
    // Parar movimiento
    this.stopMoving = function() {
      this.isMoving = false;
      // No cambiar estado inmediatamente - el timer lo manejará con tolerancia
      
      // Iniciar timer de inactividad
      this.resetInactivityTimer();
    };
    
    // Timer de inactividad
    this.resetInactivityTimer = function() {
      if (this.inactivityTimer) {
        clearTimeout(this.inactivityTimer);
      }
      
      this.inactivityTimer = setTimeout(() => {
        if (!this.isMoving && this.isTracking) {
          this.pauseTracking();
        }
      }, this.INACTIVITY_TIMEOUT);
    };
    
    // Pausar tracking por inactividad
    this.pauseTracking = function() {
      this.isTracking = false;
      this.estado = 'En pausa';
      
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      
      // Liberar Wake Lock cuando se pausa
      this.releaseWakeLock();
      
      this.saveData();
      this.apply();
    };
    
    // Timer en tiempo real (lógica mejorada)
    this.startTimer = function() {
      if (this.timer) return; // Evitar múltiples timers
      
      this.timer = setInterval(() => {
        if (this.isTracking) {
          const now = Date.now();
          
          // Contar tiempo si:
          // 1. Está en movimiento, O
          // 2. Ha tenido movimiento reciente (dentro de GPS_TOLERANCE)
          const hasRecentMovement = this.lastMovement && (now - this.lastMovement) < this.GPS_TOLERANCE;
          
          if (this.isMoving || hasRecentMovement) {
            this.tiempoMs += 1000;
            this.calculateProgress();
            
            // Actualizar estado visual
            if (this.isMoving) {
              this.estado = 'Caminando';
            } else if (hasRecentMovement) {
              this.estado = 'Caminando'; // Mantener "Caminando" durante tolerancia GPS
            }
          } else if (this.isTracking && !this.isMoving) {
            this.estado = 'Parado';
          }
          
          this.apply();
          
          // Guardar cada 10 segundos
          if (this.tiempoMs % 10000 === 0) {
            this.saveData();
          }
        }
      }, 1000);
    };
    
    // Calcular distancia entre dos puntos GPS (en km)
    this.calculateDistance = function(point1, point2) {
      const R = 6371; // Radio de la Tierra en km
      const dLat = (point2.lat - point1.lat) * Math.PI / 180;
      const dLng = (point2.lng - point1.lng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };
    
    // Colores de estado
    this.getStatusColor = function() {
      switch(this.estado) {
        case 'Caminando':
          return '#34C759'; // Verde
        case 'Parado':
          return '#FF9500'; // Naranja
        case 'En pausa':
          return '#8E8E93'; // Gris
        case 'Error GPS - Solo tiempo manual':
          return '#FF3B30'; // Rojo
        default:
          return '#007AFF'; // Azul
      }
    };
    
    this.getStatusDotColor = function() {
      switch(this.estado) {
        case 'Caminando':
          return '#FFFFFF'; // Blanco (pulsa)
        case 'Parado':
          return '#FFD60A'; // Amarillo
        case 'En pausa':
          return '#C7C7CC'; // Gris claro
        default:
          return '#FFFFFF'; // Blanco
      }
    };
    
    // Wake Lock API para mantener pantalla encendida
    this.requestWakeLock = async function() {
      try {
        if ('wakeLock' in navigator) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          console.log('Wake Lock activado - pantalla se mantendrá encendida');
          
          // Manejar cuando se libera automáticamente
          this.wakeLock.addEventListener('release', () => {
            console.log('Wake Lock liberado');
          });
        } else {
          console.log('Wake Lock API no disponible');
        }
      } catch (err) {
        console.error('Error activando Wake Lock:', err);
      }
    };
    
    this.releaseWakeLock = function() {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
        console.log('Wake Lock liberado manualmente');
      }
    };
    
    // Liberar Wake Lock al salir de la página
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isTracking && this.isMoving) {
        // Reactivar Wake Lock si volvemos y estamos caminando
        this.requestWakeLock();
      }
    });
    
    // Inicializar mapa
    this.initMap = function() {
      if (this.map) return; // Ya inicializado
      
      console.log('Inicializando mapa...');
      const mapElement = document.getElementById('map');
      if (!mapElement) {
        console.error('Elemento #map no encontrado');
        return;
      }
      
      // Coordenadas por defecto (Madrid)
      const defaultLat = 40.4168;
      const defaultLng = -3.7038;
      
      try {
        this.map = L.map('map', {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          tap: false
        }).setView([defaultLat, defaultLng], 13);
        
        // Tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(this.map);
        
        console.log('Mapa inicializado correctamente');
        
        // Centrar en ruta histórica si existe, sino en ubicación actual
        if (this.ruta && this.ruta.length > 0) {
          console.log('Centrando mapa en ruta histórica');
          const coordinates = this.ruta.map(point => [point.lat, point.lng]);
          const bounds = L.latLngBounds(coordinates);
          this.map.fitBounds(bounds, { padding: [50, 50] });
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            this.map.setView([lat, lng], 16);
            console.log('Mapa centrado en ubicación actual:', lat, lng);
          });
        }
      } catch (error) {
        console.error('Error inicializando mapa:', error);
      }
    };
    
    // Actualizar ruta en el mapa
    this.updateMapRoute = function() {
      if (!this.map || this.ruta.length < 1) return;
      
      console.log('Actualizando ruta en mapa, puntos:', this.ruta.length);
      
      // Remover línea anterior
      if (this.routeLine) {
        this.map.removeLayer(this.routeLine);
      }
      
      // Crear nueva línea con las coordenadas
      const coordinates = this.ruta.map(point => [point.lat, point.lng]);
      
      if (coordinates.length >= 2) {
        this.routeLine = L.polyline(coordinates, {
          color: '#FF0080',
          weight: 4,
          opacity: 0.9
        }).addTo(this.map);
        
        console.log('Línea de ruta creada con', coordinates.length, 'puntos');
      }
      
      // Agregar marcadores de inicio y fin
      if (coordinates.length > 0) {
        // Solo agregar marcadores al inicio de la sesión, no cada vez
        if (!this.markersAdded) {
          // Marcador de inicio (verde)
          this.startMarker = L.circleMarker(coordinates[0], {
            radius: 8,
            fillColor: '#34C759',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(this.map);
          
          this.markersAdded = true;
        }
        
        // Actualizar o crear marcador de fin (rojo)
        if (this.endMarker) {
          this.map.removeLayer(this.endMarker);
        }
        
        if (coordinates.length > 1) {
          this.endMarker = L.circleMarker(coordinates[coordinates.length - 1], {
            radius: 8,
            fillColor: '#FF3B30',
            color: '#FFFFFF',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(this.map);
        }
        
        // Zoom dinámico solo mientras se está moviendo
        if (this.isMoving) {
          const bounds = L.latLngBounds(coordinates);
          this.map.fitBounds(bounds, { 
            padding: [50, 50],
            animate: true,
            duration: 0.5
          });
        }
      }
    };
    
    
    // Editar máximos
    this.editMaximos = function(tipo) {
      const that = this;
      ScopeJS.Modal({
        controller: function() {
          this.tipo = tipo;
          this.valor = '';
          
          // Establecer valor actual
          if (tipo === 'pasos') {
            this.valor = that.maxPasos || 0;
            this.label = 'Pasos máximos';
            this.placeholder = 'Ej: 15000';
          } else if (tipo === 'distancia') {
            this.valor = that.maxDistancia || 0;
            this.label = 'Distancia máxima (km)';
            this.placeholder = 'Ej: 12.5';
          } else if (tipo === 'tiempo') {
            this.valor = that.formatTime(that.maxTiempoMs || 0);
            this.label = 'Tiempo máximo (HH:MM:SS)';
            this.placeholder = 'Ej: 02:30:45';
          }
          
          this.guardar = function() {
            let nuevoValor;
            
            if (this.tipo === 'pasos') {
              nuevoValor = parseInt(this.valor) || 0;
              that.maxPasos = nuevoValor;
            } else if (this.tipo === 'distancia') {
              nuevoValor = parseFloat(this.valor) || 0;
              that.maxDistancia = nuevoValor;
            } else if (this.tipo === 'tiempo') {
              // Convertir HH:MM:SS a milisegundos
              const parts = this.valor.split(':');
              if (parts.length === 3) {
                const hours = parseInt(parts[0]) || 0;
                const minutes = parseInt(parts[1]) || 0;
                const seconds = parseInt(parts[2]) || 0;
                nuevoValor = (hours * 3600 + minutes * 60 + seconds) * 1000;
                that.maxTiempoMs = nuevoValor;
              }
            }
            
            // Actualizar máximos manualmente (sin fecha)
            const stored = localStorage.getItem('podometro') || '{}';
            const data = JSON.parse(stored);
            
            if (!data.maximos) {
              data.maximos = {
                pasos: { valor: 0, fecha: null },
                distancia: { valor: 0, fecha: null },
                tiempo: { valor: 0, fecha: null }
              };
            }
            
            data.maximos[this.tipo] = { valor: nuevoValor, fecha: null }; // Sin fecha = manual
            localStorage.setItem('podometro', JSON.stringify(data));
            
            // Actualizar las propiedades del componente
            if (this.tipo === 'pasos') {
              that.maxPasosFecha = null;
            } else if (this.tipo === 'distancia') {
              that.maxDistanciaFecha = null;
            } else if (this.tipo === 'tiempo') {
              that.maxTiempoFecha = null;
            }
            
            that.calculateProgress();
            that.apply();
            this.close();
          };
          
          this.cancelar = function() {
            this.close();
          };
          
          this.updateValor = function(event) {
            this.valor = event.target.value;
          };
        },
        render: function() {
          return `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-white rounded-lg p-6 w-80 mx-4">
                <h3 class="text-lg font-semibold mb-4">${this.label}</h3>
                <input 
                  type="text" 
                  value="${this.valor}"
                  placeholder="${this.placeholder}"
                  class="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  oninput="updateValor(event)"
                />
                <div class="flex gap-3">
                  <button 
                    onclick="guardar()"
                    class="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Guardar
                  </button>
                  <button 
                    onclick="cancelar()"
                    class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          `;
        }
      });
    };
  },
  render: function () {
    return /* HTML */ `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap');
        .custom-font {
          font-family: 'Poppins', sans-serif;
        }
        .title-font {
          font-family: 'Oswald', sans-serif;
          text-transform: uppercase;
        }
      </style>
      
      <div class="min-h-screen custom-font flex flex-col items-center justify-center relative" style="background: linear-gradient(to bottom, rgba(30,60,114,0.8), rgba(42,82,152,0.8)); z-index: 10;">
        <!-- Header -->
        <div class="text-center mb-12">
          <h1 class="title-font text-5xl font-bold text-white mb-4">${this.saludo}</h1>  
          <p class="text-white text-opacity-80 text-lg font-light">${this.fecha}</p>
        </div>
        
        <!-- Rings -->
        <div class="relative flex items-center justify-center">
            <!-- Anillo exterior - Pasos -->
            <svg width="240" height="240" class="transform -rotate-90">
              <circle cx="120" cy="120" r="100" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
              <circle cx="120" cy="120" r="100" fill="none" stroke="#FF0080" stroke-width="16" 
                      stroke-dasharray="628" stroke-dashoffset="${this.dashoffsetPasos}" stroke-linecap="round"/>
            </svg>
            
            <!-- Anillo medio - Distancia -->
            <svg width="180" height="180" class="absolute top-7 left-7 transform -rotate-90">
              <circle cx="90" cy="90" r="70" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
              <circle cx="90" cy="90" r="70" fill="none" stroke="#7ED321" stroke-width="16" 
                      stroke-dasharray="440" stroke-dashoffset="${this.dashoffsetDistancia}" stroke-linecap="round"/>
            </svg>
            
            <!-- Anillo interior - Tiempo -->
            <svg width="120" height="120" class="absolute top-14 left-14 transform -rotate-90">
              <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
              <circle cx="60" cy="60" r="40" fill="none" stroke="#00D4FF" stroke-width="16" 
                      stroke-dasharray="251" stroke-dashoffset="${this.dashoffsetTiempo}" stroke-linecap="round"/>
            </svg>
        </div>
        
        <!-- Stats -->
        <div class="mt-12 px-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-xl font-bold text-white mb-1">${this.pasos.toLocaleString()}</div>
            <div class="text-white text-opacity-40 text-xs mb-2 flex items-center justify-center">
              <span class="mr-1">${this.maxPasos ? this.maxPasos.toLocaleString() : '0'}</span>
              <button onclick="editMaximos('pasos')" class="text-white text-opacity-60 hover:text-opacity-100 transition-opacity">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
            </div>
            <div class="text-white text-opacity-70 text-xs uppercase tracking-wide">Pasos</div>
          </div>
          <div>
            <div class="text-xl font-bold text-white mb-1">${this.distancia.toFixed(1)}</div>
            <div class="text-white text-opacity-40 text-xs mb-2 flex items-center justify-center">
              <span class="mr-1">${(this.maxDistancia || 0).toFixed(1)}</span>
              <button onclick="editMaximos('distancia')" class="text-white text-opacity-60 hover:text-opacity-100 transition-opacity">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
            </div>
            <div class="text-white text-opacity-70 text-xs uppercase tracking-wide">Km</div>
          </div>
          <div>
            <div class="text-lg font-bold text-white mb-1 font-mono">${this.formatTime(this.tiempoMs)}</div>
            <div class="text-white text-opacity-40 text-xs mb-2 flex items-center justify-center font-mono">
              <span class="mr-1">${this.formatTime(this.maxTiempoMs || 0)}</span>
              <button onclick="editMaximos('tiempo')" class="text-white text-opacity-60 hover:text-opacity-100 transition-opacity">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
            </div>
            <div class="text-white text-opacity-70 text-xs uppercase tracking-wide">Tiempo</div>
          </div>
        </div>
        
        <!-- Status -->
        <div class="mt-8 px-8 text-center">
          <div class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium" 
               style="background-color: ${this.getStatusColor()}; color: white;">
            <div class="w-2 h-2 rounded-full mr-2" 
                 style="background-color: ${this.getStatusDotColor()}; animation: ${this.estado === 'Caminando' ? 'pulse 2s infinite' : 'none'};"></div>
            ${this.estado || 'Iniciando...'}
          </div>
        </div>
        
        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
      </div>
    `;
  },
});

export default AppController;