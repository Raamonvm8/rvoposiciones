const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Ruta para actualizar el nombre de un archivo
router.post('/update-file-name', (req, res) => {
    console.log('Cuerpo de la solicitud:', req.body); // Verificar el cuerpo
    const { oldFileName, newFileName } = req.body;

    if (!oldFileName || !newFileName) {
        return res.status(400).json({ error: 'oldFileName y newFileName son requeridos.' });
    }

  const oldFilePath = path.join(__dirname, 'uploads', oldFileName);
  const newFilePath = path.join(__dirname, 'uploads', newFileName);

  // Verificar si el archivo original existe
  if (fs.existsSync(oldFilePath)) {
    // Renombrar el archivo
    fs.rename(oldFilePath, newFilePath, (err) => {
      if (err) {
        console.error('Error al renombrar el archivo:', err);
        return res.status(500).json({ error: 'Error al renombrar el archivo' });
      }

      // Aquí podrías actualizar la base de datos si fuera necesario
      res.json({ message: 'Nombre del archivo actualizado correctamente', newFileName });
    });
  } else {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
});

// Exportar el router
module.exports = router;
