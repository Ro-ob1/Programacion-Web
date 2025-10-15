class FormPrestamo {

    constructor(toast, showLoading, prestamoService, clienteService, lambdaVerPagos) {
        this.prestamoService = prestamoService;
        this.clienteService = clienteService;
        this.lambdaVerPagos = lambdaVerPagos;
        this.toast = toast;
        this.showLoading = showLoading;
        this.formPrestamo = document.getElementById('formPrestamo');
        this.tablaPrestamosBody = document.querySelector('#tablaPrestamos tbody');
        this.resultadoCalculo = document.getElementById('resultadoCalculo');
        this.initEventListeners();
    }

    initEventListeners() {
        this.installEventRegistrarPrestamo(); // <- Evento para registrar préstamo
        this.installEventFiltrarPrestamos(); // <- Evento para filtrar préstamos
        this.installEventBuscarPrestamo(); // <- Evento para buscar prestamos asociados a un cliente
        this.installEventVerPagos(); // <- Evento para ver pagos de un préstamo
    }

    // Evento para registrar préstamo
    installEventRegistrarPrestamo() {
        this.formPrestamo.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idCliente = document.getElementById('clientePrestamo').value;
            const monto = parseFloat(document.getElementById('montoSolicitado').value);
            const tasaAnual = parseFloat(document.getElementById('tasaInteres').value);
            const plazo = parseInt(document.getElementById('plazoMeses').value);
            const fechaDesembolso = new Date(document.getElementById('fechaDesembolso').value);

            try {
                const tasaMensual = (tasaAnual / 100) / 12;
                const cuotaMensual = (monto * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -plazo));
                this.resultadoCalculo.innerHTML = `
                <h4>Cálculo de Préstamo:</h4>
                <p>Cuota Mensual Estimada: <strong>${cuotaMensual.toFixed(2)}</strong></p>
                `;

                const confirmacion = confirm(`La cuota mensual será de ${cuotaMensual.toFixed(2)}. ¿Desea crear el préstamo?`);

                if (confirmacion) {
                    this.showLoading(true); // Mostrar loading
                    const prestamoId = await this.prestamoService.createPrestamo(idCliente, cuotaMensual, monto, tasaAnual, plazo, fechaDesembolso);
                    this.toast.success('Préstamo creado exitosamente, ID: ' + prestamoId);
                    this.formPrestamo.reset();
                    this.resultadoCalculo.innerHTML = '';
                    await this.cargarPrestamos();
                } else {
                    this.toast.error('Creación de préstamo cancelada por el usuario.');
                }

            } catch (error) {
                this.toast.error(error.message);
            }finally {
                this.showLoading(false); // Ocultar loading
            }
        });
    }

    // Evento para filtrar préstamos
    installEventFiltrarPrestamos() {
        const filtroPrestamoRadios = document.querySelectorAll('input[name="filtroPrestamo"]');
        filtroPrestamoRadios.forEach(radio => {
            radio.addEventListener('change', async () => {
                await this.cargarPrestamos(radio.value);
            });
        });
    }

    // RF12: Búsqueda de préstamos por cliente
    installEventBuscarPrestamo() {
        const buscarPrestamo = document.getElementById('buscarPrestamo');

        buscarPrestamo.addEventListener('keyup', () => {
            const termino = buscarPrestamo.value.toLowerCase();
            const rows = this.tablaPrestamosBody.getElementsByTagName('tr');

            for (let i = 0; i < rows.length; i++) {
                const nombreCliente = rows[i].getElementsByTagName('td')[0]?.textContent.toLowerCase() || '';

                if (nombreCliente.includes(termino)) {
                    rows[i].style.display = '';
                } else {
                    rows[i].style.display = 'none';
                }
            }
        });
    }

    // Cargar préstamos y mostrarlos en la tabla
    async cargarPrestamos(filtro = 'todos') {
        try {
            this.showLoading(true); // Mostrar loading
            
            // Actualizar estados antes de cargar la lista
            await this.prestamoService.actualizarTodosLosEstados();
            
            const listaPrestamos = await this.prestamoService.getAllPrestamos({estado: filtro});

            if (listaPrestamos.length === 0) {
                this.showLoading(false); // Ocultar loading
                this.tablaPrestamosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay préstamos que coincidan con el filtro</td></tr>';
                return;
            }

            this.tablaPrestamosBody.innerHTML = '';
            listaPrestamos.forEach(prestamo => {
                const fecha = prestamo.fechaCreacion.toDate().toLocaleDateString('es-MX');
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${prestamo.nombreCliente}</td>
                    <td>${prestamo.monto.toFixed(2)}</td>
                    <td>${prestamo.tasaInteres}%</td>
                    <td>${prestamo.plazo} meses</td>
                    <td>${prestamo.cuotaMensual.toFixed(2)}</td>
                    <td><span class="status status-${prestamo.estado.toLowerCase()}">${prestamo.estado}</span></td>
                    <td>${fecha}</td>
                    <td>
                        <button class="btn btn-info btn-small" onclick="verPagos('${prestamo.id}', '${prestamo.idCliente}')">Ver Pagos</button>
                    </td>
                `;
                this.tablaPrestamosBody.appendChild(row);
            });

            this.showLoading(false); // Ocultar loading
        } catch (error) {
            this.showLoading(false); // Ocultar loading
            console.log("Error al cargar préstamos:", error);
            this.toast.error('Error al cargar los préstamos\n' + error.message);
        }
    }

    installEventVerPagos() {
        window.verPagos = async (prestamoId, clienteId) => {
            // 1. Cambiar la pestaña activa manualmente
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelector('.tab-button[data-tab="amortizacion"]').classList.add('active');
            document.getElementById('amortizacion').classList.add('active');

            // 2. Cargar el dropdown de préstamos filtrado por cliente y ESPERAR a que termine
            await this.lambdaVerPagos(clienteId)

            // 3. Ahora sí, seleccionar el préstamo en el dropdown ya cargado y filtrado
            const prestamoSelect = document.getElementById('prestamoAmortizacion');
            prestamoSelect.value = prestamoId;

            // 4. Disparar el evento change para cargar la tabla de amortización
            // (Asegurándose de que el valor se estableció correctamente)
            if (prestamoSelect.value === prestamoId) {
                prestamoSelect.dispatchEvent(new Event('change'));
            }
        };
    }

    // Cargar clientes en el select del formulario de préstamo
    async cargarClientes() {
        try {
            this.showLoading(true); // Mostrar loading
            const listaClientes = await this.clienteService.getAllClientes()

            const selectCliente = document.getElementById('clientePrestamo');
            selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';

            if (listaClientes === 0) {
                this.showLoading(false); // Ocultar loading
                this.toast.error('No hay clientes registrados. Registre un cliente antes de crear un préstamo.');
                return;
            }

            listaClientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = `${cliente.nombre} (${cliente.rfc})`;
                selectCliente.appendChild(option);
            });
        } catch (error) {
            this.showLoading(false); // Ocultar loading
            console.error('Error al cargar clientes en select:', error);
        }
    }

}

export default FormPrestamo;