const express = require("express");
const cors = require("cors");
const app = express();
const port = 9999;
const nodemailer = require("nodemailer");
const fs = require("fs");
const oracledb = require("oracledb");

app.use(express.json());
app.use(cors());

const triggerLogger = (filial, date) => {
  let currentDates = fs.readFileSync("./date.json", "utf-8");
  let currentDatesJson = JSON.parse(currentDates);
  let thisMoment = new Date(date);
  currentDatesJson[filial][1] = thisMoment;
  fs.writeFile("./date.json", JSON.stringify(currentDatesJson), (err) => {
    if (err) throw err;
    console.log("Salvo!");
  });
};

// Rota de teste de funcionamento
app.get("/", (req, res) => {
  res.status(200).send("Api está funcionado!");
});

// Rota de teste de conexão com o banco
app.get("/bd", (req, res) => {
  oracledb.getConnection(
    {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    },
    (err, connection) => {
      if (err) {
        console.error(err.message);
        res.send("Falha na conexão com o banco de dados").status(404);
      } else {
        connection.execute(
          `SELECT * FROM SANTRI.PRODUTOS WHERE SANTRI.PRODUTOS.PRODUTO_ID = 107259`,
          (err, result) => {
            if (err) {
              res.send("Falha no Select").status(404);
              console.error(err.message);
            } else {
              console.log(result.rows);
              res.send(JSON.stringify(result.rows)).status(200);
            }
          }
        );
      }
    }
  );
});

// Rota que vai retornar as informações do produto pelo código
app.post("/api/produto/:produto&:filial", (req, res) => {
  const { produto, filial } = req.params;
  oracledb.getConnection(
    {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    },
    (err, connection) => {
      if (err) {
        console.error(err.message);
        res.send("Falha na conexão com o banco de dados").status(404);
      } else {
        connection.execute(
          `SELECT DISTINCT SANTRI.PRODUTOS.NOME,
          SANTRI.PRODUTOS.PRODUTO_ID,
          SANTRI.MARCAS.NOME,
          SANTRI.PRODUTOS.UNIDADE,
          SANTRI.PRODUTOS.PRONTA_ENTREGA,
          SANTRI.PRODUTOS.PERMITIR_USO_VENDA_DIRETA,
          SANTRI.PRECOS.PRECO_VENDA
          FROM SANTRI.PRODUTOS, SANTRI.MARCAS, SANTRI.PRECOS
          WHERE SANTRI.PRODUTOS.MARCA_ID = SANTRI.MARCAS.MARCA_ID AND
          SANTRI.PRODUTOS.PRODUTO_ID = SANTRI.PRECOS.PRODUTO_ID AND
          SANTRI.PRECOS.EMPRESA_ID = ${filial} AND SANTRI.PRODUTOS.PRODUTO_ID = ${produto}`,
          (err, result) => {
            if (err) {
              res.send("Falha no Select").status(404);
              console.error(err.message);
            } else {
              console.log(result.rows);
              let currentTime = new Date();
              triggerLogger(filial, currentTime);
              res.send(JSON.stringify(result.rows)).status(200);
            }
          }
        );
      }
    }
  );
});

// Rota que vai retornar as informações do produto pelo código de barra
app.post("/api/codbarra/:codigobarra&:filial", (req, res) => {
  const { codigobarra, filial } = req.params;
  oracledb.getConnection(
    {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    },
    (err, connection) => {
      if (err) {
        console.error(err.message);
        res.send("Falha na conexão com o banco de dados").status(404);
      } else {
        connection.execute(
          `SELECT DISTINCT SANTRI.PRODUTOS.NOME,
                SANTRI.PRODUTOS.PRODUTO_ID,
                SANTRI.MARCAS.NOME,
                SANTRI.PRODUTOS.UNIDADE,
                SANTRI.PRODUTOS.PRONTA_ENTREGA,
                SANTRI.PRODUTOS.PERMITIR_USO_VENDA_DIRETA,
                SANTRI.PRECOS.PRECO_VENDA,
                SANTRI.PRECOS.DATA_HORA_ALTERACAO
  FROM SANTRI.PRODUTOS, SANTRI.MARCAS, SANTRI.PRECOS
 WHERE SANTRI.PRODUTOS.MARCA_ID = SANTRI.MARCAS.MARCA_ID AND
       SANTRI.PRODUTOS.PRODUTO_ID = SANTRI.PRECOS.PRODUTO_ID AND
       SANTRI.PRECOS.EMPRESA_ID = ${filial} AND
       SANTRI.PRODUTOS.CODIGO_BARRAS = ${codigobarra}`,
          (err, result) => {
            if (err) {
              res.send("Falha no Select").status(404);
              console.error(err.message);
            } else {
              console.log(result.rows);
              let currentTime = new Date();
              triggerLogger(filial, currentTime);
              res.send(JSON.stringify(result.rows)).status(200);
            }
          }
        );
      }
    }
  );
});

