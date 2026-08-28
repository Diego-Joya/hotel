const user_services = require("./usuariosServices");
const boom = require("@hapi/boom");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { config } = require('./../../config/config');
const mail_service = require("./mail_service");

const service = new user_services();
const mailer = new mail_service();

class auth_services {
  async resetPasswor(mail) {
    const user = await service.consultar_email_user(mail);
    console.log('user::::', user);
    if (user == "" || user.length == 0) {
      return ({
        ok: false,
        message: 'Usuario no exite!'
      });
    }

    const payload = { sub: user[0].user_id };
    console.log('payload', payload);
    console.log('config.jwtsecret', config.jwtsecret);
    const token = jwt.sign(payload, config.jwtsecret, { expiresIn: '10min' });
    console.log('token', token);
    await service.Guardartoken(user[0].user_id, token);

    const link = `http://localhost:5173/web/new-password?token=${token}`;

    const smtpConfig = mailer.getConfigSistema();
    console.log('smtpConfig', smtpConfig);
    const email = mailer.buildRecoveryEmail(user[0].email, link);
    return await mailer.sendMail(smtpConfig, email);
  }

  async getUser(username, password) {
    const user = await service.consultar_user(username);

    if (user == "" || user.length == 0) {
      throw boom.unauthorized();
    }
    const verify = await bcrypt.compare(password, user[0].password);
    if (!verify) {
      throw boom.unauthorized();
    }
  }

  async changePassword(token, newpassword) {
    try {
      const payload = jwt.verify(token, config.jwtsecret);
      const user = await service.buscar_uno(payload.sub);

      if (user[0].token !== token) {
        throw boom.unauthorized();
      }

      await service.actualizar_password(payload.sub, newpassword);
      return {
        ok: true,
        message: 'Password cambiado exitosamente!'
      };
    } catch (error) {
      throw boom.unauthorized();
    }
  }
}

module.exports = auth_services;
