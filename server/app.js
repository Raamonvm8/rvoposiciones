

const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./config/rvoposiciones-firebase-admin.json');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

require('dotenv').config({ path: './config/.env' }); 

const app = express();
const port = 3000;

//STRIPE
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const mysql = require('mysql2/promise');

// Configuración MySQL
const db = mysql.createPool({
  host: 'localhost', //cambiar en produc
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 8889 //cambiar en produccion (creo que 3306)
});

const uploadDir = path.join(__dirname, 'uploads', 'materiales');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    let baseName = path.basename(file.originalname, path.extname(file.originalname));
    const ext = path.extname(file.originalname);

    // remove illegal characters and normalize spaces
    baseName = baseName.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, '_');

    let finalName = baseName + ext;
    let counter = 0;

    // Check for existing files and append * symbols
    while (fs.existsSync(path.join(uploadDir, finalName))) {
      counter++;
      finalName = `${baseName}${'*'.repeat(counter)}${ext}`;
    }

    cb(null, finalName);
  }
});

const upload = multer({ storage });


app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook error:', err.message);
      return res.status(400).send(`Webhook Error`);
    }

    // ✅ Pago completado
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      const uid = paymentIntent.metadata.uid;
      const items = JSON.parse(paymentIntent.metadata.items);

      try {
        const [rows] = await db.query('SELECT materiales, talleres FROM usuarios WHERE uid = ?', [uid]);
        if (!rows.length) return;

        const normalizeArray = (value) => Array.isArray(value) ? value : JSON.parse(value || '[]');

        let materiales = normalizeArray(rows[0].materiales);
        let talleres = normalizeArray(rows[0].talleres);

        for (const item of items) {
          if (item.type === 'material' && !materiales.includes(item.uuid)) materiales.push(item.uuid);
          if (item.type === 'taller' && !talleres.includes(item.uuid)) talleres.push(item.uuid);
        }

        await db.query(
          'UPDATE usuarios SET materiales = ?, talleres = ? WHERE uid = ?',
          [JSON.stringify(materiales), JSON.stringify(talleres), uid]
        );

        console.log(`✅ Usuario ${uid} actualizado con materiales/talleres comprados`);

      } catch (err) {
        console.error('❌ Error actualizando usuario desde webhook:', err);
      }
    }


    res.json({ received: true });
  }
);

app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rvoposiciones.firebaseio.com"
});


app.get("/admin/users", async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios');
    res.json(rows);
  } catch (error) {
    console.error("Error listando usuarios:", error);
    res.status(500).send("Error obteniendo usuarios");
  }
});


const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verificando token Firebase:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
};


app.post('/api/users', verifyFirebaseToken, async (req, res) => {
  const firebaseUser = req.user; 
  const {
    fullName,
    email,
    cursos,
    materiales,
    talleres,
    recursos
  } = req.body;

  try {
    // actualizar usuario en MySQL
    const safeValue = (value, defaultValue) => value !== undefined ? value : defaultValue;

    await db.query(`
      INSERT INTO usuarios (uid, fullName, email, cursos, materiales, talleres, recursos, emailVerified, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        fullName = VALUES(fullName),
        email = VALUES(email),
        cursos = COALESCE(VALUES(cursos), cursos),
        materiales = COALESCE(VALUES(materiales), materiales),
        talleres = COALESCE(VALUES(talleres), talleres),
        recursos = COALESCE(VALUES(recursos), recursos),
        emailVerified = VALUES(emailVerified)
    `, [
      firebaseUser.uid,
      fullName,
      email,
      JSON.stringify(safeValue(cursos, { primaria: false, PT: false, secundaria: false })),
      JSON.stringify(safeValue(materiales, [])),
      JSON.stringify(safeValue(talleres, [])),
      JSON.stringify(safeValue(recursos, false)),
      firebaseUser.emailVerified ? 1 : 0
    ]);


    res.json({ message: 'Usuario sincronizado en MySQL' });
  } catch (err) {
    console.error('Error guardando usuario en MySQL:', err);
    res.status(500).json({ message: 'Error guardando usuario en MySQL', error: err });
  }
});


