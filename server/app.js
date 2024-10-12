// Importar dependencias
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

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

app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para actualizar el nombre de un archivo
// Ruta para actualizar el nombre de un archivo
app.post('/api/update', (req, res) => {
  console.log('Cuerpo de la solicitud:', req.body); // Verificar el cuerpo
  const { recursoName, oldFileName, newFileName } = req.body;

  // En este caso, no hacemos nada con el viejo o nuevo nombre
  // Solo devolvemos el nuevo nombre
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


//subida de archivos
app.post('/api/upload', upload.single('file'), (req, res) => {
  const title = req.body.title;
  const file = req.file;

  // Generar la URL del archivo subido
  const fileUrl = `http://localhost:3000/uploads/${file.filename}`;

  const extension = path.extname(file.originalname).toLowerCase();

  console.log('Archivo recibido:', file);
  console.log('Título:', title);
  
  // Enviar la URL y el nuevo nombre del archivo de vuelta al frontend
  res.send({ 
    message: 'Archivo subido exitosamente', 
    file: { 
      url: fileUrl,
      name: file.filename, //nombre para server
      originalName: req.file.originalname, //nombre a mostrar
      extension: extension //extension para icono
    }, 
    title 
  });
});



//eliminar apartado
app.delete('/api/delete/recurso/:id', (req, res) => {
  const recursoId = req.params.id;

  // Aquí es donde eliminarías los archivos relacionados con el recurso
  const recursoFolder = path.join(__dirname, 'uploads', `recurso_${recursoId}`);

  // Eliminar los archivos de la carpeta
  fs.rm(recursoFolder, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error(`Error al eliminar archivos del recurso ${recursoId}:`, err);
      return res.status(500).send({ message: 'Error al eliminar archivos del recurso' });
    }

    console.log(`Archivos del recurso ${recursoId} eliminados`);
    res.status(200).send({ message: 'Recurso y archivos eliminados correctamente' });
  });

  // Lógica para eliminar el recurso de la base de datos o del sistema de archivos
  // Aquí es donde podrías eliminar el recurso de una base de datos o eliminar los archivos subidos
  // Ejemplo:
  // db.deleteRecurso(recursoId)


});

//eliminar archivo
app.delete('/api/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  // Verificar si el archivo existe
  fs.stat(filePath, (err) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).send({ message: 'Archivo no encontrado' });
      }
      console.error('Error al acceder al archivo:', err);
      return res.status(500).send({ message: 'Error al acceder al archivo', error: err.message });
    }

    // Intentar eliminar el archivo
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error al eliminar el archivo:', err);
        return res.status(500).send({ message: 'Error al eliminar el archivo', error: err.message });
      }
      res.send({ message: 'Archivo eliminado exitosamente' });
    });
  });
});




// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

exports.api = functions.https.onRequest(app);