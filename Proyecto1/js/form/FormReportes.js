class FormReportes {

    constructor(prestamoService, showLoading) {
        this.prestamoService = prestamoService;
        this.showLoading = showLoading;
        this.tablaReportesVencidos = document.getElementById('tabla-reportes-vencidos').getElementsByTagName('tbody')[0];
        this.totalPrestadoEl = document.getElementById('total-prestado');
        this.totalInteresesEl = document.getElementById('total-intereses');
    }

    async cargarResumenFinanciero() {
        this.showLoading(true);
        try {
            const resumen = await this.prestamoService.getResumenFinanciero();
            this.totalPrestadoEl.textContent = this.formatoMoneda(resumen.montoTotalPrestado);
            this.totalInteresesEl.textContent = this.formatoMoneda(resumen.interesesTotalesARecibir);
        } catch (error) {
            console.error('Error al cargar el resumen financiero:', error);
            this.totalPrestadoEl.textContent = "Error";
            this.totalInteresesEl.textContent = "Error";
        } finally {
            this.showLoading(false);
        }
    }

    async cargarReporteVencidos() {
        this.showLoading(true);
        try {
            // 1. Obtener todos los préstamos activos y vencidos para una revisión completa
            const prestamosActivos = await this.prestamoService.getAllPrestamos({ estado: 'activo' });
            const prestamosVencidos = await this.prestamoService.getAllPrestamos({ estado: 'vencido' });
            const prestamosParaRevisar = [...prestamosActivos, ...prestamosVencidos];

            this.tablaReportesVencidos.innerHTML = ''; // Limpiar tabla

            if (prestamosParaRevisar.length === 0) {
                this.tablaReportesVencidos.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay préstamos activos o vencidos.</td></tr>';
                return;
            }

            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0);

            let hayCuotasVencidas = false;

            // 2. Iterar sobre cada préstamo para encontrar la(s) cuota(s) vencida(s)
            for (const prestamo of prestamosParaRevisar) {
                const tablaAmortizacion = this.prestamoService.generarTablaAmortizacion(prestamo);

                for (const cuota of tablaAmortizacion) {
                    const fechaProgramada = new Date(cuota.fechaProgramada);
                    fechaProgramada.setHours(0, 0, 0, 0);
                    const estaPagado = prestamo.pagos && prestamo.pagos[cuota.periodo];

                    // 3. Si la cuota está vencida y no pagada, agregarla al reporte
                    if (fechaActual > fechaProgramada && !estaPagado) {
                        hayCuotasVencidas = true;
                        const diasAtraso = Math.floor((fechaActual - fechaProgramada) / (1000 * 60 * 60 * 24));

                        const fila = `
                            <tr>
                                <td>${prestamo.id}</td>
                                <td>${prestamo.nombreCliente}</td>
                                <td>${this.formatoMoneda(prestamo.monto)}</td>
                                <td style="text-align: center;">${cuota.periodo}</td>
                                <td>${this.formatoFecha(fechaProgramada)}</td>
                                <td style="text-align: center; color: red; font-weight: bold;">${diasAtraso}</td>
                                <td>${this.formatoMoneda(cuota.cuotaTotal)}</td>
                            </tr>
                        `;
                        this.tablaReportesVencidos.innerHTML += fila;
                    }
                }
            }

            if (!hayCuotasVencidas) {
                 this.tablaReportesVencidos.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay cuotas vencidas.</td></tr>';
            }

        } catch (error) {
            console.error('Error al cargar el reporte de préstamos vencidos:', error);
            this.tablaReportesVencidos.innerHTML = '<tr><td colspan="7">Error al cargar el reporte.</td></tr>';
        } finally {
            this.showLoading(false);
        }
    }

    formatoMoneda(valor) {
        return valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    }

    formatoFecha(fecha) {
        return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

export default FormReportes;