import AmortizacionRepository from "../repository/AmortizacionRepository.js";

class AmortizacionService {
    constructor() {
        this.amortizacionRepository = new AmortizacionRepository();
    }

    async addAmortizacion(amortizacionData) {
        try {

            if (!amortizacionData) {
                throw new Error("Datos de amortización no proporcionados");
            }

            const id = await this.amortizacionRepository.add(amortizacionData);
            return id;
        } catch (error) {
            throw error;
        }
    }
}
export default AmortizacionService;