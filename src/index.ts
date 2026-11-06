import "dotenv/config";
import app from "./app";

const puerto = Number(process.env.PORT) || 3000;

app.listen(puerto, () => {
  console.log(`backend-api escuchando en el puerto ${puerto}`);
});