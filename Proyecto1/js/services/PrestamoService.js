import PrestamoRepository from '../repository/PrestamoRepository.js';
import ClienteRepository from '../repository/ClienteRepository.js';
import AmortizacionService from "../services/AmortizacionService.js";

class PrestamoService {
    constructor() {
        this.prestamoRepository = new PrestamoRepository();
        this.clienteRepository = new ClienteRepository();
        this.amortizacionService = new AmortizacionService();
    }

    async createPrestamo(idCliente, cuotaMensual, monto, tasaAnual, plazo, fechaDesembolso) {
        try {
            if (!idCliente || isNaN(monto) || isNaN(tasaAnual) || isNaN(plazo)) {
                throw new Error('Por favor, complete todos los campos correctamente.');
            }

            // RF18: Verificar si el cliente tiene préstamos vencidos
            const prestamosDelCliente = await this.getAllPrestamos({clienteId: idCliente});

            const tieneVencidos = prestamosDelCliente.some(p => p.estado === 'Vencido');
            if (tieneVencidos) {
                throw new Error('Este cliente tiene préstamos vencidos. No se puede registrar uno nuevo.');
            }

            const clienteDoc = await this.clienteRepository.getById(idCliente);
            if (!clienteDoc) {
                throw new Error('El cliente seleccionado no existe.');
            }

            const prestamoData = {
                idCliente: idCliente,
                nombreCliente: clienteDoc.nombre,
                monto: monto,
                tasaInteres: tasaAnual,
                plazo: plazo,
                fechaDesembolso: new Date(fechaDesembolso),
                cuotaMensual: cuotaMensual,
                estado: 'Activo',
                fechaCreacion: new Date(),
            };

            const value = await this.prestamoRepository.add(prestamoData);
            return value.id;
/*
            const amortizacionData = {
                idPrestamo: value,
                periodo: prestamoData.plazo,
                fecha_programada: prestamoData.fechaDesembolso,
                saldo_inicial: prestamoData.monto,
                interes: prestamoData.tasaInteres,
                amortizacion_capital: prestamoData.cuotaMensual,
                cuota_total: prestamoData.cuotaMensual,
                saldo_final: 0,
                fecha_pago_real: null
            }


            await this.amortizacionService.addAmortizacion(prestamoData.idCliente, value);
*/
        } catch (error) {
            throw error;
        }
    }

    async getAllPrestamos(filtros = {}) {
        try {
            const prestamos = await this.prestamoRepository.getAll(filtros);
            return prestamos;
        } catch (error) {
            throw error;
        }
    }

    async getPrestamoById(id) {
        try {
            const prestamo = await this.prestamoRepository.getById(id);
            // Las fechas de Firestore vienen como Timestamps, las convertimos a Date de JS
            if (prestamo.fechaDesembolso) {
                prestamo.fechaDesembolso = prestamo.fechaDesembolso.toDate();
            }
            if (prestamo.fechaCreacion) {
                prestamo.fechaCreacion = prestamo.fechaCreacion.toDate();
            }
            return prestamo;
        } catch (error) {
            throw error;
        }
    }

    generarTablaAmortizacion(prestamo) {
        const tabla = [];
        let saldoInicial = prestamo.monto;
        const tasaMensual = (prestamo.tasaInteres / 100) / 12;

        for (let i = 1; i <= prestamo.plazo; i++) {
            const interes = saldoInicial * tasaMensual;
            const amortizacionCapital = prestamo.cuotaMensual - interes;
            const saldoFinal = saldoInicial - amortizacionCapital;

            // Calculamos la fecha programada para este pago
            const fechaProgramada = new Date(prestamo.fechaDesembolso);
            fechaProgramada.setMonth(fechaProgramada.getMonth() + i);

            const pago = {
                periodo: i,
                fechaProgramada: fechaProgramada,
                saldoInicial: saldoInicial,
                interes: interes,
                amortizacionCapital: amortizacionCapital,
                cuotaTotal: prestamo.cuotaMensual,
                saldoFinal: saldoFinal < 0.01 ? 0 : saldoFinal, // Redondeo para el último pago
                fechaPagoReal: null // Esto se actualizará cuando se registre un pago
            };
            tabla.push(pago);
            saldoInicial = saldoFinal;
        }
        return tabla;
    }

