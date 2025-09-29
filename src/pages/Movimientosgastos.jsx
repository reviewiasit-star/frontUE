import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '@fortawesome/fontawesome-free/css/all.min.css'; // Importar FontAwesome
import './MovimientosGastos.css'; // Importar estilos personalizados
import '../styles/Reportes.css'; // Importar estilos específicos para reportes
import AuthService from '../services/authService';

const MovimientosGastos = () => {
  const [activeTab, setActiveTab] = useState('egresos');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    almacen: '',
    producto: '',
    formaPago: ''
  });
  
  // Estados para egresos (análisis de inversión)
  const [reportesEgresos, setReportesEgresos] = useState([]);
  const [totalesEgresos, setTotalesEgresos] = useState({
    totalCapitalInvertido: 0,
    totalGananciaPotencial: 0,
    totalGananciaReal: 0,
    productosAnalizados: 0
  });
  
  // Estados para ingresos (ventas realizadas)
  const [reportesIngresos, setReportesIngresos] = useState([]);
  const [totalesIngresos, setTotalesIngresos] = useState({
    totalVentas: 0,
    totalEfectivo: 0,
    totalQR: 0,
    cantidadVentas: 0,
    productosVendidos: 0
  });
  
  // Estados para datos auxiliares
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estados para el menú hamburguesa
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    fetchAlmacenes();
    fetchProductos();
    if (activeTab === 'egresos') {
      fetchReporteEgresos();
    } else {
      fetchReporteIngresos();
    }
  }, [activeTab]);

  const fetchAlmacenes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/almacenes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAlmacenes(data);
      }
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/productos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const fetchReporteEgresos = async () => {
    try {
      setLoadingData(true);
      const token = localStorage.getItem('token');
      let url = `http://${window.location.hostname}:3001/api/reportes/inversion-ganancia?tipo=todos`;
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.almacen) params.append('almacen_id', filtros.almacen);
      if (filtros.producto) params.append('producto_id', filtros.producto);
      
      if (params.toString()) {
        url += `&${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportesEgresos(data.productos || []);
        setTotalesEgresos({
          totalCapitalInvertido: data.totales?.inversion_total || 0,
          totalGananciaPotencial: data.totales?.ganancia_potencial_stock_restante || 0,
          totalGananciaReal: data.totales?.ganancia_real || 0,
          productosAnalizados: data.productos?.length || 0
        });
      } else {
        setError('Error al cargar reporte de egresos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchReporteIngresos = async () => {
    try {
      setLoadingData(true);
      const token = localStorage.getItem('token');
      let url = `http://${window.location.hostname}:3001/api/ventas`;
      
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fecha_inicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fecha_fin', filtros.fechaFin);
      if (filtros.formaPago) params.append('forma_pago', filtros.formaPago);
      if (filtros.producto) params.append('producto_id', filtros.producto);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Usar las ventas agrupadas por transacción
        const ventasAgrupadas = data.ventasAgrupadas || [];
        setReportesIngresos(ventasAgrupadas);
        
        // Calcular totales
        const totales = ventasAgrupadas.reduce((acc, venta) => {
          const monto = parseFloat(venta.total || 0);
          acc.totalVentas += monto;
          acc.cantidadVentas += 1;
          acc.productosVendidos += venta.productos.reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0);
          
          if (venta.forma_pago === 'efectivo' || venta.forma_pago === 'Efectivo') {
            acc.totalEfectivo += monto;
          } else if (venta.forma_pago === 'qr' || venta.forma_pago === 'QR') {
            acc.totalQR += monto;
          }
          
          return acc;
        }, {
          totalVentas: 0,
          totalEfectivo: 0,
          totalQR: 0,
          cantidadVentas: 0,
          productosVendidos: 0
        });
        
        setTotalesIngresos(totales);
      } else {
        setError('Error al cargar reporte de ingresos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const aplicarFiltros = () => {
    setLoadingData(true);
    if (activeTab === 'egresos') {
      fetchReporteEgresos();
    } else {
      fetchReporteIngresos();
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      almacen: '',
      producto: '',
      formaPago: ''
    });
    // Recargar datos después de limpiar filtros
    setLoadingData(true);
    if (activeTab === 'egresos') {
      fetchReporteEgresos();
    } else {
      fetchReporteIngresos();
    }
  };

  const exportarEgresosPDF = () => {
    try {
      console.log('Iniciando exportación PDF de egresos...');
      
      if (!reportesEgresos || reportesEgresos.length === 0) {
        alert('No hay datos para exportar. Asegúrate de aplicar los filtros primero.');
        return;
      }

      // Crear el documento PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text('Reporte de Egresos - Análisis de Inversión', 20, 20);
      
      // Fecha
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Filtros aplicados
      let yPos = 40;
      if (filtros.fechaInicio && filtros.fechaFin) {
        doc.text(`Período: ${filtros.fechaInicio} al ${filtros.fechaFin}`, 20, yPos);
        yPos += 10;
      }
      if (filtros.almacen) {
        const almacenSeleccionado = almacenes.find(a => a.id == filtros.almacen);
        if (almacenSeleccionado) {
          doc.text(`Almacén: ${almacenSeleccionado.nombre}`, 20, yPos);
          yPos += 10;
        }
      }
      
      // Preparar datos para la tabla principal
      const tableData = reportesEgresos.map(producto => [
        producto.nombre || 'Sin nombre',
        producto.stock_inicial || 0,
        producto.stock || 0,
        `Bs. ${parseFloat(producto.inversion_total || 0).toFixed(2)}`,
        `Bs. ${parseFloat(producto.ganancia_real || 0).toFixed(2)}`,
        producto.estado_financiero || 'N/A'
      ]);

      // Crear tabla principal
      autoTable(doc, {
        head: [['Producto', 'Stock Inicial', 'Stock Actual', 'Capital Invertido', 'Ganancia', 'Estado']],
        body: tableData,
        startY: yPos + 10,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 53, 69] }
      });

      // Resumen financiero en tabla
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : yPos + 50;
      doc.setFontSize(12);
      doc.text('RESUMEN FINANCIERO', 20, finalY);
      
      const resumenData = [
        ['Total Capital Invertido', `Bs. ${totalesEgresos.totalCapitalInvertido.toFixed(2)}`],
        ['Total Ganancia Real', `Bs. ${totalesEgresos.totalGananciaReal.toFixed(2)}`],
        ['Total General', `Bs. ${(totalesEgresos.totalCapitalInvertido + totalesEgresos.totalGananciaReal).toFixed(2)}`],
        ['Productos Analizados', `${totalesEgresos.productosAnalizados}`]
      ];

      autoTable(doc, {
        body: resumenData,
        startY: finalY + 5,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [52, 58, 64] },
        theme: 'grid'
      });

      // Alertas de stock bajo
      const productosStockBajo = reportesEgresos.filter(p => (p.stock || 0) < 10);
      if (productosStockBajo.length > 0) {
        const alertY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : finalY + 50;
        doc.setFontSize(12);
        doc.setTextColor(220, 53, 69); // Rojo
        doc.text('⚠️ ALERTAS DE STOCK BAJO', 20, alertY);
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0); // Negro
        
        productosStockBajo.forEach((producto, index) => {
          const y = alertY + 10 + (index * 5);
          doc.text(`• ${producto.nombre}: ${producto.stock || 0} unidades restantes`, 25, y);
        });
      }

      // Guardar archivo
      const fileName = `reporte-egresos-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('PDF exportado exitosamente');
      
    } catch (error) {
      console.error('Error al exportar PDF de egresos:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  };

  const exportarIngresosPDF = () => {
    try {
      console.log('Iniciando exportación PDF de ingresos...');
      
      if (!reportesIngresos || reportesIngresos.length === 0) {
        alert('No hay datos para exportar. Asegúrate de aplicar los filtros primero.');
        return;
      }

      // Crear el documento PDF
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text('Reporte de Ingresos - Ventas Realizadas', 20, 20);
      
      // Fecha
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);
      
      // Filtros aplicados
      let yPos = 40;
      if (filtros.fechaInicio && filtros.fechaFin) {
        doc.text(`Período: ${filtros.fechaInicio} al ${filtros.fechaFin}`, 20, yPos);
        yPos += 10;
      }
      if (filtros.formaPago) {
        doc.text(`Forma de Pago: ${filtros.formaPago}`, 20, yPos);
        yPos += 10;
      }
      
      // Preparar datos para la tabla principal
      const tableData = reportesIngresos.map(venta => [
        new Date(venta.fecha).toLocaleDateString(),
        venta.productos.map(p => p.producto_nombre || 'Sin nombre').join(', '),
        venta.productos.reduce((sum, p) => sum + parseInt(p.cantidad || 0), 0),
        `Bs. ${parseFloat(venta.total || 0).toFixed(2)}`,
        venta.forma_pago || 'N/A',
        venta.usuario_nombre || 'N/A'
      ]);

      // Crear tabla principal
      autoTable(doc, {
        head: [['Fecha', 'Productos', 'Cantidad', 'Total', 'Forma Pago', 'Vendedor']],
        body: tableData,
        startY: yPos + 10,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 167, 69] }
      });

      // Resumen financiero detallado en tabla
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : yPos + 50;
      doc.setFontSize(12);
      doc.text('RESUMEN FINANCIERO DETALLADO', 20, finalY);
      
      const resumenData = [
        ['Total de Ventas', `${totalesIngresos.cantidadVentas}`],
        ['Productos Vendidos', `${totalesIngresos.productosVendidos}`],
        ['Total Ingresos', `Bs. ${totalesIngresos.totalVentas.toFixed(2)}`]
      ];

      autoTable(doc, {
        body: resumenData,
        startY: finalY + 5,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [40, 167, 69] },
        theme: 'grid'
      });

      // Desglose por forma de pago en tabla
      const desgloseY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : finalY + 50;
      doc.setFontSize(11);
      doc.text('DESGLOSE POR FORMA DE PAGO:', 20, desgloseY);
      
      const desgloseData = [
        ['Forma de Pago', 'Monto'],
        ['Efectivo', `Bs. ${totalesIngresos.totalEfectivo.toFixed(2)}`],
        ['QR', `Bs. ${totalesIngresos.totalQR.toFixed(2)}`]
      ];

      autoTable(doc, {
        body: desgloseData,
        startY: desgloseY + 5,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [255, 193, 7] },
        theme: 'grid'
      });

      // Calcular productos más vendidos
      const productosVendidos = {};
      reportesIngresos.forEach(venta => {
        venta.productos.forEach(producto => {
          const nombre = producto.producto_nombre || 'Sin nombre';
          if (!productosVendidos[nombre]) {
            productosVendidos[nombre] = {
              cantidad: 0,
              total: 0
            };
          }
          productosVendidos[nombre].cantidad += parseInt(producto.cantidad || 0);
          productosVendidos[nombre].total += parseFloat(producto.subtotal || 0);
        });
      });

      // Ordenar productos por cantidad vendida
      const productosOrdenados = Object.entries(productosVendidos)
        .sort(([,a], [,b]) => b.cantidad - a.cantidad)
        .slice(0, 5); // Top 5 productos

      if (productosOrdenados.length > 0) {
        const productosY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : desgloseY + 50;
        doc.setFontSize(11);
        doc.text('TOP 5 PRODUCTOS MÁS VENDIDOS:', 20, productosY);
        
        // Tabla de productos más vendidos
        const productosTableData = productosOrdenados.map(([nombre, datos]) => [
          nombre,
          datos.cantidad,
          `Bs. ${datos.total.toFixed(2)}`
        ]);

        autoTable(doc, {
          head: [['Producto', 'Cantidad Vendida', 'Total Generado']],
          body: productosTableData,
          startY: productosY + 10,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [255, 193, 7] }
        });

        // Alertas de stock bajo para productos más vendidos
        const productosMasVendidos = productosOrdenados.map(([nombre]) => nombre);
        const productosStockBajo = productos.filter(p => 
          productosMasVendidos.includes(p.nombre) && (p.stock || 0) < 10
        );

        if (productosStockBajo.length > 0) {
          const alertY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : productosY + 50;
          doc.setFontSize(11);
          doc.setTextColor(220, 53, 69); // Rojo
          doc.text('⚠️ ALERTAS DE STOCK BAJO - PRODUCTOS POPULARES:', 20, alertY);
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0); // Negro
          
          productosStockBajo.forEach((producto, index) => {
            const y = alertY + 10 + (index * 5);
            doc.text(`• ${producto.nombre}: ${producto.stock || 0} unidades restantes`, 25, y);
          });
        }
      }

      // Guardar archivo
      const fileName = `reporte-ingresos-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('PDF exportado exitosamente');
      
    } catch (error) {
      console.error('Error al exportar PDF de ingresos:', error);
      alert('Error al generar el PDF: ' + error.message);
    }
  };

  const formatCurrency = (amount) => {
    return `Bs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const exportarEgresosExcel = () => {
    // Crear datos para Excel
    const excelData = [
      ['REPORTE DE EGRESOS - ANÁLISIS DE INVERSIÓN'],
      [''],
      ['Fecha de generación:', new Date().toLocaleDateString()],
      [''],
    ];

    // Agregar información de filtros
    if (filtros.fechaInicio && filtros.fechaFin) {
      excelData.push(['Período:', `${filtros.fechaInicio} al ${filtros.fechaFin}`]);
    }
    if (filtros.almacen) {
      const almacenSeleccionado = almacenes.find(a => a.id == filtros.almacen);
      if (almacenSeleccionado) {
        excelData.push(['Almacén:', almacenSeleccionado.nombre]);
      }
    }
    if (filtros.producto) {
      const productoSeleccionado = productos.find(p => p.id == filtros.producto);
      if (productoSeleccionado) {
        excelData.push(['Producto:', productoSeleccionado.nombre]);
      }
    }
    excelData.push(['']);

    // Encabezados de la tabla
    excelData.push([
      'Producto',
      'Categoría',
      'Fecha Registro',
      'Stock Inicial',
      'Stock Actual',
      'Capital Invertido (Bs.)',
      'Ganancia (Bs.)',
      'Total (Bs.)',
      'Estado'
    ]);

    // Datos de productos
    reportesEgresos.forEach(producto => {
      excelData.push([
        producto.nombre,
        producto.categoria,
        new Date(producto.fecha_registro || Date.now()).toLocaleDateString(),
        producto.stock_inicial,
        producto.stock,
        parseFloat(producto.inversion_total || 0).toFixed(2),
        parseFloat(producto.ganancia_real || 0).toFixed(2),
        (parseFloat(producto.inversion_total || 0) + parseFloat(producto.ganancia_real || 0)).toFixed(2),
        producto.estado_financiero || 'N/A'
      ]);
    });

    // Resumen
    excelData.push(['']);
    excelData.push(['RESUMEN DEL REPORTE']);
    excelData.push(['Productos analizados:', totalesEgresos.productosAnalizados]);
    excelData.push(['Total Capital Invertido (Bs.):', totalesEgresos.totalCapitalInvertido.toFixed(2)]);
    excelData.push(['Total Ganancia Real (Bs.):', totalesEgresos.totalGananciaReal.toFixed(2)]);
    excelData.push(['Total General (Bs.):', (totalesEgresos.totalCapitalInvertido + totalesEgresos.totalGananciaReal).toFixed(2)]);

    // Convertir a CSV y descargar
    const csvContent = excelData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    let fileName = 'reporte-egresos';
    if (filtros.fechaInicio && filtros.fechaFin) {
      fileName += `_${filtros.fechaInicio}_${filtros.fechaFin}`;
    }
    fileName += '.csv';
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarIngresosExcel = () => {
    // Crear datos para Excel
    const excelData = [
      ['REPORTE DE INGRESOS - VENTAS REALIZADAS'],
      [''],
      ['Fecha de generación:', new Date().toLocaleDateString()],
      [''],
    ];

    // Agregar información de filtros
    if (filtros.fechaInicio && filtros.fechaFin) {
      excelData.push(['Período:', `${filtros.fechaInicio} al ${filtros.fechaFin}`]);
    }
    if (filtros.formaPago) {
      excelData.push(['Forma de Pago:', filtros.formaPago]);
    }
    if (filtros.producto) {
      const productoSeleccionado = productos.find(p => p.id == filtros.producto);
      if (productoSeleccionado) {
        excelData.push(['Producto:', productoSeleccionado.nombre]);
      }
    }
    excelData.push(['']);

    // Encabezados de la tabla
    excelData.push([
      'Fecha',
      'Productos',
      'Cantidad Total',
      'Total (Bs.)',
      'Forma de Pago',
      'Cliente',
      'Vendedor',
      'Observaciones'
    ]);

    // Datos de ventas
    reportesIngresos.forEach(venta => {
      excelData.push([
        new Date(venta.fecha).toLocaleDateString(),
        venta.productos.map(p => p.producto_nombre).join(', '),
        venta.productos.reduce((sum, p) => sum + parseInt(p.cantidad), 0),
        parseFloat(venta.total || 0).toFixed(2),
        venta.forma_pago,
        venta.estudiante_nombre || 'Cliente general',
        venta.usuario_nombre,
        venta.observaciones || ''
      ]);
    });

    // Resumen
    excelData.push(['']);
    excelData.push(['RESUMEN DEL REPORTE']);
    excelData.push(['Total de ventas:', totalesIngresos.cantidadVentas]);
    excelData.push(['Productos vendidos:', totalesIngresos.productosVendidos]);
    excelData.push(['Total Ingresos (Bs.):', totalesIngresos.totalVentas.toFixed(2)]);
    excelData.push(['Ventas en Efectivo (Bs.):', totalesIngresos.totalEfectivo.toFixed(2)]);
    excelData.push(['Ventas por QR (Bs.):', totalesIngresos.totalQR.toFixed(2)]);

    // Convertir a CSV y descargar
    const csvContent = excelData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    let fileName = 'reporte-ingresos';
    if (filtros.fechaInicio && filtros.fechaFin) {
      fileName += `_${filtros.fechaInicio}_${filtros.fechaFin}`;
    }
    fileName += '.csv';
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Funciones auxiliares para estilos de estado
  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'GANANDO':
        return 'badge-success';
      case 'PERDIENDO':
        return 'badge-danger';
      case 'EN_PUNTO_EQUILIBRIO':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'GANANDO':
        return 'fa-arrow-trend-up';
      case 'PERDIENDO':
        return 'fa-arrow-trend-down';
      case 'EN_PUNTO_EQUILIBRIO':
        return 'fa-minus';
      default:
        return 'fa-question';
    }
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'GANANDO':
        return 'Ganando';
      case 'PERDIENDO':
        return 'Perdiendo';
      case 'EN_PUNTO_EQUILIBRIO':
        return 'En Equilibrio';
      default:
        return estado;
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'GANANDO': return 'text-success';
      case 'PERDIENDO': return 'text-danger';
      case 'EN_PUNTO_EQUILIBRIO': return 'text-warning';
      default: return 'text-muted';
    }
  };

  // Funciones para el menú hamburguesa
  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-inner">
          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '500px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="sr-only">Cargando...</span>
              </div>
              <h5 className="text-muted mb-2">Cargando Reportes Financieros</h5>
              <p className="text-muted">
                <i className="fas fa-chart-line me-2"></i>
                Analizando datos de {activeTab === 'egresos' ? 'inversión y productos' : 'ventas e ingresos'}...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container report-ventas-container">
      <div className="page-inner">
        <div className="d-flex align-items-left align-items-md-center flex-column flex-md-row pt-2 pb-4">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div>
              <h3 className="fw-bold mb-3">Reportes Financieros</h3>
              <h6 className="op-7 mb-2">Análisis completo de ingresos y egresos del negocio</h6>
            </div>
            <button 
              className="btn btn-outline-primary d-md-none"
              onClick={() => setMenuHamburguesaVisible(true)}
              style={{ 
                border: 'none', 
                background: 'transparent',
                fontSize: '1.5rem',
                padding: '0.5rem'
              }}
            >
              <i className="fas fa-bars"></i>
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fa fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Navegación entre vistas */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="nav nav-pills nav-secondary nav-pills-no-bd" role="tablist">
              <button
                className={`nav-link ${activeTab === 'egresos' ? 'active' : ''}`}
                onClick={() => setActiveTab('egresos')}
              >
                <i className="fa fa-arrow-down me-2"></i>
                Egresos (Análisis de Inversión)
              </button>
              <button
                className={`nav-link ${activeTab === 'ingresos' ? 'active' : ''}`}
                onClick={() => setActiveTab('ingresos')}
              >
                <i className="fa fa-arrow-up me-2"></i>
                Ingresos (Ventas Realizadas)
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Filtros */}
        <div className="card mb-4">
          <div className="card-header">
            <h4 className="card-title">
              <i className="fa fa-filter me-2"></i>
              Filtros de Búsqueda
            </h4>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="form-group">
                  <label>Fecha Inicio</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaInicio}
                    onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <div className="form-group">
                  <label>Fecha Fin</label>
                  <input
                    type="date"
                    className="form-control"
                    value={filtros.fechaFin}
                    onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
                  />
                </div>
              </div>
              {activeTab === 'egresos' && (
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Almacén</label>
                    <select
                      className="form-control"
                      value={filtros.almacen}
                      onChange={(e) => handleFiltroChange('almacen', e.target.value)}
                    >
                      <option value="">Todos los almacenes</option>
                      {almacenes.map(almacen => (
                        <option key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {activeTab === 'ingresos' && (
                <div className="col-md-3">
                  <div className="form-group">
                    <label>Forma de Pago</label>
                    <select
                      className="form-control"
                      value={filtros.formaPago}
                      onChange={(e) => handleFiltroChange('formaPago', e.target.value)}
                    >
                      <option value="">Todas las formas</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="qr">QR</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="col-md-3">
                <div className="form-group">
                  <label>Producto</label>
                  <select
                    className="form-control"
                    value={filtros.producto}
                    onChange={(e) => handleFiltroChange('producto', e.target.value)}
                  >
                    <option value="">Todos los productos</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <button
                  className="btn btn-primary me-2"
                  onClick={aplicarFiltros}
                  disabled={loadingData}
                >
                  {loadingData ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-search me-2"></i>
                      Aplicar Filtros
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary me-2"
                  onClick={limpiarFiltros}
                  disabled={loadingData}
                >
                  <i className="fa fa-times me-2"></i>
                  Limpiar
                </button>
                <button
                  className="btn btn-success me-2"
                  onClick={() => {
                    if (activeTab === 'egresos') {
                      fetchReporteEgresos();
                    } else {
                      fetchReporteIngresos();
                    }
                  }}
                  disabled={loadingData}
                >
                  {loadingData ? (
                    <>
                      <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <i className="fa fa-refresh me-2"></i>
                      Actualizar
                    </>
                  )}
                </button>
                {activeTab === 'egresos' && reportesEgresos.length > 0 && (
                  <button
                    className="btn btn-info"
                    onClick={exportarEgresosPDF}
                    disabled={loadingData}
                  >
                    <i className="fa fa-file-pdf me-2"></i>
                    Exportar PDF
                  </button>
                )}
                {activeTab === 'ingresos' && reportesIngresos.length > 0 && (
                  <button
                    className="btn btn-info"
                    onClick={exportarIngresosPDF}
                    disabled={loadingData}
                  >
                    <i className="fa fa-file-pdf me-2"></i>
                    Exportar PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vista de Egresos */}
        {activeTab === 'egresos' && (
          <>
            {/* Resumen de egresos */}
            <div className="row mb-4">
               <div className="col-md-3">
                 <div className="card bg-gradient-danger text-white shadow-lg">
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                       <div className="flex-grow-1">
                         <h6 className="card-title mb-1">
                           <i className="fas fa-dollar-sign me-2"></i>
                           Capital Invertido
                         </h6>
                         <h3 className="mb-0 fw-bold">
                           {formatCurrency(totalesEgresos.totalCapitalInvertido)}
                         </h3>
                       </div>
                       <div className="bg-white bg-opacity-25 rounded-circle p-3">
                         <i className="fas fa-wallet fa-2x"></i>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="card bg-gradient-success text-white shadow-lg">
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                       <div className="flex-grow-1">
                         <h6 className="card-title mb-1">
                           <i className="fas fa-chart-line me-2"></i>
                           Ganancia Real
                         </h6>
                         <h3 className="mb-0 fw-bold">
                           {formatCurrency(totalesEgresos.totalGananciaReal)}
                         </h3>
                       </div>
                       <div className="bg-white bg-opacity-25 rounded-circle p-3">
                         <i className="fas fa-arrow-trend-up fa-2x"></i>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="card bg-gradient-primary text-white shadow-lg">
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                       <div className="flex-grow-1">
                         <h6 className="card-title mb-1">
                           <i className="fas fa-calculator me-2"></i>
                           Total General
                         </h6>
                         <h3 className="mb-0 fw-bold">
                           {formatCurrency(totalesEgresos.totalCapitalInvertido + totalesEgresos.totalGananciaReal)}
                         </h3>
                       </div>
                       <div className="bg-white bg-opacity-25 rounded-circle p-3">
                         <i className="fas fa-equals fa-2x"></i>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
               <div className="col-md-3">
                 <div className="card bg-gradient-info text-white shadow-lg">
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                       <div className="flex-grow-1">
                         <h6 className="card-title mb-1">
                           <i className="fas fa-box me-2"></i>
                           Productos Analizados
                         </h6>
                         <h3 className="mb-0 fw-bold">
                           {totalesEgresos.productosAnalizados}
                         </h3>
                       </div>
                       <div className="bg-white bg-opacity-25 rounded-circle p-3">
                         <i className="fas fa-cubes fa-2x"></i>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

            {/* Tabla de egresos */}
             <div className="card shadow-sm">
               <div className="card-header bg-gradient-danger">
                 <div className="d-flex align-items-center">
                   <h4 className="card-title text-white mb-0">
                     <i className="fas fa-chart-line me-2"></i>
                     Análisis de Inversión por Producto
                   </h4>
                   <div className="btn-group ms-auto" role="group">
                     <button
                       className="btn btn-light btn-sm"
                       onClick={() => {
                         console.log('Botón PDF clickeado');
                         exportarEgresosPDF();
                       }}
                       title="Exportar a PDF"
                     >
                       <i className="fa fa-file-pdf me-2 text-danger"></i>
                       PDF
                     </button>
                     <button
                       className="btn btn-light btn-sm"
                       onClick={exportarEgresosExcel}
                       title="Exportar a Excel"
                     >
                       <i className="fa fa-file-excel me-2 text-success"></i>
                       Excel
                     </button>
                   </div>
                 </div>
               </div>
               <div className="card-body p-0">
                 <div className="table-responsive table-container">
                   <table className="table table-hover mb-0">
                     <thead className="table-light">
                       <tr>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-image me-2 text-primary"></i>
                           Imagen
                         </th>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-box me-2 text-info"></i>
                           Producto
                         </th>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-calendar me-2 text-secondary"></i>
                           Fecha Registro
                         </th>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-dollar-sign me-2 text-danger"></i>
                           Capital Invertido
                         </th>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-chart-profit me-2 text-success"></i>
                           Ganancia
                         </th>
                         <th className="border-0 fw-bold">
                           <i className="fas fa-calculator me-2 text-primary"></i>
                           Total
                         </th>
                       </tr>
                     </thead>
                     <tbody>
                       {reportesEgresos.length === 0 ? (
                         <tr>
                           <td colSpan="6" className="text-center py-5">
                             <div className="d-flex flex-column align-items-center">
                               <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                               <h5 className="text-muted mb-2">No hay datos de inversión disponibles</h5>
                               <p className="text-muted mb-3">
                                 No se encontraron productos con los filtros aplicados o no hay datos en el rango de fechas seleccionado.
                               </p>
                               <button 
                                 className="btn btn-primary btn-sm"
                                 onClick={() => {
                                   limpiarFiltros();
                                   fetchReportesEgresos();
                                 }}
                               >
                                 <i className="fas fa-refresh me-2"></i>
                                 Cargar todos los datos
                               </button>
                             </div>
                           </td>
                         </tr>
                       ) : (
                         reportesEgresos.map((producto, index) => (
                           <tr key={index} className="align-middle">
                             <td className="text-center">
                               {producto.imagen ? (
                                 <img
                                   src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`}
                                   alt={producto.nombre}
                                   className="rounded-circle"
                                   style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                   onError={(e) => {
                                     e.target.style.display = 'none';
                                   }}
                                 />
                               ) : (
                                 <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" 
                                      style={{ width: '50px', height: '50px' }}>
                                   <i className="fas fa-image text-muted"></i>
                                 </div>
                               )}
                             </td>
                             <td>
                               <div>
                                 <strong className="text-dark">{producto.nombre}</strong>
                                 <br />
                                 <span className="badge badge-secondary badge-sm">
                                   <i className="fas fa-tag me-1"></i>
                                   {producto.categoria || 'Sin categoría'}
                                 </span>
                               </div>
                             </td>
                             <td>
                               <span className="text-muted">
                                 <i className="fas fa-calendar-alt me-1"></i>
                                 {new Date(producto.fecha_registro || Date.now()).toLocaleDateString()}
                               </span>
                             </td>
                             <td>
                               <span className="fw-bold text-danger">
                                 <i className="fas fa-dollar-sign me-1"></i>
                                 {formatCurrency(producto.inversion_total)}
                               </span>
                             </td>
                             <td>
                               <span className={`fw-bold ${producto.ganancia_real >= 0 ? 'text-success' : 'text-danger'}`}>
                                 <i className={`fas ${producto.ganancia_real >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} me-1`}></i>
                                 {formatCurrency(producto.ganancia_real)}
                               </span>
                             </td>
                             <td>
                               <span className="fw-bold text-primary fs-6">
                                 <i className="fas fa-equals me-1"></i>
                                 {formatCurrency(parseFloat(producto.inversion_total || 0) + parseFloat(producto.ganancia_real || 0))}
                               </span>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                     {reportesEgresos.length > 0 && (
                       <tfoot className="table-dark">
                         <tr>
                           <th colSpan="3" className="text-center">
                             <i className="fas fa-calculator me-2"></i>
                             <strong>TOTALES GENERALES</strong>
                           </th>
                           <th className="text-center">
                             <div className="d-flex flex-column">
                               <span className="text-warning">
                                 <i className="fas fa-dollar-sign me-1"></i>
                                 Total Capital
                               </span>
                               <span className="fs-5 fw-bold text-white">
                                 {formatCurrency(totalesEgresos.totalCapitalInvertido)}
                               </span>
                             </div>
                           </th>
                           <th className="text-center">
                             <div className="d-flex flex-column">
                               <span className="text-success">
                                 <i className="fas fa-chart-line me-1"></i>
                                 Total Ganancia
                               </span>
                               <span className="fs-5 fw-bold text-white">
                                 {formatCurrency(totalesEgresos.totalGananciaReal)}
                               </span>
                             </div>
                           </th>
                           <th className="text-center">
                             <div className="d-flex flex-column">
                               <span className="text-primary">
                                 <i className="fas fa-calculator me-1"></i>
                                 Gran Total
                               </span>
                               <span className="fs-4 fw-bold text-warning">
                                 {formatCurrency(totalesEgresos.totalCapitalInvertido + totalesEgresos.totalGananciaReal)}
                               </span>
                             </div>
                           </th>
                         </tr>
                       </tfoot>
                     )}
                   </table>
                 </div>
               </div>
             </div>
          </>
        )}

        {/* Vista de Ingresos */}
        {activeTab === 'ingresos' && (
          <>
            {/* Resumen de ingresos */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-gradient-success text-white shadow-lg">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="card-title mb-1">
                          <i className="fas fa-dollar-sign me-2"></i>
                          Total Ingresos
                        </h6>
                        <h3 className="mb-0 fw-bold">
                          {formatCurrency(totalesIngresos.totalVentas)}
                        </h3>
                      </div>
                      <div className="bg-white bg-opacity-25 rounded-circle p-3">
                        <i className="fas fa-cash-register fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-gradient-primary text-white shadow-lg">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="card-title mb-1">
                          <i className="fas fa-money-bill-wave me-2"></i>
                          Ventas Efectivo
                        </h6>
                        <h3 className="mb-0 fw-bold">
                          {formatCurrency(totalesIngresos.totalEfectivo)}
                        </h3>
                      </div>
                      <div className="bg-white bg-opacity-25 rounded-circle p-3">
                        <i className="fas fa-money-bill fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                 <div className="card bg-gradient-warning text-white shadow-lg">
                   <div className="card-body">
                     <div className="d-flex align-items-center">
                       <div className="flex-grow-1">
                         <h6 className="card-title mb-1">
                           <i className="fas fa-qrcode me-2"></i>
                           Ventas QR
                         </h6>
                         <h3 className="mb-0 fw-bold">
                           {formatCurrency(totalesIngresos.totalQR)}
                         </h3>
                       </div>
                       <div className="bg-white bg-opacity-25 rounded-circle p-3">
                         <i className="fas fa-qrcode fa-2x"></i>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
              <div className="col-md-3">
                <div className="card bg-gradient-info text-white shadow-lg">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="flex-grow-1">
                        <h6 className="card-title mb-1">
                          <i className="fas fa-shopping-cart me-2"></i>
                          Cantidad Ventas
                        </h6>
                        <h3 className="mb-0 fw-bold">
                          {totalesIngresos.cantidadVentas}
                        </h3>
                      </div>
                      <div className="bg-white bg-opacity-25 rounded-circle p-3">
                        <i className="fas fa-shopping-bag fa-2x"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla de ingresos */}
            <div className="card shadow-sm">
              <div className="card-header bg-gradient-success">
                <div className="d-flex align-items-center">
                  <h4 className="card-title text-white mb-0">
                    <i className="fas fa-cash-register me-2"></i>
                    Registro de Ventas Realizadas
                  </h4>
                  <div className="btn-group ms-auto" role="group">
                    <button
                      className="btn btn-light btn-sm"
                      onClick={() => {
                        console.log('Botón PDF ingresos clickeado');
                        exportarIngresosPDF();
                      }}
                      title="Exportar a PDF"
                    >
                      <i className="fa fa-file-pdf me-2 text-success"></i>
                      PDF
                    </button>
                    <button
                      className="btn btn-light btn-sm"
                      onClick={exportarIngresosExcel}
                      title="Exportar a Excel"
                    >
                      <i className="fa fa-file-excel me-2 text-success"></i>
                      Excel
                    </button>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive table-container">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-calendar me-2 text-primary"></i>
                          Fecha
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-box me-2 text-info"></i>
                          Productos
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-sort-numeric-up me-2 text-warning"></i>
                          Cantidad Total
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-dollar-sign me-2 text-success"></i>
                          Total
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-credit-card me-2 text-warning"></i>
                          Forma de Pago
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-user me-2 text-secondary"></i>
                          Cliente
                        </th>
                        <th className="border-0 fw-bold">
                          <i className="fas fa-user-tie me-2 text-dark"></i>
                          Vendedor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportesIngresos.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-5">
                            <div className="d-flex flex-column align-items-center">
                              <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                              <h5 className="text-muted mb-2">No hay ventas registradas</h5>
                              <p className="text-muted mb-3">
                                No se encontraron ventas con los filtros aplicados o no hay ventas en el rango de fechas seleccionado.
                              </p>
                              <button 
                                className="btn btn-primary btn-sm"
                                onClick={() => {
                                  limpiarFiltros();
                                  fetchReportesIngresos();
                                }}
                              >
                                <i className="fas fa-refresh me-2"></i>
                                Cargar todas las ventas
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        reportesIngresos.map((venta, index) => (
                          <tr key={index} className="align-middle">
                            <td>
                              <span className="text-muted">
                                <i className="fas fa-calendar-alt me-1"></i>
                                {new Date(venta.fecha).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <div className="productos-lista">
                                {venta.productos.map((producto, prodIdx) => (
                                  <div key={prodIdx} className="producto-item mb-2">
                                    <div className="d-flex align-items-center">
                                      {/* Imagen del producto */}
                                      <div className="me-3">
                                        {producto.imagen ? (
                                          <img 
                                            src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`} 
                                            alt={producto.producto_nombre} 
                                            style={{ width: '40px', height: '40px', objectFit: 'cover' }} 
                                            className="img-thumbnail"
                                          />
                                        ) : (
                                          <div className="bg-light rounded d-flex align-items-center justify-content-center" 
                                               style={{ width: '40px', height: '40px' }}>
                                            <i className="fas fa-image text-muted"></i>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Información del producto */}
                                      <div className="flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-start">
                                          <div>
                                            <strong>{producto.producto_nombre || '-'}</strong>
                                            <br />
                                            <small>
                                              <i className="fas fa-building me-1 text-info"></i>
                                              {producto.almacen_nombre || '-'}
                                            </small>
                                          </div>
                                          <span className="badge bg-secondary rounded-pill">
                                            {producto.cantidad} unid.
                                          </span>
                                        </div>
                                        <div className="d-flex justify-content-between mt-1">
                                          <small>Precio: <span className="text-success">Bs {producto.precio_venta}</span></small>
                                          <small>Subtotal: <span className="text-success">Bs {parseFloat(producto.subtotal).toFixed(2)}</span></small>
                                        </div>
                                      </div>
                                    </div>
                                    {prodIdx < venta.productos.length - 1 && <hr className="my-2" />}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td>
                              <span className="badge badge-primary badge-lg">
                                <i className="fas fa-times me-1"></i>
                                {venta.productos.reduce((sum, p) => sum + parseInt(p.cantidad), 0)}
                              </span>
                            </td>
                            <td>
                              <span className="fw-bold text-success fs-5">
                                <i className="fas fa-dollar-sign me-1"></i>
                                {formatCurrency(venta.total)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge badge-lg ${venta.forma_pago === 'efectivo' || venta.forma_pago === 'Efectivo' ? 'badge-primary' : 'badge-warning'}`}>
                                <i className={`fas ${venta.forma_pago === 'efectivo' || venta.forma_pago === 'Efectivo' ? 'fa-money-bill-wave' : 'fa-qrcode'} me-1`}></i>
                                {venta.forma_pago === 'efectivo' || venta.forma_pago === 'Efectivo' ? 'Efectivo' : 'QR'}
                              </span>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2"
                                     style={{ width: '35px', height: '35px' }}>
                                  <i className="fas fa-user text-muted"></i>
                                </div>
                                <span className="text-dark">{venta.estudiante_nombre || 'Cliente general'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-2"
                                     style={{ width: '35px', height: '35px' }}>
                                  <i className="fas fa-user-tie text-white"></i>
                                </div>
                                <span className="text-dark fw-bold">{venta.usuario_nombre}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {reportesIngresos.length > 0 && (
                      <tfoot className="table-dark">
                        <tr>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-info">
                                <i className="fas fa-calendar-check me-1"></i>
                                Total Ventas
                              </span>
                              <span className="fs-5 fw-bold text-white">
                                {totalesIngresos.cantidadVentas}
                              </span>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-warning">
                                <i className="fas fa-box me-1"></i>
                                Productos
                              </span>
                              <span className="fs-5 fw-bold text-white">
                                {totalesIngresos.productosVendidos}
                              </span>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-primary">
                                <i className="fas fa-sort-numeric-up me-1"></i>
                                Cantidad Total
                              </span>
                              <span className="fs-5 fw-bold text-white">
                                {reportesIngresos.reduce((sum, v) => sum + v.productos.reduce((pSum, p) => pSum + parseInt(p.cantidad), 0), 0)}
                              </span>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-success">
                                <i className="fas fa-dollar-sign me-1"></i>
                                Total Ingresos
                              </span>
                              <span className="fs-4 fw-bold text-warning">
                                {formatCurrency(totalesIngresos.totalVentas)}
                              </span>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-info">
                                <i className="fas fa-credit-card me-1"></i>
                                Formas de Pago
                              </span>
                              <div className="d-flex flex-column gap-1">
                                <small className="text-warning">
                                  <i className="fas fa-qrcode me-1"></i>
                                  QR: {formatCurrency(totalesIngresos.totalQR)}
                                </small>
                                <small className="text-light">
                                  <i className="fas fa-money-bill-wave me-1"></i>
                                  Efectivo: {formatCurrency(totalesIngresos.totalEfectivo)}
                                </small>
                              </div>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-light">
                                <i className="fas fa-users me-1"></i>
                                Clientes
                              </span>
                              <span className="fs-5 fw-bold text-white">
                                {new Set(reportesIngresos.map(v => v.estudiante_nombre || 'General')).size}
                              </span>
                            </div>
                          </th>
                          <th className="text-center">
                            <div className="d-flex flex-column">
                              <span className="text-primary">
                                <i className="fas fa-user-tie me-1"></i>
                                Vendedores
                              </span>
                              <span className="fs-5 fw-bold text-white">
                                {new Set(reportesIngresos.map(v => v.usuario_nombre)).size}
                              </span>
                            </div>
                          </th>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal del menú hamburguesa */}
        {menuHamburguesaVisible && (
          <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-fullscreen-sm-down">
              <div className="modal-content" style={{ 
                border: 'none', 
                borderRadius: '0',
                height: '100vh',
                maxHeight: '100vh'
              }}>
                <div className="modal-header" style={{ 
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <i className="fas fa-user-circle text-primary" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <div>
                      <h6 className="mb-0">{userInfo?.nombre || 'Usuario'}</h6>
                      <small className="text-muted">{userInfo?.rol || 'Rol'}</small>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={cerrarMenuHamburguesa}
                  ></button>
                </div>
                
                <div className="modal-body p-0">
                  <div className="list-group list-group-flush">
                    <Link 
                      to="/" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-home me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Dashboard</span>
                    </Link>

                    <Link 
                      to="/usuarios" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-users me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Usuarios</span>
                    </Link>

                    <Link 
                      to="/estudiantes" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-list me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Estudiantes</span>
                    </Link>

                    <Link 
                      to="/becas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-gift me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Becas</span>
                    </Link>

                    <Link 
                      to="/compromiso" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-file-invoice-dollar me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Compromiso Económico</span>
                    </Link>

                    <Link 
                      to="/academia" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-graduation-cap me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Academia</span>
                    </Link>

                    <Link 
                      to="/almacenes" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-warehouse me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Almacenes</span>
                    </Link>

                    <Link 
                      to="/productos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-boxes me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Productos</span>
                    </Link>

                    <Link 
                      to="/tienda" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-store me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Tienda</span>
                    </Link>

                    <Link 
                      to="/compras-administradora" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-shopping-cart me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Compras Administradora</span>
                    </Link>

                    <Link 
                      to="/inventario-almacen" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-boxes me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Inventario de Almacén</span>
                    </Link>

                    <Link 
                      to="/reporte-ventas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-chart-bar me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Reporte de Ventas</span>
                    </Link>

                    <Link 
                      to="/resumen-ganancias-perdidas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-chart-line me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Ganancias y Pérdidas</span>
                    </Link>

                    <Link 
                      to="/ingresos-academicos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-university me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Ingresos Académicos</span>
                    </Link>

                    <Link 
                      to="/movimientos-gastos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-exchange-alt me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Movimientos y Gastos</span>
                    </Link>

                    <Link 
                      to="/reportes" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-chart-bar me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Reportes Tradicionales</span>
                    </Link>

                    <button 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={handleLogout}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem',
                        background: 'none',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <i className="fas fa-sign-out-alt me-3 text-danger" style={{ width: '20px' }}></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovimientosGastos;