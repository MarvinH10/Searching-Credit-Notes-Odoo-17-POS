/** @odoo-module **/

import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

const STATE_MAPPING = {
  not_paid: "Sin Pagar",
  in_payment: "En Proceso de Pago",
  paid: "Pagado",
  partial: "Pago Parcial",
  reversed: "Revertido",
  invoicing_legacy: "Sistema Anterior de Facturación",
};

export class CreditNoteSearchPopup extends AbstractAwaitablePopup {
  static template = "point_of_sale.CreditNoteSearchPopup";
  static defaultProps = {
    title: "Buscar Boleta/Factura o Nota de Crédito",
    confirmText: "Buscar",
    cancelText: "Cerrar",
  };

  setup() {
    super.setup();
    this.pos = usePos();
    this.rpc = useService("rpc");
    this.state = useState({
      serie: "",
      resultMessage: "",
      invoice: null,
      creditNotes: [],
    });
  }

  updateSerie(ev) {
    this.state.serie = ev.target.value;
  }

  async confirm() {
    this.state.resultMessage = "";
    this.state.invoice = null;
    this.state.creditNotes = [];

    const serie = this.state.serie.trim();
    if (!serie) {
      this.state.resultMessage = "⚠️ Ingrese una serie válida.";
      return;
    }

    try {
      const moves = await this.rpc("/web/dataset/call_kw", {
        model: "account.move",
        method: "search_read",
        args: [],
        kwargs: {
          domain: [
            ["name", "=", serie],
            ["move_type", "in", ["out_invoice", "out_receipt", "out_refund"]],
            ["state", "=", "posted"],
          ],
          fields: [
            "id",
            "name",
            "amount_total",
            "move_type",
            "reversed_entry_id",
            "payment_state",
          ],
          limit: 1,
        },
      });

      if (!moves.length) {
        this.state.resultMessage =
          "❌ No se encontró documento con esta serie.";
        return;
      }

      const doc = moves[0];

      if (doc.move_type === "out_refund") {
        this.state.creditNotes = [doc];
        this.state.resultMessage = `✅ Nota de crédito encontrada: ${doc.name}`;

        if (doc.reversed_entry_id) {
          const original_id = doc.reversed_entry_id[0];
          const [original] = await this.rpc("/web/dataset/call_kw", {
            model: "account.move",
            method: "search_read",
            args: [],
            kwargs: {
              domain: [
                ["id", "=", original_id],
                ["move_type", "in", ["out_invoice", "out_receipt"]],
                ["state", "=", "posted"],
              ],
              fields: [
                "id",
                "name",
                "amount_total",
                "move_type",
                "payment_state",
              ],
              limit: 1,
            },
          });
          if (original) {
            this.state.invoice = original;
          }
        }
      } else {
        this.state.invoice = doc;

        const creditNotes = await this.rpc("/web/dataset/call_kw", {
          model: "account.move",
          method: "search_read",
          args: [],
          kwargs: {
            domain: [
              ["reversed_entry_id", "=", doc.id],
              ["move_type", "=", "out_refund"],
              ["state", "=", "posted"],
            ],
            fields: [
              "id",
              "name",
              "state",
              "amount_total",
              "reversed_entry_id",
              "payment_state",
            ],
          },
        });

        this.state.creditNotes = creditNotes;

        if (creditNotes.length) {
          const notesList = creditNotes.map((n) => n.name).join(", ");
          this.state.resultMessage = `✅ Documento ${doc.name} encontrado | Nota de crédito asociada: ${notesList}`;
        } else {
          this.state.resultMessage = `ℹ️ Documento ${doc.name} encontrado | No tiene nota de crédito asociada.`;
        }
      }
    } catch (error) {
      this.state.resultMessage = "❌ Error en la conexión con el servidor.";
      console.error("Detalles del error:", error);
    }
  }

  async traerCreditNote(note) {
    try {
      const notaCreditoPaymentMethod = this.pos.payment_methods.find((method) =>
        method.name.toLowerCase().startsWith("nota")
      );

      if (!notaCreditoPaymentMethod) {
        this.state.resultMessage =
          "❌ No se encontró un método de pago que empiece por 'Nota'.";
        return;
      }

      const order = this.pos.get_order();
      order.add_paymentline(notaCreditoPaymentMethod);
      const paymentline = order.selected_paymentline;
      paymentline.set_amount(note.amount_total);
      paymentline.is_credit_note = true;
      order.credit_note_id = note.id;

      const posContainer = document.querySelector(".pos");
      if (posContainer) {
        posContainer.classList.add("disable-numpad");
      }

      this.state.selectedNote = note;
      this.state.resultMessage = `✅ Nota de crédito aplicada: ${note.name} por S/ ${note.amount_total}.`;
      this.cancel();
    } catch (error) {
      console.error("Error al aplicar nota de crédito:", error);
      this.state.resultMessage =
        "❌ Ocurrió un error al aplicar la nota de crédito.";
    }
  }

  getCreditNoteState(stateKey) {
    return STATE_MAPPING[stateKey] || stateKey;
  }
}

registry.category("popups").add("CreditNoteSearchPopup", CreditNoteSearchPopup);