// Obtener usuario por UID
app.get('/api/users/:uid', async (req, res) => {
  const uid = req.params.uid;

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE uid = ?', [uid]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Convertir campos JSON de string a objeto
    const user = rows[0];
    ['cursos', 'materiales', 'talleres', 'recursos'].forEach(field => {
      if (user[field] && typeof user[field] === 'string') {
        try {
          user[field] = JSON.parse(user[field]);
        } catch (e) {
          console.error(`Error parseando ${field}:`, e);
          user[field] = [];
        }
      }
    });

    res.json(user);

  } catch (error) {
    console.error('Error obteniendo usuario por UID:', error);
    res.status(500).json({ message: 'Error obteniendo usuario', error });
  }
});

app.get('/api/me', verifyFirebaseToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    const [rows] = await db.query(
      'SELECT email, fullName, materiales, talleres, isAdmin FROM usuarios WHERE uid = ?',
      [uid]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error en /api/me:', err);
    res.status(500).json({ message: 'Error obteniendo usuario' });
  }
});


// Eliminar usuario
app.delete('/admin/users/:uid', async (req, res) => {
  const uid = req.params.uid;

  try {
    await admin.auth().deleteUser(uid);

    await db.query('DELETE FROM usuarios WHERE uid = ?', [uid]);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario', error });
  }
});

// Marcar usuario como verificado
app.post('/admin/users/:uid/verify', async (req, res) => {
  const uid = req.params.uid;
  try {
    await admin.auth().updateUser(req.params.uid, { emailVerified: true });
    await db.query('UPDATE usuarios SET emailVerified = ? WHERE uid = ?', [true, uid]);

    res.json({ message: 'Usuario marcado como verificado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al verificar usuario', error });
  }
});

// Actualizar datos 
app.put('/admin/users/:uid', async (req, res) => {
  try {
    const { displayName } = req.body;
    const user = await admin.auth().updateUser(req.params.uid, { displayName });
    res.json({ message: 'Usuario actualizado', user });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error });
  }
});



app.get('/', (req, res) => {
    res.send('¡Servidor ejecutándose correctamente!');
});

// Rutas de ejemplo
app.get('/api/saludo', (req, res) => {
  res.send('¡Hola desde el servidor backend!');
});

app.use((req, res, next) => {
  console.log(`Ruta solicitada: ${req.method} ${req.url}`);
  next();
});


// Ruta para el login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Validar las credenciales de prueba
    if (username === 'admin' && password === 'admin') {
        return res.json({ message: 'Login exitoso', user: { username } });
      } else {
        return res.status(401).json({ message: 'Credenciales incorrectas' });
      }
});

app.get('api/log', (req, res) => {
  res.send({
    usuario: username,
    passw: password
  });
});