    async realizarPago(prestamoId, periodo) {
        try {
            await this.prestamoRepository.registrarPago(prestamoId, periodo, new Date());

            // Actualizar el estado del préstamo después del pago
            await this.actualizarEstadoPrestamo(prestamoId);

        } catch (error) {
            throw error;
        }
    }

    // Método para determinar y actualizar el estado de un préstamo
    async actualizarEstadoPrestamo(prestamoId) {
        try {
            const prestamo = await this.getPrestamoById(prestamoId);
            const tabla = this.generarTablaAmortizacion(prestamo);

            // Verificar si todos los pagos están hechos
            const todosPagados = tabla.every(p => prestamo.pagos && prestamo.pagos[p.periodo]);
            if (todosPagados) {
                await this.prestamoRepository.update(prestamoId, {estado: 'Pagado'});
                return;
            }

            // Si no está pagado completamente, verificar si está vencido o activo
            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0); // Normalizar a medianoche para comparación de fechas

            // Determinar si hay algún pago vencido
            const hayPagosVencidos = tabla.some(pago => {
                const fechaProgramada = new Date(pago.fechaProgramada);
                fechaProgramada.setHours(0, 0, 0, 0);
                const estaPagado = prestamo.pagos && prestamo.pagos[pago.periodo];
                return fechaActual > fechaProgramada && !estaPagado;
            });

            // Determinar el nuevo estado
            let nuevoEstado = 'Activo';
            if (hayPagosVencidos) {
                nuevoEstado = 'Vencido';
            }

            // Actualizar el estado si ha cambiado
            if (prestamo.estado !== nuevoEstado) {
                await this.prestamoRepository.update(prestamoId, {estado: nuevoEstado});
            }

        } catch (error) {
            console.error('Error al actualizar estado del préstamo:', error);
            throw error;
        }
    }

    // Método para actualizar estados de todos los préstamos activos y vencidos
    async actualizarTodosLosEstados() {
        try {
            // Obtener todos los préstamos que no están pagados
            const prestamosActivos = await this.getAllPrestamos({estado: 'activo'});
            const prestamosVencidos = await this.getAllPrestamos({estado: 'vencido'});

            const todosLosPrestamos = [...prestamosActivos, ...prestamosVencidos];

            for (const prestamo of todosLosPrestamos) {
                await this.actualizarEstadoPrestamo(prestamo.id);
            }

            return {
                procesados: todosLosPrestamos.length,
                mensaje: `Se procesaron ${todosLosPrestamos.length} préstamos`
            };

        } catch (error) {
            console.error('Error al actualizar todos los estados:', error);
            throw error;
        }
    }

    // RF19: Obtener resumen financiero
    async getResumenFinanciero() {
        try {
            const todosLosPrestamos = await this.getAllPrestamos();
            let montoTotalPrestado = 0;
            let interesesTotalesARecibir = 0;

            for (const prestamo of todosLosPrestamos) {
                // --- VALIDACIÓN DE ROBUSTEZ ---
                // Si un préstamo tiene datos inválidos, lo omitimos para no romper todo el cálculo.
                if (typeof prestamo.monto !== 'number' || typeof prestamo.tasaInteres !== 'number' || typeof prestamo.plazo !== 'number' || !prestamo.fechaDesembolso) {
                    console.warn(`El préstamo con ID ${prestamo.id} se ha omitido del resumen financiero por tener datos inválidos o incompletos.`);
                    continue; // Saltar al siguiente préstamo
                }

                // Sumar al monto total prestado
                montoTotalPrestado += prestamo.monto;

                // Calcular intereses para este préstamo
                const tablaAmortizacion = this.generarTablaAmortizacion(prestamo);
                const interesDelPrestamo = tablaAmortizacion.reduce((total, cuota) => total + cuota.interes, 0);
                interesesTotalesARecibir += interesDelPrestamo;
            }

            return {
                montoTotalPrestado,
                interesesTotalesARecibir
            };

        } catch (error) {
            console.error('Error al generar el resumen financiero:', error);
            throw error;
        }
    }
}

export default PrestamoService;