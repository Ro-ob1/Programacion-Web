class FormCliente {
    constructor(toast, showLoading, clienteService) {
        this.clienteService = clienteService;
        this.toast = toast;
        this.showLoading = showLoading;
        this.formCliente = document.getElementById("formCliente");
        this.tablaClientesBody = document.querySelector("#tablaClientes tbody");
        this.modalEditCliente = document.getElementById("modalEditarCliente");
        this.paginacionContainer = document.getElementById("paginacionClientes");

        this.listaClientesCompleta = [];
        this.listaClientesFiltrada = [];
        this.currentPage = 1;
        this.rowsPerPage = 5; // Puedes ajustar este valor
        this.clienteIdActual = null; // Para almacenar el ID del cliente actual
        this.datosClienteTemp = null; // Para almacenar datos temporales del cliente
        this.fotoCapturada = null; // Para almacenar la foto capturada
        this.videoStream = null; // Para manejar el stream de la cámara

        this.initEventListeners();
    }

    initEventListeners() {
        this.installEventRegistrarCliente();
        this.installEventShowModalEditarCliente();
        this.installEventEliminarCliente();
        this.installEventBuscarCliente();
        this.installEventGraficaGenero();
        this.installEventGenerarCredencial();
    }

    // RF01: Registrar nuevo cliente
    installEventRegistrarCliente() {
        this.formCliente.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Almacenar datos del formulario temporalmente
            this.datosClienteTemp = {
                nombre: document.getElementById("nombre").value,
                rfc: document.getElementById("rfc").value,
                telefono: document.getElementById("telefono").value,
                direccion: document.getElementById("direccion").value,
                genero: document.getElementById("genero").value
            };

            // Mostrar modal para capturar foto
            this.mostrarModalCapturarFoto();
        });

        // Configurar event listeners del modal de captura
        this.setupModalCapturarFoto();
    }

    // Cargar clientes y prepararlos para la paginación
    async cargarClientes() {
        try {
            this.showLoading(true);
            this.listaClientesCompleta = await this.clienteService.getAllClientes();
            this.listaClientesFiltrada = this.listaClientesCompleta;
            this.currentPage = 1;
            this.render();
            this.showLoading(false);
        } catch (error) {
            this.showLoading(false);
            this.toast.error("Error al cargar clientes\n" + error.message);
        }
    }

    // Renderiza la tabla y los controles de paginación
    render() {
        this.renderTable();
        this.renderPaginationControls();
    }

    // RF02: Mostrar lista paginada de clientes
    renderTable() {
        this.tablaClientesBody.innerHTML = "";

        if (this.listaClientesFiltrada.length === 0) {
            this.tablaClientesBody.innerHTML =
                '<tr><td colspan="7" style="text-align: center;">No hay clientes que coincidan con la búsqueda</td></tr>';
            return;
        }

        const startIndex = (this.currentPage - 1) * this.rowsPerPage;
        const endIndex = startIndex + this.rowsPerPage;
        const clientesPagina = this.listaClientesFiltrada.slice(
            startIndex,
            endIndex
        );

        clientesPagina.forEach((cliente) => {
            const fecha = cliente.fechaRegistro.toLocaleDateString("es-MX");
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${cliente.nombre}</td>
                <td>${cliente.rfc}</td>
                <td>${cliente.telefono}</td>
                <td>${cliente.direccion}</td>
                <td>${cliente.genero || 'No especificado'}</td>
                <td>${fecha}</td>
                <td class="acciones_customer">
                    <button type="button" class="btn btn-outline-success" onclick="editarCliente('${cliente.id}')">Editar</button>
                    <button type="button" class="btn btn-outline-danger" onclick="eliminarCliente('${cliente.id}')">Eliminar</button>
                    <button type="button" class="btn btn-outline-primary" onclick="generarCredencial('${cliente.id}')">Credencial</button>
                </td>
            `;
            this.tablaClientesBody.appendChild(row);
        });
    }

    renderPaginationControls() {
        this.paginacionContainer.innerHTML = "";
        const totalPages = Math.ceil(
            this.listaClientesFiltrada.length / this.rowsPerPage
        );

        if (totalPages <= 1) return; // No mostrar controles si solo hay una página

        const prevButton = document.createElement("button");
        prevButton.textContent = "Anterior";
        prevButton.className = "btn";
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener("click", () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        });

        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        pageInfo.className = "page-info";

        const nextButton = document.createElement("button");
        nextButton.textContent = "Siguiente";
        nextButton.className = "btn";
        nextButton.disabled = this.currentPage === totalPages;
        nextButton.addEventListener("click", () => {
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render();
            }
        });

        this.paginacionContainer.appendChild(prevButton);
        //Agrear un espacio entre los botones y el texto
        this.paginacionContainer.appendChild(document.createTextNode(" "));
        this.paginacionContainer.appendChild(pageInfo);
        this.paginacionContainer.appendChild(document.createTextNode(" "));
        this.paginacionContainer.appendChild(nextButton);
    }

    // RF03: Modificar datos de cliente
    installEventShowModalEditarCliente() {
        window.editarCliente = async (id) => {
            try {
                this.showLoading(true);
                const cliente = await this.clienteService.getClienteById(id);

                document.getElementById("editarClienteId").value = id;
                document.getElementById("editarNombre").value = cliente.nombre;
                document.getElementById("editarRfc").value = cliente.rfc;
                document.getElementById("editarTelefono").value = cliente.telefono;
                document.getElementById("editarDireccion").value = cliente.direccion;
                document.getElementById("editarGenero").value = cliente.genero || "";

                // Mostrar imagen actual si existe
                const imagenPreview = document.getElementById("imagenActualPreview");
                const imagenImg = document.getElementById("imagenActualImg");
                if (cliente.imagenUrl) {
                    imagenImg.src = cliente.imagenUrl;
                    imagenPreview.style.display = "block";
                } else {
                    imagenPreview.style.display = "none";
                }

                this.showLoading(false);
                this.modalEditCliente.style.display = "block";
            } catch (error) {
                this.showLoading(false);
                this.toast.error(
                    "Error al obtener cliente para editar\n" + error.message
                );
            }
        };

        const formEditarCliente = document.getElementById("formEditarCliente");
        const modalEditarCliente = document.getElementById("modalEditarCliente");
        const closeButton = modalEditarCliente.querySelector(".close-button");

        closeButton.addEventListener("click", () => {
            modalEditarCliente.style.display = "none";
        });
        window.addEventListener("click", (event) => {
            if (event.target === modalEditarCliente) {
                modalEditarCliente.style.display = "none";
            }
        });

        formEditarCliente.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("editarClienteId").value;
            const imagenFile = document.getElementById("editarImagenCliente").files[0];

            try {
                this.showLoading(true);
                await this.clienteService.updateCliente(id, {
                    nombre: document.getElementById('editarNombre').value,
                    telefono: document.getElementById('editarTelefono').value,
                    direccion: document.getElementById('editarDireccion').value,
                    genero: document.getElementById('editarGenero').value
                }, imagenFile);
                this.toast.success("Cliente actualizado exitosamente");
                modalEditarCliente.style.display = "none";

                await this.cargarClientes();
            } catch (error) {
                this.toast.error("Error al actualizar el cliente\n" + error.message);
            }finally {
                this.showLoading(false);
            }
        });
    }

    // RF04: Eliminar cliente
    installEventEliminarCliente() {
        const btnConfirmarEliminar = document.getElementById(
            "btnConfirmarEliminar"
        );
        const modalConfirmarEliminar = document.getElementById(
            "modalConfirmarEliminar"
        );
        const btnCancelarEliminar = document.getElementById("btnCancelarEliminar");
        let clienteAEliminarId = null;

        window.eliminarCliente = async (id) => {
            try {
                this.showLoading(true);
                const onDelete = await this.clienteService.validarEliminarCliente(id);

                if (!onDelete.canDelete){
                    this.toast.error(onDelete.message);
                    return;
                }

                clienteAEliminarId = id;
                modalConfirmarEliminar.style.display = "block";
            } catch (error) {
                this.toast.error("Error al intentar eliminar el cliente\n" + error.message);
            }finally {
                this.showLoading(false);
            }
        };

        btnCancelarEliminar.addEventListener("click", () => {
            modalConfirmarEliminar.style.display = "none";
        });

        btnConfirmarEliminar.addEventListener("click", async () => {
            if (clienteAEliminarId) {
                try {
                    await this.clienteService.eliminarCliente(clienteAEliminarId);
                    this.toast.success("Cliente eliminado exitosamente");
                    await this.cargarClientes(); // Recarga la lista
                } catch (error) {
                    this.toast.error("Error al eliminar el cliente\n" + error.message);
                }
                modalConfirmarEliminar.style.display = "none";
                clienteAEliminarId = null;
            }
        });
    }

    // RF05: Búsqueda de clientes
    installEventBuscarCliente() {
        const buscarClienteInput = document.getElementById("buscarClienteInput");

        buscarClienteInput.addEventListener("keyup", () => {
            const termino = buscarClienteInput.value.toLowerCase().trim();

            if (termino === "") {
                this.listaClientesFiltrada = this.listaClientesCompleta;
            } else {
                this.listaClientesFiltrada = this.listaClientesCompleta.filter(
                    (cliente) => {
                        const nombre = cliente.nombre.toLowerCase();
                        const rfc = cliente.rfc.toLowerCase();
                        return nombre.includes(termino) || rfc.includes(termino);
                    }
                );
            }

            this.currentPage = 1;
            this.render();
        });
    }

    imprimirClientesPDF() {
        const {jsPDF} = window.jspdf;
        const doc = new jsPDF();

        const tableColumn = ["Nombre", "RFC", "Teléfono", "Dirección", "Fecha Registro"];

        // --- Tabla desordenada (como está en listaClientesFiltrada) ---
        doc.text("Lista de Clientes", 20, 10);
        const tableRowsOriginal = [];
        this.listaClientesFiltrada.forEach(cliente => {
            const clienteData = [
                cliente.nombre,
                cliente.rfc,
                cliente.telefono,
                cliente.direccion,
                cliente.fechaRegistro.toLocaleDateString("es-MX")
            ];
            tableRowsOriginal.push(clienteData);
        });
        doc.autoTable(tableColumn, tableRowsOriginal, {startY: 20});

        // --- Tabla ordenada por nombre ---
        let lastY = doc.lastAutoTable.finalY || 20;
        doc.text("Lista de Clientes Ordenada", 20, lastY + 15);
        const clientesOrdenados = [...this.listaClientesFiltrada].sort((a, b) => a.nombre.localeCompare(b.nombre));
        const tableRowsOrdenados = [];
        clientesOrdenados.forEach(cliente => {
            const clienteData = [
                cliente.nombre,
                cliente.rfc,
                cliente.telefono,
                cliente.direccion,
                cliente.fechaRegistro.toLocaleDateString("es-MX")
            ];
            tableRowsOrdenados.push(clienteData);
        });
        doc.autoTable(tableColumn, tableRowsOrdenados, {startY: lastY + 20});

        const pdfOutput = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfOutput);

        const modalPdf = document.getElementById('modalPdf');
        const pdfViewer = document.getElementById('pdfViewer');

        pdfViewer.src = pdfUrl;
        modalPdf.style.display = 'block';

        const closeButton = modalPdf.querySelector(".close-button");
        closeButton.addEventListener("click", () => {
            modalPdf.style.display = "none";
        });

        window.addEventListener("click", (event) => {
            if (event.target === modalPdf) {
                modalPdf.style.display = "none";
            }
        });
    }

    installEventGraficaGenero() {
        const btnGraficaGenero = document.getElementById('btnGraficaGenero');
        if (btnGraficaGenero) {
            btnGraficaGenero.addEventListener('click', () => this.generarGraficaGenero());
        }
    }

    async generarGraficaGenero() {
        try {
            this.showLoading(true);
            
            // Obtener todos los clientes
            const clientes = await this.clienteService.getAllClientes();
            
            // Contar por género
            let masculino = 0;
            let femenino = 0;
            
            clientes.forEach(cliente => {
                if (cliente.genero === 'Masculino') {
                    masculino++;
                } else if (cliente.genero === 'Femenino') {
                    femenino++;
                }
            });

            // Crear canvas para la gráfica
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            // Crear gráfica
            const chart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Masculino', 'Femenino'],
                    datasets: [{
                        data: [masculino, femenino],
                        backgroundColor: ['#3498db', '#e74c3c'],
                        borderColor: ['#2980b9', '#c0392b'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    aspectRatio: 1,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                font: {
                                    size: 12
                                },
                                usePointStyle: true,
                                pointStyle: 'rect'
                            }
                        }
                    },
                    layout: {
                        padding: {
                            top: 10,
                            bottom: 40,
                            left: 50,
                            right: 50
                        }
                    },
                    elements: {
                        arc: {
                            borderWidth: 3
                        }
                    }
                }
            });

            // Esperar renderizado más tiempo
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Crear PDF
            const {jsPDF} = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(16);
            doc.text("Distribución por Género", 20, 20);
            
            doc.setFontSize(12);
            doc.text(`Masculino: ${masculino}`, 20, 40);
            doc.text(`Femenino: ${femenino}`, 20, 50);
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            doc.addImage(imgData, 'PNG', 25, 65, 160, 130);

            const pdfOutput = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfOutput);

            const modalPdf = document.getElementById('modalPdf');
            const pdfViewer = document.getElementById('pdfViewer');

            pdfViewer.src = pdfUrl;
            modalPdf.style.display = 'block';

            const closeButton = modalPdf.querySelector(".close-button");
            closeButton.addEventListener("click", () => {
                modalPdf.style.display = "none";
            });

            window.addEventListener("click", (event) => {
                if (event.target === modalPdf) {
                    modalPdf.style.display = "none";
                }
            });

            chart.destroy();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al generar gráfica de género:', error);
            this.showLoading(false);
            this.toast.error('Error al generar la gráfica de género: ' + error.message);
        }
    }

    // Event listener para generar credencial
    installEventGenerarCredencial() {
        // Exponer la función globalmente para que pueda ser llamada desde onclick
        window.generarCredencial = (clienteId) => {
            this.mostrarOpcionesCredencial(clienteId);
        };

        // Event listeners para los modales
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Modal de opciones
        const btnVerCredencial = document.getElementById('btnVerCredencial');
        const btnCambiarFoto = document.getElementById('btnCambiarFoto');
        
        if (btnVerCredencial) {
            btnVerCredencial.addEventListener('click', () => {
                const clienteId = this.clienteIdActual;
                this.cerrarModalOpciones();
                this.generarCredencialEstiloINE(clienteId);
            });
        }

        if (btnCambiarFoto) {
            btnCambiarFoto.addEventListener('click', () => {
                const clienteId = this.clienteIdActual;
                this.cerrarModalOpciones();
                this.mostrarModalCambiarFoto(clienteId);
            });
        }

        const btnCambiarFirma = document.getElementById('btnCambiarFirma');
        if (btnCambiarFirma) {
            btnCambiarFirma.addEventListener('click', () => {
                const clienteId = this.clienteIdActual;
                this.cerrarModalOpciones();
                this.mostrarModalCambiarFirma(clienteId);
            });
        }

        // Este form ya no se usa, ahora usamos los nuevos controles de cámara

        // Funciones globales para cerrar modales
        window.cerrarModalOpciones = () => this.cerrarModalOpciones();
        window.cerrarModalCambiarFoto = () => this.cerrarModalCambiarFoto();
        window.cerrarModalCambiarFirma = () => this.cerrarModalCambiarFirma();
    }

    mostrarOpcionesCredencial(clienteId) {
        this.clienteIdActual = clienteId;
        document.getElementById('modalOpcionesCredencial').style.display = 'block';
    }

    cerrarModalOpciones() {
        document.getElementById('modalOpcionesCredencial').style.display = 'none';
    }

    async mostrarModalCambiarFoto(clienteId) {
        try {
            const cliente = await this.clienteService.getClienteById(clienteId);
            document.getElementById('clienteIdFoto').value = clienteId;
            
            // Mostrar foto actual
            const fotoImg = document.getElementById('fotoActualImg');
            const fotoTexto = document.getElementById('fotoActualTexto');
            
            if (cliente.imagenUrl) {
                fotoImg.src = cliente.imagenUrl;
                fotoImg.style.display = 'block';
                fotoTexto.style.display = 'none';
            } else {
                fotoImg.style.display = 'none';
                fotoTexto.style.display = 'flex';
                fotoTexto.textContent = 'Sin foto';
            }
            
            // Reset áreas
            this.resetearModalCambiarFoto();
            
            // Configurar event listeners para cambiar foto
            this.configurarEventosCambiarFoto();
            
            document.getElementById('modalCambiarFoto').style.display = 'block';
        } catch (error) {
            this.toast.error('Error al cargar datos del cliente');
        }
    }

    resetearModalCambiarFoto() {
        // Ocultar todas las áreas
        document.getElementById('areaCameraNueva').style.display = 'none';
        document.getElementById('areaArchivoNueva').style.display = 'none';
        document.getElementById('previewNuevaFoto').style.display = 'none';
        
        // Detener cámara si está activa
        this.detenerCameraCambiarFoto();
        
        // Limpiar input de archivo
        const inputArchivo = document.getElementById('nuevaFotoCliente');
        if (inputArchivo) {
            inputArchivo.value = '';
        }
        
        // Limpiar preview
        const imgPreview = document.getElementById('imgPreviewNueva');
        if (imgPreview) {
            imgPreview.src = '';
        }
        
        this.nuevaFotoCapturada = null;
        this.videoStreamCambiarFoto = null;
    }

    configurarEventosCambiarFoto() {
        const btnTomarNuevaFoto = document.getElementById('btnTomarNuevaFoto');
        const btnSubirNuevaFoto = document.getElementById('btnSubirNuevaFoto');
        const btnCapturarNueva = document.getElementById('btnCapturarNueva');
        const btnCancelarCameraNueva = document.getElementById('btnCancelarCameraNueva');
        const btnConfirmarCambio = document.getElementById('btnConfirmarCambio');
        const btnCancelarCambio = document.getElementById('btnCancelarCambio');
        const nuevaFotoCliente = document.getElementById('nuevaFotoCliente');

        // Remover event listeners anteriores para evitar duplicados
        const newBtnTomarNuevaFoto = btnTomarNuevaFoto.cloneNode(true);
        btnTomarNuevaFoto.parentNode.replaceChild(newBtnTomarNuevaFoto, btnTomarNuevaFoto);
        
        const newBtnSubirNuevaFoto = btnSubirNuevaFoto.cloneNode(true);
        btnSubirNuevaFoto.parentNode.replaceChild(newBtnSubirNuevaFoto, btnSubirNuevaFoto);

        // Event listeners
        document.getElementById('btnTomarNuevaFoto').addEventListener('click', () => {
            this.iniciarCameraCambiarFoto();
        });
        
        document.getElementById('btnSubirNuevaFoto').addEventListener('click', () => {
            document.getElementById('areaArchivoNueva').style.display = 'block';
            document.getElementById('areaCameraNueva').style.display = 'none';
        });
        
        btnCapturarNueva?.addEventListener('click', () => this.capturarNuevaFoto());
        btnCancelarCameraNueva?.addEventListener('click', () => this.cancelarCameraCambiarFoto());
        btnConfirmarCambio?.addEventListener('click', () => this.confirmarCambioFoto());
        btnCancelarCambio?.addEventListener('click', () => this.resetearModalCambiarFoto());
        nuevaFotoCliente?.addEventListener('change', () => this.subirNuevaFotoArchivo());
    }

    async iniciarCameraCambiarFoto() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Su navegador no soporta acceso a la cámara');
            }

            const constraints = {
                video: {
                    width: { min: 320, ideal: 640, max: 1920 },
                    height: { min: 240, ideal: 480, max: 1080 },
                    facingMode: { ideal: 'user' },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            this.videoStreamCambiarFoto = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('videoCambiiFoto');
            if (video) {
                video.srcObject = this.videoStreamCambiarFoto;
                
                video.onloadedmetadata = () => {
                    video.play().catch(e => {
                        console.error('Error al reproducir video:', e);
                        this.toast.error('Error al iniciar la vista previa de la cámara');
                    });
                };
            }
            
            document.getElementById('areaCameraNueva').style.display = 'block';
            document.getElementById('areaArchivoNueva').style.display = 'none';
            
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            let mensaje = 'No se pudo acceder a la cámara.';
            
            if (error.name === 'NotAllowedError') {
                mensaje = 'Permiso de cámara denegado. Por favor, permita el acceso a la cámara en su navegador.';
            } else if (error.name === 'NotFoundError') {
                mensaje = 'No se encontró ninguna cámara física en el dispositivo.';
            } else if (error.name === 'NotReadableError') {
                mensaje = 'La cámara está siendo usada por otra aplicación. Cierre DroidCam u otras aplicaciones de cámara.';
            }
            
            this.toast.error(mensaje);
        }
    }

    capturarNuevaFoto() {
        const video = document.getElementById('videoCambiiFoto');
        const canvas = document.getElementById('canvasCambiarFoto');
        
        if (video && canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = 180;
            canvas.height = 240;
            
            // Dibujar el frame del video en el canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convertir a base64
            this.nuevaFotoCapturada = canvas.toDataURL('image/jpeg', 0.8);
            
            // Mostrar preview
            document.getElementById('imgPreviewNueva').src = this.nuevaFotoCapturada;
            document.getElementById('previewNuevaFoto').style.display = 'block';
            document.getElementById('areaCameraNueva').style.display = 'none';
            
            // Detener cámara
            this.detenerCameraCambiarFoto();
        }
    }

    subirNuevaFotoArchivo() {
        const input = document.getElementById('nuevaFotoCliente');
        const file = input.files[0];
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.nuevaFotoCapturada = e.target.result;
                document.getElementById('imgPreviewNueva').src = this.nuevaFotoCapturada;
                document.getElementById('previewNuevaFoto').style.display = 'block';
                document.getElementById('areaArchivoNueva').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    }

    async confirmarCambioFoto() {
        try {
            if (!this.nuevaFotoCapturada) {
                this.toast.error('No hay nueva foto seleccionada');
                return;
            }

            this.showLoading(true);
            const clienteId = document.getElementById('clienteIdFoto').value;
            
            // Convertir base64 a File
            const response = await fetch(this.nuevaFotoCapturada);
            const blob = await response.blob();
            const nuevaFoto = new File([blob], 'nueva_foto.jpg', { type: 'image/jpeg' });

            await this.clienteService.updateCliente(clienteId, {}, nuevaFoto);
            
            this.toast.success('Foto actualizada exitosamente');
            this.cerrarModalCambiarFoto();
            await this.cargarClientes();
            
        } catch (error) {
            console.error('Error al cambiar foto:', error);
            this.toast.error('Error al actualizar la foto: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    cancelarCameraCambiarFoto() {
        this.detenerCameraCambiarFoto();
        document.getElementById('areaCameraNueva').style.display = 'none';
    }

    detenerCameraCambiarFoto() {
        if (this.videoStreamCambiarFoto) {
            this.videoStreamCambiarFoto.getTracks().forEach(track => track.stop());
            this.videoStreamCambiarFoto = null;
        }
    }

    cerrarModalCambiarFoto() {
        this.detenerCameraCambiarFoto();
        document.getElementById('modalCambiarFoto').style.display = 'none';
        this.resetearModalCambiarFoto();
    }

    // === MÉTODOS PARA CAMBIAR FIRMA ===

    async mostrarModalCambiarFirma(clienteId) {
        try {
            const cliente = await this.clienteService.getClienteById(clienteId);
            document.getElementById('clienteIdFirma').value = clienteId;
            
            // Mostrar firma actual
            const firmaImg = document.getElementById('firmaActualImg');
            const firmaTexto = document.getElementById('firmaActualTexto');
            
            if (cliente.firma) {
                firmaImg.src = cliente.firma;
                firmaImg.style.display = 'block';
                firmaTexto.style.display = 'none';
            } else {
                firmaImg.style.display = 'none';
                firmaTexto.style.display = 'block';
                firmaTexto.textContent = 'Sin firma';
            }
            
            // Inicializar canvas de nueva firma
            this.inicializarCanvasNuevaFirma();
            
            // Configurar event listeners para cambiar firma
            this.configurarEventosCambiarFirma();
            
            document.getElementById('modalCambiarFirma').style.display = 'block';
        } catch (error) {
            this.toast.error('Error al cargar datos del cliente');
        }
    }

    inicializarCanvasNuevaFirma() {
        const canvas = document.getElementById('canvasNuevaFirma');
        const ctx = canvas.getContext('2d');
        
        // Configurar canvas
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let dibujando = false;
        
        // Eventos para mouse
        canvas.addEventListener('mousedown', (e) => {
            dibujando = true;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (!dibujando) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        });
        
        canvas.addEventListener('mouseup', () => {
            dibujando = false;
            ctx.closePath();
        });
        
        // Eventos para touch (móviles)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            dibujando = true;
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!dibujando) return;
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            ctx.lineTo(x, y);
            ctx.stroke();
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            dibujando = false;
            ctx.closePath();
        });
        
        // Almacenar referencia al canvas para uso posterior
        this.canvasNuevaFirma = canvas;
    }

    configurarEventosCambiarFirma() {
        const btnLimpiarNuevaFirma = document.getElementById('btnLimpiarNuevaFirma');
        const btnEliminarFirma = document.getElementById('btnEliminarFirma');
        const btnConfirmarNuevaFirma = document.getElementById('btnConfirmarNuevaFirma');
        const btnCancelarFirma = document.getElementById('btnCancelarFirma');

        // Remover event listeners anteriores para evitar duplicados
        const newBtnLimpiarNuevaFirma = btnLimpiarNuevaFirma.cloneNode(true);
        btnLimpiarNuevaFirma.parentNode.replaceChild(newBtnLimpiarNuevaFirma, btnLimpiarNuevaFirma);
        
        const newBtnEliminarFirma = btnEliminarFirma.cloneNode(true);
        btnEliminarFirma.parentNode.replaceChild(newBtnEliminarFirma, btnEliminarFirma);

        const newBtnConfirmarNuevaFirma = btnConfirmarNuevaFirma.cloneNode(true);
        btnConfirmarNuevaFirma.parentNode.replaceChild(newBtnConfirmarNuevaFirma, btnConfirmarNuevaFirma);

        const newBtnCancelarFirma = btnCancelarFirma.cloneNode(true);
        btnCancelarFirma.parentNode.replaceChild(newBtnCancelarFirma, btnCancelarFirma);

        // Event listeners
        document.getElementById('btnLimpiarNuevaFirma').addEventListener('click', () => {
            this.limpiarCanvasNuevaFirma();
        });
        
        document.getElementById('btnEliminarFirma').addEventListener('click', () => {
            this.eliminarFirmaCliente();
        });
        
        document.getElementById('btnConfirmarNuevaFirma').addEventListener('click', () => {
            this.confirmarCambioFirma();
        });
        
        document.getElementById('btnCancelarFirma').addEventListener('click', () => {
            this.cerrarModalCambiarFirma();
        });
    }

    limpiarCanvasNuevaFirma() {
        if (this.canvasNuevaFirma) {
            const ctx = this.canvasNuevaFirma.getContext('2d');
            ctx.clearRect(0, 0, this.canvasNuevaFirma.width, this.canvasNuevaFirma.height);
        }
    }

    async eliminarFirmaCliente() {
        try {
            const confirmacion = confirm('¿Está seguro de que desea eliminar la firma del cliente? Esta acción no se puede deshacer.');
            if (!confirmacion) return;

            this.showLoading(true);
            const clienteId = document.getElementById('clienteIdFirma').value;
            
            // Actualizar cliente eliminando la firma
            await this.clienteService.updateCliente(clienteId, { firma: null });
            
            this.toast.success('Firma eliminada exitosamente');
            this.cerrarModalCambiarFirma();
            await this.cargarClientes();
            
        } catch (error) {
            console.error('Error al eliminar firma:', error);
            this.toast.error('Error al eliminar la firma: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async confirmarCambioFirma() {
        try {
            if (!this.canvasNuevaFirma) {
                this.toast.error('Error: Canvas de firma no disponible');
                return;
            }

            // Verificar si hay algo dibujado en el canvas
            const canvas = this.canvasNuevaFirma;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let hasDrawing = false;
            
            // Verificar si hay píxeles no blancos
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
                    hasDrawing = true;
                    break;
                }
            }

            if (!hasDrawing) {
                this.toast.error('Por favor, dibuje una firma antes de confirmar');
                return;
            }

            this.showLoading(true);
            const clienteId = document.getElementById('clienteIdFirma').value;
            
            // Capturar firma como base64
            const firmaBase64 = canvas.toDataURL('image/png');
            
            // Actualizar cliente con nueva firma
            await this.clienteService.updateCliente(clienteId, { firma: firmaBase64 });
            
            this.toast.success('Firma actualizada exitosamente');
            this.cerrarModalCambiarFirma();
            await this.cargarClientes();
            
        } catch (error) {
            console.error('Error al cambiar firma:', error);
            this.toast.error('Error al actualizar la firma: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    cerrarModalCambiarFirma() {
        document.getElementById('modalCambiarFirma').style.display = 'none';
        this.canvasNuevaFirma = null;
    }

    async generarCredencialEstiloINE(clienteId) {
        try {
            this.showLoading(true);
            
            // Obtener datos del cliente
            const cliente = await this.clienteService.getClienteById(clienteId);
            console.log('Datos del cliente para credencial:', {
                id: cliente.id,
                nombre: cliente.nombre,
                tieneImagen: !!cliente.imagenUrl,
                tipoImagen: cliente.imagenUrl ? (cliente.imagenUrl.startsWith('data:image/') ? 'base64' : 'url') : 'ninguna',
                tamañoImagen: cliente.imagenUrl ? cliente.imagenUrl.length : 0
            });
            
            if (cliente.imagenUrl) {
                console.log('Primera parte de la imagen:', cliente.imagenUrl.substring(0, 100));
            }
            
            // Crear PDF de credencial estilo INE
            const {jsPDF} = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [85.6, 53.98] // Tamaño de tarjeta de crédito estándar
            });

            // Fondo degradado estilo INE (verde-rosa)
            doc.setFillColor(220, 240, 220); // Verde muy claro
            doc.rect(0, 0, 85.6, 53.98, 'F');

            // Franja superior verde
            doc.setFillColor(34, 139, 34); // Verde INE
            doc.rect(0, 0, 85.6, 8);

            // Texto "ESTADOS UNIDOS MEXICANOS" estilo
            doc.setFontSize(6);
            doc.setTextColor(255, 255, 255);
            doc.setFont(undefined, 'bold');
            doc.text('CRÉDITO FÁCIL - ESTADOS UNIDOS MEXICANOS', 42.8, 5, { align: 'center' });

            // Escudo/Logo area (simulado)
            doc.setFillColor(200, 200, 200);
            doc.circle(15, 15, 3, 'F');
            doc.setFillColor(34, 139, 34);
            doc.circle(15, 15, 2, 'F');

            // Texto "CREDENCIAL PARA VOTAR" estilo
            doc.setFontSize(7);
            doc.setTextColor(34, 139, 34);
            doc.setFont(undefined, 'bold');
            doc.text('CREDENCIAL DE CLIENTE', 42.8, 12, { align: 'center' });

            // Área de foto más grande estilo INE
            const fotoX = 5, fotoY = 16, fotoW = 18, fotoH = 20; // Reducir altura para hacer espacio a la firma
            
            if (cliente.imagenUrl) {
                try {
                    console.log('Procesando imagen para PDF:', cliente.imagenUrl.substring(0, 50) + '...');
                    
                    // Validar que la imagen esté en formato base64
                    if (!cliente.imagenUrl.startsWith('data:image/')) {
                        throw new Error('La imagen no está en formato base64 válido');
                    }
                    
                    // Convertir la imagen base64 a un formato compatible con jsPDF
                    const imagenParaPDF = await this.prepararImagenParaPDF(cliente.imagenUrl);
                    
                    // Agregar imagen al PDF
                    doc.addImage(imagenParaPDF, 'JPEG', fotoX, fotoY, fotoW, fotoH);
                    console.log('Imagen agregada exitosamente al PDF');
                } catch (error) {
                    console.error('Error al agregar imagen al PDF:', error);
                    console.error('Detalles del error:', error.message);
                    this.toast.error('No se pudo cargar la imagen en la credencial: ' + error.message);
                    
                    // Placeholder si falla la imagen
                    doc.setFillColor(230, 230, 230);
                    doc.rect(fotoX, fotoY, fotoW, fotoH, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(8);
                    doc.text('FOTO', fotoX + fotoW/2, fotoY + fotoH/2, { align: 'center' });
                }
            } else {
                // Placeholder
                doc.setFillColor(230, 230, 230);
                doc.rect(fotoX, fotoY, fotoW, fotoH, 'F');
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(8);
                doc.text('FOTO', fotoX + fotoW/2, fotoY + fotoH/2, { align: 'center' });
            }

            // Borde de la foto
            doc.setDrawColor(34, 139, 34);
            doc.setLineWidth(0.5);
            doc.rect(fotoX, fotoY, fotoW, fotoH);

            // Área de firma debajo de la foto
            const firmaX = fotoX, firmaY = fotoY + fotoH + 2, firmaW = fotoW, firmaH = 8;
            
            if (cliente.firma) {
                try {
                    console.log('Procesando firma para PDF:', cliente.firma.substring(0, 50) + '...');
                    
                    // Validar que la firma esté en formato base64
                    if (!cliente.firma.startsWith('data:image/')) {
                        throw new Error('La firma no está en formato base64 válido');
                    }
                    
                    // Agregar firma al PDF
                    doc.addImage(cliente.firma, 'PNG', firmaX, firmaY, firmaW, firmaH);
                    console.log('Firma agregada exitosamente al PDF');
                } catch (error) {
                    console.error('Error al agregar firma al PDF:', error);
                    
                    // Placeholder si falla la firma
                    doc.setFillColor(255, 255, 255);
                    doc.rect(firmaX, firmaY, firmaW, firmaH, 'F');
                    doc.setTextColor(100, 100, 100);
                    doc.setFontSize(6);
                    doc.text('FIRMA', firmaX + firmaW/2, firmaY + firmaH/2, { align: 'center' });
                }
            } else {
                // Placeholder para firma
                doc.setFillColor(255, 255, 255);
                doc.rect(firmaX, firmaY, firmaW, firmaH, 'F');
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.rect(firmaX, firmaY, firmaW, firmaH);
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(6);
                doc.text('FIRMA', firmaX + firmaW/2, firmaY + firmaH/2, { align: 'center' });
            }

            // Borde de la firma
            doc.setDrawColor(34, 139, 34);
            doc.setLineWidth(0.3);
            doc.rect(firmaX, firmaY, firmaW, firmaH);

            // Datos del cliente estilo INE
            const datosX = 26;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(5);
            doc.setFont(undefined, 'bold');

            // NOMBRE
            doc.text('NOMBRE:', datosX, 19);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(6);
            doc.text(cliente.nombre.toUpperCase(), datosX, 22);

            // DOMICILIO
            doc.setFontSize(5);
            doc.setFont(undefined, 'bold');
            doc.text('DOMICILIO:', datosX, 26);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(5);
            const direccionCorta = cliente.direccion.length > 30 ? 
                cliente.direccion.substring(0, 30) + '...' : cliente.direccion;
            doc.text(direccionCorta.toUpperCase(), datosX, 29);

            // RFC
            doc.setFont(undefined, 'bold');
            doc.text('RFC:', datosX, 33);
            doc.setFont(undefined, 'normal');
            doc.text(cliente.rfc.toUpperCase(), datosX, 36);

            // FOLIO (ID Cliente)
            doc.setFont(undefined, 'bold');
            doc.text('FOLIO:', datosX, 40);
            doc.setFont(undefined, 'normal');
            doc.text(cliente.id.toUpperCase(), datosX, 43);

            // Parte inferior derecha - datos adicionales
            const infoX = 55;
            doc.setFontSize(4);
            doc.setFont(undefined, 'bold');
            doc.text('TELÉFONO:', infoX, 19);
            doc.setFont(undefined, 'normal');
            doc.text(cliente.telefono, infoX, 22);

            doc.setFont(undefined, 'bold');
            doc.text('GÉNERO:', infoX, 26);
            doc.setFont(undefined, 'normal');
            doc.text(cliente.genero || 'NO ESPECIFICADO', infoX, 29);

            doc.setFont(undefined, 'bold');
            doc.text('REGISTRO:', infoX, 33);
            doc.setFont(undefined, 'normal');
            doc.text(cliente.fechaRegistro.toLocaleDateString('es-MX'), infoX, 36);

            // Código de barras simulado
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            for (let i = 0; i < 20; i++) {
                const x = 30 + (i * 1.5);
                const altura = Math.random() > 0.5 ? 3 : 2;
                doc.line(x, 47, x, 47 + altura);
            }

            // Texto de validez
            doc.setFontSize(3);
            doc.setTextColor(100, 100, 100);
            doc.text('VÁLIDA HASTA: 2030', 5, 51);
            doc.text('CRÉDITO FÁCIL 2025', 65, 51);

            // Borde exterior
            doc.setDrawColor(34, 139, 34);
            doc.setLineWidth(0.8);
            doc.rect(1, 1, 83.6, 51.98);

            // Mostrar PDF en iframe
            const pdfOutput = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfOutput);

            const modalPdf = document.getElementById('modalPdf');
            const pdfViewer = document.getElementById('pdfViewer');

            pdfViewer.src = pdfUrl;
            modalPdf.style.display = 'block';

            const closeButton = modalPdf.querySelector(".close-button");
            closeButton.addEventListener("click", () => {
                modalPdf.style.display = "none";
            });

            window.addEventListener("click", (event) => {
                if (event.target === modalPdf) {
                    modalPdf.style.display = "none";
                }
            });

            this.showLoading(false);
            
        } catch (error) {
            console.error('Error al generar credencial:', error);
            this.showLoading(false);
            this.toast.error('Error al generar la credencial: ' + error.message);
        }
    }

    // Método auxiliar para dibujar placeholder de foto
    dibujarPlaceholderFoto(doc) {
        doc.setFillColor(200, 200, 200);
        doc.rect(68, 18, 15, 20, 'F');
        doc.setDrawColor(150, 150, 150);
        doc.rect(68, 18, 15, 20);
        
        // Texto en el placeholder
        doc.setFontSize(4);
        doc.setTextColor(100, 100, 100);
        doc.text('FOTO', 75.5, 28, { align: 'center' });
    }

    // === MÉTODOS PARA CAPTURA DE FOTO ===

    async mostrarModalCapturarFoto() {
        // Verificar que tenemos los datos temporales
        if (!this.datosClienteTemp) {
            this.toast.error('Error: No se pudieron obtener los datos del formulario');
            return;
        }

        this.fotoCapturada = null;
        document.getElementById('modalCapturarFoto').style.display = 'block';
        this.resetearModalCaptura();
        

    }





    async prepararImagenParaPDF(imagenBase64) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Preparando imagen para PDF...');
                
                // Crear una imagen temporal para validar y reprocessar
                const img = new Image();
                
                img.onload = function() {
                    try {
                        // Crear canvas para reprocessar la imagen
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        // Establecer dimensiones apropiadas para la credencial
                        const targetWidth = 180;
                        const targetHeight = 240;
                        
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        
                        // Dibujar la imagen redimensionada
                        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                        
                        // Convertir a base64 con formato específico para jsPDF
                        const imagenProcesada = canvas.toDataURL('image/jpeg', 0.9);
                        
                        console.log('Imagen procesada para PDF, tamaño:', imagenProcesada.length);
                        resolve(imagenProcesada);
                        
                    } catch (canvasError) {
                        console.error('Error al procesar imagen en canvas:', canvasError);
                        reject(canvasError);
                    }
                };
                
                img.onerror = function(error) {
                    console.error('Error al cargar imagen base64:', error);
                    reject(new Error('No se pudo cargar la imagen base64'));
                };
                
                // Cargar la imagen base64
                img.src = imagenBase64;
                
            } catch (error) {
                console.error('Error general al preparar imagen:', error);
                reject(error);
            }
        });
    }

    async convertirImagenABase64(imageUrl) {
        // Ahora las imágenes ya están en base64, solo necesitamos devolverlas
        if (imageUrl.startsWith('data:image/')) {
            console.log('La imagen ya está en formato base64');
            return imageUrl;
        }
        
        // Si por alguna razón no es base64, intentar convertir (no debería pasar)
        try {
            console.log('Intentando convertir imagen que no es base64:', imageUrl);
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            
        } catch (error) {
            console.error('Error al convertir imagen:', error);
            throw error;
        }
    }

    setupModalCapturarFoto() {
        const btnTomarFoto = document.getElementById('btnTomarFoto');
        const btnSubirArchivo = document.getElementById('btnSubirArchivo');
        const btnSinFoto = document.getElementById('btnSinFoto');
        const btnCapturar = document.getElementById('btnCapturar');
        const btnCancelarCamera = document.getElementById('btnCancelarCamera');
        const btnContinuarFirma = document.getElementById('btnContinuarFirma');
        const btnRetomarFoto = document.getElementById('btnRetomarFoto');
        const btnLimpiarFirma = document.getElementById('btnLimpiarFirma');
        const btnSinFirma = document.getElementById('btnSinFirma');
        const btnFinalizarRegistro = document.getElementById('btnFinalizarRegistro');
        const btnVolverFoto = document.getElementById('btnVolverFoto');
        const archivoFoto = document.getElementById('archivoFoto');
        const btnExportarPDF = document.getElementById('btnExportarPDF');

        // Funciones globales para cerrar modal
        window.cerrarModalCapturarFoto = () => this.cerrarModalCapturarFoto();

        // Event listeners
        btnTomarFoto?.addEventListener('click', () => {
            document.getElementById('areaCamera').style.display = 'block';
            window.abrirCamara();
        });
        
        btnSinFoto?.addEventListener('click', () => {
            window.fotoClienteBase64 = null;
            this.mostrarAreaFirma();
        });
        
        btnCapturar?.addEventListener('click', () => window.capturarFoto());
        
        btnCancelarCamera?.addEventListener('click', () => {
            document.getElementById('areaCamera').style.display = 'none';
        });
        
        btnContinuarFirma?.addEventListener('click', () => this.mostrarAreaFirma());
        btnRetomarFoto?.addEventListener('click', () => this.volverAFoto());
        btnLimpiarFirma?.addEventListener('click', () => window.limpiarFirma());
        btnSinFirma?.addEventListener('click', () => this.finalizarSinFirma());
        btnFinalizarRegistro?.addEventListener('click', () => this.finalizarRegistroCompleto());
        btnVolverFoto?.addEventListener('click', () => this.volverAFoto());
        archivoFoto?.addEventListener('change', () => window.subirFotoArchivo());
        btnExportarPDF?.addEventListener('click', () => window.exportarCredencialPDF());
    }

    resetearModalCaptura() {
        // Ocultar todas las áreas
        document.getElementById('areaCamera').style.display = 'none';
        document.getElementById('areaArchivo').style.display = 'none';
        document.getElementById('previewFoto').style.display = 'none';
        document.getElementById('infoDroidCam').style.display = 'none';
        
        // Detener cámara si está activa
        this.detenerCamara();
        
        // Limpiar input de archivo
        const inputArchivo = document.getElementById('archivoFoto');
        if (inputArchivo) {
            inputArchivo.value = '';
        }
        
        // Limpiar preview
        const imgPreview = document.getElementById('imgPreview');
        if (imgPreview) {
            imgPreview.src = '';
        }
    }

    async iniciarCamara() {
        try {
            // Verificar soporte del navegador
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Su navegador no soporta acceso a la cámara');
            }

            // Primero intentar obtener la lista de dispositivos de video
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('Dispositivos de video encontrados:', videoDevices);

            // Buscar una cámara física (evitar DroidCam y cámaras virtuales)
            let deviceId = null;
            for (const device of videoDevices) {
                const label = device.label.toLowerCase();
                // Evitar cámaras virtuales conocidas
                if (!label.includes('droidcam') && 
                    !label.includes('virtual') && 
                    !label.includes('obs') &&
                    !label.includes('manycam') &&
                    !label.includes('snap')) {
                    deviceId = device.deviceId;
                    console.log('Usando dispositivo:', device.label);
                    break;
                }
            }

            // Configurar constraints
            let constraints = {
                video: {
                    width: { min: 320, ideal: 640, max: 1920 },
                    height: { min: 240, ideal: 480, max: 1080 },
                    facingMode: { ideal: 'user' },
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            // Si encontramos un deviceId específico, usarlo
            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
                // Remover facingMode cuando usamos deviceId específico
                delete constraints.video.facingMode;
            }

            console.log('Intentando con constraints:', constraints);

            // Solicitar acceso a la cámara
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('videoCaptura');
            if (video) {
                video.srcObject = this.videoStream;
                
                // Configurar video
                video.onloadedmetadata = () => {
                    console.log('Video cargado, dimensiones:', video.videoWidth, 'x', video.videoHeight);
                    video.play().catch(e => {
                        console.error('Error al reproducir video:', e);
                        this.toast.error('Error al iniciar la vista previa de la cámara');
                    });
                };

                // Manejar errores de reproducción
                video.onerror = (e) => {
                    console.error('Error en el elemento video:', e);
                    this.toast.error('Error en la reproducción del video');
                };
            }
            
            document.getElementById('areaCamera').style.display = 'block';
            document.getElementById('areaArchivo').style.display = 'none';
            
        } catch (error) {
            console.error('Error al acceder a la cámara:', error);
            let mensaje = 'No se pudo acceder a la cámara.';
            
            if (error.name === 'NotAllowedError') {
                mensaje = 'Permiso de cámara denegado. Por favor, permita el acceso a la cámara en su navegador.';
            } else if (error.name === 'NotFoundError') {
                mensaje = 'No se encontró ninguna cámara física en el dispositivo.';
            } else if (error.name === 'NotReadableError') {
                mensaje = 'La cámara está siendo usada por otra aplicación. Cierre DroidCam u otras aplicaciones de cámara.';
            } else if (error.name === 'OverconstrainedError') {
                mensaje = 'Las especificaciones de cámara no son compatibles con el dispositivo.';
            }
            
            this.toast.error(mensaje);
            
            // Si falló con deviceId específico, intentar sin él
            if (error.name === 'OverconstrainedError' && constraints.video.deviceId) {
                console.log('Reintentando sin deviceId específico...');
                this.intentarCamaraBasica();
            }
        }
    }

    async intentarCamaraBasica() {
        try {
            // Constraints básicos como fallback
            const constraintsBasicos = {
                video: {
                    width: 640,
                    height: 480,
                    facingMode: 'user'
                },
                audio: false
            };

            console.log('Intentando con constraints básicos:', constraintsBasicos);
            
            this.videoStream = await navigator.mediaDevices.getUserMedia(constraintsBasicos);
            
            const video = document.getElementById('videoCaptura');
            if (video) {
                video.srcObject = this.videoStream;
                video.onloadedmetadata = () => {
                    video.play();
                };
            }
            
            document.getElementById('areaCamera').style.display = 'block';
            document.getElementById('areaArchivo').style.display = 'none';
            
        } catch (error) {
            console.error('Error con constraints básicos:', error);
            this.toast.error('No se pudo inicializar la cámara. Verifique que no esté siendo usada por DroidCam u otra aplicación.');
        }
    }

    mostrarSubirArchivo() {
        document.getElementById('areaArchivo').style.display = 'block';
        document.getElementById('areaCamera').style.display = 'none';
        this.detenerCamara();
    }

    async capturarFoto() {
        const video = document.getElementById('videoCaptura');
        const canvas = document.getElementById('canvasCaptura');
        
        if (!video || !canvas) {
            this.toast.error('Error: Elementos de captura no encontrados');
            return;
        }

        // Verificar que el video esté reproduciéndose
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            this.toast.error('La cámara aún no está lista. Intente nuevamente.');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Establecer dimensiones del canvas
        canvas.width = 180;
        canvas.height = 240;

        // Capturar la imagen con las dimensiones correctas para credencial (3:4 ratio)
        ctx.drawImage(video, 0, 0, 180, 240);
        
        // Convertir directamente a base64 (más eficiente para almacenamiento local)
        try {
            const base64Data = canvas.toDataURL('image/jpeg', 0.7);
            
            // Crear blob desde base64 para compatibilidad con el sistema existente
            const response = await fetch(base64Data);
            const blob = await response.blob();
            
            this.fotoCapturada = blob;
            this.mostrarPreview(base64Data); // Usar base64 directamente para preview
            this.detenerCamara();
        } catch (error) {
            console.error('Error al procesar foto capturada:', error);
            this.toast.error('Error al capturar la foto. Intente nuevamente.');
        }
    }

    procesarArchivo(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validar archivo
        if (!file.type.startsWith('image/')) {
            this.toast.error('Por favor seleccione un archivo de imagen válido.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            this.toast.error('El archivo es demasiado grande. Máximo 2MB.');
            return;
        }

        // Redimensionar imagen
        this.redimensionarImagen(file, (blob) => {
            this.fotoCapturada = blob;
            this.mostrarPreview(URL.createObjectURL(blob));
        });
    }

    redimensionarImagen(file, callback) {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = function() {
            // Establecer dimensiones de credencial (3:4 ratio)
            canvas.width = 180;
            canvas.height = 240;

            // Calcular crop para mantener proporción
            const aspectRatio = img.width / img.height;
            let sx = 0, sy = 0, sw = img.width, sh = img.height;

            if (aspectRatio > 0.75) { // Imagen más ancha, recortar por los lados
                sw = img.height * 0.75;
                sx = (img.width - sw) / 2;
            } else { // Imagen más alta, recortar por arriba y abajo
                sh = img.width / 0.75;
                sy = (img.height - sh) / 2;
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 180, 240);
            
            canvas.toBlob(callback, 'image/jpeg', 0.8);
        };

        img.src = URL.createObjectURL(file);
    }

    mostrarPreview(imageUrl) {
        document.getElementById('imgPreview').src = imageUrl;
        document.getElementById('previewFoto').style.display = 'block';
        document.getElementById('areaCamera').style.display = 'none';
        document.getElementById('areaArchivo').style.display = 'none';
    }

    retomarFoto() {
        document.getElementById('previewFoto').style.display = 'none';
        this.fotoCapturada = null;
        // Volver a mostrar opciones iniciales
    }

    cancelarCamara() {
        this.detenerCamara();
        document.getElementById('areaCamera').style.display = 'none';
    }

    detenerCamara() {
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    }

    cerrarModalCapturarFoto() {
        this.detenerCamara();
        document.getElementById('modalCapturarFoto').style.display = 'none';
        this.resetearModalCaptura();
        // No limpiar datosClienteTemp aquí para evitar errores al procesar
        this.fotoCapturada = null;
    }

    async confirmarFoto() {
        await this.registrarClienteConFoto();
    }

    async registrarSinFoto() {
        await this.registrarClienteConFoto();
    }



    async registrarClienteConFoto() {
        try {
            this.showLoading(true);
            this.cerrarModalCapturarFoto();

            // Verificar que los datos temporales existan
            if (!this.datosClienteTemp) {
                throw new Error('No se encontraron los datos del cliente para registrar');
            }

            const { nombre, rfc, telefono, direccion, genero } = this.datosClienteTemp;
            
            let id = await this.clienteService.createCliente(
                nombre,
                rfc,
                telefono,
                direccion,
                genero,
                this.fotoCapturada
            );

            this.showLoading(false);
            this.toast.success("Cliente registrado exitosamente, ID: " + id);
            this.formCliente.reset();
            await this.cargarClientes();

            // Limpiar datos temporales
            this.datosClienteTemp = null;
            this.fotoCapturada = null;
            
        } catch (error) {
            this.showLoading(false);
            console.error('Error detallado:', error);
            this.toast.error("Error al registrar el cliente\n" + error.message);
            
            // Reabrir modal si hay error para que el usuario pueda intentar de nuevo
            if (this.datosClienteTemp) {
                this.mostrarModalCapturarFoto();
            }
        }
    }

    // === MÉTODOS PARA MOSTRAR CREDENCIAL HTML ===

    mostrarCredencialHTML(cliente) {
        console.log('Mostrando credencial HTML para cliente:', cliente.nombre);
        
        // Calcular datos adicionales
        const fechaNacimiento = cliente.getFechaNacimiento();
        const edad = cliente.getEdad();
        
        // Crear credencial paso a paso
        const credencial = this.construirCredencial(cliente, fechaNacimiento, edad);
        
        // Mostrar en modal
        const contenedor = document.getElementById('credencialContent');
        contenedor.innerHTML = '';
        contenedor.appendChild(credencial);
        document.getElementById('modalCredencial').style.display = 'block';
    }

    construirCredencial(cliente, fechaNacimiento, edad) {
        // 1. Contenedor principal
        const credencial = this.crearContenedorPrincipal();
        
        // 2. Header con título
        credencial.appendChild(this.crearHeader());
        
        // 3. Logo/escudo
        credencial.appendChild(this.crearLogo());
        
        // 4. Título de credencial
        credencial.appendChild(this.crearTitulo());
        
        // 5. Contenido principal (foto + datos)
        credencial.appendChild(this.crearContenidoPrincipal(cliente, fechaNacimiento, edad));
        
        // 6. Código de barras
        credencial.appendChild(this.crearCodigoBarras());
        
        // 7. Footer con firma
        credencial.appendChild(this.crearFooter(cliente));
        
        return credencial;
    }

    crearContenedorPrincipal() {
        const div = document.createElement('div');
        div.style.cssText = `
            width: 400px; /* Aumentado para más espacio */
            height: 250px; /* Aumentado para más espacio */
            background: linear-gradient(135deg, #e8f5e8 0%, #dcf0dc 100%);
            border: 3px solid #228B22;
            border-radius: 15px;
            padding: 20px; /* Aumentado */
            font-family: 'Arial', sans-serif;
            position: relative;
            box-shadow: 0 10px 20px rgba(0,0,0,0.25);
            margin: 20px auto;
            display: flex;
            flex-direction: column;
        `;
        return div;
    }

    crearHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            background: #228B22;
            color: white;
            text-align: center;
            padding: 10px; /* Aumentado */
            margin: -20px -20px 20px -20px; /* Ajustado */
            border-radius: 12px 12px 0 0;
            font-size: 12px; /* Aumentado */
            font-weight: bold;
        `;
        header.textContent = 'CRÉDITO FÁCIL - ESTADOS UNIDOS MEXICANOS';
        return header;
    }

    crearLogo() {
        const logo = document.createElement('div');
        logo.style.cssText = `
            position: absolute;
            top: 40px; /* Ajustado */
            left: 25px; /* Ajustado */
            width: 22px; /* Aumentado */
            height: 22px; /* Aumentado */
            background: #228B22;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px; /* Aumentado */
        `;
        logo.textContent = 'C';
        return logo;
    }

    crearTitulo() {
        const titulo = document.createElement('div');
        titulo.style.cssText = `
            text-align: center;
            color: #228B22;
            font-weight: bold;
            font-size: 16px; /* Aumentado */
            margin-bottom: 20px; /* Aumentado */
        `;
        titulo.textContent = 'CREDENCIAL DE CLIENTE';
        return titulo;
    }

    crearContenidoPrincipal(cliente, fechaNacimiento, edad) {
        const contenido = document.createElement('div');
        contenido.style.cssText = 'display: flex; gap: 20px; flex-grow: 1;'; /* Aumentado gap */
        
        // Foto y Firma
        contenido.appendChild(this.crearSeccionFoto(cliente));
        
        // Datos (unificados para mejor distribución)
        contenido.appendChild(this.crearSeccionDatos(cliente, fechaNacimiento, edad));
        
        return contenido;
    }

    crearSeccionFoto(cliente) {
        const fotoDiv = document.createElement('div');
        fotoDiv.style.cssText = `
            width: 72px; 
            height: 96px; 
            border: 2px solid #228B22; 
            border-radius: 8px;
            overflow: hidden;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;

        if (cliente.imagenUrl && cliente.imagenUrl.startsWith('data:image')) {
            const img = document.createElement('img');
            img.src = cliente.imagenUrl;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            img.alt = 'Foto del cliente';
            fotoDiv.appendChild(img);
        } else {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = 'color: #888; font-size: 14px; text-align: center;';
            placeholder.textContent = 'FOTO';
            fotoDiv.appendChild(placeholder);
        }

        return fotoDiv;
    }

    crearDatosIzquierda(cliente, fechaNacimiento) {
        const datosIzq = document.createElement('div');
        datosIzq.style.cssText = 'flex: 1;';
        
        // Nombre
        datosIzq.appendChild(this.crearCampo('NOMBRE:', cliente.nombre.toUpperCase(), '11px', true));
        
        // Domicilio
        const direccionCorta = cliente.direccion.length > 40 ? 
            cliente.direccion.substring(0, 40) + '...' : 
            cliente.direccion;
        datosIzq.appendChild(this.crearCampo('DOMICILIO:', direccionCorta, '9px'));
        
        // RFC
        datosIzq.appendChild(this.crearCampo('RFC:', cliente.rfc.toUpperCase(), '10px', true));
        
        // Fecha de nacimiento (si está disponible)
        if (fechaNacimiento) {
            datosIzq.appendChild(this.crearCampo('FECHA NACIMIENTO:', fechaNacimiento.toLocaleDateString('es-MX'), '9px'));
        }

        return seccionDiv;
    }

    crearSeccionDatos(cliente, fechaNacimiento, edad) {
        const datosDiv = document.createElement('div');
        datosDiv.style.cssText = 'flex: 1; display: flex; flex-direction: column; justify-content: space-around;';
        
        // Nombre
        datosDiv.appendChild(this.crearCampo('NOMBRE', cliente.nombre.toUpperCase(), '12px', true));
        
        // Domicilio
        const direccionCorta = cliente.direccion.length > 45 ? 
            cliente.direccion.substring(0, 45) + '...' : 
            cliente.direccion;
        datosDiv.appendChild(this.crearCampo('DOMICILIO', direccionCorta.toUpperCase(), '9px'));
        
        // RFC y Teléfono en una línea
        const rfcTelDiv = document.createElement('div');
        rfcTelDiv.style.cssText = 'display: flex; justify-content: space-between;';
        rfcTelDiv.appendChild(this.crearCampo('RFC', cliente.rfc.toUpperCase(), '11px', true));
        rfcTelDiv.appendChild(this.crearCampo('TELÉFONO', cliente.telefono, '10px'));
        datosDiv.appendChild(rfcTelDiv);

        // Folio (ID Cliente)
        datosDiv.appendChild(this.crearCampo('FOLIO', cliente.id.toUpperCase(), '10px'));
        
        return datosDiv;
    }

    crearDatosIzquierda() { /* No usado, combinado en crearSeccionDatos */ }
    crearDatosDerecha() { /* No usado, combinado en crearSeccionDatos */ }

    crearCampo(etiqueta, valor, fontSize = '10px', negrita = false) {
        const campo = document.createElement('div');
        campo.style.cssText = 'margin-bottom: 12px;'; /* Aumentado */
        
        const labelDiv = document.createElement('div');
        labelDiv.style.cssText = 'font-size: 9px; font-weight: bold; color: #333; margin-bottom: 3px;';
        labelDiv.textContent = etiqueta;
        
        const valorDiv = document.createElement('div');
        valorDiv.style.cssText = `font-size: ${fontSize}; color: #000; ${negrita ? 'font-weight: bold;' : ''}`;
        valorDiv.textContent = valor;
        
        campo.appendChild(labelDiv);
        campo.appendChild(valorDiv);
        
        return campo;
    }

    crearCodigoBarras() {
        // No se usará en este diseño para dar más espacio a los datos
        return document.createElement('div');
    }

    crearFooter(cliente) {
        const footerContainer = document.createElement('div');
        footerContainer.style.cssText = `
            position: absolute; 
            bottom: 8px; 
            left: 15px; 
            right: 15px;
        `;
        
        // Área de firma si existe
        if (cliente.firma) {
            const firmaArea = document.createElement('div');
            firmaArea.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            `;
            
            const firmaLabel = document.createElement('div');
            firmaLabel.style.cssText = 'font-size: 8px; color: #333; font-weight: bold;';
            firmaLabel.textContent = 'FIRMA:';
            
            const firmaImg = document.createElement('img');
            firmaImg.src = cliente.firma;
            firmaImg.style.cssText = `
                height: 25px;
                max-width: 120px;
                object-fit: contain;
                border: 1px solid #ddd;
                background: white;
            `;
            
            firmaArea.appendChild(firmaLabel);
            firmaArea.appendChild(firmaImg);
            footerContainer.appendChild(firmaArea);
        }
        
        // Footer con información
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex; 
            justify-content: space-between;
            font-size: 9px; /* Aumentado */
            color: #555;
        `;
        
        const validez = document.createElement('span');
        validez.textContent = 'VÁLIDA HASTA: 2030';
        
        const empresa = document.createElement('span');
        empresa.textContent = 'CRÉDITO FÁCIL 2025';
        
        footer.appendChild(validez);
        footer.appendChild(empresa);
        footerContainer.appendChild(footer);
        
        return footerContainer;
    }

    // === MÉTODOS SIMPLIFICADOS PARA FOTO Y FIRMA ===

    mostrarAreaFirma() {
        document.getElementById('previewFoto').style.display = 'none';
        document.getElementById('areaFirma').style.display = 'block';
        
        // Inicializar canvas de firma después de un pequeño delay
        setTimeout(() => {
            if (window.inicializarCanvasFirma) {
                window.inicializarCanvasFirma();
            }
        }, 100);
    }

    volverAFoto() {
        document.getElementById('areaFirma').style.display = 'none';
        document.getElementById('previewFoto').style.display = 'block';
    }

    finalizarSinFirma() {
        window.firmaClienteBase64 = null;
        this.finalizarRegistroCompleto();
    }

    async finalizarRegistroCompleto() {
        try {
            if (!this.datosClienteTemp) {
                this.toast.error('Error: Datos del cliente no encontrados');
                return;
            }

            this.showLoading(true);
            
            // Capturar firma si el área está visible
            const areaFirma = document.getElementById('areaFirma');
            if (areaFirma && areaFirma.style.display !== 'none') {
                console.log('Capturando firma...');
                const firmaCapturada = window.capturarFirma();
                if (firmaCapturada) {
                    console.log('Firma capturada exitosamente:', firmaCapturada.substring(0, 50) + '...');
                } else {
                    console.log('No se capturó firma o canvas vacío');
                }
            } else {
                console.log('Área de firma no visible, continuando sin firma');
            }
            
            // Crear cliente con foto y opcionalmente firma
            const cliente = await this.crearClienteCompleto();
            
            // Cerrar modal
            document.getElementById('modalCapturarFoto').style.display = 'none';
            
            // Mostrar credencial inmediatamente
            this.mostrarCredencialHTML(cliente);
            
            this.showLoading(false);
            this.toast.success('Cliente registrado exitosamente');
            
        } catch (error) {
            this.showLoading(false);
            console.error('Error al finalizar registro:', error);
            this.toast.error('Error al registrar cliente: ' + error.message);
        }
    }

    async crearClienteCompleto() {
        const { nombre, rfc, telefono, direccion, genero } = this.datosClienteTemp;
        
        // Convertir base64 a File si hay foto
        let fotoFile = null;
        if (window.fotoClienteBase64) {
            try {
                const response = await fetch(window.fotoClienteBase64);
                const blob = await response.blob();
                fotoFile = new File([blob], 'foto_cliente.jpg', { type: 'image/jpeg' });
            } catch (error) {
                console.error('Error convirtiendo imagen:', error);
            }
        }
        
        // Obtener firma si existe
        console.log('Verificando firma antes de crear cliente:', {
            existe: !!window.firmaClienteBase64,
            longitud: window.firmaClienteBase64?.length || 0
        });
        
        // Crear cliente con foto y firma
        const clienteId = await this.clienteService.createCliente(
            nombre, rfc, telefono, direccion, genero, fotoFile, window.firmaClienteBase64
        );
        
        // Obtener cliente creado (ya incluye la firma guardada)
        const cliente = await this.clienteService.getClienteById(clienteId);
        
        console.log('Cliente creado con firma:', {
            id: cliente.id,
            tieneFirma: !!cliente.firma,
            longitudFirma: cliente.firma?.length || 0
        });
        
        // Actualizar lista
        await this.cargarClientes();
        
        // Limpiar datos temporales
        this.datosClienteTemp = null;
        window.fotoClienteBase64 = null;
        window.firmaClienteBase64 = null;
        this.formCliente.reset();
        
        return cliente;
    }
}

export default FormCliente;