app.post('/api/recurso', async (req, res) => {
  const { name, tipo, material_type } = req.body; // nuevo campo
  try {
    const [result] = await db.query(
      'INSERT INTO recursos (name, tipo, material_type) VALUES (?, ?, ?)', 
      [name, tipo, material_type || null]
    );
    const [recurso] = await db.query('SELECT * FROM recursos WHERE id = ?', [result.insertId]);
    res.json({ message: 'Recurso creado', recurso: recurso[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando recurso', error: err });
  }
});


app.get('/api/recursos', async (req, res) => {
  try {
    const [recursos] = await db.query('SELECT * FROM recursos');
    for (let r of recursos) {
      const [archivos] = await db.query('SELECT * FROM archivos WHERE recurso_id = ?', [r.id]);
      r.archivos = archivos;
    }
    res.json(recursos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo recursos', error: err });
  }
});

//subida de archivos
app.post('/api/upload/:recursoId', upload.single('file'), async (req, res) => {
  const recursoId = parseInt(req.params.recursoId);
  const title = req.body.title || null;
  const file = req.file;

  if (!file) return res.status(400).json({ message: 'No se subió archivo' });

  const fileUrl = `http://localhost:3000/uploads/materiales/${file.filename}`;
  const extension = path.extname(file.originalname).toLowerCase();

  try {
    // Insertar el archivo en la base de datos
    const [result] = await db.query(
      'INSERT INTO archivos (recurso_id, title, file_name, original_name, url, extension) VALUES (?, ?, ?, ?, ?, ?)',
      [recursoId, title, file.filename, file.originalname, fileUrl, extension]
    );

    // Traer el archivo insertado, asegurándonos de que tenga id y nombres correctos
    const [rows] = await db.query('SELECT id, recurso_id, title, file_name, original_name, url, extension FROM archivos WHERE id = ?', [result.insertId]);

    if (!rows.length) {
      return res.status(500).json({ message: 'Error al recuperar el archivo subido' });
    }

    // Enviar respuesta consistente para Angular
    const archivo = rows[0];
    res.json({ 
      message: 'Archivo subido', 
      file: {
        id: archivo.id,
        title: archivo.title,
        file_name: archivo.file_name,
        original_name: archivo.original_name,
        url: archivo.url,
        extension: archivo.extension
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error subiendo archivo', error: err });
  }
});

// Actualizar recurso
app.put('/api/recurso/:id', async (req, res) => {
  const id = req.params.id;
  const { name, material_type } = req.body;

  try {
    await db.query('UPDATE recursos SET name = ?, material_type = ? WHERE id = ?', [name, material_type || null, id]);
    const [rows] = await db.query('SELECT * FROM recursos WHERE id = ?', [id]);
    res.json({ message: 'Recurso actualizado', recurso: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando recurso', error: err });
  }
});




app.put('/api/archivo/:id', async (req, res) => {
  const { newName } = req.body;
  const id = req.params.id;
  try {
    await db.query('UPDATE archivos SET original_name = ? WHERE id = ?', [newName, id]);
    res.json({ message: 'Archivo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando archivo', error: err });
  }
});


//eliminar fichero en un recurso
app.delete('/api/archivo/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query('SELECT file_name FROM archivos WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Archivo no encontrado' });

    const fileName = rows[0].file_name;
    const filePath = path.join(__dirname, 'uploads', 'materiales', fileName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ File deleted: ${filePath}`);
    }
    
    await db.query('DELETE FROM archivos WHERE id = ?', [id]);

    res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando archivo', error: err });
  }
});



//eliminar recurso y sus archivos
app.delete('/api/recurso/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [archivos] = await db.query('SELECT file_name FROM archivos WHERE recurso_id = ?', [id]);
    
    for (let a of archivos) {
      const filePath = path.join(__dirname, 'uploads', 'materiales', a.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM recursos WHERE id = ?', [id]);
    res.json({ message: 'Recurso eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando recurso', error: err });
  }
});

// Obtener todos los materiales a la venta
app.get('/api/materiales', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM materiales_a_la_venta');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo materiales' });
  }
});

// Crear un nuevo material
app.post('/api/materiales', async (req, res) => {
  try {
    const uuid = crypto.randomUUID();
    const [result] = await db.query(
      'INSERT INTO materiales_a_la_venta (uuid, titulo, descripcion, img, price, visible) VALUES (?, ?, ?, ?, ?, ?)',
      [uuid, req.body.titulo, req.body.descripcion, req.body.img, req.body.price, req.body.visible]
    );

    res.json({
      id: result.insertId,
      uuid,
      ...req.body
    });
  } catch (error) {
    console.error('Error al crear material:', error);
    res.status(500).json({ error: 'Error al crear material' });
  }
});

// Actualizar un material
app.put('/api/materiales/:id', async (req, res) => {
  try {
    const { titulo, descripcion, img, price, visible } = req.body;
    const fields = [];
    const values = [];

    if (titulo !== undefined) { fields.push('titulo=?'); values.push(titulo); }
    if (descripcion !== undefined) { fields.push('descripcion=?'); values.push(descripcion); }
    if (img !== undefined) { fields.push('img=?'); values.push(img); }
    if (price !== undefined) { fields.push('price=?'); values.push(price); }
    if (visible !== undefined) { fields.push('visible=?'); values.push(visible); }

    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    values.push(req.params.id);

    await db.query(`UPDATE materiales_a_la_venta SET ${fields.join(', ')} WHERE id=?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando material' });
  }
});

// Eliminar un material
app.delete('/api/materiales/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM materiales_a_la_venta WHERE id=?', [id]);
    res.json({ message: 'Material eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando material', error: err });
  }
});

// Upload image for materiales
app.post('/api/materiales/upload/:id', upload.single('file'), async (req, res) => {
  try {
    const planId = req.params.id;
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

    // Get old image
    const [rows] = await db.query('SELECT img FROM materiales_a_la_venta WHERE id = ?', [planId]);
    if (rows.length && rows[0].img) {
      const oldImageUrl = rows[0].img;
      const oldFileName = path.basename(oldImageUrl);

      // Check if any other material is using this file
      const [usedElsewhere] = await db.query(
        'SELECT COUNT(*) as count FROM materiales_a_la_venta WHERE img LIKE ? AND id != ?',
        [`%${oldFileName}`, planId]
      );

      if (usedElsewhere[0].count === 0) {
        const oldFilePath = path.join(__dirname, 'uploads', 'materiales', oldFileName);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
    }

    const fileUrl = `http://localhost:3000/uploads/materiales/${req.file.filename}`;
    await db.query('UPDATE materiales_a_la_venta SET img = ? WHERE id = ?', [fileUrl, planId]);

    res.json({ url: fileUrl, file: req.file });

  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    res.status(500).json({ message: 'Error al subir imagen', error });
  }
});

// Upload image for talleres
app.post('/api/talleres/upload/:id', upload.single('file'), async (req, res) => {
  try {
    const planId = req.params.id;
    if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo' });

    // Get old image
    const [rows] = await db.query('SELECT img FROM talleres_a_la_venta WHERE id = ?', [planId]);
    if (rows.length && rows[0].img) {
      const oldImageUrl = rows[0].img;
      const oldFileName = path.basename(oldImageUrl);

      // Check if any other taller is using this file
      const [usedElsewhere] = await db.query(
        'SELECT COUNT(*) as count FROM talleres_a_la_venta WHERE img LIKE ? AND id != ?',
        [`%${oldFileName}`, planId]
      );

      if (usedElsewhere[0].count === 0) {
        const oldFilePath = path.join(__dirname, 'uploads', 'materiales', oldFileName);
        if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      }
    }

    const fileUrl = `http://localhost:3000/uploads/materiales/${req.file.filename}`;
    await db.query('UPDATE talleres_a_la_venta SET img = ? WHERE id = ?', [fileUrl, planId]);

    res.json({ url: fileUrl, file: req.file });

  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    res.status(500).json({ message: 'Error al subir imagen', error });
  }
});


// Guardar un correo de registro
app.post('/api/recolecta', async (req, res) => {
  const { nombre, correo } = req.body;

  if (!correo) return res.status(400).json({ message: 'El correo es obligatorio' });

  try {
    const [result] = await db.query(
      'INSERT IGNORE INTO recolecta_correos (nombre, correo) VALUES (?, ?)',
      [nombre || null, correo]
    );

    if (result.affectedRows === 0) {
      return res.status(200).json({ message: 'Correo ya registrado' });
    }

    res.status(201).json({ message: 'Correo registrado con éxito' });
  } catch (err) {
    console.error('Error guardando correo:', err);
    res.status(500).json({ message: 'Error guardando correo', error: err });
  }
});

// Exportar todos los correos separados por coma
app.get('/api/recolecta/export', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT correo FROM recolecta_correos');
    const correos = rows.map(r => r.correo).join(',');
    res.json({ correos }); 
  } catch (err) {
    console.error('Error exportando correos:', err);
    res.status(500).json({ message: 'Error exportando correos', error: err });
  }
});


// Obtener todos los talleres
app.get('/api/talleres', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM talleres_a_la_venta');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo talleres', error: err });
  }
});

