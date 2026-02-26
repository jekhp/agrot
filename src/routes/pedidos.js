import { Router } from 'express';
import { queryOne, queryAll } from '../db/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { store_slug, cliente_nombre, telefono, comunidad, notas, items, pago, nombre_yape } = req.body;
  if (!store_slug || !cliente_nombre || !telefono || !items?.length)
    return res.status(400).json({ error: 'Faltan datos del pedido' });

  const store = await queryOne('SELECT * FROM stores WHERE slug=$1', [store_slug]);
  if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });

  try {
    let total = 0;
    const enriched = [];
    for (const item of items) {
      const p = await queryOne('SELECT * FROM productos WHERE id=$1 AND store_id=$2', [item.producto_id, store.id]);
      if (!p) return res.status(400).json({ error: `Producto ${item.producto_id} no encontrado` });
      total += parseFloat(p.precio) * item.cantidad;
      enriched.push({ ...item, nombre: p.nombre, precio: parseFloat(p.precio) });
    }

    const tipoPago = pago === 'con_pago' ? 'con_pago' : 'sin_pago';
    const notaFinal = tipoPago === 'con_pago'
      ? `${notas ? notas + ' | ' : ''}💳 PAGADO por Yape`
      : notas || '';

    const pedido = await queryOne(
      `INSERT INTO pedidos (store_id,cliente_nombre,telefono,comunidad,notas,total,pago,nombre_yape,verificado_pago,estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pendiente') RETURNING *`,
      [store.id, cliente_nombre, telefono, comunidad, notaFinal, total,
       tipoPago, tipoPago === 'con_pago' ? (nombre_yape||'') : null,
       tipoPago === 'con_pago' ? 'pendiente' : null]
    );

    for (const item of enriched) {
      await queryOne(
        'INSERT INTO pedido_items (pedido_id,producto_id,nombre,precio,cantidad) VALUES ($1,$2,$3,$4,$5)',
        [pedido.id, item.producto_id, item.nombre, item.precio, item.cantidad]
      );
    }

    const pedidoItems = await queryAll('SELECT * FROM pedido_items WHERE pedido_id=$1', [pedido.id]);
    res.status(201).json({ pedido, items: pedidoItems, store });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', authMiddleware, async (req, res) => {
  const pedidos = await queryAll(
    'SELECT * FROM pedidos WHERE store_id=$1 ORDER BY created_at DESC', [req.admin.store_id]
  );
  const result = [];
  for (const p of pedidos) {
    const items = await queryAll('SELECT * FROM pedido_items WHERE pedido_id=$1', [p.id]);
    result.push({ ...p, items });
  }
  res.json(result);
});

router.put('/:id/estado', authMiddleware, async (req, res) => {
  const { estado } = req.body;
  if (!['pendiente','confirmado','listo','cancelado'].includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });
  const p = await queryOne('SELECT store_id FROM pedidos WHERE id=$1', [req.params.id]);
  if (!p || p.store_id !== req.admin.store_id) return res.status(403).json({ error: 'Sin permisos' });
  await queryOne('UPDATE pedidos SET estado=$1 WHERE id=$2 RETURNING id', [estado, req.params.id]);
  res.json({ ok: true });
});

router.put('/:id/verificar-pago', authMiddleware, async (req, res) => {
  const { verificado_pago } = req.body;
  if (!['verificado','rechazado','pendiente'].includes(verificado_pago))
    return res.status(400).json({ error: 'Estado inválido' });
  const p = await queryOne('SELECT store_id FROM pedidos WHERE id=$1', [req.params.id]);
  if (!p || p.store_id !== req.admin.store_id) return res.status(403).json({ error: 'Sin permisos' });
  await queryOne('UPDATE pedidos SET verificado_pago=$1 WHERE id=$2 RETURNING id', [verificado_pago, req.params.id]);
  res.json({ ok: true });
});

export default router;
