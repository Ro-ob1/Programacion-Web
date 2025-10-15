class Amortizacion {
    constructor(periodo, fechaProgramada, saldoInicial, interes, amortizacionCapital, cuotaTotal, saldoFinal, fechaPagoReal) {
        this.periodo = periodo;
        this.fechaProgramada = fechaProgramada;
        this.saldoInicial = saldoInicial;
        this.interes = interes;
        this.amortizacionCapital = amortizacionCapital;
        this.cuotaTotal = cuotaTotal;
        this.saldoFinal = saldoFinal;
        this.fechaPagoReal = fechaPagoReal;
    }
    static fromFirestore(doc) {
        const data = doc.data();
        return new Amortizacion(
            data.periodo,
            data.fechaProgramada?.toDate(),
            data.saldoInicial,
            data.interes,
            data.amortizacionCapital,
            data.cuotaTotal,
            data.saldoFinal,
            data.fechaPagoReal?.toDate()
        );
    }
}

export default Amortizacion;