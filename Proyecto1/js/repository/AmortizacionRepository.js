import {db} from "../config/firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    where,
    Timestamp,
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

class AmortizacionRepository {
    constructor() {
        this.collectionName = "amortizaciones";
        this.collection = collection(db, this.collectionName);
    }

    async add(amortizacionData) {
        try {
            const docRef = await addDoc(this.collection, {...amortizacionData});
            return docRef.id;
        } catch (e) {
            throw e;
        }
    }

}

export default AmortizacionRepository;