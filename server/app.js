

const express = require('express');
const admin = require('firebase-admin');
const serviceAccount = require('./config/rvoposiciones-firebase-admin.json');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: './config/.env' }); 


const app = express();
const port = 3000;

const mysql = require('mysql2/promise');

// Configuración MySQL
const db = mysql.createPool({
  host: 'localhost', //cambiar en produc
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: 8889 //cambiar en produccion (creo que 3306)
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);  // Obtener la extensión
    const baseName = path.basename(file.originalname, extension);  // Obtener el nombre base sin la extensión
    const timestamp = Date.now();  // Añadir una marca de tiempo para hacerlo único
    const uniqueName = `${baseName}_${timestamp}${extension}`;  // Nombre único para el servidor
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

const DATA_FILE = '../server/data.json';
const loadData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ recursos: [{ id: 1, name: "Recurso 1", archivos: [] }] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
};

// Función para guardar datos en el archivo JSON
const saveData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Cargar datos iniciales
let data = loadData();


app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json());
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


// Middleware para verificar token Firebase
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Verifica el token usando Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; // Información del usuario disponible en req.user
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
    // Inserta o actualiza usuario en MySQL
    await db.query(`
      INSERT INTO usuarios (uid, fullName, email, cursos, materiales, talleres, recursos, emailVerified, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        fullName = VALUES(fullName),
        email = VALUES(email),
        cursos = VALUES(cursos),
        materiales = VALUES(materiales),
        talleres = VALUES(talleres),
        recursos = VALUES(recursos),
        emailVerified = VALUES(emailVerified)
    `, [
      firebaseUser.uid,
      fullName,
      email,
      JSON.stringify(cursos),
      JSON.stringify(materiales),
      JSON.stringify(talleres),
      JSON.stringify(recursos),
      firebaseUser.emailVerified ? 1 : 0
    ]);


    res.json({ message: 'Usuario sincronizado en MySQL' });
  } catch (err) {
    console.error('Error guardando usuario en MySQL:', err);
    res.status(500).json({ message: 'Error guardando usuario en MySQL', error: err });
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


app.get('/api/data', (req, res) => {
  data = loadData(); 
  res.json(data);
});

// Ruta para actualizar el nombre de un archivo
app.post('/api/update', (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body);
  const { recursoName, oldFileName, newFileName } = req.body;

  // Buscar el recurso correspondiente
  const recurso = data.recursos.find(r => r.name === recursoName);
  if (!recurso) {
    return res.status(404).json({ message: 'Recurso no encontrado' });
  }

  // Buscar el archivo dentro del recurso
  let file = recurso.archivos.find(file => file.name === oldFileName);
  if (!file) {
    return res.status(404).json({ message: 'Archivo no encontrado' });
  }

  // Actualizar el nombre visible
  file.originalName = newFileName;
  saveData(data);

  res.json({ message: 'Nombre del archivo actualizado correctamente', newFileName });
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

app.post('/api/recurso', (req, res) => {
  const { name } = req.body;

  // Generar un nuevo ID único
  const newId = data.recursos.length > 0 ? Math.max(...data.recursos.map(r => r.id)) + 1 : 1;

  const nuevoRecurso = {
    id: newId,
    name: name || `Recurso ${newId}`,
    archivos: []
  };

  data.recursos.push(nuevoRecurso);
  saveData(data);

  res.json({ message: 'Recurso creado exitosamente', recurso: nuevoRecurso });
});



//subida de archivos
app.post('/api/upload/:recursoId', upload.single('file'), (req, res) => {
  const recursoId = parseInt(req.params.recursoId);
  const title = req.body.title;
  const file = req.file;

  // Verificar si el recurso existe
  let recurso = data.recursos.find(r => r.id === recursoId);
  if (!recurso) {
    return res.status(404).json({ message: "Recurso no encontrado" });
  }

  // Generar la URL del archivo subido
  const fileUrl = `http://localhost:3000/uploads/${file.filename}`;
  const extension = path.extname(file.originalname).toLowerCase();

  console.log('Archivo recibido:', file);
  console.log('Título:', title);

  // Agregar el archivo al recurso correcto
  recurso.archivos.push({
    url: fileUrl,
    name: file.filename,
    originalName: file.originalname,
    extension: extension,
    title: title
  });

  saveData(data);

  res.json({ 
    message: 'Archivo subido exitosamente', 
    file: recurso.archivos[recurso.archivos.length - 1] 
  });
});




//eliminar fichero en un recurso
app.delete('/api/delete/:recursoId/:filename', (req, res) => {
  const recursoId = parseInt(req.params.recursoId);
  const filename = req.params.filename;

  let recurso = data.recursos.find(r => r.id === recursoId);
  if (!recurso) {
    return res.status(404).json({ message: "Recurso no encontrado" });
  }

  const filePath = path.join(__dirname, 'uploads', filename);

  fs.stat(filePath, (err) => {
    if (err) {
      return res.status(404).json({ message: 'Archivo no encontrado' });
    }

    // Eliminar el archivo físicamente
    fs.unlink(filePath, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error al eliminar el archivo' });
      }

      // Eliminar el archivo del recurso correcto
      recurso.archivos = recurso.archivos.filter(file => file.name !== filename);
      saveData(data);

      res.json({ message: 'Archivo eliminado exitosamente' });
    });
  });
});


//eliminar archivo
app.delete('/api/recurso/:recursoId', (req, res) => {
  const recursoId = parseInt(req.params.recursoId);
  let recursoIndex = data.recursos.findIndex(r => r.id === recursoId);

  if (recursoIndex === -1) {
    return res.status(404).json({ message: "Recurso no encontrado" });
  }

  // Eliminar físicamente todos los archivos asociados al recurso
  const archivos = data.recursos[recursoIndex].archivos;
  archivos.forEach(archivo => {
    const filePath = path.join(__dirname, 'uploads', archivo.name);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Error al eliminar archivo ${archivo.name}:`, err);
      }
    });
  });

  // Eliminar el recurso de la lista
  data.recursos.splice(recursoIndex, 1);
  saveData(data);

  res.json({ message: "Recurso eliminado exitosamente" });
});





// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

//exports.api = functions.https.onRequest(app);