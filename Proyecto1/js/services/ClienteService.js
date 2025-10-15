// Importar Cliente y ClienteRepository
import ClienteRepository from '../repository/ClienteRepository.js';
import PrestamoRepository from '../repository/PrestamoRepository.js';
import Cliente from '../models/Cliente.js';

// Firebase Storage imports removidos - usando almacenamiento base64 local

class ClienteService {
    constructor() {
        this.prestamosRepository = new PrestamoRepository()
        this.repository = new ClienteRepository();
    }

    capitalizeString(str) {
        if (!str || typeof str !== 'string' || !str.trim()) return '';

        const trimmed = str.trim();
        const normalized = trimmed.replace(/\s+/g, ' ');
        return normalized.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }

    // Validar nombre completo
    validateNombre(nombre) {
        if (!nombre || !nombre.trim()) {
            throw new Error('El nombre es requerido');
        }

        const nombreTrimmed = nombre.trim();
        const nombreRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
        if (!nombreRegex.test(nombreTrimmed)) {
            throw new Error('El nombre solo puede contener letras y espacios');
        }

        return this.capitalizeString(nombreTrimmed);
    }

    // Validar teléfono
    validateTelefono(telefono) {
        if (!telefono || !telefono.trim()) {
            throw new Error('El teléfono es requerido');
        }

        const telefonoTrimmed = telefono.trim();
        const telefonoRegex = /^\d+$/;
        if (!telefonoRegex.test(telefonoTrimmed)) {
            throw new Error('El teléfono solo puede contener números');
        }

        if (telefonoTrimmed.length !== 10) {
            throw new Error('El teléfono debe tener exactamente 10 dígitos');
        }

        return telefonoTrimmed;
    }

    // Validar RFC
    validateRFC(rfc) {
        if (!rfc || !rfc.trim()) {
            throw new Error('El RFC es requerido');
        }

        const rfcTrimmed = rfc.trim().toUpperCase();
        if (rfcTrimmed.length !== 13) {
            throw new Error('El RFC debe tener exactamente 13 caracteres para persona física');
        }

        const rfcRegex = /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/;
        if (!rfcRegex.test(rfcTrimmed)) {
            throw new Error('El RFC no tiene un formato válido. Ej. ABCD010101XXX');
        }

        return rfcTrimmed;
    }

    // Validar género
    validateGenero(genero) {
        if (!genero || !genero.trim()) {
            throw new Error('El género es requerido');
        }

        const generoTrimmed = genero.trim();
        const generosValidos = ['Masculino', 'Femenino'];

        if (!generosValidos.includes(generoTrimmed)) {
            throw new Error('El género debe ser Masculino o Femenino');
        }        return generoTrimmed;
    }

    // Subir imagen a Firebase Storage
    async subirImagen(file, clienteId) {
        if (!file) return null;

        // Validar tipo de archivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Tipo de archivo no válido. Solo se permiten JPG, PNG, GIF y WebP.');
        }

        // Validar tamaño (1MB máximo para almacenamiento local)
        const maxSize = 1 * 1024 * 1024; // 1MB en bytes (reducido para Firestore)
        if (file.size > maxSize) {
            throw new Error('El archivo es demasiado grande. Máximo 1MB para almacenamiento local.');
        }

