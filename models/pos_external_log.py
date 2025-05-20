from odoo import models, fields


class PosExternalLog(models.Model):
    _name = "pos.external.log"
    _description = "Registro de Integración POS"

    order_data = fields.Text(string="Datos de Orden")
    user_name = fields.Char(string="Usuario", copy=False)
    config_name = fields.Char(string="Configuración", copy=False)
    status = fields.Selection(
        [("success", "Éxito"), ("error", "Error")],
        string="Estado",
    )
    response = fields.Text(string="Respuesta API", copy=False)
    error_message = fields.Text(string="Mensaje de Error", copy=False)
    timestamp = fields.Datetime(
        string="Fecha",
        default=fields.Datetime.now,
    )