// Crear un nuevo taller
app.post('/api/talleres', async (req, res) => {
  try {
    const uuid = crypto.randomUUID();
    const [result] = await db.query(
      'INSERT INTO talleres_a_la_venta (uuid, titulo, descripcion, img, price, visible, fecha) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid, req.body.titulo, req.body.descripcion, req.body.img, req.body.price, req.body.visible, req.body.fecha]
    );

    res.json({
      id: result.insertId,
      uuid,
      ...req.body
    });
  } catch (error) {
    console.error('Error al crear taller:', error);
    res.status(500).json({ error: 'Error al crear taller' });
  }
});

// Actualizar un taller
app.put('/api/talleres/:id', async (req, res) => {
  try {
    const { titulo, descripcion, img, price, visible, fecha } = req.body;
    const fields = [];
    const values = [];

    if (titulo !== undefined) { fields.push('titulo=?'); values.push(titulo); }
    if (descripcion !== undefined) { fields.push('descripcion=?'); values.push(descripcion); }
    if (img !== undefined) { fields.push('img=?'); values.push(img); }
    if (price !== undefined) { fields.push('price=?'); values.push(price); }
    if (visible !== undefined) { fields.push('visible=?'); values.push(visible); }
    if (fecha !== undefined) { fields.push('fecha=?'); values.push(fecha); } // <--- Agregar fecha

    if (fields.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    values.push(req.params.id);

    await db.query(`UPDATE talleres_a_la_venta SET ${fields.join(', ')} WHERE id=?`, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando taller', error: err });
  }
});


// Eliminar un taller
app.delete('/api/talleres/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM talleres_a_la_venta WHERE id=?', [id]);
    res.json({ message: 'Taller eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando taller', error: err });
  }
});