        try {
            // Convertir archivo a base64 y redimensionar
            const base64Data = await this.convertirArchivoABase64(file);
            console.log('Imagen convertida a base64 exitosamente');
            return base64Data;
        } catch (error) {
            console.error('Error al procesar imagen:', error);
            throw new Error('Error al procesar la imagen: ' + error.message);
        }
    }

    async convertirArchivoABase64(file) {
        return new Promise((resolve, reject) => {
            // Crear imagen para redimensionar
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = function() {
                // Dimensiones máximas para optimizar el almacenamiento
                const maxWidth = 400;
                const maxHeight = 400;
                
                // Calcular nuevas dimensiones manteniendo proporción
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                // Configurar canvas
                canvas.width = width;
                canvas.height = height;

                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a base64 con compresión
                try {
                    const base64 = canvas.toDataURL('image/jpeg', 0.7); // 70% calidad
                    console.log('Base64 generado, tamaño:', base64.length, 'caracteres');
                    console.log('Formato de imagen:', base64.substring(0, 30));
                    resolve(base64);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Error al cargar la imagen'));

            // Cargar archivo
            const reader = new FileReader();
            reader.onload = (e) => img.src = e.target.result;
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsDataURL(file);
        });
    }

    // Eliminar imagen (no es necesario con almacenamiento local base64)
    async eliminarImagen(imagenUrl) {
        if (!imagenUrl) return;
        
        console.log('Eliminando referencia de imagen (almacenamiento local)');
        // Con almacenamiento base64 local, no hay archivos físicos que eliminar
        // La imagen se elimina automáticamente al actualizar el documento en Firestore
    }

    // Crear nuevo Cliente
    async createCliente(nombre, rfc, telefono, direccion, genero, imagenFile = null, firmaBase64 = null) {
        try {
            const clienteData = {
                nombre: this.validateNombre(nombre),
                rfc: this.validateRFC(rfc),
                telefono: this.validateTelefono(telefono),
                direccion: this.capitalizeString(direccion),
                genero: this.validateGenero(genero),
                fechaRegistro: new Date(),
            };

            // Agregar firma si existe
            if (firmaBase64) {
                clienteData.firma = firmaBase64;
                console.log('Agregando firma al cliente, tamaño:', firmaBase64.length, 'caracteres');
            }

            // Primero crear el cliente sin imagen
            const clienteId = await this.repository.add(clienteData);

            // Si hay imagen, procesarla y actualizar el cliente
            if (imagenFile) {
                console.log('Procesando imagen para cliente:', clienteId, imagenFile);
                const imagenBase64 = await this.subirImagen(imagenFile, clienteId);
                console.log('Imagen procesada a base64, tamaño:', imagenBase64?.length || 0, 'caracteres');
                await this.repository.update(clienteId, { imagenUrl: imagenBase64 });
                console.log('Cliente actualizado con imagen base64');
            }

            return clienteId;
        } catch (error) {
            throw error;
        }
    }

    // Obtener todos los Clientes
    async getAllClientes() {
        try {
            const clientesData = await this.repository.getAll();
            return clientesData.map(data => Cliente.fromFirestore({id: data.id, data: () => data}));
        } catch (error) {
            throw error;
        }
    }

    // Obtener cliente por ID
    async getClienteById(id) {
        try {
            const clienteData = await this.repository.getById(id);
            return Cliente.fromFirestore({id: clienteData.id, data: () => clienteData});
        } catch (error) {
            throw error;
        }
    }

    // Actualizar cliente
    async updateCliente(id, updates, imagenFile = null, firmaFile = null) {
        try {
            const validUpdates = {};
            if (updates.nombre !== undefined) validUpdates.nombre = this.validateNombre(updates.nombre);
            if (updates.rfc !== undefined) validUpdates.rfc = this.validateRFC(updates.rfc);
            if (updates.telefono !== undefined) validUpdates.telefono = this.validateTelefono(updates.telefono);
            if (updates.direccion !== undefined) validUpdates.direccion = this.capitalizeString(updates.direccion);
            if (updates.genero !== undefined) validUpdates.genero = this.validateGenero(updates.genero);
            
            // Manejar firma directamente (base64 o null para eliminar)
            if (updates.firma !== undefined) {
                validUpdates.firma = updates.firma;
            }

            // Si hay nueva imagen, procesarla y actualizar
            if (imagenFile) {
                // Obtener cliente actual para limpiar imagen anterior si existe
                const clienteActual = await this.getClienteById(id);
                if (clienteActual.imagenUrl) {
                    await this.eliminarImagen(clienteActual.imagenUrl);
                }
                
                // Procesar nueva imagen a base64
                const imagenBase64 = await this.subirImagen(imagenFile, id);
                validUpdates.imagenUrl = imagenBase64;
            }
            
            if (firmaFile) {
                const firmaBase64 = await this.subirImagen(firmaFile, id);
                validUpdates.firma = firmaBase64;
            }

            await this.repository.update(id, validUpdates);
        } catch (error) {
            throw error;
        }
    }

    // Validar si se puede eliminar el cliente (si tiene préstamos activos)
    async validarEliminarCliente(id) {
        const filtros = {
            estado: 'todos',
            clienteId: id
        };

        const prestamos = await this.prestamosRepository.getAll(filtros);

        if (prestamos === undefined) {
            throw new Error('Error al verificar préstamos del cliente');
        }

        if (prestamos.length > 0) {
            const tienePrestamosActivos = prestamos.some(prestamo => prestamo.estado === 'Activo' || prestamo.estado === 'Vencido');
            if (tienePrestamosActivos) {
                return { canDelete: false, message: 'No se puede eliminar el cliente porque tiene préstamos activos o vencidos.' };
            }
        }
        return { canDelete: true };
    }

    // Eliminar cliente
    async eliminarCliente(id) {
        try {
            await this.repository.delete(id);
        } catch (error) {
            throw error;
        }
    }

}

export default ClienteService;