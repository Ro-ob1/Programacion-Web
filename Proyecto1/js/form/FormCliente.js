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

        // Expose close handlers for modals used via inline onclick in HTML
        window.cerrarModalCambiarFoto = () => this.cerrarModalCambiarFoto();
        window.cerrarModalCambiarFirma = () => this.cerrarModalCambiarFirma();
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

                // Botones para cambiar foto/firma desde el modal Editar
                const btnEditarCambiarFoto = document.getElementById('editarCambiarFoto');
                const btnEditarCambiarFirma = document.getElementById('editarCambiarFirma');
                if (btnEditarCambiarFoto) {
                    btnEditarCambiarFoto.onclick = () => {
                        this.mostrarModalCambiarFoto(id);
                    };
                }
                if (btnEditarCambiarFirma) {
                    btnEditarCambiarFirma.onclick = () => {
                        this.mostrarModalCambiarFirma(id);
                    };
                }
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

            try {
                this.showLoading(true);
                await this.clienteService.updateCliente(id, {
                    nombre: document.getElementById('editarNombre').value,
                    telefono: document.getElementById('editarTelefono').value,
                    direccion: document.getElementById('editarDireccion').value,
                    genero: document.getElementById('editarGenero').value
                });
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
            // Mostrar directamente el PDF sin pasar por opciones
            this.generarCredencialEstiloINE(clienteId);
        };

        // Ya no hay modal de opciones; limpiamos listeners relacionados
    }

    // Eliminados: setupModalEventListeners, mostrarOpcionesCredencial, cerrarModalOpciones

    async mostrarModalCambiarFoto(clienteId) {
        try {
            const cliente = await this.clienteService.getClienteById(clienteId);
            document.getElementById('clienteIdFoto').value = clienteId;

            // Mostrar foto actual
            const fotoImg = document.getElementById('fotoActualImg');
            const fotoTexto = document.getElementById('fotoActualTexto');

            if (cliente.imagenUrl) {
                // Mostrar imagen existente
                fotoImg.src = cliente.imagenUrl;
                fotoImg.style.display = 'block';
                fotoTexto.style.display = 'none';
            } else {
                // Sin imagen
                fotoImg.style.display = 'none';
                fotoTexto.style.display = 'flex';
                fotoTexto.textContent = 'Sin foto';
            }

            // Reset áreas interactivas (cámara/preview)
            this.resetearModalCambiarFoto();

            // Configurar event listeners para cambiar foto
            this.configurarEventosCambiarFoto();

            // Abrir modal
            document.getElementById('modalCambiarFoto').style.display = 'block';
        } catch (error) {
            this.toast.error('Error al cargar datos del cliente');
        }
    }

    resetearModalCambiarFoto() {
        // Ocultar todas las áreas
        const areaCam = document.getElementById('areaCameraNueva');
        if (areaCam) areaCam.style.display = 'none';
        const areaArchivoNueva = document.getElementById('areaArchivoNueva');
        if (areaArchivoNueva) areaArchivoNueva.style.display = 'none';
        const prev = document.getElementById('previewNuevaFoto');
        if (prev) prev.style.display = 'none';
        
        // Detener cámara si está activa
        this.detenerCameraCambiarFoto();
        
        // Limpiar input de archivo
        const inputArchivo = document.getElementById('nuevaFotoCliente');
        if (inputArchivo) inputArchivo.value = '';
        
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
        const btnCapturarNueva = document.getElementById('btnCapturarNueva');
        const btnCancelarCameraNueva = document.getElementById('btnCancelarCameraNueva');
        const btnConfirmarCambio = document.getElementById('btnConfirmarCambio');
        const btnCancelarCambio = document.getElementById('btnCancelarCambio');
        const nuevaFotoCliente = document.getElementById('nuevaFotoCliente');

        // Remover event listeners anteriores para evitar duplicados
    const newBtnTomarNuevaFoto = btnTomarNuevaFoto.cloneNode(true);
    btnTomarNuevaFoto.parentNode.replaceChild(newBtnTomarNuevaFoto, btnTomarNuevaFoto);

        // Event listeners
        document.getElementById('btnTomarNuevaFoto').addEventListener('click', () => {
            this.iniciarCameraCambiarFoto();
        });
        
        btnCapturarNueva?.addEventListener('click', () => this.capturarNuevaFoto());
        btnCancelarCameraNueva?.addEventListener('click', () => this.cancelarCameraCambiarFoto());
        btnConfirmarCambio?.addEventListener('click', () => this.confirmarCambioFoto());
        btnCancelarCambio?.addEventListener('click', () => this.resetearModalCambiarFoto());
        // Eliminado: cambio de archivo desde input
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
            const areaArchivoNueva = document.getElementById('areaArchivoNueva');
            if (areaArchivoNueva) areaArchivoNueva.style.display = 'none';
            
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

    // Eliminado: subir nueva foto desde archivo

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

            // Utilidad para truncar texto al ancho disponible
            const fitText = (doc, text, maxWidth) => {
                if (!text) return '';
                let t = String(text);
                while (doc.getTextWidth(t) > maxWidth && t.length > 0) {
                    t = t.slice(0, -1);
                }
                return t.length < String(text).length ? t.slice(0, -1) + '…' : t;
            };

            // Datos del cliente estilo INE
            const datosX = 26;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(4.3); // tamaño base para etiquetas
            doc.setFont(undefined, 'bold');

            // NOMBRE
            doc.text('NOMBRE:', datosX, 19);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(5.3);
            const maxNombreWidth = 85.6 - datosX - 6; // margen derecho
            doc.text(fitText(doc, (cliente.nombre || '').toUpperCase(), maxNombreWidth), datosX, 22);

            // DOMICILIO
            doc.setFontSize(4.3);
            doc.setFont(undefined, 'bold');
            doc.text('DOMICILIO:', datosX, 26);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            const maxDomWidth = 85.6 - datosX - 6;
            doc.text(fitText(doc, (cliente.direccion || '').toUpperCase(), maxDomWidth), datosX, 29);

            // RFC
            doc.setFont(undefined, 'bold');
            doc.text('RFC:', datosX, 33);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            const maxRfcWidth = 85.6 - datosX - 6;
            doc.text(fitText(doc, (cliente.rfc || '').toUpperCase(), maxRfcWidth), datosX, 36);

            // FOLIO (ID Cliente)
            doc.setFont(undefined, 'bold');
            doc.text('FOLIO:', datosX, 40);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            const maxFolioWidth = 85.6 - datosX - 6;
            doc.text(fitText(doc, (cliente.id || '').toUpperCase(), maxFolioWidth), datosX, 43);

            // Parte inferior derecha - datos adicionales
            const infoX = 55;
            doc.setFontSize(4.1);
            doc.setFont(undefined, 'bold');
            doc.text('TELÉFONO:', infoX, 19);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            const maxTelWidth = 85.6 - infoX - 6;
            doc.text(fitText(doc, cliente.telefono || '', maxTelWidth), infoX, 22);

            doc.setFont(undefined, 'bold');
            doc.text('GÉNERO:', infoX, 26);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            const maxGenWidth = 85.6 - infoX - 6;
            doc.text(fitText(doc, (cliente.genero || 'NO ESPECIFICADO'), maxGenWidth), infoX, 29);

            doc.setFont(undefined, 'bold');
            doc.text('REGISTRO:', infoX, 33);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(4.8);
            let fechaStr;
            try {
                const fr = cliente.fechaRegistro;
                if (!fr) {
                    fechaStr = new Date().toLocaleDateString('es-MX');
                } else if (fr.seconds) {
                    fechaStr = new Date(fr.seconds * 1000).toLocaleDateString('es-MX');
                } else if (fr instanceof Date) {
                    fechaStr = fr.toLocaleDateString('es-MX');
                } else if (typeof fr === 'string' || typeof fr === 'number') {
                    const d = new Date(fr);
                    fechaStr = isNaN(d) ? new Date().toLocaleDateString('es-MX') : d.toLocaleDateString('es-MX');
                } else {
                    fechaStr = new Date().toLocaleDateString('es-MX');
                }
            } catch {
                fechaStr = new Date().toLocaleDateString('es-MX');
            }
            doc.text(fechaStr, infoX, 36);

            // Código de barras simulado
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.2);
            for (let i = 0; i < 20; i++) {
                const x = 30 + (i * 1.5);
                const altura = Math.random() > 0.5 ? 3 : 2;
                doc.line(x, 47, x, 47 + altura);
            }

            // Generar QR con datos de credencial (solo texto)
            try {
                const qrData = [
                    `NOMBRE: ${(cliente.nombre || '').toUpperCase()}`,
                    `DOMICILIO: ${(cliente.direccion || '').toUpperCase()}`,
                    `RFC: ${(cliente.rfc || '').toUpperCase()}`,
                    `TEL: ${cliente.telefono || ''}`,
                    `GENERO: ${cliente.genero || ''}`,
                    `REGISTRO: ${fechaStr}`,
                    `FOLIO: ${(cliente.id || '').toUpperCase()}`
                ].join('\n');

                if (window.QRious) {
                    const qrCanvas = document.createElement('canvas');
                    new window.QRious({
                        element: qrCanvas,
                        value: qrData,
                        size: 160,
                        level: 'M'
                    });
                    const qrImg = qrCanvas.toDataURL('image/png');
                    // Posicionar QR en esquina inferior derecha (más grande y arriba del footer)
                    const qrWmm = 14, qrHmm = 14; // mm
                    const qrX = 85.6 - qrWmm - 2;
                    const qrY = 53.98 - qrHmm - 7;
                    doc.addImage(qrImg, 'PNG', qrX, qrY, qrWmm, qrHmm);
                    // Marco sutil para destacarlo
                    doc.setDrawColor(120, 120, 120);
                    doc.setLineWidth(0.2);
                    doc.rect(qrX, qrY, qrWmm, qrHmm);
                } else {
                    console.warn('QRious no está disponible, se omite QR');
                }
            } catch (e) {
                console.warn('No se pudo generar QR:', e);
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


            // Mostrar PDF en iframe y ocultar credencial HTML
            const pdfOutput = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfOutput);

            // Ocultar la credencial HTML si está visible
            const credencialContent = document.getElementById('credencialContent');
            if (credencialContent) credencialContent.style.display = 'none';

            const modalPdf = document.getElementById('modalPdf');
            const pdfViewer = document.getElementById('pdfViewer');

            pdfViewer.src = pdfUrl;
            modalPdf.style.display = 'block';

            // Configurar botón Exportar a PDF para solo reabrir el modal
            const btnExportarPDF = document.getElementById('btnExportarPDF');
            if (btnExportarPDF) {
                btnExportarPDF.onclick = () => {
                    pdfViewer.src = pdfUrl;
                    modalPdf.style.display = 'block';
                    if (credencialContent) credencialContent.style.display = 'none';
                };
            }

            const closeButton = modalPdf.querySelector(".close-button");
            if (closeButton) {
                closeButton.onclick = () => {
                    modalPdf.style.display = "none";
                };
            }

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
        const btnSinFoto = document.getElementById('btnSinFoto');
        const btnCapturar = document.getElementById('btnCapturar');
        const btnCancelarCamera = document.getElementById('btnCancelarCamera');
        const btnContinuarFirma = document.getElementById('btnContinuarFirma');
        const btnRetomarFoto = document.getElementById('btnRetomarFoto');
        const btnLimpiarFirma = document.getElementById('btnLimpiarFirma');
        const btnSinFirma = document.getElementById('btnSinFirma');
        const btnFinalizarRegistro = document.getElementById('btnFinalizarRegistro');
        const btnVolverFoto = document.getElementById('btnVolverFoto');
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
        btnExportarPDF?.addEventListener('click', () => window.exportarCredencialPDF());
    }

    resetearModalCaptura() {
        // Ocultar todas las áreas
        document.getElementById('areaCamera').style.display = 'none';
        document.getElementById('previewFoto').style.display = 'none';
        document.getElementById('infoDroidCam').style.display = 'none';
        
        // Detener cámara si está activa
        this.detenerCamara();
        
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
        // Modal de credencial HTML eliminado; abrir PDF directamente
        console.log('Abriendo PDF de credencial para cliente:', cliente.nombre);
        this.generarCredencialEstiloINE(cliente.id);
    }

    async mostrarCredencialPDF(clienteId) {
        await this.generarCredencialEstiloINE(clienteId);
    }

    // Renderiza la credencial en HTML con los mismos campos y formato que el PDF
    crearCredencialPDFLike(cliente) {
        const card = document.createElement('div');
        card.style.cssText = `
            width: 450px; 
            height: 260px; 
            background: linear-gradient(135deg, #e8f5e8 0%, #dcf0dc 100%);
            border: 4px solid #228B22; 
            border-radius: 12px; 
            box-shadow: 0 4px 16px rgba(0,0,0,0.12); 
            position: relative; 
            font-family: Arial, sans-serif; 
            margin: 0 auto;
            overflow: hidden;
        `;

        // Franja superior
        const franja = document.createElement('div');
        franja.style.cssText = `
            background: #228B22; 
            color: #fff; 
            text-align: center; 
            font-weight: bold; 
            font-size: 10px; 
            padding: 8px 0;
            letter-spacing: 0.5px;
        `;
        franja.textContent = 'CRÉDITO FÁCIL - ESTADOS UNIDOS MEXICANOS';
        card.appendChild(franja);

        // Título
        const titulo = document.createElement('div');
        titulo.style.cssText = `
            color: #228B22; 
            text-align: center; 
            font-size: 15px; 
            font-weight: bold; 
            margin: 8px 0 12px 0;
        `;
        titulo.textContent = 'CREDENCIAL DE CLIENTE';
        card.appendChild(titulo);

        // Layout principal
        const layout = document.createElement('div');
        layout.style.cssText = `
            display: flex; 
            flex-direction: row; 
            padding: 0 20px;
            gap: 18px;
        `;

        // Columna izquierda: Foto y firma
        const col1 = document.createElement('div');
        col1.style.cssText = `
            display: flex; 
            flex-direction: column; 
            align-items: center;
            gap: 8px;
        `;
        
        // Foto
        const foto = document.createElement('div');
        foto.style.cssText = `
            width: 80px; 
            height: 100px; 
            border: 3px solid #228B22; 
            background: #f0f0f0; 
            border-radius: 4px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden;
        `;
        if (cliente.imagenUrl && cliente.imagenUrl.startsWith('data:image')) {
            const img = document.createElement('img');
            img.src = cliente.imagenUrl;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
            foto.appendChild(img);
        } else {
            foto.textContent = 'FOTO';
            foto.style.cssText += 'color: #888; font-size: 12px;';
        }
        col1.appendChild(foto);
        
        // Firma
        const firma = document.createElement('div');
        firma.style.cssText = `
            width: 80px; 
            height: 35px; 
            border: 2px solid #228B22; 
            background: #fff; 
            border-radius: 3px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            overflow: hidden;
        `;
        if (cliente.firma && cliente.firma.startsWith('data:image')) {
            const img = document.createElement('img');
            img.src = cliente.firma;
            img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
            firma.appendChild(img);
        } else {
            firma.textContent = 'FIRMA';
            firma.style.cssText += 'color: #888; font-size: 10px;';
        }
        col1.appendChild(firma);

        layout.appendChild(col1);

        // Columna derecha: Datos en dos columnas
        const col2 = document.createElement('div');
        col2.style.cssText = `
            flex: 1; 
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        // Helper para crear campos
        const crearCampo = (label, value, bold = false) => {
            const campo = document.createElement('div');
            campo.innerHTML = `
                <div style="font-weight: bold; color: #000; font-size: 9px; margin-bottom: 1px;">${label}:</div>
                <div style="color: #000; font-size: 10px; line-height: 1.2; ${bold ? 'font-weight: bold;' : ''}; word-break: break-word;">${value}</div>
            `;
            return campo;
        };

        // Helper para obtener fecha de registro formateada
        const obtenerFechaRegistro = () => {
            try {
                if (!cliente.fechaRegistro) {
                    return new Date().toLocaleDateString('es-MX');
                }
                
                // Si es un Timestamp de Firestore
                if (cliente.fechaRegistro.seconds) {
                    return new Date(cliente.fechaRegistro.seconds * 1000).toLocaleDateString('es-MX');
                }
                
                // Si es un objeto Date
                if (cliente.fechaRegistro instanceof Date) {
                    return cliente.fechaRegistro.toLocaleDateString('es-MX');
                }
                
                // Si es una cadena de fecha
                if (typeof cliente.fechaRegistro === 'string') {
                    const date = new Date(cliente.fechaRegistro);
                    return isNaN(date.getTime()) ? new Date().toLocaleDateString('es-MX') : date.toLocaleDateString('es-MX');
                }
                
                // Si es un número (timestamp en milisegundos)
                if (typeof cliente.fechaRegistro === 'number') {
                    return new Date(cliente.fechaRegistro).toLocaleDateString('es-MX');
                }
                
                return new Date().toLocaleDateString('es-MX');
            } catch (error) {
                console.error('Error al obtener fecha de registro:', error);
                return new Date().toLocaleDateString('es-MX');
            }
        };

        // Primera fila: NOMBRE y TELÉFONO
        const fila1 = document.createElement('div');
    fila1.style.cssText = 'display: flex; gap: 24px;';
        const nombreDiv = document.createElement('div');
        nombreDiv.style.flex = '2';
        nombreDiv.appendChild(crearCampo('NOMBRE', cliente.nombre.toUpperCase(), true));
        const telefonoDiv = document.createElement('div');
        telefonoDiv.style.flex = '1';
        telefonoDiv.appendChild(crearCampo('TELÉFONO', cliente.telefono || ''));
        fila1.appendChild(nombreDiv);
        fila1.appendChild(telefonoDiv);
        col2.appendChild(fila1);

        // Segunda fila: DOMICILIO y GÉNERO
        const fila2 = document.createElement('div');
    fila2.style.cssText = 'display: flex; gap: 24px;';
        const domicilioDiv = document.createElement('div');
        domicilioDiv.style.flex = '2';
        domicilioDiv.appendChild(crearCampo('DOMICILIO', cliente.direccion.toUpperCase()));
        const generoDiv = document.createElement('div');
        generoDiv.style.flex = '1';
        generoDiv.appendChild(crearCampo('GÉNERO', cliente.genero || 'Femenino'));
        fila2.appendChild(domicilioDiv);
        fila2.appendChild(generoDiv);
        col2.appendChild(fila2);

        // Tercera fila: RFC y REGISTRO
        const fila3 = document.createElement('div');
    fila3.style.cssText = 'display: flex; gap: 24px;';
        const rfcDiv = document.createElement('div');
        rfcDiv.style.flex = '2';
        rfcDiv.appendChild(crearCampo('RFC', cliente.rfc.toUpperCase(), true));
        const registroDiv = document.createElement('div');
        registroDiv.style.flex = '1';
        registroDiv.appendChild(crearCampo('REGISTRO', obtenerFechaRegistro()));
        fila3.appendChild(rfcDiv);
        fila3.appendChild(registroDiv);
        col2.appendChild(fila3);

        // Cuarta fila: FOLIO (ancho completo)
        const fila4 = document.createElement('div');
        fila4.appendChild(crearCampo('FOLIO', cliente.id.toUpperCase()));
        col2.appendChild(fila4);

        layout.appendChild(col2);
        card.appendChild(layout);

        // Código de barras
        const barrasContainer = document.createElement('div');
        barrasContainer.style.cssText = `
            text-align: center;
            margin-top: 10px;
        `;
        const barras = document.createElement('div');
        barras.style.cssText = `
            display: inline-block;
            height: 16px;
        `;
        let barrasHtml = '';
        for (let i = 0; i < 30; i++) {
            const h = Math.random() > 0.5 ? 16 : 10;
            barrasHtml += `<span style="display:inline-block;width:1.5px;height:${h}px;background:#000;margin-right:1.5px;vertical-align:bottom;"></span>`;
        }
        barras.innerHTML = barrasHtml;
        barrasContainer.appendChild(barras);
        card.appendChild(barrasContainer);

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex; 
            justify-content: space-between; 
            font-size: 8.5px; 
            color: #666; 
            padding: 8px 20px 0 20px;
        `;
        footer.innerHTML = `<span>VÁLIDA HASTA: 2030</span><span>CRÉDITO FÁCIL 2025</span>`;
        card.appendChild(footer);

        return card;
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
            
            // Abrir la credencial directamente en PDF (sin modal HTML)
            await this.generarCredencialEstiloINE(cliente.id);
            
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