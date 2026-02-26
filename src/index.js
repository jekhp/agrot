import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter      from './routes/auth.js';
import storesRouter    from './routes/stores.js';
import productosRouter from './routes/productos.js';
import pedidosRouter   from './routes/pedidos.js';

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL, /\.web\.app$/, /\.firebaseapp\.com$/].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth',      authRouter);
app.use('/api/stores',    storesRouter);
app.use('/api/productos', productosRouter);
app.use('/api/pedidos',   pedidosRouter);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', db: 'Supabase PostgreSQL', storage: 'Supabase Storage', time: new Date().toISOString() })
);

app.listen(PORT, () => {
  console.log(`\n🌿 Qollority Backend → http://localhost:${PORT}`);
  console.log(`   DB:      Supabase PostgreSQL`);
  console.log(`   Storage: Supabase Storage (bucket: qollority-images)\n`);
});
