import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../../../config/apiConfig";

const DEPARTAMENTOS = [
  { value: "LP", label: "La Paz (LP)" },
  { value: "CBBA", label: "Cochabamba (CBBA)" },
  { value: "SCZ", label: "Santa Cruz (SCZ)" },
  { value: "ORU", label: "Oruro (ORU)" },
  { value: "PTSI", label: "Potosí (PTSI)" },
  { value: "TJA", label: "Tarija (TJA)" },
  { value: "CHQ", label: "Chuquisaca (CHQ)" },
  { value: "BEN", label: "Beni (BEN)" },
  { value: "PND", label: "Pando (PND)" },
  { value: "ALTO", label: "El Alto (ALTO)" },
];

const RegistroEstudiante = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    if (currentStep === 3) {
      setCanSubmit(false);
      const timer = setTimeout(() => setCanSubmit(true), 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const [form, setForm] = useState({
    codigo_estudiante: "",
    nombre: "",
    apellido_paterno: "",
    apellido_materno: "",
    ci_estudiante: "",
    fecha_nacimiento: "",
    lugar_nacimiento: "",
    genero: "",
    direccion: "",

    nombre_padre: "",
    apellido_padre: "",
    ci_padre: "",
    tipo_ci_padre: "ci",
    extension_ci_padre: "",
    profesion_padre: "",
    lugar_trabajo_padre: "",
    telefono_domicilio_padre: "",
    telefono_oficina_padre: "",
    whatsapp_domicilio_padre: false,
    whatsapp_oficina_padre: false,

    nombre_madre: "",
    apellido_madre: "",
    ci_madre: "",
    tipo_ci_madre: "ci",
    extension_ci_madre: "",
    profesion_madre: "",
    lugar_trabajo_madre: "",
    telefono_domicilio_madre: "",
    telefono_oficina_madre: "",
    whatsapp_domicilio_madre: false,
    whatsapp_oficina_madre: false,

    nombre_autorizado1: "",
    telefono_autorizado1: "",
    nombre_autorizado2: "",
    telefono_autorizado2: "",

    alergias: "",
    vacunas: "",
    seguro_medico: "",
  });

  // Generar código de estudiante automáticamente
  useEffect(() => {
    const ci = form.ci_estudiante.trim();
    const n = (form.nombre || "").trim().charAt(0).toUpperCase();
    const ap = (form.apellido_paterno || "").trim().charAt(0).toUpperCase();
    const am = (form.apellido_materno || "").trim().charAt(0).toUpperCase();

    if (ci) {
      setForm((prev) => ({
        ...prev,
        codigo_estudiante: `${ci}${n}${ap}${am}`,
      }));
    } else {
      setForm((prev) => ({ ...prev, codigo_estudiante: "" }));
    }
  }, [
    form.ci_estudiante,
    form.nombre,
    form.apellido_paterno,
    form.apellido_materno,
  ]);

  const fillRandomData = () => {
    const randomCI = Math.floor(1000000 + Math.random() * 9000000).toString();
    setForm({
      codigo_estudiante: "",
      nombre: "Estudiante " + Math.floor(Math.random() * 1000),
      apellido_paterno: "Perez",
      apellido_materno: "Gomez",
      ci_estudiante: randomCI,
      fecha_nacimiento: "2010-05-15",
      lugar_nacimiento: "LP",
      genero: "M",
      direccion: "Av. Siempre Viva 123",
      nombre_padre: "Carlos",
      apellido_padre: "Perez",
      ci_padre: (parseInt(randomCI) + 1).toString(),
      extension_ci_padre: "LP",
      profesion_padre: "Ingeniero",
      lugar_trabajo_padre: "Empresa X",
      telefono_domicilio_padre: "7" + Math.floor(1000000 + Math.random() * 9000000).toString(),
      telefono_oficina_padre: "2" + Math.floor(100000 + Math.random() * 900000).toString(),
      whatsapp_domicilio_padre: true,
      whatsapp_oficina_padre: false,
      nombre_madre: "Maria",
      apellido_madre: "Gomez",
      ci_madre: (parseInt(randomCI) + 2).toString(),
      extension_ci_madre: "LP",
      profesion_madre: "Doctora",
      lugar_trabajo_madre: "Hospital Y",
      telefono_domicilio_madre: "6" + Math.floor(1000000 + Math.random() * 9000000).toString(),
      telefono_oficina_madre: "",
      whatsapp_domicilio_madre: true,
      whatsapp_oficina_madre: false,
      nombre_autorizado1: "Tio Juan",
      telefono_autorizado1: "71234567",
      nombre_autorizado2: "",
      telefono_autorizado2: "",
      alergias: "Ninguna",
      vacunas: "Completas",
      seguro_medico: "Caja Nacional",
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
    if (error) setError(null);
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (
        !form.nombre.trim() ||
        !form.ci_estudiante.trim() ||
        !form.fecha_nacimiento
      ) {
        setError(
          "Por favor complete los campos obligatorios (Nombre, CI y Fecha de Nacimiento).",
        );
        return;
      }
    }
    setError(null);
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < 3) return; // Por si acaso

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const baseUrl = getApiUrl("/estudiantes/public/registro");
      const response = await fetch(`${baseUrl}/estudiantes/public/registro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        window.scrollTo(0, 0);
      } else {
        setError(data.message || "Error al registrar el estudiante");
      }
    } catch (err) {
      setError("Error de conexión con el servidor. Intente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (currentStep < 3) {
      handleNextStep();
    } else {
      if (!canSubmit) return;
      handleSubmit(e);
    }
  };

  if (success) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#f4f6f9" }}
      >
        <div
          className="card shadow-lg p-5 text-center"
          style={{ maxWidth: "500px", borderRadius: "15px" }}
        >
          <div className="mb-4">
            <i
              className="fas fa-check-circle text-success"
              style={{ fontSize: "5rem" }}
            ></i>
          </div>
          <h2 className="text-success fw-bold mb-3">¡Registro Exitoso!</h2>
          <p className="text-muted mb-4">
            Los datos del estudiante han sido guardados correctamente. Por
            favor, acérquese a administración para completar la inscripción
            académica (Nivel, Curso, Turno).
          </p>
          <div className="alert alert-info fw-bold mb-4">
            Código Asignado: {form.codigo_estudiante}
          </div>
          <button
            className="btn btn-primary w-100 py-2 fw-bold"
            onClick={() => window.location.reload()}
          >
            Registrar Otro Estudiante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{ backgroundColor: "#f4f6f9" }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            <div
              className="card shadow-lg border-0"
              style={{ borderRadius: "15px", overflow: "hidden" }}
            >
              <div className="card-header bg-primary text-white text-center py-4">
                <h2 className="mb-0 fw-bold">
                  <i className="fas fa-user-graduate me-2"></i>
                  Registro de Nuevo Estudiante
                </h2>
                <p className="mb-0 mt-2 text-white-50">
                  Complete el formulario para registrar a un nuevo estudiante en
                  la institución.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-light mt-3 fw-bold shadow-sm"
                  onClick={fillRandomData}
                >
                  <i className="fas fa-magic me-2"></i> Llenar Datos de Prueba
                </button>
              </div>

              <div className="card-body p-4 p-md-5">
                {/* Indicador de Pasos */}
                <div className="position-relative mb-5">
                  <div className="progress" style={{ height: "5px" }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                      aria-valuenow={((currentStep - 1) / 2) * 100}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <div
                    className="d-flex justify-content-between position-absolute top-50 start-0 w-100 translate-middle-y mt-1"
                    style={{ padding: "0 5%" }}
                  >
                    <div className="text-center">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-1 shadow-sm ${currentStep >= 1 ? "bg-primary" : "bg-secondary"}`}
                        style={{
                          width: "40px",
                          height: "40px",
                          border: "3px solid white",
                          transition: "all 0.3s",
                        }}
                      >
                        1
                      </div>
                      <span
                        className={`small fw-bold ${currentStep >= 1 ? "text-primary" : "text-muted"}`}
                      >
                        Estudiante
                      </span>
                    </div>
                    <div className="text-center">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-1 shadow-sm ${currentStep >= 2 ? "bg-primary" : "bg-secondary"}`}
                        style={{
                          width: "40px",
                          height: "40px",
                          border: "3px solid white",
                          transition: "all 0.3s",
                        }}
                      >
                        2
                      </div>
                      <span
                        className={`small fw-bold ${currentStep >= 2 ? "text-primary" : "text-muted"}`}
                      >
                        Padres
                      </span>
                    </div>
                    <div className="text-center">
                      <div
                        className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold mx-auto mb-1 shadow-sm ${currentStep >= 3 ? "bg-primary" : "bg-secondary"}`}
                        style={{
                          width: "40px",
                          height: "40px",
                          border: "3px solid white",
                          transition: "all 0.3s",
                        }}
                      >
                        3
                      </div>
                      <span
                        className={`small fw-bold ${currentStep >= 3 ? "text-primary" : "text-muted"}`}
                      >
                        Otros Datos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-3"></div>

                {error && (
                  <div className="alert alert-danger mb-4">
                    <i className="fas fa-exclamation-circle me-2"></i>
                    {error}
                  </div>
                )}

                <form onSubmit={handleFormSubmit}>
                  {/* PASO 1: DATOS DEL ESTUDIANTE */}
                  {currentStep === 1 && (
                    <div className="step-content">
                      <h4 className="text-primary border-bottom pb-2 mb-4">
                        <i className="fas fa-user me-2"></i> Datos del
                        Estudiante
                      </h4>
                      <div className="row g-3 mb-5">
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Nombre(s) *
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            required={currentStep === 1}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Apellido Paterno
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_paterno"
                            value={form.apellido_paterno}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Apellido Materno
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_materno"
                            value={form.apellido_materno}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            CI Estudiante *
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="ci_estudiante"
                            value={form.ci_estudiante}
                            onChange={handleChange}
                            required={currentStep === 1}
                          />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label fw-bold text-primary small">
                            Código Estudiante (Autogenerado)
                          </label>
                          <input
                            type="text"
                            className="form-control bg-light text-primary fw-bold"
                            name="codigo_estudiante"
                            value={form.codigo_estudiante}
                            readOnly
                            disabled
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Fecha Nacimiento *
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            name="fecha_nacimiento"
                            value={form.fecha_nacimiento}
                            onChange={handleChange}
                            required={currentStep === 1}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Lugar Nacimiento
                          </label>
                          <select
                            className="form-select"
                            name="lugar_nacimiento"
                            value={form.lugar_nacimiento}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione...</option>
                            {DEPARTAMENTOS.map((dep) => (
                              <option key={dep.value} value={dep.value}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label fw-bold text-muted small">
                            Género
                          </label>
                          <select
                            className="form-select"
                            name="genero"
                            value={form.genero}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione...</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                          </select>
                        </div>
                        <div className="col-md-12">
                          <label className="form-label fw-bold text-muted small">
                            Dirección Domicilio
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="direccion"
                            value={form.direccion}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: DATOS DE LOS PADRES */}
                  {currentStep === 2 && (
                    <div className="step-content">
                      <h4 className="text-info border-bottom pb-2 mb-4">
                        <i className="fas fa-male me-2"></i> Datos del Padre
                      </h4>
                      <div className="row g-3 mb-5">
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Nombre(s)
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_padre"
                            value={form.nombre_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Apellidos
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_padre"
                            value={form.apellido_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label fw-bold text-muted small">
                            CI
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="ci_padre"
                            value={form.ci_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label fw-bold text-muted small">
                            Ext.
                          </label>
                          <select
                            className="form-select"
                            name="extension_ci_padre"
                            value={form.extension_ci_padre}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione...</option>
                            {DEPARTAMENTOS.map((dep) => (
                              <option key={dep.value} value={dep.value}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Profesión
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="profesion_padre"
                            value={form.profesion_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Lugar de Trabajo
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="lugar_trabajo_padre"
                            value={form.lugar_trabajo_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Celular/Teléfono (Personal)
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <i className="fas fa-phone"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_domicilio_padre"
                              value={form.telefono_domicilio_padre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <input
                                className="form-check-input mt-0 me-2"
                                type="checkbox"
                                name="whatsapp_domicilio_padre"
                                checked={form.whatsapp_domicilio_padre}
                                onChange={handleChange}
                              />
                              <i className="fab fa-whatsapp text-success"></i>
                            </div>
                          </div>
                          <div className={`form-text ${form.whatsapp_domicilio_padre ? 'text-primary fw-bold' : 'text-success'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                            {form.whatsapp_domicilio_padre ? (
                              <><i className="fas fa-check-double"></i> Usted recibirá los comunicados a este número.</>
                            ) : (
                              <><i className="fas fa-info-circle"></i> Marque la casilla de WhatsApp si desea recibir comunicados del colegio a este número.</>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Teléfono (Trabajo)
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <i className="fas fa-building"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_oficina_padre"
                              value={form.telefono_oficina_padre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <input
                                className="form-check-input mt-0 me-2"
                                type="checkbox"
                                name="whatsapp_oficina_padre"
                                checked={form.whatsapp_oficina_padre}
                                onChange={handleChange}
                              />
                              <i className="fab fa-whatsapp text-success"></i>
                            </div>
                          </div>

                        </div>
                      </div>

                      <h4 className="text-warning border-bottom pb-2 mb-4">
                        <i className="fas fa-female me-2"></i> Datos de la Madre
                      </h4>
                      <div className="row g-3 mb-5">
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Nombre(s)
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_madre"
                            value={form.nombre_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Apellidos
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_madre"
                            value={form.apellido_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label fw-bold text-muted small">
                            CI
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="ci_madre"
                            value={form.ci_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-2">
                          <label className="form-label fw-bold text-muted small">
                            Ext.
                          </label>
                          <select
                            className="form-select"
                            name="extension_ci_madre"
                            value={form.extension_ci_madre}
                            onChange={handleChange}
                          >
                            <option value="">Seleccione...</option>
                            {DEPARTAMENTOS.map((dep) => (
                              <option key={dep.value} value={dep.value}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Profesión
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="profesion_madre"
                            value={form.profesion_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Lugar de Trabajo
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="lugar_trabajo_madre"
                            value={form.lugar_trabajo_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Celular/Teléfono (Personal)
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <i className="fas fa-phone"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_domicilio_madre"
                              value={form.telefono_domicilio_madre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <input
                                className="form-check-input mt-0 me-2"
                                type="checkbox"
                                name="whatsapp_domicilio_madre"
                                checked={form.whatsapp_domicilio_madre}
                                onChange={handleChange}
                              />
                              <i className="fab fa-whatsapp text-success"></i>
                            </div>
                          </div>
                          <div className={`form-text ${form.whatsapp_domicilio_madre ? 'text-primary fw-bold' : 'text-success'}`} style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                            {form.whatsapp_domicilio_madre ? (
                              <><i className="fas fa-check-double"></i> Usted recibirá los comunicados a este número.</>
                            ) : (
                              <><i className="fas fa-info-circle"></i> Marque la casilla de WhatsApp si desea recibir comunicados del colegio a este número.</>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Teléfono (Trabajo)
                          </label>
                          <div className="input-group">
                            <span className="input-group-text">
                              <i className="fas fa-building"></i>
                            </span>
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_oficina_madre"
                              value={form.telefono_oficina_madre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <input
                                className="form-check-input mt-0 me-2"
                                type="checkbox"
                                name="whatsapp_oficina_madre"
                                checked={form.whatsapp_oficina_madre}
                                onChange={handleChange}
                              />
                              <i className="fab fa-whatsapp text-success"></i>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: OTROS DATOS (MÉDICOS Y CONTACTOS) */}
                  {currentStep === 3 && (
                    <div className="step-content">
                      <h4 className="text-danger border-bottom pb-2 mb-4">
                        <i className="fas fa-heartbeat me-2"></i> Información
                        Médica
                      </h4>
                      <div className="row g-3 mb-5">
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Alergias
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="alergias"
                            value={form.alergias}
                            onChange={handleChange}
                            placeholder="Ninguna"
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Vacunas
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="vacunas"
                            value={form.vacunas}
                            onChange={handleChange}
                            placeholder="Al día"
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold text-muted small">
                            Seguro Médico
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="seguro_medico"
                            value={form.seguro_medico}
                            onChange={handleChange}
                            placeholder="Ninguno"
                          />
                        </div>
                      </div>

                      <h4 className="text-secondary border-bottom pb-2 mb-4">
                        <i className="fas fa-address-book me-2"></i> Contactos
                        Autorizados (Emergencia)
                      </h4>
                      <div className="row g-3 mb-5">
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Nombre de Contacto 1
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_autorizado1"
                            value={form.nombre_autorizado1}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Teléfono Contacto 1
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="telefono_autorizado1"
                            value={form.telefono_autorizado1}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Nombre de Contacto 2
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_autorizado2"
                            value={form.nombre_autorizado2}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold text-muted small">
                            Teléfono Contacto 2
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            name="telefono_autorizado2"
                            value={form.telefono_autorizado2}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NAVEGACIÓN DE PASOS */}
                  <div className="d-flex justify-content-between align-items-center mt-5 pt-3 border-top">
                    {currentStep === 1 ? (
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4"
                        onClick={() => navigate("/login")}
                      >
                        <i className="fas fa-arrow-left me-2"></i> Volver al
                        Inicio
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-primary px-4"
                        onClick={handlePrevStep}
                      >
                        <i className="fas fa-chevron-left me-2"></i> Anterior
                      </button>
                    )}

                    {currentStep < 3 ? (
                      <button
                        type="button"
                        className="btn btn-primary px-5 py-2 fw-bold shadow-sm"
                        onClick={handleNextStep}
                      >
                        Siguiente <i className="fas fa-chevron-right ms-2"></i>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn btn-success px-5 py-2 fw-bold shadow-sm"
                        disabled={loading || !canSubmit}
                      >
                        {loading ? (
                          <>
                            <i className="fas fa-spinner fa-spin me-2"></i>{" "}
                            Procesando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i> Registrar
                            Estudiante
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroEstudiante;