// Rota que vai retornar as informações de estoque de um produto
app.post("/api/estoque/:produto", (req, res) => {
  const { produto } = req.params;
  oracledb.getConnection(
    {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    },
    (err, connection) => {
      if (err) {
        console.error(err.message);
        res.send("Falha na conexão com o banco de dados").status(404);
      } else {
        connection.execute(
          `SELECT ((SANTRI.ESTOQUES.ESTOQUE_FISICO -
            SANTRI.ESTOQUES.ENTREGAS_PENDENTES) +
            (SANTRI.ESTOQUES.TRANSF_ENTREGAS_PENDENTES -
            SANTRI.ESTOQUES.ESTOQUE_BLOQUEADO)),
            SANTRI.ESTOQUES.COMPRAS_PENDENTES
       FROM SANTRI.ESTOQUES
      WHERE SANTRI.ESTOQUES.PRODUTO_ID = ${produto}`,
          (err, result) => {
            if (err) {
              res.send("Falha no Select").status(404);
              console.error(err.message);
            } else {
              console.log(result.rows);
              res.send(JSON.stringify(result.rows)).status(200);
            }
          }
        );
      }
    }
  );
});

// Rota que vai retornar as informações de compras de um produto
app.post("/api/compras/:produto", (req, res) => {
  const { produto } = req.params;
  oracledb.getConnection(
    {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    },
    (err, connection) => {
      if (err) {
        console.error(err.message);
        res.send("Falha na conexão com o banco de dados").status(404);
      } else {
        connection.execute(
          `SELECT SIC.DATA_HORA_ALTERACAO, SIC.QUANTIDADE
          FROM SANTRI.ITENS_COMPRAS SIC, SANTRI.COMPRAS SC
         WHERE SIC.COMPRA_ID = SC.COMPRA_ID AND SIC.PRODUTO_ID = ${produto} AND
               SC.CONFIRMADA = 'N' AND SC.STATUS = 'B'
         ORDER BY SIC.DATA_HORA_ALTERACAO DESC`,
          (err, result) => {
            if (err) {
              res.send("Falha no Select").status(404);
              console.error(err.message);
            } else {
              console.log(result.rows);
              res.send(JSON.stringify(result.rows)).status(200);
            }
          }
        );
      }
    }
  );
});

// Rota que vai retornar os logs
app.get("/api/logs", (req, res) => {
  let currentDates = fs.readFileSync("./date.json", "utf-8");
  res.status(200).send(JSON.parse(currentDates));
});

// Rota que vai enviar o email
app.post("/api/email/", (req, res) => {
  const emailDestino = req.body.emailDestino;
  const listaEtiquetas = req.body.listaEtiquetas;
  const filial = req.body.filial;
  // console.log(listaEtiquetas);
  let htmlList = `<body style=" display: flex; align-items: center; justify-content: center; font-family: Arial, Helvetica, sans-serif; padding: 0; margin: 0; box-sizing: border-box; ">
  <div class="container" style="max-width: 600px; margin: 0 auto">
    <div id="first" style=" box-sizing: border-box; background: #fff; border-radius: 4px; padding: 16px;" >
      <h2 style=" padding: 0; margin: 0; box-sizing: border-box; color: #ff8500; margin-bottom: 16px;" >Lista de etiquetas para impressão</h2>
      <ul style=" margin: 0; padding: 16px 0; box-sizing: border-box; list-style: none; display: flex; flex-direction: column; gap: 16px;">`;
  listaEtiquetas.forEach((item) => {
    htmlList += `<li style=" border-radius: 4px; background: #f2f2f2; color: rgba(0, 0, 0, 0.8); margin: 0; padding: 16px; box-sizing: border-box;">
                <span style="font-weight: bold">${item.codigo}</span> - ${item.nome} | ${item.valor} </li>`;
  });
  htmlList += `</ul>
            </div>
        <p style="text-align: center; padding: 0px 4px; font-size: 12px">Esse e-mail foi enviado automaticamente pelo software de Consulta Preço.A visualização está com algum erro? Entre em contato com o T.I.</p>
    </div>
</body>`;

  let string = "";
  listaEtiquetas.forEach((item) => {
    string += `${item.codigo}\n`;
  });

  fs.writeFileSync(`listaEtiquetas${filial}.txt`, string);

  async function enviarEmail() {
    let transporter = nodemailer.createTransport({
      host: "email-ssl.com.br",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    let info = await transporter.sendMail({
      from: '"Consulta Preço | PHC" <etiquetas@panoramahomecenter.com.br>',
      to: `${emailDestino}`,
      subject: "Lista de etiquetas para impressões",
      html: `${htmlList}`,
      attachments: [
        {
          filename: "Lista-de-Etiquetas.txt",
          path: `./listaEtiquetas${filial}.txt`,
        },
      ],
    });

    console.log("Message sent: %s", info.messageId);
    res.status(200).send("Email enviado com sucesso!");
    let currentTime = new Date();
    triggerLogger(filial, currentTime);
    // console.log(`${emailDestino}, ${htmlList}`);
  }
  enviarEmail().catch(console.error);
});

app.listen(port, () => {
  console.log(
    `API funcionando e rodando no endereço: http://localhost:${port}`
  );
});
