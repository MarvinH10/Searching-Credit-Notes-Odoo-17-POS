# searching_credit_notes

Módulo Odoo para Punto de Venta (POS) que permite buscar y validar Notas de Crédito asociadas a Boletas o Facturas directamente desde la pantalla de pagos del POS.

## Características

- **Búsqueda rápida de Notas de Crédito:** Permite buscar Notas de Crédito por número de serie de Boleta/Factura desde el POS.
- **Validación y aplicación:** Valida el estado de la Nota de Crédito y permite aplicarla como método de pago en la orden.
- **Interfaz amigable:** Añade un botón "Buscar Nota de Crédito" en la pantalla de pagos del POS.
- **Registro de logs:** Guarda logs de los intentos de aplicación y validación de Notas de Crédito para auditoría.
- **Soporte multiusuario:** Compatible con múltiples usuarios y configuraciones de POS.

## Instalación

1. Copia la carpeta `searching_credit_notes` en tu directorio de addons de Odoo.
2. Actualiza la lista de aplicaciones y busca "POS Searching Credit Notes".
3. Instala el módulo desde el backend de Odoo.

## Uso

1. Abre el Punto de Venta y procede a la pantalla de pagos.
2. Haz clic en el botón **Buscar Nota de Crédito**.
3. Ingresa la serie y número de la Boleta/Factura o Nota de Crédito.
4. Si existe una Nota de Crédito asociada, podrás seleccionarla y aplicarla como método de pago.
5. El sistema validará el estado y registrará el pago automáticamente.

## Archivos principales

- [`__manifest__.py`](searching_credit_notes/__manifest__.py): Manifest del módulo.
- [`models/__init__.py`](searching_credit_notes/models/__init__.py): Inicialización de modelos.
- [`static/src/js/credit_note_search_button.js`](searching_credit_notes/static/src/js/credit_note_search_button.js): Lógica principal de integración con la pantalla de pagos.
- [`static/src/js/credit_note_search_popup.js`](searching_credit_notes/static/src/js/credit_note_search_popup.js): Lógica del popup de búsqueda.
- [`static/src/xml/payment_screen_extension.xml`](searching_credit_notes/static/src/xml/payment_screen_extension.xml): Extensión de la interfaz de usuario del POS.
- [`views/views.xml`](searching_credit_notes/views/views.xml): Configuración y vistas administrativas.

## Seguridad

El módulo incluye reglas de acceso para asegurar que solo usuarios autorizados puedan consultar y registrar logs de Notas de Crédito.

## Autor

Marvin Campos

---

> **Nota:** Este módulo está diseñado para Odoo 17 y puede requerir ajustes para otras versiones.
