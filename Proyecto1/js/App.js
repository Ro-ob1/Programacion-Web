// Imports Servicios
import ClienteService from "./services/ClienteService.js";
import PrestamoService from "./services/PrestamoService.js";

// Imports Formularios
import FormCliente from "./form/FormCliente.js";
import FormPrestamo from "./form/FormPrestamo.js";
import FormAmortizacion from "./form/FormAmortizacion.js";
import FormReportes from "./form/FormReportes.js";

class App {
  constructor() {
    // Servicios
    this.clienteService = new ClienteService();
    this.prestamoService = new PrestamoService();
    // Tost
    this.toast = new Notyf({
      duration: 3000,
      position: {
        x: "right",
        y: "top",
      },
      types: [
        {
          type: "warning",
          background: "orange",
          icon: {
            className: "material-icons",
            tagName: "i",
            text: "warning",
          },
        },
        {
          type: "error",
          background: "indianred",
          duration: 2000,
          dismissible: true,
        },
      ],
    });
    // Funcion Lambda para mostrar y ocultar loading
    this.showLoading = (isVisible) => {
      if (isVisible) {
        document.getElementById("loading").style.display = "block";
      } else {
        document.getElementById("loading").style.display = "none";
      }
    };

    // Formularios
    this.formCliente = new FormCliente(
      this.toast,
      this.showLoading,
      this.clienteService
    );
    this.formAmortizacion = new FormAmortizacion(
      this.toast,
      this.showLoading,
      this.prestamoService
    );
    this.formReportes = new FormReportes(
      this.prestamoService,
      this.showLoading
    );

    // Funcion Lambda para ver pagos desde FormPrestamo
    const lambdaVerPagos = async (id) => { await this.formAmortizacion.init(id);};
    this.formPrestamo = new FormPrestamo(
      this.toast,
      this.showLoading,
      this.prestamoService,
      this.clienteService,
      lambdaVerPagos
    );

    this.installEventManejoPestana(); //  <- Manejo de pestañas
    this.formCliente.cargarClientes(); // <- Cargar clientes al iniciar la app
    this.actualizarEstadosPrestamosAlIniciar(); // <- Actualizar estados de préstamos de la Base de Datos al iniciar
  }

  installEventManejoPestana() {
    document.addEventListener("DOMContentLoaded", function () {
      const tabs = document.querySelectorAll(".tab-button");
      const tabContents = document.querySelectorAll(".tab-content");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("active"));
          tabContents.forEach((c) => c.classList.remove("active"));

          tab.classList.add("active");
          document.getElementById(tab.dataset.tab).classList.add("active");

          if (tab.dataset.tab === "clientes") {
            app.formCliente.cargarClientes();
          } else if (tab.dataset.tab === "prestamos") {
            app.formPrestamo.cargarPrestamos();
            app.formPrestamo.cargarClientes();
          } else if (tab.dataset.tab === "amortizacion") {
            app.formAmortizacion.init();
          } else if (tab.dataset.tab === "reportes") {
            app.formReportes.cargarReporteVencidos();
            app.formReportes.cargarResumenFinanciero();
          }
        });
      });

      document.getElementById('btnImprimirClientes').addEventListener('click', () => {
        app.formCliente.imprimirClientesPDF();
      });
    });
  }

  // Actualizar estados de préstamos al iniciar la aplicación
  async actualizarEstadosPrestamosAlIniciar() {
    try {
      await this.prestamoService.actualizarTodosLosEstados();
    } catch (error) {
      console.error("Error al actualizar estados al iniciar:", error);
    }
  }
}

// Inicializar la aplicación
const app = new App();
window.app = app;