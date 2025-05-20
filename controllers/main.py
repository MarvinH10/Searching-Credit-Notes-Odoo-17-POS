from odoo import http
from odoo.http import request
import requests

class PosOrderForwardController(http.Controller):

    @http.route("/pos/forward-order", type="json", auth="user")
    def forward_order(self, **kwargs):
        try:
            response = requests.post(
                "https://endpoint.com/almacena-datos", # aca pon un endpoint que creas conveniente para almacenar datos
                headers={"X-Secret-Key": "secret key"}, # aca crea una llave secreta
                json=kwargs,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {
                "error": "No se pudo reenviar el pedido",
                "details": str(e),
            }
