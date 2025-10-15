class FormAmortizacion {
    constructor(toast, showLoading, prestamoService) {
        this.prestamoService = prestamoService;
        this.prestamoAmortizacionSelect = document.getElementById('prestamoAmortizacion');
        this.tablaAmortizacionBody = document.querySelector('#tablaAmortizacion tbody');
        this.infoPrestamoDiv = document.getElementById('infoPrestamo');
        this.toast = toast
        this.showLoading = showLoading;
        this.initEventListeners();
    }

    initEventListeners() {
        this.installEventViewAmortizacion();
        this.installEventOpenModalPdf();
    }

    installEventViewAmortizacion(){
        this.prestamoAmortizacionSelect.addEventListener('change', async () => {
            const prestamoId = this.prestamoAmortizacionSelect.value;
            if (prestamoId) {
                await this.mostrarTablaAmortizacion(prestamoId);
            } else {
                this.limpiarVista();
            }
        });
    }

    installEventOpenModalPdf(){
        const btnGenerarPdf = document.querySelector(
              "#amortizacion .btn-primary"
            );
            const modalPdf = document.getElementById("modalPdf");
            const pdfViewer = document.getElementById("pdfViewer");
            const closeModal = modalPdf.querySelector(".close-button");

            // Evita múltiples listeners si cambias de pestañas
            btnGenerarPdf.replaceWith(btnGenerarPdf.cloneNode(true));
            const newBtnGenerarPdf = document.querySelector(
              "#amortizacion .btn-primary"
            );

            newBtnGenerarPdf.addEventListener("click", async () => {
              const prestamoId = document.getElementById(
                "prestamoAmortizacion"
              ).value;

              if (!prestamoId) {
                app.toast.error("Seleccione un préstamo para generar el PDF");
                return;
              }

              try {
                app.showLoading(true);

                const imageToBase64 = async (url) => {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                };

                const logoUrl = '../logo.png';
                let logoBase64 = null;
                try {
                  logoBase64 = await imageToBase64(logoUrl);
                } catch (error) {
                  console.error("Error al cargar el logo:", error);
                }


                const prestamo = await app.prestamoService.getPrestamoById(
                  prestamoId
                );
                const idCliente = prestamo.clienteId || prestamo.idCliente;
                if (!idCliente) {
                  throw new Error(
                    "El préstamo no tiene asociado un clienteId o idCliente."
                  );
                }
                const cliente = await app.clienteService.getClienteById(
                  idCliente
                );

                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const pageHeight = doc.internal.pageSize.height;
                const pageWidth = doc.internal.pageSize.width;

                // --- ENCABEZADO ---
                if (logoBase64) {
                  doc.addImage(logoBase64, 'PNG', 15, 15, 30, 15);
                }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(20);
                doc.setTextColor(40, 40, 40);
                doc.text("Reporte de Amortización", pageWidth / 2, 22, {
                  align: "center",
                });

                doc.setLineWidth(0.5);
                doc.setDrawColor(44, 62, 80);
                doc.line(20, 35, pageWidth - 20, 35);

                // --- INFORMACIÓN DEL PRÉSTAMO ---
                doc.setFont("helvetica", "normal");
                doc.setFontSize(11);
                doc.setTextColor(80, 80, 80);

                const infoCliente = `Cliente: ${cliente.nombre || cliente.nombreCliente || "N/D"
                  }`;
                const infoRFC = `RFC: ${cliente.rfc || "N/D"}`;
                doc.text(infoCliente, 20, 45);
                doc.text(infoRFC, pageWidth - 20, 45, { align: "right" });

                const monto = parseFloat(prestamo.monto) || 0;
                const tasa = parseFloat(prestamo.tasaInteres) || 0;
                const plazo = parseInt(prestamo.plazo, 10) || 0;

                const infoMonto = `Monto del Préstamo: ${monto.toLocaleString(
                  "es-MX",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}`;
                const infoTasa = `Tasa de Interés Anual: ${tasa}%`;
                const infoPlazo = `Plazo: ${plazo} meses`;

                doc.text(infoMonto, 20, 55);
                doc.text(infoTasa, pageWidth / 2, 55, { align: "center" });
                doc.text(infoPlazo, pageWidth - 20, 55, { align: "right" });

                // --- TABLA DE AMORTIZACIÓN ---
                const tablaAmortizacion =
                  app.prestamoService.generarTablaAmortizacion(prestamo);
                const head = [
                  [
                    "#",
                    "Fecha",
                    "Saldo Inicial",
                    "Interés",
                    "Capital",
                    "Cuota",
                    "Saldo Final",
                  ],
                ];
                const body = tablaAmortizacion.map((pago) => [
                  pago.periodo,
                  pago.fechaProgramada instanceof Date
                    ? pago.fechaProgramada.toLocaleDateString("es-ES")
                    : pago.fechaProgramada,
                  `${pago.saldoInicial.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`,
                  `${pago.interes.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`,
                  `${pago.amortizacionCapital.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`,
                  `${pago.cuotaTotal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`,
                  `${pago.saldoFinal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                  })}`,
                ]);

                doc.autoTable({
                  head: head,
                  body: body,
                  startY: 65,
                  theme: "grid", // 'striped', 'grid', 'plain'
                  headStyles: {
                    fillColor: [44, 62, 80], // Color de fondo del encabezado
                    textColor: [255, 255, 255], // Color del texto del encabezado
                    fontStyle: "bold",
                  },
                  alternateRowStyles: {
                    fillColor: [245, 245, 245], // Color de fondo de filas alternas
                  },
                  styles: {
                    cellPadding: 3,
                    fontSize: 9,
                    valign: "middle",
                    halign: "center",
                  },
                  columnStyles: {
                    2: { halign: "right" },
                    3: { halign: "right" },
                    4: { halign: "right" },
                    5: { halign: "right" },
                    6: { halign: "right" },
                  },
                });

                // --- PIE DE PÁGINA ---
                const pageCount = doc.internal.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                  doc.setPage(i);
                  doc.setFont("helvetica", "italic");
                  doc.setFontSize(8);
                  doc.setTextColor(150, 150, 150);

                  const fechaGeneracion = new Date().toLocaleDateString(
                    "es-ES",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  );

                  doc.text(
                    `Generado el ${fechaGeneracion}`,
                    20,
                    pageHeight - 10
                  );
                  doc.text(
                    `Página ${i} de ${pageCount}`,
                    pageWidth - 20,
                    pageHeight - 10,
                    { align: "right" }
                  );
                }

                // --- MOSTRAR PDF ---
                const pdfData = doc.output("datauristring");
                pdfViewer.src = pdfData;
                modalPdf.style.display = "block";
              } catch (error) {
                console.error("Error al generar el PDF:", error);
                app.toast.error(
                  error.message || "Ocurrió un error al generar el PDF."
                );
              } finally {
                app.showLoading(false);
              }
            });

            // Cerrar modal
            closeModal.addEventListener("click", () => {
              modalPdf.style.display = "none";
            });
    }

    async init(clienteId = null) {
        await this.cargarPrestamosEnDropdown(clienteId);
    }

    async cargarPrestamosEnDropdown(clienteId = null) {
        try {
            const filtros = {estado: 'todos'};
            if (clienteId) {
                filtros.clienteId = clienteId;
            }
            this.showLoading(true);
            const prestamos = await this.prestamoService.getAllPrestamos(filtros);
            this.prestamoAmortizacionSelect.innerHTML = '<option value="">Seleccione un préstamo...</option>';
            prestamos.forEach(prestamo => {
                const option = document.createElement('option');
                option.value = prestamo.id;
                option.textContent = `${prestamo.nombreCliente} - ${prestamo.monto.toFixed(2)} (${prestamo.estado})`;
                this.prestamoAmortizacionSelect.appendChild(option);
            });
            this.showLoading(false);
        } catch (error) {
            this.showLoading(false);
            this.toast.error('Error al cargar los préstamos en el selector.');
        }
    }

    async mostrarTablaAmortizacion(prestamoId) {
        try {
            this.showLoading(true);
            const prestamo = await this.prestamoService.getPrestamoById(prestamoId);
            const tabla = this.prestamoService.generarTablaAmortizacion(prestamo);

            this.infoPrestamoDiv.innerHTML = `
                <h4>Información del Préstamo</h4>
                <p><strong>Cliente:</strong> ${prestamo.nombreCliente}</p>
                <p><strong>Monto:</strong> ${prestamo.monto.toFixed(2)}</p>
                <p><strong>Tasa:</strong> ${prestamo.tasaInteres}%</p>
                <p><strong>Cuota Mensual:</strong> ${prestamo.cuotaMensual.toFixed(2)}</p>
            `;

            const toDecimal = (numero) => {
                return numero.toLocaleString('es-MX', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }


            // Encontrar el primer período pendiente de pago
            let siguientePeriodoAPagar = null;
            for (let i = 1; i <= prestamo.plazo; i++) {
                if (!prestamo.pagos || !prestamo.pagos[i]) {
                    siguientePeriodoAPagar = i;
                    break;
                }
            }

            // Fecha actual para comparaciones
            const fechaActual = new Date();
            fechaActual.setHours(0, 0, 0, 0);

            // Determinar si todo el préstamo está vencido
            const prestamoVencido = prestamo.estado === 'Vencido';

            this.tablaAmortizacionBody.innerHTML = '';
            tabla.forEach(pago => {
                const estaPagado = prestamo.pagos && prestamo.pagos[pago.periodo];
                const fechaPagoReal = estaPagado 
                    ? prestamo.pagos[pago.periodo].toDate().toLocaleDateString('es-MX')
                    : null;

                // Determinar estado del pago
                let estadoPago = 'Pendiente';
                let claseEstado = 'card-pedding-date';
                
                if (estaPagado) {
                    estadoPago = 'Pagado';
                    claseEstado = 'card-success-date';
                } else {
                    const fechaProgramada = new Date(pago.fechaProgramada);
                    fechaProgramada.setHours(0, 0, 0, 0);
                    
                    if (prestamoVencido || fechaActual > fechaProgramada) {
                        estadoPago = 'Vencido';
                        claseEstado = 'card-overdue-date';
                    }
                }

                const puedeRealizarse = pago.periodo === siguientePeriodoAPagar;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${pago.periodo}</td>
                    <td>${pago.fechaProgramada.toLocaleDateString('es-MX')}</td>
                    <td>${toDecimal(pago.saldoInicial)}</td>
                    <td>${pago.interes.toFixed(2)}</td>
                    <td>${toDecimal(pago.amortizacionCapital)}</td>
                    <td>${toDecimal(pago.cuotaTotal)}</td>
                    <td>${toDecimal(pago.saldoFinal)}</td>
                    
                    <td>
                        <div class="${claseEstado}">
                            ${estaPagado 
                                ? `<div class="card-body p-2">
                                    <strong>Pagado</strong><br>
                                    <span>${fechaPagoReal}</span>
                                   </div>`
                                : `<div>${estadoPago}</div>`
                            }
                        </div>
                    </td>
                    
                    <td>
                        ${this.generarBotonPago(prestamo.id, pago.periodo, estaPagado, puedeRealizarse)}
                    </td>
                `;
                this.tablaAmortizacionBody.appendChild(row);
            });

            this.showLoading(false);
        } catch (error) {
            this.showLoading(false);
            this.toast.error(`Error al mostrar la tabla de amortización: ${error.message}`);
        }

        window.registrarPago = async (prestamoId, periodo) => {
            try {
                await this.prestamoService.realizarPago(prestamoId, periodo);
                this.toast.success(`Pago del período ${periodo} registrado correctamente.`);
                await this.mostrarTablaAmortizacion(prestamoId);
            } catch (error) {
                this.toast.error(`Error al registrar el pago: ${error.message}`);
            }
        };
    }

    generarBotonPago(prestamoId, periodo, estaPagado, puedeRealizarse) {
        if (estaPagado) {
            return '<span class="estado-pagado">Pagado</span>';
        }
        
        if (puedeRealizarse) {
            return `<button class="btn btn-success btn-small" onclick="registrarPago('${prestamoId}', ${periodo})" title="Pagar período ${periodo}">
                        Pagar
                    </button>`;
        }
        
        return `<button class="btn btn-secondary btn-small" disabled title="Debe pagar los períodos anteriores primero">
                    Bloqueado
                </button>`;
    }

    limpiarVista() {
        this.infoPrestamoDiv.innerHTML = '';
        this.tablaAmortizacionBody.innerHTML = '';
    }
}

export default FormAmortizacion;
