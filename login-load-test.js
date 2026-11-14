// =============================================================================
// PRUEBA DE CARGA DEL SERVICIO DE LOGIN - fakestoreapi.com
// Herramienta: k6
//
// Un script de k6 tiene 4 partes. Aqui estan marcadas con numeros:
//   1) INIT       : codigo fuera de funciones. Corre UNA vez al arrancar.
//                   Aqui leemos el CSV y definimos imports.
//   2) OPTIONS    : "como" se ejecuta la prueba (carga, duracion, umbrales).
//   3) DEFAULT    : la funcion que cada usuario virtual ejecuta una y otra vez.
//   4) SUMMARY    : que hacer con los resultados al terminar.
// =============================================================================

import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// -----------------------------------------------------------------------------
// 1) INIT - Leer los datos de entrada desde el archivo CSV
// -----------------------------------------------------------------------------

const csv = open('./data/users.csv');


const users = csv
  .split(/\r?\n/)
  .slice(1)
  .filter((line) => line.trim() !== '')
  .map((line) => {
    const [user, passwd] = line.split(',');
    return { user: user.trim(), passwd: passwd.trim() };
  });

// Parametros que se pueden cambiar sin tocar el codigo:
//   k6 run -e RATE=25 -e DURATION=3m login-load-test.js
const RATE = Number(__ENV.RATE || 25);       // TPS objetivo (minimo exigido: 20)
const DURATION = __ENV.DURATION || '3m';     // duracion de la etapa de carga

// -----------------------------------------------------------------------------
// 2) OPTIONS - Escenario de carga y criterios de aceptacion
// -----------------------------------------------------------------------------

      // constant-arrival-rate = "llegan X peticiones por segundo, pase lo que pase".
      // Es lo que garantiza los TPS: k6 crea los usuarios virtuales que haga falta
      // para sostener la tasa, aunque el servidor se ponga lento.

export const options = {
  scenarios: {
    login_load: {
      executor: 'constant-arrival-rate',
      rate: RATE,                 // peticiones por unidad de tiempo
      timeUnit: '1s',             // ...por segundo => TPS
      duration: DURATION,
      preAllocatedVUs: 30,        // usuarios virtuales listos al inicio
      maxVUs: 150,                // tope si el servidor responde lento
    },
  },

  // Umbrales (thresholds): si alguno se incumple, k6 marca la prueba como FALLIDA.
  thresholds: {
    // Tiempo de respuesta: el 95% de las peticiones debe tardar menos de 1,5 s
    http_req_duration: ['p(95)<1500'],
    // Tasa de error aceptable: menos del 3% de peticiones fallidas
    http_req_failed: ['rate<0.03'],
    // Los checks (validaciones de abajo) deben pasar en mas del 97%
    checks: ['rate>0.97'],
    // Rendimiento: al menos 20 peticiones por segundo
    http_reqs: ['rate>=20'],
  },
};

// -----------------------------------------------------------------------------
// 3) DEFAULT - Lo que hace cada iteracion (1 iteracion = 1 login)
// -----------------------------------------------------------------------------


export default function () {
  // Reparte los 5 usuarios del CSV en orden rotativo (round-robin):
  // iteracion 0 -> usuario 0, iteracion 1 -> usuario 1, ... iteracion 5 -> usuario 0
  const credentials = users[exec.scenario.iterationInTest % users.length];

  // Mismo cuerpo del CURL: {"username": "...", "password": "..."}
  const payload = JSON.stringify({
    username: credentials.user,
    password: credentials.passwd,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s', // equivale a --max-time 60 del CURL
  };

  const res = http.post('https://fakestoreapi.com/auth/login', payload, params);

  // Validaciones. Cada check queda contado en la metrica "checks".
  check(res, {
    'status es 2xx': (r) => r.status >= 200 && r.status < 300,
    'responde con token': (r) => {
      try {
        return Boolean(r.json('token'));
      } catch (e) {
        return false; // el cuerpo no era JSON
      }
    },
    'tiempo de respuesta < 1,5 s': (r) => r.timings.duration < 1500,
  });
}

// -----------------------------------------------------------------------------
// 4) SUMMARY - Guardar el resumen al terminar
// -----------------------------------------------------------------------------

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'reports/textSummary.txt': textSummary(data, { indent: ' ', enableColors: false }),
    'reports/summary.json': JSON.stringify(data, null, 2),
  };
}
