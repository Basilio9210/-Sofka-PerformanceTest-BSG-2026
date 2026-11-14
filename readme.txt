EJERCICIO 1 - PRUEBA DE CARGA DEL LOGIN (k6)
Servicio: POST https://fakestoreapi.com/auth/login

VERSIONES / REQUISITOS
- Sistema operativo : Windows 10/11 (tambien funciona en macOS y Linux)
- k6                : v2.4.0 (version usada en la ejecucion; para el reporte HTML
                      se requiere k6 0.49 o superior). Verificar con: k6 version
- Acceso a internet (la API y el modulo de resumen jslib.k6.io 0.0.2 se descargan al ejecutar)
- No requiere Node.js, Java ni Docker.

INSTALACION DE K6 (Windows)
  winget install k6 --source winget
(alternativa: instalador .msi desde https://k6.io/docs/get-started/installation/)
Cerrar y abrir de nuevo la terminal, y verificar:  k6 version

ESTRUCTURA
  login-load-test.js   script de la prueba (comentado paso a paso)
  data/users.csv       datos de entrada (user,passwd)
  reports/             resultados (textSummary.txt, summary.json, reporte-k6.html)
  conclusiones.txt     hallazgos y conclusiones

ESCENARIO
- Carga sostenida de 25 peticiones por segundo durante 3 minutos
  (executor constant-arrival-rate; el minimo exigido es 20 TPS).
- Usuarios leidos del CSV en forma rotativa.
- Criterios: p(95) < 1,5 s, tasa de error < 3%, checks > 97%, rendimiento >= 20 req/s.

PASOS DE EJECUCION (Windows CMD)
1. Abrir una terminal en la carpeta del ejercicio:
     cd ejercicio-1-k6-login
2. (Opcional) Prueba de humo rapida, 1 peticion por segundo durante 10 s.
   Es normal que en esta prueba falle el umbral de 20 req/s, porque solo envia 1:
     k6 run -e RATE=1 -e DURATION=10s login-load-test.js
3. Ejecutar la prueba completa y generar el reporte HTML:
     set K6_WEB_DASHBOARD=true
     set K6_WEB_DASHBOARD_EXPORT=reports\reporte-k6.html
     k6 run login-load-test.js
   (en PowerShell: $env:K6_WEB_DASHBOARD="true"; $env:K6_WEB_DASHBOARD_EXPORT="reports/reporte-k6.html")
   (en macOS/Linux: K6_WEB_DASHBOARD=true K6_WEB_DASHBOARD_EXPORT=reports/reporte-k6.html k6 run login-load-test.js)
4. Al terminar, revisar:
     reports\reporte-k6.html     reporte grafico (VUs y peticiones por segundo)
     reports\textSummary.txt     resumen de metricas
     reports\summary.json        datos completos

PARAMETROS OPCIONALES
  k6 run -e RATE=30 -e DURATION=5m login-load-test.js
  RATE = peticiones por segundo (por defecto 25) | DURATION = duracion (por defecto 3m)

INTERPRETACION DEL RESULTADO
- Si todos los umbrales se cumplen, k6 termina con codigo de salida 0 y muestra una
  marca verde junto a cada metrica con umbral.
- Si alguno se incumple, aparece una marca roja y el codigo de salida es 99.