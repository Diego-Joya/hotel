const pool = require('../../libs/postgres.pool');
const moment = require("moment");
const messageHandler = require('./../../middlewares/message.handler');
const centerServices = require('./centerServices');
// const reservationService = require('./Services/reservationService');
const center = new centerServices();
// const reserva = new reservationService();
class dashboardServices {
  constructor() {
    this.pool = pool;
    this.pool.on('error', (err) => console.error(err));
  }


  async getDashboard(params) {
    try {
      console.log('params', params);
      if ((typeof params.start == "undefined" || params.start == "") && (typeof params.end == "undefined" || params.end == "")) {
        params.start = moment().format('YYYY-MM-DD');
        params.end = moment(params.start, 'YYYY-MM-DD').endOf('day').format('YYYY-MM-DD HH:mm:ss');
      }
      console.log('params', params);
      let data = {};
      params.state = 'pendiente_confirmar';
      const reservasPendientes = await this.getReservasState(params);
      console.log("reservasPendientes", reservasPendientes.pendiente_confirmar);
      data.reservasPendientes = reservasPendientes.pendiente_confirmar;
      params.state = 'reservada';
      const reservasReservadas = await this.getReservasState(params);
      data.reservasReservadas = reservasReservadas.reservada;
      params.state = 'ingreso';
      const ingresosClientes = await this.getReservasState(params);
      data.ingresosClientes = ingresosClientes.ingreso;
      params.state = 'salida';
      const salidasClientes = await this.getReservasState(params);
      data.salidasClientes = salidasClientes.salida;
      params.state = 'Cancelada';
      const canceladas = await this.getReservasState(params);
      data.canceladas = canceladas.cancelada;
      if ((typeof params.company_id != "undefined" && params.company_id != "") && (typeof params.center_id == "undefined" || params.center_id == "")) {
        let consultasCentros = await center.getAll({ company_id: params.company_id, return_all: true });

        let centros = [];
        for (let i = 0; i < consultasCentros.length; i++) {
          const element = consultasCentros[i];
          params.center_id = element.centers_id;
          params.state = 'pendiente_confirmar';
          const reservasPendientes = await this.getReservasState(params);
          element.reservasPendientes = reservasPendientes.pendiente_confirmar;
          params.state = 'reservada';
          const reservasReservadas = await this.getReservasState(params);
          element.reservasReservadas = reservasReservadas.reservada;
          params.state = 'ingreso';
          const ingresosClientes = await this.getReservasState(params);
          element.ingresosClientes = ingresosClientes.ingreso;
          params.state = 'salida';
          const salidasClientes = await this.getReservasState(params);
          element.salidasClientes = salidasClientes.salida;
          params.state = 'Cancelada';
          const canceladas = await this.getReservasState(params);
          element.canceladas = canceladas.cancelada;
          centros.push(element);
        }
        data.centros = centros;
      };
      return data;

    } catch (error) {
      return messageHandler(error);
    }
  }


  async getReservasState(params) {

    try {
      let where = ` where 1=1`;
      if (typeof params.company_id != "undefined" && params.company_id != "") {
        where += ` and company_id=${params.company_id}`;
      }
      if (typeof params.center_id != "undefined" && params.center_id != "") {
        where += ` and center_id=${params.center_id}`;
      }
      if (typeof params.state != "undefined" && params.state == 'pendiente_confirmar') {
        where += ` and STATE = 'PENDIENTE CONFIRMAR'`;
      }
      if (typeof params.state != "undefined" && params.state == 'reservada') {
        where += ` and STATE = 'RESERVADA'  and entry_date::date >= '${params.start}' and entry_date::date <= '${params.end}'`;
      }
      if (typeof params.state != "undefined" && params.state == 'Cancelada') {
        where += ` and STATE = 'CANCELADA'  and entry_date::date >= '${params.start}' and entry_date::date <= '${params.end}'`;
      }
      if (typeof params.state != "undefined" && params.state == 'ingreso') {
        where += ` and STATE = 'INGRESO' and entry_date::date >= '${params.start}' and entry_date::date <= '${params.end}'`;
      }
      if ((typeof params.state != "undefined" && params.state == 'salida') && (typeof params.start != "undefined" && params.start != "" && typeof params.end != "undefined" && params.end != "")) {
        where += ` and exit_date::date between '${params.start}' and '${params.end}'`;
      }



      let query = `
          SELECT
            COUNT(*) AS ${params.state}
          FROM
            BOOKING_DATA.BOOKINGS

          ${where}
        `;
      console.log('query', query);
      let rta = await this.pool.query(query);
      return rta.rows[0];

    } catch (error) {
      return messageHandler(error);
    }

  }

}


module.exports = dashboardServices;
