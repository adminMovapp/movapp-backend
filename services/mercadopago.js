import { MercadoPagoConfig, Preference } from "mercadopago";
import axios from "axios";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

const client = new MercadoPagoConfig({
   accessToken: accessToken,
   options: { timeout: 5000 },
});

const preference = new Preference(client);

export const crearPreferencia = async (pedido) => {
   const { id, producto, precio_unitario, cantidad } = pedido;

   console.log(id, producto, precio_unitario, cantidad);

   const body = {
      items: [
         {
            title: producto,
            unit_price: parseFloat(precio_unitario) || 0,
            quantity: parseInt(cantidad) || 1,
         },
      ],
      back_urls: {
         success: `${process.env.APP_BASE_URL}success`,
         failure: `${process.env.APP_BASE_URL}failure`,
         pending: `${process.env.APP_BASE_URL}pending`,
      },
      notification_url: `${process.env.MERCADOPAGO_URL_WEBHOOK}`,

      auto_return: "approved",
      metadata: { pedidoId: id },
      external_reference: id.toString(),
      payment_methods: {
         installments: 1, // limitar a 1 cuota
         excluded_payment_methods: [], // aceptar todo
         excluded_payment_types: [], // permitir tarjetas, débito, etc.
      },
   };

   try {
      const response = await preference.create({ body });
      // console.log(response);
      return response;
   } catch (error) {
      console.error("Error al crear preferencia:", error.response || error);
      throw error;
   }
};

export async function obtenerDetallePago(paymentId) {
   try {
      const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;

      const response = await axios.get(url, {
         headers: {
            Authorization: `Bearer ${accessToken}`,
         },
      });

      console.log("📦 Detalles del pago api:", response.data);
      return response.data;
   } catch (error) {
      console.error("❌ Error al obtener detalles del pago:", error.response?.data || error.message);
      throw error;
   }
}
