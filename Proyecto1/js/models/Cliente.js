class Cliente {
    constructor(id, nombre, telefono, rfc, direccion, genero, fechaNacimiento, fechaRegistro = new Date(), imagenUrl = null, firma = null) {
        this.id = id;
        this.nombre = nombre;
        this.telefono = telefono;
        this.rfc = rfc;
        this.direccion = direccion;
        this.genero = genero;
        this.fechaNacimiento = fechaNacimiento;
        this.fechaRegistro = fechaRegistro;
        this.imagenUrl = imagenUrl;
        this.firma = firma;
    }

    getEdad() {
        if (!this.fechaNacimiento) return null;
        const hoy = new Date();
        const nacimiento = new Date(this.fechaNacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }
        return edad;
    }

    getFechaNacimiento() {
        return this.fechaNacimiento;
    }

    static fromFirestore(doc) {
        const data = doc.data();
        return new Cliente(
            doc.id,
            data.nombre,
            data.telefono,
            data.rfc,
            data.direccion,
            data.genero,
            data.fechaNacimiento?.toDate(),
            data.fechaRegistro?.toDate(),
            data.imagenUrl || null,
            data.firma || null
        );
    }
}

export default Cliente;
