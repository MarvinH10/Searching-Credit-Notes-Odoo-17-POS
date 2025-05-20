from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    enable_searching_credit_notes = fields.Boolean(
        string="Enable Search Credit Notes",
    )


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    enable_searching_credit_notes = fields.Boolean(
        related="pos_config_id.enable_searching_credit_notes", readonly=False
    )
