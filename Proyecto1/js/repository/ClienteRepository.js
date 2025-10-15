import { db } from "../config/firebase-config.js";
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

class ClienteRepository {
  // Constructor de la clase ClienteRepository
  constructor() {
    this.collectionName = "clientes";
    this.collection = collection(db, this.collectionName);
  }

  // CREATE - Crear nuevo cliente
  async add(clienteData) {
    try {
      const docRef = await addDoc(this.collection, { ...clienteData });
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // READ - Obtener todos los clientes
  async getAll() {
    try {
      const q = query(this.collection, orderBy("fechaRegistro", "desc"));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      throw error;
    }
  }

  // READ - Obtener cliente por ID
  async getById(id) {
    try {
      if (!id || typeof id !== "string" || id.trim() === "") {
        throw new Error("ID de cliente no válido o indefinido");
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        };
      } else {
        throw new Error("Cliente no encontrado");
      }
    } catch (error) {
      console.error("Error en getById:", error.message);
      throw error;
    }
  }

  // UPDATE - Actualizar cliente
  async update(id, updates) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, updates);
    } catch (error) {
      throw error;
    }
  }

  // DELETE - Eliminar cliente
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }
}

export default ClienteRepository;
