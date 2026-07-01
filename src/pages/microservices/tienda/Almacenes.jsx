import React, { useEffect, useState } from 'react';
import AuthService from '../../../services/authService';

function Almacenes() {
  const [almacenes, setAlmacenes] = useState([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAlmacenes = async () => {
    setLoading(true);
    try {
      const token = AuthService.getToken();
      const res = await fetch(`http://${window.location.hostname}:3001/api/almacenes`, {
        headers: {
          'Authorization': `Bearer ${token}`

        }
      });
      const data = await res.json();
      setAlmacenes(data);
    } catch {
      setError('Error al cargar almacenes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const token = AuthService.getToken();
      const method = editId ? 'PUT' : 'POST';
      const url = `http://${window.location.hostname}:3001/api/almacenes${editId ? '/' + editId : ''}`;
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, descripcion })
      });
      if (!res.ok) throw new Error('Error en la operación');
      setNombre('');
      setDescripcion('');
      setEditId(null);
      fetchAlmacenes();
    } catch {
      setError('Error al guardar');
    }
    setLoading(false);
  };

  const handleEdit = (almacen) => {
    setEditId(almacen.id);
    setNombre(almacen.nombre);
    setDescripcion(almacen.descripcion || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este almacén?')) return;
    setLoading(true);
    try {
      const token = AuthService.getToken();
      const res = await fetch(`http://${window.location.hostname}:3001/api/almacenes/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchAlmacenes();
    } catch {
      setError('Error al eliminar');
    }
    setLoading(false);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4"><i className="fas fa-warehouse"></i> Almacenes</h2>
      <form className="row g-3 mb-4" onSubmit={handleSubmit}>
        <div className="col-md-4">
          <input type="text" className="form-control" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
        </div>
        <div className="col-md-6">
          <input type="text" className="form-control" placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button className="btn btn-success w-100" type="submit" disabled={loading}>
            {editId ? 'Actualizar' : 'Registrar'}
          </button>
        </div>
      </form>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {almacenes.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">No hay almacenes registrados</td></tr>
                ) : (
                  almacenes.map((a, idx) => (
                    <tr key={a.id}>
                      <td>{idx + 1}</td>
                      <td>{a.nombre}</td>
                      <td>{a.descripcion}</td>
                      <td>
                        <button className="btn btn-sm btn-primary me-2" onClick={() => handleEdit(a)}><i className="fas fa-edit"></i></button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}><i className="fas fa-trash"></i></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Almacenes;