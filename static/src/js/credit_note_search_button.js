/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { useService } from "@web/core/utils/hooks";
import { Component } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { CreditNoteSearchPopup } from "@searching_credit_notes/js/credit_note_search_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { Order } from "@point_of_sale/app/store/models";

const originalValidateOrder = PaymentScreen.prototype.validateOrder;

patch(Order.prototype, {
  add_paymentline(payment_method) {
    const creditNoteMethodId = this.pos.config?.credit_note_method_id;

    const line = super.add_paymentline(...arguments);
    if (payment_method.id === creditNoteMethodId) {
      document.querySelector(".pos")?.classList.add("disable-numpad");
      line.is_credit_note = true;
      this.credit_note_id = false;
    }
    return line;
  },

  remove_paymentline(paymentline) {
    if (paymentline?.is_credit_note) {
      document.querySelector(".pos")?.classList.remove("disable-numpad");
      this.credit_note_id = false;
    }
    return super.remove_paymentline(...arguments);
  },
});

export class SearchCreditNoteButton extends Component {
  static template = "point_of_sale.SearchCreditNoteButton";

  setup() {
    this.popup = useService("popup");
  }

  async click() {
    await this.popup.add(CreditNoteSearchPopup, {
      title: "Buscar Nota de Crédito",
    });
  }
}

patch(PaymentScreen.prototype, {
  setup() {
    super.setup?.();
    this.popup = useService("popup");
    this.rpc = useService("rpc");

    if (!document.querySelector("#hide-numpad-style")) {
      const style = document.createElement("style");
      style.id = "hide-numpad-style";
      style.textContent = `
        .pos.disable-numpad .numpad.flex-grow-1 button {
          pointer-events: none !important;
          opacity: 0.5 !important;
          cursor: not-allowed !important;
        }
      `;
      document.head.appendChild(style);
    }
    this._toggleNumpad();
  },

  selectPaymentLine(line) {
    super.selectPaymentLine(line);
    this._toggleNumpad();
  },

  _toggleNumpad(force) {
    const selectedLine = this.pos.get_order().selected_paymentline;
    const shouldDisable =
      force !== undefined ? force : selectedLine?.is_credit_note === true;

    document
      .querySelector(".pos")
      ?.classList.toggle("disable-numpad", shouldDisable);
  },

  async validateOrder() {
    const order = this.pos.get_order();

    if (order.credit_note_id) {
      try {
        const note_data = await this.rpc("/web/dataset/call_kw", {
          model: "account.move",
          method: "read",
          args: [
            [order.credit_note_id],
            [
              "name",
              "payment_state",
              "amount_total",
              "invoice_date",
              "payment_reference",
            ],
          ],
          kwargs: {
            context: {
              lang: "es_PE",
              tz: "America/Lima",
              uid: this.pos.user.id,
            },
          },
        });
        if (!note_data || !note_data.length) {
          throw new Error(
            `No se pudo leer la nota de crédito ${order.credit_note_id}`
          );
        }
        const note = note_data[0];
        if (["paid", "in_payment", "partial"].includes(note.payment_state)) {
          console.log(
            `La nota de crédito ${order.credit_note_id} ya tiene estado ${note.payment_state}.`
          );
          return await originalValidateOrder.apply(this, arguments);
        }
        const journals = await this.rpc("/web/dataset/call_kw", {
          model: "account.journal",
          method: "search_read",
          args: [],
          kwargs: {
            domain: [
              "|",
              ["name", "ilike", "Cash"],
              ["name", "ilike", "Efectivo"],
            ],
            fields: ["id", "name"],
            limit: 1,
          },
        });
        let journal_id;
        if (journals && journals.length) {
          journal_id = journals[0].id;
          // console.log("Diario encontrado:", journals[0]);
        } else {
          journal_id = 98;
          console.warn(
            "No se encontró un diario con 'Cash' o 'Efectivo'. Se usa el valor por defecto:",
            journal_id
          );
        }
        const wizard_vals = {
          payment_date:
            note.invoice_date || new Date().toISOString().slice(0, 10),
          amount: note.amount_total,
          communication:
            note.payment_reference || `Pago NC ${order.credit_note_id}`,
          journal_id: journal_id, // ID del diario de pago (ajustar según sea necesario)
          payment_type: "outbound",
        };
        // console.log("Valores del wizard:", wizard_vals);

        const wizard_id = await this.rpc("/web/dataset/call_kw", {
          model: "account.payment.register",
          method: "create",
          args: [wizard_vals],
          kwargs: {
            context: {
              lang: "es_PE",
              tz: "America/Lima",
              uid: this.pos.user.id,
              active_model: "account.move",
              active_ids: [order.credit_note_id],
              active_id: order.credit_note_id,
            },
          },
        });
        if (!wizard_id) {
          throw new Error(
            "No se pudo crear el wizard de pago (account.payment.register)."
          );
        }
        // console.log("Wizard creado con ID:", wizard_id);

        await this.rpc("/web/dataset/call_kw", {
          model: "account.payment.register",
          method: "action_create_payments",
          args: [[wizard_id]],
          kwargs: {},
        });
        // console.log("Resultado de action_create_payments:", action_result);
        // console.log("✅ Pago registrado para la nota de crédito:", order.credit_note_id);
      } catch (error) {
        console.error(
          "❌ Error al registrar el pago de la nota de crédito:",
          error
        );
        await this.popup.add(ErrorPopup, {
          title: "Error de Nota de Crédito",
          body: "No se pudo registrar el pago de la nota de crédito.",
        });
        return;
      }
    }

    const orderData = {
      pos_order_id: order.name,
      user_name: this.pos.user.name,
      config_name: this.pos.config.name,
      credit_note_id: order.credit_note_id,
      total: order.get_total_with_tax(),
      lines: order.orderlines.map((line) => ({
        product: line.product.display_name,
        quantity: line.quantity,
        price: line.price,
      })),
      payments: order.paymentlines.map((payment) => ({
        method: payment.payment_method.name,
        amount: payment.amount,
        is_credit_note: payment.is_credit_note || false,
      })),
      timestamp: new Date().toISOString(),
    };

    if (order.credit_note_id) {
      let externalResponse;
      try {
        externalResponse = await this.rpc("/pos/forward-order", orderData);

        if (externalResponse.error) {
          throw new Error("API externa: " + externalResponse.details);
        }

        await this.rpc("/web/dataset/call_kw", {
          model: "pos.external.log",
          method: "create",
          args: [
            {
              order_data: JSON.stringify(orderData),
              status: "success",
              response: JSON.stringify(externalResponse),
            },
          ],
          kwargs: {},
        });
      } catch (error) {
        console.error("❌ Error al reenviar pedido:", error);

        await this.rpc("/web/dataset/call_kw", {
          model: "pos.external.log",
          method: "create",
          args: [
            {
              order_data: JSON.stringify(orderData),
              status: "error",
              error_message: error.message,
            },
          ],
          kwargs: {},
        });

        await this.popup.add(ErrorPopup, {
          title: "Error de envío a API externa",
          body: error.message,
        });
        return;
      }
    }

    return await originalValidateOrder.apply(this, arguments);
  },

  async showCreditNotePopup() {
    await this.popup.add(CreditNoteSearchPopup, {
      title: "Buscar Nota de Crédito",
    });
  },
});

registry
  .category("payment_buttons")
  .add("search_credit_note", SearchCreditNoteButton, { append: true });