// Obtener todos los recursos de talleres
app.get('/api/recursos/talleres', async (req, res) => {
  try {
    const [recursos] = await db.query('SELECT * FROM recursos_talleres WHERE tipo = "taller"');
    for (let r of recursos) {
      const [archivos] = await db.query('SELECT * FROM archivos_talleres WHERE recurso_id = ?', [r.id]);
      r.archivos = archivos;
    }
    res.json(recursos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error obteniendo recursos de talleres', error: err });
  }
});

// Crear un recurso de taller
app.post('/api/recurso/talleres', async (req, res) => {
  const { name, material_type } = req.body; 
  try {
    const [result] = await db.query(
      'INSERT INTO recursos_talleres (name, tipo, material_type) VALUES (?, "taller", ?)', 
      [name, material_type || null]
    );
    const [recurso] = await db.query('SELECT * FROM recursos_talleres WHERE id = ?', [result.insertId]);
    res.json({ message: 'Recurso creado', recurso: recurso[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creando recurso', error: err });
  }
});

// Actualizar recurso de taller
app.put('/api/recurso/talleres/:id', async (req, res) => {
  const { name, material_type } = req.body;
  const id = req.params.id;
  try {
    await db.query('UPDATE recursos_talleres SET name = ?, material_type = ? WHERE id = ?', [name, material_type || null, id]);
    const [rows] = await db.query('SELECT * FROM recursos_talleres WHERE id = ?', [id]);
    res.json({ message: 'Recurso actualizado', recurso: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando recurso', error: err });
  }
});

// Eliminar recurso de taller y sus archivos
app.delete('/api/recurso/talleres/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [archivos] = await db.query('SELECT file_name FROM archivos_talleres WHERE recurso_id = ?', [id]);
    for (let a of archivos) {
      const filePath = path.join(__dirname, 'uploads', 'materiales', a.file_name);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.query('DELETE FROM recursos_talleres WHERE id = ?', [id]);
    res.json({ message: 'Recurso eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando recurso', error: err });
  }
});

// Subir archivo a recurso de taller
app.post('/api/upload/taller/:recursoId', upload.single('file'), async (req, res) => {
  const recursoId = parseInt(req.params.recursoId);
  const title = req.body.title || '';
  const file = req.file;

  if (!file) return res.status(400).json({ message: 'No se subió archivo' });

  const fileUrl = `http://localhost:3000/uploads/materiales/${file.filename}`;
  const extension = path.extname(file.originalname).toLowerCase();

  try {
    const [result] = await db.query(
      'INSERT INTO archivos_talleres (recurso_id, title, file_name, original_name, url, extension) VALUES (?, ?, ?, ?, ?, ?)',
      [recursoId, title, file.filename, file.originalname, fileUrl, extension]
    );

    const [rows] = await db.query('SELECT id, recurso_id, title, file_name, original_name, url, extension FROM archivos_talleres WHERE id = ?', [result.insertId]);
    const archivo = rows[0];

    res.json({ message: 'Archivo subido', file: archivo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error subiendo archivo', error: err });
  }
});

// Actualizar nombre de archivo
app.put('/api/archivo/talleres/:id', async (req, res) => {
  const { newName } = req.body;
  const id = req.params.id;
  try {
    await db.query('UPDATE archivos_talleres SET original_name = ? WHERE id = ?', [newName, id]);
    res.json({ message: 'Archivo actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error actualizando archivo', error: err });
  }
});

// Eliminar archivo de recurso de taller
app.delete('/api/archivo/talleres/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await db.query('SELECT file_name FROM archivos_talleres WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Archivo no encontrado' });

    const filePath = path.join(__dirname, 'uploads', 'materiales', rows[0].file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await db.query('DELETE FROM archivos_talleres WHERE id = ?', [id]);
    res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando archivo', error: err });
  }
});

app.post('/api/pagando', async (req, res) => {
  try {
    const { uid, items } = req.body;

    if (!uid || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // 1️⃣ Obtener usuario
    const [rows] = await db.query(
      'SELECT materiales, talleres FROM usuarios WHERE uid = ?',
      [uid]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // ✅ PARSEO CORRECTO (string | array | null)
    const normalizeArray = (value) => {
      if (Array.isArray(value)) return value;
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    let materiales = normalizeArray(rows[0].materiales);
    let talleres   = normalizeArray(rows[0].talleres);

    // 2️⃣ Añadir nuevas compras SIN borrar nada
    for (const item of items) {
      if (item.type === 'material' && !materiales.includes(item.uuid)) {
        materiales.push(item.uuid);
      }

      if (item.type === 'taller' && !talleres.includes(item.uuid)) {
        talleres.push(item.uuid);
      }
    }

    // 3️⃣ Guardar
    await db.query(
      'UPDATE usuarios SET materiales = ?, talleres = ? WHERE uid = ?',
      [
        JSON.stringify(materiales),
        JSON.stringify(talleres),
        uid
      ]
    );

    res.json({
      ok: true,
      materiales,
      talleres
    });

  } catch (err) {
    console.error('❌ Error en /api/pagando:', err);
    res.status(500).json({ error: 'Error procesando el pago' });
  }
});

//Pagos Stripe
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { items, uid } = req.body;

    const amount = items.reduce(
      (sum, item) => sum + Math.round(item.price * 100),
      0
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      payment_method_types: ['card'],
      metadata: {
        uid,
        items: JSON.stringify(items.map(i => ({
          uuid: i.uuid,
          type: i.type
        })))
      }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando pago' });
  }
});

//Admin Panel dar acceso o revokar en talleres

// Dar acceso a un taller
app.post('/admin/talleres/:uuid/grant', async (req, res) => {
  const { uuid } = req.params;
  const { email } = req.body;

  try {
    const [rows] = await db.query(
      'SELECT talleres FROM usuarios WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let talleresRaw = rows[0].talleres;
    let talleres = [];

    if (Array.isArray(talleresRaw)) {
      talleres = talleresRaw;
    } else if (typeof talleresRaw === 'string' && talleresRaw.trim() !== '') {
      try {
        const parsed = JSON.parse(talleresRaw);
        if (Array.isArray(parsed)) {
          talleres = parsed;
        } else {
          talleres = [parsed];
        }
      } catch {
        talleres = [talleresRaw];
      }
    }

    if (!talleres.includes(uuid)) {
      talleres.push(uuid);
    }

    await db.query(
      'UPDATE usuarios SET talleres = ? WHERE email = ?',
      [JSON.stringify(talleres), email]
    );

    res.json({
      message: 'Acceso concedido',
      talleres
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error otorgando acceso' });
  }
});


// Quitar acceso a un taller
app.post('/admin/talleres/:tallerId/revoke', async (req, res) => {
  const { email } = req.body;
  const { tallerId } = req.params;

  if (!email) {
    return res.status(400).json({ message: 'Email es obligatorio' });
  }

  try {
    const [rows] = await db.query(
      'SELECT talleres FROM usuarios WHERE email = ?',
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    let talleresRaw = rows[0].talleres;
    let talleres = [];

    if (Array.isArray(talleresRaw)) {
      talleres = talleresRaw;
    } else if (typeof talleresRaw === 'string' && talleresRaw.trim() !== '') {
      try {
        const parsed = JSON.parse(talleresRaw);
        if (Array.isArray(parsed)) {
          talleres = parsed;
        } else {
          talleres = [parsed];
        }
      } catch {
        talleres = [talleresRaw];
      }
    }

    // 🔥 Eliminar el taller
    const nuevosTalleres = talleres.filter(t => t !== tallerId);

    // Guardar solo si hubo cambio
    if (nuevosTalleres.length !== talleres.length) {
      await db.query(
        'UPDATE usuarios SET talleres = ? WHERE email = ?',
        [JSON.stringify(nuevosTalleres), email]
      );
    }

    res.json({ ok: true, talleres: nuevosTalleres });

  } catch (err) {
    console.error('Error en revokeAccess:', err);
    res.status(500).json({
      message: 'Error quitando acceso',
      error: err
    });
  }
});

function normalizeTalleres(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch {
      return [trimmed];
    }
  }

  return [];
}

app.get('/admin/talleres', async (req, res) => {
  try {
    const [talleres] = await db.query('SELECT * FROM talleres_a_la_venta');
    const [usuarios] = await db.query('SELECT * FROM usuarios');

    for (const taller of talleres) {
      taller.usuarios = [];

      for (const u of usuarios) {
        const userTalleres = normalizeTalleres(u.talleres);

        if (userTalleres.includes(taller.uuid)) {
          taller.usuarios.push({
            email: u.email,
            fullName: u.fullName,
            hasAccess: true
          });
        }
      }
    }

    res.json(talleres);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Error obteniendo talleres con usuarios',
      error: err
    });
  }
});


// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

//exports.api = functions.https.onRequest(app);