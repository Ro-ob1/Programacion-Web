class Prestamo {
    constructor(cuotaMensual, estado, fechaCreacion, fechaDesembolso, idCliente, monto, nombreCliente, plazo, tasaInteres) {
        this.cuotaMensual = cuotaMensual;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.fechaDesembolso = fechaDesembolso;
        this.idCliente = idCliente;
        this.monto = monto;
        this.nombreCliente = nombreCliente;
        this.plazo = plazo;
        this.tasaInteres = tasaInteres;
    }

    // Método para convertir a objeto plano
    toObject() {
        return {
            cuotaMensual: this.cuotaMensual,
            estado: this.estado,
            fechaCreacion: this.fechaCreacion,
            fechaDesembolso: this.fechaDesembolso,
            idCliente: this.idCliente,
            monto: this.monto,
            nombreCliente: this.nombreCliente,
            plazo: this.plazo,
            tasaInteres: this.tasaInteres
        };
    }

    // Método estático para crear desde Firestore
    static fromFirestore(doc) {
        const data = doc.data();
        return new Prestamo(
            data.cuotaMensual,
            data.estado,
            data.fechaCreacion?.toDate(),
            data.fechaDesembolso?.toDate(),
            data.idCliente,
            data.monto,
            data.nombreCliente,
            data.plazo,
            data.tasaInteres
        );
    }
}

export default Prestamo;