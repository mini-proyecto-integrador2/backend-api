import { io } from "socket.io-client";

const REALTIME = process.env.REALTIME_URL || "https://salon-estudio-realtime.onrender.com";
const API = process.env.API_URL || "http://localhost:3000/api";
const { TOKEN_1, TOKEN_2, SALA_A, SALA_B } = process.env;

let fallos = 0;
const verificar = (nombre, condicion, detalle = "") => {
  if (!condicion) fallos++;
  console.log(`${condicion ? "OK   " : "FALLA"} ${nombre}${detalle ? " -> " + detalle : ""}`);
};
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const emitir = (s, evento, datos) => new Promise((res) => s.emit(evento, datos, res));
const llamar = async (metodo, ruta, token) => {
  const r = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
const textos = (r) => (r.mensajes ?? []).map((m) => m.texto).join(", ");
const rango = (desde, hasta) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => `Mensaje ${desde + i}`).join(", ");

// El anfitrión envía 7 mensajes a la sala A por el servidor de tiempo real.
const socket = io(REALTIME, { auth: { token: TOKEN_1 }, transports: ["websocket"], reconnection: false, timeout: 60000 });
await new Promise((res, rej) => {
  socket.on("connect", res);
  socket.on("connect_error", rej);
});
await emitir(socket, "sala:unirse", { salaId: SALA_A });
for (let i = 1; i <= 7; i++) {
  await emitir(socket, "chat:mensaje", { texto: `Mensaje ${i}` });
  await esperar(30);
}
socket.close();

const ruta = `/salas/${SALA_A}/mensajes`;

// Paginación y orden cronológico.
const todos = await llamar("GET", ruta, TOKEN_1);
verificar("Por defecto trae los 7 mensajes, del más viejo al más nuevo", todos.status === 200 && textos(todos) === rango(1, 7) && todos.hayMas === false);
const p1 = await llamar("GET", `${ruta}?limite=3`, TOKEN_1);
verificar("Página 1 (limite=3): los 3 más recientes y hayMas", textos(p1) === rango(5, 7) && p1.hayMas === true, textos(p1));
const p2 = await llamar("GET", `${ruta}?limite=3&antes=${encodeURIComponent(p1.mensajes[0].enviado)}`, TOKEN_1);
verificar("Página 2 (antes): los 3 anteriores y hayMas", textos(p2) === rango(2, 4) && p2.hayMas === true, textos(p2));
const p3 = await llamar("GET", `${ruta}?limite=3&antes=${encodeURIComponent(p2.mensajes[0].enviado)}`, TOKEN_1);
verificar("Página 3: queda 1 mensaje y hayMas es false", textos(p3) === rango(1, 1) && p3.hayMas === false, textos(p3));
const grande = await llamar("GET", `${ruta}?limite=1000`, TOKEN_1);
verificar("limite=1000 se recorta al máximo y responde 200", grande.status === 200 && grande.mensajes.length === 7);

// Validaciones.
verificar("limite=0 rechazado", (await llamar("GET", `${ruta}?limite=0`, TOKEN_1)).status === 400);
verificar("limite=abc rechazado", (await llamar("GET", `${ruta}?limite=abc`, TOKEN_1)).status === 400);
verificar("antes=hola rechazado", (await llamar("GET", `${ruta}?antes=hola`, TOKEN_1)).status === 400);

// Permisos.
const noMiembro = await llamar("GET", ruta, TOKEN_2);
verificar("Quien no se unió recibe 403", noMiembro.status === 403 && noMiembro.error?.code === "FORBIDDEN");
await llamar("POST", `/salas/${SALA_A}/unirse`, TOKEN_2);
const miembro = await llamar("GET", ruta, TOKEN_2);
verificar("Tras unirse puede leer el historial", miembro.status === 200 && miembro.mensajes.length === 7);
verificar("Sin token responde 401", (await llamar("GET", ruta)).status === 401);
verificar("Sala inexistente responde 404", (await llamar("GET", "/salas/ZZZ-0000/mensajes", TOKEN_1)).status === 404);

// Historial vacío.
const vacio = await llamar("GET", `/salas/${SALA_B}/mensajes`, TOKEN_1);
verificar("Sala sin mensajes: lista vacía y hayMas false", vacio.status === 200 && vacio.mensajes?.length === 0 && vacio.hayMas === false);

console.log(fallos ? `\n${fallos} verificación(es) fallaron` : "\nTodo OK");
process.exit(fallos ? 1 : 0);